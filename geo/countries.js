// Pays membres de l'ONU (+ Vatican). Données : world-countries (ODbL), capitales en français.
const COUNTRIES = [
{
"id": "afg",
"n": "Afghanistan",
"c": "Kaboul",
"r": "asie"
},
{
"id": "zaf",
"n": "Afrique du Sud",
"c": "Pretoria",
"r": "afrique"
},
{
"id": "alb",
"n": "Albanie",
"c": "Tirana",
"r": "europe"
},
{
"id": "dza",
"n": "Algérie",
"c": "Alger",
"r": "afrique"
},
{
"id": "deu",
"n": "Allemagne",
"c": "Berlin",
"r": "europe"
},
{
"id": "and",
"n": "Andorre",
"c": "Andorre-la-Vieille",
"r": "europe"
},
{
"id": "ago",
"n": "Angola",
"c": "Luanda",
"r": "afrique"
},
{
"id": "atg",
"n": "Antigua-et-Barbuda",
"c": "Saint John's",
"r": "ameriques"
},
{
"id": "sau",
"n": "Arabie saoudite",
"c": "Riyad",
"r": "asie"
},
{
"id": "arg",
"n": "Argentine",
"c": "Buenos Aires",
"r": "ameriques"
},
{
"id": "arm",
"n": "Arménie",
"c": "Erevan",
"r": "asie"
},
{
"id": "aus",
"n": "Australie",
"c": "Canberra",
"r": "oceanie"
},
{
"id": "aut",
"n": "Autriche",
"c": "Vienne",
"r": "europe"
},
{
"id": "aze",
"n": "Azerbaïdjan",
"c": "Bakou",
"r": "asie"
},
{
"id": "bhs",
"n": "Bahamas",
"c": "Nassau",
"r": "ameriques"
},
{
"id": "bhr",
"n": "Bahreïn",
"c": "Manama",
"r": "asie"
},
{
"id": "bgd",
"n": "Bangladesh",
"c": "Dacca",
"r": "asie"
},
{
"id": "brb",
"n": "Barbade",
"c": "Bridgetown",
"r": "ameriques"
},
{
"id": "bel",
"n": "Belgique",
"c": "Bruxelles",
"r": "europe"
},
{
"id": "blz",
"n": "Belize",
"c": "Belmopan",
"r": "ameriques"
},
{
"id": "btn",
"n": "Bhoutan",
"c": "Thimphou",
"r": "asie"
},
{
"id": "mmr",
"n": "Birmanie",
"c": "Naypyidaw",
"r": "asie"
},
{
"id": "blr",
"n": "Biélorussie",
"c": "Minsk",
"r": "europe"
},
{
"id": "bol",
"n": "Bolivie",
"c": "Sucre",
"r": "ameriques"
},
{
"id": "bih",
"n": "Bosnie-Herzégovine",
"c": "Sarajevo",
"r": "europe"
},
{
"id": "bwa",
"n": "Botswana",
"c": "Gaborone",
"r": "afrique"
},
{
"id": "brn",
"n": "Brunei",
"c": "Bandar Seri Begawan",
"r": "asie"
},
{
"id": "bra",
"n": "Brésil",
"c": "Brasilia",
"r": "ameriques"
},
{
"id": "bgr",
"n": "Bulgarie",
"c": "Sofia",
"r": "europe"
},
{
"id": "bfa",
"n": "Burkina Faso",
"c": "Ouagadougou",
"r": "afrique"
},
{
"id": "bdi",
"n": "Burundi",
"c": "Gitega",
"r": "afrique"
},
{
"id": "ben",
"n": "Bénin",
"c": "Porto-Novo",
"r": "afrique"
},
{
"id": "khm",
"n": "Cambodge",
"c": "Phnom Penh",
"r": "asie"
},
{
"id": "cmr",
"n": "Cameroun",
"c": "Yaoundé",
"r": "afrique"
},
{
"id": "can",
"n": "Canada",
"c": "Ottawa",
"r": "ameriques"
},
{
"id": "cpv",
"n": "Cap-Vert",
"c": "Praia",
"r": "afrique"
},
{
"id": "chl",
"n": "Chili",
"c": "Santiago",
"r": "ameriques"
},
{
"id": "chn",
"n": "Chine",
"c": "Pékin",
"r": "asie"
},
{
"id": "cyp",
"n": "Chypre",
"c": "Nicosie",
"r": "europe"
},
{
"id": "col",
"n": "Colombie",
"c": "Bogota",
"r": "ameriques"
},
{
"id": "com",
"n": "Comores",
"c": "Moroni",
"r": "afrique"
},
{
"id": "cog",
"n": "Congo",
"c": "Brazzaville",
"r": "afrique"
},
{
"id": "prk",
"n": "Corée du Nord",
"c": "Pyongyang",
"r": "asie"
},
{
"id": "kor",
"n": "Corée du Sud",
"c": "Séoul",
"r": "asie"
},
{
"id": "cri",
"n": "Costa Rica",
"c": "San José",
"r": "ameriques"
},
{
"id": "hrv",
"n": "Croatie",
"c": "Zagreb",
"r": "europe"
},
{
"id": "cub",
"n": "Cuba",
"c": "La Havane",
"r": "ameriques"
},
{
"id": "civ",
"n": "Côte d'Ivoire",
"c": "Yamoussoukro",
"r": "afrique"
},
{
"id": "dnk",
"n": "Danemark",
"c": "Copenhague",
"r": "europe"
},
{
"id": "dji",
"n": "Djibouti",
"c": "Djibouti",
"r": "afrique"
},
{
"id": "dma",
"n": "Dominique",
"c": "Roseau",
"r": "ameriques"
},
{
"id": "esp",
"n": "Espagne",
"c": "Madrid",
"r": "europe"
},
{
"id": "est",
"n": "Estonie",
"c": "Tallinn",
"r": "europe"
},
{
"id": "swz",
"n": "Eswatini",
"c": "Mbabane",
"r": "afrique"
},
{
"id": "fji",
"n": "Fidji",
"c": "Suva",
"r": "oceanie"
},
{
"id": "fin",
"n": "Finlande",
"c": "Helsinki",
"r": "europe"
},
{
"id": "fra",
"n": "France",
"c": "Paris",
"r": "europe"
},
{
"id": "gab",
"n": "Gabon",
"c": "Libreville",
"r": "afrique"
},
{
"id": "gmb",
"n": "Gambie",
"c": "Banjul",
"r": "afrique"
},
{
"id": "gha",
"n": "Ghana",
"c": "Accra",
"r": "afrique"
},
{
"id": "grd",
"n": "Grenade",
"c": "Saint-Georges",
"r": "ameriques"
},
{
"id": "grc",
"n": "Grèce",
"c": "Athènes",
"r": "europe"
},
{
"id": "gtm",
"n": "Guatemala",
"c": "Guatemala",
"r": "ameriques"
},
{
"id": "gin",
"n": "Guinée",
"c": "Conakry",
"r": "afrique"
},
{
"id": "gnq",
"n": "Guinée équatoriale",
"c": "Malabo",
"r": "afrique"
},
{
"id": "gnb",
"n": "Guinée-Bissau",
"c": "Bissau",
"r": "afrique"
},
{
"id": "guy",
"n": "Guyana",
"c": "Georgetown",
"r": "ameriques"
},
{
"id": "geo",
"n": "Géorgie",
"c": "Tbilissi",
"r": "asie"
},
{
"id": "hti",
"n": "Haïti",
"c": "Port-au-Prince",
"r": "ameriques"
},
{
"id": "hnd",
"n": "Honduras",
"c": "Tegucigalpa",
"r": "ameriques"
},
{
"id": "hun",
"n": "Hongrie",
"c": "Budapest",
"r": "europe"
},
{
"id": "ind",
"n": "Inde",
"c": "New Delhi",
"r": "asie"
},
{
"id": "idn",
"n": "Indonésie",
"c": "Jakarta",
"r": "asie"
},
{
"id": "irq",
"n": "Irak",
"c": "Bagdad",
"r": "asie"
},
{
"id": "irn",
"n": "Iran",
"c": "Téhéran",
"r": "asie"
},
{
"id": "irl",
"n": "Irlande",
"c": "Dublin",
"r": "europe"
},
{
"id": "isl",
"n": "Islande",
"c": "Reykjavik",
"r": "europe"
},
{
"id": "isr",
"n": "Israël",
"c": "Jérusalem",
"r": "asie"
},
{
"id": "ita",
"n": "Italie",
"c": "Rome",
"r": "europe"
},
{
"id": "jam",
"n": "Jamaïque",
"c": "Kingston",
"r": "ameriques"
},
{
"id": "jpn",
"n": "Japon",
"c": "Tokyo",
"r": "asie"
},
{
"id": "jor",
"n": "Jordanie",
"c": "Amman",
"r": "asie"
},
{
"id": "kaz",
"n": "Kazakhstan",
"c": "Astana",
"r": "asie"
},
{
"id": "ken",
"n": "Kenya",
"c": "Nairobi",
"r": "afrique"
},
{
"id": "kgz",
"n": "Kirghizistan",
"c": "Bichkek",
"r": "asie"
},
{
"id": "kir",
"n": "Kiribati",
"c": "Tarawa-Sud",
"r": "oceanie"
},
{
"id": "kwt",
"n": "Koweït",
"c": "Koweït",
"r": "asie"
},
{
"id": "lao",
"n": "Laos",
"c": "Vientiane",
"r": "asie"
},
{
"id": "lso",
"n": "Lesotho",
"c": "Maseru",
"r": "afrique"
},
{
"id": "lva",
"n": "Lettonie",
"c": "Riga",
"r": "europe"
},
{
"id": "lbn",
"n": "Liban",
"c": "Beyrouth",
"r": "asie"
},
{
"id": "lbr",
"n": "Liberia",
"c": "Monrovia",
"r": "afrique"
},
{
"id": "lby",
"n": "Libye",
"c": "Tripoli",
"r": "afrique"
},
{
"id": "lie",
"n": "Liechtenstein",
"c": "Vaduz",
"r": "europe"
},
{
"id": "ltu",
"n": "Lituanie",
"c": "Vilnius",
"r": "europe"
},
{
"id": "lux",
"n": "Luxembourg",
"c": "Luxembourg",
"r": "europe"
},
{
"id": "mkd",
"n": "Macédoine du Nord",
"c": "Skopje",
"r": "europe"
},
{
"id": "mdg",
"n": "Madagascar",
"c": "Antananarivo",
"r": "afrique"
},
{
"id": "mys",
"n": "Malaisie",
"c": "Kuala Lumpur",
"r": "asie"
},
{
"id": "mwi",
"n": "Malawi",
"c": "Lilongwe",
"r": "afrique"
},
{
"id": "mdv",
"n": "Maldives",
"c": "Malé",
"r": "asie"
},
{
"id": "mli",
"n": "Mali",
"c": "Bamako",
"r": "afrique"
},
{
"id": "mlt",
"n": "Malte",
"c": "La Valette",
"r": "europe"
},
{
"id": "mar",
"n": "Maroc",
"c": "Rabat",
"r": "afrique"
},
{
"id": "mus",
"n": "Maurice",
"c": "Port-Louis",
"r": "afrique"
},
{
"id": "mrt",
"n": "Mauritanie",
"c": "Nouakchott",
"r": "afrique"
},
{
"id": "mex",
"n": "Mexique",
"c": "Mexico",
"r": "ameriques"
},
{
"id": "fsm",
"n": "Micronésie",
"c": "Palikir",
"r": "oceanie"
},
{
"id": "mda",
"n": "Moldavie",
"c": "Chisinau",
"r": "europe"
},
{
"id": "mco",
"n": "Monaco",
"c": "Monaco",
"r": "europe"
},
{
"id": "mng",
"n": "Mongolie",
"c": "Oulan-Bator",
"r": "asie"
},
{
"id": "mne",
"n": "Monténégro",
"c": "Podgorica",
"r": "europe"
},
{
"id": "moz",
"n": "Mozambique",
"c": "Maputo",
"r": "afrique"
},
{
"id": "nam",
"n": "Namibie",
"c": "Windhoek",
"r": "afrique"
},
{
"id": "nru",
"n": "Nauru",
"c": "Yaren",
"r": "oceanie"
},
{
"id": "nic",
"n": "Nicaragua",
"c": "Managua",
"r": "ameriques"
},
{
"id": "ner",
"n": "Niger",
"c": "Niamey",
"r": "afrique"
},
{
"id": "nga",
"n": "Nigéria",
"c": "Abuja",
"r": "afrique"
},
{
"id": "nor",
"n": "Norvège",
"c": "Oslo",
"r": "europe"
},
{
"id": "nzl",
"n": "Nouvelle-Zélande",
"c": "Wellington",
"r": "oceanie"
},
{
"id": "npl",
"n": "Népal",
"c": "Katmandou",
"r": "asie"
},
{
"id": "omn",
"n": "Oman",
"c": "Mascate",
"r": "asie"
},
{
"id": "uga",
"n": "Ouganda",
"c": "Kampala",
"r": "afrique"
},
{
"id": "uzb",
"n": "Ouzbékistan",
"c": "Tachkent",
"r": "asie"
},
{
"id": "pak",
"n": "Pakistan",
"c": "Islamabad",
"r": "asie"
},
{
"id": "plw",
"n": "Palaos",
"c": "Ngerulmud",
"r": "oceanie"
},
{
"id": "pan",
"n": "Panama",
"c": "Panama",
"r": "ameriques"
},
{
"id": "png",
"n": "Papouasie-Nouvelle-Guinée",
"c": "Port Moresby",
"r": "oceanie"
},
{
"id": "pry",
"n": "Paraguay",
"c": "Asunción",
"r": "ameriques"
},
{
"id": "nld",
"n": "Pays-Bas",
"c": "Amsterdam",
"r": "europe"
},
{
"id": "phl",
"n": "Philippines",
"c": "Manille",
"r": "asie"
},
{
"id": "pol",
"n": "Pologne",
"c": "Varsovie",
"r": "europe"
},
{
"id": "prt",
"n": "Portugal",
"c": "Lisbonne",
"r": "europe"
},
{
"id": "per",
"n": "Pérou",
"c": "Lima",
"r": "ameriques"
},
{
"id": "qat",
"n": "Qatar",
"c": "Doha",
"r": "asie"
},
{
"id": "cod",
"n": "RD Congo",
"c": "Kinshasa",
"r": "afrique"
},
{
"id": "rou",
"n": "Roumanie",
"c": "Bucarest",
"r": "europe"
},
{
"id": "gbr",
"n": "Royaume-Uni",
"c": "Londres",
"r": "europe"
},
{
"id": "rus",
"n": "Russie",
"c": "Moscou",
"r": "europe"
},
{
"id": "rwa",
"n": "Rwanda",
"c": "Kigali",
"r": "afrique"
},
{
"id": "caf",
"n": "République centrafricaine",
"c": "Bangui",
"r": "afrique"
},
{
"id": "dom",
"n": "République dominicaine",
"c": "Saint-Domingue",
"r": "ameriques"
},
{
"id": "kna",
"n": "Saint-Christophe-et-Niévès",
"c": "Basseterre",
"r": "ameriques"
},
{
"id": "smr",
"n": "Saint-Marin",
"c": "Saint-Marin",
"r": "europe"
},
{
"id": "vct",
"n": "Saint-Vincent-et-les-Grenadines",
"c": "Kingstown",
"r": "ameriques"
},
{
"id": "lca",
"n": "Sainte-Lucie",
"c": "Castries",
"r": "ameriques"
},
{
"id": "slv",
"n": "Salvador",
"c": "San Salvador",
"r": "ameriques"
},
{
"id": "wsm",
"n": "Samoa",
"c": "Apia",
"r": "oceanie"
},
{
"id": "stp",
"n": "Sao Tomé-et-Principe",
"c": "Sao Tomé",
"r": "afrique"
},
{
"id": "srb",
"n": "Serbie",
"c": "Belgrade",
"r": "europe"
},
{
"id": "syc",
"n": "Seychelles",
"c": "Victoria",
"r": "afrique"
},
{
"id": "sle",
"n": "Sierra Leone",
"c": "Freetown",
"r": "afrique"
},
{
"id": "sgp",
"n": "Singapour",
"c": "Singapour",
"r": "asie"
},
{
"id": "svk",
"n": "Slovaquie",
"c": "Bratislava",
"r": "europe"
},
{
"id": "svn",
"n": "Slovénie",
"c": "Ljubljana",
"r": "europe"
},
{
"id": "som",
"n": "Somalie",
"c": "Mogadiscio",
"r": "afrique"
},
{
"id": "sdn",
"n": "Soudan",
"c": "Khartoum",
"r": "afrique"
},
{
"id": "ssd",
"n": "Soudan du Sud",
"c": "Djouba",
"r": "afrique"
},
{
"id": "lka",
"n": "Sri Lanka",
"c": "Colombo",
"r": "asie"
},
{
"id": "che",
"n": "Suisse",
"c": "Berne",
"r": "europe"
},
{
"id": "sur",
"n": "Surinam",
"c": "Paramaribo",
"r": "ameriques"
},
{
"id": "swe",
"n": "Suède",
"c": "Stockholm",
"r": "europe"
},
{
"id": "syr",
"n": "Syrie",
"c": "Damas",
"r": "asie"
},
{
"id": "sen",
"n": "Sénégal",
"c": "Dakar",
"r": "afrique"
},
{
"id": "tjk",
"n": "Tadjikistan",
"c": "Douchanbé",
"r": "asie"
},
{
"id": "tza",
"n": "Tanzanie",
"c": "Dodoma",
"r": "afrique"
},
{
"id": "tcd",
"n": "Tchad",
"c": "N'Djaména",
"r": "afrique"
},
{
"id": "cze",
"n": "Tchéquie",
"c": "Prague",
"r": "europe"
},
{
"id": "tha",
"n": "Thaïlande",
"c": "Bangkok",
"r": "asie"
},
{
"id": "tls",
"n": "Timor oriental",
"c": "Dili",
"r": "asie"
},
{
"id": "tgo",
"n": "Togo",
"c": "Lomé",
"r": "afrique"
},
{
"id": "ton",
"n": "Tonga",
"c": "Nuku'alofa",
"r": "oceanie"
},
{
"id": "tto",
"n": "Trinité-et-Tobago",
"c": "Port-d'Espagne",
"r": "ameriques"
},
{
"id": "tun",
"n": "Tunisie",
"c": "Tunis",
"r": "afrique"
},
{
"id": "tkm",
"n": "Turkménistan",
"c": "Achgabat",
"r": "asie"
},
{
"id": "tur",
"n": "Turquie",
"c": "Ankara",
"r": "asie"
},
{
"id": "tuv",
"n": "Tuvalu",
"c": "Funafuti",
"r": "oceanie"
},
{
"id": "ukr",
"n": "Ukraine",
"c": "Kiev",
"r": "europe"
},
{
"id": "ury",
"n": "Uruguay",
"c": "Montevideo",
"r": "ameriques"
},
{
"id": "vut",
"n": "Vanuatu",
"c": "Port-Vila",
"r": "oceanie"
},
{
"id": "vat",
"n": "Vatican",
"c": "Vatican",
"r": "europe"
},
{
"id": "ven",
"n": "Venezuela",
"c": "Caracas",
"r": "ameriques"
},
{
"id": "vnm",
"n": "Viêt Nam",
"c": "Hanoï",
"r": "asie"
},
{
"id": "yem",
"n": "Yémen",
"c": "Sanaa",
"r": "asie"
},
{
"id": "zmb",
"n": "Zambie",
"c": "Lusaka",
"r": "afrique"
},
{
"id": "zwe",
"n": "Zimbabwe",
"c": "Harare",
"r": "afrique"
},
{
"id": "egy",
"n": "Égypte",
"c": "Le Caire",
"r": "afrique"
},
{
"id": "are",
"n": "Émirats arabes unis",
"c": "Abou Dabi",
"r": "asie"
},
{
"id": "ecu",
"n": "Équateur",
"c": "Quito",
"r": "ameriques"
},
{
"id": "eri",
"n": "Érythrée",
"c": "Asmara",
"r": "afrique"
},
{
"id": "usa",
"n": "États-Unis",
"c": "Washington",
"r": "ameriques"
},
{
"id": "eth",
"n": "Éthiopie",
"c": "Addis-Abeba",
"r": "afrique"
},
{
"id": "mhl",
"n": "Îles Marshall",
"c": "Majuro",
"r": "oceanie"
},
{
"id": "slb",
"n": "Îles Salomon",
"c": "Honiara",
"r": "oceanie"
}
];
