// Revue de presse quotidienne : une édition par jour dans data/AAAA-MM-JJ.json,
// la liste des dates dans data/index.json (générées chaque matin, voir outils/revue_presse.md).
const STORE = 'ousta.revue';
const $ = (id) => document.getElementById(id);

const RUBRIQUES = [
  ['monde', '🌍', 'Monde'],
  ['france', '🇫🇷', 'France'],
  ['toulouse', '📍', 'Toulouse'],
  ['economie', '💶', 'Économie'],
  ['sciences', '🔬', 'Sciences & tech'],
  ['culture', '🎭', 'Culture'],
  ['sport', '⚽', 'Sport'],
  ['insolite', '🤪', 'Insolite'],
];

let dates = [];
let lus = load(); // { 'AAAA-MM-JJ': [index des articles ouverts] }
let edition;
let source = loadSource(); // média choisi dans le filtre ('' = tous)

// Filtre par source : un même média peut être écrit de deux façons selon les jours.
const ALIAS = { 'La Dépêche du Midi': 'La Dépêche' };
const media = (a) => ALIAS[a.source.nom] || a.source.nom;
function loadSource() {
  try { return localStorage.getItem(STORE + '.source') || ''; } catch { return ''; }
}
function saveSource() {
  try { localStorage.setItem(STORE + '.source', source); } catch {}
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function save() {
  // On ne garde que les 30 dernières éditions.
  const keep = Object.keys(lus).sort().slice(-30);
  lus = Object.fromEntries(keep.map((d) => [d, lus[d]]));
  try { localStorage.setItem(STORE, JSON.stringify(lus)); } catch {}
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const longDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

async function init() {
  try {
    dates = await (await fetch('data/index.json', { cache: 'no-cache' })).json();
  } catch {
    dates = [];
  }
  dates.sort().reverse();
  route();
}

async function route() {
  if (!dates.length) { $('empty').hidden = false; $('edition').hidden = true; return; }
  const wanted = location.hash.slice(1);
  const date = dates.includes(wanted) ? wanted : dates[0];
  try {
    edition = await (await fetch(`data/${date}.json`, { cache: 'no-cache' })).json();
  } catch {
    $('empty').hidden = false; $('edition').hidden = true; return;
  }
  render();
  window.scrollTo(0, 0);
}

// Vignette : l'image d'aperçu de l'article, chargée depuis le site du média (rien n'est copié ici).
// Sans image, ou si elle ne se charge pas, une vignette colorée selon la rubrique la remplace.
function thumb(a, big) {
  const r = RUBRIQUES.find((x) => x[0] === a.rubrique) || ['', '📰'];
  const fallback = `<span class="ph r-${esc(a.rubrique)}">${r[1]}</span>`;
  if (!a.image) return `<div class="thumb${big ? ' big' : ''}">${fallback}</div>`;
  return `<div class="thumb${big ? ' big' : ''}">${fallback}
    <img src="${esc(a.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.querySelector('.credit-img')?.remove(); this.remove()">
    ${big ? `<span class="credit-img">Photo · ${esc(a.source.nom)}</span>` : ''}</div>`;
}

function card(a, i, kicker) {
  const read = (lus[edition.date] || []).includes(i);
  const big = !!kicker;
  return `<article class="art${read ? ' read' : ''}" data-i="${i}">
    ${big ? thumb(a, true) : ''}
    ${kicker ? `<div class="kicker">${kicker}</div>` : ''}
    <div class="head"><h4 class="serif">${esc(a.titre)}</h4>${big ? '' : thumb(a, false)}</div>
    <p>${esc(a.resume)}</p>
    ${a.detail && a.detail.length ? `<div class="detail" hidden>${a.detail.map((d) => `<p>${esc(d)}</p>`).join('')}
      <p class="credit">Résumé détaillé rédigé par OustaGames d'après l'article de ${esc(a.source.nom)}.</p></div>` : ''}
    <div class="meta">
      ${a.detail && a.detail.length ? '<button class="more" aria-expanded="false">Voir plus ▾</button>' : ''}
      <a href="${esc(a.source.url)}" target="_blank" rel="noopener">Article · ${esc(a.source.nom)} ↗</a>
    </div>
  </article>`;
}

function render() {
  const arts = edition.articles;
  const isToday = edition.date === dates[0];
  $('day').textContent = (isToday ? 'Édition du ' : 'Archive · ') + longDate(edition.date);
  $('today').hidden = isToday;
  const medias = new Set(arts.map(media)).size;

  // Sources de l'édition, de la plus citée à la moins citée.
  const counts = {};
  arts.forEach((a) => (counts[media(a)] = (counts[media(a)] || 0) + 1));
  const sources = Object.keys(counts).sort((x, y) => counts[y] - counts[x] || x.localeCompare(y, 'fr'));
  const actif = sources.includes(source) ? source : ''; // un média absent ce jour-là : on montre tout
  const pairs = arts.map((a, i) => [a, i]).filter(([a]) => !actif || media(a) === actif);
  $('sources').innerHTML = `<button data-s="" class="${actif ? '' : 'on'}">Toutes les sources</button>` +
    sources.map((m) => `<button data-s="${esc(m)}" class="${m === actif ? 'on' : ''}">${esc(m)} <span>${counts[m]}</span></button>`).join('');
  $('sources').querySelectorAll('button').forEach((b) => (b.onclick = () => {
    source = b.dataset.s;
    saveSource();
    render();
    $('sources').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  const on = $('sources').querySelector('.on');
  $('sources').scrollLeft = on ? on.offsetLeft - 16 : 0;
  $('filtre').hidden = !actif;
  $('filtre').innerHTML = actif ? `${counts[actif]} article${counts[actif] > 1 ? 's' : ''} de <b>${esc(actif)}</b> <button id="nofiltre">Tout afficher ✕</button>` : '';
  if (actif) $('nofiltre').onclick = () => { source = ''; saveSource(); render(); };

  // À la une : les articles marqués "une", affichés en grand en tête.
  const une = pairs.filter(([a]) => a.une);
  let html = '';
  if (une.length) {
    html += `<section class="une">${une.map(([a, i]) => {
      const r = RUBRIQUES.find((x) => x[0] === a.rubrique);
      return card(a, i, '★ À la une' + (r ? ' · ' + r[2] : ''));
    }).join('')}</section>`;
  }
  const present = RUBRIQUES.filter(([k]) => pairs.some(([a]) => a.rubrique === k && !a.une));
  for (const [k, ico, nom] of present) {
    const list = pairs.filter(([a]) => a.rubrique === k && !a.une);
    html += `<section class="rub" id="r-${k}"><h3 class="serif">${ico} ${nom}<small>${list.length} article${list.length > 1 ? 's' : ''}</small></h3>
      ${list.map(([a, i]) => card(a, i)).join('')}</section>`;
  }
  $('content').innerHTML = html;

  $('chips').innerHTML = (une.length ? `<button data-k="une">★ À la une</button>` : '') +
    present.map(([k, ico, nom]) => `<button data-k="${k}">${ico} ${nom}</button>`).join('');
  $('chips').querySelectorAll('button').forEach((b) => (b.onclick = () => {
    const target = b.dataset.k === 'une' ? document.querySelector('.une') : $('r-' + b.dataset.k);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  const markRead = (art, delay) => {
    const i = +art.dataset.i;
    const l = lus[edition.date] || (lus[edition.date] = []);
    if (!l.includes(i)) l.push(i);
    save();
    setTimeout(() => { art.classList.add('read'); stats(medias); }, delay);
  };
  $('content').querySelectorAll('.art a').forEach((link) => (link.onclick = () => markRead(link.closest('.art'), 300)));
  // « Voir plus » : déplie le résumé détaillé dans la page, sans quitter l'appli.
  $('content').querySelectorAll('.art .more').forEach((btn) => (btn.onclick = () => {
    const art = btn.closest('.art');
    const det = art.querySelector('.detail');
    const open = det.hidden;
    det.hidden = !open;
    art.classList.toggle('open', open);
    btn.textContent = open ? 'Voir moins ▴' : 'Voir plus ▾';
    btn.setAttribute('aria-expanded', open);
    if (open) markRead(art, 0);
    else art.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
  stats(medias);
  quizTag();

  const others = dates.filter((d) => d !== edition.date).slice(0, 14);
  $('archive').hidden = !others.length;
  $('archive-list').innerHTML = others.map((d) => {
    const n = (lus[d] || []).length;
    return `<a href="#${d}">${shortDate(d)}<span>${n ? n + ' lu' + (n > 1 ? 's' : '') : ''}</span></a>`;
  }).join('');
  $('edition').hidden = false;
  $('empty').hidden = true;
}

function stats(medias) {
  const n = edition.articles.length;
  const read = (lus[edition.date] || []).length;
  $('stats').textContent = `${n} articles · ${medias} médias${read ? ` · ${read} lu${read > 1 ? 's' : ''}` : ''}`;
  $('bar').style.width = Math.round((read / n) * 100) + '%';
}

// Lien vers le quiz du même jour, avec le score s'il a déjà été joué.
function quizTag() {
  let s = null;
  try {
    const q = JSON.parse(localStorage.getItem('ousta.quiz') || '{}')[edition.date];
    if (q && q.a) s = q.a.filter((x, i) => x === q.k[i]).length;
  } catch {}
  const isToday = edition.date === dates[0];
  $('quizlink').hidden = !isToday;
  $('quiztag').textContent = s !== null ? `Quiz du jour déjà joué : ${s}/10` : "10 questions sur l'actu du jour";
}

window.addEventListener('hashchange', route);
init();
