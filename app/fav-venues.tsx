"use client";
// 관심 구장(1.32). 자주 가는 구장을 등록해 두면 그 구장에 상대팀·용병 모집이 열릴 때 알림이 온다.
// 축구·풋살·둘 다 중에서 고른다. 저장은 서버(내 계정)에만 하고, 비교 규칙은 lib/model.ts sameVenue 와 같다.
import {Star,Trash2,Plus,MapPin} from "lucide-react";
import {toast} from "sonner";
import {sameVenue,favSportOk,FAV_MAX,TEAM_SPORT_NAME,type Row} from "@/lib/model";

type Run=(c:Record<string,unknown>)=>void;
const SPORT_CHOICES=["both","soccer","futsal"];
export const favOf=(v:Row,g:Row|null|undefined)=>g?((v.favVenues??[]) as Row[]).find(f=>sameVenue(f,g)):undefined;
export const isFavGame=(v:Row,g:Row)=>((v.favVenues??[]) as Row[]).some(f=>favSportOk(f,g)&&sameVenue(f,g));

// 경기 상세·구장별 보기의 별 버튼. 누르면 관심 구장에 넣거나 뺀다. 종목은 처음엔 "둘 다".
export function FavStar({v,g,run,demo,small}:{v:Row;g:Row;run:Run;demo:boolean;small?:boolean}){
 if(!v.user&&!demo)return null;
 const fav=favOf(v,g);
 const click=()=>{
  if(demo){toast("샘플에서는 저장되지 않아요.");return}
  if(fav){run({type:"removeFavVenue",id:fav.id});toast.success("관심 구장에서 뺐어요.");return}
  if(((v.favVenues??[]) as Row[]).length>=FAV_MAX){toast.error("관심 구장은 "+FAV_MAX+"곳까지 둘 수 있어요. MY에서 정리해 주세요.");return}
  run({type:"addFavVenue",name:g.venue,address:g.address??"",lat:g.lat??null,lng:g.lng??null,sport:"both"});
  toast.success("관심 구장에 넣었어요. 이 구장에 모집이 열리면 알려드려요.");
 };
 return <button type="button" className={"fav-star"+(fav?" on":"")+(small?" small":"")} aria-pressed={!!fav} onClick={click}>
  <Star size={small?14:15} fill={fav?"currentColor":"none"}/>{fav?"관심 구장":"관심 구장 추가"}
 </button>;
}

// MY → 관심 구장 목록. 종목 바꾸기·빼기·추가.
export function FavVenuesPanel({v,busy,run,demo,onAdd}:{v:Row;busy:boolean;run:Run;demo:boolean;onAdd:()=>void}){
 const list=(v.favVenues??[]) as Row[];
 const guard=(fn:()=>void)=>()=>{if(demo){toast("샘플에서는 저장되지 않아요.");return}fn()};
 return <section className="panel">
  <div className="panel-title"><h2>관심 구장 <span className="muted small">{list.length}/{FAV_MAX}</span></h2>
   <button type="button" className="text-link" disabled={busy||list.length>=FAV_MAX} onClick={guard(onAdd)}><Plus size={15}/>추가</button></div>
  <p className="data-note" style={{marginBottom:12}}>이 구장에 상대팀 모집이나 용병 모집이 올라오면 알림을 보내요. 우리 팀이 올린 모집은 빼요.</p>
  {!list.length&&<p className="small muted">아직 없어요. 경기 상세의 <strong>관심 구장 추가</strong>나 위 <strong>추가</strong>로 넣을 수 있어요.</p>}
  <div className="fav-list">{list.map(f=><div key={f.id} className="fav-row">
   <MapPin size={16} className="muted"/>
   <div className="fav-name"><b>{f.name}</b>{f.address&&<small>{f.address}</small>}</div>
   <div className="fav-sport" role="radiogroup" aria-label={f.name+" 알림 종목"}>{SPORT_CHOICES.map(k=><button key={k} type="button" role="radio" aria-checked={(f.sport??"both")===k} className={(f.sport??"both")===k?"on":""} disabled={busy} onClick={guard(()=>run({type:"setFavVenueSport",id:f.id,sport:k}))}>{TEAM_SPORT_NAME[k]==="축구·풋살"?"둘 다":TEAM_SPORT_NAME[k]}</button>)}</div>
   <button type="button" className="icon-button" aria-label={f.name+" 빼기"} disabled={busy} onClick={guard(()=>run({type:"removeFavVenue",id:f.id}))}><Trash2 size={16}/></button>
  </div>)}</div>
 </section>;
}
