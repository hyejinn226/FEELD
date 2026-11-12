/* =========================================================
   FEELD — 로딩 화면
   흩어진 입자들이 화면 가운데로 모여 FEELD 잎 심볼이 되고, 시작 화면으로 넘어감
   - 새로고침하면 항상 로딩부터 다시, 페이지는 맨 위(시작 화면)로
   - 끝나면 document에 'feeld:loaded' 이벤트 (main.js가 첫 화면 등장 효과를 이때 시작)
   ========================================================= */
(() => {
  const root = document.documentElement;
  const box = document.querySelector('.loader');
  // 새로고침해도 이전 스크롤 위치로 돌아가지 않게
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const toTop = () => scrollTo(0, 0);
  toTop();
  addEventListener('load', toTop);

  const done = () => {
    root.classList.remove('is-loading');
    toTop();
    document.dispatchEvent(new Event('feeld:loaded'));
  };
  if (!box) { done(); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = box.querySelector('.loader__gl');
  const mark = box.querySelector('.loader__mark');
  const ctx = canvas.getContext('2d');

  const T = {
    gather: reduce ? 0.2 : 2.6,   // 입자가 모이는 시간(초)
    morph: reduce ? 0.2 : 0.7,    // 입자 → 심볼 이미지로 바뀌는 시간
    hold: reduce ? 0.1 : 0.45,    // 심볼로 잠깐 머무름
    maxWait: 7,                   // 페이지 로딩이 아무리 늦어도 이 시간이 지나면 넘어감
  };
  const COLOR = [211, 239, 151];

  let W = 0, H = 0, dpr = 1, size = 0, ox = 0, oy = 0;
  let parts = [];
  let pageLoaded = document.readyState === 'complete';
  addEventListener('load', () => { pageLoaded = true; });

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 심볼 크기 (CSS .loader__mark와 같은 값)
    size = Math.max(90, Math.min(W, H) * 0.16);
    ox = W / 2 - size / 2; oy = H / 2 - size * (452 / 438) / 2;
  }

  // 심볼 이미지의 모양을 따라 입자 목표 위치를 뽑음
  function build(img) {
    const sw = 120, sh = Math.round(sw * img.naturalHeight / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, sw, sh);
    const a = g.getImageData(0, 0, sw, sh).data;
    const pts = [];
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      if (a[(y * sw + x) * 4 + 3] > 140) pts.push([x / sw, y / sh]);
    }
    const N = Math.min(2600, pts.length);
    const sx = sh / sw;
    parts = Array.from({ length: N }, () => {
      const p = pts[(Math.random() * pts.length) | 0];
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.35 + Math.random() * 0.75;            // 화면 곳곳에서 출발
      return {
        tx: p[0] + (Math.random() - 0.5) / sw, ty: (p[1] + (Math.random() - 0.5) / sh) * sx,
        sx: 0.5 + Math.cos(ang) * rad * 1.6, sy: 0.5 + Math.sin(ang) * rad,  // 화면 비율 좌표(0~1)
        d: Math.random() * 0.45,                           // 출발 지연(비율)
        sw: (Math.random() - 0.5) * 2,                     // 모이면서 휘는 정도
        r: 0.6 + Math.random() * 1.1,
        tw: Math.random() * Math.PI * 2,
      };
    });
  }

  const ease = (t) => 1 - Math.pow(1 - t, 4);
  let t0 = 0, phase = 0, raf = 0;

  function frame(now) {
    if (!t0) t0 = now;
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);

    const g = Math.min(1, t / T.gather);
    const m = Math.min(1, Math.max(0, (t - T.gather) / T.morph));   // 0 → 1: 심볼 이미지로
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const k = ease(Math.min(1, Math.max(0, (g - p.d) / (1 - p.d))));
      const tx = ox + p.tx * size, ty = oy + p.ty * size;
      const sx = p.sx * W, sy = p.sy * H;
      // 곧장 오지 않고 살짝 휘어서 들어옴
      const bend = (1 - k) * k * 4 * p.sw * size * 0.6;
      const x = sx + (tx - sx) * k + bend * 0.6;
      const y = sy + (ty - sy) * k - bend * 0.4;
      const tw = 0.6 + 0.4 * Math.sin(t * 3 + p.tw);
      const alpha = (0.25 + 0.75 * k) * (k < 1 ? tw : 1) * (1 - m);
      if (alpha < 0.01) continue;
      const r = p.r * (1.6 - 0.6 * k);
      ctx.fillStyle = `rgba(${COLOR[0]},${COLOR[1]},${COLOR[2]},${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    mark.style.opacity = m.toFixed(3);

    if (phase === 0 && t >= T.gather + T.morph + T.hold && (pageLoaded || t > T.maxWait)) {
      phase = 1;
      box.classList.add('is-out');                       // 심볼과 화면이 서서히 사라짐
      setTimeout(done, 350);                             // 첫 화면 등장 효과를 조금 겹쳐 시작
      setTimeout(() => { cancelAnimationFrame(raf); box.remove(); }, 1300);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  resize();
  addEventListener('resize', resize);
  const img = new Image();
  img.onload = () => { build(img); raf = requestAnimationFrame(frame); };
  img.onerror = () => { box.remove(); done(); };
  img.src = mark.getAttribute('src');
})();
