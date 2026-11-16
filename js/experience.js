/* =========================================================
   FEELD — EXPERIENCE (소개 → FEEL · FILL · FIELD)
   .exp__sticky가 화면에 고정된 동안 스크롤 진행(p)에 따라:
   - 소개 글: ABOUT→TECH처럼 한 번에 떠오르고(is-on) 위로 흐려지며 빠짐(is-past)
   - FEEL → FILL → FIELD: 시안처럼 세로선으로 이어진 한 줄(.exp__col)이 스크롤 따라 위로 흐름.
     각 장에서 잠깐 멈추고(읽는 시간), 그 사이 선이 위에서 아래로 그려져 다음 장 이름에 닿음
   - 배경 사진은 지금 장에 맞춰 서서히 바뀜
   스크롤 값을 바로 쓰지 않고 부드럽게 따라가게(lerp) 함
   ========================================================= */
(() => {
  const sec = document.querySelector('.exp');
  if (!sec) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = sec.querySelector('.exp__intro');
  const col = sec.querySelector('.exp__col');
  const steps = [...sec.querySelectorAll('.exp__step')];
  const lines = [...sec.querySelectorAll('.exp__line')];
  const bgs = [...sec.querySelectorAll('.exp__bg')];
  const bgImgs = bgs.map((b) => b.querySelector('img'));

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  // 스크롤 진행 p → 지금 장 위치 f (0 FEEL, 1 FILL, 2 FIELD). 장마다 잠깐 멈추는 구간을 둠
  const KEYS = [[0.10, -0.75], [0.22, 0], [0.30, 0], [0.50, 1], [0.58, 1], [0.80, 2], [1, 2]];
  const focus = (p) => {
    if (p <= KEYS[0][0]) return KEYS[0][1];
    for (let i = 1; i < KEYS.length; i++) {
      const [p1, f1] = KEYS[i], [p0, f0] = KEYS[i - 1];
      if (p <= p1) return f0 + (f1 - f0) * smooth((p - p0) / (p1 - p0));
    }
    return KEYS[KEYS.length - 1][1];
  };
  // 시안 간격(px@1920): FEEL 0 / FILL 917 / FIELD 1859
  const offset = (f) => (f <= 1 ? f * 917 : 917 + (f - 1) * 942);

  let u = 1, cur = null, raf = 0, near = false, introOn = -1;
  const unit = () => { u = innerWidth <= 768 ? innerHeight / 1080 : innerWidth / 1920; };
  const progress = () => {
    const r = sec.getBoundingClientRect();
    return { p: -r.top / Math.max(1, r.height - innerHeight), top: r.top };
  };

  const setIntro = (n) => {   // -1 아직 안 보임, 0 보임, 1 지나감
    if (n === introOn) return;
    introOn = n;
    intro.classList.toggle('is-on', n === 0);
    intro.classList.toggle('is-past', n === 1);
    intro.setAttribute('aria-hidden', n === 0 ? 'false' : 'true');
  };

  function render(f) {
    col.style.transform = `translate3d(0, ${(-offset(f) * u).toFixed(2)}px, 0)`;
    steps.forEach((el, k) => {
      const o = clamp(1.3 - Math.abs(f - k) * 1.3);
      el.style.opacity = o.toFixed(3);
      el.setAttribute('aria-hidden', o > 0.5 ? 'false' : 'true');
    });
    lines.forEach((el, i) => {
      el.style.transform = `scaleY(${smooth(clamp((f - i + 0.25) / 0.9)).toFixed(4)})`;
    });
    bgs.forEach((el, k) => {
      const o = clamp(1 - Math.abs(f - k));
      el.style.opacity = o.toFixed(3);
      bgImgs[k].style.transform = `scale(${(1.06 - 0.06 * o).toFixed(4)})`;
    });
  }

  function tick() {
    raf = 0;
    const { p, top } = progress();
    setIntro(top > innerHeight * 0.55 ? -1 : p > 0.14 ? 1 : p < 0.11 ? 0 : Math.max(introOn, 0));
    const target = focus(p);
    cur = (cur === null || reduce) ? target : cur + (target - cur) * 0.1;
    if (Math.abs(target - cur) < 0.0005) cur = target;
    render(cur);
    if (near && cur !== target) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (near && !raf) raf = requestAnimationFrame(tick); };

  new IntersectionObserver(([en]) => {
    near = en.isIntersecting;
    if (near) {
      sec.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
      kick();
    }
  }, { rootMargin: '100% 0px' }).observe(sec);
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { unit(); cur = null; tick(); });
  unit();
  tick();
})();
