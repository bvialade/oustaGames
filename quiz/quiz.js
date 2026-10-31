const STORE = 'ousta.quiz';
const $ = (id) => document.getElementById(id);

let saved = load();
let dates = [];
let quiz; // { date, questions }
let state; // { index, answers: [indexChoisi] }

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}

const longDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const score = (date) => (saved[date] ? saved[date].filter((a, i) => a === saved[date].key[i]).length : null);

function show(id) {
  for (const s of ['choose', 'intro', 'archive', 'play', 'result', 'empty']) $(s).hidden = !id.includes(s);
  window.scrollTo(0, 0);
}

async function init() {
  try {
    dates = await (await fetch('actu/index.json', { cache: 'no-cache' })).json();
  } catch {
    dates = [];
  }
  dates.sort().reverse();
  route();
}

// Accueil du quiz : choix Actu ou Droit. L'actu s'ouvre sur #actu, le droit vit dans ../droit/.
async function route() {
  const actu = location.hash === '#actu';
  $('back').href = actu ? '#' : '../';
  $('title').textContent = actu ? "Quiz de l'actu" : 'Quiz';
  if (!actu) {
    const s = dates.length ? score(dates[0]) : null;
    $('actu-tag').textContent = !dates.length ? '' : s !== null ? `Aujourd'hui : ${s}/10` : 'Quiz du jour à jouer';
    return show(['choose']);
  }
  if (!dates.length) return show(['empty']);
  await openQuiz(dates[0]);
}

async function openQuiz(date) {
  quiz = await (await fetch(`actu/${date}.json`)).json();
  $('intro-day').textContent = 'Quiz du ' + longDate(date);
  const s = score(date);
  $('intro-done').hidden = s === null;
  $('intro-done').textContent = s !== null ? `Déjà joué : ${s}/${quiz.questions.length}` : '';
  $('start').textContent = s !== null ? 'Revoir les réponses' : "C'est parti";
  $('archive-list').innerHTML = dates.filter((d) => d !== date).slice(0, 14).map((d) => {
    const sc = score(d);
    return `<button data-date="${d}">${longDate(d)}<span>${sc !== null ? sc + '/10' : 'À jouer'}</span></button>`;
  }).join('');
  $('archive-list').querySelectorAll('button').forEach((b) => (b.onclick = () => openQuiz(b.dataset.date)));
  show(dates.length > 1 ? ['intro', 'archive'] : ['intro']);
}

function start() {
  if (saved[quiz.date]) return finish(true);
  state = { index: 0, answers: [] };
  ask();
  show(['play']);
}

function ask() {
  const q = quiz.questions[state.index];
  const n = quiz.questions.length;
  $('progress').innerHTML = quiz.questions.map((qq, i) =>
    `<i class="${i < state.index ? (state.answers[i] === quiz.questions[i].reponse ? 'ok' : 'ko') : i === state.index ? 'now' : ''}"></i>`).join('');
  $('question').innerHTML = `
    <div class="glass qcard">
      <div class="qnum">Question ${state.index + 1} / ${n}</div>
      <h2>${q.q}</h2>
      <div class="choices">${q.choix.map((c, i) => `<button class="choice" data-i="${i}">${c}</button>`).join('')}</div>
      <div id="after"></div>
    </div>`;
  $('question').querySelectorAll('.choice').forEach((b) => (b.onclick = () => answer(+b.dataset.i)));
}

function answer(i) {
  const q = quiz.questions[state.index];
  const buttons = [...$('question').querySelectorAll('.choice')];
  buttons.forEach((b) => (b.disabled = true));
  const right = i === q.reponse;
  buttons[q.reponse].classList.add('right');
  if (!right) buttons[i].classList.add('wrong');
  navigator.vibrate?.(right ? 30 : [60, 40, 60]);
  state.answers.push(i);
  const last = state.index === quiz.questions.length - 1;
  $('after').innerHTML = `
    <div class="explain"><b>${right ? '✅ Bonne réponse !' : '❌ Raté !'}</b>${q.explication}<br>
      <a class="source" href="${q.source.url}" target="_blank" rel="noopener">En savoir plus · ${q.source.nom} ↗</a>
    </div>
    <button class="btn next" id="next">${last ? 'Voir mon score' : 'Question suivante'}</button>`;
  $('next').onclick = () => {
    state.index++;
    if (last) {
      saved[quiz.date] = Object.assign([...state.answers], { key: quiz.questions.map((qq) => qq.reponse) });
      persist();
      finish(false);
    } else ask();
  };
  $('after').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Les tableaux perdent leurs propriétés en JSON : on stocke { a: réponses, k: bonnes réponses }.
function persist() {
  const out = {};
  for (const [d, v] of Object.entries(saved)) out[d] = { a: [...v], k: v.key };
  try { localStorage.setItem(STORE, JSON.stringify(out)); } catch {}
}
function restore() {
  const out = {};
  for (const [d, v] of Object.entries(saved)) if (v && v.a) out[d] = Object.assign([...v.a], { key: v.k });
  saved = out;
}

function finish(replay) {
  const answers = saved[quiz.date];
  const n = quiz.questions.length;
  const s = answers.filter((a, i) => a === quiz.questions[i].reponse).length;
  $('result-text').textContent = s === n ? 'Sans faute, tu suis l’actu de près !' : s >= 7 ? 'Bien informé !' : s >= 4 ? 'Pas mal !' : 'Il est temps de lire les journaux 😉';
  $('result-score').textContent = `${s} / ${n}`;
  $('recap').innerHTML = quiz.questions.map((q, i) =>
    `<div>${answers[i] === q.reponse ? '✅' : '❌'} ${q.q}<br><b>${q.choix[q.reponse]}</b> · <a href="${q.source.url}" target="_blank" rel="noopener">Source ↗</a></div>`).join('');
  show(['result']);
  if (!replay && s >= 7) confettiLite();
}

function confettiLite() {
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:30;overflow:hidden';
  const colors = ['#8b5cf6', '#ec4899', '#facc15', '#22c55e', '#38bdf8'];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('i');
    const x = Math.random() * 100;
    p.style.cssText = `position:absolute;left:${x}%;top:-10px;width:8px;height:12px;background:${colors[i % 5]};
      transform:rotate(${Math.random() * 360}deg);animation:fall ${1.5 + Math.random() * 1.5}s ${Math.random() * .5}s ease-in forwards`;
    c.appendChild(p);
  }
  const st = document.createElement('style');
  st.textContent = '@keyframes fall{to{transform:translateY(105vh) rotate(720deg)}}';
  c.appendChild(st);
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 3500);
}

async function share() {
  const answers = saved[quiz.date];
  const marks = answers.map((a, i) => (a === quiz.questions[i].reponse ? '🟢' : '🔴')).join('');
  const s = answers.filter((a, i) => a === quiz.questions[i].reponse).length;
  const text = `OustaGames · Quiz de l'actu du ${longDate(quiz.date)}\n${s}/${quiz.questions.length} ${marks}\n${location.href.split(/[?#]/)[0]}#actu`;
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

$('start').onclick = start;
$('share').onclick = share;
$('home').onclick = () => openQuiz(quiz.date);
window.addEventListener('hashchange', route);
restore();
init();
