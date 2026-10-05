// 1.21 경기 날씨 저장을 예약 실행(/api/cron, 10분마다)에서도 한다(사장님 메모 — "이전 경기 날씨가 저장되지 않았음").
// 1.20 에는 경기 시간대에 누군가 화면을 열어야만 저장돼서, 아무도 안 연 경기는 날씨가 남지 않았다.
// 경기 시작 3시간 전~시작 1시간 뒤 사이의 경기마다, 한 시간에 한 번 그때 예보를 경기에 적는다.
// 이미 지나간 경기(이 기능 전)는 그 시각의 예보를 다시 받을 수 없어 채우지 않는다(지난 관측값은 다른 공공 API가 필요).
import {load,commit} from "./store";
import {gameWeather,weatherReady} from "./weather-server";
import {searchPlaces} from "./places";
import {inKorea} from "./weather";
import type {State} from "./model";

type G=State["games"][number];
export function weatherDue(state:State,now:number){
 return state.games.filter(g=>g.status!=="cancelled"&&(()=>{const s=Date.parse(g.start);return Number.isFinite(s)&&now>=s-3*3600e3&&now<=s+3600e3})()
  &&(!g.weather||now-Date.parse(String(g.weather.at))>=3600e3)).slice(0,8);
}
async function spot(g:G){
 if(inKorea(Number(g.lat),Number(g.lng)))return {lat:Number(g.lat),lng:Number(g.lng)};
 const address=String(g.address??g.venue??"").trim().slice(0,50);if(!address)return null;
 try{const p=(await searchPlaces(address))[0];return p&&inKorea(p.lat,p.lng)?{lat:p.lat,lng:p.lng}:null}catch{return null}
}
export async function saveDueWeather(now=Date.now()){
 if(!weatherReady())return {saved:0,reason:"no-key"};
 const {state}=await load();const due=weatherDue(state,now);if(!due.length)return {saved:0};
 const got:Record<string,Record<string,unknown>>={};
 for(const g of due){
  const p=await spot(g);if(!p)continue;
  const w=await gameWeather({lat:p.lat,lng:p.lng,start:g.start,region:String(g.region??"")},now).catch(()=>null);
  if(!w||w.status!=="ok"||!w.forecast)continue;
  const f=w.forecast;got[g.id]={label:f.label,temp:f.temp,pop:f.pop,pty:f.pty,sky:f.sky,air:w.air?{pm10:w.air.pm10,pm25:w.air.pm25}:null,at:new Date(now).toISOString()};
 }
 if(!Object.keys(got).length)return {saved:0};
 for(let attempt=0;attempt<3;attempt++){
  const {state:s,version}=await load();const after=structuredClone(s);
  for(const [id,x] of Object.entries(got)){const t=after.games.find(y=>y.id===id);if(t)t.weather=x}
  try{await commit(s,after,version);return {saved:Object.keys(got).length}}
  catch(e){if(!String(e).includes("CHECK constraint")&&!String(e).includes("revision_matches"))throw e}
 }
 return {saved:0,reason:"busy"};
}
