"use client";
import {useState,useEffect} from "react";
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
  setTestNote("보내는 중이에요 · 푸시 서버가 늦으면 20초쯤 걸릴 수 있어요.");
  try{
   const res=await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"test"})});
   const out=await res.json().catch(()=>({})) as {ok?:boolean;sent?:number;devices?:number;hosts?:string;via?:string;reason?:string;probe?:string[];error?:string};
   if(!res.ok)throw new Error(out.error||"시험 알림을 보내지 못했어요.");
   if(out.ok){
    toast.success((out.sent??0)+"대에 보냈어요. 잠시 뒤 잠금화면을 확인해주세요.");
    setTestNote("보냈어요 · 기기 "+(out.sent??0)+"대 · 푸시 서버 "+(out.hosts||"알 수 없음")+
     (out.via?" (닿지 않아 "+out.via+" 로 돌아서 보냄)":"")+
     " · "+new Date().toLocaleTimeString("ko-KR")+". 몇 초 안에 잠금화면에 뜨지 않으면 이 줄을 그대로 알려주세요.");
   }else{
    toast.error(out.reason?"보내지 못했어요 · "+out.reason:"보내지 못했어요.");
    setTestNote("보내지 못했어요 · "+(out.reason||"이유를 알 수 없어요")+
     (out.probe?.length?" · 연결 확인: "+out.probe.join(" / "):"")+" · 이 줄을 그대로 알려주세요.");
   }
  }catch(e){const m=e instanceof Error?e.message:"시험 알림을 보내지 못했어요.";toast.error(m);setTestNote("보내지 못했어요 · "+m)}
  finally{setBusy(false)}
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
   <div className="action-strip"><button type="button" className="btn" disabled={busy} onClick={sendTest}>이 기기로 시험 알림 보내기</button></div>
   {testNote&&<p className="data-note" role="status" style={{userSelect:"text"}}><strong>시험 결과</strong> · {testNote}</p>}
   <p className="data-note">평소 알림은 <strong>내가 한 일에는 오지 않아요.</strong> 다른 팀원이 공지를 올리거나 경기를 만들 때 옵니다. 혼자 확인하실 때는 위 단추를 눌러주세요.</p>
   {isIos()&&<p className="data-note">아이폰은 <strong>홈 화면에 추가한 아이콘으로 연 창</strong>에서만 알림과 아이콘 숫자가 나와요. 사파리 탭에서는 오지 않아요.</p>}
  </>}
 </div>;
}
