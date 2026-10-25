const STORE = 'ousta.geo';
const $ = (id) => document.getElementById(id);

const MODES = {
  flag: { label: 'Drapeaux', hint: 'À quel pays est ce drapeau ?' },
  capital: { label: 'Capitales', hint: 'Quelle est la capitale de ce pays ?' },
  country: { label: 'Capitale → pays', hint: 'De quel pays est-ce la capitale ?' },
};
const REGIONS = {
  monde: 'Monde entier', europe: 'Europe', afrique: 'Afrique',
  ameriques: 'Amériques', asie: 'Asie', oceanie: 'Océanie',
};
const LENGTHS = [10, 20, 0]; // 0 = tous les pays de la zone

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

function chips(container, entries, current, onPick) {
  container.innerHTML = '';
  for (const [value, label, sub] of entries) {
    const b = document.createElement('button');
    b.className = 'chip' + (value === current ? ' active' : '');
    b.innerHTML = label + (sub ? `<small>${sub}</small>` : '');
    b.onclick = () => onPick(value);
    container.appendChild(b);
  }
}

function renderSetup() {
  chips($('modes'), Object.entries(MODES).map(([k, m]) => [k, m.label, m.hint]), prefs.mode, (v) => { prefs.mode = v; save(); renderSetup(); });
  chips($('regions'), Object.entries(REGIONS).map(([k, l]) => [k, l, pool(k).length + ' pays']), prefs.region, (v) => { prefs.region = v; save(); renderSetup(); });
  chips($('lengths'), LENGTHS.map((n) => [n, n ? n + ' questions' : 'Tous les pays']), prefs.length, (v) => { prefs.length = v; save(); renderSetup(); });
}

function show(screen) {
  for (const id of ['setup', 'play', 'result']) $(id).hidden = id !== screen;
  $('back').href = screen === 'setup' ? '../' : '#';
  window.scrollTo(0, 0);
}

function start() {
  const countries = pool(prefs.region);
  const list = shuffle(countries);
  quiz = {
    mode: prefs.mode,
    key: `${prefs.mode}-${prefs.region}-${prefs.length}`,
    questions: prefs.length ? list.slice(0, prefs.length) : list,
    pool: countries,
    index: 0,
    score: 0,
    misses: [],
  };
  show('play');
  ask();
}

// Les mauvaises réponses viennent de préférence de la même zone, pour corser un peu.
function options(target) {
  const near = shuffle(COUNTRIES.filter((c) => c !== target && c.r === target.r));
  const far = shuffle(COUNTRIES.filter((c) => c !== target && c.r !== target.r));
  return shuffle([target, ...[...near, ...far].slice(0, 3)]);
}

function ask() {
  const q = quiz.questions[quiz.index];
  const total = quiz.questions.length;
  $('count').textContent = `Question ${quiz.index + 1} / ${total}`;
  $('score').textContent = `${quiz.score} point${quiz.score > 1 ? 's' : ''}`;
  $('bar-fill').style.width = (100 * quiz.index) / total + '%';

  const m = quiz.mode;
  $('question').innerHTML =
    m === 'flag' ? `<img src="flags/${q.id}.svg" alt="Drapeau à deviner"><p>${MODES.flag.hint}</p>`
    : m === 'capital' ? `<h2>${q.n}</h2><p>${MODES.capital.hint}</p>`
    : `<h2>${q.c}</h2><p>${MODES.country.hint}</p>`;

  const answers = $('answers');
  answers.innerHTML = '';
  for (const opt of options(q)) {
    const b = document.createElement('button');
    b.className = 'chip answer';
    b.textContent = m === 'capital' ? opt.c : opt.n;
    b.onclick = () => pick(b, opt === q, q);
    b.dataset.right = opt === q ? '1' : '';
    answers.appendChild(b);
  }
  // Précharge le drapeau suivant pour qu'il s'affiche tout de suite.
  const next = quiz.questions[quiz.index + 1];
  if (m === 'flag' && next) new Image().src = `flags/${next.id}.svg`;
}

function pick(button, right, q) {
  const buttons = [...$('answers').children];
  buttons.forEach((b) => (b.disabled = true));
  if (right) {
    quiz.score++;
    button.classList.add('right');
    navigator.vibrate?.(30);
  } else {
    button.classList.add('wrong');
    buttons.find((b) => b.dataset.right).classList.add('right');
    quiz.misses.push(q);
    navigator.vibrate?.([60, 40, 60]);
  }
  setTimeout(() => {
    quiz.index++;
    if (quiz.index < quiz.questions.length) ask();
    else finish();
  }, right ? 700 : 1500);
}

function finish() {
  const total = quiz.questions.length;
  const pct = Math.round((100 * quiz.score) / total);
  const previous = prefs.best[quiz.key];
  const record = previous === undefined || pct > previous;
  if (record) { prefs.best[quiz.key] = pct; save(); }
  $('result-text').textContent = pct === 100 ? 'Sans faute !' : pct >= 70 ? 'Très bien !' : pct >= 40 ? 'Pas mal !' : 'On s’entraîne encore ?';
  $('result-score').textContent = `${quiz.score} / ${total}`;
  $('result-best').textContent = record && previous !== undefined ? 'Nouveau record !' : `Record sur ce jeu : ${prefs.best[quiz.key]} %`;
  $('recap').innerHTML = quiz.misses.length
    ? '<div class="section-title">À revoir</div>' + quiz.misses.map((c) => `<div>${c.n} : ${c.c}</div>`).join('')
    : '';
  show('result');
}

$('start').onclick = start;
$('replay').onclick = start;
$('to-setup').onclick = () => show('setup');
$('back').onclick = (e) => {
  if (!$('setup').hidden) return;
  e.preventDefault();
  show('setup');
};

renderSetup();
