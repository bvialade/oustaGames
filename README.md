# OustaGames

Petits jeux à jouer sur téléphone, sous forme de web app installable (PWA).

- **Le mot du jour** : un jeu de mot à deviner en 6 essais, avec un mot du jour commun à tous et des parties libres.
- **Géographie** : quiz drapeaux, capitales et capitale → pays, par continent.

## Jouer

Ouvrir le site dans Safari sur iPhone, puis Partager → « Sur l'écran d'accueil ».
L'app fonctionne ensuite hors connexion. Scores et statistiques restent sur chaque appareil.

## Développer

Aucun outil de build : ce sont des fichiers HTML, CSS et JavaScript statiques.
Pour tester en local : `python3 -m http.server` puis ouvrir http://localhost:8000.

Chaque jeu vit dans son dossier (`mot/`, `geo/`) et réutilise `style.css`.
Pour ajouter un jeu, créer un dossier, l'ajouter au menu dans `index.html` et à la liste `CORE` de `sw.js`.

## Données

- Dictionnaire : [an-array-of-french-words](https://github.com/words/an-array-of-french-words) (MIT).
- Pays et drapeaux : [world-countries](https://github.com/mledoze/countries) (ODbL), capitales traduites en français.
