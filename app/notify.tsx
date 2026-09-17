"use client";
import {useState,useEffect} from "react";
import {Bell,BellOff,LoaderCircle} from "lucide-react";
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

type State={ready:boolean;key:string;devices:number};

export function NotifyToggle(){
 const [s,setS]=useState<State|null>(null);
 const [on,setOn]=useState(false);
 const [busy,setBusy]=useState(false);
 const [why,setWhy]=useState("");

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
   const sub=await reg?.pushManager?.getSubscription?.().catch(()=>null);
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
     ? "경기 등록과 투표 마감을 잠금화면으로 알려드려요."
     : "켜두면 앱을 열지 않아도 소식을 받을 수 있어요."}</span>
   </div>
   {!blocked&&<button type="button" className={"btn "+(on?"":"btn-green")} disabled={busy} onClick={on?turnOff:turnOn}>
    {busy?<LoaderCircle className="loader" size={16}/>:on?<BellOff size={16}/>:<Bell size={16}/>}
    {on?"끄기":"알림 켜기"}
   </button>}
  </div>
 </div>;
}
