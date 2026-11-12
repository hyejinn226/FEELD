/* =========================================================
   FEELD — 푸터 로고 입자
   큰 FEELD 워드마크와 잎 심볼을 작은 입자로 그리고,
   마우스가 닿는 곳의 입자는 흩어졌다가 천천히 제자리로 돌아옴
   ========================================================= */
(() => {
  const brand = document.querySelector('.foot__brand');
  if (!brand) return;
  const imgs = [...brand.querySelectorAll('.foot__word')];   // 잎 심볼은 이미지 그대로
  const canvas = document.createElement('canvas');
  canvas.className = 'foot__gl';
  canvas.setAttribute('aria-hidden', 'true');
  brand.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const CFG = {
    step: 1.7,        // 입자 간격(px) — 작을수록 촘촘
    radius: 110,      // 마우스가 밀어내는 범위(px)
    glowR: 190,       // 마우스 주변이 밝아지는 범위(px)
    glowIn: 0.08,     // 밝아지는 속도
    glowOut: 0.025,   // 다시 어두워지는 속도 (느리게 → 지나간 자리가 잔잔히 남음)
    glowMax: 0.9,     // 가장 밝을 때 입자 투명도
    push: 9,          // 밀어내는 힘
    spring: 0.035,    // 제자리로 돌아가는 힘
    damp: 0.86,       // 감속
    // 이미지마다 입자 밝기 (기존 이미지 투명도와 비슷하게)
    alpha: { word: 0.22, leaf: 0.75 },   // 촘촘해진 만큼 기본 밝기는 낮춤 (밝아지는 효과가 잘 보이게)
  };
  const COLOR = 'rgb(211,239,151)';

  let W = 0, H = 0, dpr = 1;
  let groups = [];               // { alpha, x:Float32Array, y, hx, hy, vx, vy }
  const mouse = { x: -1e4, y: -1e4 };
  let visible = false, raf = 0, active = false;

  function sample(img) {
    const br = brand.getBoundingClientRect(), r = img.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return null;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h);
    const a = g.getImageData(0, 0, w, h).data;
    const pts = [];
    const s = CFG.step;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      const jx = x + Math.random() * s * 0.6, jy = y + Math.random() * s * 0.6;
      const ix = Math.min(w - 1, jx | 0), iy = Math.min(h - 1, jy | 0);
      if (a[(iy * w + ix) * 4 + 3] > 110) pts.push(r.left - br.left + jx, r.top - br.top + jy);
    }
    const n = pts.length / 2;
    const G = {
      alpha: img.classList.contains('foot__leaf') ? CFG.alpha.leaf : CFG.alpha.word,
      n, hx: new Float32Array(n), hy: new Float32Array(n),
      x: new Float32Array(n), y: new Float32Array(n), vx: new Float32Array(n), vy: new Float32Array(n),
      sz: new Float32Array(n), gl: new Float32Array(n),
    };
    for (let i = 0; i < n; i++) {
      G.hx[i] = G.x[i] = pts[i * 2];
      G.hy[i] = G.y[i] = pts[i * 2 + 1];
      G.sz[i] = 0.9 + Math.random() * 0.6;
    }
    return G;
  }

  function build() {
    const br = brand.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.round(br.width); H = Math.round(br.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groups = imgs.map(sample).filter(Boolean);
    if (groups.length) brand.classList.add('is-particles');   // 원래 이미지는 숨기고 입자로
    draw();
  }

  function step() {
    let moving = false;
    const R = CFG.radius, R2 = R * R, GR = CFG.glowR, GR2 = GR * GR;
    for (const G of groups) {
      for (let i = 0; i < G.n; i++) {
        let vx = G.vx[i], vy = G.vy[i];
        const dx = G.x[i] - mouse.x, dy = G.y[i] - mouse.y;
        const d2 = dx * dx + dy * dy;
        // 마우스 주변은 서서히 밝아지고, 멀어지면 천천히 원래대로
        const gl = G.gl[i];
        const gt = d2 < GR2 ? Math.pow(1 - Math.sqrt(d2) / GR, 1.6) : 0;
        if (gt > gl) G.gl[i] = gl + (gt - gl) * CFG.glowIn;
        else if (gl > 0.002) G.gl[i] = gl * (1 - CFG.glowOut) - 0.001;
        else G.gl[i] = 0;
        if (G.gl[i] > 0.002) moving = true;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / R);
          vx += (dx / d) * f * f * CFG.push + (Math.random() - 0.5) * f;
          vy += (dy / d) * f * f * CFG.push + (Math.random() - 0.5) * f;
        }
        vx = (vx + (G.hx[i] - G.x[i]) * CFG.spring) * CFG.damp;
        vy = (vy + (G.hy[i] - G.y[i]) * CFG.spring) * CFG.damp;
        G.x[i] += vx; G.y[i] += vy;
        G.vx[i] = vx; G.vy[i] = vy;
        if (G.gl[i] < 0) G.gl[i] = 0;
        if (!moving && (Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02 ||
            Math.abs(G.x[i] - G.hx[i]) > 0.3 || Math.abs(G.y[i] - G.hy[i]) > 0.3)) moving = true;
      }
    }
    return moving;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLOR;
    const LV = 8;
    for (const G of groups) {
      // 기본 밝기 입자는 한 번에, 밝아진 입자는 밝기 단계별로 모아서 그림
      const buckets = Array.from({ length: LV }, () => []);
      ctx.globalAlpha = G.alpha;
      for (let i = 0; i < G.n; i++) {
        const s = G.sz[i];
        const lv = Math.min(LV - 1, Math.round(G.gl[i] * (LV - 1)));
        if (lv > 0) { buckets[lv].push(i); continue; }
        ctx.fillRect(G.x[i] - s / 2, G.y[i] - s / 2, s, s);
      }
      for (let lv = 1; lv < LV; lv++) {
        const b = buckets[lv];
        if (!b.length) continue;
        ctx.globalAlpha = G.alpha + (CFG.glowMax - G.alpha) * (lv / (LV - 1));
        for (const i of b) {
          const s = G.sz[i] * (1 + 0.3 * lv / (LV - 1));
          ctx.fillRect(G.x[i] - s / 2, G.y[i] - s / 2, s, s);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    raf = 0;
    const moving = step();
    draw();
    const near = mouse.x > -CFG.radius && mouse.x < W + CFG.radius && mouse.y > -CFG.radius && mouse.y < H + CFG.radius;
    active = moving || near;
    if (visible && active) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (visible && !raf) raf = requestAnimationFrame(loop); };

  addEventListener('pointermove', (e) => {
    if (!visible) return;
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    kick();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; kick(); });

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(brand);

  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  Promise.all(imgs.map((im) => im.complete ? 0 : new Promise((ok) => { im.onload = im.onerror = ok; }))).then(build);
})();
