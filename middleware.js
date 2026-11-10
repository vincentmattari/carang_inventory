// Vercel Routing Middleware: 로그인하지 않은 요청은 모든 페이지/이미지 접근 차단
import {
  COOKIE_AT, COOKIE_RT, parseCookies, verifyAccessToken, isAllowedEmail, clearSessionCookies, redirect,
} from './api/_lib/auth.js';

export const config = {
  // 로그인 페이지, 인증 API, 파비콘을 제외한 모든 경로 보호
  matcher: ['/((?!api/|login\\.html|favicon\\.ico).*)'],
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const next = url.pathname + url.search;
  const cookies = parseCookies(request.headers.get('cookie'));

  const payload = await verifyAccessToken(cookies[COOKIE_AT]);
  if (payload) {
    if (isAllowedEmail(payload.email)) {
      return new Response(null, { headers: { 'x-middleware-next': '1' } }); // 통과
    }
    return redirect('/login.html?error=forbidden', clearSessionCookies());
  }

  // access token 만료 → refresh token 으로 갱신 후 원래 경로로 복귀
  if (cookies[COOKIE_RT]) return redirect(`/api/auth/refresh?next=${encodeURIComponent(next)}`);
  return redirect(`/login.html?next=${encodeURIComponent(next)}`);
}
