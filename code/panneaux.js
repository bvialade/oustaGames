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
    pistecyclable: () => carre(emo('🚲', 50, 52, 44, 'w')),
  };

  return (nom) => {
    uid++;
    const d = dessins[nom];
    return d ? `<svg class="sign" viewBox="0 0 100 100" role="img" aria-label="Panneau">${filtres()}${d()}</svg>` : '';
  };
})();
