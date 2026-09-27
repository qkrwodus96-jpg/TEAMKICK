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

// 공공데이터 서버가 느릴 때 화면이 오래 멈추지 않게 제한 시간을 둔다.
async function getJson(url:string,ms=10000){
 let res:Response;const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),ms);
 try{res=await fetch(url,{signal:ctl.signal})}catch{throw new AppError(ctl.signal.aborted?"TIMEOUT":"지금은 날씨를 불러올 수 없어요.",503)}finally{clearTimeout(timer)}
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
  const page=async(n:number)=>{
   const q=new URLSearchParams({serviceKey:key(),pageNo:String(n),numOfRows:"1000",dataType:"JSON",base_date:base.date,base_time:base.time,nx:String(nx),ny:String(ny)});
   const body=await getJson(FORECAST+"?"+q.toString()).catch((e:unknown)=>{throw e instanceof AppError&&e.message==="TIMEOUT"?new AppError("날씨 서버가 늦게 응답해요. 잠시 뒤 다시 열어주세요.",503):e});
   const code=String(body?.response?.header?.resultCode??"");
   if(code!=="00"){console.error("TeamKick weather code",code);throw new AppError("지금은 날씨를 불러올 수 없어요.",503)}
   return {items:(body?.response?.body?.items?.item??[]) as KmaItem[],total:Number(body?.response?.body?.totalCount??0)};
  };
  // 첫 쪽에서 전체 개수를 보고, 남은 쪽(보통 1~2쪽)은 한꺼번에 받는다.
  const first=await page(1);const pages=Math.min(3,Math.ceil(first.total/1000));
  const rest=pages>1?await Promise.all(Array.from({length:pages-1},(_,i)=>page(i+2))):[];
  return [...first.items,...rest.flatMap(x=>x.items)];
 });
}
type AirItem={informCode?:string;informData?:string;informGrade?:string;dataTime?:string};
// 대기질 예보는 하루 4번(05·11·17·23시) 발표된다. 새벽에는 오늘 발표가 아직 없으니 어제 발표도 함께 본다.
async function airItems(code:"PM10"|"PM25",now:number){
 const [today,yesterday]=await Promise.all([airDay(code,ymdDash(now),now).catch(()=>[] as AirItem[]),airDay(code,ymdDash(now-24*3600e3),now)]);
 return [...today,...yesterday];
}
async function airDay(code:"PM10"|"PM25",date:string,now:number){
 return cached("a:"+code+":"+date,now,async()=>{
  const q=new URLSearchParams({serviceKey:key(),returnType:"json",numOfRows:"100",pageNo:"1",searchDate:date,InformCode:code});
  const body=await getJson(AIR+"?"+q.toString(),6000);
  const result=String(body?.response?.header?.resultCode??"00");
  if(result!=="00"){console.error("TeamKick air code",result);throw new AppError("AIR_"+result,503)}
  return (body?.response?.body?.items??[]) as AirItem[];
 });
}

export async function gameWeather(input:{lat:number;lng:number;start:string;region:string},now=Date.now()):Promise<GameWeather>{
 ensure(inKorea(input.lat,input.lng),"구장 위치를 확인할 수 없어요.",400);
 const start=Date.parse(input.start);ensure(Number.isFinite(start),"경기 시간을 확인할 수 없어요.",400);
 if(start<now-3*3600e3)return {status:"past"};
 ensure(weatherReady(),"날씨가 아직 준비 중이에요.",503);
 const {nx,ny}=toGrid(input.lat,input.lng);
 // 미세먼지는 날씨와 동시에 부르고, 늦거나 실패해도 날씨는 먼저 보여준다(그 이유는 airNote 로 알려준다).
 const region=airRegion(input.region,input.lng),day=ymdDash(start);
 const airJob=Promise.all([airItems("PM10",now),airItems("PM25",now)]).then(([pm10,pm25])=>{
  const a={pm10:pickAir(pm10,"PM10",day,region),pm25:pickAir(pm25,"PM25",day,region)};
  return a.pm10||a.pm25?{air:a,note:"" as const}:{air:null,note:"none" as const};
 }).catch((e:unknown)=>{const m=e instanceof AppError?e.message:"";if(!(e instanceof AppError))console.error("TeamKick air",e);
  return {air:null,note:(m==="TIMEOUT"?"timeout":/인증키/.test(m)?"key":"error") as "timeout"|"key"|"error"}});
 const forecast=pickForecast(await forecastItems(nx,ny,now),start);
 if(!forecast){airJob.catch(()=>{});return {status:"far"}}
 const {air,note}=await airJob;
 return {status:"ok",forecast,air,airNote:note};
}
