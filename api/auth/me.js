// 현재 로그인 사용자 정보 (토큰 자체는 내려보내지 않음)
import { COOKIE_AT, isAllowedEmail, json, parseCookies, verifyAccessToken } from '../_lib/auth.js';

export async function GET(request) {
  const payload = await verifyAccessToken(parseCookies(request.headers.get('cookie'))[COOKIE_AT]);
  if (!payload || !isAllowedEmail(payload.email)) return json({ error: 'unauthorized' }, 401);
  return json({ email: payload.email, provider: payload.app_metadata?.provider || null });
}
