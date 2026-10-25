# OustaGames

Petits jeux à jouer sur téléphone, sous forme de web app installable (PWA).

- **SUTOM** : un jeu de mot à deviner en 6 essais, avec un mot du jour commun à tous et des parties libres.
- **Mot chaud, mot froid** : trouver un mot secret grâce à la proximité de sens des mots proposés, avec 10 énigmes à débloquer.
- **Géographie** : quiz drapeaux, capitales et capitale → pays, par continent.

## Jouer

Ouvrir le site dans Safari sur iPhone, puis Partager → « Sur l'écran d'accueil ».
L'app fonctionne ensuite hors connexion. Scores et statistiques restent sur chaque appareil.

## Développer

Aucun outil de build : ce sont des fichiers HTML, CSS et JavaScript statiques.
Pour tester en local : `python3 -m http.server` puis ouvrir http://localhost:8000.

Chaque jeu vit dans son dossier (`mot/`, `sens/`, `geo/`) et réutilise `style.css`.
Pour ajouter un jeu, créer un dossier, l'ajouter au menu dans `index.html` et à la liste `CORE` de `sw.js`.

## Données

- Dictionnaire : [an-array-of-french-words](https://github.com/words/an-array-of-french-words) (MIT).
- Pays et drapeaux : [world-countries](https://github.com/mledoze/countries) (ODbL), capitales traduites en français.
- Proximité de sens : vecteurs de mots fastText d'Explosion (CC0), extraits du modèle spaCy `fr_core_news_md`.
  Les fichiers `sens/vocab.txt` et `sens/data/*.bin` sont générés à l'avance (score de similarité cosinus × 10 000, en entiers 16 bits).

Pour ajouter des mots secrets au jeu de proximité de sens : les ajouter à la fin de `outils/sens_indices.json` puis lancer `outils/build_sens.py` (instructions en tête du script).
