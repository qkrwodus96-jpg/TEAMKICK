import {env} from "cloudflare:workers";
import {AppError,ensure,iso} from "./model";
import {parseNaverNews,newsTopic,type NewsItem} from "./news";

// 축구 소식: 네이버 뉴스 검색을 서버에서 대신 부른다(키를 브라우저로 보내지 않는다).
// 네이버에는 검색어(팀·리그 이름)만 보낸다. 이용자 정보는 보내지 않는다.
// 2026-07-31 부터 네이버 개발자센터에서는 검색 API 를 새로 신청할 수 없고, 네이버 클라우드
// 플랫폼의 NAVER API HUB 로 옮겨졌다. 주소·헤더 이름이 다르고 응답 모양(items: title·originallink·
// link·pubDate)은 같다. HUB 키가 있으면 HUB 를, 없으면 예전 개발자센터 키(그 전에 신청한 앱만 됨)를 쓴다.
const HUB="https://naverapihub.apigw.ntruss.com/search/v1/news";
const LEGACY="https://openapi.naver.com/v1/search/news.json";
const setting=(name:string)=>(env as unknown as Record<string,string|undefined>)[name]??"";
function source():{url:string;headers:Record<string,string>}|null{
 if(setting("NAVER_API_HUB_KEY_ID")&&setting("NAVER_API_HUB_KEY"))return {url:HUB,headers:{"X-NCP-APIGW-API-KEY-ID":setting("NAVER_API_HUB_KEY_ID"),"X-NCP-APIGW-API-KEY":setting("NAVER_API_HUB_KEY")}};
 if(setting("NAVER_CLIENT_ID")&&setting("NAVER_CLIENT_SECRET"))return {url:LEGACY,headers:{"X-Naver-Client-Id":setting("NAVER_CLIENT_ID"),"X-Naver-Client-Secret":setting("NAVER_CLIENT_SECRET")}};
 return null;
}
export const newsReady=()=>!!source();
export const newsSource=()=>{const x=source();return x?.url===HUB?"hub":x?"developers":"none"};

// 검색어마다 30분 동안 결과를 들고 있는다. 사람이 늘어도 네이버 호출은 검색어 수만큼만 늘어난다.
// 서버 인스턴스마다 따로 들고 있으므로 "최대 30분에 한 번"이 아니라 "대체로"다. 무료 한도(하루 호출 수)는 넉넉하다.
export const NEWS_TTL=30*60e3;
const cache=new Map<string,{at:number;items:NewsItem[]}>();

export async function fetchNews(topicId:string,now=Date.now()){
 const topic=newsTopic(topicId);
 ensure(topic,"없는 소식 종류예요.",400);
 const hit=cache.get(topic!.id);
 if(hit&&now-hit.at<NEWS_TTL)return {items:hit.items,at:iso(hit.at),stale:false};
 const src=source();
 ensure(src,"축구 소식이 아직 준비 중이에요.",503);
 let res:Response;
 try{res=await fetch(src!.url+"?"+new URLSearchParams({query:topic!.query,display:"30",sort:"date"}).toString(),{headers:src!.headers})}
 catch{res=new Response(null,{status:599})}
 if(!res.ok){
  console.error("TeamKick news",res.status);
  // 방금 전 결과가 있으면 그것이라도 보여준다(오래된 것임을 알린다).
  if(hit)return {items:hit.items,at:iso(hit.at),stale:true};
  // 원인을 화면에서 바로 알 수 있게 응답 코드와 어느 쪽(HUB/개발자센터)으로 불렀는지 붙인다(키 값은 넣지 않는다).
  const where=src!.url===HUB?"HUB":"개발자센터";const code=res.status===599?"연결 실패":String(res.status);
  throw new AppError(res.status===401||res.status===403
   ?"축구 소식 설정을 확인해야 해요. (네이버 "+where+" 응답 "+code+" — 키 이름·값 확인)"
   :"지금은 소식을 불러올 수 없어요. (네이버 "+where+" 응답 "+code+")",503);
 }
 const items=parseNaverNews(await res.json()).slice(0,30);
 if(cache.size>300)cache.delete(cache.keys().next().value!);cache.set(topic!.id,{at:now,items});
 return {items,at:iso(now),stale:false};
}
export const clearNewsCache=()=>cache.clear();
