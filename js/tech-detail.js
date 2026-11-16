/* =========================================================
   FEELD — TECH 상세 (시안 Frame 2147237922~24)
   한 화면(.tdetail__sticky)에 고정된 채, 스크롤 진행(p)에 따라 세 장면이 차례로:
   1) SENSORY RECORDING  — 카메라·마이크가 어둠 속에서 아래로부터 떠오르고(속도 다르게),
                           글 묶음이 화면 아래(y749)에서 위(y247)로 천천히 올라감
   2) PARTICLE OF NATURE — 빛 입자 숲이 살짝 줌아웃되며 나타나고, 오른쪽 글이 떠오름
   3) RECONNECTING TOUCH — 체험대가 아래에서 떠오르며 밝아지고, 왼쪽 글이 떠오름
   스크롤 값을 바로 쓰지 않고 부드럽게 따라가게(lerp) 해서 영상처럼 미끄러지듯 움직임
   ========================================================= */
(() => {
  const sec = document.querySelector('.tdetail');
  if (!sec) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => sec.querySelector(s);
  const rec = $('.td--rec'), par = $('.td--par'), touch = $('.td--touch');
  const cam = $('.td__cam'), mic = $('.td__mic'), recText = $('.td__text--rec');
  const parText = $('.td__text--par');
  const moss = $('.td__moss'), touchText = $('.td__text--touch');

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => 1 - Math.pow(1 - t, 3);              // 끝에서 부드럽게 멈춤
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  // 기술 소개 화면의 화살표 버튼 → 상세 첫 장면으로
  const more = document.querySelector('.tech2__more');
  if (more) more.addEventListener('click', () => {
    scrollTo({ top: sec.getBoundingClientRect().top + scrollY, behavior: reduce ? 'auto' : 'smooth' });
  });

  let u = 1, target = -1, cur = -1, raf = 0, near = false;
  const unit = () => { u = innerWidth <= 768 ? innerHeight / 1080 : innerWidth / 1920; };
  const progress = () => {
    const r = sec.getBoundingClientRect();
    // 0: 화면에 꽉 찬 순간, 1: 세 장면 끝(들어오는 중엔 음수). 섹션 마지막 100vh는 EXPERIENCE 판이 올라와 덮는 구간이라 뺌
    return -r.top / Math.max(1, r.height - 2 * innerHeight);
  };
  const show = (el, a) => { el.style.opacity = a.toFixed(3); el.classList.toggle('is-on', a > 0.001); };

  function render(p) {
    /* 1. SENSORY RECORDING */
    const inCam = ease(seg(p, -0.24, 0.06)), inMic = ease(seg(p, -0.16, 0.12));
    const outA = smooth(seg(p, 0.27, 0.36));
    const drift = seg(p, 0, 0.3);
    cam.style.opacity = (inCam * (1 - outA)).toFixed(3);
    cam.style.transform = `translate3d(0, ${((1 - inCam) * 150 - drift * 34 - outA * 70) * u}px, 0)`;
    mic.style.opacity = (inMic * (1 - outA)).toFixed(3);
    mic.style.transform = `translate3d(0, ${((1 - inMic) * 240 - drift * 16 - outA * 50) * u}px, 0)`;
    const ty = lerp(748.9, 246.9, smooth(seg(p, 0.0, 0.27)));
    recText.style.setProperty('--ty', ty.toFixed(2));
    recText.style.opacity = (ease(seg(p, -0.14, 0.03)) * (1 - outA)).toFixed(3);
    recText.style.transform = `translate3d(0, ${-outA * 40 * u}px, 0)`;
    rec.classList.toggle('is-on', p < 0.37);

    /* 2. PARTICLE OF NATURE */
    const inB = ease(seg(p, 0.31, 0.43)), outB = smooth(seg(p, 0.62, 0.70));
    show(par, inB * (1 - outB));
    par.style.transform = `scale(${(lerp(1.08, 1, inB) - outB * 0.03).toFixed(4)})`;
    const tB = ease(seg(p, 0.43, 0.52));
    parText.style.opacity = (tB * (1 - outB)).toFixed(3);
    parText.style.transform = `translate3d(0, ${((1 - tB) * 50 - outB * 40) * u}px, 0)`;

    /* 3. RECONNECTING TOUCH */
    const inC = ease(seg(p, 0.67, 0.84));
    show(touch, inC > 0 ? 1 : 0);
    moss.style.opacity = inC.toFixed(3);
    moss.style.transform = `translate3d(0, ${((1 - inC) * 170 - seg(p, 0.84, 1) * 24) * u}px, 0)`;
    const tC = ease(seg(p, 0.83, 0.95));                    // 체험대가 거의 다 올라온 뒤에 글이 따라 나옴
    touchText.style.opacity = tC.toFixed(3);
    touchText.style.transform = `translate3d(0, ${(1 - tC) * 50 * u}px, 0)`;
  }

  function tick() {
    raf = 0;
    target = progress();
    cur = reduce ? target : cur + (target - cur) * 0.12;
    if (Math.abs(target - cur) < 0.0004) cur = target;
    render(cur);
    if (near && cur !== target) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (near && !raf) raf = requestAnimationFrame(tick); };

  new IntersectionObserver(([en]) => { near = en.isIntersecting; if (near) kick(); }, { rootMargin: '50% 0px' }).observe(sec);
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { unit(); cur = progress(); render(cur); });
  unit();
  cur = target = progress();
  render(cur);
})();
