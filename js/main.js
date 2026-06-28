/* ============================================================
   독이 된 5년 — 자립준비청년 공론화
   vanilla JS: reveal-on-scroll, count-up, cliff chart draw,
   archive render + tag/search filter, progress bar, share.
   ============================================================ */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- 2. Count-up stats ---------- */
  const countEls = document.querySelectorAll('[data-count]');
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const dur = 1400;
    const start = performance.now();
    const fmt = (v) =>
      prefix + v.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

    if (prefersReduced) { el.textContent = fmt(target); return; }

    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target);
    };
    requestAnimationFrame(tick);
  };

  if (!('IntersectionObserver' in window)) {
    countEls.forEach(animateCount);
  } else {
    const co = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); }
        });
      },
      { threshold: 0.6 }
    );
    countEls.forEach((el) => co.observe(el));
  }

  /* ---------- 3. Cliff chart draw-on ---------- */
  const cliffSvg = document.querySelector('.cliff-svg');
  if (cliffSvg) {
    // set dash length per path so the draw animation works
    cliffSvg.querySelectorAll('.line').forEach((path) => {
      const len = path.getTotalLength();
      path.style.setProperty('--len', len);
    });
    const drawIt = () => cliffSvg.classList.add('drawn');
    if (prefersReduced || !('IntersectionObserver' in window)) {
      drawIt();
    } else {
      const so = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (e.isIntersecting) { drawIt(); obs.unobserve(e.target); }
          });
        },
        { threshold: 0.4 }
      );
      so.observe(cliffSvg);
    }
  }

  /* ---------- 4. Progress bar ---------- */
  const progress = document.getElementById('progress');
  if (progress) {
    let ticking = false;
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      progress.style.width = Math.min(scrolled * 100, 100) + '%';
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------- 5. Share button ---------- */
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const data = {
        title: document.title,
        text: '지원금을 줄이자는 말이 아니다. 자립을 시작하는 순간 손해처럼 보이는 구조를 바꾸자는 말이다.',
        url: location.href,
      };
      try {
        if (navigator.share) { await navigator.share(data); }
        else {
          await navigator.clipboard.writeText(location.href);
          const prev = shareBtn.textContent;
          shareBtn.textContent = '링크 복사됨 ✓';
          setTimeout(() => (shareBtn.textContent = prev), 1800);
        }
      } catch (_) { /* user cancelled */ }
    });
  }

  /* ---------- 6. Archive: load, render, filter ---------- */
  const grid = document.getElementById('archive-grid');
  const tagsBox = document.getElementById('archive-tags');
  const searchInput = document.getElementById('archive-search');
  const emptyMsg = document.getElementById('archive-empty');

  let resources = [];
  const state = { tags: new Set(), query: '' };

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const cardHTML = (r) => `
    <article class="rcard" id="res-${esc(r.id)}">
      <h3>${esc(r.title)}</h3>
      <p class="rcard__summary">${esc(r.summary)}</p>
      <div class="rcard__tags">
        ${(r.tags || []).map((t) => `<span class="rcard__tag">${esc(t)}</span>`).join('')}
      </div>
      <p class="rcard__conn"><strong>우리 주장과의 연결고리 ·</strong> ${esc(r.connection)}</p>
      <a class="rcard__link" href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">출처 보기 →</a>
    </article>`;

  const render = () => {
    if (!grid) return;
    const q = state.query.trim().toLowerCase();
    const filtered = resources.filter((r) => {
      const tagOk = state.tags.size === 0 || (r.tags || []).some((t) => state.tags.has(t));
      const hay = (r.title + ' ' + r.summary + ' ' + r.connection + ' ' + (r.tags || []).join(' ')).toLowerCase();
      const qOk = !q || hay.includes(q);
      return tagOk && qOk;
    });
    grid.innerHTML = filtered.map(cardHTML).join('');
    if (emptyMsg) emptyMsg.hidden = filtered.length !== 0;
  };

  const buildTagFilters = () => {
    if (!tagsBox) return;
    const all = [...new Set(resources.flatMap((r) => r.tags || []))];
    tagsBox.innerHTML = all
      .map((t) => `<button class="tag-btn" type="button" aria-pressed="false" data-tag="${esc(t)}">${esc(t)}</button>`)
      .join('');
    tagsBox.querySelectorAll('.tag-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        if (state.tags.has(tag)) { state.tags.delete(tag); btn.setAttribute('aria-pressed', 'false'); }
        else { state.tags.add(tag); btn.setAttribute('aria-pressed', 'true'); }
        render();
      });
    });
  };

  if (searchInput) {
    searchInput.addEventListener('input', (e) => { state.query = e.target.value; render(); });
  }

  // "자세히 → 자료 아카이브" jump links flash the matching card
  document.querySelectorAll('[data-jump]').forEach((a) => {
    a.addEventListener('click', () => {
      const id = a.dataset.jump;
      // clear filters so the target is visible
      state.tags.clear(); state.query = '';
      if (searchInput) searchInput.value = '';
      tagsBox && tagsBox.querySelectorAll('.tag-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      render();
      requestAnimationFrame(() => {
        const card = document.getElementById('res-' + id);
        if (card) {
          card.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
          card.classList.add('flash');
          setTimeout(() => card.classList.remove('flash'), 2200);
        }
      });
    });
  });

  fetch('resources.json')
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((data) => {
      resources = Array.isArray(data) ? data : [];
      buildTagFilters();
      render();
    })
    .catch((err) => {
      console.error('[archive] resources.json 로드 실패:', err);
      if (grid) {
        grid.innerHTML =
          '<p class="archive__empty">자료를 불러오지 못했습니다. 로컬에서 열 때는 정적 서버(예: <code>python -m http.server</code>)로 실행해 주세요.</p>';
      }
    });
})();
