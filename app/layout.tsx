import type {Metadata,Viewport} from "next";
import "./globals.css";
import {SPLASH_MS,SPLASH_ID,SPLASH_KEY,SplashMark,LOGO} from "./splash";

export const metadata:Metadata={title:"팀킥 · 우리 팀의 모든 경기",description:"일정부터 참여 투표, 팀 매칭과 선수 기록까지.",manifest:"/manifest.webmanifest",icons:{icon:"/app-icon-192.png",shortcut:"/app-icon-192.png",apple:"/app-icon-180.png"}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#168b53"};

// 브라우저는 화면을 그리기 전에 설치 창(beforeinstallprompt)을 띄우겠다고 알린다.
// React 가 붙은 뒤에 듣기 시작하면 이미 지나간 뒤라 놓친다. 그래서 여기서 먼저 받아 둔다.
const CATCH=`(function(){window.__teamkickInstall=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__teamkickInstall=e;window.dispatchEvent(new Event("teamkick-install-ready"))});window.addEventListener("appinstalled",function(){window.__teamkickInstall=null})})()`;

// 첫 화면은 React 보다 먼저 결정되어야 한다. React 안에서 띄우면 앱 화면이
// 먼저 한 번 그려졌다가 그 위를 덮어서, 로고가 뜨기 전에 UI 가 번쩍인다.
//
// 그래서 첫 화면을 HTML 에 그대로 넣어 두고, 이 스크립트가 화면을 칠하기 전에
// 보여줄지 말지 정한다. 이미 본 사람은 <html> 에 표시를 남겨 CSS 가 즉시 숨긴다.
const SPLASH=`(function(){try{if(sessionStorage.getItem(${JSON.stringify(SPLASH_KEY)})==="1"){document.documentElement.setAttribute("data-splash","skip");return}sessionStorage.setItem(${JSON.stringify(SPLASH_KEY)},"1")}catch(e){}
var gone=false;
// 첫 화면은 React 의 Layout 안에도 들어 있다. 그래서 한 번 지워도 React 가 붙는
// 순간 되살아나 다시 화면을 덮는다(실제로 그랬다. 눌러서 건너뛰어도 2초를 채웠다).
// React 가 붙는 동안만 지켜보다가 되살아나면 다시 치우고, 곧 그만둔다.
var kill=function(){var el=document.getElementById(${JSON.stringify(SPLASH_ID)});if(el)el.remove()};
var go=function(){if(gone)return;gone=true;kill();
try{var watch=new MutationObserver(kill);watch.observe(document.body,{childList:true});
setTimeout(function(){watch.disconnect()},${SPLASH_MS});}catch(e){}};
// 사용자 결정(2026-09-17): 데이터가 먼저 준비되어도 줄이지 않고 2초를 그대로 보여준다.
// 나중에 이 자리에 광고가 들어갈 자리를 지키기 위해서다.
setTimeout(go,${SPLASH_MS});
document.addEventListener("click",go,{once:true});document.addEventListener("keydown",go,{once:true})})()`;

export default function Layout({children}:{children:React.ReactNode}){
 // 위 SPLASH 스크립트가 React 보다 먼저 <html> 에 data-splash 를 붙인다. 서버가 보낸
 // HTML 에는 그 표시가 없으므로 React 가 hydration 불일치로 본다("이미 본 사람"의
 // 재방문마다 콘솔 오류가 하나씩 쌓였다). 표시를 서버에서 미리 붙일 수는 없다
 // (sessionStorage 는 브라우저에만 있다). 그래서 <html> 의 속성 비교만 끈다.
 // 여기서 걸릴 다른 속성은 lang 뿐이고, 자식 요소의 검사는 그대로 살아 있다.
 return <html lang="ko" suppressHydrationWarning>
  <head>
   {/* 첫 화면이 로고 파일을 기다리지 않도록 가장 먼저 받아 둔다. */}
   <link rel="preload" as="image" href={LOGO}/>
   <script dangerouslySetInnerHTML={{__html:CATCH}}/>
   <script dangerouslySetInnerHTML={{__html:SPLASH}}/>
   {/* 자바스크립트가 막혀 있으면 첫 화면을 치울 방법이 없다. 아예 보여주지 않는다. */}
   <noscript><style>{`#${SPLASH_ID}{display:none!important}`}</style></noscript>
  </head>
  <body>
   <div id={SPLASH_ID} data-ad="false" role="presentation">
    <div className="splash-ad" aria-hidden/>
    <SplashMark/>
   </div>
   {children}
  </body>
 </html>;
}
