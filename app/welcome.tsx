"use client";
// 가입 직후(또는 이 기기에서 처음) 한 번 뜨는 사용 안내. 4단계:
// ① 팀킥으로 할 수 있는 것 ② 기기 알림 켜기 ③ 홈 화면에 추가 ④ 시작하기(팀 찾기·만들기).
// 알림·설치는 기기마다 따로라서 "봤다" 표시도 이 기기에만 남긴다(서버 기록 아님).
// MY → 설정의 "사용법 다시 보기"로 언제든 다시 연다.
import {useEffect,useState} from "react";
import {CalendarCheck,Shuffle,Trophy,ClipboardCheck,Bell,Download,Share,Search,Plus,Link2,LoaderCircle,Check} from "lucide-react";
import {toast} from "sonner";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {pushStatus,turnOnPush,type PushStatus} from "./notify";
import {installState,promptInstall} from "./install";

const SEEN="teamkick_welcome_v1";
const seen=()=>{try{return localStorage.getItem(SEEN)==="1"}catch{return true}};
const markSeen=()=>{try{localStorage.setItem(SEEN,"1")}catch{}};
export const openWelcome=()=>window.dispatchEvent(new Event("teamkick-welcome"));

export function WelcomeGuide({ready,hasTeam,onCreateTeam,onFindTeam}:{ready:boolean;hasTeam:boolean;onCreateTeam:()=>void;onFindTeam:()=>void}){
 const [open,setOpen]=useState(false);
 const [step,setStep]=useState(0);
 const [push,setPush]=useState<PushStatus|"">("");
 const [busy,setBusy]=useState(false);
 const [inst,setInst]=useState<ReturnType<typeof installState>|null>(null);
 useEffect(()=>{
  const show=()=>{setStep(0);setOpen(true)};
  window.addEventListener("teamkick-welcome",show);
  // 로그인한 실제 계정에서만, 이 기기에서 처음 한 번
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장소는 화면을 그린 뒤에만 읽을 수 있다
  if(ready&&!seen())setOpen(true);
  return()=>window.removeEventListener("teamkick-welcome",show);
 },[ready]);
 useEffect(()=>{
  if(!open)return;
  pushStatus().then(setPush).catch(()=>setPush("unsupported"));
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 환경은 열린 뒤에만 읽는다
  setInst(installState());
  const ready=()=>setInst(installState());window.addEventListener("teamkick-install-ready",ready);
  return()=>window.removeEventListener("teamkick-install-ready",ready);
 },[open]);
 function close(){markSeen();setOpen(false)}
 async function enable(){
  setBusy(true);
  try{await turnOnPush();setPush("on");toast.success("이 기기로 알림을 받아요.")}
  catch(e){toast.error(e instanceof Error?e.message:"알림을 켜지 못했어요.");setPush(await pushStatus().catch(()=>"unsupported" as PushStatus))}
  finally{setBusy(false)}
 }
 async function install(){const ok=await promptInstall();setInst(installState());if(ok)toast.success("홈 화면에 추가했어요.")}
 const steps=["사용법","알림","홈 화면","시작"];
 const last=steps.length-1;
 return <Dialog open={open} onOpenChange={o=>{if(!o)close()}}>
  <DialogContent className="sm:max-w-[460px] rounded-2xl welcome">
   <DialogHeader><DialogTitle>{["팀킥은 이렇게 써요","경기 소식을 놓치지 않게","앱처럼 한 번에 열기","이제 시작해요"][step]}</DialogTitle>
    <DialogDescription>{["우리 팀 경기 준비부터 기록까지 한곳에서.","알림을 켜면 잠금화면으로 바로 알려드려요.","홈 화면에 추가하면 아이콘을 눌러 바로 열려요.",hasTeam?"우리 팀 공간이 준비돼 있어요.":"팀에 들어가야 일정·투표·기록이 열려요."][step]}</DialogDescription></DialogHeader>
   <ol className="welcome-dots" aria-label={"안내 "+(step+1)+"/"+steps.length}>{steps.map((s,i)=><li key={s} className={i===step?"on":i<step?"done":""}>{s}</li>)}</ol>

   {step===0&&<ul className="welcome-list">
    <li><span><CalendarCheck size={19}/></span><div><strong>일정과 참석 투표</strong><p>주장이 경기를 올리면 참여·미참여를 눌러요. 마감 전엔 바꿀 수 있어요.</p></div></li>
    <li><span><ClipboardCheck size={19}/></span><div><strong>출석과 골·도움 기록</strong><p>경기 뒤 실제 출석을 확정하고 누가 골·도움을 했는지 남겨요.</p></div></li>
    <li><span><Shuffle size={19}/></span><div><strong>자체전 팀 나누기</strong><p>우리끼리 뛰는 날엔 1팀·2팀으로 자동으로 고르게 나눠요.</p></div></li>
    <li><span><Trophy size={19}/></span><div><strong>경기 후 MVP 투표</strong><p>출석한 사람끼리 오늘의 MVP를 뽑고, 득점왕·도움왕·출석왕이 쌓여요.</p></div></li>
   </ul>}

   {step===1&&<div className="welcome-body">
    <ul className="welcome-mini"><li>새 경기가 올라왔을 때</li><li>참석 투표를 아직 안 했을 때</li><li>팀 공지·회칙이 바뀌었을 때</li><li>MVP 투표가 열렸을 때</li></ul>
    {push==="on"?<p className="welcome-ok"><Check size={16}/>이 기기는 알림이 켜져 있어요.</p>
     :push==="ios-install"?<p className="data-note">아이폰은 <strong>먼저 홈 화면에 추가</strong>한 뒤, 추가된 팀킥 아이콘으로 열어야 알림을 켤 수 있어요. 다음 단계에서 방법을 알려드려요.</p>
     :push==="denied"?<p className="data-note">이 브라우저에서 알림이 차단돼 있어요. 브라우저 설정 → 사이트 설정 → 알림에서 팀킥을 허용해주세요.</p>
     :push==="unsupported"?<p className="data-note">이 브라우저는 기기 알림을 지원하지 않아요. 앱 안 알림함(종 모양)으로 확인할 수 있어요.</p>
     :push==="server-off"?<p className="data-note">지금은 기기 알림을 준비하고 있어요. 앱 안 알림함(종 모양)으로 먼저 확인해주세요.</p>
     :<button className="btn btn-green welcome-cta" disabled={busy||!push} onClick={enable}>{busy?<LoaderCircle className="loader" size={16}/>:<Bell size={16}/>}알림 켜기</button>}
    <p className="data-note">나중에 MY → 기기 알림에서 켜고 끌 수 있어요.</p>
   </div>}

   {step===2&&<div className="welcome-body">
    {inst?.installed?<p className="welcome-ok"><Check size={16}/>이미 앱처럼 열고 있어요.</p>
     :inst?.prompt?<button className="btn btn-green welcome-cta" onClick={install}><Download size={16}/>홈 화면에 추가</button>
     :<div className="welcome-how">{inst?.how==="ios"?<><strong>아이폰 사파리</strong><p>화면 아래 <Share size={14} style={{verticalAlign:"-2px"}}/> <b>공유</b> → <b>홈 화면에 추가</b> → 오른쪽 위 <b>추가</b></p></>
      :inst?.how==="samsung"?<><strong>삼성 인터넷</strong><p>오른쪽 아래 <b>≡ 메뉴</b> → <b>현재 페이지 추가</b> → <b>홈 화면</b></p></>
      :<><strong>크롬 등</strong><p>오른쪽 위 <b>⋮ 메뉴</b> → <b>홈 화면에 추가</b> 또는 <b>앱 설치</b></p></>}</div>}
    <p className="data-note">주소창 없이 열리고, 아이폰은 이렇게 해야 알림도 받을 수 있어요.</p>
   </div>}

   {step===3&&<div className="welcome-body">
    {hasTeam?<p className="welcome-ok"><Check size={16}/>홈에서 다음 경기와 참석 투표를 확인하세요.</p>:<div className="welcome-start">
     <button className="welcome-pick" onClick={()=>{close();onFindTeam()}}><Search size={18}/><span><strong>우리 팀을 찾을게요</strong><small>팀 이름이나 지역으로 찾아 가입을 신청해요</small></span></button>
     <button className="welcome-pick" onClick={()=>{close();onCreateTeam()}}><Plus size={18}/><span><strong>새 팀을 만들게요</strong><small>등록을 신청하면 운영자가 확인해요</small></span></button>
     <div className="welcome-pick static"><Link2 size={18}/><span><strong>초대 링크·QR을 받았어요</strong><small>받은 링크를 다시 열거나 QR을 찍으면 가입 신청 창이 떠요</small></span></div>
    </div>}
   </div>}

   <div className="welcome-foot">
    {step>0?<button className="btn btn-ghost" onClick={()=>setStep(step-1)}>이전</button>:<button className="btn btn-ghost" onClick={close}>건너뛰기</button>}
    {step<last?<button className="btn btn-green" onClick={()=>setStep(step+1)}>다음</button>:<button className="btn btn-green" onClick={close}>{hasTeam?"시작하기":"닫기"}</button>}
   </div>
  </DialogContent>
 </Dialog>;
}
