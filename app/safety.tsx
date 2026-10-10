"use client";
// 1.26 차단·신고 · 고객센터.
// 차단은 나에게만 영향이 있다(내 화면에서 가리고, 그 사람·팀이 나에게 신청·대화를 못 보내게). 상대에게 알리지 않는다.
// 신고는 운영자만 전부 보고, 신고한 사람은 자기 신고와 처리 결과만 본다. 실제 판단과 조치는 운영자가 한다.
import {useState,type ReactNode} from "react";
import {Ban,Flag,LifeBuoy,MessageCircle,Megaphone,FileText,ShieldCheck} from "lucide-react";
import {type Row} from "@/lib/model";
import {CONTACT} from "@/lib/legal";
import {localDay} from "./teamkick";

// lib/model.REPORT_REASONS 와 같은 값이어야 한다(서버가 이 목록 밖의 값은 받지 않는다).
export const REPORT_REASONS=["욕설·비하","노쇼·약속 불이행","허위 모집·기록","사기·금전 요구","광고·도배","기타"];
type Save=(c:Record<string,unknown>,after?:(o:Row)=>void)=>void;
export type SafetyTarget={kind:"user"|"team"|"listing";name:string;memberId?:string;guestId?:string;userId?:string;teamId?:string;gameId?:string};

// 랭킹 카드처럼 창을 직접 열 수 없는 곳에서 부른다. teamkick.tsx 가 받아서 창을 연다.
export function openSafety(target:SafetyTarget){window.dispatchEvent(new CustomEvent("teamkick:safety",{detail:target}))}

export function SafetyButton({target,label="차단·신고",small}:{target:SafetyTarget;label?:string;small?:boolean}){
 return <button type="button" className={small?"text-link safety-link":"btn"} onClick={()=>openSafety(target)}><Flag size={small?13:16}/>{label}</button>;
}

export function SafetyPanel({v,target,busy,save,demo}:{v:Row;target:SafetyTarget;busy:boolean;save:Save;demo:boolean}){
 const [reason,setReason]=useState(""),[detail,setDetail]=useState(""),[alsoBlock,setAlsoBlock]=useState(false),[asking,setAsking]=useState(false),[done,setDone]=useState("");
 const blockedUser=!!target.userId&&(v.blocked?.users??[]).some((x:Row)=>x.id===target.userId);
 const teamId=target.kind==="listing"?target.teamId:target.kind==="team"?target.teamId:"";
 const blockedTeam=!!teamId&&(v.blocked?.teams??[]).some((x:Row)=>x.id===teamId);
 const myTeam=!!teamId&&(v.mine??[]).some((m:Row)=>m.teamId===teamId&&m.status==="active");
 const ids={memberId:target.memberId,guestId:target.guestId,teamId:target.teamId,gameId:target.gameId};
 if(demo)return <p className="data-note">샘플에서는 차단·신고를 할 수 없어요.</p>;
 if(done)return <div className="gap-grid"><p className="safety-done"><ShieldCheck size={18}/>{done}</p><p className="data-note">{done.startsWith("신고")?"처리 결과는 MY → 고객센터 → 내 신고 내역에서 볼 수 있어요.":"MY → 설정 → 차단 목록에서 언제든 바꿀 수 있어요."}</p></div>;
 return <div className="gap-grid">
  {target.kind==="user"&&<section className="safety-box">
   <h3><Ban size={16}/>{blockedUser?"차단한 사람이에요":"이 사람 차단"}</h3>
   <ul className="safety-list"><li>채팅에서 이 사람의 메시지가 접혀 보여요.</li><li>나에게(내가 주장·운영진인 팀에) 용병 신청·경기 대화를 보낼 수 없어요.</li><li>상대에게 차단했다고 알리지 않아요. 같은 팀이면 팀 활동(투표·기록)은 그대로예요.</li></ul>
   {blockedUser?<button className="btn" disabled={busy} onClick={()=>save({type:"unblockUser",userId:target.userId},()=>setDone("차단을 해제했어요."))}>차단 해제</button>
    :asking?<div className="row" style={{gap:8}}><button className="btn btn-danger" disabled={busy} onClick={()=>save({type:"blockUser",...ids},()=>setDone(target.name+"님을 차단했어요."))}>차단하기</button><button className="btn" onClick={()=>setAsking(false)}>취소</button></div>
    :<button className="btn" onClick={()=>setAsking(true)}><Ban size={16}/>차단</button>}
  </section>}
  {target.kind==="team"&&!myTeam&&<section className="safety-box">
   <h3><Ban size={16}/>{blockedTeam?"차단한 팀이에요":"이 팀 차단"}</h3>
   <ul className="safety-list"><li>이 팀의 매칭·용병 모집글과 보낸 매칭 신청이 내 화면에서 사라져요.</li><li>내가 주장·운영진인 팀의 경기에 이 팀이 매칭을 신청할 수 없어요.</li><li>상대 팀에 알리지 않아요.</li></ul>
   {blockedTeam?<button className="btn" disabled={busy} onClick={()=>save({type:"unblockTeam",teamId},()=>setDone("팀 차단을 해제했어요."))}>차단 해제</button>
    :asking?<div className="row" style={{gap:8}}><button className="btn btn-danger" disabled={busy} onClick={()=>save({type:"blockTeam",teamId},()=>setDone(target.name+" 팀을 차단했어요."))}>차단하기</button><button className="btn" onClick={()=>setAsking(false)}>취소</button></div>
    :<button className="btn" onClick={()=>setAsking(true)}><Ban size={16}/>팀 차단</button>}
  </section>}
  <form className="safety-box form-grid" onSubmit={e=>{e.preventDefault();if(!reason)return;save({type:"report",target:target.kind,...ids,reason,detail,block:alsoBlock},()=>setDone("신고했어요. 운영자가 확인한 뒤 결과를 알려드려요."))}}>
   <h3><Flag size={16}/>{target.kind==="listing"?"이 모집글 신고":target.kind==="team"?"이 팀 신고":"이 사람 신고"}</h3>
   <div className="chip-row" role="radiogroup" aria-label="신고 사유">{REPORT_REASONS.map(x=><button type="button" key={x} role="radio" aria-checked={reason===x} className={"chip-mini"+(reason===x?" on":"")} onClick={()=>setReason(x)}>{x}</button>)}</div>
   <label>자세한 내용 (선택)<textarea maxLength={500} value={detail} onChange={e=>setDetail(e.target.value)} placeholder="언제, 어떤 일이 있었는지 적어주시면 확인이 빨라요. 다른 사람의 연락처·계좌번호는 적지 말아주세요."/></label>
   {!(target.kind==="user"?blockedUser:blockedTeam||myTeam)&&<label className="row safety-check"><input type="checkbox" checked={alsoBlock} onChange={e=>setAlsoBlock(e.target.checked)}/>{target.kind==="user"?"이 사람도 차단하기":"이 팀도 차단하기"}</label>}
   <p className="data-note">신고 대상에게는 누가 신고했는지 알리지 않아요. 운영자가 내용을 확인해 경고·이용 제한 등을 정해요. 허위 신고는 이용이 제한될 수 있어요.</p>
   <button type="submit" className="btn btn-green" disabled={busy||!reason}>신고하기</button>
  </form>
 </div>;
}

export function BlockedList({v,busy,save}:{v:Row;busy:boolean;save:Save}){
 const users=v.blocked?.users??[],teams=v.blocked?.teams??[];
 const row=(x:Row,kind:"user"|"team")=><div className="attendance-item" key={kind+x.id}><div><strong>{x.name||"이용자"}</strong><p className="data-note">{localDay(x.at)} 차단</p></div><button className="btn" disabled={busy} onClick={()=>save(kind==="user"?{type:"unblockUser",userId:x.id}:{type:"unblockTeam",teamId:x.id},()=>{})}>해제</button></div>;
 return <div className="gap-grid">
  <section><h3 className="safety-h">사람 <span className="small muted">{users.length}</span></h3>{users.map((x:Row)=>row(x,"user"))}{!users.length&&<p className="data-note">차단한 사람이 없어요.</p>}</section>
  <section><h3 className="safety-h">팀 <span className="small muted">{teams.length}</span></h3>{teams.map((x:Row)=>row(x,"team"))}{!teams.length&&<p className="data-note">차단한 팀이 없어요.</p>}</section>
  <p className="data-note">차단은 채팅 말풍선, 선수 기록 창, 팀 프로필, 용병 신청, 랭킹 카드에서 할 수 있어요.</p>
 </div>;
}

const KIND_LABEL:Record<string,string>={user:"사람",team:"팀",listing:"모집글",chat:"채팅"};
export function ReportsAdmin({v,busy,save}:{v:Row;busy:boolean;save:Save}){
 const [tab,setTab]=useState<"open"|"closed">("open"),[notes,setNotes]=useState<Record<string,string>>({});
 const list=(v.reports??[]).filter((r:Row)=>tab==="open"?r.status==="open":r.status!=="open");
 return <div className="gap-grid">
  <div className="seg two" role="tablist">{(["open","closed"] as const).map(k=><button key={k} role="tab" aria-selected={tab===k} className={tab===k?"on":""} onClick={()=>setTab(k)}>{k==="open"?"처리 대기 "+(v.reports??[]).filter((r:Row)=>r.status==="open").length:"처리 완료"}</button>)}</div>
  {list.map((r:Row)=><div className="notice" key={r.id}>
   <div className="row between"><strong><span className="badge">{KIND_LABEL[r.kind]??r.kind}</span> {r.targetName||"대상 미상"}</strong><span className="small muted">{localDay(r.at)}</span></div>
   <p><b>{r.reason}</b>{r.detail?" · "+r.detail:""}</p>
   <span>신고: {r.reporterName||"이용자"}{r.kind==="chat"?" · 메시지 원문은 신고 후 90일 보관(chat_reports)":""}</span>
   {r.status==="open"?<form className="form-grid" style={{marginTop:10}} onSubmit={e=>{e.preventDefault();save({type:"resolveReport",reportId:r.id,result:notes[r.id]},()=>setNotes(n=>({...n,[r.id]:""})))}}>
    <label>처리 결과(신고한 사람에게 보내져요)<textarea required maxLength={300} value={notes[r.id]??""} onChange={e=>setNotes(n=>({...n,[r.id]:e.target.value}))} placeholder="예: 확인 후 해당 이용자에게 경고했어요."/></label>
    <button className="btn btn-green" type="submit" disabled={busy}>처리 완료</button>
   </form>:<div className="detail-meta" style={{marginTop:10}}><strong>처리 결과</strong><p>{r.result}</p>{r.closedAt&&<span className="small muted">{localDay(r.closedAt)}</span>}</div>}
  </div>)}
  {!list.length&&<p className="data-note">{tab==="open"?"처리할 신고가 없어요.":"처리한 신고가 없어요."}</p>}
  <p className="data-note">신고는 처리 전까지 보관하고, 신고일로부터 1년이 지나면 처리한 것부터 지워요.</p>
 </div>;
}

export function HelpCenter({v,setModal}:{v:Row;setModal:(m:Record<string,unknown>)=>void}){
 const mine=(v.reports??[]).filter((r:Row)=>r.mine);
 const open=(v.inquiries??[]).filter((x:Row)=>x.mine&&x.status==="open").length;
 const item=(icon:ReactNode,title:string,sub:string,go:()=>void,badge?:string)=><button type="button" className="help-item" onClick={go}>{icon}<span><strong>{title}{badge&&<span className="badge badge-orange" style={{marginLeft:6}}>{badge}</span>}</strong><small>{sub}</small></span></button>;
 return <div className="gap-grid">
  <div className="help-grid">
   {item(<MessageCircle size={20}/>,"1:1 문의","운영자에게 직접 물어봐요",()=>setModal({kind:"support",back:{kind:"help"}}),open?"답변 대기 "+open:"")}
   {item(<Megaphone size={20}/>,"공지사항","업데이트와 서비스 소식",()=>setModal({kind:"announcements",back:{kind:"help"}}))}
   {item(<Ban size={20}/>,"차단 목록","차단한 사람·팀 보기와 해제",()=>setModal({kind:"blocked",back:{kind:"help"}}))}
   {item(<FileText size={20}/>,"약관·개인정보처리방침","초안 · 전문가 검토 전",()=>setModal({kind:"legal",back:{kind:"help"}}))}
  </div>
  <section className="safety-box">
   <h3><LifeBuoy size={16}/>신고·차단은 이렇게 해요</h3>
   <ul className="safety-list">
    <li>채팅: 상대 말풍선을 누르면 → <b>신고</b> 또는 <b>차단</b></li>
    <li>사람: 선수 기록 창·용병 신청·랭킹 카드의 <b>차단·신고</b></li>
    <li>팀·모집글: 팀 프로필 또는 신청 창의 <b>차단·신고</b></li>
    <li>급하게 위험한 상황이면 먼저 112(경찰)에 신고해주세요.</li>
   </ul>
  </section>
  <section>
   <h3 className="safety-h">내 신고 내역 <span className="small muted">{mine.length}</span></h3>
   {mine.map((r:Row)=><div className="notice" key={r.id}>
    <div className="row between"><strong>{r.targetName||KIND_LABEL[r.kind]}</strong><span className={"badge "+(r.status==="open"?"badge-orange":"badge-green")}>{r.status==="open"?"확인 중":"처리 완료"}</span></div>
    <p>{r.reason}{r.detail?" · "+r.detail:""}</p><span>{localDay(r.at)}</span>
    {r.result&&<div className="detail-meta" style={{marginTop:10}}><strong>운영자 처리 결과</strong><p>{r.result}</p></div>}
   </div>)}
   {!mine.length&&<p className="data-note">신고한 내역이 없어요.</p>}
  </section>
  <p className="data-note">이메일 문의: <span className="selectable">{CONTACT}</span></p>
 </div>;
}
