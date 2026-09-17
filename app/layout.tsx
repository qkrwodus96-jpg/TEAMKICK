import type {Metadata,Viewport} from "next";
import "./globals.css";
import {SPLASH_MS,SPLASH_MIN_MS,SPLASH_READY,SPLASH_ID,SPLASH_KEY,SplashMark} from "./splash";

export const metadata:Metadata={title:"팀킥 · 우리 팀의 모든 경기",description:"일정부터 참여 투표, 팀 매칭과 선수 기록까지.",manifest:"/manifest.webmanifest",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg",apple:"/icon-192.png"}};
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
var gone=false,ready=false,waited=false;
var go=function(){if(gone)return;gone=true;var el=document.getElementById(${JSON.stringify(SPLASH_ID)});if(el)el.remove()};
// 데이터가 준비되고 최소 시간이 지나면 바로 넘어간다. 둘 중 하나만으로는 넘어가지 않는다.
var maybe=function(){if(ready&&waited)go()};
setTimeout(function(){waited=true;maybe()},${SPLASH_MIN_MS});
setTimeout(go,${SPLASH_MS});                       // 준비가 늦어도 여기서는 넘어간다
window.addEventListener(${JSON.stringify(SPLASH_READY)},function(){ready=true;maybe()});
document.addEventListener("click",go,{once:true});document.addEventListener("keydown",go,{once:true})})()`;

export default function Layout({children}:{children:React.ReactNode}){
 return <html lang="ko">
  <head>
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
