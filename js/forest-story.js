/* =========================================================
   FEELD — OUR FOREST
   화면은 고정된 채 스크롤하면 사진이 아래에서 위로 넘어가고, 사진마다 오른쪽 글이 바뀜
   - 지금 사진: 가운데 / 지나간 사진: 위로 기울며 흐려짐 / 다음 사진: 아래에서 기울어진 채 대기
   - 사진마다 잠깐 머물도록 (넘어가는 구간만 움직임)
   ========================================================= */
(() => {
  const sec = document.querySelector('.forest');
  if (!sec) return;
  const frames = [...sec.querySelectorAll('.forest__frame')];
  const texts = [...sec.querySelectorAll('.forest__text')];
  const reel = sec.querySelector('.forest__reel');
  const N = frames.length;

  const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  // 스크롤 위치 → 사진 번호(소수). 각 사진에서 머무는 구간을 둬서 휙 넘어가지 않게
  function indexAt(p) {
    const x = Math.min(N - 1, Math.max(0, p * (N - 1)));
    const i = Math.floor(x), f = x - i;
    const HOLD = 0.22;                       // 앞뒤로 머무는 비율
    const t = Math.min(1, Math.max(0, (f - HOLD) / (1 - HOLD * 2)));
    return i + smooth(t);
  }
  function progress() {
    const r = sec.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  }

  // 위 사다리꼴 / 가운데 사각형 / 아래 사다리꼴 세 자리는 그대로 두고,
  // 사진이 그 자리를 원통처럼 돌아감: 위 자리를 지난 사진은 화면 위로 날아가지 않고 원통 뒤로 넘어가 사라지고,
  // 뒤를 돌아 아래 자리로 다시 나타남 (마지막 사진 다음엔 첫 사진 — 끝없이 도는 원통)
  let cur = 0, shown = -1, raf = 0, visible = false;
  function render() {
    const h = reel.clientHeight;
    frames.forEach((el, i) => {
      let d = ((i - cur) % N + N) % N;       // 원통 둘레에서의 위치
      if (d > N / 2) d -= N;                 // 0: 가운데, -1: 위, +1: 아래
      const a = Math.abs(d), sg = Math.sign(d);
      const back = Math.max(0, a - 1);       // 1을 넘으면 원통 뒤쪽으로 넘어가는 정도
      // 위·아래 자리(±1)까지는 전과 똑같이 움직이고, 그 뒤로는 더 멀리 가지 않고 안쪽으로 물러나며 작아짐
      const y = (a <= 1 ? d : sg * (1 - back * 0.35)) * h * 0.9;
      const rot = a <= 1 ? -d * 64 : -sg * Math.min(64 + back * 30, 84);
      const s = (1 - Math.min(a, 1) * 0.04) * (1 - Math.min(back, 1) * 0.25);
      el.style.transform = `translateY(${y.toFixed(1)}px) perspective(700px) rotateX(${rot.toFixed(2)}deg) scale(${s.toFixed(3)})`;
      const g = Math.min(a, 1);
      el.style.opacity = back >= 0.6 ? 0 : ((1 - g * 0.4) * (1 - back / 0.6)).toFixed(3);
      // 앞뒤 사진은 흐리고 회색빛으로 (시안의 흐린 회색 사다리꼴)
      el.style.filter = `blur(${(Math.min(a, 1.5) * 6).toFixed(1)}px) grayscale(${g}) brightness(${(1 + g * 0.7).toFixed(2)})`;
      el.style.zIndex = String(10 - Math.round(a * 3));
    });
    const k = Math.round(cur);
    if (k !== shown) {
      shown = k;
      texts.forEach((t, i) => t.classList.toggle('is-on', i === k));
    }
  }
  function loop() {
    raf = 0;
    const target = indexAt(progress());
    cur += (target - cur) * 0.08;            // 부드럽게 따라감
    if (Math.abs(target - cur) < 0.0005) cur = target;
    render();
    if (visible) raf = requestAnimationFrame(loop);
  }
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  }).observe(sec);
  addEventListener('resize', render);
  render();
})();
