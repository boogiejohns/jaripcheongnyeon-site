// 관리자 페이지: 로그인 → 기고문 작성/삭제, 댓글 관리(삭제)
import { supabase, esc, fmtDate, ADMIN_EMAIL } from './db.js';

const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');
const whoami = document.getElementById('whoami');

/* ---------- 인증 상태 ---------- */
async function refresh() {
  const { data: { session } } = await supabase.auth.getSession();
  const isAdmin = session && session.user.email === ADMIN_EMAIL;
  loginView.hidden = !!isAdmin;
  adminView.hidden = !isAdmin;
  if (isAdmin) {
    whoami.textContent = session.user.email;
    loadArticles();
    loadComments();
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginStatus.textContent = '로그인 중…';
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { loginStatus.textContent = '로그인 실패: ' + error.message; return; }
  loginStatus.textContent = '';
  refresh();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  refresh();
});

/* ---------- 기고문 작성 ---------- */
const articleForm = document.getElementById('article-form');
const articleStatus = document.getElementById('article-status');
const articleList = document.getElementById('admin-article-list');
let editingId = null;

articleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    kind: articleForm.kind.value === 'interview' ? 'interview' : 'article',
    title: articleForm.title.value.trim(),
    author: articleForm.author.value.trim() || '익명',
    body: articleForm.body.value.trim(),
    published: articleForm.published.checked,
  };
  if (!payload.title || !payload.body) { articleStatus.textContent = '제목과 본문을 입력해 주세요.'; return; }

  let error;
  if (editingId) {
    ({ error } = await supabase.from('articles').update(payload).eq('id', editingId));
  } else {
    ({ error } = await supabase.from('articles').insert(payload));
  }
  if (error) { articleStatus.textContent = '저장 실패: ' + error.message; return; }

  articleForm.reset();
  articleForm.published.checked = true;
  editingId = null;
  document.getElementById('article-submit').textContent = '발행';
  articleStatus.textContent = '저장되었습니다.';
  loadArticles();
});

document.getElementById('article-cancel').addEventListener('click', () => {
  articleForm.reset();
  articleForm.published.checked = true;
  editingId = null;
  document.getElementById('article-submit').textContent = '발행';
  articleStatus.textContent = '';
});

async function loadArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { articleList.innerHTML = '<p>목록 로드 실패</p>'; return; }

  articleList.innerHTML = data.length
    ? data
        .map(
          (a) => `
        <li class="admin-row">
          <div>
            <span class="badge">${a.kind === 'interview' ? '인터뷰' : '기고문'}</span>
            <strong>${esc(a.title)}</strong>
            ${a.published ? '' : '<span class="badge">비공개</span>'}
            <span class="admin-row__meta">${esc(a.author)} · ${fmtDate(a.created_at)}</span>
          </div>
          <div class="admin-row__actions">
            <button data-edit="${a.id}" class="btn btn--sm">수정</button>
            <button data-del-article="${a.id}" class="btn btn--sm btn--danger">삭제</button>
          </div>
        </li>`
        )
        .join('')
    : '<li class="admin-row">아직 기고문이 없습니다.</li>';

  articleList.querySelectorAll('[data-del-article]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('이 기고문을 삭제할까요?')) return;
      const { error } = await supabase.from('articles').delete().eq('id', b.dataset.delArticle);
      if (error) alert('삭제 실패: ' + error.message);
      else loadArticles();
    })
  );
  articleList.querySelectorAll('[data-edit]').forEach((b) =>
    b.addEventListener('click', async () => {
      const { data } = await supabase.from('articles').select('*').eq('id', b.dataset.edit).single();
      if (!data) return;
      editingId = data.id;
      articleForm.kind.value = data.kind === 'interview' ? 'interview' : 'article';
      articleForm.title.value = data.title;
      articleForm.author.value = data.author || '';
      articleForm.body.value = data.body;
      articleForm.published.checked = data.published;
      document.getElementById('article-submit').textContent = '수정 저장';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
  );
}

/* ---------- 댓글 관리 ---------- */
const commentList = document.getElementById('admin-comment-list');

async function loadComments() {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) { commentList.innerHTML = '<p>댓글 로드 실패</p>'; return; }

  commentList.innerHTML = data.length
    ? data
        .map(
          (c) => `
        <li class="admin-row">
          <div>
            <strong>${esc(c.author)}</strong>
            <span class="admin-row__meta">[${esc(c.thread)}] · ${fmtDate(c.created_at)}</span>
            <p class="admin-comment-body">${esc(c.body)}</p>
          </div>
          <div class="admin-row__actions">
            <button data-del-comment="${c.id}" class="btn btn--sm btn--danger">삭제</button>
          </div>
        </li>`
        )
        .join('')
    : '<li class="admin-row">댓글이 없습니다.</li>';

  commentList.querySelectorAll('[data-del-comment]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('이 댓글을 삭제할까요?')) return;
      const { error } = await supabase.from('comments').delete().eq('id', b.dataset.delComment);
      if (error) alert('삭제 실패: ' + error.message);
      else loadComments();
    })
  );
}

refresh();
