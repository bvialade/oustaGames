const STORE = 'ousta.droit';
const PAR_PARTIE = 10;
const $ = (id) => document.getElementById(id);

const prefs = Object.assign({ niveau: 1, themes: [], vues: {}, records: {} }, load());
let partie; // { questions: [{ ...q, theme, choix, bonne }], index, ok: [bool] }

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
const themesChoisis = () => (prefs.themes.length ? prefs.themes : THEMES.map((t) => t.id));
const niveau = () => NIVEAUX.find((n) => n.n === prefs.niveau);
const cleRecord = () => prefs.niveau + ':' + (prefs.themes.length ? [...prefs.themes].sort().join(',') : 'tout');

function renderIntro() {
  $('levels').innerHTML = NIVEAUX.map((n) =>
    `<button class="level bento-tile${n.n === prefs.niveau ? ' on' : ''}" style="${['--bgc:#0f9d6b', '--bgc:#2154d6', '--bgc:#ff5a36'][n.n - 1] || ''}" data-n="${n.n}"><b>${n.emoji}</b><span>${n.nom}</span><small>${n.desc}</small></button>`).join('');
  $('levels').querySelectorAll('button').forEach((b) => (b.onclick = () => { prefs.niveau = +b.dataset.n; save(); renderIntro(); }));

  $('themes').innerHTML = `<button class="theme all${prefs.themes.length ? '' : ' on'}" data-id="">Toutes</button>` +
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

  const rec = prefs.records[cleRecord()];
  $('best').textContent = rec !== undefined ? `Ton record ici : ${rec} / ${PAR_PARTIE}` : '';
}

function show(id) {
  for (const s of ['intro', 'play', 'result']) $(s).hidden = s !== id;
  window.scrollTo(0, 0);
}

// Tire 10 questions en évitant celles déjà vues, et répartit entre les matières choisies.
function tirer() {
  const n = prefs.niveau;
  const parTheme = themesChoisis().map((id) => {
    const liste = (Q[id]?.[n] || []).map((q, i) => ({ ...q, theme: id, cle: `${id}.${n}.${i}` }));
    let neuves = liste.filter((q) => !prefs.vues[q.cle]);
    if (neuves.length < Math.min(liste.length, PAR_PARTIE)) {
      // Matière presque épuisée : on remet ses questions en jeu.
      for (const q of liste) delete prefs.vues[q.cle];
      neuves = liste;
    }
    return shuffle(neuves);
  }).filter((l) => l.length);
  const choisies = [];
  shuffle(parTheme);
  while (choisies.length < PAR_PARTIE && parTheme.some((l) => l.length)) {
    for (const l of parTheme) if (l.length && choisies.length < PAR_PARTIE) choisies.push(l.pop());
  }
  return shuffle(choisies).map((q) => {
    const ordre = shuffle([0, 1, 2, 3].slice(0, q.c.length));
    return { ...q, choix: ordre.map((i) => q.c[i]), bonne: ordre.indexOf(0) };
  });
}

function start() {
  partie = { questions: tirer(), index: 0, ok: [] };
  ask();
  show('play');
}

function ask() {
  const q = partie.questions[partie.index];
  const t = THEMES.find((x) => x.id === q.theme);
  $('progress').innerHTML = partie.questions.map((qq, i) =>
    `<i class="${i < partie.index ? (partie.ok[i] ? 'ok' : 'ko') : i === partie.index ? 'now' : ''}"></i>`).join('');
  $('question').innerHTML = `
    <div class="glass qcard">
      <div class="qnum"><span>Question ${partie.index + 1} / ${partie.questions.length}</span><span>${t.emoji} ${t.nom}</span></div>
      <h2>${q.q}</h2>
      <div class="choices">${q.choix.map((c, i) => `<button class="choice" data-i="${i}">${c}</button>`).join('')}</div>
      <div id="after"></div>
    </div>`;
  $('question').querySelectorAll('.choice').forEach((b) => (b.onclick = () => answer(+b.dataset.i)));
}

function answer(i) {
  const q = partie.questions[partie.index];
  const buttons = [...$('question').querySelectorAll('.choice')];
  buttons.forEach((b) => (b.disabled = true));
  const right = i === q.bonne;
  buttons[q.bonne].classList.add('right');
  if (!right) buttons[i].classList.add('wrong');
  navigator.vibrate?.(right ? 30 : [60, 40, 60]);
  partie.ok.push(right);
  prefs.vues[q.cle] = 1;
  const parNiv = ((prefs.reussite = prefs.reussite || {})[prefs.niveau] = prefs.reussite[prefs.niveau] || {});
  const rt = (parNiv[q.theme] = parNiv[q.theme] || [0, 0]);
  rt[1]++;
  if (right) rt[0]++;
  save();
  const last = partie.index === partie.questions.length - 1;
  $('after').innerHTML = `
    <div class="explain"><b>${right ? '✅ Bonne réponse !' : '❌ Raté !'}</b>${q.e}
      ${q.ref ? `<br><span class="ref">📖 ${q.ref}</span>` : ''}
    </div>
    <button class="btn next" id="next">${last ? 'Voir mon score' : 'Question suivante'}</button>`;
  $('next').onclick = () => {
    partie.index++;
    if (last) finish();
    else ask();
  };
  $('after').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function finish() {
  const n = partie.questions.length;
  const s = partie.ok.filter(Boolean).length;
  const k = cleRecord();
  const record = prefs.records[k] === undefined || s > prefs.records[k];
  if (record) prefs.records[k] = s;
  prefs.parties = [...(prefs.parties || []), { niv: prefs.niveau, s, n, t: Date.now() }].slice(-200);
  save();
  const lvl = niveau();
  $('result-text').textContent = s === n ? (lvl.n === 3 ? 'Sans faute. Un vrai GOAT 🐐' : 'Sans faute, la Cour est impressionnée !')
    : s >= 7 ? 'Belle plaidoirie !' : s >= 4 ? 'Le jury délibère encore…' : 'Retour en amphi 😉';
  $('result-score').textContent = `${s} / ${n}`;
  $('result-sub').textContent = `Niveau ${lvl.nom}${record && s > 0 ? ' · nouveau record !' : ''}`;
  $('recap').innerHTML = partie.questions.map((q, i) =>
    `<div>${partie.ok[i] ? '✅' : '❌'} ${q.q}<br><b>${q.c[0]}</b>${q.ref ? ` · <small>${q.ref}</small>` : ''}</div>`).join('');
  show('result');
  if (s >= 7) confettiLite();
}

function confettiLite() {
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:30;overflow:hidden';
  const colors = ['#d4a937', '#f1d38a', '#3b5bdb', '#22c55e', '#f8f5ec'];
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
  const marks = partie.ok.map((ok) => (ok ? '🟢' : '🔴')).join('');
  const s = partie.ok.filter(Boolean).length;
  const matieres = prefs.themes.length ? prefs.themes.map((id) => THEMES.find((t) => t.id === id).nom).join(', ') : 'toutes matières';
  const text = `OustaGames · Quiz du droit ⚖️\nNiveau ${niveau().nom} (${matieres})\n${s}/${partie.questions.length} ${marks}\n${location.href.split(/[?#]/)[0]}`;
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

// ---------- Statistiques ----------

const noteColor = (s, n = PAR_PARTIE) => (s === n ? 'blue' : s >= 7 ? 'green' : s >= 4 ? 'yellow' : 'orange');

function statsHtml(tab) {
  const niv = +tab;
  const parties = (prefs.parties || []).filter((p) => p.niv === niv);
  const rt = (prefs.reussite || {})[niv] || {};
  const recs = Object.entries(prefs.records).filter(([k]) => k.startsWith(niv + ':'));
  if (!parties.length && !recs.length) return Stats.empty('Joue une partie à ce niveau pour voir tes statistiques ici. ⚖️');
  const okAll = Object.values(rt).reduce((t, [a]) => t + a, 0);
  const nAll = Object.values(rt).reduce((t, [, b]) => t + b, 0);
  const avg = parties.length ? parties.reduce((t, p) => t + p.s, 0) / parties.length : 0;
  const tout = prefs.records[niv + ':tout'];
  const tiles = Stats.tiles([
    { v: parties.length, l: parties.length > 1 ? 'parties jouées' : 'partie jouée', c: 'blue' },
    { v: parties.length ? avg.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '–', l: 'sur 10 en moyenne', c: 'yellow' },
    { v: nAll ? Stats.pct(okAll, nAll) + ' %' : '–', l: 'de bonnes réponses', c: 'green' },
    { v: tout !== undefined ? `${tout}/10` : '–', l: 'record, toutes matières', c: 'orange' },
    { v: parties.filter((p) => p.s === p.n).length, l: 'sans-fautes', c: 'lilac' },
    { v: recs.length, l: recs.length > 1 ? 'records établis' : 'record établi', c: 'pink' },
  ]);
  const last = parties.slice(-14);
  const trend = last.length ? Stats.card('Tes dernières parties', Stats.cols(last.map((p, i) => ({
    label: parties.length - last.length + i + 1, value: p.s, c: noteColor(p.s, p.n), hi: i === last.length - 1,
  })), 10)) : '';
  const themes = THEMES.filter((t) => rt[t.id]);
  const forces = themes.length ? Stats.card('Réussite par matière', Stats.bars(themes.map((t) => {
    const [a, b] = rt[t.id];
    const p = Stats.pct(a, b);
    return { label: `${t.emoji} ${t.nom}`, value: p, max: 100, text: `${p} %`, c: p >= 75 ? 'green' : p >= 50 ? 'yellow' : 'orange' };
  }), 100), 'Part de bonnes réponses dans chaque matière, à ce niveau.') : '';
  const nom = (k) => { const ids = k.split(':')[1]; return ids === 'tout' ? 'Toutes les matières' : ids.split(',').map((id) => { const t = THEMES.find((x) => x.id === id); return t ? `${t.emoji} ${t.nom}` : id; }).join(', '); };
  const records = recs.length ? Stats.card('Tes records', Stats.list(recs.sort((a, b) => b[1] - a[1]).map(([k, v]) => ({
    left: nom(k), right: `${v}/10`, c: noteColor(v),
  })))) : '';
  const note = !parties.length ? '<p class="st-note" style="text-align:center">Le détail des parties se remplit à partir du 23 novembre 2026.</p>' : '';
  return tiles + trend + forces + records + note;
}

function openStats() {
  Stats.open({
    title: '📊 Quiz du droit',
    tabs: NIVEAUX.map((n) => ({ id: String(n.n), label: `${n.emoji} ${n.nom}` })),
    tab: String(prefs.niveau), render: statsHtml,
  });
}
$('stats-btn').onclick = openStats;
$('result-stats').onclick = openStats;
$('start').onclick = start;
$('again').onclick = start;
$('share').onclick = share;
$('home').onclick = () => { renderIntro(); show('intro'); };
renderIntro();
