import type {Metadata,Viewport} from "next";
import "./globals.css";
export const metadata:Metadata={title:"팀킥 · 우리 팀의 모든 경기",description:"일정부터 참여 투표, 팀 매칭과 선수 기록까지.",manifest:"/manifest.webmanifest",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg",apple:"/icon-192.png"}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#168b53"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}