# Rédiger la revue de presse du jour

Chaque matin, une édition est ajoutée dans `revue/data/AAAA-MM-JJ.json`
et sa date est ajoutée à `revue/data/index.json` (liste JSON de dates, la plus récente en dernier).
La page `revue/` affiche la plus récente, les éditions précédentes en archives (`revue/#AAAA-MM-JJ`),
et un lien vers le Quiz de l'actu du jour.

## Format

```json
{
  "date": "2026-11-19",
  "articles": [
    {
      "rubrique": "monde",
      "une": true,
      "titre": "Titre factuel, au présent, sans point final",
      "resume": "Deux ou trois phrases neutres : qui, quoi, où, quand, et un chiffre ou un contexte utile.",
      "source": { "nom": "Nom du média", "url": "https://lien-direct-vers-l-article" }
    }
  ]
}
```

`rubrique` vaut `monde`, `france`, `toulouse`, `economie`, `sciences`, `culture`, `sport` ou `insolite`.
`une` (facultatif) met l'article en tête de page, en grand : 3 articles par jour, les plus importants.

## Règles

- **30 articles** (demande de Bastien, 19/11/2026), entre 26 et 32 si l'actu est maigre ou riche. Ne pas publier en dessous de 20.
- Répartition indicative : 7 `monde`, 7 `france`, 4 `toulouse` (Toulouse, Haute-Garonne, Occitanie proche),
  4 `economie`, 3 `sciences` (sciences, santé, environnement, tech), 2 `culture`, 2 `sport`, 1 `insolite`.
- Actualités des dernières 24 à 48 heures. Pour Toulouse, jusqu'à 7 jours si besoin.
- **Sources variées** : au moins 8 médias différents, au plus 6 articles par média.
  Un agrégateur (Titres Presse, Presse Évasion, Rekto) compte comme le média qu'il cite, et on cite de préférence l'article original.
- Chaque résumé vient d'un article lu (ou d'un extrait de recherche qui énonce clairement le fait, confirmé ailleurs),
  et `source.url` est le lien de cet article. Ne jamais inventer une URL.
- Ton neutre et factuel, sans adjectif d'opinion ; les déclarations sont attribuées (« selon… », « affirme… »).
  Pas de détails morbides. Résumé de 200 à 350 caractères.
- Les sujets du Quiz de l'actu du même jour doivent figurer dans la revue (lis `quiz/actu/AAAA-MM-JJ.json` s'il existe déjà) :
  le lien « Lis la revue, puis teste-toi » doit tenir sa promesse.
- Ne pas modifier les éditions précédentes.

## Sources

Les grands sites français (franceinfo, Le Monde, BFMTV, Le Figaro, Libération, 20 Minutes, La Dépêche, actu.fr, Europe 1…)
bloquent souvent la lecture directe : les citer depuis un résultat de recherche quand l'extrait énonce le fait.
Lisibles directement (vérifié fin 2026) : Euronews, RTBF, La Libre, Le Matin, Swissinfo, Radio-Canada, Public Sénat,
Futura, Titres Presse, Le Journal Toulousain, rekto.substack.com, presse-evasion.fr.

## Vérification avant publication

```sh
python3 outils/verifier_revue.py revue/data/AAAA-MM-JJ.json
```
