// Isoloir 2027 : on glisse des cartes d'affirmations, le jeu calcule de quel candidat on est le plus proche.
const STORE = 'ousta.isoloir';
const C = DATA.candidats, Q = DATA.questions, T = DATA.themes;
const RAPIDE = 15;
const PREMIER_TOUR = new Date('2027-04-18T08:00:00+02:00');
const COULEURS = ['#fbbf24', '#fb7185', '#a78bfa', '#22d3ee', '#a3e635', '#f472b6', '#fdba74', '#2dd4bf', '#86efac',
  '#c084fc', '#fcd34d', '#93c5fd', '#fb923c', '#818cf8', '#5eead4', '#facc15', '#38bdf8', '#e879f9', '#34d399',
  '#f0abfc', '#bef264', '#fda4af', '#7dd3fc'];
const LIBELLES = { '-2': 'Pas du tout', '-1': 'Plutôt non', 0: 'Neutre', 1: 'Plutôt oui', 2: 'Tout à fait' };
const $ = (id) => document.getElementById(id);
const app = $('app');

const prefs = Object.assign({ partie: null, dernier: null, nom: '', vu: false }, load());
let duel = null; // { nom, code } quand on arrive par un lien de défi

function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function save() { try { localStorage.setItem(STORE, JSON.stringify(prefs)); } catch {} }
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const theme = (id) => T.find((t) => t.id === id);
const initiales = (nom) => nom.split(/[ -]/).filter((m) => m && m[0] === m[0].toUpperCase()).map((m) => m[0]).join('').slice(0, 2);
// Photo Wikimedia Commons par-dessus les initiales ; si elle ne charge pas (hors ligne), on garde les initiales.
const photo = (ci, w = 160) => C[ci].photo ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(C[ci].photo)}?width=${w}` : '';
const pagePhoto = (ci) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(C[ci].photo)}`;
const avatar = (ci, cls = '') => `<span class="avatar ${cls}" style="background:${COULEURS[ci]};--c:${COULEURS[ci]}">${initiales(C[ci].nom)}${C[ci].photo ? `<img src="${photo(ci)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
const vibre = (ms = 10) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

/* ---------- Calcul ---------- */
// reps : { [indexQuestion]: { v: -2..2 | null (je passe), c: bool (important) } }
function scores(reps, filtre, poidsThemes) {
  const repondues = Object.keys(reps).map(Number).filter((qi) => reps[qi].v !== null && (!filtre || filtre(qi)));
  return C.map((cand, ci) => {
    let s = 0, w = 0, n = 0;
    for (const qi of repondues) {
      const p = Q[qi].pos[ci];
      if (p === null) continue;
      const poids = (reps[qi].c ? 2 : 1) * (poidsThemes ? poidsThemes[Q[qi].theme] ?? 1 : 1);
      if (!poids) continue;
      // Écart rapporté au plus grand écart possible face à cette position : évite d'avantager
      // les candidats aux positions nuancées quand on répond au hasard.
      s += poids * (1 - Math.abs(reps[qi].v - p) / (2 + Math.abs(p)));
      w += poids; n++;
    }
    return { ci, pct: w ? (100 * s) / w : null, n, partiel: repondues.length > 0 && n / repondues.length < 0.6 };
  });
}
function classement(reps, filtre, poidsThemes) {
  const r = scores(reps, filtre, poidsThemes).filter((x) => x.pct !== null).sort((a, b) => b.pct - a.pct);
  const k = r.findIndex((x) => !x.partiel); // un candidat aux données partielles ne peut pas être premier
  if (k > 0) r.unshift(r.splice(k, 1)[0]);
  return r;
}
// Position sur la carte : x (-1 plus d'État, +1 plus de marché), y (-1 ouverture, +1 fermeté).
function coords(val) {
  const acc = { x: [0, 0], y: [0, 0] };
  Q.forEach((q, qi) => {
    if (!q.axe) return;
    const v = val(qi);
    if (v === null || v === undefined) return;
    acc[q.axe[0]][0] += (v * q.axe[1]) / 2; acc[q.axe[0]][1]++;
  });
  return { x: acc.x[1] ? acc.x[0] / acc.x[1] : 0, y: acc.y[1] ? acc.y[0] / acc.y[1] : 0 };
}

/* ---------- Liens de duel ---------- */
// Un caractère par question : . non posée, x je passe, 0-4 réponse, A-E réponse avec cœur.
function encode(reps) {
  return Q.map((_, qi) => {
    const r = reps[qi];
    if (!r) return '.';
    if (r.v === null) return 'x';
    return r.c ? 'ABCDE'[r.v + 2] : String(r.v + 2);
  }).join('');
}
function decode(code) {
  const reps = {};
  [...code].forEach((ch, qi) => {
    if (qi >= Q.length || ch === '.') return;
    if (ch === 'x') reps[qi] = { v: null, c: false };
    else if (/[0-4]/.test(ch)) reps[qi] = { v: +ch - 2, c: false };
    else if (/[A-E]/.test(ch)) reps[qi] = { v: ch.charCodeAt(0) - 67, c: true };
  });
  return reps;
}
function accord(a, b) {
  let s = 0, w = 0;
  const detail = [];
  for (const k of Object.keys(a)) {
    if (!b[k] || a[k].v === null || b[k].v === null) continue;
    const poids = a[k].c || b[k].c ? 2 : 1;
    s += poids * (1 - Math.abs(a[k].v - b[k].v) / 4); w += poids;
    detail.push({ qi: +k, a: a[k].v, b: b[k].v });
  }
  return { pct: w ? (100 * s) / w : null, detail };
}

/* ---------- Accueil ---------- */
function bulletins() {
  const box = $('bulletins');
  if (box.childElementCount) return;
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('i');
    b.style.left = `${Math.random() * 100}%`;
    b.style.animationDuration = `${9 + Math.random() * 10}s`;
    b.style.animationDelay = `${-Math.random() * 18}s`;
    box.appendChild(b);
  }
}
let tic;
function compteur() {
  const el = $('compte');
  if (!el) return clearInterval(tic);
  let ms = PREMIER_TOUR - Date.now();
  if (ms < 0) ms = 0;
  const j = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  el.innerHTML = [[j, 'jours'], [h, 'heures'], [m, 'min'], [s, 'sec']]
    .map(([n, l]) => `<div><b>${String(n).padStart(2, '0')}</b><span>${l}</span></div>`).join('');
}

function accueil() {
  clearInterval(tic);
  bulletins();
  const p = prefs.partie;
  app.innerHTML = `<section class="screen">
    <div class="hero">
      <div class="logo">🗳️</div>
      <h2 class="grad">Isoloir 2027</h2>
      <p>Réponds aux questions, découvre de quel candidat tu es le plus proche.</p>
    </div>
    <div class="compte" id="compte"></div>
    <div class="sous-compte">avant le 1er tour, le dimanche 18 avril 2027</div>
    ${duel ? `<div class="duel-banner">⚔️ <b>${esc(duel.nom || 'Un proche')}</b> te défie ! Réponds aux mêmes ${Object.keys(decode(duel.code)).length} questions et compare.<button class="btn go" id="b-duel" style="margin-top:10px">Relever le défi</button></div>` : ''}
    ${p ? `<button class="btn go" id="b-reprendre">Reprendre ma partie<small>${Object.keys(p.reps).length} / ${p.ordre.length} réponses</small></button>` : ''}
    <button class="btn ${p || duel ? 'secondary' : 'go'}" id="b-rapide">Partie rapide<small>${RAPIDE} questions · 3 minutes</small></button>
    <button class="btn secondary" id="b-complete">Partie complète<small>${Q.length} questions · 8 minutes</small></button>
    ${prefs.dernier ? `<button class="btn secondary" id="b-dernier">Mon dernier résultat</button>` : ''}
    <p class="avert">Un jeu pour s'amuser et s'informer, pas une consigne de vote.<br>
    ${C.length} candidats, positions au ${dateFr(DATA.maj)} d'après les synthèses de <a href="${DATA.source}" target="_blank" rel="noopener">France-Vote</a>. <a href="#" id="l-methode">Méthode et grille complète</a></p>
  </section>`;
  compteur(); tic = setInterval(compteur, 1000);
  const on = (id, f) => $(id) && ($(id).onclick = f);
  on('b-reprendre', () => jouer());
  on('b-rapide', () => nouvelle('rapide'));
  on('b-complete', () => nouvelle('complete'));
  on('b-dernier', () => resultats(prefs.dernier, false));
  on('b-duel', () => nouvelle('duel'));
  on('l-methode', (e) => { e.preventDefault(); methode(); });
}
const dateFr = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/^1 /, '1er ');

/* ---------- Partie ---------- */
function nouvelle(mode) {
  let choisies;
  if (mode === 'duel') {
    choisies = Object.keys(decode(duel.code)).map(Number);
  } else if (mode === 'rapide') {
    const parTheme = T.map((t) => shuffle(Q.map((q, i) => i).filter((i) => Q[i].theme === t.id)));
    choisies = parTheme.map((l) => l[0]);
    const reste = shuffle(parTheme.flatMap((l) => l.slice(1)));
    choisies.push(...reste.slice(0, RAPIDE - choisies.length));
  } else {
    choisies = Q.map((q, i) => i);
  }
  // Questions groupées par thème, thèmes dans un ordre au hasard.
  const ordre = shuffle(T.map((t) => t.id)).flatMap((id) => shuffle(choisies.filter((i) => Q[i].theme === id)));
  prefs.partie = { mode, ordre, reps: {}, duel: mode === 'duel' ? duel : null };
  save();
  jouer();
}

let precedent = null; // classement avant la dernière réponse, pour animer les montées

function jouer() {
  clearInterval(tic);
  const p = prefs.partie;
  const i = Object.keys(p.reps).length;
  if (i >= p.ordre.length) return fin();
  const qi = p.ordre[i], q = Q[qi], th = theme(q.theme);
  app.innerHTML = `<section>
    <div class="hud"><span class="theme-chip">${th.emoji} ${th.nom}</span><div class="bar"><i id="prog"></i></div><span class="n">${i + 1}/${p.ordre.length}</span></div>
    <div class="pile">
      <div class="carte arrive ${!prefs.vu ? 'hint' : ''}" id="carte">
        <div class="fantome"></div>
        <div class="teinte" id="teinte"></div>
        <div class="tampon oui" id="t-oui">D'ACCORD</div>
        <div class="tampon non" id="t-non">PAS D'ACCORD</div>
        <div class="tete"><span class="muted small">${!prefs.vu ? 'Glisse à droite si tu es d\'accord, à gauche sinon' : 'Question ' + (i + 1)}</span>
          <button class="coeur" id="coeur">♥ Important</button></div>
        <div class="texte">${esc(q.texte)}</div>
        <button class="comprendre" id="comprendre">Comprendre ›</button>
        <div class="ctx" id="ctx" hidden><p>${esc(q.ctx)}</p><p><b>Pour :</b> ${esc(q.pour)}</p><p><b>Contre :</b> ${esc(q.contre)}</p></div>
      </div>
    </div>
    <div class="reponses">
      ${[-2, -1, 0, 1, 2].map((v) => `<button class="r${v}" data-v="${v}"><b>${['−−', '−', '=', '+', '++'][v + 2]}</b>${LIBELLES[v]}</button>`).join('')}
    </div>
    <div class="actions">
      <button class="lien" id="annuler" ${i ? '' : 'hidden'}>↶ Précédente</button>
      <button class="lien" id="passer">Je passe ›</button>
    </div>
    <div class="direct" id="direct" ${i ? '' : 'hidden'}><h3>Classement en direct</h3><div class="live" id="live"></div></div>
  </section>`;
  requestAnimationFrame(() => { $('prog').style.width = `${(100 * i) / p.ordre.length}%`; });
  let coeur = false;
  $('coeur').onclick = () => { coeur = !coeur; $('coeur').classList.toggle('on', coeur); vibre(); };
  $('comprendre').onclick = () => { const c = $('ctx'); c.hidden = !c.hidden; $('comprendre').textContent = c.hidden ? 'Comprendre ›' : 'Masquer'; };
  app.querySelectorAll('.reponses button').forEach((b) => (b.onclick = () => repondre(+b.dataset.v, coeur, Math.sign(+b.dataset.v))));
  $('passer').onclick = () => repondre(null, false, 0);
  $('annuler').onclick = () => {
    delete p.reps[p.ordre[i - 1]];
    save(); precedent = null; jouer();
  };
  swipe($('carte'), (v) => repondre(v, coeur, Math.sign(v)));
  live(!!precedent);
  precedent = null;
}

function repondre(v, coeur, sens) {
  const p = prefs.partie;
  const i = Object.keys(p.reps).length;
  const qi = p.ordre[i];
  prefs.vu = true;
  precedent = classement(p.reps);
  p.reps[qi] = { v, c: v === null ? false : coeur };
  save();
  vibre(v === null ? 5 : Math.abs(v) === 2 ? 25 : 12);
  const carte = $('carte');
  carte.style.transition = 'transform .35s ease-in, opacity .35s';
  carte.style.transform = sens ? `translateX(${sens * 130}%) rotate(${sens * 18}deg)` : 'translateY(-40px) scale(.9)';
  carte.style.opacity = '0';
  const n = i + 1;
  setTimeout(() => {
    if (n % 5 === 0 && n < p.ordre.length) flash(n, () => jouer());
    else jouer();
  }, 260);
}

function swipe(el, done) {
  let x0 = null, y0 = 0, dx = 0, dy = 0, actif = false;
  const oui = $('t-oui'), non = $('t-non'), teinte = $('teinte');
  const niveau = () => (Math.abs(dx) > 170 ? 2 : Math.abs(dx) > 80 ? 1 : 0);
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    x0 = e.clientX; y0 = e.clientY; dx = dy = 0; actif = false;
    el.style.transition = 'none'; el.classList.remove('hint', 'arrive');
  });
  el.addEventListener('pointermove', (e) => {
    if (x0 === null) return;
    dx = e.clientX - x0; dy = e.clientY - y0;
    if (!actif && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { actif = true; el.setPointerCapture(e.pointerId); }
    if (!actif) return;
    el.style.transform = `translate(${dx}px, ${dy * 0.2}px) rotate(${dx / 16}deg)`;
    const n = niveau(), r = Math.min(1, Math.abs(dx) / 120);
    oui.style.opacity = dx > 0 ? r : 0; non.style.opacity = dx < 0 ? r : 0;
    oui.textContent = n === 2 ? 'TOUT À FAIT !' : "D'ACCORD";
    non.textContent = n === 2 ? 'PAS DU TOUT !' : "PAS D'ACCORD";
    teinte.style.opacity = r * (n === 2 ? 0.4 : 0.22);
    teinte.style.background = dx > 0 ? 'var(--oui)' : 'var(--non)';
    if (n !== el._n) { if (n) vibre(n === 2 ? 15 : 6); el._n = n; }
  });
  const fin = () => {
    if (x0 === null) return;
    x0 = null;
    const n = niveau();
    if (actif && n) return done(Math.sign(dx) * n);
    el.style.transition = 'transform .3s cubic-bezier(.2,.9,.3,1.3)';
    el.style.transform = '';
    oui.style.opacity = non.style.opacity = teinte.style.opacity = 0;
  };
  el.addEventListener('pointerup', fin);
  el.addEventListener('pointercancel', fin);
}

function live(anime = true) {
  const box = $('live');
  if (!box) return;
  const r = classement(prefs.partie.reps);
  if (!r.length) return;
  const avant = precedent ? Object.fromEntries(precedent.map((x, k) => [x.ci, { k, pct: x.pct }])) : {};
  const rangs = Object.fromEntries(r.map((x, k) => [x.ci, x]));
  box.innerHTML = C.map((c, ci) => {
    const x = rangs[ci];
    const k = x ? r.indexOf(x) : 99;
    const depart = avant[ci] ? avant[ci].k : k;
    const pct = x ? x.pct : 0;
    return `<div class="ligne" data-ci="${ci}" style="transform:translateY(${Math.min(depart, 6) * 34}px);opacity:${depart < 5 ? 1 : 0}">
      ${avatar(ci)}<span class="nom">${esc(c.nom.replace(/^\S+ /, ''))}</span>
      <span class="jauge"><i style="width:${avant[ci] ? avant[ci].pct : pct}%;background:${COULEURS[ci]}"></i></span>
      <span class="pct">${Math.round(pct)}%</span></div>`;
  }).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    box.querySelectorAll('.ligne').forEach((l) => {
      const ci = +l.dataset.ci, x = rangs[ci];
      const k = x ? r.indexOf(x) : 99;
      l.style.transform = `translateY(${Math.min(k, 6) * 34}px)`;
      l.style.opacity = k < 5 ? 1 : 0;
      l.querySelector('.jauge i').style.width = `${x ? x.pct : 0}%`;
      if (anime && avant[ci] && k < 5 && avant[ci].k > k) {
        const d = document.createElement('span');
        d.className = 'delta'; d.textContent = `▲${avant[ci].k - k}`;
        l.appendChild(d);
      }
    });
  }));
}

function flash(n, suite) {
  const r = classement(prefs.partie.reps);
  const t = r[0];
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `<div class="flash"><div class="petit">Après ${n} questions</div>
    <div style="margin:14px auto 0;display:grid;place-items:center">${avatar(t.ci, 'big')}</div>
    <div class="gros">${esc(C[t.ci].nom)}</div><div class="muted">en tête avec ${Math.round(t.pct)} %</div></div>`;
  o.querySelector('.avatar').style.cssText += ';width:64px;height:64px;font-size:1.3rem';
  document.body.appendChild(o);
  vibre(20);
  const ferme = () => { o.remove(); suite(); };
  o.onclick = ferme;
  setTimeout(() => o.isConnected && ferme(), 1600);
}

/* ---------- Dépouillement ---------- */
function fin() {
  const p = prefs.partie;
  const res = { reps: p.reps, mode: p.mode, duel: p.duel, date: Date.now() };
  prefs.dernier = res; prefs.partie = null; save();
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `<div class="urne-scene"><div class="urne"><div class="enveloppe"></div><div class="fente"></div><div class="boite"></div></div><p>Dépouillement…</p></div>`;
  document.body.appendChild(o);
  vibre(30);
  setTimeout(() => { o.remove(); resultats(res, true); }, 1900);
}

/* ---------- Résultats ---------- */
let onglet = 'classement';
const ONGLETS = ['duel', 'classement', 'themes', 'carte', 'hemicycle', 'partage'];
const court = (ci) => C[ci].nom.replace(/^\S+ /, '');
const pourcent = (x) => `${Math.round(x)} %`;

// Questions où l'on est d'accord / pas d'accord avec un candidat.
function ecarts(ci, reps) {
  return Object.keys(reps).map(Number)
    .filter((qi) => reps[qi].v !== null && Q[qi].pos[ci] !== null)
    .map((qi) => ({ qi, v: reps[qi].v, p: Q[qi].pos[ci], gap: Math.abs(reps[qi].v - Q[qi].pos[ci]) }));
}

function resultats(res, premiere) {
  clearInterval(tic);
  res.poids = res.poids || {};
  const r = classement(res.reps);
  if (!r.length) {
    app.innerHTML = `<section class="screen"><p>Tu as passé toutes les questions : impossible de te situer !</p><button class="btn go" id="b-acc">Rejouer</button></section>`;
    $('b-acc').onclick = accueil; return;
  }
  const g = r[0];
  const exaequo = r[1] && !r[1].partiel && g.pct - r[1].pct < 1 ? r[1] : null;
  const neutres = Object.values(res.reps).filter((x) => x.v === 0).length;
  const e = ecarts(g.ci, res.reps);
  const proches = e.filter((x) => x.gap <= 1).length;
  // Thèmes où l'on colle le plus au gagnant.
  const fort = T.map((t) => ({ t, x: scores(res.reps, (qi) => Q[qi].theme === t.id)[g.ci] }))
    .filter((y) => y.x.pct !== null).sort((a, b) => b.x.pct - a.x.pct).slice(0, 2);
  onglet = res.duel ? 'duel' : 'classement';
  const marches = [r[1], r[0], r[2]].map((x, k) => x && `<div class="marche m${[2, 1, 3][k]}" style="--d:${[0.9, 1.6, 0.3][k]}s" data-ci="${x.ci}">
      ${k === 1 ? '<div class="couronne">👑</div>' : ''}${avatar(x.ci)}
      <div class="pn">${esc(court(x.ci))}</div>
      <div class="pp" data-pct="${x.pct}">${premiere ? '0 %' : pourcent(x.pct)}</div>
      <div class="socle">${[2, 1, 3][k]}</div></div>`).join('');
  app.innerHTML = `<section class="screen res">
    <div class="podium ${premiere ? 'anime' : ''}">${marches}</div>
    <div class="verdict">
      <div class="label">${exaequo ? 'Ex aequo en tête' : 'Ton candidat le plus proche'}</div>
      <div class="nom">${esc(C[g.ci].nom)}${exaequo ? ` <span class="muted">et</span> ${esc(C[exaequo.ci].nom)}` : ''}</div>
      <div class="muted small">${esc(C[g.ci].parti)}${exaequo ? ` · ${esc(C[exaequo.ci].parti)}` : ''}</div>
      <p>Vous êtes sur la même ligne pour <b>${proches} question${proches > 1 ? 's' : ''} sur ${e.length}</b>${fort.length ? `, surtout en ${fort.map((y) => `${y.t.emoji} ${y.t.nom.toLowerCase()}`).join(' et ')}` : ''}.</p>
      ${neutres > Object.keys(res.reps).length / 2 ? `<p class="note">Résultat peu marqué : plus de la moitié de tes réponses sont « Neutre ».</p>` : ''}
    </div>
    <div class="onglets" id="onglets">
      ${res.duel ? '<button data-o="duel">⚔️ Duel</button>' : ''}
      <button data-o="classement">🏆 Classement</button>
      <button data-o="themes">📊 Thèmes</button>
      <button data-o="carte">🧭 Carte</button>
      <button data-o="hemicycle">🏛️ Hémicycle</button>
      <button data-o="partage">📤 Partager</button>
    </div>
    <div id="vue"></div>
    <button class="btn secondary" id="b-rejouer" style="margin-top:18px">Rejouer</button>
  </section>`;
  window.scrollTo(0, 0);
  app.querySelectorAll('.marche').forEach((m) => {
    const pp = m.querySelector('.pp');
    if (premiere) setTimeout(() => compteAnime(pp, +pp.dataset.pct, 900), parseFloat(m.style.getPropertyValue('--d')) * 1000 + 300);
    m.onclick = () => fiche(+m.dataset.ci, res.reps);
  });
  if (premiere) setTimeout(confettis, 2100);
  $('b-rejouer').onclick = () => { duel = null; history.replaceState(null, '', location.pathname); accueil(); };
  const ongl = $('onglets');
  const dispo = ONGLETS.filter((o) => ongl.querySelector(`[data-o="${o}"]`));
  const montre = (o) => {
    onglet = o;
    ongl.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', b.dataset.o === o);
      if (b.dataset.o === o) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
    const vue = $('vue');
    vue.classList.remove('glisse'); void vue.offsetWidth; vue.classList.add('glisse');
    ({ classement: vueClassement, hemicycle: vueHemicycle, carte: vueCarte, themes: vueThemes, partage: vuePartage, duel: vueDuel })[o](res);
  };
  ongl.querySelectorAll('button').forEach((b) => (b.onclick = () => montre(b.dataset.o)));
  // Glisser à gauche / à droite sur la vue pour changer d'onglet.
  let x0 = null, y0 = 0;
  const vue = $('vue');
  vue.addEventListener('touchstart', (ev) => { x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; }, { passive: true });
  vue.addEventListener('touchend', (ev) => {
    if (x0 === null) return;
    const dx = ev.changedTouches[0].clientX - x0, dy = ev.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 50) return;
    const k = dispo.indexOf(onglet) + (dx < 0 ? 1 : -1);
    if (k >= 0 && k < dispo.length) montre(dispo[k]);
  });
  montre(onglet);
}

function compteAnime(el, cible, ms) {
  if (!ms) { el.textContent = pourcent(cible); return; }
  const t0 = performance.now();
  const pas = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = pourcent(cible * e);
    if (k < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}

/* Classement : réglage de l'importance des thèmes, lignes qui se déplient. */
function vueClassement(res) {
  const joues = T.filter((t) => Object.keys(res.reps).some((qi) => Q[qi].theme === t.id && res.reps[qi].v !== null));
  const regle = Object.values(res.poids).some((w) => w !== 1);
  $('vue').innerHTML = `<div class="reglage ${regle ? 'ouvert' : ''}" id="reglage">
      <button class="reg-tete" id="reg-tete"><span>🎚️ Ce qui compte pour toi</span><span class="muted small" id="reg-etat">${regle ? 'réglages actifs' : 'touche pour régler'}</span></button>
      <div class="reg-corps"><p class="note">Touche un thème : ×1 normal, ×2 très important, ×0 ignoré. Le classement se met à jour en direct.</p>
      <div class="tchips">${joues.map((t) => { const w = res.poids[t.id] ?? 1;
        return `<button class="tchip w${w}" data-t="${t.id}">${t.emoji} ${t.nom}<i>×${w}</i></button>`; }).join('')}</div>
      <button class="lien small" id="reg-raz">Tout remettre à ×1</button></div>
    </div>
    <div id="liste"></div>
    <p class="note">Touche un candidat pour voir vos accords et désaccords.</p>`;
  $('reg-tete').onclick = () => $('reglage').classList.toggle('ouvert');
  $('vue').querySelectorAll('.tchip').forEach((b) => (b.onclick = () => {
    const w = res.poids[b.dataset.t] ?? 1;
    const n = w === 1 ? 2 : w === 2 ? 0 : 1;
    res.poids[b.dataset.t] = n;
    b.className = `tchip w${n}`; b.querySelector('i').textContent = `×${n}`;
    vibre(8); majListe(res); save();
    $('reg-etat').textContent = Object.values(res.poids).some((x) => x !== 1) ? 'réglages actifs' : 'touche pour régler';
  }));
  $('reg-raz').onclick = () => { res.poids = {}; save(); vueClassement(res); };
  const r = classement(res.reps, null, res.poids);
  $('liste').innerHTML = r.map((x, k) => ligneRang(x, k, r.length)).join('');
  $('liste').querySelectorAll('.rang').forEach((el) => brancheRang(el, res));
  if (prefs.dernier === res) save();
}
function ligneRang(x, k, n) {
  return `<div class="rang ${x.partiel ? 'partiel' : ''}" data-ci="${x.ci}" style="animation-delay:${(n - k) * 50}ms">
    <div class="rang-ligne"><span class="num">${k + 1}</span>${avatar(x.ci)}
      <div class="info"><b>${esc(C[x.ci].nom)}</b><span>${esc(C[x.ci].parti)}${x.partiel ? ' · données partielles' : ''}</span>
        <div class="jauge"><i style="width:${x.pct}%;background:${COULEURS[x.ci]}"></i></div></div>
      <span class="pct">${pourcent(x.pct)}</span><span class="chevron">›</span></div>
    <div class="detail"></div></div>`;
}
function brancheRang(el, res) {
  el.querySelector('.rang-ligne').onclick = () => {
    const ouvert = el.classList.toggle('ouvert');
    if (ouvert) remplitDetail(el.querySelector('.detail'), +el.dataset.ci, res);
    vibre(6);
  };
}
function remplitDetail(box, ci, res) {
  const e = ecarts(ci, res.reps);
  const acc = e.filter((x) => x.gap <= 1).sort((a, b) => a.gap - b.gap || Math.abs(b.v) - Math.abs(a.v)).slice(0, 3);
  const des = e.filter((x) => x.gap >= 2).sort((a, b) => b.gap - a.gap).slice(0, 3);
  const parTheme = T.map((t) => ({ t, x: scores(res.reps, (qi) => Q[qi].theme === t.id)[ci] })).filter((y) => y.x.pct !== null);
  const item = (x, ok) => `<li><span class="${ok ? 'ok' : 'ko'}">${ok ? '✔' : '✘'}</span><div>${esc(Q[x.qi].texte)}<small>Toi : ${LIBELLES[x.v]} · ${esc(court(ci))} : ${LIBELLES[x.p]}</small></div></li>`;
  box.innerHTML = `<div class="detail-in">
    ${acc.length ? `<h5>Vous êtes d'accord</h5><ul>${acc.map((x) => item(x, true)).join('')}</ul>` : ''}
    ${des.length ? `<h5>Vous divergez</h5><ul>${des.map((x) => item(x, false)).join('')}</ul>` : ''}
    <h5>Thème par thème</h5>
    <div class="mini">${parTheme.map((y) => `<div title="${y.t.nom}"><span>${y.t.emoji}</span><b style="height:${Math.max(4, y.x.pct)}%;background:${couleurPct(y.x.pct)}"></b><em>${Math.round(y.x.pct)}</em></div>`).join('')}</div>
    <button class="btn secondary" style="margin-top:10px">Toutes les questions et les sources</button></div>`;
  box.querySelector('.btn').onclick = () => fiche(ci, res.reps);
}
// Réordonne la liste en animant les déplacements (technique FLIP).
function majListe(res) {
  const liste = $('liste');
  if (!liste) return;
  const avant = {};
  liste.querySelectorAll('.rang').forEach((el) => (avant[el.dataset.ci] = el.getBoundingClientRect().top));
  const r = classement(res.reps, null, res.poids);
  r.forEach((x, k) => {
    const el = liste.querySelector(`.rang[data-ci="${x.ci}"]`);
    el.querySelector('.num').textContent = k + 1;
    el.querySelector('.pct').textContent = pourcent(x.pct);
    el.querySelector('.jauge i').style.width = `${x.pct}%`;
    el.classList.toggle('partiel', x.partiel);
    el.style.animation = 'none'; el.style.opacity = 1;
    liste.appendChild(el);
    if (el.classList.contains('ouvert')) remplitDetail(el.querySelector('.detail'), x.ci, res);
  });
  liste.querySelectorAll('.rang').forEach((el) => {
    const d = avant[el.dataset.ci] - el.getBoundingClientRect().top;
    if (!d) return;
    el.style.transition = 'none'; el.style.transform = `translateY(${d}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = 'transform .55s cubic-bezier(.3,.9,.3,1)'; el.style.transform = '';
    }));
  });
}
const couleurPct = (p) => `hsl(${Math.round(Math.max(0, Math.min(100, p)) * 1.25)}, 70%, 48%)`;

/* Thèmes : tableau de chaleur thèmes × 5 premiers candidats. */
function vueThemes(res) {
  const top = classement(res.reps, null, res.poids).slice(0, 5);
  const lignes = T.map((t) => ({ t, s: scores(res.reps, (qi) => Q[qi].theme === t.id) })).filter((y) => top.some((x) => y.s[x.ci].pct !== null));
  if (!lignes.length) { $('vue').innerHTML = '<p class="note">Pas assez de réponses.</p>'; return; }
  $('vue').innerHTML = `<div class="heat" style="grid-template-columns:minmax(0,1.3fr) repeat(${top.length}, minmax(0,1fr))">
      <div></div>${top.map((x) => `<div class="hc-tete">${avatar(x.ci)}<span>${esc(court(x.ci))}</span></div>`).join('')}
      ${lignes.map((y, i) => {
        const vals = top.map((x) => y.s[x.ci].pct);
        const best = Math.max(...vals.filter((v) => v !== null));
        return `<div class="hc-theme">${y.t.emoji} ${esc(y.t.nom)}</div>` + top.map((x, j) => {
          const v = vals[j];
          return v === null ? '<div class="hc vide">?</div>' :
            `<button class="hc ${v === best ? 'best' : ''}" data-t="${y.t.id}" data-ci="${x.ci}" style="background:${couleurPct(v)};animation-delay:${(i * top.length + j) * 25}ms">${Math.round(v)}</button>`;
        }).join('');
      }).join('')}
    </div>
    <div class="hc-info" id="hc-info">Touche une case pour le détail. En surbrillance : le plus proche de toi sur chaque thème.</div>`;
  $('vue').querySelectorAll('button.hc').forEach((b) => (b.onclick = () => {
    $('vue').querySelectorAll('button.hc.sel').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel');
    const t = theme(b.dataset.t), ci = +b.dataset.ci;
    const qs = ecarts(ci, res.reps).filter((x) => Q[x.qi].theme === t.id);
    $('hc-info').innerHTML = `<b>${t.emoji} ${t.nom} · ${esc(C[ci].nom)}</b>` + qs.map((x) =>
      `<div class="hc-q"><span class="${x.gap <= 1 ? 'ok' : 'ko'}">${x.gap <= 1 ? '✔' : '✘'}</span><div>${esc(Q[x.qi].texte)}<small>Toi : ${LIBELLES[x.v]} · ${esc(court(ci))} : ${LIBELLES[x.p]}</small></div></div>`).join('');
    vibre(6);
  }));
}

/* Hémicycle : touche un groupe pour le mettre en avant. */
function vueHemicycle(res) {
  const r = classement(res.reps, null, res.poids);
  const SIEGES = 120, RANGS = 6;
  const min = Math.min(...r.map((x) => x.pct));
  const poids = C.map((c, ci) => { const x = r.find((y) => y.ci === ci); return x ? Math.pow(x.pct - min + 2, 2.2) : 0; });
  const tot = poids.reduce((a, b) => a + b, 0);
  const brut = poids.map((p) => (p / tot) * SIEGES);
  const s = brut.map(Math.floor);
  const reste = SIEGES - s.reduce((a, b) => a + b, 0);
  brut.map((b, i) => [b - Math.floor(b), i]).sort((a, b) => b[0] - a[0]).slice(0, reste).forEach(([, i]) => s[i]++);
  const pts = [];
  const tours = []; let totR = 0;
  for (let k = 0; k < RANGS; k++) { const rr = 60 + k * 18; tours.push(rr); totR += rr; }
  tours.forEach((rr) => {
    const n = Math.round((SIEGES * rr) / totR);
    for (let j = 0; j < n; j++) { const a = Math.PI - (Math.PI * (j + 0.5)) / n; pts.push({ a, x: 160 + rr * Math.cos(a), y: 170 - rr * Math.sin(a) }); }
  });
  pts.length = Math.min(pts.length, SIEGES);
  while (pts.length < SIEGES) pts.push({ a: 0, x: 160, y: 170 });
  pts.sort((p, q) => q.a - p.a);
  const qui = []; s.forEach((n, ci) => { for (let j = 0; j < n; j++) qui.push(ci); });
  const legende = s.map((n, ci) => [n, ci]).filter(([n]) => n > 0).sort((a, b) => b[0] - a[0]);
  $('vue').innerHTML = `<svg viewBox="0 0 320 180" width="100%" id="hemi">${pts.map((p, k) =>
    `<circle data-ci="${qui[k]}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.4" fill="${COULEURS[qui[k]]}" style="opacity:0;animation:entre .3s ${k * 9}ms forwards"/>`).join('')}
    <text x="160" y="150" text-anchor="middle" font-size="26" font-weight="900" id="hemi-n">${SIEGES}</text>
    <text x="160" y="168" text-anchor="middle" font-size="10" fill="#94a3c4" id="hemi-l">sièges</text></svg>
    <p class="note">Ton hémicycle idéal : plus tu es proche d'un candidat, plus son groupe a de sièges. Touche un groupe.</p>
    <div id="hemi-leg">${legende.map(([n, ci]) => `<button class="theme-res leg" data-ci="${ci}">${avatar(ci)}<div class="t">${esc(C[ci].nom)}</div><b>${n}</b></button>`).join('')}</div>`;
  let actif = null;
  const focus = (ci) => {
    actif = actif === ci ? null : ci;
    $('hemi').classList.toggle('focus', actif !== null);
    $('hemi').querySelectorAll('circle').forEach((c) => c.classList.toggle('on', +c.dataset.ci === actif));
    $('hemi-leg').querySelectorAll('.leg').forEach((b) => b.classList.toggle('on', +b.dataset.ci === actif));
    $('hemi-n').textContent = actif === null ? SIEGES : s[actif];
    $('hemi-l').textContent = actif === null ? 'sièges' : `sièges · ${court(actif)}`;
    vibre(6);
  };
  $('hemi').querySelectorAll('circle').forEach((c) => (c.onclick = () => focus(+c.dataset.ci)));
  $('hemi-leg').querySelectorAll('.leg').forEach((b) => (b.onclick = () => focus(+b.dataset.ci)));
}

/* Carte : touche un candidat pour voir où il est par rapport à toi. */
function vueCarte(res) {
  const W = 320, M = 30, S = (W - 2 * M) / 2;
  const px = (v) => M + S + v * S * 0.88, py = (v) => M + S - v * S * 0.88;
  const toi = coords((qi) => (res.reps[qi] ? res.reps[qi].v : null));
  const cands = C.map((c, ci) => coords((qi) => Q[qi].pos[ci]));
  const sc = scores(res.reps, null, res.poids);
  const dist = cands.map((p) => Math.hypot(p.x - toi.x, p.y - toi.y));
  const voisin = dist.indexOf(Math.min(...dist));
  $('vue').innerHTML = `<svg class="carte-svg" viewBox="0 0 ${W} ${W}" width="100%" id="carte-svg"><defs><clipPath id="rond"><circle r="11"/></clipPath></defs>
    <rect x="${M}" y="${M}" width="${2 * S}" height="${2 * S}" rx="14" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.12)"/>
    <line x1="${M}" y1="${M + S}" x2="${M + 2 * S}" y2="${M + S}" stroke="rgba(255,255,255,.18)" stroke-dasharray="4 4"/>
    <line x1="${M + S}" y1="${M}" x2="${M + S}" y2="${M + 2 * S}" stroke="rgba(255,255,255,.18)" stroke-dasharray="4 4"/>
    <text x="${M + S}" y="${M - 10}" text-anchor="middle" font-size="11" fill="#94a3c4">Fermeté</text>
    <text x="${M + S}" y="${W - 10}" text-anchor="middle" font-size="11">Ouverture</text>
    <text x="${M - 4}" y="${M + S + 4}" font-size="11" text-anchor="end" transform="rotate(-90 ${M - 14} ${M + S})">Plus d'État</text>
    <text x="${W - M + 18}" y="${M + S}" font-size="11" text-anchor="middle" transform="rotate(90 ${W - M + 14} ${M + S})">Plus de marché</text>
    <line id="lien" x1="${px(toi.x)}" y1="${py(toi.y)}" x2="${px(toi.x)}" y2="${py(toi.y)}" stroke="#fff" stroke-width="2" stroke-dasharray="3 4" opacity="0"/>
    ${cands.map((p, ci) => `<g class="pt cand" data-ci="${ci}" data-x="${px(p.x)}" data-y="${py(p.y)}" style="transform:translate(${M + S}px,${M + S}px)">
      <circle r="15" fill="transparent"/>
      <circle r="11" fill="${COULEURS[ci]}"/><text y="3.5" text-anchor="middle" font-size="8" font-weight="800" style="fill:#0b1020">${initiales(C[ci].nom)}</text>
      ${C[ci].photo ? `<image href="${photo(ci, 80)}" x="-11" y="-11" width="22" height="22" clip-path="url(#rond)" preserveAspectRatio="xMidYMin slice" onerror="this.remove()"/>` : ''}
      <circle class="anneau" r="11" fill="none" stroke="${COULEURS[ci]}" stroke-width="2"/></g>`).join('')}
    <g class="pt" id="toi" data-x="${px(toi.x)}" data-y="${py(toi.y)}" style="transform:translate(${M + S}px,${M + S}px)">
      <circle r="13" fill="none" stroke="#fff" stroke-width="2" class="halo"/><circle r="13" fill="#fff"/>
      <text y="4" text-anchor="middle" font-size="9" font-weight="900" style="fill:#0b1020">TOI</text></g>
  </svg>
  <div class="carte-info" id="carte-info"></div>
  <p class="note">Axe horizontal : économie, travail et services publics. Axe vertical : immigration, sécurité, Europe, école et société. Énergie, défense et institutions ne comptent pas sur la carte.</p>`;
  const svg = $('carte-svg');
  const choisit = (ci) => {
    svg.querySelectorAll('.cand').forEach((g) => g.classList.toggle('sel', +g.dataset.ci === ci));
    const g = svg.querySelector(`.cand[data-ci="${ci}"]`);
    const l = $('lien');
    l.setAttribute('x2', g.dataset.x); l.setAttribute('y2', g.dataset.y); l.setAttribute('opacity', '.8');
    svg.appendChild(g); svg.appendChild($('toi'));
    $('carte-info').innerHTML = `${avatar(ci)}<div><b>${esc(C[ci].nom)}</b><span>${pourcent(sc[ci].pct ?? 0)} d'accord avec toi${ci === voisin ? ' · ton plus proche voisin sur la carte' : ''}</span></div>`;
    vibre(6);
  };
  svg.querySelectorAll('.cand').forEach((g) => (g.onclick = () => choisit(+g.dataset.ci)));
  const pts = svg.querySelectorAll('.pt');
  requestAnimationFrame(() => requestAnimationFrame(() => pts.forEach((g, k) => {
    g.style.transitionDelay = g.id === 'toi' ? '1.1s' : `${k * 50}ms`;
    g.style.transform = `translate(${g.dataset.x}px,${g.dataset.y}px)`;
  })));
  setTimeout(() => $('carte-info') && choisit(voisin), 2000);
}

function vuePartage(res) {
  const r = classement(res.reps, null, res.poids);
  $('vue').innerHTML = `<button class="btn go" id="b-img">Partager l'image de mon résultat</button>
    <p class="note" style="margin-top:18px">Défie un proche : il répond aux mêmes questions et vous comparez vos réponses.</p>
    <input class="nom" id="nom" placeholder="Ton prénom" value="${esc(prefs.nom || '')}" maxlength="20">
    <button class="btn secondary" id="b-defi">Envoyer un défi</button>`;
  $('b-img').onclick = () => partageImage(r);
  $('b-defi').onclick = async () => {
    prefs.nom = $('nom').value.trim(); save();
    const url = `${location.origin}${location.pathname}?d=${encode(res.reps)}${prefs.nom ? '&n=' + encodeURIComponent(prefs.nom) : ''}`;
    const texte = `${prefs.nom || 'Je'} te défie sur Isoloir 2027 : réponds aux mêmes questions et compare !`;
    try {
      if (navigator.share) await navigator.share({ title: 'Isoloir 2027', text: texte, url });
      else { await navigator.clipboard.writeText(url); toast('Lien copié !'); }
    } catch {}
  };
}

function vueDuel(res) {
  const lui = decode(res.duel.code);
  const a = accord(res.reps, lui);
  const nom = esc(res.duel.nom || 'Ton proche');
  const sonPremier = classement(lui)[0], monPremier = classement(res.reps)[0];
  if (a.pct === null) { $('vue').innerHTML = '<p class="note">Aucune question en commun.</p>'; return; }
  $('vue').innerHTML = `<div class="podium-hero" style="border-color:rgba(96,165,250,.5)">
      <div class="label" style="color:var(--accent)">Toi et ${nom}</div>
      <div class="big" id="pct-duel">0 %</div><div class="muted small">d'accord</div>
      <p class="small">${sonPremier && monPremier && sonPremier.ci === monPremier.ci ? `Vous avez le même candidat en tête : ${esc(C[monPremier.ci].nom)} !` : `En tête pour ${nom} : ${sonPremier ? esc(C[sonPremier.ci].nom) : '?'}`}</p>
    </div>
    ${a.detail.map((d, k) => { const ok = Math.abs(d.a - d.b) <= 1;
      return `<div class="duel-q"><span class="flip ${ok ? 'ok' : 'ko'}" style="animation-delay:${k * 120}ms">${ok ? '✔' : '✘'}</span>
      <div><div>${esc(Q[d.qi].texte)}</div><div class="muted small">Toi : ${LIBELLES[d.a]} · ${nom} : ${LIBELLES[d.b]}</div></div></div>`; }).join('')}`;
  compteAnime($('pct-duel'), a.pct, 1200);
}

/* ---------- Fiche candidat ---------- */
function fiche(ci, reps) {
  const c = C[ci];
  const qs = Object.keys(reps).map(Number);
  const pages = [...new Set(qs.map((qi) => Q[qi].page))];
  const pfx = { economie: 'eco', social: 'soc', immigration: 'imm', securite: 'sec', ecologie: 'env', europe: 'eur', international: 'int', institutions: 'ins', sante: 'san', education: 'edu' };
  const s = document.createElement('div');
  s.className = 'sheet';
  s.innerHTML = `<div class="in">
    <div style="display:flex;gap:12px;align-items:center">${avatar(ci)}<div style="flex:1"><h3>${esc(c.nom)}</h3><div class="muted small">${esc(c.parti)} · ${esc(c.statut)}</div>${c.photo ? `<a class="small" href="${pagePhoto(ci)}" target="_blank" rel="noopener">Photo : Wikimedia Commons (auteur et licence)</a>` : ''}</div>
    <button class="lien" id="fermer" style="font-size:1.4rem">✕</button></div>
    <h4 style="margin:16px 0 4px">Question par question</h4>
    ${qs.map((qi) => {
      const p = Q[qi].pos[ci], v = reps[qi].v;
      return `<div class="qa"><div class="q">${esc(Q[qi].texte)}</div>
        ${p === null ? `<div class="muted small">Position inconnue (question non comptée)</div>` : ''}
        <div class="echelle" style="--c:${COULEURS[ci]}">${[-2, -1, 0, 1, 2].map((k) =>
          `<span class="${k === v ? 'toi' : ''} ${k === p ? 'lui' : ''}">${k === v && k === p ? 'Vous 2' : k === v ? 'Toi' : k === p ? initiales(c.nom) : ''}</span>`).join('')}</div>
        <div class="muted small">${v === null ? 'Tu as passé' : 'Toi : ' + LIBELLES[v]}${p === null ? '' : ` · ${initiales(c.nom)} : ${LIBELLES[p]}`}</div></div>`;
    }).join('')}
    <h4 style="margin:16px 0 4px">Ses positions en bref</h4>
    ${pages.map((pg) => `<p class="synth">${esc(DATA.syntheses[pfx[pg]][ci])} <a href="${c.source}/${pg}" target="_blank" rel="noopener">source</a></p>`).join('')}
    <p class="note">Positions au ${dateFr(DATA.maj)}, d'après la synthèse de France-Vote (programmes, votes, déclarations). Les programmes 2027 ne sont pas encore tous publiés.</p>
  </div>`;
  document.body.appendChild(s);
  const ferme = () => s.remove();
  s.onclick = (e) => { if (e.target === s) ferme(); };
  s.querySelector('#fermer').onclick = ferme;
}

/* ---------- Image à partager ---------- */
function chargeImage(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((ok) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i); i.onerror = () => ok(null);
    setTimeout(() => ok(null), 4000);
    i.src = src;
  });
}
async function partageImage(r) {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const g = x.createRadialGradient(W / 2, -200, 100, W / 2, 200, 1100);
  g.addColorStop(0, '#2a3a8f'); g.addColorStop(1, '#070b1f');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const tri = x.createLinearGradient(0, 0, W, 0);
  tri.addColorStop(0, '#3b82f6'); tri.addColorStop(.5, '#fff'); tri.addColorStop(1, '#ef4444');
  x.fillStyle = tri; x.fillRect(0, 0, W, 16);
  x.textAlign = 'center'; x.fillStyle = '#fff';
  x.font = '900 72px -apple-system, Helvetica, sans-serif'; x.fillText('🗳️ Isoloir 2027', W / 2, 150);
  x.fillStyle = '#fbbf24'; x.font = '800 36px -apple-system, Helvetica, sans-serif'; x.fillText('MON CANDIDAT LE PLUS PROCHE', W / 2, 260);
  const t = r[0];
  x.fillStyle = COULEURS[t.ci]; x.beginPath(); x.arc(W / 2, 400, 90, 0, 7); x.fill();
  x.fillStyle = '#0b1020'; x.font = '900 70px -apple-system, Helvetica, sans-serif'; x.fillText(initiales(C[t.ci].nom), W / 2, 425);
  const img = await chargeImage(photo(t.ci, 400));
  if (img) {
    x.save(); x.beginPath(); x.arc(W / 2, 400, 90, 0, 7); x.clip();
    const k = Math.max(180 / img.width, 180 / img.height);
    x.drawImage(img, W / 2 - (img.width * k) / 2, 310, img.width * k, img.height * k);
    x.restore();
  }
  x.strokeStyle = COULEURS[t.ci]; x.lineWidth = 8; x.beginPath(); x.arc(W / 2, 400, 92, 0, 7); x.stroke();
  x.fillStyle = '#fff'; x.font = '900 64px -apple-system, Helvetica, sans-serif'; x.fillText(C[t.ci].nom, W / 2, 570);
  x.font = '900 150px -apple-system, Helvetica, sans-serif'; x.fillText(`${Math.round(t.pct)} %`, W / 2, 740);
  r.slice(1, 4).forEach((y, k) => {
    const yy = 860 + k * 110;
    x.textAlign = 'left'; x.fillStyle = '#cbd5f5'; x.font = '600 40px -apple-system, Helvetica, sans-serif';
    x.fillText(`${k + 2}. ${C[y.ci].nom}`, 120, yy);
    x.textAlign = 'right'; x.fillText(`${Math.round(y.pct)} %`, W - 120, yy);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(120, yy + 22, W - 240, 16);
    x.fillStyle = COULEURS[y.ci]; x.fillRect(120, yy + 22, ((W - 240) * y.pct) / 100, 16);
  });
  x.textAlign = 'center'; x.fillStyle = '#94a3c4'; x.font = '500 32px -apple-system, Helvetica, sans-serif';
  x.fillText('Et toi, de qui es-tu le plus proche ?', W / 2, 1250);
  x.fillText(location.host + location.pathname, W / 2, 1300);
  let blob;
  try { blob = await new Promise((ok) => cv.toBlob(ok, 'image/png')); } catch { blob = null; }
  if (!blob) return toast('Image indisponible');
  const file = new File([blob], 'isoloir-2027.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], title: 'Isoloir 2027' });
  } catch { return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
}

/* ---------- Méthode ---------- */
function methode() {
  clearInterval(tic);
  const sym = { 2: '++', 1: '+', 0: '~', '-1': '−', '-2': '−−', null: '?' };
  const col = { 2: 'var(--oui)', 1: '#86efac', 0: 'var(--muted)', '-1': '#fda4af', '-2': 'var(--non)', null: 'var(--muted)' };
  app.innerHTML = `<section class="screen methode">
    <button class="lien" id="b-retour">‹ Retour</button>
    <h3>Comment ça marche</h3>
    <p>Chaque candidat a une position sur chaque affirmation, de « pas du tout d'accord » (−−) à « tout à fait d'accord » (++). Pour chaque question, ton accord avec un candidat vaut 100 % si vous répondez pareil et 0 % si tu es à l'opposé le plus éloigné possible de sa position, avec des crans réguliers entre les deux. Le score est la moyenne de tes réponses, les questions marquées ♥ comptent double.</p><p>Pourquoi « le plus éloigné possible » ? Face à un candidat « neutre », on ne peut s'éloigner que de 2 crans, contre 4 face à un candidat « tout à fait d'accord ». Sans cette correction, les candidats aux positions nuancées gagneraient plus souvent, même avec des réponses au hasard.</p>
    <p>« Je passe » et les positions inconnues (?) ne comptent pas. Un candidat dont on connaît la position sur moins de 60 % de tes réponses est affiché en grisé et ne peut pas arriver premier.</p>
    <h3>D'où viennent les positions</h3>
    <p>Des synthèses de <a href="${DATA.source}" target="_blank" rel="noopener">France-Vote</a> au ${dateFr(DATA.maj)}, établies d'après les programmes, les votes et les déclarations publiques. Les programmes 2027 ne sont pas encore tous publiés : les positions seront mises à jour. Aucun sondage n'est utilisé.</p>
    <p>Photos issues de Wikimedia Commons, sous licences libres : auteur et licence de chacune via le lien « Photo » ci-dessous. Chaque candidat a une couleur neutre, pas celle de son parti.</p>
    <h3>La grille complète</h3>
    <div class="table-wrap"><table class="grille"><tr><th>Affirmation</th>${C.map((c) => `<th>${esc(c.nom)}</th>`).join('')}</tr>
    ${Q.map((q) => `<tr><td>${esc(q.texte)}</td>${q.pos.map((p) => `<td style="color:${col[p]}">${sym[p]}</td>`).join('')}</tr>`).join('')}</table></div>
    <h3>Candidats</h3>
    ${C.map((c, ci) => `<p class="small">${avatar(ci)} <b>${esc(c.nom)}</b>, ${esc(c.parti)}, ${esc(c.statut)}. <a href="${c.source}" target="_blank" rel="noopener">Fiche</a>${c.photo ? ` · <a href="${pagePhoto(ci)}" target="_blank" rel="noopener">Photo</a>` : ''}</p>`).join('')}
  </section>`;
  $('b-retour').onclick = accueil;
  window.scrollTo(0, 0);
}

/* ---------- Effets ---------- */
function confettis() {
  const cv = $('confettis'), x = cv.getContext('2d');
  cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
  x.scale(devicePixelRatio, devicePixelRatio);
  const cols = ['#3b82f6', '#ffffff', '#ef4444', '#fbbf24'];
  const ps = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.3,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
    w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)],
  }));
  const t0 = performance.now();
  const pas = (t) => {
    x.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ps) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore();
    }
    if (t - t0 < 3500) requestAnimationFrame(pas); else x.clearRect(0, 0, innerWidth, innerHeight);
  };
  requestAnimationFrame(pas);
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast show'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1600);
}

/* ---------- Démarrage ---------- */
$('btn-methode').onclick = methode;
const params = new URLSearchParams(location.search);
if (params.get('d') && /^[.x0-4A-E]+$/.test(params.get('d'))) duel = { code: params.get('d'), nom: (params.get('n') || '').slice(0, 20) };
accueil();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js');
