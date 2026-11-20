#!/usr/bin/env python3
"""Vérifie une édition de la revue de presse avant publication (voir outils/revue_presse.md)."""
import json
import sys
from collections import Counter

RUBRIQUES = {'monde', 'france', 'toulouse', 'economie', 'sciences', 'culture', 'sport', 'insolite'}


def verifier(chemin):
    with open(chemin, encoding='utf-8') as f:
        ed = json.load(f)
    erreurs = []
    arts = ed.get('articles', [])
    if not ed.get('date') or ed['date'] not in chemin:
        erreurs.append('date absente ou différente du nom du fichier')
    if len(arts) < 20:
        erreurs.append(f'{len(arts)} articles seulement (minimum 20, objectif 30)')
    urls = Counter()
    for i, a in enumerate(arts, 1):
        if a.get('rubrique') not in RUBRIQUES:
            erreurs.append(f'article {i} : rubrique inconnue {a.get("rubrique")!r}')
        for champ in ('titre', 'resume'):
            if not a.get(champ):
                erreurs.append(f'article {i} : {champ} vide')
        src = a.get('source') or {}
        if not src.get('nom') or not str(src.get('url', '')).startswith('https://'):
            erreurs.append(f'article {i} : source incomplète')
        urls[src.get('url')] += 1
        det = a.get('detail')
        if not isinstance(det, list) or len(det) < 2:
            erreurs.append(f'article {i} : résumé détaillé (detail) absent ou trop court')
        elif any(len(p.split()) > 140 for p in det):
            erreurs.append(f'article {i} : paragraphe de detail trop long (140 mots max)')
        img = a.get('image')
        if img is not None and not str(img).startswith('https://'):
            erreurs.append(f'article {i} : image doit être une URL https')
        if len(a.get('resume', '')) > 450:
            erreurs.append(f'article {i} : résumé trop long ({len(a["resume"])} caractères)')
    for u, n in urls.items():
        if n > 1:
            erreurs.append(f'URL citée {n} fois : {u}')
    medias = Counter(a['source']['nom'] for a in arts if a.get('source'))
    if len(medias) < 8:
        erreurs.append(f'{len(medias)} médias seulement (minimum 8)')
    for m, n in medias.items():
        if n > 6:
            erreurs.append(f'{m} cité {n} fois (maximum 6)')
    une = sum(1 for a in arts if a.get('une'))
    imgs = sum(1 for a in arts if a.get('image'))
    print(f"{len(arts)} articles, {len(medias)} médias, {une} à la une, {imgs} vignettes")
    print('Rubriques :', dict(Counter(a.get('rubrique') for a in arts)))
    print('Médias :', dict(medias.most_common()))
    for e in erreurs:
        print('ERREUR', e)
    return not erreurs


if __name__ == '__main__':
    sys.exit(0 if all(verifier(c) for c in sys.argv[1:]) else 1)
