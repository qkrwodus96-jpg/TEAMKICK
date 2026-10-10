"use client";
import {AppSetup} from "./setup";
import {Medal} from "./medal";
import {kakaoRoute} from "@/lib/maps";
import {whenText,rangeText} from "@/lib/when";
import {KeepSubscription} from "./notify";
import {BrandMark} from "./splash";
import {HomeSwitch,NewsScreen} from "./news";
import {WeatherLine} from "./weather";
import {useState,useEffect,useMemo,useCallback,useRef} from "react";
import {Home,CalendarDays,Handshake,ChartNoAxesCombined,Users,Bell,ChevronRight,ChevronLeft,Plus,MapPin,Clock,ArrowUpRight,CheckCircle2,XCircle,HelpCircle,ShieldCheck,Settings,LogOut,Goal,Flag,ClipboardCheck,TrendingUp,Pin,ArrowLeft,LoaderCircle,Search,Cake,Share2} from "lucide-react";
import {Sidebar,SidebarProvider,SidebarContent,SidebarMenu,SidebarMenuItem,SidebarMenuButton} from "@/components/ui/sidebar";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "@/components/ui/select";
import {Toaster} from "@/components/ui/sonner";
import {toast} from "sonner";
import {demoState} from "@/lib/demo";
import {applyCommand,visibleState,summaries,currentVote,isIntra,SQUAD_NAMES,collections,type Row,type State} from "@/lib/model";
import {AuthPanel,SocialConsent,Management,Matching,AppDialogs,MyHub} from "./screens";
import {MvpPrompt,Rankings} from "./team-play";
import {RecordsTable} from "./player-sheet";
import {WelcomeGuide} from "./welcome";
export const days=["일","월","화","수","목","금","토"];
export const koreanDate=(iso:string)=>new Date(iso).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul",month:"long",day:"numeric",weekday:"short"});
export const time=(iso:string)=>new Date(iso).toLocaleTimeString("ko-KR",{timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit",hour12:false});
// 한국 기준으로 그 시각이 며칠째인지 센 값. 날짜 차이를 구할 때 쓴다.
// 시간 차이로 세면 오늘 오전에 오늘 저녁 경기를 봐도 하루가 남은 것으로 나온다.
export const seoulDay=(ms:number)=>Math.floor((ms+9*3600e3)/864e5);
export const localDay=(iso:string)=>new Date(new Date(iso).getTime()+9*3600e3).toISOString().slice(0,10);
export const inputTime=(iso:string)=>new Date(new Date(iso).getTime()+9*3600e3).toISOString().slice(0,16);
export const fromInput=(v:string)=>new Date(v+"+09:00").toISOString();
export function Picker({value,onChange,options,placeholder="선택"}:any){return <Select value={value} onValueChange={(x:string)=>{if(x!=="")onChange(x)}}><SelectTrigger className="min-w-[100px] bg-white"><SelectValue placeholder={placeholder}/></SelectTrigger><SelectContent>{options.map((x:any)=><SelectItem value={typeof x==="string"?x:x.value} key={typeof x==="string"?x:x.value}>{typeof x==="string"?x:x.label}</SelectItem>)}</SelectContent></Select>}
export const imageUrl=(key:string)=>"/api/image?key="+encodeURIComponent(key);
// 1.22 사진을 못 불러오면(지워졌거나 네트워크 오류) 깨진 그림 대신 이름 두 글자를 보여준다.
export function PlayerPhoto({name="",photo="",className="player-avatar"}:{name?:string;photo?:string;className?:string}){
 const [bad,setBad]=useState("");
 return photo&&bad!==photo?<img className={className+" as-photo"} src={imageUrl(photo)} alt={name} loading="lazy" onError={()=>setBad(photo)}/>:<span className={className}>{name.slice(-2)}</span>;
}
// 1.23 엠블럼 여백 자르기(사장님 요청 — 원 안에 네모 흰 바탕이 보임). 흰색·투명 테두리를 잘라
// 엠블럼이 원을 꽉 채우게 한다. 브라우저 안에서만 하고(원본은 그대로), 같은 그림은 한 번만 계산한다.
const trimmed=new Map<string,string>();
function useTrimmed(src:string){
 const [,bump]=useState(0);
 useEffect(()=>{
  if(!src||trimmed.has(src))return;
  let live=true;const img=new Image();
  img.onload=()=>{
   let res=src;
   try{
    const W=img.naturalWidth,H=img.naturalHeight,k=Math.min(1,160/Math.max(W,H)),w=Math.max(1,Math.round(W*k)),h=Math.max(1,Math.round(H*k));
    const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d",{willReadFrequently:true})!;x.drawImage(img,0,0,w,h);
    const d=x.getImageData(0,0,w,h).data;let l=w,r=-1,tp=h,b=-1;
    for(let y=0;y<h;y++)for(let i=0;i<w;i++){const p=(y*w+i)*4;if(d[p+3]>24&&!(d[p]>236&&d[p+1]>236&&d[p+2]>236)){if(i<l)l=i;if(i>r)r=i;if(y<tp)tp=y;if(y>b)b=y}}
    if(r>=l&&b>=tp){
     const bw=(r-l+1)/k,bh=(b-tp+1)/k;
     if(bw<W*.92||bh<H*.92){
      const side=Math.max(bw,bh)*1.02,cx=(l+r+1)/2/k,cy=(tp+b+1)/2/k,o=document.createElement("canvas");o.width=o.height=256;
      o.getContext("2d")!.drawImage(img,cx-side/2,cy-side/2,side,side,0,0,256,256);res=o.toDataURL("image/png");
     }
    }
   }catch{}
   trimmed.set(src,res);if(live)bump(x=>x+1);
  };
  img.onerror=()=>{trimmed.set(src,src)};img.src=src;
  return()=>{live=false};
 },[src]);
 return trimmed.get(src)??src;
}
function CrestImg({logo,name,onBad}:{logo:string;name:string;onBad:()=>void}){const src=useTrimmed(imageUrl(logo));return <img className="crest-photo" src={src} alt={name+" 로고"} loading="lazy" onError={onBad}/>}
export function Crest({name="",color="",logo=""}:any){const [bad,setBad]=useState("");if(logo&&bad!==logo)return <div className={"club-crest "+color}><CrestImg logo={logo} name={name} onBad={()=>setBad(logo)}/></div>;return <div className={"club-crest "+color}><span>{name.includes("한강")?"HG":name.includes("서울")?"SU":name.replace(/\s|FC|유나이티드/g,"").slice(0,2)||"?"}</span></div>}
export function Empty({title,description,action,onClick}:any){return <div className="empty"><CalendarDays/><h3>{title}</h3><p>{description}</p>{action&&<button className="btn btn-green" onClick={onClick}>{action}</button>}</div>}
// 등번호는 "이명재 5번" 처럼 적는다(예전엔 "이명재 #0"). 가입할 때 번호를 안 고르면 0 으로
// 남는데, 0번은 실제로 거의 안 쓰는 번호라 "안 정함" 으로 본다 — 그때는 번호를 빼고 이름만.
export const backNo=(n:unknown)=>{const x=Number(n);return Number.isInteger(x)&&x>0?x+"번":""};
export const backNoOr=(n:unknown)=>backNo(n)||"등번호 미정";
// 팀 공지 목록. 고정 공지를 먼저, 그다음 최근 것부터 3개만 보이고 나머지는 펼쳐 본다.
// 공지가 쌓이면 MY 화면이 공지로 가득 차서 아래 메뉴가 밀려났다(사장님 요청).
// 1.19: 영입 공지는 "HERE WE GO!" 만(예전에 "HERE WE GO! 누구 합류" 로 올라간 것도 같게 보인다).
export const noticeTitle=(n:Row)=>n.kind==="transfer"?"HERE WE GO!":String(n.title??"");
export function NoticeList({notices,onOpen,birthdays=[],dateText=(iso:string)=>localDay(iso).replaceAll("-",".")}:{notices:Row[];onOpen:(n:Row)=>void;birthdays?:string[];dateText?:(iso:string)=>string}){
 const [open,setOpen]=useState(false);
 const all=[...notices].sort((a:Row,b:Row)=>Number(!!b.pinned)-Number(!!a.pinned)||String(b.at).localeCompare(String(a.at)));
 const shown=open?all:all.slice(0,3);
 // 1.18: 오늘 생일인 팀원이 있으면 공지 맨 위에 축하 카드(팀원 프로필에 생일을 적은 사람만).
 const cake=birthdays.length?<div className="notice bday"><Cake size={18}/><p>오늘은 <b>{birthdays.join(", ")}</b>님의 생일이에요. 축하해 주세요!</p></div>:null;
 if(!all.length)return cake??<p className="small muted">등록된 공지가 없어요.</p>;
 return <>{cake}{shown.map((n:Row)=><div className="notice" key={n.id} tabIndex={0} role="button" onClick={()=>onOpen(n)} onKeyDown={e=>e.key==="Enter"&&onOpen(n)}><p>{n.pinned&&<Pin className="pin"/>}{noticeTitle(n)}</p><span>{dateText(n.at)}</span></div>)}
  {all.length>3&&<button type="button" className="text-link notice-more" onClick={()=>setOpen(x=>!x)} aria-expanded={open}>{open?"접기":"이전 공지 더 보기 ("+(all.length-3)+"개)"}</button>}</>;
}
export function opponent(v:any,g:Row){if(isIntra(g))return "자체전";return v.teams.find((t:Row)=>t.id===(g.home===v.teamId?g.away:g.home))?.name??g.external??""}
// 자체전 점수 "3 : 2" 또는 "3 : 2 : 1". 상대 경기는 우리 팀 점수가 앞.
export function scoreText(v:Row,g:Row){const r=g.result;if(r?.status!=="confirmed")return "";if(isIntra(g))return (r.squads??[]).join(" : ");return (g.home===v.teamId?r.a:r.b)+" : "+(g.home===v.teamId?r.b:r.a)}
// 자체전은 "우리 팀 vs 1팀·2팀"이 아니라 "우리 팀 자체전"을 가운데 두고 그 아래 "1팀 vs 2팀"으로 보여준다.
export function IntraVersus({team,g}:{team?:Row;g:Row}){const names=SQUAD_NAMES.slice(0,g.squads??2),sc=g.result?.status==="confirmed"?(g.result.squads??[]) as number[]:null;const squad=(x:string,i:number,score=true)=><div key={x} className={"intra-squad squad-"+i}><i>{x.slice(0,1)}</i><b>{x}</b>{score&&sc&&<em>{sc[i]??0}</em>}</div>;return <div className="intra-vs"><div className="intra-head"><Crest name={team?.name} logo={team?.logo}/><strong>{team?.name}</strong><span className="intra-tag">자체전</span></div>{names.length===2?<div className="intra-two">{squad(names[0],0,false)}<div className={"intra-score"+(sc?"":" vs")}>{sc?(sc[0]??0)+" : "+(sc[1]??0):"VS"}</div>{squad(names[1],1,false)}</div>:<div className="intra-squads">{names.map((x:string,i:number)=>squad(x,i))}</div>}</div>}
export const ended=(g?:Row)=>!!g&&Date.parse(g.end)<=Date.now();
export const started=(g?:Row)=>!!g&&Date.parse(g.start)<=Date.now();
export const gameOver=(g?:Row)=>!!g&&(g.status!=="scheduled"||ended(g));
export function GuestBadge({z,g}:{z?:Row;g?:Row}){const st=z?.guestStatus??"none";
 if(st==="none"||gameOver(g))return null;
 return <span className={"badge "+(st==="open"?"badge-orange":"badge-red")}>{st==="open"?"용병 모집 중":"용병 마감"}</span>}
export function GameBadge({g}:any){
 const over=g.status==="scheduled"&&ended(g);
 const text=g.status==="cancelled"?"취소":g.status==="completed"?"경기 종료"
  :over?"경기 종료 · 기록 전":isIntra(g)?"자체전":g.away?"매칭 확정":g.listing==="open"?"상대팀 모집":"경기 예정";
 return <span className={"badge "+(g.status==="cancelled"?"badge-red":g.status==="completed"||over?"":"badge-green")}>{text}</span>}
export function Calendar({month,setMonth,selected,onSelect,games,large=false}:any){
 const [y,m]=month.split("-").map(Number),start=new Date(Date.UTC(y,m-1,1)),n=new Date(Date.UTC(y,m,0)).getUTCDate(),offset=start.getUTCDay();
 function shift(by:number){const d=new Date(Date.UTC(y,m-1+by,1));setMonth(d.toISOString().slice(0,7))}
 return <section className={"panel "+(large?"match-calendar":"")}><div className="calendar-head"><strong>{y}년 {m}월</strong><div className="calendar-nav"><button aria-label="이전 달" onClick={()=>shift(-1)}><ChevronLeft/></button><button aria-label="다음 달" onClick={()=>shift(1)}><ChevronRight/></button></div></div><div className="calendar-grid">{days.map((d,i)=><span className="weekday" key={d} style={i===0?{color:"#c69494"}:{}}>{d}</span>)}{Array.from({length:Math.ceil((n+offset)/7)*7},(_,i)=>{const num=i-offset+1,d=new Date(Date.UTC(y,m-1,num)),key=d.toISOString().slice(0,10),has=games.some((g:Row)=>localDay(g.start)===key&&g.status!=="cancelled");return <button aria-label={key+(has?" 경기 있음":"")} key={key} onClick={()=>onSelect(key)} className={(num<1||num>n?"other ":"")+(i%7===0?"weekend ":"")+(selected===key?"selected ":"")+(has?"has-match":"")}>{d.getUTCDate()}</button>})}</div><div className="calendar-legend">● 경기 일정　<span className="muted">날짜를 눌러 확인하세요</span></div></section>
}
export function Fixture({g,v,onClick}:any){const z=v.sides?.find((x:Row)=>x.gameId===g.id);return <div role="button" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&onClick()} className="fixture-row" onClick={onClick}><div className="fixture-date"><b>{new Date(new Date(g.start).getTime()+9*3600e3).getUTCDate()}</b><span>{days[new Date(new Date(g.start).getTime()+9*3600e3).getUTCDay()]}요일</span></div><div className="fixture-info"><strong>{isIntra(g)?<>{v.teams.find((t:Row)=>t.id===v.teamId)?.name} <span className="muted" style={{fontWeight:400}}>자체전</span></>:<>{v.teams.find((t:Row)=>t.id===v.teamId)?.name} <span className="muted" style={{fontWeight:400}}>vs</span> {opponent(v,g)||"상대팀 미정"}</>}</strong><p>{rangeText(g.start,g.end)}</p><p className="keep-line">{g.venue}</p></div>{g.result?.status==="confirmed"&&<span className="mini-result">{scoreText(v,g)}</span>}<GameBadge g={g}/><GuestBadge z={z} g={g}/><ChevronRight/></div>}
// 저장 응답의 껍데기. 화면 상태가 아니므로 남기지 않는다.
const SAVE_META=new Set(["ok","output","closed","error","pushed"]);
// 1.24 누르면 바로 보이기(사장님 — "버벅거린다"). 자주 누르는 단순한 동작은 서버 답을 기다리지 않고
// 같은 규칙(applyCommand)으로 화면에 먼저 반영한다. 서버 답이 오면 그 값으로 바꾸고, 실패하면 되돌린다.
// 다른 사람에게 가는 알림·새 행을 만드는 동작은 넣지 않는다(잠깐이라도 틀린 화면이 보이지 않게).
const OPTIMISTIC=new Set(["vote","mvpVote","readNotifications","setNotifyPrefs","markDues","reportDues","hideChat","setRankPublic","setProfilePublic","setNewsTeams"]);
function optimistic(real:Row|null,c:Row){
 if(!OPTIMISTIC.has(c?.type)||!real?.user?.id)return null;
 // 1.25.1 투표는 가장 자주 누르는 버튼이라 규칙 전체를 돌리지 않고 내 응답만 바로 바꾼다(운영 데이터에서 1~2초 걸린다는 확인).
 // 마감·권한 확인은 서버가 한다. 서버가 거절하면 원래대로 돌아간다.
 if(c.type==="vote"){const me=(real.members??[]).find((m:Row)=>m.userId===real.user.id&&m.teamId===c.teamId&&m.status==="active");if(!me)return null;
  const sides=(real.sides??[]).map((s:Row)=>s.gameId===c.gameId&&s.teamId===c.teamId?{...s,votes:{...(s.votes??{}),[me.id]:[...(s.votes?.[me.id]??[]),{value:c.value,at:new Date().toISOString()}]}}:s);
  return {...real,sides}}
 if(c.type==="readNotifications")return {...real,notifications:(real.notifications??[]).map((n:Row)=>!c.teamId||!n.teamId||n.teamId===c.teamId?{...n,read:true}:n)};
 try{const o:Row=structuredClone(real);for(const k of collections)if(!Array.isArray(o[k]))o[k]=[];
  applyCommand(o as unknown as State,{id:real.user.id,name:real.user.name??"팀원"},c);
  o.notifications=(o.notifications??[]).filter((n:Row)=>n.userId===real.user.id);
  const next:Row={...real};for(const k of Object.keys(real))if(k in o&&k!=="user")next[k]=o[k];return next}
 catch(e){console.warn("TeamKick optimistic skipped",c.type,e instanceof Error?e.message:e);return null}
}
// 고른 팀을 기기에 적어 둔다. 예전에는 화면을 새로 열 때마다 서버가 "가장 먼저
// 가입한 팀" 으로 되돌려서, 팀이 여러 개면 고른 팀이 자꾸 바뀌었다. 권한은 여기서
// 정하지 않는다 — 서버가 이 값을 받아 내가 속한 팀인지 다시 확인한다.
const TEAM_KEY="teamkick_team";
const storedTeam=()=>{try{return localStorage.getItem(TEAM_KEY)??""}catch{return ""}};
const rememberTeam=(t:string)=>{try{if(t)localStorage.setItem(TEAM_KEY,t)}catch{}};
// 초대 링크로 들어와 로그인(특히 카카오·구글·네이버처럼 다른 사이트를 거치는 로그인)을 하면 주소의
// ?invite= 가 사라진다. 7일 동안 이 기기에 들고 있다가 로그인 뒤에 가입 신청 창을 띄운다.
const INVITE_KEY="teamkick_invite";
const pendingInvite=()=>{const url=new URLSearchParams(window.location.search).get("invite");if(url){try{localStorage.setItem(INVITE_KEY,JSON.stringify({token:url,at:Date.now()}))}catch{}return url}
 try{const x=JSON.parse(localStorage.getItem(INVITE_KEY)??"null");if(x?.token&&Date.now()-Number(x.at)<7*864e5)return String(x.token)}catch{}return ""};
const clearInvite=()=>{try{localStorage.removeItem(INVITE_KEY)}catch{}};
const nav=[{id:"home",label:"홈",icon:Home},{id:"schedule",label:"일정",icon:CalendarDays},{id:"matching",label:"매칭",icon:Handshake},{id:"records",label:"기록",icon:ChartNoAxesCombined},{id:"team",label:"MY",icon:Users}];
export default function TeamKick({resetToken="",verifyToken="",kakaoNote="",socialSignup=""}:{resetToken?:string;verifyToken?:string;kakaoNote?:string;socialSignup?:string}){
 const [pendingSignup,setPendingSignup]=useState(socialSignup);
 const [samples,setSamples]=useState(demoState),[demo,setDemo]=useState(!resetToken&&!verifyToken&&!kakaoNote&&!socialSignup),[demoActor,setDemoActor]=useState("demo-a"),[demoTeam,setDemoTeam]=useState("team-a");
 const [verifyNote,setVerifyNote]=useState(kakaoNote);
 const [activeReset,setActiveReset]=useState(resetToken);
 const [real,setReal]=useState<any>(null),[view,setActualView]=useState("home"),[modal,setModal]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 // 홈 카드에서 화살표로 몇 칸 옮겨 봤는지. 기준은 늘 "다음 경기"다.
 // 다른 화면에 갔다 홈으로 돌아오면 기준으로 되돌아간다(사장님 요청).
 const [step,setStep]=useState(0);
 const setView=useCallback((name:string)=>{setStep(0);setActualView(name)},[]);
 const today=localDay(new Date().toISOString()),[month,setMonth]=useState(today.slice(0,7)),[selected,setSelected]=useState(today),[scheduleMode,setScheduleMode]=useState("calendar"),[dateFilter,setDateFilter]=useState(false);
 const toolState=useRef<any>(null);
 const [period,setPeriod]=useState("month"),[recordTab,setRecordTab]=useState("players"),[rank,setRank]=useState("goals"),[fromCustom,setFromCustom]=useState(today.slice(0,7)+"-01"),[toCustom,setToCustom]=useState(today);
 // 1.20: 기간은 드롭다운 대신 한눈에 보이는 탭(이번 달·올해·전체·기간 선택). 기록 맨 위와 선수 기록 표 위에 같은 것을 둔다.
 const periodTabs=<div className="period-tabs"><div className="seg" role="tablist" aria-label="기록 기간">{[["month","이번 달"],["year","올해"],["all","전체"],["custom","기간 선택"]].map(([k,l])=><button key={k} type="button" role="tab" aria-selected={period===k} className={period===k?"on":""} onClick={()=>setPeriod(k)}>{l}</button>)}</div>{period==="custom"&&<div className="period-range"><input aria-label="시작일" type="date" value={fromCustom} onChange={e=>setFromCustom(e.target.value)}/><span>~</span><input aria-label="종료일" type="date" value={toCustom} onChange={e=>setToCustom(e.target.value)}/></div>}</div>;
 const v=demo?{...visibleState(samples,demoActor,demoTeam),user:{id:demoActor,name:"샘플 주장"}}:{teams:[],members:[],mine:[],games:[],sides:[],notices:[],notifications:[],requests:[],listings:[],ownTeams:[],invites:[],...real};
 const team=v.teams?.find((t:Row)=>t.id===v.teamId),manager=["captain","manager"].includes(v.role),captain=v.role==="captain";
 async function refresh(teamId?:string){const params=new URLSearchParams();if(teamId)params.set("team",teamId);const invite=pendingInvite();if(invite)params.set("invite",invite);const r=await fetch("/api/app?"+params,{cache:"no-store"});const data:any=await r.json();if(!r.ok)throw Error(data.error);setReal(data);rememberTeam(String(data.teamId??""));return data}
 useEffect(()=>{refresh(storedTeam()||undefined).then(r=>{
 // 로그인 안 한 사람에게 샘플 팀을 먼저 보여주지 않고 로그인·가입 화면을 보여준다(샘플은 버튼으로). 2026-09-26 사장님 요청.
 setDemo(false);if(r.user)clearInvite();if(r.invitedTeam&&!r.mine?.some((m:Row)=>m.teamId===r.invitedTeam&&["active","pending"].includes(m.status)))setModal({kind:"joinTeam",team:r.teams.find((t:Row)=>t.id===r.invitedTeam)})}).catch(e=>setError(e.message)).finally(()=>setLoading(false));if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});},[]);
 // 1.19 실시간 반영: 화면이 보이는 동안 15초마다 저장 번호만 물어보고, 바뀌었으면 조용히 다시 읽는다.
 // 다른 팀원이 투표하거나 주장이 일정을 바꾸면 새로고침 없이 반영된다. 앱으로 돌아왔을 때도 바로 확인한다.
 const loggedIn=!!real?.user,viewTeamRef=useRef(""),revRef=useRef<number|null>(null),scopesRef=useRef<string[]>([]),tokenRef=useRef<string|null>(null),changedRef=useRef(0);
 useEffect(()=>{viewTeamRef.current=String(real?.teamId??"");if(typeof real?.rev==="number")revRef.current=real.rev;if(Array.isArray(real?.scopes))scopesRef.current=real.scopes;if(typeof real?.scopeToken==="string"&&real.scopeToken)tokenRef.current=real.scopeToken},[real]);
 useEffect(()=>{if(!loggedIn||demo)return;let live=true,running=false;
  // 1.24: 내 범위(내 팀·나·공개)의 번호만 묻는다 — 다른 팀이 아무리 많이 저장해도 내 화면은 다시 읽지 않는다.
  // 최근 2분 안에 바뀐 게 있으면 4초, 조용하면 10초마다. 화면이 안 보이면 묻지 않는다.
  const check=async()=>{if(running||document.visibilityState!=="visible")return;running=true;
   try{const scopes=scopesRef.current;
    if(scopes.length){const r=await fetch("/api/rev?s="+encodeURIComponent(scopes.join(",")),{cache:"no-store"});if(!r.ok)return;const {token}=await r.json() as {token:string};
     if(live&&tokenRef.current!==null&&token!==tokenRef.current){tokenRef.current=token;changedRef.current=Date.now();await refresh(viewTeamRef.current||undefined)}else if(tokenRef.current===null)tokenRef.current=token;
    }else{const r=await fetch("/api/rev",{cache:"no-store"});if(!r.ok)return;const {rev}=await r.json() as {rev:number};
     if(live&&revRef.current!==null&&rev!==revRef.current){revRef.current=rev;changedRef.current=Date.now();await refresh(viewTeamRef.current||undefined)}else if(revRef.current===null)revRef.current=rev;}
   }catch{}finally{running=false}};
  let timer:ReturnType<typeof setTimeout>;const loop=()=>{timer=setTimeout(async()=>{await check();if(live)loop()},Date.now()-changedRef.current<120000?4000:10000)};loop();
  const vis=()=>{if(document.visibilityState==="visible")check()};
  document.addEventListener("visibilitychange",vis);window.addEventListener("focus",vis);
  return()=>{live=false;clearTimeout(timer);document.removeEventListener("visibilitychange",vis);window.removeEventListener("focus",vis)};
 },[loggedIn,demo]);
 // 1.21 안 읽은 채팅 수(사장님 요청 — "채팅 온지 모를 수도"). 채팅은 저장 번호(rev)와 따로 저장돼서
 // 화면이 열려 있는 동안 20초마다, 그리고 화면으로 돌아오거나 채팅 창을 닫을 때 방 목록을 다시 센다.
 const [chatUnread,setChatUnread]=useState(0);
 const chatOpen=modal?.kind==="chat";
 useEffect(()=>{if(!loggedIn||demo)return;let live=true,running=false;
  const count=async()=>{if(running||document.visibilityState!=="visible")return;running=true;
   try{const r=await fetch("/api/chat",{cache:"no-store"});if(!r.ok)return;const {rooms}=await r.json() as {rooms:{unread?:number}[]};
    if(live)setChatUnread((rooms??[]).reduce((a,x)=>a+Number(x.unread??0),0));}catch{}finally{running=false}};
  count();const timer=setInterval(count,20000);const vis=()=>{if(document.visibilityState==="visible")count()};
  document.addEventListener("visibilitychange",vis);window.addEventListener("focus",vis);
  return()=>{live=false;clearInterval(timer);document.removeEventListener("visibilitychange",vis);window.removeEventListener("focus",vis)};
 },[loggedIn,demo,chatOpen]);
 // 잠금화면 알림을 누르고 들어오면 주소에 갈 화면이 실려 있다(`?to=`). 서비스 워커는
 // 이미 열려 있는 창에는 메시지로 알려 준다. 둘 다 받아 탭을 옮긴다.
 const VIEWS=["home","schedule","matching","records","team","admin"];
 useEffect(()=>{
  const go=(name?:string|null)=>{if(name?.startsWith("chat:")){setActualView("team");setModal({kind:"chat",room:name.slice(5)});return}if(name?.startsWith("modal:")){setActualView("team");setModal({kind:name.slice(6)});return}if(name&&VIEWS.includes(name))setActualView(name)};
  // 1.25 다른 팀 소식이면 그 팀으로 바꾼 뒤 연다.
  const teamOf=(q:URLSearchParams)=>{const tm=q.get("team");if(tm&&tm!==viewTeamRef.current)refresh(tm).catch(()=>{})};
  teamOf(new URLSearchParams(window.location.search));
  go(new URLSearchParams(window.location.search).get("to"));
  if(window.location.search.includes("to="))window.history.replaceState(null,"","/");
  const onMessage=(e:MessageEvent)=>{
   const data=e.data as {type?:string;url?:string}|undefined;
   if(data?.type!=="teamkick-open"||!data.url)return;
   try{const q=new URL(data.url,window.location.origin).searchParams;teamOf(q);go(q.get("to"))}catch{}
  };
  navigator.serviceWorker?.addEventListener?.("message",onMessage);
  return()=>navigator.serviceWorker?.removeEventListener?.("message",onMessage);
 },[]);
 // 카카오 로그인이 실패하면 그 이유가 주소에 실려 돌아온다. 보여주고 주소는 정리한다.
 useEffect(()=>{if(kakaoNote||socialSignup)window.history.replaceState(null,"","/")},[kakaoNote,socialSignup]);
 // 메일의 확인 링크로 들어온 경우. 링크는 한 번만 쓰이므로 주소에서 바로 지운다.
 useEffect(()=>{if(!verifyToken)return;
  fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"verify",token:verifyToken})})
   .then(async r=>{const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw Error(d.error||"확인하지 못했어요.");setVerifyNote("이메일을 확인했어요. 이제 팀을 만들거나 가입을 신청할 수 있어요.");await refresh().catch(()=>{})})
   .catch(e=>setVerifyNote(e instanceof Error?e.message:"확인하지 못했어요."))
   .finally(()=>window.history.replaceState(null,"","/"));
 },[verifyToken]);
 async function resendVerify(){
  try{
   const r=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"resendVerify"})});
   const d=await r.json().catch(()=>({})) as {error?:string;sent?:boolean};if(!r.ok)throw Error(d.error||"보내지 못했어요.");
   toast[d.sent?"success":"info"](d.sent?"확인 메일을 다시 보냈어요.":"조금 전에 보낸 메일을 먼저 확인해주세요.");
  }catch(e){toast.error(e instanceof Error?e.message:"보내지 못했어요.")}
 }
 // 저장 응답에는 이미 새 화면 상태가 들어 있다. 그대로 쓰면 왕복이 한 번 줄어든다.
 // 다만 응답에 없는 값(로그인한 사람, 외부 연동 준비 여부 등)은 저장으로 바뀌지
 // 않으므로 지금 값을 남겨둔다. 통째로 갈아끼우면 로그인 표시가 사라진다.
 const applySaved=useCallback((data:Record<string,unknown>)=>{
  const next:Record<string,unknown>={};
  for(const key of Object.keys(data))if(!SAVE_META.has(key))next[key]=data[key];
  if(Object.keys(next).length)setReal((prev:Record<string,unknown>)=>({...prev,...next}));
 },[]);
 // 계정·운영자 상태는 저장 응답에 담기지 않는다. 이때만 다시 읽어온다.
 const needsReload=(type:string)=>type==="setupOwner"||type==="closeAccount";
 async function action(c:any){if(busy)return;setBusy(true);setError("");try{
   let output:any;if(demo){const copy=structuredClone(samples);output=applyCommand(copy,{id:demoActor,name:"샘플 주장"},c);setSamples(copy);toast.success("샘플에 반영했어요.");}
   else{const undo=real,early=optimistic(real,c);if(early)setReal(early);
    const r=await fetch("/api/app",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...c,viewTeam:v.teamId||"",mutationId:crypto.randomUUID()})}).catch(e=>{if(early)setReal(undo);throw e});const data:any=await r.json().catch(()=>({}));if(!r.ok){if(early)setReal(undo);throw Error(data.error||"저장하지 못했어요. 다시 시도해주세요.")}output=data.output;
    if(needsReload(c.type))await refresh(c.teamId||v.teamId);else applySaved(data);
    // 알림이 걸린 저장이면 몇 명에게 갔는지, 그중 폰으로도 간 사람이 몇 명인지 알려 준다.
    // 폰 알림을 켠 팀원이 없으면 알림함에만 쌓인다 — 주장이 그걸 알아야 팀원에게 권할 수 있다.
    const pu=data.pushed as {people?:number;withDevice?:number;sent?:number;failed?:number;reason?:string}|undefined;
    // 푸시 서버가 실제로 받은 통수까지 보여준다(폰 도착은 받는 사람의 MY → 기기 알림 기록에서).
    // 1.9.5 의 "그중 N명은 폰 알림도" 는 실제로는 안 갔는데도 간 것처럼 읽혔다.
    // 발송 숫자는 운영자에게만 보여준다(1.17, 사장님 요청 — 시험용 정보라 팀원·주장에게는 "저장했어요"만).
    if(pu?.people&&v.isOwner)(pu.failed?toast.warning:toast.success)("저장했어요 · 팀원 "+pu.people+"명 알림함에 전달"+
     ((pu.withDevice??-1)>=0?" · 폰 알림 켠 팀원 "+pu.withDevice+"명":"")+
     (pu.sent||pu.failed?" · 푸시 발송 성공 "+(pu.sent??0)+"통"+(pu.failed?" / 실패 "+pu.failed+"통 ("+(pu.reason??"")+")":""):""));
    // 1.19: 매번 뜨던 "저장했어요" 는 뺐다(사장님 요청 — 투표·저장마다 떠서 거슬림). 화면이 바뀌는 것으로 충분하다.
   }
   return output??{};
 }catch(e:any){toast.error(e.message);throw e}finally{setBusy(false)}}
 function run(c:any){action(c).catch(()=>{})}
 const [homeTab,setHomeTab]=useState("team");
 toolState.current={v,setModal,setView};
 // 매칭 탭의 빨간 숫자: 우리 팀 모집글에 온 대기 중 신청 수(주장에게만 서버가 보낸다).
 const inbox=(v.requests??[]).filter((r:Row)=>r.status==="pending"&&v.games?.some((g:Row)=>g.id===r.gameId&&g.home===v.teamId)).length;
 useEffect(()=>{const mc=(document as any).modelContext;if(!mc?.registerTool)return;const lifecycle=new AbortController();const tools=[{name:"read_team_schedule",description:"Read the currently selected team and its visible match schedule.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>{const x=toolState.current.v;return {teamId:x.teamId,games:x.games.map((g:Row)=>({id:g.id,start:g.start,venue:g.venue,status:g.status}))}}},{name:"open_match_details",description:"Open a match already visible in the selected team. Does not edit or create a match.",inputSchema:{type:"object",properties:{gameId:{type:"string"}},required:["gameId"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async(input:any)=>{const x=toolState.current;if(typeof input?.gameId!=="string"||!x.v.games.some((g:Row)=>g.id===input.gameId))throw Error("경기를 찾을 수 없어요.");x.setModal({kind:"game",id:input.gameId});await new Promise(resolve=>requestAnimationFrame(resolve));return {opened:input.gameId}}}];for(const tool of tools){try{Promise.resolve(mc.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}return()=>lifecycle.abort()},[]);
 function toActual(){setDemo(false);setView("team");setModal(null);}
 function switchTeam(t:string){if(demo){setDemoTeam(t);setDemoActor(t==="team-b"?"demo-b":"demo-a")}else refresh(t).catch(e=>setError(e.message));setModal(null)}
 const games=[...(v.games??[])].sort((a:Row,b:Row)=>a.start.localeCompare(b.start)),upcoming=games.filter((g:Row)=>g.status==="scheduled"&&Date.parse(g.end)>Date.now()),next=upcoming[0];
 // 홈에서 앞뒤로 넘겨 볼 수 있는 경기들. 취소된 경기는 뺀다.
 const reel=games.filter((g:Row)=>g.status!=="cancelled");
 const baseIndex=(()=>{const i=reel.findIndex((g:Row)=>g.id===next?.id);return i>=0?i:reel.length-1})();
 const shownIndex=Math.min(Math.max(baseIndex+step,0),Math.max(reel.length-1,0));
 const shown=reel[shownIndex];
 const scope=useMemo(()=>{const y=today.slice(0,4);if(period==="all")return ["1970-01-01","2100-01-01"];if(period==="custom"){const start=fromCustom||today,end=toCustom||today;return [isoDay(start),new Date(Date.parse(isoDay(end))+864e5).toISOString()]};const start=period==="year"?y+"-01-01":today.slice(0,7)+"-01";const date=new Date(start+"T00:00:00+09:00");const end=period==="year"?Number(y)+1+"-01-01T00:00:00+09:00":new Date(Date.UTC(Number(y),Number(today.slice(5,7)),1)-9*3600e3).toISOString();return [date.toISOString(),new Date(end).toISOString()]},[period,fromCustom,toCustom,today]);
 const stats=summaries({...v,games:v.games??[],members:v.members??[],sides:v.sides??[]},scope[0],scope[1]);
 const monthStats=summaries({...v,games:v.games??[],members:v.members??[],sides:v.sides??[]},isoDay(today.slice(0,7)+"-01"),new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),1)-9*3600e3).toISOString());
 const [jumpTab,setJumpTab]=useState("");
 const common={v,team,demo,busy,action,run,setModal,setView,toActual,manager,captain,setJumpTab,chatUnread};
 const goDate=(day:string)=>{setSelected(day);setMonth(day.slice(0,7));setDateFilter(true);setView("schedule")};
 // 빨간 점만으로는 몇 건인지, 무슨 일인지 알 수 없었다. 개수와 가장 최근 소식을 함께 보여준다.
 // 1.25 팀별 알림 보기(사장님 요청): 지금 고른 팀 알림과 팀 없는 개인 알림만 이 팀 화면에 보인다.
 // 받기는 모든 팀 알림을 그대로 받는다(폰 알림도). 다른 팀의 안 읽은 알림은 숫자로만 알려 주고 누르면 그 팀으로 간다.
 const inTeam=(n:Row)=>!n.teamId||n.teamId===v.teamId;
 const myTeamIds=new Set((v.mine??[]).filter((m:Row)=>m.status==="active").map((m:Row)=>m.teamId));
 const otherUnread=Object.entries((v.notifications??[]).filter((n:Row)=>!n.read&&n.teamId&&n.teamId!==v.teamId&&myTeamIds.has(n.teamId)).reduce((o:Record<string,number>,n:Row)=>{o[n.teamId]=(o[n.teamId]??0)+1;return o},{})).map(([teamId,count])=>({teamId,count:Number(count),name:String(v.teams?.find((x:Row)=>x.id===teamId)?.name??"다른 팀")}));
 const otherTotal=otherUnread.reduce((x,y)=>x+y.count,0);
 // v-1250 사장님 요청: 위쪽 숫자만으로는 어느 팀 알림인지 몰라서 팀 고르기 목록의 팀 이름 옆에도 숫자를 붙인다.
 const teamPickerBase=<Picker value={v.teamId||"none"} onChange={switchTeam} options={(demo?v.teams.filter((t:Row)=>["team-a","team-b"].includes(t.id)):v.teams.filter((t:Row)=>v.mine?.some((m:Row)=>m.teamId===t.id&&m.status==="active"))).map((t:Row)=>{const c=otherUnread.find(x=>x.teamId===t.id)?.count??0;return {value:t.id,label:c?<span className="opt-with-alert">{t.name}<i className="opt-alert" aria-label={"새 알림 "+c+"개"}>{c>99?"99+":c}</i></span>:t.name}}).concat(v.teamId?[]:[{value:"none",label:"소속 팀 없음"}])}/>;
 const teamPicker=<span className="team-picker-wrap">{teamPickerBase}{otherTotal>0&&<span className="team-alert" title="다른 팀 새 알림" aria-label={"다른 팀 새 알림 "+otherTotal+"개"}>{otherTotal>99?"99+":otherTotal}</span>}</span>;
 const openTeamNotifications=(t:string)=>{refresh(t).then(()=>{setModal({kind:"notifications"});run({type:"readNotifications",teamId:t})}).catch(e=>setError(e.message))};
 const unreadList=(v.notifications??[]).filter((n:Row)=>!n.read&&inTeam(n));
 const unread=unreadList.length;
 // 알림 목록은 오래된 것부터 쌓이므로 마지막이 가장 최근이다.
 const latestUnread=unreadList[unreadList.length-1];
 const openNotifications=()=>{setModal({kind:"notifications"});if(unread)run({type:"readNotifications",teamId:v.teamId||undefined})};
 // 홈 화면 아이콘에 읽지 않은 개수를 붙인다. 지원하지 않는 브라우저는 조용히 넘어간다.
 useEffect(()=>{
  const nav=navigator as Navigator&{setAppBadge?:(n?:number)=>Promise<void>;clearAppBadge?:()=>Promise<void>};
  try{if(unread>0)nav.setAppBadge?.(unread);else nav.clearAppBadge?.()}catch{}
 },[unread]);
 // 로그인했는지 알기 전에는 아무것도 보여주지 않는다. demo 가 true 로 시작하므로
 // 이 가림막이 없으면 로그인한 사람에게도 샘플 팀이 잠깐 보였다가 바뀐다.
 // 메일 링크는 로그인 상태·샘플 상태보다 먼저 처리한다. 토큰 자체로 권한을 주지 않는다.
 function leaveReset(showDemo=false){setActiveReset("");setDemo(showDemo);window.history.replaceState(null,"","/")}
 if(activeReset)return <main className="page-content"><AuthPanel resetToken={activeReset} onResetCancel={()=>leaveReset()} onDemo={()=>leaveReset(true)} mailReady={real?.mailReady!==false} kakaoReady={real?.kakaoReady===true} googleReady={real?.googleReady===true} naverReady={real?.naverReady===true} emailSignupEnabled={real?.emailSignupEnabled===true}/></main>;
 if(loading)return <div className="app-booting" aria-busy="true" aria-label="불러오는 중"/>;
 return <><SidebarProvider style={{"--sidebar-width":"232px"} as React.CSSProperties}><Sidebar collapsible="none" className="nav-side hidden md:flex sticky top-0 h-svh"><button className="brand" aria-label="홈으로" onClick={()=>setView("home")}><BrandMark/></button><div className="team-select"><div className="nav-label" style={{padding:"0 0 10px"}}>MY TEAM</div>{teamPicker}</div><SidebarContent><div><div className="nav-label">TEAM SPACE</div><SidebarMenu>{nav.map(n=><SidebarMenuItem key={n.id}><SidebarMenuButton className="nav-item" isActive={view===n.id} onClick={()=>setView(n.id)}><n.icon/><span>{n.label}</span>{n.id==="matching"&&inbox>0&&<i className="red-dot">{inbox}</i>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></div></SidebarContent><div className="side-note"><ShieldCheck size={19} style={{color:"#45955e",marginBottom:8}}/><strong>함께 뛰는 우리 팀</strong><p className="muted">경기 일정부터 기록까지<br/>한 곳에서 이어가세요.</p></div><div className="nav-bottom">{v.isOwner&&<button className="btn btn-ghost" onClick={()=>setView("admin")}><ShieldCheck/>서비스 관리</button>}<button className="btn btn-ghost" onClick={()=>setModal({kind:"settings"})}><Settings/>설정</button></div></Sidebar><div className="workspace"><header className="topbar"><div className="breadcrumb"><Home size={15}/><ChevronRight size={13}/><span>{team?.name??"팀 공간"}</span><ChevronRight size={13}/><strong>{nav.find(n=>n.id===view)?.label??"서비스 관리"}</strong></div><button className="brand mobile-brand" aria-label="홈으로" onClick={()=>setView("home")}><BrandMark/></button>{latestUnread&&<button className="notice-peek" onClick={openNotifications} title={latestUnread.title+" · "+latestUnread.body}><strong>{latestUnread.title}</strong><span>{latestUnread.body}</span></button>}<div className="top-actions"><span className="small muted desktop-only">{koreanDate(new Date().toISOString())}</span><button className="icon-button" aria-label={unread?"알림 "+unread+"개":"알림"} onClick={openNotifications}><Bell size={20}/>{unread>0&&<i className="notification-count">{unread>99?"99+":unread}</i>}</button><button className="row" onClick={()=>setModal({kind:"settings"})}><span className="avatar">{demo?"샘플":v.user?.name?.slice(-2)||"MY"}</span><span className="small top-user-name">{demo?"샘플 주장":v.user?.name||"내 계정"}</span></button></div></header><main className="page-content">
 {error&&<div className="error-bar">{error} <button onClick={()=>refresh(v.teamId).then(()=>setError("")).catch(e=>setError(e.message))}>다시 시도</button></div>}
 {verifyNote&&<div className="data-note" role="status" style={{marginBottom:14}}>{verifyNote}</div>}
 {!demo&&v.user&&real?.needsVerification&&<div className="error-bar">이메일 확인이 아직 안 됐어요. 확인해야 팀을 만들거나 가입을 신청할 수 있어요. <button onClick={resendVerify}>확인 메일 다시 보내기</button></div>}
 {view==="home"&&homeTab==="team"&&!demo&&<AppSetup signedIn={!!v.user}/>}
 {!demo&&v.user&&<KeepSubscription/>}
 {demo&&<div className="demo-strip"><span>샘플 팀 둘러보기 · 변경 사항은 실제 팀에 저장되지 않아요.</span><button onClick={toActual}>우리 팀 시작하기 <span aria-hidden>↗</span></button></div>}
 <div className="md:hidden" style={{marginBottom:20}}>{teamPicker}</div>
 {!demo&&!v.user&&pendingSignup?<SocialConsent provider={pendingSignup} onCancel={()=>setPendingSignup("")}/>:!demo&&!v.user?<AuthPanel inviteTeam={real?.invitedTeamName??""} onDemo={()=>setDemo(true)} mailReady={real?.mailReady!==false} kakaoReady={real?.kakaoReady===true} googleReady={real?.googleReady===true} naverReady={real?.naverReady===true} emailSignupEnabled={real?.emailSignupEnabled===true}/>:
 // 팀이 없으면 온보딩을 보여준다. 다만 MY 는 팀과 상관없는 내 것들이라
 // 팀이 없어도 아래에 함께 보여준다. 안 그러면 문의·공지·버전을 볼 길이 없다.
 !team&&view!=="admin"&&view!=="matching"?<><Management {...common} onboarding/>{view==="team"&&<div className="gap-grid" style={{marginTop:24}}><MyHub {...common}/></div>}</>:
 <>
 <div className="page-title"><div><h1>{view==="home"?"우리 팀의 매치데이":view==="schedule"?"경기 일정":view==="matching"?"함께 뛸 팀을 찾아요":view==="records"?"우리 팀의 기록":view==="admin"?"서비스 관리":"MY"}</h1><p>{view==="home"?"함께 뛰는 순간, 하나씩 쌓이는 기록.":view==="schedule"?"다가오는 경기를 확인하고 참여 여부를 알려주세요.":view==="matching"?"우리 팀에 맞는 상대와 다음 경기를 준비하세요.":view==="records"?"함께 만든 결과를 기간별로 확인하세요.":view==="admin"?"팀 등록 요청과 서비스 이용 상태를 관리하세요.":"우리 팀과 내 기록을 한곳에서 확인하세요."}</p></div>{manager&&["home","schedule","matching"].includes(view)&&<button disabled={busy||team?.status!=="active"} className="btn btn-green" onClick={()=>setModal({kind:"createGame",listing:view==="matching"&&captain})}><Plus/>경기 만들기</button>}</div>
 {team?.status==="suspended"&&<div className="error-bar">이 팀은 이용이 정지되어 읽기만 가능합니다. {team.reason}</div>}
 {view==="home"&&<HomeSwitch value={homeTab} onChange={setHomeTab} v={v} enabled={!!real?.user}/>}{view==="home"&&homeTab==="news"&&<NewsScreen v={v} demo={demo} loggedIn={!!real?.user} save={action}/>}{view==="home"&&homeTab!=="news"&&<div className="dashboard"><div className="main-column"><MvpPrompt v={v} open={(id:string)=>setModal({kind:"game",id,tab:"mvp"})}/>{shown?<><NextMatch v={v} g={shown} open={()=>setModal({kind:"game",id:shown.id})} hasPrev={shownIndex>0} hasNext={shownIndex<reel.length-1} onPrev={()=>setStep(shownIndex-1-baseIndex)} onNext={()=>setStep(shownIndex+1-baseIndex)} position={reel.length>1?shownIndex+1+" / "+reel.length:""} onTeam={(id:string)=>setModal({kind:"teamProfile",teamId:id})} onShare={(id:string)=>setModal({kind:"shareMatch",gameId:id})}/><Vote v={v} g={shown} disabled={busy||team?.status!=="active"} onVote={(value:string)=>run({type:"vote",teamId:v.teamId,gameId:shown.id,value})} onClose={manager?()=>run({type:"closeVote",teamId:v.teamId,gameId:shown.id}):undefined}/></>:<section className="panel"><Empty title="다음 경기를 기다리고 있어요" description={manager?"경기를 등록하고 팀원들의 참여 여부를 모아보세요.":"새 경기가 등록되면 이곳에서 확인할 수 있어요."} action={manager?"첫 경기 만들기":undefined} onClick={()=>setModal({kind:"createGame"})}/></section>}
 <div><div className="panel-title" style={{margin:"0 0 14px"}}><h2>이번 달, 우리 팀은</h2><span className="small muted">{Number(today.slice(5,7))}월</span></div><StatCards stats={monthStats}/></div>
 <section className="panel"><div className="panel-title"><h2>다가오는 경기 <span className="muted small">{upcoming.length}</span></h2><button className="text-link" onClick={()=>{setView("schedule");setDateFilter(false)}}>전체 일정<ChevronRight/></button></div>{upcoming.length?upcoming.slice(0,3).map((g:Row)=><Fixture key={g.id} g={g} v={v} onClick={()=>setModal({kind:"game",id:g.id})}/>):<Empty title="예정된 경기가 없어요"/>}</section>
 <section className="panel"><div className="panel-title"><h2>최근 경기 결과</h2><button className="text-link" onClick={()=>{setRecordTab("games");setView("records")}}>모든 기록<ChevronRight/></button></div>{games.filter((g:Row)=>g.status==="completed").slice(-2).reverse().map((g:Row)=><Fixture key={g.id} g={g} v={v} onClick={()=>setModal({kind:"game",id:g.id})}/>)}{!games.some((g:Row)=>g.status==="completed")&&<Empty title="첫 경기의 기록을 기다리고 있어요"/>}</section></div>
 <aside className="right-column"><Calendar month={month} setMonth={setMonth} selected={selected} onSelect={goDate} games={games}/><section className="panel"><div className="panel-title"><h2>팀 공지</h2>{captain&&<button className="text-link" aria-label="공지 작성" onClick={()=>setModal({kind:"notice"})}><Plus/></button>}</div><NoticeList notices={v.notices??[]} birthdays={v.birthdaysToday??[]} onOpen={(n:Row)=>setModal({kind:"noticeDetail",notice:n})}/></section><section className="panel"><div className="panel-title"><h2>이달의 골잡이</h2><Goal size={18} color="#81a18b"/></div>{[...monthStats.players].filter((p:Row)=>p.goals>0).sort((a:Row,b:Row)=>b.goals-a.goals).slice(0,3).map((p:Row,i:number,top:Row[])=><div className="rank-row" key={p.id}><span className="rank-number medal-slot"><Medal n={1+top.filter((q:Row)=>q.goals>p.goals).length} size={28}/></span><PlayerPhoto name={p.name} photo={p.photo}/><div className="player-info"><strong>{p.name}</strong><p>{backNoOr(p.number)} · {p.position}</p></div><span className="rank-score">{p.goals}<small>골</small></span></div>)}{!monthStats.players.some((p:Row)=>p.goals)&&<p className="small muted">확정된 득점 기록이 없어요.</p>}<button className="text-link" style={{marginTop:14}} onClick={()=>{setView("records");setRecordTab("players")}}>선수 기록 보기<ChevronRight/></button></section></aside></div>}
 {view==="schedule"&&<><Tabs value={scheduleMode} onValueChange={setScheduleMode} className="mb-5"><TabsList><TabsTrigger value="calendar">월간 달력</TabsTrigger><TabsTrigger value="list">일정 목록</TabsTrigger></TabsList></Tabs><div className="two-col" style={{gridTemplateColumns:scheduleMode==="calendar"?undefined:"1fr"}}>{scheduleMode==="calendar"&&<Calendar large month={month} setMonth={(m:string)=>{setMonth(m);setDateFilter(false)}} selected={selected} onSelect={goDate} games={games}/>}<section className="panel"><div className="panel-title"><h2>{dateFilter?selected.replaceAll("-","."):month.replace("-","년 ")+"월 일정"}</h2><button className="text-link" onClick={()=>setDateFilter(false)}>월 전체 보기</button></div>{games.filter((g:Row)=>localDay(g.start).startsWith(dateFilter?selected:month)).map((g:Row)=><Fixture key={g.id} g={g} v={v} onClick={()=>setModal({kind:"game",id:g.id})}/>)}{!games.some((g:Row)=>localDay(g.start).startsWith(dateFilter?selected:month))&&<Empty title="등록된 경기가 없어요" description="다른 날짜를 선택하거나 새 경기를 만들어보세요."/>}</section></div></>}
 {view==="matching"&&<Matching {...common} key={"matching:"+jumpTab} initialTab={jumpTab.startsWith("matching:")?jumpTab.slice("matching:".length):""}/>}
 {view==="records"&&<><section className="rec-block">{periodTabs}<StatCards stats={stats}/><p className="data-note" style={{marginBottom:20}}>완료 {stats.played}경기 · 결과 확정 {stats.scored}경기 · 출석 확정 {stats.attendanceConfirmed}경기{stats.pending>0&&" · 결과 확인 필요 "+stats.pending+"경기"}{stats.intra>0&&" · 자체전 "+stats.intra+"경기(팀 전적에서 빼고 개인 기록에는 넣어요)"}</p></section><section className="rec-block"><Rankings v={v} busy={busy} run={run} onOpen={(p:Row)=>setModal({kind:"player",player:p})}/></section><section className="rec-block"><Tabs value={recordTab} onValueChange={setRecordTab}><TabsList className="mb-4"><TabsTrigger value="players">선수 스코어보드</TabsTrigger><TabsTrigger value="games">경기 기록</TabsTrigger><TabsTrigger value="summary">매치 요약</TabsTrigger></TabsList><TabsContent value="players"><section className="panel"><div className="panel-title"><h2>우리 팀 선수 기록</h2></div>{periodTabs}<p className="small muted" style={{margin:"-4px 0 8px"}}>머리글을 누르면 그 순서로 줄 세워요.</p>{stats.players.length?<RecordsTable players={stats.players} rank={rank} setRank={setRank} onOpen={(p:Row)=>setModal({kind:"player",player:p})}/>:<Empty title="아직 선수가 없어요"/>}<p className="data-note">골·도움은 경기 결과와 개인 기록이 모두 확정되면 반영돼요. 출석은 실제 참석 확정 기준, MVP는 마감된 투표 기준이에요.</p></section></TabsContent><TabsContent value="games"><section className="panel">{games.filter((g:Row)=>g.status==="completed"&&g.start>=scope[0]&&g.start<scope[1]).reverse().map((g:Row)=><Fixture g={g} v={v} key={g.id} onClick={()=>setModal({kind:"game",id:g.id})}/>)}{!stats.played&&!stats.intra&&<Empty title="이 기간에 완료된 경기가 없어요"/>}</section></TabsContent><TabsContent value="summary"><section className="panel"><h2 className="view-heading">{stats.scored?stats.scored+"경기에서 함께 만든 결과":"첫 기록을 기다리고 있어요"}</h2><div className="two-col"><div><div className="stat-value">{stats.wins}<small>승</small> {stats.draws}<small>무</small> {stats.losses}<small>패</small></div><p className="data-note">결과가 확정된 경기 기준</p><div style={{display:"flex",height:12,borderRadius:6,overflow:"hidden",background:"#edf2ee",marginTop:18}}><div style={{width:stats.scored?stats.wins/stats.scored*100+"%":"0",background:"#188d55"}}/><div style={{width:stats.scored?stats.draws/stats.scored*100+"%":"0",background:"#a8ce62"}}/><div style={{width:stats.scored?stats.losses/stats.scored*100+"%":"0",background:"#e2b293"}}/></div></div><div className="gap-grid small"><p>팀 득점 <strong>{stats.goals}</strong> · 팀 실점 <strong>{stats.against}</strong> · 득실차 <strong>{stats.goals-stats.against}</strong></p><p>경기당 평균 출석 <strong>{stats.average??"—"}명</strong></p><p>개인 득점 합계 <strong>{stats.players.reduce((sum:number,p:Row)=>sum+p.goals,0)}골</strong></p></div></div></section></TabsContent></Tabs></section></>}
 {(view==="team"||view==="admin")&&<Management {...common} admin={view==="admin"}/>}
 </>}
 <footer className="footer-note"><span>TEAMKICK · 함께 뛰고, 함께 기록하다.</span><span>우리 팀의 모든 경기</span></footer>
 </main><nav className="bottom-nav">{nav.map(n=><button key={n.id} className={(view===n.id?"active":"")+" dot-host"} onClick={()=>setView(n.id)}><n.icon/>{n.label}{n.id==="matching"&&inbox>0&&<i className="red-dot nav-dot">{inbox}</i>}{n.id==="team"&&chatUnread>0&&<i className="red-dot nav-dot" aria-label={"안 읽은 채팅 "+chatUnread+"개"}>{chatUnread>99?"99+":chatUnread}</i>}</button>)}</nav></div>
 <AppDialogs {...common} modal={modal} real={real} setDemo={setDemo} samples={samples} refresh={refresh} otherUnread={otherUnread} openTeamNotifications={openTeamNotifications}/>
 <WelcomeGuide ready={!demo&&!!real?.user} hasTeam={!!team} onCreateTeam={()=>setModal({kind:"createTeam"})} onFindTeam={()=>setModal({kind:"findTeam"})}/>
 <Toaster position="top-center" richColors/>
 </SidebarProvider></>
}
function isoDay(x:string){return new Date(x+"T00:00:00+09:00").toISOString()}
export function Vote({v,g,onVote,disabled,onClose}:any){const [ask,setAsk]=useState(false);const side=v.sides.find((s:Row)=>s.gameId===g.id),me=v.members.find((m:Row)=>m.userId===v.user.id&&m.status==="active");if(!side)return null;const value=me?currentVote(side,me.id):"none",closed=Date.now()>=Date.parse(side.deadline)||g.status!=="scheduled";return <div className="vote-box"><div className="vote-title"><strong>{closed?"참여 투표가 마감되었어요":"이번 경기, 함께 뛰실 거죠?"}</strong><span className="muted" style={{fontSize:12}}>{value==="none"?"아직 미응답":value==="yes"?"참여 예정":value==="no"?"미참여":"아직 미정"}</span></div>{side.deadline&&<p className="vote-deadline"><Clock size={13}/>투표 마감 {whenText(side.deadline)}{closed?" 마감됨":""}{onClose&&!closed&&!ask&&<button type="button" className="vote-close" disabled={disabled} onClick={()=>setAsk(true)}>지금 마감</button>}</p>}{ask&&!closed&&<div className="vote-ask"><span>지금 투표를 마감할까요? 참여 인원이 이대로 정해져요.</span><button type="button" className="btn btn-dark" disabled={disabled} onClick={()=>{setAsk(false);onClose()}}>마감하기</button><button type="button" className="btn" onClick={()=>setAsk(false)}>취소</button></div>}<div className="vote-options">{[{key:"yes",label:"참여",icon:CheckCircle2},{key:"no",label:"미참여",icon:XCircle},{key:"maybe",label:"미정",icon:HelpCircle}].map(o=><button disabled={disabled||closed||!me} key={o.key} onClick={()=>onVote(o.key)} className={"vote-option "+(value===o.key?"selected":"")}><o.icon/>{o.label}</button>)}</div></div>}
// 1.20 상대 전적: 같은 상대(팀킥 팀이면 팀, 외부 팀이면 이름)와 끝난 경기 중 결과가 확정된 것.
function headToHead(v:Row,g:Row){
 const oid=g.home===v.teamId?g.away:g.home,ext=String(g.external??"").trim();if(!oid&&!ext)return null;
 let w=0,d=0,l=0;
 for(const x of (v.games??[]) as Row[]){if(x.id===g.id||x.status!=="completed"||x.result?.status!=="confirmed"||isIntra(x))continue;
  const xo=x.home===v.teamId?x.away:x.home;if(oid?xo!==oid:String(x.external??"").trim()!==ext)continue;
  const own=x.home===v.teamId?x.result.a:x.result.b,other=x.home===v.teamId?x.result.b:x.result.a;if(own>other)w++;else if(own===other)d++;else l++}
 return w+d+l?{w,d,l}:null;
}
function NextMatch({v,g,open,onPrev,onNext,hasPrev,hasNext,position,onTeam,onShare}:any){const team=v.teams.find((t:Row)=>t.id===v.teamId),other=v.teams.find((t:Row)=>t.id===(g.home===v.teamId?g.away:g.home)),side=v.sides.find((s:Row)=>s.gameId===g.id),roster=side?.roster??[],guests=side?.guestRoster??[],
 yes=roster.filter((m:Row)=>currentVote(side,m.id)==="yes").length+guests.length,total=roster.length+guests.length;const dday=seoulDay(Date.parse(g.start))-seoulDay(Date.now());const past=dday<0||g.status==="completed";const score=scoreText(v,g);const intra=isIntra(g);return <section className="next-match"><button type="button" className="match-arrow left" aria-label="이전 경기 보기" disabled={!hasPrev} onClick={onPrev}><ChevronLeft/></button><button type="button" className="match-arrow right" aria-label="다음 경기 보기" disabled={!hasNext} onClick={onNext}><ChevronRight/></button><div className="match-top"><span className="eyebrow">{past?"PAST MATCH":"NEXT MATCH"}</span><span className="row" style={{gap:8}}>{/* 1.20: 상대가 아직 없어도 공유 이미지를 만들 수 있다(상대 자리는 ?) */}{onShare&&!isIntra(g)&&g.status!=="cancelled"&&<button type="button" className="match-share" onClick={()=>onShare(g.id)} aria-label="경기 공유 이미지 만들기"><Share2 size={14}/>공유</button>}{position&&<span className="match-count">{position}</span>}<span className="badge">{past?(g.status==="completed"?"경기 종료":"지난 경기"):dday===0?"TODAY":"D-"+dday}</span></span></div>{intra?<IntraVersus team={team} g={g}/>:<div className="versus"><div className="club"><Crest name={team?.name} logo={team?.logo}/><strong>{team?.name}</strong><span>OUR TEAM</span></div><div className="versus-label">{score||"VS"}</div>{/* 1.19: 앱 안 상대팀이면 눌러서 팀 프로필을 본다(사장님 요청) */}{(()=>{const inner=<><Crest name={other?.name||g.external} color={other?.color||"orange"} logo={other?.logo}/><strong>{opponent(v,g)||"상대팀 미정"}</strong><span>{g.away?"MATCH CONFIRMED":g.listing==="open"?"LOOKING FOR A TEAM":"FRIENDLY MATCH"}</span>{other&&onTeam&&<small className="club-more">프로필 보기</small>}</>;return other&&onTeam?<button type="button" className="club club-btn" onClick={()=>onTeam(other.id)} aria-label={other.name+" 팀 프로필 보기"}>{inner}</button>:<div className="club">{inner}</div>})()}</div>}{(()=>{const h=headToHead(v,g);return h?<p className="h2h">상대 전적 <b>{h.w}승</b> <b>{h.d}무</b> <b>{h.l}패</b></p>:null})()}<div className="match-meta"><span className="meta-pair"><CalendarDays/>{koreanDate(g.start)}</span><span className="meta-pair"><Clock/>{rangeText(g.start,g.end)}</span><a className="meta-pair match-venue" href={kakaoRoute(g)} target="_blank" rel="noopener noreferrer" aria-label={g.venue+" 카카오맵 길찾기"}><MapPin/>{g.venue}{!past&&<small>길찾기</small>}</a></div><WeatherLine g={g}/><div className="match-bottom"><div className="row" style={{gap:8}}><div className="roster-dots">{[...roster,...guests].slice(0,3).map((m:Row)=><i key={m.id}>{m.name.slice(0,1)}</i>)}</div><span><strong style={{color:"#cef18a"}}>{yes}명</strong> 참여 예정 <span style={{color:"#cfe8da"}}> / {total}명{guests.length?" · 용병 "+guests.length:""}</span></span></div><button className="btn btn-lime" onClick={open}>경기 자세히 보기<ArrowUpRight/></button></div></section>}
function StatCards({stats}:any){return <div className="stats-grid">{[{label:"완료 경기",value:stats.played,unit:"경기",foot:"결과 확정 "+stats.scored+"경기",icon:Flag},{label:"승률",value:stats.winRate??"—",unit:"%",foot:stats.wins+"승 "+stats.draws+"무 "+stats.losses+"패",icon:TrendingUp},{label:"팀 득점",value:stats.goals,unit:"골",foot:"실점 "+stats.against+"골",icon:Goal},{label:"평균 출석",value:stats.average??"—",unit:"명",foot:"출석 확정 경기 기준",icon:ClipboardCheck}].map((s,i)=><div className="stat-card" key={s.label}><div className="stat-label">{s.label}<s.icon/></div><div className="stat-value">{s.value}<small>{s.unit}</small></div><div className={"stat-foot "+(i===1?"green":"")}>{s.foot}</div></div>)}</div>}
