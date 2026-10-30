// Génère paniers/niveaux.js pour le jeu « Chacun son panier ».
//
// Utilisation (depuis la racine du dépôt) : node outils/build_paniers.js
//
// Une grille de taille n est découpée en n paniers (zones de couleur). Il faut placer un chat
// par panier, par ligne et par colonne, sans que deux chats se touchent, même en diagonale.
// On tire d'abord une position de chats valide, puis on fait grandir un panier autour de
// chaque chat, et on ne garde la grille que si elle n'a qu'une seule solution.
// La graine est fixe : relancer le script redonne les mêmes niveaux, dans le même ordre.
// Pour ajouter des niveaux, augmenter PLAN à la fin sans toucher au début.
const fs = require('fs');
const path = require('path');

// [taille, nombre de niveaux], dans l'ordre de la progression.
const PLAN = [[5, 6], [6, 16], [7, 26], [8, 32], [9, 36], [10, 34]];
const DAILY = 400; // défis du jour, en 8×8

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, rand) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function placement(n, rand) {
  const p = [];
  const used = new Array(n).fill(false);
  (function step(i) {
    if (i === n) return true;
    for (const c of shuffle([...Array(n).keys()], rand)) {
      if (used[c] || (i && Math.abs(c - p[i - 1]) < 2)) continue;
      used[c] = true; p[i] = c;
      if (step(i + 1)) return true;
      used[c] = false;
    }
    return false;
  })(0);
  return p;
}

function grow(n, cats, rand) {
  const zone = new Array(n * n).fill(-1);
  cats.forEach((c, r) => { zone[r * n + c] = r; });
  let left = n * n - n;
  while (left) {
    const k = Math.floor(rand() * n * n);
    if (zone[k] < 0) continue;
    const near = [k - n, k + n, k % n ? k - 1 : -1, k % n < n - 1 ? k + 1 : -1]
      .filter((x) => x >= 0 && x < n * n && zone[x] < 0);
    if (!near.length) continue;
    zone[near[Math.floor(rand() * near.length)]] = zone[k];
    left--;
  }
  return zone;
}

function countSolutions(n, zone, limit) {
  let count = 0;
  const cols = new Array(n).fill(false), zones = new Array(n).fill(false);
  (function step(r, prev) {
    if (r === n) { count++; return; }
    for (let c = 0; c < n; c++) {
      const z = zone[r * n + c];
      if (cols[c] || zones[z] || Math.abs(c - prev) < 2) continue;
      cols[c] = zones[z] = true;
      step(r + 1, c);
      cols[c] = zones[z] = false;
      if (count >= limit) return;
    }
  })(0, -9);
  return count;
}

// Les lettres des paniers sont mélangées, pour que la lettre ne trahisse pas la ligne du chat.
function make(n, rand) {
  for (;;) {
    const zone = grow(n, placement(n, rand), rand);
    if (countSolutions(n, zone, 2) !== 1) continue;
    const label = shuffle([...Array(n).keys()], rand);
    return zone.map((z) => String.fromCharCode(97 + label[z])).join('');
  }
}

const rand = rng(20261030);
const levels = [];
for (const [n, count] of PLAN) {
  for (let k = 0; k < count; k++) levels.push(make(n, rand));
  console.log(`${n}×${n} : ${count} niveaux`);
}
// Les défis ont leur propre graine : ajouter des niveaux ne les change pas.
const dailyRand = rng(20261031);
const daily = [];
for (let k = 0; k < DAILY; k++) daily.push(make(8, dailyRand));

const out = `// Généré par outils/build_paniers.js : ne pas modifier à la main.
// Chaque grille est une suite de lettres, ligne par ligne (une lettre par panier).
const NIVEAUX = ${JSON.stringify(levels)};
const DEFIS = ${JSON.stringify(daily)};
`;
fs.writeFileSync(path.join(__dirname, '..', 'paniers', 'niveaux.js'), out);
console.log(`${levels.length} niveaux et ${daily.length} défis écrits dans paniers/niveaux.js`);
