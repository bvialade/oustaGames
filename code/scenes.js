// Scènes dessinées en SVG pour les questions de situation (aucune photo).
// SCENE(spec) : vue depuis la place du conducteur.  PLAN(spec) : carrefour vu de dessus.
//
// SCENE — options principales (toutes facultatives) :
//   route: 'route' | 'ville' | 'autoroute' | '2x2' | 'sensunique' | 'montagne'
//   lignes: ['continue' | 'discontinue' | 'annonce' | 'mixte' | 'mixteinv' | 'aucune', ...]  (entre les voies, de gauche à droite)
//   virage: -1 (gauche) .. 1 (droite)      meteo: 'pluie' | 'brouillard' | 'neige' | 'nuit' | 'nuitpluie'
//   carrefour: { d: profondeur 0-1, cote: 'droite' | 'gauche' | 'deux', ligne: 'stop' | 'cedez' }
//   giratoire: { d }   pieton: { d } (passage piéton)   pn: { d, barrieres: true } (passage à niveau)
//   tunnel: { d }   sas: { d } (sas vélo)   cones: [{ L, d }]
//   panneaux: [{ p: 'stop', d, cote: 'd' | 'g', txt: 'texte du panonceau', p2: 'second panneau' }]
//   feu: { d, etat: 'rouge' | 'orange' | 'vert' | 'clignotant', fleche: 'droite' }
//   v: [{ t: 'voiture' | 'camion' | 'moto' | 'velo' | 'bus' | 'car' | 'tracteur' | 'pompiers' | 'police' | 'trottinette',
//         L: voie (0 = la mienne, -1 = celle de gauche…), d, face: true (vient vers moi), c: couleur,
//         cli: 'g' | 'd' | 'detresse', stop: true (feux stop), rue: 'droite' | 'gauche' (dans la rue transversale) }]
//   p: [{ L, d, enfant: true, ballon: true }]  (piétons ; L hors chaussée : trottoir)
//   retro: { t, d, cli }  (ce qu'on voit dans le rétroviseur)   compteur: 90   agent: { d, face: true }
//   bau: true (bande d'arrêt d'urgence occupée…)   voiesBus: true
const SCENE = (() => {
  const W = 400, H = 250, HY = 105;
  let uid = 0;
  const f = (n) => Math.round(n * 10) / 10;

  // Profondeur d (0 = devant moi, 1 = horizon) → position à l'écran.
  const Y = (d) => H - (H - HY) * d;
  const sc = (d) => 1 - d;
  const LW = 190; // largeur d'une voie au premier plan
  let courbe = 0;
  const X = (L, d) => W / 2 + L * LW * sc(d) + courbe * 170 * d * d;
  const dz = (z) => z / (z + 3); // distance → profondeur

  const ROUTES = {
    route: { n: 2, moi: 1, sens: [-1, 1], lignes: ['discontinue'], decor: 'campagne' },
    montagne: { n: 2, moi: 1, sens: [-1, 1], lignes: ['continue'], decor: 'montagne' },
    ville: { n: 2, moi: 1, sens: [-1, 1], lignes: ['discontinue'], decor: 'ville' },
    sensunique: { n: 2, moi: 1, sens: [1, 1], lignes: ['discontinue'], decor: 'ville' },
    '2x2': { n: 2, moi: 1, sens: [1, 1], lignes: ['discontinue'], decor: 'campagne', terreplein: true },
    autoroute: { n: 3, moi: 2, sens: [1, 1, 1], lignes: ['discontinue', 'discontinue'], decor: 'campagne', terreplein: true, bau: true },
  };

  function poly(pts, attrs) {
    return `<polygon points="${pts.map(([x, y]) => f(x) + ',' + f(y)).join(' ')}" ${attrs}/>`;
  }
  // Bande au sol entre deux positions latérales, de d0 à d1.
  function bande(L0, L1, d0, d1, attrs, pas = 14) {
    const a = [], b = [];
    for (let i = 0; i <= pas; i++) {
      const d = d0 + (d1 - d0) * i / pas;
      a.push([X(L0, d), Y(d)]);
      b.unshift([X(L1, d), Y(d)]);
    }
    return poly(a.concat(b), attrs);
  }
  // Ligne longitudinale : continue, discontinue, etc. (trous pour les carrefours).
  function ligne(L, type, trous, coul = '#f4f4f4') {
    if (type === 'aucune') return '';
    const w = 0.045;
    const plein = (d0, d1, dx = 0) => {
      let out = '';
      const segs = [[d0, d1]];
      let parts = segs;
      for (const [t0, t1] of trous) parts = parts.flatMap(([a, b]) => (b <= t0 || a >= t1 ? [[a, b]] : [[a, Math.min(b, t0)], [Math.max(a, t1), b]].filter(([x, y]) => y - x > 0.002)));
      for (const [a, b] of parts) out += bande(L + dx - w / 2, L + dx + w / 2, a, b, `fill="${coul}"`, 6);
      return out;
    };
    const tirets = (dx, on, off) => {
      let out = '';
      for (let z = 0; z < 60; z += on + off) {
        const a = dz(z), b = dz(z + on);
        if (a > 0.97) break;
        out += plein(a, Math.min(b, 0.97), dx);
      }
      return out;
    };
    if (type === 'continue') return plein(0, 0.97);
    if (type === 'discontinue') return tirets(0, 1, 2.2);
    if (type === 'annonce') return tirets(0, 2.2, 0.7);
    // Ligne mixte : 'mixte' = continue de mon côté (à droite de l'axe), 'mixteinv' = discontinue de mon côté.
    if (type === 'mixte') return plein(0, 0.97, 0.06) + tirets(-0.06, 1, 2.2);
    if (type === 'mixteinv') return plein(0, 0.97, -0.06) + tirets(0.06, 1, 2.2);
    return '';
  }

  // ---------- Véhicules ----------
  function clignotant(x, y, r, on) {
    if (!on) return '';
    return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#ffae00"><animate attributeName="opacity" values="1;1;0.15;0.15" dur="0.9s" repeatCount="indefinite"/></circle>
      <circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 2.2)}" fill="#ffae00" opacity=".35"><animate attributeName="opacity" values=".4;.4;0;0" dur="0.9s" repeatCount="indefinite"/></circle>`;
  }
  function gyro(x, y, r, coul = '#3b82f6') {
    return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${coul}"><animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite"/></circle>
      <circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 2.6)}" fill="${coul}" opacity=".3"><animate attributeName="opacity" values=".45;0;.45" dur="0.5s" repeatCount="indefinite"/></circle>`;
  }
  function personne(x, y, h, coul = '#1f2937', enfant = false) {
    const w = h * 0.17, top = y - h;
    return `<g stroke="${coul}" stroke-width="${f(w)}" stroke-linecap="round" fill="none">
      <line x1="${f(x)}" y1="${f(top + h * 0.28)}" x2="${f(x)}" y2="${f(top + h * 0.62)}"/>
      <line x1="${f(x)}" y1="${f(top + h * 0.62)}" x2="${f(x - h * 0.13)}" y2="${f(y)}"/>
      <line x1="${f(x)}" y1="${f(top + h * 0.62)}" x2="${f(x + h * 0.13)}" y2="${f(y)}"/>
      <line x1="${f(x)}" y1="${f(top + h * 0.32)}" x2="${f(x - h * 0.2)}" y2="${f(top + h * 0.58)}"/>
      <line x1="${f(x)}" y1="${f(top + h * 0.32)}" x2="${f(x + h * 0.2)}" y2="${f(top + h * 0.58)}"/></g>
      <circle cx="${f(x)}" cy="${f(top + h * 0.12)}" r="${f(h * (enfant ? 0.14 : 0.12))}" fill="${coul}"/>`;
  }
  function vehicule(v, nuit) {
    const d = v.d ?? 0.5;
    const s = sc(d);
    let x = X(v.L ?? 0, d), y = Y(d);
    if (v.rue) return vehiculeCote(v, nuit);
    const t = v.t || 'voiture';
    const c = v.c || { voiture: '#2563eb', camion: '#e5e7eb', bus: '#16a34a', car: '#f59e0b', tracteur: '#15803d', pompiers: '#dc2626', police: '#f8fafc', moto: '#111827', velo: '#0ea5e9', trottinette: '#0ea5e9' }[t] || '#2563eb';
    let w = LW * s * 0.72;
    let out = '';
    const ombre = (ww) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(ww * 0.55)}" ry="${f(ww * 0.06)}" fill="rgba(0,0,0,.35)"/>`;
    if (t === 'moto' || t === 'velo' || t === 'trottinette') {
      const h = LW * s * 0.6;
      out += ombre(h * 0.4);
      out += `<rect x="${f(x - h * 0.03)}" y="${f(y - h * 0.32)}" width="${f(h * 0.06)}" height="${f(h * 0.32)}" rx="${f(h * 0.03)}" fill="#111"/>`;
      if (t === 'moto') out += `<rect x="${f(x - h * 0.12)}" y="${f(y - h * 0.48)}" width="${f(h * 0.24)}" height="${f(h * 0.22)}" rx="${f(h * 0.05)}" fill="${c}"/>`;
      out += personne(x, y - h * 0.22, h * 0.8, t === 'moto' ? '#111827' : '#334155');
      if (t === 'moto') out += `<circle cx="${f(x)}" cy="${f(y - h * 0.97)}" r="${f(h * 0.12)}" fill="${v.casque || '#e11d48'}"/>`;
      if (t === 'velo' && !v.face) out += `<rect x="${f(x - h * 0.04)}" y="${f(y - h * 0.3)}" width="${f(h * 0.08)}" height="${f(h * 0.05)}" fill="#ef4444"/>`;
      if (v.face && t === 'moto') out += `<circle cx="${f(x)}" cy="${f(y - h * 0.4)}" r="${f(h * 0.06)}" fill="#fffbe6"/>`;
      out += clignotant(x - h * 0.14, y - h * 0.38, h * 0.04, v.cli === 'g' || v.cli === 'detresse');
      out += clignotant(x + h * 0.14, y - h * 0.38, h * 0.04, v.cli === 'd' || v.cli === 'detresse');
      return out;
    }
    let hh = w * 0.62;
    if (t === 'camion' || t === 'bus' || t === 'car' || t === 'pompiers') { w = LW * s * 0.86; hh = w * 1.0; }
    if (t === 'tracteur') { w = LW * s * 0.7; hh = w * 0.8; }
    out += ombre(w);
    const x0 = x - w / 2, y0 = y - hh;
    // roues
    out += `<rect x="${f(x0 + w * 0.04)}" y="${f(y - w * 0.12)}" width="${f(w * 0.16)}" height="${f(w * 0.12)}" rx="${f(w * 0.03)}" fill="#111"/>
            <rect x="${f(x0 + w * 0.8)}" y="${f(y - w * 0.12)}" width="${f(w * 0.16)}" height="${f(w * 0.12)}" rx="${f(w * 0.03)}" fill="#111"/>`;
    if (t === 'voiture' || t === 'police') {
      out += `<path d="M${f(x0 + w * 0.17)},${f(y - hh * 0.55)} L${f(x0 + w * 0.27)},${f(y0)} L${f(x0 + w * 0.73)},${f(y0)} L${f(x0 + w * 0.83)},${f(y - hh * 0.55)} Z" fill="${c}"/>`;
      out += `<path d="M${f(x0 + w * 0.23)},${f(y - hh * 0.58)} L${f(x0 + w * 0.3)},${f(y0 + hh * 0.1)} L${f(x0 + w * 0.7)},${f(y0 + hh * 0.1)} L${f(x0 + w * 0.77)},${f(y - hh * 0.58)} Z" fill="${v.face ? '#93c5fd' : '#475569'}" opacity=".9"/>`;
      out += `<rect x="${f(x0)}" y="${f(y - hh * 0.58)}" width="${f(w)}" height="${f(hh * 0.45)}" rx="${f(w * 0.08)}" fill="${c}"/>`;
      if (t === 'police') {
        out += `<rect x="${f(x0)}" y="${f(y - hh * 0.36)}" width="${f(w)}" height="${f(hh * 0.08)}" fill="#1d4ed8"/>`;
        out += gyro(x - w * 0.12, y0 - hh * 0.04, w * 0.04) + gyro(x + w * 0.12, y0 - hh * 0.04, w * 0.04);
      }
    } else if (t === 'camion' || t === 'pompiers') {
      out += `<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(hh * 0.88)}" rx="${f(w * 0.03)}" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="${f(w * 0.01)}"/>`;
      if (v.face) out += `<rect x="${f(x0 + w * 0.08)}" y="${f(y0 + hh * 0.1)}" width="${f(w * 0.84)}" height="${f(hh * 0.28)}" rx="${f(w * 0.03)}" fill="#93c5fd"/>`;
      else out += `<line x1="${f(x)}" y1="${f(y0 + hh * 0.05)}" x2="${f(x)}" y2="${f(y0 + hh * 0.85)}" stroke="rgba(0,0,0,.3)" stroke-width="${f(w * 0.012)}"/>`;
      if (t === 'pompiers') out += gyro(x - w * 0.3, y0 - hh * 0.02, w * 0.035) + gyro(x + w * 0.3, y0 - hh * 0.02, w * 0.035);
      if (t === 'camion' && !v.face) out += `<rect x="${f(x - w * 0.3)}" y="${f(y0 + hh * 0.6)}" width="${f(w * 0.6)}" height="${f(hh * 0.12)}" fill="#facc15"/><text x="${f(x)}" y="${f(y0 + hh * 0.66)}" font-size="${f(hh * 0.08)}" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-weight="700">ANGLES MORTS</text>`;
    } else if (t === 'bus' || t === 'car') {
      out += `<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(hh * 0.88)}" rx="${f(w * 0.06)}" fill="${c}"/>`;
      out += `<rect x="${f(x0 + w * 0.07)}" y="${f(y0 + hh * 0.08)}" width="${f(w * 0.86)}" height="${f(hh * 0.32)}" rx="${f(w * 0.03)}" fill="${v.face ? '#93c5fd' : '#334155'}"/>`;
      if (t === 'car' && v.scolaire !== false) out += `<rect x="${f(x - w * 0.16)}" y="${f(y0 + hh * 0.45)}" width="${f(w * 0.32)}" height="${f(w * 0.2)}" fill="#facc15" stroke="#dc2626" stroke-width="${f(w * 0.02)}"/>${personne(x - w * 0.04, y0 + hh * 0.45 + w * 0.18, w * 0.15)}${personne(x + w * 0.05, y0 + hh * 0.45 + w * 0.18, w * 0.11)}`;
    } else if (t === 'tracteur') {
      out += `<rect x="${f(x0 + w * 0.12)}" y="${f(y0)}" width="${f(w * 0.76)}" height="${f(hh * 0.55)}" rx="${f(w * 0.05)}" fill="#cbd5e1" stroke="${c}" stroke-width="${f(w * 0.04)}"/>`;
      out += `<rect x="${f(x0)}" y="${f(y - hh * 0.5)}" width="${f(w * 0.24)}" height="${f(hh * 0.5)}" rx="${f(w * 0.05)}" fill="#111"/><rect x="${f(x0 + w * 0.76)}" y="${f(y - hh * 0.5)}" width="${f(w * 0.24)}" height="${f(hh * 0.5)}" rx="${f(w * 0.05)}" fill="#111"/>`;
      out += `<rect x="${f(x0 + w * 0.24)}" y="${f(y - hh * 0.5)}" width="${f(w * 0.52)}" height="${f(hh * 0.3)}" fill="${c}"/>`;
      out += gyro(x, y0 - hh * 0.04, w * 0.04, '#f59e0b');
    }
    // feux
    const fy = (t === 'camion' || t === 'bus' || t === 'car' || t === 'pompiers') ? y - hh * 0.22 : y - hh * 0.3;
    const fw = w * 0.13, fh = w * 0.06;
    if (t !== 'tracteur') {
      if (v.face) {
        const col = '#fffbe6';
        out += `<rect x="${f(x0 + w * 0.05)}" y="${f(fy)}" width="${f(fw)}" height="${f(fh)}" rx="${f(fh / 2)}" fill="${col}"/><rect x="${f(x0 + w * 0.95 - fw)}" y="${f(fy)}" width="${f(fw)}" height="${f(fh)}" rx="${f(fh / 2)}" fill="${col}"/>`;
        if (nuit || v.phares) out += `<circle cx="${f(x0 + w * 0.05 + fw / 2)}" cy="${f(fy)}" r="${f(w * 0.2)}" fill="url(#halo${uid})"/><circle cx="${f(x0 + w * 0.95 - fw / 2)}" cy="${f(fy)}" r="${f(w * 0.2)}" fill="url(#halo${uid})"/>`;
      } else {
        const col = v.stop ? '#ff2a2a' : '#9f1239';
        out += `<rect x="${f(x0 + w * 0.04)}" y="${f(fy)}" width="${f(fw)}" height="${f(fh)}" rx="${f(fh / 3)}" fill="${col}"/><rect x="${f(x0 + w * 0.96 - fw)}" y="${f(fy)}" width="${f(fw)}" height="${f(fh)}" rx="${f(fh / 3)}" fill="${col}"/>`;
        if (v.stop) out += `<circle cx="${f(x0 + w * 0.04 + fw / 2)}" cy="${f(fy)}" r="${f(w * 0.12)}" fill="#ff0000" opacity=".3"/><circle cx="${f(x0 + w * 0.96 - fw / 2)}" cy="${f(fy)}" r="${f(w * 0.12)}" fill="#ff0000" opacity=".3"/>`;
      }
    }
    const g = v.cli === 'g' || v.cli === 'detresse', dr = v.cli === 'd' || v.cli === 'detresse';
    // De face, sa gauche est à ma droite.
    out += clignotant(x0 + w * 0.02, fy - fh, w * 0.035, v.face ? dr : g);
    out += clignotant(x0 + w * 0.98, fy - fh, w * 0.035, v.face ? g : dr);
    if (v.label) out += `<circle cx="${f(x)}" cy="${f(y0 - w * 0.14)}" r="${f(Math.max(9, w * 0.1))}" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="${f(x)}" y="${f(y0 - w * 0.14)}" font-size="${f(Math.max(11, w * 0.12))}" text-anchor="middle" dominant-baseline="central" font-weight="800" font-family="Arial">${v.label}</text>`;
    return out;
  }
  // Véhicule de profil dans une rue transversale, tourné vers ma route.
  function vehiculeCote(v, nuit) {
    const d = v.d ?? 0.5;
    const dir = v.rue === 'droite' ? 1 : -1;
    const bord = dir > 0 ? X(R.droite + 0.15, d) : X(R.gauche - 0.15, d);
    const w = LW * sc(d) * (v.rue === 'gauche' ? 0.75 : 1), h = w * 0.36;
    const xn = bord + dir * (v.loin ? w * 1.4 : w * 0.15); // nez du véhicule
    const xb = xn + dir * w; // arrière
    const y = Y(d) - 2;
    const x0 = Math.min(xn, xb);
    const c = v.c || '#e11d48';
    const t = v.t || 'voiture';
    let out = `<ellipse cx="${f((xn + xb) / 2)}" cy="${f(y)}" rx="${f(w * 0.52)}" ry="${f(h * 0.12)}" fill="rgba(0,0,0,.3)"/>`;
    if (t === 'camion') {
      out += `<rect x="${f(x0)}" y="${f(y - h * 2)}" width="${f(w)}" height="${f(h * 1.8)}" rx="3" fill="${c}"/>`;
    } else if (t === 'velo' || t === 'moto') {
      const r = h * 0.4;
      out += `<circle cx="${f(xn - dir * r)}" cy="${f(y - r)}" r="${f(r)}" fill="none" stroke="#111" stroke-width="2"/><circle cx="${f(xn - dir * r * 3.2)}" cy="${f(y - r)}" r="${f(r)}" fill="none" stroke="#111" stroke-width="2"/>`;
      out += personne(xn - dir * r * 2.1, y - r * 1.2, h * 1.9, '#334155');
      return out;
    } else {
      out += `<path d="M${f(xn)},${f(y - h * 0.3)} L${f(xn)},${f(y - h * 0.8)} L${f(xn + dir * w * 0.25)},${f(y - h * 0.85)} L${f(xn + dir * w * 0.38)},${f(y - h * 1.4)} L${f(xn + dir * w * 0.8)},${f(y - h * 1.4)} L${f(xb)},${f(y - h * 0.85)} L${f(xb)},${f(y - h * 0.3)} Z" fill="${c}"/>`;
      out += `<path d="M${f(xn + dir * w * 0.42)},${f(y - h * 0.9)} L${f(xn + dir * w * 0.42)},${f(y - h * 1.32)} L${f(xn + dir * w * 0.76)},${f(y - h * 1.32)} L${f(xn + dir * w * 0.86)},${f(y - h * 0.9)} Z" fill="#93c5fd"/>`;
    }
    out += `<circle cx="${f(xn + dir * w * 0.2)}" cy="${f(y - h * 0.25)}" r="${f(h * 0.25)}" fill="#111"/><circle cx="${f(xb - dir * w * 0.2)}" cy="${f(y - h * 0.25)}" r="${f(h * 0.25)}" fill="#111"/>`;
    out += `<rect x="${f(dir > 0 ? xn - 2 : xn - 2)}" y="${f(y - h * 0.75)}" width="4" height="${f(h * 0.18)}" fill="#fffbe6"/>`;
    if (v.cli) out += clignotant(xn, y - h * 0.55, Math.max(2.5, h * 0.12), true);
    if (v.label) out += `<circle cx="${f((xn + xb) / 2)}" cy="${f(y - h * 1.8)}" r="10" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="${f((xn + xb) / 2)}" y="${f(y - h * 1.8)}" font-size="12" text-anchor="middle" dominant-baseline="central" font-weight="800" font-family="Arial">${v.label}</text>`;
    return out;
  }

  // ---------- Panneaux au bord de la route ----------
  function panneau(pn) {
    const d = pn.d ?? 0.5;
    const gauche = pn.cote === 'g';
    const L = gauche ? R.gauche - 0.3 : R.droite + 0.35 + (pn.loin || 0);
    const x = X(L, d), y = Y(d);
    const s = Math.max(0.12, sc(d));
    const taille = 92 * s * (pn.grand ? 1.3 : 1);
    const hp = 150 * s;
    const items = [pn.p, pn.p2].filter(Boolean);
    let out = `<rect x="${f(x - 2 * s)}" y="${f(y - hp)}" width="${f(4 * s + 1)}" height="${f(hp)}" fill="#9ca3af"/>`;
    let top = y - hp - taille * 0.2;
    const blocs = [];
    for (const p of items) blocs.push(`<g transform="translate(${f(x - taille / 2)},${f(top)}) scale(${f(taille / 100)})">${PANNEAUX(p).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>`), (top += taille * 1.02);
    if (pn.txt) {
      const lignes = pn.txt.split('\n');
      const ph = taille * 0.24 * lignes.length + taille * 0.06;
      blocs.push(`<rect x="${f(x - taille * 0.5)}" y="${f(top)}" width="${f(taille)}" height="${f(ph)}" rx="${f(taille * 0.04)}" fill="#fff" stroke="#333" stroke-width="${f(Math.max(0.6, taille * 0.012))}"/>` +
        lignes.map((l, i) => `<text x="${f(x)}" y="${f(top + taille * 0.15 + i * taille * 0.24)}" font-size="${f(taille * 0.17)}" text-anchor="middle" dominant-baseline="central" font-weight="700" font-family="Arial">${l}</text>`).join(''));
      top += ph;
    }
    // On remonte l'ensemble pour que le bas des panneaux touche le haut du poteau.
    const decal = top - (y - hp + taille * 0.15);
    return out + `<g transform="translate(0,${f(-decal)})">${blocs.join('')}</g>`;
  }

  // ---------- Décor ----------
  let R = {};
  function decor(spec, nuit) {
    let out = '';
    const type = R.decor;
    if (type === 'ville') {
      // trottoirs et immeubles
      out += bande(R.droite + 0.03, R.droite + 0.9, 0, 0.98, `fill="${nuit ? '#3b3f47' : '#c9cdd3'}"`);
      out += bande(R.gauche - 0.9, R.gauche - 0.03, 0, 0.98, `fill="${nuit ? '#3b3f47' : '#c9cdd3'}"`);
      out += bande(R.droite, R.droite + 0.05, 0, 0.98, `fill="${nuit ? '#555' : '#9aa0a8'}"`);
      out += bande(R.gauche - 0.05, R.gauche, 0, 0.98, `fill="${nuit ? '#555' : '#9aa0a8'}"`);
      const cols = nuit ? ['#1f2937', '#273244', '#1e293b'] : ['#e7d8c5', '#cbd5e1', '#f1e4d3', '#d6c7b4'];
      for (const side of [1, -1]) {
        for (let i = 0; i < 6; i++) {
          const d0 = dz(i * 2.2), d1 = dz(i * 2.2 + 2);
          if (spec.carrefour && (spec.carrefour.cote === 'deux' || (spec.carrefour.cote === 'droite') === (side > 0)) && Math.abs((d0 + d1) / 2 - spec.carrefour.d) < 0.08) continue;
          const Lb = side > 0 ? R.droite + 0.9 : R.gauche - 0.9;
          const xa = X(Lb, d0), xb = X(Lb, d1);
          const hA = 260 * sc(d0) * (0.8 + (i % 3) * 0.15), hB = 260 * sc(d1) * (0.8 + (i % 3) * 0.15);
          const xo = side > 0 ? W + 20 : -20;
          out += poly([[xa, Y(d0)], [xb, Y(d1)], [xb, Y(d1) - hB], [xa, Y(d0) - hA]], `fill="${cols[i % cols.length]}"`);
          out += poly([[xa, Y(d0)], [xa, Y(d0) - hA], [xo, Y(d0) - hA * 1.05], [xo, Y(d0)]], `fill="${cols[(i + 1) % cols.length]}" opacity=".9"`);
          // fenêtres
          for (let k = 1; k < 4; k++) {
            const yy = Y(d0) - hA * k / 4.2, yy2 = Y(d1) - hB * k / 4.2;
            out += `<line x1="${f(xa)}" y1="${f(yy)}" x2="${f(xb)}" y2="${f(yy2)}" stroke="${nuit ? '#facc15' : '#64748b'}" stroke-width="${f(3 * sc(d0))}" stroke-dasharray="${f(6 * sc(d0))} ${f(5 * sc(d0))}" opacity=".7"/>`;
          }
        }
      }
    } else {
      // arbres
      const arbres = type === 'montagne' ? [] : [[1, 0.25], [1, 0.55], [1, 0.75], [-1, 0.35], [-1, 0.65], [1, 0.86], [-1, 0.85]];
      for (const [side, d] of arbres) {
        if (spec.carrefour && Math.abs(d - spec.carrefour.d) < 0.1) continue;
        if ((spec.panneaux || []).some((p) => Math.abs(p.d - d) < 0.06)) continue;
        const L = side > 0 ? R.droite + 1.1 : R.gauche - 1.1;
        const x = X(L, d), y = Y(d), s = sc(d);
        out += `<rect x="${f(x - 4 * s)}" y="${f(y - 70 * s)}" width="${f(8 * s)}" height="${f(70 * s)}" fill="#5b3a1e"/><circle cx="${f(x)}" cy="${f(y - 85 * s)}" r="${f(38 * s)}" fill="${nuit ? '#0f2b1b' : '#2f7d3b'}"/>`;
      }
    }
    return out;
  }

  function ciel(meteo) {
    const nuit = meteo === 'nuit' || meteo === 'nuitpluie';
    const top = nuit ? '#0b1020' : meteo === 'brouillard' ? '#cfd5db' : meteo === 'pluie' ? '#7c8794' : meteo === 'neige' ? '#d9dee5' : '#6fb3ef';
    const bas = nuit ? '#1a2238' : meteo === 'brouillard' ? '#e5e8eb' : meteo === 'pluie' ? '#aab3bd' : meteo === 'neige' ? '#eef1f5' : '#cfe8fb';
    let sol = nuit ? '#10180f' : meteo === 'neige' ? '#f1f5f9' : R.decor === 'montagne' ? '#7c8a6a' : '#7fb069';
    let out = `<defs><linearGradient id="ciel${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bas}"/></linearGradient>
      <radialGradient id="halo${uid}"><stop offset="0" stop-color="#fffbe6" stop-opacity=".9"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></radialGradient>
      <linearGradient id="bro${uid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e5e8eb" stop-opacity=".05"/><stop offset=".55" stop-color="#e5e8eb" stop-opacity=".85"/><stop offset="1" stop-color="#e5e8eb" stop-opacity="1"/></linearGradient></defs>`;
    out += `<rect width="${W}" height="${HY + 2}" fill="url(#ciel${uid})"/>`;
    if (R.decor === 'montagne') out += `<polygon points="0,${HY} 60,${HY - 60} 130,${HY - 20} 210,${HY - 75} 300,${HY - 25} 360,${HY - 55} 400,${HY - 30} 400,${HY} " fill="${nuit ? '#1e293b' : '#8a94a6'}"/><polygon points="196,${HY - 70} 210,${HY - 75} 226,${HY - 62}" fill="#fff"/>`;
    out += `<rect y="${HY}" width="${W}" height="${H - HY}" fill="${sol}"/>`;
    return out;
  }

  function meteoOverlay(meteo) {
    let out = '';
    if (meteo === 'pluie' || meteo === 'nuitpluie') {
      let l = '';
      for (let i = 0; i < 90; i++) {
        const x = (i * 97) % W, y = (i * 53) % H;
        l += `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 12}"/>`;
      }
      out += `<g stroke="#dbeafe" stroke-width="1" opacity=".55">${l}</g>`;
      out += `<rect width="${W}" height="${H}" fill="#475569" opacity=".15"/>`;
    }
    if (meteo === 'neige') {
      let l = '';
      for (let i = 0; i < 70; i++) l += `<circle cx="${(i * 89) % W}" cy="${(i * 37) % H}" r="${1 + (i % 3) * 0.7}"/>`;
      out += `<g fill="#fff" opacity=".9">${l}</g>`;
    }
    if (meteo === 'brouillard') out += `<rect width="${W}" height="${H}" fill="url(#bro${uid})"/>`;
    if (meteo === 'nuit' || meteo === 'nuitpluie') {
      out += `<rect width="${W}" height="${H}" fill="#020617" opacity=".35"/>`;
    }
    return out;
  }

  function feuTricolore(fe) {
    const d = fe.d ?? 0.5;
    const x = X(R.droite + 0.3, d), y = Y(d), s = sc(d) * 1.4;
    const hp = 120 * s, bw = 22 * s, bh = 60 * s;
    const on = (k) => fe.etat === k || (fe.etat === 'clignotant' && k === 'orange');
    const col = { rouge: '#ef4444', orange: '#f59e0b', vert: '#22c55e' };
    let out = `<rect x="${f(x - 2 * s)}" y="${f(y - hp)}" width="${f(4 * s + 1)}" height="${f(hp)}" fill="#4b5563"/>`;
    out += `<rect x="${f(x - bw / 2)}" y="${f(y - hp - bh)}" width="${f(bw)}" height="${f(bh)}" rx="${f(4 * s)}" fill="#111"/>`;
    ['rouge', 'orange', 'vert'].forEach((k, i) => {
      const cy = y - hp - bh + bh * (0.18 + i * 0.32);
      out += `<circle cx="${f(x)}" cy="${f(cy)}" r="${f(7.5 * s)}" fill="${on(k) ? col[k] : '#2a2a2a'}">${fe.etat === 'clignotant' && k === 'orange' ? '<animate attributeName="opacity" values="1;1;0.1;0.1" dur="1s" repeatCount="indefinite"/>' : ''}</circle>`;
      if (on(k)) out += `<circle cx="${f(x)}" cy="${f(cy)}" r="${f(16 * s)}" fill="${col[k]}" opacity=".3"/>`;
    });
    if (fe.fleche) {
      const cy = y - hp + bh * 0.05, fx = x + bw * 0.1;
      out += `<rect x="${f(x - bw / 2)}" y="${f(y - hp + 2 * s)}" width="${f(bw)}" height="${f(bw)}" rx="${f(4 * s)}" fill="#111"/>`;
      out += `<path d="M${f(x - 6 * s)},${f(y - hp + 2 * s + bw / 2)} h${f(10 * s)}" stroke="#f59e0b" stroke-width="${f(3 * s)}"><animate attributeName="opacity" values="1;1;0.1;0.1" dur="1s" repeatCount="indefinite"/></path><polygon points="${f(x + 4 * s)},${f(y - hp + 2 * s + bw / 2 - 5 * s)} ${f(x + 9 * s)},${f(y - hp + 2 * s + bw / 2)} ${f(x + 4 * s)},${f(y - hp + 2 * s + bw / 2 + 5 * s)}" fill="#f59e0b"><animate attributeName="opacity" values="1;1;0.1;0.1" dur="1s" repeatCount="indefinite"/></polygon>`;
      void cy; void fx;
    }
    return out;
  }

  function tableauDeBord(spec, nuit) {
    let out = '';
    // capot
    out += `<path d="M0,${H} L0,${H - 14} Q200,${H - 34} 400,${H - 14} L400,${H} Z" fill="${spec.capot || '#1f2937'}"/>`;
    out += `<path d="M40,${H - 20} Q200,${H - 38} 360,${H - 20}" stroke="rgba(255,255,255,.12)" stroke-width="2" fill="none"/>`;
    if (spec.compteur !== undefined) {
      out += `<g transform="translate(${W - 58},${H - 40})"><circle r="30" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
        <text y="-2" font-size="17" font-weight="800" text-anchor="middle" fill="#fff" font-family="Arial">${spec.compteur}</text>
        <text y="13" font-size="8" text-anchor="middle" fill="#94a3b8" font-family="Arial">km/h</text></g>`;
    }
    if (spec.retro) {
      const r = spec.retro;
      out += `<g transform="translate(${W / 2 - 70},4)"><rect width="140" height="44" rx="12" fill="#111" /><g clip-path="url(#rc${uid})">
        <rect x="4" y="4" width="132" height="36" fill="${nuit ? '#0b1020' : '#9cc9f0'}"/><rect x="4" y="18" width="132" height="22" fill="${nuit ? '#10180f' : '#7fb069'}"/>
        <polygon points="70,18 30,40 120,40" fill="#4b5563"/>`;
      // Dans le rétroviseur, l'image est inversée : un véhicule qui veut me dépasser apparaît à droite de l'image.
      const vx = 70 + (r.L ?? -0.5) * -30 * (1 - (r.d ?? 0.5)), vy = 18 + 22 * (1 - (r.d ?? 0.5)), vw = 30 * (1 - (r.d ?? 0.5)) + 6;
      if (r.t === 'moto' || r.t === 'velo') out += `<rect x="${f(vx - vw * 0.1)}" y="${f(vy - vw * 0.6)}" width="${f(vw * 0.2)}" height="${f(vw * 0.6)}" fill="#111"/><circle cx="${f(vx)}" cy="${f(vy - vw * 0.7)}" r="${f(vw * 0.16)}" fill="#e11d48"/><circle cx="${f(vx)}" cy="${f(vy - vw * 0.3)}" r="${f(vw * 0.1)}" fill="#fffbe6"/>`;
      else if (r.t) {
        out += `<rect x="${f(vx - vw / 2)}" y="${f(vy - vw * (r.t === 'camion' || r.t === 'pompiers' ? 0.9 : 0.55))}" width="${f(vw)}" height="${f(vw * (r.t === 'camion' || r.t === 'pompiers' ? 0.9 : 0.55))}" rx="3" fill="${r.c || (r.t === 'pompiers' ? '#dc2626' : '#e5e7eb')}"/>`;
        out += `<rect x="${f(vx - vw * 0.4)}" y="${f(vy - vw * 0.25)}" width="${f(vw * 0.18)}" height="${f(vw * 0.08)}" fill="#fffbe6"/><rect x="${f(vx + vw * 0.22)}" y="${f(vy - vw * 0.25)}" width="${f(vw * 0.18)}" height="${f(vw * 0.08)}" fill="#fffbe6"/>`;
        if (r.t === 'pompiers' || r.t === 'police') out += gyro(vx, vy - vw * (r.t === 'pompiers' ? 0.95 : 0.6), 2.5);
        // Son clignotant gauche apparaît à droite dans le miroir.
        if (r.cli === 'g') out += clignotant(vx + vw * 0.5, vy - vw * 0.2, 2.2, true);
      }
      out += `</g><text x="70" y="52" font-size="8" text-anchor="middle" fill="#cbd5e1" font-family="Arial">rétroviseur</text></g>`;
      out += `<defs><clipPath id="rc${uid}"><rect x="4" y="4" width="132" height="36" rx="9"/></clipPath></defs>`;
    }
    return out;
  }


  // ---------- Tableau de bord et témoins ----------
  const TEMOINS = {
    croisement: ['#22c55e', `<path d="M26,9 Q14,9 14,20 Q14,31 26,31 Z"/><g stroke-width="2.6" stroke-linecap="round"><line x1="10" y1="11" x2="3" y2="15"/><line x1="10" y1="18" x2="3" y2="22"/><line x1="10" y1="25" x2="3" y2="29"/></g>`],
    route: ['#3b82f6', `<path d="M26,9 Q14,9 14,20 Q14,31 26,31 Z"/><g stroke-width="2.6" stroke-linecap="round"><line x1="10" y1="12" x2="2" y2="12"/><line x1="10" y1="20" x2="2" y2="20"/><line x1="10" y1="28" x2="2" y2="28"/></g>`],
    brouillardav: ['#22c55e', `<path d="M24,9 Q12,9 12,20 Q12,31 24,31 Z"/><g stroke-width="2.4" stroke-linecap="round"><line x1="9" y1="12" x2="2" y2="12"/><line x1="9" y1="20" x2="2" y2="20"/><line x1="9" y1="28" x2="2" y2="28"/></g><path d="M5,6 Q8,20 5,34" fill="none" stroke-width="2.2"/>`],
    brouillardar: ['#f59e0b', `<path d="M14,9 Q26,9 26,20 Q26,31 14,31 Z"/><g stroke-width="2.4" stroke-linecap="round"><line x1="29" y1="12" x2="37" y2="12"/><line x1="29" y1="20" x2="37" y2="20"/><line x1="29" y1="28" x2="37" y2="28"/></g><path d="M34,6 Q31,20 34,34" fill="none" stroke-width="2.2"/>`],
    huile: ['#ef4444', `<path d="M6,22 L12,16 L28,16 L36,12 L33,22 L28,28 L8,28 Z"/><path d="M36,12 Q38,18 36,22" fill="none" stroke-width="2"/><circle cx="37" cy="27" r="2"/>`],
    temperature: ['#ef4444', `<rect x="18" y="5" width="5" height="20" rx="2"/><circle cx="20.5" cy="27" r="5"/><g fill="none" stroke-width="2"><path d="M6,33 q4,-3 8,0 t8,0 t8,0 t8,0"/><line x1="23" y1="10" x2="29" y2="10"/><line x1="23" y1="16" x2="29" y2="16"/></g>`],
    frein: ['#ef4444', `<circle cx="20" cy="20" r="10" fill="none" stroke-width="2.6"/><path d="M7,10 Q3,20 7,30 M33,10 Q37,20 33,30" fill="none" stroke-width="2.6"/><rect x="18.6" y="13" width="2.8" height="9"/><circle cx="20" cy="26" r="1.7"/>`],
    batterie: ['#ef4444', `<rect x="5" y="12" width="30" height="19" rx="2" fill="none" stroke-width="2.6"/><rect x="9" y="8" width="5" height="4"/><rect x="26" y="8" width="5" height="4"/><g stroke-width="2.4"><line x1="9" y1="21" x2="15" y2="21"/><line x1="25" y1="21" x2="31" y2="21"/><line x1="28" y1="18" x2="28" y2="24"/></g>`],
    abs: ['#f59e0b', `<circle cx="20" cy="20" r="11" fill="none" stroke-width="2.4"/><path d="M6,10 Q2,20 6,30 M34,10 Q38,20 34,30" fill="none" stroke-width="2.4"/><text x="20" y="21" font-size="8.5" font-weight="900" text-anchor="middle" dominant-baseline="central" font-family="Arial" stroke="none">ABS</text>`],
    pneus: ['#f59e0b', `<path d="M8,12 Q6,26 10,32 L30,32 Q34,26 32,12" fill="none" stroke-width="2.6"/><g stroke-width="2"><line x1="8" y1="35" x2="12" y2="35"/><line x1="16" y1="35" x2="20" y2="35"/><line x1="24" y1="35" x2="28" y2="35"/></g><rect x="18.6" y="11" width="2.8" height="11"/><circle cx="20" cy="26" r="1.7"/>`],
    ceinture: ['#ef4444', `<circle cx="20" cy="7" r="4"/><path d="M12,36 L13,18 Q14,13 20,13 Q26,13 27,18 L28,36 Z"/><line x1="13" y1="16" x2="27" y2="33" stroke="#111" stroke-width="2.6"/>`],
    moteur: ['#f59e0b', `<path d="M8,14 L14,14 L14,11 L24,11 L24,14 L29,14 L32,18 L36,18 L36,28 L32,28 L29,31 L14,31 L11,27 L6,27 L6,17 Z" fill="none" stroke-width="2.4"/><line x1="2" y1="22" x2="6" y2="22" stroke-width="2.4"/>`],
    carburant: ['#f59e0b', `<rect x="8" y="8" width="16" height="26" rx="2"/><rect x="11" y="11" width="10" height="7" fill="#111"/><path d="M24,14 L30,18 L30,30 Q30,33 33,33 Q35,33 35,30 L35,16" fill="none" stroke-width="2.2"/>`],
  };
  function temoin(nom, x, y, taille, allume = true) {
    const [col, d] = TEMOINS[nom] || ['#999', ''];
    const c = allume ? col : '#3a3f47';
    return `<g transform="translate(${x},${y}) scale(${taille / 40})" fill="${c}" stroke="${c}" stroke-width="0">${allume ? `<circle cx="20" cy="20" r="22" fill="${col}" opacity=".18"/>` : ''}<g stroke="${c}">${d}</g></g>`;
  }
  function tableau(t) {
    let out = `<rect width="${W}" height="${H}" fill="#0b0f16"/><rect x="10" y="20" width="${W - 20}" height="${H - 40}" rx="40" fill="#141a24" stroke="#273041" stroke-width="3"/>`;
    const cadran = (cx, txt, val, max, unite) => {
      let o = `<circle cx="${cx}" cy="120" r="70" fill="#0f141c" stroke="#334155" stroke-width="3"/>`;
      for (let k = 0; k <= 10; k++) {
        const a = Math.PI * (0.75 + 1.5 * k / 10);
        o += `<line x1="${f(cx + 60 * Math.cos(a))}" y1="${f(120 + 60 * Math.sin(a))}" x2="${f(cx + 68 * Math.cos(a))}" y2="${f(120 + 68 * Math.sin(a))}" stroke="#94a3b8" stroke-width="2"/>`;
      }
      const a = Math.PI * (0.75 + 1.5 * Math.min(1, val / max));
      o += `<line x1="${cx}" y1="120" x2="${f(cx + 55 * Math.cos(a))}" y2="${f(120 + 55 * Math.sin(a))}" stroke="#f97316" stroke-width="3.5" stroke-linecap="round"/><circle cx="${cx}" cy="120" r="6" fill="#f97316"/>`;
      o += `<text x="${cx}" y="160" font-size="16" font-weight="800" fill="#e2e8f0" text-anchor="middle" font-family="Arial">${txt}</text><text x="${cx}" y="176" font-size="9" fill="#94a3b8" text-anchor="middle" font-family="Arial">${unite}</text>`;
      return o;
    };
    out += cadran(110, t.vitesse ?? 0, t.vitesse ?? 0, 200, 'km/h') + cadran(290, t.regime ?? 0, (t.regime ?? 800) / 1000, 7, 'tr/min');
    const liste = [].concat(t.voyants || []);
    const n = liste.length, taille = 52;
    liste.forEach((v, i) => { out += temoin(v, f(W / 2 - (n * (taille + 8)) / 2 + i * (taille + 8) + 4), 176, taille); });
    return `<svg class="scene" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tableau de bord">${out}</svg>`;
  }
  return (spec) => {
    uid++;
    if (spec.tableau) return tableau(spec.tableau);
    courbe = spec.virage || 0;
    const base = ROUTES[spec.route || 'route'];
    const n = spec.n || base.n, moi = spec.moi ?? base.moi;
    const lignes = spec.lignes || base.lignes;
    R = { ...base, n, moi, gauche: -moi - 0.5, droite: n - 1 - moi + 0.5 };
    const meteo = spec.meteo;
    const nuit = meteo === 'nuit' || meteo === 'nuitpluie';
    const asph = nuit ? '#2a2d33' : meteo === 'pluie' ? '#4b5058' : '#6b7079';
    let out = ciel(meteo);
    out += decor(spec, nuit);
    // chaussée
    out += bande(R.gauche - 0.04, R.droite + 0.04 + (base.bau ? 0.75 : 0), 0, 0.985, `fill="${asph}"`);
    if (base.terreplein) out += bande(R.gauche - 0.35, R.gauche - 0.04, 0, 0.985, `fill="#9ca3af"`) + bande(R.gauche - 0.3, R.gauche - 0.25, 0, 0.985, `fill="#d1d5db"`);
    if (meteo === 'pluie' || meteo === 'nuitpluie') out += bande(-0.3, 0.3, 0.05, 0.8, `fill="#cbd5e1" opacity=".12"`);
    if (meteo === 'neige') out += bande(R.gauche - 0.04, R.gauche + 0.25, 0, 0.98, `fill="#fff" opacity=".85"`) + bande(R.droite - 0.25, R.droite + 0.6, 0, 0.98, `fill="#fff" opacity=".85"`);
    // trous de lignes aux carrefours
    const trous = [];
    const c = spec.carrefour;
    if (c) {
      const dd = 0.1 * sc(c.d) + 0.035;
      trous.push([c.d - dd, c.d + dd]);
      const L0 = c.cote === 'gauche' ? -30 : R.gauche - 0.04, L1 = c.cote === 'droite' ? 30 : R.droite + 0.04;
      out += bande(L0, L1, c.d - dd, c.d + dd, `fill="${asph}"`, 4);
      if (c.cote !== 'gauche') out += `<polygon points="${f(X(R.droite, c.d - dd))},${f(Y(c.d - dd))} ${W + 50},${f(Y(c.d - dd))} ${W + 50},${f(Y(c.d + dd))} ${f(X(R.droite, c.d + dd))},${f(Y(c.d + dd))}" fill="${asph}"/>`;
      if (c.cote !== 'droite') out += `<polygon points="${f(X(R.gauche, c.d - dd))},${f(Y(c.d - dd))} -50,${f(Y(c.d - dd))} -50,${f(Y(c.d + dd))} ${f(X(R.gauche, c.d + dd))},${f(Y(c.d + dd))}" fill="${asph}"/>`;
      if (c.ligne === 'stop') out += bande(-0.5, 0.5, c.d - dd - 0.012, c.d - dd - 0.002, `fill="#fff"`, 2);
      if (c.ligne === 'cedez') for (let k = 0; k < 6; k++) out += bande(-0.48 + k * 0.17, -0.4 + k * 0.17, c.d - dd - 0.012, c.d - dd - 0.002, `fill="#fff"`, 2);
      if (c.lignesRue) {
        // lignes de la rue transversale (stop ou cédez) côté droit
        const yy = Y(c.d), x0 = X(R.droite + 0.15, c.d);
        out += `<line x1="${f(x0)}" y1="${f(Y(c.d - dd))}" x2="${f(x0)}" y2="${f(yy)}" stroke="#fff" stroke-width="${f(4 * sc(c.d))}" ${c.lignesRue === 'cedez' ? `stroke-dasharray="${f(5 * sc(c.d))} ${f(4 * sc(c.d))}"` : ''}/>`;
      }
    }
    if (spec.giratoire) {
      const d = spec.giratoire.d, y = Y(d), s = sc(d);
      const xc = X((R.gauche + R.droite) / 2, d);
      out += `<ellipse cx="${f(xc)}" cy="${f(y)}" rx="${f(520 * s)}" ry="${f(60 * s)}" fill="${asph}"/>`;
      out += `<ellipse cx="${f(xc)}" cy="${f(y - 4 * s)}" rx="${f(230 * s)}" ry="${f(26 * s)}" fill="#7fb069" stroke="#e5e7eb" stroke-width="${f(5 * s)}"/>`;
      out += `<circle cx="${f(xc)}" cy="${f(y - 40 * s)}" r="${f(28 * s)}" fill="#2f7d3b"/>`;
      trous.push([d - 0.1, 1]);
      for (let k = 0; k < 6; k++) out += bande(-0.48 + k * 0.17, -0.4 + k * 0.17, d - 0.115, d - 0.105, `fill="#fff"`, 2);
    }
    if (spec.tunnel) trous.push([spec.tunnel.d, 1]);
    // lignes entre voies
    for (let i = 0; i < n - 1; i++) out += ligne(i + 0.5 - moi, lignes[i] || 'discontinue', trous);
    // lignes de rive
    if (R.decor !== 'ville') {
      out += ligne(R.droite - 0.03, spec.rive || (base.bau ? 'continue' : 'discontinue'), trous);
      out += ligne(R.gauche + 0.03, base.terreplein ? 'continue' : spec.riveG || 'discontinue', trous);
    }
    if (base.bau) out += ligne(R.droite + 0.75, 'continue', trous);
    if (spec.pieton) {
      const d = spec.pieton.d;
      for (let k = 0; k < 9; k++) {
        const L = R.gauche + 0.08 + k * ((R.droite - R.gauche - 0.16) / 8.6);
        out += bande(L, L + 0.08, d - 0.025, d + 0.025, `fill="#f4f4f4"`, 2);
      }
    }
    if (spec.sas) {
      const d = spec.sas.d;
      out += bande(-0.5, 0.5, d - 0.012, d - 0.004, `fill="#fff"`, 2) + bande(-0.5, 0.5, d + 0.06, d + 0.068, `fill="#fff"`, 2);
      const x = X(0, d + 0.03), y = Y(d + 0.03), s = sc(d);
      out += `<g transform="translate(${f(x)},${f(y)}) scale(${f(s)}, ${f(s * 0.35)})"><circle cx="-22" cy="0" r="14" fill="none" stroke="#fff" stroke-width="5"/><circle cx="22" cy="0" r="14" fill="none" stroke="#fff" stroke-width="5"/><path d="M-22,0 L-5,-20 L15,-20 L22,0 M-5,-20 L0,0" stroke="#fff" stroke-width="5" fill="none"/></g>`;
    }
    if (spec.marquage) {
      // flèches au sol ou inscriptions : { d, L, txt } ou { d, L, fleche: 'droite' | 'gauche' | 'tout' }
      for (const m of [].concat(spec.marquage)) {
        const x = X(m.L ?? 0, m.d), y = Y(m.d), s = sc(m.d);
        if (m.txt) out += `<text x="${f(x)}" y="${f(y)}" font-size="${f(60 * s)}" transform="translate(${f(x)},${f(y)}) scale(1,0.4) translate(${f(-x)},${f(-y)})" text-anchor="middle" fill="${m.c || '#f4f4f4'}" font-family="Arial" font-weight="800">${m.txt}</text>`;
        if (m.fleche) {
          const sx = m.fleche === 'droite' ? 1 : m.fleche === 'gauche' ? -1 : 0;
          out += `<g transform="translate(${f(x)},${f(y)}) scale(${f(s)},${f(s * 0.4)})" fill="#f4f4f4"><rect x="-6" y="-70" width="12" height="70"/>${sx ? `<path d="M0,-70 Q0,-95 ${sx * 30},-95" stroke="#f4f4f4" stroke-width="12" fill="none"/><polygon points="${sx * 28},-112 ${sx * 55},-95 ${sx * 28},-78"/>` : '<polygon points="-20,-68 0,-100 20,-68"/>'}</g>`;
        }
      }
    }
    if (spec.pn) {
      const d = spec.pn.d;
      out += bande(R.gauche - 0.3, R.droite + 0.3, d - 0.015, d - 0.008, `fill="#9ca3af"`, 2) + bande(R.gauche - 0.3, R.droite + 0.3, d + 0.008, d + 0.015, `fill="#9ca3af"`, 2);
      const x = X(R.droite + 0.25, d), y = Y(d), s = sc(d);
      out += `<rect x="${f(x - 2 * s)}" y="${f(y - 110 * s)}" width="${f(4 * s)}" height="${f(110 * s)}" fill="#4b5563"/>`;
      // croix de Saint-André
      out += `<g transform="translate(${f(x)},${f(y - 120 * s)}) scale(${f(s)})"><rect x="-40" y="-6" width="80" height="12" fill="#fff" stroke="#dc2626" stroke-width="3" transform="rotate(30)"/><rect x="-40" y="-6" width="80" height="12" fill="#fff" stroke="#dc2626" stroke-width="3" transform="rotate(-30)"/></g>`;
      if (spec.pn.feu) out += `<g transform="translate(${f(x)},${f(y - 85 * s)}) scale(${f(s)})"><rect x="-24" y="-10" width="48" height="20" rx="4" fill="#111"/><circle cx="-12" r="7" fill="#ef4444"><animate attributeName="opacity" values="1;0.1" dur="0.6s" repeatCount="indefinite"/></circle><circle cx="12" r="7" fill="#ef4444"><animate attributeName="opacity" values="0.1;1" dur="0.6s" repeatCount="indefinite"/></circle></g>`;
      if (spec.pn.barrieres) {
        const xb = X(R.droite, d);
        out += `<line x1="${f(x)}" y1="${f(y - 30 * s)}" x2="${f(spec.pn.baissees ? X(-0.1, d) : x + 5 * s)}" y2="${f(spec.pn.baissees ? y - 30 * s : y - 220 * s)}" stroke="#dc2626" stroke-width="${f(7 * s)}" stroke-dasharray="${f(14 * s)} ${f(14 * s)}"/>`;
        out += `<line x1="${f(x)}" y1="${f(y - 30 * s)}" x2="${f(spec.pn.baissees ? X(-0.1, d) : x + 5 * s)}" y2="${f(spec.pn.baissees ? y - 30 * s : y - 220 * s)}" stroke="#fff" stroke-width="${f(7 * s)}" stroke-dasharray="${f(14 * s)} ${f(14 * s)}" stroke-dashoffset="${f(14 * s)}"/>`;
        void xb;
      }
    }
    if (spec.tunnel) {
      const d = spec.tunnel.d, y = Y(d), s = sc(d);
      const xl = X(R.gauche - 0.3, d), xr = X(R.droite + 0.3, d);
      out += `<path d="M${f(xl - 400 * s)},${f(y)} L${f(xl - 400 * s)},${f(y - 330 * s)} L${f(xr + 400 * s)},${f(y - 330 * s)} L${f(xr + 400 * s)},${f(y)} L${f(xr)},${f(y)} L${f(xr)},${f(y - 150 * s)} Q${f((xl + xr) / 2)},${f(y - 290 * s)} ${f(xl)},${f(y - 150 * s)} L${f(xl)},${f(y)} Z" fill="#8b8f96"/>`;
      out += `<path d="M${f(xr)},${f(y)} L${f(xr)},${f(y - 150 * s)} Q${f((xl + xr) / 2)},${f(y - 290 * s)} ${f(xl)},${f(y - 150 * s)} L${f(xl)},${f(y)} Z" fill="#14161a"/>`;
      for (let k = 0; k < 5; k++) out += `<circle cx="${f(xl + (xr - xl) * (0.2 + k * 0.15))}" cy="${f(y - 190 * s + Math.abs(k - 2) * 12 * s)}" r="${f(3 * s + 1)}" fill="#fde68a"/>`;
    }
    for (const cn of spec.cones || []) {
      const x = X(cn.L, cn.d), y = Y(cn.d), s = sc(cn.d);
      out += `<polygon points="${f(x - 9 * s)},${f(y)} ${f(x + 9 * s)},${f(y)} ${f(x)},${f(y - 30 * s)}" fill="#f97316"/><rect x="${f(x - 6 * s)}" y="${f(y - 17 * s)}" width="${f(12 * s)}" height="${f(5 * s)}" fill="#fff"/>`;
    }
    // objets triés du plus loin au plus près
    const objets = [];
    for (const pn of spec.panneaux || []) objets.push([pn.d, () => panneau(pn)]);
    if (spec.feu) objets.push([spec.feu.d, () => feuTricolore(spec.feu)]);
    for (const v of spec.v || []) objets.push([v.d ?? 0.5, () => vehicule(v, nuit)]);
    for (const p of spec.p || []) objets.push([p.d, () => {
      const x = X(p.L, p.d), y = Y(p.d), h = 105 * sc(p.d) * (p.enfant ? 0.65 : 1);
      let o = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(h * 0.2)}" ry="${f(h * 0.04)}" fill="rgba(0,0,0,.3)"/>` + personne(x, y, h, p.c || (p.enfant ? '#7c3aed' : '#1f2937'), p.enfant);
      if (p.ballon) o += `<circle cx="${f(X(p.ballon, p.d))}" cy="${f(y - h * 0.1)}" r="${f(h * 0.1)}" fill="#ef4444" stroke="#fff" stroke-width="${f(h * 0.02)}"/>`;
      if (p.label) o += `<circle cx="${f(x)}" cy="${f(y - h * 1.2)}" r="9" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="${f(x)}" y="${f(y - h * 1.2)}" font-size="11" text-anchor="middle" dominant-baseline="central" font-weight="800" font-family="Arial">${p.label}</text>`;
      return o;
    }]);
    if (spec.agent) objets.push([spec.agent.d, () => {
      const a = spec.agent, x = X(a.L ?? -0.5, a.d), y = Y(a.d), h = 110 * sc(a.d);
      let o = personne(x, y, h, '#1e3a8a');
      o += `<rect x="${f(x - h * 0.12)}" y="${f(y - h * 0.98)}" width="${f(h * 0.24)}" height="${f(h * 0.08)}" fill="#1e3a8a"/>`;
      if (a.bras === 'leve') o += `<line x1="${f(x)}" y1="${f(y - h * 0.68)}" x2="${f(x + h * 0.05)}" y2="${f(y - h * 1.15)}" stroke="#1e3a8a" stroke-width="${f(h * 0.17)}" stroke-linecap="round"/>`;
      if (a.profil) o += `<line x1="${f(x)}" y1="${f(y - h * 0.68)}" x2="${f(x - h * 0.5)}" y2="${f(y - h * 0.68)}" stroke="#1e3a8a" stroke-width="${f(h * 0.17)}" stroke-linecap="round"/><line x1="${f(x)}" y1="${f(y - h * 0.68)}" x2="${f(x + h * 0.5)}" y2="${f(y - h * 0.68)}" stroke="#1e3a8a" stroke-width="${f(h * 0.17)}" stroke-linecap="round"/>`;
      o += `<rect x="${f(x - h * 0.1)}" y="${f(y - h * 0.62)}" width="${f(h * 0.2)}" height="${f(h * 0.05)}" fill="#facc15"/>`;
      return o;
    }]);
    objets.sort((a, b) => b[0] - a[0]);
    for (const [, fn] of objets) out += fn();
    if (nuit) {
      // faisceau de mes phares
      out += `<polygon points="${f(X(-0.45, 0))},${H} ${f(X(-0.3, 0.55))},${f(Y(0.55))} ${f(X(0.55, 0.55))},${f(Y(0.55))} ${f(X(0.6, 0))},${H}" fill="#fffbe6" opacity="${spec.pleinsPhares ? 0.22 : 0.13}"/>`;
    }
    out += meteoOverlay(meteo);
    out += tableauDeBord(spec, nuit);
    return `<svg class="scene" viewBox="0 0 ${W} ${H}" role="img" aria-label="Situation de conduite">${out}</svg>`;
  };
})();

// ---------- Vue de dessus d'un carrefour ----------
// PLAN({ type: 'croix' | 'T' | 'giratoire', branches: { s: { p: 'stop' }, n: {...}, e: {...}, o: {...} },
//        v: [{ b: 's', dir: 'g' | 'd' | 'tout', label: 'A', c: couleur, moi: true, t: 'voiture' | 'velo' | 'camion' | 'pieton' | 'bus' }] })
const PLAN = (() => {
  const S = 300, C = 150, RW = 30; // demi-largeur de chaussée
  const ANG = { s: 0, e: -90, n: 180, o: 90 }; // rotation : véhicule venant du sud monte vers le nord
  let uid = 0;
  function voiture(v) {
    const c = v.moi ? '#ef4444' : v.c || '#2563eb';
    if (v.t === 'velo') return `<rect x="-3" y="-12" width="6" height="24" rx="3" fill="#111"/><circle cy="-1" r="5" fill="${c}"/>`;
    if (v.t === 'pieton') return `<circle r="6" fill="${c}"/>`;
    const L = v.t === 'camion' || v.t === 'bus' ? 46 : 30, w = v.t === 'camion' || v.t === 'bus' ? 22 : 18;
    let o = `<rect x="${-w / 2}" y="${-L / 2}" width="${w}" height="${L}" rx="5" fill="${c}" stroke="rgba(0,0,0,.4)"/>`;
    o += `<rect x="${-w / 2 + 3}" y="${-L / 2 + 6}" width="${w - 6}" height="7" rx="2" fill="#bfdbfe"/>`;
    if (v.t === 'pompiers' || v.t === 'police') o += `<circle cy="0" r="3.5" fill="#3b82f6"><animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite"/></circle>`;
    if (v.dir === 'g' || v.dir === 'd') {
      const x = v.dir === 'g' ? -w / 2 : w / 2;
      o += `<circle cx="${x}" cy="${-L / 2 + 3}" r="3" fill="#ffae00"><animate attributeName="opacity" values="1;1;0.1;0.1" dur="0.9s" repeatCount="indefinite"/></circle>`;
    }
    return o;
  }
  // Trajectoire en coordonnées « venant du sud », puis tournée.
  function chemin(dir, depart, giratoire) {
    const x = RW / 2;
    if (giratoire) {
      const r = 52;
      if (dir === 'd') return `M${C + x},${depart} L${C + x},${C + r + 6} Q${C + x},${C + RW} ${C + RW + 20},${C + x}  L${S - 6},${C + x}`;
      if (dir === 'tout') return `M${C + x},${depart} L${C + x},${C + r + 8} A${r},${r} 0 0 0 ${C + r},${C} A${r},${r} 0 0 0 ${C + x},${C - r - 8} L${C + x},6`;
      return `M${C + x},${depart} L${C + x},${C + r + 8} A${r},${r} 0 0 0 ${C + r},${C} A${r},${r} 0 0 0 ${C},${C - r} A${r},${r} 0 0 0 ${C - r - 8},${C - x} L6,${C - x}`;
    }
    if (dir === 'tout') return `M${C + x},${depart} L${C + x},6`;
    if (dir === 'd') return `M${C + x},${depart} L${C + x},${C + RW + 4} Q${C + x},${C + x} ${C + RW + 4},${C + x} L${S - 6},${C + x}`;
    return `M${C + x},${depart} L${C + x},${C + 4} Q${C + x},${C - x} ${C - 4},${C - x} L6,${C - x}`;
  }
  return (spec) => {
    uid++;
    const type = spec.type || 'croix';
    const br = { s: {}, n: {}, e: {}, o: {}, ...(spec.branches || {}) };
    if (type === 'T') delete br[spec.sans || 'n'];
    let out = `<defs><marker id="fl${uid}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#fde047"/></marker></defs>`;
    out += `<rect width="${S}" height="${S}" fill="#7fb069"/>`;
    for (const k of Object.keys(br)) {
      out += `<g transform="rotate(${ANG[k]} ${C} ${C})"><rect x="${C - RW}" y="${C}" width="${RW * 2}" height="${S - C}" fill="#5b616b"/>
        <line x1="${C}" y1="${C + RW + 6}" x2="${C}" y2="${S}" stroke="#f4f4f4" stroke-width="2" stroke-dasharray="${br[k].continue ? '0' : '12 10'}"/></g>`;
    }
    out += `<rect x="${C - RW}" y="${C - RW}" width="${RW * 2}" height="${RW * 2}" fill="#5b616b"/>`;
    if (type === 'giratoire') out += `<circle cx="${C}" cy="${C}" r="74" fill="#5b616b"/><circle cx="${C}" cy="${C}" r="34" fill="#7fb069" stroke="#e5e7eb" stroke-width="3"/>`;
    // lignes d'arrêt et panneaux par branche (côté droit de la voie entrante)
    for (const [k, b] of Object.entries(br)) {
      const yl = type === 'giratoire' ? C + 78 : C + RW + 4;
      let g = '';
      if (b.p === 'stop') g += `<line x1="${C}" y1="${yl}" x2="${C + RW}" y2="${yl}" stroke="#fff" stroke-width="4"/>`;
      if (b.p === 'cedez' || type === 'giratoire') g += `<line x1="${C}" y1="${yl}" x2="${C + RW}" y2="${yl}" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/>`;
      if (b.pieton) for (let i = 0; i < 6; i++) g += `<rect x="${C - RW + 3 + i * 10}" y="${yl + 6}" width="5" height="16" fill="#f4f4f4"/>`;
      if (b.p) g += `<g transform="translate(${C + RW + 22},${yl + 14}) rotate(${-ANG[k]})"><g transform="translate(-13,-13) scale(.26)">${PANNEAUX(b.p).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g></g>`;
      if (b.feu) {
        const col = { rouge: '#ef4444', orange: '#f59e0b', vert: '#22c55e' }[b.feu];
        g += `<g transform="translate(${C + RW + 14},${yl + 8}) rotate(${-ANG[k]})"><rect x="-6" y="-14" width="12" height="28" rx="3" fill="#111"/><circle cy="${b.feu === 'rouge' ? -8 : b.feu === 'orange' ? 0 : 8}" r="4" fill="${col}"/></g>`;
      }
      out += `<g transform="rotate(${ANG[k]} ${C} ${C})">${g}</g>`;
    }
    // véhicules
    for (const v of spec.v || []) {
      const dist = v.loin ? 70 : 0;
      const yc = (type === 'giratoire' ? C + 100 : C + RW + 24) + dist;
      let g = '';
      if (v.dir && !v.anneau) g += `<path d="${chemin(v.dir, yc - 16, type === 'giratoire')}" stroke="#fde047" stroke-width="3" fill="none" stroke-dasharray="6 5" marker-end="url(#fl${uid})" opacity=".9"/>`;
      if (v.anneau) {
        // véhicule déjà sur l'anneau (position en degrés, 0 = devant la branche)
        g += `<g transform="rotate(${v.anneau} ${C} ${C}) translate(${C - 54},${C}) rotate(0)">${voiture(v)}</g>`;
      } else g += `<g transform="translate(${C + RW / 2},${yc})">${voiture(v)}</g>`;
      const lx = v.anneau ? null : C + RW / 2 + (v.t === 'pieton' ? 0 : 22);
      if (v.label || v.moi) {
        const txt = v.moi ? 'Moi' : v.label;
        const lw = txt.length > 1 ? 30 : 18;
        if (v.anneau) g += `<g transform="rotate(${v.anneau} ${C} ${C}) translate(${C - 54},${C - 26})"><g transform="rotate(${-v.anneau - ANG[v.b]})"><rect x="${-lw / 2}" y="-9" width="${lw}" height="18" rx="9" fill="#fff" stroke="#111"/><text text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="800" font-family="Arial">${txt}</text></g></g>`;
        else g += `<g transform="translate(${lx + (v.t === 'pieton' ? -26 : 0)},${yc + 10})"><g transform="rotate(${-ANG[v.b]})"><rect x="${-lw / 2}" y="-9" width="${lw}" height="18" rx="9" fill="#fff" stroke="${v.moi ? '#ef4444' : '#111'}" stroke-width="${v.moi ? 2 : 1}"/><text text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="800" font-family="Arial">${txt}</text></g></g>`;
      }
      if (v.t === 'pieton') g = `<g transform="translate(${C - RW - 8},${(type === 'giratoire' ? C + 84 : C + RW + 14)})"><circle r="6" fill="${v.c || '#7c3aed'}"/><path d="M4,0 L${RW * 2 + 4},0" stroke="#fde047" stroke-width="2.5" stroke-dasharray="4 4" marker-end="url(#fl${uid})"/></g>` + (v.label ? `<g transform="translate(${C - RW - 22},${(type === 'giratoire' ? C + 84 : C + RW + 14)})"><g transform="rotate(${-ANG[v.b]})"><rect x="-9" y="-9" width="18" height="18" rx="9" fill="#fff" stroke="#111"/><text text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="800" font-family="Arial">${v.label}</text></g></g>` : '');
      out += `<g transform="rotate(${ANG[v.b]} ${C} ${C})">${g}</g>`;
    }
    // rose des vents discrète
    return `<svg class="scene plan" viewBox="0 0 ${S} ${S}" role="img" aria-label="Carrefour vu de dessus">${out}</svg>`;
  };
})();
