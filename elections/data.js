// Généré par outils/build_elections.py : ne pas modifier à la main.
const DATA = {
"maj": "2026-11-01",
"source": "https://www.france-vote.fr",
"candidats": [
{
"id": "arthaud",
"nom": "Nathalie Arthaud",
"parti": "Lutte ouvrière",
"statut": "Déclarée",
"source": "https://www.france-vote.fr/candidats/nathalie-arthaud"
},
{
"id": "melenchon",
"nom": "Jean-Luc Mélenchon",
"parti": "La France insoumise",
"statut": "Déclaré",
"source": "https://www.france-vote.fr/candidats/jean-luc-melenchon"
},
{
"id": "roussel",
"nom": "Fabien Roussel",
"parti": "PCF",
"statut": "Déclaré",
"source": "https://www.france-vote.fr/candidats/fabien-roussel"
},
{
"id": "ruffin",
"nom": "François Ruffin",
"parti": "Debout !",
"statut": "Déclaré",
"source": "https://www.france-vote.fr/candidats/francois-ruffin"
},
{
"id": "tondelier",
"nom": "Marine Tondelier",
"parti": "Les Écologistes",
"statut": "Déclarée (vote des militants le 13 décembre)",
"source": "https://www.france-vote.fr/candidats/marine-tondelier"
},
{
"id": "glucksmann",
"nom": "Raphaël Glucksmann",
"parti": "Place publique",
"statut": "Vainqueur de la primaire sociale-démocrate",
"source": "https://www.france-vote.fr/candidats/raphael-glucksmann"
},
{
"id": "attal",
"nom": "Gabriel Attal",
"parti": "Renaissance",
"statut": "Déclaré",
"source": "https://www.france-vote.fr/candidats/gabriel-attal"
},
{
"id": "philippe",
"nom": "Édouard Philippe",
"parti": "Horizons",
"statut": "Déclaré",
"source": "https://www.france-vote.fr/candidats/edouard-philippe"
},
{
"id": "bertrand",
"nom": "Xavier Bertrand",
"parti": "Nous France",
"statut": "Déclaré",
"source": "https://www.france-vote.fr/candidats/xavier-bertrand"
},
{
"id": "retailleau",
"nom": "Bruno Retailleau",
"parti": "Les Républicains",
"statut": "Désigné par les militants LR",
"source": "https://www.france-vote.fr/candidats/bruno-retailleau"
},
{
"id": "lisnard",
"nom": "David Lisnard",
"parti": "Nouvelle Énergie",
"statut": "Déclaré",
"source": "https://www.france-vote.fr/candidats/david-lisnard"
},
{
"id": "dupontaignan",
"nom": "Nicolas Dupont-Aignan",
"parti": "Debout la France",
"statut": "Déclaré",
"source": "https://www.france-vote.fr/candidats/nicolas-dupont-aignan"
},
{
"id": "lepen",
"nom": "Marine Le Pen",
"parti": "Rassemblement national",
"statut": "Déclarée",
"source": "https://www.france-vote.fr/candidats/marine-le-pen"
},
{
"id": "zemmour",
"nom": "Éric Zemmour",
"parti": "Reconquête",
"statut": "Annoncé, pas encore officialisé",
"source": "https://www.france-vote.fr/candidats/eric-zemmour"
}
],
"themes": [
{
"id": "travail",
"nom": "Travail et salaires",
"emoji": "💼"
},
{
"id": "retraites",
"nom": "Retraites et santé",
"emoji": "🩺"
},
{
"id": "economie",
"nom": "Impôts et économie",
"emoji": "💶"
},
{
"id": "immigration",
"nom": "Immigration",
"emoji": "🛂"
},
{
"id": "securite",
"nom": "Sécurité et justice",
"emoji": "⚖️"
},
{
"id": "ecologie",
"nom": "Écologie et énergie",
"emoji": "🌱"
},
{
"id": "europe",
"nom": "Europe",
"emoji": "🇪🇺"
},
{
"id": "monde",
"nom": "Défense et monde",
"emoji": "🛡️"
},
{
"id": "ecole",
"nom": "École",
"emoji": "🎒"
},
{
"id": "institutions",
"nom": "Institutions",
"emoji": "🏛️"
},
{
"id": "societe",
"nom": "Société",
"emoji": "🤝"
}
],
"questions": [
{
"id": "soc.smic",
"theme": "travail",
"texte": "L'État doit augmenter fortement le SMIC.",
"ctx": "Le SMIC est le salaire minimum légal, revalorisé chaque année par l'État.",
"pour": "Plus de pouvoir d'achat pour les salariés les moins payés.",
"contre": "Un coût en plus pour les petites entreprises, avec un risque pour l'emploi.",
"pos": [
2,
2,
2,
2,
2,
1,
-2,
-2,
-1,
-2,
-2,
1,
-1,
-1
],
"page": "social",
"axe": [
"x",
-1
]
},
{
"id": "soc.32h",
"theme": "travail",
"texte": "Il faut passer à la semaine de 32 heures ou de 4 jours.",
"ctx": "La durée légale du travail est de 35 heures par semaine depuis 2000.",
"pour": "Mieux partager le travail et améliorer la qualité de vie.",
"contre": "Coûteux pour les entreprises et les services publics, risque de perte de compétitivité.",
"pos": [
2,
2,
2,
1,
1,
0,
-2,
-2,
-2,
-2,
-2,
-1,
-1,
-2
],
"page": "social",
"axe": [
"x",
-1
]
},
{
"id": "soc.rsa",
"theme": "travail",
"texte": "Le RSA doit être versé sans obligation d'heures d'activité.",
"ctx": "Depuis 2025, les allocataires du RSA s'inscrivent à France Travail avec, en principe, 15 heures d'activité par semaine.",
"pour": "Le RSA est un filet de sécurité, il ne doit pas dépendre de conditions.",
"contre": "Une contrepartie aide au retour à l'emploi et rend l'aide plus juste.",
"pos": [
2,
2,
1,
2,
2,
2,
-2,
-2,
-2,
-2,
-2,
-2,
0,
-2
],
"page": "social",
"axe": [
"x",
-1
]
},
{
"id": "soc.retraite",
"theme": "retraites",
"texte": "Il faut garder l'âge de départ à la retraite à 64 ans.",
"ctx": "La réforme de 2023 relève l'âge légal de 62 à 64 ans ; son application a été mise en pause fin 2025.",
"pour": "Le système doit rester financé alors qu'on vit plus longtemps.",
"contre": "Injuste pour ceux qui ont commencé tôt ou ont des métiers pénibles.",
"pos": [
-2,
-2,
-2,
-2,
-2,
-1,
2,
2,
2,
2,
2,
-2,
-2,
2
],
"page": "social",
"axe": [
"x",
1
]
},
{
"id": "san.secu",
"theme": "retraites",
"texte": "La Sécurité sociale doit rembourser 100 % des soins, à la place des mutuelles.",
"ctx": "Aujourd'hui, une partie des soins est payée par les mutuelles ou le patient.",
"pour": "Plus de reste à charge, et on économise les frais de gestion des mutuelles.",
"contre": "Très coûteux pour les finances publiques, moins de liberté de choix.",
"pos": [
2,
2,
2,
2,
2,
1,
-1,
-2,
-2,
-2,
-2,
1,
0,
-2
],
"page": "sante",
"axe": [
"x",
-1
]
},
{
"id": "san.hopital",
"theme": "retraites",
"texte": "Il faut augmenter fortement le budget de l'hôpital public et le nombre de soignants.",
"ctx": "L'hôpital public manque de personnel dans de nombreux services.",
"pour": "Urgences saturées et lits fermés : il faut des moyens.",
"contre": "Le problème est aussi l'organisation, et l'argent public est limité.",
"pos": [
2,
2,
2,
2,
2,
2,
0,
-1,
1,
-1,
-1,
2,
2,
2
],
"page": "sante",
"axe": [
"x",
-1
]
},
{
"id": "san.install",
"theme": "retraites",
"texte": "Les médecins ne doivent plus pouvoir s'installer où ils veulent, pour combler les déserts médicaux.",
"ctx": "Les médecins libéraux choisissent librement où s'installer.",
"pour": "Des millions de Français n'ont pas de médecin traitant.",
"contre": "La contrainte risque de décourager les vocations et de pousser au départ.",
"pos": [
1,
2,
2,
2,
2,
1,
-1,
-1,
1,
-2,
-1,
1,
0,
-1
],
"page": "sante",
"axe": [
"x",
-1
]
},
{
"id": "eco.isf",
"theme": "economie",
"texte": "Il faut rétablir un impôt sur les grandes fortunes.",
"ctx": "L'ISF a été remplacé en 2018 par un impôt sur la seule fortune immobilière (IFI).",
"pour": "Les plus riches doivent contribuer davantage.",
"contre": "Risque de faire partir les fortunes et les investissements à l'étranger.",
"pos": [
2,
2,
2,
2,
2,
2,
-2,
-2,
-2,
-2,
-2,
-1,
0,
-2
],
"page": "economie",
"axe": [
"x",
-1
]
},
{
"id": "eco.prod",
"theme": "economie",
"texte": "Il faut baisser fortement les impôts et les charges des entreprises.",
"ctx": "La France fait partie des pays où les prélèvements sur les entreprises sont les plus élevés d'Europe.",
"pour": "Des entreprises plus compétitives créent plus d'emplois.",
"contre": "Moins de recettes pour l'État, sans garantie d'emplois en retour.",
"pos": [
-2,
-2,
-2,
-2,
-2,
-1,
2,
2,
2,
2,
2,
1,
2,
2
],
"page": "economie",
"axe": [
"x",
1
]
},
{
"id": "eco.deficit",
"theme": "economie",
"texte": "Réduire le déficit doit passer avant toute nouvelle dépense.",
"ctx": "La dette publique dépasse 110 % du PIB et ses intérêts pèsent de plus en plus sur le budget.",
"pour": "On ne peut pas laisser la dette aux générations futures.",
"contre": "Couper dans les dépenses fragilise les services publics et l'activité.",
"pos": [
-2,
-2,
-2,
-2,
-2,
-1,
2,
2,
2,
2,
2,
0,
1,
1
],
"page": "economie",
"axe": [
"x",
1
]
},
{
"id": "eco.protec",
"theme": "economie",
"texte": "Il faut taxer davantage les produits importés pour protéger notre industrie.",
"ctx": "Les droits de douane sont fixés au niveau de l'Union européenne.",
"pour": "Protéger les emplois industriels face à une concurrence déloyale.",
"contre": "Des prix plus élevés pour les consommateurs et des représailles commerciales.",
"pos": [
-2,
1,
1,
2,
0,
0,
-1,
-1,
1,
1,
-1,
2,
2,
2
],
"page": "economie"
},
{
"id": "imm.quotas",
"theme": "immigration",
"texte": "Il faut réduire fortement l'immigration légale, avec des quotas annuels.",
"ctx": "Environ 330 000 premiers titres de séjour sont délivrés chaque année, dont beaucoup à des étudiants.",
"pour": "Mieux maîtriser les arrivées pour mieux intégrer.",
"contre": "L'économie a besoin de travailleurs étrangers, et le droit d'asile ne se plafonne pas.",
"pos": [
-2,
-2,
-1,
0,
-2,
-1,
1,
1,
2,
2,
2,
2,
2,
2
],
"page": "immigration",
"axe": [
"y",
1
]
},
{
"id": "imm.sol",
"theme": "immigration",
"texte": "Un enfant né en France de parents étrangers doit pouvoir devenir français, comme aujourd'hui.",
"ctx": "Aujourd'hui, il devient français à sa majorité s'il a vécu au moins 5 ans en France depuis ses 11 ans.",
"pour": "Le droit du sol est une tradition républicaine qui favorise l'intégration.",
"contre": "La nationalité devrait être une démarche volontaire et non automatique.",
"pos": [
2,
2,
2,
2,
2,
2,
0,
-1,
-1,
-2,
-1,
-2,
-2,
-2
],
"page": "immigration",
"axe": [
"y",
-1
]
},
{
"id": "imm.regul",
"theme": "immigration",
"texte": "Il faut régulariser les sans-papiers qui travaillent dans les métiers qui manquent de bras.",
"ctx": "Le bâtiment, la restauration ou l'aide à domicile emploient de nombreux travailleurs sans papiers.",
"pour": "Ils travaillent déjà et paient des cotisations : autant leur donner des droits.",
"contre": "Ça encouragerait de nouvelles arrivées irrégulières.",
"pos": [
2,
2,
2,
1,
2,
1,
1,
0,
-2,
-2,
-1,
-2,
-2,
-2
],
"page": "immigration",
"axe": [
"y",
-1
]
},
{
"id": "imm.prio",
"theme": "immigration",
"texte": "Les aides sociales non liées à des cotisations doivent être réservées aux Français.",
"ctx": "Les étrangers en situation régulière ont accès à la plupart des aides, parfois après plusieurs années de résidence.",
"pour": "La solidarité nationale doit d'abord bénéficier aux nationaux.",
"contre": "Discriminatoire et probablement contraire à la Constitution.",
"pos": [
-2,
-2,
-2,
-2,
-2,
-2,
-1,
-1,
0,
1,
0,
2,
2,
2
],
"page": "immigration",
"axe": [
"y",
1
]
},
{
"id": "sec.planchers",
"theme": "securite",
"texte": "Il faut des peines minimales automatiques pour les récidivistes.",
"ctx": "Les peines planchers ont existé de 2007 à 2014.",
"pour": "Une sanction certaine dissuade de recommencer.",
"contre": "Le juge doit pouvoir adapter la peine à chaque situation.",
"pos": [
-2,
-2,
-1,
-1,
-2,
-1,
0,
0,
2,
2,
2,
2,
2,
2
],
"page": "securite",
"axe": [
"y",
1
]
},
{
"id": "sec.mineurs",
"theme": "securite",
"texte": "Les mineurs délinquants récidivistes doivent être jugés comme des adultes.",
"ctx": "Aujourd'hui, l'« excuse de minorité » divise en principe la peine par deux pour un mineur.",
"pour": "Certains mineurs commettent des faits très graves en se sachant protégés.",
"contre": "Un mineur peut encore changer : la justice doit d'abord éduquer.",
"pos": [
-2,
-2,
-1,
-1,
-2,
-1,
2,
1,
2,
2,
2,
2,
2,
2
],
"page": "securite",
"axe": [
"y",
1
]
},
{
"id": "sec.police",
"theme": "securite",
"texte": "Il faut un organisme vraiment indépendant pour contrôler la police.",
"ctx": "Les enquêtes sur les policiers sont aujourd'hui menées par l'IGPN, un service de la police.",
"pour": "Ça renforcerait la confiance entre police et population.",
"contre": "Ça traduirait une défiance envers les forces de l'ordre.",
"pos": [
2,
2,
1,
2,
2,
1,
-2,
-1,
-1,
-2,
-1,
-1,
-2,
-2
],
"page": "securite",
"axe": [
"y",
-1
]
},
{
"id": "env.nucleaire",
"theme": "ecologie",
"texte": "La France doit construire une nouvelle génération de réacteurs nucléaires.",
"ctx": "Le nucléaire produit environ 65 % de notre électricité ; 6 réacteurs EPR2 sont prévus.",
"pour": "Une électricité abondante, pilotable et peu émettrice de CO2.",
"contre": "Coûteux, long à construire, et le problème des déchets reste entier.",
"pos": [
null,
-2,
2,
-1,
-2,
1,
2,
2,
2,
2,
2,
2,
2,
2
],
"page": "ecologie"
},
{
"id": "env.enr",
"theme": "ecologie",
"texte": "Il faut accélérer fortement l'éolien et le solaire.",
"ctx": "La France est en retard sur ses objectifs européens d'énergies renouvelables.",
"pour": "Rapides à installer, de moins en moins chers.",
"contre": "Production intermittente, et impact sur les paysages.",
"pos": [
null,
2,
0,
1,
2,
1,
1,
1,
-1,
-2,
-1,
-2,
-2,
-2
],
"page": "ecologie"
},
{
"id": "env.climat",
"theme": "ecologie",
"texte": "Les objectifs climatiques doivent passer en premier, même s'ils imposent des efforts aux ménages et aux entreprises.",
"ctx": "La France s'est engagée à la neutralité carbone en 2050.",
"pour": "Plus on attend, plus les dégâts et les coûts seront élevés.",
"contre": "Les contraintes pèsent d'abord sur les ménages modestes.",
"pos": [
null,
2,
0,
1,
2,
1,
0,
0,
-1,
-1,
-1,
-2,
-2,
-2
],
"page": "ecologie"
},
{
"id": "env.pesticides",
"theme": "ecologie",
"texte": "Il faut réduire fortement les pesticides, quitte à changer le modèle agricole.",
"ctx": "Les plans pour réduire les pesticides n'ont pas atteint leurs objectifs depuis 2008.",
"pour": "Protéger la santé, l'eau et la biodiversité.",
"contre": "Les agriculteurs subissent déjà la concurrence de pays moins exigeants.",
"pos": [
null,
2,
1,
1,
2,
1,
-1,
-1,
-1,
-2,
-1,
-1,
-2,
-2
],
"page": "ecologie"
},
{
"id": "eur.integ",
"theme": "europe",
"texte": "Il faut plus d'Europe : budget commun, défense commune, décisions à la majorité.",
"ctx": "Sur de nombreux sujets, chaque pays a encore un droit de veto.",
"pour": "Unis, les Européens pèsent face aux États-Unis et à la Chine.",
"contre": "Chaque pays perdrait encore du pouvoir de décision.",
"pos": [
-1,
-2,
-1,
-1,
2,
2,
2,
2,
0,
-1,
-1,
-2,
-2,
-2
],
"page": "europe",
"axe": [
"y",
-1
]
},
{
"id": "eur.deroger",
"theme": "europe",
"texte": "La France doit pouvoir ne pas appliquer une règle européenne contraire à ses intérêts.",
"ctx": "Le droit européen s'impose aujourd'hui aux lois nationales.",
"pour": "Les choix des Français doivent primer.",
"contre": "Si chacun fait ce qu'il veut, l'Union ne fonctionne plus.",
"pos": [
0,
2,
2,
2,
-2,
-2,
-2,
-1,
1,
2,
2,
2,
2,
2
],
"page": "europe",
"axe": [
"y",
1
]
},
{
"id": "eur.sortir",
"theme": "europe",
"texte": "La France devrait sortir de l'Union européenne ou de l'euro.",
"ctx": "La France est membre fondateur de la construction européenne.",
"pour": "Retrouver une pleine souveraineté, comme le Royaume-Uni.",
"contre": "Choc économique, et isolement dans un monde instable.",
"pos": [
-1,
-1,
-1,
-1,
-2,
-2,
-2,
-2,
-2,
-2,
-2,
2,
-1,
-1
],
"page": "europe",
"axe": [
"y",
1
]
},
{
"id": "eur.mercosur",
"theme": "europe",
"texte": "La France doit refuser les accords de libre-échange comme celui avec le Mercosur.",
"ctx": "L'accord UE-Mercosur supprime des droits de douane avec le Brésil, l'Argentine, l'Uruguay et le Paraguay.",
"pour": "Protéger les agriculteurs d'une concurrence aux normes plus faibles.",
"contre": "Des débouchés perdus pour l'industrie et les vins et fromages français.",
"pos": [
0,
2,
2,
2,
2,
2,
1,
0,
2,
2,
1,
2,
2,
2
],
"page": "europe"
},
{
"id": "int.ukraine",
"theme": "monde",
"texte": "La France doit continuer à aider militairement l'Ukraine.",
"ctx": "La France livre des armes à l'Ukraine depuis l'invasion russe de 2022.",
"pour": "La sécurité de l'Europe se joue en Ukraine.",
"contre": "Risque d'escalade, et l'argent manque ailleurs.",
"pos": [
-1,
-1,
-1,
0,
2,
2,
2,
2,
2,
1,
1,
-1,
0,
-1
],
"page": "international"
},
{
"id": "int.otan",
"theme": "monde",
"texte": "La France doit rester dans le commandement militaire intégré de l'OTAN.",
"ctx": "La France l'a quitté en 1966 sous de Gaulle et l'a réintégré en 2009.",
"pour": "L'alliance protège la France et ses voisins.",
"contre": "Ça place la France sous l'influence des États-Unis.",
"pos": [
-1,
-2,
-2,
-1,
1,
2,
2,
2,
1,
1,
0,
-2,
-1,
-2
],
"page": "international"
},
{
"id": "int.defense",
"theme": "monde",
"texte": "Il faut augmenter fortement le budget de l'armée, quitte à réduire d'autres dépenses.",
"ctx": "Le budget des armées a augmenté chaque année depuis 2017.",
"pour": "Le monde est plus dangereux, il faut pouvoir se défendre.",
"contre": "Ce serait au détriment de l'école, de la santé ou de l'écologie.",
"pos": [
-2,
-1,
-1,
0,
0,
2,
2,
2,
1,
2,
1,
1,
1,
2
],
"page": "international"
},
{
"id": "int.aide",
"theme": "monde",
"texte": "L'aide aux pays pauvres doit dépendre de leur coopération pour reprendre leurs migrants expulsés.",
"ctx": "Beaucoup d'expulsions échouent car le pays d'origine ne délivre pas les papiers.",
"pour": "Un levier pour faire appliquer les expulsions.",
"contre": "Ça pénalise des populations qui ont besoin de cette aide.",
"pos": [
-2,
-2,
-1,
-1,
-2,
-1,
1,
1,
2,
2,
1,
2,
2,
2
],
"page": "international",
"axe": [
"y",
1
]
},
{
"id": "edu.uniforme",
"theme": "ecole",
"texte": "Il faut l'uniforme ou une tenue unique à l'école.",
"ctx": "Une expérimentation de la tenue unique est menée dans des écoles volontaires depuis 2024.",
"pour": "Moins de compétition sur les marques, plus de sentiment d'appartenance.",
"contre": "Coûteux pour les familles, et sans effet prouvé sur les résultats.",
"pos": [
-2,
-2,
-1,
-1,
-2,
-1,
2,
1,
1,
2,
1,
2,
2,
2
],
"page": "education",
"axe": [
"y",
1
]
},
{
"id": "edu.college",
"theme": "ecole",
"texte": "Il faut garder le même collège pour tous jusqu'à la 3e.",
"ctx": "Le collège unique existe depuis 1975.",
"pour": "Ne pas trier les élèves trop tôt.",
"contre": "Une orientation plus précoce aiderait les élèves en difficulté.",
"pos": [
2,
2,
1,
1,
2,
1,
-1,
-1,
-1,
-2,
-2,
-1,
-2,
-2
],
"page": "education",
"axe": [
"y",
-1
]
},
{
"id": "edu.prive",
"theme": "ecole",
"texte": "Il faut réduire l'argent public versé aux écoles privées sous contrat.",
"ctx": "Environ 17 % des élèves sont dans le privé sous contrat, dont les profs sont payés par l'État.",
"pour": "Le privé trie ses élèves alors qu'il est financé par tous.",
"contre": "Les familles doivent pouvoir choisir leur école.",
"pos": [
2,
2,
2,
1,
2,
0,
-1,
-1,
-1,
-2,
-2,
-1,
-1,
-2
],
"page": "education",
"axe": [
"x",
-1
]
},
{
"id": "edu.autonomie",
"theme": "ecole",
"texte": "Les chefs d'établissement doivent pouvoir recruter eux-mêmes leurs professeurs.",
"ctx": "Aujourd'hui, les professeurs sont affectés par l'Éducation nationale selon un barème.",
"pour": "Des équipes choisies et soudées autour d'un projet.",
"contre": "Inégalités entre établissements, et risque de favoritisme.",
"pos": [
-2,
-2,
-2,
-2,
-2,
-1,
2,
2,
1,
2,
2,
-1,
-1,
1
],
"page": "education",
"axe": [
"x",
1
]
},
{
"id": "ins.ric",
"theme": "institutions",
"texte": "Les citoyens doivent pouvoir déclencher un référendum sur n'importe quel sujet.",
"ctx": "Le référendum d'initiative partagée existe, mais il exige des parlementaires et 4,8 millions de signatures.",
"pour": "Plus de pouvoir direct pour les citoyens.",
"contre": "Risque de décisions sous le coup de l'émotion.",
"pos": [
0,
2,
1,
2,
1,
-1,
0,
-1,
0,
-2,
0,
2,
1,
1
],
"page": "institutions"
},
{
"id": "ins.propo",
"theme": "institutions",
"texte": "Les députés doivent être élus à la proportionnelle.",
"ctx": "Les députés sont élus au scrutin majoritaire dans 577 circonscriptions.",
"pour": "Une Assemblée qui reflète vraiment les votes.",
"contre": "Risque de majorités introuvables et d'instabilité.",
"pos": [
1,
2,
2,
2,
2,
1,
0,
-1,
-1,
-2,
-1,
0,
2,
2
],
"page": "institutions"
},
{
"id": "ins.vie",
"theme": "institutions",
"texte": "Il faut passer à une VIe République, avec un président aux pouvoirs réduits.",
"ctx": "La Ve République date de 1958 et donne au président un rôle central.",
"pour": "Rééquilibrer les pouvoirs au profit du Parlement et des citoyens.",
"contre": "La Ve République a apporté la stabilité.",
"pos": [
0,
2,
2,
2,
2,
0,
-1,
-2,
-1,
-2,
-1,
-1,
-1,
-2
],
"page": "institutions"
},
{
"id": "ins.referendum",
"theme": "institutions",
"texte": "Les grandes questions d'immigration doivent être tranchées par référendum.",
"ctx": "La Constitution ne permet pas aujourd'hui de référendum sur l'immigration.",
"pour": "Un sujet si important doit être décidé par le peuple.",
"contre": "Les droits fondamentaux ne devraient pas dépendre d'un vote.",
"pos": [
-1,
0,
0,
0,
-2,
-1,
1,
0,
2,
2,
2,
2,
2,
2
],
"page": "institutions",
"axe": [
"y",
1
]
},
{
"id": "san.mourir",
"theme": "societe",
"texte": "Il faut légaliser une aide à mourir strictement encadrée.",
"ctx": "Une proposition de loi sur l'aide à mourir est débattue au Parlement depuis 2025.",
"pour": "Le droit de choisir sa fin de vie face à des souffrances insupportables.",
"contre": "Risque de pressions sur les personnes vulnérables ; priorité aux soins palliatifs.",
"pos": [
2,
2,
2,
2,
2,
2,
2,
0,
0,
-2,
0,
-2,
-2,
-2
],
"page": "sante",
"axe": [
"y",
-1
]
},
{
"id": "sec.cannabis",
"theme": "societe",
"texte": "Il faut légaliser ou dépénaliser le cannabis.",
"ctx": "La France a l'une des lois les plus strictes d'Europe et l'une des plus fortes consommations.",
"pour": "Assécher les trafics et mieux protéger la santé.",
"contre": "Banaliser une drogue dangereuse, surtout pour les jeunes.",
"pos": [
1,
2,
1,
0,
2,
1,
1,
0,
-2,
-2,
-2,
-2,
-2,
-2
],
"page": "securite",
"axe": [
"y",
-1
]
}
],
"syntheses": {
"eco": [
"Expropriation des grandes fortunes, contrôle des travailleurs sur les entreprises, refus de baisser les cotisations patronales.",
"ISF progressif, planification écologique financée par l'emprunt, protectionnisme solidaire.",
"ISF triplé, taxation des superprofits, refus des exonérations de cotisations, défense de l'industrie.",
"Rétablissement de l'ISF et « taxe Zucman », aides publiques conditionnées à l'emploi, protectionnisme industriel.",
"ISF renforcé, aides aux entreprises conditionnées à l'écologie, investissement public dans la transition.",
"Taxation européenne des ultra-riches, fiscalité du capital alignée sur celle du travail, investissement vert.",
"Refus de nouveaux impôts sur le patrimoine, baisse des cotisations employeurs, règle d'or budgétaire.",
"Cinquante milliards de baisse des impôts de production, déficit sous 3 %, refus de l'ISF.",
"Division par deux des impôts de production, refus de l'ISF, financement par baisse des dépenses.",
"Quarante milliards d'allègements de charges, impôt sur les sociétés à 20 %, cinquante milliards d'économies.",
"Baisse de 200 à 300 milliards de dépenses publiques, refus des impôts sur le patrimoine, dérégulation.",
"Patriotisme économique, renationalisation des autoroutes et d'EDF, protectionnisme ciblé.",
"Baisse de TVA sur l'énergie, exonérations ciblées de cotisations, refus de l'ISF, préférence nationale.",
"Trente milliards de baisse des impôts de production, refus de l'ISF, préférence nationale pour les aides."
],
"soc": [
"Retraite à 60 ans, SMIC à 2 000 € net, minima sociaux sans condition, interdiction des licenciements.",
"Abrogation de la réforme de 2023, retour à 60 ans, SMIC à 1 600 € net, semaine de 32 heures.",
"Retraite à 60 ans, SMIC à 1 500 € net, 32 heures, droit garanti à l'emploi ou à la formation.",
"Retraite à 60 ans, SMIC à 1 700 € net, opposition à la conditionnalité du RSA.",
"Retour à 62 ans, SMIC à 1 600 € net, minima relevés, 32 heures pour les métiers pénibles.",
"Départ entre 62 et 64 ans selon la carrière, hausse du SMIC, refus de conditionner le RSA.",
"Maintien de la réforme de 2023, dose de capitalisation, RSA conditionné à 15 heures, pas de hausse imposée du SMIC.",
"Âge légal vers 65 ans, dose de capitalisation, RSA conditionné, refus des hausses de salaires imposées.",
"Âge légal à 64 puis 65 ans, RSA conditionné, prime d'activité plutôt que hausse du SMIC.",
"Refus de l'abrogation, capitalisation complémentaire, RSA plafonné et conditionné, temps de travail allongé.",
"Retraite à 65 ans avec capitalisation, RSA conditionné, baisse des charges plutôt que hausse du SMIC.",
"Abrogation de la réforme de 2023, hausse des bas salaires par baisse de charges, RSA conditionné à une activité.",
"Retour à 62 ans (60 ans pour les carrières longues), exonérations sur les hausses de salaires.",
"Âge légal à 64 ans, baisse de la CSG plutôt que hausse du SMIC, aides réservées aux nationaux."
],
"imm": [
"Libre circulation, régularisation générale, aucune distinction entre travailleurs français et étrangers.",
"Rejette quotas et restriction du droit du sol, régularise les travailleurs, agit sur les causes des migrations.",
"Régularise les sans-papiers au travail et défend l'asile, tout en affichant la fermeté aux frontières.",
"Accueil digne et pleins droits pour ceux déjà présents, mais méfiance envers l'immigration de travail.",
"Accueil, voies légales et abrogation des lois restrictives ; rejette quotas et recul du droit du sol.",
"Refuse le durcissement automatique, prône une convention citoyenne sur le sujet.",
"Immigration sélective, regroupement familial limité, pas de préférence nationale, régularisations ciblées.",
"Pilotage des flux, accès à la nationalité durci, objectifs chiffrés débattus chaque année au Parlement.",
"Quotas votés chaque année après révision constitutionnelle et référendum, arrêt des régularisations.",
"Fin du droit du sol, regroupement familial réduit, aides automatiques aux étrangers supprimées, référendum.",
"Reprise du contrôle migratoire, droit national au-dessus des juridictions européennes, référendum.",
"Fin du droit du sol, naturalisation exigeante, renégociation des traités européens et de la CEDH.",
"Forte baisse de l'immigration légale, fin du droit du sol, préférence nationale pour les aides, par référendum.",
"Arrêt affiché de l'immigration, fin du droit du sol, large fermeture des droits sociaux aux étrangers."
],
"sec": [
"Dénonce la surenchère répressive et défend le contrôle des violences policières, sans automatismes pénaux.",
"Rejette les automatismes pénaux, prône un cannabis légal sous monopole public et un contrôle indépendant de la police.",
"Plus d'effectifs de police, dépénalisation du cannabis plutôt que légalisation.",
"Sécurité du quotidien et moyens policiers, sans adhérer aux peines planchers.",
"Police de proximité, peines alternatives, cannabis encadré et instance indépendante de contrôle.",
"Refuse la surenchère sécuritaire, reconnaît la demande d'ordre, veut plus de moyens pour la justice.",
"Autorité revendiquée, fin de l'excuse de minorité pour les récidivistes, comparutions immédiates élargies.",
"Renforcement judiciaire et pénitentiaire, fermeté sur la récidive, sans engagement clair sur les peines planchers.",
"Rétablissement des peines planchers, fin de l'excuse de minorité pour les récidivistes, fermeté contre les trafics.",
"Peines planchers, fin de l'excuse de minorité, combat contre le narcotrafic, refus d'un contrôle externe de la police.",
"Fin de l'impunité, moyens accrus pour police et justice, révision de la justice des mineurs.",
"Peines planchers, majorité pénale abaissée, places de prison supplémentaires, contre toute légalisation.",
"Peines planchers, fin de l'excuse de minorité, tolérance zéro sur les stupéfiants.",
"Peines planchers, majorité pénale à 16 ans, expulsion des délinquants étrangers, refus de toute dépénalisation."
],
"env": [
"Critique du productivisme, refus des taxes pesant sur les salariés ; pas de position précise sur ces questions.",
"Planification écologique, sortie progressive du nucléaire, cap sur 100 % renouvelables, forte baisse des pesticides.",
"Nucléaire public comme socle décarboné, méfiance envers l'écologie de la contrainte.",
"Écologie liée au social, sortie du nucléaire soumise à référendum, soutien aux renouvelables citoyens.",
"Sortie du nucléaire jugé trop cher et trop lent, renouvelables accélérés, objectifs climatiques contraignants.",
"Pacte vert européen, mix nucléaire et renouvelables, réindustrialisation décarbonée.",
"Relance du nucléaire, développement des renouvelables, pause sur certaines normes européennes.",
"Relance du nucléaire, refus de l'écologie de la contrainte, allègement des normes.",
"Priorité au nucléaire, opposition aux projets éoliens terrestres, refus des normes jugées pénalisantes.",
"Nucléaire quasi exclusif (six EPR2), arrêt du financement public de l'éolien et du solaire.",
"Nucléaire d'abord, fin des subventions aux renouvelables, allègement des normes.",
"Indépendance énergétique par le nucléaire, moratoire sur l'éolien, défense des agriculteurs face aux normes.",
"Relance massive du nucléaire, moratoire sur l'éolien et le solaire, défense du modèle agricole.",
"Nucléaire massif, hostilité à l'éolien, contestation des objectifs climatiques contraignants."
],
"eur": [
"Internationalisme ouvrier, hostile à l'Europe du capital, sans sortie nationale.",
"Désobéissance aux traités, rejet du fédéralisme, maintien dans l'Union, hostilité au libre-échange.",
"Rupture avec les traités libéraux, coopération entre nations égales.",
"Désobéissance aux règles européennes, sans sortie de l'Union ni de l'euro.",
"Fédéralisme assumé, budget commun, fin du droit de veto, rejet des accords de libre-échange.",
"Saut fédéral, budget commun, défense intégrée, refus des accords commerciaux non alignés sur nos normes.",
"Europe puissance, emprunt commun, opposition au Mercosur en l'état.",
"Europe puissance et défense commune, approche pragmatique des accords commerciaux.",
"Europe resserrée sur l'essentiel, défense des agriculteurs, refus des surtranspositions.",
"Primauté du droit national, Europe des nations, refus des accords pénalisant l'agriculture.",
"Révision de la primauté du droit européen, subsidiarité renforcée, référendum sur l'Europe.",
"Remplacer l'Union par une communauté d'États, sortie de l'euro envisagée.",
"Europe à la carte, primauté du droit national, sans sortie de l'Union.",
"Europe des nations, primauté du droit national, refus du fédéralisme et des accords commerciaux."
],
"int": [
"Refuse de choisir entre Moscou et l'OTAN, contre les livraisons d'armes et la hausse des budgets militaires.",
"Non-alignement, sortie du commandement intégré de l'OTAN, négociation prioritaire en Ukraine.",
"Sortie de l'OTAN, sécurité collective paneuropéenne, hostile à la course aux armements.",
"Soutien mesuré à l'Ukraine, refus d'un réarmement financé par le social.",
"Soutien ferme à l'Ukraine, défense européenne commune, sans remettre en cause l'Alliance atlantique.",
"Soutien maximal à l'Ukraine, saisie des avoirs russes, réarmement rapide du continent.",
"Soutien militaire durable à l'Ukraine, effort de défense accru.",
"Soutien à l'Ukraine, forte hausse du budget des armées, défense européenne adossée à l'OTAN.",
"Soutien à l'Ukraine, hausse du budget des armées, aide au développement liée à la coopération migratoire.",
"Réarmement prioritaire, soutien à l'Ukraine, aide liée aux réadmissions de migrants.",
"Effort de défense accru, soutien à l'Ukraine, diplomatie gaullienne.",
"Sortie de l'OTAN, neutralité recherchée dans le conflit ukrainien.",
"Réarmement souverain, sortie du commandement intégré à terme, soutien limité à l'Ukraine.",
"Sortie du commandement intégré, relations normalisées avec la Russie, forte hausse du budget militaire."
],
"ins": [
"Voit les institutions comme un décor du pouvoir économique, sans projet constitutionnel.",
"Assemblée constituante, VIe République parlementaire, RIC et proportionnelle intégrale.",
"VIe République avec primauté du Parlement, proportionnelle et RIC encadré.",
"VIe République, proportionnelle et RIC.",
"Sortie de la Ve République par une constituante, proportionnelle intégrale.",
"Conventions citoyennes préférées au RIC, institutions réformées plutôt que refondées.",
"Ve République modernisée, dose de proportionnelle, recours régulier au référendum.",
"Exécutif renforcé, 15 % de proportionnelle, référendums choisis plutôt que RIC.",
"Révision constitutionnelle par référendum (immigration, terrorisme, laïcité).",
"Défense du régime actuel et du scrutin majoritaire, référendum sur les sujets régaliens.",
"Réforme de la Ve République, décentralisation renforcée, référendum sur l'immigration.",
"RIC dès 500 000 signatures, dose de proportionnelle.",
"Proportionnelle intégrale, RIC encadré, référendum sur l'immigration.",
"Proportionnelle intégrale, référendums sur l'immigration, exécutif présidentiel fort."
],
"san": [
"Embauches massives à l'hôpital, remboursement intégral, médecins salariés en zones sous-dotées.",
"Plan d'urgence pour l'hôpital, 100 % Sécu, régulation de l'installation des médecins.",
"100 % Sécu sur les soins prescrits, centres de santé publics, médecins salariés contre les déserts.",
"Hôpital de proximité renforcé, régulation des installations, remboursement intégral.",
"Zéro reste à charge, centres publics à médecins salariés, soutien à l'aide à mourir.",
"Investissement public dans l'hôpital, baisse du reste à charge, lutte contre les déserts médicaux.",
"Investissement ciblé, refus de la « Grande Sécu », soutien à l'aide à mourir.",
"Maîtrise des dépenses, maintien des complémentaires, réserve sur la régulation des installations.",
"Accès aux soins dans les territoires, maintien des complémentaires.",
"Maintien des complémentaires, liberté d'installation, opposition à l'aide à mourir.",
"Gestion décentralisée de l'hôpital, maintien des complémentaires, pas de hausse générale des dépenses.",
"Plan de sauvetage de l'hôpital, lutte contre les déserts médicaux, opposition à l'euthanasie.",
"Grand plan d'investissement pour l'hôpital, opposition personnelle à l'aide à mourir.",
"Recrutement de 40 000 soignants, opposition à l'aide à mourir."
],
"edu": [
"Défend l'école publique, recrutements massifs, contre l'uniforme et la sélection.",
"Recrutements, gratuité réelle et moins d'argent public pour le privé.",
"École publique renforcée, contrôle du financement du privé, sans uniforme.",
"Priorité à l'école de proximité et aux quartiers populaires, contre le tri social précoce.",
"Mixité sociale imposée au privé sous contrat, refus de la sélection.",
"Investissement dans l'école publique, mixité sociale, position nuancée sur le privé.",
"Tenue unique, groupes de niveau, plus d'autonomie pour les établissements.",
"Autonomie et liberté de recrutement, orientation plus précoce.",
"Uniforme au choix des établissements, apprentissage développé.",
"Uniforme obligatoire, orientation précoce, recrutement par les chefs d'établissement.",
"Chèque éducation, libre choix de l'établissement, recrutement direct des enseignants.",
"Uniforme obligatoire, autorité renforcée, cadre national maintenu.",
"Uniforme obligatoire, collège modulaire à la place du collège unique, apprentissage dès 14 ans.",
"Uniforme obligatoire, filières professionnelles dès la cinquième, soutien au privé."
]
}
};
