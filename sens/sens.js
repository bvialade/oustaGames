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
  if (word === secret.word) { game.done = true; game.won = true; }
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
