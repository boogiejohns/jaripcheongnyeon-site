// 기고문/인터뷰 목록 · 개별 글 보기 (+ 댓글). 페이지의 data-kind로 종류 구분.
import { supabase, esc, fmtDate, renderBody } from './db.js';
import { initComments } from './comments.js';

const listView = document.getElementById('article-list');
const singleView = document.getElementById('article-single');

const KIND = listView.dataset.kind === 'interview' ? 'interview' : 'article';
const LABEL = KIND === 'interview' ? '인터뷰' : '기고문';
const BACK = KIND === 'interview' ? 'interviews.html' : 'gigo.html';

const excerpt = (body, n = 120) => {
  const t = body.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
};

async function showList() {
  singleView.hidden = true;
  listView.hidden = false;

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, author, body, created_at')
    .eq('published', true)
    .eq('kind', KIND)
    .order('created_at', { ascending: false });

  if (error) {
    listView.innerHTML = `<p class="archive__empty">${LABEL}을(를) 불러오지 못했습니다.</p>`;
    console.error('[articles] list', error);
    return;
  }
  if (!data.length) {
    listView.innerHTML = `<p class="archive__empty">아직 등록된 ${LABEL}이(가) 없습니다. 곧 채워집니다.</p>`;
    return;
  }
  listView.innerHTML = data
    .map(
      (a) => `
      <article class="art-card">
        <h2><a href="?id=${encodeURIComponent(a.id)}">${esc(a.title)}</a></h2>
        <p class="art-card__meta">${esc(a.author || '익명')} · ${fmtDate(a.created_at)}</p>
        <p class="art-card__excerpt">${esc(excerpt(a.body))}</p>
        <a class="art-card__more" href="?id=${encodeURIComponent(a.id)}">전문 읽기 →</a>
      </article>`
    )
    .join('');
}

async function showSingle(id) {
  listView.hidden = true;
  singleView.hidden = false;
  singleView.innerHTML = `<p class="archive__empty">불러오는 중…</p>`;

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .single();

  if (error || !data) {
    singleView.innerHTML = `<p class="archive__empty">글을 찾을 수 없습니다. <a href="${BACK}">목록으로</a></p>`;
    return;
  }

  document.title = `${data.title} — 자립준비청년 공론화`;
  singleView.innerHTML = `
    <a class="back-link" href="${BACK}">← ${LABEL} 목록</a>
    <article class="art-full">
      <h1>${esc(data.title)}</h1>
      <p class="art-full__meta">${esc(data.author || '익명')} · ${fmtDate(data.created_at)}</p>
      <div class="art-full__body">${renderBody(data.body)}</div>
    </article>
    <section class="comments" id="article-comments">
      <h2 class="comments__title">의견 <span class="comment-count">0</span></h2>
      <form class="comment-form">
        <div class="comment-form__row">
          <input name="author" placeholder="이름" maxlength="40" required aria-label="이름" />
          <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
        </div>
        <textarea name="body" placeholder="이 글에 대한 생각을 남겨주세요." maxlength="2000" required aria-label="댓글 내용"></textarea>
        <div class="comment-form__foot">
          <span class="comment-status" role="status"></span>
          <button type="submit" class="btn btn--primary">등록</button>
        </div>
      </form>
      <ul class="comment-list"></ul>
    </section>`;

  initComments(id, document.getElementById('article-comments'));
}

const params = new URLSearchParams(location.search);
const id = params.get('id');
if (id) showSingle(id);
else showList();
