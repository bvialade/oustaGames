# Générer le quiz de l'actu du jour

Chaque matin, un quiz de 10 questions est ajouté dans `quiz/actu/AAAA-MM-JJ.json`
et sa date est ajoutée à `quiz/actu/index.json` (liste JSON de dates, la plus récente en dernier).

## Format

```json
{
  "date": "2026-10-25",
  "questions": [
    {
      "categorie": "international",
      "q": "La question ?",
      "choix": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
      "reponse": 1,
      "explication": "Une ou deux phrases qui donnent la bonne réponse et le contexte.",
      "source": { "nom": "Nom du média", "url": "https://lien-direct-vers-l-article" }
    }
  ]
}
```

`categorie` vaut `international`, `national`, `local`, `culture` ou `insolite` ; le jeu l'affiche au-dessus de la question.
`reponse` est l'index (à partir de 0) de la bonne réponse dans `choix`.

## Règles

- Actualités des dernières 24 à 48 heures, en français, pour un public familial.
- Répartition des 10 questions (demande de Bastien, 16/11/2026), dans cet ordre :
  - 3 `international` : actualité du monde ;
  - 3 `national` : actualité française ;
  - 2 `local` : Toulouse et ses alentours (Haute-Garonne, Occitanie proche). Sources : La Dépêche du Midi, actu.fr Toulouse, France 3 Occitanie, ici Occitanie, ToulÉco, Le Journal Toulousain…
  - 1 `culture` : arts, spectacles, cinéma, musique, livres, expositions ;
  - 1 `insolite` : une nouvelle étonnante ou amusante (France ou monde).
- Le sport, les sciences et l'économie entrent dans la rubrique de leur lieu (international, national ou local). Au plus 2 questions de politique au total.
- S'il manque une actualité locale vérifiable des dernières 48 heures, prendre une actu toulousaine des 7 derniers jours, sinon une question `national` de plus.
- Chaque fait doit venir d'un article lu, et `source.url` doit être le lien de cet article.
- Questions factuelles et neutres, pas de sujets morbides en détail, pas d'opinion.
- 4 choix plausibles, une seule bonne réponse, position de la bonne réponse variée.
- Ne pas modifier les quiz des jours précédents.
