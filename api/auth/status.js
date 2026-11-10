// 설정 진단용: 환경변수 존재 여부와 Supabase 연결만 확인 (값은 절대 노출하지 않음)
import { json, loginIdDomain, supabaseUrl } from '../_lib/auth.js';

const has = (name) => Boolean(process.env[name] && process.env[name].trim());

export async function GET() {
  const result = {
    env: {
      SUPABASE_URL: has('SUPABASE_URL'),
      SUPABASE_ANON_KEY: has('SUPABASE_ANON_KEY'),
      SUPABASE_JWT_SECRET: has('SUPABASE_JWT_SECRET'),
      ALLOWED_EMAILS: has('ALLOWED_EMAILS'),
      LOGIN_ID_DOMAIN: loginIdDomain(),
    },
    supabaseUrlFormat: null,
    supabaseAuth: null,
  };

  if (result.env.SUPABASE_URL) {
    try {
      const url = new URL(supabaseUrl());
      result.supabaseUrlFormat = url.protocol === 'https:' && !url.pathname.replace(/\/$/, '') ? 'ok' : 'Project URL 형식(https://xxxx.supabase.co)이 아닙니다';
      if (result.env.SUPABASE_ANON_KEY) {
        const res = await fetch(`${supabaseUrl()}/auth/v1/settings`, { headers: { apikey: process.env.SUPABASE_ANON_KEY.trim() } });
        result.supabaseAuth = res.ok ? 'ok' : `HTTP ${res.status} (키가 올바르지 않을 수 있습니다)`;
      }
    } catch (e) {
      result.supabaseUrlFormat ??= 'URL 형식 오류';
      result.supabaseAuth = `연결 실패: ${e.message}`;
    }
  }

  return json(result);
}
