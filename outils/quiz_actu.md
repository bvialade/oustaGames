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

## Sources : varier les médias

- **Au moins 5 médias différents par quiz, et au plus 2 questions par média.** Un agrégateur
  (Titres Presse…) compte comme le média d'origine qu'il cite.
- Chercher d'abord chez les grands médias français : franceinfo, Le Monde, BFMTV, actu.fr,
  20 Minutes, Ouest-France, Le Parisien, Le Figaro, Libération, RFI, France 24, L'Équipe.
  WebSearch (mode extended) avec le nom du média et la date du jour, par exemple
  « franceinfo 30 octobre 2026 », renvoie leurs articles.
- La plupart de ces sites refusent la lecture par WebFetch. On peut quand même citer leur
  article si le titre ou l'extrait du résultat de recherche énonce clairement le fait, et que
  ce fait est confirmé par un article réellement lu ailleurs.
- Médias lisibles avec WebFetch (vérifié le 29/10/2026) : Euronews, RTBF, La Libre, Le Matin,
  Swissinfo, Radio-Canada, Public Sénat, Futura, Europe 1, Titres Presse. Euronews ne doit pas
  fournir plus de 2 questions.
- Questions factuelles et neutres, pas de sujets morbides en détail, pas d'opinion.
- 4 choix plausibles, une seule bonne réponse, position de la bonne réponse variée.
- Ne pas modifier les quiz des jours précédents.
