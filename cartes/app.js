'use strict';
// Accueil d'OustaCards, barre de jeu, options, statistiques et victoires.

const GAMES = { solitaire: Solitaire, spider: Spider, freecell: FreeCell, dame: Dame };
const MINI = {
  solitaire: [[1, 1], [0, 13], [2, 7]],
  spider: [[0, 13], [0, 12], [0, 11]],
  freecell: [[3, 1], [1, 2], [0, 3]],
  dame: [[1, 1], [0, 12], [1, 13]],
};
const FELTS = [['emeraude', '#13705a', '#063126'], ['nuit', '#2b3a78', '#0b1030'], ['bordeaux', '#7a2435', '#2c0a12'], ['ardoise', '#4a5466', '#161a22'], ['sable', '#9a7a4a', '#3d2c15']];
const BACKS = ['nuit', 'cerise', 'sapin', 'or', 'prune'];
const $ = (id) => document.getElementById(id);
const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
let T = null;

const UI = {
  update() {
    if (!T) return;
    const g = T.game, st = g.status?.(T);
    $('sTime').textContent = st ? st.big : fmt(T.time());
    $('sMoves').textContent = st ? st.small : plural(T.moves, 'coup');
    $('bUndo').disabled = !T.undoStack.length || T.won || T.busy;
    $('bUndo').style.visibility = g.noUndo ? 'hidden' : '';
    $('gSub').textContent = `Donne n° ${T.seed}` + (g.options[0] ? ' · ' + g.options[0].values.find((v) => v[0] === T.opts[g.options[0].key])?.[1] : '');
  },
  toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this.tt); this.tt = setTimeout(() => t.classList.remove('show'), 1800);
  },
  show(html, actions = []) {
    const d = $('dlg');
    d.innerHTML = html + '<div class="acts"></div>';
    const box = d.querySelector('.acts');
    actions.forEach((a) => {
      const b = document.createElement('button');
      b.className = 'btn' + (a.secondary ? ' secondary' : '');
      b.textContent = a.label;
      b.addEventListener('click', () => { d.close(); a.fn?.(); });
      box.appendChild(b);
    });
    if (!d.open) d.showModal();
    return d;
  },
  stats(id) { const s = Store.get().stats; return (s[id] ||= { played: 0, won: 0, streak: 0, bestStreak: 0, best: null }); },
  record(id, win, extra = {}) {
    const s = this.stats(id);
    s.played++;
    if (win) {
      s.won++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak);
      if (extra.time != null && (s.best == null || extra.time < s.best)) { s.best = extra.time; s.record = true; } else s.record = false;
      if (extra.score != null && (s.best == null || extra.score < s.best)) s.best = extra.score;
    } else s.streak = 0;
    Store.save();
  },
  statGrid(id) {
    const s = this.stats(id), best = s.best == null ? '–' : id === 'dame' ? s.best + ' pts' : fmt(s.best);
    return `<div class="statgrid"><div><b>${s.won}</b><span>${s.won > 1 ? 'victoires' : 'victoire'} / ${s.played}</span></div>
      <div><b>${s.streak}</b><span>série (max ${s.bestStreak})</span></div><div><b>${best}</b><span>${id === 'dame' ? 'meilleur score' : 'meilleur temps'}</span></div></div>`;
  },
  won(table) {
    const id = table.game.id;
    this.record(id, true, { time: table.time() });
    this.update();
    table.rosace();
    setTimeout(() => Fx.confetti(), 700);
    setTimeout(() => {
      if (T !== table) return;
      const s = this.stats(id);
      this.show(`<h2 class="wintitle">Bravo !</h2>
        <p style="text-align:center">${table.game.name} réussi en <b>${fmt(table.time())}</b> et ${plural(table.moves, 'coup')}.${s.record ? '<br>Nouveau record de temps !' : ''}</p>
        ${this.statGrid(id)}`, [{ label: 'Nouvelle partie', fn: () => this.newGame(true) }, { label: 'Admirer le tapis', secondary: true }]);
    }, 1900);
  },
  inProgress() { return T && !T.won && (T.game.inProgress ? T.game.inProgress(T) : T.moves > 0); },
  newGame(force, seed) {
    if (!T) return;
    const go = () => {
      if (this.inProgress()) this.record(T.game.id, false);
      delete Store.get().saves[T.game.id];
      Store.save();
      openGame(T.game.id, { fresh: true, seed });
    };
    if (force || !this.inProgress()) return go();
    this.show('<h2>Nouvelle partie ?</h2><p>La partie en cours comptera comme perdue.</p>',
      [{ label: 'Nouvelle partie', fn: go }, { label: 'Continuer celle-ci', secondary: true }]);
  },
  options() {
    if (!T) return;
    const g = T.game, o = Store.get().opts[g.id] ||= {};
    const segs = g.options.map((op) => `<div class="opt"><label>${op.label}</label><div class="seg" data-k="${op.key}">${op.values.map(([v, l]) =>
      `<button data-v="${v}" class="${(o[op.key] ?? op.def) === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`).join('');
    const snd = `<button class="toggle ${Sound.on() ? 'on' : ''}" id="snd2">Bruits des cartes<i></i></button>`;
    const d = this.show(`<h2>${g.name}</h2>${segs}${snd}${this.statGrid(g.id)}
      <details class="rules"><summary>Les règles</summary>${g.rules}</details>`,
    [{ label: 'Nouvelle donne', fn: () => this.newGame(false) },
      ...(g.noUndo ? [] : [{ label: 'Recommencer cette donne', secondary: true, fn: () => this.restart() }]),
      { label: 'Fermer', secondary: true }]);
    d.querySelector('#snd2').addEventListener('click', (e) => {
      const p = Store.get().prefs; p.sound = p.sound === false; Store.save();
      e.currentTarget.classList.toggle('on', p.sound); renderPrefs();
      if (p.sound) { Sound.unlock(); Sound.play('chime'); }
    });
    d.querySelectorAll('.seg').forEach((seg) => seg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      o[seg.dataset.k] = +b.dataset.v; Store.save();
      if (!this.inProgress()) { d.close(); this.newGame(true); } else this.toast('Réglage appliqué à la prochaine donne');
    }));
  },
  restart() {
    const run = () => T.restart();
    if (!T.moves) return;
    this.show('<h2>Recommencer ?</h2><p>Les cartes reviennent à la distribution de départ.</p>', [{ label: 'Recommencer', fn: run }, { label: 'Annuler', secondary: true }]);
  },
  hint() {
    if (!T || T.busy || T.won) return;
    let hs = T.game.hint(T);
    if (!Array.isArray(hs)) hs = hs ? [hs] : [];
    const h = hs.find((m) => m.done || m.stock || !T.repeats(m));
    if (!h) return this.toast('Aucun coup trouvé… essaie d’annuler');
    if (h.done) return h.msg && this.toast(h.msg);
    if (h.stock) {
      const s = h.stock;
      T.flash(s.cards.length ? [T.top(s)] : [], s.cards.length ? null : s);
      return this.toast(T.game.id === 'spider' ? (h.toastIfEmpty ? 'Remplis les colonnes vides, puis distribue' : 'Distribue une nouvelle rangée') : 'Pioche une carte');
    }
    T.flash(h.from.cards.slice(h.i).map((id) => T.cards[id]), h.to);
  },
};

function openGame(id, { fresh = false, seed } = {}) {
  const g = GAMES[id];
  if (!g) return showMenu();
  closeGame();
  if ($('dlg').open) $('dlg').close();
  $('menu').hidden = true; $('game').hidden = false;
  $('gName').textContent = g.name;
  T = new Table($('stage'), g, UI);
  const save = Store.get().saves[id];
  if (save && save.v === 1 && !fresh) T.load(save);
  else {
    const o = Store.get().opts[id] || {}, opts = {};
    for (const op of g.options) opts[op.key] = o[op.key] ?? op.def;
    T.newDeal(seed ?? 1 + Math.floor(Math.random() * 999999), opts);
  }
  UI.update();
}
function closeGame() {
  if (!T) return;
  T.stopped = true;
  clearTimeout(T.aiTimer);
  T.pauseClock();
  if (!T.won) T.persist();
  T = null;
  $('stage').innerHTML = '';
}
function showMenu() {
  closeGame();
  $('game').hidden = true; $('menu').hidden = false;
  if ($('dlg').open) $('dlg').close();
  renderTiles();
}

function miniFan(el, cards, spread = 14, cw = 38) {
  el.innerHTML = '';
  cards.forEach(([s, r], i) => {
    const c = cardEl(s, r, true), m = i - (cards.length - 1) / 2;
    c.style.transform = `translateX(${m * cw * .22}px) rotate(${m * spread}deg)`;
    c.style.animationDelay = i * 60 + 'ms';
    el.appendChild(c);
  });
}
function renderTiles() {
  const box = $('tiles'), st = Store.get();
  box.innerHTML = '';
  Object.values(GAMES).forEach((g, k) => {
    const a = document.createElement('a');
    a.className = 'tile'; a.href = '#' + g.id; a.style.animationDelay = k * 70 + 'ms';
    const s = st.stats[g.id];
    const line = s && s.played ? `${plural(s.won, 'victoire')} sur ${s.played}` + (s.best != null ? ` · record ${g.id === 'dame' ? s.best + ' pts' : fmt(s.best)}` : '') : 'Jamais joué';
    a.innerHTML = `<div class="mini"></div><div><h2>${g.name}</h2><p>${g.desc}</p><div class="st">${line}</div></div>${st.saves[g.id] ? '<span class="resume">Reprendre</span>' : ''}`;
    miniFan(a.querySelector('.mini'), MINI[g.id]);
    box.appendChild(a);
  });
}
function renderPrefs() {
  const p = Store.get().prefs;
  document.body.className = `felt-${p.felt || 'emeraude'} back-${p.back || 'nuit'}`;
  $('felts').innerHTML = FELTS.map(([k, a, b]) => `<button class="sw felt ${k === (p.felt || 'emeraude') ? 'on' : ''}" data-felt="${k}" aria-label="Tapis ${k}" style="background:radial-gradient(circle at 35% 30%, ${a}, ${b})"></button>`).join('');
  $('snd').classList.toggle('on', p.sound !== false);
  const backs = $('backs');
  backs.innerHTML = '';
  for (const k of BACKS) {
    const b = document.createElement('button');
    b.className = 'sw back-' + k + (k === (p.back || 'nuit') ? ' on' : '');
    b.dataset.back = k; b.setAttribute('aria-label', 'Dos ' + k);
    b.style.cssText = '--cw:44px;--ch:62px;background:none;padding:0';
    const c = cardEl(0, 1, false); c.style.position = 'relative';
    b.appendChild(c); backs.appendChild(b);
  }
}
$('snd').addEventListener('click', () => {
  const p = Store.get().prefs;
  p.sound = p.sound === false; Store.save(); renderPrefs();
  if (p.sound) { Sound.unlock(); Sound.play('chime'); }
});
$('felts').addEventListener('click', (e) => { const b = e.target.closest('[data-felt]'); if (!b) return; Store.get().prefs.felt = b.dataset.felt; Store.save(); renderPrefs(); });
$('backs').addEventListener('click', (e) => { const b = e.target.closest('[data-back]'); if (!b) return; Store.get().prefs.back = b.dataset.back; Store.save(); renderPrefs(); });

$('bBack').addEventListener('click', () => { location.hash = ''; });
$('bOpts').addEventListener('click', () => UI.options());
$('bNew').addEventListener('click', () => UI.newGame(false));
$('bUndo').addEventListener('click', () => T?.undo());
$('bHint').addEventListener('click', () => UI.hint());
$('dlg').addEventListener('click', (e) => { if (e.target === $('dlg')) $('dlg').close(); });

function route() {
  const id = location.hash.slice(1);
  if (GAMES[id]) { if (!T || T.game.id !== id) openGame(id); } else showMenu();
}
addEventListener('hashchange', route);
let rz = 0;
addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => T?.resize()); });
document.addEventListener('visibilitychange', () => {
  if (!T) return;
  if (document.hidden) { T.pauseClock(); if (!T.won) T.persist(); } else if (T.moves > 0 && !T.won) T.startClock();
});
setInterval(() => { if (T && T.since && !document.hidden) UI.update(); }, 1000);

miniFan($('heroFan'), [[0, 1], [1, 13], [2, 12], [3, 11], [1, 10]], 12, 62);
renderPrefs();
route();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js');
