# Phrase de fin du SUTOM (relais Cloudflare)

Le site est public : la clé Anthropic ne peut pas y être. Ce petit Worker la garde secrète
et ne répond qu'au site `https://bvialade.github.io`.

## Mise en place (une fois, ~10 minutes)

1. Clé API : sur https://console.anthropic.com, créer une clé (Settings → API keys) et
   ajouter un petit crédit. Fixer une limite de dépense mensuelle basse (ex. 2 $).
2. Cloudflare : créer un compte gratuit sur https://dash.cloudflare.com, puis
   Workers & Pages → Create → Worker → « Hello World ». Nommer `sutom-phrase`, déployer.
3. Edit code : coller le contenu de `worker.js`, puis Deploy.
4. Settings → Variables and Secrets :
   - Secret `ANTHROPIC_API_KEY` = la clé de l'étape 1
   - Texte `ALLOWED_ORIGIN` = `https://bvialade.github.io`
   - (facultatif) Texte `MODEL` = `claude-haiku-5-5` pour un coût encore plus bas
     (par défaut `claude-opus-5-5`, meilleur pour les jeux de mots).
5. Copier l'adresse du Worker (`https://sutom-phrase.<compte>.workers.dev`) et la mettre
   dans `PHRASE_API` en haut de `mot/mot.js`.

Coût : une phrase fait environ 150 jetons en entrée et 50 en sortie, soit une fraction de
centime par partie gagnée. Si le Worker ne répond pas, le jeu n'affiche simplement pas de phrase.
