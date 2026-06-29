// Supabase 연결 설정 (anon 키는 공개용 — 보안은 DB의 RLS 정책으로 보호)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://qwqzlgcgdqlidpefnbub.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cXpsZ2NnZHFsaWRwZWZuYnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MDYwMTksImV4cCI6MjA5ODI4MjAxOX0.x2bvZh086c3F1KBpVgfAJo8UzWrJkt6LoWWRfOJxg5g';

// 관리자(기고문 작성·댓글 삭제 권한) 이메일. DB의 RLS 정책과 반드시 일치해야 함.
export const ADMIN_EMAIL = 'seongin0393@gmail.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- 공용 유틸 ---------- */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
};

// 매우 단순한 본문 렌더러: 이스케이프 후 **굵게**, 줄바꿈, 문단 처리
export const renderBody = (text) => {
  const safe = esc(text);
  return safe
    .split(/\n{2,}/)
    .map((p) => '<p>' + p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') + '</p>')
    .join('');
};
