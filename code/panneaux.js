// Panneaux dessinés en SVG (dessins simplifiés, sans image externe).
// panneau('stop') renvoie le code SVG. Les pictogrammes sont des émojis passés en silhouette par un filtre.
const PANNEAUX = (() => {
  const ROUGE = '#d7262e', BLEU = '#1f5fbf', JAUNE = '#f6c200';
  let uid = 0;

  const triangle = (inner, fond = '#fff') =>
    `<polygon points="50,9 94,86 6,86" fill="${fond}" stroke="${ROUGE}" stroke-width="9" stroke-linejoin="round"/>${inner}`;
  const rond = (inner) => `<circle cx="50" cy="50" r="41" fill="#fff" stroke="${ROUGE}" stroke-width="10"/>${inner}`;
  const rondBleuBordRouge = (inner) =>
    `<circle cx="50" cy="50" r="41" fill="${BLEU}" stroke="${ROUGE}" stroke-width="10"/>${inner}`;
  const obligation = (inner) => `<circle cx="50" cy="50" r="45" fill="${BLEU}" stroke="#fff" stroke-width="3"/>${inner}`;
  const carre = (inner) => `<rect x="7" y="7" width="86" height="86" rx="8" fill="${BLEU}" stroke="#fff" stroke-width="3"/>${inner}`;
  const losange = (inner) =>
    `<polygon points="50,3 97,50 50,97 3,50" fill="#fff" stroke="#333" stroke-width="1.5"/>
     <polygon points="50,16 84,50 50,84 16,50" fill="${JAUNE}"/>${inner}`;
  // Émoji en silhouette (couleur : 'k' noir, 'w' blanc, 'r' rouge).
  const emo = (ch, x, y, size, col = 'k') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central" filter="url(#f${col}${uid})">${ch}</text>`;
  const txt = (t, x, y, size, col = '#111', w = 800) =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${w}" text-anchor="middle" dominant-baseline="central" fill="${col}" font-family="Arial, Helvetica, sans-serif">${t}</text>`;
  // Silhouette de piéton dessinée (x, y : position des pieds, h : taille).
  const marcheur = (x, y, h, pelle = false) => {
    const w = h * 0.16, top = y - h;
    return `<g stroke="#111" stroke-width="${w}" stroke-linecap="round" fill="none">
      <line x1="${x}" y1="${top + h * 0.3}" x2="${x - h * 0.04}" y2="${top + h * 0.62}"/>
      <line x1="${x - h * 0.04}" y1="${top + h * 0.62}" x2="${x - h * 0.22}" y2="${y}"/>
      <line x1="${x - h * 0.04}" y1="${top + h * 0.62}" x2="${x + h * 0.18}" y2="${y}"/>
      <line x1="${x}" y1="${top + h * 0.34}" x2="${x + h * 0.2}" y2="${top + h * 0.55}"/>
      <line x1="${x}" y1="${top + h * 0.34}" x2="${x - h * 0.2}" y2="${top + h * 0.52}"/>
      ${pelle ? `<line x1="${x + h * 0.2}" y1="${top + h * 0.55}" x2="${x + h * 0.42}" y2="${y}"/>` : ''}</g>
      <circle cx="${x + h * 0.02}" cy="${top + h * 0.12}" r="${h * 0.12}" fill="#111"/>`;
  };
  // Trois flèches tournant dans le sens inverse des aiguilles d'une montre.
  const tourne = (cx, cy, r) => {
    let out = '';
    for (let k = 0; k < 3; k++) {
      const a0 = (k * 120 + 20) * Math.PI / 180, a1 = a0 + 75 * Math.PI / 180;
      const P = (a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
      const [x0, y0] = P(a0), [x1, y1] = P(a1);
      const tx = -Math.sin(a1), ty = -Math.cos(a1), nx = Math.cos(a1), ny = -Math.sin(a1);
      out += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 0 ${x1.toFixed(1)},${y1.toFixed(1)}" stroke="#111" stroke-width="4.5" fill="none"/>`;
      out += `<polygon fill="#111" points="${(x1 + tx * 7).toFixed(1)},${(y1 + ty * 7).toFixed(1)} ${(x1 + nx * 5.5).toFixed(1)},${(y1 + ny * 5.5).toFixed(1)} ${(x1 - nx * 5.5).toFixed(1)},${(y1 - ny * 5.5).toFixed(1)}"/>`;
    }
    return out;
  };
  const filtres = () => {
    const m = (r, g, b) => `<feColorMatrix type="matrix" values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 1 0"/>`;
    return `<defs><filter id="fk${uid}">${m(0.07, 0.07, 0.07)}</filter><filter id="fw${uid}">${m(1, 1, 1)}</filter><filter id="fr${uid}">${m(0.84, 0.15, 0.18)}</filter></defs>`;
  };

  const dessins = {
    stop: () => `<polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="#fff"/>
      <polygon points="32,9 68,9 91,32 91,68 68,91 32,91 9,68 9,32" fill="${ROUGE}"/>${txt('STOP', 50, 51, 25, '#fff')}`,
    cedez: () => `<polygon points="6,14 94,14 50,91" fill="#fff" stroke="${ROUGE}" stroke-width="9" stroke-linejoin="round"/>`,
    priorite: () => losange(''),
    finprio: () => losange(`<line x1="24" y1="76" x2="76" y2="24" stroke="#111" stroke-width="7"/>`),
    priodroite: () => triangle(`<line x1="36" y1="44" x2="64" y2="76" stroke="#111" stroke-width="7"/><line x1="64" y1="44" x2="36" y2="76" stroke="#111" stroke-width="7"/>`),
    prioponc: () => triangle(`<line x1="50" y1="36" x2="50" y2="80" stroke="#111" stroke-width="10"/><line x1="32" y1="60" x2="68" y2="60" stroke="#111" stroke-width="5"/>`),
    feux: () => triangle(`<rect x="41" y="35" width="18" height="45" rx="5" fill="#111"/>
      <circle cx="50" cy="43" r="5" fill="${ROUGE}"/><circle cx="50" cy="57" r="5" fill="#f59e0b"/><circle cx="50" cy="71" r="5" fill="#16a34a"/>`),
    giratoire: () => triangle(tourne(50, 62, 13)),
    pietons: () => triangle(marcheur(50, 79, 40)),
    enfants: () => triangle(marcheur(41, 79, 32) + marcheur(60, 79, 26)),
    verglas: () => triangle(emo('❄️', 50, 62, 30)),
    travaux: () => triangle(marcheur(46, 79, 36, true) + '<path d="M58,80 Q66,68 76,80 Z" fill="#111"/>', JAUNE),
    danger: () => triangle(txt('!', 50, 62, 40)),
    sensinterdit: () => `<circle cx="50" cy="50" r="46" fill="${ROUGE}"/><rect x="17" y="41" width="66" height="18" fill="#fff"/>`,
    interdit: () => rond(''),
    v50: () => rond(txt('50', 50, 52, 38)),
    v30: () => rond(txt('30', 50, 52, 38)),
    v90: () => rond(txt('90', 50, 52, 38)),
    vmin: () => obligation(txt('30', 50, 52, 38, '#fff')),
    depasser: () => rond(emo('🚗', 36, 51, 24, 'r') + emo('🚗', 64, 51, 24)),
    arret: () => rondBleuBordRouge(`<line x1="22" y1="22" x2="78" y2="78" stroke="${ROUGE}" stroke-width="9"/><line x1="78" y1="22" x2="22" y2="78" stroke="${ROUGE}" stroke-width="9"/>`),
    stationnement: () => rondBleuBordRouge(`<line x1="22" y1="22" x2="78" y2="78" stroke="${ROUGE}" stroke-width="9"/>`),
    droite: () => obligation(`<line x1="26" y1="50" x2="60" y2="50" stroke="#fff" stroke-width="11"/><polygon points="56,32 78,50 56,68" fill="#fff"/>`),
    velo: () => obligation(emo('🚲', 50, 52, 40, 'w')),
    impasse: () => carre(`<rect x="43" y="36" width="14" height="50" fill="#fff"/><rect x="28" y="22" width="44" height="13" fill="${ROUGE}"/>`),
    rencontre: () => carre(`<rect x="13" y="13" width="74" height="74" rx="4" fill="#fff"/>${txt('20', 50, 32, 22)}${marcheur(36, 78, 30)}${emo('🚗', 64, 68, 18)}`),
    v70: () => rond(txt('70', 50, 52, 38)),
    v80: () => rond(txt('80', 50, 52, 38)),
    v110: () => rond(txt('110', 50, 52, 30)),
    v130: () => rond(txt('130', 50, 52, 30)),
    finv50: () => `<circle cx="50" cy="50" r="44" fill="#fff" stroke="#111" stroke-width="2"/>${txt('50', 50, 52, 38, '#9ca3af')}<line x1="22" y1="78" x2="78" y2="22" stroke="#111" stroke-width="6"/>`,
    fininterdictions: () => `<circle cx="50" cy="50" r="44" fill="#fff" stroke="#111" stroke-width="2"/>${[-12, -4, 4, 12].map((o) => `<line x1="${22 + o}" y1="${78 + o}" x2="${78 + o}" y2="${22 + o}" stroke="#111" stroke-width="2.5"/>`).join('')}`,
    zone30: () => `<rect x="4" y="16" width="92" height="68" rx="6" fill="#fff" stroke="#333" stroke-width="2"/>
      <circle cx="50" cy="44" r="20" fill="#fff" stroke="${ROUGE}" stroke-width="6"/>${txt('30', 50, 45, 20)}${txt('ZONE', 50, 74, 15)}`,
    agglo: () => `<rect x="3" y="26" width="94" height="48" fill="#fff" stroke="${ROUGE}" stroke-width="5"/>${txt('VILLEBOURG', 50, 51, 13)}`,
    finagglo: () => `<rect x="3" y="26" width="94" height="48" fill="#fff" stroke="${ROUGE}" stroke-width="5"/>${txt('VILLEBOURG', 50, 51, 13)}<line x1="8" y1="70" x2="92" y2="30" stroke="${ROUGE}" stroke-width="5"/>`,
    autoroute: () => carre(`<path d="M30,88 L44,30 M70,88 L56,30" stroke="#fff" stroke-width="7"/><path d="M50,88 L50,30" stroke="#fff" stroke-width="3" stroke-dasharray="7 6"/><rect x="24" y="24" width="52" height="9" fill="#fff"/>`),
    finautoroute: () => carre(`<path d="M30,88 L44,30 M70,88 L56,30" stroke="#fff" stroke-width="7"/><rect x="24" y="24" width="52" height="9" fill="#fff"/><line x1="18" y1="86" x2="84" y2="16" stroke="${ROUGE}" stroke-width="7"/>`),
    parking: () => carre(txt('P', 50, 53, 62, '#fff')),
    bus: () => carre(`<rect x="15" y="34" width="70" height="34" rx="3" fill="#fff"/>${txt('BUS', 50, 52, 24, BLEU)}`),
    prioinverse: () => carre(`<line x1="36" y1="80" x2="36" y2="34" stroke="#fff" stroke-width="9"/><polygon points="24,38 36,18 48,38" fill="#fff"/>
      <line x1="64" y1="20" x2="64" y2="62" stroke="${ROUGE}" stroke-width="7"/><polygon points="55,58 64,76 73,58" fill="${ROUGE}"/>`),
    cedezinverse: () => rond(`<line x1="38" y1="30" x2="38" y2="72" stroke="#111" stroke-width="7"/><polygon points="29,66 38,82 47,66" fill="#111"/>
      <line x1="62" y1="74" x2="62" y2="34" stroke="${ROUGE}" stroke-width="7"/><polygon points="53,38 62,20 71,38" fill="${ROUGE}"/>`),
    interditgauche: () => rond(`<path d="M58,78 L58,48 Q58,40 50,40 L36,40" stroke="#111" stroke-width="8" fill="none"/><polygon points="38,30 22,40 38,50" fill="#111"/><line x1="22" y1="22" x2="78" y2="78" stroke="${ROUGE}" stroke-width="8"/>`),
    demitour: () => rond(`<path d="M62,78 L62,44 Q62,28 48,28 Q36,28 36,44 L36,58" stroke="#111" stroke-width="7" fill="none"/><polygon points="27,54 36,70 45,54" fill="#111"/><line x1="22" y1="22" x2="78" y2="78" stroke="${ROUGE}" stroke-width="8"/>`),
    interditpl: () => rond(emo('🚚', 50, 52, 38)),
    virage: () => triangle(`<path d="M44,80 L44,62 Q44,50 56,46" stroke="#111" stroke-width="7" fill="none"/><polygon points="52,38 66,44 54,54" fill="#111"/>`),
    retrecie: () => triangle(`<path d="M38,82 L38,70 Q38,60 44,54 L44,40 M62,82 L62,70 Q62,60 56,54 L56,40" stroke="#111" stroke-width="5" fill="none"/>`),
    glissante: () => triangle(emo('🚗', 50, 54, 22) + `<path d="M36,78 q4,-6 8,0 t8,0 M50,80 q4,-6 8,0" stroke="#111" stroke-width="3" fill="none"/>`),
    descente: () => triangle(`<polygon points="24,80 76,80 24,52" fill="#111"/>${txt('10%', 58, 60, 15)}`),
    pnbarriere: () => triangle(`<rect x="28" y="58" width="44" height="12" fill="#fff" stroke="#111" stroke-width="3"/><rect x="34" y="58" width="8" height="12" fill="#111"/><rect x="50" y="58" width="8" height="12" fill="#111"/><line x1="30" y1="70" x2="30" y2="82" stroke="#111" stroke-width="3"/><line x1="70" y1="70" x2="70" y2="82" stroke="#111" stroke-width="3"/>`),
    pnsans: () => triangle(emo('🚂', 50, 63, 32)),
    tunnel: () => carre(`<path d="M20,86 L20,52 Q20,26 50,26 Q80,26 80,52 L80,86 Z" fill="#fff"/><path d="M32,86 L32,56 Q32,38 50,38 Q68,38 68,56 L68,86 Z" fill="${BLEU}"/>`),
    cedezcycliste: () => `<rect x="4" y="22" width="92" height="56" rx="6" fill="#fff" stroke="#333" stroke-width="2"/><polygon points="12,32 44,32 28,60" fill="#fff" stroke="${ROUGE}" stroke-width="5" stroke-linejoin="round"/>${emo('🚲', 64, 46, 24)}<path d="M84,66 L84,40" stroke="#111" stroke-width="4"/><polygon points="78,44 84,32 90,44" fill="#111"/>`,
    pietonsobl: () => obligation(marcheur(50, 82, 56).replace(/#111/g, '#fff')),
    voieverte: () => carre(`<rect x="12" y="12" width="76" height="76" rx="4" fill="#16a34a"/>${marcheur(32, 76, 34).replace(/#111/g, '#fff')}${emo('🚲', 64, 60, 26, 'w')}`),
    pistecyclable: () => carre(emo('🚲', 50, 52, 44, 'w')),
  };

  return (nom) => {
    uid++;
    const d = dessins[nom];
    return d ? `<svg class="sign" viewBox="0 0 100 100" role="img" aria-label="Panneau">${filtres()}${d()}</svg>` : '';
  };
})();
