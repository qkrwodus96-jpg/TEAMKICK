# TEAMKICK 선택 검토 요청

> 이 문서는 GPT(Astra)에 그대로 붙여넣어 보내는 검토 요청서다.
> 비밀키·토큰·실사용자 개인정보는 들어 있지 않다.
> 아래 요약만으로 코드가 안전하다고 주장하지 않는다. 판단해야 할 것을 적었을 뿐이다.

## 이번 검토에서 판단할 질문

1. **이메일 가입을 닫는 조건을 "소셜 로그인이 하나라도 준비되어 있으면"으로 잡은 것이
   맞는 판단인가?** 이 조건은 런타임 환경변수로 결정된다. 배포 중에 키가 잠깐 비거나
   잘못 들어가면 **가입 문이 조용히 다시 열린다.** 반대로 고정값으로 막으면 키를 넣기
   전 배포에서 아무도 가입하지 못하고 운영자 초기 설정조차 못 한다. 둘 중 어느 위험이
   더 큰가? 더 나은 세 번째 방법이 있는가?
2. **기존 이메일 가입자가 잠기는 경로가 남아 있는가?** 가입만 막고 로그인·비밀번호
   찾기·이메일 확인·재발송은 열어 뒀다. 이 구분에서 놓친 진입 경로가 있는가?
   (특히 비밀번호 재설정 후 세션 재발급, 이메일 확인 토큰 경로)
3. **소셜 계정과 기존 이메일 계정이 같은 사람일 때 계정이 갈라지는 문제**를 지금 구조로
   나중에 합칠 수 있는가? 지금은 소셜에서 **회원번호와 닉네임만** 받고 이메일을 받지
   않으므로 자동 연결의 단서가 없다. 지금 손대지 않고 뒤로 미뤄도 되는가?

## 기준

- **작업 ID**: T20 (이메일 가입 제거)
- **관련 요구사항**: `TASKS.md` 의 T20. 원래 조건은 "카카오·네이버·구글 로그인이
  배포 환경에서 실제로 되는 것을 확인한 뒤에만 제거한다. 먼저 지우면 아무도 가입하지
  못하게 된다. 기존 이메일 계정의 로그인은 유지한다."
  사용자가 2026-09-18 에 **세 가지 모두 배포에서 된다**고 확인해 조건이 풀렸다.
- **기준 커밋**: `4971983` (feat: 알림을 누르면 그 화면으로 · 개수 표시 · 용병 참여 · 공지 알림)
- **변경 커밋**: 아래 diff 는 **아직 커밋하지 않은 작업 트리 변경**이다.
- **미커밋 변경 포함 여부**: **포함한다.** 이 검토 대상이 곧 그 미커밋 변경이다.

## 실제 변경

### 변경 파일과 목적

| 파일 | 목적 |
| --- | --- |
| `app/api/auth/route.ts` | **서버에서** 이메일 가입을 막는다. 이게 실제 관문이다. |
| `app/screens.tsx` | 로그인 화면에서 회원가입 진입을 감추고 안내 문구를 바꾼다. |
| `app/globals.css` | (별건) 소셜 단추 세 개의 간격·높이를 똑같이 맞춘다. |
| `tests/core.test.mjs` | 서버 차단을 양방향으로 고정한다. |
| `LEGAL.md` | 수집 항목 표와 변경 사유를 갱신한다. |

### 판단에 필요한 실제 diff

```diff
--- a/app/api/auth/route.ts
+++ b/app/api/auth/route.ts
@@
 import {signUp,signIn,signOut,sessionCookie,clearedCookie,requestPasswordReset,
         resetPassword,limit,clientKey,verifyEmail,resendVerification,currentUser} from "@/lib/auth";
 import {AppError,setupIncomplete,SETUP_MESSAGE} from "@/lib/model";
 import {ensureSchema} from "@/lib/schema";
+import {kakaoReady} from "@/lib/kakao";
+import {socialReady} from "@/lib/social";
+
+// T20 (사용자 결정 2026-09-18): 새 가입은 소셜 로그인으로만 받는다.
+// 다만 **소셜이 하나도 준비되지 않은 곳에서는 막지 않는다.** 막아버리면 키를 넣기 전
+// 배포나 로컬에서 아무도 가입할 수 없게 되고, 운영자 초기 설정조차 못 한다.
+// 이미 가입한 이메일 계정의 로그인·비밀번호 찾기·이메일 확인은 그대로 둔다.
+export const socialSignupOnly=()=>kakaoReady()||socialReady("google")||socialReady("naver");
+const SIGNUP_CLOSED="이제 카카오·네이버·구글 로그인으로 시작해주세요. 이미 이메일로 가입하셨다면 그대로 로그인할 수 있어요.";
@@
-  if(c.action==="signup"){await limit("signup",clientKey(req));const {user,token,verificationSent}=await signUp(...);...}
+  if(c.action==="signup"){
+   // 화면에서 감추는 것만으로는 부족하다. 서버에서 막는다.
+   if(socialSignupOnly())throw new AppError(SIGNUP_CLOSED,403);
+   await limit("signup",clientKey(req));const {user,token,verificationSent}=await signUp(...);...}
   // login / forgot / reset / verify / resendVerify / logout 은 손대지 않았다.
```

```diff
--- a/app/screens.tsx   (AuthPanel)
+++ b/app/screens.tsx
+ // T20: 소셜 로그인이 하나라도 준비되어 있으면 새 가입은 소셜로만 받는다.
+ // 서버(`/api/auth`)도 같은 기준으로 막는다. 화면에서 감추는 것만으로는 부족하다.
+ const socialOnly=kakaoReady||googleReady||naverReady;
- const signup=mode==="signup",...
+ const signup=mode==="signup"&&!socialOnly,...

  // 아래 단추 줄: socialOnly 이면 "처음이에요 · 회원가입" 을 내보내지 않는다.
- :<button ...>{signup||forgot?"로그인으로 돌아가기":"처음이에요 · 회원가입"}</button>}
+ :socialOnly
+  ? (forgot?<button ...>로그인으로 돌아가기</button>:null)
+  :<button ...>{signup||forgot?"로그인으로 돌아가기":"처음이에요 · 회원가입"}</button>}

  // 안내 문구
- <p ...>또는 이메일로</p>
+ <p ...>이미 이메일로 가입하셨다면</p>
```

### 관련 서버 권한·DB 정책·마이그레이션

- **마이그레이션 없음.** 스키마·데이터는 그대로다. 기존 `accounts` 행을 지우지 않는다.
- 권한 판단은 이 한 줄에 모여 있다:
  `socialSignupOnly()=>kakaoReady()||socialReady("google")||socialReady("naver")`
  - `kakaoReady()`는 `KAKAO_REST_KEY` 존재 여부.
  - `socialReady(p)`는 그 제공자의 `*_CLIENT_ID`·`*_CLIENT_SECRET` 존재 여부.
  - 즉 **런타임 환경변수만 보고 결정한다.** 이것이 질문 1의 핵심이다.
- 다른 인증 경로는 손대지 않았다: `login`·`forgot`·`reset`·`verify`·`resendVerify`·`logout`.

### 기존 코드 중 함께 봐야 하는 부분

- `lib/auth.ts` 의 `signUp`(여전히 존재하며, 소셜 로그인 경로에서도 계정을 만든다),
  `signIn`, `requestPasswordReset`, `resetPassword`, `verifyEmail`, `resendVerification`.
- `lib/social.ts` / `lib/kakao.ts` 의 계정 생성 경로 — **소셜 로그인은 이 차단을 지나지
  않는다.** `POST /api/auth` 의 `signup` 만 막았다. 소셜 콜백은 별도 라우트다.
- `lib/model.ts` 의 `setupOwner` — 운영자 초기 설정은 **계정이 먼저 있어야** 한다.
  소셜 키가 없는 새 배포에서 가입까지 막으면 운영자를 만들 수 없다(그래서 열어 뒀다).

## 검증 근거

### 실행 명령

```bash
node --test tests/core.test.mjs
node node_modules/typescript/bin/tsc --noEmit
pnpm lint
pnpm dev   # 그리고 헤드리스 Chromium 으로 화면 조작
```

### 통과·실패 결과

- `node --test tests/core.test.mjs` — **107/107 통과** (이번에 새 테스트 2건).
- `tsc --noEmit` — 통과.
- `pnpm lint` — 오류 **77건**. **이 저장소를 처음 받았을 때부터 있던 수치이며 이번
  변경이 늘린 것이 아니다**(전부 `no-explicit-any`). 경고는 21건.
- **변이 시험**: 서버의 `if(socialSignupOnly())throw ...` 한 줄을 지우면
  테스트가 **106/107 로 실패한다.** 즉 이 테스트는 실제로 차단을 지키고 있다.

### 재현 절차

1. `.dev.vars` 에 `KAKAO_REST_KEY`·`GOOGLE_CLIENT_ID`·`NAVER_CLIENT_ID` 등을 넣고
   `pnpm dev` (로컬 검증용 가짜 값이면 충분하다. 실제 로그인은 외부망이 막혀 못 한다).
2. 로그아웃 상태로 로그인 화면을 연다.
3. 화면을 우회해 직접 호출한다:
   `POST /api/auth {"action":"signup","email":...,"password":...,"name":...,"agree":true,"adult":true}`
4. `.dev.vars` 에서 소셜 키 6개를 지우고 서버를 다시 띄운 뒤 3번을 되풀이한다.

### 기대 동작과 실제 동작

| 상황 | 기대 | 실제(브라우저에서 확인) |
| --- | --- | --- |
| 소셜 키 있음 · 로그인 화면 | 회원가입 진입 없음 | **회원가입 단추 0개.** "처음이시면 위 단추로 시작하세요." |
| 소셜 키 있음 · 화면 우회 가입 | 서버가 거절 | **403** + "이제 카카오·네이버·구글 로그인으로 시작해주세요…" |
| 소셜 키 있음 · 기존 이메일 로그인 | 그대로 됨 | **200** |
| 소셜 키 없음 · 로그인 화면 | 회원가입 다시 보임 | **회원가입 단추 1개** |
| 소셜 키 없음 · 가입 | 그대로 됨 | **200**, 계정 생성됨 |
| 소셜 단추 3개 | 간격·높이 균일 | **간격 14px / 14px, 높이 48 / 48 / 48** |

### 미검증 범위

- **실제 소셜 로그인 성공 경로.** 이 개발 환경은 외부 API 접속이 막혀 있어
  카카오·네이버·구글 토큰 발급을 호출할 수 없다. 실패 경로만 확인했다.
  배포 환경에서 셋 다 된다는 것은 **사용자 구두 확인**이 근거이며, 내가 실행해 본
  결과가 아니다.
- **배포 환경의 환경변수 실제 값.** `/api/health` 의 `googleReady`·`naverReady` 는
  운영자에게만 보인다. 내가 배포 응답을 직접 읽어 확인하지 않았다.
- **비밀번호 재설정 메일 도착.** 네이버 수신 문제(`HANDOFF.md` 참고)는 그대로 남아 있다.
  이메일 가입을 닫으면서 영향 범위는 **기존 이메일 가입자**로 더 좁아졌다.

## 현재 판단과 미해결 사항

### 원인 후보와 근거

이번 변경은 결함 수정이 아니라 **정책 변경**이라 "원인" 대신 **선택한 설계와 그 이유**를 적는다.

- **선택**: 차단 조건을 고정값이 아니라 `소셜이 하나라도 준비됨` 으로 잡았다.
- **이유**: 고정으로 막으면 (a) 키를 넣기 전 새 배포, (b) 로컬 개발, (c) 키가 만료·삭제된
  상황에서 **아무도 가입할 수 없고 운영자 초기 설정도 못 한다.** 복구 수단이 코드 배포뿐이 된다.
- **받아들인 위험**: 배포 중 환경변수가 비면 **가입 문이 조용히 다시 열린다.**
  경고도 기록도 남지 않는다. 이것이 질문 1이다.

### 이미 시도한 해결

- 화면에서 감추는 것만으로 끝내지 않고 **서버에서 막았다.** 화면 우회 호출이 403 인 것을
  브라우저에서 확인했다.
- 차단을 양방향으로 테스트에 고정했다(막는 쪽 / 막지 않는 쪽). 차단 한 줄을 지우면
  테스트가 실패하는 것까지 확인했다.
- 기존 이메일 계정이 잠기지 않도록 `login`·`forgot`·`reset` 을 손대지 않았고,
  세 경로가 모두 200 인 것을 테스트로 고정했다.

### 검토 결과에 따라 달라질 결정

- 질문 1 의 답이 "환경변수 기반은 위험하다" 면 → 명시적인 설정 스위치
  (예: `SIGNUP_MODE=social|email|both`)를 하나 더 두고, 값이 없을 때의 기본값을 정한다.
  지금 구조에 스위치 하나를 더하는 일이라 되돌리기 쉽다.
- 질문 2 에서 놓친 진입 경로가 나오면 → 그 경로를 같은 기준으로 막거나 열고 테스트를 더한다.
- 질문 3 의 답이 "지금 합쳐 둬야 한다" 면 → 소셜에서 이메일을 받을지부터 다시 정해야 한다.
  지금은 **일부러 받지 않고 있고**(`PROJECT_CONTEXT.md` 4-4, 구글은 `openid profile` 만 요청),
  받기로 하면 개인정보 수집 항목이 늘어 `LEGAL.md` 와 동의 문구를 함께 고쳐야 한다.
  **이건 되돌리기 어려운 쪽이라 검토 답을 받은 뒤에 결정하고 싶다.**

### 참고: 함께 올라간 별건

`app/globals.css` 의 소셜 단추 간격·높이 균일화(간격 10→14px, 높이 42/42/43→48/48/48)는
사용자 요청으로 같은 커밋에 들어갔다. **T20 판단과는 무관하다.**
