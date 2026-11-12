/* =========================================================
   FEELD — POSTCARD
   A. 떠다니는 엽서들 (클릭하면 크게 보고 앞뒤 뒤집기)
   B. "나의 엽서 만들기"
      1 사진 고르기 → (엽서가 뒷면으로 뒤집힘)
      2 우표 고르기 → (엽서가 커짐)
      3 글쓰기 → 우표를 클릭하면 도장이 찍히고
        → 엽서가 작아지며 떠다니는 엽서들 사이로 날아감
   저장: 지금은 이 브라우저(localStorage)에만 저장.
         나중에 Supabase를 연결하면 Store 부분만 바꾸면 됨.
   ========================================================= */
(() => {
  const sec = document.querySelector('.post');
  if (!sec) return;

  const BASE = 'assets/postcard/';
  const PHOTOS = [1, 2, 3, 4, 5, 6].map((n) => `${BASE}photo${n}.webp`);   // 임시 사진
  const STAMPS = [1, 2, 3, 4, 5, 6].map((n) => `${BASE}stamp${n}.webp`);
  const MAX_TEXT = 100;
  const MAX_FLOAT = 15;          // 화면에 떠다니는 최대 장수
  const IDLE_MS = 90 * 1000;     // 전시장용: 만들다 90초 동안 손대지 않으면 처음으로

  /* ---------- 저장소 (나중에 Supabase로 교체할 부분) ---------- */
  const KEY = 'feeld-postcards-v1';
  const SEED = [
    { photo: 0, stamp: 2, text: '숲길에서 들은 새소리가\n아직도 귀에 남아 있어요.' },
    { photo: 2, stamp: 0, text: '메타세쿼이아 사이로 지나가던 바람을 보냅니다.' },
    { photo: 3, stamp: 4, text: '천천히 걸어야 보이는 것들이 있어요.' },
    { photo: 1, stamp: 5, text: '손끝으로 이끼를 만지니\n숲이 다시 깨어났어요.' },
    { photo: 4, stamp: 1, text: '빛의 입자가 모여 숲이 되는 순간, 잠깐 숨을 참았어요.' },
    { photo: 5, stamp: 3, text: '다음엔 그 숲길을 직접 걸어보고 싶어요.' },
    { photo: 0, stamp: 4, text: '오늘의 숲을 당신에게.' },
    { photo: 2, stamp: 2, text: '함께 걸어줘서 고마워요.\n— 잇다' },
  ];
  const Store = {
    list() {
      let mine = [];
      try { mine = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
      return [...mine].reverse().concat(SEED.map((d, i) => ({ ...d, id: 'seed' + i })));
    },
    add(card) {
      try {
        const mine = JSON.parse(localStorage.getItem(KEY) || '[]');
        mine.push(card);
        localStorage.setItem(KEY, JSON.stringify(mine.slice(-200)));
      } catch (e) {}
      return Promise.resolve(card);
    },
  };

  /* ---------- 엽서 한 장 만들기 ---------- */
  function makeCard(d, { editable = false } = {}) {
    const el = document.createElement('div');
    el.className = 'pc';
    el.innerHTML = `
      <div class="pc__inner">
        <div class="pc__face pc__front">
          <img class="pc__tpl" src="${BASE}front.webp" alt="" draggable="false" />
          <img class="pc__photo" alt="" draggable="false" />
        </div>
        <div class="pc__face pc__back">
          <img class="pc__tpl" src="${BASE}back.webp" alt="" draggable="false" />
          <img class="pc__stamp" alt="" draggable="false" />
          <img class="pc__mark" src="${BASE}postmark.svg" alt="" draggable="false" />
          ${editable
            ? `<textarea class="pc__text" maxlength="${MAX_TEXT}" spellcheck="false" aria-label="엽서에 쓸 글 (100자 이내)" tabindex="-1"></textarea>
               <button class="pc__stamp-hit" type="button" aria-label="우표에 도장 찍기" tabindex="-1"></button>`
            : `<p class="pc__text"></p>`}
        </div>
      </div>`;
    setCard(el, d);
    return el;
  }
  function setCard(el, d) {
    const ph = el.querySelector('.pc__photo');
    const st = el.querySelector('.pc__stamp');
    if (d.photo != null) ph.src = PHOTOS[d.photo % PHOTOS.length]; else ph.removeAttribute('src');
    if (d.stamp != null) st.src = STAMPS[d.stamp % STAMPS.length]; else st.removeAttribute('src');
    const tx = el.querySelector('.pc__text');
    if (tx && tx.tagName === 'P') tx.textContent = d.text || '';
    if (d.marked) el.classList.add('is-marked');
    el.style.setProperty('--mr', '0deg');   // 도장은 디자인 위치 그대로 (회전 없음)
  }

  /* ---------- A. 떠다니는 엽서 ---------- */
  const floatBox = sec.querySelector('.post__float');
  let floats = [];   // { el, fly, x, y, r, ph, sp, d }

  // 겹침이 덜하도록 격자 칸을 섞어서 배치.
  // x는 "한 바퀴(화면 너비 + 엽서 한 장)" 안에서의 비율 0~1 → 오른쪽에서 왼쪽으로 흘러가다 다시 오른쪽에서 나옴
  const COLS = 5, ROWS = 3;
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ c, r });
  function cellPos(i) {
    const { c, r } = cells[i % cells.length];
    const jx = (Math.sin(i * 12.9898) * 43758.5453) % 1, jy = (Math.sin(i * 78.233) * 12345.678) % 1;
    return {
      fx: (c + (r % 2) * 0.5 + Math.abs(jx) * 0.25) / COLS,  // 0~1
      y: 7 + r * 26 + Math.abs(jy) * 8,                       // %
    };
  }
  const order = cells.map((_, i) => i).sort((a, b) => ((a * 7 + 3) % 15) - ((b * 7 + 3) % 15));

  const DRIFT = 1.5;   // 왼쪽으로 흐르는 속도 (u/초, 1u ≈ 화면 너비 1%)
  let shift = 0;       // 지금까지 흘러간 거리(px)
  const unit = () => Math.min(innerWidth / 100, innerHeight * 0.0178);
  const lane = () => {                 // 한 바퀴 길이와 엽서 너비
    const cw = unit() * 15.4;
    return { cw, P: floatBox.clientWidth + cw * 1.4 };
  };
  // 원근: z 0(뒤) ~ 1(앞). 뒤쪽 엽서는 작고 흐리고 어둡고 느리게, 앞쪽은 크고 선명하고 조금 빠르게
  const DEPTH = [0, 0.5, 1];
  const depthOf = (slot) => DEPTH[(slot * 7 + 1) % 3];
  const sizeOf = (z) => 0.74 + z * 0.34;
  const speedOf = (z) => 0.75 + z * 0.4;
  function baseX(f, L = lane()) {       // 흐름에 따른 x(px), 화면 왼쪽 밖 ~ 오른쪽 밖
    const m = ((f.fx * L.P - shift * f.k) % L.P + L.P) % L.P;
    return m - L.cw * 1.2;
  }
  function place(f, t = 0, L = lane()) {
    const u = unit();
    const a = t * 0.22 * f.sp + f.ph;
    const x = baseX(f, L) + Math.sin(a) * u * 1.4 + Math.sin(a * 0.37 + 1.3) * u * 0.8;
    const y = Math.cos(a * 0.83) * u * 1.1 + Math.sin(a * 0.51) * u * 0.6;
    const r = f.r + Math.sin(a * 0.7) * 1.6;
    f.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(2)}deg) scale(${f.s.toFixed(3)})`;
  }

  function addFloat(d, slot, front = true, fx = null, z = null) {
    const wrap = document.createElement('div');
    wrap.className = 'pcf';
    const fly = document.createElement('div');
    fly.className = 'pcf__fly';
    const card = makeCard(d);
    if (!front) card.classList.add('is-flipped');
    fly.appendChild(card);
    wrap.appendChild(fly);
    const p = cellPos(order[slot % order.length]);
    wrap.style.left = '0';
    wrap.style.top = p.y + '%';
    const zz = z ?? depthOf(slot);
    wrap.style.setProperty('--z', zz);
    wrap.style.setProperty('--zi', String(1 + Math.round(zz * 2)));
    const f = {
      el: wrap, fly, card, d, slot,
      z: zz, s: sizeOf(zz), k: speedOf(zz),
      fx: fx ?? p.fx,
      r: (Math.random() * 2 - 1) * 7,
      ph: Math.random() * Math.PI * 2,
      sp: 0.6 + Math.random() * 0.5,
    };
    wrap.addEventListener('click', () => openViewer(f.d));
    floatBox.appendChild(wrap);
    floats.push(f);
    place(f, elapsed);
    return f;
  }

  function buildFloats() {
    floatBox.innerHTML = '';
    floats = [];
    Store.list().slice(0, MAX_FLOAT).forEach((d, i) => addFloat(d, i));
  }

  // 둥둥 떠다니면서 오른쪽 → 왼쪽으로 천천히 흘러감 (보일 때만 움직임)
  let visible = false, raf = 0, last = 0, elapsed = 0;
  function loop(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    elapsed += dt;
    shift += DRIFT * unit() * dt;
    const L = lane();
    for (const f of floats) place(f, elapsed, L);
    if (visible) raf = requestAnimationFrame(loop);
    else last = 0;
  }
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(loop); }
  }).observe(sec);

  /* ---------- C. 크게 보기 ---------- */
  const viewer = sec.querySelector('.post__viewer');
  function openViewer(d) {
    viewer.innerHTML = '';
    const card = makeCard({ ...d, marked: true });
    card.addEventListener('click', (e) => { e.stopPropagation(); card.classList.toggle('is-flipped'); });
    viewer.appendChild(card);
    const hint = document.createElement('p');
    hint.className = 'post__viewer-hint';
    hint.textContent = '엽서를 누르면 뒷면을 볼 수 있어요';
    viewer.appendChild(hint);
    sec.classList.add('is-viewing');
    viewer.setAttribute('aria-hidden', 'false');
  }
  function closeViewer() {
    sec.classList.remove('is-viewing');
    viewer.setAttribute('aria-hidden', 'true');
  }
  viewer.addEventListener('click', closeViewer);

  /* ---------- B. 만들기 ---------- */
  const maker = sec.querySelector('.post__maker');
  const stage = sec.querySelector('.post__stage');
  const nextBtn = sec.querySelector('.post__nextstep');
  const openBtn = sec.querySelector('.post__open');
  let draft = null, card = null, step = 0, idleT = 0, busy = false, recycle = 0;

  // 고르기 목록 (사진 / 우표) + 화살표로 넘기기
  function buildPicker(trackSel, list, onPick, VIS) {
    const track = sec.querySelector(trackSel);
    const picker = track.closest('.post__picker');
    const prev = picker.querySelector('.post__prev'), next = picker.querySelector('.post__next');
    track.innerHTML = '';
    const items = list.map((src, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'post__item';
      b.innerHTML = `<img src="${src}" alt="" draggable="false" />`;
      b.setAttribute('aria-label', `${i + 1}번`);
      b.addEventListener('click', () => {
        items.forEach((x) => x.classList.toggle('is-on', x === b));
        onPick(i);
      });
      track.appendChild(b);
      return b;
    });
    let pos = 0;   // VIS: 한 번에 보이는 개수 (넘치면 화살표로 넘김)
    function update() {
      const it = items[0];
      const stepPx = it.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
      track.style.transform = `translateX(${-pos * stepPx}px)`;
      prev.disabled = pos <= 0;
      next.disabled = pos >= Math.max(0, items.length - VIS);
    }
    prev.onclick = () => { pos = Math.max(0, pos - 1); update(); };
    next.onclick = () => { pos = Math.min(Math.max(0, items.length - VIS), pos + 1); update(); };
    return { reset() { pos = 0; items.forEach((x) => x.classList.remove('is-on')); update(); }, update };
  }
  const photoPicker = buildPicker('.post__photos', PHOTOS, (i) => {
    draft.photo = i; setCard(card, draft); nextBtn.disabled = false; poke();
  }, 5);
  const stampPicker = buildPicker('.post__stamps', STAMPS, (i) => {
    draft.stamp = i; setCard(card, draft); nextBtn.disabled = false; poke();
    const st = card.querySelector('.pc__stamp');
    st.classList.remove('is-drop'); void st.offsetWidth; st.classList.add('is-drop');
  }, 6);

  function setStep(n) {
    step = n;
    maker.dataset.step = String(n);
    if (n === 1) { card.classList.remove('is-flipped'); nextBtn.disabled = draft.photo == null; }
    if (n === 2) { card.classList.add('is-flipped'); nextBtn.disabled = draft.stamp == null; }
    if (n === 3) {
      const ta = card.querySelector('textarea');
      ta.tabIndex = 0;
      card.querySelector('.pc__stamp-hit').tabIndex = 0;
      setTimeout(() => ta.focus({ preventScroll: true }), 900);
    }
  }

  function openMaker() {
    closeViewer();
    draft = { photo: null, stamp: null, text: '', mr: Math.round((Math.random() * 2 - 1) * 12) };
    stage.innerHTML = '';
    card = makeCard(draft, { editable: true });
    stage.appendChild(card);
    wireCard();
    photoPicker.reset(); stampPicker.reset();
    sec.classList.add('is-making');
    maker.setAttribute('aria-hidden', 'false');
    setStep(1);
    requestAnimationFrame(() => { photoPicker.update(); stampPicker.update(); });
    poke();
  }
  function closeMaker() {
    sec.classList.remove('is-making');
    maker.setAttribute('aria-hidden', 'true');
    maker.dataset.step = '0';
    clearTimeout(idleT);
  }

  function wireCard() {
    const ta = card.querySelector('textarea');
    // 5줄 · 100자 안에서만 쓰기 (넘치면 마지막 입력 취소)
    let last = '';
    ta.addEventListener('input', () => {
      if (ta.scrollHeight > ta.clientHeight + 2) { ta.value = last; }
      last = ta.value;
      draft.text = ta.value;
      poke();
    });
    ta.addEventListener('keydown', (e) => e.stopPropagation());
    card.querySelector('.pc__stamp-hit').addEventListener('click', stampIt);
  }

  nextBtn.addEventListener('click', () => { if (step < 3) setStep(step + 1); poke(); });
  openBtn.addEventListener('click', openMaker);

  // 3단계: 우표 클릭 → 도장 → 완성 → 떠다니는 엽서로 날아감
  function stampIt() {
    if (step !== 3 || busy) return;
    const ta = card.querySelector('textarea');
    if (!ta.value.trim()) {                      // 글을 안 썼으면 살짝 흔들어 알려줌
      ta.focus({ preventScroll: true });
      card.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-1.2%)' }, { transform: 'translateX(1.2%)' }, { transform: 'translateX(0)' }],
        { duration: 360, easing: 'ease-in-out' });
      return;
    }
    busy = true;
    draft.text = ta.value.trim();
    draft.marked = true;
    draft.ts = Date.now();
    draft.id = 'u' + draft.ts;
    ta.blur(); ta.readOnly = true;
    const mark = card.querySelector('.pc__mark');
    card.classList.add('is-marked');
    mark.classList.remove('is-thump'); void mark.offsetWidth; mark.classList.add('is-thump');
    Store.add({ ...draft });
    setTimeout(flyAway, 1100);
  }

  function flyAway() {
    const from = card.getBoundingClientRect();
    // 꽉 차면 가장 오래된 엽서를 빼고, 새 엽서는 화면 오른쪽 부분에 넣어 오래 보이게 함
    const slot = floats.length < MAX_FLOAT ? floats.length : (recycle++ % MAX_FLOAT);
    if (floats.length >= MAX_FLOAT) {
      const old = floats.find((f) => f.slot === slot) || floats[0];
      old.el.remove(); floats = floats.filter((f) => f !== old);
    }
    const L = lane();
    const want = floatBox.clientWidth * 0.6;                       // 지금 화면 x 위치(px)
    const fx = ((((want + L.cw * 1.2 + shift * speedOf(1)) / L.P) % 1) + 1) % 1;
    const f = addFloat({ ...draft }, slot, false, fx, 1);   // 뒷면이 보이는 상태로 시작, 새 엽서는 맨 앞 줄
    // 3줄 중 그 근처에 다른 엽서가 가장 적은 줄로
    const H = floatBox.clientHeight, others = floats.filter((o) => o !== f);
    let best = 0, bestD = -1;
    [10, 36, 62].forEach((yp) => {
      const cx = want, cy = H * yp / 100;
      const d = Math.min(...others.map((o) => {
        const r = o.el.getBoundingClientRect(), b = floatBox.getBoundingClientRect();
        return Math.hypot((r.left - b.left - cx) / 1.8, r.top - b.top - cy);
      }), 1e9);
      if (d > bestD) { bestD = d; best = yp; }
    });
    f.el.style.top = best + '%';
    f.el.classList.add('is-new');
    const to = f.fly.getBoundingClientRect();
    const s = from.width / to.width;
    // 바깥(.pcf)이 scale(f.s) 되어 있으므로 이동 거리는 그만큼 나눠 줌
    const dx = ((from.left + from.width / 2) - (to.left + to.width / 2)) / f.s;
    const dy = ((from.top + from.height / 2) - (to.top + to.height / 2)) / f.s;
    f.fly.style.transition = 'none';
    f.fly.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    f.el.style.zIndex = 10;
    stage.style.visibility = 'hidden';
    closeMaker();
    void f.fly.offsetWidth;
    f.fly.style.transition = 'transform 1.8s cubic-bezier(.45,.05,.2,1)';
    f.fly.style.transform = '';
    setTimeout(() => f.card.classList.remove('is-flipped'), 500);   // 날아가는 중에 앞면으로
    setTimeout(() => {
      f.el.style.zIndex = '';
      stage.style.visibility = '';
      busy = false;
    }, 1900);
  }

  // 전시장용: 오래 손대지 않으면 처음 화면으로
  function poke() {
    clearTimeout(idleT);
    if (sec.classList.contains('is-making')) idleT = setTimeout(() => { if (!busy) closeMaker(); }, IDLE_MS);
  }
  sec.addEventListener('pointerdown', poke);

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (sec.classList.contains('is-viewing')) closeViewer();
    else if (sec.classList.contains('is-making') && !busy) closeMaker();
  });
  addEventListener('resize', () => { photoPicker.update(); stampPicker.update(); });

  buildFloats();
})();
