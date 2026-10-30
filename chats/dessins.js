// Dessins des chats partagés par les jeux OustaCats (Sudochat, Chacun son panier).
// La page doit contenir <defs id="cat-defs"> dans un <svg> caché, puis appeler defineCats().

// Les chats des jeux OustaCats, dans l'ordre où ils entrent en jeu
// (Sudochat 4×4 : les 4 premiers, 6×6 : les 6 premiers, 9×9 : les 9 premiers).
const CATS = [
  { name: 'Caramel', fur: '#f08a24', ear: '#ffc6a8', eye: '#7cc243', marks: 'tabby', dark: '#b4550c' },
  { name: 'Réglisse', fur: '#2a2a30', ear: '#5b5560', eye: '#f5d90a', light: true },
  { name: 'Neige', fur: '#fbfbf6', ear: '#ffc8d2', eye: '#47a3ff' },
  { name: 'Grisou', fur: '#8d97a6', ear: '#f3b9c4', eye: '#f39c1d', muzzle: '#d9dee6' },
  { name: 'Saphir', fur: '#f1e4c9', ear: '#5a3b28', eye: '#3d8bff', marks: 'siamese' },
  { name: 'Patchouli', fur: '#fbfbf6', ear: '#ffc8d2', eye: '#58b04a', marks: 'calico' },
  { name: 'Moka', fur: '#7b4a2d', ear: '#c99a85', eye: '#c7d93a', light: true },
  { name: 'Biscuit', fur: '#e8c48a', ear: '#ffcfb8', eye: '#a0612a', muzzle: '#fbf3e4' },
  { name: 'Gaston', fur: '#2a2a30', ear: '#5b5560', eye: '#8fd16a', marks: 'tuxedo', light: true },
  { name: 'Zébulon', fur: '#fbfbf6', ear: '#ffc8d2', eye: '#e8a317', marks: 'cow' },
];

function catMarkup(c) {
  const line = c.light ? '#d8d2c8' : '#3b2a20';
  const out = c.fur === '#fbfbf6' || c.fur === '#f1e4c9' ? '#b9ae9e' : 'none';
  let ears = [c.fur, c.fur];
  let marks = '';
  if (c.marks === 'tabby') {
    marks = `<path d="M50 28v11M40 30l3 9M60 30l-3 9M13 56h11M14 64h9M87 56h-11M86 64h-9" stroke="${c.dark}" stroke-width="4" stroke-linecap="round"/>`;
  } else if (c.marks === 'siamese') {
    ears = ['#5a3b28', '#5a3b28'];
    marks = '<ellipse cx="50" cy="66" rx="21" ry="18" fill="#6b4630" opacity=".8"/>';
  } else if (c.marks === 'calico') {
    ears = ['#f08a24', '#2a2a30'];
    marks = '<path d="M13 52Q16 30 42 28Q42 44 30 54Q20 62 13 52Z" fill="#f08a24"/><path d="M58 27Q82 28 87 50Q72 50 62 40Z" fill="#2a2a30"/>';
  } else if (c.marks === 'cow') {
    ears = ['#2a2a30', c.fur];
    marks = '<path d="M14 50Q14 30 36 29Q46 40 40 52Q28 60 14 50Z" fill="#2a2a30"/><ellipse cx="70" cy="40" rx="8" ry="6" fill="#2a2a30"/><ellipse cx="78" cy="78" rx="6" ry="4.5" fill="#2a2a30"/>';
  } else if (c.marks === 'tuxedo') {
    marks = '<path d="M50 34L41 66Q50 74 59 66Z" fill="#fbfbf6"/><ellipse cx="50" cy="76" rx="17" ry="12" fill="#fbfbf6"/>';
  } else if (c.muzzle) {
    marks = `<ellipse cx="50" cy="74" rx="17" ry="12" fill="${c.muzzle}"/>`;
  }
  const tie = c.marks === 'tuxedo'
    ? '<path d="M36 87L48 92L36 98ZM64 87L52 92L64 98Z" fill="#e11d48"/><circle cx="50" cy="92" r="4" fill="#be123c"/>' : '';
  const eye = (x) => `<ellipse cx="${x}" cy="56" rx="7.5" ry="8.5" fill="${c.eye}"/><ellipse cx="${x}" cy="57" rx="2.3" ry="6" fill="#111"/><circle cx="${x + 2.5}" cy="53" r="1.9" fill="#fff"/>`;
  return `<g stroke="${out}" stroke-width="2">
    <path d="M16 48L21 7L48 30Z" fill="${ears[0]}"/><path d="M84 48L79 7L52 30Z" fill="${ears[1]}"/>
    <ellipse cx="50" cy="59" rx="38" ry="33" fill="${c.fur}"/></g>
    <path d="M24 36L26 17L40 30Z" fill="${c.ear}" opacity=".85"/><path d="M76 36L74 17L60 30Z" fill="${c.ear}" opacity=".85"/>
    ${marks}${eye(36)}${eye(64)}
    <path d="M45 67h10l-5 5.5z" fill="#f28b9b"/>
    <path d="M50 72q-4 6-9 3M50 72q4 6 9 3M30 70L7 66M30 74L7 77M70 70L93 66M70 74L93 77" stroke="${line}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${tie}`;
}

function defineCats() {
  document.getElementById('cat-defs').innerHTML = CATS.map((c, i) => `<symbol id="cat${i}" viewBox="0 0 100 100">${catMarkup(c)}</symbol>`).join('');
}
const cat = (v) => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#cat${v}"/></svg>`;
