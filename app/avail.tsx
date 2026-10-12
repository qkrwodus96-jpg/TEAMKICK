"use client";
// 용병 가능 등록(1.33). 선수는 "이 날 이 시간대에 뛸 수 있어요"를 올리고(최대 3개, 30일 안),
// 팀 주장·운영진은 그 목록을 보고 자기 팀 경기의 용병 모집으로 초대한다. 연락처는 주고받지 않는다.
// 서버 규칙은 lib/model.ts postAvail·inviteAvail·notifyAvail.
import {useState} from "react";
import {Plus,Trash2,UserPlus,CalendarDays} from "lucide-react";
import {toast} from "sonner";
import {AVAIL_MAX,AVAIL_DAYS,AVAIL_SLOTS,REGIONS,TEAM_SPORT_NAME,availFits,guestStatusOf,positionName,kstDayOf,formatLabel,type Row} from "@/lib/model";
import {whenRange} from "@/lib/when";

type Run=(c:Record<string,unknown>)=>void;
const SLOT_NAME=Object.fromEntries(AVAIL_SLOTS);
const dayText=(d:string)=>{const x=new Date(d+"T00:00:00Z");return (x.getUTCMonth()+1)+"/"+x.getUTCDate()+"("+"일월화수목금토"[x.getUTCDay()]+")"};
const sportText=(s:string)=>s==="both"?"축구·풋살":TEAM_SPORT_NAME[s]??"축구";

export function AvailSection({v,manager,demo,run,setModal,term,date}:{v:Row;manager:boolean;demo:boolean;run:Run;setModal:(m:Record<string,unknown>)=>void;term:string;date:string}){
 const mine=(v.myAvail??[]) as Row[];
 const norm=(x:string)=>x.toLowerCase().replace(/\s+/g,"");
 const list=((v.availPlayers??[]) as Row[]).filter(p=>(!date||p.day===date)&&(!term||norm([p.name,...(p.regions??[]),p.note,positionName(p.main)].join(" ")).includes(norm(term))));
 const guard=(fn:()=>void)=>()=>{if(demo){toast("샘플에서는 저장되지 않아요.");return}fn()};
 return <>
  <section className="panel">
   <div className="panel-title"><h2>내 용병 가능 등록 <span className="muted small">{mine.length}/{AVAIL_MAX}</span></h2>
    <button type="button" className="text-link" disabled={mine.length>=AVAIL_MAX} onClick={()=>setModal({kind:"postAvail"})}><Plus size={15}/>등록</button></div>
   <p className="data-note" style={{marginBottom:10}}>뛸 수 있는 날·시간대·지역을 올리면 팀 주장·운영진이 보고 용병으로 초대할 수 있어요. 맞는 용병 모집이 열려도 알려 드려요. 날짜가 지나면 지워져요.</p>
   {!mine.length&&<p className="small muted">아직 없어요.</p>}
   <div className="fav-list">{mine.map(x=><div key={x.id} className="avail-row">
    <CalendarDays size={16} className="muted"/>
    <div className="fav-name"><b>{dayText(x.day)} · {(x.slots??[]).map((k:string)=>SLOT_NAME[k]).join("·")}</b><small>{(x.regions??[]).join(" · ")} · {sportText(x.sport)}{x.note?" · "+x.note:""}{x.invited?" · 초대 "+x.invited+"건":""}</small></div>
    <button type="button" className="icon-button" aria-label="이 등록 지우기" onClick={guard(()=>run({type:"removeAvail",id:x.id}))}><Trash2 size={16}/></button>
   </div>)}</div>
  </section>
  <section className="panel" style={{marginTop:18}}>
   <h2 className="view-heading">용병 가능 선수</h2>
   {!manager?<p className="small muted">팀 주장·운영진에게만 보여요. 용병이 필요하면 운영진에게 알려 주세요.</p>:<>
    {!list.length&&<p className="small muted">{term||date?"조건에 맞는 선수가 없어요.":"지금 올라온 선수가 없어요."}</p>}
    <div className="mcard-list">{list.map(p=><div key={p.id} className="avail-card">
     <div className="row between"><strong>{p.name}</strong><span className="sport-tag">{sportText(p.sport)}</span></div>
     <p className="small">{[p.main&&positionName(p.main),p.sub&&"부 "+positionName(p.sub),p.foot].filter(Boolean).join(" · ")||"포지션 미입력"}</p>
     <p className="small"><b>{dayText(p.day)}</b> {(p.slots??[]).map((k:string)=>SLOT_NAME[k]).join("·")} · {(p.regions??[]).join(" · ")}</p>
     <p className="small muted">팀킥 기록 {p.played}경기 · {p.goals}골 · {p.assists}도움</p>
     {p.note&&<p className="mc-msg">“{p.note}”</p>}
     <button type="button" className="btn" onClick={()=>setModal({kind:"inviteAvail",player:p})}><UserPlus size={16}/>초대</button>
    </div>)}</div>
   </>}
  </section>
 </>;
}

// 등록 폼(모달 안). 날짜·시간대(여러 개)·지역(1~3곳)·종목·한마디.
export function AvailForm({save,busy}:{save:(c:Record<string,unknown>)=>void;busy:boolean}){
 const [today]=useState(()=>kstDayOf(Date.now())),[last]=useState(()=>kstDayOf(Date.now()+AVAIL_DAYS*864e5));
 const [day,setDay]=useState(today),[slots,setSlots]=useState<string[]>(["eve"]),[regions,setRegions]=useState<string[]>([]),[sport,setSport]=useState("both"),[note,setNote]=useState("");
 const flip=(list:string[],x:string,max=9)=>list.includes(x)?list.filter(y=>y!==x):list.length>=max?list:[...list,x];
 return <form className="form-grid" onSubmit={e=>{e.preventDefault();if(!regions.length){toast.error("지역을 하나 이상 골라주세요.");return}save({type:"postAvail",day,slots,regions,sport,note})}}>
  <label>날짜<input type="date" min={today} max={last} value={day} onChange={e=>setDay(e.target.value)}/></label>
  <div className="field-block"><span className="field-label">시간대 (여러 개 가능)</span><div className="chip-row">{AVAIL_SLOTS.map(([k,n])=><button key={k} type="button" aria-pressed={slots.includes(k)} className={"chip-num"+(slots.includes(k)?" on":"")} onClick={()=>setSlots(x=>flip(x,k))}>{n}</button>)}</div></div>
  <div className="field-block"><span className="field-label">지역 (1~3곳)</span><div className="chip-row wrap">{REGIONS.map(r=><button key={r} type="button" aria-pressed={regions.includes(r)} className={"chip-btn"+(regions.includes(r)?" on":"")} onClick={()=>setRegions(x=>flip(x,r,3))}>{r}</button>)}</div></div>
  <div className="field-block"><span className="field-label">종목</span><div className="chip-row">{([["both","축구·풋살"],["soccer","축구"],["futsal","풋살"]] as const).map(([k,n])=><button key={k} type="button" aria-pressed={sport===k} className={"chip-num"+(sport===k?" on":"")} onClick={()=>setSport(k)}>{n}</button>)}</div></div>
  <label>한마디 (선택, 100자)<input value={note} maxLength={100} placeholder="예: 미드필더 선호, 풀타임 가능" onChange={e=>setNote(e.target.value)}/></label>
  <p className="data-note">팀 주장·운영진에게 이름·포지션·주발·팀킥 기록(경기·골·도움)과 위 내용이 보여요. 연락처·키·몸무게는 보이지 않아요.</p>
  <button type="submit" className="btn btn-green" disabled={busy||!slots.length}>올리기</button>
 </form>;
}

// 초대(모달 안). 우리 팀의 다가오는 경기 중 용병 모집이 열린 것만 고를 수 있다. 맞는 날·시간대를 먼저.
export function InviteForm({v,player,save,busy,demo}:{v:Row;player:Row;save:(c:Record<string,unknown>)=>void;busy:boolean;demo:boolean}){
 const [now]=useState(()=>Date.now());
 const games=((v.games??[]) as Row[]).filter(g=>g.status==="scheduled"&&Date.parse(g.start)>now)
  .map(g=>({g,open:guestStatusOf(((v.sides??[]) as Row[]).find(z=>z.gameId===g.id&&z.teamId===v.teamId)??{id:""})==="open",fit:availFits(player,g)}))
  .sort((a,b)=>Number(b.fit)-Number(a.fit)||String(a.g.start).localeCompare(String(b.g.start)));
 const [pick,setPick]=useState<string>(()=>games.find(x=>x.open&&x.fit)?.g.id??games.find(x=>x.open)?.g.id??"");
 return <form className="form-grid" onSubmit={e=>{e.preventDefault();if(demo){toast("샘플에서는 저장되지 않아요.");return}save({type:"inviteAvail",teamId:v.teamId,gameId:pick,availId:player.id})}}>
  <p><strong>{player.name}</strong> · {dayText(player.day)} {(player.slots??[]).map((k:string)=>SLOT_NAME[k]).join("·")}</p>
  {!games.length&&<p className="data-note">다가오는 경기가 없어요. 경기를 만들고 경기 상세에서 <strong>용병 모집</strong>을 연 뒤 초대해 주세요.</p>}
  <div className="gap-grid" style={{gap:8}}>{games.map(({g,open,fit})=><label key={g.id} className={"invite-game"+(open?"":" off")}>
   <input type="radio" name="invite-game" disabled={!open} checked={pick===g.id} onChange={()=>setPick(g.id)}/>
   <span><b>{whenRange(g.start,g.end)}</b> {g.venue}<small>{formatLabel(g.format,g.sport)}{fit?" · 선수가 올린 시간과 맞아요":""}{open?"":" · 용병 모집을 먼저 열어 주세요"}</small></span>
  </label>)}</div>
  <p className="data-note">초대하면 선수에게 알림이 가고, 선수가 용병 탭에서 신청하면 <strong>우리 팀 용병 신청</strong>에서 승인할 수 있어요. 같은 경기로는 한 번만 초대돼요.</p>
  <button type="submit" className="btn btn-green" disabled={busy||!pick}>초대 보내기</button>
 </form>;
}
