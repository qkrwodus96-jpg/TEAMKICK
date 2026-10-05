import {currentUser} from "@/lib/auth";
import {gameWeather} from "@/lib/weather-server";
import {searchPlaces} from "@/lib/places";
import {inKorea} from "@/lib/weather";
import {AppError,canSeeGame} from "@/lib/model";
import {load,commit} from "@/lib/store";
export const dynamic="force-dynamic";
// 로그인한 사람만(공공데이터 호출 한도 보호). 받는 것은 구장 좌표(또는 주소)·경기 시각·지역 이름뿐이다.
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":status===200?"private, max-age=600":"no-store"}});
// 지도 검색 없이 직접 입력한 구장은 좌표가 없다 — 주소로 카카오 장소 검색을 한 번 해서 좌표를 얻는다.
const spots=new Map<string,{lat:number;lng:number}|null>();
async function locate(address:string){
 if(spots.has(address))return spots.get(address)!;
 let hit:{lat:number;lng:number}|null=null;
 try{const p=(await searchPlaces(address))[0];if(p&&inKorea(p.lat,p.lng))hit={lat:p.lat,lng:p.lng}}catch{hit=null}
 if(spots.size>500)spots.clear();spots.set(address,hit);return hit;
}
async function keep(userId:string,gameId:string,w:Awaited<ReturnType<typeof gameWeather>>){
 const now=Date.now();
 for(let attempt=0;attempt<2;attempt++){
  const {state,version}=await load();const g=canSeeGame(state,userId,gameId);if(!g)return;
  const start=Date.parse(g.start);if(!(now>=start-3*3600e3&&now<=start+3600e3))return;
  if(g.weather&&now-Date.parse(g.weather.at)<3600e3)return;
  const after=structuredClone(state);const t=after.games.find(x=>x.id===gameId)!;
  const f=w.forecast!;t.weather={label:f.label,temp:f.temp,pop:f.pop,pty:f.pty,sky:f.sky,air:w.air?{pm10:w.air.pm10,pm25:w.air.pm25}:null,at:new Date(now).toISOString()};
  try{await commit(state,after,version);return}catch(e){if(!String(e).includes("CHECK constraint")&&!String(e).includes("revision_matches"))throw e}
 }
}
export async function GET(req:Request){
 try{
  const user=await currentUser(req);if(!user)throw new AppError("로그인하면 날씨를 볼 수 있어요.",401);
  const q=new URL(req.url).searchParams;
  let lat=Number(q.get("lat")),lng=Number(q.get("lng"));
  const address=String(q.get("address")??"").trim().slice(0,50);
  if(!inKorea(lat,lng)&&address){const p=await locate(address);if(!p)throw new AppError("구장 주소로 위치를 찾지 못해 날씨를 볼 수 없어요.",404);lat=p.lat;lng=p.lng}
  const start=String(q.get("at")??"");
  const w=await gameWeather({lat,lng,start,region:String(q.get("region")??"").slice(0,20)});
  // 1.20: 경기 시각 앞뒤에 본 예보를 그 경기에 한 번 적어 둔다(경기가 끝나도 "그날 날씨"가 남게).
  // 경기 3시간 전~시작 1시간 뒤 사이, 한 시간에 한 번만 쓴다. 팀원·확정 용병만.
  const gid=String(q.get("game")??"");
  if(gid&&w.status==="ok"&&w.forecast)await keep(user.userId,gid,w).catch(e=>console.error("TeamKick weather keep",e));
  return json(w);
 }catch(e){
  if(!(e instanceof AppError))console.error("TeamKick weather",e);
  return json({error:e instanceof AppError?e.message:"지금은 날씨를 불러올 수 없어요."},e instanceof AppError?e.status:503);
 }
}
