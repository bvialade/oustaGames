// Thèmes du quiz du code de la route : les 10 thèmes officiels de l'épreuve théorique générale.
// Les questions sont dans q/<id>.js : Q.<id> = [ ... ].
// Une question : { q: 'Question ?', c: [bonne(s) réponse(s) d'abord, puis leurres], e: 'Explication' }
//   n: 2      → les 2 premiers choix sont bons (plusieurs réponses à cocher). Par défaut 1.
//   p: 'stop' → affiche un panneau dessiné (voir panneaux.js).
// Les choix sont mélangés à l'affichage. Ajouter les nouvelles questions à la fin des listes
// (les questions vues et les erreurs sont mémorisées par position).
const THEMES = [
  { id: 'circulation', nom: 'Circulation et panneaux', emoji: '🚦' },
  { id: 'conducteur', nom: 'Le conducteur', emoji: '🧠' },
  { id: 'route', nom: 'La route', emoji: '🛣️' },
  { id: 'usagers', nom: 'Autres usagers', emoji: '🚲' },
  { id: 'divers', nom: 'Permis et règles', emoji: '📄' },
  { id: 'secours', nom: 'Premiers secours', emoji: '⛑️' },
  { id: 'vehicule', nom: 'Prendre et quitter le véhicule', emoji: '🚪' },
  { id: 'mecanique', nom: 'Mécanique', emoji: '🔧' },
  { id: 'equipements', nom: 'Équipements de sécurité', emoji: '🦺' },
  { id: 'environnement', nom: 'Environnement', emoji: '🌱' },
];
const Q = {};
