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

// Couleur d'une température : bleu glacial -> rouge brûlant.
const hue = (t) => 210 - (Math.max(0, Math.min(t, 60)) / 60) * 210;
const gaugePos = (t) => Math.max(0, Math.min(100, ((t + 10) / 80) * 100));

function itemHtml(word, n, fresh) {
  const i = info(word);
  const bar = i.rank !== undefined
    ? `<div class="bar"><i data-w="${((TOP - i.rank) / TOP) * 100}"></i></div><span class="pm">${TOP - i.rank}‰</span>` : '';
  return `<div class="item${fresh ? ' fresh' : ''}" style="--h:${hue(i.temp)}"><span class="n">${n}</span><span class="w">${word}</span><span class="t">${i.temp.toFixed(2)}°</span><span>${emoji(i)}</span>${bar}</div>`;
}

let lastRendered = 0;

function render(animate = false) {
  $('loading').hidden = true;
  const g = game.guesses;
  const last = g[g.length - 1];
  const temps = g.map((w) => info(w).temp);
  document.documentElement.style.setProperty('--hue', g.length ? hue(Math.max(...temps)) : 210);

  // Thermomètre
  const hero = $('hero');
  hero.classList.toggle('empty', !last);
  if (last) {
    const i = info(last);
    hero.style.setProperty('--h', hue(i.temp));
    $('hero-label').textContent = `Essai n°${g.length}`;
    $('hero-word').textContent = last;
    $('hero-temp').hidden = false;
    $('hero-emoji').textContent = emoji(i);
    $('hero-rank').textContent = i.rank === 0 ? 'Trouvé !' : i.rank !== undefined ? `${TOP - i.rank}‰ · dans les ${TOP} mots les plus proches` : i.temp < 0 ? 'Glacial…' : i.temp < 20 ? 'Froid' : 'Tiède, continue !';
    $('gauge-dot').style.left = gaugePos(i.temp) + '%';
    countUp($('hero-temp'), i.temp, animate === true);
    if (animate === true) effects(i, temps);
  }

  // Liste triée du plus chaud au plus froid
  $('list-title').hidden = g.length < 2;
  const sorted = g.map((w, k) => [w, k + 1]).sort((a, b) => info(b[0]).temp - info(a[0]).temp);
  $('list').innerHTML = g.length < 2 ? '' : sorted.map(([w, n]) => itemHtml(w, n, animate === true && w === last)).join('');
  requestAnimationFrame(() => document.querySelectorAll('.bar i').forEach((b) => (b.style.width = b.dataset.w + '%')));

  // Énigmes
  const list = secret.hints.slice(0, game.hints);
  $('hints-list').innerHTML = list.map((h, k) =>
    `<li class="${k === lastRendered && animate === 'hint' ? 'new' : ''}" style="--d:${k}"><span>${k + 1}</span><div>${h}</div></li>`).join('');
  $('dots').innerHTML = Array.from({ length: 10 }, (_, k) => `<i class="${k < game.hints ? 'on' : ''}"></i>`).join('');
  const n = game.letters || 0;
  $('letters-show').innerHTML = n
    ? 'Commence par ' + [...secret.word.slice(0, n)].map((c) => `<b>${c}</b>`).join('') + '…'
    : 'Lettres révélées : aucune';
  $('letter-btn').disabled = n >= 3 || game.done;
  $('letter-btn').textContent = n === 0 ? 'Une lettre' : n < 3 ? `Lettre suivante (${n}/3)` : 'Max. 3 lettres';
  $('hints-empty').hidden = game.hints > 0;
  $('hints-title').textContent = `Énigmes ${game.hints}/10`;
  $('hint-btn').disabled = game.hints >= 10 || game.done;
  $('hint-btn').textContent = game.hints === 0 ? 'Une énigme' : 'Énigme suivante';
  $('guess').disabled = game.done;
  $('give-up').hidden = game.done;
}

function countUp(el, target, animate) {
  const show = (v) => (el.innerHTML = `${v.toFixed(2)}<small>°C</small>`);
  if (!animate) return show(target);
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 700);
    show(target * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Effets selon la chaleur du mot : frisson quand c'est froid, flash et flammes quand c'est chaud.
function effects(i, temps) {
  const hero = $('hero');
  hero.classList.remove('cold', 'hot');
  void hero.offsetWidth;
  const best = temps.length < 2 || i.temp > Math.max(...temps.slice(0, -1));
  if (i.rank === 0) return;
  if (i.temp < 0) { hero.classList.add('cold'); navigator.vibrate?.(40); return; }
  if (i.rank !== undefined) {
    hero.classList.add('hot');
    if (i.rank <= 100) {
      const f = document.createElement('div');
      f.className = 'flash';
      f.style.setProperty('--h', hue(i.temp));
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 800);
      burst(i.rank <= 10 ? ['🔥', '😱', '✨'] : ['🔥', '✨'], i.rank <= 10 ? 26 : 12);
      navigator.vibrate?.([30, 40, 30]);
    }
  }
  if (best && temps.length > 1) toast('Nouveau record de chaleur !');
}

// Petit moteur de particules sur un canvas plein écran (emojis ou confettis).
const fx = $('fx');
const ctx = fx.getContext('2d');
let parts = [];
let running = false;

function launch(list) {
  fx.width = innerWidth * devicePixelRatio;
  fx.height = innerHeight * devicePixelRatio;
  parts.push(...list);
  if (!running) { running = true; requestAnimationFrame(tick); }
}

function tick() {
  ctx.clearRect(0, 0, fx.width, fx.height);
  const d = devicePixelRatio;
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.vr; p.life--;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.translate(p.x * d, p.y * d);
    ctx.rotate(p.rot);
    if (p.emoji) { ctx.font = `${p.size * d}px serif`; ctx.fillText(p.emoji, 0, 0); }
    else { ctx.fillStyle = p.color; ctx.fillRect(-p.size * d / 2, -p.size * d / 4, p.size * d, p.size * d / 2); }
    ctx.restore();
  }
  if (parts.length) requestAnimationFrame(tick);
  else { running = false; ctx.clearRect(0, 0, fx.width, fx.height); }
}

function burst(emojis, n) {
  const r = $('hero').getBoundingClientRect();
  launch(Array.from({ length: n }, () => ({
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    x: r.left + r.width / 2, y: r.top + r.height / 2,
    vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 2, g: 0.25,
    rot: 0, vr: (Math.random() - 0.5) * 0.2, size: 14 + Math.random() * 12, life: 70 + Math.random() * 30,
  })));
}

function confetti() {
  const colors = ['#facc15', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#22d3ee', '#4ade80'];
  launch(Array.from({ length: 180 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 4, g: 0.3,
    rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, size: 8 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)], life: 120 + Math.random() * 60,
  })));
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
  if (word === secret.word) { game.done = true; game.won = true; recordEnd(); }
  persist();
  render(true);
  if (game.won) {
    confetti();
    navigator.vibrate?.([50, 50, 50, 50, 120]);
    setTimeout(showEnd, 1200);
  }
}

function revealHint() {
  if (game.hints >= 10 || game.done) return;
  lastRendered = game.hints;
  game.hints++;
  persist();
  render('hint');
}

function revealLetter() {
  if ((game.letters || 0) >= 3 || game.done) return;
  game.letters = (game.letters || 0) + 1;
  lastRendered = -1;
  persist();
  render('hint');
}

function giveUp() {
  if (!confirm('Abandonner et afficher le mot secret ?')) return;
  game.done = true;
  game.gaveUp = true;
  recordEnd();
  persist();
  render();
  showEnd();
}

function helps() {
  const h = game.hints;
  const l = game.letters || 0;
  if (!h && !l) return 'sans aucune aide';
  const parts = [];
  if (h) parts.push(`${h} énigme${h > 1 ? 's' : ''}`);
  if (l) parts.push(`${l} lettre${l > 1 ? 's' : ''}`);
  return 'avec ' + parts.join(' et ');
}

function showEnd() {
  const n = game.guesses.length;
  $('end-title').textContent = game.won ? 'Bravo !' : 'Le mot était…';
  $('end-word').textContent = secret.word;
  $('end-text').textContent = game.won
    ? `Trouvé en ${n} essai${n > 1 ? 's' : ''}, ${helps()}.`
    : `Tu feras mieux la prochaine fois !`;
  $('share').hidden = !game.won;
  $('again').textContent = mode === 'free' ? 'Rejouer' : 'Faire une partie libre';
  $('end').showModal();
}

// ---------- Statistiques ----------

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function recordEnd() {
  const all = (data.stats = data.stats || {});
  const st = (all[mode] = all[mode] || { played: 0, wins: 0, streak: 0, best: 0 });
  st.played++;
  if (game.won) {
    st.wins++;
    st.streak = mode === 'daily' && st.lastDay !== undefined && st.lastDay !== game.day - 1 ? 1 : st.streak + 1;
  } else st.streak = 0;
  st.best = Math.max(st.best, st.streak);
  if (mode === 'daily') st.lastDay = game.day;
  const h = (data.hist = data.hist || []);
  h.push({ m: mode, d: isoDate(new Date()), w: secret.word, n: game.guesses.length, won: !!game.won, h: game.hints || 0, l: game.letters || 0 });
  if (h.length > 500) h.splice(0, h.length - 500);
}

const TRY_BUCKETS = [[1, 10], [11, 25], [26, 50], [51, 100], [101, Infinity]];
const sensColor = (x) => (!x.won ? 'orange' : x.n <= 25 ? 'green' : x.n <= 100 ? 'blue' : 'yellow');
const fmt1 = (x) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

function statsHtml(m) {
  const st = (data.stats || {})[m];
  const hist = (data.hist || []).filter((x) => x.m === m);
  if (!st || !st.played) return Stats.empty(m === 'daily' ? 'Termine un mot du jour pour voir tes statistiques ici. 🔥' : 'Termine une partie libre pour voir tes statistiques ici. 🔥');
  const won = hist.filter((x) => x.won);
  const avg = won.length ? won.reduce((t, x) => t + x.n, 0) / won.length : 0;
  const clean = won.filter((x) => !x.h && !x.l).length;
  const tiles = Stats.tiles([
    { v: st.played, l: st.played > 1 ? 'parties jouées' : 'partie jouée', c: 'orange' },
    { v: Stats.pct(st.wins, st.played) + ' %', l: 'de mots trouvés', c: 'green' },
    { v: won.length ? Math.round(avg) : '–', l: 'essais en moyenne', c: 'yellow' },
    { v: '🔥 ' + st.streak, l: m === 'daily' ? 'jours d’affilée' : 'victoires d’affilée', c: 'blue' },
    { v: st.best, l: 'meilleure série', c: 'lilac' },
    { v: clean, l: 'trouvés sans aide', c: 'pink' },
  ]);
  const rows = TRY_BUCKETS.map(([a, b]) => {
    const v = won.filter((x) => x.n >= a && x.n <= b).length;
    return { label: b === Infinity ? `${a}+` : `${a}–${b}`, value: v, text: `${v} <small>· ${Stats.pct(v, hist.length)} %</small>`, c: 'blue' };
  });
  const lost = hist.length - won.length;
  rows.push({ label: 'Abandon', value: lost, text: `${lost} <small>· ${Stats.pct(lost, hist.length)} %</small>`, c: 'orange' });
  const dist = Stats.card('En combien d’essais', Stats.bars(rows));
  let cal = '';
  if (m === 'daily' && hist.length) {
    const days = {};
    for (const x of hist) days[x.d] = { c: sensColor(x), text: x.won ? (x.n > 99 ? '99+' : x.n) : '✗' };
    const today = new Date();
    const first = hist.map((x) => x.d).sort()[0];
    const monthStart = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
    cal = Stats.card('Calendrier du mot du jour', Stats.cal(days, first < monthStart ? first : monthStart, isoDate(today))
      + Stats.legend([['green', '25 essais ou moins'], ['blue', '26 à 100'], ['yellow', 'plus de 100'], ['orange', 'abandon']]),
    'Chaque case indique en combien d’essais tu as trouvé le mot ce jour-là.');
  }
  const recent = hist.slice(-10).reverse();
  const aides = (x) => [x.h && `${x.h} énigme${x.h > 1 ? 's' : ''}`, x.l && `${x.l} lettre${x.l > 1 ? 's' : ''}`].filter(Boolean).join(' · ') || 'sans aide';
  const list = recent.length ? Stats.card('Dernières parties', Stats.list(recent.map((x) => ({
    left: x.w, sub: new Date(x.d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + aides(x),
    right: x.won ? `${x.n} essai${x.n > 1 ? 's' : ''}` : 'Abandon', c: sensColor(x),
  })))) : '';
  return tiles + dist + cal + list;
}

function openStats() {
  Stats.open({
    title: '📊 Mot chaud, mot froid',
    tabs: [{ id: 'daily', label: 'Mot du jour' }, { id: 'free', label: 'Parties libres' }],
    tab: mode, render: statsHtml,
  });
}
$('stats-btn').onclick = openStats;
$('end-stats').onclick = () => { $('end').close(); openStats(); };

async function share() {
  const n = game.guesses.length;
  const head = mode === 'daily' ? `Mot chaud, mot froid n°${game.day + 1}` : 'Mot chaud, mot froid';
  const text = `OustaGames · ${head}\nTrouvé en ${n} essai${n > 1 ? 's' : ''} 🥳 ${helps()} 🧩\n${location.href.split('#')[0]}`;
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
$('letter-btn').onclick = revealLetter;
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
