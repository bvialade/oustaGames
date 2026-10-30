'use strict';
// Solitaire (Klondike) : monter les quatre familles de l'As au Roi.

const Solitaire = {
  id: 'solitaire',
  name: 'Solitaire',
  desc: 'Le grand classique : sept colonnes, quatre familles à monter de l’As au Roi.',
  options: [{ key: 'draw', label: 'Pioche', values: [[1, '1 carte'], [3, '3 cartes']], def: 1 }],
  rules: `<p>Monte les quatre familles de l’As au Roi sur les emplacements du haut.</p>
    <p>Dans les colonnes, pose une carte sur une carte de couleur opposée et de valeur juste au-dessus (un 6 rouge sur un 7 noir). Une colonne vide n’accepte qu’un Roi.</p>
    <p>Touche une carte pour l’envoyer au meilleur endroit, ou fais-la glisser. Touche la pioche pour retourner des cartes.</p>`,
  dealStagger: 26,
  autoDelay: 110,

  deck: () => fullDeck(),
  build(T, opts) {
    T.meta = { draw: opts.draw || 1, passes: 0 };
    T.pile('s', 'stock', { icon: '<svg viewBox="0 0 24 24"><use href="#ic-recycle"/></svg>' });
    T.pile('w', 'waste', { fan: 'waste', show: T.meta.draw === 3 ? 3 : 1, ghost: true });
    for (let i = 0; i < 4; i++) T.pile('f' + i, 'found', { icon: '<b>A</b>' });
    for (let i = 0; i < 7; i++) T.pile('t' + i, 'tab', { fan: 'down', icon: '<b>R</b>' });
  },
  layout(T, W, H) {
    const pad = Math.max(6, Math.min(W, H) * .02), gap = Math.max(4, Math.round(Math.min(W, H) * .014));
    if (W > H * 1.3) {
      // Paysage : pioche à gauche, familles en carré à droite, toute la hauteur pour les colonnes.
      const sep = gap * 3;
      const cw = Math.floor(Math.min((W - 2 * pad - 7 * gap - 2 * sep) / 10, H / 2.6 / 1.4, 120));
      T.cw = cw; T.ch = Math.round(cw * 1.4);
      const x0 = (W - (10 * cw + 7 * gap + 2 * sep)) / 2;
      Object.assign(T.byId.s, { x: x0, y: pad });
      Object.assign(T.byId.w, { x: x0, y: pad + T.ch + gap * 2, vertical: true });
      for (let i = 0; i < 7; i++) Object.assign(T.byId['t' + i], { x: x0 + cw + sep + i * (cw + gap), y: pad });
      const fx = x0 + cw + sep + 7 * (cw + gap) - gap + sep;
      for (let i = 0; i < 4; i++) Object.assign(T.byId['f' + i], { x: fx + (i % 2) * (cw + gap), y: pad + Math.floor(i / 2) * (T.ch + gap) });
      return;
    }
    const cw = Math.floor(Math.min((W - 2 * pad - 6 * gap) / 7, 112, H / 5 / 1.4));
    T.cw = cw; T.ch = Math.round(cw * 1.4);
    const x0 = (W - (7 * cw + 6 * gap)) / 2, col = (i) => x0 + i * (cw + gap);
    Object.assign(T.byId.s, { x: col(0), y: pad });
    Object.assign(T.byId.w, { x: col(1), y: pad, vertical: false });
    for (let i = 0; i < 4; i++) Object.assign(T.byId['f' + i], { x: col(3 + i), y: pad });
    for (let i = 0; i < 7; i++) Object.assign(T.byId['t' + i], { x: col(i), y: pad + T.ch + gap * 3 });
  },
  deal(T, rand) {
    const ids = shuffle([...Array(52).keys()], rand);
    for (let i = 0; i < 7; i++) for (let j = 0; j <= i; j++) T.put(T.byId['t' + i], ids.pop(), j === i);
    while (ids.length) T.put(T.byId.s, ids.pop(), false);
  },
  dealOrigin: (T) => ({ x: T.byId.s.x, y: T.byId.s.y }),

  // ----- Règles -----
  isSeq(T, p, i) {
    for (let k = i; k < p.cards.length; k++) {
      const c = T.card(p, k);
      if (!c.up) return false;
      if (k > i) { const a = T.card(p, k - 1); if (a.r !== c.r + 1 || isRed(a.s) === isRed(c.s)) return false; }
    }
    return true;
  },
  canPick(T, p, i) {
    if (p.kind === 'tab') return this.isSeq(T, p, i);
    if (p.kind === 'waste' || p.kind === 'found') return i === p.cards.length - 1;
    return false;
  },
  canDrop(T, from, i, to) {
    const c = T.card(from, i), n = from.cards.length - i, t = T.top(to);
    if (to.kind === 'found') return n === 1 && (t ? t.s === c.s && t.r === c.r - 1 : c.r === 1);
    if (to.kind === 'tab') return t ? t.up && t.r === c.r + 1 && isRed(t.s) !== isRed(c.s) : c.r === 13;
    return false;
  },
  drop(T, from, i, to) {
    T.moveCards(from, i, to);
    if (from.kind === 'tab') T.reveal(from);
  },
  draw(T) {
    const s = T.byId.s, w = T.byId.w;
    return T.act(() => {
      if (!s.cards.length) {
        if (!w.cards.length) return false;
        while (w.cards.length) T.moveCards(w, w.cards.length - 1, s, false);
        T.meta.passes++;
        return;
      }
      for (let k = 0; k < T.meta.draw && s.cards.length; k++) T.moveCards(s, s.cards.length - 1, w, true);
    }, { stagger: 30 });
  },
  targets(T, from, i) {
    const out = [], n = from.cards.length - i, c = T.card(from, i);
    if (n === 1) for (let k = 0; k < 4; k++) { const f = T.byId['f' + k]; if (f !== from && this.canDrop(T, from, i, f)) { out.push(f); break; } }
    const tabs = T.piles.filter((p) => p.kind === 'tab' && p !== from && this.canDrop(T, from, i, p));
    out.push(...tabs.filter((p) => p.cards.length));
    // Un Roi déjà en tête de colonne n'a rien à gagner à changer de colonne vide.
    if (!(from.kind === 'tab' && i === 0 && c.r === 13)) out.push(...tabs.filter((p) => !p.cards.length));
    return out;
  },
  tap(T, p, i) {
    if (p.kind === 'stock') return this.draw(T);
    if (i < 0 || !this.canPick(T, p, i)) return false;
    const to = this.targets(T, p, i)[0];
    return to ? T.act(() => this.drop(T, p, i, to)) : false;
  },
  auto(T) {
    // Fin automatique : tout est visible, il n'y a plus qu'à ranger.
    if (T.byId.s.cards.length || T.byId.w.cards.length) return null;
    const tabs = T.piles.filter((p) => p.kind === 'tab');
    if (tabs.some((p) => p.cards.some((id) => !T.cards[id].up))) return null;
    let best = null;
    for (const p of tabs) {
      if (!p.cards.length) continue;
      const i = p.cards.length - 1;
      for (let k = 0; k < 4; k++) {
        const f = T.byId['f' + k];
        if (this.canDrop(T, p, i, f) && (!best || T.card(p, i).r < best.c.r)) { best = { p, i, f, c: T.card(p, i) }; break; }
      }
    }
    return best && (() => { T.moveCards(best.p, best.i, best.f); });
  },
  won: (T) => T.piles.filter((p) => p.kind === 'found').reduce((a, p) => a + p.cards.length, 0) === 52,
  hint(T) {
    const tabs = T.piles.filter((p) => p.kind === 'tab'), w = T.byId.w, out = [];
    for (const p of [w, ...tabs].filter((q) => q.cards.length)) {
      const i = p.cards.length - 1;
      for (let k = 0; k < 4; k++) if (this.canDrop(T, p, i, T.byId['f' + k])) out.push({ from: p, i, to: T.byId['f' + k] });
    }
    for (const p of tabs) {
      const i = p.cards.findIndex((id) => T.cards[id].up);
      if (i < 0) continue;
      for (const to of this.targets(T, p, i)) if (to.kind === 'tab' && (i > 0 || to.cards.length)) out.push({ from: p, i, to });
    }
    if (w.cards.length) for (const to of this.targets(T, w, w.cards.length - 1)) if (to.kind === 'tab') out.push({ from: w, i: w.cards.length - 1, to });
    if (T.byId.s.cards.length || w.cards.length > 1) out.push({ stock: T.byId.s });
    return out;
  },
};
