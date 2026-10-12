"use client";
// 경기 기록 탭 위쪽(1.34): 골 시간 순서, 경기 영상(유튜브 링크), FULL TIME 이미지 버튼.
// 영상은 퍼오지 않고 링크로만 연다(외부 서버에 이용자 정보를 보내지 않게). 서버 검사는 lib/model.ts youtubeUrl.
import {useState} from "react";
import {PlayCircle,Share2} from "lucide-react";
import {toast} from "sonner";
import {type Row} from "@/lib/model";

export function GameExtras({g,side,manager,busy,run,demo,setModal}:{g:Row;side:Row|null;manager:boolean;busy:boolean;run:(c:Record<string,unknown>)=>void;demo:boolean;setModal:(m:Record<string,unknown>)=>void}){
 const [edit,setEdit]=useState(false),[url,setUrl]=useState(String(side?.video??""));
 const roster=(side?.roster??[]) as Row[];
 const goals:{name:string;min:number}[]=[];
 for(const [id,r] of Object.entries((side?.records??{}) as Record<string,Row>))for(const m of (r.minutes??[]) as number[])goals.push({name:String(roster.find(x=>x.id===id)?.name??"선수"),min:m});
 goals.sort((a,b)=>a.min-b.min);
 const final=g.status==="completed"&&g.result?.status==="confirmed"&&g.kind!=="intra";
 function save(){if(demo){toast("샘플에서는 저장되지 않아요.");return}run({type:"setGameVideo",teamId:side?.teamId,gameId:g.id,url:url.trim()});setEdit(false)}
 return <div className="game-extras">
  {!!goals.length&&<div className="goal-line" aria-label="골 시간">{goals.map((x,i)=><span key={i}>⚽ <b>{x.min}&apos;</b> {x.name}</span>)}</div>}
  <div className="action-strip">
   {side?.video&&<a className="btn video-link" href={String(side.video)} target="_blank" rel="noopener noreferrer"><PlayCircle size={16}/>경기 영상 보기</a>}
   {manager&&!edit&&<button type="button" className="btn" disabled={busy} onClick={()=>setEdit(true)}>{side?.video?"영상 링크 바꾸기":"유튜브 영상 링크 넣기"}</button>}
   {final&&<button type="button" className="btn" onClick={()=>setModal({kind:"shareMatch",gameId:g.id})}><Share2 size={16}/>FULL TIME 이미지</button>}
  </div>
  {edit&&<div className="row" style={{gap:8}}><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://youtu.be/… (비우면 지워요)" aria-label="유튜브 영상 주소"/><button type="button" className="btn btn-green" disabled={busy} onClick={save}>저장</button><button type="button" className="btn" onClick={()=>setEdit(false)}>취소</button></div>}
 </div>;
}
