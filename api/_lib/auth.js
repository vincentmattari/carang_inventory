// 서버 전용 인증 유틸 (Vercel Functions + Middleware 공용).
// Supabase 키는 모두 Vercel 환경변수로만 읽고, 브라우저로는 절대 내려보내지 않는다.
import { jwtVerify, createRemoteJWKSet } from 'jose';

export const COOKIE_AT = 'sb-at';     // access token
export const COOKIE_RT = 'sb-rt';     // refresh token
export const COOKIE_PKCE = 'sb-pkce'; // OAuth PKCE verifier (임시)
export const COOKIE_NEXT = 'sb-next'; // 로그인 후 돌아갈 경로 (임시)

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30일
const TEMP_MAX_AGE = 60 * 10;              // 10분

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다.`);
  return value.trim();
}

export const supabaseUrl = () => requiredEnv('SUPABASE_URL').replace(/\/+$/, '');
const supabaseKey = () => requiredEnv('SUPABASE_ANON_KEY');

// ID/PW 계정용 내부 이메일 도메인. 'user01' 입력 → 'user01@madeleine.local'
export const loginIdDomain = () =>
  (process.env.LOGIN_ID_DOMAIN || 'madeleine.local').trim().toLowerCase().replace(/^@/, '');

export function idToEmail(id) {
  const value = id.trim().toLowerCase();
  return value.includes('@') ? value : `${value}@${loginIdDomain()}`;
}

// 접근 허용: LOGIN_ID_DOMAIN 계정(관리자가 직접 생성) + ALLOWED_EMAILS 목록
// ALLOWED_EMAILS 예: "a@gmail.com, b@kakao.com, @mycompany.com"  ('@'로 시작하면 도메인 전체 허용)
export function isAllowedEmail(email) {
  if (!email) return false;
  const e = String(email).toLowerCase();
  if (e.endsWith(`@${loginIdDomain()}`)) return true;
  return (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((item) => (item.startsWith('@') ? e.endsWith(item) : e === item));
}

let jwks;
// Supabase access token(JWT) 서명 검증. 실패/만료 시 null.
// SUPABASE_JWT_SECRET 이 있으면 HS256(레거시), 없으면 프로젝트 JWKS(비대칭 키)로 검증.
export async function verifyAccessToken(token) {
  if (!token) return null;
  const issuer = `${supabaseUrl()}/auth/v1`;
  try {
    const secret = process.env.SUPABASE_JWT_SECRET;
    const key = secret
      ? new TextEncoder().encode(secret.trim())
      : (jwks ||= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)));
    const { payload } = await jwtVerify(token, key, { issuer, audience: 'authenticated' });
    return payload;
  } catch {
    return null;
  }
}

// Supabase Auth REST 호출 (서버에서만)
export async function authRequest(path, body, accessToken) {
  const headers = { apikey: supabaseKey(), 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${supabaseUrl()}/auth/v1${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {}),
  });
  let data = null;
  try { data = await res.json(); } catch { /* 204 등 본문 없음 */ }
  return { ok: res.ok, status: res.status, data };
}

export function parseCookies(header) {
  const out = {};
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    try { out[name] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* 무시 */ }
  }
  return out;
}

const cookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

export const sessionCookies = (session) => [
  cookie(COOKIE_AT, session.access_token, session.expires_in || 3600),
  cookie(COOKIE_RT, session.refresh_token, REFRESH_MAX_AGE),
];
export const clearSessionCookies = () => [cookie(COOKIE_AT, '', 0), cookie(COOKIE_RT, '', 0)];
export const tempCookie = (name, value) => cookie(name, value, value ? TEMP_MAX_AGE : 0);

// 오픈 리다이렉트 방지: 같은 사이트의 상대 경로만 허용
export function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  if (next.startsWith('/api/') || next.startsWith('/login')) return '/';
  return next;
}

export function siteOrigin(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.trim().replace(/\/+$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

export function redirect(location, cookies = []) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  cookies.forEach((c) => headers.append('Set-Cookie', c));
  return new Response(null, { status: 302, headers });
}

// 핸들러 공통 예외 처리: 설정 오류 등은 로그에 남기고 사용자에게는 안내만 표시
export const withErrors = (handler, { api = false } = {}) => async (request) => {
  try {
    return await handler(request);
  } catch (e) {
    console.error('[auth]', e);
    return api ? json({ error: '서버 설정 오류입니다. 관리자에게 문의하세요.' }, 500) : redirect('/login.html?error=config');
  }
};

export function json(body, status = 200, cookies = []) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  cookies.forEach((c) => headers.append('Set-Cookie', c));
  return new Response(JSON.stringify(body), { status, headers });
}
