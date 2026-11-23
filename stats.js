// Écran de statistiques partagé par les jeux, au style « bento » de la page d'accueil.
// Chaque jeu calcule ses chiffres et les assemble avec ces petits blocs, puis appelle Stats.open().
const Stats = (() => {
  // Couleurs des tuiles de l'accueil. fg : couleur du texte posé dessus.
  const C = {
    blue: ['#2154d6', '#fff'], yellow: ['#ffd23f', '#1a1a1a'], orange: ['#ff5a36', '#fff'],
    green: ['#0f9d6b', '#fff'], lilac: ['#c7b8ff', '#1a1a1a'], pink: ['#ffb3c7', '#1a1a1a'],
    red: ['#e7002a', '#fff'], ink: ['var(--st-ink)', 'var(--st-bg)'], plain: ['var(--st-plain)', 'var(--st-ink)'],
    soft: ['var(--st-soft)', 'var(--st-ink)'],
  };
  const bg = (c) => (C[c] || [c])[0];
  const fg = (c) => (C[c] || [c, '#fff'])[1];
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const act = (a) => (a ? ` data-act="${esc(a)}" role="button" tabindex="0"` : '');

  let el, opts, current;

  function sheet() {
    if (el) return el;
    el = document.createElement('dialog');
    el.className = 'st-sheet';
    el.innerHTML = `<header class="st-head"><span class="st-title"></span><button class="st-x" aria-label="Fermer">✕</button></header>
      <nav class="st-tabs"></nav><div class="st-body"></div>`;
    document.body.appendChild(el);
    el.querySelector('.st-x').onclick = () => el.close();
    el.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) { current = tab.dataset.tab; return draw(true); }
      const a = e.target.closest('[data-act]');
      if (a && opts.onAction) opts.onAction(a.dataset.act, el);
    });
    return el;
  }

  function draw(top) {
    el.querySelector('.st-title').textContent = opts.title;
    const tabs = el.querySelector('.st-tabs');
    tabs.hidden = !opts.tabs || opts.tabs.length < 2;
    tabs.innerHTML = (opts.tabs || []).map((t) =>
      `<button data-tab="${esc(t.id)}" class="${t.id === current ? 'st-on' : ''}">${esc(t.label)}</button>`).join('');
    const body = el.querySelector('.st-body');
    body.innerHTML = opts.render(current);
    if (top) body.scrollTop = 0;
  }

  return {
    // opts : { title, tabs: [{ id, label }], tab, render(tab) -> html, onAction(action, dialog) }
    open(o) {
      opts = o;
      current = o.tab || (o.tabs && o.tabs[0].id);
      sheet();
      draw(true);
      if (!el.open) el.showModal();
    },
    refresh() { if (el && el.open) draw(false); },
    close() { if (el) el.close(); },

    pct: (a, b) => (b ? Math.round((100 * a) / b) : 0),

    // Grille de grosses tuiles colorées : [{ v, l, c, wide, sub }].
    tiles: (items) => `<div class="st-tiles">${items.map((t) =>
      `<div class="st-tile${t.wide ? ' st-wide' : ''}" style="--bgc:${bg(t.c || 'plain')};--fg:${fg(t.c || 'plain')}"${act(t.act)}>
        <b>${t.v}</b><span>${t.l}</span>${t.sub ? `<small>${t.sub}</small>` : ''}</div>`).join('')}</div>`,

    // Bloc titré qui entoure un graphique.
    card: (title, inner, note) =>
      `<section class="st-card"><h3>${title}</h3>${inner}${note ? `<p class="st-note">${note}</p>` : ''}</section>`,

    // Barres horizontales : [{ label, value, max, text, c, hi }].
    bars(rows, max) {
      const m = max || Math.max(1, ...rows.map((r) => r.value));
      return `<div class="st-bars">${rows.map((r) => `<div class="st-bar${r.hi ? ' st-hi' : ''}"${act(r.act)}>
        <span class="st-bl">${r.label}</span>
        <span class="st-bt"><i style="width:${r.value ? Math.max(3, (100 * r.value) / (r.max || m)) : 0}%;--bgc:${bg(r.c || 'blue')}"></i></span>
        <span class="st-bv">${r.text !== undefined ? r.text : r.value}</span></div>`).join('')}</div>`;
    },

    // Colonnes verticales : [{ label, value, text, c, act, empty }]. max : hauteur pleine.
    cols(rows, max) {
      const m = max || Math.max(1, ...rows.map((r) => r.value || 0));
      return `<div class="st-cols" style="--n:${rows.length}">${rows.map((r) => `<div class="st-col${r.empty ? ' st-none' : ''}${r.hi ? ' st-hi' : ''}"${act(r.act)}>
        <span class="st-cv">${r.empty ? '' : r.text !== undefined ? r.text : r.value}</span>
        <span class="st-ct"><i style="height:${r.empty ? 0 : Math.max(4, (100 * (r.value || 0)) / m)}%;--bgc:${bg(r.c || 'blue')}"></i></span>
        <span class="st-cl">${r.label}</span></div>`).join('')}</div>`;
    },

    // Calendrier par mois, semaines du lundi au dimanche.
    // days : { 'AAAA-MM-JJ': { c, text, act } } ; from/to : dates 'AAAA-MM-JJ' à couvrir.
    cal(days, from, to) {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const start = new Date(from + 'T12:00:00');
      const end = new Date(to + 'T12:00:00');
      const today = iso(new Date());
      let html = '';
      for (let m = new Date(start.getFullYear(), start.getMonth(), 1, 12); m <= end; m.setMonth(m.getMonth() + 1)) {
        const name = m.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        let cells = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<b>${d}</b>`).join('');
        cells += '<span></span>'.repeat((m.getDay() + 6) % 7);
        const last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= last; d++) {
          const day = iso(new Date(m.getFullYear(), m.getMonth(), d, 12));
          const x = days[day];
          const out = day < from || day > to;
          cells += x
            ? `<span class="st-on${day === today ? ' st-today' : ''}" style="--bgc:${bg(x.c)};--fg:${fg(x.c)}"${act(x.act)}>${x.text !== undefined ? x.text : d}</span>`
            : `<span class="${out ? 'st-out' : 'st-off'}${day === today ? ' st-today' : ''}">${d}</span>`;
        }
        html += `<div class="st-month"><h4>${name}</h4><div class="st-cal">${cells}</div></div>`;
      }
      return html;
    },

    // Légende de couleurs : [[c, texte]].
    legend: (items) => `<div class="st-legend">${items.map(([c, t]) => `<span><i style="--bgc:${bg(c)}"></i>${t}</span>`).join('')}</div>`,

    // Liste de lignes : [{ left, sub, right, c, act }].
    list: (rows) => `<div class="st-list">${rows.map((r) => `<div class="st-row"${act(r.act)}>
      <span><b>${r.left}</b>${r.sub ? `<small>${r.sub}</small>` : ''}</span>
      <em style="--bgc:${bg(r.c || 'soft')};--fg:${fg(r.c || 'soft')}">${r.right}</em></div>`).join('')}</div>`,

    empty: (text) => `<p class="st-empty">${text}</p>`,
  };
})();
