// 첫 화면. React 가 붙기 전에 보여야 해서 layout 이 HTML 에 직접 넣고,
// 치우는 일은 layout 의 작은 스크립트가 맡는다. 여기에는 모양과 값만 둔다.
// 첫 화면을 보여주는 시간. 데이터가 먼저 준비돼도 줄이지 않는다.
// 사용자 결정(2026-09-17): 나중에 이 자리에 광고를 넣을 것이라 길이를 지킨다.
// 화면을 누르거나 키를 누르면 바로 넘어간다.
export const SPLASH_MS=2000;
export const SPLASH_ID="teamkick-splash";
export const SPLASH_KEY="teamkick_splash_shown";

// 로고를 그림 파일로 불러오면 받는 동안 빈 화면이 보인다. 첫 화면이라 직접 그린다.
export function SplashMark(){
 return <svg className="splash-mark" viewBox="0 0 512 512" role="img" aria-label="팀킥">
  <g transform="skewX(-13)" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontWeight="900"
     fill="#ffffff" stroke="#ffffff" strokeWidth="7" strokeLinejoin="round">
   <text x="118" y="236" fontSize="128" textLength="372" lengthAdjust="spacingAndGlyphs">TEAM</text>
   <text x="118" y="356" fontSize="128" textLength="372" lengthAdjust="spacingAndGlyphs">KICK</text>
  </g>
  <polygon points="150,378 480,378 466,414 136,414" fill="#16f08a" transform="skewX(-13)"/>
 </svg>;
}

// 화면 위쪽 브랜드 자리에 쓰는 작은 마크. 첫 화면과 같은 모양이라 따로 그리지 않고
// 같은 도형을 줄여 쓴다. 로고를 고치면 두 곳이 함께 바뀐다.
export function BrandMark(){
 return <svg className="brand-mark-svg" viewBox="88 120 400 310" role="img" aria-label="팀킥 로고">
  <rect x="88" y="120" width="400" height="310" fill="#0b0b0b" rx="14"/>
  <g transform="skewX(-13)" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontWeight="900"
     fill="#ffffff" stroke="#ffffff" strokeWidth="7" strokeLinejoin="round">
   <text x="118" y="236" fontSize="128" textLength="372" lengthAdjust="spacingAndGlyphs">TEAM</text>
   <text x="118" y="356" fontSize="128" textLength="372" lengthAdjust="spacingAndGlyphs">KICK</text>
  </g>
  <polygon points="150,378 480,378 466,414 136,414" fill="#16f08a" transform="skewX(-13)"/>
 </svg>;
}
