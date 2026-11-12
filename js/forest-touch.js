/* =========================================================
   FEELD — 누르고 있으면 깨어나는 숲 (VID_04_2.ply → assets/splat/forest-gs.bin)
   프로젝트 시연(IMG_2371) 느낌:
   - 검은 화면 → 흰 '조각' 입자가 깊이 방향에서 모여 숲의 입체 형태
   - 색이 군데군데 번지듯 차오르며 실제 스플랫 숲
   - 누르고 있는 동안 카메라가 숲길 안으로 천천히 걸어 들어감 (공간감)
   - 누른 채 움직이면 파동 / 떼면 다시 입자로 흩어짐
   ========================================================= */
(() => {
  const section = document.querySelector('.touch');
  const canvas = section && section.querySelector('.touch__gl');
  if (!canvas) return;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return;

  const CFG = {
    riseSec: 8,       // 끝까지 누르고 있어야 하는 시간(초)
    fallSec: 3.5,     // 손을 떼고 사라지는 시간(초)
    fovFrom: 80,      // 입자 단계 화각
    fovTo: 72,        // 풍경 단계 화각
    camFrom: 1.6,     // 입자 단계 카메라 위치 (계단 바로 앞 — 너무 멀리서 오지 않게)
    camTo: 3.4,       // 풍경 단계 카메라 위치 (계단 첫 단 앞) — forest-gs.bin 변환 기준과 같아야 함
    enterFrom: 0.34,  // 이 단계부터
    enterTo: 0.95,    // 이 단계까지 공간 안으로 들어감
    lookYaw: 0.16,    // 마우스로 둘러보는 정도(rad)
    lookPitch: 0.07,
    maxPx: 600,
    ripples: 12,
  };
  const R = CFG.ripples;

  const VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;   // int16 norm (기준 카메라 좌표)
  layout(location=1) in vec4 aRot;   // int8 norm (w,x,y,z 월드)
  layout(location=2) in vec3 aScl;   // u8 norm (log scale)
  layout(location=3) in vec4 aCol;   // u8 norm (rgb, opacity)
  uniform vec3 uLo, uHi, uCam;       // uCam: 카메라 이동(기준 카메라 좌표)
  uniform mat3 uPar, uW;             // uPar: 카메라 회전, uW: 월드→현재 카메라
  uniform float uAspect, uFocal, uPx, uTime, uP, uHold, uMaxPx, uDpr;
  uniform vec2 uView, uPtr;
  uniform vec4 uRip[${R}];
  out vec3 vColor; out float vAlpha; out vec2 vUV;

  float hash(float n){
    uint x = uint(n) * 747796405u + 2891336453u;
    x = ((x >> ((x >> 28u) + 4u)) ^ x) * 277803737u;
    x = (x >> 22u) ^ x;
    return float(x) / 4294967295.;
  }
  float h3(vec3 c){ return fract(sin(dot(c, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec3 p){
    vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z);
  }
  vec3 ripple(vec2 ndc){
    vec2 disp = vec2(0.); float glow = 0.;
    for (int i=0;i<${R};i++){
      vec4 r = uRip[i];
      float age = uTime - r.z;
      if (r.w <= 0. || age < 0. || age > 2.2) continue;
      vec2 d = (ndc - r.xy) * vec2(uAspect, 1.);
      float dist = length(d);
      float band = (dist - age*0.45)/0.05;
      float ring = exp(-band*band) * exp(-age*2.2) * r.w;
      vec2 dir = dist > 1e-4 ? d/dist : vec2(0.);
      disp += dir * ring * 0.02 * sin(band*2.2 + 1.2);
      glow += ring;
    }
    return vec3(disp / vec2(uAspect, 1.), glow);
  }
  void hide(){ gl_Position = vec4(2.,2.,2.,1.); }

  void main(){
    float id = float(gl_InstanceID);
    float s = hash(id), s2 = hash(id+400000.), s3 = hash(id+900000.);
    vec3 base = uLo + (aPos*0.5+0.5)*(uHi-uLo);   // 기준 카메라 좌표
    vec3 p = uPar * (base - uCam);
    vec2 ndc0 = vec2(p.x*uFocal/uAspect, p.y*uFocal) / max(p.z, 1e-3);

    // 누른 자리 근처부터 먼저 깨어남
    vec2 dv = (ndc0 - uPtr) * vec2(uAspect, 1.);
    float pe = clamp(uP + uHold*0.22*exp(-dot(dv,dv)*2.5), 0., 1.);

    // ① 흰 조각 등장 (아래쪽부터, 점마다 다르게)
    float hgt = clamp(ndc0.y*0.5+0.5, 0., 1.);
    float t0 = s*0.2 + hgt*0.16;
    float appear = smoothstep(t0, t0+0.1, pe);
    if (appear <= 0.001) { hide(); return; }

    // ② 색이 군데군데 번지며 차오름 (공간 노이즈로 구역별 시작 시점 다르게)
    float n = vnoise(base*0.2) * 0.75 + vnoise(base*0.7) * 0.25;
    float c0 = 0.34 + n*0.4 + s2*0.05;
    float colT = smoothstep(c0, c0+0.1, pe);        // 색
    float grow = smoothstep(c0+0.02, c0+0.16, pe);  // 조각 → 실제 크기

    // 깊이 방향에서 날아와 모이는 움직임 + 떠다님
    float far = 1. - appear;
    vec3 fly = (vec3(s2, s3, hash(id+1.3e6)) - 0.5) * vec3(1.2, 1.2, 4.0) * far*far * (0.4 + p.z*0.08);
    float floatAmt = (1. - grow) * (0.015 + p.z*0.002);
    fly += floatAmt * vec3(sin(uTime*0.6 + s*40.), cos(uTime*0.5 + s2*40.), sin(uTime*0.4 + s3*40.));
    p += fly;

    float nearFade = smoothstep(0.25, 1.1, p.z);
    if (p.z < 0.2 || nearFade <= 0.) { hide(); return; }
    vec2 ndc = vec2(p.x*uFocal/uAspect, p.y*uFocal) / p.z;

    // 3D 공분산 → 화면 타원
    vec4 q = normalize(aRot);
    float w=q.x, x=q.y, y=q.z, z=q.w;
    mat3 Rm = mat3(
      1.-2.*(y*y+z*z), 2.*(x*y+w*z),    2.*(x*z-w*y),
      2.*(x*y-w*z),    1.-2.*(x*x+z*z), 2.*(y*z+w*x),
      2.*(x*z+w*y),    2.*(y*z-w*x),    1.-2.*(x*x+y*y));
    vec3 sc = exp(aScl*10.5 - 9.) * mix(0.16, 1., grow);
    mat3 M = uW * Rm * mat3(sc.x,0.,0., 0.,sc.y,0., 0.,0.,sc.z);
    mat3 Sig = M * transpose(M);
    float lim = 1.3 / uFocal;
    float tx = clamp(p.x/p.z, -lim*uAspect, lim*uAspect) * p.z;
    float ty = clamp(p.y/p.z, -lim, lim) * p.z;
    float fz = uPx / p.z;
    mat3 J = mat3(fz, 0., 0.,  0., fz, 0.,  -fz*tx/p.z, -fz*ty/p.z, 0.);
    mat3 C = J * Sig * transpose(J);
    float a = C[0][0] + 0.3, b = C[0][1], d = C[1][1] + 0.3;
    float mid = 0.5*(a+d);
    float rad = length(vec2(0.5*(a-d), b));
    float l1 = mid + rad, l2 = max(mid - rad, 0.1);
    vec2 v1 = abs(b) > 1e-6 ? normalize(vec2(b, l1 - a)) : (a >= d ? vec2(1.,0.) : vec2(0.,1.));
    float capMajor = mix(3.0*uDpr, uMaxPx, grow);   // 조각 단계: 짧은 획
    vec2 e1 = v1 * min(sqrt(l1), capMajor);
    vec2 e2 = vec2(-v1.y, v1.x) * min(sqrt(l2), mix(0.6*uDpr, uMaxPx, grow));

    vec3 rp = ripple(ndc);
    ndc += rp.xy;

    vec2 corner = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 2. - 1.;
    vUV = corner * 3.;
    vec2 off = (vUV.x*e1 + vUV.y*e2) * 2. / uView;

    // 색: 깊고 어두운 숲 톤 (그늘은 짙은 초록·약간 청록, 빛 받은 잎만 밝게)
    vec3 c = aCol.rgb;
    float lum = dot(c, vec3(.299,.587,.114));
    c = mix(vec3(lum), c, 1.35);                       // 채도
    c = pow(clamp(c, 0., 1.), vec3(1.35));             // 중간·그늘을 어둡게
    c = clamp((c - 0.42) * 1.22 + 0.42, 0., 1.);       // 대비
    float sh = 1. - smoothstep(0.05, 0.45, lum);
    c *= mix(vec3(1.), vec3(0.86, 1.0, 0.95), sh);     // 그늘은 살짝 청록
    c *= vec3(0.97, 1.03, 0.94);                       // 전체 초록 기운
    vec3 flake = vec3(1., .99, .96) * (0.75 + 0.5*lum);
    vColor = mix(flake, c, colT) + rp.z * mix(0.22, 0.03, grow);

    float depthFade = 1. - 0.75*smoothstep(10., 35., p.z);  // 먼 조각은 옅게 → 가까운 숲 형태가 또렷
    float sel = step(s3, 0.55);                             // 일부만 흰 조각으로
    float aFlake = sel * (0.5 + 0.5*aCol.a) * (0.7 + 0.8*lum) * depthFade
                 * (0.75 + 0.25*sin(uTime*(1.5+s2*2.5) + s*40.));
    vAlpha = appear * nearFade * mix(aFlake, aCol.a, grow);
    gl_Position = vec4(ndc + off, 0., 1.);
  }`;

  const FS = `#version 300 es
  precision mediump float;
  in vec3 vColor; in float vAlpha; in vec2 vUV;
  out vec4 o;
  void main(){
    float r2 = dot(vUV, vUV);
    if (r2 > 9.) discard;
    float a = min(0.99, vAlpha * exp(-0.5*r2));
    if (a < 1./255.) discard;
    o = vec4(vColor*a, a);
  }`;

  function program(vs, fs) {
    const mk = (t, src) => {
      const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const U = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name.replace('[0]', '');
      U[name] = gl.getUniformLocation(p, name);
    }
    return { p, U };
  }
  const GS = program(VS, FS);
  gl.useProgram(GS.p);

  /* ---------- data ---------- */
  let count = 0, V = null, vao = null;
  fetch(canvas.dataset.src).then(r => r.arrayBuffer()).then(buf => {
    const head = new Uint32Array(buf, 0, 4);
    const f = new Float32Array(buf, 16, 15);
    gl.uniform3fv(GS.U.uLo, f.subarray(0, 3));
    gl.uniform3fv(GS.U.uHi, f.subarray(3, 6));
    V = Array.from(f.subarray(6, 15)); // 행 우선 (r,u,f)
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(buf, 76), gl.STATIC_DRAW);
    const S = 18;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.SHORT, true, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.BYTE, true, S, 6);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.UNSIGNED_BYTE, true, S, 10);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, S, 13);
    for (let i = 0; i < 4; i++) gl.vertexAttribDivisor(i, 1);
    count = head[0];
    dirty = true;
  });

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  /* ---------- size ---------- */
  let W = 1, H = 1, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    dirty = true;
  }
  window.addEventListener('resize', resize);

  /* ---------- input ---------- */
  let down = false, P = 0, hold = 0;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };   // 화면상의 누른 위치
  const look = { x: 0, y: 0 };                // 둘러보기(부드럽게)
  const rip = new Float32Array(R * 4);
  let ripI = 0, lastRip = { x: 0, y: 0, t: -9 };
  const now = () => performance.now() / 1000;

  function toNdc(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: 1 - ((e.clientY - r.top) / r.height) * 2 };
  }
  function addRipple(x, y, s) {
    rip.set([x, y, now(), s], ripI * 4); ripI = (ripI + 1) % R;
    lastRip = { x, y, t: now() };
  }
  canvas.addEventListener('pointerdown', e => {
    down = true; const n = toNdc(e); ptr.tx = n.x; ptr.ty = n.y;
    if (P > 0.05) addRipple(n.x, n.y, 0.5);
    dirty = true;
  });
  window.addEventListener('pointermove', e => {
    const n = toNdc(e); ptr.tx = n.x; ptr.ty = n.y;
    if (!down) return;
    const dx = (n.x - lastRip.x) * (W / H), dy = n.y - lastRip.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.06 || (d > 0.015 && now() - lastRip.t > 0.08)) addRipple(n.x, n.y, Math.min(0.7, 0.35 + d * 2));
  });
  const up = () => { down = false; };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- loop (화면에 보일 때만) ---------- */
  let visible = false, dirty = true, prevT = now();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { resize(); prevT = now(); } })
    .observe(section);

  function mul3(A, B) { // 행 우선
    const o = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
    return o;
  }
  const colMajor = m => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
  const ease = t => t * t * (3 - 2 * t);

  // 확인용: 주소 뒤에 ?stage=0.6 처럼 붙이면 그 단계로 고정
  const qs = new URLSearchParams(location.search).get('stage');
  const DEBUG_P = qs === null ? null : Math.max(0, Math.min(1, parseFloat(qs) || 0));
  const hint = section.querySelector('.touch__hint');

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || !count) return;
    const t = now(), dt = Math.min(0.1, t - prevT); prevT = t;

    P = down ? Math.min(1, P + dt / CFG.riseSec) : Math.max(0, P - dt / CFG.fallSec);
    if (DEBUG_P !== null) P = DEBUG_P;
    hold += ((down ? 1 : 0) - hold) * Math.min(1, dt * 4);
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 5);
    ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 5);
    look.x += (ptr.tx - look.x) * Math.min(1, dt * 1.5);
    look.y += (ptr.ty - look.y) * Math.min(1, dt * 1.5);
    if (hint) hint.classList.toggle('is-hidden', P > 0.05);

    const rippling = t - lastRip.t < 2.2;
    if (P <= 0 && hold < 0.01 && !rippling) {
      if (dirty) { gl.clear(gl.COLOR_BUFFER_BIT); dirty = false; }
      return;
    }
    dirty = true;

    // 카메라: 입자 단계엔 뒤에서 조금씩 다가오다가, 풍경으로 바뀌는 동안 공간 안으로 쑥 들어감
    const e = ease(P);
    const k = Math.max(0, Math.min(1, (P - CFG.enterFrom) / (CFG.enterTo - CFG.enterFrom)));
    const enter = k * k * k * (k * (k * 6 - 15) + 10);           // 부드럽게 출발·도착
    const pre = Math.min(P / CFG.enterFrom, 1) * 0.35;            // 입자 단계의 느린 접근
    const cam = [
      Math.sin(t * 0.23) * 0.22 * e,
      Math.sin(t * 0.9) * 0.02 * e + Math.sin(t * 0.31) * 0.05 * e,
      CFG.camFrom + pre + (CFG.camTo - CFG.camFrom - 0.35) * enter,
    ];
    const fovDeg = CFG.fovFrom + (CFG.fovTo - CFG.fovFrom) * enter;
    const yaw = look.x * CFG.lookYaw + Math.sin(t * 0.13) * 0.05 * e;
    const pitch = look.y * CFG.lookPitch + Math.sin(t * 0.19) * 0.015 * e;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const Ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy];
    const Rx = [1, 0, 0, 0, cp, -sp, 0, sp, cp];
    const par = mul3(Rx, Ry);
    const focal = 1 / Math.tan((fovDeg * Math.PI / 180) / 2);

    const U = GS.U;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3fv(U.uCam, cam);
    gl.uniformMatrix3fv(U.uPar, false, colMajor(par));
    gl.uniformMatrix3fv(U.uW, false, colMajor(mul3(par, V)));
    gl.uniform1f(U.uAspect, W / H);
    gl.uniform1f(U.uFocal, focal);
    gl.uniform1f(U.uPx, focal * H / 2);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uP, P);
    gl.uniform1f(U.uHold, hold);
    gl.uniform1f(U.uMaxPx, CFG.maxPx * dpr);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform2f(U.uView, W, H);
    gl.uniform2f(U.uPtr, ptr.x, ptr.y);
    gl.uniform4fv(U.uRip, rip);
    gl.bindVertexArray(vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);
  }
  requestAnimationFrame(frame);
})();
