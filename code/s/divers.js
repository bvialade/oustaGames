Q.divers.push(
  { q: "Lucie a son permis depuis 8 mois (sans conduite accompagnée). Elle est contrôlée à 0,3 g/L d’alcool dans le sang.",
    r: [["Elle est en infraction :", ["Oui", "Non"], 0], ["Elle perd :", ["6 points, et son permis est alors invalidé", "1 point"], 0]],
    e: "En probatoire, la limite est 0,2 g/L. L’infraction coûte 6 points : avec 6 points au départ, le permis n’a plus de points et il est invalidé." },
  { q: "Tom a son permis depuis 2 ans, sans infraction, après une conduite accompagnée.",
    r: [["Il a aujourd’hui :", ["12 points", "10 points", "8 points"], 0], ["Il est encore en période probatoire :", ["Oui", "Non"], 1]],
    e: "Avec la conduite accompagnée, la période probatoire dure 2 ans et on gagne 3 points par an : 6 + 3 + 3 = 12." },
  { q: "Un conducteur expérimenté est flashé à 76 km/h là où c’est limité à 50 km/h.",
    r: [["L’excès est de :", ["Moins de 20 km/h", "Entre 20 et 30 km/h", "Plus de 30 km/h"], 1], ["Il perd :", ["1 point", "2 points", "4 points"], 1]],
    e: "Après la marge technique de 5 km/h, la vitesse retenue est 71 km/h : 21 km/h de trop. Entre 20 et 30 km/h, c’est 2 points et 135 €." },
  { q: "Après un accrochage sans blessé, l’autre conducteur refuse de remplir le constat.",
    r: [["Je note sa plaque d’immatriculation et je préviens mon assureur :", ["Oui", "Non"], 0], ["Je le laisse partir sans rien noter :", ["Oui", "Non"], 1]],
    e: "Sans constat, on relève un maximum d’informations (plaque, lieu, témoins, photos) et on fait une déclaration à son assurance dans les 5 jours ouvrés." },
);
