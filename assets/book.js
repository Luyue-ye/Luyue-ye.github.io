/* Creations：三本羊皮纸古书（书架 → 目录 → 正文）。作品数据在 content/creations.yaml，这里一般不需要改动。 */
let BV = null;
window.stopBook = () => {
  if (!BV) return;
  removeEventListener('resize', BV.onR); removeEventListener('keydown', BV.onK); clearTimeout(BV.t); BV = null;
};
const EMBLEM = { fiction: '☾', essays: '✦', misc: '❋' };
function booksData() {
  const d = C.creations || {};
  let b = arr(d.books);
  if (!b.length && arr(d.groups).length) b = arr(d.groups).map((g, i) => ({ id: g.id || 'book' + (i + 1), title: g.title, zh: g.zh, items: g.items }));
  return b.map((x, i) => {
    const id = String(x.id || 'book' + (i + 1));
    return { id, title: x.title || '', zh: x.zh || '', subtitle: x.subtitle || '', emblem: x.emblem || EMBLEM[id] || '✦',
      items: arr(x.items).map((it, j) => ({ ...it, slug: it.file ? slugOf(it.file) : String(it.id || 'n' + (j + 1)) })) };
  });
}
const shelfHTML = books => `<p class="tarot-hint">点一本书，翻开它 · Choose a book</p><div class="shelf">${books.map(b => `
  <button class="tome" data-book="${esc(b.id)}" aria-label="${esc(b.zh || b.title)}">
    <span class="tome-pages" aria-hidden="true"></span>
    <span class="tome-cover"><span class="tc-frame"></span><span class="tc-orn">${esc(b.emblem)}</span>
      <span class="tc-t">${md(b.title)}</span><span class="tc-z">${esc(b.zh)}</span><span class="tc-n">${b.items.length} 篇</span></span>
  </button>`).join('')}</div>`;

function creationsPage() {
  const books = booksData();
  if (!book) return head(2) + errBox('creations') + intro(C.creations) + shelfHTML(books);
  const b = books.find(x => x.id === book.id);
  if (!b) return `<button class="back" data-shelf>← 书架 · Shelf</button><p class="soon">找不到这本书 · Not found</p>`;
  return `<button class="back" data-shelf>← 书架 · Shelf</button><div class="tome-open" id="tomeOpen"><div class="spread" id="spread"><p class="soon">…</p></div><div class="pager" id="pager"></div></div>`;
}

/* 把长文按书页大小切页：用多栏排版测出需要几页，每页显示其中一栏 */
function paginate(html, W, H, gap) {
  const probe = document.createElement('div');
  probe.className = 'flow';
  probe.style.cssText = `position:absolute;left:-99999px;top:0;width:${W}px;height:${H}px;column-width:${W}px;column-gap:${gap}px;column-fill:auto`;
  probe.innerHTML = html; document.body.appendChild(probe);
  const n = Math.max(1, Math.round((probe.scrollWidth + gap) / (W + gap)));
  probe.remove();
  return Array.from({ length: n }, (_, k) => ({ html: `<div class="flow" style="width:${W}px;height:${H}px;column-width:${W}px;column-gap:${gap}px;column-fill:auto;transform:translateX(${-k * (W + gap)}px)">${html}</div>`, text: true }));
}

async function mountBook() {
  $('#main').querySelectorAll('[data-shelf]').forEach(x => (x.onclick = () => navBook(null)));
  if (!book) {
    $('#main').querySelectorAll('.tome').forEach(t => (t.onclick = () => {
      if (t.classList.contains('opening')) return;
      t.classList.add('opening'); setTimeout(() => navBook({ id: t.dataset.book, slug: null, page: 0 }), reduce ? 0 : 750);
    }));
    return;
  }
  const host = $('#tomeOpen'); if (!host) return;
  const b = booksData().find(x => x.id === book.id); if (!b) return;
  window.stopBook();
  const me = (BV = { t: 0, onR: null, onK: null });
  const cw = host.clientWidth, wide = cw >= 760;
  const pw = Math.floor(wide ? Math.min(450, cw / 2) : Math.min(cw, 460)), ph = Math.round(pw * (wide ? 1.36 : 1.5));
  const pad = wide ? 40 : 28, top = 48, bottom = 58, W = pw - pad * 2, H = ph - top - bottom, gap = 48;
  me.cw = cw; me.wide = wide;

  let pages;
  const titleLeaf = `<div class="lf-title"><div class="lt-orn">${esc(b.emblem)}</div><div class="lt-t">${md(b.title)}</div><div class="lt-z">${esc(b.zh)}</div>${b.subtitle ? `<div class="lt-s">${md(b.subtitle)}</div>` : ''}<div class="lt-n">${b.items.length} 篇 · Lulu</div></div>`;
  const tocList = `<div class="toc-h">目录 · Contents</div>${b.items.length ? b.items.map((it, i) => `<a href="#creations/${esc(b.id)}/${esc(it.slug)}" class="toc-i" data-work="${esc(it.slug)}"><span>${md(it.title || '')}</span><i>${roman(i + 1)}</i></a>`).join('') : '<p class="toc-empty">这本书还是空白的 · Still blank</p>'}`;
  if (!book.slug) {
    pages = wide ? [{ html: titleLeaf }, { html: `<div class="lf-toc">${tocList}</div>` }]
                 : [{ html: `<div class="lf-toc"><div class="lt-mini">${esc(b.emblem)} ${md(b.title)} · ${esc(b.zh)}</div>${tocList}</div>` }];
  } else {
    const it = b.items.find(x => x.slug === book.slug);
    if (!it) { $('#spread').innerHTML = '<p class="soon">找不到这一篇 · Not found</p>'; return; }
    const tp = { html: `<div class="lf-work"><div class="lw-l">${md(it.label || '')}</div><div class="lw-t">${md(it.title || '')}</div>${it.summary ? `<p class="lw-s">${md(it.summary)}</p>` : ''}<div class="lw-orn">${esc(b.emblem)}</div></div>` };
    let body = [];
    if (it.file) {
      let html = '<p>（读取全文失败）</p>';
      try { const r = await fetch(it.file, { cache: 'no-cache' }); if (r.ok) html = marked.parse((await r.text()).replace(/^\s*#\s[^\n]*\n/, '')); } catch (_) {}
      try { await document.fonts.ready; } catch (_) {}
      if (BV !== me) return;
      body = paginate(html, W, H, gap);
    }
    pages = [tp, ...body];
  }
  me.pages = pages;

  const leaf = (p, i, side) => `<div class="leaf ${side}" style="width:${pw}px;height:${ph}px">${p ? (p.text ? `<div class="lf-text" style="top:${top}px;left:${pad}px;width:${W}px;height:${H}px">${p.html}</div>` : `<div class="lf-in" style="padding:${top}px ${pad}px ${bottom}px">${p.html}</div>`) : ''}${p && book.slug && i > 0 ? `<div class="lf-num">${i}</div>` : ''}</div>`;
  const pageList = (cur, n) => {
    const set = new Set([0, n - 1, cur - 2, cur - 1, cur, cur + 1, cur + 2].filter(x => x >= 0 && x < n));
    let out = '', prev = -1;
    [...set].sort((a, c) => a - c).forEach(x => { if (x - prev > 1) out += '<span class="pg-gap">…</span>'; out += `<button data-pg="${x}"${x === cur ? ' aria-current="true"' : ''}>${x === 0 ? '·' : x}</button>`; prev = x; });
    return out;
  };
  function show(p, dir) {
    const n = pages.length; p = Math.max(0, Math.min(n - 1, p)); const s = wide ? p - (p % 2) : p;
    me.p = s; if (book) book.page = s;
    const sp = $('#spread'); if (!sp) return;
    sp.style.setProperty('--dir', dir > 0 ? '-10deg' : dir < 0 ? '10deg' : '0deg');
    sp.innerHTML = wide ? leaf(pages[s], s, 'left') + leaf(pages[s + 1], s + 1, 'right') : leaf(pages[s], s, 'single');
    sp.classList.remove('turn'); void sp.offsetWidth; if (dir) sp.classList.add('turn');
    sp.querySelectorAll('[data-work]').forEach(a => (a.onclick = e => { e.preventDefault(); navBook({ id: b.id, slug: a.dataset.work, page: 0 }); }));
    const pg = $('#pager');
    if (book.slug) {
      const last = wide ? n - 1 - ((n - 1) % 2) : n - 1, step = wide ? 2 : 1;
      const cur = wide && s + 1 < n ? s + 1 : s;
      pg.innerHTML = `<button data-prev aria-label="Previous page"${s <= 0 ? ' disabled' : ''}>‹</button><span class="pg-nums">${pageList(cur, n)}</span><button data-next aria-label="Next page"${s >= last ? ' disabled' : ''}>›</button>
        <button class="pg-toc" data-toc>目录 · Contents</button>`;
      pg.querySelector('[data-prev]').onclick = () => show(s - step, -1);
      pg.querySelector('[data-next]').onclick = () => show(s + step, 1);
      pg.querySelector('[data-toc]').onclick = () => navBook({ id: b.id, slug: null, page: 0 });
      pg.querySelectorAll('[data-pg]').forEach(x => (x.onclick = () => { const t = +x.dataset.pg; show(t, t > s ? 1 : t < s ? -1 : 0); }));
      replaceHash();
    } else pg.innerHTML = '';
  }
  show(book.page || 0, 0);
  me.onK = e => { if (!book || !book.slug || /input|textarea/i.test(e.target.tagName)) return; if (e.key === 'ArrowRight') $('#pager [data-next]')?.click(); if (e.key === 'ArrowLeft') $('#pager [data-prev]')?.click(); };
  addEventListener('keydown', me.onK);
  me.onR = () => { clearTimeout(me.t); me.t = setTimeout(() => { const h = $('#tomeOpen'); if (h && ((h.clientWidth >= 760) !== me.wide || Math.abs(h.clientWidth - me.cw) > 60)) mountBook(); }, 350); };
  addEventListener('resize', me.onR);
}
