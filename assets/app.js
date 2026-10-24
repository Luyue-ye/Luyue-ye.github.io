/* 网站的主要逻辑：读取 content/ 里的内容文件、切换日月两面、栏目跳转。一般不需要改动。 */
const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SEC = { sun: ['focus', 'conferences', 'publications', 'teaching'], moon: ['ideas', 'footprints', 'creations', 'echoes'] };
const NAV = { sun: ['Focus', 'Conferences', 'Publications', 'Teaching & Service'], moon: ['Ideas', 'Footprints', 'Creations', 'Echoes'] };
const ZH = { sun: ['研究', '会议', '发表', '教学与服务'], moon: ['想法', '足迹', '创作', '回声'] };
let mode = 'sun', view = -1, reading = null, book = null, busy = false, C = {}, wl = null, loaded = false, depth = 0;

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
  const fixUrl = u => { u = String(u || '').trim(); return /^[^\s@:/]+@[^\s@/]+\.[^\s@/]+$/.test(u) ? 'mailto:' + u : u; }; /* 只写了邮箱地址时，自动变成发邮件的链接 */
  const links = arr(s.links).map(l => { const u = fixUrl(l.url) || (/\bcv\b/i.test(l.label || '') && site.cv ? site.cv : ''); return u ? `<a href="${esc(u)}"${linkAttrs(u)}>${esc(l.label)}</a>` : `<span>${esc(l.label)}</span>`; }).join('');
  return errBox('site') + `<section class="home"><div class="sunwrap"><canvas class="sun-flares" id="sflares" aria-hidden="true"></canvas><div class="pframe sunp">${photo(site.photo_sun, '照片<br>Photo')}</div></div><div class="intro">
    ${s.hello ? `<p class="hi">${md(s.hello)}</p>` : ''}
    ${arr(s.paragraphs).map(p => `<p>${md(p)}</p>`).join('')}
    ${s.zh ? `<p class="zh-line">${md(s.zh)}</p>` : ''}
    ${links ? `<div class="links">${links}</div>` : ''}</div></section>`;
}
function homeMoon() {
  const site = C.site || {}, m = site.moon || {};
  return errBox('site') + (m.title ? `<p class="moon-title">${md(m.title)}</p>` : '') +
    `<section class="home"><div class="moonwrap"><svg class="moon-orbit" id="morbit" viewBox="0 0 160 160" aria-hidden="true"></svg><div class="pframe moonp">${photo(site.photo_moon, '生活照<br>Photo')}</div></div><div class="intro"><div class="poem">
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
const slugOf = f => String(f || '').split('/').pop().replace(/\.(md|markdown|docx|txt)$/i, '');
/* 每篇文章的网址代号：有文件用文件名，否则用标题 */
const itemSlug = (it, i) => String(it.slug || (it.file ? slugOf(it.file) : String(it.title || '').replace(/[*《》「」"'?#/\\\s]+/g, '').slice(0, 40)) || 'n' + (i + 1));
const hasText = it => !!(it.file || (it.body && String(it.body).trim()));
const cardHTML = (it, key) => `<article class="card${it.file ? ' link' : ''}"${it.file ? ` tabindex="0" role="link" data-read="${key}" data-slug="${esc(slugOf(it.file))}"` : ''}>
  <div class="k">${md(it.label || it.date || '')}</div><h3>${md(it.title || '')}</h3>${it.summary ? `<p>${md(it.summary)}</p>` : ''}${it.file ? '<span class="more">阅读 · Read →</span>' : ''}</article>`;
/* Ideas：塔罗牌。背面只显示日期，点一下翻开 */
const roman = n => { const v = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let s = ''; for (const [a, r] of v) while (n >= a) { s += r; n -= a; } return s || '0'; };
const TAROT_EDGE = `<path class="t-edge" d="M101 9 L105 13 L105 169 Q105 175 99 175 L13 175 L9 171"/>`;
const TAROT_BACK = `<svg class="tb-art" viewBox="0 0 106 176" aria-hidden="true">${TAROT_EDGE}
  <rect class="t-card" x="1" y="1" width="100" height="170" rx="6"/><rect class="t-in" x="7" y="7" width="88" height="158" rx="3"/>
  <g transform="translate(51 72)"><circle class="t-g" r="24"/><circle class="t-g dash" r="28"/>
  ${Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12, r2 = i % 2 ? 35 : 39; return `<line class="t-g" x1="${(31 * Math.cos(a)).toFixed(1)}" y1="${(31 * Math.sin(a)).toFixed(1)}" x2="${(r2 * Math.cos(a)).toFixed(1)}" y2="${(r2 * Math.sin(a)).toFixed(1)}"/>`; }).join('')}
  <path class="t-moon" d="M5 -16 A17 17 0 1 0 5 16 A13.5 13.5 0 1 1 5 -16Z"/></g>
  ${[[18, 18], [84, 18], [18, 154], [84, 154], [51, 14], [51, 158]].map(([x, y]) => `<path class="t-st" d="M${x} ${y - 3}Q${x} ${y} ${x + 3} ${y}Q${x} ${y} ${x} ${y + 3}Q${x} ${y} ${x - 3} ${y}Q${x} ${y} ${x} ${y - 3}Z"/>`).join('')}</svg>`;
const TAROT_FRONT = `<svg class="tb-art" viewBox="0 0 106 176" aria-hidden="true">${TAROT_EDGE}<rect class="t-card" x="1" y="1" width="100" height="170" rx="6"/><rect class="t-in solid" x="5" y="5" width="92" height="162" rx="4"/></svg>`;
function ideasPage() {
  const d = C.ideas || {}, items = arr(d.items), n = items.length;
  return head(0) + errBox('ideas') + intro(d) + `<p class="tarot-hint">点一张牌，翻开它 · Tap a card to turn it over</p><div class="tarot-grid">${items.map((it, i) => `
    <div class="tarot" role="button" tabindex="0" aria-label="${esc(it.date || '')}，翻开 Turn over">
      <div class="in">
        <div class="face back-face">${TAROT_BACK}<div class="tb-date">${md(it.date || '—')}</div></div>
        <div class="face front-face">${TAROT_FRONT}<div class="tf-num">${roman(n - i)}</div><h3>${md(it.title || '')}</h3>${it.summary ? `<p>${md(it.summary)}</p>` : ''}
          ${hasText(it) ? `<button class="tf-read" data-read="ideas" data-slug="${esc(itemSlug(it, i))}">阅读全文 · Read →</button>` : ''}<div class="tf-date">${md(it.date || '')}</div></div>
      </div></div>`).join('')}</div>`;
}
function findWriting(key, slug) { return arr((C.ideas || {}).items).find((it, i) => itemSlug(it, i) === slug); }
const readerShell = meta => `<article class="article"><div class="a-meta">${md(meta)}</div><div class="body" id="abody"><p class="soon">…</p></div></article><div class="pager" id="rpager"></div>`;
function readerPage() {
  const it = findWriting(reading.key, reading.slug), i = SEC.moon.indexOf(reading.key);
  return `<button class="back" data-sec="${i}">← ${NAV.moon[i]}</button>` + (it ? readerShell(it.date || it.label || '') : '<p class="soon">找不到这篇文章 · Not found</p>');
}
function pageNums(cur, n) {
  const set = [...new Set([0, n - 1, cur - 2, cur - 1, cur, cur + 1, cur + 2].filter(x => x >= 0 && x < n))].sort((a, b) => a - b);
  let out = '', prev = -1;
  set.forEach(x => { if (x - prev > 1) out += '<span class="pg-gap">…</span>'; out += `<button data-pg="${x}"${x === cur ? ' aria-current="true"' : ''}>${x + 1}</button>`; prev = x; });
  return out;
}
/* 正文文件：支持 Markdown (.md)、Word (.docx)、纯文本 (.txt) */
const libs = {};
const loadScript = src => libs[src] || (libs[src] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }));
async function fileToHTML(file) {
  const r = await fetch(file, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status);
  const f = file.toLowerCase();
  if (f.endsWith('.docx')) {
    await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.11.0/mammoth.browser.min.js');
    return (await mammoth.convertToHtml({ arrayBuffer: await r.arrayBuffer() })).value;
  }
  if (f.endsWith('.txt')) return (await r.text()).split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => `<p>${esc(s)}</p>`).join('');
  return marked.parse(await r.text());
}
/* 正文按页显示：长文章自动分成几页，底部有页码 */
async function fillPaged(it, ref) {
  const box = $('#abody'); if (!box) return;
  let html;
  if (it.body && String(it.body).trim()) html = marked.parse(String(it.body));
  else if (it.file) {
    try { html = await fileToHTML(it.file); if (!/^\s*<h1/i.test(html)) html = `<h1>${md(it.title || '')}</h1>` + html; }
    catch (_) { html = `<p class="err-box">读取文章失败，请检查文件名和格式（支持 .md、.docx、.txt）：<code>${esc(it.file)}</code></p>`; }
  } else html = `${it.summary ? `<p>${md(it.summary)}</p>` : ''}`;
  if (!/^\s*<h1/i.test(html)) html = `<h1>${md(it.title || '')}</h1>` + html;
  try { await document.fonts.ready; } catch (_) {}
  if ($('#abody') !== box) return;
  box.innerHTML = html;
  const PH = Math.max(620, Math.min(1100, innerHeight * 1.1)), pages = []; let cur = [], start = null;
  [...box.children].forEach(k => { const top = k.offsetTop, bot = top + k.offsetHeight; if (start === null) start = top; if (cur.length && bot - start > PH) { pages.push(cur); cur = []; start = top; } cur.push(k.outerHTML); });
  if (cur.length) pages.push(cur);
  const pg = $('#rpager');
  const show = (p, dir) => {
    p = Math.max(0, Math.min(pages.length - 1, p)); ref.page = p;
    box.innerHTML = pages[p].join(''); box.classList.remove('turn'); void box.offsetWidth; if (dir) box.classList.add('turn');
    if (pages.length > 1) {
      pg.innerHTML = `<button data-prev aria-label="Previous page"${p <= 0 ? ' disabled' : ''}>‹</button><span class="pg-nums">${pageNums(p, pages.length)}</span><button data-next aria-label="Next page"${p >= pages.length - 1 ? ' disabled' : ''}>›</button>`;
      pg.querySelector('[data-prev]').onclick = () => show(p - 1, -1); pg.querySelector('[data-next]').onclick = () => show(p + 1, 1);
      pg.querySelectorAll('[data-pg]').forEach(b => (b.onclick = () => { const t = +b.dataset.pg; if (t !== p) show(t, t > p ? 1 : -1); }));
    } else pg.innerHTML = '';
    if (dir) { const a = box.closest('.article'); if (a) window.scrollTo({ top: a.getBoundingClientRect().top + scrollY - 24, behavior: reduce ? 'auto' : 'smooth' }); }
    replaceHash();
  };
  show(ref.page || 0, 0);
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
    <aside class="astro-list">${F.groups.map(g => `<div class="ag"><button class="ag-h" aria-expanded="false"><span class="z">${esc(g.zh)}</span> <span class="e">${esc(g.en)}</span><span class="n">${g.c.length}</span></button><div class="ac" hidden>${g.c.map(n => `<button data-city="${esc(n)}">${esc(n)}</button>`).join('')}</div></div>`).join('')}</aside></div>`;
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

/* 太阳面照片外围：泡泡从太阳边缘慢慢鼓出来、脱离、飘远；有的轻轻破掉，有的飘走消失 */
let flareRaf = 0;
function startFlares() {
  const cv = $('#sflares'); if (!cv) return;
  const ctx = cv.getContext('2d'); let W = 0, R = 0, bubbles = [], last = performance.now();
  const fit = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; cv.width = W * d; cv.height = W * d; ctx.setTransform(d, 0, 0, d, 0, 0); R = W / 1.6 / 2; };
  fit();
  const make = (now, age) => {
    const big = Math.random(), s = big < .6 ? 1.2 + Math.random() * 1.6 : big < .9 ? 2.8 + Math.random() * 2 : 4.8 + Math.random() * 2.6;
    const pop = Math.random() < .55;
    return { a: Math.random() * 6.283, s, v: R * (.01 + Math.random() * .014) * (s > 4 ? .7 : 1), w: (Math.random() - .5) * .018, ph: Math.random() * 6.283,
      t0: now - (age || 0), grow: 1.4 + Math.random() * 1.2, pop, end: pop ? 3.5 + Math.random() * 5 : 9 + Math.random() * 6 };
  };
  for (let i = 0; i < 70; i++) { const b = make(last); b.t0 = last - Math.random() * b.end * 1000; bubbles.push(b); }
  const ease = k => 1 - Math.pow(1 - k, 3);
  const frame = now => {
    if (cv.clientWidth !== W) fit();
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const c = W / 2, b = .5 + .5 * Math.sin(now / 1800);
    ctx.clearRect(0, 0, W, W);
    const g = ctx.createRadialGradient(c, c, R * .95, c, c, R * 1.5); g.addColorStop(0, `rgba(240,196,107,${.22 + .06 * b})`); g.addColorStop(1, 'rgba(240,196,107,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, R * 1.5, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(214,150,58,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(c, c, R + 2, 0, 6.283); ctx.stroke();
    if (!reduce) { let n = dt * 7; while (n > 0) { if (Math.random() < n) bubbles.push(make(now)); n -= 1; } }
    bubbles = bubbles.filter(p => (now - p.t0) / 1000 < p.end + .35);
    bubbles.forEach(p => {
      const age = (now - p.t0) / 1000, gk = Math.min(1, age / p.grow), rad = p.s * ease(gk);
      const drift = Math.max(0, age - p.grow * .6), r = R + 1 + rad + p.v * drift * (p.pop ? 1 : 1 + drift * .06);
      const ang = p.a + p.w * drift + Math.sin(age * .5 + p.ph) * .012, x = c + r * Math.cos(ang), y = c + r * Math.sin(ang);
      if (age > p.end) { /* 破掉：一圈很快散开的细环和几滴小水珠 */
        if (!p.pop) return;
        const q = (age - p.end) / .35, al = (1 - q) * .55;
        ctx.strokeStyle = `rgba(214,150,58,${al.toFixed(3)})`; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(x, y, rad * (1 + q * .9), 0, 6.283); ctx.stroke();
        ctx.fillStyle = `rgba(240,196,107,${al.toFixed(3)})`;
        for (let d = 0; d < 4; d++) { const da = p.ph + d * 1.57; ctx.beginPath(); ctx.arc(x + Math.cos(da) * rad * (1.2 + q * 1.4), y + Math.sin(da) * rad * (1.2 + q * 1.4), .6, 0, 6.283); ctx.fill(); }
        return;
      }
      const fade = p.pop ? 1 : Math.min(1, (p.end - age) / 3), al = Math.min(1, age / .8) * fade;
      ctx.fillStyle = `rgba(255,244,215,${(.12 * al).toFixed(3)})`; ctx.strokeStyle = `rgba(214,150,58,${(.38 * al).toFixed(3)})`; ctx.lineWidth = .55;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fill(); ctx.stroke();
      if (rad > 1.5) { ctx.strokeStyle = `rgba(255,255,255,${(.55 * al).toFixed(3)})`; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(x, y, rad * .65, 3.6, 4.6); ctx.stroke(); }
    });
    if (!reduce) flareRaf = requestAnimationFrame(frame);
  };
  flareRaf = requestAnimationFrame(frame);
}
/* 月亮面照片外围：呼吸的月晕 + 绕着转的小星星 */
let orbitRaf = 0;
function startOrbit() {
  const svg = $('#morbit'); if (!svg) return;
  const c = 80, star = (x, y, r, o) => `<path d="M${x.toFixed(2)} ${(y - r).toFixed(2)}Q${x.toFixed(2)} ${y.toFixed(2)} ${(x + r).toFixed(2)} ${y.toFixed(2)}Q${x.toFixed(2)} ${y.toFixed(2)} ${x.toFixed(2)} ${(y + r).toFixed(2)}Q${x.toFixed(2)} ${y.toFixed(2)} ${(x - r).toFixed(2)} ${y.toFixed(2)}Q${x.toFixed(2)} ${y.toFixed(2)} ${x.toFixed(2)} ${(y - r).toFixed(2)}Z" fill="#ECE8DD" opacity="${o.toFixed(2)}"/>`;
  const orbits = [[58, .3, 0, 2, 2.2], [66, -.2, 1.5, 2, 1.8], [74, .14, 3, 3, 1.6]];
  const frame = n => {
    const T = reduce ? 0 : n / 1000, b = .5 + .5 * Math.sin(T * .8);
    let o = `<circle cx="${c}" cy="${c}" r="64" fill="none" stroke="#ECE8DD" stroke-width="8" opacity="${(.04 + .035 * b).toFixed(3)}"/>`
      + `<circle cx="${c}" cy="${c}" r="64" fill="none" stroke="#C9CCD8" stroke-width=".5" opacity="${(.3 + .2 * b).toFixed(2)}"/>`
      + `<circle cx="${c}" cy="${c}" r="68" fill="none" stroke="#D9CFA8" stroke-width=".35" opacity="${(.15 + .12 * b).toFixed(2)}"/>`
      + `<circle cx="${c}" cy="${c}" r="59.5" fill="none" stroke="#ECE8DD" stroke-width=".35" stroke-dasharray="1 5" opacity=".35"/>`;
    orbits.forEach(([r, s, p, k, sz], i) => {
      for (let j = 0; j < k; j++) { const a = p + j * 2.1 + T * s; o += star(c + r * Math.cos(a), c + r * .94 * Math.sin(a), sz, .65 + .3 * Math.sin(T * 1.7 + i + j)); }
    });
    svg.innerHTML = o;
    if (!reduce) orbitRaf = requestAnimationFrame(frame);
  };
  orbitRaf = requestAnimationFrame(frame);
}
function render() {
  cancelAnimationFrame(orbitRaf); cancelAnimationFrame(flareRaf);
  if (window.stopMap) stopMap();
  if (window.stopBook) stopBook();
  if (wl) { try { wl.destroy(); } catch (_) {} wl = null; }
  const m = $('#main');
  if (!loaded) { m.innerHTML = ''; return; }
  const P = { sun: [() => listSection('focus', 0), () => listSection('conferences', 1), () => listSection('publications', 2), () => listSection('teaching', 3)],
              moon: [ideasPage, footprintsPage, creationsPage, echoesPage] };
  const inner = reading ? readerPage() : view < 0 ? (mode === 'sun' ? homeSun() : homeMoon()) : P[mode][view]();
  const showBar = view >= 0 || reading || depth > 0;
  m.innerHTML = inner + (showBar ? `<div class="backbar"><button data-goback>← 返回上一页 · Back</button><button data-top>↑ 回到顶部 · Top</button></div>` : '');
  m.querySelectorAll('img[data-ph]').forEach(img => {
    /* 照片路径容错：文件夹写成 image/、扩展名大小写不一致时，自动再试几种写法 */
    const src = img.getAttribute('src'), base = src.replace(/^\.?\/?(images?\/)?/i, ''), stem = base.replace(/\.[^.]+$/, ''), ext = (base.match(/\.[^.]+$/) || [''])[0];
    const tries = [...new Set([ext, ext.toLowerCase(), ext.toUpperCase(), '.jpg', '.JPG', '.jpeg', '.png', '.PNG'].map(e => 'images/' + stem + e))].filter(u => u !== src);
    img.onerror = () => { const next = tries.shift(); if (next) { img.src = next; return; } const d = document.createElement('div'); d.className = 'photo ph'; d.innerHTML = img.dataset.ph; img.replaceWith(d); };
  });
  m.querySelectorAll('[data-home]').forEach(b => (b.onclick = () => go(-1, b)));
  m.querySelectorAll('[data-sec]').forEach(b => (b.onclick = () => go(+b.dataset.sec, b, true)));
  m.querySelectorAll('[data-goback]').forEach(b => (b.onclick = goBack));
  m.querySelectorAll('[data-top]').forEach(b => (b.onclick = () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })));
  m.querySelectorAll('[data-read]').forEach(c => {
    const open = e => { if (e) e.stopPropagation(); reading = { key: c.dataset.read, slug: c.dataset.slug, page: 0 }; book = null; swap(); commit(); };
    c.onclick = open; c.onkeydown = e => { if (e.key === 'Enter') open(e); };
  });
  m.querySelectorAll('.tarot').forEach(t => {
    const flip = () => t.classList.toggle('open');
    t.onclick = flip; t.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === t) { e.preventDefault(); flip(); } };
  });
  document.querySelectorAll('nav .item').forEach((b, i) => { b.textContent = NAV[mode][i]; b.setAttribute('aria-current', String(i === view)); });
  if (reading) { const it = findWriting(reading.key, reading.slug); if (it) fillPaged(it, reading); }
  if (mode === 'moon' && view === 1 && !reading) {
    m.querySelectorAll('.ag-h').forEach(b => (b.onclick = () => { const open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); b.nextElementSibling.hidden = !open; }));
    initMap();
  }
  if (mode === 'moon' && view === 3 && !reading) mountWaline();
  if (mode === 'moon' && view < 0 && !reading) startOrbit();
  if (mode === 'sun' && view < 0 && !reading) startFlares();
  if (mode === 'moon' && view === 2 && !reading) mountBook();
}

/* 网址与“返回上一页”：每次跳转都记进浏览器历史，所以浏览器的后退键也能用 */
function stateHash() {
  if (reading) return `${reading.key}/${reading.slug}` + (reading.page ? `/${reading.page + 1}` : '');
  if (view < 0) return mode === 'moon' ? 'moon' : '';
  const s = SEC[mode][view];
  if (s === 'creations' && book) return `creations/${book.id}` + (book.slug ? `/${book.slug}` + (book.page ? `/${book.page + 1}` : '') : '');
  return s;
}
const urlFor = t => (t ? '#' + t : location.pathname + location.search);
function commit() { try { history.pushState({ d: ++depth }, '', urlFor(stateHash())); } catch (_) {} }
function replaceHash() { try { history.replaceState({ d: depth }, '', urlFor(stateHash())); } catch (_) {} }
function parseHash(t) {
  const [sec, a, b, c] = decodeURIComponent(t).split('/');
  const s = { mode: 'sun', view: -1, reading: null, book: null };
  if (t === 'moon') s.mode = 'moon';
  else if (SEC.sun.includes(sec)) s.view = SEC.sun.indexOf(sec);
  else if (SEC.moon.includes(sec)) {
    s.mode = 'moon'; s.view = SEC.moon.indexOf(sec);
    if (sec === 'ideas' && a) s.reading = { key: 'ideas', slug: a, page: b ? Math.max(0, (+b || 1) - 1) : 0 };
    if (sec === 'creations' && a) s.book = { id: a, slug: b || null, page: c ? Math.max(0, (+c || 1) - 1) : 0 };
  }
  return s;
}
function goBack() {
  if (depth > 0) { history.back(); return; }
  if (book && book.slug) navBook({ id: book.id, slug: null, page: 0 });
  else if (book) navBook(null);
  else if (reading) { reading = null; swap(); commit(); }
  else go(-1);
}
addEventListener('popstate', e => {
  depth = (e.state && e.state.d) || 0;
  const s = parseHash(location.hash.slice(1));
  if (s.mode !== mode) switchMode(s.mode === 'moon', () => { view = s.view; reading = s.reading; book = s.book; });
  else { view = s.view; reading = s.reading; book = s.book; swap(); }
});
function navBook(b) { book = b; reading = null; swap(); commit(); }
function swap() {
  const m = $('#main'), moon = mode === 'moon';
  m.classList.add('fade'); if (moon && !reduce) m.style.filter = 'blur(8px)';
  setTimeout(() => {
    render(); window.scrollTo({ top: 0 });
    if (moon) { requestAnimationFrame(() => { m.classList.remove('fade'); m.style.filter = 'blur(0px)'; }); setTimeout(() => { m.style.filter = ''; }, 1000); }
    else m.classList.remove('fade');
  }, 300);
}
function go(i, el, force) {
  if (busy || (i === view && !reading && !book && !force)) return;
  const moon = mode === 'moon';
  if (el && window.navFx) { const r = el.getBoundingClientRect(); navFx(r.left + r.width / 2, r.top + r.height / 2); }
  if (el && !moon && !reduce && el.closest('nav')) {
    const d = $('#ndm'), tb = $('#ntb'), t0 = performance.now(); el.style.filter = 'url(#wavenav)';
    (function f(n) {
      const k = Math.min(1, (n - t0) / 1600);
      d.setAttribute('scale', (4 * Math.sin(Math.PI * k)).toFixed(2));
      tb.setAttribute('baseFrequency', (0.05 + 0.03 * k).toFixed(3) + ' ' + (0.18 + 0.08 * k).toFixed(3));
      if (k < 1) requestAnimationFrame(f); else { d.setAttribute('scale', 0); el.style.filter = ''; }
    })(t0);
  }
  view = i; reading = null; book = null; swap(); commit();
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
function switchMode(toMoon, setState) {
  if (busy) return; busy = true;
  document.documentElement.classList.toggle('moon', toMoon);
  $('#disc').setAttribute('fill', toMoon ? '#4A5068' : '#F0C46B'); $('#stars').style.opacity = toMoon ? 1 : 0;
  ripple(toMoon ? '#A3A6B4' : '#C9A04A');
  const m = $('#main'), items = document.querySelectorAll('nav .item');
  m.classList.add('fade'); items.forEach(b => (b.style.opacity = 0));
  setTimeout(() => {
    mode = toMoon ? 'moon' : 'sun'; reading = null; book = null; if (setState) setState(); else view = -1; /* 点 Lulu 切换时，总是回到另一面的首页 */
    render(); m.classList.remove('fade'); items.forEach(b => (b.style.opacity = 1)); setDecor(toMoon);
  }, reduce ? 0 : 600);
  toMoon ? eclipse(330, 122, () => (busy = false)) : eclipse(122, -140, () => { $('#sh').setAttribute('cx', 330); busy = false; });
}
function toggle() { if (busy) return; switchMode(mode === 'sun'); commitLater(); }
function commitLater() { setTimeout(commit, reduce ? 0 : 620); }
$('#toggle').onclick = toggle; $('#hint').onclick = toggle;

/* 打开网页时：读取内容，并根据网址（#focus、#ideas、#creations/fiction 等）直接打开对应页面 */
(async function boot() {
  const s = parseHash(location.hash.slice(1));
  if (s.mode === 'moon') { mode = 'moon'; setDecor(true); $('#sh').setAttribute('cx', 122); }
  view = s.view; reading = s.reading; book = s.book;
  try { history.replaceState({ d: 0 }, '', location.href); } catch (_) {}
  await loadContent();
  render();
})();
