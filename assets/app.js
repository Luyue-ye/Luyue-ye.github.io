/* 网站的主要逻辑：读取 content/ 里的内容文件、切换日月两面、栏目跳转。一般不需要改动。 */
const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SEC = { sun: ['focus', 'conferences', 'publications', 'teaching'], moon: ['ideas', 'footprints', 'creations', 'echoes'] };
const NAV = { sun: ['Focus', 'Conferences', 'Publications', 'Teaching & Service'], moon: ['Ideas', 'Footprints', 'Creations', 'Echoes'] };
const ZH = { sun: ['研究', '会议', '发表', '教学与服务'], moon: ['想法', '足迹', '创作', '回声'] };
let mode = 'sun', view = -1, reading = null, busy = false, C = {}, wl = null, loaded = false;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = s => (window.marked ? marked.parseInline(String(s ?? '')) : esc(s));
const arr = x => (Array.isArray(x) ? x : x ? [x] : []);
const ext = u => /^(https?:)?\/\//.test(u);
const linkAttrs = u => (ext(u) ? ' target="_blank" rel="noopener"' : '');

async function loadContent() {
  const names = ['site', 'focus', 'conferences', 'publications', 'teaching', 'ideas', 'creations', 'footprints'];
  await Promise.all(names.map(async n => {
    try {
      const r = await fetch(`content/${n}.yaml`, { cache: 'no-cache' });
      if (!r.ok) throw new Error('找不到文件 (' + r.status + ')');
      C[n] = jsyaml.load(await r.text()) || {};
    } catch (e) { C[n] = { __error: `content/${n}.yaml — ${e.message}` }; }
  }));
  loaded = true;
}
const errBox = n => (C[n] && C[n].__error ? `<p class="err-box">这个栏目的内容文件读取失败，请检查格式：<br><code>${esc(C[n].__error)}</code></p>` : '');
const intro = d => (d && d.intro ? `<p class="sec-intro">${md(d.intro)}</p>` : '');
const head = i => `<button class="back" data-home>← Lulu</button><div class="sec-head"><h1>${NAV[mode][i]}</h1><span class="zh">${ZH[mode][i]}</span></div>`;
const photo = (src, ph) => (src ? `<img class="photo" src="${esc(src)}" alt="Lulu" data-ph="${esc(ph)}">` : `<div class="photo ph">${ph}</div>`);

function homeSun() {
  const site = C.site || {}, s = site.sun || {};
  const links = arr(s.links).map(l => (l.url ? `<a href="${esc(l.url)}"${linkAttrs(l.url)}>${esc(l.label)}</a>` : `<span>${esc(l.label)}</span>`)).join('');
  return errBox('site') + `<section class="home">${photo(site.photo_sun, '照片<br>Photo')}<div class="intro">
    ${s.hello ? `<p class="hi">${md(s.hello)}</p>` : ''}
    ${arr(s.paragraphs).map(p => `<p>${md(p)}</p>`).join('')}
    ${s.zh ? `<p class="zh-line">${md(s.zh)}</p>` : ''}
    ${links ? `<div class="links">${links}</div>` : ''}</div></section>`;
}
function homeMoon() {
  const site = C.site || {}, m = site.moon || {};
  return errBox('site') + (m.title ? `<p class="moon-title">${md(m.title)}</p>` : '') +
    `<section class="home">${photo(site.photo_moon, '生活照<br>Photo')}<div class="intro"><div class="poem">
    <div>${arr(m.zh_lines).map(l => `<p>${md(l)}</p>`).join('')}</div>
    <div class="en">${arr(m.en_lines).map(l => `<p>${md(l)}</p>`).join('')}</div></div></div></section>`;
}
function listSection(key, i) {
  const d = C[key] || {};
  return head(i) + errBox(key) + intro(d) + arr(d.groups).map(g => `<div class="group"><h2>${md(g.title || '')}${g.zh ? ` <small>${esc(g.zh)}</small>` : ''}</h2>
    ${arr(g.items).map(it => `<div class="row"><div class="when">${md(it.when || '')}</div><div>
      <h3>${it.link ? `<a href="${esc(it.link)}"${linkAttrs(it.link)}>${md(it.title)}</a>` : md(it.title)}</h3>
      ${it.text ? `<div class="meta">${md(it.text)}</div>` : ''}</div></div>`).join('')}</div>`).join('');
}
const slugOf = f => String(f || '').split('/').pop().replace(/\.md$/i, '');
const cardHTML = (it, key) => `<article class="card${it.file ? ' link' : ''}"${it.file ? ` tabindex="0" role="link" data-read="${key}" data-slug="${esc(slugOf(it.file))}"` : ''}>
  <div class="k">${md(it.label || it.date || '')}</div><h3>${md(it.title || '')}</h3>${it.summary ? `<p>${md(it.summary)}</p>` : ''}${it.file ? '<span class="more">阅读 · Read →</span>' : ''}</article>`;
/* Ideas：塔罗牌。背面只显示日期，点一下翻开 */
const roman = n => { const v = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let s = ''; for (const [a, r] of v) while (n >= a) { s += r; n -= a; } return s || '0'; };
const TAROT_BACK = `<svg class="tb-art" viewBox="0 0 100 170" aria-hidden="true"><rect x="5" y="5" width="90" height="160" rx="5" fill="none" stroke="currentColor" stroke-width=".6"/><rect x="9" y="9" width="82" height="152" rx="3" fill="none" stroke="currentColor" stroke-width=".3" stroke-dasharray="1 2"/>
  <g transform="translate(50 72)"><circle r="27" fill="none" stroke="currentColor" stroke-width=".35"/><circle r="31" fill="none" stroke="currentColor" stroke-width=".25" stroke-dasharray=".6 2.2"/>
  ${Array.from({length: 24}, (_, i) => { const a = i * Math.PI / 12, r1 = 34, r2 = i % 2 ? 38 : 43; return `<line x1="${(r1 * Math.cos(a)).toFixed(1)}" y1="${(r1 * Math.sin(a)).toFixed(1)}" x2="${(r2 * Math.cos(a)).toFixed(1)}" y2="${(r2 * Math.sin(a)).toFixed(1)}" stroke="currentColor" stroke-width=".35"/>`; }).join('')}
  <path d="M6 -18 A19 19 0 1 0 6 18 A15 15 0 1 1 6 -18Z" fill="currentColor" opacity=".9"/></g>
  ${[[22,22],[78,22],[22,148],[78,148],[50,16],[50,154]].map(([x, y]) => `<path d="M${x} ${y - 3}Q${x} ${y} ${x + 3} ${y}Q${x} ${y} ${x} ${y + 3}Q${x} ${y} ${x - 3} ${y}Q${x} ${y} ${x} ${y - 3}Z" fill="currentColor"/>`).join('')}</svg>`;
function ideasPage() {
  const d = C.ideas || {}, items = arr(d.items), n = items.length;
  return head(0) + errBox('ideas') + intro(d) + `<p class="tarot-hint">点一张牌，翻开它 · Tap a card to turn it over</p><div class="tarot-grid">${items.map((it, i) => `
    <div class="tarot" role="button" tabindex="0" aria-label="${esc(it.date || '')}，翻开 Turn over">
      <div class="in">
        <div class="face back-face">${TAROT_BACK}<div class="tb-date">${md(it.date || '—')}</div></div>
        <div class="face front-face"><div class="tf-num">${roman(n - i)}</div><h3>${md(it.title || '')}</h3>${it.summary ? `<p>${md(it.summary)}</p>` : ''}
          ${it.file ? `<button class="tf-read" data-read="ideas" data-slug="${esc(slugOf(it.file))}">阅读全文 · Read →</button>` : ''}<div class="tf-date">${md(it.date || '')}</div></div>
      </div></div>`).join('')}</div>`;
}
function creationsPage() {
  const d = C.creations || {};
  return head(2) + errBox('creations') + intro(d) + `<div class="book-stage" id="bookStage"><p class="soon">…</p></div>
    <div class="book-ctrl" id="bookCtrl" hidden><button id="bkPrev" aria-label="Previous page">‹</button><span id="bkNum"></span><button id="bkNext" aria-label="Next page">›</button><button id="bkToc">目录 · Contents</button></div>`;
}
function findWriting(key, slug) {
  const d = C[key] || {}, items = key === 'ideas' ? arr(d.items) : arr(d.groups).flatMap(g => arr(g.items));
  return items.find(it => slugOf(it.file) === slug);
}
function readerPage() {
  const { key, slug } = reading, it = findWriting(key, slug), i = SEC.moon.indexOf(key);
  if (!it) return `<button class="back" data-sec="${i}">← ${NAV.moon[i]}</button><p class="soon">找不到这篇文章 · Not found</p>`;
  return `<button class="back" data-sec="${i}">← ${NAV.moon[i]}</button><article class="article">
    <div class="a-meta">${md(it.label || it.date || '')}</div><div class="body" id="abody"><p class="soon">…</p></div></article>`;
}
async function fillReader() {
  const it = findWriting(reading.key, reading.slug), box = $('#abody');
  if (!it || !box) return;
  try {
    const r = await fetch(it.file, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status);
    let text = await r.text(); if (!/^\s*#\s/.test(text)) text = `# ${it.title || ''}\n\n` + text;
    if ($('#abody') === box) box.innerHTML = marked.parse(text);
  } catch (e) { box.innerHTML = `<p class="err-box">读取文章失败：<code>${esc(it.file)}</code></p>`; }
}

/* 足迹：把 footprints.yaml 整理成地区（星座）和地点（星星） */
function parseCoords(c) {
  if (Array.isArray(c)) return [Number(c[0]), Number(c[1])];
  const m = String(c || '').match(/(-?\d+(?:\.\d+)?)\s*[,，\s]\s*(-?\d+(?:\.\d+)?)/);
  return m ? [Number(m[1]), Number(m[2])] : [NaN, NaN];
}
function fpData() {
  const d = C.footprints || {}, groups = arr(d.regions).map(r => ({ zh: r.name, en: r.en || '', c: [] })), places = {};
  arr(d.places).forEach(p => {
    if (!p || !p.name) return; const [lat, lon] = parseCoords(p.coords); if (!isFinite(lat) || !isFinite(lon)) return;
    places[p.name] = { ...p, lat, lon };
    let g = groups.find(r => r.zh === p.region); if (!g) { g = { zh: p.region || '其他', en: '', c: [] }; groups.push(g); }
    g.c.push(p.name);
  });
  return { groups: groups.filter(g => g.c.length), places };
}
function footprintsPage() {
  const d = C.footprints || {}, F = (window.FP = fpData());
  return head(1) + errBox('footprints') + intro(d) + `<div class="astro-wrap"><div id="astro" class="astro">
    <canvas id="astroCv" role="img" aria-label="An astrolabe-style star map of places Lulu has visited"></canvas><div id="astroCard" class="astro-card" hidden></div></div>
    <aside class="astro-list">${F.groups.map(g => `<div class="ag"><h3>${esc(g.zh)} <span>${esc(g.en)}</span></h3><div class="ac">${g.c.map(n => `<button data-city="${esc(n)}">${esc(n)}</button>`).join('')}</div></div>`).join('')}</aside></div>`;
}
function echoesPage() {
  const e = (C.site || {}).echoes || {};
  return head(3) + intro(e) + (e.waline_server ? '<div id="waline"></div>' : '<p class="soon">留言板即将开放 · Echoes will open soon</p>');
}
function mountWaline() {
  const e = (C.site || {}).echoes || {};
  if (!e.waline_server || !$('#waline')) return;
  import('https://cdn.jsdelivr.net/npm/@waline/client@3.6.0/dist/waline.js').then(({ init }) => {
    if (!$('#waline')) return;
    wl = init({
      el: '#waline', serverURL: e.waline_server, path: '/echoes', lang: 'zh-CN', dark: 'html.moon',
      login: 'disable', meta: ['nick'], requiredMeta: [], wordLimit: 500, pageSize: 20,
      emoji: false, imageUploader: false, search: false, reaction: false, pageview: false, comment: false,
      locale: { placeholder: e.placeholder || '在这里留下一句话 · Leave an echo', nick: '名字 · Name', sofa: '还没有回声，留下第一句吧 · Be the first echo', submit: 'Leave an echo' }
    });
  }).catch(() => { const w = $('#waline'); if (w) w.innerHTML = '<p class="soon">留言板暂时无法加载 · Echoes could not load</p>'; });
}

function render() {
  if (window.stopMap) stopMap();
  if (window.stopBook) stopBook();
  if (wl) { try { wl.destroy(); } catch (_) {} wl = null; }
  const m = $('#main');
  if (!loaded) { m.innerHTML = ''; return; }
  const P = { sun: [() => listSection('focus', 0), () => listSection('conferences', 1), () => listSection('publications', 2), () => listSection('teaching', 3)],
              moon: [ideasPage, footprintsPage, creationsPage, echoesPage] };
  m.innerHTML = reading ? readerPage() : view < 0 ? (mode === 'sun' ? homeSun() : homeMoon()) : P[mode][view]();
  m.querySelectorAll('img[data-ph]').forEach(img => { img.onerror = () => { const d = document.createElement('div'); d.className = 'photo ph'; d.innerHTML = img.dataset.ph; img.replaceWith(d); }; });
  m.querySelectorAll('[data-home]').forEach(b => (b.onclick = () => go(-1, b)));
  m.querySelectorAll('[data-sec]').forEach(b => (b.onclick = () => go(+b.dataset.sec, b, true)));
  m.querySelectorAll('[data-read]').forEach(c => {
    const open = e => { if (e) e.stopPropagation(); reading = { key: c.dataset.read, slug: c.dataset.slug }; swap(); };
    c.onclick = open; c.onkeydown = e => { if (e.key === 'Enter') open(e); };
  });
  m.querySelectorAll('.tarot').forEach(t => {
    const flip = () => t.classList.toggle('open');
    t.onclick = flip; t.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === t) { e.preventDefault(); flip(); } };
  });
  document.querySelectorAll('nav .item').forEach((b, i) => { b.textContent = NAV[mode][i]; b.setAttribute('aria-current', String(i === view && !reading)); });
  if (reading) fillReader();
  if (mode === 'moon' && view === 1 && !reading) initMap();
  if (mode === 'moon' && view === 3 && !reading) mountWaline();
  if (mode === 'moon' && view === 2 && !reading && window.initBook) initBook();
  setHash();
}
function setHash() {
  const t = reading ? `${reading.key}/${reading.slug}` : view < 0 ? (mode === 'moon' ? 'moon' : '') : SEC[mode][view];
  try { history.replaceState(null, '', t ? '#' + t : location.pathname + location.search); } catch (_) {}
}
function swap(effect) {
  const m = $('#main'), moon = mode === 'moon';
  m.classList.add('fade'); if (moon && !reduce) m.style.filter = 'blur(8px)';
  setTimeout(() => {
    render(); window.scrollTo({ top: 0 });
    if (moon) { requestAnimationFrame(() => { m.classList.remove('fade'); m.style.filter = 'blur(0px)'; }); setTimeout(() => { m.style.filter = ''; }, 1000); }
    else m.classList.remove('fade');
  }, 300);
}
function go(i, el, force) {
  if (busy || (i === view && !reading && !force)) return;
  const moon = mode === 'moon';
  if (el && window.navFx) { const r = el.getBoundingClientRect(); navFx(r.left + r.width / 2, r.top + r.height / 2); }
  if (el && !moon && !reduce) {
    const d = $('#ndm'), tb = $('#ntb'), t0 = performance.now(); el.style.filter = 'url(#wavenav)';
    (function f(n) {
      const k = Math.min(1, (n - t0) / 1600);
      d.setAttribute('scale', (4 * Math.sin(Math.PI * k)).toFixed(2));
      tb.setAttribute('baseFrequency', (0.05 + 0.03 * k).toFixed(3) + ' ' + (0.18 + 0.08 * k).toFixed(3));
      if (k < 1) requestAnimationFrame(f); else { d.setAttribute('scale', 0); el.style.filter = ''; }
    })(t0);
  }
  view = i; reading = null; swap();
}
document.querySelectorAll('nav .item').forEach(b => (b.onclick = () => go(+b.dataset.i, b)));

/* 日月切换 */
const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function ripple(col) {
  if (reduce) return;
  for (let j = 0; j < 3; j++) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', 100); c.setAttribute('cy', 100); c.setAttribute('stroke', col); c.setAttribute('stroke-width', 0.8); $('#rip').appendChild(c);
    const t0 = performance.now() + j * 220;
    (function f(n) { const k = Math.max(0, Math.min(1, (n - t0) / 1400)); c.setAttribute('r', 44 + k * 56); c.setAttribute('opacity', k > 0 ? (1 - k) * 0.7 : 0); k < 1 ? requestAnimationFrame(f) : c.remove(); })(performance.now());
  }
}
function eclipse(a, b, cb) {
  const dur = reduce ? 1 : 1400, t0 = performance.now();
  (function f(n) {
    const k = Math.min(1, (n - t0) / dur), e = ease(k);
    $('#sh').setAttribute('cx', a + (b - a) * e);
    $('#dm').setAttribute('scale', (12 * Math.sin(Math.PI * k)).toFixed(2));
    $('#tb').setAttribute('baseFrequency', (0.02 + 0.015 * Math.sin(Math.PI * k)).toFixed(4));
    if (k < 1) requestAnimationFrame(f); else { $('#dm').setAttribute('scale', 0); cb(); }
  })(t0);
}
function setDecor(toMoon) {
  document.documentElement.classList.toggle('moon', toMoon);
  $('#disc').setAttribute('fill', toMoon ? '#4A5068' : '#F0C46B'); $('#stars').style.opacity = toMoon ? 1 : 0;
  $('#hint').textContent = toMoon ? '☀ back to daylight' : '☾ step into the night';
  $('#toggle').setAttribute('aria-label', toMoon ? 'Switch to the sun side' : 'Switch to the moon side');
}
function toggle() {
  if (busy) return; busy = true; const toMoon = mode === 'sun';
  document.documentElement.classList.toggle('moon', toMoon);
  $('#disc').setAttribute('fill', toMoon ? '#4A5068' : '#F0C46B'); $('#stars').style.opacity = toMoon ? 1 : 0;
  ripple(toMoon ? '#A3A6B4' : '#C9A04A');
  const m = $('#main'), items = document.querySelectorAll('nav .item');
  m.classList.add('fade'); items.forEach(b => (b.style.opacity = 0));
  setTimeout(() => {
    mode = toMoon ? 'moon' : 'sun'; reading = null; render(); m.classList.remove('fade'); items.forEach(b => (b.style.opacity = 1));
    setDecor(toMoon);
  }, reduce ? 0 : 600);
  toMoon ? eclipse(330, 122, () => (busy = false)) : eclipse(122, -140, () => { $('#sh').setAttribute('cx', 330); busy = false; });
}
$('#toggle').onclick = toggle; $('#hint').onclick = toggle;

/* 打开网页时：读取内容，并根据网址里的 #focus、#ideas 等直接打开对应栏目 */
(async function boot() {
  const t = decodeURIComponent(location.hash.slice(1));
  const [sec, slug] = t.split('/');
  if (SEC.moon.includes(sec) || t === 'moon') { mode = 'moon'; setDecor(true); $('#sh').setAttribute('cx', 122); }
  await loadContent();
  if (SEC[mode].includes(sec)) view = SEC[mode].indexOf(sec);
  if (slug && (sec === 'ideas' || sec === 'creations')) reading = { key: sec, slug };
  render();
})();
