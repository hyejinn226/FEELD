/* =========================================================
   FEELD — scroll reveal / parallax / comet cursor
   ========================================================= */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Scroll reveal (IntersectionObserver) ---------- */
  const targets = document.querySelectorAll('.reveal, .reveal-lines');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    targets.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);            // 한 번 떠오르면 유지
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

    // 첫 화면은 폰트 로딩 후 살짝 늦게 시작
    const start = () => targets.forEach(el => io.observe(el));
    const afterFonts = () => (document.fonts && document.fonts.ready) ? document.fonts.ready.then(start) : start();
    // 로딩 화면이 끝난 뒤에 첫 화면 글자가 떠오르도록
    if (document.documentElement.classList.contains('is-loading')) {
      document.addEventListener('feeld:loaded', afterFonts, { once: true });
    } else afterFonts();
  }

  /* ---------- 2. About 배경 패럴랙스 ---------- */
  const aboutBg = document.querySelector('.about__bg');
  const about = document.querySelector('.about');
  if (aboutBg && !reduceMotion) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = about.getBoundingClientRect();
      const vh = innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      // -1(아래에서 진입) → 1(위로 빠짐)
      const p = (vh - r.top) / (vh + r.height) * 2 - 1;
      aboutBg.style.transform = `translate3d(0, ${p * 5}%, 0)`;
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 3. Hero 유목: 마우스 따라 살짝 기울고 둥실 떠 있음 ---------- */
  const tiltEl = document.querySelector('.js-tilt');
  if (tiltEl && !reduceMotion) {
    const TILT = { yaw: 7, pitch: 4, float: 8 };   // 좌우 회전(도), 상하 기울기(도), 둥실 폭(px)
    const tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    addEventListener('pointermove', (e) => {
      tgt.x = (e.clientX / innerWidth) * 2 - 1;
      tgt.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });

    let on = true;
    new IntersectionObserver(([en]) => { on = en.isIntersecting; }).observe(tiltEl);

    const t0 = performance.now();
    const tilt = (now) => {
      if (on) {
        cur.x += (tgt.x - cur.x) * 0.05;
        cur.y += (tgt.y - cur.y) * 0.05;
        const t = (now - t0) / 1000;
        const fy = Math.sin(t * 0.9) * TILT.float;
        tiltEl.style.transform =
          `translate3d(${cur.x * -10}px, ${fy + cur.y * -6}px, 0) ` +
          `rotateY(${cur.x * TILT.yaw}deg) rotateX(${cur.y * -TILT.pitch}deg)`;
      }
      requestAnimationFrame(tilt);
    };
    requestAnimationFrame(tilt);
  }

  /* ---------- 5-b. TECHNOLOGY: 화면에 들어오면 제목·본문·카드가 차례로 올라옴 ---------- */
  const techSec = document.querySelector('.story--tech');
  if (techSec) {
    const page = techSec.querySelector('.story__tech');
    const io5 = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      techSec.classList.add('is-tech');
      page.setAttribute('aria-hidden', 'false');
      io5.disconnect();
    }, { threshold: 0.45 });
    io5.observe(techSec);
  }

  /* ---------- 5. (예전) ABOUT → TECHNOLOGY 한 화면 전환 — 지금은 두 섹션으로 나눠서 쓰지 않음 ---------- */
  const story = document.querySelector('.story:not(.story--about):not(.story--tech)');
  if (story) {
    const about = story.querySelector('.story__about'), tech = story.querySelector('.story__tech');
    let on = false;
    const check = () => {
      const r = story.getBoundingClientRect();
      const p = -r.top / Math.max(1, r.height - innerHeight);
      const next = on ? p > 0.36 : p > 0.44;              // 경계에서 깜빡이지 않게 여유
      if (next !== on) {
        on = next;
        story.classList.toggle('is-tech', on);
        about.setAttribute('aria-hidden', on ? 'true' : 'false');
        tech.setAttribute('aria-hidden', on ? 'false' : 'true');
      }
    };
    addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ---------- 7. 왼쪽 위 심볼: 첫 화면부터 항상 보임 (예전엔 첫 화면에서 숨겼음) ---------- */

  /* ---------- 6. 맨 위로 버튼 ---------- */
  const toTop = document.querySelector('.totop');
  if (toTop) {
    const post = document.querySelector('.postwrap'), postSec = document.querySelector('.post');
    const upd = () => {
      toTop.classList.toggle('is-on', scrollY > innerHeight * 0.8);
      if (post) {
        const r = post.getBoundingClientRect();
        toTop.classList.toggle('is-lift', r.top < innerHeight * 0.85 && r.bottom > innerHeight * 0.15);
      }
      if (postSec) toTop.classList.toggle('is-hide', postSec.classList.contains('is-making') || postSec.classList.contains('is-viewing'));
    };
    addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    if (postSec) new MutationObserver(upd).observe(postSec, { attributes: true, attributeFilter: ['class'] });
    upd();
    toTop.addEventListener('click', () => {
      scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 4. Comet cursor ---------- */
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const canvas = document.querySelector('.cursor');
  if (!finePointer || !canvas) return;

  document.documentElement.classList.add('has-cursor');
  const ctx = canvas.getContext('2d');

  const CFG = {
    radius: 9,        // 머리(원) 반지름
    follow: 0.55,     // 머리가 마우스를 따라가는 속도(0~1, 1이면 즉시)
    ghosts: 6,        // 잔상 개수 (많을수록 꼬리가 길어짐)
    ghostLag: 0.5,    // 잔상이 앞 잔상을 쫓는 속도(0~1, 작을수록 느리게 늘어짐)
    headAlpha: 0.9,
    trailAlpha: 0.3,
  };

  let dpr = 1, W = 0, H = 0;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);

  const mouse = { x: W / 2, y: H / 2 };
  const head = { x: W / 2, y: H / 2 };
  let visible = false;
  let alpha = 0;            // 화면 진입/이탈 페이드
  let scale = 1, scaleTarget = 1, scaleVel = 0;
  // 잔상: 각 점이 바로 앞 점을 조금 늦게 쫓아감 → 짧게 늘어졌다가 멈추면 머리로 모임
  const ghosts = Array.from({ length: CFG.ghosts }, () => ({ x: W / 2, y: H / 2 }));
  const snapAll = () => ghosts.forEach(g => { g.x = head.x; g.y = head.y; });

  // 누를 수 있는 곳 위에서는 원이 살짝 커지고, 누르는 순간 작아졌다가 돌아옴
  // (실제 커서는 숨겨 두었으므로 누를 수 있는 요소를 직접 나열)
  const CLICKABLE = 'a, button, [role="button"], label, select, summary, .pcf, .post__item, .post__viewer .pc';
  const isClickable = (el) => {
    if (!(el instanceof Element)) return false;
    const b = el.closest(CLICKABLE);
    if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return false;
    return getComputedStyle(b).pointerEvents !== 'none';
  };
  let hover = false, pressed = false;
  const HOVER_SCALE = 1.7, PRESS_SCALE = 0.7;
  const retarget = () => { scaleTarget = (hover ? HOVER_SCALE : 1) * (pressed ? PRESS_SCALE : 1); };
  addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (!visible) { head.x = mouse.x; head.y = mouse.y; snapAll(); }
    visible = true;
    hover = isClickable(e.target);
    retarget();
  }, { passive: true });
  addEventListener('pointerdown', () => { pressed = true; retarget(); }, { passive: true });
  addEventListener('pointerup', () => { pressed = false; retarget(); }, { passive: true });
  addEventListener('pointercancel', () => { pressed = false; retarget(); }, { passive: true });
  document.addEventListener('pointerleave', () => { visible = false; });
  addEventListener('blur', () => { visible = false; });

  const frame = () => {
    head.x += (mouse.x - head.x) * CFG.follow;
    head.y += (mouse.y - head.y) * CFG.follow;
    alpha += ((visible ? 1 : 0) - alpha) * 0.15;
    // 살짝 튕기듯 따라가는 크기 (스프링)
    scaleVel = (scaleVel + (scaleTarget - scale) * 0.22) * 0.68;
    scale += scaleVel;

    let prev = head;
    for (const g of ghosts) {
      g.x += (prev.x - g.x) * CFG.ghostLag;
      g.y += (prev.y - g.y) * CFG.ghostLag;
      prev = g;
    }

    ctx.clearRect(0, 0, W, H);
    if (alpha > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      // 짧은 꼬리: 머리에서 멀어질수록 가늘고 투명하게
      const n = ghosts.length;
      let a = head;
      for (let i = 0; i < n; i++) {
        const b = ghosts[i];
        const k = 1 - i / n;                       // 1(머리 쪽) → 0(끝)
        ctx.strokeStyle = `rgba(227,255,113,${CFG.trailAlpha * k * alpha})`;   // #E3FF71
        ctx.lineWidth = CFG.radius * 1.6 * k * scale;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        a = b;
      }

      // 머리: 부드러운 원 (#E3FF71)
      const r = CFG.radius * scale;
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, r * 1.6);
      g.addColorStop(0, `rgba(227,255,113,${CFG.headAlpha * alpha})`);
      g.addColorStop(0.55, `rgba(227,255,113,${CFG.headAlpha * 0.75 * alpha})`);
      g.addColorStop(1, 'rgba(227,255,113,0)');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(head.x, head.y, r * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
