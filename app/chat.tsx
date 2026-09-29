"use client";
// 팀 채팅 · 경기 대화(1.16). 메시지는 /api/chat 이 따로 저장하고, 화면은 열려 있는 동안만 새 글을 묻는다.
// 새 글을 보내면 /api/app 의 chatPing 으로 방 사람들에게 "새 메시지" 알림을 남긴다(10분에 한 번, 내용 없이).
// 1.17: 방 목록은 3개까지 보이고 [더보기], 왼쪽으로 밀면 [삭제](내 목록에서만 숨김), 경기 대화 맨 위에 매칭 신청 카드
// (신청 메시지 · 상대 프로필 · 모집 팀 주장에게 수락/거절), 보낸 글은 바로 보이고 서버 응답으로 바꾼다.
import {useEffect,useRef,useState,type PointerEvent as RPointerEvent} from "react";
import {Send,MessageCircle,Flag,Trash2,LoaderCircle,ChevronDown,Shield,Handshake} from "lucide-react";
import {toast} from "sonner";

type Msg={id:string;name:string;body:string;deleted:boolean;at:string;mine:boolean;sending?:boolean};
type Req={id:string;status:string;message:string;at:string;teamId:string;teamName:string;matched:boolean};
type RoomInfo={room:string;kind:string;title:string;sub:string;unread?:number;pending?:boolean;last?:{name:string;body:string;at:string}|null;
 request?:Req|null;otherTeamId?:string;homeTeamId?:string;canDecide?:boolean;gameId?:string};
type Resp={error?:string;rooms?:RoomInfo[];room?:RoomInfo;messages?:Msg[];message?:Msg;excerpt?:string};
const hm=(at:string)=>{const d=new Date(Date.parse(at)+9*3600e3),h=d.getUTCHours(),m=d.getUTCMinutes();return (h<12?"오전 ":"오후 ")+(h%12||12)+":"+String(m).padStart(2,"0")};
const day=(at:string)=>{const d=new Date(Date.parse(at)+9*3600e3);return (d.getUTCMonth()+1)+"월 "+d.getUTCDate()+"일 ("+"일월화수목금토"[d.getUTCDay()]+")"};
const post=(url:string,body:unknown)=>fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const REQ_LABEL:Record<string,string>={pending:"수락 대기",accepted:"매칭 확정",rejected:"거절됨",withdrawn:"신청 철회",closed:"모집 종료",changed:"조건 변경"};

async function ping(room:string,viewTeam:string){
 // 알림은 실패해도 메시지는 이미 보내졌다. 조용히 넘어간다.
 try{await post("/api/app",{type:"chatPing",room,viewTeam,mutationId:crypto.randomUUID()})}catch{}
}

// 한 줄: 왼쪽으로 밀면 [삭제]가 드러난다. 조금만 밀면 제자리로 돌아온다.
function RoomRow({r,onOpen,onHide}:{r:RoomInfo;onOpen:()=>void;onHide:()=>void}){
 const [dx,setDx]=useState(0),[open,setOpen]=useState(false),[drag,setDrag]=useState(false);
 const start=useRef<{x:number;y:number;base:number;moved:boolean}|null>(null);
 const W=84;
 function down(e:RPointerEvent<HTMLDivElement>){start.current={x:e.clientX,y:e.clientY,base:open?-W:0,moved:false};setDrag(true)}
 function move(e:RPointerEvent<HTMLDivElement>){const s=start.current;if(!s)return;const x=e.clientX-s.x,y=e.clientY-s.y;
  if(!s.moved&&Math.abs(x)<8)return;if(!s.moved&&Math.abs(y)>Math.abs(x)){start.current=null;return}
  s.moved=true;setDx(Math.max(-W-24,Math.min(0,s.base+x)))}
 function up(){const s=start.current;start.current=null;setDrag(false);if(!s)return;if(!s.moved){if(open){setOpen(false);setDx(0)}else onOpen();return}
  const o=dx<-W/2;setOpen(o);setDx(o?-W:0)}
 return <div className="chat-swipe">
  <button type="button" className="chat-del" onClick={onHide} tabIndex={open?0:-1}><Trash2 size={16}/>삭제</button>
  <div className="chat-room" role="button" tabIndex={0} style={{transform:"translateX("+dx+"px)",transition:drag?"none":"transform .18s ease"}}
   onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{start.current=null;setDrag(false);setDx(open?-W:0)}}
   onKeyDown={e=>{if(e.key==="Enter")onOpen();if(e.key==="Delete")onHide()}}>
   <span className={"chat-ico "+r.kind}>{r.kind==="match"?<Handshake size={18}/>:<MessageCircle size={18}/>}</span>
   <span className="chat-room-main"><b>{r.title}{r.pending&&<em className="chat-tag">신청</em>}</b><small>{r.last?(r.last.name.split(" · ")[0]+": "+r.last.body):r.sub}</small></span>
   <span className="chat-room-side">{r.last&&<small>{day(r.last.at).replace(/ \(.\)$/,"")}</small>}{!!r.unread&&<i>{r.unread>=99?"99+":r.unread}</i>}</span>
  </div>
 </div>;
}

export function ChatRooms({demo,onOpen}:{demo:boolean;onOpen:(room:string)=>void}){
 const [rooms,setRooms]=useState<RoomInfo[]|null>(null),[err,setErr]=useState(""),[all,setAll]=useState(false),[ask,setAsk]=useState<RoomInfo|null>(null);
 useEffect(()=>{if(demo)return;let live=true;
  fetch("/api/chat",{cache:"no-store"}).then(async r=>{const b=await r.json().catch(()=>({})) as Resp;if(!r.ok)throw new Error(b.error||"채팅을 불러오지 못했어요.");if(live)setRooms(b.rooms??[])}).catch(e=>{if(live)setErr(e.message)});
  return()=>{live=false}},[demo]);
 async function hide(r:RoomInfo){
  setAsk(null);const before=rooms;setRooms(x=>(x??[]).filter(y=>y.room!==r.room));
  const res=await post("/api/app",{type:"hideChat",room:r.room,mutationId:crypto.randomUUID()}).catch(()=>null);
  if(!res?.ok){setRooms(before);toast.error("지우지 못했어요.");return}
  toast.success("목록에서 지웠어요. 새 글이 오면 다시 보여요.");
 }
 if(demo)return <p className="small muted">샘플에서는 채팅을 쓸 수 없어요.</p>;
 if(err)return <p className="data-note">{err}</p>;
 if(!rooms)return <div className="chat-rooms">{[0,1].map(i=><div key={i} className="chat-room skeleton-row"><span className="chat-ico"/><span className="chat-room-main"><b className="sk"/><small className="sk"/></span></div>)}</div>;
 if(!rooms.length)return <p className="small muted">팀에 가입하면 팀 채팅방이 생겨요. 매칭을 신청하거나 받으면 상대 팀 주장·운영진과의 경기 대화방이 생겨요.</p>;
 const shown=all?rooms:rooms.slice(0,3);
 return <div className="chat-rooms">
  {shown.map(r=><RoomRow key={r.room} r={r} onOpen={()=>onOpen(r.room)} onHide={()=>setAsk(r)}/>)}
  {rooms.length>3&&<button type="button" className="chat-more" onClick={()=>setAll(x=>!x)}>{all?"접기":"더보기 "+(rooms.length-3)+"개"}<ChevronDown size={15} style={{transform:all?"rotate(180deg)":"none"}}/></button>}
  {ask&&<div className="chat-ask" role="alertdialog" aria-label="채팅방 삭제"><p><b>{ask.title}</b> 방을 목록에서 지울까요?</p><small>대화 내용은 지워지지 않고, 새 글이 오면 다시 보여요.</small><div className="row"><button type="button" className="btn btn-danger" onClick={()=>hide(ask)}>삭제</button><button type="button" className="btn" onClick={()=>setAsk(null)}>취소</button></div></div>}
  <p className="chat-hint">방을 왼쪽으로 밀면 삭제할 수 있어요.</p>
 </div>;
}

type Run=(c:Record<string,unknown>)=>Promise<unknown>;
export function ChatRoom({room,viewTeam,demo,run,onProfile}:{room:string;viewTeam:string;demo:boolean;run?:Run;onProfile?:(teamId:string)=>void}){
 const [info,setInfo]=useState<RoomInfo|null>(null),[msgs,setMsgs]=useState<Msg[]>([]),[err,setErr]=useState(""),[text,setText]=useState(""),[menu,setMenu]=useState(""),[deciding,setDeciding]=useState("");
 const last=useRef(""),box=useRef<HTMLDivElement>(null),pullRef=useRef<()=>Promise<void>>(async()=>{});
 useEffect(()=>{
  if(demo)return;let live=true,busy=false;last.current="";
  const pull=async()=>{
   if(document.visibilityState==="hidden"||busy)return;busy=true;
   try{
    const r=await fetch("/api/chat?"+new URLSearchParams({room,after:last.current}).toString(),{cache:"no-store"});
    const b=await r.json().catch(()=>({})) as Resp;if(!r.ok)throw new Error(b.error||"채팅을 불러오지 못했어요.");
    if(!live)return;setInfo(b.room??null);setErr("");
    const got:Msg[]=b.messages??[];if(got.length){last.current=got[got.length-1].at;setMsgs(m=>{const seen=new Set(m.map(x=>x.id));return [...m.filter(x=>!x.sending),...got.filter(x=>!seen.has(x.id))]})}
   }catch(e){if(live)setErr(e instanceof Error?e.message:"채팅을 불러오지 못했어요.")}
   finally{busy=false}
  };
  pullRef.current=pull;
  pull();const timer=setInterval(pull,2500);
  const vis=()=>{if(document.visibilityState==="visible")pull()};document.addEventListener("visibilitychange",vis);
  return()=>{live=false;clearInterval(timer);document.removeEventListener("visibilitychange",vis)};
 },[room,demo]);
 useEffect(()=>{const el=box.current;if(el)el.scrollTop=el.scrollHeight},[msgs.length,info?.request?.status]);
 async function send(){
  const body=text.trim();if(!body)return;
  // 바로 보이게 먼저 붙이고, 서버 답이 오면 진짜 글로 바꾼다. 실패하면 되돌리고 입력을 살려 둔다.
  const temp:Msg={id:"tmp-"+crypto.randomUUID(),name:"",body,deleted:false,at:new Date().toISOString(),mine:true,sending:true};
  setText("");setMsgs(m=>[...m,temp]);
  try{
   const r=await post("/api/chat",{action:"send",room,body});
   const b=await r.json().catch(()=>({})) as Resp;if(!r.ok)throw new Error(b.error||"보내지 못했어요.");
   const sent=b.message;if(!sent)throw new Error("보내지 못했어요.");last.current=sent.at;setMsgs(m=>m.map(x=>x.id===temp.id?sent:x));ping(room,viewTeam);
  }catch(e){setMsgs(m=>m.filter(x=>x.id!==temp.id));setText(t=>t||body);toast.error(e instanceof Error?e.message:"보내지 못했어요.")}
 }
 async function remove(m:Msg){
  setMenu("");const r=await post("/api/chat",{action:"delete",id:m.id});
  if(r.ok)setMsgs(x=>x.map(y=>y.id===m.id?{...y,deleted:true,body:""}:y));else toast.error("지우지 못했어요.");
 }
 async function report(m:Msg){
  setMenu("");const r=await post("/api/chat",{action:"report",id:m.id,reason:"부적절한 메시지"});
  const b=await r.json().catch(()=>({})) as Resp&{room?:string};
  if(!r.ok){toast.error(b.error||"신고하지 못했어요.");return}
  post("/api/app",{type:"chatReported",room:b.room,excerpt:b.excerpt,viewTeam,mutationId:crypto.randomUUID()}).catch(()=>null);
  toast.success("신고했어요. 운영자가 확인해요.");
 }
 // 채팅 안에서 매칭 수락·거절(모집 팀 주장). 앱 상태도 함께 새로 받아 홈·일정에 상대가 바로 들어간다.
 async function decide(accept:boolean){
  const q=info?.request;if(!q||!info?.homeTeamId||!info.gameId||!run)return;
  setDeciding(accept?"accept":"reject");
  try{await run({type:accept?"acceptMatch":"rejectMatch",teamId:info.homeTeamId,gameId:info.gameId,requestId:q.id});await pullRef.current()}
  catch{/* run 이 이미 오류를 띄웠다 */}
  finally{setDeciding("")}
 }
 if(demo)return <p className="small muted">샘플에서는 채팅을 쓸 수 없어요. 우리 팀을 시작하면 팀원들과 대화할 수 있어요.</p>;
 const q=info?.request;
 return <div className="chat">
  <div className="chat-head">
   <div><b>{info?.title??"채팅"}</b>{info?.sub&&<small>{info.sub}</small>}</div>
   {info?.kind==="match"&&info.otherTeamId&&onProfile&&<button type="button" className="btn btn-small" onClick={()=>onProfile(info.otherTeamId!)}><Shield size={15}/>상대 프로필</button>}
  </div>
  <div className="chat-box" ref={box}>
   {q&&<div className="chat-request">
    <div className="row between"><strong>{q.teamName} 매칭 신청</strong><span className={"badge "+(q.status==="accepted"?"badge-green":q.status==="pending"?"badge-orange":"")}>{REQ_LABEL[q.status]??q.status}</span></div>
    <p>{q.message||"메시지 없이 신청했어요."}</p>
    <small>{day(q.at)} {hm(q.at)}</small>
    {info?.canDecide&&q.status==="pending"&&<div className="chat-decide"><span>매칭을 수락하시겠어요?</span><div className="row">
     <button type="button" className="btn btn-green" disabled={!!deciding} onClick={()=>decide(true)}>{deciding==="accept"?<LoaderCircle className="loader" size={16}/>:null}수락</button>
     <button type="button" className="btn" disabled={!!deciding} onClick={()=>decide(false)}>거절</button></div>
     <small>수락하면 이 팀과 매칭이 확정되고, 홈·일정의 상대팀에 바로 들어가요.</small></div>}
    {q.status==="accepted"&&<small className="chat-ok">매칭이 확정됐어요. 이 방은 경기 60일 뒤까지 남아요.</small>}
   </div>}
   {!msgs.length&&!err&&!q&&<div className="chat-empty"><MessageCircle size={28}/><span>첫 메시지를 보내 대화를 시작해 보세요.</span>{info?.kind==="match"&&<small>계좌번호 같은 정보는 이 방 사람(두 팀 주장·운영진)에게만 보여요. 경기 60일 뒤 지워져요.</small>}</div>}
   {msgs.map((m,i)=>{const d=day(m.at),show=i===0||day(msgs[i-1].at)!==d;return <div key={m.id}>
    {show&&<div className="chat-day">{d}</div>}
    <div className={"chat-msg"+(m.mine?" mine":"")+(m.sending?" sending":"")}>
     {!m.mine&&<span className="chat-name">{m.name}</span>}
     <div className="chat-line">
      <button type="button" className={"chat-bubble"+(m.deleted?" gone":"")} onClick={()=>!m.deleted&&!m.sending&&setMenu(menu===m.id?"":m.id)}>{m.deleted?"삭제된 메시지예요":m.body}</button>
      <small>{m.sending?"보내는 중":hm(m.at)}</small>
     </div>
     {menu===m.id&&<div className="chat-menu">{m.mine?<button type="button" onClick={()=>remove(m)}><Trash2 size={14}/>지우기</button>:<button type="button" onClick={()=>report(m)}><Flag size={14}/>신고</button>}</div>}
    </div>
   </div>})}
  </div>
  {err&&<p className="data-note" role="alert">{err}</p>}
  <form className="chat-input" onSubmit={e=>{e.preventDefault();send()}}>
   <textarea value={text} onChange={e=>setText(e.target.value.slice(0,1000))} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}} rows={1} placeholder="메시지 입력" aria-label="메시지 입력"/>
   <button type="submit" className="btn btn-green" disabled={!text.trim()} aria-label="보내기"><Send size={17}/></button>
  </form>
 </div>;
}
