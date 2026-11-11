// Palette : test de personnalité en quatre couleurs.
// Écrans : accueil, questions (le plus moi / le moins moi), résultat animé, profil reçu par lien.

const ORDRE = ['r', 'j', 'v', 'b'];
const STORE = 'palette';
const app = document.getElementById('app');
const fond = document.getElementById('fond');

let etat = charger();
function charger() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function sauver() { try { localStorage.setItem(STORE, JSON.stringify(etat)); } catch {} }

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const melanger = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
const moinsAnime = matchMedia('(prefers-reduced-motion: reduce)').matches;

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------- Calcul du profil ---------- */

// Pourcentages entiers qui font exactement 100 (méthode du plus fort reste).
function pourcents(points) {
  const total = ORDRE.reduce((s, c) => s + points[c], 0) || 1;
  const brut = ORDRE.map((c) => ({ c, v: points[c] * 100 / total }));
  brut.forEach((x) => { x.e = Math.floor(x.v); x.reste = x.v - x.e; });
  let manque = 100 - brut.reduce((s, x) => s + x.e, 0);
  [...brut].sort((a, b) => b.reste - a.reste).forEach((x) => { if (manque > 0) { x.e++; manque--; } });
  return Object.fromEntries(brut.map((x) => [x.c, x.e]));
}

function calculer(reponses) {
  const pts = { r: 0, j: 0, v: 0, b: 0 };
  reponses.forEach((x) => ORDRE.forEach((c) => { pts[c] += c === x.plus ? 3 : c === x.moins ? 0 : 1; }));
  return pourcents(pts);
}

const trier = (p) => [...ORDRE].sort((a, b) => p[b] - p[a] || ORDRE.indexOf(a) - ORDRE.indexOf(b));

function profil(p) {
  const t = trier(p);
  const [d, s] = t;
  let cle;
  if (p[d] - p[t[3]] < 7) cle = 'eq';
  else if (p[d] - p[s] >= 15) cle = d + d;
  else cle = d + s;
  return { cle, ...PROFILS[cle], dom: d, sec: s, faible: t[3], ordre: t };
}

// Teinte personnelle : mélange des quatre couleurs, la dominante pèse le plus.
function teinte(p) {
  const lin = (h) => [1, 3, 5].map((i) => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  const w = ORDRE.map((c) => (p[c] / 100) ** 3); const tw = w.reduce((a, b) => a + b, 0) || 1;
  const m = [0, 0, 0];
  ORDRE.forEach((c, i) => lin(COULEURS[c].hex).forEach((v, k) => { m[k] += v * w[i] / tw; }));
  let [r, g, b] = m.map((v) => v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055);
  // Passage en TSL pour garder une couleur vive et lumineuse
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, l = (mx + mn) / 2, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
  }
  s = Math.max(s, .7); l = Math.min(Math.max(l, .5), .62);
  const q = l < .5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < .5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
  return '#' + [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

// Position sur la boussole : à droite = tourné vers les personnes, en haut = rythme rapide.
function position(p) {
  const f = (c) => p[c] / 100;
  let x = (f('j') + f('v') - f('r') - f('b')) * 2.1 * 100;
  let y = -(f('r') + f('j') - f('v') - f('b')) * 2.1 * 100;
  const d = Math.hypot(x, y);
  if (d > 84) { x *= 84 / d; y *= 84 / d; }
  return [Math.round(x), Math.round(y)];
}

/* ---------- Dessins ---------- */

const DIR = { r: [-1, -1], j: [1, -1], v: [1, 1], b: [-1, 1] };

function orbe(p, { t = 240, cls = '', vide = false } = {}) {
  const ord = trier(p);
  const gouttes = [...ord].map((c, rang) => {
    const C = COULEURS[c];
    const taille = taille_goutte(p[c], rang);
    const [dx, dy] = DIR[c].map((k) => Math.round(k * t * (rang === 0 ? .07 : .2)));
    const duree = [11, 8, 13, 9.5][ORDRE.indexOf(c)];
    return `<div class="tour${rang % 2 ? ' inverse' : ''}" style="--duree:${duree}s;z-index:${rang}">
      <i class="goutte" data-c="${c}" data-s="${taille}" style="--s:${vide ? 0 : taille}%;--c:${C.hex};--c2:${C.clair};--dx:${dx}px;--dy:${dy}px"></i></div>`;
  }).join('');
  return `<div class="orbe ${cls}" style="--t:${t}px;--lueur:${teinte(p)}88">
    <div class="halo"></div><div class="sphere">${gouttes}</div><div class="reflet"></div><div class="anneau"></div></div>`;
}

// Grosse goutte pour la dominante, petites gouttes (dessinées par-dessus) pour les autres.
function taille_goutte(pct, rang) { return rang === 0 ? 150 : Math.round(10 + pct * 2.2); }

const EGAL = { r: 25, j: 25, v: 25, b: 25 };

function boussole(moi, autres = []) {
  const quart = {
    r: 'M0 0 L-100 0 A100 100 0 0 1 0 -100 Z', j: 'M0 0 L0 -100 A100 100 0 0 1 100 0 Z',
    v: 'M0 0 L100 0 A100 100 0 0 1 0 100 Z', b: 'M0 0 L0 100 A100 100 0 0 1 -100 0 Z',
  };
  const etiq = { r: [-50, -50], j: [50, -50], v: [50, 54], b: [-50, 54] };
  const defs = ORDRE.map((c) => `<radialGradient id="g${c}" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${COULEURS[c].hex}" stop-opacity=".05"/><stop offset="1" stop-color="${COULEURS[c].hex}" stop-opacity=".45"/></radialGradient>`).join('');
  const zones = ORDRE.map((c) => `<path d="${quart[c]}" fill="url(#g${c})" stroke="${COULEURS[c].hex}" stroke-opacity=".5" stroke-width="1"/>`).join('');
  const noms = ORDRE.map((c) => `<g transform="translate(${etiq[c][0]} ${etiq[c][1]})" opacity=".9">
      <text text-anchor="middle" font-size="17" y="-4">${COULEURS[c].emoji}</text>
      <text text-anchor="middle" font-size="9.5" y="11" fill="#fff" font-weight="700">${COULEURS[c].nom}</text></g>`).join('');
  const point = (q, label, couleur, grand, i) => {
    const [x, y] = position(q);
    const r = grand ? 9 : 6.5;
    return `<g class="point" data-x="${x}" data-y="${y}" style="transform:translate(0px,0px);transition-delay:${i * 120}ms">
      ${grand ? `<circle r="${r}" fill="${couleur}" class="pulse"/>` : ''}
      <circle r="${r}" fill="${couleur}" stroke="#fff" stroke-width="2.5"/>
      <text y="${-r - 5}" text-anchor="middle" font-size="${grand ? 10 : 8.5}" font-weight="800" fill="#fff" style="paint-order:stroke" stroke="#0b0b12" stroke-width="3">${esc(label)}</text></g>`;
  };
  return `<svg class="boussole" viewBox="-130 -128 260 258" role="img" aria-label="Boussole des couleurs">
    <defs>${defs}</defs>${zones}
    <circle r="66" fill="none" stroke="#fff" stroke-opacity=".12" stroke-dasharray="3 4"/>
    <circle r="33" fill="none" stroke="#fff" stroke-opacity=".12" stroke-dasharray="3 4"/>
    <line x1="-104" x2="104" stroke="#fff" stroke-opacity=".25"/><line y1="-104" y2="104" stroke="#fff" stroke-opacity=".25"/>
    ${noms}
    <g font-size="8.5" fill="#a1a1b5" text-anchor="middle" font-weight="600" letter-spacing=".6">
      <text y="-113">RAPIDE · AFFIRMÉ</text><text y="122">POSÉ · RÉSERVÉ</text>
      <text transform="translate(-116 0) rotate(-90)">TÂCHES</text><text transform="translate(116 0) rotate(90)">PERSONNES</text>
    </g>
    ${autres.map((a, i) => point(a.p, a.n, teinte(a.p), false, i + 1)).join('')}
    ${moi ? point(moi.p, moi.n, teinte(moi.p), true, 0) : ''}
  </svg>`;
}

/* ---------- Accueil ---------- */

function accueil() {
  history.replaceState(null, '', location.pathname);
  fond.classList.remove('calme');
  const moi = etat.moi;
  const pm = moi && profil(moi.p);
  const enCours = etat.encours && etat.encours.i > 0;
  app.innerHTML = `<section class="screen">
    <div class="hero">
      ${orbe(EGAL, { t: 190, cls: 'flotte' })}
      <h2 class="arc">Palette</h2>
      <p>Es-tu plutôt Feu, Soleil, Forêt ou Océan ?</p>
    </div>
    <div class="quatre">
      ${ORDRE.map((c) => { const C = COULEURS[c]; return `<button class="carte-coul" data-c="${c}" style="--c:${C.hex}">
        <i class="pastille"></i><span class="em">${C.emoji}</span><b>${C.nom} · ${C.element}</b><span>${C.devise} ${C.pole}</span></button>`; }).join('')}
    </div>
    ${pm ? `<button class="dernier" id="revoir">${orbe(moi.p, { t: 54, cls: 'mini' })}
      <div><span class="small muted">Ton profil</span><b>${esc(pm.titre)}</b><span class="small muted">${pm.ordre.slice(0, 2).map((c) => COULEURS[c].emoji + ' ' + moi.p[c] + ' %').join(' · ')}</span></div><span class="fl">›</span></button>` : ''}
    <button class="btn go" id="go">${enCours ? 'Reprendre le test' : pm ? 'Refaire le test' : 'Découvrir ma couleur'}<small>${enCours ? `Question ${etat.encours.i + 1} sur ${QUESTIONS.length}` : `${QUESTIONS.length} situations · environ 4 minutes`}</small></button>
    ${enCours ? '<button class="btn secondary" id="zero">Recommencer depuis le début</button>' : ''}
    ${(etat.proches || []).length ? `<div class="titre-section">Profils reçus</div><div class="proches">${etat.proches.map((a, i) => {
      const pa = profil(a.p);
      return `<button class="dernier" data-ami="${i}">${orbe(a.p, { t: 54, cls: 'mini' })}<div><b>${esc(a.n || 'Un proche')}</b><span class="small muted">${esc(pa.titre)} · ${COULEURS[pa.dom].emoji} ${COULEURS[pa.dom].nom}</span></div><span class="fl">›</span></button>`;
    }).join('')}</div>` : ''}
    <p class="avert">Un jeu pour mieux se connaître et comparer avec ses proches, pas un diagnostic.<br>Inspiré du modèle de William Marston (1928).</p>
  </section>`;
  app.querySelector('#go').onclick = () => { if (!enCours) nouveauTest(); question(); };
  const zero = app.querySelector('#zero'); if (zero) zero.onclick = () => { nouveauTest(); question(); };
  const revoir = app.querySelector('#revoir'); if (revoir) revoir.onclick = () => resultat(moi.p, { animer: false });
  app.querySelectorAll('.carte-coul').forEach((b) => b.onclick = () => ficheCouleur(b.dataset.c));
  app.querySelectorAll('[data-ami]').forEach((b) => b.onclick = () => { const a = etat.proches[+b.dataset.ami]; resultat(a.p, { ami: a.n || 'Un proche', animer: false }); });
  scrollTo(0, 0);
}

function ficheCouleur(c) {
  const C = COULEURS[c];
  const d = document.getElementById('infos');
  const ancien = d.innerHTML;
  d.innerHTML = `<div class="portrait" style="--c:${C.hex};margin:-20px;padding:20px;border-radius:16px">
    <div class="tete"><span class="em">${C.emoji}</span><div><b>${C.nom} · ${C.element}</b><span>${C.pole} · ${C.devise}</span></div></div>
    <p>${C.resume}</p><div class="mots">${C.mots.map((m) => `<span>${m}</span>`).join('')}</div>
    <div class="liste-titre">Ses forces</div><ul>${C.forces.map((f) => `<li data-p="✦">${f}</li>`).join('')}</ul>
    <p class="small muted" style="margin-top:12px">Besoin profond : ${C.besoin.toLowerCase()}.</p>
    <button class="btn" style="margin-top:14px;background:${C.hex};color:${c === 'j' ? '#111' : '#fff'}">Fermer</button></div>`;
  d.querySelector('.btn').onclick = () => d.close();
  d.addEventListener('close', () => { d.innerHTML = ancien; }, { once: true });
  d.showModal();
}

/* ---------- Questions ---------- */

function nouveauTest() {
  etat.encours = { i: 0, rep: [], ordre: QUESTIONS.map(() => melanger(ORDRE)) };
  sauver();
}

function question(sens = 1) {
  const e = etat.encours;
  if (!e || !e.ordre || e.ordre.length !== QUESTIONS.length) { nouveauTest(); return question(); }
  fond.classList.add('calme');
  const Q = QUESTIONS[e.i];
  const rep = e.rep[e.i] || {};
  app.innerHTML = `<section>
    <div class="progres"><button id="prec" aria-label="Question précédente">‹</button>
      <div class="barre"><i style="width:${e.i / QUESTIONS.length * 100}%"></i></div><span>${e.i + 1} / ${QUESTIONS.length}</span></div>
    <h2 class="question">${Q.q}</h2>
    <div class="consigne"></div>
    <div class="reponses">${e.ordre[e.i].map((c, k) => `<button class="rep" data-c="${c}" style="--i:${k}"><span class="marque"></span><span>${Q[c]}</span></button>`).join('')}</div>
    <p class="astuce">Pas de bonne réponse : choisis ce que tu ferais vraiment,<br>pas ce que tu aimerais faire.</p>
  </section>`;
  requestAnimationFrame(() => { const b = app.querySelector('.barre i'); b.style.width = `${(e.i + .5) / QUESTIONS.length * 100}%`; });
  const maj = () => {
    const r = e.rep[e.i] || {};
    app.querySelectorAll('.rep').forEach((b) => {
      const c = b.dataset.c;
      b.classList.toggle('plus', r.plus === c); b.classList.toggle('moins', r.moins === c);
      b.querySelector('.marque').textContent = r.plus === c ? '+' : r.moins === c ? '−' : '';
    });
    const cons = app.querySelector('.consigne');
    if (!r.plus) { cons.className = 'consigne plus'; cons.innerHTML = '<span>👍 Ce qui te ressemble le <b>plus</b></span>'; }
    else { cons.className = 'consigne moins'; cons.innerHTML = '<span>👎 Et le <b>moins</b> ?</span>'; }
  };
  maj();
  let verrou = false;
  app.querySelectorAll('.rep').forEach((b) => b.onclick = async () => {
    if (verrou) return;
    const c = b.dataset.c;
    const r = e.rep[e.i] || {};
    if (!r.plus) e.rep[e.i] = { plus: c };
    else if (r.plus === c) e.rep[e.i] = {};
    else {
      e.rep[e.i] = { plus: r.plus, moins: c };
      maj(); verrou = true; sauver();
      await pause(380);
      app.querySelectorAll('.rep').forEach((x) => x.classList.add('sort'));
      await pause(moinsAnime ? 0 : 380);
      if (e.i + 1 < QUESTIONS.length) { e.i++; sauver(); question(); }
      else terminer();
      return;
    }
    maj(); sauver();
  });
  app.querySelector('#prec').onclick = () => {
    if (e.i === 0) { accueil(); return; }
    e.rep[e.i] = {}; e.i--; e.rep[e.i] = {}; sauver(); question(-1);
  };
  scrollTo(0, 0);
}

function terminer() {
  const p = calculer(etat.encours.rep);
  if (etat.moi) etat.avant = etat.moi;
  etat.moi = { p, date: Date.now() };
  delete etat.encours;
  sauver();
  resultat(p, { animer: true });
}

/* ---------- Résultat ---------- */

function resultat(p, { ami = null, animer = true } = {}) {
  fond.classList.remove('calme');
  const P = profil(p);
  const D = COULEURS[P.dom], S = COULEURS[P.sec], F = COULEURS[P.faible];
  const tnt = teinte(p);
  document.documentElement.style.setProperty('--teinte', tnt);
  const lettres = [...P.titre].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
  const duo = P.cle === 'eq' ? 'Profil équilibré' : P.cle[0] === P.cle[1] ? `${D.emoji} ${D.nom} pur` : `${D.emoji} ${D.nom} · ${S.emoji} ${S.nom}`;
  const moi = etat.moi;
  const prenom = etat.prenom || '';
  const autres = ami
    ? (moi ? [{ p: moi.p, n: prenom || 'Toi' }] : [])
    : (etat.proches || []).slice(0, 8).map((a) => ({ p: a.p, n: a.n || '?' }));
  const centre = { p, n: ami ? ami : (prenom || 'Toi') };
  const tu = !ami;

  app.innerHTML = `<section class="screen">
    ${ami ? `<div class="bandeau"><b>Le profil de ${esc(ami)}</b>${moi ? '' : '<div class="small muted">Fais le test pour vous comparer</div>'}</div>` : ''}
    <div class="revelation" id="rev">
      ${orbe(p, { t: 230, vide: animer && !moinsAnime })}
      <div class="melange">${animer ? 'Mélange des couleurs…' : ''}</div>
      <div class="profil-nom">${lettres}</div>
      <div class="profil-duo apparait" style="--i:8">${duo}</div>
      <p class="accroche apparait" style="--i:12">${P.accroche}</p>
      <div class="teinte apparait" style="--i:16"><i></i>${tu ? 'Ta' : 'Sa'} teinte unique <b>${tnt.toUpperCase()}</b></div>
    </div>

    <div class="bloc"><h3>${tu ? 'Ta' : 'Sa'} palette</h3><div class="barres">
      ${P.ordre.map((c) => { const C = COULEURS[c]; return `<div class="ligne" style="--c:${C.hex};--c2:${C.clair}">
        <span class="em">${C.emoji}</span>
        <div><div class="nom"><b>${C.nom}</b><small>${C.pole}</small></div><div class="jauge"><i data-w="${p[c] / p[P.dom] * 100}"></i></div></div>
        <span class="pct" data-v="${p[c]}">0 %</span></div>`; }).join('')}
    </div></div>

    <div class="bloc"><h3>Boussole</h3>${boussole(centre, autres)}
      ${autres.length ? `<div class="legende"><span><i style="background:${tnt}"></i>${esc(centre.n)}</span>${autres.map((a) => `<span><i style="background:${teinte(a.p)}"></i>${esc(a.n)}</span>`).join('')}</div>` : `<p class="small muted" style="text-align:center;margin:8px 0 0">Partage ${tu ? 'ton' : 'son'} profil : les profils reçus de tes proches apparaîtront ici.</p>`}
    </div>

    ${ami && moi ? (() => { const pm = profil(moi.p); return `<div class="bloc portrait" style="--c:${teinte(moi.p)}">
      <div class="tete"><span class="em">🤝</span><div><b>${esc(ami)} et toi</b><span>${esc(pm.titre)} × ${esc(P.titre)}</span></div></div>
      <p>${pm.dom === P.dom ? `Vous partagez la même couleur dominante, ${D.nom.toLowerCase()} : vous vous comprenez vite… et vous avez les mêmes angles morts.` : `Toi plutôt ${COULEURS[pm.dom].nom.toLowerCase()}, ${esc(ami)} plutôt ${D.nom.toLowerCase()} : vous vous complétez, à condition de parler la langue de l'autre.`}</p>
      <p>${D.avec}</p></div>`; })() : ''}

    <div class="bloc portrait" style="--c:${D.hex}">
      <div class="tete"><span class="em">${D.emoji}</span><div><b>Couleur dominante : ${D.nom}</b><span>${D.pole} · ${D.devise}</span></div></div>
      <p>${D.resume}</p>
      <div class="mots">${D.mots.map((m) => `<span>${m}</span>`).join('')}</div>
      <div class="liste-titre">Forces</div><ul>${D.forces.map((f) => `<li data-p="✦">${f}</li>`).join('')}</ul>
      <div class="liste-titre">Points de vigilance</div><ul>${D.vigilance.map((f) => `<li data-p="⚠︎">${f}</li>`).join('')}</ul>
      <div class="liste-titre">Pour bien communiquer avec ${tu ? 'toi' : esc(ami)}</div><ul>${D.communiquer.map((f) => `<li data-p="💬">${f}</li>`).join('')}</ul>
      <div class="liste-titre">Sous stress</div><p>${D.stress}</p>
      <div class="liste-titre">Besoin profond</div><p>${D.besoin}.</p>
    </div>

    <div class="duo">
      <div class="bloc portrait" style="--c:${S.hex}"><span class="em">${S.emoji}</span><div class="etiq">Couleur d'appoint</div><b>${S.nom} · ${p[P.sec]} %</b>
        <p>${S.devise} Elle colore ${tu ? 'ta' : 'sa'} façon d'être : ${S.mots.slice(0, 3).join(', ').toLowerCase()}.</p></div>
      <div class="bloc portrait" style="--c:${F.hex}"><span class="em">${F.emoji}</span><div class="etiq">Moins utilisée</div><b>${F.nom} · ${p[P.faible]} %</b>
        <p>${tu ? `${F.effort[0].toUpperCase() + F.effort.slice(1)} te demande plus d'énergie.` : `${F.effort[0].toUpperCase() + F.effort.slice(1)} lui demande plus d'énergie.`}</p></div>
    </div>

    ${tu ? `<div class="bloc"><h3>S'entendre avec les autres couleurs</h3>
      ${ORDRE.map((c) => `<details class="entente" style="--c:${COULEURS[c].hex}"><summary><i></i>Avec un ${COULEURS[c].nom} ${COULEURS[c].emoji}</summary><p>${COULEURS[c].avec.replace(/^Avec un \w+ : /, '')}</p></details>`).join('')}
    </div>` : ''}

    <div class="actions">
      ${tu ? `<div class="prenom"><input id="prenom" placeholder="Ton prénom (pour le partage)" maxlength="20" value="${esc(prenom)}" autocomplete="given-name"></div>
        <button class="btn go" id="partager">Partager mon profil<small>Image + lien pour que tes proches comparent</small></button>
        <button class="btn secondary" id="refaire">Refaire le test</button>`
      : `<button class="btn go" id="comparer">${moi ? 'Voir mon profil' : 'Faire le test pour comparer'}</button>`}
      <button class="btn secondary" id="menu">Accueil de Palette</button>
    </div>
  </section>`;

  app.querySelector('#menu').onclick = accueil;
  if (tu) {
    const inp = app.querySelector('#prenom');
    inp.onchange = () => { etat.prenom = inp.value.trim().slice(0, 20); sauver(); };
    app.querySelector('#partager').onclick = () => { etat.prenom = inp.value.trim().slice(0, 20); sauver(); partager(p); };
    app.querySelector('#refaire').onclick = () => { nouveauTest(); question(); };
  } else {
    app.querySelector('#comparer').onclick = () => { if (moi) resultat(moi.p, { animer: false }); else { nouveauTest(); question(); } };
  }
  scrollTo(0, 0);
  reveler(p, animer && !moinsAnime);
}

async function reveler(p, animer) {
  const rev = app.querySelector('#rev');
  const sphere = rev.querySelector('.orbe');
  if (animer) {
    // Quatre gouttes arrivent des coins de l'écran et plongent dans l'orbe, la plus grosse en dernier.
    const ord = [...trier(p)].reverse();
    const w = innerWidth, h = innerHeight;
    await Promise.all(ord.map((c, k) => {
      const C = COULEURS[c];
      const g = document.createElement('i');
      g.className = 'vol';
      g.style.cssText = `--c:${C.hex};--c2:${C.clair}`;
      rev.appendChild(g);
      const [sx, sy] = DIR[c];
      const sc = .6 + p[c] / 40;
      return g.animate([
        { transform: `translate(${sx * w * .55}px, ${sy * h * .35}px) scale(.2)`, opacity: 0 },
        { transform: `translate(${sx * w * .3}px, ${sy * 110}px) scale(${sc})`, opacity: 1, offset: .45 },
        { transform: 'translate(0, 0) scale(.15)', opacity: .9 },
      ], { duration: 1100, delay: 220 + k * 230, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished.then(() => {
        g.remove();
        const gt = sphere.querySelector(`.goutte[data-c="${c}"]`);
        gt.style.setProperty('--s', gt.dataset.s + '%');
        sphere.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 350, easing: 'ease-out' });
      });
    }));
    await pause(250);
    sphere.querySelector('.anneau').animate([{ opacity: .9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.7)' }], { duration: 900, easing: 'ease-out' });
    rev.querySelector('.melange').textContent = '';
    explosion(sphere, p);
  }
  sphere.classList.add('flotte');
  rev.classList.add('visible');
  await pause(animer ? 250 : 50);
  // Jauges, pourcentages qui défilent, et points de la boussole qui rejoignent leur place
  app.querySelectorAll('.jauge i').forEach((i) => { i.style.width = i.dataset.w + '%'; });
  app.querySelectorAll('.pct').forEach((el) => compter(el, +el.dataset.v, animer ? 1300 : 600));
  app.querySelectorAll('.boussole .point').forEach((g) => { g.style.transform = `translate(${g.dataset.x}px, ${g.dataset.y}px)`; });
}

function compter(el, fin, duree) {
  const t0 = performance.now();
  const pas = (t) => {
    const k = Math.min(1, (t - t0) / duree);
    el.textContent = Math.round(fin * (1 - (1 - k) ** 3)) + ' %';
    if (k < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}

/* ---------- Particules ---------- */

const cv = document.getElementById('particules');
const ctx = cv.getContext('2d');
let parts = [], boucle = 0;

function explosion(el, p) {
  const dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const b = el.getBoundingClientRect();
  const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  ORDRE.forEach((c) => {
    const n = Math.round(p[c] * 2.2) + 6;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 7;
      parts.push({ x: cx + Math.cos(a) * b.width * .35, y: cy + Math.sin(a) * b.width * .35, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2,
        r: 2 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, vie: 1, dv: .007 + Math.random() * .01,
        c: Math.random() < .3 ? COULEURS[c].clair : COULEURS[c].hex, forme: Math.random() < .5 });
    }
  });
  if (!boucle) boucle = requestAnimationFrame(anim);
}

function anim() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((q) => q.vie > 0);
  for (const q of parts) {
    q.vx *= .975; q.vy = q.vy * .975 + .16; q.x += q.vx; q.y += q.vy; q.rot += q.vr; q.vie -= q.dv;
    ctx.globalAlpha = Math.max(0, Math.min(1, q.vie * 1.6));
    ctx.fillStyle = q.c;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
    if (q.forme) { ctx.beginPath(); ctx.arc(0, 0, q.r, 0, 7); ctx.fill(); }
    else ctx.fillRect(-q.r, -q.r * .45, q.r * 2, q.r * .9);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  boucle = parts.length ? requestAnimationFrame(anim) : 0;
  if (!boucle) ctx.clearRect(0, 0, innerWidth, innerHeight);
}

/* ---------- Partage ---------- */

function lien(p) {
  const u = new URL(location.href.split('?')[0].split('#')[0]);
  u.searchParams.set('p', ORDRE.map((c) => p[c]).join('.'));
  if (etat.prenom) u.searchParams.set('n', etat.prenom);
  return u.toString();
}

function image(p) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const P = profil(p);
  g.fillStyle = '#0b0b12'; g.fillRect(0, 0, W, H);
  // halos de fond
  ORDRE.forEach((k, i) => {
    const [x, y] = [[0, 0], [W, 80], [W, H], [0, H - 60]][i];
    const gr = g.createRadialGradient(x, y, 0, x, y, 620);
    gr.addColorStop(0, COULEURS[k].hex + '55'); gr.addColorStop(1, '#0b0b1200');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  // orbe
  const cx = W / 2, cy = 400, R = 230;
  const lu = g.createRadialGradient(cx, cy, R * .6, cx, cy, R * 1.5);
  lu.addColorStop(0, teinte(p) + '88'); lu.addColorStop(1, teinte(p) + '00');
  g.fillStyle = lu; g.fillRect(0, 0, W, H);
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#1b1b28'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  P.ordre.forEach((k, rang) => {
    const [dx, dy] = DIR[k];
    const o = rang === 0 ? .1 : .4;
    const x = cx + dx * R * o, y = cy + dy * R * o, r = R * taille_goutte(p[k], rang) / 100 * 1.1;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, COULEURS[k].clair); gr.addColorStop(.35, COULEURS[k].hex); gr.addColorStop(1, COULEURS[k].hex + '00');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  });
  const re = g.createRadialGradient(cx - R * .36, cy - R * .52, 0, cx - R * .36, cy - R * .52, R * .8);
  re.addColorStop(0, 'rgba(255,255,255,.55)'); re.addColorStop(.3, 'rgba(255,255,255,.1)'); re.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = re; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  g.restore();
  // textes
  const police = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  g.textAlign = 'center'; g.fillStyle = '#a1a1b5';
  g.font = `600 34px ${police}`;
  g.fillText(etat.prenom ? `${etat.prenom} est…` : 'Mon profil Palette', cx, 100);
  g.fillStyle = '#fff'; g.font = `900 92px ${police}`;
  g.fillText(P.titre, cx, 760);
  g.font = `700 38px ${police}`; g.fillStyle = teinte(p);
  g.fillText(P.cle === 'eq' ? 'Profil équilibré' : P.cle[0] === P.cle[1] ? `${COULEURS[P.dom].nom} pur` : `${COULEURS[P.dom].nom} · ${COULEURS[P.sec].nom}`, cx, 820);
  // accroche sur deux lignes max
  g.font = `400 34px ${police}`; g.fillStyle = '#dcdce8';
  const mots = P.accroche.split(' '); const lignes = ['']; mots.forEach((m) => { const t = (lignes[lignes.length - 1] + ' ' + m).trim(); if (g.measureText(t).width > 900) lignes.push(m); else lignes[lignes.length - 1] = t; });
  lignes.slice(0, 2).forEach((l, i) => g.fillText(l, cx, 885 + i * 46));
  // barres
  P.ordre.forEach((k, i) => {
    const y = 1010 + i * 72, x0 = 160, larg = 680;
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `700 30px ${police}`;
    g.fillText(COULEURS[k].nom, x0 - 110, y + 22);
    g.fillStyle = 'rgba(255,255,255,.08)'; arrondi(g, x0 + 30, y, larg, 28, 14); g.fill();
    g.fillStyle = COULEURS[k].hex; arrondi(g, x0 + 30, y, Math.max(28, larg * p[k] / p[P.dom]), 28, 14); g.fill();
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `900 34px ${police}`;
    g.fillText(p[k] + ' %', W - 50, y + 26);
  });
  g.textAlign = 'center'; g.fillStyle = '#a1a1b5'; g.font = `600 28px ${police}`;
  g.fillText('Palette · OustaGames', cx, H - 40);
  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}

function arrondi(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

async function partager(p) {
  const url = lien(p);
  const P = profil(p);
  const carres = { r: '🟥', j: '🟨', v: '🟩', b: '🟦' };
  const texte = `${etat.prenom ? etat.prenom + ' est' : 'Je suis'} « ${P.titre} » sur Palette\n` +
    P.ordre.map((c) => carres[c].repeat(Math.max(1, Math.round(p[c] / 10))) + ' ' + p[c] + ' %').join('\n') +
    `\nEt toi, quelle est ta couleur ? ${url}`;
  try {
    const blob = await image(p);
    const file = blob && new File([blob], 'palette.png', { type: 'image/png' });
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: texte }); return; }
    if (navigator.share) { await navigator.share({ title: 'Palette', text: texte }); return; }
    await navigator.clipboard.writeText(texte); toast('Lien copié !');
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    try { await navigator.clipboard.writeText(texte); toast('Lien copié !'); } catch { toast('Partage impossible'); }
  }
}

/* ---------- Démarrage ---------- */

document.getElementById('btn-infos').onclick = () => document.getElementById('infos').showModal();

function depuisLien() {
  const q = new URLSearchParams(location.search);
  const brut = q.get('p');
  if (!brut) return false;
  const v = brut.split('.').map(Number);
  if (v.length !== 4 || v.some((x) => !Number.isInteger(x) || x < 0 || x > 100) || Math.abs(v.reduce((a, b) => a + b, 0) - 100) > 1) return false;
  const p = Object.fromEntries(ORDRE.map((c, i) => [c, v[i]]));
  const n = (q.get('n') || '').trim().slice(0, 20);
  const moi = etat.moi && ORDRE.every((c) => etat.moi.p[c] === p[c]) && (!n || n === etat.prenom);
  if (moi) { resultat(p, { animer: false }); return true; }
  etat.proches = (etat.proches || []).filter((a) => !(a.n === n && ORDRE.every((c) => a.p[c] === p[c])) && !(n && a.n === n));
  etat.proches.unshift({ n, p, date: Date.now() });
  etat.proches = etat.proches.slice(0, 12);
  sauver();
  resultat(p, { ami: n || 'Un proche', animer: true });
  return true;
}

if (!depuisLien()) accueil();
