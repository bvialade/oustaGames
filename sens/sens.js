const START = new Date(2026, 0, 1);
const STORE = 'ousta.sens';
const TOP = 1000;

const $ = (id) => document.getElementById(id);

let data = load();
let mode = 'daily';
let game; // { idx, guesses: [word], hints, done, won, gaveUp, day? }
let secret; // { word, row, scores: Int16Array, rank: Map(row -> rang) }
let vocab; // Map(mot -> ligne), avec aussi les formes sans accents
let rankable; // Uint8Array : 1 si la ligne compte dans le classement

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
}

const plain = (w) => w.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
const decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

async function loadVocab() {
  const text = await (await fetch('vocab.txt')).text();
  vocab = new Map();
  const loose = new Map();
  const lines = text.split('\n');
  rankable = new Uint8Array(lines.length);
  lines.forEach((line, row) => {
    if (line.startsWith('*')) { rankable[row] = 1; line = line.slice(1); }
    if (!line) return;
    for (const w of line.split(' ')) {
      vocab.set(w, row);
      const p = plain(w);
      if (!loose.has(p)) loose.set(p, w);
    }
  });
  // Permet de taper sans accents : "foret" -> "forêt".
  vocab.loose = loose;
}

async function loadSecret(idx) {
  const s = SECRETS[idx];
  const buf = await (await fetch(`data/${s.f}.bin`)).arrayBuffer();
  const scores = new Int16Array(buf);
  const word = decode(s.w);
  const rows = [];
  for (let r = 0; r < scores.length; r++) if (rankable[r]) rows.push(r);
  rows.sort((a, b) => scores[b] - scores[a]);
  const rank = new Map();
  rows.slice(0, TOP).forEach((r, i) => rank.set(r, i));
  secret = { word, row: vocab.get(word), scores, rank, hints: s.h };
}

function dayNumber() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - START) / 86400000);
}

async function newGame(m) {
  mode = m;
  $('mode-daily').classList.toggle('active', m === 'daily');
  $('mode-free').classList.toggle('active', m === 'free');
  if (m === 'daily') {
    const day = dayNumber();
    game = data.daily && data.daily.day === day ? data.daily
      : { day, idx: ((day % SECRETS.length) + SECRETS.length) % SECRETS.length, guesses: [], hints: 0, done: false };
  } else {
    game = data.free && !data.free.done ? data.free
      : { idx: Math.floor(Math.random() * SECRETS.length), guesses: [], hints: 0, done: false };
  }
  persist();
  await loadSecret(game.idx);
  render();
  if (game.done) setTimeout(showEnd, 300);
}

function persist() {
  data[mode] = game;
  save();
}

// Retrouve le mot tel qu'il est écrit dans le dictionnaire.
function resolve(input) {
  const w = input.trim().toLowerCase().replace(/’/g, "'");
  // Tapé sans accents : on prend le mot le plus courant qui s'écrit pareil ("foret" -> "forêt").
  if (w === plain(w)) return vocab.loose.get(w) || null;
  return vocab.has(w) ? w : vocab.loose.get(plain(w)) || null;
}

function info(word) {
  const row = vocab.get(word);
  if (word === secret.word) return { temp: 100, rank: 0 };
  let temp = secret.scores[row] / 100;
  // Mot rare qui partage le vecteur du mot secret : très chaud, mais pas gagnant.
  if (row === secret.row) temp = 99;
  const rank = rankable[row] ? secret.rank.get(row) : undefined;
  return { temp, rank };
}

function emoji({ temp, rank }) {
  if (rank === 0) return '🥳';
  if (rank !== undefined) return rank <= 10 ? '😱' : rank <= 100 ? '🔥' : '🥵';
  if (temp >= 20) return '😎';
  if (temp >= 0) return '🥶';
  return '🧊';
}

function rowHtml(word, n, isLast) {
  const i = info(word);
  const progress = i.rank !== undefined
    ? `<div class="meter"><div><i style="width:${((TOP - i.rank) / TOP) * 100}%"></i></div>${TOP - i.rank}</div>` : '';
  return `<tr class="${isLast ? 'last' : ''}"><td class="n">${n}</td><td>${word}</td><td class="t">${i.temp.toFixed(2)}</td><td>${emoji(i)}</td><td class="p">${progress}</td></tr>`;
}

function render() {
  $('loading').hidden = true;
  const g = game.guesses;
  $('table').hidden = g.length === 0;
  const last = g[g.length - 1];
  $('latest').innerHTML = last ? rowHtml(last, g.length, true) : '';
  const sorted = g.map((w, i) => [w, i + 1]).sort((a, b) => info(b[0]).temp - info(a[0]).temp);
  $('rows').innerHTML = sorted.map(([w, n]) => rowHtml(w, n, false)).join('');

  const list = secret.hints.slice(0, game.hints);
  $('hints-list').innerHTML = list.map((h, i) => `<li><span>${i + 1}.</span>${h}</li>`).join('');
  $('hints-empty').hidden = game.hints > 0;
  $('hints-title').textContent = `Indices ${game.hints}/10`;
  $('hint-btn').disabled = game.hints >= 10 || game.done;
  $('hint-btn').textContent = game.hints === 0 ? 'Un indice' : 'Indice suivant';
  $('guess').disabled = game.done;
  $('give-up').hidden = game.done;
}

function submit(e) {
  e.preventDefault();
  if (game.done || !secret) return;
  const input = $('guess').value;
  if (!input.trim()) return;
  const word = resolve(input);
  if (!word) return toast('Je ne connais pas ce mot');
  $('guess').value = '';
  if (game.guesses.includes(word)) return toast(`« ${word} » déjà essayé`);
  game.guesses.push(word);
  if (word === secret.word) { game.done = true; game.won = true; }
  persist();
  render();
  if (game.won) setTimeout(showEnd, 400);
}

function revealHint() {
  if (game.hints >= 10 || game.done) return;
  game.hints++;
  persist();
  render();
}

function giveUp() {
  if (!confirm('Abandonner et afficher le mot secret ?')) return;
  game.done = true;
  game.gaveUp = true;
  persist();
  render();
  showEnd();
}

function showEnd() {
  const n = game.guesses.length;
  $('end-title').textContent = game.won ? 'Bravo !' : 'Le mot était…';
  $('end-word').textContent = secret.word;
  $('end-text').textContent = game.won
    ? `Trouvé en ${n} essai${n > 1 ? 's' : ''}, avec ${game.hints} indice${game.hints > 1 ? 's' : ''}.`
    : `Tu feras mieux la prochaine fois !`;
  $('share').hidden = !game.won;
  $('again').textContent = mode === 'free' ? 'Rejouer' : 'Faire une partie libre';
  $('end').showModal();
}

async function share() {
  const n = game.guesses.length;
  const head = mode === 'daily' ? `Mot chaud, mot froid n°${game.day + 1}` : 'Mot chaud, mot froid';
  const text = `OustaGames · ${head}\nTrouvé en ${n} essai${n > 1 ? 's' : ''} 🥳 avec ${game.hints} indice${game.hints > 1 ? 's' : ''} 🧩\n${location.href.split('#')[0]}`;
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); toast('Copié !'); }
  } catch {}
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

$('form').onsubmit = submit;
$('hint-btn').onclick = revealHint;
$('give-up').onclick = giveUp;
$('mode-daily').onclick = () => newGame('daily');
$('mode-free').onclick = () => newGame('free');
$('help-btn').onclick = () => $('help').showModal();
$('share').onclick = share;
$('close-end').onclick = () => $('end').close();
$('again').onclick = () => { $('end').close(); data.free = null; newGame('free'); };

if (!data.seenHelp) { data.seenHelp = true; save(); $('help').showModal(); }
loadVocab().then(() => newGame('daily')).catch(() => {
  $('loading').textContent = 'Impossible de charger le jeu. Vérifie ta connexion puis recharge la page.';
});
