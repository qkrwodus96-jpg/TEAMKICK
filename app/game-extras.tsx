"use client";
// 경기 기록 탭 위쪽(1.34): 골 시간 순서(1.35 도움 포함), 경기 영상(유튜브 링크), FULL TIME 이미지 버튼.
// 영상은 퍼오지 않고 링크로만 연다(외부 서버에 이용자 정보를 보내지 않게). 서버 검사는 lib/model.ts youtubeUrl.
import {useState} from "react";
import {PlayCircle,Share2} from "lucide-react";
import {toast} from "sonner";
import {type Row} from "@/lib/model";

export function GameExtras({g,side,manager,busy,run,demo,setModal}:{g:Row;side:Row|null;manager:boolean;busy:boolean;run:(c:Record<string,unknown>)=>void;demo:boolean;setModal:(m:Record<string,unknown>)=>void}){
 const [edit,setEdit]=useState(false),[url,setUrl]=useState(String(side?.video??""));
 const roster=(side?.roster??[]) as Row[];
 const nameOf=(id:string)=>String(roster.find(x=>x.id===id)?.name??"선수");
 // 1.35 골 기록(득점자·도움·분)이 있으면 그것을, 없으면 선수별 골 시간을 시간순으로.
 const goals:{name:string;min?:number;assist?:string}[]=Array.isArray(side?.goalLog)?(side!.goalLog as Row[]).map(e=>({name:nameOf(String(e.by)),min:e.min??undefined,assist:e.assist?nameOf(String(e.assist)):undefined}))
  :Object.entries((side?.records??{}) as Record<string,Row>).flatMap(([id,r])=>((r.minutes??[]) as number[]).map(m=>({name:nameOf(id),min:m})));
 goals.sort((a,b)=>(a.min??999)-(b.min??999));
 const final=g.status==="completed"&&g.result?.status==="confirmed"&&g.kind!=="intra";
 function save(){if(demo){toast("샘플에서는 저장되지 않아요.");return}run({type:"setGameVideo",teamId:side?.teamId,gameId:g.id,url:url.trim()});setEdit(false)}
 return <div className="game-extras">
  {!!goals.length&&<div className="goal-line" aria-label="골 시간">{goals.map((x,i)=><span key={i}>⚽ {x.min!=null&&<b>{x.min}&apos; </b>}{x.name}{x.assist&&<small className="muted"> (도움 {x.assist})</small>}</span>)}</div>}
  <div className="action-strip">
   {side?.video&&<a className="btn video-link" href={String(side.video)} target="_blank" rel="noopener noreferrer"><PlayCircle size={16}/>경기 영상 보기</a>}
   {manager&&!edit&&<button type="button" className="btn" disabled={busy} onClick={()=>setEdit(true)}>{side?.video?"영상 링크 바꾸기":"유튜브 영상 링크 넣기"}</button>}
   {final&&<button type="button" className="btn" onClick={()=>setModal({kind:"shareMatch",gameId:g.id})}><Share2 size={16}/>FULL TIME 이미지</button>}
  </div>
  {edit&&<div className="row" style={{gap:8}}><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://youtu.be/… (비우면 지워요)" aria-label="유튜브 영상 주소"/><button type="button" className="btn btn-green" disabled={busy} onClick={save}>저장</button><button type="button" className="btn" onClick={()=>setEdit(false)}>취소</button></div>}
 </div>;
}
