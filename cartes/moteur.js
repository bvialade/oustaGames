'use strict';
// Moteur commun d'OustaCards : cartes, piles, rendu animé, glisser-déposer, annulation et sauvegarde.
// Chaque jeu (solitaire.js, spider.js…) fournit ses règles ; le moteur s'occupe du reste.

const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'];
const SUIT_NAMES = ['pique', 'cœur', 'carreau', 'trèfle'];
const isRed = (s) => s === 1 || s === 2;
const DUR = 300;

// Générateur pseudo-aléatoire à graine : une même graine redonne la même donne.
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const fullDeck = (suits = [0, 1, 2, 3]) => suits.flatMap((s) => RANKS.slice(1).map((_, i) => [s, i + 1]));

const sv = (s, cls) => `<svg class="${cls}" viewBox="0 0 100 100"><use href="#su${s}"/></svg>`;
function faceHTML(s, r) {
  let center;
  if (r > 10) center = `<div class="court"><svg class="em" viewBox="0 0 100 100"><use href="#cr${r}"/></svg><b>${RANKS[r]}</b></div>`;
  else if (r === 1) center = `<div class="ace">${sv(s, 'big')}</div>`;
  else center = sv(s, 'big');
  return `<div class="idx"><b>${RANKS[r]}</b>${sv(s, 'i2')}</div>${sv(s, 'i1')}${center}`;
}
function cardEl(s, r, up = true) {
  const el = document.createElement('div');
  el.className = 'card ' + (isRed(s) ? 'red' : 'black') + (up ? ' up' : '');
  el.innerHTML = `<div class="ci"><div class="face front">${faceHTML(s, r)}</div><div class="face back"></div></div>`;
  return el;
}

// Sauvegarde locale (préférences, statistiques, parties en cours).
const Store = {
  data: null,
  get() {
    if (!this.data) {
      try { this.data = JSON.parse(localStorage.getItem('oustacards')) || {}; } catch { this.data = {}; }
      this.data.prefs ||= {}; this.data.stats ||= {}; this.data.saves ||= {}; this.data.opts ||= {};
    }
    return this.data;
  },
  save() { try { localStorage.setItem('oustacards', JSON.stringify(this.data)); } catch { /* stockage plein ou privé */ } },
};

class Table {
  constructor(stage, game, ui) {
    this.game = game; this.ui = ui;
    stage.innerHTML = '';
    this.board = document.createElement('div');
    this.board.className = 'board b-' + game.id;
    stage.appendChild(this.board);
    this.cards = []; this.piles = []; this.byId = {};
    this.undoStack = []; this.moving = [];
    this.moves = 0; this.meta = {}; this.busy = false; this.won = false;
    this.elapsed = 0; this.since = 0;
    this.bind();
  }

  // ----- Construction -----
  makeDeck(specs) {
    this.specs = specs;
    this.cards = specs.map(([s, r], id) => {
      const el = cardEl(s, r, false);
      el.dataset.id = id;
      this.board.appendChild(el);
      return { id, s, r, up: false, el, pile: null, x: 0, y: 0, tf: '' };
    });
  }
  pile(id, kind, o = {}) {
    const p = { id, kind, cards: [], x: 0, y: 0, fan: 'none', ...o };
    p.slot = document.createElement('div');
    p.slot.className = 'slot ' + kind + (o.ghost ? ' ghost' : '');
    p.slot.dataset.pile = id;
    if (o.icon) p.slot.innerHTML = o.icon;
    this.board.prepend(p.slot);
    this.piles.push(p); this.byId[id] = p;
    return p;
  }
  put(p, id, up) { const c = this.cards[id]; c.pile = p; c.up = up; p.cards.push(id); }
  top(p) { return p.cards.length ? this.cards[p.cards[p.cards.length - 1]] : null; }
  card(p, i) { return this.cards[p.cards[i]]; }
  moveCards(from, idx, to, up) {
    const ids = from.cards.splice(idx);
    for (const id of ids) { const c = this.cards[id]; c.pile = to; to.cards.push(id); if (up !== undefined) c.up = up; }
    this.moving.push(...ids);
    return ids;
  }
  // Retourne la dernière carte d'une colonne si elle est cachée.
  reveal(p) { const c = this.top(p); if (c && !c.up) c.up = true; }

  // ----- Mise en page et rendu -----
  resize() {
    const W = this.board.clientWidth, H = this.board.clientHeight;
    if (!W || !H) return;
    this.W = W; this.H = H;
    this.game.layout(this, W, H);
    this.board.style.setProperty('--cw', this.cw + 'px');
    this.board.style.setProperty('--ch', this.ch + 'px');
    for (const p of this.piles) p.slot.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
    this.board.classList.add('instant');
    this.render();
    void this.board.offsetWidth;
    requestAnimationFrame(() => this.board.classList.remove('instant'));
  }
  positions(p) {
    const n = p.cards.length, out = [];
    if (p.pos) { for (let i = 0; i < n; i++) out.push(p.pos(i, n, this)); return out; }
    if (p.fan === 'down') {
      const dn = p.gapDown ?? this.ch * .11, up = p.gapUp ?? this.ch * .27;
      let total = 0;
      for (let i = 0; i < n - 1; i++) total += this.cards[p.cards[i]].up ? up : dn;
      const max = p.maxH ?? (this.H - p.y - this.ch - 4);
      const k = total > max && total > 0 ? max / total : 1;
      let y = p.y;
      for (let i = 0; i < n; i++) { out.push({ x: p.x, y }); y += (this.cards[p.cards[i]].up ? up : dn) * k; }
      return out;
    }
    if (p.fan === 'waste') {
      const show = p.show ?? 1;
      for (let i = 0; i < n; i++) out.push({ x: p.x + Math.max(0, i - (n - show)) * this.cw * .3, y: p.y });
      return out;
    }
    for (let i = 0; i < n; i++) out.push({ x: p.x, y: p.y - Math.min(Math.floor(i / 6), 4) * .6 });
    return out;
  }
  render(opts = {}) {
    const moving = new Set(this.moving);
    this.moving = [];
    let order = 0;
    this.piles.forEach((p, pi) => {
      const pos = this.positions(p);
      p.cards.forEach((id, i) => {
        const c = this.cards[id], q = pos[i], z = q.z ?? pi * 160 + i + 1;
        c.el.classList.toggle('up', c.up);
        c.x = q.x; c.y = q.y;
        let tf = `translate3d(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px,0)`;
        if (q.r) tf += ` rotate(${q.r}deg)`;
        if (q.s && q.s !== 1) tf += ` scale(${q.s})`;
        const op = q.o ?? 1;
        if (String(op) !== c.el.style.opacity) c.el.style.opacity = op;
        if (tf === c.tf) { if (!c.zt) c.el.style.zIndex = z; return; }
        c.tf = tf;
        const delay = opts.stagger ? order++ * opts.stagger : 0;
        c.el.style.transitionDelay = delay ? delay + 'ms' : '';
        c.el.style.transform = tf;
        c.el.style.zIndex = (moving.has(id) ? 6000 : 3000) + z;
        clearTimeout(c.zt);
        c.zt = setTimeout(() => { c.el.style.zIndex = z; c.el.style.transitionDelay = ''; c.zt = 0; }, delay + DUR + 60);
      });
    });
  }
  // Toutes les cartes partent d'un même point puis se distribuent une à une.
  dealFrom(x, y, stagger = 22) {
    this.board.classList.add('instant');
    for (const c of this.cards) {
      c.el.classList.remove('up');
      c.tf = `translate3d(${x}px,${y}px,0)`;
      c.el.style.transform = c.tf;
    }
    void this.board.offsetWidth;
    this.board.classList.remove('instant');
    this.busy = true;
    requestAnimationFrame(() => {
      this.render({ stagger });
      setTimeout(() => { this.busy = false; this.game.afterDeal?.(this); }, this.cards.length * stagger * .8 + DUR);
    });
  }

  // ----- Coups, automatismes, annulation -----
  snap() {
    return { p: this.piles.map((p) => p.cards.map((id) => (this.cards[id].up ? id : ~id))), m: JSON.parse(JSON.stringify(this.meta)), mv: this.moves };
  }
  restore(s) {
    this.piles.forEach((p, i) => { p.cards = []; for (const v of s.p[i]) this.put(p, v < 0 ? ~v : v, v >= 0); });
    this.meta = s.m; this.moves = s.mv;
  }
  act(fn, opts) {
    if (this.busy || this.won) return false;
    const before = this.snap();
    if (fn() === false) { this.moving = []; return false; }
    this.undoStack.push(before);
    if (this.undoStack.length > 400) this.undoStack.shift();
    this.moves++;
    this.startClock();
    this.render(opts);
    this.runAuto();
    return true;
  }
  runAuto() {
    const step = this.game.auto?.(this);
    if (step) {
      this.busy = true;
      setTimeout(() => { const o = step(); this.render(o || {}); this.runAuto(); }, this.game.autoDelay ?? 150);
      return;
    }
    this.busy = false;
    this.persist();
    this.ui.update();
    if (this.game.won(this)) this.win();
  }
  undo() {
    if (this.busy || this.won || !this.undoStack.length) return;
    const was = this.cards.map((c) => c.pile);
    this.restore(this.undoStack.pop());
    this.moving = this.cards.filter((c, i) => c.pile !== was[i]).map((c) => c.id);
    this.render();
    this.persist();
    this.ui.update();
  }

  // Retour à la distribution de départ.
  restart() {
    if (this.busy || this.won || !this.initial) return;
    const was = this.cards.map((c) => c.pile);
    this.restore(this.initial);
    this.undoStack = []; this.moves = 0; this.elapsed = 0; this.since = 0;
    this.moving = this.cards.filter((c, i) => c.pile !== was[i]).map((c) => c.id);
    this.render({ stagger: 8 });
    this.persist();
    this.ui.update();
  }

  // ----- Chronomètre -----
  startClock() { if (!this.since && !this.won) this.since = Date.now(); }
  pauseClock() { if (this.since) { this.elapsed += Date.now() - this.since; this.since = 0; } }
  time() { return this.elapsed + (this.since ? Date.now() - this.since : 0); }

  // ----- Sauvegarde -----
  persist() {
    const st = Store.get();
    if (this.won) delete st.saves[this.game.id];
    else st.saves[this.game.id] = { v: 1, deck: this.specs, seed: this.seed, opts: this.opts, snap: this.snap(), initial: this.initial, undo: this.undoStack.slice(-60), time: this.time() };
    Store.save();
  }
  load(save) {
    this.seed = save.seed; this.opts = save.opts;
    this.makeDeck(save.deck);
    this.game.build(this, this.opts);
    this.restore(save.snap);
    this.undoStack = save.undo || [];
    this.initial = save.initial || this.undoStack[0];
    this.elapsed = save.time || 0;
    this.resize();
    this.game.afterLoad?.(this);
  }
  newDeal(seed, opts) {
    this.seed = seed; this.opts = opts;
    const rand = makeRng(seed);
    this.makeDeck(this.game.deck(opts));
    this.game.build(this, opts);
    this.resize();
    this.game.deal(this, rand, opts);
    const o = this.game.dealOrigin?.(this) ?? { x: (this.W - this.cw) / 2, y: this.H };
    this.initial = this.snap();
    this.dealFrom(o.x, o.y, this.game.dealStagger ?? 22);
    this.persist();
  }

  // ----- Toucher et glisser -----
  bind() {
    const b = this.board;
    b.addEventListener('pointerdown', (e) => this.down(e));
    b.addEventListener('pointermove', (e) => this.drag(e));
    b.addEventListener('pointerup', (e) => this.up(e));
    b.addEventListener('pointercancel', (e) => this.up(e, true));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  down(e) {
    if (this.busy || this.won || this.press) return;
    const cel = e.target.closest('.card'), sel = e.target.closest('.slot');
    let pile, idx;
    if (cel) { const c = this.cards[+cel.dataset.id]; pile = c.pile; idx = pile.cards.indexOf(c.id); }
    else if (sel) { pile = this.byId[sel.dataset.pile]; idx = -1; }
    else return;
    e.preventDefault();
    this.press = { pile, idx, x0: e.clientX, y0: e.clientY, lx: e.clientX, rot: 0, pid: e.pointerId, dragging: false,
      can: idx >= 0 && !!this.game.canPick?.(this, pile, idx) };
    try { this.board.setPointerCapture(e.pointerId); } catch { /* rien */ }
  }
  drag(e) {
    const P = this.press;
    if (!P || e.pointerId !== P.pid) return;
    const dx = e.clientX - P.x0, dy = e.clientY - P.y0;
    if (!P.dragging) {
      if (!P.can || Math.hypot(dx, dy) < 7) return;
      P.dragging = true;
      P.group = P.pile.cards.slice(P.idx).map((id) => this.cards[id]);
      P.group.forEach((c, k) => { clearTimeout(c.zt); c.zt = 0; c.el.classList.add('drag'); c.el.style.zIndex = 9000 + k; c.el.style.transitionDelay = ''; });
    }
    // Légère inclinaison selon la vitesse du doigt, pour donner du poids aux cartes.
    P.rot = Math.max(-9, Math.min(9, P.rot * .7 + (e.clientX - P.lx) * .5));
    P.lx = e.clientX; P.dx = dx; P.dy = dy;
    P.group.forEach((c, k) => {
      c.el.style.transform = `translate3d(${c.x + dx}px,${c.y + dy}px,0) rotate(${(P.rot * (1 - k * .08)).toFixed(1)}deg)`;
    });
  }
  up(e, cancel) {
    const P = this.press;
    if (!P || e.pointerId !== P.pid) return;
    this.press = null;
    if (P.dragging) {
      P.group.forEach((c) => { c.el.classList.remove('drag'); c.tf = ''; });
      const to = cancel ? null : this.findDrop(P);
      if (!to || !this.act(() => this.game.drop(this, P.pile, P.idx, to))) {
        this.moving.push(...P.group.map((c) => c.id));
        this.render();
      }
      return;
    }
    if (cancel || Math.hypot(e.clientX - P.x0, e.clientY - P.y0) > 14) return;
    const done = this.game.tap(this, P.pile, P.idx);
    if (!done && P.idx >= 0) this.nope(this.card(P.pile, P.idx));
  }
  findDrop(P) {
    const g = P.group[0], gx = g.x + P.dx, gy = g.y + P.dy;
    let best = null, bestA = 0;
    for (const p of this.piles) {
      if (p === P.pile || !this.game.canDrop(this, P.pile, P.idx, p)) continue;
      const t = this.top(p);
      const x = t ? t.x : p.x, y0 = p.fan === 'down' ? p.y : (t ? t.y : p.y), y1 = (t ? t.y : p.y) + this.ch;
      const ox = Math.min(gx + this.cw, x + this.cw) - Math.max(gx, x);
      const oy = Math.min(gy + this.ch, y1) - Math.max(gy, y0);
      if (ox > 0 && oy > 0 && ox * oy > bestA) { bestA = ox * oy; best = p; }
    }
    return best;
  }
  // Vrai si ce coup ramène le jeu dans une position déjà vue récemment (pour que l'indice ne tourne pas en rond).
  repeats(m) {
    const key = (piles) => piles.map((a) => a.map((v) => (v < 0 ? ~v : v)).join(',')).join('|');
    const sim = this.piles.map((p) => p.cards.slice());
    const fi = this.piles.indexOf(m.from), ti = this.piles.indexOf(m.to);
    sim[ti].push(...sim[fi].splice(m.i));
    const k = key(sim);
    return this.undoStack.slice(-60).some((s) => key(s.p) === k);
  }
  nope(c) {
    if (!c?.up) return;
    c.el.classList.remove('nope'); void c.el.offsetWidth; c.el.classList.add('nope');
    setTimeout(() => c.el.classList.remove('nope'), 350);
  }
  // Met en lumière un coup possible.
  flash(cards, target) {
    const els = cards.map((c) => c.el);
    if (target) els.push(target.cards.length ? this.top(target).el : target.slot);
    els.forEach((el) => el.classList.add('hint'));
    setTimeout(() => els.forEach((el) => el.classList.remove('hint')), 1400);
  }

  // ----- Victoire -----
  win() {
    this.won = true;
    this.pauseClock();
    this.persist();
    this.ui.won(this);
  }
  // Les cartes s'envolent pour former une rosace au centre du tapis.
  rosace() {
    const cards = this.cards.filter((c) => c.r <= 13);
    const n = cards.length, cx = (this.W - this.cw) / 2, cy = (this.H - this.ch) / 2;
    const R = Math.min(this.W, this.H) * .3;
    cards.forEach((c, i) => {
      const a = (i / n) * Math.PI * 2 * (n > 60 ? 2 : 1);
      const rr = n > 60 && i >= n / 2 ? R * .55 : R;
      c.el.classList.add('up');
      c.el.style.transition = `transform 1.1s cubic-bezier(.2,.8,.2,1) ${i * 14}ms`;
      c.el.style.zIndex = 7000 + i;
      c.el.style.transform = `translate3d(${cx + rr * Math.sin(a)}px,${cy - rr * Math.cos(a) * .9}px,0) rotate(${(a * 180) / Math.PI}deg)`;
    });
  }
}

// Petites aides partagées par les jeux.
const Fx = {
  confetti(duration = 2600) {
    const cv = document.getElementById('fx'), ctx = cv.getContext('2d');
    const dpr = devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#ffd36b', '#ff5d73', '#ffffff', '#7fe0ff', '#9cf29a', '#f2b33d'];
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .45,
      vx: (Math.random() - .5) * 13, vy: -Math.random() * 14 - 5, r: Math.random() * 6.3, vr: (Math.random() - .5) * .35,
      w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, c: colors[(Math.random() * colors.length) | 0],
    }));
    const t0 = performance.now();
    const tick = (t) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const k = (t - t0) / duration;
      for (const p of parts) {
        p.vy += .38; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - k * k);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx.restore();
      }
      if (k < 1) requestAnimationFrame(tick); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(tick);
  },
};
