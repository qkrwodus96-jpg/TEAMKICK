"use client";
// 팀 채팅 · 경기 대화(1.16). 메시지는 /api/chat 이 따로 저장하고, 화면은 열려 있는 동안만 4초마다 새 글을 묻는다.
// 새 글을 보내면 /api/app 의 chatPing 으로 방 사람들에게 "새 메시지" 알림을 남긴다(10분에 한 번, 내용 없이).
import {useEffect,useRef,useState} from "react";
import {Send,MessageCircle,Flag,Trash2,LoaderCircle} from "lucide-react";
import {toast} from "sonner";

type Msg={id:string;name:string;body:string;deleted:boolean;at:string;mine:boolean};
type Resp={error?:string;rooms?:RoomInfo[];room?:RoomInfo;messages?:Msg[];message?:Msg;excerpt?:string};
type RoomInfo={room:string;kind:string;title:string;sub:string;unread?:number;last?:{name:string;body:string;at:string}|null};
const hm=(at:string)=>{const d=new Date(Date.parse(at)+9*3600e3),h=d.getUTCHours(),m=d.getUTCMinutes();return (h<12?"오전 ":"오후 ")+(h%12||12)+":"+String(m).padStart(2,"0")};
const day=(at:string)=>{const d=new Date(Date.parse(at)+9*3600e3);return (d.getUTCMonth()+1)+"월 "+d.getUTCDate()+"일 ("+"일월화수목금토"[d.getUTCDay()]+")"};

async function ping(room:string,viewTeam:string){
 // 알림은 실패해도 메시지는 이미 보내졌다. 조용히 넘어간다.
 try{await fetch("/api/app",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"chatPing",room,viewTeam,mutationId:crypto.randomUUID()})})}catch{}
}

export function ChatRooms({demo,onOpen}:{demo:boolean;onOpen:(room:string)=>void}){
 const [rooms,setRooms]=useState<RoomInfo[]|null>(null),[err,setErr]=useState("");
 useEffect(()=>{if(demo)return;let live=true;
  fetch("/api/chat",{cache:"no-store"}).then(async r=>{const b=await r.json().catch(()=>({})) as Resp;if(!r.ok)throw new Error(b.error||"채팅을 불러오지 못했어요.");if(live)setRooms(b.rooms??[])}).catch(e=>{if(live)setErr(e.message)});
  return()=>{live=false}},[demo]);
 if(demo)return <p className="small muted">샘플에서는 채팅을 쓸 수 없어요.</p>;
 if(err)return <p className="data-note">{err}</p>;
 if(!rooms)return <p className="small muted">채팅방을 불러오는 중…</p>;
 if(!rooms.length)return <p className="small muted">팀에 가입하면 팀 채팅방이 생겨요. 매칭을 신청하거나 받으면 상대 팀 주장·운영진과의 경기 대화방이 생겨요.</p>;
 return <div className="chat-rooms">{rooms.map(r=><button type="button" key={r.room} className="chat-room" onClick={()=>onOpen(r.room)}>
  <span className={"chat-ico "+r.kind}><MessageCircle size={18}/></span>
  <span className="chat-room-main"><b>{r.title}</b><small>{r.last?(r.last.name.split(" · ")[0]+": "+r.last.body):r.sub}</small></span>
  <span className="chat-room-side">{r.last&&<small>{day(r.last.at).replace(/ \(.\)$/,"")}</small>}{!!r.unread&&<i>{r.unread>=99?"99+":r.unread}</i>}</span>
 </button>)}</div>;
}

export function ChatRoom({room,viewTeam,demo}:{room:string;viewTeam:string;demo:boolean}){
 const [info,setInfo]=useState<RoomInfo|null>(null),[msgs,setMsgs]=useState<Msg[]>([]),[err,setErr]=useState(""),[text,setText]=useState(""),[sending,setSending]=useState(false),[menu,setMenu]=useState("");
 const last=useRef(""),box=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(demo)return;let live=true;last.current="";
  const pull=async()=>{
   if(document.visibilityState==="hidden")return;
   try{
    const r=await fetch("/api/chat?"+new URLSearchParams({room,after:last.current}).toString(),{cache:"no-store"});
    const b=await r.json().catch(()=>({})) as Resp;if(!r.ok)throw new Error(b.error||"채팅을 불러오지 못했어요.");
    if(!live)return;setInfo(b.room??null);setErr("");
    const got:Msg[]=b.messages??[];if(got.length){last.current=got[got.length-1].at;setMsgs(m=>{const seen=new Set(m.map(x=>x.id));return [...m,...got.filter(x=>!seen.has(x.id))]})}
   }catch(e){if(live)setErr(e instanceof Error?e.message:"채팅을 불러오지 못했어요.")}
  };
  pull();const timer=setInterval(pull,4000);
  return()=>{live=false;clearInterval(timer)};
 },[room,demo]);
 useEffect(()=>{const el=box.current;if(el)el.scrollTop=el.scrollHeight},[msgs.length]);
 async function send(){
  const body=text.trim();if(!body||sending)return;setSending(true);
  try{
   const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"send",room,body})});
   const b=await r.json().catch(()=>({})) as Resp;if(!r.ok)throw new Error(b.error||"보내지 못했어요.");
   const sent=b.message;if(!sent)throw new Error("보내지 못했어요.");setText("");last.current=sent.at;setMsgs(m=>[...m,sent]);ping(room,viewTeam);
  }catch(e){toast.error(e instanceof Error?e.message:"보내지 못했어요.")}
  finally{setSending(false)}
 }
 async function remove(m:Msg){
  setMenu("");const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete",id:m.id})});
  if(r.ok)setMsgs(x=>x.map(y=>y.id===m.id?{...y,deleted:true,body:""}:y));else toast.error("지우지 못했어요.");
 }
 async function report(m:Msg){
  setMenu("");const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"report",id:m.id,reason:"부적절한 메시지"})});
  const b=await r.json().catch(()=>({})) as Resp;
  if(!r.ok){toast.error(b.error||"신고하지 못했어요.");return}
  fetch("/api/app",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"chatReported",room:b.room,excerpt:b.excerpt,viewTeam,mutationId:crypto.randomUUID()})}).catch(()=>null);
  toast.success("신고했어요. 운영자가 확인해요.");
 }
 if(demo)return <p className="small muted">샘플에서는 채팅을 쓸 수 없어요. 우리 팀을 시작하면 팀원들과 대화할 수 있어요.</p>;
 return <div className="chat">
  <div className="chat-head"><b>{info?.title??"채팅"}</b>{info?.sub&&<small>{info.sub}</small>}</div>
  <div className="chat-box" ref={box}>
   {!msgs.length&&!err&&<div className="chat-empty"><MessageCircle size={28}/><span>첫 메시지를 보내 대화를 시작해 보세요.</span>{info?.kind==="match"&&<small>계좌번호 같은 정보는 이 방 사람(두 팀 주장·운영진)에게만 보여요. 경기 60일 뒤 지워져요.</small>}</div>}
   {msgs.map((m,i)=>{const d=day(m.at),show=i===0||day(msgs[i-1].at)!==d;return <div key={m.id}>
    {show&&<div className="chat-day">{d}</div>}
    <div className={"chat-msg"+(m.mine?" mine":"")}>
     {!m.mine&&<span className="chat-name">{m.name}</span>}
     <div className="chat-line">
      <button type="button" className={"chat-bubble"+(m.deleted?" gone":"")} onClick={()=>!m.deleted&&setMenu(menu===m.id?"":m.id)}>{m.deleted?"삭제된 메시지예요":m.body}</button>
      <small>{hm(m.at)}</small>
     </div>
     {menu===m.id&&<div className="chat-menu">{m.mine?<button type="button" onClick={()=>remove(m)}><Trash2 size={14}/>지우기</button>:<button type="button" onClick={()=>report(m)}><Flag size={14}/>신고</button>}</div>}
    </div>
   </div>})}
  </div>
  {err&&<p className="data-note" role="alert">{err}</p>}
  <form className="chat-input" onSubmit={e=>{e.preventDefault();send()}}>
   <textarea value={text} onChange={e=>setText(e.target.value.slice(0,1000))} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}} rows={1} placeholder="메시지 입력" aria-label="메시지 입력"/>
   <button type="submit" className="btn btn-green" disabled={sending||!text.trim()} aria-label="보내기">{sending?<LoaderCircle className="loader" size={17}/>:<Send size={17}/>}</button>
  </form>
 </div>;
}
