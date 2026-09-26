"use client";
// 1.11.0 에 들어온 팀 안 기능들의 화면: 자체전 팀 나누기, 경기 후 MVP 투표, 기록 왕 카드,
// 팀 회칙, 초대 QR. 서버 규칙은 lib/model.ts 에 있고 여기서는 보여주고 보내기만 한다.
import {useMemo,useState} from "react";
import qrcode from "qrcode-generator";
import {Trophy,Shuffle,Minus,Plus,Check,Share2,Copy,Bell,Crown,Goal,Footprints,CalendarCheck,BookOpen} from "lucide-react";
import {toast} from "sonner";
import {SQUAD_NAMES,summaries,periodRange,rankRows,type Row} from "@/lib/model";
import {PlayerPhoto,koreanDate,time,backNo,opponent} from "./teamkick";

// --- 공통: 숫자 올리고 내리기 ---
// 휴대폰에서 작은 숫자 칸을 누르고 키보드를 띄우는 것보다 +/− 가 빠르다(골·도움 입력).
export function Stepper({value,onChange,label,max=99}:{value:number;onChange:(n:number)=>void;label:string;max?:number}){
 const n=Number(value)||0;
 return <span className="stepper" role="group" aria-label={label}>
  <button type="button" aria-label={label+" 줄이기"} disabled={n<=0} onClick={()=>onChange(Math.max(0,n-1))}><Minus size={15}/></button>
  <b aria-live="polite">{n}</b>
  <button type="button" aria-label={label+" 늘리기"} disabled={n>=max} onClick={()=>onChange(Math.min(max,n+1))}><Plus size={15}/></button>
 </span>;
}

// --- 자체전 팀 나누기 ---
const GROUP_ORDER=["GK","DF","MF","FW"];
const groupOf=(position:string)=>{const p=String(position??"").toUpperCase();return GROUP_ORDER.includes(p)?p:"ETC"};
function shuffle<T>(list:T[]){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
// 포지션별로 섞은 뒤 인원이 적은 팀부터 한 명씩 넣는다. 골키퍼가 한 팀에 몰리지 않고,
// 수비·미드·공격도 고르게 갈린다. 인원 차이는 많아야 1명.
export function autoSplit(players:Row[],n:number){
 const count=Array(n).fill(0),out:Record<string,number>={};
 let turn=Math.floor(Math.random()*n);
 for(const g of [...GROUP_ORDER,"ETC"]){
  for(const p of shuffle(players.filter(x=>groupOf(x.position)===g))){
   const least=Math.min(...count);
   // 가장 적은 팀들 중 돌아가며 고른다(늘 1팀부터 채우지 않게)
   let pick=-1;for(let k=0;k<n;k++){const i=(turn+k)%n;if(count[i]===least){pick=i;break}}
   out[p.id]=pick;count[pick]++;turn=(pick+1)%n;
  }
 }
 return out;
}
// 나눌 사람: 출석이 확정됐으면 출석자, 아니면 "참여" 투표한 팀원. 승인된 용병은 늘 포함.
export function squadPool(side:Row,vote:(side:Row,id:string)=>string){
 const roster:Row[]=side?.roster??[],guests:Row[]=(side?.guestRoster??[]).map((x:Row)=>({...x,guest:true}));
 const members=side?.attendanceFinal?roster.filter(m=>side.attendance?.[m.id]):roster.filter(m=>vote(side,m.id)==="yes");
 return [...members,...guests];
}
export function SquadBoard({g,side,v,canEdit,busy,vote,onSave}:{g:Row;side:Row;v:Row;canEdit:boolean;busy:boolean;vote:(side:Row,id:string)=>string;onSave:(assign:Record<string,number>)=>void}){
 const n=Number(g.squads)||2;
 const [assign,setAssign]=useState<Record<string,number>>(()=>({...(side?.squads??{})}));
 const pool=useMemo(()=>squadPool(side,vote),[side,vote]);
 // 이미 나눠 둔 사람이 풀에서 빠졌어도(불참 정정 등) 보이게 한다
 const people:Row[]=[...pool,...(side?.roster??[]).filter((m:Row)=>assign[m.id]!==undefined&&!pool.some(p=>p.id===m.id))];
 const dirty=JSON.stringify(assign)!==JSON.stringify(side?.squads??{});
 const cycle=(id:string)=>setAssign(a=>{const cur=a[id];const next={...a};if(cur===undefined)next[id]=0;else if(cur>=n-1)delete next[id];else next[id]=cur+1;return next});
 const photo=(id:string)=>v.members?.find((m:Row)=>m.id===id)?.photo;
 const chip=(p:Row)=><button type="button" key={p.id} className={"squad-chip"+(p.guest?" guest":"")} disabled={!canEdit||busy} onClick={()=>cycle(p.id)} aria-label={p.name+" 팀 바꾸기"}>
  <PlayerPhoto name={p.name} photo={photo(p.id)}/><span><strong>{p.name}</strong><small>{[backNo(p.number),p.position,p.guest?"용병":""].filter(Boolean).join(" · ")}</small></span></button>;
 const waiting=people.filter(p=>assign[p.id]===undefined);
 return <div className="squad-board">
  <p className="data-note">{side?.attendanceFinal?"출석한 사람":"‘참여’로 투표한 사람"}과 승인된 용병을 나눠요. {canEdit?"선수를 누르면 다음 팀으로 옮겨져요.":"주장·운영진이 나눠요."}</p>
  {canEdit&&<div className="action-strip"><button type="button" className="btn" disabled={busy||!people.length} onClick={()=>setAssign(autoSplit(people,n))}><Shuffle size={16}/>자동으로 나누기</button><button type="button" className="btn btn-green" disabled={busy||!dirty} onClick={()=>onSave(assign)}><Check size={16}/>이대로 저장</button></div>}
  <div className="squad-columns" style={{gridTemplateColumns:"repeat("+Math.min(n,2)+",minmax(0,1fr))"}}>
   {SQUAD_NAMES.slice(0,n).map((name,i)=>{const list=people.filter(p=>assign[p.id]===i);const gk=list.filter(p=>groupOf(p.position)==="GK").length;
    return <section className={"squad-col squad-"+i} key={name}><header><strong>{name}</strong><span>{list.length}명{gk?" · GK "+gk:""}</span></header>{list.map(chip)}{!list.length&&<p className="small muted">아직 없어요</p>}</section>})}
  </div>
  {!!waiting.length&&<section className="squad-col squad-wait"><header><strong>아직 안 나눔</strong><span>{waiting.length}명</span></header>{waiting.map(chip)}</section>}
  {!people.length&&<p className="small muted">{side?.attendanceFinal?"출석한 사람이 없어요.":"아직 ‘참여’로 투표한 사람이 없어요. 투표가 모이면 나눌 수 있어요."}</p>}
 </div>;
}

// --- MVP 투표 ---
const meIn=(v:Row)=>v.members?.find((m:Row)=>m.userId===v.user?.id&&m.status==="active");
// 홈 맨 위의 할 일 상자. 내가 출석했고 아직 안 뽑은, 열려 있는 MVP 투표가 있으면 보인다.
export function MvpPrompt({v,open}:{v:Row;open:(gameId:string)=>void}){
 const me=meIn(v);if(!me)return null;
 const todo=(v.sides??[]).filter((z:Row)=>z.mvp&&!z.mvp.closed&&!z.mvp.mine&&z.attendance?.[me.id]===true&&(z.mvp.eligible??0)>=2)
  .map((z:Row)=>({z,g:v.games?.find((x:Row)=>x.id===z.gameId)})).filter((x:Row)=>x.g).sort((a:Row,b:Row)=>String(b.g.start).localeCompare(String(a.g.start)));
 if(!todo.length)return null;
 const {g,z}=todo[0];
 return <section className="task-box mvp-prompt"><div className="row" style={{gap:12,alignItems:"flex-start"}}><span className="task-icon"><Trophy size={20}/></span><div style={{minWidth:0,flex:1}}><strong>오늘의 MVP를 뽑아주세요</strong><p className="small muted">{koreanDate(g.start)} · {opponent(v,g)||"경기"} · {z.mvp.voted}/{z.mvp.eligible}명 투표 · {koreanDate(z.mvp.closesAt)} {time(z.mvp.closesAt)} 마감</p></div></div><button className="btn btn-green" onClick={()=>open(g.id)}>MVP 투표하기{todo.length>1?" ("+todo.length+"경기)":""}</button></section>;
}
export function MvpPanel({g,side,v,manager,busy,save}:{g:Row;side:Row;v:Row;manager:boolean;busy:boolean;save:(c:Record<string,unknown>,after?:(o:Row)=>void)=>void}){
 const p=side?.mvp,me=meIn(v);
 const [pick,setPick]=useState<string>(p?.mine??"");
 if(!p)return <p className="small muted">{g.status==="completed"?"참여 현황에서 출석을 확정하면 MVP 투표가 열려요.":"경기가 끝나고 출석이 확정되면 MVP 투표가 열려요."}</p>;
 const came:Row[]=(side.roster??[]).filter((m:Row)=>side.attendance?.[m.id]);
 const photo=(id:string)=>v.members?.find((m:Row)=>m.id===id)?.photo;
 const iCame=!!me&&side.attendance?.[me.id]===true;
 if(p.closed){
  const tally=p.tally??{},rows=[...came].sort((a,b)=>(tally[b.id]??0)-(tally[a.id]??0)||a.name.localeCompare(b.name,"ko"));
  const winners:string[]=p.winners??[];
  return <div className="mvp-result">
   {winners.length?<div className="mvp-winner">{winners.map(id=>{const m=came.find(x=>x.id===id);return m?<div className="row" key={id} style={{gap:12}}><PlayerPhoto name={m.name} photo={photo(id)} className="player-avatar big"/><div><span className="eyebrow">{winners.length>1?"공동 MVP":"오늘의 MVP"}</span><strong className="mvp-name"><Crown size={18}/>{m.name}</strong><p className="small muted">{tally[id]}표 · {p.voted}명 투표</p></div></div>:null})}</div>:<p className="small muted">투표한 사람이 없어 MVP가 없어요.</p>}
   <div className="mvp-tally">{rows.filter(m=>tally[m.id]).map(m=><div className="row between" key={m.id}><span>{m.name}</span><span className="tally-bar"><i style={{width:(tally[m.id]/Math.max(1,p.voted))*100+"%"}}/></span><b>{tally[m.id]}</b></div>)}</div>
   <p className="data-note">누가 누구를 뽑았는지는 아무에게도 보이지 않아요.</p>
  </div>;
 }
 return <div className="mvp-vote">
  <div className="row between"><strong>{p.mine?"내 선택을 바꿀 수 있어요":"오늘 가장 잘한 선수는?"}</strong><span className="small muted">{p.voted}/{p.eligible}명 투표 · {koreanDate(p.closesAt)} {time(p.closesAt)} 마감</span></div>
  {iCame?<>
   <div className="mvp-grid" role="radiogroup" aria-label="MVP 후보">{came.map(m=>{const self=m.id===me?.id,on=pick===m.id;
    return <button type="button" role="radio" aria-checked={on} key={m.id} disabled={self||busy} className={"mvp-tile"+(on?" on":"")} onClick={()=>setPick(m.id)}>
     <PlayerPhoto name={m.name} photo={photo(m.id)}/>{on&&<span className="mvp-check"><Check size={14}/></span>}<strong>{m.name}</strong><small>{self?"나":[backNo(m.number),m.position].filter(Boolean).join(" · ")}</small></button>})}</div>
   <button className="btn btn-green mvp-submit" disabled={busy||!pick||pick===p.mine} onClick={()=>save({type:"mvpVote",teamId:v.teamId,gameId:g.id,candidate:pick},()=>toast.success("투표했어요. 마감 전까지 바꿀 수 있어요."))}><Trophy size={16}/>{p.mine?"선택 바꾸기":"투표하기"}</button>
  </>:<p className="small muted">이 경기에 출석한 팀원만 투표할 수 있어요.</p>}
  <p className="data-note">비밀 투표예요. 마감되면 득표 수와 MVP만 공개돼요. 자기 자신은 뽑을 수 없어요.</p>
  {manager&&<div className="action-strip"><button className="btn" disabled={busy||p.voted>=p.eligible} onClick={()=>save({type:"remindMvp",teamId:v.teamId,gameId:g.id},(o:Row)=>toast.success(o?.notified+"명에게 알림을 보냈어요."))}><Bell size={16}/>안 뽑은 사람에게 알림</button><button className="btn" disabled={busy} onClick={()=>save({type:"closeMvp",teamId:v.teamId,gameId:g.id},()=>toast.success("MVP 투표를 마감했어요."))}>지금 마감하기</button></div>}
 </div>;
}

// --- 랭킹 (팀 내 · 전국 / 이번 주 · 이번 달 · 올해) ---
// 1·2·3등은 시상대, 그 아래 4~9등, 나머지는 "더 보기". 전국은 참여를 켠 선수만(lib/model.ts nationalRanking).
const RANK_TABS=[{key:"goals",label:"득점",unit:"골",icon:Goal},{key:"assists",label:"도움",unit:"도움",icon:Footprints},{key:"points",label:"공격P",unit:"P",icon:Crown},{key:"mvp",label:"MVP",unit:"회",icon:Trophy},{key:"attend",label:"출석",unit:"회",icon:CalendarCheck}] as const;
// 메달 색은 자리(왼쪽·가운데·오른쪽)가 아니라 등수로 정한다. 공동 1등이면 셋 다 금색.
const MEDAL:Record<number,string>={1:"#d4a017",2:"#9aa6ae",3:"#c07a45"};
const PERIODS=[{key:"week",label:"이번 주"},{key:"month",label:"이번 달"},{key:"year",label:"올해"}] as const;
export function Rankings({v,busy,run,onOpen}:{v:Row;busy:boolean;run:(c:Record<string,unknown>)=>void;onOpen:(p:Row)=>void}){
 const [scope,setScope]=useState<"team"|"national">("team");
 const [period,setPeriod]=useState<string>("month");
 const [key,setKey]=useState<string>("goals");
 const [more,setMore]=useState(false);
 const tab=RANK_TABS.find(x=>x.key===key)!;
 const rows:Row[]=useMemo(()=>{
  if(scope==="national")return (v.national?.[period]?.[key]??[]) as Row[];
  const {from,to}=periodRange(period);
  const players=summaries({...v,games:v.games??[],members:v.members??[],sides:v.sides??[]},from,to).players.map((p:Row)=>({...p,me:p.userId===v.user?.id}));
  return rankRows(players,key) as Row[];
 },[v,scope,period,key]);
 const podium=rows.slice(0,3),rest=rows.slice(3),shown=more?rest:rest.filter(r=>rows.indexOf(r)<9);
 const label=(r:Row)=>r.value+tab.unit;
 const who=(r:Row)=>scope==="national"?r.team:[backNo(r.number),r.position].filter(Boolean).join(" · ");
 const open=(r:Row)=>{if(scope==="team")onOpen(r)};
 return <div className="rankings">
  <div className="panel-title"><h2>랭킹</h2><div className="seg" role="tablist" aria-label="랭킹 범위">{[{k:"team",t:"팀 내"},{k:"national",t:"전국"}].map(x=><button key={x.k} role="tab" aria-selected={scope===x.k} className={scope===x.k?"on":""} onClick={()=>{setScope(x.k as "team"|"national");setMore(false)}}>{x.t}</button>)}</div></div>
  <div className="chip-row rank-periods">{PERIODS.map(x=><button key={x.key} className={"chip-mini"+(period===x.key?" on":"")} onClick={()=>{setPeriod(x.key);setMore(false)}}>{x.label}</button>)}</div>
  <div className="rank-keys" role="tablist" aria-label="랭킹 항목">{RANK_TABS.map(x=><button key={x.key} role="tab" aria-selected={key===x.key} className={key===x.key?"on":""} onClick={()=>{setKey(x.key);setMore(false)}}><x.icon size={15}/>{x.label}왕</button>)}</div>
  {scope==="national"&&<div className="rank-optin">{v.rankPublic?<p className="small muted">전국 랭킹에 참여 중이에요. <button className="text-link" disabled={busy} onClick={()=>run({type:"setRankPublic",on:false})}>빠지기</button></p>:<div className="task-box"><strong>전국 랭킹은 참여를 켠 선수만 보여요</strong><p className="small muted">켜면 내 선수 이름·팀 이름·기록 숫자가 다른 팀 이용자에게도 보여요. 언제든 끌 수 있어요.</p><button className="btn btn-green" disabled={busy} onClick={()=>run({type:"setRankPublic",on:true})}>전국 랭킹 참여하기</button></div>}</div>}
  {rows.length?<>
   <div className="podium">{[1,0,2].map(i=>{const r=podium[i];return <div key={i} className={"podium-col place-"+(i+1)+(r?.me?" me":"")}>{r?<button className="podium-card" onClick={()=>open(r)} disabled={scope!=="team"}>
    <span className="podium-medal" style={{background:MEDAL[r.rank as number]??"#9aa6a0"}}>{r.rank}</span><span className="podium-face" style={{["--medal" as string]:MEDAL[r.rank as number]??"#c9d3cd"}}><PlayerPhoto name={r.name} photo={r.photo}/></span><strong>{r.name}</strong><small>{who(r)||" "}</small><b className="podium-value">{r.value}<small>{tab.unit}</small></b></button>:<div className="podium-card empty"><span className="podium-medal">{i+1}</span><small>—</small></div>}<div className="podium-step"/></div>})}</div>
   {!!shown.length&&<ol className="rank-list">{shown.map(r=><li key={(r.id??"")+r.name} className={r.me?"me":""}><button onClick={()=>open(r)} disabled={scope!=="team"}><span className="rank-no">{r.rank}</span><PlayerPhoto name={r.name} photo={r.photo}/><span className="rank-who"><strong>{r.name}{r.me&&<em> 나</em>}</strong><small>{who(r)}</small></span><b>{label(r)}</b></button></li>)}</ol>}
   {rest.length>shown.length&&<button className="btn rank-more" onClick={()=>setMore(true)}>더 보기 ({rest.length-shown.length}명)</button>}
   {more&&rest.length>6&&<button className="text-link rank-more" onClick={()=>setMore(false)}>접기</button>}
  </>:<p className="small muted rank-empty">{scope==="national"&&!v.rankPublic?"아직 참여한 선수가 없거나 이 기간 기록이 없어요.":"이 기간에 "+tab.label+" 기록이 없어요."}</p>}
  <p className="data-note">{scope==="team"?"우리 팀 기록 기준(자체전 포함). 골·도움은 결과가 확정된 경기, 출석은 출석 확정, MVP는 마감된 투표만 세요.":"참여를 켠 선수의 모든 팀 기록을 합쳐요. 활동 중인 팀의 기록만 세고, 상위 50명까지 보여요."}</p>
 </div>;
}

// --- 팀 회칙 ---
// 예시 문구는 팀킥이 직접 쓴 것이다. 누르면 입력칸 끝에 붙는다.
export const RULE_TEMPLATES=[
 {label:"출석",text:"[출석]\n- 참여 투표는 경기 전날 밤 10시까지 해주세요.\n- 늦으면 단톡방에 미리 알려주세요."},
 {label:"회비",text:"[회비]\n- 월 회비: ____원 (매월 __일까지)\n- 구장비는 그날 참석한 사람끼리 나눠요."},
 {label:"경기 운영",text:"[경기 운영]\n- __분씩 __쿼터로 뛰어요.\n- 교체와 포지션은 주장·운영진이 정해요."},
 {label:"팀 나누기",text:"[자체전 팀 나누기]\n- 팀킥의 ‘자동으로 나누기’로 정하고, 필요하면 주장이 조정해요."},
 {label:"매너",text:"[매너]\n- 거친 태클은 하지 않아요. 부상 방지가 먼저예요.\n- 상대팀과 심판에게 예의를 지켜요."},
 {label:"준비물",text:"[준비물]\n- 축구화, 정강이 보호대\n- 밝은 상의·어두운 상의 한 벌씩"},
];
export function RulesPanel({team,manager,onEdit}:{team:Row;manager:boolean;onEdit:()=>void}){
 const text=String(team?.rules??"");
 return <section className="panel"><div className="panel-title"><h2 className="row" style={{gap:6}}><BookOpen size={18}/>팀 회칙</h2>{manager&&<button className="btn" onClick={onEdit}>{text?"회칙 고치기":"회칙 쓰기"}</button>}</div>
  {text?<p className="rules-text">{text}</p>:<p className="small muted">{manager?"회비·출석·매너 같은 약속을 적어두면 새 팀원이 가입 전에 읽을 수 있어요.":"아직 회칙이 없어요."}</p>}
  {team?.rulesAt&&<p className="data-note">{koreanDate(team.rulesAt)} 수정</p>}</section>;
}

// --- 초대 QR ---
// 초대 링크를 QR 로 그린다. 외부 서버에 링크를 보내지 않고 이 기기에서 바로 만든다.
export function QrCode({text,size=184}:{text:string;size?:number}){
 const {path,count}=useMemo(()=>{const q=qrcode(0,"M");q.addData(text);q.make();const n=q.getModuleCount();let d="";for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+="M"+c+" "+r+"h1v1h-1z";return {path:d,count:n}},[text]);
 const m=2;
 return <svg className="qr" width={size} height={size} viewBox={(-m)+" "+(-m)+" "+(count+2*m)+" "+(count+2*m)} role="img" aria-label="초대 링크 QR 코드" shapeRendering="crispEdges"><rect x={-m} y={-m} width={count+2*m} height={count+2*m} fill="#fff"/><path d={path} fill="#111"/></svg>;
}
export function InviteShare({link,teamName}:{link:string;teamName:string}){
 const copy=async()=>{try{await navigator.clipboard.writeText(link);toast.success("초대 링크를 복사했어요.")}catch{toast.error("복사하지 못했어요. 링크를 길게 눌러 복사해주세요.")}};
 const canShare=typeof navigator!=="undefined"&&typeof navigator.share==="function";
 const share=async()=>{try{await navigator.share({title:"팀킥 팀 초대",text:teamName+" 팀에 함께해요. 링크를 열고 가입을 신청해주세요.",url:link})}catch(e){if((e as Error)?.name!=="AbortError")copy()}};
 return <div className="invite-share">
  <div className="qr-wrap"><QrCode text={link}/><p className="small muted">운동장에서 휴대폰 카메라로 찍으면 바로 열려요.</p></div>
  <input aria-label="초대 링크" readOnly value={link} onFocus={e=>e.currentTarget.select()}/>
  <div className="action-strip">{canShare&&<button className="btn btn-green" onClick={share}><Share2 size={16}/>카톡 등으로 공유</button>}<button className={"btn"+(canShare?"":" btn-green")} onClick={copy}><Copy size={16}/>링크 복사</button></div>
 </div>;
}
