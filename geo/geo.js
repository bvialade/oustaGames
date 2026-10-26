const STORE = 'ousta.geo';
const SVGNS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);

const MODES = {
  flag: { label: 'Drapeaux', icon: '🏳️', hint: 'À quel pays est ce drapeau ?' },
  capital: { label: 'Capitales', icon: '🏛️', hint: 'Quelle est la capitale de ce pays ?' },
  country: { label: 'Capitale → pays', icon: '📍', hint: 'De quel pays est-ce la capitale ?' },
};
const REGIONS = {
  monde: 'Monde entier', europe: 'Europe', afrique: 'Afrique',
  ameriques: 'Amériques', asie: 'Asie', oceanie: 'Océanie',
};
const LENGTHS = [10, 20, 0]; // 0 = tous les pays de la zone
// Cadres des zones, en degrés : [lon ouest, lat sud, lon est, lat nord].
const ZONES = { europe: [-25, 34, 50, 71], afrique: [-20, -36, 55, 38], asie: [25, -12, 150, 56], ameriques: [-170, -56, -30, 72], oceanie: [110, -48, 180, 8] };
const AUTO_NEXT = 1900; // ms avant la question suivante après une bonne réponse

let prefs = load();
let quiz;

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(prefs)); } catch {}
}
prefs.mode = prefs.mode || 'flag';
prefs.region = prefs.region || 'monde';
prefs.length = prefs.length ?? 10;
prefs.best = prefs.best || {};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pool = (region) => COUNTRIES.filter((c) => region === 'monde' || c.r === region);
const flagSrc = (id) => `flags/${id}.svg`;
const bestKey = () => `${prefs.mode}-${prefs.region}-${prefs.length}`;

// --- Carte du monde (contours partagés avec Passe-frontières) ---

function project(lon, lat) {
  const my = (l) => -1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * l * Math.PI / 180)) * DATA.w / (2 * Math.PI);
  return [(lon + 180) * DATA.w / 360, my(Math.max(-60, Math.min(84, lat))) - my(84)];
}
function zoneBox(region) {
  if (!ZONES[region]) return [0, 0, DATA.w, DATA.h];
  const [lon0, lat0, lon1, lat1] = ZONES[region];
  const [x0, y1] = project(lon0, lat0), [x1, y0] = project(lon1, lat1);
  return [x0, y0, x1, y1];
}
// Les pays à cheval sur l'antiméridien (Fidji, Kiribati) ont un cadre qui fait le tour du monde : on centre sur leur point.
function countryBox(id) {
  const c = DATA.c[id];
  if (c.bb[2] - c.bb[0] > DATA.w / 2) return [c.l[0] - 120, c.l[1] - 80, c.l[0] + 120, c.l[1] + 80];
  return c.bb;
}

function el(name, attrs, parent) {
  const e = document.createElementNS(SVGNS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function makeMap(svg) {
  const map = { svg, view: { x: 0, y: 0, w: DATA.w }, paths: {}, anim: 0 };
  let d = '';
  for (let lon = -180; lon <= 180; lon += 15) d += `M${project(lon, 0)[0]} 0V${DATA.h}`;
  for (let lat = -60; lat <= 80; lat += 10) d += `M0 ${project(0, lat)[1]}H${DATA.w}`;
  el('path', { d, class: 'grat', 'vector-effect': 'non-scaling-stroke' }, svg);
  el('path', { d: DATA.bg, class: 'bg' }, svg);
  const g = el('g', {}, svg);
  for (const [id, c] of Object.entries(DATA.c)) {
    if (c.p) map.paths[id] = el('path', { d: c.p, class: 'land', 'vector-effect': 'non-scaling-stroke' }, g);
  }
  map.fx = el('g', {}, svg);
  map.aspect = () => (svg.clientHeight || 1) / (svg.clientWidth || 1);
  map.apply = () => {
    const v = map.view;
    svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.w * map.aspect()}`);
  };
  map.target = ([x0, y0, x1, y1], pad = 1.3, min = 0) => {
    const a = map.aspect();
    const w = Math.max((x1 - x0) * pad, ((y1 - y0) * pad) / a, min);
    return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - (w * a) / 2, w };
  };
  // Vol fluide : on interpole le centre et le zoom (en logarithme).
  map.flyTo = (end, ms = 1000) => {
    const a = map.aspect();
    const v = map.view;
    const start = { ...v };
    const c0 = [start.x + start.w / 2, start.y + (start.w * a) / 2];
    const c1 = [end.x + end.w / 2, end.y + (end.w * a) / 2];
    const t0 = performance.now();
    const id = ++map.anim;
    (function step(t) {
      if (id !== map.anim) return;
      const k = Math.min(1, (t - t0) / ms);
      const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
      // Petit dézoom au milieu du trajet, comme un avion qui prend de l'altitude.
      const lift = 1 + 0.35 * Math.sin(Math.PI * e) * Math.min(1, Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) / 800);
      v.w = Math.exp(Math.log(start.w) + (Math.log(end.w) - Math.log(start.w)) * e) * lift;
      v.x = c0[0] + (c1[0] - c0[0]) * e - v.w / 2;
      v.y = c0[1] + (c1[1] - c0[1]) * e - (v.w * a) / 2;
      map.apply();
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  };
  map.paint = (cls) => {
    for (const id in map.paths) map.paths[id].setAttribute('class', 'land' + (cls(id) ? ' ' + cls(id) : ''));
  };
  return map;
}

const heroMap = makeMap($('hero-map'));
const playMap = makeMap($('play-map'));

function showRegion(first) {
  const ids = new Set(pool(prefs.region).map((c) => c.id));
  heroMap.paint((id) => (ids.has(id) ? 'on' : ''));
  const end = heroMap.target(zoneBox(prefs.region), 1.05);
  if (first) {
    Object.assign(heroMap.view, heroMap.target([0, 0, DATA.w, DATA.h], 1));
    heroMap.apply();
  }
  heroMap.flyTo(end, first ? 1600 : 900);
  $('hero-tag').textContent = `${REGIONS[prefs.region]} · ${ids.size} pays`;
}

// --- Écran de réglages ---

function renderSetup() {
  const modes = $('modes');
  modes.innerHTML = '';
  for (const [k, m] of Object.entries(MODES)) {
    const best = prefs.best[`${k}-${prefs.region}-${prefs.length}`];
    const b = document.createElement('button');
    b.className = 'mode' + (k === prefs.mode ? ' active' : '');
    b.innerHTML = `<span class="ico">${m.icon}</span><span><b>${m.label}</b><small>${m.hint}</small></span>`
      + (best !== undefined ? `<span class="best">🏆 ${best} %</span>` : '');
    b.onclick = () => { prefs.mode = k; save(); renderSetup(); };
    modes.appendChild(b);
  }
  const regions = $('regions');
  regions.innerHTML = '';
  for (const [k, label] of Object.entries(REGIONS)) {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = k === prefs.region ? 'active' : '';
    b.onclick = () => {
      if (prefs.region === k) return;
      prefs.region = k; save(); renderSetup(); showRegion();
    };
    regions.appendChild(b);
  }
  const lengths = $('lengths');
  lengths.innerHTML = '';
  for (const n of LENGTHS) {
    const b = document.createElement('button');
    b.textContent = n ? `${n}` : 'Tous';
    b.className = n === prefs.length ? 'active' : '';
    b.onclick = () => { prefs.length = n; save(); renderSetup(); };
    lengths.appendChild(b);
  }
}

function show(screen) {
  for (const id of ['setup', 'play', 'result']) {
    const s = $(id);
    s.hidden = id !== screen;
    // Relance l'animation d'entrée.
    if (!s.hidden) { s.classList.remove('screen'); void s.offsetWidth; s.classList.add('screen'); }
  }
  $('back').href = screen === 'setup' ? '../' : '#';
  window.scrollTo(0, 0);
}

// --- Partie ---

function start(questions) {
  const countries = pool(prefs.region);
  const list = questions ? shuffle(questions) : shuffle(countries);
  quiz = {
    mode: prefs.mode,
    key: questions ? null : bestKey(),
    questions: questions || !prefs.length ? list : list.slice(0, prefs.length),
    index: 0, score: 0, streak: 0, bestStreak: 0,
    misses: [], t0: Date.now(),
  };
  show('play');
  // Point de départ de la carte : le monde entier, ou la zone jouée.
  Object.assign(playMap.view, playMap.target(zoneBox(prefs.region), 1.05));
  playMap.apply();
  ask();
}

// Les mauvaises réponses viennent de préférence de la même zone, pour corser un peu.
function options(target) {
  const near = shuffle(COUNTRIES.filter((c) => c !== target && c.r === target.r));
  const far = shuffle(COUNTRIES.filter((c) => c !== target && c.r !== target.r));
  return shuffle([target, ...[...near, ...far].slice(0, 3)]);
}

let nextTimer;
function ask() {
  clearTimeout(nextTimer);
  const q = quiz.questions[quiz.index];
  const total = quiz.questions.length;
  quiz.answered = false;
  $('count').innerHTML = `Question <b>${quiz.index + 1}</b> / ${total}`;
  $('score').textContent = `${quiz.score} pt${quiz.score > 1 ? 's' : ''}`;
  $('bar-fill').style.width = (100 * quiz.index) / total + '%';
  renderStreak(false);

  const m = quiz.mode;
  const front = $('question');
  front.innerHTML =
    m === 'flag' ? `<img class="flag" src="${flagSrc(q.id)}" alt="Drapeau à deviner"><p>${MODES.flag.hint}</p>`
    : m === 'capital' ? `<img class="mini" src="${flagSrc(q.id)}" alt=""><h2>${q.n}</h2><p>${MODES.capital.hint}</p>`
    : `<div class="pinicon">📍</div><h2>${q.c}</h2><p>${MODES.country.hint}</p>`;
  front.classList.remove('in'); void front.offsetWidth; front.classList.add('in');
  $('card').classList.remove('flipped');

  const answers = $('answers');
  answers.innerHTML = '';
  options(q).forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'answer';
    b.style.animationDelay = 80 + i * 60 + 'ms';
    b.innerHTML = `<span class="key">${'ABCD'[i]}</span><span></span>`;
    b.lastChild.textContent = m === 'capital' ? opt.c : opt.n;
    b.onclick = () => pick(b, opt, q);
    b.dataset.right = opt === q ? '1' : '';
    answers.appendChild(b);
  });
  $('next').className = 'btn';

  // Précharge le drapeau suivant pour qu'il s'affiche tout de suite.
  const next = quiz.questions[quiz.index + 1];
  if (next) new Image().src = flagSrc(next.id);
}

function renderStreak(pop) {
  const s = $('streak');
  s.textContent = `🔥 ${quiz.streak}`;
  s.classList.toggle('show', quiz.streak >= 2);
  if (pop && quiz.streak >= 2) { s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); }
}

function pick(button, opt, q) {
  if (quiz.answered) return;
  quiz.answered = true;
  const right = opt === q;
  const buttons = [...$('answers').children];
  buttons.forEach((b) => {
    b.disabled = true;
    b.style.animationDelay = '0ms';
    if (b !== button && !b.dataset.right) b.classList.add('dim');
  });
  if (right) {
    quiz.score++;
    quiz.streak++;
    quiz.bestStreak = Math.max(quiz.bestStreak, quiz.streak);
    button.classList.add('right');
    const plus = document.createElement('span');
    plus.className = 'plus';
    plus.textContent = '+1';
    button.appendChild(plus);
    const sc = $('score');
    sc.textContent = `${quiz.score} pt${quiz.score > 1 ? 's' : ''}`;
    sc.classList.remove('pop'); void sc.offsetWidth; sc.classList.add('pop');
    const r = button.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, quiz.streak % 5 === 0 ? 90 : 26);
    navigator.vibrate?.(30);
  } else {
    quiz.streak = 0;
    button.classList.add('wrong');
    buttons.find((b) => b.dataset.right).classList.add('right');
    quiz.misses.push(q);
    navigator.vibrate?.([60, 40, 60]);
  }
  renderStreak(right);
  $('bar-fill').style.width = (100 * (quiz.index + 1)) / quiz.questions.length + '%';
  setTimeout(() => reveal(q, right ? null : opt), right ? 450 : 750);
}

// Retourne la carte question pour montrer le pays sur la carte du monde.
function reveal(q, wrong) {
  playMap.paint((id) => (id === q.id ? (wrong ? 'miss' : 'hit') : wrong && id === wrong.id ? 'bad' : ''));
  playMap.fx.innerHTML = '';
  // Le pays à trouver passe au premier plan (Saint-Marin ou le Vatican sont dessinés sous l'Italie).
  const path = playMap.paths[q.id];
  if (path) path.parentNode.appendChild(path);
  const end = playMap.target(countryBox(q.id), 1.6, 380);
  end.y += end.w * playMap.aspect() * 0.12; // remonte le pays au-dessus de la légende
  const [x, y] = DATA.c[q.id].l;
  el('circle', { cx: x, cy: y, r: end.w * 0.09, class: 'ring', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, playMap.fx);
  if (!DATA.c[q.id].p || DATA.c[q.id].dot) el('circle', { cx: x, cy: y, r: end.w * 0.012, class: 'pin', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, playMap.fx);
  $('caption').innerHTML = `<img src="${flagSrc(q.id)}" alt=""><div><b></b><small></small></div>`;
  $('caption').querySelector('b').textContent = q.n;
  $('caption').querySelector('small').textContent = `Capitale : ${q.c}`;
  $('card').classList.add('flipped');
  setTimeout(() => playMap.flyTo(end, 1300), 200);

  const last = quiz.index + 1 >= quiz.questions.length;
  const next = $('next');
  next.lastChild.textContent = last ? 'Voir le résultat' : 'Suivant';
  next.style.setProperty('--t', AUTO_NEXT + 'ms');
  next.className = 'btn show' + (wrong ? '' : ' auto');
  if (!wrong) nextTimer = setTimeout(advance, AUTO_NEXT);
}

function advance() {
  clearTimeout(nextTimer);
  if (!quiz.answered) return;
  quiz.index++;
  if (quiz.index < quiz.questions.length) ask();
  else finish();
}

// --- Résultat ---

function finish() {
  const total = quiz.questions.length;
  const pct = Math.round((100 * quiz.score) / total);
  let record = false, previous;
  if (quiz.key) {
    previous = prefs.best[quiz.key];
    record = previous === undefined || pct > previous;
    if (record) { prefs.best[quiz.key] = pct; save(); }
  }
  show('result');

  $('result-text').textContent = pct === 100 ? 'Sans faute !' : pct >= 70 ? 'Très bien !' : pct >= 40 ? 'Pas mal !' : 'On s’entraîne encore ?';
  $('result-score').textContent = `${quiz.score} / ${total}`;
  const best = $('result-best');
  best.className = record && previous !== undefined ? 'record' : '';
  best.textContent = !quiz.key ? 'Révision de tes erreurs'
    : record && previous !== undefined ? '🏆 Nouveau record !' : `Record sur ce jeu : ${prefs.best[quiz.key]} %`;

  const stars = pct >= 90 ? 3 : pct >= 65 ? 2 : pct >= 35 ? 1 : 0;
  $('stars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${900 + i * 200}ms">⭐</span>`).join('');

  const secs = Math.round((Date.now() - quiz.t0) / 1000);
  const time = secs >= 60 ? `${Math.floor(secs / 60)} min ${String(secs % 60).padStart(2, '0')}` : `${secs} s`;
  $('facts').innerHTML = `<div><b>${quiz.score}</b><span>bonnes réponses</span></div>`
    + `<div><b>🔥 ${quiz.bestStreak}</b><span>meilleure série</span></div>`
    + `<div><b>${time}</b><span>temps</span></div>`;

  // Jauge et pourcentage qui se remplissent.
  const circle = $('gauge-val');
  const len = 2 * Math.PI * 86;
  circle.style.strokeDasharray = len;
  circle.style.strokeDashoffset = len;
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / 1100);
    const e = 1 - (1 - k) ** 3;
    circle.style.strokeDashoffset = len * (1 - (pct / 100) * e);
    $('result-pct').textContent = Math.round(pct * e) + ' %';
    if (k < 1) requestAnimationFrame(step);
  })(t0);
  if (pct >= 70) setTimeout(() => { confetti(pct === 100 || record ? 220 : 120); navigator.vibrate?.([50, 50, 50, 50, 140]); }, 1000);

  $('retry-misses').hidden = !quiz.misses.length;
  $('recap').innerHTML = quiz.misses.length
    ? '<div class="section-title">À revoir</div>' + quiz.misses.map((c, i) =>
      `<div class="item" style="animation-delay:${300 + i * 50}ms"><img src="${flagSrc(c.id)}" alt=""><div><b>${c.n}</b><small>${c.c}</small></div></div>`).join('')
    : '';
}

// --- Confettis ---

const fx = $('fx');
const ctx = fx.getContext('2d');
const COLORS = ['#34d399', '#38bdf8', '#fbbf24', '#a78bfa', '#f472b6', '#ffffff'];
let parts = [];
let running = false;
function launch(list) {
  fx.width = innerWidth * devicePixelRatio;
  fx.height = innerHeight * devicePixelRatio;
  parts.push(...list);
  if (!running) { running = true; requestAnimationFrame(tick); }
}
const color = () => COLORS[Math.floor(Math.random() * COLORS.length)];
function confetti(n) {
  launch(Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, g: 0.3,
    rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, size: 7 + Math.random() * 8,
    color: color(), life: 120 + Math.random() * 60,
  })));
}
// Petite gerbe depuis la bonne réponse.
function burst(x, y, n) {
  launch(Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 6;
    return {
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, g: 0.25,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.5, size: 5 + Math.random() * 5,
      color: color(), life: 40 + Math.random() * 30,
    };
  }));
}
function tick() {
  const d = devicePixelRatio;
  ctx.clearRect(0, 0, fx.width, fx.height);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.98; p.rot += p.vr; p.life--;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 25);
    ctx.translate(p.x * d, p.y * d);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect((-p.size * d) / 2, (-p.size * d) / 4, p.size * d, (p.size * d) / 2);
    ctx.restore();
  }
  if (parts.length) requestAnimationFrame(tick);
  else { running = false; ctx.clearRect(0, 0, fx.width, fx.height); }
}

// --- Commandes ---

$('start').onclick = () => start();
$('replay').onclick = () => start();
$('retry-misses').onclick = () => start(quiz.misses);
$('to-setup').onclick = () => { show('setup'); renderSetup(); showRegion(true); };
$('next').onclick = advance;
$('card').onclick = () => { if ($('card').classList.contains('flipped')) advance(); };
$('back').onclick = (e) => {
  if (!$('setup').hidden) return;
  e.preventDefault();
  clearTimeout(nextTimer);
  show('setup');
  renderSetup();
  showRegion(true);
};
// Au clavier : 1 à 4 (ou A à D) pour répondre, Entrée pour continuer.
document.addEventListener('keydown', (e) => {
  if ($('play').hidden) return;
  const i = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
  if (!quiz.answered && i >= 0 && e.key.length === 1) $('answers').children[i]?.click();
  else if (quiz.answered && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); advance(); }
});

renderSetup();
showRegion(true);
