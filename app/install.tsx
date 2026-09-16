"use client";
import {useState,useEffect} from "react";
import {Download,X,Share} from "lucide-react";

// 홈 화면에 추가하면 주소창 없이 앱처럼 열린다. 그런데 그 방법을 스스로 알려주는
// 브라우저는 많지 않다. 안내하지 않으면 대부분의 사람은 방법을 모른 채 쓴다.
//
// 설치 창(beforeinstallprompt)은 크롬 계열만, 그것도 조건이 맞을 때만 준다.
// 창을 주면 버튼으로 바로 부르고, 주지 않으면 손으로 하는 방법을 적어 준다.
// 창이 오기를 기다리다 아무것도 못 보여주는 일이 없어야 한다.

type Prompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
const HIDDEN="teamkick_install_hidden";
const held=()=>(window as unknown as {__teamkickInstall?:Prompt|null}).__teamkickInstall??null;

function installed(){
 if(typeof window==="undefined")return true;
 const ios=(window.navigator as unknown as {standalone?:boolean}).standalone;
 return ios===true||window.matchMedia?.("(display-mode: standalone)")?.matches===true;
}
const isIos=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)&&!/crios|fxios/i.test(navigator.userAgent);
const isSamsung=()=>/samsungbrowser/i.test(navigator.userAgent);

export function InstallGuide(){
 const [view,setView]=useState<{show:boolean;how:""|"ios"|"samsung"|"other";prompt:Prompt|null}>({show:false,how:"",prompt:null});

 useEffect(()=>{
  // 브라우저 환경은 화면을 그린 뒤에만 읽을 수 있다.
  if(installed())return;
  // 저장소를 막아둔 브라우저가 있다. 읽지 못해도 화면은 그대로 떠야 한다.
  try{if(localStorage.getItem(HIDDEN)==="1")return}catch{}
  const how=isIos()?"ios":isSamsung()?"samsung":"other";
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 환경은 화면을 그린 뒤에만 읽을 수 있다
  setView({show:true,how,prompt:held()});
  // 설치 창이 늦게 오는 경우도 있다. 오면 버튼으로 바꿔 준다.
  const ready=()=>setView(v=>({...v,prompt:held()}));
  const done=()=>setView(v=>({...v,show:false,prompt:null}));
  window.addEventListener("teamkick-install-ready",ready);
  window.addEventListener("appinstalled",done);
  return()=>{window.removeEventListener("teamkick-install-ready",ready);window.removeEventListener("appinstalled",done)};
 },[]);

 const {show,how,prompt}=view;

 function close(){
  setView(v=>({...v,show:false}));
  try{localStorage.setItem(HIDDEN,"1")}catch{}
 }
 async function install(){
  if(!prompt)return;
  await prompt.prompt();
  await prompt.userChoice.catch(()=>null);
  (window as unknown as {__teamkickInstall:Prompt|null}).__teamkickInstall=null;
  setView(v=>({...v,show:false,prompt:null}));
 }

 if(!show)return null;
 // 설치 창을 받았으면 버튼 하나로 끝난다. 못 받았으면 손으로 하는 길을 적어 준다.
 const manual=how==="ios"
  ? <>화면 아래 <Share size={14} style={{verticalAlign:"-2px"}}/> <strong>공유</strong> 버튼 → <strong>홈 화면에 추가</strong></>
  : how==="samsung"
  ? <>오른쪽 아래 <strong>≡ 메뉴</strong> → <strong>현재 페이지 추가</strong> → <strong>홈 화면</strong></>
  : <>브라우저 <strong>⋮ 메뉴</strong> → <strong>홈 화면에 추가</strong> (또는 <strong>앱 설치</strong>)</>;

 return <div className="notice install-guide" role="status" style={{marginBottom:14}}>
  <div className="row between" style={{gap:10,alignItems:"flex-start"}}>
   <div>
    <p><strong>팀킥을 앱처럼 쓰세요</strong></p>
    <span className="small muted">{prompt?"홈 화면에 추가하면 아이콘이 생기고 주소창 없이 열려요.":manual}</span>
   </div>
   <button type="button" className="btn btn-ghost" aria-label="안내 닫기" onClick={close}><X size={16}/></button>
  </div>
  {prompt&&<div className="action-strip"><button type="button" className="btn btn-green" onClick={install}><Download size={16}/>앱 설치</button></div>}
 </div>;
}
