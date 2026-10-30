const STORE = 'ousta.snake';
const U = 100; // taille d'une case dans le dessin SVG
const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // haut, droite, bas, gauche (ligne, colonne)
const COLORS = ['#7ed957', '#ffb020', '#ff5fa2', '#4cc9f0', '#b388ff', '#ff7849', '#ffe14d', '#3ddc97', '#f72585', '#5aa9ff'];
const BYE = [
  'Sssalut !', 'Je file !', 'Liberté !', 'Youpiii !', 'Bye bye !', 'Sssayonara !', 'À plus !',
  'Wouhou !', 'Je vais à la plage !', 'Hasta la vista !', 'Ssssuper !', 'Trop fort !', 'Ciao !',
  'Vroum vroum !', 'Je suis libre !', 'Bisous !', 'Yahouuu !', 'Adios !', 'Ssssensass !',
];
const OUCH = ['Aïe !', 'Ouille !', 'Hé ho !', 'Bonk !', 'Pousse-toi !', 'Oups !', 'Ma tête !'];

const $ = (id) => document.getElementById(id);
const svg = $('board');
const NS = 'http://www.w3.org/2000/svg';

let data = load();
data.level = data.level || 1;
data.max = Math.max(data.max || 1, data.level);
if (data.sound === undefined) data.sound = true;

let game; // { level, n, snakes, occ, hearts, left, over, run }
let lastExit = 0;
let combo = 0;

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
}

// ---------- Génération des niveaux ----------

// Petit générateur pseudo-aléatoire : un même numéro de niveau donne toujours la même grille.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, r) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function levelSize(level) {
  return Math.min(10, 4 + Math.floor(level / 3));
}

// On pose les serpents un par un : chaque nouveau serpent doit avoir la voie libre devant lui
// parmi ceux déjà posés. Les enlever dans l'ordre inverse marche donc toujours : le niveau a une solution.
function build(n, maxLen, r) {
  const occ = new Array(n * n).fill(-1);
  const snakes = [];
  const inside = (y, x) => y >= 0 && x >= 0 && y < n && x < n;
  let placed = true;
  while (placed) {
    placed = false;
    const empties = shuffle(occ.map((o, i) => (o < 0 ? i : -1)).filter((i) => i >= 0), r);
    for (const h of empties) {
      const hy = Math.floor(h / n), hx = h % n;
      for (const d of shuffle([0, 1, 2, 3], r)) {
        const [dy, dx] = DIRS[d];
        const ray = new Set();
        let clear = true;
        for (let y = hy + dy, x = hx + dx; inside(y, x); y += dy, x += dx) {
          if (occ[y * n + x] >= 0) { clear = false; break; }
          ray.add(y * n + x);
        }
        const ny = hy - dy, nx = hx - dx;
        if (!clear || !inside(ny, nx) || occ[ny * n + nx] >= 0) continue;
        const target = 2 + Math.floor(r() * (maxLen - 1));
        const cells = [h, ny * n + nx];
        let cy = ny, cx = nx, way = [-dy, -dx];
        while (cells.length < target) {
          const options = DIRS.filter(([sy, sx]) => {
            const y = cy + sy, x = cx + sx, i = y * n + x;
            return inside(y, x) && occ[i] < 0 && !cells.includes(i) && !ray.has(i);
          });
          if (!options.length) break;
          const straight = options.find(([sy, sx]) => sy === way[0] && sx === way[1]);
          way = straight && r() < 0.4 ? straight : options[Math.floor(r() * options.length)];
          cy += way[0]; cx += way[1];
          cells.push(cy * n + cx);
        }
        cells.reverse(); // de la queue à la tête
        for (const i of cells) occ[i] = snakes.length;
        snakes.push({ cells, dir: d });
        placed = true;
        break;
      }
      if (placed) break;
    }
  }
  return snakes;
}

function headRay(n, s, occ, self) {
  const [dy, dx] = DIRS[s.dir];
  const h = s.cells[s.cells.length - 1];
  let steps = 0;
  for (let y = Math.floor(h / n) + dy, x = (h % n) + dx; y >= 0 && x >= 0 && y < n && x < n; y += dy, x += dx) {
    const o = occ[y * n + x];
    if (o >= 0 && o !== self) return { steps, blocker: o };
    steps++;
  }
  return { steps, blocker: -1 };
}

// Nombre de « vagues » pour tout vider : plus il y en a, plus les serpents dépendent les uns des autres.
function depth(n, snakes) {
  const occ = new Array(n * n).fill(-1);
  snakes.forEach((s, k) => s.cells.forEach((i) => { occ[i] = k; }));
  let left = snakes.map((_, k) => k), waves = 0;
  while (left.length) {
    const free = left.filter((k) => headRay(n, snakes[k], occ, k).blocker < 0);
    if (!free.length) return -1;
    free.forEach((k) => snakes[k].cells.forEach((i) => { occ[i] = -1; }));
    left = left.filter((k) => !free.includes(k));
    waves++;
  }
  return waves;
}

function makeLevel(level) {
  const n = levelSize(level);
  const maxLen = Math.min(3 + Math.floor(level / 2), 2 * n);
  let best = null;
  for (let k = 0; k < 30; k++) {
    const snakes = build(n, maxLen, rng(level * 7919 + k * 104729 + 17));
    const score = depth(n, snakes) * 100 + snakes.length;
    if (!best || score > best.score) best = { score, snakes };
  }
  const r = rng(level * 31 + 5);
  const offset = Math.floor(r() * COLORS.length);
  best.snakes.forEach((s, k) => { s.color = COLORS[(offset + k * 3) % COLORS.length]; s.flick = (r() * 2.6).toFixed(2); });
  return { n, snakes: best.snakes };
}

// ---------- Dessin ----------

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function shade(hex, f) {
  const v = parseInt(hex.slice(1), 16);
  const ch = [v >> 16, (v >> 8) & 255, v & 255].map((c) => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f));
  return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('');
}
function center(i) {
  return [(i % game.n) * U + U / 2, Math.floor(i / game.n) * U + U / 2];
}

function drawBoard() {
  const n = game.n, size = n * U;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  const defs = el('defs', {}, svg);
  const clip = el('clipPath', { id: 'round' }, defs);
  el('rect', { width: size, height: size, rx: 22 * size / 360 }, clip);
  const bg = el('g', { 'clip-path': 'url(#round)' }, svg);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      el('rect', { x: x * U, y: y * U, width: U, height: U, fill: (x + y) % 2 ? '#165c42' : '#1a6649' }, bg);
      el('circle', { cx: x * U + U / 2, cy: y * U + U / 2, r: 5, fill: 'rgba(255,255,255,.12)' }, bg);
    }
  }
  game.layer = el('g', {}, svg);
  game.snakes.forEach((s) => {
    s.el = snakeEl(s);
    const pts = s.cells.map(center);
    drawSnake(s.el, pts);
  });
}

function snakeEl(s) {
  const dark = shade(s.color, -0.45), light = shade(s.color, 0.45);
  const g = el('g', { class: 'snake' }, game.layer);
  const line = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const paths = [
    el('path', { ...line, class: 'glow', stroke: '#fff7a8', 'stroke-width': 86 }, g),
    el('path', { ...line, stroke: dark, 'stroke-width': 64 }, g),
    el('path', { ...line, stroke: s.color, 'stroke-width': 52 }, g),
    el('path', { ...line, stroke: light, 'stroke-width': 14, 'stroke-dasharray': '0 30' }, g),
  ];
  const head = el('g', {}, g);
  const tongue = el('g', { class: 'tongue', style: `animation-delay:${s.flick}s` }, head);
  el('path', { d: 'M30 0H64M64 0l13-10M64 0l13 10', fill: 'none', stroke: '#e11d48', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, tongue);
  el('ellipse', { cx: 6, cy: 0, rx: 39, ry: 34, fill: s.color, stroke: dark, 'stroke-width': 6 }, head);
  el('circle', { cx: 35, cy: -7, r: 3, fill: dark }, head);
  el('circle', { cx: 35, cy: 7, r: 3, fill: dark }, head);
  const eyes = el('g', { class: 'blink', style: `animation-delay:${s.flick * 1.7}s` }, head);
  for (const y of [-17, 17]) {
    el('circle', { cx: 12, cy: y, r: 12, fill: '#fff', stroke: dark, 'stroke-width': 3 }, eyes);
    el('circle', { cx: 17, cy: y, r: 6.5, fill: '#111' }, eyes);
    el('circle', { cx: 19, cy: y - 3, r: 2.2, fill: '#fff' }, eyes);
  }
  return { g, paths, head };
}

function drawSnake(e, pts) {
  const d = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
  e.paths.forEach((p) => p.setAttribute('d', d));
  const [hx, hy] = pts[pts.length - 1], [px, py] = pts[pts.length - 2];
  const ang = Math.atan2(hy - py, hx - px) * 180 / Math.PI;
  e.head.setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${ang.toFixed(1)})`);
}

// Chemin du serpent prolongé tout droit au-delà de sa tête, et le corps à la position t (en cases).
function track(s, extra) {
  const pts = s.cells.map(center);
  const [dy, dx] = DIRS[s.dir];
  const [hx, hy] = pts[pts.length - 1];
  for (let k = 1; k <= extra; k++) pts.push([hx + dx * U * k, hy + dy * U * k]);
  return pts;
}
function pointAt(pts, t) {
  const i = Math.min(Math.floor(t), pts.length - 2), f = t - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
}
function bodyAt(pts, len, t) {
  const out = [pointAt(pts, t)];
  for (let k = Math.floor(t) + 1; k < t + len - 1; k++) out.push(pts[k]);
  out.push(pointAt(pts, t + len - 1));
  return out;
}
function toScreen([x, y]) {
  const r = svg.getBoundingClientRect(), size = game.n * U;
  return [r.left + x / size * r.width, r.top + y / size * r.height];
}

// ---------- Partie ----------

function start(level) {
  data.level = level;
  save();
  const lv = makeLevel(level);
  game = { level, n: lv.n, snakes: lv.snakes, hearts: 3, over: false, run: (game ? game.run : 0) + 1, moving: 0 };
  game.occ = new Array(game.n * game.n).fill(-1);
  game.snakes.forEach((s, k) => { s.id = k; s.alive = true; s.cells.forEach((i) => { game.occ[i] = k; }); });
  game.left = game.snakes.length;
  combo = 0;
  drawBoard();
  updateInfo();
}

function updateInfo(lostHeart) {
  $('level-name').textContent = `Niveau ${game.level}`;
  $('prev').disabled = game.level <= 1;
  $('next').disabled = game.level >= data.max;
  $('left').textContent = `🐍 × ${game.left}`;
  $('hearts').innerHTML = [0, 1, 2].map((k) => {
    const cls = k >= game.hearts ? 'lost' + (lostHeart && k === game.hearts ? ' pop' : '') : '';
    return `<span class="${cls}">❤️</span>`;
  }).join('');
}

function tap(ev) {
  if (!game || game.over) return;
  sound.unlock();
  const r = svg.getBoundingClientRect();
  const x = Math.floor((ev.clientX - r.left) / r.width * game.n);
  const y = Math.floor((ev.clientY - r.top) / r.height * game.n);
  if (x < 0 || y < 0 || x >= game.n || y >= game.n) return;
  const k = game.occ[y * game.n + x];
  if (k < 0) return;
  const s = game.snakes[k];
  if (s.busy) return;
  clearHint();
  const { steps, blocker } = headRay(game.n, s, game.occ, k);
  if (blocker < 0) leave(s, steps);
  else bump(s, steps, blocker);
}

function animate(step) {
  const run = game.run, t0 = performance.now();
  const frame = (now) => {
    if (run !== game.run) return;
    if (step(Math.max(0, now - t0) / 1000) !== false) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function leave(s, steps) {
  const len = s.cells.length;
  s.busy = true;
  s.alive = false;
  s.cells.forEach((i) => { game.occ[i] = -1; });
  game.left--;
  game.moving++;
  updateInfo();
  game.layer.appendChild(s.el.g);
  s.el.g.classList.add('moving');
  const pts = track(s, steps + len + 2);
  const end = steps + len + 0.8;
  const trail = TRAILS[Math.floor(Math.random() * TRAILS.length)];
  let out = false, lastTrail = 0;
  sound.whoosh();
  animate((e) => {
    const t = Math.min(end, 4 * e + 9 * e * e);
    const body = bodyAt(pts, len, t);
    drawSnake(s.el, body);
    if (e - lastTrail > 0.025) { lastTrail = e; trail(toScreen(body[0]), toScreen(body[1])); }
    if (!out && t > steps + 0.5) {
      out = true;
      celebrate(s, toScreen(pointAt(pts, len - 1 + steps + 0.5)));
    }
    s.el.g.style.opacity = Math.max(0, Math.min(1, (end - t) / 1.5));
    if (t >= end) {
      s.el.g.remove();
      game.moving--;
      if (!game.left && !game.moving) win();
      return false;
    }
  });
}

function bump(s, steps, blocker) {
  const len = s.cells.length;
  s.busy = true;
  game.layer.appendChild(s.el.g);
  s.el.g.classList.add('moving');
  const pts = track(s, steps + len + 2);
  const reach = steps + 0.3, go = Math.max(0.12, reach / 14);
  let hit = false;
  animate((e) => {
    let t;
    if (e < go) t = reach * (e / go) ** 2;
    else t = reach * Math.max(0, 1 - (e - go) / 0.35) ** 2;
    if (!hit && e >= go) {
      hit = true;
      ouch(s, game.snakes[blocker], toScreen(pointAt(pts, len - 1 + reach)));
    }
    drawSnake(s.el, bodyAt(pts, len, t));
    if (e >= go + 0.35) {
      drawSnake(s.el, s.cells.map(center));
      s.el.g.classList.remove('moving');
      s.busy = false;
      if (game.hearts <= 0) lose();
      return false;
    }
  });
}

function ouch(s, other, at) {
  game.hearts--;
  combo = 0;
  updateInfo(true);
  sound.bonk();
  if (navigator.vibrate) navigator.vibrate(80);
  const wrap = $('wrap');
  wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
  other.el.g.classList.remove('hit'); void other.el.g.getBBox(); other.el.g.classList.add('hit');
  bubble(at, OUCH[Math.floor(Math.random() * OUCH.length)]);
  burstStars(at);
  if (game.hearts <= 0) game.over = true;
}

function celebrate(s, at) {
  const now = performance.now();
  combo = now - lastExit < 1600 ? combo + 1 : 1;
  lastExit = now;
  // Effets lancés un peu vers le haut et gardés à l'écran, même quand le serpent sort par un bord.
  const [dy, dx] = DIRS[s.dir];
  at = [Math.max(30, Math.min(innerWidth - 30, at[0])), Math.max(40, Math.min(innerHeight - 30, at[1]))];
  BURSTS[Math.floor(Math.random() * BURSTS.length)](at, [dx * 0.7, dy - 0.6], s.color);
  if (Math.random() < 0.75) bubble(at, BYE[Math.floor(Math.random() * BYE.length)]);
  sound.pop(combo);
  if (combo >= 2) {
    const c = document.createElement('div');
    c.className = 'combo';
    c.textContent = combo >= 5 ? `MÉGA COMBO ×${combo} !` : `Combo ×${combo} !`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1200);
    if (combo >= 3) fireworks([innerWidth / 2, innerHeight * 0.4]);
  }
}

function win() {
  game.over = true;
  if (game.level + 1 > data.max) data.max = game.level + 1;
  save();
  sound.fanfare();
  confettiRain();
  setTimeout(() => {
    fireworks([innerWidth * 0.3, innerHeight * 0.3]);
    setTimeout(() => fireworks([innerWidth * 0.7, innerHeight * 0.35]), 350);
  }, 300);
  const perfect = game.hearts === 3;
  setTimeout(() => {
    $('end-emoji').textContent = perfect ? '🐍👑' : '🐍🎉';
    $('end-title').textContent = perfect ? 'Sans une bosse !' : 'Bravo !';
    $('end-sub').textContent = `Niveau ${game.level} terminé, tous les serpents sont dehors` + (perfect ? ' et personne ne s\'est cogné.' : '.');
    $('end-go').textContent = `Niveau ${game.level + 1}`;
    $('end-go').onclick = () => { $('end').close(); start(game.level + 1); };
    $('end').showModal();
  }, 1300);
}

function lose() {
  sound.sad();
  setTimeout(() => {
    $('end-emoji').textContent = '🐍💫';
    $('end-title').textContent = 'Aïe aïe aïe…';
    $('end-sub').textContent = 'Les serpents se sont fait trop de bosses. Regarde bien où pointe chaque tête avant de toucher !';
    $('end-go').textContent = 'Réessayer';
    $('end-go').onclick = () => { $('end').close(); start(game.level); };
    $('end').showModal();
  }, 500);
}

let hintTimer;
function clearHint() {
  clearTimeout(hintTimer);
  game.snakes.forEach((s) => s.el.g.classList.remove('hint'));
}
function hint() {
  if (!game || game.over) return;
  clearHint();
  const free = game.snakes.filter((s, k) => s.alive && !s.busy && headRay(game.n, s, game.occ, k).blocker < 0);
  if (!free.length) return;
  const s = free[Math.floor(Math.random() * free.length)];
  s.el.g.classList.add('hint');
  hintTimer = setTimeout(clearHint, 2500);
}

// ---------- Effets ----------

const fx = $('fx');
const ctx = fx.getContext('2d');
let parts = [];
let fxRunning = false;

function resizeFx() {
  const dpr = window.devicePixelRatio || 1;
  fx.width = innerWidth * dpr;
  fx.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function add(p) {
  parts.push({ g: 0.2, vr: 0, rot: 0, grow: 0, drag: 0.99, ...p, max: p.life });
  if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
}
function fxLoop() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => --p.life > 0);
  for (const p of parts) {
    if (p.delay > 0) { p.delay--; p.life++; continue; }
    p.vx *= p.drag; p.vy *= p.drag;
    p.vy += p.g;
    p.x += p.vx + (p.wave ? Math.sin(p.life / 6) * p.wave : 0);
    p.y += p.vy;
    p.rot += p.vr;
    p.size = Math.max(0.5, p.size + p.grow);
    ctx.globalAlpha = Math.min(1, (p.life / p.max) * 2.5) * (p.alpha || 1);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.kind === 'rect') { ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
    else if (p.kind === 'ring') { ctx.strokeStyle = p.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 7); ctx.stroke(); }
    else if (p.kind === 'text') { ctx.font = `${p.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.ch, 0, 0); }
    else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(fxLoop);
  else { fxRunning = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
}

const CONFETTI = ['#ffd23f', '#ff5fa2', '#4cc9f0', '#7ed957', '#b388ff', '#ff7849', '#ffffff'];

function confetti([x, y], [dx, dy]) {
  for (let i = 0; i < 50; i++) {
    const sp = rand(4, 13);
    add({ kind: 'rect', x, y, vx: dx * sp + rand(-5, 5), vy: dy * sp + rand(-7, 3), size: rand(8, 14), color: pick(CONFETTI), vr: rand(-0.3, 0.3), life: rand(50, 90), g: 0.28, drag: 0.97 });
  }
}
function emojiBurst(list, n) {
  return ([x, y], [dx, dy]) => {
    for (let i = 0; i < n; i++) {
      const sp = rand(3, 9);
      add({ kind: 'text', ch: pick(list), x, y, vx: dx * sp + rand(-4, 4), vy: dy * sp + rand(-8, -1), size: rand(18, 32), vr: rand(-0.15, 0.15), life: rand(50, 80), g: 0.22, drag: 0.98 });
    }
  };
}
function hearts([x, y]) {
  for (let i = 0; i < 14; i++) {
    add({ kind: 'text', ch: pick(['💚', '💛', '💖', '💜', '🧡']), x: x + rand(-25, 25), y, vx: rand(-1.5, 1.5), vy: rand(-5, -2), size: rand(18, 30), life: rand(60, 100), g: -0.03, wave: 1.2, delay: Math.floor(rand(0, 12)) });
  }
}
function bubbles([x, y], [dx, dy]) {
  for (let i = 0; i < 20; i++) {
    add({ kind: 'ring', x: x + rand(-20, 20), y: y + rand(-20, 20), vx: dx * rand(1, 4), vy: dy * rand(1, 4) - rand(1, 3), size: rand(5, 15), color: 'rgba(200,240,255,.9)', life: rand(50, 90), g: -0.05, wave: 1.5, grow: 0.08, delay: Math.floor(rand(0, 10)) });
  }
}
function fireworks([x, y]) {
  for (let b = 0; b < 3; b++) {
    const cx = x + rand(-60, 60), cy = y + rand(-50, 30), col = pick(CONFETTI), delay = b * 8;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2, sp = rand(3, 6);
      add({ kind: 'dot', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 3, color: col, life: 55, g: 0.06, drag: 0.95, delay });
    }
  }
}
function rocket([x, y], [dx, dy], color) {
  confetti([x, y], [dx, dy]);
  emojiBurst(['🚀', '✨', '⭐'], 6)([x, y], [dx, dy]);
  for (let i = 0; i < 12; i++) {
    add({ kind: 'dot', x, y, vx: rand(-2, 2), vy: rand(-2, 2), size: rand(10, 18), color: 'rgba(230,230,230,.6)', life: rand(40, 60), g: -0.04, grow: 0.4, delay: i });
  }
  fireworks([x, y]);
}
function burstStars([x, y]) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add({ kind: 'text', ch: pick(['⭐', '💫']), x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, size: 18, life: 30, g: 0, drag: 0.92 });
  }
}

const BURSTS = [
  confetti,
  emojiBurst(['⭐', '✨', '🌟', '💫'], 16),
  emojiBurst(['🎉', '🥳', '🍃', '🐍', '🎊'], 12),
  hearts,
  bubbles,
  (at) => fireworks(at),
  rocket,
];

// Traînées derrière la queue pendant la sortie.
const TRAILS = [
  ([x, y]) => add({ kind: 'text', ch: pick(['✨', '⭐']), x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-1, 1), vy: rand(-1, 1), size: rand(12, 20), life: 30, g: 0 }),
  ([x, y]) => add({ kind: 'dot', x: x + rand(-12, 12), y: y + rand(-12, 12), vx: rand(-0.6, 0.6), vy: rand(-2, -0.5), size: rand(6, 11), color: pick(['#ffd23f', '#ff7849', '#ef4444', '#ffb020']), life: 28, g: -0.02, grow: -0.25 }),
  ([x, y]) => add({ kind: 'dot', x, y, vx: 0, vy: 0, size: 9, color: `hsl(${(performance.now() / 4) % 360} 95% 60%)`, life: 35, g: 0, grow: -0.2 }),
  ([x, y]) => add({ kind: 'dot', x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-0.5, 0.5), vy: rand(-1, 0), size: rand(6, 10), color: 'rgba(235,235,235,.55)', life: 40, g: -0.01, grow: 0.35 }),
  ([x, y]) => { if (Math.random() < 0.35) add({ kind: 'text', ch: pick(['🎵', '🎶']), x, y, vx: rand(-1, 1), vy: rand(-2, -1), size: 18, life: 45, g: 0 }); },
];

function confettiRain() {
  for (let i = 0; i < 140; i++) {
    add({ kind: 'rect', x: rand(0, innerWidth), y: rand(-60, -10), vx: rand(-1.5, 1.5), vy: rand(2, 6), size: rand(8, 14), color: pick(CONFETTI), vr: rand(-0.2, 0.2), life: rand(120, 200), g: 0.05, wave: 1, delay: Math.floor(rand(0, 40)) });
  }
}

function bubble([x, y], text) {
  const b = document.createElement('div');
  b.className = 'bubble';
  b.textContent = text;
  b.style.left = Math.max(70, Math.min(innerWidth - 70, x)) + 'px';
  b.style.top = Math.max(60, Math.min(innerHeight - 40, y)) + 'px';
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1600);
}

// ---------- Sons (synthétisés, aucun fichier) ----------

const sound = (() => {
  let ac;
  const unlock = () => {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; } }
    if (ac.state === 'suspended') ac.resume();
  };
  const tone = (type, f0, f1, dur, vol = 0.15, at = 0) => {
    if (!ac || !data.sound) return;
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur);
  };
  return {
    unlock,
    whoosh: () => tone('triangle', 260, 1100, 0.32, 0.12),
    pop: (c) => { const f = 520 * Math.pow(1.12, Math.min(c, 8)); tone('sine', f, f * 1.6, 0.12, 0.18); tone('sine', f * 1.5, f * 2.2, 0.1, 0.1, 0.07); },
    bonk: () => { tone('square', 170, 55, 0.18, 0.12); tone('sine', 90, 40, 0.25, 0.2); },
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f * 1.01, 0.22, 0.14, i * 0.11)),
    sad: () => [392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.94, 0.3, 0.13, i * 0.2)),
  };
})();

function updateSoundBtn() {
  $('sound-btn').innerHTML = (data.sound ? '🔊' : '🔇') + '<span>Son</span>';
}

// ---------- Boutons ----------

svg.addEventListener('pointerdown', tap);
$('prev').onclick = () => { if (game.level > 1) start(game.level - 1); };
$('next').onclick = () => { if (game.level < data.max) start(game.level + 1); };
$('hint-btn').onclick = hint;
$('restart-btn').onclick = () => start(game.level);
$('sound-btn').onclick = () => { data.sound = !data.sound; save(); updateSoundBtn(); sound.unlock(); };
$('help-btn').onclick = () => $('help').showModal();
$('help-close').onclick = () => $('help').close();
$('end-close').onclick = () => $('end').close();
addEventListener('resize', resizeFx);

resizeFx();
updateSoundBtn();
start(data.level);
if (!data.seenHelp) { data.seenHelp = true; save(); $('help').showModal(); }
