/* Creations：处女座星座。每颗亮星是一个分类，点进去是这个分类的作品列表。
   分类和作品写在 content/creations.yaml，这里一般不需要改动。 */
const VIRGO = [ // [星名, 赤经(小时), 赤纬(度), 星等]，按亮度排序
  ['Spica', 13.42, -11.16, 1.0], ['Porrima', 12.69, -1.45, 2.7], ['Vindemiatrix', 13.04, 10.96, 2.8], ['Minelauva', 12.93, 3.40, 3.4],
  ['Heze', 13.58, -0.60, 3.4], ['Zavijava', 11.84, 1.76, 3.6], ['Zaniah', 12.33, -0.67, 3.9], ['Rijl al Awwa', 14.72, -5.66, 3.9],
  ['Nu Virginis', 11.77, 6.53, 4.0], ['Omicron Virginis', 12.09, 8.73, 4.1], ['Syrma', 14.27, -6.0, 4.1], ['Tau Virginis', 14.03, 1.54, 4.3], ['Theta Virginis', 13.16, -5.54, 4.4]];
const VLINES = [['Vindemiatrix', 'Minelauva'], ['Minelauva', 'Porrima'], ['Porrima', 'Zaniah'], ['Zaniah', 'Zavijava'], ['Zavijava', 'Nu Virginis'], ['Nu Virginis', 'Omicron Virginis'],
  ['Porrima', 'Theta Virginis'], ['Theta Virginis', 'Spica'], ['Minelauva', 'Heze'], ['Heze', 'Spica'], ['Heze', 'Tau Virginis'], ['Heze', 'Syrma'], ['Syrma', 'Rijl al Awwa']];
const VW = 680, VH = 540, VX = ra => 600 - (ra - 11.6) / (14.9 - 11.6) * 520, VY = de => 60 + (13 - de) / 26 * 400;
const STAR_PATH = r => `M0 ${-r}Q0 0 ${r} 0Q0 0 0 ${r}Q0 0 ${-r} 0Q0 0 0 ${-r}Z`;
let VG = null, lastStar = null;

/* 读取分类：每个分类占一颗星。没写 star 的分类，按亮度依次分到还空着的星 */
function virgoCats() {
  const d = C.creations || {};
  let cats = arr(d.categories);
  if (!cats.length) cats = arr(d.books).length ? arr(d.books) : arr(d.groups);
  const used = new Set(), out = [];
  cats.forEach((c, i) => {
    let st = VIRGO.find(s => s[0].toLowerCase() === String(c.star || '').toLowerCase() && !used.has(s[0]));
    if (!st) st = VIRGO.find(s => !used.has(s[0]));
    if (!st) return;
    used.add(st[0]);
    out.push({ id: String(c.id || 'c' + (i + 1)), title: c.title || '', star: st[0],
      items: arr(c.items).map((it, j) => ({ ...it, slug: it.file ? slugOf(it.file) : String(it.id || 'n' + (j + 1)) })) });
  });
  return out;
}
window.stopBook = () => { if (VG) { cancelAnimationFrame(VG.raf); VG = null; } };

function creationsPage() {
  const cats = virgoCats();
  if (!book) return head(2) + errBox('creations') + intro(C.creations) +
    `<div class="virgo" id="virgo"><svg id="vgo" viewBox="0 0 ${VW} ${VH}" role="group" aria-label="Virgo constellation"></svg></div><p class="tarot-hint center-hint">Tap a bright star</p>`;
  const c = cats.find(x => x.id === book.id);
  if (!c) return `<button class="back" data-cons>← Virgo</button><p class="soon">Not found</p>`;
  if (!book.slug) return `<button class="back" data-cons>← Virgo</button><section class="instar">
    <svg class="is-star" viewBox="-30 -30 60 60" aria-hidden="true"><circle r="26" class="g1"/><circle r="16" class="g2"/><circle r="9" class="g3"/><path d="${STAR_PATH(17)}"/></svg>
    <h2 class="is-t">${md(c.title)}</h2><p class="is-n">${esc(c.star)} · ${c.items.length} ${c.items.length === 1 ? 'work' : 'works'}</p>
    <div class="is-list">${c.items.length ? c.items.map(it => `<button class="ttl" data-work="${esc(it.slug)}"><svg viewBox="-10 -10 20 20" aria-hidden="true"><path d="${STAR_PATH(9)}"/></svg><span>${md(it.title || '')}</span></button>`).join('')
      : '<p class="is-empty">This star is still quiet.</p>'}</div></section>`;
  const it = c.items.find(x => x.slug === book.slug);
  if (!it) return `<button class="back" data-cat>← ${md(c.title)}</button><p class="soon">Not found</p>`;
  return `<button class="back" data-cat>← ${md(c.title)}</button>` + readerShell(it.label || '');
}

function mountBook() {
  const m = $('#main');
  m.querySelectorAll('[data-cons]').forEach(b => (b.onclick = () => { lastStar = book && book.id; navBook(null); }));
  m.querySelectorAll('[data-cat]').forEach(b => (b.onclick = () => navBook({ id: book.id, slug: null, page: 0 })));
  m.querySelectorAll('[data-work]').forEach(b => (b.onclick = () => navBook({ id: book.id, slug: b.dataset.work, page: 0 })));
  if (book && book.slug) {
    const c = virgoCats().find(x => x.id === book.id), it = c && c.items.find(x => x.slug === book.slug);
    if (it) fillPaged(it, book);
    return;
  }
  if (!book) drawVirgo();
}

function drawVirgo() {
  const svg = $('#vgo'); if (!svg) return;
  const cats = virgoCats(), byStar = {}; cats.forEach(c => (byStar[c.star] = c));
  const P = {}; VIRGO.forEach(s => (P[s[0]] = { x: VX(s[1]), y: VY(s[2]), mag: s[3] }));
  const bgStars = Array.from({ length: 70 }, (_, i) => `<circle cx="${(i * 137) % VW}" cy="${(i * 263) % VH}" r="${i % 7 ? 0.6 : 1}" class="vbg" opacity="${i % 7 ? 0.25 : 0.45}"/>`).join('');
  const lines = VLINES.map(([a, b]) => { const A = P[a], B = P[b], lit = byStar[a] || byStar[b]; return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="vline${lit ? ' lit' : ''}"/>`; }).join('');
  const dim = VIRGO.filter(s => !byStar[s[0]]).map(s => { const p = P[s[0]], r = (Math.max(1.4, 4.6 - s[3] * 0.75) * 0.8).toFixed(1);
    return `<circle cx="${p.x}" cy="${p.y}" r="${r}" class="vdim"/><text x="${p.x + 8}" y="${p.y + 4}" class="vname">${esc(s[0])}</text>`; }).join('');
  const lit = cats.map(c => { const p = P[c.star];
    return `<g class="vstar" data-cat-id="${esc(c.id)}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${esc(c.title)}">
      <circle r="34" class="vhit"/><g class="vglow"><circle r="27"/><circle r="16"/><circle r="10"/></g><path d="${STAR_PATH(10)}" class="vsp"/><circle r="2.4" class="vcore"/>
      <text y="-22" class="vlabel">${esc(String(c.title).replace(/\*/g, ''))}</text></g>`; }).join('');
  svg.innerHTML = bgStars + lines + dim + lit +
    `<text x="28" y="40" class="vtitle">Virgo</text><text x="28" y="60" class="vsub">${VIRGO.length} stars · ${cats.length} lit</text>`;
  const me = (VG = { raf: 0 }), glows = [...svg.querySelectorAll('.vglow')];
  (function pulse(n) { glows.forEach((g, i) => g.setAttribute('opacity', (0.82 + 0.18 * Math.sin(n / 600 + i * 1.7)).toFixed(3))); if (VG === me) me.raf = requestAnimationFrame(pulse); })(performance.now());
  const enter = g => {
    if (busy) return; const c = cats.find(x => x.id === g.dataset.catId), p = P[c.star];
    svg.style.transformOrigin = `${(p.x / VW * 100).toFixed(1)}% ${(p.y / VH * 100).toFixed(1)}%`;
    svg.classList.add('zoom'); setTimeout(() => navBook({ id: c.id, slug: null, page: 0 }), reduce ? 0 : 700);
  };
  svg.querySelectorAll('.vstar').forEach(g => { g.onclick = () => enter(g); g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(g); } }; });
  if (lastStar && !reduce) { /* 从星星里出来时，镜头从那颗星拉远 */
    const c = cats.find(x => x.id === lastStar);
    if (c) { const p = P[c.star]; svg.style.transformOrigin = `${(p.x / VW * 100).toFixed(1)}% ${(p.y / VH * 100).toFixed(1)}%`; svg.classList.add('zoom', 'nofade');
      requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove('zoom', 'nofade'))); }
  }
  lastStar = null;
}
