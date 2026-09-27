// 축구 소식(B안): 네이버 뉴스 검색 API 응답을 화면에 쓸 모양으로 바꾼다.
// 제목·언론사·시간·원문 링크만 쓴다. 본문 요약(description)과 사진은 쓰지 않는다.
// 응답 예: {items:[{title:"<b>K리그1</b> ...",originallink:"https://...",link:"https://n.news.naver.com/...",description:"...",pubDate:"Sun, 27 Sep 2026 20:31:00 +0900"}]}
export type NewsItem={title:string;url:string;press:string;at:string};

// 기사 주소(도메인) → 언론사 이름. 네이버 API는 언론사 이름을 따로 주지 않는다.
// 목록에 없으면 도메인을 그대로 보여준다(추측해서 이름을 붙이지 않는다).
export const PRESS:Record<string,string>={
 "sports.khan.co.kr":"스포츠경향","sports.chosun.com":"스포츠조선","sports.donga.com":"스포츠동아","www.sportsseoul.com":"스포츠서울",
 "isplus.com":"일간스포츠","www.xportsnews.com":"엑스포츠뉴스","www.osen.co.kr":"OSEN","www.starnewskorea.com":"스타뉴스",
 "www.yna.co.kr":"연합뉴스","www.newsis.com":"뉴시스","www.news1.kr":"뉴스1","www.mk.co.kr":"매일경제","www.hankyung.com":"한국경제",
 "www.interfootball.co.kr":"인터풋볼","www.footballist.co.kr":"풋볼리스트","www.besteleven.com":"베스트일레븐","www.sportalkorea.com":"스포탈코리아","n.news.naver.com":"네이버 뉴스",
};
const ENTITIES:Record<string,string>={"&quot;":"\"","&amp;":"&","&lt;":"<","&gt;":">","&apos;":"'","&#39;":"'","&nbsp;":" "};
export function cleanTitle(raw:string){
 // 태그를 먼저 지우고 기호를 되돌린다(되돌린 "<" 가 다시 지워지지 않게). 화면에는 글자로만 넣는다.
 return String(raw??"").replace(/<[^>]*>/g,"").replace(/&(quot|amp|lt|gt|apos|nbsp|#39);/g,m=>ENTITIES[m]??m).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\s+/g," ").trim();
}
export function pressOf(url:string){
 try{const h=new URL(url).hostname;return PRESS[h]??PRESS[h.replace(/^www\./,"")]??PRESS["www."+h]??h.replace(/^www\./,"")}catch{return ""}
}
// 원문(언론사) 주소를 우선 쓰고, 없으면 네이버 뉴스 주소. http(s) 가 아니면 버린다.
export function parseNaverNews(body:unknown):NewsItem[]{
 const items=Array.isArray((body as {items?:unknown})?.items)?(body as {items:Record<string,unknown>[]}).items:[];
 const out:NewsItem[]=[];const seen=new Set<string>();
 for(const x of items){
  const url=[x.originallink,x.link].map(v=>String(v??"")).find(v=>/^https?:\/\//.test(v));const title=cleanTitle(String(x.title??""));const t=Date.parse(String(x.pubDate??""));
  if(!url||!title||!Number.isFinite(t)||seen.has(title))continue;seen.add(title);
  out.push({title,url,press:pressOf(url),at:new Date(t).toISOString()});
 }
 return out.sort((a,b)=>b.at.localeCompare(a.at));
}
export function agoText(at:string,now=Date.now()){
 const m=Math.max(0,Math.floor((now-Date.parse(at))/60000));
 if(m<1)return "방금";if(m<60)return m+"분 전";const h=Math.floor(m/60);if(h<24)return h+"시간 전";const d=Math.floor(h/24);if(d<7)return d+"일 전";
 const k=new Date(Date.parse(at)+9*3600e3);return (k.getUTCMonth()+1)+"월 "+k.getUTCDate()+"일";
}
