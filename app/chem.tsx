"use client";
// 1.36 마이 케미(MY). 서버 myChem 이 내 계정의 모든 팀 기록에서 계산해 나에게만 보낸다.
// 도움 파트너는 골 기록에 이어 둔 도움만, 같이 뛴 승률은 둘 다 출석한 결과 확정 경기(자체전은 같은 편)만 센다.
import {Handshake,TrendingUp,TrendingDown} from "lucide-react";
import {CHEM_MIN,type Row} from "@/lib/model";
import {PlayerPhoto} from "./teamkick";

function Card({icon,title,list,stat,empty}:{icon:React.ReactNode;title:string;list:Row[];stat:(x:Row)=>string;empty:string}){
 const [first,...rest]=list;
 return <div className="chem-card">
  <div className="chem-title">{icon}<span>{title}</span></div>
  {first?<>
   <div className="chem-top"><PlayerPhoto name={first.name} photo={first.photo}/><div><strong>{first.name}</strong><small>{stat(first)}</small></div></div>
   {!!rest.length&&<ol className="chem-rest">{rest.map((x,i)=><li key={i}><span>{i+2}</span><b>{x.name}</b><small>{stat(x)}</small></li>)}</ol>}
  </>:<p className="small muted">{empty}</p>}
 </div>;
}

export function ChemPanel({v}:{v:Row}){
 const c=(v.chem??{}) as Row;
 const pct=(x:Row,key:"winRate"|"lossRate")=>x[key]+"% · "+x.played+"경기 "+x.wins+"승 "+x.draws+"무 "+x.losses+"패";
 return <section className="panel chem">
  <div className="panel-title"><h2>마이 케미{v.sport==="futsal"?" · 풋살":""}</h2><span className="small muted">모든 팀 합산</span></div>
  <div className="chem-grid">
   <Card icon={<Handshake size={16}/>} title="내 골을 가장 많이 도운 선수" list={(c.assistFrom??[]) as Row[]} stat={x=>"도움 "+x.n+"번 · 내 골의 "+x.share+"%"} empty="골 기록에서 골마다 도움 선수를 이으면 보여요."/>
   <Card icon={<Handshake size={16}/>} title="내가 가장 많이 도운 선수" list={(c.assistTo??[]) as Row[]} stat={x=>"도움 "+x.n+"번 · 내 도움의 "+x.share+"%"} empty="내가 도운 골이 골 기록에 이어지면 보여요."/>
   <Card icon={<TrendingUp size={16}/>} title="같이 뛰면 가장 잘 이기는 선수" list={(c.best??[]) as Row[]} stat={x=>"승률 "+pct(x,"winRate")} empty={"같이 "+CHEM_MIN+"경기 이상 뛴 선수부터 보여요."}/>
   <Card icon={<TrendingDown size={16}/>} title="같이 뛰면 가장 많이 진 선수" list={(c.worst??[]) as Row[]} stat={x=>"패배율 "+pct(x,"lossRate")} empty={"같이 "+CHEM_MIN+"경기 이상 뛰고 진 경기가 있으면 보여요."}/>
  </div>
  <p className="data-note">내 계정으로 뛴 모든 팀 기록을 합쳐 나에게만 보여요. 같이 뛴 승률은 둘 다 출석이 확정되고 점수가 확정된 경기만(자체전은 같은 편일 때만) 세요.</p>
 </section>;
}
