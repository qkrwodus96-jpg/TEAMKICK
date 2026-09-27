// 축구 소식(B안): 네이버 뉴스 검색 API 응답을 화면에 쓸 모양으로 바꾼다.
// 제목·언론사·시간·원문 링크만 쓴다. 본문 요약(description)과 사진은 쓰지 않는다.
// 응답 예: {items:[{title:"<b>K리그1</b> ...",originallink:"https://...",link:"https://n.news.naver.com/...",description:"...",pubDate:"Sun, 27 Sep 2026 20:31:00 +0900"}]}
export type NewsItem={title:string;url:string;press:string;at:string};

// 소식 종류. 기본 두 개(해외·국내)는 모두에게 보이고, 팀은 이용자가 골라 더한다(최대 NEWS_TEAMS_MAX).
// query 는 네이버에 보내는 검색어다. 이용자 정보는 보내지 않는다.
// bg·fg 는 팀킥이 칩에 쓰는 팀 색이다(엠블럼은 쓰지 않는다 — 상표·저작물).
export type NewsTopic={id:string;name:string;query:string;group:string;bg:string;fg:string};
export const NEWS_BASE:NewsTopic[]=[
 {id:"world",name:"해외",query:"해외축구",group:"기본",bg:"#1f2a24",fg:"#fff"},
 {id:"korea",name:"국내",query:"K리그",group:"기본",bg:"#1f2a24",fg:"#fff"},
];
export const NEWS_TEAMS:NewsTopic[]=[
 {id:"mu",name:"맨유",query:"맨유",group:"해외 구단",bg:"#DA291C",fg:"#fff"},
 {id:"mci",name:"맨시티",query:"맨시티",group:"해외 구단",bg:"#6CABDD",fg:"#0b2540"},
 {id:"liv",name:"리버풀",query:"리버풀",group:"해외 구단",bg:"#C8102E",fg:"#fff"},
 {id:"ars",name:"아스널",query:"아스널",group:"해외 구단",bg:"#EF0107",fg:"#fff"},
 {id:"che",name:"첼시",query:"첼시",group:"해외 구단",bg:"#034694",fg:"#fff"},
 {id:"tot",name:"토트넘",query:"토트넘",group:"해외 구단",bg:"#132257",fg:"#fff"},
 {id:"bar",name:"바르셀로나",query:"바르셀로나",group:"해외 구단",bg:"#A50044",fg:"#fff"},
 {id:"rma",name:"레알 마드리드",query:"레알 마드리드",group:"해외 구단",bg:"#FEBE10",fg:"#1b1b1b"},
 {id:"fcb",name:"바이에른",query:"바이에른 뮌헨",group:"해외 구단",bg:"#DC052D",fg:"#fff"},
 {id:"psg",name:"PSG",query:"PSG",group:"해외 구단",bg:"#004170",fg:"#fff"},
 {id:"jb",name:"전북",query:"전북 현대",group:"국내 구단",bg:"#1B5E3B",fg:"#fff"},
 {id:"ul",name:"울산",query:"울산 HD",group:"국내 구단",bg:"#1D4E9E",fg:"#fff"},
 {id:"ph",name:"포항",query:"포항 스틸러스",group:"국내 구단",bg:"#C8102E",fg:"#fff"},
 {id:"fcs",name:"FC서울",query:"FC서울",group:"국내 구단",bg:"#B7131F",fg:"#fff"},
 {id:"ic",name:"인천",query:"인천 유나이티드",group:"국내 구단",bg:"#1C3F94",fg:"#fff"},
 {id:"sw",name:"수원 삼성",query:"수원 삼성 블루윙즈",group:"국내 구단",bg:"#1E4FA3",fg:"#fff"},
 {id:"dj",name:"대전",query:"대전하나시티즌",group:"국내 구단",bg:"#6E2C8C",fg:"#fff"},
 {id:"gw",name:"강원",query:"강원FC",group:"국내 구단",bg:"#F26522",fg:"#fff"},
 {id:"gj",name:"광주",query:"광주FC",group:"국내 구단",bg:"#F7B500",fg:"#1b1b1b"},
 {id:"kor",name:"대표팀",query:"축구 대표팀",group:"대표팀 · 선수",bg:"#1f3b73",fg:"#fff"},
 {id:"son",name:"손흥민",query:"손흥민",group:"대표팀 · 선수",bg:"#2c3e50",fg:"#fff"},
 {id:"lki",name:"이강인",query:"이강인",group:"대표팀 · 선수",bg:"#2c3e50",fg:"#fff"},
 {id:"kmj",name:"김민재",query:"김민재",group:"대표팀 · 선수",bg:"#2c3e50",fg:"#fff"},
];
export const NEWS_TEAMS_MAX=5;
export const newsTopic=(id:string)=>[...NEWS_BASE,...NEWS_TEAMS].find(x=>x.id===id);
// 저장할 팀 목록 정리: 목록에 있는 것만, 중복 없이, 최대 개수까지. 순서는 고른 순서.
export function cleanNewsTeams(v:unknown){
 const ids=Array.isArray(v)?v.map(String):[];const out:string[]=[];
 for(const id of ids)if(NEWS_TEAMS.some(t=>t.id===id)&&!out.includes(id))out.push(id);
 return out;
}

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
