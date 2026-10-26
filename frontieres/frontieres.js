const STORE = 'ousta.frontieres';
const START = new Date(2026, 0, 1);
const EXTRA_TRIES = 4;
const MAX_HINTS = 3;
const SVGNS = 'http://www.w3.org/2000/svg';

const REGIONS = { europe: 'Europe', monde: 'Monde', afrique: 'Afrique', asie: 'Asie', ameriques: 'Amériques' };
const LEVELS = {
  easy: ['Facile', 'Toutes les frontières sont dessinées.'],
  normal: ['Normal', 'On voit les continents, mais pas les frontières.'],
  hard: ['Expert', 'Carte vide : seuls les pays trouvés apparaissent.'],
};

const $ = (id) => document.getElementById(id);
const C = DATA.c;
const flag = (id) => `../geo/flags/${id}.svg`;
const emojiFlag = (id) => [...C[id].a2].map((ch) => String.fromCodePoint(0x1f1a5 + ch.charCodeAt(0))).join('');

let data = load();
data.prefs = data.prefs || { region: 'europe', level: 'normal' };
data.stats = data.stats || {};
data.games = data.games || {};
let mode = 'daily';
let game; // { region, num, a, b, guesses: [], hints: [], done, won, day? }
let dist; // distances depuis le départ et l'arrivée, dans la zone

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

// ---------- Graphe des frontières ----------

const members = {};
for (const [r, list] of Object.entries(DATA.regions)) members[r] = new Set(list);

function bfs(from, allowed) {
  const d = { [from]: 0 };
  const queue = [from];
  while (queue.length) {
    const u = queue.shift();
    for (const v of C[u].b) if (allowed.has(v) && d[v] === undefined) { d[v] = d[u] + 1; queue.push(v); }
  }
  return d;
}

// Nombre minimal de pays encore à trouver pour relier départ et arrivée (BFS 0-1 :
// traverser un pays déjà proposé ne coûte rien), avec le chemin correspondant.
function missing() {
  const allowed = members[game.region];
  const known = new Set([game.a, game.b, ...game.guesses]);
  const cost = { [game.a]: 0 };
  const prev = {};
  const deque = [game.a];
  while (deque.length) {
    const u = deque.shift();
    for (const v of C[u].b) {
      if (!allowed.has(v)) continue;
      const w = cost[u] + (known.has(v) ? 0 : 1);
      if (cost[v] === undefined || w < cost[v]) {
        cost[v] = w; prev[v] = u;
        if (known.has(v)) deque.unshift(v); else deque.push(v);
      }
    }
  }
  const path = [];
  for (let u = game.b; u; u = prev[u]) path.unshift(u);
  return { n: cost[game.b], path };
}

const shortest = () => dist.a[game.b] - 1; // nombre de pays entre les deux
const maxTries = () => shortest() + EXTRA_TRIES;

function grade(id) {
  const da = dist.a[id], db = dist.b[id];
  if (da === undefined || db === undefined) return 'far';
  const detour = da + db - dist.a[game.b];
  return detour === 0 ? 'good' : detour <= 2 ? 'near' : 'far';
}

// ---------- Parties ----------

function fresh(region, idx, extra) {
  const p = DATA.puzzles[region][idx];
  return { ...extra, region, num: idx + 1, a: p.slice(0, 3), b: p.slice(3), guesses: [], hints: [], done: false };
}

function newGame(m, region, num) {
  mode = m;
  region = region || data.prefs.region;
  data.prefs.region = region;
  const list = DATA.puzzles[region];
  const key = `${m}-${region}`;
  const saved = data.games[key];
  if (m === 'daily') {
    const day = dayNumber();
    game = saved && saved.day === day ? saved : fresh(region, ((day % list.length) + list.length) % list.length, { day });
  } else if (num) {
    game = saved && saved.num === num && !saved.done ? saved : fresh(region, num - 1);
  } else {
    game = saved && !saved.done ? saved : fresh(region, Math.floor(Math.random() * list.length));
  }
  data.games[key] = game;
  save();
  dist = { a: bfs(game.a, members[region]), b: bfs(game.b, members[region]) };
  $('mode-daily').classList.toggle('active', m === 'daily');
  $('mode-free').classList.toggle('active', m === 'free');
  renderRegions();
  setupMap();
  render();
  $('guess').value = '';
  suggest();
  flyTo(focusBox(), 1400, worldBox(region));
  const g = game;
  if (game.done) setTimeout(() => { if (g === game) { drawRoute(false); showEnd(); } }, 1500);
}

// ---------- Carte ----------

const svg = $('map');
const view = { x: 0, y: 0, w: DATA.w, h: DATA.h };
const paths = {};
const dots = {};

function project(lon, lat) {
  const my = (l) => -1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * l * Math.PI / 180)) * DATA.w / (2 * Math.PI);
  return [(lon + 180) * DATA.w / 360, my(Math.max(-60, Math.min(84, lat))) - my(84)];
}

function el(name, attrs, parent) {
  const e = document.createElementNS(SVGNS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function buildMap() {
  const grat = $('grat');
  let d = '';
  for (let lon = -180; lon <= 180; lon += 15) {
    const [x] = project(lon, 0);
    d += `M${x} 0V${DATA.h}`;
  }
  for (let lat = -60; lat <= 80; lat += 10) {
    const [, y] = project(0, lat);
    d += `M0 ${y}H${DATA.w}`;
  }
  el('path', { d, 'vector-effect': 'non-scaling-stroke', class: 'grat' }, grat);
  $('bg').setAttribute('d', DATA.bg);
  $('bg').setAttribute('vector-effect', 'non-scaling-stroke');
  for (const [id, c] of Object.entries(C)) {
    if (c.p) paths[id] = el('path', { d: c.p, id: 'c-' + id, class: 'land', 'vector-effect': 'non-scaling-stroke', 'data-id': id }, $('countries'));
    if (c.dot) dots[id] = el('circle', { cx: c.l[0], cy: c.l[1], r: 3, class: 'dot', 'data-id': id }, $('dots'));
  }
}

function setClass(id, cls) {
  for (const e of [paths[id], dots[id]]) if (e) e.setAttribute('class', (e === dots[id] ? 'dot' : 'land') + (cls ? ' on ' + cls : ''));
}

function setupMap() {
  for (const id in C) setClass(id, '');
  $('halos').innerHTML = '';
  $('labels').innerHTML = '';
  $('route').innerHTML = '';
  $('fxg').innerHTML = '';
  svg.setAttribute('class', data.prefs.level);
  setClass(game.a, 'start');
  setClass(game.b, 'end');
  for (const [id, color] of [[game.a, 'var(--start)'], [game.b, 'var(--end)']]) {
    const h = paths[id]
      ? el('use', { href: '#c-' + id, filter: 'url(#soft)', class: 'halo' }, $('halos'))
      : el('circle', { cx: C[id].l[0], cy: C[id].l[1], r: 3, filter: 'url(#soft)', class: 'halo' }, $('halos'));
    h.style.fill = color;
    addLabel(id);
  }
  for (const id of game.hints) setClass(id, 'hint');
  for (const id of game.guesses) { setClass(id, grade(id)); addLabel(id); }
}

function addLabel(id) {
  if ($('labels').querySelector(`[data-id="${id}"]`)) return;
  const t = el('text', { x: C[id].l[0], y: C[id].l[1], 'data-id': id }, $('labels'));
  t.textContent = C[id].n;
}

function ripple(id) {
  const [x, y] = C[id].l;
  const s = scale();
  const c = el('circle', { cx: x, cy: y, r: 4 * s, class: 'ripple', 'stroke-width': 2 * s }, $('fxg'));
  const t0 = performance.now();
  (function grow(t) {
    const k = Math.min(1, (t - t0) / 1100);
    c.setAttribute('r', (4 + 50 * (1 - (1 - k) ** 3)) * s);
    if (k < 1) requestAnimationFrame(grow); else c.remove();
  })(t0);
}

// Échelle : unités de carte par pixel écran.
function scale() {
  return view.w / (svg.clientWidth || 1);
}

function applyView() {
  const r = svg.getBoundingClientRect();
  view.h = view.w * (r.height / (r.width || 1));
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  const s = scale();
  $('labels').setAttribute('font-size', 12 * s);
  $('labels').setAttribute('stroke-width', 3.5 * s);
  $('route').setAttribute('stroke-width', 3.5 * s);
  for (const id in dots) dots[id].setAttribute('r', 4.5 * s);
  for (const h of $('halos').querySelectorAll('circle')) h.setAttribute('r', 7 * s);
  for (const c of $('route').querySelectorAll('circle')) c.setAttribute('r', 5 * s);
}

function boxOf(ids) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const id of ids) {
    const [a, b, c, d] = C[id].bb;
    x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
  }
  return [x0, y0, x1, y1];
}

// Cadre sur le départ, l'arrivée et les pays utiles (on ne dézoome pas pour un pays très loin).
// La Russie et quelques grands pays débordent largement de la zone : on limite le cadre à la zone.
function focusBox() {
  const ids = [game.a, game.b, ...game.hints, ...game.guesses.filter((id) => grade(id) !== 'far')];
  if (game.done && !game.won) ids.push(...missing().path);
  return clampBox(boxOf(ids), worldBox(game.region));
}
const clampBox = (b, z) => [Math.max(b[0], z[0]), Math.max(b[1], z[1]), Math.min(b[2], z[2]), Math.min(b[3], z[3])];
const ZONES = { europe: [-25, 34, 50, 71], afrique: [-20, -36, 55, 38], asie: [25, -12, 150, 56], ameriques: [-170, -56, -30, 72] };
function worldBox(region) {
  if (!ZONES[region]) return [0, 0, DATA.w, DATA.h];
  const [lon0, lat0, lon1, lat1] = ZONES[region];
  const [x0, y1] = project(lon0, lat0), [x1, y0] = project(lon1, lat1);
  return [x0, y0, x1, y1];
}

function target([x0, y0, x1, y1]) {
  const r = svg.getBoundingClientRect();
  const aspect = r.height / (r.width || 1);
  const pad = 1.35;
  const w = Math.max((x1 - x0) * pad, ((y1 - y0) * pad) / aspect, 120);
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - (w * aspect) / 2, w };
}

let anim = 0;
function flyTo(box, ms = 900, from) {
  const end = target(box);
  if (from) Object.assign(view, target(from));
  const start = { ...view };
  const r = svg.getBoundingClientRect();
  const aspect = r.height / (r.width || 1);
  const t0 = performance.now();
  const id = ++anim;
  // On interpole le centre et le zoom (en logarithme) pour un mouvement fluide.
  const c0 = [start.x + start.w / 2, start.y + (start.w * aspect) / 2];
  const c1 = [end.x + end.w / 2, end.y + (end.w * aspect) / 2];
  (function step(t) {
    if (id !== anim) return;
    const k = Math.min(1, (t - t0) / ms);
    const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
    view.w = Math.exp(Math.log(start.w) + (Math.log(end.w) - Math.log(start.w)) * e);
    view.x = c0[0] + (c1[0] - c0[0]) * e - view.w / 2;
    view.y = c0[1] + (c1[1] - c0[1]) * e - (view.w * aspect) / 2;
    applyView();
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

// Déplacement au doigt, pincer pour zoomer, molette sur ordinateur.
const pointers = new Map();
let gesture = null;
function zoomAt(px, py, factor) {
  const r = svg.getBoundingClientRect();
  const s = scale();
  const mx = view.x + (px - r.left) * s;
  const my = view.y + (py - r.top) * s;
  const w = Math.min(DATA.w * 1.2, Math.max(40, view.w / factor));
  const k = w / view.w;
  view.x = mx - (mx - view.x) * k;
  view.y = my - (my - view.y) * k;
  view.w = w;
}
svg.addEventListener('pointerdown', (e) => {
  anim++;
  svg.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  gesture = { moved: 0, target: e.target };
});
svg.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  const prev = [...pointers.values()];
  const old = pointers.get(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const now = [...pointers.values()];
  if (now.length === 1) {
    const s = scale();
    view.x -= (e.clientX - old.x) * s;
    view.y -= (e.clientY - old.y) * s;
    gesture.moved += Math.abs(e.clientX - old.x) + Math.abs(e.clientY - old.y);
  } else if (now.length === 2) {
    const d = (p) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    const mid = (p) => [(p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2];
    const [mx0, my0] = mid(prev), [mx1, my1] = mid(now);
    const s = scale();
    view.x -= (mx1 - mx0) * s;
    view.y -= (my1 - my0) * s;
    zoomAt(mx1, my1, d(now) / (d(prev) || 1));
    gesture.moved += 99;
  }
  applyView();
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (!pointers.size && gesture && gesture.moved < 8) tapped(gesture.target);
  if (!pointers.size) gesture = null;
}
svg.addEventListener('pointerup', endPointer);
svg.addEventListener('pointercancel', endPointer);
svg.addEventListener('wheel', (e) => {
  e.preventDefault();
  anim++;
  zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY / 300));
  applyView();
}, { passive: false });
svg.addEventListener('dblclick', () => flyTo(focusBox()));

// Toucher un pays déjà découvert affiche son nom.
let tipTimer;
function tapped(t) {
  const id = t && t.getAttribute && t.getAttribute('data-id');
  if (!id) return;
  const known = [game.a, game.b, ...game.guesses].includes(id) || (game.done && missing().path.includes(id));
  showTip(known ? `${emojiFlag(id)} ${C[id].n}` : game.hints.includes(id) ? '💡 Un pays utile…' : '🤫 Pays mystère');
}
function showTip(text) {
  $('tip').textContent = text;
  $('tip').classList.add('show');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => $('tip').classList.remove('show'), 1600);
}

new ResizeObserver(() => applyView()).observe(svg);

// ---------- Interface ----------

function renderRegions() {
  $('regions').innerHTML = '';
  for (const [k, label] of Object.entries(REGIONS)) {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = k === game.region ? 'active' : '';
    b.onclick = () => { if (k !== game.region) newGame(mode, k); };
    $('regions').appendChild(b);
  }
  $('regions').querySelector('.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function render(fresh) {
  $('game-num').textContent = `n°${game.num}`;
  $('a-flag').src = flag(game.a); $('a-name').textContent = C[game.a].n;
  $('b-flag').src = flag(game.b); $('b-name').textContent = C[game.b].n;
  const tries = maxTries();
  const used = game.guesses.length;
  $('pips').innerHTML = `<span>${used}/${tries}</span>` + Array.from({ length: tries }, (_, i) =>
    `<i class="${i < used ? grade(game.guesses[i]) : ''}${fresh && i === used - 1 ? ' pop' : ''}"></i>`).join('');
  const m = missing().n;
  const s = shortest();
  if (game.won) $('status').innerHTML = `<b>Relié !</b> en ${used} essai${used > 1 ? 's' : ''}`;
  else if (game.done) $('status').innerHTML = '<b>Perdu</b> · voici un chemin possible';
  else $('status').innerHTML = used && m < s
    ? `Il manque encore au moins <b>${m} pays</b>`
    : `Au moins <b>${s} pays</b> à traverser`;
  const list = [...game.guesses].reverse();
  $('guesses').innerHTML = list.length
    ? list.map((id, i) => `<span class="chip ${grade(id)}${fresh && i === 0 ? ' fresh' : ''}"><img src="${flag(id)}" alt=""><i></i>${C[id].n}</span>`).join('')
    : game.hints.length ? '' : '<span class="empty">Propose un pays frontalier pour commencer…</span>';
  for (const id of game.hints.filter((h) => !game.guesses.includes(h))) {
    $('guesses').insertAdjacentHTML('beforeend', `<span class="chip hint"><i></i>💡 indice sur la carte</span>`);
  }
  $('guess').disabled = game.done;
  $('go').disabled = game.done;
  $('hint-btn').disabled = game.done || game.hints.length >= MAX_HINTS;
}

// ---------- Saisie et suggestions ----------

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();
const ALIASES = {
  usa: ['usa', 'etats unis', 'amerique', 'us'], gbr: ['angleterre', 'grande bretagne', 'uk', 'royaume uni'],
  cod: ['rdc', 'congo kinshasa', 'zaire', 'republique democratique du congo'], cog: ['congo brazzaville', 'congo'],
  nld: ['hollande'], cze: ['republique tcheque'], mmr: ['myanmar'], blr: ['belarus'], vnm: ['vietnam'],
  are: ['emirats', 'eau'], swz: ['swaziland', 'eswatini'], mkd: ['macedoine'], civ: ['cote d ivoire'],
  tls: ['timor'], prk: ['coree du nord'], kor: ['coree du sud', 'coree'], caf: ['centrafrique', 'rca'],
  bih: ['bosnie'], dom: ['republique dominicaine'], vat: ['saint siege'], gnb: ['guinee bissau'],
};
const NAMES = Object.entries(C).map(([id, c]) => ({ id, keys: [norm(c.n), ...(ALIASES[id] || [])] }));

function matches(q) {
  q = norm(q);
  if (!q) return [];
  const allowed = members[game.region];
  const out = [];
  for (const { id, keys } of NAMES) {
    if (!allowed.has(id)) continue;
    let score = -1;
    for (const k of keys) {
      if (k === q) score = Math.max(score, 3);
      else if (k.startsWith(q)) score = Math.max(score, 2);
      else if (k.split(' ').some((w) => w.startsWith(q))) score = Math.max(score, 1);
    }
    if (score >= 0) out.push({ id, score });
  }
  return out.sort((x, y) => y.score - x.score || C[x.id].n.localeCompare(C[y.id].n, 'fr')).slice(0, 5).map((m) => m.id);
}

let sel = 0;
function suggest() {
  const ids = game.done ? [] : matches($('guess').value);
  sel = 0;
  const taken = new Set([game.a, game.b, ...game.guesses]);
  $('sugg').innerHTML = ids.map((id, i) =>
    `<li data-id="${id}" class="${i === 0 ? 'sel' : ''} ${taken.has(id) ? 'used' : ''}"><img src="${flag(id)}" alt="">${C[id].n}${taken.has(id) ? '<small>déjà là</small>' : ''}</li>`).join('');
}

$('guess').addEventListener('input', suggest);
$('guess').addEventListener('keydown', (e) => {
  const items = $('sugg').children;
  if (!items.length || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  items[sel].classList.remove('sel');
  sel = (sel + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
  items[sel].classList.add('sel');
});
$('sugg').addEventListener('pointerdown', (e) => e.preventDefault()); // garde le clavier ouvert
$('sugg').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (li) play(li.dataset.id);
});
$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const li = $('sugg').children[sel];
  if (li) return play(li.dataset.id);
  if ($('guess').value.trim()) { shake(); toast('Pays inconnu dans cette zone'); }
});

function shake() {
  $('form').classList.remove('shake');
  void $('form').offsetWidth;
  $('form').classList.add('shake');
}

function play(id) {
  if (game.done) return;
  if (id === game.a || id === game.b) { shake(); return toast('C\'est le départ ou l\'arrivée !'); }
  if (game.guesses.includes(id)) { shake(); return toast(`${C[id].n} : déjà proposé`); }
  $('guess').value = '';
  suggest();
  game.guesses.push(id);
  const g = grade(id);
  setClass(id, g + ' fresh');
  addLabel(id);
  ripple(id);
  const before = game.guesses.length;
  if (missing().n === 0) { game.done = true; game.won = true; }
  else if (before >= maxTries()) game.done = true;
  if (game.done) finish();
  save();
  render(true);
  navigator.vibrate?.(g === 'good' ? 20 : g === 'near' ? [15, 30, 15] : 60);
  // On montre le nouveau pays, puis on revient sur le trajet s'il est loin.
  const box = focusBox();
  if (g === 'far' && !game.done) {
    flyTo(boxOf([id, game.a, game.b]), 900);
    setTimeout(() => game.guesses.at(-1) === id && flyTo(focusBox(), 1000), 1900);
  } else flyTo(box, 900);
  if (game.done) {
    $('guess').blur();
    setTimeout(() => {
      drawRoute(true);
      if (game.won) { confetti(); navigator.vibrate?.([50, 50, 50, 50, 140]); }
    }, 800);
    setTimeout(showEnd, game.won ? 3000 : 3200);
  }
}

function hint() {
  if (game.done || game.hints.length >= MAX_HINTS) return;
  const next = missing().path.slice(1, -1).find((id) => !game.guesses.includes(id) && !game.hints.includes(id));
  if (!next) return;
  game.hints.push(next);
  save();
  setClass(next, 'hint');
  ripple(next);
  render();
  flyTo(focusBox(), 900);
  toast(`Indice ${game.hints.length}/${MAX_HINTS} : un pays utile clignote`);
}
$('hint-btn').onclick = hint;

// ---------- Fin de partie ----------

function finish() {
  const st = (data.stats[game.region] = data.stats[game.region] || { played: 0, won: 0, perfect: 0, streak: 0, best: 0 });
  st.played++;
  if (game.won) {
    st.won++;
    if (game.guesses.length === shortest() && !game.hints.length) st.perfect++;
  }
  if (mode === 'daily') {
    st.streak = game.won ? (st.lastDay === game.day - 1 ? st.streak + 1 : 1) : 0;
    st.lastDay = game.day;
    st.best = Math.max(st.best, st.streak);
  }
}

// La route : la chaîne trouvée (si gagné) ou un plus court chemin (si perdu), tracée en courbe.
function drawRoute(animate) {
  const { path } = missing();
  if (!game.won) for (const id of path.slice(1, -1)) if (!game.guesses.includes(id)) { setClass(id, 'missed'); addLabel(id); }
  const pts = path.map((id) => C[id].l);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1} ${c2} ${p2}`;
  }
  const g = $('route');
  g.innerHTML = '';
  if (game.won) {
    el('path', { d, class: 'route', stroke: '#7dd3fc', opacity: 0.6, filter: 'url(#glow)', pathLength: 1, ...(animate && { class: 'route draw' }) }, g);
    el('path', { d, class: animate ? 'route draw' : 'route', pathLength: 1 }, g);
    const comet = el('circle', { r: 5 * scale(), fill: '#fff', filter: 'url(#glow)' }, g);
    const mo = el('animateMotion', { dur: '3s', repeatCount: 'indefinite', path: d, begin: animate ? '1.8s' : '0s' }, comet);
    mo.beginElement?.();
  } else {
    el('path', { d, class: 'route ghost', pathLength: 1 }, g);
  }
  applyView();
  flyTo(focusBox(), 900);
}

function showEnd() {
  if (!game.done) return;
  const s = shortest();
  const n = game.guesses.length;
  const perfect = game.won && n === s && !game.hints.length;
  $('end-title').textContent = game.won ? (perfect ? 'Parcours parfait ! 🏆' : 'Bien joué ! 🎉') : 'Pas cette fois… 🧭';
  $('end-sub').textContent = game.won
    ? `Relié en ${n} essai${n > 1 ? 's' : ''} (le plus court passe par ${s} pays)${game.hints.length ? ` · ${game.hints.length} indice${game.hints.length > 1 ? 's' : ''}` : ''}`
    : `Il fallait passer par au moins ${s} pays. Un chemin possible :`;
  const route = missing().path;
  $('end-path').innerHTML = route.map((id, i) =>
    `${i ? '<em>›</em>' : ''}<span style="animation-delay:${i * 0.08}s"><img src="${flag(id)}" alt="">${C[id].n}</span>`).join('');
  const st = data.stats[game.region] || {};
  $('stats').innerHTML = [
    [st.played || 0, 'Parties'], [st.played ? Math.round((100 * st.won) / st.played) : 0, '% gagnées'],
    [st.perfect || 0, 'Parfaites'], [st.streak || 0, 'Série du jour'],
  ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
  $('again').textContent = mode === 'free' ? 'Nouvelle partie' : 'Faire une partie libre';
  $('end').showModal();
}

async function share() {
  const s = shortest();
  const n = game.guesses.length;
  const marks = game.guesses.map((id) => ({ good: '🟩', near: '🟧', far: '🟥' })[grade(id)]).join('');
  const head = `Passe-frontières n°${game.num} · ${REGIONS[game.region]}${mode === 'daily' ? ' (défi du jour)' : ''}`;
  const result = game.won ? `✅ ${n}/${maxTries()} (minimum ${s})` : `❌ X/${maxTries()}`;
  const link = `${location.href.split(/[?#]/)[0]}?zone=${game.region}&partie=${game.num}`;
  const text = `OustaGames · ${head}\n${emojiFlag(game.a)} ${C[game.a].n} → ${emojiFlag(game.b)} ${C[game.b].n}\n${result}${game.hints.length ? ' · 💡' + game.hints.length : ''}\n${marks}\n\nJoue le même trajet : ${link}`;
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); toast('Copié !'); }
  } catch {}
}

// ---------- Effets ----------

const fx = $('fx');
const ctx = fx.getContext('2d');
let parts = [];
let running = false;
function confetti() {
  fx.width = innerWidth * devicePixelRatio;
  fx.height = innerHeight * devicePixelRatio;
  const colors = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#ffffff'];
  parts.push(...Array.from({ length: 170 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, g: 0.3,
    rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, size: 7 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)], life: 120 + Math.random() * 60,
  })));
  if (!running) { running = true; requestAnimationFrame(tick); }
}
function tick() {
  const d = devicePixelRatio;
  ctx.clearRect(0, 0, fx.width, fx.height);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.99; p.rot += p.vr; p.life--;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.translate(p.x * d, p.y * d);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect((-p.size * d) / 2, (-p.size * d) / 4, p.size * d, (p.size * d) / 2);
    ctx.restore();
  }
  if (parts.length) requestAnimationFrame(tick);
  else { running = false; ctx.clearRect(0, 0, fx.width, fx.height); }
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

// Sur iPhone, le clavier réduit la zone visible : on adapte la hauteur pour garder la carte et la saisie.
if (window.visualViewport) {
  const fit = () => { document.body.style.height = visualViewport.height + 'px'; window.scrollTo(0, 0); };
  visualViewport.addEventListener('resize', fit);
  visualViewport.addEventListener('scroll', () => window.scrollTo(0, 0));
}

// ---------- Boutons ----------

$('mode-daily').onclick = () => newGame('daily', game.region);
$('mode-free').onclick = () => newGame('free', game.region);
$('help-btn').onclick = () => $('help').showModal();
$('fit-btn').onclick = () => flyTo(focusBox());
$('share').onclick = share;
$('close-end').onclick = () => $('end').close();
$('again').onclick = () => { $('end').close(); data.games['free-' + game.region] = null; newGame('free', game.region); };

$('settings-btn').onclick = () => {
  $('levels').innerHTML = '';
  for (const [k, [label, sub]] of Object.entries(LEVELS)) {
    const b = document.createElement('button');
    b.className = k === data.prefs.level ? 'active' : '';
    b.innerHTML = `<b>${label}</b><small>${sub}</small>`;
    b.onclick = () => {
      data.prefs.level = k;
      save();
      svg.setAttribute('class', k);
      for (const x of $('levels').children) x.classList.toggle('active', x === b);
    };
    $('levels').appendChild(b);
  }
  $('settings').showModal();
};

$('pick-btn').onclick = () => {
  const total = DATA.puzzles[game.region].length;
  $('pick-input').max = total;
  $('pick-input').value = '';
  $('pick-total').textContent = total;
  $('pick').showModal();
  $('pick-input').focus();
};
$('pick-form').onsubmit = (e) => {
  e.preventDefault();
  const total = DATA.puzzles[game.region].length;
  const n = parseInt($('pick-input').value, 10);
  if (!(n >= 1 && n <= total)) return toast(`Choisis un numéro entre 1 et ${total}`);
  $('pick').close();
  newGame('free', game.region, n);
};
$('pick-cancel').onclick = () => $('pick').close();

buildMap();
if (!data.seenHelp) { data.seenHelp = true; save(); $('help').showModal(); }
// Un lien partagé ?zone=europe&partie=12 ouvre directement ce trajet.
const params = new URLSearchParams(location.search);
const zone = params.get('zone');
const shared = parseInt(params.get('partie'), 10);
if (DATA.puzzles[zone] && shared >= 1 && shared <= DATA.puzzles[zone].length) {
  history.replaceState(null, '', location.pathname);
  newGame('free', zone, shared);
} else {
  newGame('daily');
}
