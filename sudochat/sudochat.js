const STORE = 'ousta.sudochat';
const START = new Date(2026, 0, 1);
const MAX_HINTS = 3;

// Taille de la grille → découpage des blocs (lignes × colonnes) et nombre de cases données.
const SIZES = {
  4: { name: 'Chaton', box: [2, 2], givens: 6 },
  6: { name: 'Chat', box: [2, 3], givens: 13 },
  9: { name: 'Matou', box: [3, 3], givens: 30 },
};

// Les 9 chats, dans l'ordre où ils entrent en jeu (4×4 : les 4 premiers, 6×6 : les 6 premiers).
const CATS = [
  { name: 'Caramel', fur: '#f08a24', ear: '#ffc6a8', eye: '#7cc243', marks: 'tabby', dark: '#b4550c' },
  { name: 'Réglisse', fur: '#2a2a30', ear: '#5b5560', eye: '#f5d90a', light: true },
  { name: 'Neige', fur: '#fbfbf6', ear: '#ffc8d2', eye: '#47a3ff' },
  { name: 'Grisou', fur: '#8d97a6', ear: '#f3b9c4', eye: '#f39c1d', muzzle: '#d9dee6' },
  { name: 'Saphir', fur: '#f1e4c9', ear: '#5a3b28', eye: '#3d8bff', marks: 'siamese' },
  { name: 'Patchouli', fur: '#fbfbf6', ear: '#ffc8d2', eye: '#58b04a', marks: 'calico' },
  { name: 'Moka', fur: '#7b4a2d', ear: '#c99a85', eye: '#c7d93a', light: true },
  { name: 'Biscuit', fur: '#e8c48a', ear: '#ffcfb8', eye: '#a0612a', muzzle: '#fbf3e4' },
  { name: 'Gaston', fur: '#2a2a30', ear: '#5b5560', eye: '#8fd16a', marks: 'tuxedo', light: true },
];

const $ = (id) => document.getElementById(id);

let data = load();
data.prefs = data.prefs || { size: 6 };
data.games = data.games || {};
data.stats = data.stats || {};
let game; // { size, num, daily, day, cells, notes, elapsed, hints, done }
let puzzle; // { givens: [], solution: [] } recalculé à partir de la taille et du numéro
let selected = -1;
let notesMode = false;
let undoStack = [];

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
}
function dayNumber() {
  const now = new Date();
  return Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - START) / 86400000);
}

// ---------- Dessin des chats ----------

function catMarkup(c) {
  const line = c.light ? '#d8d2c8' : '#3b2a20';
  const out = c.fur === '#fbfbf6' || c.fur === '#f1e4c9' ? '#b9ae9e' : 'none';
  let ears = [c.fur, c.fur];
  let marks = '';
  if (c.marks === 'tabby') {
    marks = `<path d="M50 28v11M40 30l3 9M60 30l-3 9M13 56h11M14 64h9M87 56h-11M86 64h-9" stroke="${c.dark}" stroke-width="4" stroke-linecap="round"/>`;
  } else if (c.marks === 'siamese') {
    ears = ['#5a3b28', '#5a3b28'];
    marks = '<ellipse cx="50" cy="66" rx="21" ry="18" fill="#6b4630" opacity=".8"/>';
  } else if (c.marks === 'calico') {
    ears = ['#f08a24', '#2a2a30'];
    marks = '<path d="M13 52Q16 30 42 28Q42 44 30 54Q20 62 13 52Z" fill="#f08a24"/><path d="M58 27Q82 28 87 50Q72 50 62 40Z" fill="#2a2a30"/>';
  } else if (c.marks === 'tuxedo') {
    marks = '<path d="M50 34L41 66Q50 74 59 66Z" fill="#fbfbf6"/><ellipse cx="50" cy="76" rx="17" ry="12" fill="#fbfbf6"/>';
  } else if (c.muzzle) {
    marks = `<ellipse cx="50" cy="74" rx="17" ry="12" fill="${c.muzzle}"/>`;
  }
  const tie = c.marks === 'tuxedo'
    ? '<path d="M36 87L48 92L36 98ZM64 87L52 92L64 98Z" fill="#e11d48"/><circle cx="50" cy="92" r="4" fill="#be123c"/>' : '';
  const eye = (x) => `<ellipse cx="${x}" cy="56" rx="7.5" ry="8.5" fill="${c.eye}"/><ellipse cx="${x}" cy="57" rx="2.3" ry="6" fill="#111"/><circle cx="${x + 2.5}" cy="53" r="1.9" fill="#fff"/>`;
  return `<g stroke="${out}" stroke-width="2">
    <path d="M16 48L21 7L48 30Z" fill="${ears[0]}"/><path d="M84 48L79 7L52 30Z" fill="${ears[1]}"/>
    <ellipse cx="50" cy="59" rx="38" ry="33" fill="${c.fur}"/></g>
    <path d="M24 36L26 17L40 30Z" fill="${c.ear}" opacity=".85"/><path d="M76 36L74 17L60 30Z" fill="${c.ear}" opacity=".85"/>
    ${marks}${eye(36)}${eye(64)}
    <path d="M45 67h10l-5 5.5z" fill="#f28b9b"/>
    <path d="M50 72q-4 6-9 3M50 72q4 6 9 3M30 70L7 66M30 74L7 77M70 70L93 66M70 74L93 77" stroke="${line}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${tie}`;
}

function defineCats() {
  $('cat-defs').innerHTML = CATS.map((c, i) => `<symbol id="cat${i}" viewBox="0 0 100 100">${catMarkup(c)}</symbol>`).join('');
}
const cat = (v) => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#cat${v}"/></svg>`;

// ---------- Génération des grilles ----------

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
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

function geometry(n) {
  const [br, bc] = SIZES[n].box;
  const row = [], col = [], box = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n;
    row.push(r); col.push(c);
    box.push(Math.floor(r / br) * (n / bc) + Math.floor(c / bc));
  }
  return { n, row, col, box };
}

// Résout par retour arrière (case la plus contrainte d'abord) et compte les solutions, jusqu'à `limit`.
// Avec `rand`, essaie les chats dans un ordre aléatoire et garde la première solution trouvée.
function solve(grid, g, limit, rand) {
  const { n } = g;
  const full = (1 << n) - 1;
  const rows = new Array(n).fill(0), cols = new Array(n).fill(0), boxes = new Array(n).fill(0);
  grid.forEach((v, i) => {
    if (v >= 0) { rows[g.row[i]] |= 1 << v; cols[g.col[i]] |= 1 << v; boxes[g.box[i]] |= 1 << v; }
  });
  let count = 0;
  let found = null;
  (function step() {
    let best = -1, bestFree = 0, bestCount = n + 1;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] >= 0) continue;
      const free = full & ~(rows[g.row[i]] | cols[g.col[i]] | boxes[g.box[i]]);
      let k = 0;
      for (let m = free; m; m &= m - 1) k++;
      if (k < bestCount) { best = i; bestFree = free; bestCount = k; if (k <= 1) break; }
    }
    if (best < 0) { count++; if (!found) found = grid.slice(); return; }
    const values = [];
    for (let v = 0; v < n; v++) if (bestFree & (1 << v)) values.push(v);
    if (rand) shuffle(values, rand);
    const r = g.row[best], c = g.col[best], b = g.box[best];
    for (const v of values) {
      grid[best] = v; rows[r] |= 1 << v; cols[c] |= 1 << v; boxes[b] |= 1 << v;
      step();
      grid[best] = -1; rows[r] &= ~(1 << v); cols[c] &= ~(1 << v); boxes[b] &= ~(1 << v);
      if (count >= limit) return;
    }
  })();
  return { count, found };
}

// La grille n°N d'une taille donnée est toujours la même : on la recalcule à partir du numéro.
function makePuzzle(n, num) {
  const rand = rng(hash(`sudochat-${n}-${num}`));
  const g = geometry(n);
  const solution = solve(new Array(n * n).fill(-1), g, 1, rand).found;
  const givens = solution.slice();
  let left = n * n;
  for (const i of shuffle([...givens.keys()], rand)) {
    if (left <= SIZES[n].givens) break;
    givens[i] = -1;
    if (solve(givens.slice(), g, 2).count === 1) left--;
    else givens[i] = solution[i];
  }
  return { givens, solution, g };
}

// ---------- Partie ----------

function startGame(size, num, daily) {
  puzzle = makePuzzle(size, num);
  game = {
    size, num, daily, day: daily ? dayNumber() : null,
    cells: puzzle.givens.slice(), notes: new Array(size * size).fill(0),
    hinted: [], elapsed: 0, hints: 0, done: false,
  };
  data.prefs.size = size;
  data.games[size] = game;
  undoStack = [];
  selected = -1;
  save();
  build();
}

function openSize(size) {
  const saved = data.games[size];
  const today = dayNumber();
  const dailyDone = (data.stats[size] || {}).lastDaily === today;
  data.prefs.size = size;
  if (saved && !(saved.daily && saved.day !== today && !saved.done) && !(saved.done && !dailyDone)) {
    game = saved;
    game.hinted = game.hinted || [];
    puzzle = makePuzzle(size, game.num);
    undoStack = [];
    selected = -1;
    save();
    build();
  } else {
    startGame(size, today + 1, true);
  }
}

const peers = (i, j) => i !== j && (puzzle.g.row[i] === puzzle.g.row[j] || puzzle.g.col[i] === puzzle.g.col[j] || puzzle.g.box[i] === puzzle.g.box[j]);

function conflicts() {
  const bad = new Set();
  const { cells } = game;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] < 0) continue;
    for (let j = i + 1; j < cells.length; j++) {
      if (cells[j] === cells[i] && peers(i, j)) { bad.add(i); bad.add(j); }
    }
  }
  return bad;
}

function remember() {
  undoStack.push({ cells: game.cells.slice(), notes: game.notes.slice() });
  if (undoStack.length > 200) undoStack.shift();
}

function locked(i) {
  return puzzle.givens[i] >= 0 || game.hinted.includes(i);
}

function play(v) {
  if (game.done || selected < 0 || locked(selected)) return;
  const i = selected;
  remember();
  if (notesMode && game.cells[i] < 0) {
    game.notes[i] ^= 1 << v;
  } else if (game.cells[i] === v) {
    game.cells[i] = -1;
  } else {
    game.cells[i] = v;
    // Le chat posé disparaît des notes de sa ligne, de sa colonne et de son bloc.
    for (let j = 0; j < game.cells.length; j++) if (peers(i, j)) game.notes[j] &= ~(1 << v);
    afterPlace(i);
  }
  save();
  render();
}

function erase() {
  if (game.done || selected < 0 || locked(selected)) return;
  if (game.cells[selected] < 0 && !game.notes[selected]) return;
  remember();
  game.cells[selected] = -1;
  game.notes[selected] = 0;
  save();
  render();
}

function undo() {
  if (game.done || !undoStack.length) return;
  const prev = undoStack.pop();
  game.cells = prev.cells;
  game.notes = prev.notes;
  save();
  render();
}

// Herbe à chat : place le bon chat dans la case choisie (ou dans une case au hasard).
function hint() {
  if (game.done) return;
  if (game.hints >= MAX_HINTS) return toast('Plus d’herbe à chat !');
  const wrong = (i) => game.cells[i] !== puzzle.solution[i];
  let i = selected >= 0 && wrong(selected) ? selected : -1;
  if (i < 0) {
    const todo = [...game.cells.keys()].filter(wrong);
    i = todo[Math.floor(Math.random() * todo.length)];
  }
  remember();
  game.cells[i] = puzzle.solution[i];
  game.notes[i] = 0;
  for (let j = 0; j < game.cells.length; j++) if (peers(i, j)) game.notes[j] &= ~(1 << game.cells[i]);
  game.hinted.push(i);
  game.hints++;
  selected = i;
  afterPlace(i);
  save();
  render();
}

// Une ligne, une colonne ou un bloc complet et sans doublon : ses chats ronronnent.
function afterPlace(i) {
  const bad = conflicts();
  const groups = ['row', 'col', 'box'].map((k) =>
    [...game.cells.keys()].filter((j) => puzzle.g[k][j] === puzzle.g[k][i]));
  const purring = groups.filter((cells) => cells.every((j) => game.cells[j] >= 0 && !bad.has(j))).flat();
  if (game.cells.every((v) => v >= 0) && !bad.size) return win();
  requestAnimationFrame(() => {
    purring.forEach((j, k) => {
      const el = board.children[j];
      el.classList.remove('purr');
      void el.offsetWidth;
      el.style.animationDelay = `${(k % game.size) * 40}ms`;
      el.classList.add('purr');
    });
  });
}

function win() {
  game.done = true;
  selected = -1;
  const st = data.stats[game.size] = data.stats[game.size] || { played: 0, streak: 0 };
  st.played++;
  if (!game.hints && (st.best == null || game.elapsed < st.best)) { st.best = game.elapsed; game.record = true; }
  if (game.daily && game.day === dayNumber() && st.lastDaily !== game.day) {
    st.streak = st.lastDaily === game.day - 1 ? st.streak + 1 : 1;
    st.lastDaily = game.day;
  }
  save();
  render();
  requestAnimationFrame(() => {
    [...board.children].forEach((el, j) => {
      el.style.animationDelay = `${(puzzle.g.row[j] + puzzle.g.col[j]) * 55}ms`;
      el.classList.add('dance');
    });
  });
  setTimeout(showEnd, 900 + game.size * 90);
}

// ---------- Affichage ----------

const board = $('board');

function build() {
  const n = game.size;
  const [br, bc] = SIZES[n].box;
  board.style.setProperty('--n', n);
  board.dataset.size = n;
  board.innerHTML = '';
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n;
    const el = document.createElement('button');
    el.className = 'cell';
    if (c % bc === bc - 1 && c < n - 1) el.classList.add('edge-r');
    if (r % br === br - 1 && r < n - 1) el.classList.add('edge-b');
    if (c === n - 1) el.classList.add('last-c');
    if (r === n - 1) el.classList.add('last-r');
    el.onclick = () => { selected = selected === i ? -1 : i; render(); };
    board.appendChild(el);
  }
  $('palette').innerHTML = CATS.slice(0, n).map((c, v) =>
    `<button class="pick" data-v="${v}" aria-label="${c.name}">${cat(v)}<span class="left"></span></button>`).join('');
  $('palette').style.setProperty('--cols', n === 9 ? 5 : n);
  [...$('palette').children].forEach((el) => { el.onclick = () => play(+el.dataset.v); });
  document.querySelectorAll('.size').forEach((el) => el.classList.toggle('on', +el.dataset.size === n));
  render();
}

function render() {
  const n = game.size;
  const bad = conflicts();
  const sel = selected;
  const selVal = sel >= 0 ? game.cells[sel] : -1;
  const cols = n === 4 ? 2 : 3;
  [...board.children].forEach((el, i) => {
    const v = game.cells[i];
    const html = v >= 0 ? cat(v) : game.notes[i]
      ? `<div class="notes" style="--c:${cols}">${CATS.slice(0, n).map((_, k) => `<i>${game.notes[i] & (1 << k) ? cat(k) : ''}</i>`).join('')}</div>` : '';
    if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
    el.classList.toggle('given', puzzle.givens[i] >= 0);
    el.classList.toggle('hinted', game.hinted.includes(i));
    el.classList.toggle('bad', bad.has(i));
    el.classList.toggle('sel', i === sel);
    el.classList.toggle('peer', sel >= 0 && peers(i, sel));
    el.classList.toggle('same', selVal >= 0 && v === selVal && i !== sel);
  });
  [...$('palette').children].forEach((el, v) => {
    const left = n - game.cells.filter((x) => x === v).length;
    el.querySelector('.left').textContent = left > 0 ? left : '✓';
    el.classList.toggle('full', left <= 0);
    el.classList.toggle('noted', notesMode && sel >= 0 && !!(game.notes[sel] & (1 << v)));
  });
  $('notes-btn').classList.toggle('on', notesMode);
  $('notes-btn').querySelector('small').textContent = notesMode ? 'Activées' : 'Désactivées';
  $('hint-btn').querySelector('small').textContent = `${MAX_HINTS - game.hints} restante${MAX_HINTS - game.hints > 1 ? 's' : ''}`;
  $('who').textContent = game.daily ? `Grille du jour · n°${game.num}` : `Grille n°${game.num}`;
  $('tools').hidden = game.done;
  $('palette').hidden = game.done;
  $('after').hidden = !game.done;
  $('more').hidden = game.done;
  $('daily-btn').hidden = game.daily || (data.stats[n] || {}).lastDaily === dayNumber();
  board.classList.toggle('won', game.done);
  const today = dayNumber();
  document.querySelectorAll('.size').forEach((el) => {
    el.classList.toggle('done', (data.stats[el.dataset.size] || {}).lastDaily === today);
  });
  tick();
}

function clock(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function tick() {
  $('timer').textContent = `⏱ ${clock(game.elapsed)}`;
}
setInterval(() => {
  if (!game || game.done || document.hidden || document.querySelector('dialog[open]')) return;
  game.elapsed++;
  tick();
  if (game.elapsed % 5 === 0) save();
}, 1000);

function showEnd() {
  const st = data.stats[game.size] || {};
  $('end-title').textContent = ['Miaou !', 'Ronron !', 'Bravo !'][game.num % 3];
  $('end-sub').textContent = `${SIZES[game.size].name} ${game.size}×${game.size} réussi en ${clock(game.elapsed)}`
    + (game.hints ? ` avec ${game.hints} brin${game.hints > 1 ? 's' : ''} d’herbe à chat.` : ', sans aide.')
    + (game.record ? ' Nouveau record !' : '');
  $('end-cats').innerHTML = CATS.slice(0, game.size).map((_, v) => `<span style="animation-delay:${v * 70}ms">${cat(v)}</span>`).join('');
  $('stats').innerHTML = [
    [st.played || 0, 'Grilles'], [st.best != null ? clock(st.best) : '–', 'Record'], [st.streak || 0, 'Série du jour'],
  ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
  $('end').showModal();
}

async function share() {
  const n = game.size;
  const link = `${location.href.split(/[?#]/)[0]}?taille=${n}&grille=${game.num}`;
  const row = CATS.slice(0, n).map(() => '🐱').join('');
  const text = `OustaGames · Sudochat n°${game.num} · ${SIZES[n].name} ${n}×${n}${game.daily ? ' (grille du jour)' : ''}\n`
    + `${row}\n⏱ ${clock(game.elapsed)}${game.hints ? ' · 🌿' + game.hints : ' · sans aide'}\n\nJoue la même grille : ${link}`;
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); toast('Copié !'); }
  } catch {}
}

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

function newFree() {
  if (!game.done && game.cells.some((v, i) => v >= 0 && puzzle.givens[i] < 0) && !confirm('Abandonner cette grille ?')) return;
  startGame(game.size, 1 + Math.floor(Math.random() * 9999), false);
}

// ---------- Commandes ----------

document.querySelectorAll('.size').forEach((el) => { el.onclick = () => openSize(+el.dataset.size); });
$('notes-btn').onclick = () => { notesMode = !notesMode; render(); };
$('erase-btn').onclick = erase;
$('undo-btn').onclick = undo;
$('hint-btn').onclick = hint;
$('new-btn').onclick = newFree;
$('daily-btn').onclick = () => { if (!game.done && game.cells.some((v, i) => v >= 0 && puzzle.givens[i] < 0) && !confirm('Abandonner cette grille ?')) return; startGame(game.size, dayNumber() + 1, true); };
$('again').onclick = () => { $('end').close(); startGame(game.size, 1 + Math.floor(Math.random() * 9999), false); };
$('share').onclick = share;
$('share-after').onclick = share;
$('new-after').onclick = () => startGame(game.size, 1 + Math.floor(Math.random() * 9999), false);
$('end-close').onclick = () => $('end').close();
$('help-btn').onclick = () => $('help').showModal();
$('help-close').onclick = () => $('help').close();

// Au clavier (ordinateur) : flèches pour se déplacer, chiffres pour poser un chat.
document.addEventListener('keydown', (e) => {
  if (!game || document.querySelector('dialog[open]')) return;
  const n = game.size;
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -n, ArrowDown: n };
  if (moves[e.key] !== undefined) {
    e.preventDefault();
    selected = selected < 0 ? 0 : (selected + moves[e.key] + n * n) % (n * n);
    render();
  } else if (/^[1-9]$/.test(e.key) && +e.key <= n) play(+e.key - 1);
  else if (e.key === 'Backspace' || e.key === 'Delete') erase();
  else if (e.key === 'n') { notesMode = !notesMode; render(); }
});

defineCats();
$('help-cats').innerHTML = CATS.map((c, v) => `<span>${cat(v)}<small>${c.name}</small></span>`).join('');
// Un lien partagé ?taille=6&grille=12 ouvre directement cette grille.
const params = new URLSearchParams(location.search);
const sharedSize = +params.get('taille');
const sharedNum = parseInt(params.get('grille'), 10);
if (SIZES[sharedSize] && sharedNum >= 1) {
  history.replaceState(null, '', location.pathname);
  startGame(sharedSize, sharedNum, false);
} else {
  openSize(SIZES[data.prefs.size] ? data.prefs.size : 6);
}
if (!data.seenHelp) { data.seenHelp = true; save(); $('help').showModal(); }
