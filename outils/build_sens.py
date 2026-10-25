"""Génère les données du jeu « Mot chaud, mot froid » (dossier sens/).

Entrées :
- outils/sens_indices.json : mot secret -> 10 énigmes (de la plus difficile à la plus facile).
  L'ordre du fichier donne l'ordre des mots du jour : ajouter les nouveaux mots à la fin.
- le modèle spaCy fr_core_news_md (vecteurs fastText CC0) et le dictionnaire
  an-array-of-french-words, à télécharger :
    pip install spacy numpy && pip download fr-core-news-md --no-deps -d /tmp/m
    unzip /tmp/m/*.whl -d /tmp/m && npm pack an-array-of-french-words && tar xzf an-array-*.tgz
  puis : python outils/build_sens.py /tmp/m/fr_core_news_md/fr_core_news_md-3.8.0 package/index.json
"""
import base64, json, re, sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from spacy.vocab import Vocab

model, dictionary = sys.argv[1], sys.argv[2]
root = Path(__file__).resolve().parent.parent
out = root / 'sens'

vocab = Vocab().from_disk(Path(model) / 'vocab')
V = np.asarray(vocab.vectors.data)
rows = defaultdict(list)
for key, row in vocab.vectors.key2row.items():
    rows[row].append(vocab.strings[key])

known = set(json.load(open(dictionary)))
pattern = re.compile(r"[a-zàâäçéèêëîïôöùûüœ]{2,}")
ok = lambda w: bool(pattern.fullmatch(w)) and (w in known or 'œ' in w)

# Une ligne par vecteur : tous les mots qui le partagent, le premier étant le mot « principal ».
# Une étoile marque les lignes comptées dans le classement des 1000 mots les plus proches.
lines, seen = [], set()
for r in range(len(V)):
    keys = rows.get(r, [])
    words = [k for k in keys if ok(k) and k not in seen]
    seen.update(words)
    lines.append(('*' if keys and ok(keys[0]) else '') + ' '.join(words))
(out / 'vocab.txt').write_text('\n'.join(lines) + '\n')

hints = json.load(open(root / 'outils' / 'sens_indices.json'))
main_row = {keys[0]: r for r, keys in rows.items()}
N = V / np.linalg.norm(V, axis=1, keepdims=True)
(out / 'data').mkdir(exist_ok=True)
secrets = []
for i, (word, h) in enumerate(hints.items()):
    assert len(h) == 10, word
    assert lines[main_row[word]].startswith('*' + word), f'{word} : pas assez courant dans le modèle'
    scores = np.round(N @ N[main_row[word]] * 10000).astype('<i2')
    scores.tofile(out / 'data' / f'{i:03d}.bin')
    secrets.append({'f': f'{i:03d}', 'w': base64.b64encode(word.encode()).decode(), 'h': h})

(out / 'secrets.js').write_text(
    "// Mots secrets (encodés pour éviter de se gâcher la surprise) et leurs 10 indices,\n"
    "// du plus difficile (1) au plus facile (10). Chaque mot a son fichier de proximités dans data/.\n"
    "// Fichier généré par outils/build_sens.py.\n"
    "const SECRETS = " + json.dumps(secrets, ensure_ascii=False, indent=1) + ";\n"
)
print(f'{len(seen)} mots acceptés, {len(secrets)} mots secrets')
