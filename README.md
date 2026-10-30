# OustaGames

Petits jeux à jouer sur téléphone, sous forme de web app installable (PWA).

- **SUTOM** : un jeu de mot à deviner en 6 essais, avec un mot du jour commun à tous et des parties libres.
- **Mot chaud, mot froid** : trouver un mot secret grâce à la proximité de sens des mots proposés, avec 10 énigmes à débloquer.
- **Géographie** : quiz drapeaux, capitales et capitale → pays, par continent.
- **Passe-frontières** : relier deux pays tirés au sort en citant les pays à traverser, sur une carte qui se colore. Défi du jour par zone (Europe, Monde, Afrique, Asie, Amériques) et parties numérotées à partager.
- **Quiz de l'actu** : 10 questions sur l'actualité du jour, avec les sources.
- **OustaCards** : quatre jeux de cartes classiques (Solitaire, Spider, FreeCell, Dame de pique contre trois adversaires), avec des cartes dessinées pour le site.
- **Quiz du droit** : 10 questions de droit français, au niveau Citoyen, Juge ou Goat, sur une ou plusieurs matières, avec l'article ou l'arrêt de référence.

## Jouer

Ouvrir le site dans Safari sur iPhone, puis Partager → « Sur l'écran d'accueil ».
L'app fonctionne ensuite hors connexion. Scores et statistiques restent sur chaque appareil.

## Développer

Aucun outil de build : ce sont des fichiers HTML, CSS et JavaScript statiques.
Pour tester en local : `python3 -m http.server` puis ouvrir http://localhost:8000.

Chaque jeu vit dans son dossier (`mot/`, `sens/`, `geo/`, `frontieres/`, `quiz/`, `droit/`, `cartes/`) et réutilise `style.css`.
Le menu n'a qu'une entrée « Quiz » (`quiz/`) : son accueil propose Actu (`quiz/#actu`) ou Droit (`droit/`).
Pour ajouter un jeu, créer un dossier, l'ajouter au menu dans `index.html` et à la liste `CORE` de `sw.js`.

## Données

- Dictionnaire : [an-array-of-french-words](https://github.com/words/an-array-of-french-words) (MIT).
- Pays et drapeaux : [world-countries](https://github.com/mledoze/countries) (ODbL), capitales traduites en français.
- Frontières terrestres entre pays : [world-countries](https://github.com/mledoze/countries) (ODbL). Contours des pays : [Natural Earth](https://www.naturalearthdata.com/) 1:50m et 1:10m (domaine public).
  `frontieres/data.js` est généré par `outils/build_frontieres.py` (instructions en tête du script) ; les frontières qui n'existent que par une enclave (Ceuta, Melilla, Gibraltar) ou l'outre-mer sont ignorées.
- Proximité de sens : vecteurs de mots fastText d'Explosion (CC0), extraits du modèle spaCy `fr_core_news_md`.
  Les fichiers `sens/vocab.txt` et `sens/data/*.bin` sont générés à l'avance (score de similarité cosinus × 10 000, en entiers 16 bits).

Pour ajouter des mots secrets au jeu de proximité de sens : les ajouter à la fin de `outils/sens_indices.json` puis lancer `outils/build_sens.py` (instructions en tête du script).

Dans `cartes/`, `moteur.js` gère le rendu, le glisser-déposer, l'annulation et la sauvegarde ; chaque jeu (`solitaire.js`, `spider.js`, `freecell.js`, `dame.js`) ne décrit que ses règles.

Pour ajouter des questions au quiz du droit : les écrire dans `droit/q/<matière>.js` (format décrit en tête de `droit/themes.js`, bonne réponse en premier), et les ajouter à la fin de la liste du niveau.
