# carang_inventory

모든 페이지(HTML·이미지)는 로그인 후에만 볼 수 있습니다. 인증은 Supabase Auth를 사용하고, Vercel 서버(Middleware + Functions)에서만 처리합니다.

## 구조

| 파일 | 역할 |
|---|---|
| `middleware.js` | 모든 요청에서 로그인 쿠키(JWT) 검증, 미로그인 시 `/login.html` 로 이동 |
| `login.html` | 로그인 화면 (ID/PW, Google, Kakao) |
| `api/auth/login.js` | ID/PW 로그인 |
| `api/auth/oauth.js` · `callback.js` | 구글/카카오 로그인 (PKCE) |
| `api/auth/refresh.js` | 토큰 자동 갱신 |
| `api/auth/logout.js` | 로그아웃 (`/api/auth/logout`) |
| `api/_lib/auth.js` | 공용 설정·검증 로직 |

### 보안
- Supabase 키는 **Vercel 환경변수에만** 저장. HTML/JS에 키가 없고 브라우저에서 Supabase를 직접 호출하지 않습니다.
- 세션 토큰은 `HttpOnly; Secure; SameSite=Lax` 쿠키 → 자바스크립트로 탈취 불가.
- 구글/카카오 계정은 `ALLOWED_EMAILS` 에 있는 경우만 접근 허용.

## 설정 순서

### 1. Vercel 환경변수
Vercel > Project > Settings > Environment Variables 에 아래 값을 입력 (`.env.example` 참고) 후 **Redeploy**.

| 이름 | 필수 | 값 |
|---|---|---|
| `SUPABASE_URL` | ✅ | Project URL (`https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | ✅ | anon 또는 publishable 키 (**service_role/secret 키 X**) |
| `ALLOWED_EMAILS` | ✅ | 소셜 로그인 허용 이메일, 쉼표 구분. `@회사도메인` 은 도메인 전체 허용 |
| `SUPABASE_JWT_SECRET` | 선택 | 레거시 HS256 JWT 프로젝트만. 신규 JWT Signing Keys 면 비워둠 |
| `LOGIN_ID_DOMAIN` | 선택 | 기본 `madeleine.local` |
| `SITE_URL` | 선택 | 콜백 주소 고정 시 (예: `https://도메인`) |

### 2. Supabase 설정
1. **Authentication > Sign In / Providers**
   - Email: 켜기, **Confirm email 켜기** (관리자가 만든 계정만 쓰도록)
   - Google: Client ID / Secret 입력 (Google Cloud Console > OAuth 클라이언트, 승인된 리디렉션 URI = `https://<프로젝트>.supabase.co/auth/v1/callback`)
   - Kakao: REST API 키 / Client Secret 입력 (Kakao Developers > 카카오 로그인 Redirect URI = `https://<프로젝트>.supabase.co/auth/v1/callback`).
     카카오는 **이메일(account_email) 동의항목**이 있어야 허용 목록과 비교할 수 있습니다. 이메일이 없으면 접근 차단됩니다.
2. **Authentication > URL Configuration**
   - Site URL: `https://<vercel 도메인>`
   - Redirect URLs: `https://<vercel 도메인>/api/auth/callback`
     (프리뷰 배포도 쓰려면 `https://*-<vercel 계정>.vercel.app/api/auth/callback`, 로컬은 `http://localhost:3000/api/auth/callback`)

### 3. ID/PW 계정 만들기 (사용자 배포용)
Supabase > Authentication > Users > **Add user > Create new user**
- Email: `아이디@madeleine.local` (예: `user01@madeleine.local`)
- Password: 배포할 비밀번호
- **Auto Confirm User 체크**

사용자는 로그인 화면에서 ID에 `user01` 만 입력하면 됩니다.

#### 도메인을 나중에 바꾸려면
1. Vercel 환경변수 `LOGIN_ID_DOMAIN` 을 새 도메인으로 변경 후 Redeploy
2. Supabase Users 에서 기존 계정 이메일을 새 도메인으로 변경
   (전환 기간에 옛 계정도 허용하려면 `ALLOWED_EMAILS` 에 `@madeleine.local` 추가 — 단, 이 경우 옛 계정은 `user01@madeleine.local` 전체를 입력해야 로그인됨)

## 로컬 테스트
```bash
npm i -g vercel
vercel link
vercel env pull .env.local   # Vercel 환경변수 내려받기 (git 에 올라가지 않음)
vercel dev                   # http://localhost:3000
```
