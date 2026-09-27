import {currentUser} from "@/lib/auth";
import {gameWeather} from "@/lib/weather-server";
import {searchPlaces} from "@/lib/places";
import {inKorea} from "@/lib/weather";
import {AppError} from "@/lib/model";
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
export async function GET(req:Request){
 try{
  const user=await currentUser(req);if(!user)throw new AppError("로그인하면 날씨를 볼 수 있어요.",401);
  const q=new URL(req.url).searchParams;
  let lat=Number(q.get("lat")),lng=Number(q.get("lng"));
  const address=String(q.get("address")??"").trim().slice(0,50);
  if(!inKorea(lat,lng)&&address){const p=await locate(address);if(!p)throw new AppError("구장 주소로 위치를 찾지 못해 날씨를 볼 수 없어요.",404);lat=p.lat;lng=p.lng}
  return json(await gameWeather({lat,lng,start:String(q.get("at")??""),region:String(q.get("region")??"").slice(0,20)}));
 }catch(e){
  if(!(e instanceof AppError))console.error("TeamKick weather",e);
  return json({error:e instanceof AppError?e.message:"지금은 날씨를 불러올 수 없어요."},e instanceof AppError?e.status:503);
 }
}
