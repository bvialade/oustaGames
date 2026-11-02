const STORE = 'ousta.code';
const PAR_PARTIE = 10;
const EXAMEN = 40;
const REUSSITE = 35;
const $ = (id) => document.getElementById(id);

const prefs = Object.assign({ mode: 'entrainement', themes: [], vues: {}, erreurs: {}, records: {}, examens: [] }, load());
let partie; // { mode, questions: [...], index, ok: [bool], reponses: [[i...]] }

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(prefs)); } catch {}
}

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const theme = (id) => THEMES.find((t) => t.id === id);
const themesChoisis = () => (prefs.themes.length ? prefs.themes : THEMES.map((t) => t.id));
const cleRecord = () => prefs.themes.length ? [...prefs.themes].sort().join(',') : 'tout';
const total = () => THEMES.reduce((s, t) => s + (Q[t.id] || []).length, 0);
const avecCles = (id) => (Q[id] || []).map((q, i) => ({ ...q, theme: id, cle: `${id}.${i}` }));
const parCle = (cle) => {
  const [id, i] = cle.split('.');
  const q = Q[id]?.[+i];
  return q ? { ...q, theme: id, cle } : null;
};
const nbErreurs = () => Object.keys(prefs.erreurs).filter(parCle).length;

const MODES = [
  { id: 'entrainement', emoji: '🎯', nom: 'Entraînement', desc: '10 questions, corrigées une par une' },
  { id: 'examen', emoji: '📝', nom: 'Examen blanc', desc: `${EXAMEN} questions, correction à la fin, ${REUSSITE} pour réussir` },
  { id: 'erreurs', emoji: '🔁', nom: 'Mes erreurs', desc: 'Retravaille les questions ratées' },
];

function renderIntro() {
  const err = nbErreurs();
  if (prefs.mode === 'erreurs' && !err) prefs.mode = 'entrainement';
  $('modes').innerHTML = MODES.map((m) => {
    const off = m.id === 'erreurs' && !err;
    const extra = m.id === 'erreurs' ? (err ? ` (${err})` : ' (aucune)') : '';
    return `<button class="mode${m.id === prefs.mode ? ' on' : ''}" data-id="${m.id}"${off ? ' disabled' : ''}>
      <b>${m.emoji}</b><span><strong>${m.nom}${extra}</strong><small>${m.desc}</small></span></button>`;
  }).join('');
  $('modes').querySelectorAll('button').forEach((b) => (b.onclick = () => { prefs.mode = b.dataset.id; save(); renderIntro(); }));

  $('themes-box').hidden = prefs.mode !== 'entrainement';
  $('themes').innerHTML = `<button class="theme all${prefs.themes.length ? '' : ' on'}" data-id="">Tous les thèmes</button>` +
    THEMES.map((t) => `<button class="theme${prefs.themes.includes(t.id) ? ' on' : ''}" data-id="${t.id}">${t.emoji} ${t.nom}</button>`).join('');
  $('themes').querySelectorAll('button').forEach((b) => (b.onclick = () => {
    const id = b.dataset.id;
    if (!id) prefs.themes = [];
    else if (prefs.themes.includes(id)) prefs.themes = prefs.themes.filter((x) => x !== id);
    else prefs.themes = [...prefs.themes, id];
    if (prefs.themes.length === THEMES.length) prefs.themes = [];
    save();
    renderIntro();
  }));

  $('start').textContent = prefs.mode === 'examen' ? "Commencer l'examen" : prefs.mode === 'erreurs' ? 'Revoir mes erreurs' : "C'est parti !";
  let info = '';
  if (prefs.mode === 'entrainement') {
    const rec = prefs.records[cleRecord()];
    if (rec !== undefined) info = `Ton record ici : ${rec} / ${PAR_PARTIE}`;
  } else if (prefs.mode === 'examen' && prefs.examens.length) {
    const ex = prefs.examens;
    const ok = ex.filter((s) => s >= REUSSITE).length;
    info = `Derniers examens : ${ex.slice(-5).join(' · ')} — réussis : ${ok} / ${ex.length}`;
  }
  const vues = Object.keys(prefs.vues).length;
  $('best').innerHTML = (info ? info + '<br>' : '') + `Questions déjà vues : ${Math.min(vues, total())} / ${total()}`;
}

function show(id) {
  for (const s of ['intro', 'play', 'result']) $(s).hidden = s !== id;
  window.scrollTo(0, 0);
}

// Tire `combien` questions réparties entre les thèmes, en évitant celles déjà vues.
function tirer(themes, combien) {
  const parTheme = themes.map((id) => {
    const liste = avecCles(id);
    const neuves = liste.filter((q) => !prefs.vues[q.cle]);
    const besoin = Math.min(liste.length, Math.ceil(combien / themes.length));
    if (neuves.length < besoin) {
      // Thème presque épuisé : on remet ses questions en jeu.
      for (const q of liste) delete prefs.vues[q.cle];
      return shuffle(liste);
    }
    return shuffle(neuves);
  }).filter((l) => l.length);
  const choisies = [];
  shuffle(parTheme);
  while (choisies.length < combien && parTheme.some((l) => l.length)) {
    for (const l of parTheme) if (l.length && choisies.length < combien) choisies.push(l.pop());
  }
  return shuffle(choisies);
}

function preparer(q) {
  const n = q.n || 1;
  const ordre = shuffle(q.c.map((_, i) => i));
  return { ...q, n, choix: ordre.map((i) => q.c[i]), bons: ordre.map((i, pos) => (i < n ? pos : -1)).filter((p) => p >= 0) };
}

function start() {
  const mode = prefs.mode;
  let qs;
  if (mode === 'examen') qs = tirer(THEMES.map((t) => t.id), EXAMEN);
  else if (mode === 'erreurs') qs = shuffle(Object.keys(prefs.erreurs).map(parCle).filter(Boolean)).slice(0, PAR_PARTIE);
  else qs = tirer(themesChoisis(), PAR_PARTIE);
  if (!qs.length) { renderIntro(); return show('intro'); }
  partie = { mode, questions: qs.map(preparer), index: 0, ok: [], reponses: [] };
  ask();
  show('play');
}

let selection = [];

function ask() {
  const q = partie.questions[partie.index];
  const t = theme(q.theme);
  const exam = partie.mode === 'examen';
  selection = [];
  $('progress').className = 'progress' + (exam ? ' long' : '');
  $('progress').innerHTML = partie.questions.map((_, i) =>
    `<i class="${i < partie.index ? (exam ? 'done' : partie.ok[i] ? 'ok' : 'ko') : i === partie.index ? 'now' : ''}"></i>`).join('');
  $('question').innerHTML = `
    <div class="glass qcard">
      <div class="qnum"><span>Question ${partie.index + 1} / ${partie.questions.length}</span><span>${t.emoji} ${t.nom}</span></div>
      ${q.p ? `<div class="signwrap">${PANNEAUX(q.p)}</div>` : ''}
      <h2>${q.q}</h2>
      ${q.n > 1 ? `<div class="multi">☑️ ${q.n} bonnes réponses à cocher</div>` : ''}
      <div class="choices">${q.choix.map((c, i) => `<button class="choice" data-i="${i}"><em>${'ABCD'[i]}</em><span>${c}</span></button>`).join('')}</div>
      <div id="after">${q.n > 1 || exam ? '<button class="btn next" id="valider" disabled>Valider</button>' : ''}</div>
    </div>`;
  const buttons = [...$('question').querySelectorAll('.choice')];
  buttons.forEach((b) => (b.onclick = () => {
    const i = +b.dataset.i;
    if (q.n === 1 && !exam) return answer([i]);
    if (q.n === 1) selection = [i];
    else selection = selection.includes(i) ? selection.filter((x) => x !== i) : [...selection, i];
    buttons.forEach((bb, j) => bb.classList.toggle('sel', selection.includes(j)));
    $('valider').disabled = !selection.length;
  }));
  const v = $('valider');
  if (v) v.onclick = () => answer(selection);
}

function answer(choisis) {
  const q = partie.questions[partie.index];
  const right = choisis.length === q.bons.length && choisis.every((i) => q.bons.includes(i));
  partie.ok.push(right);
  partie.reponses.push(choisis);
  prefs.vues[q.cle] = 1;
  if (right) delete prefs.erreurs[q.cle];
  else prefs.erreurs[q.cle] = 1;
  save();
  const last = partie.index === partie.questions.length - 1;
  const suivant = () => {
    partie.index++;
    if (last) finish();
    else ask();
  };
  if (partie.mode === 'examen') {
    navigator.vibrate?.(20);
    return suivant();
  }
  const buttons = [...$('question').querySelectorAll('.choice')];
  buttons.forEach((b, i) => {
    b.disabled = true;
    b.classList.remove('sel');
    if (q.bons.includes(i)) b.classList.add(choisis.includes(i) ? 'right' : 'missed');
    else if (choisis.includes(i)) b.classList.add('wrong');
  });
  navigator.vibrate?.(right ? 30 : [60, 40, 60]);
  $('after').innerHTML = `
    <div class="explain"><b>${right ? '✅ Bonne réponse !' : '❌ Raté !'}</b>${q.e}</div>
    <button class="btn next" id="next">${last ? 'Voir mon score' : 'Question suivante'}</button>`;
  $('next').onclick = suivant;
  $('after').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function finish() {
  const n = partie.questions.length;
  const s = partie.ok.filter(Boolean).length;
  const exam = partie.mode === 'examen';
  let sub = '';
  if (exam) {
    prefs.examens = [...prefs.examens, s].slice(-50);
    const reussi = s >= REUSSITE;
    $('result-text').textContent = reussi ? 'Examen réussi, bravo ! 🎉' : s >= 30 ? 'Presque ! Encore un petit effort' : 'Pas encore, mais ça va venir 💪';
    sub = reussi ? `Réussi (il fallait ${REUSSITE} bonnes réponses)` : `Il manque ${REUSSITE - s} bonne${REUSSITE - s > 1 ? 's' : ''} réponse${REUSSITE - s > 1 ? 's' : ''} pour réussir`;
  } else {
    if (partie.mode === 'entrainement') {
      const k = cleRecord();
      const record = prefs.records[k] === undefined || s > prefs.records[k];
      if (record) prefs.records[k] = s;
      if (record && s > 0) sub = 'Nouveau record !';
    } else {
      const reste = nbErreurs();
      sub = reste ? `Encore ${reste} question${reste > 1 ? 's' : ''} dans tes erreurs` : 'Plus aucune erreur à revoir 👏';
    }
    $('result-text').textContent = s === n ? 'Sans faute ! 🏁' : s >= 8 ? 'Très bien, tu tiens la route !' : s >= 5 ? 'Pas mal, continue !' : 'On révise et on recommence 😉';
  }
  save();
  $('result-score').textContent = `${s} / ${n}`;
  $('result-sub').textContent = sub;

  // Bilan par thème pour l'examen blanc.
  if (exam) {
    const bilan = THEMES.map((t) => {
      const idx = partie.questions.map((q, i) => (q.theme === t.id ? i : -1)).filter((i) => i >= 0);
      const ok = idx.filter((i) => partie.ok[i]).length;
      return idx.length ? `<div class="bar"><span>${t.emoji} ${t.nom}</span><b class="${ok === idx.length ? 'full' : ok / idx.length < 0.75 ? 'low' : ''}">${ok}/${idx.length}</b></div>` : '';
    }).join('');
    $('bilan').innerHTML = `<div class="label">Par thème</div>${bilan}`;
  } else $('bilan').innerHTML = '';

  const ordre = partie.questions.map((_, i) => i).sort((a, b) => partie.ok[a] - partie.ok[b]);
  $('recap').innerHTML = `<div class="label">Correction</div>` + ordre.map((i) => {
    const q = partie.questions[i];
    const bonnes = q.c.slice(0, q.n).join(' · ');
    return `<details${partie.ok[i] ? '' : ' open'}><summary>${partie.ok[i] ? '✅' : '❌'} ${q.p ? PANNEAUX(q.p).replace('class="sign"', 'class="sign mini"') : ''}${q.q}</summary>
      <p><b>${bonnes}</b></p><p class="why">${q.e}</p></details>`;
  }).join('');
  $('again').textContent = exam ? 'Nouvel examen blanc' : 'Rejouer';
  show('result');
  if (exam ? s >= REUSSITE : s >= 8) confettiLite();
}

function confettiLite() {
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:30;overflow:hidden';
  const colors = ['#facc15', '#22c55e', '#ef4444', '#3b82f6', '#f8fafc'];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('i');
    p.style.cssText = `position:absolute;left:${Math.random() * 100}%;top:-10px;width:8px;height:12px;background:${colors[i % 5]};
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
  const s = partie.ok.filter(Boolean).length;
  const n = partie.questions.length;
  const exam = partie.mode === 'examen';
  const titre = exam ? `Examen blanc : ${s}/${n} ${s >= REUSSITE ? '✅ réussi' : '❌'}` : `${s}/${n} ${partie.ok.map((ok) => (ok ? '🟢' : '🔴')).join('')}`;
  const text = `OustaGames · Code de la route 🚦\n${titre}\n${location.href.split(/[?#]/)[0]}`;
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
$('again').onclick = start;
$('share').onclick = share;
$('home').onclick = () => { renderIntro(); show('intro'); };
$('quit').onclick = () => { if (confirm('Arrêter cette partie ?')) { renderIntro(); show('intro'); } };
renderIntro();
