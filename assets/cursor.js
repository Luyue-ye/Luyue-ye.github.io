/* 自定义鼠标：一个小光点紧跟鼠标，外圈光环慢半拍跟随；移到可点的东西上光环放大。只在电脑上生效。 */
(function () {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const html = document.documentElement, dot = document.createElement('div'), ring = document.createElement('div');
  dot.className = 'cc-dot'; ring.className = 'cc-ring'; dot.setAttribute('aria-hidden', 'true'); ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot); html.classList.add('cc');
  let mx = -100, my = -100, rx = mx, ry = my, shown = false;
  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px)`;
    if (!shown) { shown = true; rx = mx; ry = my; html.classList.add('cc-on'); }
    const t = e.target;
    html.classList.toggle('cc-text', !!(t.closest && t.closest('input, textarea, select, [contenteditable="true"]')));
    const hot = (t.closest && t.closest('a, button, [role="button"], .tarot, .vstar, label')) || (t.tagName === 'CANVAS' && t.style.cursor === 'pointer');
    ring.classList.toggle('hot', !!hot);
  }, { passive: true });
  addEventListener('mousedown', () => ring.classList.add('press'));
  addEventListener('mouseup', () => ring.classList.remove('press'));
  document.addEventListener('mouseleave', () => { shown = false; html.classList.remove('cc-on'); });
  const k = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0.2;
  (function loop() { rx += (mx - rx) * k; ry += (my - ry) * k; ring.style.transform = `translate(${rx}px, ${ry}px)`; requestAnimationFrame(loop); })();
})();
