export type Row={id:string;[key:string]:any};
export type State={users:Row[];teams:Row[];members:Row[];games:Row[];sides:Row[];requests:Row[];guests:Row[];notices:Row[];notifications:Row[];invites:Row[];audit:Row[];receipts:Row[];settings:Row[];inquiries:Row[];announcements:Row[]};
export const collections=["users","teams","members","games","sides","requests","guests","notices","notifications","invites","audit","receipts","settings","inquiries","announcements"] as const;
export const blank=():State=>({users:[],teams:[],members:[],games:[],sides:[],requests:[],guests:[],notices:[],notifications:[],invites:[],audit:[],receipts:[],settings:[],inquiries:[],announcements:[]});
// 배포 후 migration 이 적용되지 않으면 테이블이나 열이 없어 SQLite 오류가 난다.
// 그대로 두면 사용자에게 원인 모를 실패로 보이므로 구분해서 안내한다.
// 스키마 내용은 응답에 담지 않고 서버 로그에만 남긴다.
// 오래된 기록을 정리한다.
// load() 가 매 요청마다 entities 전체를 읽으므로, 끝없이 쌓이는 표가 하나라도
// 있으면 서비스 전체가 같이 느려진다. audit 과 notifications 는 지금까지
// 지우는 코드가 없어 영원히 쌓였다.
//
// 경기·출석·골 기록(games·sides)과 팀·팀원은 팀킥의 존재 이유라 **절대 지우지 않는다.**
// 여기서 지우는 것은 "누가 무슨 버튼을 눌렀는지"(audit)와 알림뿐이다.
// 안 읽은 알림은 오래 남긴다. 사용자가 아직 보지 못한 소식이기 때문이다.
// 문의는 분쟁 기록이라 운영 이력(90일)보다 길게 둔다. 1년(사용자 결정 2026-09-16).
export const KEEP={receipts:7,audit:90,readNotice:30,unreadNotice:180,inquiry:365};
// 한 요청에서 지우는 양을 제한한다. 오래 쌓인 상태에서 배포하면 첫 요청이
// 수만 건을 한꺼번에 지우려 들어 저장이 실패할 수 있다. 여러 요청에 나눠 지운다.
export const PRUNE_LIMIT=200;
// 탈퇴한 사람을 상태에서 지운다. 탈퇴할 때와, 백업 파일로 복원할 때(그 뒤에 탈퇴한
// 사람이 파일에 남아 있으면) 같은 방법으로 지워야 해서 한곳에 둔다. 조건 확인(주장 등)은
// 부르는 쪽이 한다 — 복원 때는 이미 탈퇴가 끝난 사람이라 막을 이유가 없다.
export function forgetAccount(s:State,userId:string,stamp:string){
 // 혼자 남은 주장이 떠나면 그 팀은 해산한다(2026-09-25 사장님 요청). 다른 팀원이 있으면 탈퇴 전에 주장을 넘겨야 한다.
 const solo=s.members.filter(y=>y.userId===userId&&y.status==="active"&&y.role==="captain"&&!s.members.some(o=>o.teamId===y.teamId&&o.status==="active"&&o.userId!==userId)).map(y=>y.teamId);
 for(const x of s.members.filter(y=>y.userId===userId&&y.status==="active")){x.status="left";if(x.periods?.at(-1))x.periods.at(-1).end=stamp;}
 for(const t of solo)dissolveTeam(s,t,stamp);
 for(const x of s.members.filter(y=>y.userId===userId&&y.status==="pending"))x.status="left";
 for(const x of s.guests.filter(y=>y.userId===userId&&["pending","approved"].includes(y.status)))x.status="withdrawn";
 // 남는 기록에서 개인 식별 정보를 지운다. 과거 경기·출석·기록의 선수 표시 이름은 그대로 둔다.
 s.users=s.users.filter(x=>x.id!==userId);
 s.notifications=s.notifications.filter(x=>x.userId!==userId);
 s.inquiries=s.inquiries.filter(x=>x.userId!==userId);
 for(const x of s.members.filter(y=>y.userId===userId))x.photo="";
}

// 팀 해산. 팀과 지난 기록은 남기고(팀의 공동 기록), 앞으로의 일정·신청·초대만 닫는다.
// 다른 팀과 잡힌 경기는 취소하고 그 팀에 알린다.
function dissolveTeam(s:State,t:string,stamp:string){
 const team=s.teams.find(x=>x.id===t);
 if(!team||team.status==="closed")return;
 team.status="closed";team.reason="주장이 탈퇴해 해산했어요.";
 for(const m of s.members.filter(x=>x.teamId===t&&x.status==="pending"))m.status="left";
 for(const v of s.invites.filter(x=>x.teamId===t))v.active=false;
 for(const r of s.requests.filter(x=>x.teamId===t&&x.status==="pending"))r.status="closed";
 const now=Date.parse(stamp);
 for(const g of s.games.filter(x=>(x.home===t||x.away===t)&&x.status==="scheduled"&&Date.parse(x.start)>now)){
  g.status="cancelled";g.reason="팀 해산으로 취소됐어요.";g.listing="cancelled";g.change=null;
  for(const r of s.requests.filter(x=>x.gameId===g.id&&x.status==="pending"))r.status="closed";
  for(const z of s.sides.filter(x=>x.gameId===g.id))if(guestStatusOf(z)==="open")z.guestStatus="closed";
  for(const r of s.guests.filter(x=>x.gameId===g.id&&x.status==="pending"))r.status="closed";
  const other=g.home===t?g.away:g.home;
  if(other)notice(s,other,"경기 취소","상대 팀이 해산해 경기가 취소됐어요.",g.id);
 }
}

export function prune(s:State,now=Date.now()){
 let budget=PRUNE_LIMIT;
 const sweep=(rows:Row[],days:(r:Row)=>number)=>{
  const kept:Row[]=[];
  for(const r of rows){
   const at=Date.parse(String(r.at));
   // 날짜를 읽을 수 없는 줄은 남긴다. 판단할 수 없는 것을 지우지 않는다.
   if(budget>0&&Number.isFinite(at)&&at<=now-days(r)*864e5){budget--;continue}
   kept.push(r);
  }
  return kept;
 };
 s.receipts=sweep(s.receipts,()=>KEEP.receipts);
 s.audit=sweep(s.audit,()=>KEEP.audit);
 s.notifications=sweep(s.notifications,r=>r.read?KEEP.readNotice:KEEP.unreadNotice);
 // 답변을 기다리는 문의는 지우지 않는다. 오래됐다고 못 본 채로 사라지면 안 된다.
 s.inquiries=sweep(s.inquiries,r=>r.status==="open"?Infinity:KEEP.inquiry);
 return PRUNE_LIMIT-budget;
}
export const setupIncomplete=(e:unknown)=>/no such table|no such column/i.test(String(e));
export const SETUP_MESSAGE="데이터베이스 준비가 아직 끝나지 않았어요. 관리자에게 문의해주세요.";

// 공개 전까지만 쓰는 진단용. 예상하지 못한 오류의 종류와 앞부분을 응답에 덧붙인다.
// 개인정보나 키가 들어갈 수 있는 값은 담지 않는다. 공개 전환 전에 없앤다(LEGAL.md).

export type Actor={id:string;name:string;ownerSetup?:boolean;ownerReset?:boolean;verified?:boolean};
export class AppError extends Error{constructor(message:string,public status=400){super(message)}}
export const ensure=(value:any,message:string,status=400)=>{if(!value)throw new AppError(message,status)};
export const iso=(ms=Date.now())=>new Date(ms).toISOString();
export const id=()=>crypto.randomUUID();
export const teamOf=(s:State,t:string)=>s.teams.find(x=>x.id===t);
export const membership=(s:State,t:string,u:string)=>s.members.find(x=>x.teamId===t&&x.userId===u&&x.status==="active");
// 탈퇴한 사람이 "내 이름을 지워달라"고 요구하면(개인정보보호법 제36조) 운영자가
// 과거 기록의 표시 이름만 이 값으로 바꾼다. 골·출석 같은 팀의 공동 기록은 남는다.
// 탈퇴했지만 과거 기록에 표시 이름이 남아 있는 사람들. 삭제 요청이 오면
// 운영자가 이 목록에서 찾아 가린다. 운영자에게만 보낸다.
export function retiredPeople(s:State){
 const out=new Map<string,{userId:string;name:string;teams:number;hidden:boolean}>();
 for(const m of s.members){
  if(!m.userId||s.users.some(u=>u.id===m.userId))continue;
  const seen=out.get(m.userId);
  if(seen){seen.teams++;if(m.name!==ANON_NAME)seen.hidden=false;continue}
  out.set(m.userId,{userId:m.userId,name:String(m.name??""),teams:1,hidden:m.name===ANON_NAME});
 }
 return [...out.values()];
}
export const ANON_NAME="탈퇴한 선수";
export const isOwner=(s:State,u:string)=>s.settings.find(x=>x.id==="owner")?.userId===u;
export const isManager=(s:State,t:string,u:string)=>["captain","manager"].includes(membership(s,t,u)?.role);
export const isCaptain=(s:State,t:string,u:string)=>membership(s,t,u)?.role==="captain";
export const sideOf=(s:State,g:string,t:string)=>s.sides.find(x=>x.gameId===g&&x.teamId===t);
export const guestStatusOf=(z:Row)=>z?.guestStatus??"none";
export const approvedGuests=(s:State,g:string,t:string)=>s.guests.filter(x=>x.gameId===g&&x.teamId===t&&x.status==="approved").length;
export function requireTeam(s:State,t:string,u:string,level="member",write=true){const team=teamOf(s,t);ensure(team,"팀을 찾을 수 없어요.",404);const m=membership(s,t,u);ensure(m&&((level==="member")||(level==="manager"&&["captain","manager"].includes(m.role))||(level==="captain"&&m.role==="captain")),"이 팀에서 해당 작업을 할 권한이 없어요.",403);ensure(!write||team!.status==="active","현재 이용 가능한 팀이 아니에요.",403);return m!}
// 활동 지역은 목록에서 고르게 한다. 자유 입력이면 "서울"과 "서울시"가 따로 놀아
// 매칭·검색에서 같은 지역이 갈라진다.
// 상대팀을 고를 때 보이는 값들. 목록 밖 값이 들어오면 매칭 화면이 깨진다.
export const FORMATS=["11인제","8인제","6인제","5인제"];
export const LEVELS=["입문","초급","중급","상급","선수 출신 포함"];
// 주로 뛰는 때. "주말" 은 예전 기본값이라 목록에 남겨 둔다.
export const DAYS=["상관없음","평일 저녁","주말","토요일 오전","토요일 오후","토요일 저녁","일요일 오전","일요일 오후","일요일 저녁"];
// 목록을 만들기 전에 저장된 값이 있다. 고르기 화면이 비어 보이지 않게 맞춰 준다.
const OLD_LEVELS:Record<string,string>={"하":"초급","중":"중급","상":"상급"};
export const levelOf=(v:unknown)=>{const x=String(v??"").trim();return LEVELS.includes(x)?x:(OLD_LEVELS[x]??"중급")};
export const pick=(v:unknown,list:string[],what:string)=>{
 const x=String(v??"").trim();ensure(list.includes(x),what+"을(를) 목록에서 골라주세요.");return x;
};
export const REGIONS=["서울","경기 남부","경기 북부","인천","강원","대전","세종","충북","충남","광주","전북","전남","대구","경북","부산","울산","경남","제주"];
export const regionValue=(v:unknown)=>{const x=String(v??"").trim();ensure(REGIONS.includes(x),"활동 지역을 목록에서 골라주세요.");return x};

export const textValue=(v:any,max=200,required=true)=>{const x=String(v??"").trim();ensure(x.length<=max&&(!required||x.length>0),"입력 내용의 길이를 확인해주세요.");return x};
export const integer=(v:any,min=0,max=99)=>{const n=Number(v);ensure(Number.isInteger(n)&&n>=min&&n<=max,"숫자 범위를 확인해주세요.");return n};
export const imageKey=(v:unknown,prefix:string)=>{const key=String(v??"").trim();ensure(key.length<=200,"이미지 정보를 확인해주세요.");ensure(!key||(key.startsWith(prefix)&&/^[A-Za-z0-9/_.-]+$/.test(key)&&!key.includes("..")),"이미지 정보를 확인해주세요.");return key};
export const coord=(v:unknown,limit:number)=>{const n=Number(v);return Number.isFinite(n)&&Math.abs(n)<=limit?n:null};
export const containsTeam=(g:Row,t:string)=>g.home===t||g.away===t;
export function currentVote(side:Row,memberId:string,cutoff=Infinity){const history=side.votes?.[memberId]??[];return [...history].filter((v:any)=>Date.parse(v.at)<=cutoff).at(-1)?.value??"none"}
export function eligibleMembers(s:State,side:Row,g:Row){const when=Math.min(Date.now(),Date.parse(g.start));return s.members.filter(m=>m.teamId===side.teamId&&(m.periods??[]).some((p:any)=>Date.parse(p.start)<=when&&(!p.end||Date.parse(p.end)>when)))}
export function rosterFor(s:State,side:Row,g:Row){return side.roster??eligibleMembers(s,side,g).map(m=>({id:m.id,name:m.name,number:m.number,position:m.position}))}
export function attendanceDraft(s:State,side:Row,g:Row){return Object.fromEntries(rosterFor(s,side,g).map((m:any)=>[m.id,currentVote(side,m.id,Date.parse(g.start))==="yes"]))}
export function newSide(g:Row,t:string):Row{return {id:g.id+":"+t,gameId:g.id,teamId:t,deadline:g.start,meeting:"",note:"",needed:11,votes:{},attendance:{},attendanceFinal:false,records:{},recordsFinal:false,guestNeeded:0,guestStatus:"none"}}
// 알림 문구에 들어갈 경기 시각. 저장은 UTC 로 두고 보여줄 때만 Asia/Seoul 로 바꾼다.
// 화면 쪽 koreanDate·time 과 같은 모양("9월 22일 (화) 10:00")을 만든다. Workers 런타임의
// Intl 표준 시간대 자료에 기대지 않도록 9시간을 직접 더해 계산한다.
const WEEKDAYS=["일","월","화","수","목","금","토"];
export function seoulStamp(value:string){
 const d=new Date(new Date(value).getTime()+9*3600e3);
 if(Number.isNaN(d.getTime()))return String(value??"");
 const two=(n:number)=>String(n).padStart(2,"0");
 return (d.getUTCMonth()+1)+"월 "+d.getUTCDate()+"일 ("+WEEKDAYS[d.getUTCDay()]+") "+two(d.getUTCHours())+":"+two(d.getUTCMinutes());
}
// 알림 문구에 쓸 상대 이름. 외부 팀은 입력한 이름, 앱 안 팀은 팀 이름.
function opponent0(s:State,g:Row,t:string){const other=g.home===t?g.away:g.home;return (other?teamOf(s,other)?.name:g.external)||"경기"}
// 팀 등록 상태를 사람이 읽는 말로 바꾼다. 알림에 active·rejected 가 그대로 나가고 있었다.
const TEAM_STATUS:Record<string,string>={pending:"승인 대기 중이에요",active:"승인됐어요",rejected:"반려됐어요",suspended:"이용이 정지됐어요",closed:"해산했어요"};

// 알림을 누르면 그 소식이 있는 화면으로 바로 가야 한다. 어느 화면인지는 알림을
// 만들 때가 가장 확실하므로(제목 글자를 나중에 해석하지 않는다) 여기서 같이 적는다.
// `to` 는 화면 이름(home·schedule·matching·records·team·admin)이다.
// 경기가 딸린 알림은 따로 적지 않아도 일정 화면으로 간다.
const target=(to?:string,gameId?:string)=>to??(gameId?"schedule":"home");
function notice(s:State,t:string,title:string,body:string,gameId?:string,to?:string){for(const m of s.members.filter(x=>x.teamId===t&&x.status==="active"))s.notifications.push({id:id(),userId:m.userId,teamId:t,title,body,gameId,to:target(to,gameId),read:false,at:iso()})}
function userNotice(s:State,u:string,title:string,body:string,t?:string,to?:string){s.notifications.push({id:id(),userId:u,teamId:t,title,body,to:target(to),read:false,at:iso()})}
function checkConflict(s:State,t:string,start:string,end:string,except:string){ensure(!s.games.some(g=>g.id!==except&&g.status!=="cancelled"&&containsTeam(g,t)&&Date.parse(g.start)<Date.parse(end)&&Date.parse(g.end)>Date.parse(start)),"같은 시간에 등록된 경기가 있어요. 기존 일정을 확인해주세요.",409)}
function dates(start:any,end:any){const a=Date.parse(start),b=Date.parse(end);ensure(Number.isFinite(a)&&Number.isFinite(b)&&b>a&&b-a<=24*3600e3,"경기 시작·종료 시간을 확인해주세요.");return {start:iso(a),end:iso(b)}}
// 팀 점수가 확정되거나 바뀌었을 때, 그 팀의 선수 기록 합이 점수와 다르면 그 팀만
// 다시 입력하게 한다. 예전에는 결과가 확정될 때마다 양 팀의 개인 기록 확정을 모두
// 풀어서, 기록과 점수를 함께 넣은 팀까지 아무 이유 없이 다시 입력해야 했다.
function clearStaleRecords(s:State,g:Row){
 for(const z of s.sides.filter(x=>x.gameId===g.id)){
  if(!z.recordsFinal)continue;
  const total=g.home===z.teamId?g.result?.a:g.result?.b;
  const sum=(Object.values(z.records??{}) as {goals?:number}[])
   .reduce((n,x)=>n+Number(x?.goals??0),0)+Number(z.ownGoals??0)+Number(z.unknownGoals??0);
  if(typeof total!=="number"||sum!==total)z.recordsFinal=false;
 }
}
// --- 자체전(팀 안 연습 경기, 2026-09-26 사장님 요청) ---
// 우리 팀을 1팀·2팀…으로 나눠 뛴다. 상대팀이 없으니 팀 전적(승·무·패, 승률)에는 넣지 않고,
// 출석·골·도움·MVP 는 개인 기록에 그대로 쌓는다.
export const isIntra=(g:Row|undefined)=>g?.kind==="intra";
export const SQUAD_NAMES=["1팀","2팀","3팀","4팀"];
// 조 나누기에 넣을 수 있는 사람: 그 경기의 팀원 명단 + 승인된 용병.
function squadPool(s:State,side:Row,g:Row){
 const ids=new Set<string>(rosterFor(s,side,g).map((x:Row)=>x.id));
 for(const x of s.guests.filter(y=>y.gameId===g.id&&y.teamId===side.teamId&&y.status==="approved"))ids.add(x.id);
 return ids;
}
// 조별 점수 = 그 조 팀원들의 골 + 그 조의 "용병·미상" 골. 조를 바꾸면 다시 계산한다.
function intraScores(g:Row,side:Row){
 const n=Number(g.squads)||2,out=Array.from({length:n},(_,i)=>Number(side.squadExtra?.[i]??0));
 for(const [k,r] of Object.entries(side.records??{}) as [string,{goals?:number}][]){const i=side.squads?.[k];if(typeof i==="number"&&i<n)out[i]+=Number(r?.goals??0)}
 return out;
}

// --- MVP 투표 (2026-09-26) ---
// 출석이 확정되면 열리고 48시간 뒤 닫힌다. 출석한 팀원만 투표하고, 출석한 팀원 중 자기 말고 한 명을 고른다.
// 누가 누구를 뽑았는지는 팀원에게도 보이지 않는다(visibleState 에서 표 대신 개수만 보낸다).
export const MVP_HOURS=48;
const attendedMembers=(side:Row)=>(side.roster??[]).filter((m:Row)=>side.attendance?.[m.id]===true).map((m:Row)=>m.id as string);
export function mvpWinners(side:Row,now=Date.now()){
 const p=side?.mvp;if(!p||now<Date.parse(p.closesAt))return [] as string[];
 const tally:Record<string,number>={};for(const c of Object.values(p.votes??{}) as string[])tally[c]=(tally[c]??0)+1;
 const top=Math.max(0,...Object.values(tally));
 return top>0?Object.keys(tally).filter(k=>tally[k]===top):[];
}
// --- 랭킹 (2026-09-26, 1.12.0) ---
// 기간: 이번 주(월요일 0시 시작)·이번 달·올해, 모두 한국 시간 기준. 항목: 골·도움·공격P·MVP·출석.
export const RANK_PERIODS=["week","month","year"] as const;
export const RANK_KEYS=["goals","assists","points","mvp","attend"] as const;
export function periodRange(period:string,now=Date.now()){
 const k=new Date(now+9*3600e3),y=k.getUTCFullYear(),m=k.getUTCMonth(),d=k.getUTCDate();
 const at=(yy:number,mm:number,dd:number)=>Date.UTC(yy,mm,dd)-9*3600e3;
 if(period==="week"){const back=(k.getUTCDay()+6)%7;const s=at(y,m,d-back);return {from:iso(s),to:iso(s+7*864e5)}}
 if(period==="month")return {from:iso(at(y,m,1)),to:iso(at(y,m+1,1))};
 return {from:iso(at(y,0,1)),to:iso(at(y+1,0,1))};
}
// 같은 값이면 같은 등수(1,1,3). 값이 0인 사람은 빼고 센다.
export function rankRows<T extends Record<string,unknown>>(rows:T[],key:string){
 const list=rows.filter(r=>Number(r[key]??0)>0).sort((a,b)=>Number(b[key])-Number(a[key])||String(a.name??"").localeCompare(String(b.name??""),"ko"));
 return list.map(r=>({...r,value:Number(r[key]),rank:1+list.filter(x=>Number(x[key])>Number(r[key])).length}));
}
// 전국 랭킹: **참여를 켠 사람만**(users[].rankPublic). 다른 사람의 계정 번호는 보내지 않고
// 선수 이름·팀 이름·숫자만 보낸다. 한 사람이 여러 팀에서 뛰면 합산한다. 활동 중인 팀의 기록만 센다.
export const NATIONAL_LIMIT=50;
export function nationalRanking(s:State,userId:string,now=Date.now()){
 const open=new Set(s.users.filter(u=>u.rankPublic===true).map(u=>u.id as string));
 const out:Record<string,Record<string,Row[]>>={};
 for(const period of RANK_PERIODS){
  const {from,to}=periodRange(period,now);
  const people=new Map<string,{name:string;teams:Map<string,number>;goals:number;assists:number;mvp:number;attend:number}>();
  for(const side of s.sides){
   const g=s.games.find(x=>x.id===side.gameId);
   if(!g||g.status!=="completed"||g.start<from||g.start>=to)continue;
   const team=teamOf(s,side.teamId);if(team?.status!=="active")continue;
   const winners=mvpWinners(side,now);
   for(const r of (side.roster??[]) as Row[]){
    const m=s.members.find(x=>x.id===r.id);if(!m?.userId||!open.has(m.userId))continue;
    const p=people.get(m.userId)??{name:String(m.name??""),teams:new Map(),goals:0,assists:0,mvp:0,attend:0};
    const came=side.attendanceFinal&&side.attendance?.[r.id]===true;
    if(came){p.attend++;p.teams.set(team.name,(p.teams.get(team.name)??0)+1)}
    if(side.recordsFinal&&g.result?.status==="confirmed"){p.goals+=Number(side.records?.[r.id]?.goals??0);p.assists+=Number(side.records?.[r.id]?.assists??0)}
    if(winners.includes(r.id))p.mvp++;
    if(m.status==="active")p.name=String(m.name??p.name);
    people.set(m.userId,p);
   }
  }
  const rows=[...people.entries()].map(([uid,p])=>({name:p.name,team:[...p.teams.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]??"",goals:p.goals,assists:p.assists,points:p.goals+p.assists,mvp:p.mvp,attend:p.attend,me:uid===userId}));
  out[period]={};
  for(const key of RANK_KEYS)out[period][key]=rankRows(rows,key).map(({name,team,value,rank,me},i)=>({id:"n"+i,name,team,value,rank,me})).filter((r,i)=>i<NATIONAL_LIMIT||r.me);
 }
 return out;
}
// 팀 회칙 예시는 앱에서 고르는 칩으로만 쓴다. 저장 길이만 서버에서 막는다.
export const RULES_MAX=2000;

export function applyCommand(s:State,a:Actor,c:any,now=Date.now()):any{
 const type=textValue(c.type,50),t=String(c.teamId??""),stamp=iso(now);let output:any={};
 if(!s.users.find(u=>u.id===a.id))s.users.push({id:a.id,name:a.name,at:stamp});
 const owner=isOwner(s,a.id);
 if(type==="setupOwner"){const current=s.settings.find(x=>x.id==="owner");ensure(!current||a.ownerReset,"운영자 설정이 이미 완료되었어요.",409);ensure(a.ownerSetup,"초기 설정 코드가 올바르지 않아요.",403);if(current)current.userId=a.id;else s.settings.push({id:"owner",userId:a.id});}
 else if(type==="createTeam"){
  ensure(a.verified!==false,"이메일 확인을 먼저 해주세요. 받은 편지함에서 확인 링크를 눌러주세요.",403);
  ensure(s.teams.filter(x=>x.applicant===a.id&&x.status==="pending").length<3,"대기 중인 팀 신청을 먼저 확인해주세요.");
  const team={id:id(),name:textValue(c.name,40),region:regionValue(c.region),description:textValue(c.description,500,false),format:pick(c.format||"11인제",FORMATS,"주 경기 형식"),days:pick(c.days||"주말",DAYS,"주로 뛰는 때"),level:pick(c.level||"중급",LEVELS,"팀 실력"),status:"pending",applicant:a.id,applicantName:a.name,at:stamp,reason:"",color:"green"};
  s.teams.push(team);const o=s.settings.find(x=>x.id==="owner");if(o)userNotice(s,o.userId,"새로운 팀 등록 요청",team.name+"의 등록을 확인해주세요.",undefined,"admin");output={teamId:team.id};
 }
 else if(type==="approveTeam"||type==="rejectTeam"||type==="suspendTeam"||type==="restoreTeam"){
  ensure(owner,"서비스 운영자만 처리할 수 있어요.",403);const team=teamOf(s,t);ensure(team,"팀을 찾을 수 없어요.",404);
  if(type==="approveTeam"){ensure(team!.status==="pending","이미 처리된 신청이에요.",409);team!.status="active";s.members.push({id:id(),teamId:t,userId:team!.applicant,name:team!.applicantName,role:"captain",status:"active",number:1,position:"MF",periods:[{start:stamp}],at:stamp});}
  if(type==="rejectTeam"){ensure(team!.status==="pending","이미 처리된 신청이에요.",409);team!.status="rejected";team!.reason=textValue(c.reason,300);}
  if(type==="suspendTeam"){ensure(team!.status==="active","활성 팀만 정지할 수 있어요.");team!.status="suspended";team!.reason=textValue(c.reason,300);}
  if(type==="restoreTeam"){ensure(team!.status==="suspended","정지된 팀이 아니에요.");team!.status="active";team!.reason="";}
  userNotice(s,team!.applicant,"팀 등록 상태 변경",team!.name+" · "+(TEAM_STATUS[team!.status]??team!.status)+(team!.reason?" · "+team!.reason:""),t,"team");
 }
 else if(type==="joinTeam"){
  ensure(a.verified!==false,"이메일 확인을 먼저 해주세요. 받은 편지함에서 확인 링크를 눌러주세요.",403);
  const team=teamOf(s,t);ensure(team?.status==="active","가입 가능한 팀이 아니에요.",404);const existing=s.members.find(m=>m.userId===a.id&&m.teamId===t);
  ensure(!existing||!["active","pending"].includes(existing.status),"이미 가입했거나 승인 대기 중이에요.",409);
  const data={userId:a.id,teamId:t,name:textValue(c.name||a.name,30),position:textValue(c.position||"MF",12),number:integer(c.number??0,0,99),role:"member",status:"pending",at:stamp};
  if(existing)Object.assign(existing,data);else s.members.push({id:id(),periods:[],...data});
  for(const m of s.members.filter(x=>x.teamId===t&&x.role==="captain"&&x.status==="active"))userNotice(s,m.userId,"팀원 가입 요청",data.name+"님이 가입을 신청했어요.",t,"team");
 }
 else if(["approveMember","rejectMember","removeMember","setRole","editMember","transferCaptain","acceptCaptain"].includes(type)){
  if(type!=="acceptCaptain")requireTeam(s,t,a.id,"captain");
  const m=s.members.find(x=>x.id===c.memberId&&x.teamId===t);ensure(m,"팀원을 찾을 수 없어요.",404);
  if(type==="approveMember"){ensure(m!.status==="pending","이미 처리된 신청이에요.",409);m!.status="active";m!.periods.push({start:stamp});}
  if(type==="rejectMember"){ensure(m!.status==="pending","대기 중인 신청이 아니에요.");m!.status="rejected";}
  if(type==="removeMember"){ensure(m!.role!=="captain","주장 인계 후 탈퇴할 수 있어요.");m!.status="removed";if(m!.periods.at(-1))m!.periods.at(-1).end=stamp;}
  if(type==="setRole"){ensure(m!.status==="active"&&m!.role!=="captain","이 팀원의 역할은 변경할 수 없어요.");ensure(["member","manager"].includes(c.role),"역할을 확인해주세요.");m!.role=c.role;}
  if(type==="editMember"){ensure(m!.status==="active","활동 중인 팀원의 선수 정보만 수정할 수 있어요.");m!.name=textValue(c.name,30);m!.number=integer(c.number,0,99);m!.position=textValue(c.position,12);}
  if(type==="transferCaptain"){ensure(m!.status==="active"&&m!.role!=="captain","인계받을 팀원을 선택해주세요.");teamOf(s,t)!.transferTo=m!.id;}
  if(type==="acceptCaptain"){requireTeam(s,t,a.id);ensure(m!.userId===a.id&&teamOf(s,t)!.transferTo===m!.id,"주장 인계 대상이 아니에요.",403);for(const p of s.members.filter(x=>x.teamId===t&&x.role==="captain"))p.role="member";m!.role="captain";delete teamOf(s,t)!.transferTo;}
  userNotice(s,m!.userId,type==="editMember"?"선수 정보 변경":"팀 가입·권한 변경",teamOf(s,t)!.name+(type==="editMember"?"에서 주장이 선수 정보를 변경했어요.":"의 팀원 상태가 변경되었어요."),t,"team");
 }
 else if(type==="leaveTeam"||type==="cancelJoin"){
  const m=s.members.find(x=>x.teamId===t&&x.userId===a.id);ensure(m,"소속 정보를 찾을 수 없어요.");ensure(m!.role!=="captain","주장을 먼저 인계해주세요.");
  ensure(type==="cancelJoin"?m!.status==="pending":m!.status==="active","현재 상태에서는 처리할 수 없어요.");m!.status="left";if(m!.periods.at(-1))m!.periods.at(-1).end=stamp;
 }
 else if(type==="editProfile"){
  const m=requireTeam(s,t,a.id,"member");m.name=textValue(c.name,30);m.number=integer(c.number,0,99);m.position=textValue(c.position,12);
 }
 else if(type==="editTeam"){
  requireTeam(s,t,a.id,"captain");const team=teamOf(s,t)!;
  team.name=textValue(c.name,40);team.region=regionValue(c.region);
  team.description=textValue(c.description,500,false);
  // 팀을 만들 때만 정할 수 있고 나중에 고칠 수 없었다. 팀 사정은 바뀐다.
  // 배포 중에 예전 화면을 열어둔 사람이 보낼 수 있다. 값이 없으면 지금 것을 지킨다.
  if(c.format!==undefined)team.format=pick(c.format,FORMATS,"주 경기 형식");
  if(c.days!==undefined)team.days=pick(c.days,DAYS,"주로 뛰는 때");
  if(c.level!==undefined)team.level=pick(c.level,LEVELS,"팀 실력");
 }
 // 팀 회칙. 주장·운영진이 쓴다. 가입을 신청하려는 사람도 미리 읽을 수 있게 공개 정보로 보낸다(화면에 안내).
 else if(type==="editRules"){
  requireTeam(s,t,a.id,"manager");const team=teamOf(s,t)!;
  team.rules=textValue(c.rules,RULES_MAX,false);team.rulesAt=stamp;
  if(c.notify===true&&team.rules)notice(s,t,"팀 회칙이 바뀌었어요","MY 탭의 회칙에서 확인해주세요.",undefined,"team");
 }
 else if(type==="createGame"){
  requireTeam(s,t,a.id,"manager");const d=dates(c.start,c.end);checkConflict(s,t,d.start,d.end,"");
  const g={id:id(),home:t,away:null,external:textValue(c.external,60,false),...d,venue:textValue(c.venue,100),address:textValue(c.address,200),lat:coord(c.lat,90),lng:coord(c.lng,180),region:regionValue(c.region||teamOf(s,t)!.region),format:textValue(c.format||"11인제",20),secured:c.secured!==false,cost:integer(c.cost??0,0,10000000),status:"scheduled",listing:c.listing?"open":"none",revision:1,result:null,at:stamp};
  if(c.kind==="intra"){ensure(!c.listing&&!g.external,"자체전은 상대팀 없이 우리 팀끼리 하는 경기예요.");Object.assign(g,{kind:"intra",squads:integer(c.squads??2,2,4)});}
  const voteCloses=c.deadline?Date.parse(String(c.deadline)):0;if(c.deadline)ensure(Number.isFinite(voteCloses)&&voteCloses>now&&voteCloses<=Date.parse(g.start),"투표 마감은 지금 이후, 경기 시작 시각까지로 정해주세요.");ensure(!g.external||!c.listing,"수기 상대팀과 모집을 동시에 설정할 수 없어요.");ensure(!c.listing||Date.parse(g.start)>now,"지난 경기로 모집할 수 없어요.");
  if(c.listing)requireTeam(s,t,a.id,"captain");s.games.push(g);const side=newSide(g,t);side.needed=integer(c.needed??11,1,50);side.note=textValue(c.note,500,false);if(voteCloses)side.deadline=iso(voteCloses);
  s.sides.push(side);notice(s,t,"새 경기 일정",seoulStamp(g.start)+" · "+g.venue,g.id);output={gameId:g.id};
 }
 else if(type==="applyMatch"||type==="withdrawMatch"||type==="acceptMatch"||type==="rejectMatch"){
  requireTeam(s,t,a.id,"captain");const g=s.games.find(x=>x.id===c.gameId);ensure(g,"경기를 찾을 수 없어요.",404);
  if(type==="applyMatch"){
   ensure(g!.home!==t&&g!.listing==="open"&&g!.status==="scheduled"&&Date.parse(g!.start)>now&&teamOf(s,g!.home)?.status==="active","신청할 수 없는 경기예요.",409);checkConflict(s,t,g!.start,g!.end,g!.id);
   const old=s.requests.find(x=>x.gameId===g!.id&&x.teamId===t);ensure(!old||old.status!=="pending","이미 신청한 경기예요.",409);
   const value={gameId:g!.id,teamId:t,by:a.id,message:textValue(c.message,300,false),status:"pending",version:g!.revision,at:stamp};if(old)Object.assign(old,value);else s.requests.push({id:id(),...value});notice(s,g!.home,"새 매칭 신청",teamOf(s,t)!.name+"에서 경기를 신청했어요.",g!.id,"matching:received");
  } else {
   const r=s.requests.find(x=>x.id===c.requestId&&x.gameId===g!.id);ensure(r?.status==="pending","이미 처리된 신청이에요.",409);
   if(type==="withdrawMatch"){ensure(r!.teamId===t,"자신의 신청만 철회할 수 있어요.",403);r!.status="withdrawn";r!.decidedAt=stamp;}
   else {ensure(g!.home===t,"모집 팀 주장만 처리할 수 있어요.",403);
    if(type==="rejectMatch"){r!.status="rejected";r!.decidedAt=stamp;}else{
     ensure(g!.listing==="open"&&!g!.away&&g!.status==="scheduled"&&Date.parse(g!.start)>now,"이미 종료된 모집이에요.",409);ensure(teamOf(s,r!.teamId)?.status==="active","상대팀의 승인을 확인해주세요.");ensure(r!.version===g!.revision,"조건이 변경되어 상대팀이 다시 신청해야 해요.",409);
     checkConflict(s,t,g!.start,g!.end,g!.id);checkConflict(s,r!.teamId,g!.start,g!.end,g!.id);
     g!.away=r!.teamId;g!.listing="matched";g!.revision++;s.sides.push(newSide(g!,r!.teamId));for(const v of s.requests.filter(x=>x.gameId===g!.id&&x.status==="pending")){v.status=v.id===r!.id?"accepted":"closed";v.decidedAt=stamp;}
     notice(s,t,"매칭 확정",teamOf(s,r!.teamId)!.name+"와 경기가 확정되었어요.",g!.id,"matching");notice(s,r!.teamId,"매칭 확정",teamOf(s,t)!.name+"와 경기가 확정되었어요.",g!.id,"matching");
    }
   }
  }
 }
 else if(["vote","attendance","records","matchRecord","completeGame","cancelGame","result","confirmResult","changeGame","confirmChange","sideSettings","remindVote","openListing","closeListing","setOpponent","squads","mvpVote","closeMvp","remindMvp"].includes(type)){
  const g=s.games.find(x=>x.id===c.gameId);ensure(g&&containsTeam(g,t),"팀 경기를 찾을 수 없어요.",404);
  const captainActions=["cancelGame","result","matchRecord","confirmResult","changeGame","confirmChange","openListing","closeListing","completeGame","setOpponent"];
  // 자체전 기록은 상대 확인이 없으니 운영진도 넣을 수 있다.
  const level=type==="vote"||type==="mvpVote"?"member":type==="matchRecord"&&isIntra(g)?"manager":captainActions.includes(type)?"captain":"manager";
  const m=requireTeam(s,t,a.id,level);
  if(isIntra(g))ensure(!["result","confirmResult","records","setOpponent","openListing"].includes(type),"자체전에서는 쓸 수 없는 기능이에요.");
  const side=sideOf(s,g!.id,t);ensure(side,"경기 팀 정보를 찾을 수 없어요.",404);
  ensure(g!.status!=="cancelled","취소된 경기예요.",409);
  if(type==="vote"){ensure(g!.status==="scheduled"&&now<Math.min(Date.parse(side!.deadline),Date.parse(g!.start)),"참여 투표가 마감되었어요.",409);ensure(["yes","no","maybe"].includes(c.value),"응답을 선택해주세요.");(side!.votes[m.id]??=[]).push({value:c.value,at:stamp});}
  if(type==="sideSettings"){side!.note=textValue(c.note,500,false);side!.meeting=textValue(c.meeting,50,false);side!.needed=integer(c.needed??side!.needed,1,50);if(c.deadline){ensure(now<Date.parse(c.deadline)&&Date.parse(c.deadline)<=Date.parse(g!.start),"투표 마감 시간을 확인해주세요.");side!.deadline=iso(Date.parse(c.deadline));}}
  if(type==="remindVote"){
   ensure(g!.status==="scheduled","예정된 경기에만 참여 알림을 보낼 수 있어요.",409);
   ensure(now<Math.min(Date.parse(side!.deadline),Date.parse(g!.start)),"참여 투표가 마감되었어요.",409);
   ensure(!side!.remindAt||now-Date.parse(side!.remindAt)>=6*3600e3,"방금 알림을 보냈어요. 6시간 뒤에 다시 보낼 수 있어요.",429);
   const waiting:Row[]=rosterFor(s,side!,g!).filter((x:Row)=>currentVote(side!,x.id)==="none");
   ensure(waiting.length,"아직 응답하지 않은 선수가 없어요.");
   const targets=s.members.filter(x=>x.teamId===t&&waiting.some(y=>y.id===x.id));
   for(const x of targets)userNotice(s,x.userId,"참여 투표 알림",teamOf(s,t)!.name+" · "+g!.venue+" 경기 참여 여부를 알려주세요.",t,"schedule");
   side!.remindAt=stamp;output={notified:targets.length};
  }
  if(type==="completeGame"){ensure(now>=Date.parse(g!.end),"경기가 끝난 후 완료 처리할 수 있어요.");g!.status="completed";
   // 끝난 경기의 용병 모집은 저절로 닫는다. 예전에는 경기가 끝나도 "용병 모집 중" 이
   // 그대로 남아 일정·기록 화면에 붙어 있었다. 아직 답을 못 받은 신청도 함께 닫는다.
   for(const z of s.sides.filter(x=>x.gameId===g!.id))if(guestStatusOf(z)==="open")z.guestStatus="closed";
   for(const r of s.guests.filter(x=>x.gameId===g!.id&&x.status==="pending"))r.status="closed";
  }
  if(type==="cancelGame"){if(g!.status==="completed")ensure(textValue(c.reason,300),"정정 사유를 입력해주세요.");g!.status="cancelled";g!.reason=textValue(c.reason,300);g!.listing="cancelled";g!.change=null;for(const r of s.requests.filter(x=>x.gameId===g!.id&&x.status==="pending"))r.status="closed";for(const z of s.sides.filter(x=>x.gameId===g!.id))if(guestStatusOf(z)==="open")z.guestStatus="closed";for(const r of s.guests.filter(x=>x.gameId===g!.id&&x.status==="pending"))r.status="closed";for(const tid of [g!.home,g!.away].filter(Boolean))notice(s,tid,"경기 취소",g!.reason,g!.id);}
  if(type==="setOpponent"){ensure(!g!.away&&g!.listing!=="open"&&!g!.result?.status,"외부 상대팀을 입력할 수 없는 경기예요.");g!.external=textValue(c.external,60);}
  if(type==="openListing"){ensure(g!.home===t&&!g!.away&&!g!.external&&Date.parse(g!.start)>now&&g!.status==="scheduled","상대팀 모집을 열 수 없는 경기예요.");g!.listing="open";}
  if(type==="closeListing"){ensure(g!.home===t&&!g!.away,"확정된 매칭은 경기 취소로 처리해주세요.");g!.listing="closed";for(const r of s.requests.filter(x=>x.gameId===g!.id&&x.status==="pending"))r.status="closed";}
  if(type==="attendance"){
   ensure(g!.status==="completed","경기 완료 처리 후 출석을 확정해주세요.");const roster=rosterFor(s,side!,g!);const values=c.values;ensure(values&&typeof values==="object","출석 정보를 확인해주세요.");
   ensure(Object.keys(values).every(k=>roster.some((x:any)=>x.id===k)),"이 경기의 출석 대상이 아닌 선수가 포함되어 있어요.");ensure(roster.every((x:any)=>typeof values[x.id]==="boolean"),"모든 선수의 출석을 확인해주세요.");
   side!.roster=roster;side!.attendance=values;side!.attendanceFinal=true;side!.attendanceAt=stamp;
   if(Object.entries(side!.records).some(([k,v]:any)=>!values[k]&&(v.goals||v.assists)))side!.recordsFinal=false;
   // 출석이 확정되면 MVP 투표를 연다. 다시 확정하면(정정) 빠진 사람의 표와 그 사람에게 간 표를 뺀다.
   const came=attendedMembers(side!);
   if(!side!.mvp){
    side!.mvp={openAt:stamp,closesAt:iso(now+MVP_HOURS*3600e3),votes:{}};
    const voters=s.members.filter(x=>x.teamId===t&&came.includes(x.id)&&x.status==="active");
    if(came.length>=2)for(const x of voters)s.notifications.push({id:id(),userId:x.userId,teamId:t,title:"MVP 투표가 열렸어요",body:(isIntra(g)?"자체전":opponent0(s,g!,t))+" · 오늘의 MVP를 뽑아주세요. "+MVP_HOURS+"시간 뒤 마감돼요.",gameId:g!.id,to:"schedule",read:false,at:stamp});
   }else{
    const votes=side!.mvp.votes??{};
    for(const [k,v] of Object.entries(votes))if(!came.includes(k)||!came.includes(v as string))delete votes[k];
   }
  }
  if(type==="mvpVote"){
   const p=side!.mvp;ensure(p,"아직 MVP 투표가 열리지 않았어요. 출석이 확정되면 열려요.",409);
   ensure(now<Date.parse(p.closesAt),"MVP 투표가 마감됐어요.",409);
   const came=attendedMembers(side!);
   ensure(came.includes(m.id),"이 경기에 출석한 팀원만 투표할 수 있어요.",403);
   const pick=String(c.candidate??"");
   ensure(came.includes(pick),"이 경기에 출석한 팀원 중에서 골라주세요.");
   ensure(pick!==m.id,"자기 자신은 뽑을 수 없어요.");
   (p.votes??={})[m.id]=pick;
  }
  if(type==="closeMvp"||type==="remindMvp"){
   const p=side!.mvp;ensure(p&&now<Date.parse(p.closesAt),"진행 중인 MVP 투표가 없어요.",409);
   const came=attendedMembers(side!),people=s.members.filter(x=>x.teamId===t&&came.includes(x.id)&&x.status==="active");
   if(type==="remindMvp"){
    ensure(!p.remindAt||now-Date.parse(p.remindAt)>=6*3600e3,"방금 알림을 보냈어요. 6시간 뒤에 다시 보낼 수 있어요.",429);
    const waiting=people.filter(x=>!p.votes?.[x.id]);ensure(waiting.length,"모두 투표했어요.");
    for(const x of waiting)s.notifications.push({id:id(),userId:x.userId,teamId:t,title:"MVP 투표 알림",body:"아직 MVP를 뽑지 않았어요. "+seoulStamp(p.closesAt)+"에 마감돼요.",gameId:g!.id,to:"schedule",read:false,at:stamp});
    p.remindAt=stamp;output={notified:waiting.length};
   }else{
    p.closesAt=stamp;p.closedBy=a.id;
    const win=mvpWinners(side!,now).map(k=>(side!.roster??[]).find((r:Row)=>r.id===k)?.name).filter(Boolean);
    for(const x of people)s.notifications.push({id:id(),userId:x.userId,teamId:t,title:"MVP 투표 결과",body:win.length?"오늘의 MVP: "+win.join(", "):"투표한 사람이 없어 MVP가 없어요.",gameId:g!.id,to:"schedule",read:false,at:stamp});
   }
  }
  if(type==="squads"){
   ensure(isIntra(g),"자체전에서만 팀을 나눌 수 있어요.");
   ensure(c.assign&&typeof c.assign==="object"&&!Array.isArray(c.assign),"팀 나누기 정보를 확인해주세요.");
   const pool=squadPool(s,side!,g!),n=Number(g!.squads)||2,next:Record<string,number>={};
   for(const [k,v] of Object.entries(c.assign)){ensure(pool.has(k),"이 경기에 뛸 수 있는 선수만 나눌 수 있어요.");next[k]=integer(v,0,n-1);}
   side!.squads=next;side!.squadsAt=stamp;
   if(side!.recordsFinal&&g!.result?.status==="confirmed")g!.result={...g!.result,squads:intraScores(g!,side!)};
  }
  if(type==="records"){
   ensure(g!.status==="completed"&&side!.attendanceFinal,"경기 완료와 출석 확정을 먼저 해주세요.");ensure(g!.result?.status==="confirmed","경기 결과 확정 후 개인 기록을 저장해주세요.");
   ensure(c.values&&typeof c.values==="object"&&!Array.isArray(c.values),"선수 기록을 확인해주세요.");const values:Record<string,{goals:number;assists:number}>={};for(const [k,v] of Object.entries(c.values) as any){ensure(side!.attendance[k]===true,"출석 확정된 선수만 기록할 수 있어요.");ensure(v&&typeof v==="object","선수 기록을 확인해주세요.");values[k]={goals:integer(v.goals),assists:integer(v.assists)};}
   const goals=(Object.values(values) as any[]).reduce((sum,v)=>sum+v.goals,0),assists=(Object.values(values) as any[]).reduce((sum,v)=>sum+v.assists,0);
   const total=g!.home===t?g!.result.a:g!.result.b,own=integer(c.ownGoals??0),unknown=integer(c.unknownGoals??0);
   ensure(goals+own+unknown===total,"선수 득점 + 상대 자책골 + 득점자 미상의 합이 팀 득점과 같아야 해요.");ensure(assists<=total-own,"어시스트 합계가 팀 득점을 초과해요.");
   side!.records=values;side!.ownGoals=own;side!.unknownGoals=unknown;side!.recordsFinal=true;side!.recordsAt=stamp;
  }
  // 기록 입력 순서를 뒤집는다. 예전에는 팀 점수를 먼저 넣어 확정해야 선수 기록을
  // 넣을 수 있었고, 둘의 합이 맞지 않으면 저장이 막혔다. 이제 우리 팀 점수는
  // 선수 득점 + 상대 자책골 + 득점자 미상을 **더해서 구하고**, 손으로 넣는 숫자는
  // 상대팀 득점 하나뿐이다. 합이 안 맞아 막히는 일이 없어진다.
  if(type==="matchRecord"&&isIntra(g)){
   ensure(g!.status==="completed","경기 완료 처리 후 기록을 입력해주세요.");
   ensure(side!.attendanceFinal,"출석 확정을 먼저 해주세요.");
   ensure(c.values&&typeof c.values==="object"&&!Array.isArray(c.values),"선수 기록을 확인해주세요.");
   const n=Number(g!.squads)||2,values:Record<string,{goals:number;assists:number}>={};
   for(const [k,row] of Object.entries(c.values as Record<string,{goals?:unknown;assists?:unknown}>)){
    ensure(side!.attendance[k]===true,"출석 확정된 선수만 기록할 수 있어요.");
    ensure(row&&typeof row==="object","선수 기록을 확인해주세요.");
    values[k]={goals:integer(row.goals),assists:integer(row.assists)};
    // 골을 넣은 사람은 어느 팀이었는지 알아야 조별 점수를 셀 수 있다.
    if(values[k].goals)ensure(typeof side!.squads?.[k]==="number","골을 넣은 선수가 몇 팀인지 먼저 나눠주세요.");
   }
   const extra=Array.from({length:n},(_,i)=>integer(Array.isArray(c.extra)?c.extra[i]??0:0));
   const list=Object.values(values);
   const goals=list.reduce((x,r)=>x+r.goals,0)+extra.reduce((x,y)=>x+y,0),assists=list.reduce((x,r)=>x+r.assists,0);
   ensure(assists<=goals,"도움 합계가 전체 골보다 많을 수 없어요.");
   side!.records=values;side!.squadExtra=extra;side!.ownGoals=0;side!.unknownGoals=0;side!.recordsFinal=true;side!.recordsAt=stamp;
   const revision=(g!.resultSequence??0)+1;g!.resultSequence=revision;
   g!.result={status:"confirmed",squads:intraScores(g!,side!),by:t,revision,at:stamp};
   output={squads:g!.result.squads};
  }
  else if(type==="matchRecord"){
   ensure(g!.status==="completed","경기 완료 처리 후 기록을 입력해주세요.");
   ensure(side!.attendanceFinal,"출석 확정을 먼저 해주세요.");
   ensure(g!.away||g!.external,"상대팀을 먼저 설정해주세요.");
   ensure(c.values&&typeof c.values==="object"&&!Array.isArray(c.values),"선수 기록을 확인해주세요.");
   const values:Record<string,{goals:number;assists:number}>={};
   for(const [k,row] of Object.entries(c.values as Record<string,{goals?:unknown;assists?:unknown}>)){
    ensure(side!.attendance[k]===true,"출석 확정된 선수만 기록할 수 있어요.");
    ensure(row&&typeof row==="object","선수 기록을 확인해주세요.");
    values[k]={goals:integer(row.goals),assists:integer(row.assists)};
   }
   const list=Object.values(values) as {goals:number;assists:number}[];
   const scored=list.reduce((sum,x)=>sum+x.goals,0),assists=list.reduce((sum,x)=>sum+x.assists,0);
   const own=integer(c.ownGoals??0),unknown=integer(c.unknownGoals??0);
   const total=scored+own+unknown,against=integer(c.opponent);
   ensure(total<=99,"우리 팀 득점 합계를 확인해주세요.");
   // 어시스트는 우리 선수가 넣은 골에만 붙는다. 자책골에는 도움이 없다.
   ensure(assists<=total-own,"도움 합계가 우리 팀 득점을 넘을 수 없어요.");
   side!.records=values;side!.ownGoals=own;side!.unknownGoals=unknown;side!.recordsFinal=true;side!.recordsAt=stamp;
   const proposed={a:g!.home===t?total:against,b:g!.home===t?against:total,by:t,status:g!.away?"pending":"confirmed",revision:(g!.resultSequence??g!.result?.revision??0)+1,at:stamp};
   g!.resultSequence=proposed.revision;
   if(!g!.away){g!.result=proposed;clearStaleRecords(s,g!);}
   else{g!.resultProposal=proposed;if(!g!.result)g!.result={status:"pending"};
    notice(s,g!.home===t?g!.away:g!.home,"경기 결과 확인 요청",total+" : "+against+" 결과를 확인해주세요.",g!.id);}
   output={total,opponent:against};
  }
  if(type==="result"){
   ensure(g!.status==="completed","경기 완료 후 결과를 입력해주세요.");const own=integer(c.own),opponent=integer(c.opponent);ensure(g!.away||g!.external,"상대팀을 먼저 설정해주세요.");
   const proposed={a:g!.home===t?own:opponent,b:g!.home===t?opponent:own,by:t,status:g!.away?"pending":"confirmed",revision:(g!.resultSequence??g!.result?.revision??0)+1,at:stamp};
   g!.resultSequence=proposed.revision;
   if(!g!.away){g!.result=proposed;clearStaleRecords(s,g!);}
   else {g!.resultProposal=proposed;if(!g!.result)g!.result={status:"pending"};notice(s,g!.home===t?g!.away:g!.home,"경기 결과 확인 요청",own+" : "+opponent+" 결과를 확인해주세요.",g!.id);}
  }
  if(type==="confirmResult"){const p=g!.resultProposal;ensure(p&&p.by!==t&&c.revision===p.revision,"확인 가능한 상대팀의 최신 결과가 없어요.",409);if(c.agree===false){p.status="disputed";}else{g!.result={...p,status:"confirmed"};g!.resultProposal=null;clearStaleRecords(s,g!);}notice(s,p.by,c.agree===false?"경기 결과 이견":"경기 결과 확정","경기 결과 확인 상태가 변경되었어요.",g!.id);}
  if(type==="changeGame"){
   ensure(g!.status==="scheduled"&&now<Date.parse(g!.start),"이미 시작한 경기는 일정 변경을 할 수 없어요.");const d=dates(c.start,c.end);ensure(Date.parse(d.start)>now,"미래 일정을 선택해주세요.");const change={proposalId:id(),...d,venue:textValue(c.venue,100),address:textValue(c.address,200),lat:coord(c.lat,90),lng:coord(c.lng,180),cost:integer(c.cost??g!.cost,0,10000000),by:t,version:g!.revision};
   if(g!.away){g!.change=change;notice(s,g!.home===t?g!.away:g!.home,"일정 변경 제안",change.venue+" · "+change.start,g!.id);}
   else{checkConflict(s,t,d.start,d.end,g!.id);if(g!.listing!=="open"&&!isIntra(g))g!.external=textValue(c.external??g!.external,60,false);Object.assign(g!,change);g!.revision++;for(const z of s.sides.filter(x=>x.gameId===g!.id)){z.voteArchive=[...(z.voteArchive??[]),z.votes];z.votes={};z.deadline=g!.start;}for(const r of s.requests.filter(x=>x.gameId===g!.id&&x.status==="pending"))r.status="changed";}
  }
  if(type==="confirmChange"){const change=g!.change;ensure(g!.status==="scheduled"&&now<Date.parse(g!.start)&&change&&now<Date.parse(change.start),"이미 시작한 경기의 변경 제안은 수락할 수 없어요.",409);ensure(change&&change.by!==t&&change.version===g!.revision&&c.proposalId===change.proposalId,"확인 가능한 최신 변경 제안이 없어요.",409);if(c.agree!==false){for(const tid of [g!.home,g!.away].filter(Boolean))checkConflict(s,tid,change.start,change.end,g!.id);Object.assign(g!,change);g!.revision++;for(const z of s.sides.filter(x=>x.gameId===g!.id)){z.voteArchive=[...(z.voteArchive??[]),z.votes];z.votes={};z.deadline=g!.start;z.roster=null;z.attendanceFinal=false;}for(const tid of [g!.home,g!.away].filter(Boolean))notice(s,tid,"경기 일정 변경","변경된 일정에 다시 참여 투표해주세요.",g!.id);}g!.change=null;}
 }
 else if(["openGuests","closeGuests","applyGuest","withdrawGuest","approveGuest","rejectGuest","cancelGuest"].includes(type)){
  const g=s.games.find(x=>x.id===c.gameId);ensure(g&&containsTeam(g,t),"경기를 찾을 수 없어요.",404);
  const side=sideOf(s,g!.id,t);ensure(side,"경기 팀 정보를 찾을 수 없어요.",404);
  const upcoming=()=>g!.status==="scheduled"&&Date.parse(g!.start)>now,count=()=>approvedGuests(s,g!.id,t),limit=()=>integer(side!.guestNeeded??0,0,30);
  const closePending=()=>{for(const x of s.guests.filter(x=>x.gameId===g!.id&&x.teamId===t&&x.status==="pending"))x.status="closed"};
  const find=()=>{const r=s.guests.find(x=>x.id===c.guestId&&x.teamId===t&&x.gameId===g!.id);ensure(r,"용병 신청을 찾을 수 없어요.",404);return r!};
  if(type==="applyGuest"){
   ensure(teamOf(s,t)?.status==="active","지금은 용병을 신청할 수 없는 팀이에요.",403);
   ensure(guestStatusOf(side!)==="open"&&upcoming()&&count()<limit(),"용병 모집이 마감되었어요.",409);
   ensure(!s.members.some(x=>x.teamId===t&&x.userId===a.id&&["active","pending"].includes(x.status)),"이미 이 팀에 소속되어 있어 용병으로 신청할 수 없어요.",409);
   const old=s.guests.find(x=>x.gameId===g!.id&&x.teamId===t&&x.userId===a.id);
   ensure(!old||!["pending","approved"].includes(old.status),"이미 신청한 경기예요.",409);
   const value={gameId:g!.id,teamId:t,userId:a.id,name:textValue(c.name||a.name,30),position:textValue(c.position||"MF",12),number:integer(c.number??0,0,99),message:textValue(c.message,300,false),status:"pending",at:stamp};
   const row=old?Object.assign(old,value):{id:id(),...value};if(!old)s.guests.push(row);
   for(const m of s.members.filter(x=>x.teamId===t&&["captain","manager"].includes(x.role)&&x.status==="active"))userNotice(s,m.userId,"새 용병 신청",value.name+"님이 용병으로 신청했어요.",t,"matching:guest");
   output={guestId:row.id};
  }
  else if(type==="withdrawGuest"){const r=find();ensure(r.userId===a.id,"자신의 신청만 철회할 수 있어요.",403);ensure(r.status==="pending","이미 처리된 신청이에요.",409);r.status="withdrawn";}
  else {
   requireTeam(s,t,a.id,"manager");
   if(type==="openGuests"){
    ensure(upcoming(),"시작 전 예정 경기에만 용병을 모집할 수 있어요.");const needed=integer(c.needed,1,30);
    ensure(needed>=count(),"이미 승인한 용병보다 적은 인원으로 줄일 수 없어요.");side!.guestNeeded=needed;
    if(count()>=needed){side!.guestStatus="closed";closePending();}
    else {side!.guestStatus="open";notice(s,t,"용병 모집 시작",g!.venue+" · "+needed+"명 모집",g!.id,"matching:guest");}
   }
   if(type==="closeGuests"){ensure(guestStatusOf(side!)==="open","이미 마감된 모집이에요.",409);side!.guestStatus="closed";closePending();}
   if(type==="rejectGuest"){const r=find();ensure(r.status==="pending","대기 중인 신청이 아니에요.",409);r.status="rejected";userNotice(s,r.userId,"용병 신청 결과",teamOf(s,t)!.name+" 경기의 용병 신청이 거절되었어요.",undefined,"matching:guest");}
   if(type==="approveGuest"){
    const r=find();ensure(r.status==="pending","이미 처리된 신청이에요.",409);ensure(upcoming(),"지난 경기의 용병은 승인할 수 없어요.",409);
    ensure(guestStatusOf(side!)==="open","용병 모집이 마감되었어요.",409);ensure(count()<limit(),"용병 모집 인원이 모두 찼어요.",409);
    r.status="approved";r.decidedAt=stamp;
    if(count()>=limit()){side!.guestStatus="closed";closePending();}
    userNotice(s,r.userId,"용병 신청 승인",teamOf(s,t)!.name+" 경기에 용병으로 확정되었어요.",undefined,"matching:guest");
   }
   if(type==="cancelGuest"){
    const r=find();ensure(r.status==="approved","승인된 용병만 취소할 수 있어요.",409);r.status="cancelled";r.decidedAt=stamp;
    if(guestStatusOf(side!)==="closed"&&upcoming()&&count()<limit())side!.guestStatus="open";
    userNotice(s,r.userId,"용병 확정 취소",teamOf(s,t)!.name+" 경기의 용병 확정이 취소되었어요.",undefined,"matching:guest");
   }
  }
 }
 else if(type==="setTeamLogo"){requireTeam(s,t,a.id,"captain");teamOf(s,t)!.logo=imageKey(c.key,"teams/"+t+"/");}
 else if(type==="setMemberPhoto"){
  const me=requireTeam(s,t,a.id,"member");const m=s.members.find(x=>x.id===c.memberId&&x.teamId===t);ensure(m,"팀원을 찾을 수 없어요.",404);
  ensure(m!.id===me.id||me.role==="captain","본인 또는 주장만 선수 사진을 바꿀 수 있어요.",403);
  ensure(m!.status==="active","활동 중인 팀원의 사진만 바꿀 수 있어요.");
  m!.photo=imageKey(c.key,"members/"+t+"/"+m!.id+"/");
 }
 else if(type==="createNotice"){
  requireTeam(s,t,a.id,"captain");
  const row={id:id(),teamId:t,title:textValue(c.title,100),body:textValue(c.body,1500),pinned:c.pinned===true,at:stamp,notifiedAt:stamp};
  s.notices.push(row);notice(s,t,"새 팀 공지",row.title,undefined,"home");output={noticeId:row.id};
 }
 // 올릴 때 한 번 가는 알림을 못 본 사람이 있다. 주장이 같은 공지를 다시 보낼 수 있게 한다.
 // 참여 투표 알림(remindVote)과 같은 규칙을 쓴다 — 6시간에 한 번.
 else if(type==="notifyNotice"){
  requireTeam(s,t,a.id,"captain");
  const row=s.notices.find(x=>x.id===String(c.noticeId??"")&&x.teamId===t);
  ensure(row,"공지를 찾을 수 없어요.",404);
  ensure(!row!.notifiedAt||now-Date.parse(row!.notifiedAt)>=6*3600e3,"방금 알림을 보냈어요. 6시간 뒤에 다시 보낼 수 있어요.",429);
  const targets=s.members.filter(x=>x.teamId===t&&x.status==="active"&&x.userId!==a.id);
  ensure(targets.length,"알림을 받을 팀원이 없어요.");
  for(const m of targets)userNotice(s,m.userId,"팀 공지 알림",row!.title,t,"home");
  row!.notifiedAt=stamp;output={notified:targets.length};
 }
 else if(type==="deleteNotice"){requireTeam(s,t,a.id,"captain");s.notices=s.notices.filter(x=>x.id!==c.noticeId||x.teamId!==t);}
 else if(type==="invite"){requireTeam(s,t,a.id,"captain");const token=crypto.randomUUID()+crypto.randomUUID();s.invites.push({id:token,teamId:t,expires:iso(now+7*24*3600e3),active:true});output={invite:token};}
 else if(type==="revokeInvite"){requireTeam(s,t,a.id,"captain");const v=s.invites.find(x=>x.id===c.inviteId&&x.teamId===t);ensure(v,"초대를 찾을 수 없어요.");v!.active=false;}
 else if(type==="closeAccount"){
  const mine=s.members.filter(x=>x.userId===a.id&&x.status==="active");
  // 다른 팀원이 있는 팀의 주장은 먼저 넘겨야 한다. 혼자 있는 팀이면 탈퇴와 함께 해산한다(forgetAccount).
  ensure(!mine.some(x=>x.role==="captain"&&s.members.some(o=>o.teamId===x.teamId&&o.status==="active"&&o.userId!==a.id)),"주장을 맡은 팀에 다른 팀원이 있어요. 먼저 주장을 인계한 뒤 탈퇴할 수 있어요.",409);
  ensure(!s.teams.some(x=>x.applicant===a.id&&x.status==="pending"),"승인 대기 중인 팀 신청이 있어요. 처리된 뒤에 탈퇴할 수 있어요.",409);
  ensure(!isOwner(s,a.id),"서비스 운영자 계정은 이 화면에서 탈퇴할 수 없어요.",409);
  forgetAccount(s,a.id,stamp);
 }
 // --- 1:1 문의 ---
 // 팀 안이 아니라 서비스 운영자에게 직접 보내는 창구. 팀에 속하지 않아도 쓸 수 있다.
 else if(type==="askSupport"){
  const text=textValue(c.message,1000);
  // 답변을 기다리는 문의가 쌓이면 더 받지 않는다. 한 사람이 창구를 막지 않게 한다.
  ensure(s.inquiries.filter(x=>x.userId===a.id&&x.status==="open").length<3,"답변을 기다리는 문의가 있어요. 답변을 받은 뒤에 다시 보내주세요.",429);
  const row={id:id(),userId:a.id,name:a.name,message:text,status:"open",replies:[] as Row[],at:stamp};
  s.inquiries.push(row);output={inquiryId:row.id};
 }
 else if(type==="replySupport"){
  ensure(owner,"서비스 운영자만 답변할 수 있어요.",403);
  const row=s.inquiries.find(x=>x.id===String(c.inquiryId??""));
  ensure(row,"문의를 찾을 수 없어요.",404);
  const text=textValue(c.message,1000);
  row!.replies=[...(row!.replies??[]),{at:stamp,message:text}];
  row!.status="answered";
  userNotice(s,row!.userId,"문의에 답변이 등록되었어요",text.slice(0,120),undefined,"team");
 }
 // --- 서비스 공지 (팀 공지와 다르다. 모든 사용자에게 보인다) ---
 else if(type==="postAnnouncement"){
  ensure(owner,"서비스 운영자만 올릴 수 있어요.",403);
  s.announcements.push({id:id(),title:textValue(c.title,80),body:textValue(c.body,2000),
   version:textValue(c.version,20,false),at:stamp});
 }
 else if(type==="removeAnnouncement"){
  ensure(owner,"서비스 운영자만 지울 수 있어요.",403);
  const before=s.announcements.length;
  s.announcements=s.announcements.filter(x=>x.id!==String(c.noticeId??""));
  ensure(s.announcements.length<before,"공지를 찾을 수 없어요.",404);
 }
 else if(type==="anonymizeMember"){
  ensure(owner,"서비스 운영자만 처리할 수 있어요.",403);
  const target=String(c.userId??"").trim();
  ensure(target,"어떤 사람의 기록인지 알려주세요.");
  // 아직 쓰고 있는 계정은 가리지 않는다. 탈퇴한 사람의 요청만 처리한다.
  ensure(!s.users.some(x=>x.id===target),"아직 탈퇴하지 않은 계정이에요. 탈퇴한 뒤에 처리할 수 있어요.",409);
  const rows=s.members.filter(x=>x.userId===target&&x.name!==ANON_NAME);
  ensure(rows.length,"바꿀 기록을 찾지 못했어요.",404);
  for(const x of rows){x.name=ANON_NAME;x.photo="";}
  output={changed:rows.length};
 }
 // 전국 랭킹 참여 켜기·끄기. 본인만 바꾼다. 꺼도 기록은 그대로, 전국 목록에서만 빠진다.
 else if(type==="setRankPublic"){const u=s.users.find(x=>x.id===a.id)!;u.rankPublic=c.on===true;u.rankPublicAt=stamp;}
 else if(type==="readNotifications"){for(const n of s.notifications.filter(x=>x.userId===a.id))n.read=true;}
 else if(type==="correctRequest"){requireTeam(s,t,a.id);for(const m of s.members.filter(x=>x.teamId===t&&["captain","manager"].includes(x.role)&&x.status==="active"))userNotice(s,m.userId,"기록 정정 요청",a.name+": "+textValue(c.message,500),t,"records");}
 else throw new AppError("지원하지 않는 작업이에요.");
 s.audit.push({id:id(),actor:a.id,teamId:t||null,type,at:stamp,gameId:c.gameId??null,reason:c.reason??null});return output;
}
export function visibleState(s:State,userId:string,selected?:string){
 const owner=isOwner(s,userId),my=s.members.filter(m=>m.userId===userId),active=my.filter(m=>m.status==="active"&&["active","suspended"].includes(teamOf(s,m.teamId)?.status)),team=active.find(x=>x.teamId===selected)??active[0];
 const tid=team?.teamId;const activeAccess=active.some(m=>teamOf(s,m.teamId)?.status==="active");
 const ownTeams=s.teams.filter(t=>t.applicant===userId);const publicTeams=s.teams.filter(t=>t.status==="active"||owner||active.some(m=>m.teamId===t.id)||t.applicant===userId).map(t=>{const full=owner||active.some(m=>m.teamId===t.id)||t.applicant===userId;return full?t:{id:t.id,name:t.name,region:t.region,description:t.description,format:t.format,days:t.days,level:t.level,status:t.status,color:t.color,logo:t.logo,rules:t.rules??""}});
 const games=s.games.filter(g=>tid&&containsTeam(g,tid));const listings=activeAccess?s.games.filter(g=>g.listing==="open"&&g.status==="scheduled"&&Date.parse(g.start)>Date.now()&&teamOf(s,g.home)?.status==="active"):[];
 const members=tid?s.members.filter(m=>m.teamId===tid&&(m.status==="active"||m.status==="left"||m.status==="removed"||team.role==="captain")):[];
 const myGuestRows=s.guests.filter(x=>x.userId===userId);const guestGame=(gid:string)=>s.games.find(y=>y.id===gid);
 return {teams:publicTeams,members,mine:my,ownTeams,teamId:tid??"",role:team?.role??"",isOwner:owner,retired:owner?retiredPeople(s):[],
  myTotals:myTotals(s,userId),
  rankPublic:s.users.find(x=>x.id===userId)?.rankPublic===true,national:nationalRanking(s,userId),
  // 문의는 본인 것만 본다. 운영자는 답변해야 하므로 전부 본다.
  inquiries:s.inquiries.filter(x=>owner||x.userId===userId).sort((x,y)=>String(y.at).localeCompare(String(x.at))).map(x=>({...x,mine:x.userId===userId})),
  announcements:[...s.announcements].sort((x,y)=>String(y.at).localeCompare(String(x.at))),
  setupNeeded:!s.settings.some(x=>x.id==="owner"),games,// 승인된 용병도 그 경기에 뛰는 사람이다. 예전에는 참여 인원에서 빠져 있어
 // "9명 참여 예정" 이 실제와 달랐다. 팀원 명단(roster)과는 따로 둔다 —
 // 용병은 팀원이 아니고 출석·선수 통계에도 넣지 않는다(ASM-04).
 sides:s.sides.filter(x=>x.teamId===tid).map(z=>({...z,mvp:mvpView(z,team?.id),roster:rosterFor(s,z,s.games.find(g=>g.id===z.gameId)!),draft:attendanceDraft(s,z,s.games.find(g=>g.id===z.gameId)!),
  guestRoster:s.guests.filter(x=>x.gameId===z.gameId&&x.teamId===tid&&x.status==="approved").map(x=>({id:x.id,name:x.name,number:x.number,position:x.position}))})),listings,
 requests:s.requests.filter(r=>r.teamId===tid||(tid&&isCaptain(s,tid,userId)&&s.games.some(g=>g.id===r.gameId&&g.home===tid))),
 // 공지는 고정한 것을 먼저, 그다음 최근에 쓴 것부터 보여준다. 예전에는 저장된
 // 차례(=오래된 것 먼저) 그대로 나가서 새 공지가 아래에 묻혔다.
 notices:s.notices.filter(x=>x.teamId===tid).sort((x,y)=>(y.pinned?1:0)-(x.pinned?1:0)||String(y.at).localeCompare(String(x.at))),notifications:s.notifications.filter(n=>n.userId===userId&&(!n.teamId||active.some(m=>m.teamId===n.teamId)||my.some(m=>m.teamId===n.teamId))),
 guests:tid?s.guests.filter(x=>x.teamId===tid):[],
 myGuests:myGuestRows.map(x=>{const gm=guestGame(x.gameId);return {...x,teamName:teamOf(s,x.teamId)?.name??"",start:gm?.start??"",venue:gm?.venue??"",gameStatus:gm?.status??""}}),
 guestListings:s.sides.filter(z=>{const gm=guestGame(z.gameId);return guestStatusOf(z)==="open"&&!!gm&&gm.status==="scheduled"&&Date.parse(gm.start)>Date.now()&&teamOf(s,z.teamId)?.status==="active"}).map(z=>{const gm=guestGame(z.gameId)!;return {id:z.id,gameId:gm.id,teamId:z.teamId,teamName:teamOf(s,z.teamId)?.name??"",start:gm.start,end:gm.end,venue:gm.venue,address:gm.address,region:gm.region,format:gm.format,cost:gm.cost,secured:gm.secured,needed:z.guestNeeded??0,approved:approvedGuests(s,gm.id,z.teamId),applied:myGuestRows.find(x=>x.gameId===gm.id&&x.teamId===z.teamId&&["pending","approved"].includes(x.status))?.status??""}}),
 invites:s.invites.filter(x=>x.teamId===tid&&team?.role==="captain"),audit:owner?s.audit.slice(-100).reverse():[]};
}
// MVP 투표를 화면에 보낼 모양. 표(누가 누구를 뽑았는지)는 보내지 않는다 — 비밀 투표.
// 마감 전: 내가 고른 사람과 몇 명이 투표했는지만. 마감 후: 사람별 득표 수와 MVP.
export function mvpView(side:Row,me?:string,now=Date.now()){
 const p=side.mvp;if(!p)return null;
 const votes=(p.votes??{}) as Record<string,string>,closed=now>=Date.parse(p.closesAt);
 const tally:Record<string,number>={};if(closed)for(const c of Object.values(votes))tally[c]=(tally[c]??0)+1;
 return {openAt:p.openAt,closesAt:p.closesAt,closed,mine:me?votes[me]??"":"",voted:Object.keys(votes).length,
  eligible:attendedMembers(side).length,winners:mvpWinners(side,now),tally:closed?tally:{}};
}
// 내가 뛴 모든 팀의 기록을 합산한다. 팀별 화면(summaries)과 달리 팀 경계를 넘는다.
// 팀을 옮기거나 여러 팀에서 뛰어도 "내가 쌓은 것"은 하나로 보여야 한다.
export function myTotals(s:State,userId:string){
 const mine=s.members.filter(m=>m.userId===userId&&m.status!=="rejected");
 const ids=new Set(mine.map(m=>m.id));
 let played=0,attend=0,eligible=0,goals=0,assists=0;
 for(const side of s.sides){
  const game=s.games.find(g=>g.id===side.gameId);
  if(!game||game.status!=="completed")continue;
  const me=rosterFor(s,side,game).find((r:Row)=>ids.has(r.id));
  if(!me)continue;
  played++;
  if(side.attendanceFinal){eligible++;if(side.attendance?.[me.id])attend++}
  if(side.recordsFinal){goals+=side.records?.[me.id]?.goals??0;assists+=side.records?.[me.id]?.assists??0}
 }
 return {teams:new Set(mine.map(m=>m.teamId)).size,played,attend,eligible,
  rate:eligible?Math.round(attend/eligible*100):null,goals,assists,points:goals+assists};
}

export function summaries(v:any,from:string,to:string){
 // 자체전은 우리 팀끼리라 팀 전적(경기 수·승무패·득실)에서 빼고, 선수 기록(출석·골·도움·MVP)에는 넣는다.
 const allGames=v.games.filter((g:Row)=>g.status==="completed"&&g.start>=from&&g.start<to);const games=allGames.filter((g:Row)=>!isIntra(g));const intra=allGames.length-games.length;
 const recorded=allGames.filter((g:Row)=>g.result?.status==="confirmed");const scored=games.filter((g:Row)=>g.result?.status==="confirmed");let wins=0,draws=0,losses=0,goals=0,against=0;
 for(const g of scored){const own=g.home===v.teamId?g.result.a:g.result.b,other=g.home===v.teamId?g.result.b:g.result.a;goals+=own;against+=other;if(own>other)wins++;else if(own===other)draws++;else losses++;}
 const attendanceGames=allGames.filter((g:Row)=>v.sides.some((s:Row)=>s.gameId===g.id&&s.attendanceFinal));const players:Row[]=v.members.filter((m:Row)=>m.status!=="pending"&&m.status!=="rejected").map((m:Row)=>{let attend=0,eligible=0,g=0,a=0,mvp=0;for(const side of v.sides){if(!allGames.some((x:Row)=>x.id===side.gameId))continue;if(side.attendanceFinal&&(side.roster??[]).some((r:any)=>r.id===m.id)){eligible++;if(side.attendance[m.id])attend++;}if(side.recordsFinal&&recorded.some((x:Row)=>x.id===side.gameId)){g+=side.records[m.id]?.goals??0;a+=side.records[m.id]?.assists??0;}if((side.mvp?.winners??[]).includes(m.id))mvp++;}return {...m,attend,eligible,rate:eligible?Math.round(attend/eligible*100):null,goals:g,assists:a,points:g+a,mvp}});
 return {played:games.length,intra,scored:scored.length,wins,draws,losses,goals,against,winRate:scored.length?+(wins/scored.length*100).toFixed(1):null,players,attendanceConfirmed:attendanceGames.length,average:attendanceGames.length?+(players.reduce((sum,p)=>sum+p.attend,0)/attendanceGames.length).toFixed(1):null,pending:games.length-scored.length};
}
