"use client";
// 축구 소식: 홈 맨 위 [우리 팀 | 축구 소식] 전환 → 해외·국내 + 좋아하는 팀 칩 → 카드형 기사 목록.
// 제목·언론사·시간만 보여주고 누르면 언론사 사이트(새 창)로 간다. 기사 사진·엠블럼은 쓰지 않는다.
import {useEffect,useState} from "react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {ExternalLink,Heart,Plus,RotateCw,Check,ChevronDown,Flame,Search,X} from "lucide-react";
import {NEWS_BASE,NEWS_TEAMS,NEWS_TEAMS_MAX,NEWS_SECTIONS,CUSTOM_PREFIX,cleanCustom,newsTopic,agoText,todayKeywords,teamInTitle,type NewsItem,type NewsTopic} from "@/lib/news";

type Feed={items:NewsItem[];at:string;stale?:boolean};
// 같은 화면 안에서 칩을 오가도 다시 부르지 않게 5분 동안 들고 있는다(서버는 30분 캐시).
const memo=new Map<string,{at:number;feed:Feed}>();
async function loadFeed(topic:string,force=false):Promise<Feed>{
 const hit=memo.get(topic);if(!force&&hit&&Date.now()-hit.at<5*60e3)return hit.feed;
 const res=await fetch("/api/news?topic="+encodeURIComponent(topic),{credentials:"same-origin"});
 const body=await res.json().catch(()=>({})) as Feed&{error?:string};
 if(!res.ok)throw Object.assign(new Error(body.error||"지금은 소식을 불러올 수 없어요."),{status:res.status});
 memo.set(topic,{at:Date.now(),feed:body});return body;
}
const SEEN="teamkick_news_seen";
const seenAt=()=>{try{return Number(localStorage.getItem(SEEN)??0)}catch{return 0}};
const markSeen=()=>{try{localStorage.setItem(SEEN,String(Date.now()))}catch{/* 저장 못 해도 화면은 그대로 */}};
const firstTopic=(teams:string[])=>teams[0]??"world";

// 홈 맨 위 전환 버튼. 좋아하는 팀(없으면 해외)에 마지막으로 본 뒤 새 기사가 있으면 빨간 점.
export function HomeSwitch({value,onChange,v,enabled}:{value:string;onChange:(x:string)=>void;v:Record<string,unknown>;enabled:boolean}){
 const [dot,setDot]=useState(false);const teams=(v.newsTeams??[]) as string[];const topic=firstTopic(teams);
 useEffect(()=>{if(!enabled)return;let live=true;loadFeed(topic).then(f=>{if(live)setDot(!!f.items[0]&&Date.parse(f.items[0].at)>seenAt())}).catch(()=>{});return()=>{live=false}},[enabled,topic]);
 return <div className="home-switch" role="tablist" aria-label="홈 화면">
  <button role="tab" aria-selected={value==="team"} className={value==="team"?"on":""} onClick={()=>onChange("team")}>우리 팀</button>
  <button role="tab" aria-selected={value==="news"} className={value==="news"?"on":""} onClick={()=>{setDot(false);markSeen();onChange("news")}}>축구 소식{dot&&value!=="news"&&<i className="hs-dot" aria-label="새 소식"/>}</button>
 </div>;
}

// 사진·그림 없이 글만. 제목에 팀 이름이 나오면 그 팀 이름표(팀 색 글자)를 앞에 붙인다.
function Row({x,t}:{x:NewsItem;t:NewsTopic}){const team=t.group!=="해외"&&t.group!=="국내"?t:teamInTitle(x.title);
 return <a className="nl-row" href={x.url} target="_blank" rel="noopener noreferrer"><span className="nl-text">{team&&<span className="nl-team" style={{color:team.bg==="#FEBE10"||team.bg==="#F7B500"?"#9a6a00":team.bg}}>{team.name}</span>}<strong className="nl-title">{x.title}</strong><span className="nl-meta">{x.press} · {agoText(x.at)}</span></span><ExternalLink className="nl-go" size={16}/></a>}
function Skeleton(){return <div className="nl-list" aria-busy="true">{[0,1,2,3,4].map(i=><div key={i} className="nl-row"><span className="nl-text"><span className="sk sk-line"/><span className="sk sk-line short"/><span className="sk sk-meta"/></span></div>)}</div>}

export function NewsScreen({v,demo,loggedIn,save}:{v:Record<string,unknown>;demo:boolean;loggedIn:boolean;save:(c:Record<string,unknown>)=>Promise<unknown>}){
 const teams=(v.newsTeams??[]) as string[];
 const [section,setSection]=useState<string>(teams.length?"mine":"world");
 const [topic,setTopic]=useState(teams.length?teams[0]:"world");
 const [word,setWord]=useState("");
 // 결과는 "어떤 칩·몇 번째 시도" 에 대한 것인지 함께 들고 있고, 지금 보는 칩과 다르면 불러오는 중으로 본다.
 const [nonce,setNonce]=useState(0);const key=topic+":"+nonce;
 const [res,setRes]=useState<{key:string;feed:Feed|null;error:string}>({key:"",feed:null,error:""});
 const [more,setMore]=useState({key:"",n:10});const shown=more.key===key+word?more.n:10;
 const [pick,setPick]=useState(false);
 const t=newsTopic(topic)??NEWS_BASE[0];
 const head=NEWS_SECTIONS.find(x=>x.id===section)??NEWS_SECTIONS[0];
 useEffect(()=>{if(!loggedIn||(section==="mine"&&!teams.length))return;let live=true;loadFeed(topic,nonce>0).then(f=>{if(live)setRes({key,feed:f,error:""})}).catch((e:Error)=>{if(live)setRes({key,feed:null,error:e.message})});return()=>{live=false}},[topic,nonce,loggedIn,key,section,teams.length]);
 const ready=res.key===key,feed=ready?res.feed:null,error=ready?res.error:"",loading=!ready;
 useEffect(()=>{markSeen()},[]);
 const chips:NewsTopic[]=section==="mine"?teams.map(id=>newsTopic(id)).filter(Boolean) as NewsTopic[]:NEWS_BASE.filter(x=>x.group===(section==="world"?"해외":"국내"));
 const words=feed?todayKeywords(feed.items.map(x=>x.title)):[];
 const list=feed?feed.items.filter(x=>!word||x.title.includes(word)):[];
 const go=(sec:string)=>{setSection(sec);setWord("");setTopic(sec==="mine"?(teams[0]??""):sec)};
 const choose=(id:string)=>{setTopic(id);setWord("")};
 return <section className="news-screen">
  <div className="nl-sections" role="tablist" aria-label="소식 구분">{NEWS_SECTIONS.map(x=><button key={x.id} role="tab" aria-selected={section===x.id} className={section===x.id?"on":""} onClick={()=>go(x.id)}>{x.name}</button>)}</div>
  <div className="nl-head"><div><h2>{section==="mine"&&t.group!=="해외"&&t.group!=="국내"?t.name+" 뉴스":head.title}</h2><p>{head.sub}</p></div>{section==="mine"&&<button className="text-link" onClick={()=>setPick(true)}><Heart/>팀 고르기</button>}</div>
  <div className="news-chips" role="tablist" aria-label="소식 종류">
   {chips.map(c=><button key={c.id} role="tab" aria-selected={topic===c.id} className={"chip-mini nl-chip"+(topic===c.id?" on":"")} onClick={()=>choose(c.id)}>{section==="mine"&&<i className="nb-dot" style={{background:c.bg}}/>}{c.name}</button>)}
   {section==="mine"&&<button className="chip-mini nc-add" onClick={()=>setPick(true)}><Plus size={14}/>팀 추가</button>}
  </div>
  {section==="mine"&&!teams.length?<div className="nc-state"><p>좋아하는 팀을 골라보세요.</p><span>맨유·토트넘·전북처럼 여러 팀을 고르면 그 팀 소식만 모아볼 수 있어요.</span><button className="btn btn-green" onClick={()=>setPick(true)}><Heart size={16}/>팀 고르기</button></div>
  :!loggedIn?<div className="nc-state"><p>로그인하면 축구 소식을 볼 수 있어요.</p><span>{demo?"샘플에서는 기사를 불러오지 않아요.":""}</span></div>
  :loading&&!feed?<Skeleton/>
  :error?<div className="nc-state error"><p>{error}</p><span>우리 팀 기능은 그대로 쓸 수 있어요.</span><button className="btn" onClick={()=>setNonce(n=>n+1)}><RotateCw size={16}/>다시 불러오기</button></div>
  :feed&&!feed.items.length?<div className="nc-state"><p>아직 새 소식이 없어요.</p></div>
  :feed?<>
   {feed.stale&&<p className="data-note" style={{marginTop:0}}>네이버가 응답하지 않아 {agoText(feed.at)} 모은 소식을 보여드려요.</p>}
   {!!words.length&&<div className="nl-words"><div className="nl-words-head"><Flame size={16}/><strong>오늘의 키워드</strong>{word&&<button className="text-link" onClick={()=>setWord("")}>전체 보기</button>}</div><div className="nl-word-chips">{words.map(w=><button key={w} aria-pressed={word===w} className={word===w?"on":""} onClick={()=>setWord(word===w?"":w)}>{w}</button>)}</div></div>}
   <div className="nl-list">{list.slice(0,shown).map(x=><Row key={x.url} x={x} t={t}/>)}</div>
   {list.length>shown&&<button className="btn nc-more" onClick={()=>setMore({key:key+word,n:shown+10})}><ChevronDown size={16}/>더 보기</button>}
  </>:null}
  <p className="data-note">출처: 네이버 뉴스 검색 · 제목·언론사·시간만 보여주고, 누르면 언론사 사이트에서 열려요. 기사 내용과 사진은 팀킥에 저장하지 않아요.</p>
  {pick&&<TeamPicker initial={teams} onClose={()=>setPick(false)} onSave={async(next)=>{await save({type:"setNewsTeams",teams:next});setPick(false);const added=next.find(x=>!teams.includes(x));if(added){setSection("mine");setTopic(added);setWord("")}else if(section==="mine"&&!next.includes(topic))setTopic(next[0]??"")}}/>}
 </section>;
}

function TeamPicker({initial,onClose,onSave}:{initial:string[];onClose:()=>void;onSave:(teams:string[])=>Promise<void>}){
 const [sel,setSel]=useState<string[]>(initial);const [busy,setBusy]=useState(false);const [err,setErr]=useState("");
 const [q,setQ]=useState("");const [open,setOpen]=useState<string[]>([]);
 const groups=[...new Set(NEWS_TEAMS.map(t=>t.group))];
 const toggle=(id:string)=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):s.length<NEWS_TEAMS_MAX?[...s,id]:s);
 const term=q.trim();const hits=term?NEWS_TEAMS.filter(t=>t.name.includes(term)||t.query.includes(term)):[];
 const custom=cleanCustom(term);const customId=CUSTOM_PREFIX+custom;
 const canAdd=!!custom&&!NEWS_TEAMS.some(t=>t.name===custom)&&!sel.includes(customId);
 const tile=(t:NewsTopic)=>{const on=sel.includes(t.id);return <button key={t.id} type="button" aria-pressed={on} className={"nb-team"+(on?" on":"")} onClick={()=>toggle(t.id)}><span className="nb-badge" style={{background:t.bg,color:t.fg,fontSize:t.name.length>=4?10:12}}>{t.name.length>4?t.name.slice(0,2):t.name}</span><span>{t.name}</span>{on&&<Check className="nb-check" size={16}/>}</button>};
 const picked=sel.map(id=>newsTopic(id)).filter(Boolean) as NewsTopic[];
 return <Dialog open onOpenChange={o=>!o&&onClose()}><DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>좋아하는 팀 고르기</DialogTitle><DialogDescription>팀·선수를 여러 개 고를 수 있어요(최대 {NEWS_TEAMS_MAX}개). 목록에 없으면 검색해서 직접 추가하세요.</DialogDescription></DialogHeader>
  <div className="gap-grid">
   {!!picked.length&&<div className="nb-picked">{picked.map(t=><button key={t.id} type="button" className="nb-pick" onClick={()=>toggle(t.id)} aria-label={t.name+" 빼기"}><i className="nb-dot" style={{background:t.bg}}/>{t.name}<X size={14}/></button>)}</div>}
   <label className="nb-search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="팀·선수 이름 검색 (예: 울버햄튼, 황인범)" maxLength={15}/></label>
   {term?<div className="news-group">
    {!!hits.length&&<div className="nb-grid">{hits.map(tile)}</div>}
    {canAdd&&<button type="button" className="btn nb-custom" disabled={sel.length>=NEWS_TEAMS_MAX} onClick={()=>{setSel(s=>[...s,customId]);setQ("")}}><Plus size={16}/>“{custom}” 직접 추가</button>}
    {!hits.length&&!canAdd&&<p className="small muted">{custom?"이미 골랐어요.":"2~15자, 한글·영문·숫자로 입력해주세요."}</p>}
    {canAdd&&<p className="small muted">직접 추가한 이름은 그 이름이 들어간 기사를 모아요. 같은 이름의 다른 사람 기사가 섞일 수 있어요.</p>}
   </div>
   :groups.map(g=>{const list=NEWS_TEAMS.filter(t=>t.group===g),more=open.includes(g),shown=more?list:list.slice(0,9);
    return <div key={g} className="news-group"><p className="small muted">{g}</p><div className="nb-grid">{shown.map(tile)}</div>{list.length>9&&<button type="button" className="text-link nb-more" onClick={()=>setOpen(o=>more?o.filter(x=>x!==g):[...o,g])}>{more?"접기":"더 보기 ("+(list.length-9)+")"}</button>}</div>})}
   <p className="small muted">{sel.length}/{NEWS_TEAMS_MAX}개 골랐어요{sel.length>=NEWS_TEAMS_MAX?" — 더 고르려면 하나를 빼주세요.":"."}</p>
   {err&&<p className="error-bar" style={{margin:0}}>{err}</p>}
   <button className="btn btn-green" disabled={busy} onClick={async()=>{setBusy(true);setErr("");try{await onSave(sel)}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}}>저장</button>
  </div>
 </DialogContent></Dialog>;
}
