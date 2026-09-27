"use client";
// 경기 날 날씨·미세먼지 한 줄 + 캘린더에 추가 버튼.
// 날씨는 기상청 단기예보(경기 약 3일 전부터), 미세먼지는 에어코리아 대기질 예보(오늘~모레).
// 못 불러오면 홈 카드에서는 조용히 숨기고, 경기 상세에서만 이유를 한 줄로 알려준다(가짜 날씨 없음).
import {useEffect,useState} from "react";
import {Sun,Cloud,CloudSun,CloudRain,CloudSnow,CloudDrizzle,Umbrella,CalendarPlus} from "lucide-react";
import {googleCalendarUrl} from "@/lib/calendar";
import type {GameWeather} from "@/lib/weather";

type Game={id:string;start:string;end:string;lat?:number|null;lng?:number|null;region?:string;venue?:string;address?:string;format?:string;status?:string};
const memo=new Map<string,{at:number;p:Promise<GameWeather>}>();
function loadWeather(g:Game){
 const k=[g.lat,g.lng,g.address,g.start,g.region].join("|");const hit=memo.get(k);
 if(hit&&Date.now()-hit.at<30*60e3)return hit.p;
 const p=fetch("/api/weather?"+new URLSearchParams({lat:String(g.lat??""),lng:String(g.lng??""),address:g.lat==null?String(g.address??""):"",at:g.start,region:String(g.region??"")}).toString(),{credentials:"same-origin"})
  .then(async r=>{const b=await r.json().catch(()=>({})) as GameWeather&{error?:string};if(!r.ok)throw Object.assign(new Error(b.error||"지금은 날씨를 불러올 수 없어요."),{status:r.status});return b as GameWeather});
 memo.set(k,{at:Date.now(),p});p.catch(()=>memo.delete(k));return p;
}
function Icon({pty,sky}:{pty:number;sky:number}){const s=18;
 if(pty===3)return <CloudSnow size={s}/>;if(pty===4)return <CloudDrizzle size={s}/>;if(pty>0)return <CloudRain size={s}/>;
 return sky===4?<Cloud size={s}/>:sky===3?<CloudSun size={s}/>:<Sun size={s}/>;
}
const airText=(a:GameWeather["air"])=>!a?"":[a.pm10&&"미세먼지 "+a.pm10,a.pm25&&"초미세 "+a.pm25].filter(Boolean).join(" · ");

export function WeatherLine({g,detail=false,onRain}:{g:Game;detail?:boolean;onRain?:()=>void}){
 const has=((g.lat!=null&&g.lng!=null)||!!g.address)&&g.status!=="cancelled";const k=[g.lat,g.lng,g.address,g.start].join("|");
 const [res,setRes]=useState<{k:string;w:GameWeather|null;err:string;status:number}>({k:"",w:null,err:"",status:0});
 useEffect(()=>{if(!has)return;let live=true;loadWeather(g).then(w=>{if(live)setRes({k,w,err:"",status:200})}).catch((e:Error&{status?:number})=>{if(live)setRes({k,w:null,err:e.message,status:e.status??0})});return()=>{live=false}},[has,k]);// eslint-disable-line react-hooks/exhaustive-deps
 if(!has)return detail?<p className="wx-note">구장 주소가 있어야 날씨를 볼 수 있어요.</p>:null;
 if(res.k!==k)return detail?<p className="wx-note">날씨를 불러오는 중…</p>:null;
 const w=res.w;
 if(!w){if(!detail||res.status===401)return null;return <p className="wx-note">{res.err}</p>}
 if(w.status==="past")return null;
 if(w.status==="far")return detail?<p className="wx-note">경기 날 날씨 예보는 경기 약 3일 전부터 나와요.</p>:null;
 const f=w.forecast!;const air=airText(w.air);
 return <div className={"wx"+(detail?" wx-detail":"")+(f.rainy?" rainy":"")}>
  <span className="wx-main"><Icon pty={f.pty} sky={f.sky}/><b>{f.label}{f.temp!=null&&" "+f.temp+"°"}</b>{f.pop!=null&&<span>강수 {f.pop}%</span>}{air&&<span>{air}</span>}</span>
  {detail&&f.rainy&&<span className="wx-rain"><Umbrella size={15}/>비 예보가 있어요.{onRain&&<button type="button" className="text-link" onClick={onRain}>우천 공지 쓰기</button>}</span>}
  {detail&&!w.air&&w.airNote&&<small className="wx-note">미세먼지: {w.airNote==="none"?"그날 대기질 예보가 아직 발표되지 않았어요. 보통 이틀 전 오후부터 나와요.":w.airNote==="key"?"에어코리아 대기오염정보 활용신청(공공데이터포털)이 필요해요.":w.airNote==="timeout"?"에어코리아 서버가 늦게 응답해서 이번엔 빠졌어요.":"지금은 불러오지 못했어요."}</small>}
  {detail&&<small className="wx-src">날씨: 기상청 · 미세먼지: 한국환경공단 에어코리아 (예보라 바뀔 수 있어요)</small>}
 </div>;
}

export function CalendarButtons({g,title,demo}:{g:Game;title:string;demo:boolean}){
 if(g.status!=="scheduled")return null;
 const ev={id:g.id,title:"[팀킥] "+title,start:g.start,end:g.end,location:[g.venue,g.address].filter(Boolean).join(" "),description:[g.format,"참석 투표·경기 정보: https://teamkick.co.kr"].filter(Boolean).join("\n"),url:"https://teamkick.co.kr"};
 return <>
  {!demo&&<a className="btn" href={"/api/calendar?game="+encodeURIComponent(g.id)} download><CalendarPlus/>내 캘린더에 추가</a>}
  <a className="btn" href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer"><CalendarPlus/>구글 캘린더</a>
 </>;
}
