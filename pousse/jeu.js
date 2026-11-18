// Pousse-pièces : rendu en perspective, sons, bonus, missions, collection et sauvegarde.
// La physique est dans physique.js.
(function () {
  'use strict';

  const { C, TYPES, Monde } = window.Physique;
  const W = C.W, L = C.L;
  const MUR_H = C.HP + 78;     // hauteur du mur du fond
  const COTE_H = 34;           // hauteur des parois latérales à l'avant
  const BAC_Z = -58;           // fond du bac de gain
  const PORTE_L = 20;          // largeur de la porte bonus
  const CLE = 'pousse.v1';
  const PLAFOND = 30;          // le porte-monnaie se recharge seul jusqu'à ce nombre
  const RECHARGE_MS = 20000;
  const CADENCE = 0.3;         // secondes entre deux pièces quand on garde le doigt appuyé

  const $ = (s) => document.querySelector(s);
  const alea = Math.random;

  // ---------- Contenu ----------
  const SERIES = [
    { nom: 'Fête foraine', t: ['🎡', '🎠', '🎪', '🎢'], poids: 1, coul: ['#ff6f9c', '#b0124a'] },
    { nom: 'Gourmandises', t: ['🍭', '🍿', '🧁', '🍬'], poids: 1, coul: ['#6fe0ff', '#0f6f99'] },
    { nom: 'Doudous', t: ['🧸', '🦄', '🐙', '🦊'], poids: 1, coul: ['#b79bff', '#4b23a8'] },
    { nom: 'Précieux', t: ['💎', '👑', '🏆', '🔮'], poids: 0.35, coul: ['#ffe066', '#a86a00'] },
  ];
  const LOTS = [
    { id: 'pluie', ico: '🪙', nom: 'Pluie de pièces', p: 30, txt: '6 pièces offertes tombent du lanceur' },
    { id: 'geante', ico: '🌕', nom: 'Pièce géante', p: 14, txt: 'une pièce qui vaut 10' },
    { id: 'murs', ico: '🧱', nom: 'Remparts', p: 11, txt: 'les trous sont fermés 25 s' },
    { id: 'turbo', ico: '⚡', nom: 'Turbo', p: 12, txt: 'le poussoir va plus vite et plus loin 30 s' },
    { id: 'x2', ico: '✨', nom: 'Gains ×2', p: 9, txt: 'chaque pièce gagnée compte double 15 s' },
    { id: 'tresor', ico: '🎁', nom: 'Trésor', p: 9, txt: 'une capsule à faire tomber' },
    { id: 'sec', ico: '💥', nom: 'Secousse', p: 8, txt: 'une secousse de plus en réserve' },
    { id: 'jackpot', ico: '🎰', nom: 'Jackpot', p: 2, txt: '20 pièces et une géante' },
  ];
  const MODELES = [
    { k: 'gagner', txt: (n) => `Fais tomber ${n} pièces`, n: (v) => 40 + 15 * v, r: (v) => 4 + v },
    { k: 'porte', txt: (n) => n > 1 ? `Passe ${n} pièces par la porte bonus` : 'Passe une pièce par la porte bonus', n: (v) => 2 + Math.floor(v / 2), r: (v) => 6 + v },
    { k: 'cascade', txt: (n) => `Réussis une cascade de ${n} pièces`, n: (v) => Math.min(5 + Math.floor(v / 2), 15), r: (v) => 6 + v, max: true },
    { k: 'tours', txt: (n) => `Fais tourner la roue ${n} fois`, n: (v) => 2 + Math.floor(v / 3), r: (v) => 5 + v },
    { k: 'geante', txt: () => 'Fais tomber une pièce géante', n: () => 1, r: (v) => 8 + v },
    { k: 'tresor', txt: () => 'Récupère un trésor', n: () => 1, r: (v) => 10 + 2 * v },
    { k: 'sansperte', txt: (n) => `Fais tomber ${n} pièces d'affilée sans en perdre dans les trous`, n: (v) => 15 + 4 * v, r: (v) => 6 + v },
    { k: 'lances', txt: (n) => `Lance ${n} pièces`, n: (v) => 60 + 20 * v, r: (v) => 3 + v },
  ];
  const besoinXp = (n) => Math.round(80 * Math.pow(n, 1.5));

  // ---------- Sauvegarde ----------
  function neuf() {
    return {
      porte: 40, xp: 0, niv: 1, tours: 0, sec: 1, coll: {}, missions: [], nouveau: false,
      stats: { lances: 0, gagnes: 0, perdus: 0, cascade: 0, tours: 0, tresors: 0, porte: 0, geantes: 0 },
      recharge: Date.now(), jour: '', son: true, vu: false,
      eff: { murs: 0, turbo: 0, x2: 0 }, plateau: null, attente: [],
    };
  }
  function charger() {
    try {
      const s = JSON.parse(localStorage.getItem(CLE));
      if (s && typeof s === 'object') {
        const n = neuf();
        return Object.assign(n, s, { stats: Object.assign(n.stats, s.stats), eff: Object.assign(n.eff, s.eff) });
      }
    } catch (e) { /* sauvegarde illisible : on repart de zéro */ }
    return neuf();
  }
  const S = charger();
  let sale = false;
  function sauver() {
    S.plateau = monde.exporter();
    try { localStorage.setItem(CLE, JSON.stringify(S)); } catch (e) { /* stockage plein ou interdit */ }
    sale = false;
  }

  // ---------- Sons (synthétisés, aucun fichier) ----------
  const Son = {
    ctx: null, b: {}, dernier: 0,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.sortie = ctx.createGain(); this.sortie.gain.value = 0.8; this.sortie.connect(ctx.destination);
      const sr = ctx.sampleRate;
      const tampon = (dur, f) => {
        const n = Math.floor(dur * sr), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = f(i / sr);
        return b;
      };
      const metal = (f0, parts, t, bruit) => {
        let s = 0;
        for (const [m, a, k] of parts) s += a * Math.sin(2 * Math.PI * f0 * m * t) * Math.exp(-k * t);
        if (t < 0.004) s += (Math.random() * 2 - 1) * bruit * (1 - t / 0.004);
        return s * 0.35;
      };
      const P1 = [[1, 1, 30], [2.32, 0.55, 42], [3.94, 0.35, 60], [5.12, 0.2, 80]];
      this.b.clic = tampon(0.22, (t) => metal(3100, P1, t, 0.6));
      // Pièce qui tombe dans le bac : deux rebonds
      this.b.tinte = tampon(0.5, (t) => metal(2050, [[1, 1, 9], [2.76, 0.5, 14], [5.4, 0.25, 22]], t, 0.5) + (t > 0.07 ? 0.55 * metal(2050, [[1, 1, 12], [2.76, 0.4, 18]], t - 0.07, 0.3) : 0));
      this.b.bonk = tampon(0.3, (t) => (Math.sin(2 * Math.PI * 140 * t) * Math.exp(-14 * t) + (Math.random() * 2 - 1) * Math.exp(-40 * t) * 0.4) * 0.5);
      this.b.tic = tampon(0.03, (t) => Math.sign(Math.sin(2 * Math.PI * 1400 * t)) * Math.exp(-120 * t) * 0.18);
      this.b.gronde = tampon(1.4, (t) => (Math.random() * 2 - 1) * 0.35 * Math.min(1, t * 8) * Math.exp(-1.6 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 9 * t)));
      this.b.lance = tampon(0.12, (t) => (Math.random() * 2 - 1) * Math.exp(-50 * t) * 0.25 + Math.sin(2 * Math.PI * 900 * t) * Math.exp(-60 * t) * 0.2);
    },
    jouer(nom, vol, vit, delai) {
      if (!S.son || !this.ctx || !this.b[nom]) return;
      const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
      s.buffer = this.b[nom]; s.playbackRate.value = vit || 1; g.gain.value = vol;
      s.connect(g); g.connect(this.sortie);
      s.start(this.ctx.currentTime + (delai || 0));
    },
    choc(f) {
      const t = performance.now();
      if (t - this.dernier < 32) return;
      this.dernier = t;
      this.jouer('clic', Math.min(0.5, f / 2500), 0.85 + alea() * 0.35);
    },
    fanfare(grande) {
      const notes = grande ? [1, 1.26, 1.5, 2, 1.5, 2, 2.52] : [1, 1.26, 1.5, 2];
      notes.forEach((r, i) => this.jouer('tinte', 0.35, r * 0.9, i * 0.085));
    },
  };

  // ---------- Caméra et perspective ----------
  const cv = $('#cv'), ctx = cv.getContext('2d');
  const E = { x: W / 2, y: L + 235, z: 285 };
  let fy, fz, uy, uz;
  function camera(ez) {
    E.z = ez;
    const dy = L * 0.38 - E.y, dz = -E.z, n = Math.hypot(dy, dz);
    fy = dy / n; fz = dz / n; uy = fz; uz = -fy;
  }
  let K = 1, OX = 0, OY = 0, DPR = 1, CW = 0, CH = 0, FR = 0, U = 1;
  let PX = 0, PY = 0, PS = 0, PA = 0;
  function proj(x, y, z) {
    const dx = x - E.x, dy = y - E.y, dz = z - E.z;
    const cz = dy * fy + dz * fz, cy = dy * uy + dz * uz, s = K / cz;
    PX = OX + dx * s; PY = OY - cy * s; PS = s;
    PA = (E.z - z) / Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  function pt(x, y, z) { proj(x, y, z); return [PX, PY]; }
  function poly(pts) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  }
  // Du doigt vers le plateau : abscisse visée.
  function versPlateau(cx, cy) {
    const r = cv.getBoundingClientRect();
    const sx = ((cx - r.left) * DPR - OX) / K, sy = -((cy - r.top) * DPR - OY) / K;
    const dy = fy + sy * uy, dz = fz + sy * uz;
    let t = -E.z / dz;
    if (!(t > 0) || E.y + t * dy < 0) t = -E.y / dy;
    const x = E.x + t * sx;
    return Math.max(14, Math.min(W - 14, x));
  }

  // ---------- Images préparées ----------
  function toile(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const SP = {};
  function preparerSprites() {
    const T = 128;
    const face = (type, v) => {
      const c = toile(T, T), g = c.getContext('2d'), m = T / 2;
      const or = type !== 'etoile';
      // Disque
      let gr = g.createRadialGradient(m - 18 + v * 8, m - 22 + v * 5, 4, m, m, m);
      gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.25, '#ffd955'); gr.addColorStop(0.7, '#e3a516'); gr.addColorStop(1, '#a06a06');
      g.fillStyle = gr; g.beginPath(); g.arc(m, m, m - 1, 0, 7); g.fill();
      // Listel
      g.lineWidth = T * 0.055; g.strokeStyle = 'rgba(255,240,170,.9)';
      g.beginPath(); g.arc(m, m, m - T * 0.06, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
      g.strokeStyle = 'rgba(110,62,0,.65)';
      g.beginPath(); g.arc(m, m, m - T * 0.06, Math.PI * 1.9, Math.PI * 2.9); g.stroke();
      g.lineWidth = T * 0.018; g.strokeStyle = 'rgba(120,70,0,.55)';
      g.beginPath(); g.arc(m, m, m - T * 0.13, 0, 7); g.stroke();
      if (type === 'geante') {
        // Crénelage et « 10 »
        g.strokeStyle = 'rgba(120,70,0,.45)'; g.lineWidth = 2;
        for (let a = 0; a < 48; a++) {
          const an = a / 48 * Math.PI * 2;
          g.beginPath(); g.moveTo(m + Math.cos(an) * (m - 4), m + Math.sin(an) * (m - 4)); g.lineTo(m + Math.cos(an) * (m - 10), m + Math.sin(an) * (m - 10)); g.stroke();
        }
        g.font = `900 ${T * 0.42}px -apple-system, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = 'rgba(255,245,200,.85)'; g.fillText('10', m + 2, m + 4);
        g.fillStyle = 'rgba(130,75,0,.85)'; g.fillText('10', m, m + 2);
      } else if (!or) {
        // Pièce étoile : émail rouge, étoile dorée
        gr = g.createRadialGradient(m - 10, m - 14, 2, m, m, m * 0.78);
        gr.addColorStop(0, '#ff8a8a'); gr.addColorStop(0.5, '#e3263f'); gr.addColorStop(1, '#7d0618');
        g.fillStyle = gr; g.beginPath(); g.arc(m, m, m * 0.78, 0, 7); g.fill();
        etoile(g, m, m, m * 0.6, m * 0.26, '#ffe27a', 'rgba(120,60,0,.6)');
      } else {
        // Motif en relief : soleil ou étoile selon la variante
        g.save(); g.translate(m, m); g.rotate(v * 2.1);
        if (v === 2) etoile(g, 0, 0, m * 0.5, m * 0.22, 'rgba(255,236,150,.55)', 'rgba(120,70,0,.55)');
        else {
          g.strokeStyle = 'rgba(130,78,0,.5)'; g.lineWidth = T * 0.022;
          for (let a = 0; a < 12; a++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(m * 0.22, 0); g.lineTo(m * 0.52, 0); g.stroke(); }
          g.fillStyle = 'rgba(255,238,160,.55)'; g.beginPath(); g.arc(0, 0, m * 0.17, 0, 7); g.fill();
          g.strokeStyle = 'rgba(130,78,0,.5)'; g.stroke();
        }
        g.restore();
      }
      // Reflet
      gr = g.createLinearGradient(0, 0, T, T);
      gr.addColorStop(0.18, 'rgba(255,255,255,0)'); gr.addColorStop(0.32, 'rgba(255,255,255,.38)'); gr.addColorStop(0.42, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(m, m, m - 1, 0, 7); g.fill();
      return c;
    };
    function etoile(g, x, y, R, r, f, s) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R;
        g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
      }
      g.closePath(); g.fillStyle = f; g.fill(); g.lineWidth = 2; g.strokeStyle = s; g.stroke();
    }
    const bord = (c1, c2, c3) => {
      const c = toile(T, T), g = c.getContext('2d'), m = T / 2;
      const gr = g.createLinearGradient(0, 0, T, 0);
      gr.addColorStop(0, c1); gr.addColorStop(0.35, c2); gr.addColorStop(1, c3);
      g.fillStyle = gr; g.beginPath(); g.arc(m, m, m - 1, 0, 7); g.fill();
      // stries de la tranche
      g.globalAlpha = 0.25; g.strokeStyle = '#3d2500'; g.lineWidth = 1.5;
      for (let x = 4; x < T; x += 6) { g.beginPath(); g.moveTo(x, m); g.lineTo(x, T); g.stroke(); }
      return c;
    };
    SP.piece = [0, 1, 2].map((v) => face('piece', v));
    SP.etoile = [0, 1, 2].map((v) => face('etoile', v));
    SP.geante = [0, 1, 2].map((v) => face('geante', v));
    SP.bord = bord('#c98a0e', '#ffd24a', '#6b4300');
    const om = toile(64, 64), g = om.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(0.55, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    SP.ombre = om;
    // Ampoules
    const amp = (on) => {
      const c = toile(48, 48), g = c.getContext('2d');
      if (on) {
        let gr = g.createRadialGradient(24, 24, 2, 24, 24, 24);
        gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.25, 'rgba(255,200,80,.85)'); gr.addColorStop(1, 'rgba(255,140,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
      }
      const gr2 = g.createRadialGradient(21, 20, 1, 24, 24, 8);
      gr2.addColorStop(0, on ? '#fffbe6' : '#a58a6a'); gr2.addColorStop(1, on ? '#ffb020' : '#4a3424');
      g.fillStyle = gr2; g.beginPath(); g.arc(24, 24, 7, 0, 7); g.fill();
      return c;
    };
    SP.ampOn = amp(true); SP.ampOff = amp(false);
  }
  const EMO = {};
  function emoji(e) {
    if (!EMO[e]) {
      const c = toile(80, 80), g = c.getContext('2d');
      g.font = '60px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(e, 40, 44);
      EMO[e] = c;
    }
    return EMO[e];
  }

  // ---------- Décor fixe (dessiné une fois par taille d'écran) ----------
  let fond = null, verre = null, ampoules = [], fenetre = null;
  const coteZ = (y) => MUR_H + (COTE_H - MUR_H) * (y / L);

  function mise() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    CW = Math.max(1, Math.round(r.width * DPR)); CH = Math.max(1, Math.round(r.height * DPR));
    cv.width = CW; cv.height = CH;
    U = DPR;
    // Sur un écran haut, la caméra monte pour que le plateau occupe la place libre.
    const marge = 6 * U, frMin = 96 * U, frVoulu = 124 * U;
    let fit = null;
    for (let ez = 250; ez <= 640; ez += 10) {
      camera(ez);
      K = 1; OX = 0; OY = 0;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of [[0, 0, MUR_H], [W, 0, MUR_H], [0, L, 0], [W, L, 0], [0, L, COTE_H], [W, L, COTE_H], [0, L + 46, BAC_Z], [W, L + 46, BAC_Z]]) {
        proj(p[0], p[1], p[2]);
        x0 = Math.min(x0, PX); x1 = Math.max(x1, PX); y0 = Math.min(y0, PY); y1 = Math.max(y1, PY);
      }
      const k = Math.min((CW - 2 * marge) / (x1 - x0), (CH - frMin - marge) / (y1 - y0));
      fit = { ez, k, x0, x1, y0, y1, fr: CH - marge - k * (y1 - y0) };
      if (fit.fr <= frVoulu) break;
    }
    camera(fit.ez);
    K = fit.k;
    OX = CW / 2 - K * (fit.x0 + fit.x1) / 2;
    FR = Math.min(170 * U, fit.fr);
    OY = FR - K * fit.y0;
    dessinerFond();
  }

  function dessinerFond() {
    fond = toile(CW, CH);
    const g = fond.getContext('2d');
    const sauve = ctx;
    // On dessine avec les mêmes fonctions que l'image animée, sur la toile du fond.
    const c = g;
    const P = (x, y, z) => pt(x, y, z);
    const polyg = (pts) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };

    // Meuble
    let gr = c.createLinearGradient(0, 0, 0, CH);
    gr.addColorStop(0, '#2a0f3d'); gr.addColorStop(0.5, '#170a26'); gr.addColorStop(1, '#0c0614');
    c.fillStyle = gr; c.fillRect(0, 0, CW, CH);

    // Montants latéraux (velours rouge, filet doré) sous les parois
    const gH = P(0, 0, MUR_H), gB = P(0, L, COTE_H), gBas = P(0, L + 46, BAC_Z);
    const dH = P(W, 0, MUR_H), dB = P(W, L, COTE_H), dBas = P(W, L + 46, BAC_Z);
    for (const [h, b, bas, s] of [[gH, gB, gBas, -1], [dH, dB, dBas, 1]]) {
      const bord = s < 0 ? 0 : CW;
      polyg([[h[0], h[1]], [b[0], b[1]], [bas[0], CH], [bord, CH], [bord, h[1]]]);
      gr = c.createLinearGradient(bord, 0, h[0], 0);
      gr.addColorStop(0, '#3d0716'); gr.addColorStop(1, '#7a0f2a');
      c.fillStyle = gr; c.fill();
    }

    // Mur du fond (miroir chromé)
    const m0 = P(0, 0, 0), m1 = P(W, 0, 0), m2 = P(W, 0, MUR_H), m3 = P(0, 0, MUR_H);
    polyg([m0, m1, m2, m3]);
    gr = c.createLinearGradient(0, m3[1], 0, m0[1]);
    gr.addColorStop(0, '#59607a'); gr.addColorStop(0.3, '#c9cfe0'); gr.addColorStop(0.55, '#7e869e'); gr.addColorStop(1, '#2d3142');
    c.fillStyle = gr; c.fill();
    // reflets verticaux
    c.save(); polyg([m0, m1, m2, m3]); c.clip();
    for (let i = 0; i < 7; i++) {
      const x = W * (0.08 + i * 0.14);
      const a = P(x, 0, MUR_H), b = P(x + 10, 0, MUR_H), d = P(x - 14, 0, 0), e = P(x - 24, 0, 0);
      polyg([a, b, d, e]); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill();
    }
    c.restore();
    // Rail du lanceur
    const r0 = P(0, 0, C.CHUTE_Z + 9), r1 = P(W, 0, C.CHUTE_Z + 9), r2 = P(W, 0, C.CHUTE_Z - 9), r3 = P(0, 0, C.CHUTE_Z - 9);
    polyg([r0, r1, r2, r3]);
    gr = c.createLinearGradient(0, r0[1], 0, r3[1]);
    gr.addColorStop(0, '#0b0710'); gr.addColorStop(0.5, '#23142f'); gr.addColorStop(1, '#0b0710');
    c.fillStyle = gr; c.fill();
    c.lineWidth = 1.5 * U; c.strokeStyle = '#ffcf4a';
    c.beginPath(); c.moveTo(r0[0], r0[1]); c.lineTo(r1[0], r1[1]); c.moveTo(r3[0], r3[1]); c.lineTo(r2[0], r2[1]); c.stroke();
    // Bandeau sous le rail
    const t0 = P(0, 0, C.CHUTE_Z - 13), t1 = P(W, 0, C.CHUTE_Z - 13), t2 = P(W, 0, C.HP + 3), t3 = P(0, 0, C.HP + 3);
    polyg([t0, t1, t2, t3]);
    gr = c.createLinearGradient(0, t0[1], 0, t3[1]);
    gr.addColorStop(0, '#b3122e'); gr.addColorStop(1, '#5e0718');
    c.fillStyle = gr; c.fill();
    c.fillStyle = 'rgba(255,214,120,.85)';
    c.font = `800 ${Math.round((t3[1] - t0[1]) * 0.42)}px -apple-system, system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('★  VISE LA PORTE BONUS  ★', (t0[0] + t1[0]) / 2, (t0[1] + t3[1]) / 2 + U);

    // Plateau
    const p0 = P(0, 0, 0), p1 = P(W, 0, 0), p2 = P(W, L, 0), p3 = P(0, L, 0);
    polyg([p0, p1, p2, p3]);
    gr = c.createLinearGradient(0, p0[1], 0, p3[1]);
    gr.addColorStop(0, '#0d1240'); gr.addColorStop(0.55, '#1c2a78'); gr.addColorStop(1, '#2a3c9c');
    c.fillStyle = gr; c.fill();
    c.save(); polyg([p0, p1, p2, p3]); c.clip();
    // Soleil imprimé, rayons depuis le bord avant
    const centre = P(W / 2, L + 20, 0);
    for (let i = 0; i < 18; i++) {
      const a0 = Math.PI + (i / 18) * Math.PI, a1 = Math.PI + ((i + 0.5) / 18) * Math.PI;
      const q0 = P(W / 2 + Math.cos(a0) * 600, L + 20 + Math.sin(a0) * 600, 0);
      const q1 = P(W / 2 + Math.cos(a1) * 600, L + 20 + Math.sin(a1) * 600, 0);
      polyg([centre, q0, q1]); c.fillStyle = 'rgba(120,150,255,.07)'; c.fill();
    }
    // Arcs
    for (const [R, col] of [[70, 'rgba(255,207,74,.35)'], [150, 'rgba(255,207,74,.2)'], [230, 'rgba(255,207,74,.12)']]) {
      c.beginPath();
      for (let a = 0; a <= 40; a++) {
        const an = Math.PI + a / 40 * Math.PI, q = P(W / 2 + Math.cos(an) * R, L + 20 + Math.sin(an) * R, 0);
        a ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]);
      }
      c.lineWidth = 2 * U; c.strokeStyle = col; c.stroke();
    }
    // Lumière du spot
    proj(W / 2, L * 0.62, 0);
    gr = c.createRadialGradient(PX, PY, 0, PX, PY, CW * 0.6);
    gr.addColorStop(0, 'rgba(255,230,180,.18)'); gr.addColorStop(1, 'rgba(255,230,180,0)');
    c.fillStyle = gr; c.fillRect(0, 0, CW, CH);
    c.restore();

    // Trous de la maison
    for (const xs of [0, W - C.TROU_L]) {
      const h = [P(xs, L - C.TROU_P, 0), P(xs + C.TROU_L, L - C.TROU_P, 0), P(xs + C.TROU_L, L, 0), P(xs, L, 0)];
      polyg(h);
      gr = c.createLinearGradient(0, h[0][1], 0, h[3][1]);
      gr.addColorStop(0, '#000'); gr.addColorStop(1, '#14060c');
      c.fillStyle = gr; c.fill();
      c.lineWidth = 2 * U; c.strokeStyle = '#ffb300'; c.setLineDash([5 * U, 4 * U]);
      c.beginPath(); c.moveTo(h[0][0], h[0][1]); c.lineTo(h[1][0], h[1][1]); c.lineTo(h[2][0], h[2][1]); c.stroke();
      c.setLineDash([]);
    }

    // Parois latérales en verre
    for (const x of [0, W]) {
      const q = [P(x, 0, 0), P(x, L, 0), P(x, L, COTE_H), P(x, 0, MUR_H)];
      polyg(q);
      gr = c.createLinearGradient(0, q[3][1], 0, q[1][1]);
      gr.addColorStop(0, 'rgba(150,190,255,.20)'); gr.addColorStop(1, 'rgba(150,190,255,.07)');
      c.fillStyle = gr; c.fill();
      c.lineWidth = 2 * U; c.strokeStyle = 'rgba(200,225,255,.55)';
      c.beginPath(); c.moveTo(q[3][0], q[3][1]); c.lineTo(q[2][0], q[2][1]); c.stroke();
      c.strokeStyle = 'rgba(255,207,74,.8)';
      c.beginPath(); c.moveTo(q[0][0], q[0][1]); c.lineTo(q[1][0], q[1][1]); c.stroke();
    }

    // Bac de gain sous le bord avant
    const b0 = P(0, L, -5), b1 = P(W, L, -5), b2 = P(W, L, BAC_Z), b3 = P(0, L, BAC_Z);
    polyg([b0, b1, b2, b3]);
    gr = c.createLinearGradient(0, b0[1], 0, b3[1]);
    gr.addColorStop(0, '#05030a'); gr.addColorStop(1, '#1c0b1e');
    c.fillStyle = gr; c.fill();
    const f0 = P(0, L + 46, BAC_Z), f1 = P(W, L + 46, BAC_Z);
    polyg([b3, b2, f1, f0]);
    gr = c.createLinearGradient(0, b3[1], 0, f0[1]);
    gr.addColorStop(0, '#2a0d24'); gr.addColorStop(1, '#4a1532');
    c.fillStyle = gr; c.fill();
    // Façade du bac jusqu'en bas
    c.beginPath(); c.moveTo(f0[0], f0[1]); c.lineTo(f1[0], f1[1]); c.lineTo(f1[0], CH); c.lineTo(f0[0], CH); c.closePath();
    gr = c.createLinearGradient(0, f0[1], 0, CH);
    gr.addColorStop(0, '#8d1230'); gr.addColorStop(1, '#3d0716');
    c.fillStyle = gr; c.fill();
    c.lineWidth = 3 * U; c.strokeStyle = '#ffcf4a';
    c.beginPath(); c.moveTo(f0[0], f0[1]); c.lineTo(f1[0], f1[1]); c.stroke();
    if (CH - f0[1] > 16 * U) {
      c.fillStyle = 'rgba(255,214,120,.8)'; c.font = `800 ${Math.round(11 * U)}px -apple-system, system-ui, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('BAC DE GAIN', CW / 2, Math.min(CH - 9 * U, f0[1] + 14 * U));
    }
    // Lèvre chromée du bord avant
    const l0 = P(0, L, 0), l1 = P(W, L, 0), l2 = P(W, L, -5), l3 = P(0, L, -5);
    polyg([l0, l1, l2, l3]);
    gr = c.createLinearGradient(0, l0[1], 0, l3[1]);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#aab2c8'); gr.addColorStop(1, '#4b5168');
    c.fillStyle = gr; c.fill();

    // Fronton
    const mx = 8 * U, my = 4 * U, fw = CW - 2 * mx, fh = FR - my - 2 * U;
    arrondi(c, mx, my, fw, fh, 18 * U);
    gr = c.createLinearGradient(0, my, 0, my + fh);
    gr.addColorStop(0, '#d01a3a'); gr.addColorStop(0.6, '#8d0d28'); gr.addColorStop(1, '#5a0619');
    c.fillStyle = gr; c.fill();
    c.lineWidth = 3 * U; c.strokeStyle = '#ffcf4a'; c.stroke();
    arrondi(c, mx + 7 * U, my + 7 * U, fw - 14 * U, fh - 14 * U, 12 * U);
    c.lineWidth = 1 * U; c.strokeStyle = 'rgba(255,214,120,.45)'; c.stroke();
    // Titre
    const fwH = Math.max(30 * U, Math.min(50 * U, fh * 0.4));
    const ty = my + Math.max(20 * U, (fh - (24 * U + fwH)) / 2 + 2 * U);
    c.font = `900 ${Math.round(19 * U)}px -apple-system, system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 4 * U; c.strokeStyle = '#4a0412'; c.strokeText('POUSSE-PIÈCES', CW / 2, ty);
    gr = c.createLinearGradient(0, ty - 10 * U, 0, ty + 10 * U);
    gr.addColorStop(0, '#fff3b8'); gr.addColorStop(0.5, '#ffcf4a'); gr.addColorStop(1, '#d48a00');
    c.fillStyle = gr; c.fillText('POUSSE-PIÈCES', CW / 2, ty);
    // Fenêtre de la roue
    const fwW = Math.min(fw * 0.62, 260 * U);
    fenetre = { x: CW / 2 - fwW / 2, y: ty + 16 * U, w: fwW, h: fwH };
    arrondi(c, fenetre.x - 3 * U, fenetre.y - 3 * U, fenetre.w + 6 * U, fenetre.h + 6 * U, 12 * U);
    c.fillStyle = '#ffcf4a'; c.fill();
    arrondi(c, fenetre.x, fenetre.y, fenetre.w, fenetre.h, 10 * U);
    gr = c.createLinearGradient(0, fenetre.y, 0, fenetre.y + fenetre.h);
    gr.addColorStop(0, '#0a0410'); gr.addColorStop(0.5, '#2a1238'); gr.addColorStop(1, '#0a0410');
    c.fillStyle = gr; c.fill();

    // Ampoules : tour du fronton, puis haut des parois
    ampoules = [];
    const pas = 17 * U, rx = mx + 3 * U, ry = my + 3 * U, rw = fw - 6 * U, rh = fh - 6 * U;
    for (let x = rx + 14 * U; x < rx + rw - 10 * U; x += pas) ampoules.push([x, ry, 1]);
    for (let y = ry + 14 * U; y < ry + rh - 8 * U; y += pas) ampoules.push([rx + rw, y, 1]);
    for (let x = rx + rw - 14 * U; x > rx + 10 * U; x -= pas) ampoules.push([x, ry + rh, 1]);
    for (let y = ry + rh - 14 * U; y > ry + 8 * U; y -= pas) ampoules.push([rx, y, 1]);
    for (let y = 8; y < L; y += 24) {
      proj(0, y, coteZ(y) + 2); ampoules.push([PX, PY, 0.8]);
      proj(W, y, coteZ(y) + 2); ampoules.push([PX, PY, 0.8]);
    }

    // Reflet de la vitre (devant tout le reste)
    verre = toile(CW, CH);
    const v = verre.getContext('2d');
    v.beginPath(); [P(0, 0, MUR_H), P(W, 0, MUR_H), P(W, L, COTE_H), P(0, L, COTE_H)].forEach((p, i) => (i ? v.lineTo(p[0], p[1]) : v.moveTo(p[0], p[1]))); v.closePath(); v.clip();
    for (const [x, l, a] of [[0.12, 0.09, 0.07], [0.26, 0.03, 0.05], [0.7, 0.12, 0.05]]) {
      v.beginPath();
      v.moveTo(CW * x, 0); v.lineTo(CW * (x + l), 0); v.lineTo(CW * (x + l - 0.35), CH); v.lineTo(CW * (x - 0.35), CH); v.closePath();
      v.fillStyle = `rgba(255,255,255,${a})`; v.fill();
    }
    void sauve;
  }
  function arrondi(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // ---------- Le monde ----------
  const monde = new Monde();
  function tirerTresor() {
    const tot = SERIES.reduce((s, x) => s + x.poids * 4, 0);
    let r = alea() * tot;
    for (let s = 0; s < SERIES.length; s++) {
      for (let i = 0; i < 4; i++) { r -= SERIES[s].poids; if (r <= 0) return s * 4 + i; }
    }
    return 0;
  }
  if (S.plateau && S.plateau.length > 20) {
    monde.importer(S.plateau);
    monde.stabiliser(0.25);
  } else {
    monde.remplir();
    for (const c of monde.p) if (c.t === 'tresor' && c.k < 0) c.k = tirerTresor();
  }

  // ---------- État du jeu ----------
  const parts = [];      // pièces qui tombent (gagnées ou perdues)
  const textes = [];     // « +1 » flottants
  const etincelles = [];
  const file = [];       // pièces offertes à lancer : { t, x, d }
  let visee = null, appui = false, prochainLancer = 0;
  let combo = 0, dernierGain = -9, comboAff = 0, comboT = 0;
  let porteRepos = 0, porteFlash = 0, temps = 0, flashMachine = 0;
  const R = { off: 0, dep: 0, cible: 0, t: 0, dur: 2.6, actif: false, lot: null, flash: 0, dernierCran: 0 };
  const porteLibre = () => !R.actif && R.flash <= 0 && S.tours === 0 && temps >= porteRepos;
  const porteX = (t) => W / 2 + (W / 2 - 30) * Math.sin(t * 2 * Math.PI / 4.6);

  function jourJ() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function bulle(txt, cls) {
    const b = document.createElement('div');
    b.className = 'bulle' + (cls ? ' ' + cls : '');
    b.textContent = txt;
    const z = $('#bulles');
    z.appendChild(b);
    while (z.children.length > 3) z.firstChild.remove();
    setTimeout(() => b.remove(), 2900);
  }

  function lancerPiece(t, x, k) {
    const d = TYPES[t];
    const c = monde.ajouter(t, x + (alea() - 0.5) * 3, d.r + 0.6, C.CHUTE_Z, (alea() - 0.5) * 24, 170 + alea() * 250, -30);
    c.k = k || 0;
    Son.jouer('lance', 0.25, 0.9 + alea() * 0.2);
    return c;
  }

  function lancerJoueur() {
    if (visee == null) return;
    if (S.porte <= 0) {
      const p = $('#porte'); p.classList.remove('vide'); void p.offsetWidth; p.classList.add('vide');
      if (!lancerJoueur.dit) { bulle('Porte-monnaie vide : il se recharge tout seul', 'violet'); lancerJoueur.dit = true; }
      return;
    }
    S.porte--; S.stats.lances++;
    lancerPiece(alea() < 1 / 60 ? 'etoile' : 'piece', visee);
    progresser('lances', 1);
    // La porte bonus est-elle en face ?
    if (porteLibre() && Math.abs(visee - porteX(temps)) < PORTE_L / 2) {
      S.tours++; S.stats.porte++;
      porteFlash = 1; porteRepos = temps + 12;
      progresser('porte', 1);
      Son.fanfare(false);
      proj(porteX(temps), 0, C.CHUTE_Z + 14);
      texte('BONUS !', PX, PY, '#7dffb0', 18);
      gerbe(PX, PY, 18, '#9dffc4');
    }
    majHUD(); sale = true;
  }

  function gagner(c) {
    let val = 0;
    if (c.t === 'piece') val = 1;
    else if (c.t === 'etoile') { val = 1; S.tours++; bulle('Pièce étoile : un tour de roue !', 'violet'); }
    else if (c.t === 'geante') { val = 10; S.stats.geantes++; progresser('geante', 1); }
    else if (c.t === 'tresor') recolter(c.k);
    if (S.eff.x2 > 0) val *= 2;
    S.porte += val; S.stats.gagnes += val;
    if (val) {
      gagnerXp(val);
      progresser('gagner', val);
      progresser('sansperte', 1);
      if (temps - dernierGain < 1.1) combo++; else combo = 1;
      dernierGain = temps;
      if (combo >= 3) { comboAff = combo; comboT = 1.6; }
      if (combo > S.stats.cascade) S.stats.cascade = combo;
      progresser('cascade', combo);
      if (combo === 10) { S.porte += 5; bulle('Cascade de 10 ! +5 pièces'); }
      if (combo === 20) { S.porte += 10; bulle('Cascade de 20 ! +10 pièces'); }
    }
    const p = { x: c.x, y: c.y, z: c.z, vx: c.vx, vy: Math.max(50, c.vy), vz: c.vz, rot: 0, vrot: 5 + alea() * 6, t: c.t, r: c.r, h: c.h, v: c.v, k: c.k, etat: 'chute', vie: 0, val: val, gagne: true };
    parts.push(p);
    majHUD(); sale = true;
  }
  function perdre(c) {
    S.stats.perdus++;
    for (const m of S.missions) if (m.k === 'sansperte') m.f = 0;
    parts.push({ x: c.x, y: c.y, z: c.z, vx: c.vx * 0.3, vy: c.vy * 0.3, vz: c.vz, rot: 0, vrot: (c.x < W / 2 ? -1 : 1) * 4, t: c.t, r: c.r, h: c.h, v: c.v, k: c.k, etat: 'trou', vie: 0, gagne: false });
    Son.jouer('bonk', 0.35, 0.9 + alea() * 0.2);
    if (c.t === 'tresor') bulle('Le trésor est tombé dans la maison…', 'violet');
    else if (c.t === 'geante') bulle('La géante est tombée dans la maison…', 'violet');
    sale = true;
  }

  function recolter(k) {
    const s = Math.floor(k / 4), e = SERIES[s].t[k % 4];
    const avant = S.coll[k] || 0;
    S.coll[k] = avant + 1;
    S.stats.tresors++;
    progresser('tresor', 1);
    gagnerXp(20);
    if (avant) { S.porte += 5; bulle(`${e} en double : +5 pièces`); }
    else {
      bulle(`Nouveau trésor : ${e} !`);
      if (SERIES[s].t.every((_, i) => S.coll[s * 4 + i])) {
        S.porte += 50;
        setTimeout(() => { bulle(`Série « ${SERIES[s].nom} » complète : +50 pièces !`, 'vert'); Son.fanfare(true); }, 900);
      }
    }
    Son.fanfare(false);
    gerbe(CW / 2, FR + 40 * U, 30, '#ffe27a');
  }

  function gagnerXp(n) {
    S.xp += n;
    while (S.xp >= besoinXp(S.niv)) {
      S.xp -= besoinXp(S.niv);
      S.niv++;
      const r = 10 + 3 * S.niv;
      S.porte += r; S.sec++;
      const n = S.niv;
      setTimeout(() => { bulle(`Niveau ${n} ! +${r} pièces et une secousse`, 'vert'); Son.fanfare(true); }, 300);
      flashMachine = 2;
      if (S.niv % 2 === 0) setTimeout(() => file.push({ t: 'tresor', x: 60 + alea() * (W - 120), d: 0, k: tirerTresor() }), 1500);
    }
  }

  // ---------- Missions ----------
  function nouvelleMission(exclus) {
    const pris = new Set(S.missions.map((m) => m.k).concat(exclus || []));
    const choix = MODELES.filter((m) => !pris.has(m.k));
    const M = choix[Math.floor(alea() * choix.length)];
    const v = S.niv;
    return { k: M.k, n: M.n(v), f: 0, r: M.r(v) };
  }
  while (S.missions.length < 3) S.missions.push(nouvelleMission());
  function progresser(k, q) {
    for (let i = 0; i < S.missions.length; i++) {
      const m = S.missions[i];
      if (m.k !== k) continue;
      const M = MODELES.find((x) => x.k === k);
      m.f = M.max ? Math.max(m.f, q) : m.f + q;
      if (m.f >= m.n) {
        S.porte += m.r;
        gagnerXp(Math.round(m.r / 2));
        bulle(`Mission accomplie : +${m.r} pièces`, 'vert');
        Son.fanfare(false);
        S.missions.splice(i, 1);
        S.missions.splice(i, 0, nouvelleMission([k]));
        S.nouveau = true;
        majHUD();
      }
    }
  }

  // ---------- Roue des lots ----------
  function lancerRoue() {
    const tot = LOTS.reduce((s, l) => s + l.p, 0);
    let r = alea() * tot, i = 0;
    for (; i < LOTS.length; i++) { r -= LOTS[i].p; if (r <= 0) break; }
    const n = LOTS.length;
    let base = Math.ceil(R.off); base -= base % n;
    R.dep = R.off; R.cible = base + 3 * n + Math.min(i, n - 1); R.t = 0; R.actif = true; R.lot = LOTS[Math.min(i, n - 1)];
    S.tours--; S.stats.tours++;
    progresser('tours', 1);
    sale = true;
  }
  function appliquerLot(l) {
    const x = () => 30 + alea() * (W - 60);
    R.flash = 1.6;
    if (l.id === 'pluie') { for (let i = 0; i < 6; i++) file.push({ t: 'piece', x: x(), d: i * 0.14 }); }
    else if (l.id === 'jackpot') {
      for (let i = 0; i < 20; i++) file.push({ t: alea() < 0.08 ? 'etoile' : 'piece', x: x(), d: i * 0.1 });
      file.push({ t: 'geante', x: W / 2, d: 1.2 });
      flashMachine = 4;
    }
    else if (l.id === 'geante') file.push({ t: 'geante', x: 50 + alea() * (W - 100), d: 0 });
    else if (l.id === 'murs') S.eff.murs = 25000;
    else if (l.id === 'turbo') S.eff.turbo = 30000;
    else if (l.id === 'x2') S.eff.x2 = 15000;
    else if (l.id === 'tresor') file.push({ t: 'tresor', x: 60 + alea() * (W - 120), d: 0, k: tirerTresor() });
    else if (l.id === 'sec') S.sec++;
    bulle(l.id === 'jackpot' ? '🎰 JACKPOT ! 🎰' : `${l.ico} ${l.nom} !`, l.id === 'jackpot' ? '' : 'violet');
    Son.fanfare(l.id === 'jackpot');
    gerbe(CW / 2, fenetre.y + fenetre.h / 2, l.id === 'jackpot' ? 60 : 26, '#ffe27a');
    majHUD(); sale = true;
  }

  // ---------- Effets visuels ----------
  function texte(txt, x, y, col, taille) { textes.push({ txt, x, y, col, taille: taille || 15, t: 0 }); }
  function gerbe(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = alea() * Math.PI * 2, v = (60 + alea() * 220) * U;
      etincelles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80 * U, t: 0, vie: 0.6 + alea() * 0.6, col });
    }
  }

  // ---------- Mise à jour ----------
  function maj(dt) {
    temps += dt;
    // Effets en cours
    for (const k of ['murs', 'turbo', 'x2']) if (S.eff[k] > 0) S.eff[k] = Math.max(0, S.eff[k] - dt * 1000);
    monde.murs = S.eff.murs > 0;
    monde.turbo = S.eff.turbo > 0;

    // Pièces offertes
    for (let i = file.length - 1; i >= 0; i--) {
      const f = file[i];
      f.d -= dt;
      if (f.d <= 0) { lancerPiece(f.t, f.x, f.k); file.splice(i, 1); }
    }
    // Doigt appuyé : on continue de lancer
    if (appui && temps >= prochainLancer) { lancerJoueur(); prochainLancer = temps + CADENCE; }

    // Événements de la physique
    for (const e of monde.ev) {
      if (e.type === 'choc') Son.choc(e.f);
      else if (e.type === 'gagne') gagner(e.c);
      else if (e.type === 'perdu') perdre(e.c);
    }
    monde.ev.length = 0;

    // Roue
    if (!R.actif && S.tours > 0 && R.flash <= 0) lancerRoue();
    if (R.actif) {
      R.t += dt;
      const u = Math.min(1, R.t / R.dur), e = 1 - Math.pow(1 - u, 3.2);
      R.off = R.dep + (R.cible - R.dep) * e;
      const cran = Math.floor(R.off + 0.5);
      if (cran !== R.dernierCran) { R.dernierCran = cran; Son.jouer('tic', 0.5, 1); }
      if (u >= 1) { R.actif = false; R.off = R.cible; appliquerLot(R.lot); }
    } else if (R.flash <= 0) R.off += dt * 0.35;
    if (R.flash > 0) R.flash -= dt;

    // Particules : pièces qui tombent
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vie += dt;
      if (p.etat === 'pose') {
        // Les pièces gagnées restent dans le bac ; les plus anciennes s'effacent.
        p.vx *= 0.85; p.vy *= 0.85;
        p.x = Math.max(p.r, Math.min(W - p.r, p.x + p.vx * dt));
        p.y = Math.max(L + p.r * 0.6, Math.min(L + 44 - p.r, p.y + p.vy * dt));
        if (p.fin) { p.fin -= dt; if (p.fin <= 0) parts.splice(i, 1); }
        continue;
      }
      p.vz -= C.G * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rot += p.vrot * dt;
      if (p.etat === 'chute') {
        if (p.y > L + 44 - p.r) { p.y = L + 44 - p.r; p.vy = -Math.abs(p.vy) * 0.3; }
        if (p.x < p.r || p.x > W - p.r) { p.x = Math.max(p.r, Math.min(W - p.r, p.x)); p.vx = -p.vx * 0.3; }
        if (p.z < BAC_Z) {
          p.z = BAC_Z;
          if (!p.touche) {
            p.touche = true;
            Son.jouer('tinte', p.t === 'geante' ? 0.6 : 0.4, p.t === 'geante' ? 0.7 : 0.9 + alea() * 0.25);
            proj(p.x, p.y, p.z);
            if (p.val) texte('+' + p.val, PX, PY - 10 * U, S.eff.x2 > 0 ? '#9dffc4' : '#ffe27a', p.val >= 10 ? 22 : 16);
            else if (p.t === 'tresor') texte(SERIES[Math.floor(p.k / 4)].t[p.k % 4], PX, PY - 10 * U, '#fff', 30);
            const pb = $('#porte'); pb.classList.remove('bump'); void pb.offsetWidth; pb.classList.add('bump');
          }
          if (Math.abs(p.vz) > 260) { p.vz = -p.vz * 0.28; p.vrot *= 0.4; }
          else {
            p.etat = 'pose'; p.vie = 0; p.rot = 0; p.z = BAC_Z;
            const poses = parts.filter((q) => q.etat === 'pose' && !q.fin);
            if (poses.length > 28) poses[0].fin = 0.5;
          }
        }
      } else if (p.z < -70) parts.splice(i, 1);
    }

    for (let i = textes.length - 1; i >= 0; i--) { textes[i].t += dt; if (textes[i].t > 1.1) textes.splice(i, 1); }
    for (let i = etincelles.length - 1; i >= 0; i--) {
      const s = etincelles[i];
      s.t += dt; s.vy += 500 * U * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.t > s.vie) etincelles.splice(i, 1);
    }
    if (comboT > 0) comboT -= dt;
    if (porteFlash > 0) porteFlash -= dt * 1.5;
    if (flashMachine > 0) flashMachine -= dt;

    // Recharge du porte-monnaie
    const maintenant = Date.now();
    if (S.porte >= PLAFOND) S.recharge = maintenant;
    else if (maintenant - S.recharge >= RECHARGE_MS) {
      const n = Math.floor((maintenant - S.recharge) / RECHARGE_MS);
      S.porte = Math.min(PLAFOND, S.porte + n);
      S.recharge += n * RECHARGE_MS;
      majHUD(); sale = true;
    }
    majRecharge();
  }

  // ---------- Dessin ----------
  const grpA = [], grpB = [];
  const parCle = (a, b) => a.cle - b.cle;

  function dessinerPiece(c) {
    proj(c.x, c.y, c.z + c.h);
    const X = PX, Y = PY, s = PS, A = PA;
    const rx = c.r * s, ry = rx * A, ep = c.h * s * Math.sqrt(1 - A * A);
    // Ombre : au sol si la pièce vole, sinon ombre de contact
    const haut = c.z - c.sz;
    if (haut > 1.5) {
      proj(c.x, c.y, Math.max(c.sz, 0));
      const k = Math.max(0.15, 1 - haut / 90), so = c.r * PS * (1.1 + haut / 120);
      ctx.globalAlpha = 0.55 * k;
      ctx.drawImage(SP.ombre, PX - so, PY - so * PA, so * 2, so * 2 * PA);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.55;
      ctx.drawImage(SP.ombre, X - rx * 1.2, Y - ry * 1.05 + ep, rx * 2.4, ry * 2.5);
      ctx.globalAlpha = 1;
    }
    if (c.t === 'tresor') { dessinerCapsule(c.k, X, Y, rx, ry, ep); return; }
    ctx.drawImage(SP.bord, X - rx, Y - ry + ep, rx * 2, ry * 2);
    ctx.drawImage(SP[c.t][c.v], X - rx, Y - ry, rx * 2, ry * 2);
  }

  function dessinerCapsule(k, X, Y, rx, ry, ep) {
    const s = SERIES[Math.floor(k / 4)] || SERIES[0];
    // Socle et paroi
    ctx.fillStyle = s.coul[1];
    ctx.beginPath(); ctx.ellipse(X, Y + ep, rx, ry, 0, 0, 7); ctx.fill();
    const gr = ctx.createLinearGradient(X - rx, 0, X + rx, 0);
    gr.addColorStop(0, s.coul[1]); gr.addColorStop(0.35, s.coul[0]); gr.addColorStop(1, s.coul[1]);
    ctx.fillStyle = gr; ctx.fillRect(X - rx, Y, rx * 2, ep);
    // Dôme transparent
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, 7); ctx.fill();
    const e = emoji(s.t[k % 4]), t = rx * 1.45;
    ctx.drawImage(e, X - t / 2, Y - t * 0.62, t, t);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(1, rx * 0.08);
    ctx.beginPath(); ctx.ellipse(X, Y, rx * 0.97, ry * 0.97, 0, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
    ctx.strokeStyle = s.coul[0]; ctx.lineWidth = Math.max(1, rx * 0.1);
    ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, 7); ctx.stroke();
  }

  // Pièce qui bascule (rotation autour de l'axe gauche-droite)
  function dessinerChute(p) {
    proj(p.x, p.y, p.z + p.h);
    const X = PX, Y = PY, s = PS;
    const ny = Math.sin(p.rot), nz = Math.cos(p.rot);
    const vx = E.x - p.x, vy = E.y - p.y, vz = E.z - p.z, vn = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const A = Math.max(0.06, Math.abs((vy * ny + vz * nz) / vn));
    const rx = p.r * s, ry = rx * A, ep = p.h * s * Math.sqrt(1 - A * A);
    let alpha = 1;
    if (p.etat === 'pose' && p.fin) alpha = Math.max(0, p.fin / 0.5);
    if (p.etat === 'trou') alpha = Math.max(0, 1 + p.z / 40);
    ctx.globalAlpha = alpha;
    if (p.t === 'tresor') dessinerCapsule(p.k, X, Y, rx, ry, ep);
    else {
      ctx.drawImage(SP.bord, X - rx, Y - ry + ep, rx * 2, ry * 2);
      ctx.drawImage(SP[p.t][p.v], X - rx, Y - ry, rx * 2, ry * 2);
    }
    ctx.globalAlpha = 1;
  }

  function dessinerPoussoir() {
    const P = monde.P;
    const a = pt(0, 0, C.HP), b = pt(W, 0, C.HP), c = pt(W, P, C.HP), d = pt(0, P, C.HP);
    poly([a, b, c, d]);
    let gr = ctx.createLinearGradient(0, a[1], 0, d[1]);
    gr.addColorStop(0, '#3a4058'); gr.addColorStop(1, '#8d97b5');
    ctx.fillStyle = gr; ctx.fill();
    // Rainures qui avancent avec le poussoir
    ctx.save(); poly([a, b, c, d]); ctx.clip();
    ctx.lineWidth = 1.2 * U; ctx.strokeStyle = 'rgba(255,255,255,.13)';
    for (let y = P - 6; y > 0; y -= 11) {
      const p0 = pt(0, y, C.HP), p1 = pt(W, y, C.HP);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    }
    ctx.restore();
    return [d, c];
  }
  function dessinerFacePoussoir(haut) {
    const P = monde.P;
    const [d, c] = haut;
    const e = pt(W, P, 0), f = pt(0, P, 0);
    poly([d, c, e, f]);
    const gr = ctx.createLinearGradient(0, d[1], 0, f[1]);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, '#c4cbe0'); gr.addColorStop(0.55, '#7a839e'); gr.addColorStop(1, '#3b4057');
    ctx.fillStyle = gr; ctx.fill();
    // Bande lumineuse
    const m0 = pt(0, P, C.HP * 0.42), m1 = pt(W, P, C.HP * 0.42);
    ctx.lineWidth = Math.max(2, (f[1] - d[1]) * 0.16);
    const pulse = monde.turbo ? 0.6 + 0.4 * Math.sin(temps * 20) : 0.85;
    ctx.strokeStyle = monde.turbo ? `rgba(120,220,255,${pulse})` : `rgba(255,70,90,${pulse})`;
    ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.lineTo(m1[0], m1[1]); ctx.stroke();
  }

  function dessinerPorte() {
    const gx = porteX(temps);
    const bord = (x, z) => pt(x, 0, z);
    const q = [bord(gx - PORTE_L / 2, C.CHUTE_Z + 9), bord(gx + PORTE_L / 2, C.CHUTE_Z + 9), bord(gx + PORTE_L / 2, C.CHUTE_Z - 9), bord(gx - PORTE_L / 2, C.CHUTE_Z - 9)];
    const enFace = visee != null && Math.abs(visee - gx) < PORTE_L / 2;
    const k = porteFlash > 0 ? porteFlash : !porteLibre() ? 0.12 : Math.max(porteFlash, enFace ? 0.9 : 0.45 + 0.25 * Math.sin(temps * 6));
    poly(q);
    ctx.fillStyle = `rgba(80,255,150,${0.25 + 0.6 * k})`; ctx.fill();
    ctx.lineWidth = 2 * U; ctx.strokeStyle = `rgba(200,255,220,${0.5 + 0.5 * k})`; ctx.stroke();
    proj(gx, 0, C.CHUTE_Z + 15);
    ctx.font = `800 ${Math.round(9 * U)}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(190,255,215,${0.6 + 0.4 * k})`;
    ctx.fillText('BONUS', PX, PY);
  }

  function dessinerVisee() {
    if (visee == null) return;
    proj(visee, TYPES.piece.r + 0.6, C.CHUTE_Z);
    const rx = 12 * PS, ry = rx * PA;
    ctx.globalAlpha = 0.65;
    ctx.drawImage(SP.bord, PX - rx, PY - ry + 2 * PS, rx * 2, ry * 2);
    ctx.drawImage(SP.piece[0], PX - rx, PY - ry, rx * 2, ry * 2);
    ctx.globalAlpha = 1;
    // Trajectoire en pointillés jusqu'au poussoir
    const a = pt(visee, 14, C.CHUTE_Z - 4), b = pt(visee, 48, C.HP + 1);
    ctx.setLineDash([3 * U, 4 * U]); ctx.lineWidth = 1.5 * U; ctx.strokeStyle = 'rgba(255,230,150,.6)';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0], (a[1] + b[1]) / 2 - 4 * U, b[0], b[1]); ctx.stroke();
    ctx.setLineDash([]);
  }

  function dessinerAmpoules() {
    const n = ampoules.length;
    const fou = flashMachine > 0 || R.actif || R.flash > 0;
    const pas = Math.floor(temps * (fou ? 14 : 6));
    const t = 13 * U;
    for (let i = 0; i < n; i++) {
      const a = ampoules[i];
      let on;
      if (flashMachine > 0) on = (pas % 2) === (i % 2);
      else on = ((i + pas) % 4) !== 0;
      const s = t * a[2];
      ctx.drawImage(on ? SP.ampOn : SP.ampOff, a[0] - s, a[1] - s, s * 2, s * 2);
    }
  }

  function dessinerRoue() {
    const f = fenetre;
    ctx.save();
    arrondi(ctx, f.x, f.y, f.w, f.h, 10 * U); ctx.clip();
    const n = LOTS.length, cel = f.h * 1.15, cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    const i0 = Math.floor(R.off) - 4;
    for (let i = i0; i <= i0 + 9; i++) {
      const dx = (i - R.off) * cel;
      if (Math.abs(dx) > f.w / 2 + cel) continue;
      const l = LOTS[((i % n) + n) % n];
      const k = 1 - Math.min(1, Math.abs(dx) / (f.w * 0.6));
      const t = f.h * (0.55 + 0.25 * k);
      ctx.globalAlpha = 0.35 + 0.65 * k;
      ctx.drawImage(emoji(l.ico), cx + dx - t / 2, cy - t / 2, t, t);
    }
    ctx.globalAlpha = 1;
    // Ombres de bord (cylindre)
    let gr = ctx.createLinearGradient(f.x, 0, f.x + f.w, 0);
    gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(0.25, 'rgba(0,0,0,0)'); gr.addColorStop(0.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.85)');
    ctx.fillStyle = gr; ctx.fillRect(f.x, f.y, f.w, f.h);
    gr = ctx.createLinearGradient(0, f.y, 0, f.y + f.h);
    gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(0.3, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(f.x, f.y, f.w, f.h);
    if (R.flash > 0 && Math.floor(R.flash * 8) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,230,120,.25)'; ctx.fillRect(f.x, f.y, f.w, f.h);
    }
    ctx.restore();
    // Repère central
    ctx.fillStyle = '#ffcf4a';
    ctx.beginPath(); ctx.moveTo(cx - 6 * U, f.y - 4 * U); ctx.lineTo(cx + 6 * U, f.y - 4 * U); ctx.lineTo(cx, f.y + 5 * U); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 6 * U, f.y + f.h + 4 * U); ctx.lineTo(cx + 6 * U, f.y + f.h + 4 * U); ctx.lineTo(cx, f.y + f.h - 5 * U); ctx.fill();
    // À gauche : tours en attente. À droite : effets en cours.
    ctx.font = `800 ${Math.round(11 * U)}px -apple-system, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    const gauche = f.x - 10 * U, droite = f.x + f.w + 10 * U;
    ctx.textAlign = 'right';
    ctx.fillStyle = S.tours > 0 ? '#fff3b8' : 'rgba(255,214,120,.55)';
    ctx.fillText('ROUE', gauche, cy - 8 * U);
    ctx.font = `900 ${Math.round(15 * U)}px -apple-system, system-ui, sans-serif`;
    ctx.fillText('×' + (S.tours + (R.actif ? 1 : 0)), gauche, cy + 8 * U);
    ctx.textAlign = 'left';
    ctx.font = `700 ${Math.round(10.5 * U)}px -apple-system, system-ui, sans-serif`;
    let ligne = 0;
    for (const [k, ico] of [['murs', '🧱'], ['turbo', '⚡'], ['x2', '✨']]) {
      if (S.eff[k] <= 0) continue;
      const y = cy + (ligne - 1) * 14 * U;
      ctx.drawImage(emoji(ico), droite, y - 6 * U, 12 * U, 12 * U);
      ctx.fillStyle = '#fff3b8';
      ctx.fillText(Math.ceil(S.eff[k] / 1000) + ' s', droite + 15 * U, y);
      ligne++;
    }
  }

  function dessinerRemparts() {
    if (!monde.murs) return;
    const k = 0.55 + 0.25 * Math.sin(temps * 5);
    for (const xs of [0, W - C.TROU_L]) {
      const h = [pt(xs, L - C.TROU_P, 0.2), pt(xs + C.TROU_L, L - C.TROU_P, 0.2), pt(xs + C.TROU_L, L, 0.2), pt(xs, L, 0.2)];
      poly(h); ctx.fillStyle = `rgba(90,200,255,${0.35 * k})`; ctx.fill();
      ctx.lineWidth = 1.2 * U; ctx.strokeStyle = `rgba(180,235,255,${k})`;
      for (let y = L - C.TROU_P + 6; y < L; y += 8) {
        const a = pt(xs, y, 0.2), b = pt(xs + C.TROU_L, y, 0.2);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
  }

  function dessiner() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fond, 0, 0);
    if (monde.secousse > 0) ctx.setTransform(1, 0, 0, 1, (alea() - 0.5) * 5 * U, (alea() - 0.5) * 4 * U);
    dessinerAmpoules();
    dessinerRoue();
    dessinerPorte();

    grpA.length = 0; grpB.length = 0;
    const P = monde.P;
    for (const c of monde.p) {
      c.cle = c.y + c.z * 5;
      (c.y < P ? grpA : grpB).push(c);
    }
    grpA.sort(parCle); grpB.sort(parCle);

    const haut = dessinerPoussoir();
    for (const c of grpA) dessinerPiece(c);
    dessinerVisee();
    dessinerFacePoussoir(haut);

    // Pièces qui tombent dans la maison : cachées par le plateau
    if (parts.some((p) => p.etat === 'trou')) {
      for (const xs of [0, W - C.TROU_L]) {
        ctx.save();
        poly([pt(xs, L - C.TROU_P, 0), pt(xs + C.TROU_L, L - C.TROU_P, 0), pt(xs + C.TROU_L, L, 0), pt(xs, L, 0)]);
        ctx.clip();
        for (const p of parts) if (p.etat === 'trou' && (p.x < W / 2) === (xs === 0)) dessinerChute(p);
        ctx.restore();
      }
    }
    dessinerRemparts();
    for (const c of grpB) dessinerPiece(c);
    for (const p of parts) if (p.etat === 'pose') dessinerChute(p);
    for (const p of parts) if (p.etat === 'chute') dessinerChute(p);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(verre, 0, 0);

    // Cascade
    if (comboT > 0 && comboAff >= 3) {
      const a = Math.min(1, comboT / 0.4), sc = 1 + Math.max(0, comboT - 1.3) * 1.2;
      proj(W / 2, L - 40, 30);
      ctx.save(); ctx.translate(PX, PY); ctx.scale(sc, sc);
      ctx.globalAlpha = a;
      ctx.font = `900 ${Math.round(24 * U)}px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5 * U; ctx.strokeStyle = 'rgba(60,10,30,.85)'; ctx.strokeText('CASCADE ×' + comboAff, 0, 0);
      ctx.fillStyle = '#ffe27a'; ctx.fillText('CASCADE ×' + comboAff, 0, 0);
      ctx.restore();
    }
    for (const t of textes) {
      const k = t.t / 1.1;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `900 ${Math.round(t.taille * U)}px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4 * U; ctx.strokeStyle = 'rgba(40,10,20,.8)';
      const y = t.y - k * 34 * U;
      ctx.strokeText(t.txt, t.x, y); ctx.fillStyle = t.col; ctx.fillText(t.txt, t.x, y);
    }
    ctx.globalAlpha = 1;
    for (const s of etincelles) {
      ctx.globalAlpha = Math.max(0, 1 - s.t / s.vie);
      ctx.fillStyle = s.col;
      ctx.fillRect(s.x - 1.5 * U, s.y - 1.5 * U, 3 * U, 3 * U);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Boucle ----------
  let enPause = false, tPrec = 0, acc = 0, dernierSave = 0;
  const mesure = { n: 0, t: 0, fps: 0 };
  function boucle(now) {
    requestAnimationFrame(boucle);
    if (enPause) { tPrec = now; return; }
    let dt = tPrec ? (now - tPrec) / 1000 : 1 / 60;
    tPrec = now;
    if (dt > 0.1) dt = 0.1;
    mesure.n++; mesure.t += dt;
    if (mesure.t >= 1) { mesure.fps = mesure.n / mesure.t; mesure.n = 0; mesure.t = 0; }
    acc += dt;
    let n = 0;
    while (acc >= C.PAS && n < 6) { monde.pas(C.PAS); acc -= C.PAS; n++; }
    if (n === 6) acc = 0;
    maj(dt);
    dessiner();
    if (sale && now - dernierSave > 4000) { dernierSave = now; sauver(); }
  }

  // ---------- Interface ----------
  let hud = {};
  function majHUD() {
    const set = (id, v) => { if (hud[id] !== v) { hud[id] = v; $(id).textContent = v; } };
    set('#nPorte', String(S.porte));
    set('#nNiv', 'Niv. ' + S.niv);
    $('#xp').style.width = Math.min(100, (S.xp / besoinXp(S.niv)) * 100) + '%';
    set('#nSec', String(S.sec));
    $('#bSec').classList.toggle('off', S.sec <= 0);
    $('#bSec').classList.toggle('chaud', S.sec > 0);
    set('#nTre', String(Object.keys(S.coll).length));
    $('#pointMis').hidden = !S.nouveau;
  }
  function majRecharge() {
    let t = '';
    if (S.porte < PLAFOND) t = '+1 dans ' + Math.max(1, Math.ceil((RECHARGE_MS - (Date.now() - S.recharge)) / 1000)) + ' s';
    if (hud.rec !== t) { hud.rec = t; $('#recharge').textContent = t; }
  }

  function ouvrir(html) {
    $('#contenu').innerHTML = html;
    $('#voile').hidden = false;
  }
  function fermer() { $('#voile').hidden = true; }
  $('#bFermer').onclick = fermer;
  $('#voile').addEventListener('click', (e) => { if (e.target.id === 'voile') fermer(); });

  function feuilleMissions() {
    S.nouveau = false; majHUD();
    const b = besoinXp(S.niv);
    const st = S.stats;
    let h = `<h2>🎯 Missions</h2><p>Chaque mission accomplie rapporte des pièces et de l'expérience, puis une nouvelle la remplace.</p>`;
    for (const m of S.missions) {
      const M = MODELES.find((x) => x.k === m.k);
      h += `<div class="mission"><div>${M.txt(m.n)}<br><small>${Math.min(m.f, m.n)} / ${m.n}</small></div><div class="gain">+${m.r} 🪙</div><div class="barreM"><s style="width:${Math.min(100, m.f / m.n * 100)}%"></s></div></div>`;
    }
    h += `<h3>Niveau ${S.niv}</h3><div class="mission"><div>${S.xp} / ${b} points d'expérience<br><small>Au niveau suivant : +${10 + 3 * (S.niv + 1)} pièces et une secousse${(S.niv + 1) % 2 === 0 ? ', plus un trésor' : ''}</small></div><div></div><div class="barreM"><s style="width:${S.xp / b * 100}%"></s></div></div>`;
    h += `<h3>Statistiques</h3><div class="stats">
      <div><b>${st.lances}</b><small>pièces lancées</small></div>
      <div><b>${st.gagnes}</b><small>pièces gagnées</small></div>
      <div><b>${st.perdus}</b><small>tombées dans la maison</small></div>
      <div><b>${st.cascade}</b><small>meilleure cascade</small></div>
      <div><b>${st.tours}</b><small>tours de roue</small></div>
      <div><b>${st.porte}</b><small>passages par la porte</small></div></div>`;
    ouvrir(h);
  }
  function feuilleTresors() {
    let h = `<h2>🎁 Trésors</h2><p>Les capsules arrivent par la roue et tous les deux niveaux. Fais-les tomber du bord pour les collectionner. Une série complète rapporte <b>50 pièces</b>, un doublon 5.</p>`;
    SERIES.forEach((s, si) => {
      const n = s.t.filter((_, i) => S.coll[si * 4 + i]).length;
      h += `<div class="serie${n === 4 ? ' complete' : ''}"><h3>${s.nom}<small>${n} / 4${s.poids < 1 ? ' · rare' : ''}</small></h3><div class="cases">`;
      s.t.forEach((e, i) => {
        const q = S.coll[si * 4 + i] || 0;
        h += `<div class="case${q ? '' : ' vide'}">${e}${q > 1 ? `<em>×${q}</em>` : ''}</div>`;
      });
      h += '</div></div>';
    });
    ouvrir(h);
  }
  function feuilleAide() {
    let h = `<h2>Comment jouer</h2>
      <p><b>Touche la machine</b> pour lancer une pièce à cet endroit. Garde le doigt appuyé pour en lancer en rafale, et glisse-le pour viser.</p>
      <p>Le poussoir va et vient et pousse le tapis de pièces vers l'avant. Celles qui tombent du <b>bord avant</b> sont pour toi. Celles qui glissent dans les <b>trous des coins</b> sont pour la maison : vise plutôt le milieu.</p>
      <p>Lance une pièce juste en face de la <b>porte bonus</b> verte qui se promène sur le mur du fond, et la roue tourne. Une <b>pièce étoile</b> rouge qui tombe dans le bac fait aussi tourner la roue.</p>
      <p>Garde ta <b>secousse</b> pour le bon moment : la machine tremble et les piles au bord dégringolent.</p>
      <p>Le porte-monnaie se recharge d'une pièce toutes les 20 secondes jusqu'à ${PLAFOND}, avec un cadeau chaque jour. La machine est sauvegardée telle quelle : tu la retrouves comme tu l'as laissée.</p>
      <h3>La roue</h3><div class="legende">`;
    for (const l of LOTS) h += `<span>${l.ico}</span><div><b>${l.nom}</b> : ${l.txt}</div>`;
    h += '</div>';
    ouvrir(h);
  }
  function feuilleReglages() {
    ouvrir(`<h2>⚙️ Réglages</h2>
      <div class="ligne"><span>Sons</span><button class="bascule${S.son ? ' on' : ''}" id="bSon" aria-label="Sons"></button></div>
      <button class="bouton danger" id="bRaz">Remettre la machine à neuf</button>
      <p class="small">Vide le plateau et le remplit à nouveau. Ton porte-monnaie, ton niveau et tes trésors restent.</p>`);
    $('#bSon').onclick = (e) => { S.son = !S.son; e.target.classList.toggle('on', S.son); sale = true; };
    $('#bRaz').onclick = (e) => {
      if (!e.target.dataset.ok) { e.target.dataset.ok = '1'; e.target.textContent = 'Touche encore pour confirmer'; return; }
      monde.remplir();
      for (const c of monde.p) if (c.t === 'tresor' && c.k < 0) c.k = tirerTresor();
      parts.length = 0;
      sauver(); fermer();
      bulle('Machine remise à neuf');
    };
  }
  $('#bMis').onclick = feuilleMissions;
  $('#bTre').onclick = feuilleTresors;
  $('#bAide').onclick = feuilleAide;
  $('#bReg').onclick = feuilleReglages;
  $('#bSec').onclick = () => {
    Son.init();
    if (S.sec <= 0) { bulle('Plus de secousse : gagne un niveau ou la roue pour en avoir', 'violet'); return; }
    if (monde.secousse > 0) return;
    S.sec--; monde.secousse = 2.2;
    Son.jouer('gronde', 0.7, 1);
    majHUD(); sale = true;
  };

  // Toucher : viser et lancer
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    Son.init();
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    visee = versPlateau(e.clientX, e.clientY);
    appui = true;
    lancerJoueur();
    prochainLancer = temps + CADENCE + 0.1;
  });
  cv.addEventListener('pointermove', (e) => { if (appui) visee = versPlateau(e.clientX, e.clientY); });
  const lacher = () => { appui = false; setTimeout(() => { if (!appui) visee = null; }, 250); };
  cv.addEventListener('pointerup', lacher);
  cv.addEventListener('pointercancel', lacher);
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { enPause = true; sauver(); } else { enPause = false; tPrec = 0; }
  });
  window.addEventListener('pagehide', sauver);
  window.addEventListener('resize', () => { mise(); });

  // ---------- Démarrage ----------
  preparerSprites();
  mise();
  // Recharge pendant l'absence et cadeau du jour
  {
    const n = Math.floor((Date.now() - S.recharge) / RECHARGE_MS);
    if (n > 0 && S.porte < PLAFOND) S.porte = Math.min(PLAFOND, S.porte + n);
    if (n > 0) S.recharge = Date.now();
    const j = jourJ();
    if (S.jour !== j) {
      const premier = !S.jour;
      S.jour = j;
      if (!premier) { S.porte += 20; setTimeout(() => bulle('Cadeau du jour : +20 pièces'), 600); }
    }
  }
  majHUD();
  if (!S.vu) { S.vu = true; feuilleAide(); }
  sauver();
  requestAnimationFrame(boucle);

  // Pour les tests automatiques
  window.__pousse = { monde, S, R, mesure, avance: (dt) => { for (let i = 0; i < Math.round(dt / C.PAS); i++) monde.pas(C.PAS); maj(dt); }, lancerJoueur: (x) => { visee = x; lancerJoueur(); }, lot: (id) => appliquerLot(LOTS.find((l) => l.id === id)) };
})();
