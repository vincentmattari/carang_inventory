// 로그아웃: Supabase 세션 폐기 + 쿠키 삭제
import { COOKIE_AT, authRequest, clearSessionCookies, parseCookies, redirect, withErrors } from '../_lib/auth.js';

export const GET = withErrors(async (request) => {
  const accessToken = parseCookies(request.headers.get('cookie'))[COOKIE_AT];
  if (accessToken) {
    try { await authRequest('/logout?scope=local', {}, accessToken); } catch { /* 쿠키 삭제는 계속 진행 */ }
  }
  return redirect('/login.html?logout=1', clearSessionCookies());
});
