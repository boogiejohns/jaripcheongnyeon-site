// 재사용 댓글 위젯: 누구나(비회원) 작성. 스팸 대비 = 허니팟 + 욕설 필터 + 관리자 삭제(별도).
import { supabase, esc, fmtDate } from './db.js';

// 가벼운 비속어 필터(완벽하지 않음 — 관리자 삭제로 보완)
const BANNED = ['시발', '씨발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '좆', '개새끼', '새끼', '닥쳐', 'fuck', 'shit'];

const hasBanned = (s) => {
  const t = String(s).toLowerCase().replace(/\s/g, '');
  return BANNED.some((w) => t.includes(w));
};

function commentHTML(c) {
  return `
    <li class="comment">
      <div class="comment__head">
        <span class="comment__author">${esc(c.author)}</span>
        <time class="comment__date">${fmtDate(c.created_at)}</time>
      </div>
      <p class="comment__body">${esc(c.body).replace(/\n/g, '<br>')}</p>
    </li>`;
}

/**
 * @param {string} thread  스레드 키 ('home' 또는 기고문 id)
 * @param {HTMLElement} root  .comments 컨테이너
 */
export function initComments(thread, root) {
  const form = root.querySelector('.comment-form');
  const list = root.querySelector('.comment-list');
  const count = root.querySelector('.comment-count');
  const status = root.querySelector('.comment-status');

  async function load() {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('thread', thread)
      .eq('hidden', false)
      .order('created_at', { ascending: false });

    if (error) {
      list.innerHTML = `<li class="comment comment--empty">댓글을 불러오지 못했습니다.</li>`;
      console.error('[comments] load', error);
      return;
    }
    if (count) count.textContent = data.length;
    list.innerHTML = data.length
      ? data.map(commentHTML).join('')
      : `<li class="comment comment--empty">첫 의견을 남겨주세요.</li>`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';

    // 허니팟: 사람에겐 안 보이는 필드. 봇이 채우면 조용히 무시.
    if (form.website.value) return;

    const author = form.author.value.trim();
    const body = form.body.value.trim();
    if (!author || !body) { status.textContent = '이름과 내용을 모두 입력해 주세요.'; return; }
    if (author.length > 40) { status.textContent = '이름은 40자 이내로 입력해 주세요.'; return; }
    if (body.length > 2000) { status.textContent = '내용은 2000자 이내로 입력해 주세요.'; return; }
    if (hasBanned(author) || hasBanned(body)) {
      status.textContent = '부적절한 표현이 포함되어 등록할 수 없습니다.';
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { error } = await supabase.from('comments').insert({ thread, author, body });
    btn.disabled = false;

    if (error) {
      status.textContent = '등록에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      console.error('[comments] insert', error);
      return;
    }
    form.reset();
    status.textContent = '등록되었습니다. 감사합니다.';
    load();
  });

  load();
}
