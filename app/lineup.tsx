"use client";
// 라인업(1.18) — 쿼터마다 포메이션을 고르고 축구장 위 자리마다 선수를 넣는다.
// 자리를 누르고 이름 한두 글자만 치면("재연") 우리 팀 선수·확정 용병이 추려지고, 고르면 유니폼에 등번호와 이름이 들어간다.
// 운영진이 고치고 저장하면 팀원은 같은 그림을 본다. 아래에는 선수별 출전 쿼터 수(최소 출전 보장 확인용)를 보여준다.
import {useMemo,useState} from "react";
import {Copy,Eraser,Search,X,Shuffle} from "lucide-react";
import {toast} from "sonner";
import {FORMATIONS,FORMATION_NAMES,slotGroup,splitQuarters} from "@/lib/formations";
import {positionGroup,type Row} from "@/lib/model";

type Who={memberId?:string;guestId?:string;name:string;number?:number|null};
type Q={formation:string;slots:Record<string,Who>};
const idOf=(w:Who)=>w.memberId?"m:"+w.memberId:w.guestId?"g:"+w.guestId:"n:"+w.name;

// 스쿼디 느낌의 세로 축구장: 짙은 초록 줄무늬, 흰 선(중앙선·센터서클·양쪽 박스·골 에어리어·페널티 아크).
function Pitch(){
 return <svg className="lu-pitch-svg" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden>
  <defs><pattern id="lu-stripe" width="100" height="30" patternUnits="userSpaceOnUse"><rect width="100" height="15" fill="#177a4a"/><rect y="15" width="100" height="15" fill="#146e43"/></pattern></defs>
  <rect width="100" height="150" fill="url(#lu-stripe)"/>
  <g fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".5">
   <rect x="4" y="4" width="92" height="142"/><line x1="4" y1="75" x2="96" y2="75"/><circle cx="50" cy="75" r="11"/>
   <rect x="24" y="4" width="52" height="22"/><rect x="37" y="4" width="26" height="8"/><path d="M40 26 A12 12 0 0 0 60 26"/>
   <rect x="24" y="124" width="52" height="22"/><rect x="37" y="138" width="26" height="8"/><path d="M40 124 A12 12 0 0 1 60 124"/>
  </g>
  <g fill="rgba(255,255,255,.7)"><circle cx="50" cy="75" r=".8"/><circle cx="50" cy="19" r=".6"/><circle cx="50" cy="131" r=".6"/></g>
 </svg>;
}
function Shirt({who,group,empty}:{who?:Who;group:string;empty:boolean}){
 return <svg className={"lu-shirt "+group+(empty?" vacant":"")} viewBox="0 0 40 38" aria-hidden>
  <path d="M13 3 L6 6 L1 14 L7 18 L9 15 L9 36 L31 36 L31 15 L33 18 L39 14 L34 6 L27 3 Q20 9 13 3 Z" strokeWidth="1.4"/>
  <text x="20" y="27" textAnchor="middle">{empty?"+":who?.number??""}</text>
 </svg>;
}

export function Lineup({g,side,v,canEdit,busy,run,demo}:{g:Row;side:Row;v:Row;canEdit:boolean;busy:boolean;run:(c:Record<string,unknown>)=>Promise<unknown>;demo:boolean}){
 const quarters:number=side?.quarters??4;
 const saved:(Q|null)[]=useMemo(()=>side?.lineups??[],[side?.lineups]);
 const [qi,setQi]=useState(0);
 const [draft,setDraft]=useState<Record<number,Q>>({});
 const [pick,setPick]=useState<string|null>(null),[term,setTerm]=useState("");
 const cur:Q=draft[qi]??saved[qi]??{formation:"4-4-2",slots:{}};
 const dirty=!!draft[qi];
 const put=(q:Q)=>setDraft(d=>({...d,[qi]:q}));
 // 넣을 수 있는 사람: 참여(yes) 먼저, 그다음 나머지 팀원, 확정 용병. 이름 일부로 거른다.
 const people=useMemo(()=>{
  const roster:Row[]=side?.roster??[];
  const vote=(id:string)=>{const h=side?.votes?.[id]??[];return h.length?h[h.length-1].value:"none"};
  const rank:Record<string,number>={yes:0,maybe:1,none:2,no:3};
  const ms:(Who&{tag:string;rank:number;pos?:string})[]=roster.map(m=>({memberId:m.id,name:m.name,number:m.number??null,pos:m.position,tag:vote(m.id)==="yes"?"참여":vote(m.id)==="no"?"불참":vote(m.id)==="maybe"?"미정":"",rank:rank[vote(m.id)]??2}));
  const gs=(side?.guestRoster??[]).map((x:Row)=>({guestId:x.id,name:x.name,number:x.number??null,pos:x.position,tag:"용병",rank:0}));
  return [...ms,...gs].sort((a,b)=>a.rank-b.rank||String(a.name).localeCompare(String(b.name),"ko"));
 },[side]);
 const inUse=new Set(Object.values(cur.slots).map(idOf));
 const shown=people.filter(p=>!term.trim()||p.name.includes(term.trim())||String(p.number??"")===term.trim());
 function assign(w:Who|null){
  if(!pick)return;const slots={...cur.slots};
  if(w){for(const [k,x] of Object.entries(slots))if(idOf(x)===idOf(w))delete slots[k];slots[pick]={memberId:w.memberId,guestId:w.guestId,name:w.name,number:w.number??null};}
  else delete slots[pick];
  put({...cur,slots});setPick(null);setTerm("");
 }
 function setFormation(f:string){
  // 포메이션을 바꾸면 같은 이름의 자리는 그대로, 없어진 자리의 선수는 빈 자리에 차례로 옮긴다.
  const next=FORMATIONS[f].map(x=>x.k);const slots:Record<string,Who>={};const left:Who[]=[];
  for(const [k,w] of Object.entries(cur.slots)){if(next.includes(k))slots[k]=w;else left.push(w)}
  for(const k of next)if(!slots[k]&&left.length)slots[k]=left.shift()!;
  put({formation:f,slots});
 }
 const payload=(q:Q)=>{const slots:Record<string,Record<string,unknown>>={};for(const [k,w] of Object.entries(q.slots))slots[k]=w.memberId?{memberId:w.memberId}:w.guestId?{guestId:w.guestId}:{name:w.name,number:w.number??""};return slots};
 async function save(){
  if(demo){toast("샘플에서는 저장되지 않아요.");return}
  await run({type:"setLineup",teamId:v.teamId,gameId:g.id,quarter:qi+1,formation:cur.formation,slots:payload(cur)});
  setDraft(d=>{const n={...d};delete n[qi];return n});toast.success((qi+1)+"쿼터 라인업을 저장했어요.");
 }
 // 1.20 고친 쿼터를 한 번에 저장(자동 분배 뒤). 하나라도 실패하면 거기서 멈추고 남은 쿼터는 고치는 중으로 둔다.
 async function saveAll(){
  if(demo){toast("샘플에서는 저장되지 않아요.");return}
  const keys=Object.keys(draft).map(Number).sort((a,b)=>a-b);let ok=0;
  for(const i of keys){try{await run({type:"setLineup",teamId:v.teamId,gameId:g.id,quarter:i+1,formation:draft[i].formation,slots:payload(draft[i])})}catch{break}
   ok++;setDraft(d=>{const n={...d};delete n[i];return n})}
  if(ok===keys.length)toast.success(ok+"개 쿼터 라인업을 저장했어요.");
 }
 // 1.20 쿼터 자동 분배: 참여(yes)한 팀원 + 확정 용병을 쿼터마다 고르게 나누고, 포지션대로 자리에 넣는다.
 function autoSplit(){
  const going=people.filter(p=>p.tag==="참여"||p.tag==="용병");
  if(!going.length){toast("아직 참여한 사람이 없어요. 참여 투표가 모이면 다시 눌러 주세요.");return}
  const list=going.map(p=>({...p,id:idOf(p),position:String(p.pos??"MF"),group:positionGroup(p.pos)}));
  const plan=splitQuarters(cur.formation,list,quarters);
  const next:Record<number,Q>={};plan.forEach((q,i)=>{const slots:Record<string,Who>={};for(const [k,p] of Object.entries(q))slots[k]={memberId:p.memberId,guestId:p.guestId,name:p.name,number:p.number??null};next[i]={formation:cur.formation,slots}});
  setDraft(next);setPick(null);
  const n=new Map<string,number>();for(const q of plan)for(const p of Object.values(q))n.set(p.id,(n.get(p.id)??0)+1);
  const vals=[...n.values()],lo=Math.min(...vals,quarters),hi=Math.max(...vals,0);
  toast.success("참여 "+going.length+"명을 "+quarters+"쿼터에 나눴어요 · 한 사람당 "+(lo===hi?lo:lo+"~"+hi)+"쿼터. 확인하고 ‘전체 저장’을 눌러 주세요.");
 }
 function copyPrev(){const prev=draft[qi-1]??saved[qi-1];if(!prev){toast("앞 쿼터 라인업이 없어요.");return}put({formation:prev.formation,slots:{...prev.slots}})}
 // 선수별 출전 쿼터(저장된 것 + 고치는 중인 것)
 const counts=useMemo(()=>{const m=new Map<string,{name:string;n:number;guest:boolean}>();
  for(let i=0;i<quarters;i++){const q=draft[i]??saved[i];if(!q)continue;for(const w of Object.values(q.slots)){const k=idOf(w);const e=m.get(k)??{name:w.name,n:0,guest:!!w.guestId};e.n++;m.set(k,e)}}
  return [...m.values()].sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name,"ko"))},[draft,saved,quarters]);
 const slots=FORMATIONS[cur.formation]??FORMATIONS["4-4-2"];
 const filled=Object.keys(cur.slots).length;
 return <div className="lu">
  <div className="lu-top">
   <div className="lu-q" role="tablist" aria-label="쿼터">{Array.from({length:quarters},(_,i)=><button key={i} type="button" role="tab" aria-selected={qi===i} className={(qi===i?"on":"")+(draft[i]?" dirty":"")+(saved[i]?" has":"")} onClick={()=>{setQi(i);setPick(null)}}>{i+1}Q</button>)}</div>
   {canEdit&&<label className="lu-qn">쿼터 수<select value={quarters} disabled={busy} onChange={e=>run({type:"setQuarters",teamId:v.teamId,gameId:g.id,quarters:Number(e.target.value)}).then(()=>setQi(0))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}</select></label>}
  </div>
  {canEdit&&<div className="lu-forms">{FORMATION_NAMES.map(f=><button key={f} type="button" className={"chip-btn"+(cur.formation===f?" on":"")} onClick={()=>setFormation(f)}>{f}</button>)}</div>}
  {!canEdit&&<p className="lu-form-name">{cur.formation}{!saved[qi]&&" · 아직 정하지 않았어요"}</p>}
  <div className="lu-pitch">
   <Pitch/>
   {slots.map(sl=>{const w=cur.slots[sl.k];const grp=slotGroup(sl.k);
    return <button key={sl.k} type="button" className={"lu-slot"+(pick===sl.k?" picking":"")} style={{left:sl.x+"%",top:sl.y+"%"}} disabled={!canEdit} onClick={()=>{setPick(sl.k);setTerm("")}} aria-label={sl.k+" "+(w?w.name:"비어 있음")}>
     <Shirt who={w} group={grp} empty={!w}/>
     <span className="lu-name">{w?w.name:sl.k}</span>
    </button>})}
  </div>
  {canEdit&&<div className="lu-actions"><span className="small muted">{filled}/{slots.length}명 · {dirty?"저장 안 됨":saved[qi]?"저장됨":"아직 없음"}</span>
   <button type="button" className="btn" onClick={copyPrev} disabled={qi===0}><Copy size={15}/>앞 쿼터 복사</button>
   <button type="button" className="btn btn-green" disabled={busy||!dirty} onClick={save}>{qi+1}Q 저장</button></div>}
  {canEdit&&<div className="lu-auto"><button type="button" className="btn" disabled={busy} onClick={autoSplit}><Shuffle size={15}/>쿼터 자동 분배</button>
   {Object.keys(draft).length>1&&<button type="button" className="btn btn-dark" disabled={busy} onClick={saveAll}>고친 {Object.keys(draft).length}개 쿼터 전체 저장</button>}
   <small className="muted">참여한 사람이 같은 쿼터 수만큼 뛰도록 지금 포메이션({cur.formation})으로 나누고, 포지션대로 자리에 넣어요. 저장 전에는 팀원에게 안 보여요.</small></div>}
  {pick&&<div className="lu-sheet" role="dialog" aria-label={pick+" 자리에 넣을 선수"}>
   <div className="row between"><strong>{pick} 자리</strong><button type="button" className="icon-button" onClick={()=>setPick(null)} aria-label="닫기"><X size={18}/></button></div>
   <div className="search-input"><Search size={16} className="muted"/><input autoFocus value={term} onChange={e=>setTerm(e.target.value)} placeholder="이름 일부나 등번호 (예: 재연, 10)" style={{border:0}}
    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(shown[0])assign(shown[0]);else if(term.trim())assign({name:term.trim()})}}}/></div>
   <div className="lu-people">{shown.map(p=><button key={idOf(p)} type="button" className={"lu-person"+(inUse.has(idOf(p))?" used":"")} onClick={()=>assign(p)}>
    <b>{p.number??"-"}</b><span>{p.name}</span><small>{[p.pos,p.tag,inUse.has(idOf(p))?"다른 자리에 있음":""].filter(Boolean).join(" · ")}</small></button>)}
    {!shown.length&&term.trim()&&<button type="button" className="lu-person" onClick={()=>assign({name:term.trim()})}><b>+</b><span>{term.trim()}</span><small>팀킥에 없는 사람으로 넣기</small></button>}
   </div>
   {cur.slots[pick]&&<button type="button" className="btn btn-ghost" onClick={()=>assign(null)}><Eraser size={15}/>이 자리 비우기</button>}
  </div>}
  {!!counts.length&&<div className="lu-counts"><strong>출전 쿼터</strong><div>{counts.map(c=><span key={c.name+c.guest} className={c.guest?"guest":""}>{c.name} <b>{c.n}Q</b></span>)}</div>
   {side?.guestMinPlay&&<small className="muted">이 경기 용병 최소 출전 보장: {side.guestMinPlay}</small>}</div>}
 </div>;
}
