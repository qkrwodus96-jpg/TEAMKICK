// 축구 소식(B안): 네이버 뉴스 검색 API 응답을 화면에 쓸 모양으로 바꾼다.
// 제목·언론사·시간·원문 링크만 쓴다. 본문 요약(description)과 사진은 쓰지 않는다.
// 응답 예: {items:[{title:"<b>K리그1</b> ...",originallink:"https://...",link:"https://n.news.naver.com/...",description:"...",pubDate:"Sun, 27 Sep 2026 20:31:00 +0900"}]}
export type NewsItem={title:string;url:string;press:string;at:string};

// 소식 종류. 기본 두 개(해외·국내)는 모두에게 보이고, 팀은 이용자가 골라 더한다(최대 NEWS_TEAMS_MAX).
// query 는 네이버에 보내는 검색어다. 이용자 정보는 보내지 않는다.
// bg·fg 는 팀킥이 칩에 쓰는 팀 색이다(엠블럼은 쓰지 않는다 — 상표·저작물).
export type NewsTopic={id:string;name:string;query:string;group:string;bg:string;fg:string};
export const NEWS_BASE:NewsTopic[]=[
 {id:"world",name:"전체",query:"해외축구",group:"해외",bg:"#1f2a24",fg:"#fff"},
 {id:"epl",name:"EPL",query:"프리미어리그",group:"해외",bg:"#3d195b",fg:"#fff"},
 {id:"laliga",name:"라리가",query:"라리가",group:"해외",bg:"#ee4b2b",fg:"#fff"},
 {id:"bundes",name:"분데스리가",query:"분데스리가",group:"해외",bg:"#d20515",fg:"#fff"},
 {id:"ucl",name:"챔스",query:"챔피언스리그",group:"해외",bg:"#0b1f4b",fg:"#fff"},
 {id:"transfer",name:"이적시장",query:"축구 이적시장",group:"해외",bg:"#1f2a24",fg:"#fff"},
 {id:"korea",name:"전체",query:"K리그",group:"국내",bg:"#1f2a24",fg:"#fff"},
 {id:"k1",name:"K리그1",query:"K리그1",group:"국내",bg:"#12814d",fg:"#fff"},
 {id:"k2",name:"K리그2",query:"K리그2",group:"국내",bg:"#12814d",fg:"#fff"},
 {id:"nt",name:"대표팀",query:"축구 대표팀",group:"국내",bg:"#1f3b73",fg:"#fff"},
];
// 소식 화면 위쪽 구분. 제목·설명은 화면 머리에 쓴다.
export const NEWS_SECTIONS=[
 {id:"world",name:"해외",title:"해외축구 뉴스",sub:"세계 축구 소식을 한곳에서"},
 {id:"korea",name:"국내",title:"국내축구 뉴스",sub:"K리그와 대표팀 소식"},
 {id:"mine",name:"내 팀",title:"내 팀 뉴스",sub:"좋아하는 팀 소식만 모아서"},
] as const;
// 오늘의 키워드: 불러온 기사 제목에서 이 이름들이 몇 번 나왔는지 세서 많은 순으로 보여준다(추가 호출 없음).
export const NEWS_KEYWORDS=["홍명보","이적","부상","감독","결승","데뷔","복귀","재계약","EPL","K리그","대표팀","국대","아시안게임","월드컵","챔스","벨링엄","홀란","음바페","살라","케인","야말","메시","호날두"];
export function todayKeywords(titles:string[],limit=5){
 const names=[...new Set([...NEWS_TEAMS.map(t=>t.name),...NEWS_KEYWORDS])];
 return names.map(k=>({k,n:titles.filter(t=>t.includes(k)).length})).filter(x=>x.n>=2).sort((a,b)=>b.n-a.n||a.k.localeCompare(b.k,"ko")).slice(0,limit).map(x=>x.k);
}
// 제목에 나온 팀(있으면)을 찾는다 — 목록 왼쪽 타일 색에 쓴다. 긴 이름부터 본다(예: "레알 마드리드").
export function teamInTitle(title:string){return [...NEWS_TEAMS].sort((a,b)=>b.name.length-a.name.length).find(t=>t.id!=="kor"&&title.includes(t.name))}
const T=(group:string,list:[string,string,string,string,string?][]):NewsTopic[]=>list.map(([id,name,query,bg,fg])=>({id,name,query,group,bg,fg:fg??"#fff"}));
export const NEWS_TEAMS:NewsTopic[]=[
 ...T("해외 구단",[["mu","맨유","맨유","#DA291C"],["mci","맨시티","맨시티","#6CABDD","#0b2540"],["liv","리버풀","리버풀","#C8102E"],["ars","아스널","아스널","#EF0107"],["che","첼시","첼시","#034694"],["tot","토트넘","토트넘","#132257"],
  ["new","뉴캐슬","뉴캐슬","#241F20"],["avl","애스턴 빌라","애스턴 빌라","#670E36"],["whu","웨스트햄","웨스트햄","#7A263A"],["bha","브라이턴","브라이턴","#0057B8"],["wol","울버햄튼","울버햄튼","#FDB913","#1b1b1b"],["eve","에버턴","에버턴","#003399"],
  ["bar","바르셀로나","바르셀로나","#A50044"],["rma","레알 마드리드","레알 마드리드","#FEBE10","#1b1b1b"],["atm","아틀레티코","아틀레티코 마드리드","#CB3524"],
  ["fcb","바이에른","바이에른 뮌헨","#DC052D"],["bvb","도르트문트","도르트문트","#FDE100","#1b1b1b"],["b04","레버쿠젠","레버쿠젠","#E32221"],
  ["int","인터 밀란","인터 밀란","#0068A8"],["acm","AC 밀란","AC 밀란","#FB090B"],["juv","유벤투스","유벤투스","#1b1b1b"],["nap","나폴리","나폴리","#12A0D7"],
  ["psg","PSG","PSG","#004170"]]),
 ...T("국내 구단",[["jb","전북","전북 현대","#1B5E3B"],["ul","울산","울산 HD","#1D4E9E"],["ph","포항","포항 스틸러스","#C8102E"],["fcs","FC서울","FC서울","#B7131F"],["ic","인천","인천 유나이티드","#1C3F94"],
  ["dj","대전","대전하나시티즌","#6E2C8C"],["gw","강원","강원FC","#F26522"],["gj","광주","광주FC","#F7B500","#1b1b1b"],["jj","제주","제주 SK","#F47920"],["dg","대구","대구FC","#0B9ED9"],
  ["gc","김천","김천 상무","#C8102E"],["swf","수원FC","수원FC","#00308F"],["sw","수원 삼성","수원 삼성 블루윙즈","#1E4FA3"],["bc","부천","부천FC","#B01E23"],["ay","안양","FC안양","#512D6D"],
  ["bs","부산","부산 아이파크","#E4032E"],["jn","전남","전남 드래곤즈","#FDD100","#1b1b1b"],["sen","서울 이랜드","서울 이랜드","#0A1F44"],["sn","성남","성남FC","#1b1b1b"],["gn","경남","경남FC","#E10E1E"]]),
 ...T("대표팀 · 선수",[["kor","대표팀","축구 대표팀","#1f3b73"],["kwt","여자 대표팀","여자 축구 대표팀","#1f3b73"],["u23","U-23 대표팀","U-23 축구 대표팀","#1f3b73"],
  ["son","손흥민","손흥민","#2c3e50"],["lki","이강인","이강인","#2c3e50"],["kmj","김민재","김민재","#2c3e50"],["hhc","황희찬","황희찬","#2c3e50"],["hib","황인범","황인범","#2c3e50"],["ljs","이재성","이재성","#2c3e50"],
  ["ohk","오현규","오현규","#2c3e50"],["bjh","배준호","배준호","#2c3e50"],["ymh","양민혁","양민혁","#2c3e50"],["jgs","조규성","조규성","#2c3e50"],["chw","조현우","조현우","#2c3e50"]]),
];
export const NEWS_TEAMS_MAX=8;
// 목록에 없는 팀·선수는 이용자가 검색어를 직접 넣는다(id "q:검색어"). 글자·숫자·공백·점·가운뎃점·하이픈만, 2~15자.
export const CUSTOM_PREFIX="q:";
export function cleanCustom(v:unknown){const t=String(v??"").replace(/\s+/g," ").trim();return /^[가-힣A-Za-z0-9 .·\-]{2,15}$/.test(t)?t:""}
const customTopic=(id:string):NewsTopic|undefined=>{const t=cleanCustom(id.slice(CUSTOM_PREFIX.length));return t?{id:CUSTOM_PREFIX+t,name:t,query:t,group:"직접 추가",bg:"#4b5563",fg:"#fff"}:undefined};
export const newsTopic=(id:string)=>id.startsWith(CUSTOM_PREFIX)?customTopic(id):[...NEWS_BASE,...NEWS_TEAMS].find(x=>x.id===id);
// 저장할 팀 목록 정리: 목록에 있는 것만, 중복 없이, 최대 개수까지. 순서는 고른 순서.
export function cleanNewsTeams(v:unknown){
 const ids=Array.isArray(v)?v.map(String):[];const out:string[]=[];
 for(const raw of ids){const id=raw.startsWith(CUSTOM_PREFIX)?(customTopic(raw)?.id??""):raw;if(id&&(id.startsWith(CUSTOM_PREFIX)||NEWS_TEAMS.some(t=>t.id===id))&&!out.includes(id))out.push(id)}
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
// "대표팀", "리버풀", "나폴리"처럼 다른 종목·도시 기사가 섞이는 검색어가 있어 축구 기사만 남긴다.
const FOOTBALL=/축구|풋살|K리그|EPL|프리미어리그|라리가|분데스리가|세리에|리그1|챔피언스리그|챔스|유로파|월드컵|아시안컵|아시안게임|FIFA|UEFA|AFC|골키퍼|멀티골|결승골|동점골|선제골|득점|어시스트|해트트릭|페널티|이적|감독|킥오프|구단|FC|유나이티드|A매치|국가대표|국대|대표팀/;
const OTHER_SPORT=/야구|KBO|MLB|배구|V리그|농구|KBL|NBA|WKBL|핸드볼|하키|골프|LPGA|KLPGA|PGA|e스포츠|이스포츠|롤드컵|테니스|복싱|UFC|수영|육상|펜싱|양궁|탁구|배드민턴|피겨|쇼트트랙|씨름|당구|볼링/;
// 예능·가요 기사: "전현무 해외축구 직관" 같은 연예 기사가 '축구'라는 말 때문에 섞였다.
const ENTERTAIN=/예능|방송|출연|컴백|앨범|아이돌|걸그룹|보이그룹|드라마|배우|가수|뮤직|음원|콘서트|팬미팅|OST|시청률|MC|유튜버|웹툰|열애|결혼|화보|뮤지컬|팬덤|멤버|신곡|무대/;
// 축구 기사임이 분명한 말(연예 기사에도 '축구'는 나오므로 따로 본다).
const STRONG=/K리그|EPL|프리미어리그|라리가|분데스리가|세리에|챔피언스리그|챔스|유로파|월드컵|아시안컵|골키퍼|멀티골|결승골|동점골|선제골|득점|어시스트|해트트릭|페널티|이적|감독|킥오프|A매치|국가대표|대표팀|선발|교체|풀타임/;
export function isFootball(title:string,desc="",link=""){
 const text=title+" "+desc;
 if(/entertain\.naver\.com/.test(link))return false;
 if(OTHER_SPORT.test(title)&&!/축구|풋살/.test(title))return false;
 if(ENTERTAIN.test(title)&&!STRONG.test(title))return false;
 return FOOTBALL.test(text);
}
// 제목 위에 붙이는 작은 키워드 태그: 팀·선수·대회 이름이 제목에 나오면 나온 순서대로 최대 3개.
export const NEWS_TAGS=["대표팀","국대","아시안게임","아시안컵","월드컵","올림픽","챔스","유로파","이적시장",
 "벨링엄","홀란","음바페","살라","케인","비니시우스","야말","메시","호날두","네이마르","더브라위너","외데고르","사카","포든","로드리","레반도프스키","래시포드","브루노"];
// "홍명보호", "모레노호"처럼 감독 이름 + 호 는 대표팀을 부르는 말이다(선호·보호 같은 낱말과 두 글자 이름은 뺀다).
const HO_STOP=new Set(["선호","보호","기호","구호","애호","번호","신호","간호","옹호","수호","환호","국호","칭호","암호","부호","호호","양호","우호"]);
function nationalTeamWord(t:string){
 if(/국가대표|태극전사|A매치|대표팀/.test(t))return true;
 for(const m of t.matchAll(/(?:^|[\s'"‘“(\[])([가-힣]{2,4}호)(?=[\s,.…'"’”)!?\]]|$)/g))if(!HO_STOP.has(m[1])&&m[1].length>=3)return true;
 return false;
}
export function tagsFor(title:string,limit=3){
 const t=title.replace(/챔피언스리그/g,"챔스");
 const names=[...NEWS_TEAMS.filter(x=>x.id!=="kor").map(x=>x.name),...NEWS_TAGS];
 const hits=[...new Set(names)].map(n=>({n,i:t.indexOf(n)})).filter(x=>x.i>=0);
 // 긴 이름이 짧은 이름을 품으면(예: "레알 마드리드" ⊃ …) 짧은 쪽은 뺀다.
 const keep=hits.filter(a=>!hits.some(b=>b!==a&&b.n.length>a.n.length&&b.n.includes(a.n)));
 const out=keep.sort((a,b)=>a.i-b.i).map(x=>x.n);
 if(!out.includes("대표팀")&&nationalTeamWord(t))out.push("대표팀");
 return out.slice(0,limit);
}
export function parseNaverNews(body:unknown):NewsItem[]{
 const items=Array.isArray((body as {items?:unknown})?.items)?(body as {items:Record<string,unknown>[]}).items:[];
 const out:NewsItem[]=[];const seen=new Set<string>();
 for(const x of items){
  const url=[x.originallink,x.link].map(v=>String(v??"")).find(v=>/^https?:\/\//.test(v));const title=cleanTitle(String(x.title??""));const t=Date.parse(String(x.pubDate??""));
  if(!url||!title||!Number.isFinite(t)||seen.has(title))continue;
  // 축구 기사만: 요약(description)은 화면에 쓰지 않지만, 축구 기사인지 가려내는 데만 쓴다.
  if(!isFootball(title,cleanTitle(String(x.description??"")),String(x.link??"")))continue;
  seen.add(title);
  out.push({title,url,press:pressOf(url),at:new Date(t).toISOString()});
 }
 return out.sort((a,b)=>b.at.localeCompare(a.at));
}
export function agoText(at:string,now=Date.now()){
 const m=Math.max(0,Math.floor((now-Date.parse(at))/60000));
 if(m<1)return "방금";if(m<60)return m+"분 전";const h=Math.floor(m/60);if(h<24)return h+"시간 전";const d=Math.floor(h/24);if(d<7)return d+"일 전";
 const k=new Date(Date.parse(at)+9*3600e3);return (k.getUTCMonth()+1)+"월 "+k.getUTCDate()+"일";
}
