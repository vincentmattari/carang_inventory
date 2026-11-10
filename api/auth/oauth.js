// 구글/카카오 로그인 시작: PKCE 생성 후 Supabase authorize 로 이동
import { COOKIE_NEXT, COOKIE_PKCE, redirect, safeNext, siteOrigin, supabaseUrl, tempCookie } from '../_lib/auth.js';

const PROVIDERS = new Set(['google', 'kakao']);

const base64url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function GET(request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');
  if (!PROVIDERS.has(provider)) return redirect('/login.html?error=provider');

  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64url(new Uint8Array(digest));

  const authorize = new URL(`${supabaseUrl()}/auth/v1/authorize`);
  authorize.searchParams.set('provider', provider);
  authorize.searchParams.set('redirect_to', `${siteOrigin(request)}/api/auth/callback`);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 's256');

  return redirect(authorize.toString(), [
    tempCookie(COOKIE_PKCE, verifier),
    tempCookie(COOKIE_NEXT, safeNext(url.searchParams.get('next'))),
  ]);
}
