"use client";
// 1.19 선수 기록 표 · 선수 상세(사장님 요청 — "지금 너무 이상해, 조금 더 고퀄로").
// 표: 선수 칸을 왼쪽에 고정하고 숫자는 오른쪽 정렬·같은 폭 숫자. 머리글을 누르면 그 기준으로 정렬하고,
// 정렬 중인 칸만 진하게 보여 어느 숫자로 줄 세웠는지 바로 보인다.
// 상세: 위에 큰 숫자 6칸, 아래 경기별 기록에 승/무/패 표시. 3경기가 넘으면 더보기.
import {useState} from "react";
import {ChevronDown} from "lucide-react";
import {isIntra,type Row} from "@/lib/model";
import {dayText} from "@/lib/when";
import {PlayerPhoto,backNo,opponent} from "./teamkick";

export const RANK_COLS:{key:string;label:string;short:string}[]=[
 {key:"attend",label:"출석",short:"출석"},{key:"goals",label:"골",short:"골"},{key:"assists",label:"도움",short:"도움"},
 {key:"points",label:"공격포인트",short:"공P"},{key:"mvp",label:"MVP",short:"MVP"},{key:"rate",label:"출석률",short:"출석률"},
];
const val=(p:Row,k:string)=>k==="rate"?(p.rate??-1):Number(p[k]??0);

export function RecordsTable({players,rank,setRank,onOpen}:{players:Row[];rank:string;setRank:(k:string)=>void;onOpen:(p:Row)=>void}){
 const list=[...players].sort((a,b)=>val(b,rank)-val(a,rank)||b.points-a.points||String(a.name).localeCompare(String(b.name)));
 // 같은 숫자면 같은 순위(1,1,3…)
 const place=(i:number)=>list.findIndex(x=>val(x,rank)===val(list[i],rank))+1;
 if(!list.length)return null;
 return <div className="rt-wrap" role="region" aria-label="우리 팀 선수 기록" tabIndex={0}>
  <table className="rt">
   <thead><tr>
    <th className="rt-player" scope="col">선수</th>
    {RANK_COLS.map(c=><th key={c.key} scope="col" className={rank===c.key?"on":""} aria-sort={rank===c.key?"descending":"none"}>
     <button type="button" onClick={()=>setRank(c.key)} title={c.label+" 순으로 보기"}>{c.short}</button></th>)}
   </tr></thead>
   <tbody>{list.map((p,i)=>{const top=place(i);return <tr key={p.id} onClick={()=>onOpen(p)} className={top===1&&val(p,rank)>0?"lead":""}>
    <th className="rt-player" scope="row">
     <span className={"rt-rank"+(top<=3&&val(p,rank)>0?" r"+top:"")}>{top}</span>
     <span className="rt-name"><b>{p.name}</b><small>{[backNo(p.number),p.position].filter(Boolean).join(" ")}{p.status!=="active"?" 과거 선수":""}</small></span>
    </th>
    {RANK_COLS.map(c=><td key={c.key} className={rank===c.key?"on":""}>{c.key==="attend"?<>{p.attend}<small>/{p.eligible}</small></>:c.key==="rate"?(p.rate==null?"–":p.rate+"%"):p[c.key]??0}</td>)}
   </tr>})}</tbody>
  </table>
 </div>;
}

// 경기 하나의 결과: 우리 점수 기준 승/무/패. 자체전·결과 미확정은 따로.
function outcome(v:Row,g:Row){
 if(isIntra(g))return {tag:"자체",cls:"i",score:""};
 const r=g.result;if(r?.status!=="confirmed"||typeof r.a!=="number")return {tag:"–",cls:"n",score:""};
 const own=g.home===v.teamId?r.a:r.b,other=g.home===v.teamId?r.b:r.a;
 return {tag:own>other?"승":own===other?"무":"패",cls:own>other?"w":own===other?"d":"l",score:own+":"+other};
}

export function PlayerSheet({v,player}:{v:Row;player:Row}){
 const [more,setMore]=useState(false);
 const rows=(v.sides as Row[]).map(s=>({s,g:(v.games as Row[]).find(g=>g.id===s.gameId)}))
  .filter(x=>x.g&&x.g.status==="completed"&&((x.s.roster??[]).some((r:Row)=>r.id===player.id)||x.s.records?.[player.id]||x.s.attendance?.[player.id]))
  .sort((a,b)=>String(b.g!.start).localeCompare(String(a.g!.start)));
 const shown=more?rows:rows.slice(0,3);
 const form=rows.filter(x=>x.s.attendance?.[player.id]).map(x=>outcome(v,x.g!)).filter(o=>["w","d","l"].includes(o.cls));
 const wdl={w:form.filter(o=>o.cls==="w").length,d:form.filter(o=>o.cls==="d").length,l:form.filter(o=>o.cls==="l").length};
 const kpi=[["출석",player.attend+(player.eligible?"/"+player.eligible:"")],["골",player.goals],["도움",player.assists],["공격P",player.points],["MVP",player.mvp||0],["출석률",player.rate==null?"–":player.rate+"%"]];
 return <div className="ps">
  <div className="ps-head">
   <PlayerPhoto name={player.name} photo={player.photo}/>
   <div className="ps-id"><h2>{player.name}</h2><div className="ps-tags">{backNo(player.number)&&<span className="ps-no">{backNo(player.number)}</span>}{player.position&&<span>{player.position}</span>}{player.status!=="active"&&<span>과거 선수</span>}</div></div>
  </div>
  <div className="ps-kpi">{kpi.map(([k,x])=><div key={String(k)}><b>{x}</b><span>{k}</span></div>)}</div>
  <p className="data-note">위 숫자는 기록 탭에서 고른 기간 기준이에요.</p>
  <div className="ps-log-head"><strong>경기별 기록</strong>{form.length>0&&<span className="ps-wdl"><i className="w">{wdl.w}승</i><i className="d">{wdl.d}무</i><i className="l">{wdl.l}패</i><small>뛴 경기</small></span>}</div>
  {!rows.length&&<p className="small muted">아직 끝난 경기 기록이 없어요.</p>}
  <ul className="ps-log">{shown.map(({s,g})=>{const o=outcome(v,g!),r=s.records?.[player.id],here=!!s.attendance?.[player.id];
   const bits=[r?.goals?r.goals+"골":"",r?.assists?r.assists+"도움":"",(s.mvp?.winners??[]).includes(player.id)?"MVP":""].filter(Boolean);
   return <li key={s.id}>
    <span className={"ps-res "+o.cls}>{o.tag}</span>
    <span className="ps-match"><b>{isIntra(g!)?"자체전":"vs "+(opponent(v,g!)||"상대팀")}</b><small>{dayText(g!.start)}{o.score?" "+o.score:""}</small></span>
    <span className={"ps-me"+(here?"":" off")}>{here?(bits.length?bits.join(" "):"출전"):"불참"}</span>
   </li>})}</ul>
  {rows.length>3&&<button type="button" className="chat-more" onClick={()=>setMore(x=>!x)}>{more?"접기":"더보기 "+(rows.length-3)+"경기"}<ChevronDown size={15} style={{transform:more?"rotate(180deg)":"none"}}/></button>}
 </div>;
}
