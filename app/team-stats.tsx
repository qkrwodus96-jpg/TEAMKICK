"use client";
// 팀 성향 분석(1.18) — 스쿼디 팀 메인의 "팀 성향 분석"을 참고. 이미 있는 경기 기록만으로 계산한다(새로 모으는 정보 없음).
// 확정된 결과가 있는 상대 경기만 승·무·패와 득실에 넣는다(자체전은 뺀다).
import type {Row} from "@/lib/model";
import {isIntra} from "@/lib/model";

const WEEK="일월화수목금토";
const kst=(iso:string)=>new Date(Date.parse(iso)+9*3600e3);
const band=(h:number)=>h<12?"오전":h<18?"오후":"저녁";
const top=(m:Map<string,number>,n=3)=>[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n);

export function TeamStats({v}:{v:Row}){
 const tid=v.teamId;
 const games:Row[]=(v.games??[]).filter((g:Row)=>g.status!=="cancelled");
 const done=games.filter((g:Row)=>!isIntra(g)&&g.result?.status==="confirmed").sort((a:Row,b:Row)=>String(a.start).localeCompare(String(b.start)));
 let w=0,d=0,l=0,gf=0,ga=0;const form:string[]=[];
 for(const g of done){const us=g.home===tid?Number(g.result.a):Number(g.result.b),them=g.home===tid?Number(g.result.b):Number(g.result.a);
  gf+=us;ga+=them;const r=us>them?"승":us<them?"패":"무";if(r==="승")w++;else if(r==="패")l++;else d++;form.push(r);}
 const n=done.length;
 const days=new Map<string,number>(),bands=new Map<string,number>(),venues=new Map<string,number>();
 for(const g of games){const t=kst(g.start);const dk=WEEK[t.getUTCDay()]+"요일";days.set(dk,(days.get(dk)??0)+1);const bk=band(t.getUTCHours());bands.set(bk,(bands.get(bk)??0)+1);if(g.venue)venues.set(g.venue,(venues.get(g.venue)??0)+1);}
 const sides:Row[]=(v.sides??[]).filter((z:Row)=>z.attendanceFinal);
 const avgPlayers=sides.length?Math.round(sides.reduce((s:number,z:Row)=>s+Object.values(z.attendance??{}).filter(Boolean).length,0)/sides.length*10)/10:null;
 const per=(x:number)=>n?(Math.round(x/n*10)/10).toFixed(1):"—";
 // 한 줄 성향: 기록이 쌓일수록 정확해진다.
 const tags:string[]=[];
 if(n>=3){if(gf/n>=3)tags.push("화끈한 공격형");else if(ga/n<=1.5)tags.push("단단한 수비형");else tags.push("균형형");if(w/n>=0.6)tags.push("승률 높은 팀");}
 const d1=top(days,1)[0],b1=top(bands,1)[0];if(d1&&b1)tags.push(d1[0].replace("요일","")+"요일 "+b1[0]+"에 주로 뛰는 팀");
 if(!games.length)return <p className="small muted">경기가 쌓이면 팀 성향을 보여드려요. 경기를 만들고 결과를 기록해 보세요.</p>;
 return <div className="ts">
  {!!tags.length&&<div className="ts-tags">{tags.map(t=><span key={t}>{t}</span>)}</div>}
  <div className="ts-grid">
   <div><small>치른 경기</small><b>{n}</b><span>{w}승 {d}무 {l}패</span></div>
   <div><small>승률</small><b>{n?Math.round(w/n*100)+"%":"—"}</b><span>결과 확정 경기 기준</span></div>
   <div><small>경기당 득점</small><b>{per(gf)}</b><span>총 {gf}골</span></div>
   <div><small>경기당 실점</small><b>{per(ga)}</b><span>총 {ga}골</span></div>
  </div>
  {!!form.length&&<div className="ts-row"><strong>최근 흐름</strong><div className="ts-form">{form.slice(-5).map((r,i)=><i key={i} className={r==="승"?"w":r==="패"?"l":"d"}>{r}</i>)}</div></div>}
  <div className="ts-row"><strong>자주 뛰는 때</strong><p>{top(days).map(([k,c])=>k+" "+c+"번").join(" · ")}<br/><small>{top(bands).map(([k,c])=>k+" "+c+"번").join(" · ")}</small></p></div>
  {!!venues.size&&<div className="ts-row"><strong>자주 가는 구장</strong><p>{top(venues).map(([k,c])=>k+" ("+c+")").join(" · ")}</p></div>}
  {avgPlayers!==null&&<div className="ts-row"><strong>평균 참석</strong><p>{avgPlayers}명 <small>(출석을 확정한 경기 {sides.length}개)</small></p></div>}
  <p className="data-note">우리 팀 경기 기록으로만 계산해요. 결과를 확정한 경기가 많을수록 정확해져요.</p>
 </div>;
}
