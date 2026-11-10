// access token 만료 시 refresh token 으로 세션 갱신
import { COOKIE_RT, authRequest, clearSessionCookies, parseCookies, redirect, safeNext, sessionCookies } from '../_lib/auth.js';

export async function GET(request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  const toLogin = `/login.html?next=${encodeURIComponent(next)}`;

  const refreshToken = parseCookies(request.headers.get('cookie'))[COOKIE_RT];
  if (!refreshToken) return redirect(toLogin);

  const { ok, data } = await authRequest('/token?grant_type=refresh_token', { refresh_token: refreshToken });
  if (!ok) return redirect(toLogin, clearSessionCookies());

  return redirect(next, sessionCookies(data));
}
