'use strict';
// FreeCell : toutes les cartes sont visibles, quatre cases libres pour manœuvrer.

const FreeCell = {
  id: 'freecell',
  name: 'FreeCell',
  desc: 'Tout est visible dès le départ : quatre cases libres et beaucoup de réflexion.',
  options: [],
  rules: `<p>Monte les quatre familles de l’As au Roi sur les emplacements de droite.</p>
    <p>Dans les colonnes, pose une carte sur une carte de couleur opposée et de valeur juste au-dessus. Les quatre cases de gauche gardent chacune une carte de côté. N’importe quelle carte peut aller dans une colonne vide.</p>
    <p>On peut déplacer plusieurs cartes à la fois s’il reste assez de cases libres et de colonnes vides pour le faire carte par carte.</p>`,
  dealStagger: 16,
  autoDelay: 140,

  deck: () => fullDeck(),
  build(T) {
    T.meta = {};
    for (let i = 0; i < 4; i++) T.pile('c' + i, 'cell');
    for (let i = 0; i < 4; i++) T.pile('f' + i, 'found', { icon: '<b>A</b>' });
    for (let i = 0; i < 8; i++) T.pile('t' + i, 'tab', { fan: 'down' });
  },
  layout(T, W, H) {
    const pad = Math.max(5, Math.min(W, H) * .015), gap = Math.max(3, Math.round(Math.min(W, H) * .012));
    if (W > H * 1.3) {
      // Paysage : cases libres à gauche et familles à droite, en carrés, les colonnes au milieu.
      const sep = gap * 3;
      const cw = Math.floor(Math.min((W - 2 * pad - 9 * gap - 2 * sep) / 12, H / 2.3 / 1.4, 110));
      T.cw = cw; T.ch = Math.round(cw * 1.4);
      const x0 = (W - (12 * cw + 9 * gap + 2 * sep)) / 2, tx = x0 + 2 * cw + gap + sep;
      for (let i = 0; i < 4; i++) Object.assign(T.byId['c' + i], { x: x0 + (i % 2) * (cw + gap), y: pad + Math.floor(i / 2) * (T.ch + gap) });
      for (let i = 0; i < 8; i++) Object.assign(T.byId['t' + i], { x: tx + i * (cw + gap), y: pad, gapUp: T.ch * .25 });
      const fx = tx + 8 * (cw + gap) - gap + sep;
      for (let i = 0; i < 4; i++) Object.assign(T.byId['f' + i], { x: fx + (i % 2) * (cw + gap), y: pad + Math.floor(i / 2) * (T.ch + gap) });
      return;
    }
    const mid = gap * 2;
    const cw = Math.floor(Math.min((W - 2 * pad - 7 * gap - mid) / 8, 106, H / 5.4 / 1.4));
    T.cw = cw; T.ch = Math.round(cw * 1.4);
    const x0 = (W - (8 * cw + 7 * gap + mid)) / 2, col = (i) => x0 + i * (cw + gap) + (i >= 4 ? mid : 0);
    for (let i = 0; i < 4; i++) Object.assign(T.byId['c' + i], { x: col(i), y: pad });
    for (let i = 0; i < 4; i++) Object.assign(T.byId['f' + i], { x: col(4 + i), y: pad });
    for (let i = 0; i < 8; i++) Object.assign(T.byId['t' + i], { x: x0 + i * (cw + gap) + mid / 2, y: pad + T.ch + gap * 3, gapUp: T.ch * .27 });
  },
  deal(T, rand) {
    const ids = shuffle([...Array(52).keys()], rand);
    for (let k = 0; k < 52; k++) T.put(T.byId['t' + (k % 8)], ids[k], true);
  },
  dealOrigin: (T) => ({ x: (T.W - T.cw) / 2, y: T.H + 20 }),

  // ----- Règles -----
  free(T) { return T.piles.filter((p) => p.kind === 'cell' && !p.cards.length).length; },
  empty(T, except) { return T.piles.filter((p) => p.kind === 'tab' && !p.cards.length && p !== except).length; },
  maxMove(T, to) { return (this.free(T) + 1) * 2 ** this.empty(T, to); },
  isSeq(T, p, i) {
    for (let k = i + 1; k < p.cards.length; k++) {
      const a = T.card(p, k - 1), c = T.card(p, k);
      if (a.r !== c.r + 1 || isRed(a.s) === isRed(c.s)) return false;
    }
    return true;
  },
  canPick(T, p, i) {
    if (p.kind === 'tab') return this.isSeq(T, p, i) && p.cards.length - i <= this.maxMove(T);
    return i === p.cards.length - 1;
  },
  canDrop(T, from, i, to) {
    const c = T.card(from, i), n = from.cards.length - i, t = T.top(to);
    if (to.kind === 'cell') return n === 1 && !t;
    if (to.kind === 'found') return n === 1 && (t ? t.s === c.s && t.r === c.r - 1 : c.r === 1);
    if (t) return n <= this.maxMove(T) && t.r === c.r + 1 && isRed(t.s) !== isRed(c.s);
    return n <= this.maxMove(T, to);
  },
  drop(T, from, i, to) { T.moveCards(from, i, to); },
  targets(T, from, i) {
    const n = from.cards.length - i, ok = (p) => p !== from && this.canDrop(T, from, i, p);
    const found = n === 1 ? T.piles.filter((p) => p.kind === 'found' && ok(p)).slice(0, 1) : [];
    const tabs = T.piles.filter((p) => p.kind === 'tab' && ok(p));
    const out = [...found, ...tabs.filter((p) => p.cards.length)];
    if (!(from.kind === 'tab' && i === 0)) out.push(...tabs.filter((p) => !p.cards.length));
    if (from.kind !== 'cell') out.push(...T.piles.filter((p) => p.kind === 'cell' && ok(p)).slice(0, 1));
    return out;
  },
  tap(T, p, i) {
    if (i < 0 || !this.canPick(T, p, i)) return false;
    const to = this.targets(T, p, i)[0];
    return to ? T.act(() => this.drop(T, p, i, to)) : false;
  },
  // Range tout seul les cartes qui ne servent plus à rien dans les colonnes.
  auto(T) {
    const found = T.piles.filter((p) => p.kind === 'found');
    const height = (color) => Math.min(...[0, 1, 2, 3].filter((s) => isRed(s) === color).map((s) => {
      const f = found.find((q) => T.top(q)?.s === s);
      return f ? f.cards.length : 0;
    }));
    for (const p of T.piles) {
      if ((p.kind !== 'tab' && p.kind !== 'cell') || !p.cards.length) continue;
      const i = p.cards.length - 1, c = T.card(p, i);
      if (c.r > 2 && height(!isRed(c.s)) < c.r - 1) continue;
      const f = found.find((q) => this.canDrop(T, p, i, q));
      if (f) return () => { T.moveCards(p, i, f); };
    }
    return null;
  },
  won: (T) => T.piles.filter((p) => p.kind === 'found').reduce((a, p) => a + p.cards.length, 0) === 52,
  hint(T) {
    const tabs = T.piles.filter((p) => p.kind === 'tab'), cells = T.piles.filter((p) => p.kind === 'cell');
    const moves = [];
    for (const p of [...cells, ...tabs]) {
      if (!p.cards.length) continue;
      for (let i = 0; i < p.cards.length; i++) {
        if (!this.canPick(T, p, i)) continue;
        for (const to of this.targets(T, p, i)) {
          let score = 0;
          if (to.kind === 'found') score = 100;
          else if (to.kind === 'tab' && to.cards.length) score = 50 + (p.kind === 'cell' ? 20 : 0) + (i === 0 ? 15 : 0) + (i > 0 && this.isSeq(T, p, i - 1) ? -60 : 0);
          else if (to.kind === 'tab') score = p.kind === 'cell' ? 12 : (i > 0 && !this.isSeq(T, p, i - 1) ? 8 : -1);
          else score = 2;
          moves.push({ from: p, i, to, score });
        }
        break;
      }
    }
    moves.sort((a, b) => b.score - a.score);
    return moves.filter((m) => m.score > 0);
  },
};
