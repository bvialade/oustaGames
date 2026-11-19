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

function card(a, i, kicker) {
  const read = (lus[edition.date] || []).includes(i);
  return `<article class="art${read ? ' read' : ''}" data-i="${i}">
    ${kicker ? `<div class="kicker">${kicker}</div>` : ''}
    <h4 class="serif">${esc(a.titre)}</h4>
    <p>${esc(a.resume)}</p>
    <div class="meta"><a href="${esc(a.source.url)}" target="_blank" rel="noopener">Lire · ${esc(a.source.nom)} ↗</a></div>
  </article>`;
}

function render() {
  const arts = edition.articles;
  const isToday = edition.date === dates[0];
  $('day').textContent = (isToday ? 'Édition du ' : 'Archive · ') + longDate(edition.date);
  $('today').hidden = isToday;
  const medias = new Set(arts.map((a) => a.source.nom)).size;

  // À la une : les articles marqués "une", affichés en grand en tête.
  const une = arts.map((a, i) => [a, i]).filter(([a]) => a.une);
  let html = '';
  if (une.length) {
    html += `<section class="une">${une.map(([a, i]) => {
      const r = RUBRIQUES.find((x) => x[0] === a.rubrique);
      return card(a, i, '★ À la une' + (r ? ' · ' + r[2] : ''));
    }).join('')}</section>`;
  }
  const present = RUBRIQUES.filter(([k]) => arts.some((a) => a.rubrique === k && !a.une));
  for (const [k, ico, nom] of present) {
    const list = arts.map((a, i) => [a, i]).filter(([a]) => a.rubrique === k && !a.une);
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

  $('content').querySelectorAll('.art a').forEach((link) => (link.onclick = () => {
    const art = link.closest('.art');
    const i = +art.dataset.i;
    const l = lus[edition.date] || (lus[edition.date] = []);
    if (!l.includes(i)) l.push(i);
    save();
    setTimeout(() => { art.classList.add('read'); stats(medias); }, 300);
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
