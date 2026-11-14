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
  // 나무 바닥 영역 (위에서 본 배치도의 분홍 영역: 왼쪽 벽 바로 옆부터, 입구 쪽 모서리가 반원으로 둥금)
  // 바닥보다 FUP만큼 한 단 높음 — 커튼을 열고 들어오면 이 둥근 단이 바로 보임
  const WX0 = 0.4, WZ0 = 1.3, WZ1 = 4.1, WR = 1.85, FUP = 0.1;
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
        add(x, FUP, z, 0.2 + plank * 0.08 + l * 0.7 + rnd() * 0.05, mix(WOOD, WARM, Math.min(1, l)));
      } else if (rnd() < 0.55) {
        add(x, 0, z, 0.1 + l * 0.8 + rnd() * 0.04, mix(WHITE, WARM, Math.min(1, l * 1.4)));
      }
    }
    // 나무 바닥 테두리: 윗모서리 선 + 단차 옆면 (반원 쪽과 앞쪽 긴 변)
    for (let i = 0; i < N(5200); i++) {
      const t = rnd();
      let x, z;
      const seg = rnd() * 3;
      if (seg < 1.6) { x = WX0 + WR + t * (W - WX0 - WR); z = WZ1; }
      else if (seg < 1.8) { x = WX0; z = WZ0 + t * (WZ1 - WR - WZ0); }
      else { const a = Math.PI / 2 + t * Math.PI / 2; x = WX0 + WR + Math.cos(a) * WR; z = WZ1 - WR + Math.sin(a) * WR; }
      if (rnd() < 0.5) add(x, FUP + 0.005, z, 0.55, WOOD);    // 윗모서리
      else add(x, rnd() * FUP, z, 0.3, WOOD);                 // 단차 옆면
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
  wall('z', 0, 0, 2.11, HGT, 380, 0.2);              // 왼쪽 위: 전시 설명 가벽 (예전 입구 자리)
  wall('x', D, 0, 1.74, HGT, 380);                   // 앞쪽 벽 (미디어월 왼쪽)
  // --- 커튼 --- 왼쪽 커튼은 처음엔 닫혀 있고, 카메라가 입구 앞에 오면 가운데(ENTZ)가 양옆으로 걷히며 열림 (셰이더 uOpen)
  const ENTZ = 4.11, PART_Z1 = 3.08;                 // PART_Z1: 굿즈 테이블 뒤 가벽이 끝나는 곳
  curtain('z', 0.18, PART_Z1, 6.82, HGT, 1300);      // 왼쪽 커튼 (가벽 끝부터 미디어월 쪽까지)
  curtain('x', 6.75, 6.54, W, HGT, 1300);            // 오른쪽 아래 커튼 (미디어월 옆)
  // --- 뒤쪽 계단석 (2단, 뒤가 더 높음) ---
  box(0.81, W, 0, 0.84, 0, 0.66, 900, 0.42, WOOD);
  box(1.01, W, 0, 0.42, 0.66, 1.3, 900, 0.42, WOOD);
  // (방석 없음 — 계단석은 앉아서 앞의 스탠바이미로 메이킹 필름을 보는 자리)
  // --- 메이킹 필름: 계단석 앞 바닥에 선 스탠바이미 (이동식 TV 스탠드), 화면은 계단석 쪽(-z)을 바라봄 ---
  {
    const CX = 6.0, CZ = 2.45, SW = 1.1, SH = 0.64, SY = 0.95 + FUP;   // 화면 가운데 x, 위치 z, 너비·높이, 화면 아래 높이 (나무 바닥 단 위)
    box(CX - SW / 2, CX + SW / 2, SY, SY + SH, CZ, CZ + 0.04, 7000, 0.3, WHITE, {
      ax: 'z', f: CZ, col: WHITE, b: (a, c) => 0.7 * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(a * 7 + c * 5) * Math.sin(c * 9 - a * 2))),
    });
    box(CX - 0.025, CX + 0.025, FUP + 0.06, SY + 0.1, CZ + 0.04, CZ + 0.09, 3000, 0.22);   // 세로 기둥
    for (let i = 0; i < N(1600); i++) {                                                     // 바닥 받침 (둥근 판)
      const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 0.28;
      add(CX + Math.cos(a) * r, FUP + 0.05, CZ + 0.065 + Math.sin(a) * r, r > 0.26 ? 0.6 : 0.3);
    }
  }
  // --- 굿즈 / 웹 테이블: 나무 단 위, 가벽(왼쪽 벽) 쪽에 붙여 세로로 길게 놓음 (스케치 기준)
  //     가벽 쪽 안쪽 끝에 모니터(웹, 화면은 방 안쪽 +x), 입구 쪽 끝에 굿즈 ---
  const GX0 = 0.45, GX1 = 1.19, GZ0 = 1.38, GZ1 = 2.93, GTOP = FUP + 0.85;
  box(GX0, GX1, FUP, GTOP, GZ0, GZ1, 1100, 0.45);
  // 전시 설명 가벽: 커튼 줄에 서서 테이블 뒤를 막음 — 이 구간엔 커튼이 없고, 가벽이 끝나는 곳부터 커튼이 이어짐
  box(0.14, 0.22, 0, HGT, GZ0 - 0.12, PART_Z1, 900, 0.24);   // 커튼과 같은 높이(천장까지), 끝이 커튼 시작점에 맞닿음
  for (let i = 0; i < 4; i++) {                                      // 엽서·굿즈 (입구 쪽 절반)
    const z0 = GZ0 + 0.88 + i * 0.15;
    box(GX0 + 0.3 + (i % 2) * 0.06, GX0 + 0.31 + (i % 2) * 0.06, GTOP + 0.01, GTOP + 0.15, z0, z0 + 0.1, 5000, 0.45, i % 2 ? WHITE : WARM);
  }
  // 웹사이트: 가벽 쪽 안쪽 끝 모니터 (가벽 앞에 서서 방 안쪽 +x를 바라봄)
  {
    const X = GX0 + 0.22, Z0 = GZ0 + 0.1, Z1 = GZ0 + 0.6, Y0 = GTOP + 0.18, Y1 = GTOP + 0.5;
    box(X - 0.03, X, Y0, Y1, Z0, Z1, 7000, 0.3, WHITE, {
      ax: 'x', f: X, col: WHITE, b: (a, c) => 0.75 * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(a * 9 + c * 5) * Math.sin(c * 11 - a * 3))),
    });
    box(X - 0.03, X, Y0 - 0.06, Y0, Z0, Z1, 1600, 0.5);                                   // 화면 아래 턱
    const MZ = (Z0 + Z1) / 2;
    box(X - 0.11, X - 0.07, GTOP + 0.01, Y0 - 0.06, MZ - 0.02, MZ + 0.02, 4000, 0.4);    // 받침 목
    box(X - 0.17, X - 0.01, GTOP, GTOP + 0.02, MZ - 0.08, MZ + 0.08, 4000, 0.4);         // 받침 발
  }
  // --- 체험대 (검은 천 테이블 + 이끼 + 곡선 스탠드 조명) ---
  {
    // 나무 단 바깥 바닥에 놓이고, 뒤쪽 면이 단차 모서리(WZ1)에 딱 맞닿음 (단 위로 올라오지 않음)
    const X0 = 3.48, X1 = 4.97, Z0 = WZ1 + 0.03, Z1 = WZ1 + 0.83, TOP = 0.9;
    // 실제 체험대(사진 DSC03607) 구성: 검은 천을 덮은 테이블 + 위에 이끼 매트 + 유목 두 덩이 + 고사리 잎
    // 검은 천: 윗면은 어둡게, 모서리 테두리는 밝게, 옆면은 세로 주름이 늘어지고 바닥에서 살짝 퍼짐
    {
      const drape = (n, f) => { for (let i = 0; i < N(n); i++) f(rnd(), rnd()); };
      const fold = (a) => (0.5 + 0.5 * Math.sin(a * 23 + Math.sin(a * 7) * 1.4)) ** 2;
      drape(3400, (u, v) => { const x = X0 + u * (X1 - X0), y = v * TOP, f = fold(x); add(x, y, Z0 - 0.025 * (1 - v) - f * 0.02 * (1 - v), 0.1 + 0.22 * f + (v > 0.97 ? 0.35 : 0)); });
      drape(2400, (u, v) => { const x = X0 + u * (X1 - X0), y = v * TOP, f = fold(x + 3); add(x, y, Z1 + 0.025 * (1 - v) + f * 0.02 * (1 - v), 0.08 + 0.16 * f + (v > 0.97 ? 0.3 : 0)); });
      drape(1200, (u, v) => { const z = Z0 + u * (Z1 - Z0), y = v * TOP, f = fold(z * 1.3); add(X0 - 0.025 * (1 - v) - f * 0.02 * (1 - v), y, z, 0.08 + 0.18 * f + (v > 0.97 ? 0.3 : 0)); });
      drape(1200, (u, v) => { const z = Z0 + u * (Z1 - Z0), y = v * TOP, f = fold(z * 1.3 + 2); add(X1 + 0.025 * (1 - v) + f * 0.02 * (1 - v), y, z, 0.08 + 0.18 * f + (v > 0.97 ? 0.3 : 0)); });
      for (let i = 0; i < N(1800); i++) add(X0 + rnd() * (X1 - X0), TOP, Z0 + rnd() * (Z1 - Z0), 0.1);   // 천 윗면
    }
    // 이끼 매트 (포인트 컬러): 몽글몽글한 이끼 덩이들이 모여 봉긋한 매트를 이루고, 위로 짧은 풀잎이 삐죽삐죽
    {
      const MX0 = X0 + 0.1, MX1 = X1 - 0.08, MZ0 = Z0 + 0.07, MZ1 = Z1 - 0.05;
      const cx = (MX0 + MX1) / 2, cz = (MZ0 + MZ1) / 2, hx = (MX1 - MX0) / 2, hz = (MZ1 - MZ0) / 2;
      const edge = (a) => 1 - 0.07 * (0.5 + 0.5 * Math.sin(a * 5 + 1)) - 0.05 * (0.5 + 0.5 * Math.sin(a * 13 + 2));
      const inMat = (x, z) => {   // 가장자리가 울퉁불퉁한 둥근 사각형
        const u = (x - cx) / hx, w = (z - cz) / hz;
        return u ** 4 + w ** 4 < edge(Math.atan2(w, u)) ** 4;
      };
      const pick = () => { for (;;) { const x = MX0 + rnd() * (MX1 - MX0), z = MZ0 + rnd() * (MZ1 - MZ0); if (inMat(x, z)) return [x, z]; } };
      const BASE = TOP + 0.04;
      // 이끼 덩이: 반구 모양 (꼭대기는 밝고 가장자리·틈은 어둡게 → 덩어리 윤곽이 보임)
      for (let c = 0; c < 170; c++) {
        const [ccx, ccz] = pick(), R = 0.035 + rnd() * 0.045, n = N(Math.round(R * R * 9000));
        for (let i = 0; i < n; i++) {
          const a = rnd() * 6.283, d = Math.sqrt(rnd()) * R;
          const x = ccx + Math.cos(a) * d, z = ccz + Math.sin(a) * d;
          if (!inMat(x, z)) continue;
          const k = Math.sqrt(Math.max(0, 1 - (d / R) ** 2));
          add(x, BASE + k * R * 0.9 + (rnd() - 0.5) * 0.006, z, 0.03 + 0.08 * k + rnd() * 0.03, ACC);
        }
      }
      // 풀잎: 덤불(포기)마다 3~7cm 잎 여러 가닥이 바깥으로 휘며 뻗음 — 뿌리는 어둡고 잎끝만 밝아 한 가닥씩 보임
      for (let c = 0; c < N(260); c++) {
        const [tx, tz] = pick(), blades = 5 + Math.floor(rnd() * 7);
        for (let b = 0; b < blades; b++) {
          const hgt = 0.03 + rnd() * 0.045, la = rnd() * 6.283, lean = 0.35 + rnd() * 0.6;
          const ox = tx + (rnd() - 0.5) * 0.02, oz = tz + (rnd() - 0.5) * 0.02, y0 = BASE + 0.02 + rnd() * 0.02;
          for (let s = 0; s < 9; s++) {
            const t = s / 8;
            add(ox + Math.cos(la) * lean * hgt * t * t, y0 + hgt * (t - 0.25 * lean * t * t), oz + Math.sin(la) * lean * hgt * t * t, 0.03 + 0.11 * t * t, ACC);
          }
        }
      }
      // 매트 옆면 (테이블 위에 얹힌 두께)
      for (let i = 0; i < N(1800); i++) {
        const a = rnd() * 6.283, e = edge(a), c = Math.cos(a), s = Math.sin(a);
        const r = e / Math.pow(c ** 4 + s ** 4, 0.25);
        add(cx + c * r * hx, TOP + rnd() * 0.06, cz + s * r * hz, 0.06 + rnd() * 0.05, ACC);
      }
    }
    // 유목 두 덩이 (앞 왼쪽은 크고, 뒤 오른쪽은 길게) — 나무껍질 결을 따라 밝기 차이
    {
      const log = (x0, z0, len, r, ang, n) => {
        const dx = Math.cos(ang), dz = Math.sin(ang);
        for (let i = 0; i < N(n); i++) {
          const t = rnd(), th = rnd() * Math.PI;                 // 윗반원만 (아래는 이끼에 묻힘)
          const rr = r * (0.75 + 0.25 * Math.sin(t * 9)) * (1 - 0.35 * Math.abs(t - 0.5));
          const px = x0 + dx * t * len - dz * Math.cos(th) * rr, pz = z0 + dz * t * len + dx * Math.cos(th) * rr;
          const bark = 0.5 + 0.5 * Math.sin(t * len * 60 + th * 3);
          add(px, TOP + 0.07 + Math.sin(th) * rr, pz, 0.05 + 0.13 * bark, WHITE);
        }
      };
      log(X0 + 0.32, Z0 + 0.3, 0.42, 0.075, -0.15, 1500);
      log(X0 + 0.82, Z0 + 0.62, 0.5, 0.06, 0.12, 1300);
    }
    // 스탠드 조명: 뒤쪽 가운데 클램프에서 구스넥이 부드럽게 올라와 앞으로 숙이고,
    // 끝에 얇은 직사각형 조명 바(62cm, 가운데 힌지)가 가로로 달림 — 아랫면이 빛남
    {
      const MX = (X0 + X1) / 2, BW = 0.62, HY = TOP + 0.5, HZ = Z1 - 0.24;
      // 클램프
      box(MX - 0.03, MX + 0.03, TOP, TOP + 0.05, Z1 - 0.08, Z1 - 0.02, 2500, 0.08);
      // 구스넥 (3차 베지어: 클램프 → 위로 → 앞으로 숙여 힌지)
      const P = [[MX, TOP + 0.05, Z1 - 0.05], [MX, TOP + 0.42, Z1 - 0.05], [MX, HY + 0.06, Z1 - 0.1], [MX, HY + 0.02, HZ + 0.03]];
      for (let i = 0; i < N(700); i++) {
        const t = rnd(), s = 1 - t;
        const b = [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
        const q = [0, 1, 2].map((k) => b[0] * P[0][k] + b[1] * P[1][k] + b[2] * P[2][k] + b[3] * P[3][k]);
        const a = rnd() * 6.283;
        add(q[0] + Math.cos(a) * 0.009, q[1] + Math.sin(a) * 0.009, q[2], 0.09);
      }
      // 조명 바 몸체 (가로 62 × 높이 2.2 × 깊이 2.6cm 직사각형)
      // (작은 면에 입자가 몰리면 더해져서 하얗게 뭉치므로 개수를 적게)
      box(MX - BW / 2, MX + BW / 2, HY - 0.011, HY + 0.011, HZ - 0.013, HZ + 0.013, 5000, 0.07);
      // 가운데 힌지 블록
      box(MX - 0.045, MX + 0.045, HY - 0.016, HY + 0.02, HZ - 0.02, HZ + 0.02, 1500, 0.08);
      // 아랫면 발광 띠 (양 끝 캡 제외) — 은은하게
      for (let i = 0; i < N(260); i++) add(MX + (rnd() - 0.5) * (BW - 0.04), HY - 0.012, HZ + (rnd() - 0.5) * 0.018, 0.35, WARM);
      // 테이블 위로 떨어지는 빛 (바 아래가 가장 밝고 앞으로 갈수록 옅게)
      for (let i = 0; i < N(2600); i++) {
        const x = MX + (rnd() - 0.5) * (BW + 0.3), z = HZ + 0.12 - rnd() * 0.62;
        const kx = 1 - Math.abs(x - MX) / ((BW + 0.3) / 2), kz = 1 - Math.abs(z - HZ) / 0.5;
        add(x, TOP + 0.003, z, 0.08 + 0.25 * Math.max(0, kx) * Math.max(0, kz), WARM);
      }
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
  uniform float uA, uTime, uPx, uGain, uOpen, uEnt;
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
      // 입구: 왼쪽 커튼 가운데가 양옆으로 걷힘 (가운데일수록 많이, 1m 밖은 그대로 → 가벽에 맞닿은 끝은 움직이지 않음)
      if (aK.x > 1.5) {
        float d = al - uEnt, k = max(0., 1. - abs(d) / 1.0);
        p.z += sign(d) * uOpen * .42 * k;
        p.x += uOpen * .06 * k;                 // 걷힌 자락이 살짝 안쪽으로 몰림
      }
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
  const uVP = U('uVP'), uA = U('uA'), uTime = U('uTime'), uPx = U('uPx'), uGain = U('uGain'), uOpen = U('uOpen'), uEnt = U('uEnt');
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
  // 실제 관람 동선: 위에서 내려다봄 → 커튼 밖 → 커튼 가운데를 열고 들어옴(둥근 나무 단이 보임)
  //               → 굿즈 / 웹 테이블 → 계단석에 앉아 스탠바이미(메이킹 필름) → 미디어월 · 체험대
  const PATH = [
    { pos: [4.3, 8.6, 8.4], at: [4.3, 0, 3.4], fov: 46 },                          // 위에서 내려다봄
    { pos: [-2.4, 1.6, ENTZ], at: [1.5, 1.1, ENTZ - 0.3], fov: 60, spot: 1 },      // 커튼 밖 — 닫힌 커튼이 열림 (입구)
    { pos: [0.35, 1.6, ENTZ], at: [2.2, 0.7, 3.0], fov: 60, spot: 1 },             // 커튼을 지나 안으로 — 둥근 나무 단
    { pos: [2.3, 1.7, 3.5], at: [0.85, 1.0, 2.05], fov: 60, spot: 2 },              // 단 위에 서서 굿즈 / 웹 테이블 (여기서 바로 계단석으로)
    { pos: [3.9, 1.7, 3.3], at: [6.0, 1.25, 1.3], fov: 60 },                       // 계단석 쪽으로 걸어감
    { pos: [6.0, 1.25, 1.0], at: [6.0, 1.32, 2.45], fov: 60, spot: 3 },            // 계단석에 앉아 스탠바이미로 메이킹 필름
    { pos: [5.7, 1.6, 3.4], at: [4.3, 1.3, 6.2], fov: 60 },                        // 미디어월 쪽으로
    { pos: [4.2, 1.7, 3.15], at: [4.2, 1.0, 6.6], fov: 60, spot: 4 },              // 단 위에 서서 체험대 · 미디어월
    { pos: [4.2, 1.9, 2.6], at: [4.2, 1.15, 6.6], fov: 62 },                       // 한 걸음 물러나 미디어월 전체
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
  const SPOT_U = { 1: 1, 2: 3, 3: 5, 4: 7 };   // PATH 안의 지점 번호
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
    // 커튼: 위에서 볼 때·입구 밖에 설 때는 닫힘 → 입구로 다가가며(PATH 1→2) 열림, 지나간 뒤엔 열린 채
    const ot = Math.min(1, Math.max(0, (cam.u - 1.12) / 0.55));
    gl.uniform1f(uOpen, ot * ot * (3 - 2 * ot));
    gl.uniform1f(uEnt, ENTZ);
    gl.drawArrays(gl.POINTS, 0, COUNT);
    ui(cam.u);
    if (visible) raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }, { rootMargin: '10% 0px' }).observe(sec);
})();
