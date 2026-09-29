"use client";
// 팀 프로필(1.17) — 인스타그램 프로필처럼: 왼쪽 로고, 오른쪽 숫자(사진·팀원·경기), 이름과 소개,
// 모집 중 표시, 버튼 한 줄, 아래는 3칸 사진 격자. 팀 찾기 → 이 화면 → 가입 신청으로 이어진다.
// 로고·사진은 팀이 올린 것만 쓴다(팀킥이 다른 곳 사진을 가져오지 않는다).
import {useState,type ReactNode} from "react";
import {Grid3x3,BookOpen,Camera,X,Trash2,Megaphone,PenLine} from "lucide-react";
import {toast} from "sonner";
import {Crest,imageUrl} from "./teamkick";
import {levelChip,type Row} from "@/lib/model";

type Props={v:Row;team:Row;demo:boolean;busy:boolean;
 run:(c:Record<string,unknown>)=>Promise<unknown>;onJoin:(t:Row)=>void;onEdit:()=>void;uploader:(close:()=>void)=>ReactNode};

export function TeamProfile({v,team,demo,busy,run,onJoin,onEdit,uploader}:Props){
 const [tab,setTab]=useState<"photos"|"rules">("photos");
 const [open,setOpen]=useState<Row|null>(null);
 const [uploading,setUploading]=useState(false);
 const [caption,setCaption]=useState<string|null>(null);
 const mine=(v.mine??[]).find((m:Row)=>m.teamId===team.id);
 const member=mine?.status==="active",pending=mine?.status==="pending";
 const manager=member&&["captain","manager"].includes(mine?.role),captain=member&&mine?.role==="captain";
 const photos:Row[]=team.photos??[];
 async function saveCaption(p:Row){
  if(demo){toast("샘플에서는 글을 저장할 수 없어요.");return}
  await run({type:"captionTeamPhoto",teamId:team.id,key:p.key,caption:caption??""});
  setOpen({...p,caption:caption??""});setCaption(null);
 }
 async function remove(p:Row){
  if(demo){toast("샘플에서는 사진을 지울 수 없어요.");return}
  await run({type:"removeTeamPhoto",teamId:team.id,key:p.key});
  // 프로필에서 뺀 뒤 저장소 파일도 지운다. 실패해도 화면에는 이미 안 보인다.
  fetch("/api/image?key="+encodeURIComponent(p.key),{method:"DELETE"}).catch(()=>null);
  setOpen(null);
 }
 const facts=[team.region,levelChip(team.level),team.days&&team.days!=="상관없음"?team.days+" 활동":"",team.founded?team.founded+"년 창단":"",team.fee!=null?"월 회비 "+Number(team.fee).toLocaleString()+"원":""].filter(Boolean);
 return <div className="tp">
  <div className="tp-head">
   <div className="tp-logo"><Crest name={team.name} color={team.color} logo={team.logo}/></div>
   <div className="tp-stats">
    <div><b>{photos.length}</b><span>사진</span></div>
    <div><b>{team.memberCount??0}</b><span>팀원</span></div>
    <div><b>{team.gameCount??0}</b><span>경기</span></div>
   </div>
  </div>
  <div className="tp-bio">
   <strong>{team.name}</strong>
   <span className="tp-facts">{facts.join(" · ")}</span>
   {team.description&&<p>{team.description}</p>}
   {team.recruiting&&<p className="tp-recruit"><Megaphone size={15}/><b>팀원 모집 중</b>{team.recruitNote?" · "+team.recruitNote:""}</p>}
  </div>
  <div className="tp-actions">
   {captain&&<button type="button" className="btn" onClick={onEdit}>프로필 편집</button>}
   {manager&&<button type="button" className="btn" onClick={()=>setUploading(x=>!x)}><Camera size={16}/>사진 올리기</button>}
   {!member&&<button type="button" className="btn btn-green" disabled={busy||pending||demo} onClick={()=>onJoin(team)}>{pending?"승인 대기 중":"가입 신청"}</button>}
  </div>
  {uploading&&<div className="tp-upload">{uploader(()=>setUploading(false))}<p className="data-note">사진 속 사람에게 먼저 올려도 되는지 물어봐 주세요. 팀킥에 로그인한 사람은 누구나 볼 수 있어요.</p></div>}
  <div className="tp-tabs" role="tablist">
   <button type="button" role="tab" aria-selected={tab==="photos"} className={tab==="photos"?"on":""} onClick={()=>setTab("photos")}><Grid3x3 size={18}/><span>사진</span></button>
   <button type="button" role="tab" aria-selected={tab==="rules"} className={tab==="rules"?"on":""} onClick={()=>setTab("rules")}><BookOpen size={18}/><span>회칙</span></button>
  </div>
  {tab==="photos"&&(photos.length?<div className="tp-grid">{photos.map(p=><button type="button" key={p.id??p.key} onClick={()=>setOpen(p)} aria-label={p.caption||"팀 사진"}><img src={imageUrl(p.key)} alt={p.caption||team.name+" 사진"} loading="lazy"/></button>)}</div>
   :<div className="tp-empty"><Camera size={30}/><strong>아직 사진이 없어요</strong><span>{manager?"경기 사진이나 단체 사진을 올려보세요.":"팀이 사진을 올리면 여기에 보여요."}</span></div>)}
  {tab==="rules"&&<div className="tp-rules">{team.rules?<p className="rules-text">{team.rules}</p>:<p className="small muted">아직 회칙이 없어요.</p>}</div>}
  {open&&<div className="tp-view" role="dialog" aria-label="사진 보기" onClick={()=>{setOpen(null);setCaption(null)}}>
   <div className="tp-view-inner" onClick={e=>e.stopPropagation()}>
    <img src={imageUrl(open.key)} alt={open.caption||team.name+" 사진"}/>
    {caption===null?<div className="tp-view-caption">{open.caption?<p><b>{team.name}</b> {open.caption}</p>:manager?<p className="muted">아직 글이 없어요.</p>:null}</div>
     :<div className="tp-view-caption edit"><textarea autoFocus maxLength={300} rows={3} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="이 사진에 대한 글을 적어주세요. (300자)"/><div className="row"><button type="button" className="btn btn-green" disabled={busy} onClick={()=>saveCaption(open)}>저장</button><button type="button" className="btn btn-ghost" onClick={()=>setCaption(null)}>취소</button></div></div>}
    <div className="tp-view-bar">{manager&&caption===null&&<button type="button" className="btn btn-ghost" onClick={()=>setCaption(open.caption??"")}><PenLine size={16}/>{open.caption?"글 고치기":"글 쓰기"}</button>}{manager&&<button type="button" className="btn btn-ghost" disabled={busy} onClick={()=>remove(open)}><Trash2 size={16}/>사진 빼기</button>}<button type="button" className="btn btn-ghost" onClick={()=>{setOpen(null);setCaption(null)}} aria-label="닫기"><X size={18}/></button></div>
   </div>
  </div>}
 </div>;
}
