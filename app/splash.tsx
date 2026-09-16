// 첫 화면. React 가 붙기 전에 보여야 해서 layout 이 HTML 에 직접 넣고,
// 치우는 일은 layout 의 작은 스크립트가 맡는다. 여기에는 모양과 값만 둔다.
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
