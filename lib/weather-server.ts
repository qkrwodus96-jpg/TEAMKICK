import {env} from "cloudflare:workers";
import {AppError,ensure} from "./model";
import {toGrid,baseFor,pickForecast,pickAir,airRegion,ymdDash,inKorea,type GameWeather} from "./weather";

// 공공데이터포털 키 하나로 기상청 단기예보와 에어코리아 대기질 예보를 부른다.
// 키는 브라우저로 보내지 않는다. 포털이 주는 "일반 인증키"를 그대로 넣으면 되고,
// 인코딩된 키(%2B 같은 글자가 든 것)를 넣어도 한 번 풀어서 쓴다.
const FORECAST="https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const AIR="https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth";
const rawKey=()=>String((env as unknown as Record<string,string|undefined>).DATA_GO_KR_KEY??"").trim();
const key=()=>{const k=rawKey();if(!k.includes("%"))return k;try{return decodeURIComponent(k)}catch{return k}};
export const weatherReady=()=>!!rawKey();

// 같은 격자·같은 발표는 다시 부르지 않는다(발표는 3시간마다). 대기질 예보는 1시간.
const cache=new Map<string,{at:number;value:unknown}>();
const TTL=60*60e3;
async function cached<T>(k:string,now:number,load:()=>Promise<T>):Promise<T>{
 const hit=cache.get(k);if(hit&&now-hit.at<TTL)return hit.value as T;
 const value=await load();cache.set(k,{at:now,value});if(cache.size>500)cache.delete(cache.keys().next().value!);return value;
}
export const clearWeatherCache=()=>cache.clear();

async function getJson(url:string){
 let res:Response;try{res=await fetch(url)}catch{throw new AppError("지금은 날씨를 불러올 수 없어요.",503)}
 const text=await res.text();
 // 키가 틀리거나 아직 승인 전이면 JSON 을 달라고 해도 XML 오류가 온다.
 if(!res.ok||!text.trim().startsWith("{")){
  console.error("TeamKick weather",res.status,/SERVICE_KEY|NOT_REGISTERED/i.test(text)?"key":"other");
  throw new AppError(/SERVICE_KEY|NOT_REGISTERED/i.test(text)?"날씨 설정을 확인해야 해요. (공공데이터포털 인증키)":"지금은 날씨를 불러올 수 없어요.",503);
 }
 return JSON.parse(text);
}

type KmaItem={category?:string;fcstDate?:string;fcstTime?:string;fcstValue?:string};
async function forecastItems(nx:number,ny:number,now:number){
 const base=baseFor(now);
 return cached("f:"+nx+","+ny+":"+base.date+base.time,now,async()=>{
  const out:KmaItem[]=[];
  for(let page=1;page<=3;page++){
   const q=new URLSearchParams({serviceKey:key(),pageNo:String(page),numOfRows:"1000",dataType:"JSON",base_date:base.date,base_time:base.time,nx:String(nx),ny:String(ny)});
   const body=await getJson(FORECAST+"?"+q.toString());
   const code=String(body?.response?.header?.resultCode??"");
   if(code!=="00"){console.error("TeamKick weather code",code);throw new AppError("지금은 날씨를 불러올 수 없어요.",503)}
   const items=(body?.response?.body?.items?.item??[]) as KmaItem[];out.push(...items);
   if(out.length>=Number(body?.response?.body?.totalCount??0)||!items.length)break;
  }
  return out;
 });
}
type AirItem={informCode?:string;informData?:string;informGrade?:string};
async function airItems(code:"PM10"|"PM25",now:number){
 const date=ymdDash(now);
 return cached("a:"+code+":"+date,now,async()=>{
  const q=new URLSearchParams({serviceKey:key(),returnType:"json",numOfRows:"100",pageNo:"1",searchDate:date,InformCode:code});
  const body=await getJson(AIR+"?"+q.toString());
  return (body?.response?.body?.items??[]) as AirItem[];
 });
}

export async function gameWeather(input:{lat:number;lng:number;start:string;region:string},now=Date.now()):Promise<GameWeather>{
 ensure(inKorea(input.lat,input.lng),"구장 위치를 확인할 수 없어요.",400);
 const start=Date.parse(input.start);ensure(Number.isFinite(start),"경기 시간을 확인할 수 없어요.",400);
 if(start<now-3*3600e3)return {status:"past"};
 ensure(weatherReady(),"날씨가 아직 준비 중이에요.",503);
 const {nx,ny}=toGrid(input.lat,input.lng);
 const forecast=pickForecast(await forecastItems(nx,ny,now),start);
 if(!forecast)return {status:"far"};
 // 미세먼지는 곁들이는 정보라 실패해도 날씨는 보여준다. 예보는 오늘~모레까지만 있다.
 let air:GameWeather["air"]=null;
 try{const region=airRegion(input.region,input.lng),day=ymdDash(start);
  const [pm10,pm25]=await Promise.all([airItems("PM10",now),airItems("PM25",now)]);
  const a={pm10:pickAir(pm10,"PM10",day,region),pm25:pickAir(pm25,"PM25",day,region)};
  if(a.pm10||a.pm25)air=a;
 }catch(e){if(!(e instanceof AppError))console.error("TeamKick air",e)}
 return {status:"ok",forecast,air};
}
