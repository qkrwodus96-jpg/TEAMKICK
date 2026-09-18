// 첫 화면. React 가 붙기 전에 보여야 해서 layout 이 HTML 에 직접 넣고,
// 치우는 일은 layout 의 작은 스크립트가 맡는다. 여기에는 모양과 값만 둔다.
// 첫 화면을 보여주는 시간. 데이터가 먼저 준비돼도 줄이지 않는다.
// 사용자 결정(2026-09-17): 나중에 이 자리에 광고를 넣을 것이라 길이를 지킨다.
// 화면을 누르거나 키를 누르면 바로 넘어간다.
export const SPLASH_MS=2000;
export const SPLASH_ID="teamkick-splash";
export const SPLASH_KEY="teamkick_splash_shown";

// 사용자 결정(2026-09-18): 로고는 **원본 파일 그대로** 쓴다. 예전에는 코드로 다시
// 그렸는데(Arial Black + skewX) 글꼴이 원본과 달랐다. 이제 `public/icon-512.png`
// 하나만 보면 되고, 첫 화면·머리말·앱 아이콘이 모두 같은 그림을 쓴다.
//
// 그림 파일이라 받는 동안 빈 자리가 보일 수 있다. 그래서 layout 의 <head> 에서
// 미리 받아 두고(preload), 배경도 로고와 같은 검정이라 흰 번쩍임이 없다.
export const LOGO="/icon-512.png";

export function SplashMark(){
 return <img className="splash-mark" src={LOGO} alt="팀킥" width={512} height={512} decoding="sync"/>;
}

// 화면 위쪽 브랜드 자리. 같은 원본을 쓰되 자리에 맞춰 잘라 보여준다
// (원본은 정사각이고 글자는 가운데 띠에 있다. object-fit:cover 가 위아래 빈 검정만 덜어낸다).
export function BrandMark(){
 return <img className="brand-mark-svg" src={LOGO} alt="팀킥" width={512} height={512}/>;
}
