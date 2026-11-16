/* =========================================================
   FEELD — OUR FOREST ARCHIVE
   - 연두 곡선: 스크롤한 만큼 따라 그려짐 (화면 아래쪽 75% 높이까지 닿은 곳까지)
   - 사진·글(.arch__rise): 스크롤과 함께 아래에서 위로 떠오르며 나타남. 글(data-lag)은 사진보다 조금 늦게
   스크롤 값을 바로 쓰지 않고 부드럽게 따라가게(lerp) 함
   ========================================================= */
(() => {
  const sec = document.querySelector('.arch');
  if (!sec) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const path = sec.querySelector('.arch__curve path');
  const items = [...sec.querySelectorAll('.arch__rise')];
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len} ${len}`;
  path.style.vectorEffect = 'none';

  // 곡선이 지나는 높이(시안 y 643~2531)를 따라 길이를 나눔: y에 처음 닿는 길이를 미리 재 둠
  const Y0 = 643, Y1 = 2531, N = 400, lenAtY = [];
  {
    let maxY = -Infinity, j = 0;
    for (let i = 0; i <= N; i++) {
      const l = (len * i) / N, y = path.getPointAtLength(l).y;
      maxY = Math.max(maxY, y);
      while (j <= 100 && Y0 + ((Y1 - Y0) * j) / 100 <= maxY) { lenAtY[j++] = l; }
    }
    while (j <= 100) lenAtY[j++] = len;
  }

  const state = items.map(() => ({ cur: 0 }));
  let drawCur = 0, raf = 0, near = false;

  function frame() {
    raf = 0;
    const vh = innerHeight, u = innerWidth <= 768 ? 1 : innerWidth / 1920;
    const top = sec.getBoundingClientRect().top;
    let moving = false;

    // 곡선: 화면 75% 높이가 닿은 시안 y까지
    // 섹션은 묶음 간격을 넓혀 3055 높이, 곡선(시안 2615 좌표)은 세로로 늘려 그림 → 곡선 좌표로 환산
    const y = ((vh * 0.75 - top) / u) * (2615 / 3055);
    const target = lenAtY[Math.round(clamp((y - Y0) / (Y1 - Y0)) * 100)];
    drawCur = reduce ? target : drawCur + (target - drawCur) * 0.12;
    if (Math.abs(target - drawCur) > 0.5) moving = true; else drawCur = target;
    path.style.strokeDashoffset = (len - drawCur).toFixed(1);

    // 사진·글: 요소 윗변이 화면 아래(100%)에서 55% 높이로 올라오는 동안 0 → 1
    items.forEach((el, i) => {
      const lag = el.dataset.lag ? 0.12 : 0;
      const elTop = top + el.offsetTop;
      const t = clamp((vh * (1 - lag) - elTop) / (vh * 0.45));
      const s = state[i];
      s.cur = reduce ? t : s.cur + (t - s.cur) * 0.12;
      if (Math.abs(t - s.cur) > 0.001) moving = true; else s.cur = t;
      const e = ease(s.cur);
      el.style.opacity = e.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - e) * (el.dataset.lag ? 90 : 140) * u).toFixed(1)}px, 0)`;
    });

    if (near && moving) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (near && !raf) raf = requestAnimationFrame(frame); };

  new IntersectionObserver(([en]) => {
    near = en.isIntersecting;
    if (near) {
      sec.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
      kick();
    }
  }, { rootMargin: '50% 0px' }).observe(sec);
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  frame();
})();
