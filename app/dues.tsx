"use client";
// 1.19 회비 장부(MY → 회비). 금액·안내를 정해 두고, 달마다 누가 냈는지 체크한다.
// 운영진(주장·매니저)은 전원 체크, 일반 팀원은 내 납부 여부와 "몇 명 냈는지"만 본다(서버가 그만큼만 보낸다).
// 기록만 한다 — 팀킥이 돈을 받거나 옮기지 않는다.
import {useState} from "react";
import {ChevronLeft,ChevronRight,Check,Wallet,Copy,Send,BellRing} from "lucide-react";
import {toast} from "sonner";
import type {Row} from "@/lib/model";
import {backNo} from "./teamkick";

const won=(n:number)=>n.toLocaleString()+"원";
const thisMonth=()=>{const d=new Date(Date.now()+9*3600e3);return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")};
const shift=(m:string,k:number)=>{const [y,mo]=m.split("-").map(Number);const d=new Date(Date.UTC(y,mo-1+k,1));return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")};
const label=(m:string)=>{const [y,mo]=m.split("-");return y+"년 "+Number(mo)+"월"};

export function Dues({v,team,staff,busy,run}:{v:Row;team:Row;staff:boolean;busy:boolean;run:(c:Record<string,unknown>)=>void}){
 const [month,setMonth]=useState(thisMonth),[edit,setEdit]=useState(false);
 const d0=team?.dues??{};
 const [f,setF]=useState({amount:String(d0.amount??""),note:String(d0.note??""),bank:String(d0.bank??""),accountNo:String(d0.accountNo??""),holder:String(d0.holder??""),tossId:String(d0.tossId??""),kakaoLink:String(d0.kakaoLink??"")});
 const set=(k:string,x:string)=>setF(o=>({...o,[k]:x}));
 const members=(v.members as Row[]).filter(m=>m.status==="active").sort((a,b)=>Number(a.number??999)-Number(b.number??999)||String(a.name).localeCompare(String(b.name)));
 const paid:Record<string,string>=team?.duesPaid?.[month]??{};
 const me=members.find(m=>m.userId===v.user?.id);
 const count=staff?members.filter(m=>paid[m.id]).length:Number(team?.duesCount?.[month]??Object.keys(paid).length);
 const fee=Number(team?.dues?.amount??0);
 const pct=members.length?Math.round(count/members.length*100):0;
 const toggle=(m:Row)=>run({type:"markDues",teamId:v.teamId,month,memberId:m.id,paid:!paid[m.id]});
 const reported:Record<string,string>=team?.duesReported?.[month]??{};
 const d=team?.dues??{};const hasAcct=!!(d.accountNo||d.tossId||d.kakaoLink);
 function copy(){const t=[d.bank,d.accountNo,d.holder].filter(Boolean).join(" ");navigator.clipboard.writeText(t).then(()=>toast.success("계좌번호를 복사했어요. 은행 앱에 붙여 넣으세요.")).catch(()=>toast.error("복사하지 못했어요. 길게 눌러 직접 복사해 주세요."))}
 return <div className="dues">
  <div className="dues-head">
   <div><span className="dues-kicker">매달 회비</span><b>{fee?won(fee):"금액 미정"}</b>{team?.dues?.note&&<p>{team.dues.note}</p>}</div>
   {staff&&!edit&&<button type="button" className="btn" onClick={()=>setEdit(true)}>금액 · 안내 수정</button>}
  </div>
  {edit&&<form className="dues-edit" onSubmit={e=>{e.preventDefault();run({type:"setDues",teamId:v.teamId,...f,amount:Number(f.amount||0)});setEdit(false)}}>
   <label>매달 회비(원)<input type="number" min={0} max={1000000} step={1000} value={f.amount} onChange={e=>set("amount",e.target.value)}/></label>
   <label>안내(납부일 등)<input value={f.note} maxLength={200} onChange={e=>set("note",e.target.value)} placeholder="예: 매달 5일까지"/></label>
   <div className="dues-grid"><label>은행<input value={f.bank} maxLength={20} onChange={e=>set("bank",e.target.value)} placeholder="카카오뱅크"/></label><label>예금주<input value={f.holder} maxLength={20} onChange={e=>set("holder",e.target.value)} placeholder="김총무"/></label></div>
   <label>계좌번호<input value={f.accountNo} maxLength={30} inputMode="numeric" onChange={e=>set("accountNo",e.target.value)} placeholder="숫자만 (하이픈 가능)"/></label>
   <label>토스 아이디 <span className="muted">(선택 — toss.me/아이디)</span><input value={f.tossId} maxLength={30} onChange={e=>set("tossId",e.target.value)} placeholder="teamkick_fc"/></label>
   <label>카카오페이 송금 링크 <span className="muted">(선택 — 카카오페이 앱 → 송금 → 송금 링크)</span><input value={f.kakaoLink} maxLength={200} onChange={e=>set("kakaoLink",e.target.value)} placeholder="https://qr.kakaopay.com/…"/></label>
   <small className="muted">계좌·아이디는 우리 팀원에게만 보여요. 팀킥이 돈을 받거나 옮기지 않아요.</small>
   <div className="btn-pair"><button type="submit" className="btn btn-green" disabled={busy}>저장</button><button type="button" className="btn" onClick={()=>setEdit(false)}>취소</button></div>
  </form>}
  <div className="dues-month">
   <button type="button" aria-label="이전 달" onClick={()=>setMonth(m=>shift(m,-1))}><ChevronLeft size={18}/></button>
   <strong>{label(month)}</strong>
   <button type="button" aria-label="다음 달" onClick={()=>setMonth(m=>shift(m,1))} disabled={month>=thisMonth()}><ChevronRight size={18}/></button>
  </div>
  <div className="dues-sum">
   <div><span>납부</span><b>{count}<small>/{members.length}명</small></b></div>
   <div><span>모인 회비</span><b>{fee?won(fee*count):"–"}</b></div>
   <div className="dues-bar" aria-hidden><i style={{width:pct+"%"}}/></div>
  </div>
  {hasAcct&&<div className="dues-pay">
   {d.accountNo&&<div className="dues-acct"><span><b>{d.bank||"계좌"}</b> {d.accountNo}{d.holder&&<small> 예금주 {d.holder}</small>}</span><button type="button" className="btn" onClick={copy}><Copy size={15}/>복사</button></div>}
   {(d.tossId||d.kakaoLink)&&<div className="btn-pair">{d.tossId&&<a className="btn" href={"https://toss.me/"+encodeURIComponent(d.tossId)+(fee?"/"+fee:"")} target="_blank" rel="noopener noreferrer"><Send size={15}/>토스로 보내기</a>}{d.kakaoLink&&<a className="btn" href={d.kakaoLink} target="_blank" rel="noopener noreferrer"><Send size={15}/>카카오페이로 보내기</a>}</div>}
  </div>}
  {staff?<ul className="dues-list">{members.map(m=><li key={m.id}>
    <span className="dues-name"><b>{m.name}</b><small>{[backNo(m.number),m.position].filter(Boolean).join(" ")}{reported[m.id]&&!paid[m.id]&&<em className="dues-flag">냈다고 알림</em>}</small></span>
    <button type="button" className={"dues-check"+(paid[m.id]?" on":"")} disabled={busy} aria-pressed={!!paid[m.id]} onClick={()=>toggle(m)}>{paid[m.id]?<><Check size={15}/>납부</>:"미납"}</button>
   </li>)}</ul>
  :<div className={"dues-mine"+(me&&paid[me.id]?" on":"")}><Wallet size={18}/><span>{me&&paid[me.id]?"이 달 회비 납부가 확인됐어요.":me&&reported[me.id]?"냈다고 알렸어요. 운영진이 확인하면 납부로 바뀌어요.":"아직 납부 기록이 없어요."}</span>
   {me&&!paid[me.id]&&<button type="button" className="btn btn-dark" disabled={busy} onClick={()=>run({type:"reportDues",teamId:v.teamId,month})}><BellRing size={15}/>{reported[me.id]?"다시 알리기":"냈어요 알리기"}</button>}</div>}
  <p className="data-note">회비는 기록만 해요. 돈은 팀 계좌 등으로 직접 주고받고, 팀킥에서 결제하거나 보관하지 않아요.{staff?" 누가 냈는지는 운영진에게만 보여요.":""}</p>
 </div>;
}
