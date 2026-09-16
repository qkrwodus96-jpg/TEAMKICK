"use client";
import {useState,useEffect} from "react";
import {Download,X} from "lucide-react";

// 홈 화면에 추가하면 주소창 없이 앱처럼 열린다. 그런데 아이폰은 그 방법을
// 스스로 알려주지 않아서, 안내하지 않으면 아이폰 사용자는 영영 모른다.
// 안드로이드는 브라우저가 설치 창을 띄워주므로 그 창을 직접 부른다.

type Prompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
const HIDDEN="teamkick_install_hidden";

// 이미 홈 화면 앱으로 열렸는지. 아이폰은 standalone, 나머지는 표시 모드로 본다.
function installed(){
 if(typeof window==="undefined")return true;
 const ios=(window.navigator as unknown as {standalone?:boolean}).standalone;
 return ios===true||window.matchMedia?.("(display-mode: standalone)")?.matches===true;
}
const isIos=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)&&!/crios|fxios/i.test(navigator.userAgent);

export function InstallGuide(){
 // 아이폰이냐, 브라우저가 설치 창을 줬느냐, 보여줄 것이냐를 한 덩어리로 둔다.
 // 따로 두면 화면이 여러 번 다시 그려진다.
 const [view,setView]=useState<{show:boolean;ios:boolean;prompt:Prompt|null}>({show:false,ios:false,prompt:null});

 useEffect(()=>{
  // 브라우저 환경은 화면을 그린 뒤에야 읽을 수 있다. 서버에서 미리 읽으면
  // 화면이 어긋나므로 여기서 한 번만 읽고 한 번만 바꾼다.
  if(installed())return;
  // 저장소를 막아둔 브라우저가 있다. 읽지 못해도 화면은 그대로 떠야 한다.
  try{if(localStorage.getItem(HIDDEN)==="1")return}catch{}
  if(isIos()){
   // 아이폰은 설치 창이 없어 바로 안내한다.
   // eslint-disable-next-line react-hooks/set-state-in-effect -- 환경은 화면을 그린 뒤에만 읽을 수 있다
   setView({show:true,ios:true,prompt:null});
   return;
  }
  const ready=(e:Event)=>{e.preventDefault();setView({show:true,ios:false,prompt:e as Prompt})};
  const done=()=>setView(v=>({...v,show:false,prompt:null}));
  window.addEventListener("beforeinstallprompt",ready);
  window.addEventListener("appinstalled",done);
  return()=>{window.removeEventListener("beforeinstallprompt",ready);window.removeEventListener("appinstalled",done)};
 },[]);

 const {show,ios,prompt}=view;

 function close(){
  setView(v=>({...v,show:false}));
  try{localStorage.setItem(HIDDEN,"1")}catch{}
 }
 async function install(){
  if(!prompt)return;
  await prompt.prompt();
  await prompt.userChoice.catch(()=>null);
  setView(v=>({...v,show:false,prompt:null}));
 }

 if(!show)return null;
 return <div className="notice install-guide" role="status" style={{marginBottom:14}}>
  <div className="row between" style={{gap:10,alignItems:"flex-start"}}>
   <div>
    <p><strong>팀킥을 앱처럼 쓰세요</strong></p>
    <span className="small muted">{ios
     ? "아래 공유 버튼 → 「홈 화면에 추가」를 누르면 아이콘이 생기고 전체화면으로 열려요."
     : "홈 화면에 추가하면 아이콘이 생기고 주소창 없이 열려요."}</span>
   </div>
   <button type="button" className="btn btn-ghost" aria-label="안내 닫기" onClick={close}><X size={16}/></button>
  </div>
  {!ios&&<div className="action-strip"><button type="button" className="btn btn-green" onClick={install}><Download size={16}/>앱 설치</button></div>}
 </div>;
}
