import {env} from "cloudflare:workers";
import {AppError,ensure,iso} from "./model";
import {parseNaverNews,newsTopic,type NewsItem} from "./news";

// 축구 소식: 네이버 뉴스 검색 API를 서버에서 대신 부른다(키를 브라우저로 보내지 않는다).
// 네이버 로그인과 같은 앱의 키를 쓴다 — 개발자센터에서 그 앱에 '검색' API를 추가해야 한다.
// 네이버에는 검색어(팀·리그 이름)만 보낸다. 이용자 정보는 보내지 않는다.
const ENDPOINT="https://openapi.naver.com/v1/search/news.json";
const setting=(name:string)=>(env as unknown as Record<string,string|undefined>)[name]??"";
export const newsReady=()=>!!setting("NAVER_CLIENT_ID")&&!!setting("NAVER_CLIENT_SECRET");

// 검색어마다 30분 동안 결과를 들고 있는다. 사람이 늘어도 네이버 호출은 검색어 수만큼만 늘어난다.
// 서버 인스턴스마다 따로 들고 있으므로 "최대 30분에 한 번"이 아니라 "대체로"다. 무료 한도(하루 호출 수)는 넉넉하다.
export const NEWS_TTL=30*60e3;
const cache=new Map<string,{at:number;items:NewsItem[]}>();

export async function fetchNews(topicId:string,now=Date.now()){
 const topic=newsTopic(topicId);
 ensure(topic,"없는 소식 종류예요.",400);
 const hit=cache.get(topic!.id);
 if(hit&&now-hit.at<NEWS_TTL)return {items:hit.items,at:iso(hit.at),stale:false};
 ensure(newsReady(),"축구 소식이 아직 준비 중이에요.",503);
 let res:Response;
 try{res=await fetch(ENDPOINT+"?"+new URLSearchParams({query:topic!.query,display:"30",sort:"date"}).toString(),{headers:{"X-Naver-Client-Id":setting("NAVER_CLIENT_ID"),"X-Naver-Client-Secret":setting("NAVER_CLIENT_SECRET")}})}
 catch{res=new Response(null,{status:599})}
 if(!res.ok){
  console.error("TeamKick news",res.status);
  // 방금 전 결과가 있으면 그것이라도 보여준다(오래된 것임을 알린다).
  if(hit)return {items:hit.items,at:iso(hit.at),stale:true};
  throw new AppError(res.status===401||res.status===403
   ?"축구 소식 설정을 확인해야 해요. (네이버 검색 API 권한)"
   :"지금은 소식을 불러올 수 없어요. 잠시 뒤 다시 시도해주세요.",503);
 }
 const items=parseNaverNews(await res.json()).slice(0,30);
 cache.set(topic!.id,{at:now,items});
 return {items,at:iso(now),stale:false};
}
export const clearNewsCache=()=>cache.clear();
