// 구글/카카오 로그인 완료: code → 세션 교환 후 HttpOnly 쿠키 저장
import {
  COOKIE_NEXT, COOKIE_PKCE, authRequest, isAllowedEmail, parseCookies, redirect, safeNext, sessionCookies, tempCookie, withErrors,
} from '../_lib/auth.js';

export const GET = withErrors(async (request) => {
  const url = new URL(request.url);
  const cookies = parseCookies(request.headers.get('cookie'));
  const verifier = cookies[COOKIE_PKCE];
  const next = safeNext(cookies[COOKIE_NEXT]);
  const clearTemp = [tempCookie(COOKIE_PKCE, ''), tempCookie(COOKIE_NEXT, '')];

  const code = url.searchParams.get('code');
  if (!code || !verifier) return redirect('/login.html?error=oauth', clearTemp);

  const { ok, data } = await authRequest('/token?grant_type=pkce', { auth_code: code, code_verifier: verifier });
  if (!ok) return redirect('/login.html?error=oauth', clearTemp);

  if (!isAllowedEmail(data.user?.email)) {
    await authRequest('/logout?scope=local', {}, data.access_token);
    return redirect('/login.html?error=forbidden', clearTemp);
  }

  return redirect(next, [...clearTemp, ...sessionCookies(data)]);
});
