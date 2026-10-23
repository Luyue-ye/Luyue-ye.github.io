/* Creations：一本可以翻阅的书。作品数据在 content/creations.yaml，这里一般不需要改动。 */
let BOOK = null;
window.stopBook = () => {
  if (!BOOK) return;
  try { BOOK.flip && BOOK.flip.destroy(); } catch (_) {}
  removeEventListener('resize', BOOK.onResize); clearTimeout(BOOK.t); BOOK = null;
};

function bookItems() {
  const d = C.creations || {};
  return arr(d.groups).map(g => ({ g, items: arr(g.items) }));
}
async function bookTexts(groups) {
  const out = {};
  await Promise.all(groups.flatMap(x => x.items).filter(it => it.file).map(async it => {
    try {
      const r = await fetch(it.file, { cache: 'no-cache' }); if (!r.ok) throw 0;
      const t = (await r.text()).replace(/^\s*#\s[^\n]*\n/, '');
      out[it.file] = marked.parse(t);
    } catch (_) { out[it.file] = '<p>（读取全文失败）</p>'; }
  }));
  return out;
}
/* 把一段长文按书页大小切成很多页：用多栏排版测量需要几页，每页显示其中一栏 */
function paginate(html, W, H, gap) {
  const probe = document.createElement('div');
  probe.className = 'flow';
  probe.style.cssText = `position:absolute;left:-99999px;top:0;width:${W}px;height:${H}px;column-width:${W}px;column-gap:${gap}px;column-fill:auto`;
  probe.innerHTML = html; document.body.appendChild(probe);
  const n = Math.max(1, Math.round((probe.scrollWidth + gap) / (W + gap)));
  probe.remove();
  return Array.from({ length: n }, (_, k) => `<div class="flow" style="width:${W}px;height:${H}px;column-width:${W}px;column-gap:${gap}px;column-fill:auto;transform:translateX(${-k * (W + gap)}px)">${html}</div>`);
}

async function initBook() {
  const stage = $('#bookStage'); if (!stage) return;
  if (!window.St || !St.PageFlip) { stage.innerHTML = '<p class="soon">书暂时无法打开 · The book could not load</p>'; return; }
  window.stopBook();
  const me = (BOOK = { flip: null, t: 0, onResize: null, w: stage.clientWidth });
  const groups = bookItems(), texts = await bookTexts(groups);
  try { await document.fonts.ready; } catch (_) {}
  if (BOOK !== me || !$('#bookStage')) return;

  const cw = stage.clientWidth, wide = cw >= 720;
  const pw = Math.floor(wide ? Math.min(430, cw / 2) : Math.min(cw, 420)), ph = Math.round(pw * (wide ? 1.42 : 1.48));
  const pad = wide ? 34 : 26, W = pw - pad * 2, H = ph - 40 - 54, gap = 40;

  const pages = [], toc = [];
  const page = (inner, cls = '', hard = false) => { pages.push({ inner, cls, hard }); return pages.length - 1; };
  page(`<div class="cover"><div class="cv-orn">☾</div><div class="cv-t">Creations</div><div class="cv-z">创作</div><div class="cv-a">Lulu</div></div>`, 'hard-page', true);
  const tocAt = page('');
  groups.forEach(({ g, items }) => {
    items.forEach(it => {
      const start = page(`<div class="pg"><div class="tp"><div class="tp-g">${md(g.title || '')}${g.zh ? ' · ' + esc(g.zh) : ''}</div>
        <div class="tp-l">${md(it.label || '')}</div><h3 class="tp-t">${md(it.title || '')}</h3>${it.summary ? `<p class="tp-s">${md(it.summary)}</p>` : ''}
        ${it.file ? `<button class="tp-open" data-read="creations" data-slug="${esc(slugOf(it.file))}">单独打开这一篇 · Open as a page</button>` : ''}</div></div>`);
      toc.push({ g, it, at: start });
      if (it.file) paginate(texts[it.file] || '', W, H, gap).forEach(f => page(`<div class="pg">${f}</div>`));
    });
  });
  if ((pages.length - 1) % 2 === 1) page('<div class="pg"></div>');
  page(`<div class="cover back"><div class="cv-orn">✦</div></div>`, 'hard-page', true);
  let lastG = null;
  pages[tocAt].inner = `<div class="pg"><div class="toc-h">目录 · Contents</div>${toc.map(({ g, it, at }) => {
    const gh = g !== lastG ? `<div class="toc-g">${md(g.title || '')}${g.zh ? ' · ' + esc(g.zh) : ''}</div>` : ''; lastG = g;
    return gh + `<a href="#" class="toc-i" data-goto="${at}"><span>${md(it.title || '')}</span><i>${at}</i></a>`;
  }).join('')}</div>`;

  stage.innerHTML = `<div id="book">${pages.map((p, i) => `<div class="page ${p.cls}"${p.hard ? ' data-density="hard"' : ''}><div class="page-in">${p.inner}${!p.hard && i > 0 ? `<div class="pg-num">${i}</div>` : ''}</div></div>`).join('')}</div>`;
  stage.querySelectorAll('[data-read]').forEach(b => (b.onclick = e => { e.stopPropagation(); reading = { key: 'creations', slug: b.dataset.slug }; swap(); }));
  const fl = (me.flip = new St.PageFlip($('#book'), {
    width: pw, height: ph, size: 'fixed', showCover: true, usePortrait: !wide, maxShadowOpacity: 0.35,
    mobileScrollSupport: false, flippingTime: reduce ? 1 : 900, drawShadow: true, clickEventForward: true
  }));
  fl.loadFromHTML(stage.querySelectorAll('.page'));
  stage.querySelectorAll('[data-goto]').forEach(a => (a.onclick = e => { e.preventDefault(); e.stopPropagation(); fl.flip(+a.dataset.goto); }));
  const ctrl = $('#bookCtrl'), num = () => { const i = fl.getCurrentPageIndex(); $('#bkNum').textContent = `${i + 1} / ${pages.length}`; };
  ctrl.hidden = false; num();
  fl.on('flip', num);
  $('#bkPrev').onclick = () => fl.flipPrev(); $('#bkNext').onclick = () => fl.flipNext(); $('#bkToc').onclick = () => fl.flip(tocAt);
  me.onResize = () => { clearTimeout(me.t); me.t = setTimeout(() => { const s = $('#bookStage'); if (s && Math.abs(s.clientWidth - me.w) > 40) initBook(); }, 350); };
  addEventListener('resize', me.onResize);
}
