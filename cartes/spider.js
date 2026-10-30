'use strict';
// Spider : ranger les cartes en suites complètes du Roi à l'As, de la même couleur, pour les retirer du jeu.

const Spider = {
  id: 'spider',
  name: 'Spider',
  desc: 'Deux jeux, dix colonnes : forme des suites du Roi à l’As pour les retirer.',
  options: [{ key: 'suits', label: 'Difficulté', values: [[1, '1 couleur'], [2, '2 couleurs'], [4, '4 couleurs']], def: 1 }],
  rules: `<p>Forme dans les colonnes des suites complètes, du Roi à l’As et de la même enseigne : elles quittent alors le tapis. Retire les huit suites pour gagner.</p>
    <p>Une carte se pose sur n’importe quelle carte de valeur juste au-dessus. Seules les suites de même enseigne se déplacent en bloc.</p>
    <p>Touche la pioche pour distribuer une carte sur chaque colonne (aucune colonne ne doit être vide).</p>`,
  dealStagger: 14,
  autoDelay: 260,

  deck(opts) {
    const n = opts.suits || 1, suits = n === 1 ? [0] : n === 2 ? [0, 1] : [0, 1, 2, 3];
    const specs = [];
    for (let k = 0; k < 8 / suits.length; k++) specs.push(...fullDeck(suits));
    return specs;
  },
  build(T, opts) {
    T.meta = { suits: opts.suits || 1 };
    for (let i = 0; i < 8; i++) {
      T.pile('f' + i, 'found', { ghost: true, pos: (j, n, T) => ({ x: T.byId['f' + i].x, y: T.byId['f' + i].y }) });
    }
    T.pile('s', 'stock', {
      ghost: true,
      pos: (j, n, T) => { const g = Math.floor(j / 10), G = Math.ceil(n / 10), p = T.byId.s; return { x: p.x - (G - 1 - g) * T.cw * .24, y: p.y }; },
    });
    for (let i = 0; i < 10; i++) T.pile('t' + i, 'tab', { fan: 'down' });
  },
  layout(T, W, H) {
    const pad = Math.max(4, W * .012), gap = Math.max(3, Math.round(W * .008));
    const cw = Math.floor(Math.min((W - 2 * pad - 9 * gap) / 10, 100, H / 5.4 / 1.4));
    T.cw = cw; T.ch = Math.round(cw * 1.4);
    const x0 = (W - (10 * cw + 9 * gap)) / 2, col = (i) => x0 + i * (cw + gap);
    for (let i = 0; i < 8; i++) Object.assign(T.byId['f' + i], { x: col(0) + i * cw * .36, y: pad });
    Object.assign(T.byId.s, { x: col(9), y: pad });
    for (let i = 0; i < 10; i++) {
      Object.assign(T.byId['t' + i], { x: col(i), y: pad + T.ch + gap * 3, gapUp: T.ch * .28, gapDown: T.ch * .1 });
    }
  },
  deal(T, rand) {
    const ids = shuffle([...Array(104).keys()], rand);
    for (let k = 0; k < 54; k++) T.put(T.byId['t' + (k % 10)], ids.pop(), k >= 44);
    while (ids.length) T.put(T.byId.s, ids.pop(), false);
  },
  dealOrigin: (T) => ({ x: T.byId.s.x, y: T.byId.s.y }),

  // ----- Règles -----
  canPick(T, p, i) {
    if (p.kind !== 'tab') return false;
    for (let k = i; k < p.cards.length; k++) {
      const c = T.card(p, k);
      if (!c.up) return false;
      if (k > i) { const a = T.card(p, k - 1); if (a.s !== c.s || a.r !== c.r + 1) return false; }
    }
    return true;
  },
  canDrop(T, from, i, to) {
    if (to.kind !== 'tab') return false;
    const t = T.top(to);
    return !t || t.r === T.card(from, i).r + 1;
  },
  drop(T, from, i, to) { T.moveCards(from, i, to); T.reveal(from); },
  targets(T, from, i) {
    const c = T.card(from, i), tabs = T.piles.filter((p) => p.kind === 'tab' && p !== from && this.canDrop(T, from, i, p));
    const same = tabs.filter((p) => p.cards.length && T.top(p).s === c.s);
    const other = tabs.filter((p) => p.cards.length && T.top(p).s !== c.s);
    const empty = i > 0 ? tabs.filter((p) => !p.cards.length) : [];
    return [...same, ...other, ...empty];
  },
  tap(T, p, i) {
    if (p.kind === 'stock') return this.dealRow(T);
    if (i < 0 || !this.canPick(T, p, i)) return false;
    const to = this.targets(T, p, i)[0];
    return to ? T.act(() => this.drop(T, p, i, to)) : false;
  },
  dealRow(T) {
    const s = T.byId.s, tabs = T.piles.filter((p) => p.kind === 'tab');
    if (!s.cards.length) return false;
    if (tabs.some((p) => !p.cards.length)) { T.ui.toast('Remplis d’abord les colonnes vides'); return true; }
    return T.act(() => { for (const p of tabs) T.moveCards(s, s.cards.length - 1, p, true); }, { stagger: 45 });
  },
  // Une suite complète Roi → As de même enseigne part toute seule.
  auto(T) {
    for (const p of T.piles) {
      if (p.kind !== 'tab' || p.cards.length < 13) continue;
      const i = p.cards.length - 13;
      if (T.card(p, i).r === 13 && this.canPick(T, p, i)) {
        const f = T.piles.find((q) => q.kind === 'found' && !q.cards.length);
        return () => { T.moveCards(p, i, f); T.reveal(p); return { stagger: 35 }; };
      }
    }
    return null;
  },
  won: (T) => T.piles.filter((p) => p.kind === 'found').every((p) => p.cards.length === 13),
  hint(T) {
    const tabs = T.piles.filter((p) => p.kind === 'tab');
    const moves = [];
    for (const p of tabs) {
      for (let i = 0; i < p.cards.length; i++) {
        if (!this.canPick(T, p, i)) continue;
        const c = T.card(p, i), below = i > 0 ? T.card(p, i - 1) : null;
        for (const to of this.targets(T, p, i)) {
          const t = T.top(to);
          // Inutile de défaire une suite déjà bien rangée pour la reposer ailleurs, sauf pour la même enseigne.
          const sameT = t && t.s === c.s, sameB = below && below.up && below.s === c.s && below.r === c.r + 1;
          if (sameB && !sameT) continue;
          if (sameB && sameT) continue;
          let score = (sameT ? 30 : 0) + (below && !below.up ? 20 : 0) + (i === 0 ? 15 : 0) + (p.cards.length - i);
          if (below && below.up && below.r === c.r + 1 && !sameT) score -= 25;
          if (!t) score -= 10;
          moves.push({ from: p, i, to, score });
        }
        break;
      }
    }
    moves.sort((a, b) => b.score - a.score);
    const out = moves.filter((m) => m.score > 0);
    if (T.byId.s.cards.length) out.push({ stock: T.byId.s, toastIfEmpty: tabs.some((p) => !p.cards.length) });
    return [...out, ...moves.filter((m) => m.score <= 0)];
  },
};
