import type {Metadata,Viewport} from "next";
import "./globals.css";
export const metadata:Metadata={title:"팀킥 · 우리 팀의 모든 경기",description:"일정부터 참여 투표, 팀 매칭과 선수 기록까지.",manifest:"/manifest.webmanifest",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg",apple:"/icon-192.png"}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#168b53"};
// 브라우저는 화면을 그리기 전에 설치 창(beforeinstallprompt)을 띄우겠다고 알린다.
// React 가 붙은 뒤에 듣기 시작하면 이미 지나간 뒤라 놓친다. 그래서 여기서 먼저 받아 둔다.
const CATCH=`(function(){window.__teamkickInstall=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__teamkickInstall=e;window.dispatchEvent(new Event("teamkick-install-ready"))});window.addEventListener("appinstalled",function(){window.__teamkickInstall=null})})()`;

export default function Layout({children}:{children:React.ReactNode}){
 return <html lang="ko"><head><script dangerouslySetInnerHTML={{__html:CATCH}}/></head><body>{children}</body></html>;
}