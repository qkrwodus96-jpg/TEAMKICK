"use client";
import {useState,useEffect,type ReactNode} from "react";
import {Bell,BellOff,LoaderCircle,X} from "lucide-react";
import {toast} from "sonner";

// 기기 푸시 켜기/끄기. 브라우저마다 되는 조건이 달라서, 안 되는 이유를 화면에 적는다.
// 안 되는 것을 "켜기" 버튼으로만 보여주면 눌러도 아무 일이 없는 것처럼 보인다.

const keyBytes=(v:string)=>{
 const pad=v.replace(/-/g,"+").replace(/_/g,"/");
 return Uint8Array.from(atob(pad+"=".repeat((4-pad.length%4)%4)),c=>c.charCodeAt(0));
};
const installed=()=>{
 const ios=(window.navigator as unknown as {standalone?:boolean}).standalone;
 return ios===true||window.matchMedia?.("(display-mode: standalone)")?.matches===true;
};
const isIos=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
// 알림 설정을 어디서 바꾸는지가 브라우저마다 다르다. 결과 줄에 함께 적는다.
const browserName=()=>{
 const ua=navigator.userAgent;
 if(/SamsungBrowser/i.test(ua))return "삼성 인터넷";
 if(/EdgA?\//i.test(ua))return "엣지";
 if(/Chrome\//i.test(ua))return "크롬";
 if(/Safari\//i.test(ua))return "사파리";
 return "브라우저";
};

// 구독은 **만들 때 쓴 공개키에 묶인다.** 서버에서 VAPID 키를 바꾸거나 나중에 넣으면
// 그 전에 만들어진 구독은 푸시 서버가 403 으로 거절한다. 화면에는 "켜짐" 으로 보이는데
// 알림만 영영 오지 않는다 — 사용자가 알아챌 방법이 없다. 그래서 켤 때마다 맞춰 본다.
const toB64url=(b:ArrayBuffer)=>{
 const bytes=new Uint8Array(b);let out="";
 for(const x of bytes)out+=String.fromCharCode(x);
 return btoa(out).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
const sameKey=(sub:PushSubscription,key:string)=>{
 const cur=(sub.options as {applicationServerKey?:ArrayBuffer|null})?.applicationServerKey;
 if(!cur||!key)return true;   // 확인할 수 없으면 건드리지 않는다
 try{return toB64url(cur)===key}catch{return true}
};

type State={ready:boolean;key:string;devices:number};

type Trace={registered:boolean;tryAt:string|null;status:number|null;detail:string|null;okAt:string|null;seenAt:string|null;shown:boolean|null};
const stamp=(iso:string)=>new Date(iso).toLocaleString("ko-KR",{timeZone:"Asia/Seoul",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
// 알림 한 통이 지나가는 네 단계를 그대로 적는다: 서버가 보냈나 → 푸시 서버가 받았나 →
// 폰이 받았나 → 화면에 띄웠나. 어디서 끊겼는지가 한눈에 보여야 한다.
function traceLines(t:Trace):string[]{
 if(!t.registered)return ["이 기기가 서버에 등록돼 있지 않아요. 알림을 껐다가 다시 켜주세요."];
 if(!t.tryAt)return ["아직 이 기기로 보낸 알림이 없어요."];
 const out=["① "+stamp(t.tryAt)+" 서버가 이 기기로 보냄"];
 if(t.status==null)out.push("② 결과가 기록되지 않았어요 — 서버가 보내는 도중에 끊겼어요.");
 else if(t.status>=200&&t.status<300)out.push("② 푸시 서버가 받음 ("+t.status+")");
 else if(t.status===0)out.push("② 푸시 서버에 닿지 못함 · "+(t.detail??""));
 else out.push("② 푸시 서버가 거절 ("+t.status+") · "+(t.detail??""));
 // 보낸 뒤 폰이 받기까지 걸린 시간. "몇 분 뒤에 온다" 가 서버 탓인지 폰·푸시 서버 탓인지 가른다.
 const took=(a:string,b:string)=>{const sec=Math.max(0,Math.round((Date.parse(b)-Date.parse(a))/1000));return sec<60?sec+"초":Math.floor(sec/60)+"분 "+(sec%60)+"초"};
 if(t.seenAt&&t.seenAt>=t.tryAt)out.push("③ "+stamp(t.seenAt)+" 폰이 받음 (보낸 지 "+took(t.tryAt,t.seenAt)+")","④ "+(t.shown?"알림을 띄움":"알림을 못 띄움 — 폰(브라우저) 알림 설정을 봐주세요"));
 else if(t.status!=null&&t.status>=200&&t.status<300)out.push("③ 폰이 받았다는 신호가 아직 없어요 — 폰이 꺼져 있거나 브라우저가 알림을 막고 있을 수 있어요.");
 return out;
}

function NotifyHelp(){
 const name=browserName();
 const tips:Record<string,ReactNode>={
  "삼성 인터넷":<>삼성 인터넷 <strong>☰ 메뉴 → 설정 → 사이트 및 다운로드 → 알림</strong> 에서
   <strong> ‘웹사이트 알림 자동 차단’ 을 끄고</strong>, 아래 목록에 <strong>teamkick.co.kr 이 켜져</strong> 있는지 보세요.
   자동 차단이 켜져 있으면 알림을 몇 번 안 눌렀다는 이유로 조용히 막아 버려요.</>,
  "크롬":<>크롬 <strong>⋮ 메뉴 → 설정 → 사이트 설정 → 알림</strong> 에서 <strong>teamkick.co.kr</strong> 을 허용으로 두세요.
   오래 안 들어간 사이트는 크롬이 권한을 스스로 지우기도 해요 — 그때는 여기서 다시 켜면 돼요.</>,
  "사파리":<>아이폰은 <strong>사파리 → 공유 → 홈 화면에 추가</strong> 한 뒤, <strong>그 아이콘으로 연 팀킥</strong>에서
   알림을 켜야 와요(iOS 16.4 이상). 켠 뒤에는 <strong>아이폰 설정 → 알림 → 팀킥</strong> 에서 잠금화면·배지를 고를 수 있어요.</>,
 };
 return <details className="notify-help">
  <summary>알림이 안 와요?</summary>
  <p className="data-note">{tips[name]??<>브라우저 설정의 <strong>사이트 권한 → 알림</strong> 에서 teamkick.co.kr 을 허용해주세요.</>}</p>
  <p className="data-note">위 <strong>이 폰에서 바로 띄워보기</strong> 가 안 보이면 폰(브라우저) 설정 문제이고,
   보이는데 시험 알림만 안 오면 배달 문제예요. 결과 줄을 운영자에게 보내주세요.</p>
 </details>;
}

// 앱을 열 때마다 이 브라우저의 알림 등록을 서버에 다시 올린다(같은 주소면 덮어쓴다).
// 시험 발송은 보내기 직전에 이렇게 해서 늘 됐고, 실제 알림은 저장돼 있던 등록을 그대로
// 써서 안 왔다 — 둘의 차이를 없앤다. 서버 키와 다르면 새로 등록한다(예전 키로 만든 등록은
// 푸시 서버가 거절한다). 화면에는 아무것도 그리지 않는다.
export function KeepSubscription(){
 useEffect(()=>{
  (async()=>{
   try{
    if(!("serviceWorker"in navigator)||!("PushManager"in window))return;
    if(Notification.permission!=="granted")return;
    const reg=await navigator.serviceWorker.getRegistration();
    let sub=await reg?.pushManager?.getSubscription();
    if(!reg||!sub)return;
    const res=await fetch("/api/push",{cache:"no-store"}).then(r=>r.json() as Promise<State>).catch(()=>null);
    if(!res?.ready||!res.key)return;
    if(!sameKey(sub,res.key)){
     // 예전 등록은 서버에서도 지운다. 남겨 두면 실제 알림이 죽은 주소로 한 번씩 더 나간다.
     await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"unsubscribe",endpoint:sub.endpoint})}).catch(()=>null);
     await sub.unsubscribe();
     sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(res.key)});
    }
    await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({action:"subscribe",subscription:sub.toJSON()})});
   }catch{/* 알림 등록을 못 고쳐도 앱은 그대로 쓴다 */}
  })();
 },[]);
 return null;
}

// 홈 화면 위에 뜨는 권유 띠. 기기 알림은 브라우저가 사용자에게 직접 묻는 것이라
// 앱이 대신 켜 줄 수 없다. 대신 켜야 한다는 것을 놓치지 않게 한 번 크게 권한다.
// 껐거나 이미 켠 사람에게는 다시 뜨지 않는다.
const ASKED="teamkick_notify_asked";
export function NotifyInvite(){
 const [show,setShow]=useState(false);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  (async()=>{
   try{if(localStorage.getItem(ASKED)==="1")return}catch{}
   if(!("serviceWorker"in navigator)||!("PushManager"in window))return;
   if(isIos()&&!installed())return;            // 아이폰은 홈 화면에 추가해야 받을 수 있다
   if(Notification.permission!=="default")return; // 이미 정했으면 묻지 않는다
   const res=await fetch("/api/push",{cache:"no-store"}).then(r=>r.json() as Promise<State>).catch(()=>null);
   if(!res?.ready)return;                       // 서버에 푸시 키가 없으면 권할 것이 없다
   const reg=await navigator.serviceWorker?.getRegistration?.().catch(()=>null);
   if(await reg?.pushManager?.getSubscription?.().catch(()=>null))return; // 이미 켜져 있다
   setShow(true);
  })();
 },[]);
 function done(){try{localStorage.setItem(ASKED,"1")}catch{};setShow(false)}
 async function turnOn(){
  setBusy(true);
  try{
   const res=await fetch("/api/push",{cache:"no-store"}).then(r=>r.json()) as State;
   const ok=await Notification.requestPermission();
   if(ok!=="granted")throw new Error("알림을 허용해야 받을 수 있어요. 나중에 MY 에서 켤 수 있어요.");
   const reg=await navigator.serviceWorker.register("/sw.js");
   await navigator.serviceWorker.ready;
   const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(res.key)});
   const out=await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"subscribe",subscription:sub.toJSON()})});
   if(!out.ok)throw new Error(((await out.json().catch(()=>({}))) as {error?:string}).error||"알림을 켜지 못했어요.");
   toast.success("이 기기로 알림을 받아요.");
   done();
  }catch(e){toast.error(e instanceof Error?e.message:"알림을 켜지 못했어요.");done()}
  finally{setBusy(false)}
 }
 if(!show)return null;
 return <div className="notice install-guide" role="status" style={{marginBottom:14}}>
  <div className="row between" style={{gap:10,alignItems:"flex-start"}}>
   <div>
    <p><strong>기기 알림을 켜두세요</strong></p>
    <span className="small muted">새 경기와 팀 공지를 잠금화면으로 알려드려요. 앱을 열어보지 않아도 놓치지 않아요.</span>
    {browserName()==="삼성 인터넷"&&<span className="small muted" style={{display:"block",marginTop:4}}>삼성 인터넷은 켠 뒤 <strong>설정 → 사이트 및 다운로드 → 알림</strong> 에서 <strong>‘웹사이트 알림 자동 차단’</strong> 을 꺼 두세요.</span>}
   </div>
   <button type="button" className="btn btn-ghost" aria-label="나중에" onClick={done}><X size={16}/></button>
  </div>
  <div className="action-strip">
   <button type="button" className="btn btn-green" disabled={busy} onClick={turnOn}>
    {busy?<LoaderCircle className="loader" size={16}/>:<Bell size={16}/>}알림 켜기
   </button>
  </div>
 </div>;
}

export function NotifyToggle(){
 const [s,setS]=useState<State|null>(null);
 const [on,setOn]=useState(false);
 const [busy,setBusy]=useState(false);
 const [why,setWhy]=useState("");
 // 시험 발송 결과는 화면에 남겨 둔다. 토스트는 몇 초 만에 사라져서
 // "뭐라고 떴는지" 를 물어볼 수가 없었다.
 const [testNote,setTestNote]=useState("");
 // 폰이 신호를 받았는지는 서비스 워커만 안다. 받으면 이 화면에 알려 준다(sw.js).
 const [heard,setHeard]=useState("");
 const [trace,setTrace]=useState<Trace|null>(null);
 async function loadTrace(){
  try{
   const reg=await navigator.serviceWorker?.getRegistration?.();
   const sub=await reg?.pushManager?.getSubscription?.();
   if(!sub){setTrace(null);return}
   const r=await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"trace",endpoint:sub.endpoint})});
   if(r.ok)setTrace(await r.json() as Trace);
  }catch{/* 기록을 못 읽어도 알림 켜기·끄기는 된다 */}
 }
 useEffect(()=>{
  const sw=navigator.serviceWorker;if(!sw)return;
  const on=(e:MessageEvent)=>{
   const d=e.data as {type?:string;at?:number;shown?:boolean;why?:string;permission?:string}|null;
   if(d?.type!=="teamkick-push")return;
   setTimeout(()=>{loadTrace()},1500); // 서비스 워커가 서버에 "받음" 을 남긴 뒤에 읽는다
   const at=new Date(d.at??Date.now()).toLocaleTimeString("ko-KR");
   setHeard(d.shown
    ?"📱 "+at+" 폰이 신호를 받아 알림을 띄웠어요. 그런데도 화면에 안 보이면 "+browserName()+" 의 알림 표시 설정 문제예요."
    :"📱 "+at+" 폰이 신호는 받았는데 알림을 못 띄웠어요 · "+(d.why||"이유 모름")+" · 권한 "+(d.permission||"?"));
  };
  sw.addEventListener("message",on);
  return()=>sw.removeEventListener("message",on);
 },[]);

 useEffect(()=>{
  (async()=>{
   let reason="";
   if(!("serviceWorker"in navigator)||!("PushManager"in window))
    reason=isIos()&&!installed()
     ? "아이폰은 홈 화면에 추가한 뒤에야 알림을 받을 수 있어요. 위 안내대로 추가해주세요."
     : "이 브라우저는 기기 알림을 지원하지 않아요.";
   else if(isIos()&&!installed())
    reason="아이폰은 홈 화면에 추가한 뒤에야 알림을 받을 수 있어요.";
   else if(Notification.permission==="denied")
    reason="브라우저에서 알림을 막아두셨어요. 브라우저 설정에서 팀킥의 알림을 허용해주세요.";
   const res=await fetch("/api/push",{cache:"no-store"}).then(r=>r.json() as Promise<State>).catch(()=>null);
   const reg=await navigator.serviceWorker?.getRegistration?.().catch(()=>null);
   let sub=await reg?.pushManager?.getSubscription?.().catch(()=>null);
   // 예전 키로 만들어진 구독이면 조용히 다시 등록한다. 이미 허용된 기기라
   // 다시 묻지 않는다. 이걸 안 하면 "켜짐" 인데 알림이 안 오는 상태가 계속된다.
   if(sub&&reg&&res?.ready&&res.key&&!sameKey(sub,res.key)){
    try{
     await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"unsubscribe",endpoint:sub.endpoint})}).catch(()=>null);
     await sub.unsubscribe();
     sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(res.key)});
     await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"subscribe",subscription:sub.toJSON()})});
     setTestNote("이 기기의 알림 등록이 서버 키와 달라서 방금 다시 등록했어요. 이제 시험 알림을 눌러보세요.");
    }catch{sub=null}
   }
   setWhy(reason||(res&&!res.ready?"알림이 아직 설정되지 않았어요. 운영자가 설정해야 해요.":""));
   setS(res??{ready:false,key:"",devices:0});
   setOn(!!sub);
   if(sub)loadTrace();
  })();
 },[]);

 async function turnOn(){
  setBusy(true);
  try{
   const ok=await Notification.requestPermission();
   if(ok!=="granted")throw new Error("알림을 허용해야 받을 수 있어요.");
   const reg=await navigator.serviceWorker.register("/sw.js");
   await navigator.serviceWorker.ready;
   const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(s!.key)});
   const res=await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"subscribe",subscription:sub.toJSON()})});
   const out=await res.json().catch(()=>({})) as {error?:string;devices?:number};
   if(!res.ok)throw new Error(out.error||"알림을 켜지 못했어요.");
   setOn(true);setS(v=>v?{...v,devices:out.devices??v.devices}:v);
   toast.success("이 기기로 알림을 받아요.");
  }catch(e){toast.error(e instanceof Error?e.message:"알림을 켜지 못했어요.")}
  finally{setBusy(false)}
 }
 // 평소 알림은 **만든 사람 본인에게는 가지 않는다.** 그래서 혼자 쓰는 동안에는
 // 푸시가 되는지 확인할 길이 없었다. 이 단추만 그 규칙을 건너뛴다.
 async function sendTest(){
  setBusy(true);
  setHeard("");
  setTestNote("보내는 중이에요 · 푸시 서버가 늦으면 20초쯤 걸릴 수 있어요.");
  try{
   // 이 기기 등록을 서버에 다시 한 번 올린다(같은 주소면 덮어쓴다). 다른 브라우저에서
   // 켰던 등록만 남아 있으면 시험이 엉뚱한 곳으로 가서 "보냈어요" 만 뜬다.
   const reg=await navigator.serviceWorker?.getRegistration?.().catch(()=>null);
   const mine=await reg?.pushManager?.getSubscription?.().catch(()=>null);
   if(mine)await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"subscribe",subscription:mine.toJSON()})}).catch(()=>null);
   const res=await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"test",endpoint:mine?.endpoint??""})});
   const out=await res.json().catch(()=>({})) as {ok?:boolean;sent?:number;devices?:number;hosts?:string;via?:string;reason?:string;probe?:string[];error?:string};
   if(!res.ok)throw new Error(out.error||"시험 알림을 보내지 못했어요.");
   if(out.ok){
    toast.success((out.sent??0)+"대에 보냈어요. 잠시 뒤 잠금화면을 확인해주세요.");
    setTestNote("보냈어요 · "+browserName()+" · 이 기기 "+(out.sent??0)+"대 · 푸시 서버 "+(out.hosts||"알 수 없음")+
     (out.via?" (닿지 않아 "+out.via+" 로 돌아서 보냄)":"")+
     " · "+new Date().toLocaleTimeString("ko-KR")+". 이 화면을 열어 둔 채 30초만 기다려 주세요. 폰이 신호를 받으면 아래에 한 줄이 더 생겨요.");
   }else{
    toast.error(out.reason?"보내지 못했어요 · "+out.reason:"보내지 못했어요.");
    setTestNote("보내지 못했어요 · "+(out.reason||"이유를 알 수 없어요")+
     (out.probe?.length?" · 연결 확인: "+out.probe.join(" / "):"")+" · 이 줄을 그대로 알려주세요.");
   }
  }catch(e){const m=e instanceof Error?e.message:"시험 알림을 보내지 못했어요.";toast.error(m);setTestNote("보내지 못했어요 · "+m)}
  finally{setBusy(false);loadTrace()}
 }
 // 서버도 구글도 거치지 않고 이 폰에서 바로 알림을 띄워 본다. 이게 안 보이면
 // 폰(브라우저)의 알림 표시가 막힌 것이고, 보이면 표시는 정상이라 배달 쪽 문제다.
 async function showHere(){
  try{
   if(Notification.permission!=="granted")throw new Error("알림 권한이 "+Notification.permission+" 상태예요");
   const reg=await navigator.serviceWorker.ready;
   await reg.showNotification("팀킥 시험 알림",{body:"이 알림이 보이면 폰의 알림 표시는 정상이에요.",
    icon:"/icon-192.png",badge:"/icon-192.png",tag:"teamkick-local"});
   setTestNote("이 폰에서 바로 띄웠어요 · "+browserName()+" · "+new Date().toLocaleTimeString("ko-KR")+
    ". 알림창(위에서 끌어내리기)에 ‘팀킥 시험 알림’ 이 보이는지 알려주세요.");
  }catch(e){setTestNote("이 폰에서 바로 띄우지 못했어요 · "+browserName()+" · "+(e instanceof Error?e.message:String(e)))}
 }
 async function turnOff(){
  setBusy(true);
  try{
   const reg=await navigator.serviceWorker.getRegistration();
   const sub=await reg?.pushManager.getSubscription();
   if(sub){
    await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({action:"unsubscribe",endpoint:sub.endpoint})});
    await sub.unsubscribe();
   }
   setOn(false);toast.success("이 기기 알림을 껐어요.");
  }catch{toast.error("알림을 끄지 못했어요.")}
  finally{setBusy(false)}
 }

 if(!s)return null;
 const blocked=!!why||!s.ready||!s.key;
 return <div className="notice">
  <div className="row between">
   <div>
    <p><strong>기기 알림</strong>{on&&<span className="badge badge-green" style={{marginLeft:8}}>켜짐</span>}</p>
    <span>{blocked?why||"알림을 준비 중이에요.":on
     ? "새 경기·팀 공지·매칭 신청·가입 신청 같은 새 소식을 잠금화면으로 알려드려요."
     : "켜두면 앱을 열지 않아도 소식을 받을 수 있어요."}</span>
   </div>
   {!blocked&&<button type="button" className={"btn "+(on?"":"btn-green")} disabled={busy} onClick={on?turnOff:turnOn}>
    {busy?<LoaderCircle className="loader" size={16}/>:on?<BellOff size={16}/>:<Bell size={16}/>}
    {on?"끄기":"알림 켜기"}
   </button>}
  </div>
  {on&&!blocked&&<>
   <div className="action-strip">
    <button type="button" className="btn" disabled={busy} onClick={sendTest}>이 기기로 시험 알림 보내기</button>
    <button type="button" className="btn" disabled={busy} onClick={showHere}>이 폰에서 바로 띄워보기</button>
   </div>
   {testNote&&<p className="data-note" role="status" style={{userSelect:"text"}}><strong>시험 결과</strong> · {testNote}</p>}
   {heard&&<p className="data-note" role="status" style={{userSelect:"text"}}>{heard}</p>}
   {trace&&<div className="push-trace" role="status" style={{userSelect:"text"}}>
    <div className="row between"><strong>이 기기 알림 기록</strong>
     <button type="button" className="text-link" onClick={()=>loadTrace()}>새로고침</button></div>
    {traceLines(trace).map(x=><p key={x} className="data-note">{x}</p>)}
    <p className="data-note">다른 팀원이 공지를 올린 뒤 이 화면을 열면, 그 알림이 어디까지 왔는지 보여요.</p>
   </div>}
   <p className="data-note">평소 알림은 <strong>내가 한 일에는 오지 않아요.</strong> 다른 팀원이 공지를 올리거나 경기를 만들 때 옵니다. 혼자 확인하실 때는 위 단추를 눌러주세요.</p>
   {isIos()&&<p className="data-note">아이폰은 <strong>홈 화면에 추가한 아이콘으로 연 창</strong>에서만 알림과 아이콘 숫자가 나와요. 사파리 탭에서는 오지 않아요.</p>}
  </>}
  <NotifyHelp/>
 </div>;
}
