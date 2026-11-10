// ID/PW 로그인 (관리자가 Supabase 에서 직접 생성한 계정)
import { authRequest, idToEmail, isAllowedEmail, json, safeNext, sessionCookies, withErrors } from '../_lib/auth.js';

export const POST = withErrors(async (request) => {
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청입니다.' }, 400); }

  const id = String(body?.id || '').trim();
  const password = String(body?.password || '');
  if (!id || !password) return json({ error: 'ID와 비밀번호를 입력하세요.' }, 400);

  const { ok, status, data } = await authRequest('/token?grant_type=password', { email: idToEmail(id), password });
  if (!ok) {
    if (status === 429) return json({ error: '시도가 너무 많습니다. 잠시 후 다시 시도하세요.' }, 429);
    return json({ error: 'ID 또는 비밀번호가 올바르지 않습니다.' }, 401);
  }

  if (!isAllowedEmail(data.user?.email)) {
    await authRequest('/logout?scope=local', {}, data.access_token);
    return json({ error: '접근 권한이 없는 계정입니다.' }, 403);
  }

  return json({ ok: true, next: safeNext(body.next) }, 200, sessionCookies(data));
}, { api: true });
