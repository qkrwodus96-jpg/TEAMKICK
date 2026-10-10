# 팀킥 서버 이전 절차서 (GPT Sites → 사장님 Cloudflare)

작성: 2026-10-11 · 대상 버전: 1.27.1 이상
메뉴 이름은 **한국어(영어)** 순서로 적었습니다. 화면 번역이 조금 다를 수 있습니다.
**비밀값·토큰은 채팅이나 이 문서에 적지 않습니다.**

---

## 0. 이미 끝낸 것 ✅
- Cloudflare 가입, 계정 ID·API 토큰 만들기
- GitHub 비밀값 2개 (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)

## 1. 첫 자동 배포 확인 (Claude가 1.27을 합치면 자동으로 시작)
1. https://github.com/qkrwodus96-jpg/TEAMKICK/actions 에서 **Deploy to Cloudflare** 가 초록색 ✓ 인지 봅니다.
2. 빨간색이고 오류에 `workers.dev subdomain` 이 보이면:
   Cloudflare → **Workers 및 Pages(Workers & Pages)** → 오른쪽 **서브도메인(Subdomain)** → 이름 정하기(예: `teamkick-jy`) → 저장 →
   GitHub Actions 화면에서 실패한 실행을 열고 **Re-run all jobs**.
3. 성공하면 시험 주소가 생깁니다: `https://teamkick.<서브도메인>.workers.dev`
   확인: `https://teamkick.<서브도메인>.workers.dev/api/health` → `"version":"1.27.0"`
   (아직 비밀값을 안 넣어서 로그인·지도 등은 "준비 안 됨"으로 보이는 게 정상입니다.)

## 2. 비밀값 옮기기 (사장님)
Cloudflare → **Workers 및 Pages** → **teamkick** → **설정(Settings)** → **변수 및 비밀(Variables and Secrets)** → **추가(Add)**
- 유형(Type)은 **비밀(Secret)** 로, 이름은 **GPT Sites에 넣어둔 이름 그대로**, 값도 **같은 값**으로 넣습니다.
- 지금 코드가 읽는 이름(있는 것만 넣으면 됩니다):

| 무엇 | 이름 |
|---|---|
| 카카오 로그인·구장 검색·지도 | `KAKAO_REST_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_JS_KEY`(또는 GPT에 넣은 지도 키 이름 그대로) |
| 네이버 로그인·뉴스 | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_API_HUB_KEY_ID`, `NAVER_API_HUB_KEY` |
| 구글 로그인 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| 메일 | `BREVO_API_KEY`(또는 `RESEND_API_KEY`), `MAIL_FROM` |
| 휴대폰 알림 | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — 아래 **New push keys** 버튼으로 새로 넣습니다 |
| 예약 실행 | `CRON_SECRET` — 같은 값이어야 cron-job.org 설정을 안 바꿔도 됩니다 |
| 날씨 | `DATA_GO_KR_KEY` |
| 기타(넣어 둔 경우만) | `OWNER_SETUP_CODE`, `EMAIL_SIGNUP_ENABLED` |
| **이전용(새로 만들기)** | `MIGRATE_SECRET` — 아래 3번 참고 |

GPT Sites에서 값을 다시 볼 수 없으면 원래 발급한 곳(카카오·네이버·구글 개발자 콘솔 등)에서 확인합니다.
`OWNER_SETUP_CODE` 는 넣지 않아도 됩니다(운영자 정보는 데이터와 함께 옮겨짐).

**VAPID(알림 키)**: 옛 서버의 개인키는 꺼낼 수 없어서(2026-10-11 GPT 확인) **새 키**로 바꿉니다.
GitHub → Actions → **New push keys** → **Run workflow** → 칸에 `NEW` → 실행. 두 값이 Cloudflare에 바로 들어가고 로그에는 나오지 않습니다.
(그래서 `VAPID_PUBLIC_KEY`·`VAPID_PRIVATE_KEY` 는 직접 넣지 않습니다. `VAPID_SUBJECT` 는 GPT 값 그대로 넣어도 되고 빼도 됩니다.)
이전한 뒤 이미 알림을 켠 기기는 **앱을 한 번 열면** 새 키로 자동 재등록됩니다. 열기 전까지는 그 기기에 알림이 가지 않습니다.

## 3. 이전용 비밀값 만들기 (사장님)
- 32자 이상 무작위 문자열을 하나 만듭니다(휴대폰 비밀번호 관리자의 "강력한 비밀번호 만들기" 등).
- 같은 값을 **두 곳**에 넣습니다:
  1. Cloudflare teamkick → 변수 및 비밀 → `MIGRATE_SECRET` (비밀)
  2. GPT에게: `GitHub main 최신을 Sites에 배포하고, 환경 변수 MIGRATE_SECRET 을 추가해줘` (값은 GPT 화면에서 직접 입력)
- 이 값이 있는 동안만 복사 도구가 열립니다. 이전이 끝나면 두 곳 모두에서 지웁니다.

## 4. 시험 복사 (지금 사이트는 그대로 운영)
1. `https://teamkick.<서브도메인>.workers.dev/api/migrate?op=page` 를 엽니다.
2. 옛 서버 주소 `https://teamkick.co.kr`, 비밀값 입력 → **① 개수 비교** → **② 처음부터 복사**
3. 마지막 줄이 **✅ 모두 같아요** 면 성공. 옛 서버는 계속 운영 중이라 몇 줄 차이는 정상입니다(마지막 날 다시 복사).

## 5. 미리 해 두기: 도메인을 Cloudflare로 (사이트는 그대로 GPT Sites로 연결)
1. Cloudflare 계정 홈 → **도메인 추가(Add a domain)** → `teamkick.co.kr` → **Free** 요금제
2. 가져온 **DNS 레코드**를 가비아 DNS 화면과 한 줄씩 비교합니다. 특히 **메일(MX·TXT)** 레코드가 빠지면 안 됩니다.
   지금 사이트로 가는 레코드는 **주황 구름을 꺼서 회색(DNS 전용, DNS only)** 으로 둡니다.
3. 가비아: **My가비아 → 도메인 → teamkick.co.kr 관리 → 네임서버 → 설정** → Cloudflare가 알려준 네임서버 2개로 바꾸기
4. Cloudflare에서 "활성(Active)" 메일이 오면 끝(보통 1시간 안, 길면 하루). 이 동안에도 사이트는 지금처럼 동작합니다.

## 6. 이전하는 날 (약 30분, 사람 적은 시간 추천)
1. 복사 화면에서 **③ 마지막 복사(옛 서버 잠금)** → **✅ 모두 같아요** 확인.
   (이때부터 옛 서버는 보기만 되고 저장은 "잠깐 저장할 수 없어요"로 막힙니다.)
2. Cloudflare → **teamkick** → **설정** → **도메인 및 경로(Domains & Routes)** → **추가(Add)** → **사용자 지정 도메인(Custom domain)** → `teamkick.co.kr`
   이미 있는 레코드와 겹친다고 나오면, DNS 화면에서 지금 사이트로 가던 `teamkick.co.kr` 레코드를 지우고 다시 추가합니다.
3. 몇 분 뒤 `https://teamkick.co.kr/api/health` → `"version"` 이 보이고, 앱에서 **로그인이 유지되는지·사진이 보이는지·저장되는지·설정에 "서비스 관리"가 보이는지(운영자)** 확인. 앱을 열면 알림도 새 키로 다시 등록됩니다.
4. 이상하면: 도메인 연결을 빼고(2번 되돌리기) 복사 화면에서 **옛 서버 잠금 풀기** → 원래대로 돌아갑니다.

## 7. 끝난 뒤 정리
- Cloudflare·GPT Sites 둘 다에서 `MIGRATE_SECRET` 삭제
- cron-job.org: 주소(`https://teamkick.co.kr/api/cron`)와 `CRON_SECRET` 이 같으면 **바꿀 것 없음**
- Claude: 처리방침 "호스팅: OpenAI" 줄을 빼는 수정(위탁 업체 변경 공지)
- 1~2주 문제없으면 GPT Sites 프로젝트 데이터 삭제를 GPT에게 요청
- 이후 배포는 **main에 합치면 자동** — GPT 배포 요청이 더 이상 필요 없습니다.
