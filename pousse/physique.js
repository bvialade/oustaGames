// Moteur physique du pousse-pièces.
// Les pièces sont des disques posés sur un plateau. Le poussoir, au fond, avance et recule
// sans fin : il pousse le tapis de pièces vers le bord avant, où elles tombent.
// Simulation « 2,5D » : les chocs se calculent dans le plan du plateau, et chaque pièce a une
// hauteur, ce qui permet les piles, les pièces qui chevauchent les autres et celles qui glissent
// d'une pile. Méthode par positions (PBD), stable même quand le tapis est très serré.
// Unités : millimètres et secondes. Aucun accès au DOM : le fichier se teste aussi sous Node.
(function (racine) {
  'use strict';

  const C = {
    W: 280,          // largeur du plateau
    L: 330,          // distance du mur du fond au bord avant
    HP: 15,          // hauteur du dessus du poussoir
    PMIN: 44,        // avancée minimale du poussoir (depuis le mur du fond)
    PMAX: 104,       // avancée maximale
    PERIODE: 3.4,    // aller-retour du poussoir, en secondes
    TURBO_EXTRA: 24, // course supplémentaire en turbo
    TROU_L: 15,      // trous latéraux (la « maison ») : largeur
    TROU_P: 46,      // et profondeur depuis le bord avant
    G: 6000,         // pesanteur
    MU: 0.5,         // frottement pièce / plateau
    CHUTE_Z: 62,     // hauteur où les pièces sortent du lanceur
    PAS: 1 / 120,
    ITER: 4,
    SEC_A: 40,       // secousse : force des vibrations
    SEC_AV: 0.03,    // et léger penchant vers l'avant
    SEC_SAUT: 0.02,  // probabilité qu'une pièce empilée saute, à chaque pas
    MONTE: 0.15,     // chevauchement (en part du diamètre) au-delà duquel une pièce monte sur sa voisine
  };

  const TYPES = {
    piece:  { r: 12,   h: 2.6, m: 1 },
    etoile: { r: 12,   h: 2.6, m: 1 },   // pièce rouge : lance la roue si elle tombe
    geante: { r: 20,   h: 4.0, m: 4 },   // vaut 10 pièces
    tresor: { r: 15.5, h: 9.0, m: 2 },   // capsule avec un trésor à collectionner
  };
  const NOMS = Object.keys(TYPES);

  let prochainId = 1;

  function Piece(t, x, y, z) {
    const d = TYPES[t];
    this.id = prochainId++;
    this.t = t; this.r = d.r; this.h = d.h; this.w = 1 / d.m;
    this.x = x; this.y = y; this.z = z;
    this.px = x; this.py = y; this.pz = z;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.sup = 0;           // 0 en l'air, 1 posée sur le plateau ou le poussoir, 2 posée sur d'autres pièces
    this.svx = 0; this.svy = 0;
    this.inst = false; this.ix = 0; this.iy = 0;
    this.pousse = false;
    this.monte = 0;
    this.k = 0;             // numéro du trésor
    this.v = (Math.random() * 3) | 0; // variante de dessin
    // calculs du support
    this.sz = 0; this.sn = 0; this.scx = 0; this.scy = 0; this.svx2 = 0; this.svy2 = 0; this.stab = false;
  }

  function Monde(alea) {
    this.p = [];
    this.alea = alea || Math.random;
    this.phase = 0;
    this.amp = (C.PMAX - C.PMIN) / 2;
    this.P = C.PMIN;
    this.vP = 0;
    this.murs = false;
    this.turbo = false;
    this.secousse = 0;
    this.ev = [];
    this.t = 0;
    // grille de voisinage
    this.CS = 42;
    this.nx = Math.ceil(C.W / this.CS) + 2;
    this.ny = Math.ceil((C.L + 120) / this.CS) + 2;
    this.tete = new Int32Array(this.nx * this.ny);
    this.suiv = new Int32Array(1024);
    this.pa = new Int32Array(8192);
    this.pb = new Int32Array(8192);
    this.np = 0;
    this.prof = [];
  }

  Monde.prototype.sol = function (x, y) {
    if (y < this.P) return C.HP;
    if (y > C.L) return -1e9;
    if (!this.murs && y > C.L - C.TROU_P && (x < C.TROU_L || x > C.W - C.TROU_L)) return -1e9;
    return 0;
  };

  Monde.prototype.ajouter = function (t, x, y, z, vx, vy, vz) {
    const c = new Piece(t, x, y, z);
    c.vx = vx || 0; c.vy = vy || 0; c.vz = vz || 0;
    this.p.push(c);
    return c;
  };

  Monde.prototype.pas = function (dt) {
    const ps = this.p, G = C.G;
    this.t += dt;

    // Le poussoir : une sinusoïde, plus rapide et plus longue en turbo.
    const ampCible = (C.PMAX - C.PMIN) / 2 + (this.turbo ? C.TURBO_EXTRA / 2 : 0);
    this.amp += (ampCible - this.amp) * Math.min(1, dt * 1.2);
    this.phase = (this.phase + dt * (this.turbo ? 1.5 : 1) / C.PERIODE) % 1;
    const P = C.PMIN + this.amp - this.amp * Math.cos(this.phase * 2 * Math.PI);
    this.vP = (P - this.P) / dt;
    this.P = P;

    const sec = this.secousse > 0 ? 1 : 0;
    if (this.secousse > 0) this.secousse -= dt;

    // 1. Intégration : frottement par rapport au support, pesanteur, déplacement.
    const dec = C.MU * G * dt;
    for (let i = 0; i < ps.length; i++) {
      const c = ps[i];
      c.px = c.x; c.py = c.y; c.pz = c.z;
      c.pousse = false;
      if (c.monte > 0) c.monte -= dt;
      if (c.sup) {
        const rvx = c.vx - c.svx, rvy = c.vy - c.svy;
        const v = Math.sqrt(rvx * rvx + rvy * rvy);
        if (v <= dec) { c.vx = c.svx; c.vy = c.svy; }
        else { const k = 1 - dec / v; c.vx = c.svx + rvx * k; c.vy = c.svy + rvy * k; }
        if (c.inst) { c.vx += c.ix * G * 0.62 * dt; c.vy += c.iy * G * 0.62 * dt; }
        if (sec) {
          // La machine tremble : petits sauts et glissades, un peu vers l'avant.
          c.vx += (this.alea() - 0.5) * C.SEC_A;
          c.vy += (this.alea() - 0.5 + C.SEC_AV) * C.SEC_A;
          if (c.sup === 2 && this.alea() < C.SEC_SAUT) c.vz = 60 + this.alea() * 90;
        }
      }
      c.vz -= G * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    }

    // 2. Paires de pièces proches (grille).
    this.paires();

    // 3. Contraintes : chocs dans le plan, murs, poussoir.
    const pa = this.pa, pb = this.pb, np = this.np;
    const prof = this.prof; prof.length = 0;
    for (let it = 0; it < C.ITER; it++) {
      const der = it === C.ITER - 1;
      for (let k = 0; k < np; k++) {
        const a = ps[pa[k]], b = ps[pb[k]];
        const hmin = a.h < b.h ? a.h : b.h;
        const ov = Math.min(a.z + a.h, b.z + b.h) - Math.max(a.z, b.z);
        if (ov <= 0.35 * hmin) continue;
        let dx = b.x - a.x, dy = b.y - a.y;
        const R = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= R * R) continue;
        let d = Math.sqrt(d2);
        if (d < 1e-4) { dx = this.alea() - 0.5; dy = this.alea() - 0.5; d = Math.sqrt(dx * dx + dy * dy); }
        const pen = R - d;
        let wa = a.pousse ? 0 : a.w, wb = b.pousse ? 0 : b.w;
        if (wa + wb === 0) { wa = 1; wb = 1; }
        const s = pen / (wa + wb) / d;
        a.x -= dx * s * wa; a.y -= dy * s * wa;
        b.x += dx * s * wb; b.y += dy * s * wb;
        if (der && pen > C.MONTE * R) prof.push(k);
      }
      for (let i = 0; i < ps.length; i++) {
        const c = ps[i];
        if (c.x < c.r) c.x = c.r; else if (c.x > C.W - c.r) c.x = C.W - c.r;
        if (c.y < c.r) c.y = c.r;
        if (c.z < C.HP - 1.2 && c.y - c.r < P) { c.y = P + c.r; c.pousse = true; }
      }
    }

    // 4. Supports : sur quoi repose chaque pièce ?
    for (let i = 0; i < ps.length; i++) {
      const c = ps[i];
      c.sz = this.sol(c.x, c.y); c.sn = 0; c.scx = 0; c.scy = 0; c.svx2 = 0; c.svy2 = 0; c.stab = false;
    }
    for (let k = 0; k < np; k++) {
      const a = ps[pa[k]], b = ps[pb[k]];
      surPiece(a, b); surPiece(b, a);
    }
    for (let i = 0; i < ps.length; i++) {
      const c = ps[i];
      if (c.z <= c.sz + 0.02) {
        const vz = (c.z - c.pz) / dt;
        if (vz < -160) this.ev.push({ type: 'choc', c: c, f: -vz });
        c.z = c.sz;
        if (c.sn > 0) {
          c.sup = 2;
          c.svx = c.svx2 / c.sn; c.svy = c.svy2 / c.sn;
          const mx = c.scx / c.sn, my = c.scy / c.sn;
          let dx = c.x - mx, dy = c.y - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (c.stab || (c.sn >= 2 && d < c.r * 0.42)) c.inst = false;
          else {
            c.inst = true;
            if (d < 1e-3) { dx = this.alea() - 0.5; dy = 0.5; }
            const n = Math.sqrt(dx * dx + dy * dy);
            c.ix = dx / n; c.iy = dy / n;
          }
        } else {
          c.sup = 1; c.inst = false;
          c.svx = 0; c.svy = (c.sz === C.HP && c.y < P) ? this.vP : 0;
        }
      } else {
        c.sup = 0; c.inst = false;
      }
    }

    // 5. Vitesses déduites des déplacements.
    for (let i = 0; i < ps.length; i++) {
      const c = ps[i];
      c.vx = (c.x - c.px) / dt; c.vy = (c.y - c.py) / dt; c.vz = (c.z - c.pz) / dt;
      if (c.sup) c.vz = 0;
      const v2 = c.vx * c.vx + c.vy * c.vy;
      if (v2 > 2250000) { const k = 1500 / Math.sqrt(v2); c.vx *= k; c.vy *= k; }
      if (!(c.x === c.x && c.y === c.y && c.z === c.z)) { c.x = C.W / 2; c.y = C.L / 2; c.z = 40; c.vx = c.vy = c.vz = 0; }
    }

    // 6. Tapis trop serré : une pièce chevauche sa voisine (c'est ainsi que naissent les piles).
    for (let q = 0; q < prof.length; q++) {
      const k = prof[q];
      const a = ps[pa[k]], b = ps[pb[k]];
      if (!a.sup || !b.sup || Math.abs(a.z - b.z) > 0.6) continue;
      let m, o;
      if (a.w > b.w) { m = a; o = b; } else if (b.w > a.w) { m = b; o = a; }
      else if (this.alea() < 0.5) { m = a; o = b; } else { m = b; o = a; }
      if (m.t === 'tresor' || o.h > 4.5 || m.monte > 0 || o.monte > 0) continue;
      m.z = o.z + o.h * 0.8; m.pz = m.z; m.monte = 0.3; m.sup = 0;
    }

    // 7. Chutes : par le bord avant (gagné) ou dans les trous latéraux (perdu).
    for (let i = ps.length - 1; i >= 0; i--) {
      const c = ps[i];
      if ((c.sup === 0 && c.z < -c.h) || c.z < -40) {
        this.ev.push({ type: c.y > C.L - 4 ? 'gagne' : 'perdu', c: c });
        ps[i] = ps[ps.length - 1]; ps.pop();
      }
    }
  };

  // La pièce i repose-t-elle sur la pièce j ?
  function surPiece(i, j) {
    const hmin = i.h < j.h ? i.h : j.h;
    if (i.pz < j.pz + j.h - 0.45 * hmin) return;
    const dx = i.x - j.x, dy = i.y - j.y;
    const lim = (i.r + j.r) * 0.88;
    const d2 = dx * dx + dy * dy;
    if (d2 > lim * lim) return;
    const haut = j.z + j.h;
    if (haut > i.sz + 0.3) {
      i.sz = haut; i.sn = 1; i.scx = j.x; i.scy = j.y; i.svx2 = j.vx; i.svy2 = j.vy;
      i.stab = d2 < j.r * j.r * 0.64;
    } else if (haut > i.sz - 0.3 && i.sn > 0) {
      i.sn++; i.scx += j.x; i.scy += j.y; i.svx2 += j.vx; i.svy2 += j.vy;
      if (d2 < j.r * j.r * 0.64) i.stab = true;
    }
  }

  Monde.prototype.paires = function () {
    const ps = this.p, n = ps.length, CS = this.CS, nx = this.nx, ny = this.ny;
    const tete = this.tete;
    tete.fill(-1);
    if (this.suiv.length < n) this.suiv = new Int32Array(n * 2);
    const suiv = this.suiv;
    for (let i = 0; i < n; i++) {
      const c = ps[i];
      let gx = ((c.x / CS) | 0) + 1, gy = (((c.y + 40) / CS) | 0) + 1;
      if (gx < 0) gx = 0; else if (gx >= nx) gx = nx - 1;
      if (gy < 0) gy = 0; else if (gy >= ny) gy = ny - 1;
      c.g = gx + gy * nx;
      suiv[i] = tete[c.g]; tete[c.g] = i;
    }
    let np = 0;
    for (let i = 0; i < n; i++) {
      const c = ps[i];
      const gx = c.g % nx, gy = (c.g / nx) | 0;
      for (let oy = -1; oy <= 1; oy++) {
        const yy = gy + oy;
        if (yy < 0 || yy >= ny) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const xx = gx + ox;
          if (xx < 0 || xx >= nx) continue;
          let j = tete[xx + yy * nx];
          while (j >= 0) {
            if (j > i) {
              const o = ps[j];
              const dx = o.x - c.x, dy = o.y - c.y, lim = c.r + o.r + 1;
              if (dx * dx + dy * dy < lim * lim) {
                if (np >= this.pa.length) {
                  const na = new Int32Array(np * 2), nb = new Int32Array(np * 2);
                  na.set(this.pa); nb.set(this.pb); this.pa = na; this.pb = nb;
                }
                this.pa[np] = i; this.pb[np] = j; np++;
              }
            }
            j = suiv[j];
          }
        }
      }
    }
    this.np = np;
  };

  // Fait tourner la machine sans rien compter (installation, retour après une absence).
  Monde.prototype.stabiliser = function (secondes) {
    const n = Math.round(secondes / C.PAS);
    for (let i = 0; i < n; i++) this.pas(C.PAS);
    this.ev.length = 0;
  };

  // Un plateau neuf, déjà bien garni, comme une machine de fête foraine en début de soirée.
  Monde.prototype.remplir = function () {
    const a = this.alea;
    this.p.length = 0;
    const libre = (x, y, r, z) => this.p.every((o) => Math.abs(o.z - z) > 1 || (o.x - x) ** 2 + (o.y - y) ** 2 > (o.r + r + 0.4) ** 2);
    // Couche du dessous, dense
    for (let n = 0; n < 2600 && this.p.length < 132; n++) {
      const x = 12 + a() * (C.W - 24), y = C.PMAX + 14 + a() * (C.L - C.PMAX - 18);
      if (!this.murs && y > C.L - C.TROU_P && (x < C.TROU_L + 4 || x > C.W - C.TROU_L - 4)) continue;
      if (libre(x, y, 12, 0)) this.ajouter('piece', x, y, 0);
    }
    // Deuxième couche, plus fournie vers l'avant
    for (let n = 0; n < 60; n++) {
      const y = C.L - 10 - Math.pow(a(), 1.6) * (C.L - C.PMAX - 40);
      const x = 30 + a() * (C.W - 60);
      this.ajouter('piece', x, y, 2.7 + a() * 0.3);
    }
    // Sur le poussoir
    for (let n = 0; n < 12; n++) this.ajouter('piece', 14 + a() * (C.W - 28), 13 + a() * 22, C.HP + 0.1);
    // Deux pièces géantes et un trésor, bien visibles mais pas tout de suite au bord
    this.ajouter('geante', C.W * 0.3, C.L - 95, 3);
    this.ajouter('geante', C.W * 0.72, C.L - 130, 3);
    const t = this.ajouter('tresor', C.W * 0.5, C.L - 70, 3);
    t.k = -1;
    this.stabiliser(3);
    return t;
  };

  Monde.prototype.exporter = function () {
    return this.p.map((c) => [NOMS.indexOf(c.t), Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10, Math.round(c.z * 10) / 10, c.k]);
  };
  Monde.prototype.importer = function (liste) {
    this.p.length = 0;
    for (const e of liste) {
      const t = NOMS[e[0]];
      if (!t || !isFinite(e[1]) || !isFinite(e[2]) || !isFinite(e[3])) continue;
      const c = this.ajouter(t, e[1], e[2], e[3] + 0.05);
      c.k = e[4] || 0;
    }
  };

  const Physique = { C: C, TYPES: TYPES, Monde: Monde };
  if (typeof module !== 'undefined' && module.exports) module.exports = Physique;
  else racine.Physique = Physique;
})(this);
