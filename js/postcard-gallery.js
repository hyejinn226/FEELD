/* =========================================================
   FEELD — 저장된 엽서 모아보기 (postcards.html)
   - 전시 때 백업한 엽서(assets/postcard/archive.json)를 만든 순서대로(No.001부터) 정렬해 보여 줌
   - 목록은 글 면(뒷면)으로 보이고, 엽서를 누르면 크게 보기 → 크게 본 엽서를 누르면 사진 면(앞면)으로 뒤집힘
   - 엽서마다 [엽서 저장] → 사진 면 위, 글 면 아래로 붙인 PNG 한 장(2112×2452)으로 다운로드
   ========================================================= */
(() => {
  const grid = document.querySelector('.pg__grid');
  if (!grid) return;
  const ARCHIVE = 'assets/postcard/archive.json';
  const BASE = 'assets/postcard/';
  const PHOTO = (n) => `${BASE}photo${(n % 6) + 1}.webp`;
  const STAMP = (n) => `${BASE}stamp${(n % 6) + 1}.webp`;
  const countEl = document.querySelector('.pg__count');
  const emptyEl = document.querySelector('.pg__empty');
  const pad = (n, l = 2) => String(n).padStart(l, '0');

  /* ---------- 데이터 (전시 엽서 백업 파일) ---------- */
  let cards = [];

  /* ---------- 예전 사파리(cqw 미지원)용: 엽서 너비를 --cw로 ---------- */
  const needCw = !(window.CSS && CSS.supports && CSS.supports('width', '1cqw'));
  const cwRO = needCw && 'ResizeObserver' in window
    ? new ResizeObserver((list) => list.forEach((en) => en.target.style.setProperty('--cw', en.target.offsetWidth + 'px')))
    : null;

  /* ---------- 화면에 그리기 ---------- */
  function render() {
    grid.innerHTML = '';
    const list = cards.map((c, i) => ({ c, no: i + 1 }));   // 번호는 만든 순서, 화면도 No.001(가장 처음 엽서)부터
    countEl.textContent = cards.length ? `모두 ${cards.length}장` : '';
    emptyEl.hidden = cards.length > 0;
    const frag = document.createDocumentFragment();
    list.forEach(({ c, no }) => frag.appendChild(item(c, no)));
    grid.appendChild(frag);
  }

  const whenOf = (c) => {
    const w = c.ts ? new Date(c.ts) : null;
    return w ? `${w.getMonth() + 1}월 ${w.getDate()}일 ${pad(w.getHours())}:${pad(w.getMinutes())}` : '';
  };
  // 엽서 한 장 (처음엔 글 면이 보이게 is-flipped)
  const pcHtml = (c, lazy) => {
    const L = lazy ? ' loading="lazy"' : '';
    return `
        <span class="pc__inner">
          <span class="pc__face pc__front">
            <img class="pc__tpl" src="${BASE}front.webp" alt=""${L} draggable="false" />
            <img class="pc__photo" src="${PHOTO(c.photo || 0)}" alt=""${L} draggable="false" />
          </span>
          <span class="pc__face pc__back">
            <img class="pc__tpl" src="${BASE}back.webp" alt=""${L} draggable="false" />
            <img class="pc__stamp" src="${STAMP(c.stamp || 0)}" alt=""${L} draggable="false" />
            <img class="pc__mark" src="${BASE}postmark.svg" alt=""${L} draggable="false" />
            <span class="pc__text"></span>
          </span>
        </span>`;
  };
  const fillPc = (pc, c) => {
    pc.className = 'pc is-flipped' + (c.marked !== false ? ' is-marked' : '');
    pc.querySelector('.pc__text').textContent = c.text || '';
    pc.style.setProperty('--mr', '0deg');
    if (cwRO) cwRO.observe(pc);
  };

  function item(c, no) {
    const li = document.createElement('li');
    li.className = 'pg__item';
    li.innerHTML = `
      <button type="button" class="pc" aria-label="엽서 ${no}번 크게 보기">${pcHtml(c, true)}</button>
      <div class="pg__meta">
        <span class="pg__no">No.${pad(no, 3)}</span><span class="pg__when">${whenOf(c)}</span>
        <span class="pg__dl">
          <button type="button" class="pg__btn">엽서 저장</button>
        </span>
      </div>`;
    const pc = li.querySelector('.pc');
    fillPc(pc, c);
    pc.addEventListener('click', () => openLb(no - 1));
    const btn = li.querySelector('.pg__btn');
    btn.addEventListener('click', () => download(c, no, btn));
    return li;
  }

  /* ---------- 크게 보기 ----------
     엽서를 누르면 화면 가운데에 크게 (글 면 먼저). 크게 본 엽서를 누르면 앞뒤 뒤집기.
     ‹ › 버튼·키보드 ←→로 이전/다음, ×·바깥 클릭·Esc로 닫기 */
  const lb = document.createElement('div');
  lb.className = 'pg__lb';
  lb.hidden = true;
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', '엽서 크게 보기');
  lb.innerHTML = `
    <button type="button" class="pg__lb-close" aria-label="닫기">×</button>
    <button type="button" class="pg__lb-nav pg__lb-prev" aria-label="이전 엽서">‹</button>
    <div class="pg__lb-body">
      <button type="button" class="pc" aria-label="눌러서 앞뒤 뒤집기"></button>
      <div class="pg__meta pg__lb-meta">
        <span class="pg__no"></span><span class="pg__when"></span>
        <span class="pg__lb-hint">엽서를 누르면 앞뒤가 뒤집혀요</span>
        <span class="pg__dl"><button type="button" class="pg__btn">엽서 저장</button></span>
      </div>
    </div>
    <button type="button" class="pg__lb-nav pg__lb-next" aria-label="다음 엽서">›</button>`;
  document.body.appendChild(lb);
  const lbPc = lb.querySelector('.pg__lb-body .pc');
  const lbNo = lb.querySelector('.pg__lb-meta .pg__no');
  const lbWhen = lb.querySelector('.pg__lb-meta .pg__when');
  const lbBtn = lb.querySelector('.pg__lb-meta .pg__btn');
  let cur = -1;
  function showLb(i) {
    cur = (i + cards.length) % cards.length;
    const c = cards[cur];
    lbPc.innerHTML = pcHtml(c, false);
    fillPc(lbPc, c);
    lbNo.textContent = `No.${pad(cur + 1, 3)}`;
    lbWhen.textContent = whenOf(c);
  }
  function openLb(i) {
    showLb(i);
    lb.hidden = false;
    document.documentElement.classList.add('pg-lb-open');
    requestAnimationFrame(() => lb.classList.add('is-on'));
    lb.querySelector('.pg__lb-close').focus({ preventScroll: true });
  }
  function closeLb() {
    lb.classList.remove('is-on');
    document.documentElement.classList.remove('pg-lb-open');
    setTimeout(() => { if (!lb.classList.contains('is-on')) lb.hidden = true; }, 300);
  }
  lbPc.addEventListener('click', () => lbPc.classList.toggle('is-flipped'));
  lb.querySelector('.pg__lb-close').addEventListener('click', closeLb);
  lb.querySelector('.pg__lb-prev').addEventListener('click', () => showLb(cur - 1));
  lb.querySelector('.pg__lb-next').addEventListener('click', () => showLb(cur + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('pg__lb-body')) closeLb(); });
  lbBtn.addEventListener('click', () => download(cards[cur], cur + 1, lbBtn));
  addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') showLb(cur - 1);
    else if (e.key === 'ArrowRight') showLb(cur + 1);
  });

  /* ---------- PNG 만들기 (사이트 엽서와 같은 비율·위치로 canvas에 그림) ---------- */
  const W = 2112, H = 1226;
  const cache = new Map();
  const loadImg = (src) => {
    if (!cache.has(src)) cache.set(src, new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; }));
    return cache.get(src);
  };
  // SVG는 목표 크기로 width/height를 바꿔 그림 (예전 사파리가 SVG를 늘려 그리지 못하는 문제 피하기)
  async function loadSvg(src, w) {
    const k = src + '@' + w;
    if (!cache.has(k)) cache.set(k, (async () => {
      const txt = await (await fetch(src)).text();
      const vb = /viewBox="\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/.exec(txt);
      const ratio = vb ? (+vb[2] / +vb[1]) : 154.09 / 278.28;
      const h = Math.round(w * ratio);
      const svg = txt.replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1')
        .replace(/<svg/, `<svg width="${w}" height="${h}"`);
      const im = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      return { im, h };
    })());
    return cache.get(k);
  }
  const cover = (ctx, im, x, y, w, h) => {
    const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const sw = w / s, sh = h / s;
    ctx.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  };
  const contain = (ctx, im, x, y, w, h) => {
    const s = Math.min(w / im.naturalWidth, h / im.naturalHeight);
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  };
  // 글 줄바꿈: 사이트 엽서와 같게 — 입력한 줄바꿈(\n)은 그대로, 넘치면 글자 단위로 다음 줄 (word-break: break-all)
  function wrap(ctx, text, maxW) {
    const out = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const ch of para) {
        if (ctx.measureText(line + ch).width > maxW && line && ch !== ' ') { out.push(line.replace(/\s+$/, '')); line = ''; }
        line += ch;
      }
      out.push(line.replace(/\s+$/, ''));
    }
    return out;
  }

  async function drawCard(c, side) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    if (side === 'front') {
      const [tpl, ph] = await Promise.all([loadImg(BASE + 'front.webp'), loadImg(PHOTO(c.photo || 0))]);
      ctx.drawImage(tpl, 0, 0, W, H);
      cover(ctx, ph, 0, H * 0.08, W, H * 0.84);
    } else {
      const markW = Math.round(W * 0.26352);
      const [tpl, st, mk] = await Promise.all([loadImg(BASE + 'back.webp'), loadImg(STAMP(c.stamp || 0)), loadSvg(BASE + 'postmark.svg', markW)]);
      ctx.drawImage(tpl, 0, 0, W, H);
      ctx.save();
      ctx.shadowColor = 'rgba(40,46,36,.22)'; ctx.shadowBlur = W * 0.005; ctx.shadowOffsetY = W * 0.0025;
      contain(ctx, st, W * 0.8184, H * 0.0663, W * 0.14262, H * 0.30667);
      ctx.restore();
      if (c.marked !== false) ctx.drawImage(mk.im, W * 0.7266, H * 0.1172, markW, mk.h);
      // 글: 나눔명조, 엽서 너비의 1.761% 크기, 줄 간격 5.068%, 쓰기 줄 위에 앉도록 1.05% 아래로
      const fs = W * 0.01761, lh = W * 0.05068;
      try { await document.fonts.load(`400 ${fs}px "Nanum Myeongjo"`, c.text || '가'); } catch (e) {}
      ctx.font = `400 ${fs}px "Nanum Myeongjo", serif`;
      ctx.fillStyle = '#5e6b59';
      ctx.textBaseline = 'alphabetic';
      const x = W * 0.5411, y0 = H * 0.464 + W * 0.0105, boxW = W * 0.4029, boxH = H * 0.4365;
      const m = ctx.measureText('가Ag');
      const asc = m.fontBoundingBoxAscent || fs * 0.85, desc = m.fontBoundingBoxDescent || fs * 0.25;
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 2, H * 0.464, boxW + 4, boxH + W * 0.0105); ctx.clip();
      wrap(ctx, c.text || '', boxW).forEach((ln, k) => {
        ctx.fillText(ln, x, y0 + lh * k + (lh - (asc + desc)) / 2 + asc);
      });
      ctx.restore();
    }
    return cv;
  }

  // 사진 면(위) + 글 면(아래)을 붙인 한 장
  async function drawBoth(c) {
    const [front, back] = await Promise.all([drawCard(c, 'front'), drawCard(c, 'back')]);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H * 2;
    const ctx = cv.getContext('2d');
    ctx.drawImage(front, 0, 0);
    ctx.drawImage(back, 0, H);
    return cv;
  }

  async function download(c, no, btn) {
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = '만드는 중…';
    try {
      const cv = await drawBoth(c);
      const blob = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `feeld-postcard-${pad(no, 3)}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      btn.textContent = '저장됨';
    } catch (e) {
      btn.textContent = '저장 실패';
    }
    setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1600);
  }

  /* ---------- 불러오기 ---------- */
  fetch(ARCHIVE, { cache: 'no-cache' })
    .then((r) => r.json())
    .then((data) => {
      cards = (Array.isArray(data) ? data : data.cards || []).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
      render();
    })
    .catch(() => { emptyEl.hidden = false; });
})();
