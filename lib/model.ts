export type Row={id:string;[key:string]:any};
export type State={users:Row[];teams:Row[];members:Row[];games:Row[];sides:Row[];requests:Row[];guests:Row[];notices:Row[];notifications:Row[];invites:Row[];audit:Row[];receipts:Row[];settings:Row[]};
export const collections=["users","teams","members","games","sides","requests","guests","notices","notifications","invites","audit","receipts","settings"] as const;
export const blank=():State=>({users:[],teams:[],members:[],games:[],sides:[],requests:[],guests:[],notices:[],notifications:[],invites:[],audit:[],receipts:[],settings:[]});
export type Actor={id:string;name:string;ownerSetup?:boolean;ownerReset?:boolean};
export class AppError extends Error{constructor(message:string,public status=400){super(message)}}
export const ensure=(value:any,message:string,status=400)=>{if(!value)throw new AppError(message,status)};
export const iso=(ms=Date.now())=>new Date(ms).toISOString();
export const id=()=>crypto.randomUUID();
export const teamOf=(s:State,t:string)=>s.teams.find(x=>x.id===t);
export const membership=(s:State,t:string,u:string)=>s.members.find(x=>x.teamId===t&&x.userId===u&&x.status==="active");
export const isOwner=(s:State,u:string)=>s.settings.find(x=>x.id==="owner")?.userId===u;
export const isManager=(s:State,t:string,u:string)=>["captain","manager"].includes(membership(s,t,u)?.role);
export const isCaptain=(s:State,t:string,u:string)=>membership(s,t,u)?.role==="captain";
export const sideOf=(s:State,g:string,t:string)=>s.sides.find(x=>x.gameId===g&&x.teamId===t);
export const guestStatusOf=(z:Row)=>z?.guestStatus??"none";
export const approvedGuests=(s:State,g:string,t:string)=>s.guests.filter(x=>x.gameId===g&&x.teamId===t&&x.status==="approved").length;
export function requireTeam(s:State,t:string,u:string,level="member",write=true){const team=teamOf(s,t);ensure(team,"팀을 찾을 수 없어요.",404);const m=membership(s,t,u);ensure(m&&((level==="member")||(level==="manager"&&["captain","manager"].includes(m.role))||(level==="captain"&&m.role==="captain")),"이 팀에서 해당 작업을 할 권한이 없어요.",403);ensure(!write||team!.status==="active","현재 이용 가능한 팀이 아니에요.",403);return m!}
export const textValue=(v:any,max=200,required=true)=>{const x=String(v??"").trim();ensure(x.length<=max&&(!required||x.length>0),"입력 내용의 길이를 확인해주세요.");return x};
export const integer=(v:any,min=0,max=99)=>{const n=Number(v);ensure(Number.isInteger(n)&&n>=min&&n<=max,"숫자 범위를 확인해주세요.");return n};
export const imageKey=(v:unknown,prefix:string)=>{const key=String(v??"").trim();ensure(key.length<=200,"이미지 정보를 확인해주세요.");ensure(!key||(key.startsWith(prefix)&&/^[A-Za-z0-9/_.-]+$/.test(key)&&!key.includes("..")),"이미지 정보를 확인해주세요.");return key};
export const containsTeam=(g:Row,t:string)=>g.home===t||g.away===t;
export function currentVote(side:Row,memberId:string,cutoff=Infinity){const history=side.votes?.[memberId]??[];return [...history].filter((v:any)=>Date.parse(v.at)<=cutoff).at(-1)?.value??"none"}
export function eligibleMembers(s:State,side:Row,g:Row){const when=Math.min(Date.now(),Date.parse(g.start));return s.members.filter(m=>m.teamId===side.teamId&&(m.periods??[]).some((p:any)=>Date.parse(p.start)<=when&&(!p.end||Date.parse(p.end)>when)))}
export function rosterFor(s:State,side:Row,g:Row){return side.roster??eligibleMembers(s,side,g).map(m=>({id:m.id,name:m.name,number:m.number,position:m.position}))}
export function attendanceDraft(s:State,side:Row,g:Row){return Object.fromEntries(rosterFor(s,side,g).map((m:any)=>[m.id,currentVote(side,m.id,Date.parse(g.start))==="yes"]))}
export function newSide(g:Row,t:string):Row{return {id:g.id+":"+t,gameId:g.id,teamId:t,deadline:g.start,meeting:"",note:"",needed:11,votes:{},attendance:{},attendanceFinal:false,records:{},recordsFinal:false,guestNeeded:0,guestStatus:"none"}}
function notice(s:State,t:string,title:string,body:string,gameId?:string){for(const m of s.members.filter(x=>x.teamId===t&&x.status==="active"))s.notifications.push({id:id(),userId:m.userId,teamId:t,title,body,gameId,read:false,at:iso()})}
function userNotice(s:State,u:string,title:string,body:string,t?:string){s.notifications.push({id:id(),userId:u,teamId:t,title,body,read:false,at:iso()})}
function checkConflict(s:State,t:string,start:string,end:string,except:string){ensure(!s.games.some(g=>g.id!==except&&g.status!=="cancelled"&&containsTeam(g,t)&&Date.parse(g.start)<Date.parse(end)&&Date.parse(g.end)>Date.parse(start)),"같은 시간에 등록된 경기가 있어요. 기존 일정을 확인해주세요.",409)}
function dates(start:any,end:any){const a=Date.parse(start),b=Date.parse(end);ensure(Number.isFinite(a)&&Number.isFinite(b)&&b>a&&b-a<=24*3600e3,"경기 시작·종료 시간을 확인해주세요.");return {start:iso(a),end:iso(b)}}
export function applyCommand(s:State,a:Actor,c:any,now=Date.now()):any{
 const type=textValue(c.type,50),t=String(c.teamId??""),stamp=iso(now);let output:any={};
 if(!s.users.find(u=>u.id===a.id))s.users.push({id:a.id,name:a.name,at:stamp});
 const owner=isOwner(s,a.id);
 if(type==="setupOwner"){const current=s.settings.find(x=>x.id==="owner");ensure(!current||a.ownerReset,"운영자 설정이 이미 완료되었어요.",409);ensure(a.ownerSetup,"초기 설정 코드가 올바르지 않아요.",403);if(current)current.userId=a.id;else s.settings.push({id:"owner",userId:a.id});}
 else if(type==="createTeam"){
  ensure(s.teams.filter(x=>x.applicant===a.id&&x.status==="pending").length<3,"대기 중인 팀 신청을 먼저 확인해주세요.");
  const team={id:id(),name:textValue(c.name,40),region:textValue(c.region,40),description:textValue(c.description,500,false),format:textValue(c.format||"11인제",20),days:textValue(c.days||"주말",30),level:textValue(c.level||"중",20),status:"pending",applicant:a.id,applicantName:a.name,at:stamp,reason:"",color:"green"};
  s.teams.push(team);const o=s.settings.find(x=>x.id==="owner");if(o)userNotice(s,o.userId,"새로운 팀 등록 요청",team.name+"의 등록을 확인해주세요.");output={teamId:team.id};
 }
 else if(type==="approveTeam"||type==="rejectTeam"||type==="suspendTeam"||type==="restoreTeam"){
  ensure(owner,"서비스 운영자만 처리할 수 있어요.",403);const team=teamOf(s,t);ensure(team,"팀을 찾을 수 없어요.",404);
  if(type==="approveTeam"){ensure(team!.status==="pending","이미 처리된 신청이에요.",409);team!.status="active";s.members.push({id:id(),teamId:t,userId:team!.applicant,name:team!.applicantName,role:"captain",status:"active",number:1,position:"MF",periods:[{start:stamp}],at:stamp});}
  if(type==="rejectTeam"){ensure(team!.status==="pending","이미 처리된 신청이에요.",409);team!.status="rejected";team!.reason=textValue(c.reason,300);}
  if(type==="suspendTeam"){ensure(team!.status==="active","활성 팀만 정지할 수 있어요.");team!.status="suspended";team!.reason=textValue(c.reason,300);}
  if(type==="restoreTeam"){ensure(team!.status==="suspended","정지된 팀이 아니에요.");team!.status="active";team!.reason="";}
  userNotice(s,team!.applicant,"팀 등록 상태 변경",team!.name+" · "+team!.status,t);
 }
 else if(type==="joinTeam"){
  const team=teamOf(s,t);ensure(team?.status==="active","가입 가능한 팀이 아니에요.",404);const existing=s.members.find(m=>m.userId===a.id&&m.teamId===t);
  ensure(!existing||!["active","pending"].includes(existing.status),"이미 가입했거나 승인 대기 중이에요.",409);
  const data={userId:a.id,teamId:t,name:textValue(c.name||a.name,30),position:textValue(c.position||"MF",12),number:integer(c.number??0,0,99),role:"member",status:"pending",at:stamp};
  if(existing)Object.assign(existing,data);else s.members.push({id:id(),periods:[],...data});
  for(const m of s.members.filter(x=>x.teamId===t&&x.role==="captain"&&x.status==="active"))userNotice(s,m.userId,"팀원 가입 요청",data.name+"님이 가입을 신청했어요.",t);
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
  userNotice(s,m!.userId,type==="editMember"?"선수 정보 변경":"팀 가입·권한 변경",teamOf(s,t)!.name+(type==="editMember"?"에서 주장이 선수 정보를 변경했어요.":"의 팀원 상태가 변경되었어요."),t);
 }
 else if(type==="leaveTeam"||type==="cancelJoin"){
  const m=s.members.find(x=>x.teamId===t&&x.userId===a.id);ensure(m,"소속 정보를 찾을 수 없어요.");ensure(m!.role!=="captain","주장을 먼저 인계해주세요.");
  ensure(type==="cancelJoin"?m!.status==="pending":m!.status==="active","현재 상태에서는 처리할 수 없어요.");m!.status="left";if(m!.periods.at(-1))m!.periods.at(-1).end=stamp;
 }
 else if(type==="editProfile"){
  const m=requireTeam(s,t,a.id,"member");m.name=textValue(c.name,30);m.number=integer(c.number,0,99);m.position=textValue(c.position,12);
 }
 else if(type==="editTeam"){requireTeam(s,t,a.id,"captain");const team=teamOf(s,t)!;team.name=textValue(c.name,40);team.region=textValue(c.region,40);team.description=textValue(c.description,500,false);}
 else if(type==="createGame"){
  requireTeam(s,t,a.id,"manager");const d=dates(c.start,c.end);checkConflict(s,t,d.start,d.end,"");
  const g={id:id(),home:t,away:null,external:textValue(c.external,60,false),...d,venue:textValue(c.venue,100),address:textValue(c.address,200),region:textValue(c.region||teamOf(s,t)!.region,40),format:textValue(c.format||"11인제",20),secured:c.secured!==false,cost:integer(c.cost??0,0,10000000),status:"scheduled",listing:c.listing?"open":"none",revision:1,result:null,at:stamp};
  ensure(!g.external||!c.listing,"수기 상대팀과 모집을 동시에 설정할 수 없어요.");ensure(!c.listing||Date.parse(g.start)>now,"지난 경기로 모집할 수 없어요.");
  if(c.listing)requireTeam(s,t,a.id,"captain");s.games.push(g);const side=newSide(g,t);side.needed=integer(c.needed??11,1,50);side.note=textValue(c.note,500,false);s.sides.push(side);notice(s,t,"새 경기 일정",g.venue+" · "+g.start,g.id);output={gameId:g.id};
 }
 else if(type==="applyMatch"||type==="withdrawMatch"||type==="acceptMatch"||type==="rejectMatch"){
  requireTeam(s,t,a.id,"captain");const g=s.games.find(x=>x.id===c.gameId);ensure(g,"경기를 찾을 수 없어요.",404);
  if(type==="applyMatch"){
   ensure(g!.home!==t&&g!.listing==="open"&&g!.status==="scheduled"&&Date.parse(g!.start)>now&&teamOf(s,g!.home)?.status==="active","신청할 수 없는 경기예요.",409);checkConflict(s,t,g!.start,g!.end,g!.id);
   const old=s.requests.find(x=>x.gameId===g!.id&&x.teamId===t);ensure(!old||old.status!=="pending","이미 신청한 경기예요.",409);
   const value={gameId:g!.id,teamId:t,by:a.id,message:textValue(c.message,300,false),status:"pending",version:g!.revision,at:stamp};if(old)Object.assign(old,value);else s.requests.push({id:id(),...value});notice(s,g!.home,"새 매칭 신청",teamOf(s,t)!.name+"에서 경기를 신청했어요.",g!.id);
  } else {
   const r=s.requests.find(x=>x.id===c.requestId&&x.gameId===g!.id);ensure(r?.status==="pending","이미 처리된 신청이에요.",409);
   if(type==="withdrawMatch"){ensure(r!.teamId===t,"자신의 신청만 철회할 수 있어요.",403);r!.status="withdrawn";}
   else {ensure(g!.home===t,"모집 팀 주장만 처리할 수 있어요.",403);
    if(type==="rejectMatch")r!.status="rejected";else{
     ensure(g!.listing==="open"&&!g!.away&&g!.status==="scheduled"&&Date.parse(g!.start)>now,"이미 종료된 모집이에요.",409);ensure(teamOf(s,r!.teamId)?.status==="active","상대팀의 승인을 확인해주세요.");ensure(r!.version===g!.revision,"조건이 변경되어 상대팀이 다시 신청해야 해요.",409);
     checkConflict(s,t,g!.start,g!.end,g!.id);checkConflict(s,r!.teamId,g!.start,g!.end,g!.id);
     g!.away=r!.teamId;g!.listing="matched";g!.revision++;s.sides.push(newSide(g!,r!.teamId));for(const v of s.requests.filter(x=>x.gameId===g!.id&&x.status==="pending"))v.status=v.id===r!.id?"accepted":"closed";
     notice(s,t,"매칭 확정",teamOf(s,r!.teamId)!.name+"와 경기가 확정되었어요.",g!.id);notice(s,r!.teamId,"매칭 확정",teamOf(s,t)!.name+"와 경기가 확정되었어요.",g!.id);
    }
   }
  }
 }
 else if(["vote","attendance","records","completeGame","cancelGame","result","confirmResult","changeGame","confirmChange","sideSettings","openListing","closeListing","setOpponent"].includes(type)){
  const g=s.games.find(x=>x.id===c.gameId);ensure(g&&containsTeam(g,t),"팀 경기를 찾을 수 없어요.",404);
  const captainActions=["cancelGame","result","confirmResult","changeGame","confirmChange","openListing","closeListing","completeGame","setOpponent"];
  const m=requireTeam(s,t,a.id,type==="vote"?"member":captainActions.includes(type)?"captain":"manager");
  const side=sideOf(s,g!.id,t);ensure(side,"경기 팀 정보를 찾을 수 없어요.",404);
  ensure(g!.status!=="cancelled","취소된 경기예요.",409);
  if(type==="vote"){ensure(g!.status==="scheduled"&&now<Math.min(Date.parse(side!.deadline),Date.parse(g!.start)),"참여 투표가 마감되었어요.",409);ensure(["yes","no","maybe"].includes(c.value),"응답을 선택해주세요.");(side!.votes[m.id]??=[]).push({value:c.value,at:stamp});}
  if(type==="sideSettings"){side!.note=textValue(c.note,500,false);side!.meeting=textValue(c.meeting,50,false);side!.needed=integer(c.needed??side!.needed,1,50);if(c.deadline){ensure(now<Date.parse(c.deadline)&&Date.parse(c.deadline)<=Date.parse(g!.start),"투표 마감 시간을 확인해주세요.");side!.deadline=iso(Date.parse(c.deadline));}}
  if(type==="completeGame"){ensure(now>=Date.parse(g!.end),"경기가 끝난 후 완료 처리할 수 있어요.");g!.status="completed";}
  if(type==="cancelGame"){if(g!.status==="completed")ensure(textValue(c.reason,300),"정정 사유를 입력해주세요.");g!.status="cancelled";g!.reason=textValue(c.reason,300);g!.listing="cancelled";g!.change=null;for(const r of s.requests.filter(x=>x.gameId===g!.id&&x.status==="pending"))r.status="closed";for(const z of s.sides.filter(x=>x.gameId===g!.id))if(guestStatusOf(z)==="open")z.guestStatus="closed";for(const r of s.guests.filter(x=>x.gameId===g!.id&&x.status==="pending"))r.status="closed";for(const tid of [g!.home,g!.away].filter(Boolean))notice(s,tid,"경기 취소",g!.reason,g!.id);}
  if(type==="setOpponent"){ensure(!g!.away&&g!.listing!=="open"&&!g!.result?.status,"외부 상대팀을 입력할 수 없는 경기예요.");g!.external=textValue(c.external,60);}
  if(type==="openListing"){ensure(g!.home===t&&!g!.away&&!g!.external&&Date.parse(g!.start)>now&&g!.status==="scheduled","상대팀 모집을 열 수 없는 경기예요.");g!.listing="open";}
  if(type==="closeListing"){ensure(g!.home===t&&!g!.away,"확정된 매칭은 경기 취소로 처리해주세요.");g!.listing="closed";for(const r of s.requests.filter(x=>x.gameId===g!.id&&x.status==="pending"))r.status="closed";}
  if(type==="attendance"){
   ensure(g!.status==="completed","경기 완료 처리 후 출석을 확정해주세요.");const roster=rosterFor(s,side!,g!);const values=c.values;ensure(values&&typeof values==="object","출석 정보를 확인해주세요.");
   ensure(Object.keys(values).every(k=>roster.some((x:any)=>x.id===k)),"이 경기의 출석 대상이 아닌 선수가 포함되어 있어요.");ensure(roster.every((x:any)=>typeof values[x.id]==="boolean"),"모든 선수의 출석을 확인해주세요.");
   side!.roster=roster;side!.attendance=values;side!.attendanceFinal=true;side!.attendanceAt=stamp;
   if(Object.entries(side!.records).some(([k,v]:any)=>!values[k]&&(v.goals||v.assists)))side!.recordsFinal=false;
  }
  if(type==="records"){
   ensure(g!.status==="completed"&&side!.attendanceFinal,"경기 완료와 출석 확정을 먼저 해주세요.");ensure(g!.result?.status==="confirmed","경기 결과 확정 후 개인 기록을 저장해주세요.");
   ensure(c.values&&typeof c.values==="object"&&!Array.isArray(c.values),"선수 기록을 확인해주세요.");const values:Record<string,{goals:number;assists:number}>={};for(const [k,v] of Object.entries(c.values) as any){ensure(side!.attendance[k]===true,"출석 확정된 선수만 기록할 수 있어요.");ensure(v&&typeof v==="object","선수 기록을 확인해주세요.");values[k]={goals:integer(v.goals),assists:integer(v.assists)};}
   const goals=(Object.values(values) as any[]).reduce((sum,v)=>sum+v.goals,0),assists=(Object.values(values) as any[]).reduce((sum,v)=>sum+v.assists,0);
   const total=g!.home===t?g!.result.a:g!.result.b,own=integer(c.ownGoals??0),unknown=integer(c.unknownGoals??0);
   ensure(goals+own+unknown===total,"선수 득점 + 상대 자책골 + 득점자 미상의 합이 팀 득점과 같아야 해요.");ensure(assists<=total-own,"어시스트 합계가 팀 득점을 초과해요.");
   side!.records=values;side!.ownGoals=own;side!.unknownGoals=unknown;side!.recordsFinal=true;side!.recordsAt=stamp;
  }
  if(type==="result"){
   ensure(g!.status==="completed","경기 완료 후 결과를 입력해주세요.");const own=integer(c.own),opponent=integer(c.opponent);ensure(g!.away||g!.external,"상대팀을 먼저 설정해주세요.");
   const proposed={a:g!.home===t?own:opponent,b:g!.home===t?opponent:own,by:t,status:g!.away?"pending":"confirmed",revision:(g!.resultSequence??g!.result?.revision??0)+1,at:stamp};
   g!.resultSequence=proposed.revision;
   if(!g!.away){g!.result=proposed;for(const z of s.sides.filter(x=>x.gameId===g!.id))z.recordsFinal=false;}
   else {g!.resultProposal=proposed;if(!g!.result)g!.result={status:"pending"};notice(s,g!.home===t?g!.away:g!.home,"경기 결과 확인 요청",own+" : "+opponent+" 결과를 확인해주세요.",g!.id);}
  }
  if(type==="confirmResult"){const p=g!.resultProposal;ensure(p&&p.by!==t&&c.revision===p.revision,"확인 가능한 상대팀의 최신 결과가 없어요.",409);if(c.agree===false){p.status="disputed";}else{g!.result={...p,status:"confirmed"};g!.resultProposal=null;for(const z of s.sides.filter(x=>x.gameId===g!.id))z.recordsFinal=false;}notice(s,p.by,c.agree===false?"경기 결과 이견":"경기 결과 확정","경기 결과 확인 상태가 변경되었어요.",g!.id);}
  if(type==="changeGame"){
   ensure(g!.status==="scheduled"&&now<Date.parse(g!.start),"이미 시작한 경기는 일정 변경을 할 수 없어요.");const d=dates(c.start,c.end);ensure(Date.parse(d.start)>now,"미래 일정을 선택해주세요.");const change={proposalId:id(),...d,venue:textValue(c.venue,100),address:textValue(c.address,200),cost:integer(c.cost??g!.cost,0,10000000),by:t,version:g!.revision};
   if(g!.away){g!.change=change;notice(s,g!.home===t?g!.away:g!.home,"일정 변경 제안",change.venue+" · "+change.start,g!.id);}
   else{checkConflict(s,t,d.start,d.end,g!.id);if(g!.listing!=="open")g!.external=textValue(c.external??g!.external,60,false);Object.assign(g!,change);g!.revision++;for(const z of s.sides.filter(x=>x.gameId===g!.id)){z.voteArchive=[...(z.voteArchive??[]),z.votes];z.votes={};z.deadline=g!.start;}for(const r of s.requests.filter(x=>x.gameId===g!.id&&x.status==="pending"))r.status="changed";}
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
   for(const m of s.members.filter(x=>x.teamId===t&&["captain","manager"].includes(x.role)&&x.status==="active"))userNotice(s,m.userId,"새 용병 신청",value.name+"님이 용병으로 신청했어요.",t);
   output={guestId:row.id};
  }
  else if(type==="withdrawGuest"){const r=find();ensure(r.userId===a.id,"자신의 신청만 철회할 수 있어요.",403);ensure(r.status==="pending","이미 처리된 신청이에요.",409);r.status="withdrawn";}
  else {
   requireTeam(s,t,a.id,"manager");
   if(type==="openGuests"){
    ensure(upcoming(),"시작 전 예정 경기에만 용병을 모집할 수 있어요.");const needed=integer(c.needed,1,30);
    ensure(needed>=count(),"이미 승인한 용병보다 적은 인원으로 줄일 수 없어요.");side!.guestNeeded=needed;
    if(count()>=needed){side!.guestStatus="closed";closePending();}
    else {side!.guestStatus="open";notice(s,t,"용병 모집 시작",g!.venue+" · "+needed+"명 모집",g!.id);}
   }
   if(type==="closeGuests"){ensure(guestStatusOf(side!)==="open","이미 마감된 모집이에요.",409);side!.guestStatus="closed";closePending();}
   if(type==="rejectGuest"){const r=find();ensure(r.status==="pending","대기 중인 신청이 아니에요.",409);r.status="rejected";userNotice(s,r.userId,"용병 신청 결과",teamOf(s,t)!.name+" 경기의 용병 신청이 거절되었어요.");}
   if(type==="approveGuest"){
    const r=find();ensure(r.status==="pending","이미 처리된 신청이에요.",409);ensure(upcoming(),"지난 경기의 용병은 승인할 수 없어요.",409);
    ensure(guestStatusOf(side!)==="open","용병 모집이 마감되었어요.",409);ensure(count()<limit(),"용병 모집 인원이 모두 찼어요.",409);
    r.status="approved";r.decidedAt=stamp;
    if(count()>=limit()){side!.guestStatus="closed";closePending();}
    userNotice(s,r.userId,"용병 신청 승인",teamOf(s,t)!.name+" 경기에 용병으로 확정되었어요.");
   }
   if(type==="cancelGuest"){
    const r=find();ensure(r.status==="approved","승인된 용병만 취소할 수 있어요.",409);r.status="cancelled";r.decidedAt=stamp;
    if(guestStatusOf(side!)==="closed"&&upcoming()&&count()<limit())side!.guestStatus="open";
    userNotice(s,r.userId,"용병 확정 취소",teamOf(s,t)!.name+" 경기의 용병 확정이 취소되었어요.");
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
 else if(type==="createNotice"){requireTeam(s,t,a.id,"captain");s.notices.push({id:id(),teamId:t,title:textValue(c.title,100),body:textValue(c.body,1500),pinned:c.pinned===true,at:stamp});notice(s,t,"새 팀 공지",c.title);}
 else if(type==="deleteNotice"){requireTeam(s,t,a.id,"captain");s.notices=s.notices.filter(x=>x.id!==c.noticeId||x.teamId!==t);}
 else if(type==="invite"){requireTeam(s,t,a.id,"captain");const token=crypto.randomUUID()+crypto.randomUUID();s.invites.push({id:token,teamId:t,expires:iso(now+7*24*3600e3),active:true});output={invite:token};}
 else if(type==="revokeInvite"){requireTeam(s,t,a.id,"captain");const v=s.invites.find(x=>x.id===c.inviteId&&x.teamId===t);ensure(v,"초대를 찾을 수 없어요.");v!.active=false;}
 else if(type==="readNotifications"){for(const n of s.notifications.filter(x=>x.userId===a.id))n.read=true;}
 else if(type==="correctRequest"){requireTeam(s,t,a.id);for(const m of s.members.filter(x=>x.teamId===t&&["captain","manager"].includes(x.role)&&x.status==="active"))userNotice(s,m.userId,"기록 정정 요청",a.name+": "+textValue(c.message,500),t);}
 else throw new AppError("지원하지 않는 작업이에요.");
 s.audit.push({id:id(),actor:a.id,teamId:t||null,type,at:stamp,gameId:c.gameId??null,reason:c.reason??null});return output;
}
export function visibleState(s:State,userId:string,selected?:string){
 const owner=isOwner(s,userId),my=s.members.filter(m=>m.userId===userId),active=my.filter(m=>m.status==="active"&&["active","suspended"].includes(teamOf(s,m.teamId)?.status)),team=active.find(x=>x.teamId===selected)??active[0];
 const tid=team?.teamId;const activeAccess=active.some(m=>teamOf(s,m.teamId)?.status==="active");
 const ownTeams=s.teams.filter(t=>t.applicant===userId);const publicTeams=s.teams.filter(t=>t.status==="active"||owner||active.some(m=>m.teamId===t.id)||t.applicant===userId).map(t=>{const full=owner||active.some(m=>m.teamId===t.id)||t.applicant===userId;return full?t:{id:t.id,name:t.name,region:t.region,description:t.description,format:t.format,days:t.days,level:t.level,status:t.status,color:t.color}});
 const games=s.games.filter(g=>tid&&containsTeam(g,tid));const listings=activeAccess?s.games.filter(g=>g.listing==="open"&&g.status==="scheduled"&&Date.parse(g.start)>Date.now()&&teamOf(s,g.home)?.status==="active"):[];
 const members=tid?s.members.filter(m=>m.teamId===tid&&(m.status==="active"||m.status==="left"||m.status==="removed"||team.role==="captain")):[];
 const myGuestRows=s.guests.filter(x=>x.userId===userId);const guestGame=(gid:string)=>s.games.find(y=>y.id===gid);
 return {teams:publicTeams,members,mine:my,ownTeams,teamId:tid??"",role:team?.role??"",isOwner:owner,setupNeeded:!s.settings.some(x=>x.id==="owner"),games,sides:s.sides.filter(x=>x.teamId===tid).map(z=>({...z,roster:rosterFor(s,z,s.games.find(g=>g.id===z.gameId)!),draft:attendanceDraft(s,z,s.games.find(g=>g.id===z.gameId)!)})),listings,
 requests:s.requests.filter(r=>r.teamId===tid||(tid&&isCaptain(s,tid,userId)&&s.games.some(g=>g.id===r.gameId&&g.home===tid))),
 notices:s.notices.filter(x=>x.teamId===tid),notifications:s.notifications.filter(n=>n.userId===userId&&(!n.teamId||active.some(m=>m.teamId===n.teamId)||my.some(m=>m.teamId===n.teamId))),
 guests:tid?s.guests.filter(x=>x.teamId===tid):[],
 myGuests:myGuestRows.map(x=>{const gm=guestGame(x.gameId);return {...x,teamName:teamOf(s,x.teamId)?.name??"",start:gm?.start??"",venue:gm?.venue??"",gameStatus:gm?.status??""}}),
 guestListings:s.sides.filter(z=>{const gm=guestGame(z.gameId);return guestStatusOf(z)==="open"&&!!gm&&gm.status==="scheduled"&&Date.parse(gm.start)>Date.now()&&teamOf(s,z.teamId)?.status==="active"}).map(z=>{const gm=guestGame(z.gameId)!;return {id:z.id,gameId:gm.id,teamId:z.teamId,teamName:teamOf(s,z.teamId)?.name??"",start:gm.start,end:gm.end,venue:gm.venue,address:gm.address,region:gm.region,format:gm.format,cost:gm.cost,secured:gm.secured,needed:z.guestNeeded??0,approved:approvedGuests(s,gm.id,z.teamId),applied:myGuestRows.find(x=>x.gameId===gm.id&&x.teamId===z.teamId&&["pending","approved"].includes(x.status))?.status??""}}),
 invites:s.invites.filter(x=>x.teamId===tid&&team?.role==="captain"),audit:owner?s.audit.slice(-100).reverse():[]};
}
export function summaries(v:any,from:string,to:string){
 const games=v.games.filter((g:Row)=>g.status==="completed"&&g.start>=from&&g.start<to);const scored=games.filter((g:Row)=>g.result?.status==="confirmed");let wins=0,draws=0,losses=0,goals=0,against=0;
 for(const g of scored){const own=g.home===v.teamId?g.result.a:g.result.b,other=g.home===v.teamId?g.result.b:g.result.a;goals+=own;against+=other;if(own>other)wins++;else if(own===other)draws++;else losses++;}
 const attendanceGames=games.filter((g:Row)=>v.sides.some((s:Row)=>s.gameId===g.id&&s.attendanceFinal));const players:Row[]=v.members.filter((m:Row)=>m.status!=="pending"&&m.status!=="rejected").map((m:Row)=>{let attend=0,eligible=0,g=0,a=0;for(const side of v.sides){if(!games.some((x:Row)=>x.id===side.gameId))continue;if(side.attendanceFinal&&(side.roster??[]).some((r:any)=>r.id===m.id)){eligible++;if(side.attendance[m.id])attend++;}if(side.recordsFinal&&scored.some((x:Row)=>x.id===side.gameId)){g+=side.records[m.id]?.goals??0;a+=side.records[m.id]?.assists??0;}}return {...m,attend,eligible,rate:eligible?Math.round(attend/eligible*100):null,goals:g,assists:a,points:g+a}});
 return {played:games.length,scored:scored.length,wins,draws,losses,goals,against,winRate:scored.length?+(wins/scored.length*100).toFixed(1):null,players,attendanceConfirmed:attendanceGames.length,average:attendanceGames.length?+(players.reduce((sum,p)=>sum+p.attend,0)/attendanceGames.length).toFixed(1):null,pending:games.length-scored.length};
}
