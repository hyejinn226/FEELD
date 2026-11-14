/* =========================================================
   FEELD — EXHIBITION SPACE : 입자로 쌓아 올린 전시장 (오른쪽 도면 영역)
   - 화면에 들어오면 흩어진 입자가 모여 전시장이 됨 (처음엔 위에서 내려다본 모습)
   - 스크롤하면 관람 동선을 따라 멈춤 없이 쭉 걸어감
     입구 → 굿즈 존 → 계단석(웹사이트, 메이킹 필름) → 오른쪽으로 돌아 → 체험대·미디어월 앞 → 다시 입구
   - 배치는 팀이 그린 위에서 본 일러스트 기준. 일러스트는 축척이 없어서
     미디어월(LED 4.8m, 심사 영상 기준) 폭으로 크기를 맞춤 → 전시장 약 8.7 × 6.9m
     x: 0(입구가 있는 왼쪽 벽) → 8.68(오른쪽), z: 0(뒤쪽 계단석) → 6.85(미디어월), y: 위
   ========================================================= */
(() => {
  const sec = document.querySelector('.space3d');
  const canvas = sec && sec.querySelector('.space3d__gl');
  if (!canvas) return;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) { sec.classList.add('is-nogl'); return; }

  const MOBILE = matchMedia('(max-width: 768px)').matches;
  const DENS = MOBILE ? 0.55 : 1;

  /* ---------- 1. 입자 만들기 ---------- */
  let seed = 11;
  const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const P = [], C = [], K = [];   // K: 종류(0 고정, 1·2 커튼), 커튼 방향 좌표
  // 색은 흰색 + 포인트 컬러(사이트 연두 #C9DE8E) 하나만
  const WHITE = [0.92, 0.94, 0.92], ACC = [0.79, 0.87, 0.56];
  const WARM = WHITE, WOOD = WHITE;
  function add(x, y, z, b, col = WHITE, kind = 0, along = 0) {
    P.push(x, y, z);
    C.push(col[0] * b, col[1] * b, col[2] * b, rnd());
    K.push(kind, along);
  }
  const N = (n) => Math.max(1, Math.round(n * DENS));
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const W = 8.68, D = 6.85, HGT = 3.0;
  // 나무 바닥 영역 (일러스트의 초록 영역, 왼쪽 아래 모서리가 둥금)
  const WX0 = 1.23, WZ0 = 1.3, WZ1 = 4.79, WR = 1.8;
  function inWood(x, z) {
    if (x < WX0 || z < WZ0 || z > WZ1) return false;
    const cx = WX0 + WR, cz = WZ1 - WR;
    if (x < cx && z > cz) return (x - cx) ** 2 + (z - cz) ** 2 < WR * WR;
    return true;
  }
  const LIGHTS = [[4.2, 6.2, 1.8, 0.55], [4.2, 5.2, 1.1, 0.35], [0.6, 0.9, 0.9, 0.3], [3.0, 1.5, 1.2, 0.2], [6.6, 1.5, 1.6, 0.25]];
  const lightAt = (x, z) => LIGHTS.reduce((s, [lx, lz, r, k]) => s + k * Math.exp(-((x - lx) ** 2 + (z - lz) ** 2) / (r * r)), 0);

  // 바닥: 나무 바닥은 결(판자)이 보이게 밝게, 나머지는 어둡고 성기게
  {
    const n = N(W * D * 760);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, z = rnd() * D, l = lightAt(x, z);
      if (inWood(x, z)) {
        const plank = 0.5 + 0.5 * Math.sin(z * 31.4);
        add(x, 0, z, 0.2 + plank * 0.08 + l * 0.7 + rnd() * 0.05, mix(WOOD, WARM, Math.min(1, l)));
      } else if (rnd() < 0.55) {
        add(x, 0, z, 0.1 + l * 0.8 + rnd() * 0.04, mix(WHITE, WARM, Math.min(1, l * 1.4)));
      }
    }
    // 바닥 경계선 (나무 바닥 테두리)
    for (let i = 0; i < N(2600); i++) {
      const t = rnd();
      let x, z;
      const seg = rnd() * 3;
      if (seg < 1) { x = WX0 + WR + t * (W - WX0 - WR); z = WZ1; }
      else if (seg < 2) { x = WX0; z = WZ0 + t * (WZ1 - WR - WZ0); }
      else { const a = Math.PI / 2 + t * Math.PI / 2; x = WX0 + WR + Math.cos(a) * WR; z = WZ1 - WR + Math.sin(a) * WR; }
      add(x, 0.005, z, 0.55, WOOD);
    }
  }
  // 벽 (평범한 벽: 어둡고 고르게)
  function wall(axis, fixed, a0, a1, h, d, b = 0.14) {
    const n = N((a1 - a0) * h * d);
    for (let i = 0; i < n; i++) {
      const a = a0 + rnd() * (a1 - a0), y = rnd() * h, bb = b * (0.7 + rnd() * 0.5) + (y > h - 0.03 ? 0.5 : 0);
      if (axis === 'x') add(a, y, fixed, bb); else add(fixed, y, a, bb);
    }
  }
  // 커튼 (주름 + 실크처럼 일렁임은 셰이더에서)
  function curtain(axis, fixed, a0, a1, h, d) {
    const n = N((a1 - a0) * h * d);
    for (let i = 0; i < n; i++) {
      const a = a0 + rnd() * (a1 - a0), y = rnd() * h;
      const fold = Math.sin(a * 9 + Math.sin(y * 0.8) * 0.6);
      let b = 0.16 + 0.32 * ((0.5 + 0.5 * fold) ** 2), col = WHITE;
      if (y < 0.3) { b += (0.3 - y) * 1.5 * (0.5 + 0.5 * Math.sin(a * 23)); col = WARM; }
      if (axis === 'x') add(a, y, fixed + fold * 0.07, b, col, 1, a); else add(fixed + fold * 0.07, y, a, b, col, 2, a);
    }
  }
  // 상자 (가구). 모서리는 더 밝게
  function box(x0, x1, y0, y1, z0, z1, d, b = 0.45, col = WHITE, face = null) {
    const faces = [['y', y1, x0, x1, z0, z1], ['z', z0, x0, x1, y0, y1], ['z', z1, x0, x1, y0, y1], ['x', x0, z0, z1, y0, y1], ['x', x1, z0, z1, y0, y1]];
    for (const [ax, f, a0, a1, c0, c1] of faces) {
      const n = N((a1 - a0) * (c1 - c0) * d) + N(((a1 - a0) + (c1 - c0)) * d * 0.06);
      for (let i = 0; i < n; i++) {
        const a = a0 + rnd() * (a1 - a0), c = c0 + rnd() * (c1 - c0);
        const e = Math.min(a - a0, a1 - a, c - c0, c1 - c);
        let bb = b * (0.55 + rnd() * 0.25) + (e < 0.02 ? b * 1.2 : 0), cc = col;
        if (face && face.ax === ax && Math.abs(face.f - f) < 1e-6) { bb = face.b(a, c); cc = face.col; }
        if (ax === 'y') add(a, f, c, bb, cc); else if (ax === 'z') add(a, c, f, bb, cc); else add(f, c, a, bb, cc);
      }
    }
  }
  // 화면 (앞면이 빛나는 얇은 판)
  function screen(x0, x1, y0, y1, z, glow, tint) {
    box(x0, x1, y0, y1, z - 0.04, z, 1500, 0.3, WHITE, {
      ax: 'z', f: z, col: tint, b: (a, c) => glow * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(a * 7 + c * 5) * Math.sin(c * 9 - a * 2))),
    });
  }

  // --- 벽 ---
  wall('x', 0, 0, W, HGT, 380);                      // 뒤쪽 벽 (계단석 뒤)
  wall('z', W, 0, D, HGT, 380);                      // 오른쪽 벽
  wall('z', 0, 0, 0.45, HGT, 380);                   // 왼쪽 벽 (입구 위쪽)
  wall('z', 0, 1.2, 2.15, HGT, 380);                 // 왼쪽 벽 (입구 아래 ~ 커튼 전)
  wall('x', D, 0, 1.74, HGT, 380);                   // 앞쪽 벽 (미디어월 왼쪽)
  for (let i = 0; i < N(500); i++) { const z = 0.45 + rnd() * 0.75; add(0, 2.2 + rnd() * 0.04, z, 0.9); }   // 입구 문틀
  for (let i = 0; i < N(500); i++) { const y = rnd() * 2.2; add(0, y, rnd() < 0.5 ? 0.45 : 1.2, 0.9); }
  // --- 커튼 ---
  curtain('z', 0.18, 2.15, 6.82, HGT, 1300);         // 왼쪽 커튼
  curtain('x', 6.75, 6.54, W, HGT, 1300);            // 오른쪽 아래 커튼 (미디어월 옆)
  // --- 뒤쪽 계단석 (2단, 뒤가 더 높음) ---
  box(0.81, W, 0, 0.84, 0, 0.66, 900, 0.42, WOOD);
  box(1.01, W, 0, 0.42, 0.66, 1.3, 900, 0.42, WOOD);
  // (방석 없음 — 계단석은 화면만 띄워 두는 자리)
  // 계단석 위 화면: 웹사이트, 메이킹 필름
  screen(2.45, 3.67, 0.55, 1.25, 0.95, 0.9, WHITE);
  box(3.0, 3.12, 0.42, 0.55, 0.9, 0.98, 1500, 0.3);
  screen(5.35, 7.93, 0.6, 2.05, 0.92, 0.75, WHITE);
  box(6.58, 6.7, 0.42, 0.6, 0.88, 0.96, 1500, 0.3);
  // --- 굿즈 존 (입구 옆 긴 진열대 + 엽서) ---
  box(0.29, 0.81, 0, 0.85, 0.05, 1.58, 1100, 0.45);
  for (let i = 0; i < 7; i++) {
    const z0 = 0.15 + i * 0.2;
    box(0.5 + (i % 2) * 0.05, 0.51 + (i % 2) * 0.05, 0.86, 1.0, z0, z0 + 0.14, 5000, 0.45, i % 2 ? WHITE : WARM);
  }
  // --- 체험대 (검은 천 테이블 + 이끼 + 곡선 스탠드 조명) ---
  {
    const X0 = 3.48, X1 = 4.97, Z0 = 4.79, Z1 = 5.59, TOP = 0.9;
    const side = (n, f) => { for (let i = 0; i < N(n); i++) f(rnd(), rnd()); };
    side(3000, (u, v) => { const x = X0 + u * (X1 - X0), y = v * TOP; add(x, y, Z0 - 0.03 * (1 - v) - Math.sin(x * 40) * 0.015 * (1 - v), 0.24 + 0.2 * (0.5 + 0.5 * Math.sin(x * 40))); });
    side(2400, (u, v) => { const x = X0 + u * (X1 - X0), y = v * TOP; add(x, y, Z1 + 0.03 * (1 - v), 0.18); });
    side(600, (u, v) => { const z = Z0 + u * (Z1 - Z0), y = v * TOP; add(X0 - 0.03 * (1 - v), y, z, 0.12); });
    side(600, (u, v) => { const z = Z0 + u * (Z1 - Z0), y = v * TOP; add(X1 + 0.03 * (1 - v), y, z, 0.12); });
    for (let i = 0; i < N(2600); i++) add(X0 + rnd() * (X1 - X0), TOP, Z0 + rnd() * (Z1 - Z0), 0.3);   // 체험대 윗면
    // 테이블 뒤쪽 왼편에서 올라와 체험대 위로 굽은 스탠드
    for (let i = 0; i < N(1600); i++) {
      const t = rnd(), a = t * Math.PI * 0.9;
      add(X0 + 0.12 + (1 - Math.cos(a)) * 0.36 + (rnd() - 0.5) * 0.015, TOP + Math.sin(a) * 0.55 + t * 0.25, Z1 - 0.15 + (rnd() - 0.5) * 0.015, 0.35);
    }
    for (let i = 0; i < N(1400); i++) {
      const a = rnd() * 6.283, r = Math.sqrt(rnd());
      add(X0 + 0.82 + Math.cos(a) * r * 0.18, TOP + 0.43, Z1 - 0.17 + Math.sin(a) * r * 0.07, 1.4, WARM);
    }
  }
  // --- 미디어월 (LED 4.8 × 2.7m) ---
  {
    const X0 = 1.74, X1 = 6.54, Z = 6.6;
    const n = N(4.8 * 2.7 * 2000);
    for (let i = 0; i < n; i++) {
      const x = X0 + rnd() * 4.8, y = 0.1 + rnd() * 2.7;
      const v = 0.5 + 0.5 * Math.sin(x * 3.1 + Math.sin(y * 2.3) * 1.5) * Math.sin(y * 4.2 - x * 1.4);
      const w = 0.5 + 0.5 * Math.sin(x * 1.3 - y * 2.1 + 1.7);
      const edge = Math.min(x - X0, X1 - x, y - 0.1, 2.8 - y) < 0.03 ? 0.6 : 0;
      add(x, y, Z, 0.35 + v * 0.75 + w * 0.25 + edge, ACC);   // 미디어월만 포인트 컬러
    }
    box(X0, X1, 0, 2.85, Z + 0.02, D, 300, 0.2);   // 뒤 구조물
  }
  // 천장 레일 조명
  for (let i = 0; i < N(1400); i++) add(rnd() * W, HGT, 0.06 + rnd() * 0.05, 0.6 + rnd() * 0.6, WARM);
  for (let i = 0; i < N(1000); i++) add(rnd() * W, HGT, 6.3 + rnd() * 0.05, 0.5 + rnd() * 0.5, WARM);

  const COUNT = P.length / 3;

  /* ---------- 2. WebGL ---------- */
  const VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec4 aCol;          // rgb(밝기 포함), seed
  layout(location=2) in vec2 aK;            // 종류, 커튼 방향 좌표
  uniform mat4 uVP;
  uniform float uA, uTime, uPx, uGain;
  out vec3 vCol;
  float h(float x){ return fract(sin(x * 91.345 + 47.853) * 43758.5453); }
  void main(){
    float s = aCol.w;
    // 흩어진 자리 → 제자리로 모임 (입자마다 도착 시간이 다름)
    vec3 dir = normalize(vec3(h(s*1.3)-.5, h(s*2.7)-.45, h(s*3.9)-.5) + 1e-4);
    vec3 far = aPos + dir * (4. + h(s*5.1) * 9.) + vec3(0., 2.5, 0.);
    float t = clamp(uA * 1.7 - h(s*7.3) * 0.7, 0., 1.);
    t = t * t * (3. - 2. * t);
    vec3 p = mix(far, aPos, t);
    p += (1. - t) * vec3(sin(uTime*.7 + s*40.), cos(uTime*.6 + s*30.), sin(uTime*.5 + s*20.)) * .4;
    // 실크: 커튼이 천천히 일렁이고, 주름을 따라 윤기가 흘러감
    float sheen = 0.;
    if (aK.x > .5) {
      float al = aK.y, y = aPos.y;
      float wave = (sin(al * 1.7 + y * .55 - uTime * .42) * .055 + sin(al * .6 - uTime * .27 + y * .3) * .04) * smoothstep(0., .6, y);
      p += (aK.x < 1.5 ? vec3(0., 0., 1.) : vec3(1., 0., 0.)) * wave;
      sheen = pow(.5 + .5 * sin(al * 2.3 + y * .4 - uTime * .55), 10.) * 1.3;
    }
    // 모든 입자가 아주 느리게 흐르듯 떠 있음
    p += vec3(sin(uTime*.35 + aPos.y*2.1 + s*6.), sin(uTime*.3 + aPos.x*1.7 + s*9.), cos(uTime*.33 + aPos.z*1.9 + s*4.)) * .008;
    vec4 c = uVP * vec4(p, 1.);
    gl_Position = c;
    float d = max(c.w, .05);
    gl_PointSize = clamp(uPx / d, 1., 7.);
    float tw = .88 + .12 * sin(uTime * (.7 + h(s*9.)*.9) + s * 80.);
    float fade = smoothstep(.25, 1.0, d) * exp(-d * .03);
    vCol = aCol.rgb * uGain * tw * fade * (.15 + .85 * t) * (1. + sheen) + vec3(.9, .95, .92) * sheen * .12 * fade * t;
  }`;
  const FS = `#version 300 es
  precision mediump float;
  in vec3 vCol; out vec4 o;
  void main(){
    float r = length(gl_PointCoord - .5);
    vec3 c = vCol * exp(-r * r * 14.);        // 가장자리가 부드럽게 퍼지는 입자
    // 알파를 밝기만큼 같이 내보냄 (알파 0이면 사파리가 투명으로 지워 버림)
    o = vec4(c, min(1., max(c.r, max(c.g, c.b))));
  }`;
  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uVP = U('uVP'), uA = U('uA'), uTime = U('uTime'), uPx = U('uPx'), uGain = U('uGain');
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = (data, loc, size) => {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  buf(P, 0, 3); buf(C, 1, 4); buf(K, 2, 2);
  P.length = 0; C.length = 0; K.length = 0;
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.disable(gl.DEPTH_TEST);

  /* ---------- 3. 카메라: 사람이 걸으며 둘러보듯, 고개는 천천히 조금씩만 돌림 ---------- */
  // 이웃한 지점끼리 바라보는 방향 차이를 작게(대부분 60° 안팎) 잡고,
  // 아래 LEN 계산에서 회전에 큰 비중을 줘서 고개를 돌리는 구간은 스크롤을 더 많이 써서 천천히 돌아감
  // spot: 왼쪽 설명에서 밝아질 항목 (1 입구·굿즈, 2 웹사이트, 3 메이킹 필름, 4 체험)
  const PATH = [
    { pos: [4.3, 8.6, 8.4], at: [4.3, 0, 3.4], fov: 46 },                          // 위에서 내려다봄
    { pos: [2.7, 1.9, 3.5], at: [0.6, 0.9, 1.0], fov: 60, spot: 1 },               // 입구 · 굿즈 존
    { pos: [3.4, 1.85, 4.0], at: [3.0, 1.0, 0.9], fov: 60, spot: 2 },              // 웹사이트
    { pos: [6.0, 1.85, 4.2], at: [6.6, 1.0, 0.9], fov: 60, spot: 3 },              // 메이킹 필름
    { pos: [7.5, 1.9, 3.3], at: [4.8, 1.0, 2.6], fov: 60 },                        // 오른쪽에서 천천히 고개를 돌림
    { pos: [7.2, 1.95, 3.0], at: [4.4, 0.9, 5.9], fov: 60, spot: 4 },              // 체험대 · 미디어월 (비스듬히)
    { pos: [3.0, 1.95, 3.6], at: [0.4, 1.2, 1.2], fov: 60 },                       // 입구로 돌아감
    { pos: [4.3, 8.6, 8.4], at: [4.3, 0, 3.4], fov: 46 },
  ];
  const SEG = PATH.length - 1;
  const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  function cr(a, b, c, d, t) {   // Catmull-Rom
    const t2 = t * t, t3 = t2 * t;
    return a.map((_, i) => 0.5 * (2 * b[i] + (-a[i] + c[i]) * t + (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * t2 + (-a[i] + 3 * b[i] - 3 * c[i] + d[i]) * t3));
  }
  function rawAt(u) {
    u = Math.min(SEG, Math.max(0, u));
    const i = Math.min(SEG - 1, Math.floor(u)), t = u - i;
    const a = PATH[Math.max(0, i - 1)], A = PATH[i], B = PATH[i + 1], d = PATH[Math.min(SEG, i + 2)];
    return { pos: cr(a.pos, A.pos, B.pos, d.pos, t), at: cr(a.at, A.at, B.at, d.at, t), fov: A.fov + (B.fov - A.fov) * smooth(t), u };
  }
  // 이동 거리 + 고개 돌린 각도 기준으로 다시 매김 → 걷기도 회전도 늘 같은 느린 속도
  // TURN: 1라디안(약 57°) 돌리는 데 7m 걷는 만큼의 스크롤을 씀 → 회전이 휙 지나가지 않음
  const M = 2000, LEN = new Float32Array(M + 1), TURN = 7;
  const dirOf = (c) => { const v = [c.at[0] - c.pos[0], c.at[1] - c.pos[1], c.at[2] - c.pos[2]]; const l = Math.hypot(...v); return v.map((x) => x / l); };
  {
    let prev = rawAt(0), pd = dirOf(prev);
    for (let k = 1; k <= M; k++) {
      const c = rawAt((k / M) * SEG), cd = dirOf(c);
      const dp = Math.hypot(c.pos[0] - prev.pos[0], c.pos[1] - prev.pos[1], c.pos[2] - prev.pos[2]);
      const ang = Math.acos(Math.min(1, pd[0] * cd[0] + pd[1] * cd[1] + pd[2] * cd[2]));
      LEN[k] = LEN[k - 1] + dp + ang * TURN;
      prev = c; pd = cd;
    }
  }
  const ease = (p) => p + (smooth(p) - p) * 0.4;      // 처음과 끝만 살짝 느리게
  function uFromP(p) {
    const target = ease(Math.min(1, Math.max(0, p))) * LEN[M];
    let lo = 0, hi = M;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (LEN[m] < target) lo = m; else hi = m; }
    const f = (target - LEN[lo]) / Math.max(1e-6, LEN[hi] - LEN[lo]);
    return ((lo + f) / M) * SEG;
  }
  function pFromU(u) {           // 스팟 클릭용 역변환
    const target = LEN[Math.round((u / SEG) * M)] / LEN[M];
    let lo = 0, hi = 1;
    for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (ease(m) < target) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  const camAt = (p) => rawAt(uFromP(p));
  function spotAt(u) {
    let best = 0, bd = 0.8;   // 가까운 스팟 지점(0.8구간 안)이 있으면 그 스팟
    PATH.forEach((k, i) => { if (k.spot && Math.abs(u - i) < bd) { bd = Math.abs(u - i); best = k.spot; } });
    return best;
  }

  function perspective(fov, asp, n, f) {
    const t = 1 / Math.tan(fov * Math.PI / 360);
    return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0];
  }
  function lookAt(e, c) {
    let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; const zl = Math.hypot(...z); z = z.map((v) => v / zl);
    let x = [z[2], 0, -z[0]]; const xl = Math.hypot(...x) || 1; x = x.map((v) => v / xl);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1];
  }
  function mul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  }

  /* ---------- 4. 왼쪽 스팟 설명 ---------- */
  const items = [...sec.querySelectorAll('.space3d__spot')];
  let shown = -1;
  // 스팟을 누르면 그 위치까지 천천히 스크롤
  const SPOT_U = { 1: 1, 2: 2, 3: 3, 4: 5 };   // PATH 안의 지점 번호
  let scrollAnim = 0;
  function goSpot(n) {
    const r = sec.getBoundingClientRect();
    const top = scrollY + r.top, span = r.height - innerHeight;
    const to = top + pFromU(SPOT_U[n]) * span, from = scrollY, dist = to - from;
    const dur = Math.min(4200, 1600 + Math.abs(dist) * 0.35);
    const start = performance.now();
    cancelAnimationFrame(scrollAnim);
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      scrollTo(0, from + dist * e);
      if (t < 1) scrollAnim = requestAnimationFrame(step);
    };
    scrollAnim = requestAnimationFrame(step);
  }
  addEventListener('wheel', () => cancelAnimationFrame(scrollAnim), { passive: true });
  addEventListener('touchstart', () => cancelAnimationFrame(scrollAnim), { passive: true });
  items.forEach((li) => {
    li.addEventListener('click', () => goSpot(+li.dataset.spot));
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goSpot(+li.dataset.spot); } });
  });
  function ui(u) {
    const s = spotAt(u);
    if (s === shown) return;
    shown = s;
    items.forEach((li) => li.classList.toggle('is-on', +li.dataset.spot === s));
  }

  /* ---------- 5. 루프 ---------- */
  let CW = 0, CH = 0, dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 1.75);
    CW = Math.round(canvas.clientWidth * dpr); CH = Math.round(canvas.clientHeight * dpr);
    canvas.width = CW; canvas.height = CH; gl.viewport(0, 0, CW, CH);
  }
  addEventListener('resize', resize); resize();

  let mx = 0, my = 0, smx = 0, smy = 0;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });

  let assembleStart = -1, visible = false, raf = 0, sp = 0;
  const t0 = performance.now();
  function progress() {
    const r = sec.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  }
  function frame(now) {
    raf = 0;
    const time = (now - t0) / 1000;
    if (assembleStart < 0 && sec.getBoundingClientRect().top < innerHeight * 0.45) assembleStart = time;
    const a = assembleStart < 0 ? 0 : Math.min(1, (time - assembleStart) / 3.5);   // 입자가 모여 공간이 되는 시간(초)
    sp += (progress() - sp) * 0.018;                 // 스크롤을 천천히, 여유 있게 따라감
    const cam = camAt(sp);
    smx += (mx - smx) * 0.02; smy += (my - smy) * 0.02;
    const at = [cam.at[0] + smx * 0.25, cam.at[1] - smy * 0.15, cam.at[2]];   // 마우스에 따른 흔들림도 아주 조금만
    const vp = mul(perspective(cam.fov, CW / CH, 0.05, 80), lookAt(cam.pos, at));
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(uVP, false, vp);
    gl.uniform1f(uA, a);
    gl.uniform1f(uTime, time);
    gl.uniform1f(uPx, (MOBILE ? 11 : 14) * dpr * (CH / dpr / 900) * (60 / cam.fov));
    gl.uniform1f(uGain, 3.0);
    gl.drawArrays(gl.POINTS, 0, COUNT);
    ui(cam.u);
    if (visible) raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }, { rootMargin: '10% 0px' }).observe(sec);
})();
