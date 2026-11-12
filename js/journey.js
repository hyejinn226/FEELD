/* =========================================================
   FEELD — JOURNEY (숲길 곡선 7단계)
   1) 화면에 들어오면 선이 왼쪽→오른쪽으로 그려지고,
      선이 닿는 순간 점이 하나씩 맺힘 → 마지막에 깃발
   2) 점을 클릭하면 작은 빛이 선을 따라 그 점까지 걸어가고,
      아래 단계명·설명이 바뀜
   ========================================================= */
(() => {
  const sec = document.querySelector('.journey');
  if (!sec) return;
  const path = sec.querySelector('.journey__path');
  const dots = [...sec.querySelectorAll('.journey__dot')];
  const flag = sec.querySelector('.journey__flag');
  const walker = sec.querySelector('.journey__walker');
  const elStep = sec.querySelector('.journey__step');
  const elCap = sec.querySelector('.journey__cap');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const DRAW_SEC = 2.8;   // 선이 다 그려지는 시간
  const L = path.getTotalLength();

  // 각 점이 곡선의 어느 길이에 있는지 (가장 가까운 지점 탐색)
  const centers = dots.map((g) => {
    const m = /translate\(([\d.]+)[ ,]+([\d.]+)\)/.exec(g.getAttribute('transform'));
    return { x: +m[1], y: +m[2] };
  });
  const dotLen = centers.map(({ x, y }) => {
    let best = 0, bd = Infinity;
    for (let s = 0; s <= L; s += 2) {
      const p = path.getPointAtLength(s);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  });

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- 1. 선 그리기 ---------- */
  path.style.strokeDasharray = `${L} ${L}`;
  path.style.strokeDashoffset = String(L);
  dots.forEach((g) => g.style.setProperty('--dd', '0s'));

  function draw() {
    if (reduce) {
      path.style.strokeDashoffset = '0';
      dots.forEach((g) => g.classList.add('is-on'));
      sec.classList.add('is-drawn');
      return;
    }
    sec.classList.add('is-drawing');
    const t0 = performance.now();
    const popped = new Set();
    const step = (now) => {
      const t = Math.min((now - t0) / (DRAW_SEC * 1000), 1);
      const len = easeInOut(t) * L;
      path.style.strokeDashoffset = String(L - len);
      // 선이 점에 닿으면 그 점만 맺힘
      dotLen.forEach((dl, i) => {
        if (!popped.has(i) && len >= dl - 1) {
          popped.add(i);
          dots[i].querySelector('circle:last-child').style.transform = 'scale(1)';
        }
      });
      if (t < 1) requestAnimationFrame(step);
      else {
        sec.classList.add('is-drawn');  // 깃발 + 가로선 + 텍스트
      }
    };
    requestAnimationFrame(step);
  }

  new IntersectionObserver((ents, io) => {
    if (ents[0].isIntersecting) { io.disconnect(); draw(); }
  }, { threshold: 0.35 }).observe(sec);

  /* ---------- 2. 점 클릭 → 빛이 선을 따라 이동 ---------- */
  let active = 0;
  let walkLen = dotLen[0];
  let walkRaf = 0;

  function placeWalker(len) {
    const p = path.getPointAtLength(len);
    walker.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
  }

  function walkTo(toLen, steps) {
    cancelAnimationFrame(walkRaf);
    const from = walkLen;
    const dur = reduce ? 1 : (0.7 + 0.28 * steps) * 1000;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min((now - t0) / dur, 1);
      walkLen = from + (toLen - from) * easeInOut(t);
      placeWalker(walkLen);
      // 출발할 때 켜지고, 도착하면 점 속으로 스며들듯 사라짐
      const a = Math.min(t / 0.12, 1) * (1 - Math.max((t - 0.8) / 0.2, 0));
      walker.style.opacity = a.toFixed(3);
      if (t < 1) walkRaf = requestAnimationFrame(step);
    };
    walkRaf = requestAnimationFrame(step);
  }

  let swapT = 0;
  function select(i) {
    if (i === active) return;
    const steps = Math.abs(i - active);
    active = i;
    walkTo(dotLen[i], steps);

    const g = dots[i];
    clearTimeout(swapT);
    sec.classList.add('is-swap');
    swapT = setTimeout(() => {
      elStep.textContent = `${i + 1}. ${g.dataset.step}`;
      elCap.textContent = g.dataset.cap;
      // 마스크를 왼쪽 끝으로 되돌린 뒤 다시 왼→오 로 드러나게
      sec.classList.add('is-reset');
      void sec.offsetWidth;
      sec.classList.remove('is-reset', 'is-swap');
    }, 260);  }

  dots.forEach((g, i) => {
    g.setAttribute('aria-label', `${i + 1}단계 ${g.dataset.step}`);
    g.addEventListener('click', () => select(i));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); }
    });
  });

  placeWalker(walkLen);
})();
