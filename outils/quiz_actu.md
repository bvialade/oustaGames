# Générer le quiz de l'actu du jour

Chaque matin, un quiz de 10 questions est ajouté dans `quiz/actu/AAAA-MM-JJ.json`
et sa date est ajoutée à `quiz/actu/index.json` (liste JSON de dates, la plus récente en dernier).

## Format

```json
{
  "date": "2026-10-25",
  "questions": [
    {
      "q": "La question ?",
      "choix": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
      "reponse": 1,
      "explication": "Une ou deux phrases qui donnent la bonne réponse et le contexte.",
      "source": { "nom": "Nom du média", "url": "https://lien-direct-vers-l-article" }
    }
  ]
}
```

`reponse` est l'index (à partir de 0) de la bonne réponse dans `choix`.

## Règles

- Actualités des dernières 24 à 48 heures, en français, pour un public familial.
- Varier les sujets : France, monde, sport, culture, sciences, insolite. Au plus 2 questions de politique.
- Chaque fait doit venir d'un article lu, et `source.url` doit être le lien de cet article.
- Questions factuelles et neutres, pas de sujets morbides en détail, pas d'opinion.
- 4 choix plausibles, une seule bonne réponse, position de la bonne réponse variée.
- Ne pas modifier les quiz des jours précédents.
