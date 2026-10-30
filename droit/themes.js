// Matières et niveaux du quiz du droit.
// Les questions sont dans q/<id>.js : Q.<id> = { 1: [...], 2: [...], 3: [...] } (1 Citoyen, 2 Juge, 3 Goat).
// Une question : { q: 'Question ?', c: [bonne réponse, leurre, leurre, leurre], e: 'Explication', ref: 'Art. 1240 C. civ.' }
// La bonne réponse est toujours écrite en premier : les choix sont mélangés à l'affichage.
const NIVEAUX = [
  { n: 1, nom: 'Citoyen', emoji: '🧑', desc: 'Les bases' },
  { n: 2, nom: 'Juge', emoji: '👩‍⚖️', desc: 'Le vrai droit' },
  { n: 3, nom: 'Goat', emoji: '🐐', desc: 'Pour les pros' },
];
const THEMES = [
  { id: 'penal', nom: 'Pénal', emoji: '🚔' },
  { id: 'civil', nom: 'Civil', emoji: '🏠' },
  { id: 'social', nom: 'Social', emoji: '👷' },
  { id: 'affaires', nom: 'Affaires', emoji: '💼' },
  { id: 'societes', nom: 'Sociétés', emoji: '🏢' },
  { id: 'suretes', nom: 'Sûretés', emoji: '🔐' },
  { id: 'administratif', nom: 'Administratif', emoji: '🏛️' },
  { id: 'dip', nom: 'International privé', emoji: '🌐' },
  { id: 'europeen', nom: 'Européen', emoji: '🇪🇺' },
  { id: 'constitutionnel', nom: 'Constitutionnel', emoji: '📜' },
  { id: 'libertes', nom: 'Libertés fondamentales', emoji: '🕊️' },
];
const Q = {};
