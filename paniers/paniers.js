const STORE = 'ousta.paniers';
const START = new Date(2026, 0, 1);
const MAX_HINTS = 3;
// Couleur de chaque panier (lettre a, b, c…) ; le chat du panier est CATS[même rang].
const COLORS = ['#a7d676', '#f4a3c4', '#d0a374', '#7fd1c7', '#b79cf2', '#f7b267', '#9cc4f2', '#f2d468', '#f28c8c', '#c3cad6'];
const EMPTY = 0, CROSS = 1, CAT = 2;

const $ = (id) => document.getElementById(id);

let data = load();
data.level = data.level || 0; // nombre de niveaux débloqués après le premier
data.best = data.best || {}; // meilleur temps par niveau
data.games = data.games || {}; // parties en cours, par clé (n12 pour un niveau, d300 pour un défi)
data.prefs = data.prefs || { auto: false };
data.daily = data.daily || {};
data.solved = data.solved || {}; // niveaux réussis au moins une fois
let key; // partie affichée
let game; // { cells, elapsed, hints, hinted, done }
let grid; // { n, zone: [], solution: [] }
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

// ---------- Grilles ----------

function parse(str) {
  const n = Math.round(Math.sqrt(str.length));
  const zone = [...str].map((ch) => ch.charCodeAt(0) - 97);
  return { n, zone, solution: solve(n, zone) };
}

// Colonne du chat de chaque ligne (les grilles n'ont qu'une solution).
function solve(n, zone) {
  const cols = [], usedC = [], usedZ = [];
  (function step(r, prev) {
    if (r === n) return true;
    for (let c = 0; c < n; c++) {
      const z = zone[r * n + c];
      if (usedC[c] || usedZ[z] || Math.abs(c - prev) < 2) continue;
      usedC[c] = usedZ[z] = true; cols[r] = c;
      if (step(r + 1, c)) return true;
      usedC[c] = usedZ[z] = false;
    }
    return false;
  })(0, -9);
  return cols.map((c, r) => r * n + c);
}

function openGrid(k) {
  key = k;
  const source = k[0] === 'd' ? DEFIS[+k.slice(1) % DEFIS.length] : NIVEAUX[+k.slice(1)];
  grid = parse(source);
  game = data.games[k];
  if (!game || game.cells.length !== grid.n * grid.n) {
    game = { cells: new Array(grid.n * grid.n).fill(EMPTY), elapsed: 0, hints: 0, hinted: [], done: false };
  }
  data.games[k] = game;
  data.current = k;
  undoStack = [];
  save();
  build();
}

// ---------- Règles ----------

const rowOf = (i) => Math.floor(i / grid.n);
const colOf = (i) => i % grid.n;
function clash(i, j) {
  const dr = Math.abs(rowOf(i) - rowOf(j)), dc = Math.abs(colOf(i) - colOf(j));
  return rowOf(i) === rowOf(j) || colOf(i) === colOf(j) || grid.zone[i] === grid.zone[j] || (dr <= 1 && dc <= 1);
}
function cats() {
  return [...game.cells.keys()].filter((i) => game.cells[i] === CAT);
}
function conflicts() {
  const list = cats();
  const bad = new Set();
  for (const i of list) for (const j of list) if (i < j && clash(i, j)) { bad.add(i); bad.add(j); }
  return bad;
}

// ---------- Actions ----------

function remember() {
  undoStack.push(game.cells.slice());
  if (undoStack.length > 300) undoStack.shift();
}
const locked = (i) => game.hinted.includes(i);

function set(i, state) {
  if (locked(i) || game.cells[i] === state) return false;
  game.cells[i] = state;
  return true;
}

function after(placed) {
  save();
  render();
  const list = cats();
  if (list.length === grid.n && !conflicts().size) return win();
  if (placed >= 0) {
    const el = board.children[placed];
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }
}

function undo() {
  if (game.done || !undoStack.length) return;
  game.cells = undoStack.pop();
  save();
  render();
}

function restart() {
  if (game.done) return;
  if (!confirm('Tout effacer et recommencer cette grille ?')) return;
  remember();
  game.cells = game.cells.map((v, i) => (locked(i) ? CAT : EMPTY));
  after(-1);
}

// Herbe à chat : installe le bon chat dans un panier qui n'a pas encore le sien.
function hint() {
  if (game.done) return;
  if (game.hints >= MAX_HINTS) return toast('Plus d’herbe à chat !');
  const todo = grid.solution.filter((i) => game.cells[i] !== CAT);
  const wrong = cats().filter((i) => !grid.solution.includes(i));
  // On commence par le panier d'un chat mal placé, sinon un panier au hasard.
  const pick = wrong.length
    ? todo.find((i) => grid.zone[i] === grid.zone[wrong[0]]) || todo[0]
    : todo[Math.floor(Math.random() * todo.length)];
  remember();
  for (const j of cats()) if (j !== pick && clash(pick, j)) game.cells[j] = EMPTY;
  game.cells[pick] = CAT;
  game.hinted.push(pick);
  game.hints++;
  after(pick);
}

function win() {
  game.done = true;
  const isDaily = key[0] === 'd';
  if (isDaily) {
    const st = data.daily;
    const day = +key.slice(1);
    if (st.last !== day) { st.streak = st.last === day - 1 ? (st.streak || 0) + 1 : 1; st.last = day; }
  } else {
    const lvl = +key.slice(1);
    data.solved[lvl] = true;
    if (!game.hints && (data.best[lvl] == null || game.elapsed < data.best[lvl])) { data.best[lvl] = game.elapsed; game.record = true; }
    if (lvl >= data.level && lvl + 1 < NIVEAUX.length) data.level = lvl + 1;
  }
  save();
  render();
  requestAnimationFrame(() => {
    cats().forEach((i, k) => {
      const el = board.children[i];
      el.style.animationDelay = `${k * 90}ms`;
      el.classList.add('dance');
    });
  });
  setTimeout(showEnd, 700 + grid.n * 90);
}

// ---------- Toucher et glisser ----------

// Un toucher fait tourner la case : vide → croix → chat → vide.
// Glisser depuis une case vide pose des croix ; depuis une croix, les efface.
const board = $('board');
let drag = null;

function cellAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el && el.closest('.cell');
  return cell && cell.parentNode === board ? +cell.dataset.i : -1;
}

board.addEventListener('pointerdown', (e) => {
  if (game.done) return;
  const i = cellAt(e.clientX, e.clientY);
  if (i < 0) return;
  e.preventDefault();
  drag = { start: i, last: i, moved: false, paint: game.cells[i] === EMPTY ? CROSS : game.cells[i] === CROSS ? EMPTY : null };
});
board.addEventListener('pointermove', (e) => {
  if (!drag || drag.paint === null) return;
  const i = cellAt(e.clientX, e.clientY);
  if (i < 0 || i === drag.last) return;
  if (!drag.moved) {
    drag.moved = true;
    remember();
    if (game.cells[drag.start] !== CAT) set(drag.start, drag.paint);
  }
  drag.last = i;
  if (game.cells[i] !== CAT) set(i, drag.paint);
  render();
});
function endDrag() {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.moved) { save(); return; }
  const i = d.start;
  if (locked(i)) return;
  remember();
  const next = (game.cells[i] + 1) % 3;
  set(i, next);
  after(next === CAT ? i : -1);
}
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', () => { drag = null; });

// ---------- Affichage ----------

function build() {
  const n = grid.n;
  board.style.setProperty('--n', n);
  board.innerHTML = '';
  for (let i = 0; i < n * n; i++) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.dataset.i = i;
    const z = grid.zone[i];
    el.style.background = COLORS[z];
    // Trait épais entre deux paniers différents.
    const r = rowOf(i), c = colOf(i);
    if (c < n - 1 && grid.zone[i + 1] !== z) el.classList.add('wall-r');
    if (r < n - 1 && grid.zone[i + n] !== z) el.classList.add('wall-b');
    board.appendChild(el);
  }
  const daily = key[0] === 'd';
  $('who').textContent = daily ? `Défi du jour · ${n}×${n}` : `Niveau ${+key.slice(1) + 1} · ${n}×${n}`;
  document.querySelectorAll('.mode').forEach((el) => el.classList.toggle('on', (el.dataset.mode === 'daily') === daily));
  render();
}

function render() {
  const n = grid.n;
  const bad = conflicts();
  const list = cats();
  const auto = data.prefs.auto && !game.done;
  [...board.children].forEach((el, i) => {
    const v = game.cells[i];
    const html = v === CAT ? cat(grid.zone[i]) : v === CROSS ? '<b class="x"></b>' : '';
    if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
    el.classList.toggle('bad', bad.has(i));
    el.classList.toggle('hinted', locked(i));
    el.classList.toggle('auto', auto && v === EMPTY && list.some((j) => clash(i, j)));
  });
  const placed = new Set(list.map((i) => grid.zone[i]));
  $('tally').innerHTML = [...Array(n).keys()].map((z) =>
    `<span class="${placed.has(z) ? 'in' : ''}" style="--c:${COLORS[z]}">${cat(z)}</span>`).join('');
  $('auto-btn').classList.toggle('on', data.prefs.auto);
  $('hint-btn').querySelector('small').textContent = `${MAX_HINTS - game.hints} restante${MAX_HINTS - game.hints > 1 ? 's' : ''}`;
  $('tools').hidden = game.done;
  $('after').hidden = !game.done;
  $('next-after').hidden = key[0] === 'd' || +key.slice(1) + 1 >= NIVEAUX.length;
  board.classList.toggle('won', game.done);
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
  const daily = key[0] === 'd';
  $('end-title').textContent = ['Ronron !', 'Miaou !', 'Tout le monde dort !'][Math.floor(Math.random() * 3)];
  $('end-sub').textContent = `${daily ? 'Défi du jour' : `Niveau ${+key.slice(1) + 1}`} réussi en ${clock(game.elapsed)}`
    + (game.hints ? ` avec ${game.hints} brin${game.hints > 1 ? 's' : ''} d’herbe à chat.` : ', sans aide.')
    + (game.record ? ' Nouveau record !' : '');
  $('end-cats').innerHTML = [...Array(grid.n).keys()].map((z) => `<span style="animation-delay:${z * 70}ms">${cat(z)}</span>`).join('');
  $('stats').innerHTML = [
    [Object.keys(data.solved).length, 'Niveaux finis'], [data.level + 1, 'Niveau atteint'], [data.daily.streak || 0, 'Série du jour'],
  ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
  $('end-next').hidden = daily || +key.slice(1) + 1 >= NIVEAUX.length;
  $('end').showModal();
}

async function share() {
  const daily = key[0] === 'd';
  const what = daily ? `défi du jour (${grid.n}×${grid.n})` : `niveau ${+key.slice(1) + 1} (${grid.n}×${grid.n})`;
  const text = `OustaCats · Chacun son panier, ${what}\n🐱 ${clock(game.elapsed)}${game.hints ? ' · 🌿' + game.hints : ' · sans aide'}\n\n${location.href.split(/[?#]/)[0]}`;
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

function showLevels() {
  $('levels-grid').innerHTML = NIVEAUX.map((s, k) => {
    const n = Math.round(Math.sqrt(s.length));
    const state = data.solved[k] ? 'done' : k > data.level ? 'lock' : '';
    return `<button class="lvl ${state} ${'n' + k === key ? 'cur' : ''}" data-k="${k}" ${state === 'lock' ? 'disabled' : ''}>${k + 1}<small>${n}×${n}</small></button>`;
  }).join('');
  [...$('levels-grid').children].forEach((el) => { el.onclick = () => { $('levels').close(); openLevel(+el.dataset.k); }; });
  $('levels').showModal();
  $('levels-grid').querySelector('.cur')?.scrollIntoView({ block: 'center' });
}

function openLevel(k) {
  const saved = data.games['n' + k];
  if (saved && saved.done) delete data.games['n' + k]; // un niveau fini se rejoue à neuf
  openGrid('n' + k);
}
function openDaily() {
  openGrid('d' + dayNumber());
}
function nextLevel() {
  openLevel(Math.min(+key.slice(1) + 1, NIVEAUX.length - 1));
}

// ---------- Commandes ----------

document.querySelectorAll('.mode').forEach((el) => {
  el.onclick = () => (el.dataset.mode === 'daily' ? openDaily() : openLevel(data.level));
});
$('levels-btn').onclick = showLevels;
$('levels-close').onclick = () => $('levels').close();
$('undo-btn').onclick = undo;
$('restart-btn').onclick = restart;
$('auto-btn').onclick = () => { data.prefs.auto = !data.prefs.auto; save(); render(); };
$('hint-btn').onclick = hint;
$('share').onclick = share;
$('share-after').onclick = share;
$('end-next').onclick = () => { $('end').close(); nextLevel(); };
$('next-after').onclick = nextLevel;
$('end-close').onclick = () => $('end').close();
$('help-btn').onclick = () => $('help').showModal();
$('help-close').onclick = () => $('help').close();

defineCats();
const today = 'd' + dayNumber();
if (data.current && (data.current[0] === 'n' || data.current === today) && data.games[data.current] && !data.games[data.current].done) openGrid(data.current);
else openLevel(data.level);
if (!data.seenHelp) { data.seenHelp = true; save(); $('help').showModal(); }
