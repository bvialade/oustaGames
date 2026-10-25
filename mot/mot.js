const ROWS = 6;
const COLS = 5;
const START = new Date(2026, 0, 1);
const STORE = 'ousta.mot';

const $ = (id) => document.getElementById(id);
const board = $('board');
const keyboard = $('keyboard');

let data = load();
let mode = 'daily';
let game; // { answer, guesses: [], current: '', done, won, day? }

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
}

function dayNumber() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - START) / 86400000);
}

const total = SOLUTIONS.length;
const fresh = (idx, extra) => ({ ...extra, num: idx + 1, answer: SOLUTIONS[idx], guesses: [], current: '', done: false });

// num : numéro de partie (1 à total) à jouer en partie libre, pour jouer la même qu'un proche.
function newGame(m, num) {
  mode = m;
  $('mode-daily').classList.toggle('active', m === 'daily');
  $('mode-free').classList.toggle('active', m === 'free');
  if (m === 'daily') {
    const day = dayNumber();
    const saved = data.daily;
    game = saved && saved.day === day ? saved : fresh(((day % total) + total) % total, { day });
  } else {
    const saved = data.free;
    if (num) game = saved && saved.num === num && !saved.done ? saved : fresh(num - 1);
    else game = saved && !saved.done ? saved : fresh(Math.floor(Math.random() * total));
  }
  game.num = SOLUTIONS.indexOf(game.answer) + 1;
  $('game-num').textContent = (m === 'daily' ? 'Mot du jour · ' : '') + `Partie n°${game.num}`;
  game.current = '';
  persist();
  render();
  if (game.done) setTimeout(showEnd, 300);
}

function persist() {
  data[mode] = game;
  save();
}

// Couleurs façon Wordle, en gérant correctement les lettres en double.
function score(guess, answer) {
  const res = Array(COLS).fill('bad');
  const left = {};
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === answer[i]) res[i] = 'good';
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < COLS; i++) {
    if (res[i] !== 'good' && left[guess[i]]) { res[i] = 'close'; left[guess[i]]--; }
  }
  return res;
}

function render() {
  board.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    const word = r < game.guesses.length ? game.guesses[r] : r === game.guesses.length ? game.current : '';
    const colors = r < game.guesses.length ? score(word, game.answer) : null;
    for (let c = 0; c < COLS; c++) {
      const t = document.createElement('div');
      t.className = 'tile' + (word[c] ? ' filled' : '') + (colors ? ' ' + colors[c] : '');
      t.textContent = word[c] || '';
      row.appendChild(t);
    }
    board.appendChild(row);
  }
  renderKeyboard();
}

function renderKeyboard() {
  const status = {};
  const rank = { bad: 1, close: 2, good: 3 };
  for (const g of game.guesses) {
    score(g, game.answer).forEach((s, i) => {
      if (!status[g[i]] || rank[s] > rank[status[g[i]]]) status[g[i]] = s;
    });
  }
  const layout = ['AZERTYUIOP', 'QSDFGHJKLM', '⏎WXCVBN⌫'];
  keyboard.innerHTML = '';
  for (const line of layout) {
    const row = document.createElement('div');
    row.className = 'krow';
    for (const k of line) {
      const b = document.createElement('button');
      b.className = 'key' + (k === '⏎' || k === '⌫' ? ' wide' : '') + (status[k] ? ' ' + status[k] : '');
      b.textContent = k === '⏎' ? 'Entrée' : k;
      b.onclick = () => press(k);
      row.appendChild(b);
    }
    keyboard.appendChild(row);
  }
}

function press(k) {
  if (game.done) return;
  if (k === '⌫') game.current = game.current.slice(0, -1);
  else if (k === '⏎') return submit();
  else if (game.current.length < COLS) game.current += k;
  render();
}

function submit() {
  const g = game.current;
  if (g.length < COLS) return reject('Pas assez de lettres');
  if (!VALID.has(g)) return reject('Mot inconnu');
  game.guesses.push(g);
  game.current = '';
  const won = g === game.answer;
  if (won || game.guesses.length === ROWS) {
    game.done = true;
    game.won = won;
    recordStats(won);
  }
  persist();
  render();
  const row = board.children[game.guesses.length - 1];
  [...row.children].forEach((t, i) => { t.style.animationDelay = i * 0.12 + 's'; t.classList.add('reveal'); });
  if (game.done) setTimeout(showEnd, 1100);
}

function reject(msg) {
  toast(msg);
  const row = board.children[game.guesses.length];
  row.classList.remove('shake');
  void row.offsetWidth;
  row.classList.add('shake');
}

function recordStats(won) {
  const s = data.stats = data.stats || {};
  const st = s[mode] = s[mode] || { played: 0, wins: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0] };
  st.played++;
  if (won) {
    st.wins++;
    st.dist[game.guesses.length - 1]++;
    st.streak = mode === 'daily' && st.lastDay !== undefined && st.lastDay !== game.day - 1 ? 1 : st.streak + 1;
  } else {
    st.streak = 0;
  }
  st.best = Math.max(st.best, st.streak);
  if (mode === 'daily') st.lastDay = game.day;
}

// Petite phrase souvenir qui reprend les mots essayés et le mot trouvé.
// {list} : les essais ratés ("A, B et C"), {nor} : "A, ni B", {first}/{middle} : premier essai et les suivants.
const PHRASES = [
  'Premier essai : {first}. Puis {middle}. Et enfin… {win} !',
  'Ni {nor} : ce qu’il me fallait, c’était {win} !',
  'J’ai cherché {list} partout, mais je n’ai trouvé que {win}.',
  'Recette du jour : prenez {list}, mélangez bien, et vous obtenez {win}.',
  'Il était une fois {list}, partis ensemble à la recherche de {win}.',
  'Ma tête disait {list}… mais mon cœur disait {win}.',
  'Caché derrière {list}, {win} attendait patiemment d’être trouvé.',
  'Dans ma valise pour les vacances : {list}, et surtout {win}.',
  'On m’a proposé {list}. J’ai poliment refusé et j’ai choisi {win}.',
  'Au menu ce soir : {list}, avec {win} en dessert.',
];

function phrase() {
  const pretty = (w) => { const a = ACCENTS[w] || w.toLowerCase(); return a[0].toUpperCase() + a.slice(1); };
  const nice = (w) => `<i>${pretty(w)}</i>`;
  const tries = game.guesses.slice(0, -1).map(nice);
  const and = (a) => (a.length > 1 ? a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1] : a[0]);
  const vars = {
    win: `<b>${pretty(game.answer)}</b>`,
    list: and(tries),
    nor: tries.join(', ni '),
    first: tries[0],
    middle: and(tries.slice(1)),
  };
  // Même partie, même phrase : le choix dépend du numéro et des essais.
  const seed = [...game.guesses.join('')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, game.num);
  return PHRASES[seed % PHRASES.length].replace(/\{(\w+)\}/g, (_, k) => vars[k]);
}

function showEnd() {
  const st = (data.stats || {})[mode] || { played: 0, wins: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0] };
  $('end-title').textContent = game.won ? 'Bravo !' : 'Perdu…';
  $('end-answer').innerHTML = `Le mot était <b>${game.answer}</b>`;
  const story = game.won && game.guesses.length >= 3;
  $('end-phrase').hidden = !story;
  if (story) $('end-phrase').innerHTML = phrase();
  $('stats').innerHTML = [
    [st.played, 'Parties'],
    [st.played ? Math.round((100 * st.wins) / st.played) : 0, '% gagnées'],
    [st.streak, 'Série'],
    [st.best, 'Record'],
  ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
  const max = Math.max(1, ...st.dist);
  $('dist').innerHTML = st.dist.map((n, i) =>
    `<div>${i + 1}<i class="${game.won && game.guesses.length === i + 1 ? 'now' : ''}" style="width:${Math.max(8, (92 * n) / max)}%">${n}</i></div>`
  ).join('');
  $('again').textContent = mode === 'free' ? 'Rejouer' : 'Faire une partie libre';
  $('end').showModal();
}

async function share() {
  const lines = game.guesses.map((g) =>
    score(g, game.answer).map((s) => ({ good: '🟩', close: '🟨', bad: '⬛' })[s]).join('')
  );
  const head = `SUTOM n°${game.num}${mode === 'daily' ? ' (mot du jour)' : ''}`;
  const link = location.href.split(/[?#]/)[0] + '?partie=' + game.num;
  const text = `OustaGames · ${head} ${game.won ? game.guesses.length : 'X'}/6\n\n${lines.join('\n')}\n\nJoue la même partie : ${link}`;
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
  toastTimer = setTimeout(() => t.classList.remove('show'), 1500);
}

document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]') || e.metaKey || e.ctrlKey) return;
  if (e.key === 'Enter') press('⏎');
  else if (e.key === 'Backspace') press('⌫');
  else if (/^[a-z]$/i.test(e.key)) press(e.key.toUpperCase());
});

$('mode-daily').onclick = () => newGame('daily');
$('mode-free').onclick = () => newGame('free');
$('help-btn').onclick = () => $('help').showModal();
$('share').onclick = share;
$('close-end').onclick = () => $('end').close();
$('again').onclick = () => { $('end').close(); data.free = null; newGame('free'); };

$('pick-btn').onclick = () => {
  $('pick-input').max = total;
  $('pick-input').value = '';
  $('pick-total').textContent = total;
  $('pick').showModal();
  $('pick-input').focus();
};
$('pick-form').onsubmit = (e) => {
  e.preventDefault();
  const n = parseInt($('pick-input').value, 10);
  if (!(n >= 1 && n <= total)) return toast(`Choisis un numéro entre 1 et ${total}`);
  $('pick').close();
  newGame('free', n);
};
$('pick-cancel').onclick = () => $('pick').close();

if (!data.seenHelp) { data.seenHelp = true; save(); $('help').showModal(); }
// Un lien partagé ?partie=12 ouvre directement cette partie.
const shared = parseInt(new URLSearchParams(location.search).get('partie'), 10);
if (shared >= 1 && shared <= total) {
  history.replaceState(null, '', location.pathname);
  newGame('free', shared);
} else {
  newGame('daily');
}
