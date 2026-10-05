"use client";
// 홈 탭 맨 위 "팀킥 준비하기". 홈 화면 추가와 기기 알림을 버튼 두 개로 모았다.
// 예전에는 띠 두 개를 한 번 닫으면 다시 켤 곳이 없어서, 처음 안내를 넘긴 사람이 나중에 방법을 못 찾았다.
// 이미 끝낸 것은 보이지 않고, 둘 다 끝나면 카드 전체가 사라진다. "접기"는 한 줄로 줄일 뿐 없애지 않는다.
//
// 카카오톡에서 링크를 누르면 카톡 안 브라우저로 열린다. 거기서는 홈 화면 추가도 알림도 되지 않으므로
// 먼저 "다른 브라우저로 열기"를 권한다. 카톡은 kakaotalk://web/openExternal 로 기본 브라우저를 연다.
import {useEffect,useState} from "react";
import {Bell,Check,ChevronDown,ChevronUp,Download,ExternalLink,LoaderCircle,Share} from "lucide-react";
import {toast} from "sonner";
import {installState,promptInstall} from "./install";
import {pushStatus,turnOnPush,type PushStatus} from "./notify";

const FOLD="teamkick_setup_folded";
const DONE="teamkick_installed";
const read=(k:string)=>{try{return localStorage.getItem(k)==="1"}catch{return false}};
const write=(k:string,v:boolean)=>{try{if(v)localStorage.setItem(k,"1");else localStorage.removeItem(k)}catch{}};

type InApp=""|"kakao"|"android"|"ios";
export function inAppBrowser():InApp{
 const ua=navigator.userAgent;
 if(/KAKAOTALK/i.test(ua))return "kakao";
 // 네이버·인스타그램·페이스북·라인 앱 안 브라우저
 if(/NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua))return /android/i.test(ua)?"android":"ios";
 return "";
}
// 1.19: 밖으로 연 주소에 표시를 붙여 두면, 새 브라우저에서 "홈 화면에 추가" 카드를 펼쳐 맨 위에 강조한다(사장님 요청).
const HANDOFF="tk_install";
export function openOutside(kind:InApp){
 const u=new URL(location.href);u.searchParams.set(HANDOFF,"1");const url=u.toString();
 if(kind==="kakao"){location.href="kakaotalk://web/openExternal?url="+encodeURIComponent(url);return}
 // 안드로이드는 크롬을 직접 부를 수 있다. 크롬이 없으면 기본 브라우저가 열린다.
 if(kind==="android"){location.href="intent://"+url.replace(/^https?:\/\//,"")+"#Intent;scheme=https;package=com.android.chrome;end";return}
}

type Step="todo"|"done"|"na";
export function AppSetup({signedIn}:{signedIn:boolean}){
 const [s,setS]=useState<{ready:boolean;inApp:InApp;install:Step;how:"ios"|"samsung"|"other";push:Step;pushWhy:PushStatus|"";folded:boolean;handoff:boolean}>({ready:false,inApp:"",install:"done",how:"other",push:"done",pushWhy:"",folded:false,handoff:false});
 const [busy,setBusy]=useState("");
 const [help,setHelp]=useState<""|"install"|"push">("");

 useEffect(()=>{
  let live=true;
  (async()=>{
   const inApp=inAppBrowser();const st=installState();
   if(st.installed)write(DONE,true);
   const install:Step=st.installed||read(DONE)?"done":"todo";
   const why=inApp?"":await pushStatus().catch(()=>"unsupported" as PushStatus);
   // 서버에 알림 키가 없거나 이 브라우저가 알림을 못 받으면 누를 것이 없다
   const push:Step=!signedIn?"na":inApp?"todo":why==="on"?"done":why==="server-off"||why==="unsupported"?"na":"todo";
   // 앱 안 브라우저에서 넘어온 참이면 접어 둔 것도 펼치고, 표시는 주소에서 지운다.
   const url=new URL(location.href),handoff=!inApp&&url.searchParams.get(HANDOFF)==="1";
   if(url.searchParams.has(HANDOFF)){url.searchParams.delete(HANDOFF);history.replaceState(history.state,"",url.pathname+url.search+url.hash)}
   if(handoff)write(FOLD,false);
   if(live)setS({ready:true,inApp,install,how:st.how,push,pushWhy:why,folded:handoff?false:read(FOLD),handoff:handoff&&install==="todo"});
  })();
  const on=()=>setS(x=>({...x,push:"done"}));const inst=()=>{write(DONE,true);setS(x=>({...x,install:"done"}))};
  window.addEventListener("teamkick-push-on",on);window.addEventListener("appinstalled",inst);
  return()=>{live=false;window.removeEventListener("teamkick-push-on",on);window.removeEventListener("appinstalled",inst)};
 },[signedIn]);

 if(!s.ready)return null;
 const left=[s.install,s.push].filter(x=>x==="todo").length;
 if(!s.inApp&&left===0)return null;

 function fold(v:boolean){write(FOLD,v);setS(x=>({...x,folded:v}))}
 async function install(){
  setHelp("");setBusy("install");
  try{if(await promptInstall()){setS(x=>({...x,install:"done"}));toast.success("홈 화면에 팀킥을 추가했어요.");return}setHelp("install")}
  finally{setBusy("")}
 }
 async function push(){
  setHelp("");
  if(s.pushWhy==="ios-install"||s.pushWhy==="denied"){setHelp("push");return}
  setBusy("push");
  try{await turnOnPush();setS(x=>({...x,push:"done"}));toast.success("이 기기로 알림을 받아요.")}
  catch(e){toast.error(e instanceof Error?e.message:"알림을 켜지 못했어요.");const why=await pushStatus().catch(()=>"" as const);setS(x=>({...x,pushWhy:why}));setHelp("push")}
  finally{setBusy("")}
 }
 const manual=s.how==="ios"
  ?<>사파리 화면 아래 <Share size={13} style={{verticalAlign:"-2px"}}/> <b>공유</b> → <b>홈 화면에 추가</b> → <b>추가</b></>
  :s.how==="samsung"
  ?<>오른쪽 아래 <b>≡ 메뉴</b> → <b>현재 페이지 추가</b> → <b>홈 화면</b></>
  :<>오른쪽 위 <b>⋮ 메뉴</b> → <b>홈 화면에 추가</b> 또는 <b>앱 설치</b></>;

 if(s.folded)return <button type="button" className="setup-fold" onClick={()=>fold(false)}><span>팀킥 준비하기 · {s.inApp?"다른 브라우저로 열기":left+"개 남음"}</span><ChevronDown size={16}/></button>;

 return <section className={"setup-card"+(s.handoff?" handoff":"")} aria-label="팀킥 준비하기">
  {s.handoff&&<p className="setup-handoff">브라우저로 잘 옮겨 왔어요. 이제 <b>홈 화면에 추가</b>를 누르면 앱처럼 쓸 수 있어요.</p>}
  <div className="setup-head"><div><strong>팀킥 준비하기</strong><span>{s.inApp?"지금은 앱 안 브라우저라 설치·알림이 안 돼요":left+"개만 하면 끝나요"}</span></div><button type="button" className="setup-x" onClick={()=>fold(true)} aria-label="접기"><ChevronUp size={16}/></button></div>
  {s.inApp?<>
   <div className="setup-chips">
    {s.inApp!=="ios"&&<button type="button" className="setup-chip" onClick={()=>openOutside(s.inApp)}><ExternalLink size={16}/>다른 브라우저로 열기</button>}
   </div>
   <p className="setup-help">{s.inApp==="kakao"?<>버튼이 안 되면 카톡 화면의 <b>⋮</b>(또는 공유) 메뉴 → <b>다른 브라우저로 열기</b>를 눌러주세요.</>:s.inApp==="android"?<>버튼이 안 되면 오른쪽 위 <b>⋮</b> → <b>다른 브라우저로 열기</b>를 눌러주세요.</>:<>오른쪽 위 <b>⋯</b> 또는 아래 <b>공유</b> → <b>Safari로 열기</b>를 눌러주세요.</>} 열린 브라우저에서 로그인하면 홈 화면 추가·알림을 켤 수 있어요.</p>
  </>:<>
   <div className="setup-chips">
    {s.install!=="na"&&<button type="button" className={"setup-chip"+(s.install==="done"?" done":s.handoff?" primary":"")} disabled={s.install==="done"||busy==="install"} onClick={install}>{s.install==="done"?<Check size={16}/>:busy==="install"?<LoaderCircle className="loader" size={16}/>:<Download size={16}/>}홈 화면에 추가</button>}
    {s.push!=="na"&&<button type="button" className={"setup-chip"+(s.push==="done"?" done":"")} disabled={s.push==="done"||busy==="push"} onClick={push}>{s.push==="done"?<Check size={16}/>:busy==="push"?<LoaderCircle className="loader" size={16}/>:<Bell size={16}/>}알림 켜기</button>}
   </div>
   {help==="install"&&<p className="setup-help">{manual}</p>}
   {help==="push"&&<p className="setup-help">{s.pushWhy==="ios-install"?<>아이폰은 <b>홈 화면에 추가</b>한 팀킥 아이콘으로 열어야 알림을 받을 수 있어요. 먼저 홈 화면에 추가해주세요.</>:s.pushWhy==="denied"?<>이 브라우저에서 알림을 막아두셨어요. 주소창 왼쪽 <b>자물쇠(또는 ⓘ)</b> → <b>권한</b> → <b>알림 허용</b>으로 바꾼 뒤 다시 눌러주세요.</>:<>다시 한 번 눌러주세요. 계속 안 되면 <b>MY → 기기 알림</b>에서 이유를 볼 수 있어요.</>}</p>}
  </>}
 </section>;
}
