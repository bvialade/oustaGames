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
      "source": { "nom": "Nom du média", "url": "https://lien-direct-vers-l-article" },
      "image": "https://url-de-l-image-d-apercu-de-l-article.jpg",
      "detail": [
        "Paragraphe 1 : les faits principaux (qui, quoi, où, quand).",
        "Paragraphe 2 : les détails et les chiffres clés.",
        "Paragraphe 3 : le contexte ou les antécédents.",
        "Paragraphe 4 (facultatif) : les réactions ou la suite attendue."
      ]
    }
  ]
}
```

`rubrique` vaut `monde`, `france`, `toulouse`, `economie`, `sciences`, `culture`, `sport` ou `insolite`.
`une` (facultatif) met l'article en tête de page, en grand : 3 articles par jour, les plus importants.
`detail` est le résumé détaillé affiché par le bouton « Voir plus » (demande de Bastien, 19/11/2026).
`image` (facultatif) est la vignette de l'article.

## Résumé détaillé (« Voir plus »)

- 3 ou 4 paragraphes de 50 à 90 mots, rédigés avec nos propres mots à partir de l'article lu :
  faits principaux, détails et chiffres, contexte, puis réactions ou suite attendue.
- **Jamais l'article recopié** : le site est public et les articles appartiennent aux médias (droit d'auteur).
  Pas de phrase reprise telle quelle ; au plus une citation courte (moins de 15 mots), entre guillemets et attribuée.
- Uniquement des informations présentes dans l'article (ou dans d'autres articles lus sur le même sujet) ; rien d'inventé.
- Si l'article n'a pas pu être lu (site bloqué), 2 paragraphes suffisent, à partir des extraits de recherche et d'articles lus ailleurs.

## Vignette

- `image` est l'image d'aperçu officielle de l'article (og:image ou photo en tête d'article), recopiée exactement depuis la page.
  Elle est affichée depuis le site du média, jamais copiée dans le dépôt, avec le nom du média en crédit.
- Si l'image est introuvable ou incertaine, ne pas mettre de champ `image` : la page affiche une vignette colorée selon la rubrique.
- Ne jamais deviner ni reconstruire une URL d'image.

## Règles

- **30 articles** (demande de Bastien, 19/11/2026), entre 26 et 32 si l'actu est maigre ou riche. Ne pas publier en dessous de 20.
- Répartition indicative : 7 `monde`, 7 `france`, 4 `toulouse` (Toulouse, Haute-Garonne, Occitanie proche),
  4 `economie`, 3 `sciences` (sciences, santé, environnement, tech), 2 `culture`, 2 `sport`, 1 `insolite`.
- Actualités des dernières 24 à 48 heures. Pour Toulouse, jusqu'à 7 jours si besoin.
- **Sources variées** : au moins 8 médias différents, au plus 6 articles par média ; viser au moins 3 articles pour chacun des 4 journaux ci-dessous quand leurs flux sont accessibles.
  Un agrégateur (Titres Presse, Presse Évasion, Rekto) compte comme le média qu'il cite, et on cite de préférence l'article original.
- Chaque résumé vient d'un article lu (ou d'un extrait de recherche qui énonce clairement le fait, confirmé ailleurs),
  et `source.url` est le lien de cet article. Ne jamais inventer une URL.
- Ton neutre et factuel, sans adjectif d'opinion ; les déclarations sont attribuées (« selon… », « affirme… »).
  Pas de détails morbides. Résumé de 200 à 350 caractères.
- Les sujets du Quiz de l'actu du même jour doivent figurer dans la revue (lis `quiz/actu/AAAA-MM-JJ.json` s'il existe déjà) :
  le lien « Lis la revue, puis teste-toi » doit tenir sa promesse.
- Ne pas modifier les éditions précédentes.

## Sources

**À privilégier (demande de Bastien, 19/11/2026)** : Le Monde, Libération, Le Figaro et La Dépêche du Midi.
Ils bloquent l'agent web-fetch, mais leurs flux RSS se lisent avec `curl` quand l'environnement cloud du projet
autorise leurs domaines (www.lemonde.fr, www.liberation.fr, www.lefigaro.fr, www.ladepeche.fr) :

| Média | Flux |
|---|---|
| Le Monde | https://www.lemonde.fr/rss/une.xml (et /international/rss_full.xml, /politique/rss_full.xml, /economie/rss_full.xml, /sciences/rss_full.xml, /culture/rss_full.xml, /sport/rss_full.xml) |
| Libération | https://www.liberation.fr/arc/outboundfeeds/rss-all/?outputType=xml |
| Le Figaro | https://www.lefigaro.fr/rss/figaro_actualites.xml |
| La Dépêche | https://www.ladepeche.fr/rss.xml et https://www.ladepeche.fr/communes/toulouse,31555.rss |

```sh
curl -sL -m 20 -A "Mozilla/5.0" "https://www.lemonde.fr/rss/une.xml" -o /tmp/lemonde.xml
```

Ces adresses n'ont pas encore pu être testées depuis le cloud (réseau fermé le 19/11/2026) : corriger ce tableau si l'une d'elles ne répond pas.
Chaque élément donne le titre, le lien, la date, un chapeau et souvent l'image (`media:content`, `enclosure`) :
utiliser ce lien et cette image tels quels. Pour le résumé détaillé, lire l'article avec `curl` si la page est accessible
(les articles réservés aux abonnés n'ont souvent que le début) ; sinon, 2 paragraphes à partir du chapeau et d'autres articles lus sur le même sujet.
Si `curl` échoue (accès refusé par le réseau), le noter dans le compte rendu et passer aux autres sources.

Les grands sites français (franceinfo, Le Monde, BFMTV, Le Figaro, Libération, 20 Minutes, La Dépêche, actu.fr, Europe 1…)
bloquent souvent la lecture directe : les citer depuis un résultat de recherche quand l'extrait énonce le fait.
Lisibles directement (vérifié fin 2026) : Euronews, RTBF, La Libre, Le Matin, Swissinfo, Radio-Canada, Public Sénat,
Futura, Titres Presse, Le Journal Toulousain, rekto.substack.com, presse-evasion.fr.

## Vérification avant publication

```sh
python3 outils/verifier_revue.py revue/data/AAAA-MM-JJ.json
```
