'use strict';
// Dame de pique : quatre joueurs, chaque cœur pris coûte 1 point et la Dame de pique 13.
// On joue contre trois adversaires de l'ordinateur ; la partie s'arrête quand quelqu'un atteint 100 points.

const QS = 11;            // Dame de pique (enseigne 0, valeur 12)
const TWO_CLUBS = 40;     // 2 de trèfle (enseigne 3, valeur 2)
const PLAYERS = [
  { name: 'Toi', face: '🙂' },
  { name: 'Lulu', face: '🦊' },
  { name: 'Marcel', face: '🐻' },
  { name: 'Josette', face: '🦉' },
];
const PASS = [1, 3, 2, 0];  // gauche, droite, en face, pas d'échange
const PASS_TXT = { 1: 'à Lulu, à ta gauche', 3: 'à Josette, à ta droite', 2: 'à Marcel, en face' };
const val = (c) => (c.r === 1 ? 14 : c.r);
const SUIT_ORDER = { 3: 0, 2: 1, 0: 2, 1: 3 };

const Dame = {
  id: 'dame',
  name: 'Dame de pique',
  desc: 'Contre trois adversaires : évite les cœurs et surtout la redoutable Dame de pique.',
  options: [],
  noUndo: true,
  rules: `<p>À chaque pli, il faut fournir la couleur demandée si on peut. Le plus fort de la couleur demandée remporte le pli.</p>
    <p>Chaque cœur ramassé coûte 1 point, la Dame de pique 13. Celui qui ramasse les 26 points d’une manche fait « grand chelem » : les trois autres prennent 26 points à sa place.</p>
    <p>Avant chaque manche, on donne 3 cartes à un voisin (gauche, droite, en face, puis pas d’échange). Le 2 de trèfle ouvre. On ne peut pas entamer à cœur tant qu’aucun cœur n’a été joué, ni donner de points au premier pli.</p>
    <p>La partie s’arrête dès qu’un joueur atteint 100 points : le plus petit score gagne. Touche une carte pour la lever, touche-la encore pour la jouer.</p>`,
  dealStagger: 18,

  deck: () => fullDeck(),
  build(T) {
    T.meta = { hand: 0, scores: [0, 0, 0, 0], pts: [0, 0, 0, 0], trick: [], played: [], sel: [], phase: 'deal', trickNo: 0, turn: 0, broken: false };
    const g = (T.g = {});
    const fanStep = () => T.cw * .17;
    T.pile('h0', 'hand', {
      ghost: true,
      pos: (i, n, T) => {
        const step = Math.min(T.cw * .58, (T.W - 16 - T.cw) / Math.max(n - 1, 1)), w = T.cw + step * (n - 1);
        const m = i - (n - 1) / 2, id = T.byId.h0.cards[i];
        const lift = T.meta.sel.includes(id) ? T.ch * .24 : 0;
        return { x: (T.W - w) / 2 + i * step, y: T.H - T.ch - 22 + m * m * .45 - lift, r: +(m * 1.3).toFixed(1) };
      },
    });
    T.pile('h1', 'hand', { ghost: true, pos: (i, n, T) => ({ x: 6 + T.ch * .25 - T.cw / 2, y: g.cy - T.ch / 2 + (i - (n - 1) / 2) * fanStep(), r: 90, s: .5 }) });
    T.pile('h2', 'hand', { ghost: true, pos: (i, n, T) => ({ x: T.W / 2 - T.cw / 2 + (i - (n - 1) / 2) * fanStep(), y: 4 - T.ch / 4, s: .5 }) });
    T.pile('h3', 'hand', { ghost: true, pos: (i, n, T) => ({ x: T.W - 6 - T.ch * .25 - T.cw / 2, y: g.cy - T.ch / 2 + (i - (n - 1) / 2) * fanStep(), r: -90, s: .5 }) });
    const off = [[0, .4, -4], [-.78, 0, 8], [0, -.4, 3], [.78, 0, -7]];
    off.forEach(([dx, dy, r], p) => T.pile('t' + p, 'trick', { ghost: true, pos: (i, n, T) => ({ x: g.cx - T.cw / 2 + dx * T.cw, y: g.cy - T.ch / 2 + dy * T.ch, r, z: 1500 + T.meta.trick.findIndex((e) => e.p === p) }) }));
    const away = [[0, 1], [-1, 0], [0, -1], [1, 0]];
    away.forEach(([dx, dy], p) => T.pile('w' + p, 'won', { ghost: true, pos: (i, n, T) => ({ x: g.cx - T.cw / 2 + dx * (T.W / 2 + T.cw), y: g.cy - T.ch / 2 + dy * (T.H * .6), s: .4, o: 0 }) }));

    T.seats = PLAYERS.map((pl) => { const el = document.createElement('div'); el.className = 'seat'; T.board.appendChild(el); return el; });
    T.msg = document.createElement('div'); T.msg.className = 'hmsg'; T.board.appendChild(T.msg);
    T.btn = document.createElement('button'); T.btn.className = 'hbtn'; T.btn.hidden = true; T.board.appendChild(T.btn);
    T.btn.addEventListener('click', () => this.doPass(T));
  },
  layout(T, W, H) {
    const cw = Math.floor(Math.min(W / 5.2, H / 6.6, 96));
    T.cw = cw; T.ch = Math.round(cw * 1.4);
    T.g.cx = W / 2; T.g.cy = Math.min(H * .43, (H - T.ch * 1.6) / 2 + T.ch * .3);
    const s = T.seats, half = 6.5 * cw * .17 + T.ch * .25, handTop = H - T.ch - 22 - T.ch * .24;
    const place = (el, css) => { el.style.left = el.style.right = el.style.top = el.style.transform = ''; Object.assign(el.style, css); };
    place(s[0], { left: '50%', top: handTop - 34 + 'px', transform: 'translateX(-50%)' });
    place(s[1], { left: '6px', top: T.g.cy + half + 8 + 'px' });
    place(s[2], { left: '50%', top: T.ch / 2 + 10 + 'px', transform: 'translateX(-50%)' });
    place(s[3], { left: 'auto', right: '6px', top: T.g.cy + half + 8 + 'px' });
    T.msg.style.top = handTop - 62 + 'px';
    T.btn.style.top = Math.min(T.g.cy - 22, handTop - 112) + 'px';
  },
  deal(T, rand) {
    const ids = shuffle([...Array(52).keys()], rand);
    ids.forEach((id, k) => T.put(T.byId['h' + (k % 4)], id, k % 4 === 0));
    for (let p = 0; p < 4; p++) this.sort(T, p);
    Object.assign(T.meta, { pts: [0, 0, 0, 0], trick: [], played: [], sel: [], phase: 'deal', trickNo: 0, broken: false });
  },
  dealOrigin: (T) => ({ x: T.g.cx - T.cw / 2, y: T.g.cy - T.ch / 2 }),
  afterDeal(T) { this.startHand(T); },
  afterLoad(T) {
    const m = T.meta;
    if (m.phase === 'pass') this.startHand(T);
    else if (m.phase === 'play') { this.paint(T); if (m.trick.length === 4) setTimeout(() => this.collect(T), 500); else this.loop(T); }
    else if (m.phase === 'end') this.showEnd(T);
    else if (m.phase === 'scoring') this.endHand(T);
    else this.startHand(T);
  },
  status(T) {
    const m = T.meta;
    return { big: 'Manche ' + (m.hand + 1), small: `Toi : ${m.scores[0]} pt${m.scores[0] > 1 ? 's' : ''}` };
  },
  inProgress: (T) => T.meta.hand > 0 || T.meta.trickNo > 0 || T.meta.trick.length > 0,
  canPick: () => false,
  canDrop: () => false,
  won: () => false,

  // ----- Outils -----
  hand(T, p) { return T.byId['h' + p].cards.map((id) => T.cards[id]); },
  sort(T, p) {
    const h = T.byId['h' + p];
    h.cards.sort((a, b) => { const A = T.cards[a], B = T.cards[b]; return SUIT_ORDER[A.s] - SUIT_ORDER[B.s] || val(A) - val(B); });
  },
  legal(T, p) {
    const m = T.meta, hand = this.hand(T, p);
    if (!m.trick.length) {
      if (m.trickNo === 0) return hand.filter((c) => c.id === TWO_CLUBS);
      if (!m.broken) { const nh = hand.filter((c) => c.s !== 1); if (nh.length) return nh; }
      return hand;
    }
    const lead = T.cards[m.trick[0].id].s;
    const follow = hand.filter((c) => c.s === lead);
    if (follow.length) return follow;
    if (m.trickNo === 0) { const safe = hand.filter((c) => c.s !== 1 && c.id !== QS); if (safe.length) return safe; }
    return hand;
  },
  points: (c) => (c.s === 1 ? 1 : c.id === QS ? 13 : 0),

  // ----- Affichage -----
  paint(T) {
    const m = T.meta;
    T.seats.forEach((el, p) => {
      el.classList.toggle('turn', m.phase === 'play' && m.turn === p && m.trick.length < 4);
      el.innerHTML = `<i>${PLAYERS[p].face}</i><span>${PLAYERS[p].name}</span><b>${m.scores[p]}</b>${m.pts[p] ? `<em>+${m.pts[p]}</em>` : ''}`;
    });
    const mine = m.phase === 'play' && m.turn === 0 && m.trick.length < 4;
    const ok = mine ? new Set(this.legal(T, 0).map((c) => c.id)) : null;
    for (const id of T.byId.h0.cards) T.cards[id].el.classList.toggle('dim', !!ok && !ok.has(id));
    if (m.phase === 'pass') {
      T.msg.textContent = `Choisis 3 cartes à donner ${PASS_TXT[PASS[m.hand % 4]]}`;
      T.btn.hidden = false; T.btn.disabled = m.sel.length !== 3;
      T.btn.textContent = m.sel.length === 3 ? 'Donner ces 3 cartes' : `${m.sel.length} / 3 cartes`;
    } else {
      T.btn.hidden = true;
      T.msg.textContent = mine ? (m.trickNo === 0 && !m.trick.length ? 'À toi : ouvre avec le 2 de trèfle' : 'À toi de jouer') : '';
    }
    T.render();
    T.ui.update();
  },

  // ----- Déroulé d'une manche -----
  startHand(T) {
    const m = T.meta, dir = PASS[m.hand % 4];
    if (dir) { m.phase = 'pass'; m.sel = m.sel.filter((id) => T.byId.h0.cards.includes(id)); }
    else return this.beginPlay(T);
    T.persist();
    this.paint(T);
  },
  doPass(T) {
    const m = T.meta;
    if (m.phase !== 'pass' || m.sel.length !== 3) return;
    const dir = PASS[m.hand % 4];
    const gifts = [m.sel.slice(), ...[1, 2, 3].map((p) => this.aiPass(T, p))];
    m.phase = 'passing';
    T.btn.hidden = true; T.msg.textContent = '';
    gifts.forEach((ids, p) => {
      const to = T.byId['h' + ((p + dir) % 4)];
      for (const id of ids) {
        const from = T.byId['h' + p];
        from.cards.splice(from.cards.indexOf(id), 1);
        to.cards.push(id);
        const c = T.cards[id]; c.pile = to; c.up = to.id === 'h0';
        T.moving.push(id);
      }
    });
    for (let p = 0; p < 4; p++) this.sort(T, p);
    m.sel = gifts[(4 - dir) % 4].slice();  // les cartes reçues restent levées un instant
    this.paint(T);
    setTimeout(() => { m.sel = []; this.beginPlay(T); }, 1500);
  },
  beginPlay(T) {
    const m = T.meta;
    m.phase = 'play'; m.trickNo = 0; m.trick = []; m.sel = [];
    m.turn = [0, 1, 2, 3].find((p) => T.byId['h' + p].cards.includes(TWO_CLUBS));
    T.persist();
    this.paint(T);
    this.loop(T);
  },
  loop(T) {
    const m = T.meta;
    if (m.phase !== 'play' || m.trick.length === 4) return;
    if (m.turn === 0) return;
    clearTimeout(T.aiTimer);
    T.aiTimer = setTimeout(() => this.play(T, m.turn, this.choose(T, m.turn)), 560);
  },
  play(T, p, id) {
    const m = T.meta, h = T.byId['h' + p];
    if (T.stopped) return;
    h.cards.splice(h.cards.indexOf(id), 1);
    const c = T.cards[id], t = T.byId['t' + p];
    t.cards.push(id); c.pile = t; c.up = true;
    T.moving.push(id);
    m.trick.push({ p, id });
    m.played.push(id);
    m.sel = [];
    if (c.s === 1) m.broken = true;
    if (m.trick.length === 4) {
      m.turn = -1;
      this.paint(T);
      T.persist();
      setTimeout(() => this.collect(T), 950);
      return;
    }
    m.turn = (p + 1) % 4;
    this.paint(T);
    T.persist();
    this.loop(T);
  },
  winner(T) {
    const m = T.meta, lead = T.cards[m.trick[0].id].s;
    let best = m.trick[0];
    for (const e of m.trick) { const c = T.cards[e.id]; if (c.s === lead && val(c) > val(T.cards[best.id])) best = e; }
    return best.p;
  },
  collect(T) {
    if (T.stopped) return;
    const m = T.meta, w = this.winner(T);
    const wc = T.cards[m.trick.find((e) => e.p === w).id];
    wc.el.classList.add('win');
    setTimeout(() => {
      if (T.stopped) return;
      wc.el.classList.remove('win');
      for (const e of m.trick) {
        const c = T.cards[e.id], from = T.byId['t' + e.p];
        m.pts[w] += this.points(c);
        T.moveCards(from, 0, T.byId['w' + w], false);
      }
      m.trick = []; m.trickNo++; m.turn = w;
      if (m.trickNo === 13) { m.phase = 'scoring'; this.paint(T); setTimeout(() => this.endHand(T), 700); return; }
      this.paint(T);
      T.persist();
      this.loop(T);
    }, 450);
  },
  endHand(T) {
    const m = T.meta;
    const moon = m.pts.indexOf(26);
    const add = moon >= 0 ? m.pts.map((_, p) => (p === moon ? 0 : 26)) : m.pts.slice();
    m.last = add; m.moon = moon;
    m.scores = m.scores.map((s, p) => s + add[p]);
    m.phase = 'end';
    T.persist();
    this.paint(T);
    this.showEnd(T);
  },
  showEnd(T) {
    const m = T.meta, over = Math.max(...m.scores) >= 100, best = Math.min(...m.scores);
    const rows = PLAYERS.map((pl, p) => `<tr class="${p === 0 ? 'me' : ''} ${over && m.scores[p] === best ? 'best' : ''}"><td>${pl.face} ${pl.name}</td><td>+${m.last[p]}</td><td><b>${m.scores[p]}</b></td></tr>`).join('');
    let title = `Fin de la manche ${m.hand + 1}`, text = '';
    if (m.moon >= 0) text = m.moon === 0 ? 'Grand chelem ! Tu as tout ramassé : 26 points pour chacun des autres.' : `${PLAYERS[m.moon].name} a fait grand chelem : 26 points pour tous les autres.`;
    else if (m.last[0] === 0) text = 'Aucun point pour toi cette manche, bien joué.';
    else if (T.byId.w0.cards.includes(QS)) text = 'Aïe, la Dame de pique est pour toi.';
    if (over) {
      const iWin = m.scores[0] === best;
      title = iWin ? 'Victoire !' : 'Partie terminée';
      text = iWin ? 'Tu finis avec le plus petit score.' : `${PLAYERS[m.scores.indexOf(best)].name} l’emporte avec ${best} points.`;
      if (!T.won) { T.won = true; T.ui.record(this.id, iWin, { score: m.scores[0] }); if (iWin) Fx.confetti(); }
      T.persist();
    }
    T.ui.show(`<h2 class="${over && m.scores[0] === best ? 'wintitle' : ''}">${title}</h2>${text ? `<p>${text}</p>` : ''}
      <table class="scores"><tr><th>Joueur</th><th>Manche</th><th>Total</th></tr>${rows}</table>`,
    [over ? { label: 'Nouvelle partie', fn: () => T.ui.newGame(true) } : { label: 'Manche suivante', fn: () => this.nextHand(T) }]);
  },
  nextHand(T) {
    const m = T.meta;
    if (m.phase !== 'end') return;
    m.hand++;
    for (const p of T.piles) p.cards = [];
    this.deal(T, makeRng(T.seed + m.hand * 7919));
    T.dealFrom(T.g.cx - T.cw / 2, T.g.cy - T.ch / 2, this.dealStagger);
    this.paint(T);
  },

  // ----- Interaction -----
  tap(T, p, i) {
    const m = T.meta;
    if (p.id !== 'h0' || i < 0) return true;
    const id = p.cards[i];
    if (m.phase === 'pass') {
      const k = m.sel.indexOf(id);
      if (k >= 0) m.sel.splice(k, 1); else if (m.sel.length < 3) m.sel.push(id); else return false;
      this.paint(T);
      return true;
    }
    if (m.phase !== 'play' || m.turn !== 0 || m.trick.length === 4) return true;
    if (!this.legal(T, 0).some((c) => c.id === id)) {
      const lead = m.trick.length ? T.cards[m.trick[0].id].s : -1;
      T.ui.toast(m.trickNo === 0 && !m.trick.length ? 'Il faut ouvrir avec le 2 de trèfle'
        : lead >= 0 ? `Tu dois fournir à ${SUIT_NAMES[lead]}` : m.trickNo === 0 ? 'Pas de points au premier pli' : 'Les cœurs ne sont pas encore ouverts');
      return false;
    }
    if (m.sel.includes(id)) this.play(T, 0, id);
    else { m.sel = [id]; this.paint(T); }
    return true;
  },
  hint(T) {
    const m = T.meta;
    if (m.phase === 'pass') { m.sel = this.aiPass(T, 0); this.paint(T); return { done: true, msg: 'Voici les 3 cartes que je donnerais' }; }
    if (m.phase === 'play' && m.turn === 0) { m.sel = [this.choose(T, 0)]; this.paint(T); return { done: true, msg: 'Touche-la encore pour la jouer' }; }
    return { done: true, msg: 'Patience, ce n’est pas ton tour' };
  },

  // ----- Adversaires -----
  aiPass(T, p) {
    const hand = this.hand(T, p), count = [0, 0, 0, 0];
    hand.forEach((c) => count[c.s]++);
    const longSpades = count[0] >= 5;
    const score = (c) => {
      if (c.id === QS) return longSpades ? 6 : 60;
      if (c.s === 0 && val(c) > 12) return longSpades ? 4 : 45;
      let s = val(c) + (c.s === 1 ? 5 : 0);
      if (c.s !== 0 && count[c.s] <= 3) s += 5;
      return s;
    };
    return hand.sort((a, b) => score(b) - score(a)).slice(0, 3).map((c) => c.id);
  },
  choose(T, p) {
    const m = T.meta, L = this.legal(T, p), hand = this.hand(T, p);
    if (L.length === 1) return L[0].id;
    const qsOut = m.played.includes(QS), hasQS = hand.some((c) => c.id === QS);
    const hi = (arr) => arr.reduce((a, c) => (val(c) > val(a) ? c : a));
    const lo = (arr) => arr.reduce((a, c) => (val(c) < val(a) ? c : a));
    const notQS = (arr) => (arr.some((c) => c.id !== QS) ? arr.filter((c) => c.id !== QS) : arr);
    if (!m.trick.length) {
      const count = [0, 0, 0, 0];
      hand.forEach((c) => count[c.s]++);
      const score = (c) => {
        let s = val(c) + count[c.s] * .3;
        if (c.s === 1) s += 8;
        if (c.s === 0) {
          if (hasQS) s += 20;
          else if (!qsOut && val(c) >= 13) s += 30;
          else if (!qsOut) s -= 3;
        }
        return s;
      };
      return L.reduce((a, c) => (score(c) < score(a) ? c : a)).id;
    }
    const lead = T.cards[m.trick[0].id].s;
    const inLead = m.trick.map((e) => T.cards[e.id]).filter((c) => c.s === lead);
    const top = Math.max(...inLead.map(val));
    const pts = m.trick.reduce((a, e) => a + this.points(T.cards[e.id]), 0);
    const last = m.trick.length === 3;
    if (L[0].s === lead) {
      if (lead === 0 && hasQS && top > 12) return QS;
      const under = L.filter((c) => val(c) < top);
      if (under.length) return hi(under).id;
      if (last) return hi(notQS(L)).id;
      if (pts === 0 && lead !== 1 && !(lead === 0 && !qsOut)) return hi(notQS(L)).id;
      return lo(L).id;
    }
    if (L.some((c) => c.id === QS)) return QS;
    if (!qsOut) { const big = L.filter((c) => c.s === 0 && val(c) > 12); if (big.length) return hi(big).id; }
    const hearts = L.filter((c) => c.s === 1);
    if (hearts.length) return hi(hearts).id;
    const count = [0, 0, 0, 0];
    hand.forEach((c) => count[c.s]++);
    return L.reduce((a, c) => (val(c) - count[c.s] * .5 > val(a) - count[a.s] * .5 ? c : a)).id;
  },
};
