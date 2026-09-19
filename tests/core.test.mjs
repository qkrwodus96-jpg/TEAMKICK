import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';

// Run the real domain, repository and API code with a local SQLite-backed D1
// adapter and an explicit test identity provider. No live service is contacted.
const runtime=path.resolve('.sites-runtime/tests');
fs.mkdirSync(runtime,{recursive:true});
function compile(file,name,replace=s=>s){
  fs.writeFileSync(path.join(runtime,name),ts.transpileModule(replace(fs.readFileSync(file,'utf8')),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
compile('lib/model.ts','model.mjs');
compile('lib/store.ts','store.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;').replace('"./model"','"./model.mjs"'));
compile('lib/owner-config.ts','owner-config.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;'));
compile('lib/legal.ts','legal.mjs');
compile('lib/kakao.ts','kakao.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;').replace('"./model"','"./model.mjs"'));
compile('lib/schema.ts','schema.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;').replace('"./model"','"./model.mjs"'));
compile('lib/mail.ts','mail.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;').replace('"./model"','"./model.mjs"').replace('"./legal"','"./legal.mjs"'));
compile('lib/auth.ts','auth.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;').replace('import {sendMail,mailReady} from "./mail";','const sendMail=async(to,subject,text)=>{if(globalThis.__teamkickTestMailFail)throw new AppError("메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.",503);(globalThis.__teamkickTestMail??=[]).push({to,subject,text})};const mailReady=()=>globalThis.__teamkickTestMailReady!==false;').replace('"./model"','"./model.mjs"'));
// 화면 파일 전체는 이 환경에서 돌릴 수 없다. 검색 규칙 함수만 떼어 확인한다.
{
  const src=fs.readFileSync('app/screens.tsx','utf8');
  const start=src.indexOf('export const teamMatches=');
  const end=src.indexOf('};',start)+2;
  if(start<0)throw new Error('teamMatches 를 찾지 못했다');
  fs.writeFileSync(path.join(runtime,'screens-bits.mjs'),
    ts.transpileModule(src.slice(start,end).replace('(t:Row,q:string)','(t,q)'),
      {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
compile('lib/signup-policy.ts','signup-policy.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;'));
compile('lib/social.ts','social.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;').replace('"./model"','"./model.mjs"'));
compile('lib/push.ts','push.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;').replace('"./model"','"./model.mjs"'));
compile('app/api/health/route.ts','health.mjs',s=>s.replace('import {pushReady} from "@/lib/push";','const pushReady=()=>true;').replace('import {socialReady} from "@/lib/social";','const socialReady=(p)=>p==="google";').replace('import {APP_VERSION} from "@/lib/version";','const APP_VERSION="9.9.9";').replace('import {schemaStatus,BUILD} from "@/lib/schema";','const schemaStatus=async()=>globalThis.__teamkickTestSchema??{db:true,tables:{},error:""};const BUILD="test";').replace('import {storageReady} from "@/lib/images";','const storageReady=()=>true;').replace('import {placeSearchReady} from "@/lib/places";','const placeSearchReady=()=>true;').replace('import {mailReady,mailAccount,fromDomain} from "@/lib/mail";','const mailReady=()=>true;const mailAccount=async()=>"ok";const fromDomain=()=>"teamkick.co.kr";').replace('import {hashPassword,currentUser} from "@/lib/auth";','const hashPassword=async()=>"";const currentUser=async()=>globalThis.__teamkickTestIdentity;').replace('import {kakaoReady,kakaoSecretSet} from "@/lib/kakao";','const kakaoReady=()=>true;const kakaoSecretSet=()=>true;').replace('import {ownerCodeFromEnv} from "@/lib/owner-config";','const ownerCodeFromEnv=()=>true;').replace('"@/lib/store"','"./store.mjs"'));
compile('lib/backup.ts','backup.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;').replace('"./model"','"./model.mjs"').replace('"./schema"','"./schema.mjs"').replace('"./store"','"./store.mjs"'));
compile('app/api/backup/route.ts','backup-api.mjs',s=>s.replace('import {currentUser} from "@/lib/auth";','const currentUser=async()=>globalThis.__teamkickTestIdentity;').replace('import {ensureSchema} from "@/lib/schema";','const ensureSchema=async()=>{};').replace('"@/lib/store"','"./store.mjs"').replace('"@/lib/model"','"./model.mjs"').replace('"@/lib/backup"','"./backup.mjs"'));
compile('app/api/auth/route.ts','auth-api.mjs',s=>s.replace('"@/lib/signup-policy"','"./signup-policy.mjs"').replace('import {signUp,signIn,signOut,sessionCookie,clearedCookie,requestPasswordReset,resetPassword,limit,clientKey,verifyEmail,resendVerification,currentUser} from "@/lib/auth";','const signUp=async()=>{(globalThis.__teamkickSignups??=[]).push(1);return {user:{userId:"u",fullName:"새 사람"},token:"t",verificationSent:false}};const signIn=async()=>({user:{userId:"u",fullName:"기존 사람"},token:"t"});const signOut=async()=>{};const sessionCookie=()=>"";const clearedCookie=()=>"";const requestPasswordReset=async()=>{};const resetPassword=async()=>({user:{userId:"u",fullName:"기존 사람"},token:"t"});const limit=async()=>{};const clientKey=()=>"k";const verifyEmail=async()=>{};const resendVerification=async()=>true;const currentUser=async()=>globalThis.__teamkickTestIdentity;').replace('import {ensureSchema} from "@/lib/schema";','const ensureSchema=async()=>{};').replace('import {kakaoReady} from "@/lib/kakao";','const kakaoReady=()=>!!globalThis.__teamkickSocial;').replace('import {socialReady} from "@/lib/social";','const socialReady=()=>false;').replace('"@/lib/model"','"./model.mjs"'));
compile('app/api/app/route.ts','api.mjs',s=>s.replace('"@/lib/signup-policy"','"./signup-policy.mjs"').replace('import {socialReady} from "@/lib/social";','const socialReady=()=>true;').replace('import {wakeDevices} from "@/lib/push";','const wakeDevices=async(ids)=>{(globalThis.__teamkickTestWoken??=[]).push(...ids);return {sent:ids.length,failed:0}};').replace('import {currentUser,accountExists,closeAccount,clearedCookie} from "@/lib/auth";','const currentUser=async()=>globalThis.__teamkickTestIdentity;const accountExists=async(x)=>(globalThis.__teamkickTestAccounts??[]).includes(x);const closeAccount=async()=>{};const clearedCookie=()=>"";').replace('import {storageReady} from "@/lib/images";','const storageReady=()=>true;').replace('import {placeSearchReady} from "@/lib/places";','const placeSearchReady=()=>true;').replace('import {mailReady} from "@/lib/mail";','const mailReady=()=>true;').replace('import {ensureSchema} from "@/lib/schema";','const ensureSchema=async()=>{};').replace('import {kakaoReady} from "@/lib/kakao";','const kakaoReady=()=>true;').replace('"@/lib/store"','"./store.mjs"').replace('"@/lib/model"','"./model.mjs"').replace('"@/lib/owner-config"','"./owner-config.mjs"'));
globalThis.__teamkickTestEnv={};
const {blank,applyCommand,visibleState,summaries,sideOf,rosterFor,attendanceDraft,approvedGuests,REGIONS,iso,prune,KEEP,PRUNE_LIMIT,ANON_NAME,FORMATS,LEVELS,DAYS,levelOf,seoulStamp}=await import(path.join(runtime,'model.mjs'));
const repository=await import(path.join(runtime,'store.mjs'));
const auth=await import(path.join(runtime,'auth.mjs'));
const mail=await import(path.join(runtime,'mail.mjs'));
const legal=await import(path.join(runtime,'legal.mjs'));
const schema=await import(path.join(runtime,'schema.mjs'));
const kakao=await import(path.join(runtime,'kakao.mjs'));
const ownerConfig=await import(path.join(runtime,'owner-config.mjs'));
const backup=await import(path.join(runtime,'backup.mjs'));
const backupApi=await import(path.join(runtime,'backup-api.mjs'));
const health=await import(path.join(runtime,'health.mjs'));
const push=await import(path.join(runtime,'push.mjs'));
const social=await import(path.join(runtime,'social.mjs'));
const screens=await import(path.join(runtime,'screens-bits.mjs'));
const api=await import(path.join(runtime,'api.mjs'));
const authApi=await import(path.join(runtime,'auth-api.mjs'));
const NOW=Date.now(),DAY=864e5;
const owner={id:'owner',name:'운영자',ownerSetup:true},A={id:'a',name:'A 주장'},B={id:'b',name:'B 주장'},C={id:'c',name:'C 주장'},member={id:'player',name:'선수'};
function command(s,a,c,when=NOW){return applyCommand(s,a,c,when)}
function fixture(){
  const s=blank();command(s,owner,{type:'setupOwner'},NOW-40*DAY);
  const teams=[A,B,C].map((actor,i)=>{
    const {teamId}=command(s,actor,{type:'createTeam',name:'팀 '+i,region:'서울',description:'테스트 팀'},NOW-30*DAY);
    command(s,owner,{type:'approveTeam',teamId},NOW-30*DAY);return teamId;
  });return {s,a:teams[0],b:teams[1],c:teams[2]};
}
function addPlayer(s,teamId,actor=member,when=NOW-20*DAY){
  command(s,actor,{type:'joinTeam',teamId,name:actor.name,position:'MF',number:9},when);
  const m=s.members.find(x=>x.teamId===teamId&&x.userId===actor.id);
  command(s,A,{type:'approveMember',teamId,memberId:m.id},when);return m;
}
function game(s,teamId,{start=NOW+2*DAY,listing=false}={}){
  return command(s,A,{type:'createGame',teamId,start:iso(start),end:iso(start+7200e3),venue:'축구장',address:'서울 마포구',external:listing?'':'외부 FC',listing},start-DAY).gameId;
}
function matchFixture(){
  const f=fixture(),gameId=game(f.s,f.a,{listing:true,start:NOW+2*DAY});
  command(f.s,B,{type:'applyMatch',teamId:f.b,gameId});
  command(f.s,A,{type:'acceptMatch',teamId:f.a,gameId,requestId:f.s.requests[0].id});
  return {...f,gameId};
}
function guestFixture(){
  const f=fixture(),gameId=game(f.s,f.a,{start:NOW+3*DAY});
  command(f.s,A,{type:'openGuests',teamId:f.a,gameId,needed:2});
  return {...f,gameId};
}
function applyGuest(s,teamId,gameId,actor){return command(s,actor,{type:'applyGuest',teamId,gameId,name:actor.name,position:'FW',number:10}).guestId}
function localDatabase(){
  const db=new DatabaseSync(':memory:');
  for(const name of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())db.exec(fs.readFileSync(path.join('drizzle',name),'utf8'));
  const api={prepare(sql){return {sql,args:[],bind(...args){this.args=args;return this},async first(){return db.prepare(this.sql).get(...this.args)??null},async run(){const r=db.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes??0)}}},async all(){return {results:db.prepare(this.sql).all(...this.args)}}}},async batch(statements){db.exec('BEGIN IMMEDIATE');try{const out=statements.map(x=>({success:true,results:db.prepare(x.sql).all(...x.args)}));db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
  globalThis.__teamkickTestEnv.DB=api;return db;
}

// 알림을 누르면 그 소식이 있는 화면으로 가야 한다. 화면 이름을 teamId 자리에 잘못
// 넣으면 알림이 **아예 보이지 않게** 된다(보이는 알림은 teamId 로 걸러진다).
const VIEWS=['home','schedule','matching','records','team','admin'];
// 목적지는 "화면" 또는 "화면:탭" 이다. 매칭은 탭이 여럿이라 탭까지 적는다.
const TABS=['guest','received','mine','open','confirmed'];
const viewPart=to=>String(to||'').split(':')[0];
const tabPart=to=>String(to||'').split(':')[1]||'';
test('모든 알림이 갈 화면을 들고 있고, 화면 이름이 teamId 자리에 섞이지 않는다',()=>{
  const {s,a,b}=fixture();
  const m=addPlayer(s,a);
  const gameId=game(s,a,{listing:true,start:NOW+2*DAY});
  command(s,B,{type:'applyMatch',teamId:b,gameId});
  command(s,A,{type:'acceptMatch',teamId:a,gameId,requestId:s.requests[0].id});
  command(s,A,{type:'createNotice',teamId:a,title:'공지',body:'내용'});
  command(s,A,{type:'openGuests',teamId:a,gameId,needed:2});
  const guestId=applyGuest(s,a,gameId,C);
  command(s,A,{type:'approveGuest',teamId:a,gameId,guestId});
  command(s,A,{type:'editMember',teamId:a,memberId:m.id,name:'선수',position:'FW',number:7});
  command(s,member,{type:'correctRequest',teamId:a,message:'기록을 고쳐주세요'});
  assert.ok(s.notifications.length>6,'알림이 여러 종류 쌓여야 한다');
  // teamId 는 실제로 있는 팀이거나 비어 있어야 한다. 화면 이름이 그 자리에 들어가면
  // 그 알림은 화면에서 걸러져 **아예 보이지 않는다**(실제로 한 번 그렇게 만들었다).
  const teamIds=new Set(s.teams.map(x=>x.id));
  for(const n of s.notifications){
    assert.ok(VIEWS.includes(viewPart(n.to)),n.title+' 알림에 갈 화면이 없다: '+n.to);
    assert.ok(!tabPart(n.to)||TABS.includes(tabPart(n.to)),n.title+' 의 탭 이름이 이상하다: '+n.to);
    assert.ok(!n.teamId||teamIds.has(n.teamId),n.title+' 의 teamId 자리에 엉뚱한 값이 들어갔다: '+n.teamId);
    assert.ok(!VIEWS.includes(n.teamId),n.title+' 의 teamId 자리에 화면 이름이 들어갔다');
  }
  // 경기가 딸린 알림은 따로 적지 않아도 일정 화면으로 간다.
  const g=s.notifications.find(n=>n.title==='새 경기 일정');
  assert.equal(g.to,'schedule');
  assert.equal(s.notifications.find(n=>n.title==='새 팀 공지').to,'home');
  assert.equal(s.notifications.find(n=>n.title==='매칭 확정').to,'matching');
  // 용병·매칭 신청은 매칭 안에서도 갈 탭이 다르다. 화면까지만 보내면 묻힌다.
  assert.equal(s.notifications.find(n=>n.title==='새 매칭 신청').to,'matching:received');
  assert.equal(s.notifications.find(n=>n.title==='용병 모집 시작').to,'matching:guest');
  assert.equal(s.notifications.find(n=>n.title==='새 용병 신청').to,'matching:guest');
  assert.equal(s.notifications.find(n=>n.title==='기록 정정 요청').to,'records');
});

test('주장은 올린 공지의 알림을 다시 보낼 수 있고, 6시간 안에는 다시 못 보낸다',()=>{
  const {s,a}=fixture();
  addPlayer(s,a);
  const {noticeId}=command(s,A,{type:'createNotice',teamId:a,title:'이번 주 경기',body:'집합'},NOW);
  assert.ok(noticeId,'공지 id 를 돌려줘야 다시 보낼 수 있다');
  // 올린 직후에는 방금 알림이 나갔으므로 다시 보낼 수 없다.
  assert.throws(()=>command(s,A,{type:'notifyNotice',teamId:a,noticeId},NOW+60e3),/6시간/);
  const before=s.notifications.filter(n=>n.title==='팀 공지 알림').length;
  const out=command(s,A,{type:'notifyNotice',teamId:a,noticeId},NOW+7*3600e3);
  assert.equal(out.notified,1,'글쓴이 본인을 뺀 팀원 수만큼 보낸다');
  const sent=s.notifications.filter(n=>n.title==='팀 공지 알림');
  assert.equal(sent.length,before+1);
  assert.equal(sent.at(-1).to,'home');
  assert.ok(sent.every(n=>n.userId!==A.id),'글쓴이 본인에게는 보내지 않는다');
  // 주장만 보낼 수 있다.
  assert.throws(()=>command(s,member,{type:'notifyNotice',teamId:a,noticeId},NOW+20*3600e3),/권한/);
  assert.throws(()=>command(s,A,{type:'notifyNotice',teamId:a,noticeId:'없는-공지'},NOW+20*3600e3),/찾을 수 없/);
});

test('승인된 용병이 그 경기의 참여 인원에 들어간다',()=>{
  const {s,a}=fixture();
  addPlayer(s,a);
  const gameId=game(s,a,{start:NOW+3*DAY});
  command(s,A,{type:'openGuests',teamId:a,gameId,needed:2});
  const before=visibleState(s,A.id,a).sides.find(z=>z.gameId===gameId);
  assert.deepEqual(before.guestRoster,[],'승인 전에는 비어 있어야 한다');
  const guestId=applyGuest(s,a,gameId,C);
  const pending=visibleState(s,A.id,a).sides.find(z=>z.gameId===gameId);
  assert.deepEqual(pending.guestRoster,[],'신청만 해서는 들어가지 않는다');
  command(s,A,{type:'approveGuest',teamId:a,gameId,guestId});
  const after=visibleState(s,A.id,a).sides.find(z=>z.gameId===gameId);
  assert.equal(after.guestRoster.length,1,'승인하면 참여 인원에 들어간다');
  assert.equal(after.guestRoster[0].name,C.name);
  // 용병은 팀원 명단·출석에는 넣지 않는다(ASM-04).
  assert.ok(!after.roster.some(x=>x.name===C.name),'용병이 팀원 명단에 섞이면 안 된다');
  command(s,A,{type:'cancelGuest',teamId:a,gameId,guestId});
  assert.deepEqual(visibleState(s,A.id,a).sides.find(z=>z.gameId===gameId).guestRoster,[],
    '확정을 취소하면 참여 인원에서도 빠진다');
});

// T20: 새 가입은 소셜로만 받는다. 화면에서 감추는 것만으로는 부족하고 서버가 막아야 한다.
// 다만 소셜이 하나도 준비되지 않은 곳에서는 막으면 아무도 가입할 수 없게 된다.
async function authPost(body){
  const res=await authApi.POST(new Request('https://teamkick.test/api/auth',
    {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
  return {status:res.status,body:await res.json()};
}
test('기본 정책은 이메일 가입을 거절하고 기존 로그인·복구 경로는 유지한다',async()=>{
  globalThis.__teamkickSocial=true;globalThis.__teamkickSignups=[];
  const out=await authPost({action:'signup',email:'a@b.test',password:'12345678',name:'새 사람',agree:true,adult:true});
  assert.equal(out.status,403);
  assert.match(out.body.error,/카카오·네이버·구글/);
  assert.equal(globalThis.__teamkickSignups.length,0,'거절했으면 계정을 만들면 안 된다');

  // 이미 가입한 이메일 계정은 그대로 쓸 수 있어야 한다. 이게 막히면 기존 사용자가 잠긴다.
  assert.equal((await authPost({action:'login',email:'a@b.test',password:'12345678'})).status,200);
  assert.equal((await authPost({action:'forgot',email:'a@b.test'})).status,200);
  assert.equal((await authPost({action:'reset',token:'x',password:'12345678'})).status,200);
});
test('이메일 가입을 명시적으로 켠 환경에서만 가입할 수 있다',async()=>{
  globalThis.__teamkickTestEnv.EMAIL_SIGNUP_ENABLED='true';
  globalThis.__teamkickSocial=false;globalThis.__teamkickSignups=[];
  const out=await authPost({action:'signup',email:'a@b.test',password:'12345678',name:'새 사람',agree:true,adult:true});
  assert.equal(out.status,200);
  assert.equal(globalThis.__teamkickSignups.length,1);
  delete globalThis.__teamkickTestEnv.EMAIL_SIGNUP_ENABLED;
});

test('매칭 신청이 언제 확정·거절·철회됐는지 시각이 남는다',()=>{
  // 지나고 나면 되살릴 수 없는 값이다. 화면에 "확정 시각" 을 보여주려면 여기서 쌓아야 한다.
  const f=fixture(),gameId=game(f.s,f.a,{listing:true,start:NOW+2*DAY});
  command(f.s,B,{type:'applyMatch',teamId:f.b,gameId});
  command(f.s,C,{type:'applyMatch',teamId:f.c,gameId});
  const req=id=>f.s.requests.find(x=>x.teamId===id&&x.gameId===gameId);
  assert.ok(!req(f.b).decidedAt,'신청만 했을 때는 결정 시각이 없다');
  const when=NOW+3600e3;
  command(f.s,A,{type:'acceptMatch',teamId:f.a,gameId,requestId:req(f.b).id},when);
  assert.equal(req(f.b).status,'accepted');
  assert.equal(req(f.b).decidedAt,iso(when),'수락한 시각이 남아야 한다');
  // 같이 밀려난 다른 신청에도 남는다
  assert.equal(req(f.c).status,'closed');
  assert.equal(req(f.c).decidedAt,iso(when));

  // 거절과 철회도 같은 자리에 남는다
  const g2=game(f.s,f.a,{listing:true,start:NOW+5*DAY});
  command(f.s,B,{type:'applyMatch',teamId:f.b,gameId:g2});
  const r2=f.s.requests.find(x=>x.gameId===g2&&x.teamId===f.b);
  command(f.s,A,{type:'rejectMatch',teamId:f.a,gameId:g2,requestId:r2.id},when+60e3);
  assert.equal(r2.decidedAt,iso(when+60e3),'거절 시각');

  const g3=game(f.s,f.a,{listing:true,start:NOW+6*DAY});
  command(f.s,B,{type:'applyMatch',teamId:f.b,gameId:g3});
  const r3=f.s.requests.find(x=>x.gameId===g3&&x.teamId===f.b);
  command(f.s,B,{type:'withdrawMatch',teamId:f.b,gameId:g3,requestId:r3.id},when+120e3);
  assert.equal(r3.decidedAt,iso(when+120e3),'철회 시각');
});

test('우리 팀이 낸 매칭 신청은 주장뿐 아니라 팀원에게도 보인다',()=>{
  // 사용자 요청: "내가 신청한 매칭" 을 팀원이 함께 본다. 서버는 이미 그렇게 준다 —
  // 이 테스트로 고정해 두고, 화면 이름만 바꾸면 된다.
  const f=fixture(),gameId=game(f.s,f.a,{listing:true,start:NOW+2*DAY});
  command(f.s,member,{type:'joinTeam',teamId:f.b,name:'선수',position:'MF',number:9});
  const m=f.s.members.find(x=>x.teamId===f.b&&x.userId===member.id);
  command(f.s,B,{type:'approveMember',teamId:f.b,memberId:m.id});
  command(f.s,B,{type:'applyMatch',teamId:f.b,gameId});
  const asMember=visibleState(f.s,member.id,f.b).requests;
  assert.equal(asMember.length,1,'팀원도 우리 팀 신청을 본다');
  assert.equal(asMember[0].teamId,f.b);
  // 남의 팀 신청은 보이지 않는다
  assert.ok(!visibleState(f.s,member.id,f.b).requests.some(r=>r.teamId!==f.b));
  assert.ok(m);
});

// 사용자 제보: 토요일 당일인데 D-1 로 나왔다. 시간 차이를 올림해서 세고 있었다.
test('남은 날짜는 한국 날짜로 센다 — 당일이면 D-day',()=>{
  const day=ms=>Math.floor((ms+9*3600e3)/864e5);   // app/teamkick.tsx 의 seoulDay
  const dday=(start,now)=>Math.max(0,day(Date.parse(start))-day(Date.parse(now)));
  // 한국 9/19(토) 아침 9시에 본 그날 저녁 7시 경기 → 오늘이다
  assert.equal(dday('2026-09-19T10:00:00.000Z','2026-09-19T00:00:00.000Z'),0,'같은 날이면 0');
  // 예전 방식(시간 차이 올림)이라면 1 이 나온다. 그게 제보받은 증상이다.
  assert.equal(Math.ceil((Date.parse('2026-09-19T10:00:00.000Z')-Date.parse('2026-09-19T00:00:00.000Z'))/864e5),1);
  assert.equal(dday('2026-09-20T01:00:00.000Z','2026-09-19T23:00:00.000Z'),0,'두 시각 다 한국 9/20 이면 0');
  assert.equal(dday('2026-09-20T10:00:00.000Z','2026-09-19T10:00:00.000Z'),1,'하루 뒤면 1');
  // 한국에서 날짜가 넘어가는 자리: UTC 15:00 이 KST 자정이다
  assert.equal(dday('2026-09-19T15:00:00.000Z','2026-09-19T14:00:00.000Z'),1,'자정을 넘기면 1');
  assert.equal(dday('2026-09-18T00:00:00.000Z','2026-09-19T00:00:00.000Z'),0,'지난 경기는 0 으로 붙든다');
});

test('팀 공지는 고정한 것을 먼저, 그다음 최근에 쓴 것부터 보여준다',()=>{
  const {s,a}=fixture();
  command(s,A,{type:'createNotice',teamId:a,title:'가장 먼저 쓴 글',body:'1'},NOW-3*DAY);
  command(s,A,{type:'createNotice',teamId:a,title:'가운데 글',body:'2'},NOW-2*DAY);
  command(s,A,{type:'createNotice',teamId:a,title:'가장 나중에 쓴 글',body:'3'},NOW-1*DAY);
  command(s,A,{type:'createNotice',teamId:a,title:'고정한 오래된 글',body:'4',pinned:true},NOW-4*DAY);
  const titles=visibleState(s,A.id,a).notices.map(x=>x.title);
  assert.equal(titles[0],'고정한 오래된 글','고정한 공지가 맨 위여야 한다');
  assert.deepEqual(titles.slice(1),['가장 나중에 쓴 글','가운데 글','가장 먼저 쓴 글'],'나머지는 최근 순이어야 한다');
});

test('알림 문구는 UTC 원문이 아니라 Asia/Seoul 로 적힌다',()=>{
  // 이 컨테이너의 시스템 시간대는 UTC 다. 그래도 알림은 한국 시각이어야 한다.
  assert.equal(seoulStamp('2026-09-21T16:00:00.000Z'),'9월 22일 (화) 01:00'); // 날짜가 넘어가는 자리
  assert.equal(seoulStamp('2026-09-22T01:00:00.000Z'),'9월 22일 (화) 10:00');
  assert.equal(seoulStamp('2026-12-31T15:00:00.000Z'),'1월 1일 (금) 00:00'); // 해가 바뀌는 자리
  const {s,a}=fixture();
  const start=NOW+2*DAY;
  command(s,A,{type:'createGame',teamId:a,start:iso(start),end:iso(start+7200e3),venue:'난지천공원',address:'서울 마포구',external:'외부 FC'},start-DAY);
  const n=s.notifications.find(x=>x.title==='새 경기 일정');
  assert.ok(n,'경기 알림이 있어야 한다');
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(n.body),'ISO 원문이 알림에 그대로 나가면 안 된다: '+n.body);
  assert.equal(n.body,seoulStamp(iso(start))+' · 난지천공원');
});

test('팀 등록 상태 알림은 영문 상태값 대신 한국어와 사유를 보여준다',()=>{
  const s=blank();
  command(s,owner,{type:'setupOwner'},NOW-40*DAY);
  const {teamId}=command(s,A,{type:'createTeam',name:'상태팀',region:'서울',description:'테스트'},NOW-30*DAY);
  command(s,owner,{type:'approveTeam',teamId},NOW-30*DAY);
  const approved=s.notifications.filter(x=>x.title==='팀 등록 상태 변경').at(-1);
  assert.ok(!/active|rejected|suspended|pending/.test(approved.body),'영문 상태값이 그대로 나가면 안 된다: '+approved.body);
  assert.match(approved.body,/승인됐어요/);
  command(s,owner,{type:'suspendTeam',teamId,reason:'신고 확인 중'},NOW-10*DAY);
  const suspended=s.notifications.filter(x=>x.title==='팀 등록 상태 변경').at(-1);
  assert.match(suspended.body,/이용이 정지됐어요/);
  assert.match(suspended.body,/신고 확인 중/,'정지 사유를 당사자가 알 수 있어야 한다');
});

test('운영자 초기 설정은 검증된 코드가 필요하고 팀 승인 권한이 분리된다',()=>{
  const s=blank();assert.throws(()=>command(s,A,{type:'setupOwner'}),/초기 설정 코드/);
  const f=fixture();assert.throws(()=>command(f.s,A,{type:'approveTeam',teamId:f.c}),/운영자/);
  assert.throws(()=>command(f.s,owner,{type:'setupOwner'}),/이미 완료/);
  assert.equal(visibleState(f.s,'stranger').members.length,0);
  assert.equal(visibleState(f.s,'stranger').games.length,0);
});

test('주장만 가입을 승인하며 탈퇴 직후 수정 권한이 사라진다',()=>{
  const {s,a,b}=fixture();command(s,member,{type:'joinTeam',teamId:a,name:'선수'});
  const m=s.members.find(x=>x.userId===member.id);
  assert.throws(()=>command(s,B,{type:'approveMember',teamId:a,memberId:m.id}),/권한/);
  assert.equal(visibleState(s,member.id,a).teamId,'');
  command(s,A,{type:'approveMember',teamId:a,memberId:m.id});
  command(s,A,{type:'setRole',teamId:a,memberId:m.id,role:'manager'});
  assert.throws(()=>command(s,member,{type:'invite',teamId:a}),/권한/);
  assert.throws(()=>command(s,member,{type:'createNotice',teamId:b,title:'침범',body:'안됨'}),/권한/);
  command(s,member,{type:'leaveTeam',teamId:a});
  assert.throws(()=>command(s,member,{type:'editProfile',teamId:a,name:'선수',position:'FW',number:1}),/권한/);
});

test('매칭 수락은 한 팀만 가능하고 같은 경기를 양쪽 달력에 연결한다',()=>{
  const {s,a,b,c}=fixture(),g=game(s,a,{listing:true});
  command(s,B,{type:'applyMatch',teamId:b,gameId:g});command(s,C,{type:'applyMatch',teamId:c,gameId:g});
  command(s,A,{type:'acceptMatch',teamId:a,gameId:g,requestId:s.requests[0].id});
  assert.equal(s.games.length,1);assert.equal(s.sides.length,2);assert.equal(s.requests[1].status,'closed');
  assert.equal(visibleState(s,A.id,a).games[0].id,visibleState(s,B.id,b).games[0].id);
  assert.throws(()=>command(s,A,{type:'acceptMatch',teamId:a,gameId:g,requestId:s.requests[1].id}),/이미 처리/);
  assert.throws(()=>game(s,a),/같은 시간/);
});

test('서로의 출석, 공지, 초대 토큰은 상대팀에 공개되지 않는다',()=>{
  const {s,a,b,gameId}=matchFixture();
  command(s,A,{type:'sideSettings',teamId:a,gameId,note:'팀 A 비공개',meeting:'09:40'});
  command(s,A,{type:'createNotice',teamId:a,title:'팀 A 공지',body:'우리 팀만'});
  command(s,A,{type:'invite',teamId:a});
  const v=visibleState(s,B.id,b);
  assert.ok(v.sides.every(x=>x.teamId===b));assert.equal(v.notices.length,0);assert.equal(v.invites.length,0);
  assert.ok(!JSON.stringify(v).includes('팀 A 비공개'));
});

test('출석 초안은 투표에서 채우고 확정·정정해도 한 경기로 집계한다',()=>{
  const {s,a}=fixture(),m=addPlayer(s,a),g=game(s,a,{start:NOW-2*DAY}),z=sideOf(s,g,a);
  command(s,member,{type:'vote',teamId:a,gameId:g,value:'yes'},NOW-3*DAY);
  assert.throws(()=>command(s,member,{type:'vote',teamId:a,gameId:g,value:'no'}),/마감/);
  command(s,A,{type:'completeGame',teamId:a,gameId:g});
  const values=attendanceDraft(s,z,s.games[0]);assert.equal(values[m.id],true);
  command(s,A,{type:'attendance',teamId:a,gameId:g,values});command(s,A,{type:'attendance',teamId:a,gameId:g,values});
  let summary=summaries(visibleState(s,A.id,a),'1970','2100');assert.equal(summary.players.find(x=>x.id===m.id).attend,1);
  command(s,A,{type:'attendance',teamId:a,gameId:g,values:{...values,[m.id]:false}});
  summary=summaries(visibleState(s,A.id,a),'1970','2100');assert.equal(summary.players.find(x=>x.id===m.id).attend,0);
  assert.equal(summary.players.find(x=>x.id===m.id).eligible,1);
});

test('수기 득점은 출석·합계를 검증하고 정정 시 덮어쓰며 취소 경기는 제외한다',()=>{
  const {s,a}=fixture(),m=addPlayer(s,a),g=game(s,a,{start:NOW-2*DAY}),z=sideOf(s,g,a);
  command(s,A,{type:'completeGame',teamId:a,gameId:g});
  const attendance=Object.fromEntries(rosterFor(s,z,s.games[0]).map(x=>[x.id,true]));
  command(s,A,{type:'attendance',teamId:a,gameId:g,values:attendance});
  command(s,A,{type:'result',teamId:a,gameId:g,own:2,opponent:1});
  assert.throws(()=>command(s,A,{type:'records',teamId:a,gameId:g,values:{[m.id]:{goals:-1,assists:0}}}),/숫자 범위/);
  assert.throws(()=>command(s,A,{type:'records',teamId:a,gameId:g,values:{[m.id]:{goals:3,assists:0}}}),/합이/);
  const c={type:'records',teamId:a,gameId:g,values:{[m.id]:{goals:'2',assists:0}}};
  command(s,A,c);command(s,A,c);
  let stats=summaries(visibleState(s,A.id,a),'1970','2100');assert.equal(stats.players.find(x=>x.id===m.id).goals,2);assert.equal(stats.wins,1);
  command(s,A,{type:'cancelGame',teamId:a,gameId:g,reason:'우천 취소 정정'});
  stats=summaries(visibleState(s,A.id,a),'1970','2100');assert.equal(stats.played,0);assert.equal(stats.winRate,null);assert.equal(stats.players.find(x=>x.id===m.id).goals,0);
});

test('수정 전 결과와 일정 제안은 승인되지 않으며 일정 변경 시 재투표한다',()=>{
  const {s,a,b,gameId}=matchFixture(),g=s.games[0];
  command(s,A,{type:'vote',teamId:a,gameId,value:'yes'});
  const change={type:'changeGame',teamId:a,gameId,start:iso(NOW+4*DAY),end:iso(NOW+4*DAY+7200e3),venue:'새 구장',address:'서울'};
  command(s,A,change);const old=g.change.proposalId;command(s,A,{...change,venue:'최종 구장'});
  assert.throws(()=>command(s,B,{type:'confirmChange',teamId:b,gameId,proposalId:old}),/최신/);
  command(s,B,{type:'confirmChange',teamId:b,gameId,proposalId:g.change.proposalId});
  assert.deepEqual(sideOf(s,gameId,a).votes,{});assert.equal(g.venue,'최종 구장');
  command(s,A,{type:'completeGame',teamId:a,gameId},NOW+5*DAY);
  command(s,A,{type:'result',teamId:a,gameId,own:1,opponent:0},NOW+5*DAY);const revision=g.resultProposal.revision;
  command(s,A,{type:'result',teamId:a,gameId,own:2,opponent:0},NOW+5*DAY);
  assert.throws(()=>command(s,B,{type:'confirmResult',teamId:b,gameId,revision}),/최신/);
  command(s,B,{type:'confirmResult',teamId:b,gameId,revision:g.resultProposal.revision},NOW+5*DAY);
  assert.equal(g.result.a,2);assert.equal(g.result.status,'confirmed');
});

test('재가입해도 선수 ID와 과거 출석 대상 이력이 유지된다',()=>{
  const {s,a}=fixture(),m=addPlayer(s,a),g=game(s,a,{start:NOW-2*DAY});
  command(s,member,{type:'leaveTeam',teamId:a},NOW-DAY);
  assert.ok(rosterFor(s,sideOf(s,g,a),s.games[0]).some(x=>x.id===m.id));
  const again=addPlayer(s,a,member,NOW);assert.equal(again.id,m.id);assert.equal(again.periods.length,2);
  assert.equal(s.members.filter(x=>x.userId===member.id&&x.teamId===a).length,1);
});

test('실제 저장 SQL은 동시 매칭 수락 중 한 건만 저장하고 나머지를 원자적으로 롤백한다',async()=>{
  const db=localDatabase(),{s,a,b,c}=fixture(),g=game(s,a,{listing:true});
  command(s,B,{type:'applyMatch',teamId:b,gameId:g});command(s,C,{type:'applyMatch',teamId:c,gameId:g});
  await repository.commit(blank(),s,0);
  const one=await repository.load(),two=await repository.load(),after1=structuredClone(one.state),after2=structuredClone(two.state);
  command(after1,A,{type:'acceptMatch',teamId:a,gameId:g,requestId:s.requests[0].id});
  command(after2,A,{type:'acceptMatch',teamId:a,gameId:g,requestId:s.requests[1].id});
  const outcomes=await Promise.allSettled([repository.commit(one.state,after1,one.version),repository.commit(two.state,after2,two.version)]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
  const final=await repository.load();assert.equal(final.state.games[0].away,b);assert.equal(final.state.sides.length,2);assert.equal(final.version,2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM write_guards').get().n,0);db.close();
});

test('API는 서버 로그인 신원을 사용하고 중복 저장 요청을 다시 적용하지 않는다',async()=>{
  const db=localDatabase(),{s,a}=fixture();await repository.commit(blank(),s,0);
  globalThis.__teamkickTestIdentity={userId:A.id,fullName:A.name};
  const payload={type:'createGame',teamId:a,mutationId:'unique-request-1',userId:'forged-id',start:iso(NOW+8*DAY),end:iso(NOW+8*DAY+7200e3),venue:'축구장',address:'서울'};
  const req=()=>new Request('https://example.test/api/app',{method:'POST',headers:{'content-type':'application/json',origin:'https://example.test'},body:JSON.stringify(payload)});
  assert.equal((await api.POST(req())).status,200);assert.equal((await api.POST(req())).status,200);
  const final=await repository.load();assert.equal(final.state.games.length,1);assert.equal(final.state.audit.at(-1).actor,A.id);
  globalThis.__teamkickTestIdentity=null;assert.equal((await api.POST(req())).status,401);
  db.close();
});

// 저장 응답에 새 화면 상태가 들어 있어야 한다. 들어 있지 않으면 화면이 저장 뒤에
// 한 번 더 읽어와야 해서 기다리는 시간이 두 배가 된다.
test('저장 응답이 새 화면 상태를 그대로 담아 준다',async()=>{
  const db=localDatabase(),{s,a,b}=fixture();
  // A 가 두 팀에 속해야 "보던 팀"이 첫 번째 팀과 구분된다. 한 팀뿐이면 무엇을
  // 보내도 그 팀이 나와서, 보던 팀을 무시해도 테스트가 통과해 버린다.
  command(s,A,{type:'joinTeam',teamId:b,name:A.name,position:'MF',number:7},NOW-20*DAY);
  const joined=s.members.find(x=>x.teamId===b&&x.userId===A.id);
  command(s,B,{type:'approveMember',teamId:b,memberId:joined.id},NOW-20*DAY);
  await repository.commit(blank(),s,0);
  globalThis.__teamkickTestIdentity={userId:A.id,fullName:A.name};
  const send=body=>api.POST(new Request('https://example.test/api/app',{method:'POST',
    headers:{'content-type':'application/json',origin:'https://example.test'},body:JSON.stringify(body)}));

  const res=await send({type:'createGame',teamId:a,mutationId:'m-state-1',
    start:iso(NOW+8*DAY),end:iso(NOW+8*DAY+7200e3),venue:'축구장',address:'서울'});
  assert.equal(res.status,200);
  const body=await res.json();
  // 방금 만든 경기가 응답에 이미 있어야 한다. 다시 읽어올 필요가 없어야 한다.
  assert.equal(body.games.length,1,'저장 응답에 새 경기가 들어 있어야 한다');
  assert.equal(body.teamId,a,'보고 있던 팀 기준으로 와야 한다');
  for(const key of ['teams','members','mine','games','sides','notices','notifications','requests'])
    assert.ok(key in body,'저장 응답에 "'+key+'" 가 있어야 한다');

  // 팀이 없는 명령에서도 보던 팀이 유지되어야 한다. 그렇지 않으면 저장할 때마다
  // 선택한 팀이 멋대로 바뀐다.
  // 두 번째 팀을 보고 있었다면 저장 뒤에도 두 번째 팀이어야 한다.
  const kept=await send({type:'readNotifications',mutationId:'m-state-2',viewTeam:b});
  assert.equal((await kept.json()).teamId,b,'viewTeam 으로 보던 팀이 유지되어야 한다');
  // 보던 팀을 보내지 않으면 첫 번째 팀으로 돌아간다. 위와 값이 달라야 의미가 있다.
  const noView=await send({type:'readNotifications',mutationId:'m-state-2b'});
  assert.equal((await noView.json()).teamId,a);

  // 명령의 대상 팀이 보던 팀보다 앞선다. 반대로 하면 방금 바꾼 팀이 아니라
  // 엉뚱한 팀의 화면이 돌아온다.
  const targeted=await send({type:'editProfile',teamId:b,mutationId:'m-state-2c',viewTeam:a,
    name:A.name,position:'FW',number:7});
  assert.equal(targeted.status,200);
  assert.equal((await targeted.json()).teamId,b,'명령의 대상 팀이 우선이어야 한다');

  // 같은 요청을 다시 보내도(재전송) 상태를 함께 줘야 한다.
  const again=await send({type:'createGame',teamId:a,mutationId:'m-state-1',
    start:iso(NOW+8*DAY),end:iso(NOW+8*DAY+7200e3),venue:'축구장',address:'서울'});
  const repeat=await again.json();
  assert.equal(repeat.games.length,1,'재전송 응답에도 상태가 있어야 한다');

  // viewTeam 은 보는 기준일 뿐이라 권한을 넘겨주지 않는다.
  globalThis.__teamkickTestIdentity={userId:'stranger',fullName:'남'};
  const outsider=await send({type:'readNotifications',mutationId:'m-state-3',viewTeam:a});
  const seen=await outsider.json();
  assert.equal(seen.teamId,'','속하지 않은 팀을 viewTeam 으로 보내도 열리면 안 된다');
  assert.equal(seen.members.length,0,'속하지 않은 팀의 팀원이 보이면 안 된다');

  globalThis.__teamkickTestIdentity=null;db.close();
});

const G1={id:'guest-1',name:'용병1'},G2={id:'guest-2',name:'용병2'},G3={id:'용병3-id',name:'용병3'};

test('용병 모집은 정원에 도달하면 서버가 마감하고 초과 승인·추가 신청을 막는다',()=>{
  const {s,a,gameId}=guestFixture();
  const ids=[G1,G2,G3].map(u=>applyGuest(s,a,gameId,u));
  assert.equal(approvedGuests(s,gameId,a),0);
  assert.equal(sideOf(s,gameId,a).guestStatus,'open');
  command(s,A,{type:'approveGuest',teamId:a,gameId,guestId:ids[0]});
  assert.equal(sideOf(s,gameId,a).guestStatus,'open');
  command(s,A,{type:'approveGuest',teamId:a,gameId,guestId:ids[1]});
  assert.equal(sideOf(s,gameId,a).guestStatus,'closed');
  assert.equal(approvedGuests(s,gameId,a),2);
  assert.equal(s.guests.find(x=>x.id===ids[2]).status,'closed');
  assert.throws(()=>command(s,A,{type:'approveGuest',teamId:a,gameId,guestId:ids[2]}),/처리된 신청|마감/);
  assert.throws(()=>applyGuest(s,a,gameId,{id:'guest-4',name:'용병4'}),/마감/);
  assert.equal(visibleState(s,'stranger').guestListings.length,0);
});

test('용병 승인은 팀 가입과 구분되고 팀 내부 정보를 노출하지 않는다',()=>{
  const {s,a,gameId}=guestFixture();
  const guestId=applyGuest(s,a,gameId,G1);
  command(s,A,{type:'approveGuest',teamId:a,gameId,guestId});
  assert.equal(s.members.filter(m=>m.userId===G1.id).length,0);
  const view=visibleState(s,G1.id);
  assert.equal(view.teamId,'');assert.equal(view.role,'');
  assert.equal(view.members.length,0);assert.equal(view.games.length,0);
  assert.equal(view.notices.length,0);assert.equal(view.sides.length,0);
  assert.equal(view.myGuests.find(x=>x.id===guestId).status,'approved');
  const open=visibleState(s,'stranger').guestListings;
  assert.equal(open.length,1);assert.equal(open[0].needed,2);assert.equal(open[0].approved,1);
  for(const leak of ['votes','attendance','records','note','meeting','roster','draft'])assert.equal(leak in open[0],false);
  addPlayer(s,a);
  assert.throws(()=>command(s,member,{type:'applyGuest',teamId:a,gameId,name:'선수'}),/소속/);
  assert.throws(()=>command(s,member,{type:'approveGuest',teamId:a,gameId,guestId}),/권한/);
  assert.throws(()=>command(s,B,{type:'approveGuest',teamId:a,gameId,guestId}),/권한/);
});

test('마지막 한 자리를 동시에 승인해도 용병 정원을 넘지 않는다',async()=>{
  const db=localDatabase(),{s,a}=fixture(),gameId=game(s,a,{start:NOW+3*DAY});
  command(s,A,{type:'openGuests',teamId:a,gameId,needed:1});
  const one=applyGuest(s,a,gameId,G1),two=applyGuest(s,a,gameId,G2);
  await repository.commit(blank(),s,0);
  const x=await repository.load(),y=await repository.load();
  const ax=structuredClone(x.state),ay=structuredClone(y.state);
  command(ax,A,{type:'approveGuest',teamId:a,gameId,guestId:one});
  command(ay,A,{type:'approveGuest',teamId:a,gameId,guestId:two});
  const outcomes=await Promise.allSettled([repository.commit(x.state,ax,x.version),repository.commit(y.state,ay,y.version)]);
  assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);
  const final=await repository.load();
  assert.equal(approvedGuests(final.state,gameId,a),1);
  assert.equal(sideOf(final.state,gameId,a).guestStatus,'closed');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM write_guards').get().n,0);db.close();
});

test('용병 확정을 취소하면 자리가 다시 열리고 용병은 팀 선수 통계에 들어가지 않는다',()=>{
  const {s,a,gameId}=guestFixture();
  const one=applyGuest(s,a,gameId,G1),two=applyGuest(s,a,gameId,G2);
  command(s,A,{type:'approveGuest',teamId:a,gameId,guestId:one});
  command(s,A,{type:'approveGuest',teamId:a,gameId,guestId:two});
  assert.equal(sideOf(s,gameId,a).guestStatus,'closed');
  command(s,A,{type:'cancelGuest',teamId:a,gameId,guestId:two});
  assert.equal(sideOf(s,gameId,a).guestStatus,'open');
  assert.equal(approvedGuests(s,gameId,a),1);
  const stats=summaries(visibleState(s,A.id,a),iso(NOW-40*DAY),iso(NOW+40*DAY));
  assert.equal(stats.players.some(x=>x.name===G1.name),false);
  assert.equal(stats.players.length,1);
  command(s,A,{type:'cancelGame',teamId:a,gameId,reason:'우천 취소'});
  assert.equal(sideOf(s,gameId,a).guestStatus,'closed');
  assert.throws(()=>applyGuest(s,a,gameId,G3),/마감|신청할 수 없는/);
});

test('주장은 팀원의 선수 정보를 수정할 수 있고 그 명령으로 역할은 바뀌지 않는다',()=>{
  const {s,a}=fixture(),m=addPlayer(s,a);
  assert.equal(m.position,'MF');assert.equal(m.role,'member');
  command(s,A,{type:'editMember',teamId:a,memberId:m.id,name:'선수',number:7,position:'FW',role:'captain'});
  assert.equal(m.position,'FW');assert.equal(m.number,7);
  assert.equal(m.role,'member','선수 정보 수정으로 역할이 올라가면 안 된다');
  assert.throws(()=>command(s,member,{type:'editMember',teamId:a,memberId:m.id,name:'선수',number:1,position:'GK'}),/권한/);
  const other={id:'other',name:'다른 팀원'},om=addPlayer(s,a,other);
  assert.throws(()=>command(s,other,{type:'editMember',teamId:a,memberId:om.id,name:'다른 팀원',number:2,position:'DF'}),/권한/);
  assert.throws(()=>command(s,B,{type:'editMember',teamId:a,memberId:m.id,name:'선수',number:3,position:'DF'}),/권한/);
  command(s,A,{type:'removeMember',teamId:a,memberId:om.id});
  assert.throws(()=>command(s,A,{type:'editMember',teamId:a,memberId:om.id,name:'다른 팀원',number:2,position:'DF'}),/활동 중인 팀원/);
  assert.throws(()=>command(s,A,{type:'editMember',teamId:a,memberId:m.id,name:'선수',number:200,position:'FW'}),/숫자 범위/);
});

const register=(input)=>auth.signUp({agree:true,adult:true,...input});
const cookieRequest=token=>new Request('https://example.test/api/app',{headers:token?{cookie:'teamkick_session='+token}:{}});

test('자체 회원가입은 비밀번호를 해시로만 저장하고 세션으로 신원을 확인한다',async()=>{
  const db=localDatabase();
  const {user,token}=await register({email:' Park@Example.COM ',name:'박재연',password:'teamkick-1234'});
  assert.equal(user.fullName,'박재연');
  const row=db.prepare('SELECT email,name,password FROM accounts').get();
  assert.equal(row.email,'park@example.com','이메일은 소문자로 정규화해 저장한다');
  assert.ok(row.password.startsWith('pbkdf2$100000x6$'),'Workers 상한 안에서 OWASP 권고 작업량을 맞춘다');
  assert.equal(row.password.includes('teamkick-1234'),false,'비밀번호 원문이 저장되면 안 된다');
  const stored=db.prepare('SELECT id FROM sessions').get();
  assert.notEqual(stored.id,token,'세션 토큰 원문이 저장되면 안 된다');
  assert.deepEqual(await auth.currentUser(cookieRequest(token)),{userId:user.userId,fullName:'박재연',verified:false},'확인 메일을 거치지 않은 계정은 미확인 상태다');
  assert.equal(await auth.currentUser(cookieRequest('')),null);
  assert.equal(await auth.currentUser(cookieRequest('not-a-real-token')),null);
  db.close();
});

test('로그인은 대소문자 무관하고 잘못된 입력과 중복 가입을 거부한다',async()=>{
  const db=localDatabase();
  await register({email:'a@b.com',name:'가나',password:'teamkick-1234'});
  await assert.rejects(()=>register({email:'A@B.com',name:'다른 사람',password:'teamkick-1234'}),/이미 가입된 이메일/);
  await assert.rejects(()=>register({email:'주소아님',name:'가나',password:'teamkick-1234'}),/이메일 주소/);
  await assert.rejects(()=>register({email:'c@d.com',name:'가나',password:'짧음'}),/8자 이상/);
  await assert.rejects(()=>register({email:'c@d.com',name:'',password:'teamkick-1234'}),/이름/);
  const {token}=await auth.signIn({email:'A@B.COM',password:'teamkick-1234'});
  assert.ok(token);
  await assert.rejects(()=>auth.signIn({email:'a@b.com',password:'틀린비밀번호'}),/이메일 또는 비밀번호/);
  await assert.rejects(()=>auth.signIn({email:'없는@계정.com',password:'teamkick-1234'}),/이메일 또는 비밀번호/);
  db.close();
});

test('로그인 실패가 반복되면 계정을 잠그고 로그아웃·만료 세션은 무효가 된다',async()=>{
  const db=localDatabase();
  const {token}=await register({email:'a@b.com',name:'가나',password:'teamkick-1234'});
  for(let i=0;i<10;i++)await assert.rejects(()=>auth.signIn({email:'a@b.com',password:'틀림'}),/이메일 또는 비밀번호/);
  await assert.rejects(()=>auth.signIn({email:'a@b.com',password:'teamkick-1234'}),/잠겼어요/);
  const later=Date.now()+16*60000;
  assert.ok((await auth.signIn({email:'a@b.com',password:'teamkick-1234'},later)).token,'잠금 시간이 지나면 다시 로그인된다');
  await auth.signOut(cookieRequest(token));
  assert.equal(await auth.currentUser(cookieRequest(token)),null,'로그아웃한 세션은 무효다');
  const {token:fresh}=await auth.signIn({email:'a@b.com',password:'teamkick-1234'},later);
  assert.ok(await auth.currentUser(cookieRequest(fresh),later));
  assert.equal(await auth.currentUser(cookieRequest(fresh),later+31*864e5),null,'만료된 세션은 무효다');
  db.close();
});

test('서로 다른 계정은 서로의 세션과 팀 데이터에 접근할 수 없다',async()=>{
  const db=localDatabase();
  const one=await register({email:'one@t.com',name:'첫째',password:'teamkick-1234'});
  const two=await register({email:'two@t.com',name:'둘째',password:'teamkick-1234'});
  assert.notEqual(one.user.userId,two.user.userId);
  assert.equal((await auth.currentUser(cookieRequest(one.token))).userId,one.user.userId);
  assert.equal((await auth.currentUser(cookieRequest(two.token))).userId,two.user.userId);
  const s=blank();
  command(s,{id:one.user.userId,name:'첫째'},{type:'createTeam',teamId:'',name:'첫째 팀',region:'서울',description:''});
  assert.equal(visibleState(s,two.user.userId).members.length,0);
  assert.equal(visibleState(s,two.user.userId).games.length,0);
  db.close();
});

test('운영자 재설정은 설정 코드와 기존 운영자 계정 부재를 함께 요구한다',()=>{
  const s=blank();
  command(s,owner,{type:'setupOwner'});
  assert.equal(s.settings.find(x=>x.id==='owner').userId,owner.id);
  const other={id:'other',name:'다른 사람',ownerSetup:true};
  assert.throws(()=>command(s,other,{type:'setupOwner'}),/이미 완료/,'코드를 알아도 기존 운영자가 살아 있으면 가져갈 수 없다');
  assert.throws(()=>command(s,{id:'no-code',name:'코드 없음',ownerReset:true},{type:'setupOwner'}),/초기 설정 코드/,'재설정 상황이어도 코드는 있어야 한다');
  command(s,{...other,ownerReset:true},{type:'setupOwner'});
  assert.equal(s.settings.find(x=>x.id==='owner').userId,other.id,'기존 운영자 계정이 없을 때만 재설정된다');
  assert.equal(s.settings.filter(x=>x.id==='owner').length,1,'운영자 설정은 하나만 남는다');
  assert.equal(visibleState(s,other.id).isOwner,true);
  assert.equal(visibleState(s,owner.id).isOwner,false);
});

test('팀 로고와 선수 사진은 권한과 저장 경로를 함께 검증한다',()=>{
  const {s,a,b}=fixture(),m=addPlayer(s,a);
  const logo='teams/'+a+'/'+'abc.png';
  assert.throws(()=>command(s,member,{type:'setTeamLogo',teamId:a,key:logo}),/권한/,'일반 팀원은 팀 로고를 못 바꾼다');
  assert.throws(()=>command(s,B,{type:'setTeamLogo',teamId:a,key:logo}),/권한/,'다른 팀 주장도 못 바꾼다');
  assert.throws(()=>command(s,A,{type:'setTeamLogo',teamId:a,key:'teams/'+b+'/abc.png'}),/이미지 정보/,'다른 팀 경로의 키는 거부한다');
  assert.throws(()=>command(s,A,{type:'setTeamLogo',teamId:a,key:'teams/'+a+'/../../etc/passwd'}),/이미지 정보/,'경로 조작은 거부한다');
  command(s,A,{type:'setTeamLogo',teamId:a,key:logo});
  assert.equal(s.teams.find(x=>x.id===a).logo,logo);
  command(s,A,{type:'setTeamLogo',teamId:a,key:''});
  assert.equal(s.teams.find(x=>x.id===a).logo,'','빈 값으로 지울 수 있다');

  const photo='members/'+a+'/'+m.id+'/p.png';
  assert.throws(()=>command(s,A,{type:'setMemberPhoto',teamId:a,memberId:m.id,key:'members/'+a+'/다른사람/p.png'}),/이미지 정보/,'다른 팀원 경로의 키는 거부한다');
  command(s,member,{type:'setMemberPhoto',teamId:a,memberId:m.id,key:photo});
  assert.equal(s.members.find(x=>x.id===m.id).photo,photo,'본인은 자기 사진을 바꿀 수 있다');
  command(s,A,{type:'setMemberPhoto',teamId:a,memberId:m.id,key:photo});
  const other={id:'other',name:'다른 팀원'},om=addPlayer(s,a,other);
  assert.throws(()=>command(s,other,{type:'setMemberPhoto',teamId:a,memberId:m.id,key:'members/'+a+'/'+m.id+'/x.png'}),/본인 또는 주장/,'남의 사진은 못 바꾼다');
  assert.throws(()=>command(s,B,{type:'setMemberPhoto',teamId:a,memberId:m.id,key:photo}),/권한/,'다른 팀 주장도 못 바꾼다');
  command(s,A,{type:'removeMember',teamId:a,memberId:om.id});
  assert.throws(()=>command(s,A,{type:'setMemberPhoto',teamId:a,memberId:om.id,key:'members/'+a+'/'+om.id+'/x.png'}),/활동 중인 팀원/);
});

test('경기를 만들 때 투표 마감을 정할 수 있고 범위를 벗어나면 거부한다',()=>{
  const {s,a}=fixture(),start=NOW+5*DAY;
  const make=(extra,when=NOW)=>command(s,A,{type:'createGame',teamId:a,venue:'축구장',address:'서울',external:'외부 FC',...extra},when);
  assert.throws(()=>make({start:iso(start),end:iso(start+7200e3),deadline:iso(start+3600e3)}),/투표 마감/,'경기 시작보다 늦게는 못 정한다');
  assert.throws(()=>make({start:iso(start),end:iso(start+7200e3),deadline:iso(NOW-DAY)}),/투표 마감/,'지난 시각으로는 못 정한다');
  const picked=make({start:iso(start),end:iso(start+7200e3),deadline:iso(start-2*3600e3)});
  assert.equal(sideOf(s,picked.gameId,a).deadline,iso(start-2*3600e3),'고른 마감이 그대로 저장된다');
  assert.equal(s.games.find(x=>x.id===picked.gameId).lat,null,'좌표를 안 주면 비워둔다');
  const withCoord=make({start:iso(NOW+7*DAY),end:iso(NOW+7*DAY+7200e3),lat:37.3219,lng:127.0977});
  const coordGame=s.games.find(x=>x.id===withCoord.gameId);
  assert.equal(coordGame.lat,37.3219);assert.equal(coordGame.lng,127.0977);
  const bad=make({start:iso(NOW+11*DAY),end:iso(NOW+11*DAY+7200e3),lat:'북위 어딘가',lng:999});
  const badGame=s.games.find(x=>x.id===bad.gameId);
  assert.equal(badGame.lat,null,'숫자가 아닌 좌표는 버린다');
  assert.equal(badGame.lng,null,'범위를 벗어난 좌표는 버린다');
  const later=NOW+9*DAY,blank2=make({start:iso(later),end:iso(later+7200e3)});
  assert.equal(sideOf(s,blank2.gameId,a).deadline,iso(later),'비우면 경기 시작 시각으로 마감한다');
  assert.throws(()=>command(s,A,{type:'sideSettings',teamId:a,gameId:picked.gameId,note:'',meeting:'',needed:11,deadline:iso(NOW-DAY)}),/투표 마감 시간/,'지난 시각은 조용히 무시하지 않고 거부한다');
  command(s,A,{type:'sideSettings',teamId:a,gameId:picked.gameId,note:'',meeting:'',needed:11,deadline:iso(start-3600e3)});
  assert.equal(sideOf(s,picked.gameId,a).deadline,iso(start-3600e3),'나중에 바꿀 수 있다');
});

test('참여 투표 알림은 미응답자에게만 가고 마감 뒤에는 보낼 수 없다',()=>{
  const {s,a}=fixture();
  const one={id:'p1',name:'선수1'},two={id:'p2',name:'선수2'};
  addPlayer(s,a,one);addPlayer(s,a,two);
  const gameId=game(s,a,{start:NOW+2*DAY});
  command(s,one,{type:'vote',teamId:a,gameId,value:'yes'});
  assert.throws(()=>command(s,one,{type:'remindVote',teamId:a,gameId}),/권한/,'일반 팀원은 보낼 수 없다');
  const before=s.notifications.length;
  const out=command(s,A,{type:'remindVote',teamId:a,gameId});
  const sent=s.notifications.slice(before);
  assert.equal(out.notified,sent.length);
  assert.equal(sent.some(n=>n.userId===one.id),false,'이미 응답한 사람은 제외한다');
  assert.equal(sent.some(n=>n.userId===two.id),true,'미응답자에게는 보낸다');
  assert.throws(()=>command(s,A,{type:'remindVote',teamId:a,gameId}),/6시간/,'연달아 보내지 못한다');
  const sixHours=NOW+6*3600e3+1000;
  command(s,two,{type:'vote',teamId:a,gameId,value:'no'},sixHours);
  command(s,A,{type:'vote',teamId:a,gameId,value:'yes'},sixHours);
  assert.throws(()=>command(s,A,{type:'remindVote',teamId:a,gameId},sixHours),/응답하지 않은 선수가 없어요/);
  const afterDeadline=Date.parse(sideOf(s,gameId,a).deadline)+1000;
  assert.throws(()=>command(s,A,{type:'remindVote',teamId:a,gameId},afterDeadline),/마감/);
  command(s,A,{type:'cancelGame',teamId:a,gameId,reason:'우천'});
  assert.throws(()=>command(s,A,{type:'remindVote',teamId:a,gameId}),/취소된 경기/);
});

test('가입에는 약관·개인정보 동의와 만 14세 확인이 필요하고 동의 시각을 남긴다',async()=>{
  const db=localDatabase();
  await assert.rejects(()=>auth.signUp({email:'a@b.com',name:'가나',password:'teamkick-1234',adult:true}),/동의/,'동의 없이 가입할 수 없다');
  await assert.rejects(()=>auth.signUp({email:'a@b.com',name:'가나',password:'teamkick-1234',agree:true}),/14세/,'나이 확인 없이 가입할 수 없다');
  await assert.rejects(()=>auth.signUp({email:'a@b.com',name:'가나',password:'teamkick-1234',agree:'예',adult:true}),/동의/,'체크하지 않은 값은 동의로 보지 않는다');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,0,'거부된 가입은 계정을 만들지 않는다');
  await register({email:'a@b.com',name:'가나',password:'teamkick-1234'});
  const row=db.prepare('SELECT agreed_at FROM accounts').get();
  assert.ok(row.agreed_at&&Number.isFinite(Date.parse(row.agreed_at)),'동의 시각을 저장한다');
  db.close();
});

test('탈퇴하면 팀 활동이 정리되고 남은 기록에서 개인 식별 정보가 빠진다',()=>{
  const {s,a}=fixture(),m=addPlayer(s,a);
  const g=game(s,a,{start:NOW-2*DAY});
  command(s,member,{type:'vote',teamId:a,gameId:g,value:'yes'},NOW-3*DAY);
  command(s,A,{type:'completeGame',teamId:a,gameId:g});
  command(s,A,{type:'attendance',teamId:a,gameId:g,values:attendanceDraft(s,sideOf(s,g,a),s.games[0])});
  assert.throws(()=>command(s,A,{type:'closeAccount'}),/주장/,'주장은 인계 전에 탈퇴할 수 없다');
  assert.ok(s.users.some(x=>x.id===member.id));
  command(s,member,{type:'closeAccount'});
  assert.equal(s.members.find(x=>x.id===m.id).status,'left','팀에서 나간 상태가 된다');
  assert.equal(s.users.some(x=>x.id===member.id),false,'계정 이름 기록이 지워진다');
  assert.equal(s.notifications.some(x=>x.userId===member.id),false,'받은 알림이 지워진다');
  assert.equal(s.members.find(x=>x.id===m.id).photo,'','선수 사진 연결이 끊긴다');
  const summary=summaries(visibleState(s,A.id,a),'1970','2100');
  assert.equal(summary.players.find(x=>x.id===m.id).attend,1,'과거 출석 기록은 남는다');
  assert.equal(visibleState(s,member.id).teamId,'','탈퇴 후에는 팀 화면이 보이지 않는다');
});

test('비밀번호 재설정 링크는 한 번만, 한 시간만 쓸 수 있고 다른 기기 세션을 끊는다',async()=>{
  const db=localDatabase();globalThis.__teamkickTestMail=[];
  const {token:oldSession}=await register({email:'reset@t.com',name:'되찾기',password:'teamkick-1234'});
  await auth.requestPasswordReset({email:'없는@주소.com'},'https://teamkick.test');
  assert.equal(globalThis.__teamkickTestMail.length,0,'가입되지 않은 주소에는 보내지 않는다');
  await auth.requestPasswordReset({email:'RESET@T.com'},'https://teamkick.test');
  assert.equal(globalThis.__teamkickTestMail.length,1,'대소문자가 달라도 찾는다');
  const mail=globalThis.__teamkickTestMail[0];
  assert.equal(mail.to,'reset@t.com');
  const link=mail.text.match(/https:\/\/teamkick\.test\/\?reset=([^\s]+)/);
  assert.ok(link,'메일에 재설정 주소가 들어간다');
  const raw=decodeURIComponent(link[1]);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM password_resets WHERE id=?').get(raw).n,0,'토큰 원문은 저장하지 않는다');

  await auth.requestPasswordReset({email:'reset@t.com'},'https://teamkick.test');
  assert.equal(globalThis.__teamkickTestMail.length,1,'연달아 요청해도 다시 보내지 않는다');

  await assert.rejects(()=>auth.resetPassword({token:raw,password:'짧음'}),/8자 이상/);
  await assert.rejects(()=>auth.resetPassword({token:'가짜토큰',password:'teamkick-9999'}),/만료|사용/);
  assert.ok(await auth.currentUser(cookieRequest(oldSession)),'아직은 기존 세션이 살아 있다');

  const done=await auth.resetPassword({token:raw,password:'teamkick-9999'});
  assert.equal(done.user.fullName,'되찾기');
  assert.equal(await auth.currentUser(cookieRequest(oldSession)),null,'재설정하면 기존 기기에서 로그아웃된다');
  assert.ok(await auth.currentUser(cookieRequest(done.token)),'새 세션으로는 들어갈 수 있다');
  await assert.rejects(()=>auth.resetPassword({token:raw,password:'teamkick-0000'}),/만료|사용/,'같은 링크를 다시 쓸 수 없다');
  await assert.rejects(()=>auth.signIn({email:'reset@t.com',password:'teamkick-1234'}),/이메일 또는 비밀번호/,'예전 비밀번호는 막힌다');
  assert.ok((await auth.signIn({email:'reset@t.com',password:'teamkick-9999'})).token,'새 비밀번호로 로그인된다');

  globalThis.__teamkickTestMail=[];
  const later=Date.now()+61*60000;
  await auth.requestPasswordReset({email:'reset@t.com'},'https://teamkick.test',later);
  const second=decodeURIComponent(globalThis.__teamkickTestMail[0].text.match(/reset=([^\s]+)/)[1]);
  await assert.rejects(()=>auth.resetPassword({token:second,password:'teamkick-1111'},later+61*60000),/만료|사용/,'한 시간이 지나면 만료된다');
  db.close();globalThis.__teamkickTestMail=[];
});

test('메일 발송이 설정되지 않으면 비밀번호 찾기를 성공한 것처럼 보이지 않는다',async()=>{
  const db=localDatabase();globalThis.__teamkickTestMail=[];
  await register({email:'nomail@t.com',name:'가나',password:'teamkick-1234'});
  globalThis.__teamkickTestMailReady=false;
  await assert.rejects(()=>auth.requestPasswordReset({email:'nomail@t.com'},'https://teamkick.test'),/설정되지 않았어요/);
  assert.equal(globalThis.__teamkickTestMail.length,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM password_resets').get().n,0,'보내지 못하면 토큰도 남기지 않는다');
  globalThis.__teamkickTestMailReady=true;db.close();
});

test('보내는 주소 형식과 메일 설정 여부를 바르게 읽는다',()=>{
  assert.deepEqual(mail.parseFrom('팀킥 <no-reply@teamkick.test>'),{name:'팀킥',email:'no-reply@teamkick.test'});
  assert.deepEqual(mail.parseFrom('  no-reply@teamkick.test  '),{name:'팀킥',email:'no-reply@teamkick.test'});
  assert.deepEqual(mail.parseFrom('<a@b.com>'),{name:'팀킥',email:'a@b.com'});
  const env=globalThis.__teamkickTestEnv;
  const keep={...env};
  delete env.BREVO_API_KEY;delete env.RESEND_API_KEY;delete env.MAIL_FROM;
  assert.equal(mail.mailReady(),false,'키도 보내는 주소도 없으면 꺼진 상태다');
  env.BREVO_API_KEY='x';
  assert.equal(mail.mailReady(),false,'보내는 주소가 없으면 아직 못 쓴다');
  env.MAIL_FROM='팀킥 <a@b.com>';
  assert.equal(mail.mailReady(),true);
  delete env.BREVO_API_KEY;env.RESEND_API_KEY='y';
  assert.equal(mail.mailReady(),true,'다른 서비스 키로도 동작한다');
  for(const k of Object.keys(env))delete env[k];Object.assign(env,keep);
});

test('메일 요청 본문에 보내는 주소·받는 주소·회신 주소를 채워 보낸다',async()=>{
  const env=globalThis.__teamkickTestEnv;const keep={...env};
  const realFetch=globalThis.fetch;const calls=[];
  globalThis.fetch=async(url,init)=>{calls.push({url,init});return {ok:true,status:200}};
  try{
    for(const k of Object.keys(env))delete env[k];
    env.BREVO_API_KEY='brevo-test-key';env.MAIL_FROM='팀킥 <no-reply@teamkick.test>';
    await mail.sendMail('member@teamkick.test','비밀번호 재설정','본문 <링크>');
    assert.equal(calls.length,1,'한 번만 호출한다');
    assert.equal(calls[0].url,'https://api.brevo.com/v3/smtp/email','Brevo 키가 있으면 Brevo로 보낸다');
    assert.equal(calls[0].init.headers['api-key'],'brevo-test-key');
    const body=JSON.parse(calls[0].init.body);
    assert.deepEqual(body.sender,{name:'팀킥',email:'no-reply@teamkick.test'},'보내는 주소는 MAIL_FROM에서 온다');
    assert.deepEqual(body.to,[{email:'member@teamkick.test'}]);
    assert.equal(body.replyTo?.email,legal.CONTACT,'회신은 문의처로 받는다');
    assert.ok(body.htmlContent.includes('&lt;링크&gt;'),'본문을 HTML에 그대로 넣지 않는다');
    // 다른 서비스 키로 바꾸면 그쪽 형식으로 보낸다.
    calls.length=0;delete env.BREVO_API_KEY;env.RESEND_API_KEY='resend-test-key';
    await mail.sendMail('member@teamkick.test','비밀번호 재설정','본문');
    assert.equal(calls[0].url,'https://api.resend.com/emails');
    assert.equal(JSON.parse(calls[0].init.body).reply_to,legal.CONTACT,'회신 주소는 서비스가 달라도 붙는다');
    // 발송 서비스가 거절하면 사용자에게는 다시 시도하라고만 알린다.
    globalThis.fetch=async()=>({ok:false,status:429});
    await assert.rejects(()=>mail.sendMail('member@teamkick.test','제목','본문'),/잠시 후 다시/);
    // 그 밖의 거절은 원인을 좁힐 수 있게 상태 코드를 남긴다.
    globalThis.fetch=async()=>({ok:false,status:400});
    await assert.rejects(()=>mail.sendMail('member@teamkick.test','제목','본문'),/400/);
  }finally{
    globalThis.fetch=realFetch;
    for(const k of Object.keys(env))delete env[k];Object.assign(env,keep);
  }
});

test('같은 접속 주소에서 반복되는 가입·로그인·비밀번호 찾기를 막는다',async()=>{
  const db=localDatabase();
  const one='203.0.113.7',two='203.0.113.8';
  const allowed=auth.LIMITS.signup.max;
  for(let i=0;i<allowed;i++)await auth.limit('signup',one,NOW);
  await assert.rejects(()=>auth.limit('signup',one,NOW),/요청이 너무 잦아요/,'한 시간에 정해진 횟수를 넘기면 막는다');
  await auth.limit('signup',two,NOW); // 다른 접속 주소는 영향을 받지 않는다
  await auth.limit('login',one,NOW);  // 작업마다 따로 센다
  await auth.limit('signup',one,NOW+61*60000); // 시간이 지나면 다시 열린다
  for(let i=0;i<30;i++)await auth.limit('signup','',NOW); // 주소를 모르면 계정 단위 보호에 맡긴다
  const rows=db.prepare('SELECT id FROM rate_limits').all();
  assert.ok(rows.length>0,'기록이 남아야 제한이 동작한다');
  assert.ok(rows.every(r=>!r.id.includes('203.0.113')),'접속 주소 원문을 저장하지 않는다');
});

test('제한 기록은 시간이 지나면 지운다',async()=>{
  const db=localDatabase();
  await auth.limit('login','203.0.113.9',NOW);
  assert.equal(db.prepare('SELECT count(*) AS n FROM rate_limits').get().n,1);
  await auth.limit('login','203.0.113.10',NOW+16*60000); // 새 구간을 열 때 지난 기록을 함께 지운다
  const rows=db.prepare('SELECT id FROM rate_limits').all();
  assert.equal(rows.length,1,'만료된 기록은 남기지 않는다');
});

test('가입하면 확인 메일을 보내고, 확인 전에는 팀을 만들거나 가입 신청할 수 없다',async()=>{
  const db=localDatabase();globalThis.__teamkickTestMail=[];
  const {user}=await auth.signUp({email:'new@t.com',name:'새사람',password:'teamkick-1234',agree:true,adult:true},'https://teamkick.test');
  assert.equal(globalThis.__teamkickTestMail.length,1,'가입하면 확인 메일이 나간다');
  const link=globalThis.__teamkickTestMail[0].text.match(/https:\/\/teamkick\.test\/\?verify=([^\s]+)/);
  assert.ok(link,'메일에 확인 주소가 들어 있다');
  assert.equal(db.prepare('SELECT verified_at FROM accounts WHERE id=?').get(user.userId).verified_at,null,'아직 확인 전이다');

  const unverified={id:user.userId,name:'새사람',verified:false};
  assert.throws(()=>applyCommand(blank(),unverified,{type:'createTeam',name:'새 팀',region:'서울',description:'설명'}),/이메일 확인/);
  const f=fixture();
  assert.throws(()=>applyCommand(f.s,unverified,{type:'joinTeam',teamId:f.a,name:'새사람'}),/이메일 확인/);

  await auth.verifyEmail({token:decodeURIComponent(link[1])});
  assert.ok(db.prepare('SELECT verified_at FROM accounts WHERE id=?').get(user.userId).verified_at,'확인 시각이 남는다');
  applyCommand(f.s,{id:user.userId,name:'새사람',verified:true},{type:'joinTeam',teamId:f.a,name:'새사람'});
  await assert.rejects(()=>auth.verifyEmail({token:decodeURIComponent(link[1])}),/만료되었거나 이미 사용/,'한 번만 쓸 수 있다');

  // 메일 발송이 준비되지 않았으면 가입은 되되 확인 메일은 나가지 않는다.
  globalThis.__teamkickTestMailReady=false;
  await auth.signUp({email:'nomail@t.com',name:'메일없음',password:'teamkick-1234',agree:true,adult:true},'https://teamkick.test');
  globalThis.__teamkickTestMailReady=undefined;
  assert.equal(globalThis.__teamkickTestMail.length,1,'설정이 없으면 보내지 않는다');
});

test('확인 메일 재발송은 간격을 두고, 이미 확인한 계정에는 보내지 않는다',async()=>{
  localDatabase();globalThis.__teamkickTestMail=[];
  const origin='https://teamkick.test';
  const {user}=await auth.signUp({email:'again@t.com',name:'다시',password:'teamkick-1234',agree:true,adult:true},origin);
  assert.equal(await auth.resendVerification(user.userId,origin),false,'연달아 보내지 않는다');
  assert.equal(globalThis.__teamkickTestMail.length,1);
  assert.equal(await auth.resendVerification(user.userId,origin,Date.now()+4*60000),true,'간격이 지나면 다시 보낸다');
  assert.equal(globalThis.__teamkickTestMail.length,2);
  const first=globalThis.__teamkickTestMail[0].text.match(/verify=([^\s]+)/)[1];
  await assert.rejects(()=>auth.verifyEmail({token:decodeURIComponent(first)},Date.now()+25*3600e3),/만료되었거나 이미 사용/,'24시간이 지나면 못 쓴다');
  const second=globalThis.__teamkickTestMail[1].text.match(/verify=([^\s]+)/)[1];
  await auth.verifyEmail({token:decodeURIComponent(second)});
  assert.equal(await auth.resendVerification(user.userId,origin,Date.now()+60*60000),false,'이미 확인한 계정에는 보내지 않는다');
  assert.equal(globalThis.__teamkickTestMail.length,2);
});

test('migration 이 적용되지 않았으면 준비가 끝나지 않았다고 안내한다',async()=>{
  const db=localDatabase(),{s,a}=fixture();await repository.commit(blank(),s,0);
  globalThis.__teamkickTestIdentity={userId:A.id,fullName:A.name};
  db.exec('DROP TABLE entities'); // 배포 후 테이블이 없는 상태를 흉내 낸다
  const req=new Request('https://example.test/api/app',{method:'POST',headers:{'content-type':'application/json',origin:'https://example.test'},body:JSON.stringify({type:'createNotice',teamId:a,title:'제목',body:'내용',mutationId:'setup-1'})});
  const res=await api.POST(req);
  assert.equal(res.status,503);
  assert.match((await res.json()).error,/데이터베이스 준비/,'원인 모를 실패 대신 준비 미완료를 알린다');
  globalThis.__teamkickTestIdentity=null;db.close();
});

// 배포 환경에 migration 도구가 없어 앱이 표를 직접 만든다(lib/schema.ts).
// 그 문장들이 drizzle/ 의 migration 과 같은 스키마를 만드는지 실제로 비교한다.
function describe(db){
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
  const shape={};
  for(const t of tables){
    shape[t]={
      columns:db.prepare(`PRAGMA table_info(${t})`).all().map(c=>[c.name,c.type,c.notnull,c.dflt_value,c.pk].join('|')).sort(),
      indexes:db.prepare(`PRAGMA index_list(${t})`).all().map(i=>i.name+':'+i.unique+':'+db.prepare(`PRAGMA index_info(${i.name})`).all().map(x=>x.name).join(',')).sort(),
      check:/CHECK/i.test(db.prepare("SELECT sql FROM sqlite_master WHERE name=?").get(t).sql??''),
    };
  }
  return shape;
}

test('앱이 직접 만드는 표가 drizzle migration 과 같은 스키마를 만든다',()=>{
  const fromMigrations=new DatabaseSync(':memory:');
  for(const name of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())fromMigrations.exec(fs.readFileSync(path.join('drizzle',name),'utf8'));
  const fromApp=new DatabaseSync(':memory:');
  const apply=()=>{for(const sql of schema.STATEMENTS){try{fromApp.exec(sql)}catch(e){if(!/duplicate column name/i.test(String(e)))throw e}}};
  apply();
  assert.deepEqual(describe(fromApp),describe(fromMigrations),'migration 을 새로 추가하면 lib/schema.ts 도 함께 고쳐야 한다');
  apply(); // 여러 번 실행해도 안전해야 한다
  assert.deepEqual(describe(fromApp),describe(fromMigrations),'다시 실행해도 스키마가 달라지지 않는다');
  fromMigrations.close();fromApp.close();
});

test('상태 확인은 없는 표를 만들고 실제 존재 여부를 알려준다',async()=>{
  const db=localDatabase();
  for(const t of schema.TABLES)db.exec(`DROP TABLE IF EXISTS ${t}`);
  assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get().n,0,'표가 없는 상태에서 시작한다');
  const status=await schema.schemaStatus();
  assert.equal(status.db,true);
  assert.equal(status.error,'','준비 중 오류가 없어야 한다');
  for(const t of schema.TABLES)assert.equal(status.tables[t],true,t+' 표가 만들어져야 한다');
  db.close();
});

// Cloudflare Workers 는 PBKDF2 반복을 10만 회로 제한한다. Node 는 제한이 없어
// 이 값을 넘겨도 로컬에서는 통과한다. 그래서 상한 자체를 테스트로 고정한다.
test('비밀번호 해시는 Workers 반복 상한을 넘지 않고 작업량을 유지한다',async()=>{
  assert.equal(auth.ROUND_ITERATIONS,100000,'Workers 상한을 넘기면 배포 환경에서 거부된다');
  const stored=await auth.hashPassword('teamkick-1234');
  const [scheme,work,salt,hash]=stored.split('$');
  assert.equal(scheme,'pbkdf2');
  const [iterations,rounds]=work.split('x').map(Number);
  assert.ok(iterations<=auth.ROUND_ITERATIONS,'회차당 반복이 상한을 넘으면 안 된다');
  assert.ok(iterations*rounds>=600000,'전체 작업량은 OWASP 권고(60만) 이상을 유지한다');
  assert.ok(salt&&hash);
  assert.equal(await auth.verifyPassword('teamkick-1234',stored),true);
  assert.equal(await auth.verifyPassword('틀린비밀번호',stored),false);
  assert.equal(stored.includes('teamkick-1234'),false,'원문이 저장되면 안 된다');
});

// 발송이 조용히 실패하는 원인은 대개 보내는 주소의 도메인과 키다.
// 메일을 보내지 않고 둘을 확인할 수 있어야 한다.
test('보내는 도메인과 키 상태를 메일을 보내지 않고 확인한다',async()=>{
  const env=globalThis.__teamkickTestEnv,keep={...env};
  const realFetch=globalThis.fetch;
  try{
    for(const k of Object.keys(env))delete env[k];
    env.MAIL_FROM='팀킥 <no-reply@teamkick.co.kr>';
    assert.equal(mail.fromDomain(),'teamkick.co.kr');
    env.MAIL_FROM='팀킥 <jyp7296@naver.com>';
    assert.equal(mail.fromDomain(),'naver.com','인증하지 않은 도메인이 그대로 드러나야 한다');
    assert.equal(await mail.mailAccount(),'no-key','키가 없으면 그렇게 알린다');
    env.BREVO_API_KEY='brevo-test-key';
    let seen;
    globalThis.fetch=async(url,init)=>{seen={url,init};return {ok:true,status:200}};
    assert.equal(await mail.mailAccount(),'ok');
    assert.equal(seen.url,'https://api.brevo.com/v3/account','메일을 보내지 않고 계정만 조회한다');
    assert.equal(seen.init.headers['api-key'],'brevo-test-key');
    globalThis.fetch=async()=>({ok:false,status:401});
    assert.equal(await mail.mailAccount(),'status-401','키가 틀리면 상태 코드를 알린다');
  }finally{
    globalThis.fetch=realFetch;
    for(const k of Object.keys(env))delete env[k];Object.assign(env,keep);
  }
});

// 보내지 못한 토큰이 남으면 재발송 간격 제한에 걸려 다시 보낼 수 없게 된다.
test('확인 메일 발송이 실패하면 토큰을 남기지 않아 곧바로 다시 보낼 수 있다',async()=>{
  const db=localDatabase();globalThis.__teamkickTestMail=[];
  const origin='https://teamkick.test';
  const {user}=await auth.signUp({email:'fail@t.com',name:'실패',password:'teamkick-1234',agree:true,adult:true},origin);
  assert.equal(globalThis.__teamkickTestMail.length,1);
  db.exec('DELETE FROM email_verifications'); // 가입 때 만든 토큰을 치우고 실패 상황을 만든다
  const realSend=globalThis.__teamkickTestMailFail;
  globalThis.__teamkickTestMailFail=true;
  await assert.rejects(()=>auth.resendVerification(user.userId,origin),/보내지 못했어요/);
  globalThis.__teamkickTestMailFail=realSend;
  assert.equal(db.prepare('SELECT count(*) AS n FROM email_verifications').get().n,0,'실패한 토큰은 남지 않는다');
  assert.equal(await auth.resendVerification(user.userId,origin),true,'간격 제한에 걸리지 않고 바로 다시 보낸다');
  db.close();
});

test('카카오 로그인은 메일 없이 계정을 만들고 같은 사람을 다시 만들지 않는다',async()=>{
  const db=localDatabase();globalThis.__teamkickTestMail=[];
  const first=await auth.signInWithKakao('kakao-9001','재연');
  const row=db.prepare('SELECT id,email,password,provider,verified_at,kakao_id,name FROM accounts').get();
  assert.equal(row.provider,'kakao');
  assert.equal(row.kakao_id,'kakao-9001');
  assert.equal(row.name,'재연');
  assert.equal(row.password,'','비밀번호를 두지 않는다');
  assert.match(row.email,/@teamkick\.invalid$/,'배달되지 않는 자리표시 주소를 쓴다');
  assert.ok(row.verified_at,'카카오가 본인을 확인했으므로 확인 완료로 둔다');

  const again=await auth.signInWithKakao('kakao-9001','재연');
  assert.equal(db.prepare('SELECT count(*) AS n FROM accounts').get().n,1,'같은 사람을 다시 만들지 않는다');
  // 조회로도 막고 email 의 UNIQUE 제약으로도 막는다. 한쪽을 지워도 결과는 같다(의도한 이중 방어).
  assert.equal(db.prepare('SELECT count(*) AS n FROM accounts WHERE kakao_id=?').get('kakao-9001').n,1);
  assert.equal(again.user.userId,first.user.userId);
  assert.notEqual(again.token,first.token,'로그인할 때마다 새 세션을 만든다');

  // 비밀번호로는 들어올 수 없다.
  await assert.rejects(()=>auth.signIn({email:row.email,password:''}),/이메일 또는 비밀번호/);
  await assert.rejects(()=>auth.signIn({email:row.email,password:'teamkick-1234'}),/이메일 또는 비밀번호/);

  // 실제 주소가 아니므로 어떤 메일도 보내지 않는다.
  await auth.requestPasswordReset({email:row.email},'https://teamkick.test');
  assert.equal(await auth.resendVerification(first.user.userId,'https://teamkick.test'),false);
  assert.equal(globalThis.__teamkickTestMail.length,0,'자리표시 주소로는 메일을 보내지 않는다');

  // 확인된 상태이므로 팀 활동이 막히지 않는다.
  const f=fixture();
  applyCommand(f.s,{id:first.user.userId,name:'재연',verified:true},{type:'joinTeam',teamId:f.a,name:'재연'});
  assert.equal(f.s.members.find(m=>m.userId===first.user.userId)?.status,'pending');
  db.close();
});

test('카카오 인증 주소는 키와 콜백 주소와 상태값을 담는다',()=>{
  const env=globalThis.__teamkickTestEnv,keep={...env};
  try{
    for(const k of Object.keys(env))delete env[k];
    assert.equal(kakao.kakaoReady(),false);
    assert.throws(()=>kakao.authorizeUrl('https://teamkick.test','s1'),/설정되지 않았어요/);
    env.KAKAO_REST_KEY='kakao-test-key';
    assert.equal(kakao.kakaoReady(),true);
    assert.equal(kakao.redirectUri('https://teamkick.test'),'https://teamkick.test/api/kakao');
    const url=new URL(kakao.authorizeUrl('https://teamkick.test','s1'));
    assert.equal(url.origin+url.pathname,'https://kauth.kakao.com/oauth/authorize');
    assert.equal(url.searchParams.get('client_id'),'kakao-test-key');
    assert.equal(url.searchParams.get('redirect_uri'),'https://teamkick.test/api/kakao');
    assert.equal(url.searchParams.get('state'),'s1','우리가 시작한 요청인지 확인할 값을 함께 보낸다');
    assert.equal(url.searchParams.get('response_type'),'code');
  }finally{for(const k of Object.keys(env))delete env[k];Object.assign(env,keep)}
});

test('카카오 프로필에서 아이디와 닉네임을 읽고 없으면 기본 이름을 쓴다',async()=>{
  const realFetch=globalThis.fetch;
  try{
    globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({id:9002,kakao_account:{profile:{nickname:'박재연'}}})});
    assert.deepEqual(await kakao.profile('t'),{id:'9002',nickname:'박재연'});
    globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({id:9003})});
    assert.deepEqual(await kakao.profile('t'),{id:'9003',nickname:'팀원'},'닉네임 동의를 받지 않아도 막히지 않는다');
    globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({})});
    await assert.rejects(()=>kakao.profile('t'),/가져오지 못했어요/,'아이디가 없으면 진행하지 않는다');
    globalThis.fetch=async()=>({ok:false,status:401});
    await assert.rejects(()=>kakao.profile('t'),/가져오지 못했어요/);
  }finally{globalThis.fetch=realFetch}
});

// 카카오는 앱 생성 시 Client Secret 이 기본으로 켜져 있다. 빠뜨리면 토큰 요청이 401 이 된다.
test('카카오 토큰 요청은 설정된 client secret 을 함께 보낸다',async()=>{
  const env=globalThis.__teamkickTestEnv,keep={...env};
  const realFetch=globalThis.fetch;
  try{
    for(const k of Object.keys(env))delete env[k];
    env.KAKAO_REST_KEY='kakao-test-key';
    assert.equal(kakao.kakaoSecretSet(),false);
    let seen;
    globalThis.fetch=async(url,init)=>{seen={url,init};return {ok:true,status:200,json:async()=>({access_token:'t'})}};
    await kakao.exchange('code-1','https://teamkick.test');
    let body=new URLSearchParams(seen.init.body);
    assert.equal(seen.url,'https://kauth.kakao.com/oauth/token');
    assert.equal(body.get('grant_type'),'authorization_code');
    assert.equal(body.get('client_id'),'kakao-test-key');
    assert.equal(body.get('redirect_uri'),'https://teamkick.test/api/kakao');
    assert.equal(body.get('code'),'code-1');
    assert.equal(body.get('client_secret'),null,'설정이 없으면 보내지 않는다');

    env.KAKAO_CLIENT_SECRET='kakao-test-secret';
    assert.equal(kakao.kakaoSecretSet(),true);
    await kakao.exchange('code-2','https://teamkick.test');
    body=new URLSearchParams(seen.init.body);
    assert.equal(body.get('client_secret'),'kakao-test-secret','설정이 있으면 반드시 함께 보낸다');

    // 시크릿 없이 401 이면 원인을 짚어 안내한다.
    delete env.KAKAO_CLIENT_SECRET;
    globalThis.fetch=async()=>({ok:false,status:401});
    await assert.rejects(()=>kakao.exchange('code-3','https://teamkick.test'),/client secret 없음/);
    env.KAKAO_CLIENT_SECRET='kakao-test-secret';
    await assert.rejects(()=>kakao.exchange('code-4','https://teamkick.test'),/다시 시도해주세요/);
  }finally{
    globalThis.fetch=realFetch;
    for(const k of Object.keys(env))delete env[k];Object.assign(env,keep);
  }
});

// 저장소가 공개라 짧은 코드는 해시를 거꾸로 맞혀볼 수 있다.
// 환경변수로 코드를 직접 넣으면 저장소에 아무 흔적도 남지 않는다.
test('운영자 초기 설정 코드는 환경변수가 있으면 그것만 인정한다',async()=>{
  const env=globalThis.__teamkickTestEnv,keep={...env};
  try{
    for(const k of Object.keys(env))delete env[k];
    assert.equal(ownerConfig.ownerCodeFromEnv(),false);
    assert.equal(await ownerConfig.checkOwnerCode(""),false,'빈 값은 언제나 거부한다');
    assert.equal(await ownerConfig.checkOwnerCode("아무거나"),false);

    env.OWNER_SETUP_CODE='팀킥-운영자-코드';
    assert.equal(ownerConfig.ownerCodeFromEnv(),true);
    assert.equal(await ownerConfig.checkOwnerCode('팀킥-운영자-코드'),true);
    assert.equal(await ownerConfig.checkOwnerCode('팀킥-운영자-코'),false,'일부만 맞으면 안 된다');
    assert.equal(await ownerConfig.checkOwnerCode('팀킥-운영자-코드 '),false,'뒤에 공백이 붙어도 안 된다');
    assert.equal(await ownerConfig.checkOwnerCode(''),false);
    // 환경변수가 있으면 예전 해시 경로는 쓰지 않는다.
    assert.equal(await ownerConfig.checkOwnerCode(ownerConfig.OWNER_SETUP_HASH),false);
  }finally{for(const k of Object.keys(env))delete env[k];Object.assign(env,keep)}
});

// 자유 입력이면 "서울"과 "서울시"가 따로 놀아 매칭·검색에서 같은 지역이 갈라진다.
test('활동 지역은 목록에 있는 값만 받는다',()=>{
  const s=blank();command(s,owner,{type:'setupOwner'});
  assert.ok(REGIONS.includes('서울')&&REGIONS.includes('경기 남부')&&REGIONS.includes('인천'));
  const {teamId}=command(s,A,{type:'createTeam',name:'한강 FC',region:'서울',description:'설명'});
  assert.equal(s.teams.find(t=>t.id===teamId).region,'서울');
  assert.throws(()=>command(s,B,{type:'createTeam',name:'다른 팀',region:'서울시 마포구',description:'설명'}),/활동 지역/);
  assert.throws(()=>command(s,B,{type:'createTeam',name:'다른 팀',region:'',description:'설명'}),/활동 지역/);
  // 앞뒤 공백은 다듬은 뒤 검사한다. 사용자가 실수로 띄어 써도 막지 않는다.
  const spaced=command(s,C,{type:'createTeam',name:'공백 팀',region:' 서울 ',description:'설명'});
  assert.equal(s.teams.find(t=>t.id===spaced.teamId).region,'서울');
  command(s,owner,{type:'approveTeam',teamId});
  assert.throws(()=>command(s,A,{type:'editTeam',teamId,name:'한강 FC',region:'서울 강서구',description:'설명'}),/활동 지역/);
  command(s,A,{type:'editTeam',teamId,name:'한강 FC',region:'경기 남부',description:'설명'});
  assert.equal(s.teams.find(t=>t.id===teamId).region,'경기 남부');
});

// --- 데이터 백업 ---
// D1 이 사라지면 복구할 다른 수단이 없다. 그래서 백업 파일이 (1) 비밀값을 흘리지 않고
// (2) 손상된 파일로 기존 데이터를 지우지 않고 (3) 실제로 되살리는지 확인한다.

async function seedForBackup(){
  const db=localDatabase();
  const f=fixture();
  const {state,version}=await repository.load();
  await repository.commit(state,f.s,version);
  await auth.signUp({email:'keeper@teamkick.test',name:'보관자',password:'teamkick-1234',agree:true,adult:true});
  return {db,f};
}

test('백업 파일에는 비밀번호와 로그인 정보가 담기지 않는다',async()=>{
  const {db}=await seedForBackup();
  const file=await backup.exportAll();
  const text=JSON.stringify(file);
  assert.ok(file.data.teams.length>0,'팀이 담겨야 한다');
  assert.equal(file.accounts.length,1);
  assert.equal(file.accounts[0].email,'keeper@teamkick.test','계정을 되살리려면 이메일은 있어야 한다');
  assert.equal(file.accounts[0].password,undefined,'비밀번호 해시가 담기면 안 된다');
  assert.ok(!text.includes('pbkdf2'),'어디에도 비밀번호 해시가 남으면 안 된다');
  const stored=db.prepare('SELECT password FROM accounts').get().password;
  assert.ok(stored.startsWith('pbkdf2'),'실제 계정에는 해시가 저장되어 있다');
  assert.ok(!text.includes(stored),'저장된 해시가 파일에 새어 나가면 안 된다');
  db.close();
});

test('손상된 백업 파일은 거절하고 기존 데이터를 건드리지 않는다',async()=>{
  const {db}=await seedForBackup();
  const before=(await repository.load()).state;
  const good=await backup.exportAll();
  const bad=[
    {...good,format:99},
    {...good,data:undefined},
    {...good,data:{...good.data,teams:'팀 아님'}},
    {...good,data:{...good.data,games:[{name:'아이디 없음'}]}},
    {...good,accounts:[{id:'x'}]},
    null,
  ];
  for(const file of bad){
    await assert.rejects(()=>backup.restoreAll(file),/백업 파일|형식|손상|데이터가 없어요/,'거절해야 한다: '+JSON.stringify(file).slice(0,40));
  }
  const after=(await repository.load()).state;
  assert.deepEqual(after.teams,before.teams,'거절된 뒤에도 팀이 그대로여야 한다');
  assert.deepEqual(after.games,before.games,'거절된 뒤에도 경기가 그대로여야 한다');
  db.close();
});

test('백업 파일로 팀과 경기를 되살리고, 계정은 비밀번호 없이 되살아난다',async()=>{
  const {db,f}=await seedForBackup();
  command(f.s,A,{type:'createGame',teamId:f.a,start:iso(NOW+2*DAY),end:iso(NOW+2*DAY+7200000),venue:'수지체육공원',address:'경기 용인시 수지구 포은대로 435',region:'경기 남부',format:'11인제',needed:14,cost:0});
  const {state,version}=await repository.load();
  await repository.commit(state,f.s,version);
  const file=await backup.exportAll();
  assert.equal(file.data.games.length,1);

  // 모든 것을 잃은 상황을 만든다.
  db.exec('DELETE FROM entities');db.exec('DELETE FROM accounts');
  assert.equal((await repository.load()).state.teams.length,0,'비워졌는지 확인');

  const out=await backup.restoreAll(file);
  assert.equal(out.accounts,1,'계정 1개를 되살려야 한다');
  const back=(await repository.load()).state;
  assert.equal(back.teams.length,file.data.teams.length,'팀이 돌아와야 한다');
  assert.equal(back.games.length,1,'경기가 돌아와야 한다');
  assert.equal(back.games[0].venue,'수지체육공원');
  assert.equal(back.settings.find(x=>x.id==='owner')?.userId,'owner','운영자 설정도 돌아와야 한다');

  // 비밀번호는 담기지 않았으므로 예전 비밀번호로는 못 들어간다.
  await assert.rejects(()=>auth.signIn({email:'keeper@teamkick.test',password:'teamkick-1234'}),/이메일 또는 비밀번호/,'복원된 계정으로 로그인되면 안 된다');
  db.close();
});

test('복원은 이미 있는 계정을 덮어쓰지 않는다',async()=>{
  const {db}=await seedForBackup();
  const file=await backup.exportAll();
  // 백업을 받은 뒤 비밀번호를 바꾼 상황.
  db.prepare('UPDATE accounts SET name=?').run('이름 바꿈');
  const out=await backup.restoreAll(file);
  assert.equal(out.accounts,0,'이미 있는 계정은 되살리지 않는다');
  assert.equal(db.prepare('SELECT name FROM accounts').get().name,'이름 바꿈','지금 계정을 백업 시점으로 되돌리면 안 된다');
  db.close();
});

test('백업은 서비스 운영자만 받을 수 있다',async()=>{
  const {db}=await seedForBackup();
  const url='https://teamkick.co.kr/api/backup';

  globalThis.__teamkickTestIdentity=null;
  assert.equal((await backupApi.GET(new Request(url))).status,401,'로그인하지 않으면 거절');

  globalThis.__teamkickTestIdentity={userId:'a',fullName:'A 주장'};
  assert.equal((await backupApi.GET(new Request(url))).status,403,'주장이어도 운영자가 아니면 거절');
  const stolen=await backupApi.POST(new Request(url,{method:'POST',body:JSON.stringify({confirm:'복원합니다',file:await backup.exportAll()})}));
  assert.equal(stolen.status,403,'운영자가 아니면 복원도 거절');

  globalThis.__teamkickTestIdentity={userId:'owner',fullName:'운영자'};
  const ok=await backupApi.GET(new Request(url));
  assert.equal(ok.status,200);
  assert.match(ok.headers.get('content-disposition')??'',/attachment; filename="teamkick-backup-.*\.json"/);
  assert.ok((await ok.json()).data.teams.length>0);

  // 확인 문구가 없으면 복원하지 않는다.
  const noConfirm=await backupApi.POST(new Request(url,{method:'POST',body:JSON.stringify({confirm:'네',file:await backup.exportAll()})}));
  assert.equal(noConfirm.status,400);
  assert.match((await noConfirm.json()).error,/복원합니다/);

  globalThis.__teamkickTestIdentity=null;db.close();
});

// --- 오래된 기록 정리 ---
// load() 가 매 요청마다 entities 전체를 읽으므로 끝없이 쌓이는 표가 있으면 안 된다.
// 다만 경기·출석·기록은 팀킥의 존재 이유라 한 건도 지워지면 안 된다.

test('정리는 운영 이력과 알림만 건드리고 경기 기록은 한 건도 지우지 않는다',()=>{
  const s=blank();
  const old=iso(NOW-3*365*DAY),recent=iso(NOW-DAY);
  // 3년 된 경기와 출석 — 지워지면 안 된다.
  s.games.push({id:'g1',at:old,start:old,venue:'수지체육공원',goals:[{userId:'p1'}]});
  s.sides.push({id:'s1',at:old,gameId:'g1',attended:['p1']});
  s.teams.push({id:'t1',at:old,name:'팀킥 FC'});
  s.members.push({id:'m1',at:old,teamId:'t1',userId:'p1'});
  s.users.push({id:'p1',at:old,name:'선수'});
  s.notices.push({id:'n1',at:old,title:'3년 전 공지'});
  // 지워져야 하는 것들.
  s.audit.push({id:'a-old',at:old,type:'setTeamLogo'},{id:'a-new',at:recent,type:'approveTeam'});
  s.receipts.push({id:'r-old',at:old},{id:'r-new',at:recent});
  s.notifications.push(
    {id:'read-old',at:iso(NOW-60*DAY),read:true},
    {id:'read-new',at:iso(NOW-10*DAY),read:true},
    {id:'unread-mid',at:iso(NOW-60*DAY),read:false},   // 안 읽었으면 60일은 남긴다
    {id:'unread-ancient',at:old,read:false});

  // 기준 값이 바뀌면 이 테스트가 먼저 알려주도록 묶어 둔다.
  assert.deepEqual(KEEP,{receipts:7,audit:90,readNotice:30,unreadNotice:180,inquiry:365},
    '보관 기간을 바꾸려면 이 기대값과 안내 문구도 함께 고쳐야 한다');

  const removed=prune(s,NOW);

  assert.equal(s.games.length,1,'3년 된 경기가 남아야 한다');
  assert.equal(s.games[0].goals.length,1,'골 기록이 남아야 한다');
  assert.equal(s.sides.length,1,'출석이 남아야 한다');
  assert.equal(s.teams.length,1);assert.equal(s.members.length,1);
  assert.equal(s.users.length,1);assert.equal(s.notices.length,1,'공지는 정리 대상이 아니다');

  assert.deepEqual(s.audit.map(x=>x.id),['a-new'],'90일 지난 운영 이력만 지운다');
  assert.deepEqual(s.receipts.map(x=>x.id),['r-new']);
  assert.deepEqual(s.notifications.map(x=>x.id).sort(),['read-new','unread-mid'],
    '읽은 알림은 30일, 안 읽은 알림은 180일 기준이어야 한다');
  assert.equal(removed,4,'지운 건수를 돌려줘야 한다');
});

test('날짜를 읽을 수 없는 줄은 지우지 않는다',()=>{
  const s=blank();
  s.audit.push({id:'a1',at:'날짜아님',type:'x'},{id:'a2',type:'열이없음'},{id:'a3',at:null});
  assert.equal(prune(s,NOW),0);
  assert.equal(s.audit.length,3,'판단할 수 없는 줄은 남긴다');
});

test('한 요청에서 지우는 양을 제한한다',()=>{
  const s=blank();
  const old=iso(NOW-365*DAY);
  for(let i=0;i<PRUNE_LIMIT*3;i++)s.audit.push({id:'a'+i,at:old,type:'createTeam'});
  assert.equal(prune(s,NOW),PRUNE_LIMIT,'한 번에 상한까지만 지운다');
  assert.equal(s.audit.length,PRUNE_LIMIT*2,'나머지는 다음 요청에서 지운다');
  prune(s,NOW);prune(s,NOW);
  assert.equal(s.audit.length,0,'여러 번 거치면 결국 다 지워진다');
});

test('정리는 실제 저장 경로에서 함께 돌아간다',async()=>{
  const db=localDatabase();
  const f=fixture();
  f.s.audit.push({id:'a-ancient',at:iso(NOW-365*DAY),actor:'owner',type:'setTeamLogo'});
  f.s.notifications.push({id:'n-read-old',at:iso(NOW-90*DAY),userId:'a',read:true,title:'옛 알림'});
  const seeded=(await repository.load()).version;
  await repository.commit(blank(),f.s,seeded);
  assert.ok((await repository.load()).state.audit.some(x=>x.id==='a-ancient'),'정리 전에는 남아 있다');

  globalThis.__teamkickTestIdentity={userId:'a',fullName:'A 주장'};
  const res=await api.POST(new Request('https://teamkick.co.kr/api/app',{method:'POST',
    body:JSON.stringify({mutationId:'prune-1',type:'editTeam',teamId:f.a,name:'이름 바꿈',region:'서울',description:'설명'})}));
  assert.equal(res.status,200,JSON.stringify(await res.clone().json()).slice(0,200));

  const after=(await repository.load()).state;
  assert.ok(!after.audit.some(x=>x.id==='a-ancient'),'요청 한 번으로 오래된 운영 이력이 정리되어야 한다');
  assert.ok(!after.notifications.some(x=>x.id==='n-read-old'),'읽은 지 오래된 알림도 정리되어야 한다');
  assert.equal(after.teams.length,3,'팀은 그대로여야 한다');
  globalThis.__teamkickTestIdentity=null;db.close();
});

// --- 진단 경로(/api/health) 노출 범위 ---
// 공개 전환 후에는 누구나 열 수 있다. 무엇이 설정되어 있는지는 그 자체가
// 공격자에게 쓸모 있는 지도가 되므로 운영자에게만 보여준다.

const healthOf=async()=>(await health.GET(new Request('https://teamkick.co.kr/api/health'))).json();

test('운영자가 없는 처음 설치 상태에서는 진단 정보를 다 보여준다',async()=>{
  const db=localDatabase();
  globalThis.__teamkickTestIdentity=null;
  const out=await healthOf();
  assert.equal(out.ownerSetupCode,'env','운영자 등록에 필요한 정보를 볼 수 있어야 한다');
  assert.ok('mailReady' in out);
  db.close();
});

test('운영자가 정해진 뒤에는 남에게 설정 상태를 보여주지 않는다',async()=>{
  const db=localDatabase();
  const f=fixture();
  await repository.commit(blank(),f.s,(await repository.load()).version);

  globalThis.__teamkickTestIdentity=null;
  const anon=await healthOf();
  assert.deepEqual(Object.keys(anon).sort(),['build','database','version'],'배포 확인에 필요한 것만 남긴다');
  assert.equal(anon.version,'9.9.9','배포된 앱 버전을 확인할 수 있어야 한다');

  globalThis.__teamkickTestIdentity={userId:'a',fullName:'A 주장'};
  const captain=await healthOf();
  assert.deepEqual(Object.keys(captain).sort(),['build','database','version'],'주장이어도 운영자가 아니면 못 본다');

  globalThis.__teamkickTestIdentity={userId:'owner',fullName:'운영자'};
  const owner=await healthOf();
  assert.ok(owner.mailReady!==undefined&&owner.kakaoSecret!==undefined&&owner.tables!==undefined,
    '운영자는 전부 볼 수 있어야 한다');
  // 로그인 수단이 실제로 켜졌는지 배포 뒤에 확인할 방법이 있어야 한다.
  // 없으면 "키를 넣었는데 되는지 모르겠다" 상태에서 확인할 길이 없다.
  assert.equal(owner.googleReady,true,'구글 로그인 준비 여부를 볼 수 있어야 한다');
  assert.equal(owner.naverReady,false,'네이버도 따로 볼 수 있어야 한다');
  globalThis.__teamkickTestIdentity=null;db.close();
});

test('실패 응답에 내부 오류 원문을 담지 않는다',async()=>{
  const db=localDatabase();
  const secret='D1_ERROR: connection to 10.0.0.7 lost near "entities"';
  const post=(n)=>api.POST(new Request('https://teamkick.co.kr/api/app',{method:'POST',
    body:JSON.stringify({mutationId:'leak-'+n,type:'createTeam',name:'팀',region:'서울',description:'설명'})}));
  globalThis.__teamkickTestIdentity={userId:'a',fullName:'A 주장'};

  // ① 표가 없는 경우 — 안내 문구로 바꿔 보여준다
  db.exec('DROP TABLE entities');
  const missing=JSON.stringify(await (await post(1)).json());
  assert.ok(!/no such table|SQLITE|SqliteError/i.test(missing),'표 이름이 새어 나가면 안 된다: '+missing);

  // ② 그 밖의 오류 — 원문이 한 글자도 나가면 안 된다
  const broken=()=>{throw new Error(secret)};
  globalThis.__teamkickTestEnv.DB={prepare(){return {bind(){return this},first:broken,all:broken,run:broken}},batch:broken};
  const other=JSON.stringify(await (await post(2)).json());
  assert.ok(!other.includes('D1_ERROR')&&!other.includes('10.0.0.7')&&!other.includes('entities'),
    '내부 오류 원문이 사용자에게 가면 안 된다: '+other);

  globalThis.__teamkickTestIdentity=null;db.close();
});

// --- 탈퇴한 사람의 표시 이름 가리기 ---
// 기본은 남긴다(팀의 공동 기록). 다만 본인이 삭제를 요구하면(개인정보보호법 제36조)
// 운영자가 이름만 가릴 수 있어야 한다. 방법이 아예 없으면 그게 문제가 된다.


test('탈퇴해도 과거 기록의 표시 이름은 그대로 남는다',()=>{
  const f=fixture();
  const quitter={id:'quitter',name:'박재연'};
  f.s.users.push({id:'quitter',name:'박재연',at:iso(NOW-20*DAY)});
  f.s.members.push({id:'m-q',teamId:f.a,userId:'quitter',name:'박재연',role:'player',status:'active',number:7,position:'FW',periods:[{start:iso(NOW-20*DAY)}],photo:'p.jpg',at:iso(NOW-20*DAY)});

  command(f.s,quitter,{type:'closeAccount'},NOW);

  assert.ok(!f.s.users.some(x=>x.id==='quitter'),'계정은 지워진다');
  assert.equal(f.s.members.find(x=>x.id==='m-q').name,'박재연','과거 기록의 이름은 남는다');
  assert.equal(f.s.members.find(x=>x.id==='m-q').photo,'','사진은 지운다');
});

test('운영자만 탈퇴한 사람의 이름을 가릴 수 있다',()=>{
  const f=fixture();
  f.s.users.push({id:'quitter',name:'박재연',at:iso(NOW-20*DAY)});
  f.s.members.push({id:'m1',teamId:f.a,userId:'quitter',name:'박재연',role:'player',status:'left',number:7,position:'FW',periods:[],at:iso(NOW-20*DAY)});
  f.s.members.push({id:'m2',teamId:f.b,userId:'quitter',name:'박재연',role:'player',status:'left',number:9,position:'MF',periods:[],at:iso(NOW-20*DAY)});

  // 아직 탈퇴하지 않았으면 못 가린다
  assert.throws(()=>command(f.s,owner,{type:'anonymizeMember',userId:'quitter'}),/탈퇴하지 않은/);

  command(f.s,{id:'quitter',name:'박재연'},{type:'closeAccount'},NOW);

  // 주장도, 남도 못 한다
  assert.throws(()=>command(f.s,A,{type:'anonymizeMember',userId:'quitter'}),/운영자/);
  assert.throws(()=>command(f.s,{id:'stranger',name:'남'},{type:'anonymizeMember',userId:'quitter'}),/운영자/);
  assert.equal(f.s.members.find(x=>x.id==='m1').name,'박재연','거절된 뒤에도 그대로여야 한다');

  // 운영자는 할 수 있고, 여러 팀의 기록이 한 번에 바뀐다
  const out=command(f.s,owner,{type:'anonymizeMember',userId:'quitter'});
  assert.equal(out.changed,2);
  assert.equal(f.s.members.find(x=>x.id==='m1').name,ANON_NAME);
  assert.equal(f.s.members.find(x=>x.id==='m2').name,ANON_NAME);

  // 두 번은 안 된다
  assert.throws(()=>command(f.s,owner,{type:'anonymizeMember',userId:'quitter'}),/찾지 못했/);
  // 대상이 없으면 거절
  assert.throws(()=>command(f.s,owner,{type:'anonymizeMember',userId:''}),/알려주세요/);
});

test('이름을 가려도 경기 기록은 한 건도 사라지지 않는다',()=>{
  const f=fixture();
  f.s.users.push({id:'quitter',name:'박재연',at:iso(NOW-20*DAY)});
  f.s.members.push({id:'m1',teamId:f.a,userId:'quitter',name:'박재연',role:'player',status:'left',number:7,position:'FW',periods:[],at:iso(NOW-20*DAY)});
  const {gameId}=command(f.s,A,{type:'createGame',teamId:f.a,start:iso(NOW+2*DAY),end:iso(NOW+2*DAY+7200000),venue:'수지체육공원',address:'경기 용인시 수지구 포은대로 435',region:'경기 남부',format:'11인제',needed:14,cost:0});
  const game=f.s.games.find(g=>g.id===gameId);
  game.goals=[{userId:'quitter',assist:''}];

  command(f.s,{id:'quitter',name:'박재연'},{type:'closeAccount'},NOW);
  command(f.s,owner,{type:'anonymizeMember',userId:'quitter'});

  assert.equal(f.s.games.find(g=>g.id===gameId).goals.length,1,'골 기록은 남아야 한다');
  assert.equal(f.s.games.find(g=>g.id===gameId).goals[0].userId,'quitter','누구의 골인지도 남는다');
  assert.equal(f.s.members.find(x=>x.id==='m1').name,ANON_NAME,'표시 이름만 바뀐다');
});

test('탈퇴자 목록은 운영자에게만 보낸다',()=>{
  const f=fixture();
  f.s.users.push({id:'quitter',name:'박재연',at:iso(NOW-20*DAY)});
  f.s.members.push({id:'m1',teamId:f.a,userId:'quitter',name:'박재연',role:'player',status:'left',number:7,position:'FW',periods:[],at:iso(NOW-20*DAY)});
  command(f.s,{id:'quitter',name:'박재연'},{type:'closeAccount'},NOW);

  assert.deepEqual(visibleState(f.s,'a',f.a).retired,[],'주장에게는 보내지 않는다');
  assert.deepEqual(visibleState(f.s,'stranger').retired,[],'남에게는 보내지 않는다');

  const seen=visibleState(f.s,'owner').retired;
  assert.equal(seen.length,1);
  assert.equal(seen[0].name,'박재연');
  assert.equal(seen[0].hidden,false);

  command(f.s,owner,{type:'anonymizeMember',userId:'quitter'});
  assert.equal(visibleState(f.s,'owner').retired[0].hidden,true,'가린 뒤에는 완료로 표시된다');
});

// --- MY 화면: 내 전체 기록 / 1:1 문의 / 서비스 공지 ---

test('내 전체 기록은 여러 팀을 합산한다',()=>{
  const f=fixture();
  // 같은 사람이 두 팀에서 뛴다.
  for(const [team,mid] of [[f.a,'m-a'],[f.b,'m-b']])
    f.s.members.push({id:mid,teamId:team,userId:'runner',name:'선수',role:'player',status:'active',number:9,position:'FW',periods:[{start:iso(NOW-30*DAY)}],at:iso(NOW-30*DAY)});
  f.s.users.push({id:'runner',name:'선수',at:iso(NOW-30*DAY)});
  let n=0;
  for(const [team,mid] of [[f.a,'m-a'],[f.b,'m-b']]){
    const gid='g'+(++n);
    f.s.games.push({id:gid,teamId:team,home:team,status:'completed',start:iso(NOW-10*DAY),end:iso(NOW-10*DAY+7200000),venue:'구장',at:iso(NOW-30*DAY)});
    f.s.sides.push({id:'s'+n,teamId:team,gameId:gid,attendanceFinal:true,recordsFinal:true,
      attendance:{[mid]:true},records:{[mid]:{goals:2,assists:1}},deadline:iso(NOW-11*DAY),at:iso(NOW-30*DAY)});
  }
  const t=visibleState(f.s,'runner',f.a).myTotals;
  assert.equal(t.teams,2,'두 팀이 잡혀야 한다');
  assert.equal(t.played,2,'두 경기');
  assert.equal(t.goals,4,'골이 합산되어야 한다');
  assert.equal(t.assists,2);
  assert.equal(t.rate,100,'출석률');

  // 남의 기록이 섞이면 안 된다
  assert.equal(visibleState(f.s,'a',f.a).myTotals.goals,0,'다른 사람 기록이 섞이면 안 된다');
});

test('확정되지 않은 기록은 내 전체 기록에 들어가지 않는다',()=>{
  const f=fixture();
  f.s.users.push({id:'runner',name:'선수',at:iso(NOW-30*DAY)});
  f.s.members.push({id:'m1',teamId:f.a,userId:'runner',name:'선수',role:'player',status:'active',number:9,position:'FW',periods:[{start:iso(NOW-30*DAY)}],at:iso(NOW-30*DAY)});
  f.s.games.push({id:'g1',teamId:f.a,home:f.a,status:'completed',start:iso(NOW-10*DAY),end:iso(NOW-10*DAY+7200000),venue:'구장',at:iso(NOW-30*DAY)});
  f.s.sides.push({id:'s1',teamId:f.a,gameId:'g1',attendanceFinal:false,recordsFinal:false,
    attendance:{m1:true},records:{m1:{goals:3,assists:3}},deadline:iso(NOW-11*DAY),at:iso(NOW-30*DAY)});
  const t=visibleState(f.s,'runner',f.a).myTotals;
  assert.equal(t.played,1,'경기는 센다');
  assert.equal(t.goals,0,'확정 전 골은 세지 않는다');
  assert.equal(t.rate,null,'확정 전 출석은 출석률에 넣지 않는다');
});

test('1:1 문의는 본인과 운영자만 보고, 운영자만 답변한다',()=>{
  const f=fixture();
  const out=command(f.s,A,{type:'askSupport',message:'구장 검색이 안 돼요'});
  assert.ok(out.inquiryId);
  command(f.s,B,{type:'askSupport',message:'다른 사람 문의'});

  assert.equal(visibleState(f.s,'a',f.a).inquiries.length,1,'본인 것만 보여야 한다');
  assert.equal(visibleState(f.s,'a',f.a).inquiries[0].message,'구장 검색이 안 돼요');
  assert.equal(visibleState(f.s,'owner').inquiries.length,2,'운영자는 전부 본다');
  assert.equal(visibleState(f.s,'stranger').inquiries.length,0,'남의 문의는 안 보인다');

  // 주장은 답변할 수 없다
  assert.throws(()=>command(f.s,B,{type:'replySupport',inquiryId:out.inquiryId,message:'제가 답할게요'}),/운영자/);
  assert.equal(f.s.inquiries.find(x=>x.id===out.inquiryId).status,'open');

  command(f.s,owner,{type:'replySupport',inquiryId:out.inquiryId,message:'카카오 키를 확인해주세요'});
  const row=f.s.inquiries.find(x=>x.id===out.inquiryId);
  assert.equal(row.status,'answered');
  assert.equal(row.replies[0].message,'카카오 키를 확인해주세요');
  assert.ok(f.s.notifications.some(n=>n.userId==='a'&&n.title.includes('답변')),'문의한 사람에게 알려야 한다');

  assert.throws(()=>command(f.s,owner,{type:'replySupport',inquiryId:'없음',message:'ㅇㅇ'}),/찾을 수 없어요/);
  assert.throws(()=>command(f.s,A,{type:'askSupport',message:'   '}),/입력|적어|확인/);
});

test('답변을 기다리는 문의가 쌓이면 더 받지 않는다',()=>{
  const f=fixture();
  for(let i=0;i<3;i++)command(f.s,A,{type:'askSupport',message:'문의 '+i});
  assert.throws(()=>command(f.s,A,{type:'askSupport',message:'네 번째'}),/답변을 기다리는/);
  // 답변이 오면 다시 보낼 수 있다
  command(f.s,owner,{type:'replySupport',inquiryId:f.s.inquiries[0].id,message:'답변'});
  command(f.s,A,{type:'askSupport',message:'다시 문의'});
  assert.equal(f.s.inquiries.filter(x=>x.userId==='a').length,4);
});

test('서비스 공지는 운영자만 올리고 지우며 모두에게 보인다',()=>{
  const f=fixture();
  assert.throws(()=>command(f.s,A,{type:'postAnnouncement',title:'제목',body:'내용'}),/운영자/);
  command(f.s,owner,{type:'postAnnouncement',title:'구장 검색 추가',body:'수지체육공원도 찾을 수 있어요',version:'1.1.0'});
  assert.equal(f.s.announcements.length,1);
  assert.equal(f.s.announcements[0].version,'1.1.0');

  for(const who of ['a','stranger','owner'])
    assert.equal(visibleState(f.s,who).announcements.length,1,who+' 에게도 보여야 한다');

  const nid=f.s.announcements[0].id;
  assert.throws(()=>command(f.s,A,{type:'removeAnnouncement',noticeId:nid}),/운영자/);
  assert.equal(f.s.announcements.length,1,'거절 뒤에도 남아 있어야 한다');
  command(f.s,owner,{type:'removeAnnouncement',noticeId:nid});
  assert.equal(f.s.announcements.length,0);
  assert.throws(()=>command(f.s,owner,{type:'removeAnnouncement',noticeId:nid}),/찾을 수 없어요/);
});

test('나중에 생긴 표가 없는 옛 백업도 되살릴 수 있다',async()=>{
  const db=localDatabase();
  const f=fixture();
  await repository.commit(blank(),f.s,(await repository.load()).version);
  const file=await backup.exportAll();
  // 문의·공지가 없던 시절의 파일을 흉내 낸다.
  delete file.data.inquiries;delete file.data.announcements;
  const out=await backup.restoreAll(file);
  assert.ok(out);
  assert.equal((await repository.load()).state.teams.length,3,'팀은 살아나야 한다');
  assert.deepEqual((await repository.load()).state.inquiries,[],'없던 표는 비어 있는 것으로 본다');

  // 뼈대가 빠진 파일은 받지 않는다
  const broken=await backup.exportAll();delete broken.data.teams;
  await assert.rejects(()=>backup.restoreAll(broken),/teams 항목을 찾지 못했/);
  db.close();
});

test('문의는 1년 뒤에 정리하되 답변 대기 중인 것은 남긴다',()=>{
  const s=blank();
  const old=iso(NOW-400*DAY);
  s.inquiries.push(
    {id:'q-answered-old',userId:'a',status:'answered',message:'오래된 답변 완료',at:old},
    {id:'q-answered-new',userId:'a',status:'answered',message:'최근 답변 완료',at:iso(NOW-100*DAY)},
    {id:'q-open-old',userId:'a',status:'open',message:'오래됐지만 답변 대기',at:old});
  prune(s,NOW);
  assert.deepEqual(s.inquiries.map(x=>x.id).sort(),['q-answered-new','q-open-old'],
    '답변 대기 중인 문의는 오래돼도 지우지 않는다');
});

test('탈퇴하면 내 문의도 함께 지운다',()=>{
  const f=fixture();
  f.s.users.push({id:'quitter',name:'박재연',at:iso(NOW-20*DAY)});
  command(f.s,{id:'quitter',name:'박재연'},{type:'askSupport',message:'문의합니다'});
  command(f.s,A,{type:'askSupport',message:'남의 문의'});
  assert.equal(f.s.inquiries.length,2);
  command(f.s,{id:'quitter',name:'박재연'},{type:'closeAccount'},NOW);
  assert.deepEqual(f.s.inquiries.map(x=>x.userId),['a'],'탈퇴한 사람 문의만 사라져야 한다');
});

// --- 팀 정보 수정: 경기 형식·활동 요일·실력 ---
// 팀을 만들 때만 정할 수 있고 나중에 고칠 수 없었다. 팀 사정은 바뀐다.

test('팀 정보 수정에서 경기 형식·활동 요일·실력을 고칠 수 있다',()=>{
  const f=fixture();
  const before=f.s.teams.find(t=>t.id===f.a);
  assert.equal(before.format,'11인제');
  assert.equal(before.level,'중급','기본값');

  command(f.s,A,{type:'editTeam',teamId:f.a,name:'팀킥 FC',region:'경기 남부',description:'소개',
    format:'8인제',days:'토요일 저녁',level:'상급'});
  const after=f.s.teams.find(t=>t.id===f.a);
  assert.equal(after.format,'8인제');
  assert.equal(after.days,'토요일 저녁');
  assert.equal(after.level,'상급');
  assert.equal(after.name,'팀킥 FC','기존 항목도 그대로 저장돼야 한다');
});

test('경기 형식과 실력은 목록에 있는 값만 받는다',()=>{
  const f=fixture();
  const base={type:'editTeam',teamId:f.a,name:'팀',region:'서울',description:'',days:'일요일 오전'};
  assert.throws(()=>command(f.s,A,{...base,format:'22인제',level:'상급'}),/주 경기 형식/);
  assert.throws(()=>command(f.s,A,{...base,format:'11인제',level:'신급'}),/팀 실력/);
  assert.throws(()=>command(f.s,A,{...base,format:'11인제',level:''}),/팀 실력/);
  assert.equal(f.s.teams.find(t=>t.id===f.a).format,'11인제','거절된 뒤에도 그대로여야 한다');

  // 만들 때도 마찬가지
  assert.throws(()=>command(f.s,{id:'x',name:'새 주장',verified:true},
    {type:'createTeam',name:'새 팀',region:'서울',description:'',format:'3인제'}),/주 경기 형식/);
});

test('값을 보내지 않으면 지금 값을 지킨다',()=>{
  // 배포 중에 예전 화면을 열어둔 사람이 이름만 보낼 수 있다. 그때 형식·실력이
  // 빈 값으로 덮이면 안 된다.
  const f=fixture();
  command(f.s,A,{type:'editTeam',teamId:f.a,name:'새 이름',region:'서울',description:'소개'});
  const after=f.s.teams.find(t=>t.id===f.a);
  assert.equal(after.name,'새 이름');
  assert.equal(after.format,'11인제','보내지 않은 형식은 그대로');
  assert.equal(after.level,'중급','보내지 않은 실력은 그대로');
});

test('주장만 팀 정보를 고칠 수 있다',()=>{
  const f=fixture();
  const cmd={type:'editTeam',teamId:f.a,name:'바꾼 이름',region:'서울',description:'',
    format:'8인제',days:'토요일',level:'상급'};
  assert.throws(()=>command(f.s,B,cmd),/팀|권한|주장/);
  assert.throws(()=>command(f.s,owner,cmd),/팀|권한|주장/);
  assert.equal(f.s.teams.find(t=>t.id===f.a).name,'팀 0','거절된 뒤에도 그대로여야 한다');
});

test('목록을 만들기 전에 저장된 실력 값도 화면에서 다듬어 보여준다',()=>{
  assert.equal(levelOf('중'),'중급');
  assert.equal(levelOf('하'),'초급');
  assert.equal(levelOf('상'),'상급');
  assert.equal(levelOf('상급'),'상급','이미 맞는 값은 그대로');
  assert.equal(levelOf(''),'중급','알 수 없으면 기본값');
  assert.equal(levelOf(undefined),'중급');
  for(const x of LEVELS)assert.equal(levelOf(x),x);
  assert.ok(FORMATS.includes('11인제'));
});

// --- 역할: 주장 / 운영진 / 팀원 ---
// 운영진까지 경기를 만들고 참여 알림을 보낼 수 있어야 한다.
// 팀 해체급 동작(결과 확정, 일정 변경, 모집 여닫기)은 주장만 한다.

function teamWithRoles(){
  const f=fixture();
  const add=(userId,name,role)=>{
    f.s.users.push({id:userId,name,at:iso(NOW-20*DAY)});
    f.s.members.push({id:'m-'+userId,teamId:f.a,userId,name,role,status:'active',
      number:7,position:'MF',periods:[{start:iso(NOW-20*DAY)}],at:iso(NOW-20*DAY)});
  };
  add('mgr','운영진','manager');
  add('mem','팀원','member');
  return f;
}
const gameArgs=(teamId)=>({type:'createGame',teamId,start:iso(NOW+2*DAY),end:iso(NOW+2*DAY+7200000),
  venue:'수지체육공원',address:'경기 용인시 수지구 포은대로 435',region:'경기 남부',format:'11인제',needed:14,cost:0});

test('운영진은 경기를 만들 수 있고 팀원은 만들 수 없다',()=>{
  const f=teamWithRoles();
  const out=command(f.s,{id:'mgr',name:'운영진'},gameArgs(f.a));
  assert.ok(out.gameId,'운영진은 만들 수 있어야 한다');
  assert.throws(()=>command(f.s,{id:'mem',name:'팀원'},gameArgs(f.a)),/권한/);
  assert.throws(()=>command(f.s,{id:'stranger',name:'남'},gameArgs(f.a)),/권한|팀/);
});

test('운영진은 참여 알림을 보낼 수 있고 팀원은 보낼 수 없다',()=>{
  const f=teamWithRoles();
  const {gameId}=command(f.s,A,gameArgs(f.a));
  assert.throws(()=>command(f.s,{id:'mem',name:'팀원'},{type:'remindVote',teamId:f.a,gameId}),/권한/);
  command(f.s,{id:'mgr',name:'운영진'},{type:'remindVote',teamId:f.a,gameId});
  assert.ok(f.s.notifications.some(n=>n.teamId===f.a),'알림이 만들어져야 한다');
});

test('결과 확정 같은 동작은 주장만 한다',()=>{
  const f=teamWithRoles();
  const {gameId}=command(f.s,A,gameArgs(f.a));
  for(const who of [{id:'mgr',name:'운영진'},{id:'mem',name:'팀원'}])
    assert.throws(()=>command(f.s,who,{type:'openListing',teamId:f.a,gameId}),/권한/,
      who.name+' 은(는) 모집을 열 수 없어야 한다');
});

test('주장만 운영진을 임명하고 주장 자신은 바꿀 수 없다',()=>{
  const f=teamWithRoles();
  assert.throws(()=>command(f.s,{id:'mgr',name:'운영진'},{type:'setRole',teamId:f.a,memberId:'m-mem',role:'manager'}),/권한/);
  command(f.s,A,{type:'setRole',teamId:f.a,memberId:'m-mem',role:'manager'});
  assert.equal(f.s.members.find(m=>m.id==='m-mem').role,'manager');
  const captain=f.s.members.find(m=>m.teamId===f.a&&m.role==='captain');
  assert.throws(()=>command(f.s,A,{type:'setRole',teamId:f.a,memberId:captain.id,role:'member'}),/변경할 수 없어요/);
  assert.throws(()=>command(f.s,A,{type:'setRole',teamId:f.a,memberId:'m-mem',role:'captain'}),/역할을 확인/);
});

test('주로 뛰는 때는 목록에 있는 값만 받고 상관없음을 고를 수 있다',()=>{
  const f=fixture();
  assert.ok(DAYS.includes('상관없음'));
  const base={type:'editTeam',teamId:f.a,name:'팀',region:'서울',description:'',format:'11인제',level:'중급'};
  command(f.s,A,{...base,days:'상관없음'});
  assert.equal(f.s.teams.find(t=>t.id===f.a).days,'상관없음');
  assert.throws(()=>command(f.s,A,{...base,days:'아무때나'}),/주로 뛰는 때/);
  assert.equal(f.s.teams.find(t=>t.id===f.a).days,'상관없음','거절된 뒤에도 그대로');
});

// --- 기기 푸시 ---
// 실제 푸시 서버로 보내볼 수 없는 환경이다. 그래서 보내는 쪽에서 확인할 수 있는 것만
// 확인한다: 서명이 진짜 맞는지, 구독을 제대로 넣고 빼는지, 죽은 구독을 치우는지.

async function withVapid(run){
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
  const raw=await crypto.subtle.exportKey('raw',pair.publicKey);
  const b64=b=>Buffer.from(b).toString('base64url');
  const env=globalThis.__teamkickTestEnv;
  env.VAPID_PUBLIC_KEY=b64(raw);
  env.VAPID_PRIVATE_KEY=jwk.d;           // 32바이트 원본(base64url)
  env.VAPID_SUBJECT='mailto:jyp7296@naver.com';
  try{return await run(pair)}finally{
    delete env.VAPID_PUBLIC_KEY;delete env.VAPID_PRIVATE_KEY;delete env.VAPID_SUBJECT;
  }
}

test('푸시 키가 없으면 켜지지 않고 아무 데도 보내지 않는다',async()=>{
  const db=localDatabase();
  assert.equal(push.pushReady(),false);
  // 구독이 있어도 키가 없으면 보내면 안 된다. 구독이 없으면 이 검사는 의미가 없다.
  await push.saveSubscription('a',{endpoint:'https://push.example/zzz',keys:{p256dh:'p',auth:'a'}});
  assert.equal((await push.subscriptionsOf('a')).length,1);
  let called=false;const real=globalThis.fetch;
  globalThis.fetch=async()=>{called=true;return new Response('',{status:201})};
  try{
    const out=await push.wakeDevices(['a']);
    assert.deepEqual({sent:out.sent,failed:out.failed},{sent:0,failed:0});
    assert.equal(called,false,'키가 없으면 요청을 보내면 안 된다');
    // 시험 발송도 같아야 한다. 여기가 뚫리면 키 없이도 요청이 나간다.
    await assert.rejects(()=>push.testWake('a'),/설정되지 않았어요/);
    assert.equal(called,false,'시험 발송도 키가 없으면 나가면 안 된다');
  }finally{globalThis.fetch=real;db.close()}
});

// 평소 알림은 만든 사람 본인에게는 가지 않는다. 그래서 혼자 쓰는 동안에는 푸시가
// 되는지 확인할 길이 없었고, 실패해도 이유가 조용히 사라졌다.
test('시험 발송은 본인 기기로 보내고, 실패하면 이유를 돌려준다',async()=>{
  const db=localDatabase();
  await withVapid(async()=>{
    const real=globalThis.fetch;
    try{
      await assert.rejects(()=>push.testWake('a'),/등록된 기기가 없어요/,'기기가 없으면 분명히 거절한다');

      await push.saveSubscription('a',{endpoint:'https://push.example/aaa',keys:{p256dh:'p',auth:'a'}});
      // 성공하는 경우
      let hit=null;
      globalThis.fetch=async(url,init)=>{hit={url:String(url),init};return new Response('',{status:201})};
      const ok=await push.testWake('a');
      assert.deepEqual({devices:ok.devices,sent:ok.sent},{devices:1,sent:1});
      assert.equal(hit.url,'https://push.example/aaa','본인 기기로 보낸다');
      assert.match(hit.init.headers.Authorization,/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/,'VAPID 헤더 모양');

      // 실패하는 경우 — 이유가 그대로 올라와야 한다
      globalThis.fetch=async()=>new Response('bad key',{status:403});
      const bad=await push.testWake('a');
      assert.equal(bad.sent,0);
      assert.equal(bad.results[0].status,403);
      assert.equal(bad.results[0].detail,'bad key','푸시 서버가 준 이유를 버리지 않는다');
      assert.equal(bad.results[0].host,'push.example');

      // 닿지도 못한 경우
      globalThis.fetch=async()=>{throw new Error('timed out')};
      const dead=await push.testWake('a');
      assert.equal(dead.results[0].status,0);
      assert.match(dead.results[0].detail,/timed out/);

      // 410 이면 그 구독을 지운다
      globalThis.fetch=async()=>new Response('',{status:410});
      await push.testWake('a');
      assert.equal((await push.subscriptionsOf('a')).length,0,'버려진 구독은 지운다');
    }finally{globalThis.fetch=real}
  });
  db.close();
});

test('VAPID 토큰은 진짜 서명이고 받는 주소마다 다르다',async()=>{
  const db=localDatabase();
  await withVapid(async pair=>{
    assert.equal(push.pushReady(),true);
    const token=await push.vapidToken('https://fcm.googleapis.com');
    const [head,body,sig]=token.split('.');
    const dec=x=>JSON.parse(Buffer.from(x,'base64url').toString());
    assert.deepEqual(dec(head),{typ:'JWT',alg:'ES256'});
    const claims=dec(body);
    assert.equal(claims.aud,'https://fcm.googleapis.com','받는 주소가 들어가야 한다');
    assert.equal(claims.sub,'mailto:jyp7296@naver.com');
    assert.ok(claims.exp>Math.floor(Date.now()/1000),'만료가 미래여야 한다');
    assert.ok(claims.exp-Math.floor(Date.now()/1000)<=24*3600,'만료는 24시간을 넘지 않아야 한다');

    const ok=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},pair.publicKey,
      Buffer.from(sig,'base64url'),Buffer.from(head+'.'+body));
    assert.equal(ok,true,'서명이 실제로 맞아야 한다');

    const other=await push.vapidToken('https://updates.push.services.mozilla.com');
    assert.notEqual(token,other,'받는 주소가 다르면 토큰도 달라야 한다');
  });
  db.close();
});

test('구독을 넣고 빼고, 같은 기기는 하나만 남는다',async()=>{
  const db=localDatabase();
  const sub=(e)=>({endpoint:e,keys:{p256dh:'p',auth:'a'}});
  await push.saveSubscription('u1',sub('https://push.example/aaa'));
  await push.saveSubscription('u1',sub('https://push.example/bbb'));
  assert.equal((await push.subscriptionsOf('u1')).length,2);

  // 같은 기기가 다시 구독하면 늘어나지 않는다
  await push.saveSubscription('u1',sub('https://push.example/aaa'));
  assert.equal((await push.subscriptionsOf('u1')).length,2,'같은 기기가 두 번 세어지면 안 된다');

  // 기기를 물려주면 주인이 바뀐다
  await push.saveSubscription('u2',sub('https://push.example/aaa'));
  assert.equal((await push.subscriptionsOf('u1')).length,1);
  assert.equal((await push.subscriptionsOf('u2')).length,1);

  await push.removeSubscription('u1','https://push.example/bbb');
  assert.equal((await push.subscriptionsOf('u1')).length,0);

  for(const bad of [{endpoint:'http://push.example/x',keys:{p256dh:'p',auth:'a'}},
                    {endpoint:'https://push.example/y',keys:{p256dh:'',auth:'a'}},
                    {endpoint:'',keys:{p256dh:'p',auth:'a'}}])
    await assert.rejects(()=>push.saveSubscription('u3',bad),/구독 정보를 확인/);
  db.close();
});

test('죽은 구독(410)은 치우고 나머지에는 계속 보낸다',async()=>{
  const db=localDatabase();
  await withVapid(async()=>{
    await push.saveSubscription('u1',{endpoint:'https://push.example/dead',keys:{p256dh:'p',auth:'a'}});
    await push.saveSubscription('u1',{endpoint:'https://push.example/live',keys:{p256dh:'p',auth:'a'}});
    const seen=[];const real=globalThis.fetch;
    globalThis.fetch=async(url,init)=>{
      seen.push({url,auth:init.headers.Authorization,ttl:init.headers.TTL,method:init.method});
      return new Response('',{status:url.includes('dead')?410:201});
    };
    try{
      const out=await push.wakeDevices(['u1','u1']);
      assert.equal(seen.length,2,'같은 사람을 두 번 넣어도 기기 수만큼만 보낸다');
      assert.ok(seen.every(x=>x.method==='POST'&&/^vapid t=.+, k=.+/.test(x.auth)),'VAPID 헤더가 붙어야 한다');
      assert.ok(seen.every(x=>x.ttl==='86400'));
      assert.equal(out.sent,1);assert.equal(out.failed,1);
    }finally{globalThis.fetch=real}
    assert.deepEqual((await push.subscriptionsOf('u1')).map(x=>x.endpoint),['https://push.example/live'],
      '죽은 구독은 지워져야 한다');
  });
  db.close();
});

test('알림을 받은 사람만 깨우고 본인은 깨우지 않는다',async()=>{
  const db=localDatabase();
  const f=teamWithRoles();
  await repository.commit(blank(),f.s,(await repository.load()).version);
  globalThis.__teamkickTestWoken=[];
  globalThis.__teamkickTestIdentity={userId:'a',fullName:'A 주장'};
  const res=await api.POST(new Request('https://teamkick.co.kr/api/app',{method:'POST',
    body:JSON.stringify({mutationId:'push-1',...gameArgs(f.a)})}));
  assert.equal(res.status,200,JSON.stringify(await res.clone().json()).slice(0,200));
  const woken=globalThis.__teamkickTestWoken;
  assert.ok(woken.includes('mgr')&&woken.includes('mem'),'팀원들을 깨워야 한다: '+JSON.stringify(woken));
  assert.ok(!woken.includes('a'),'명령을 실행한 본인은 깨우지 않는다');
  globalThis.__teamkickTestIdentity=null;db.close();
});

// --- 개인정보 처리방침의 법정 기재사항 ---
// 공식 작성지침(2025.4)이 요구하는 항목이 문서에서 빠지면 바로 알아야 한다.
// 문구는 바뀌어도 되지만 항목 자체가 사라지면 안 된다.

test('처리방침에 법정 기재사항이 모두 들어 있다',()=>{
  const p=legal.PRIVACY;
  // 제목 줄로 확인한다. 본문 어딘가에 같은 낱말이 있다고 통과하면 안 된다.
  const heading=name=>new RegExp('^\\d+\\. '+name,'m').test(p);
  for(const name of ['수집하는 항목과 목적','보유와 이용 기간','파기 절차와 방법',
      '제3자 제공','처리 위탁','국외 이전','안전 조치','쿠키 등 자동 수집 장치',
      '이용자의 권리','만 14세 미만','개인정보 보호책임자','권익침해 구제방법',
      '처리방침의 변경','문의'])
    assert.ok(heading(name),'"'+name+'" 항목이 빠졌다');

  // 위탁 업체는 실명이어야 한다. "클라우드 사업자" 같은 표현으로 되돌아가면 안 된다.
  // 다른 절에 이름이 있다고 통과하면 안 되므로 위탁 절만 떼어 본다.
  const section=n=>{
    const m=p.match(new RegExp('^'+n+'\\. [\\s\\S]*?(?=^'+(n+1)+'\\. )','m'));
    return m?m[0]:'';
  };
  const 위탁=section(5);
  assert.ok(위탁.includes('처리 위탁'),'5번이 처리 위탁이어야 한다');
  for(const vendor of ['OpenAI','Cloudflare','Brevo','카카오'])
    assert.ok(위탁.includes(vendor),vendor+' 이(가) 위탁 업체로 적혀 있어야 한다');
  assert.ok(!/클라우드 사업자|메일 발송 사업자|지도 사업자/.test(위탁),
    '위탁 업체를 뭉뚱그린 표현으로 되돌아가면 안 된다');

  // 국외 이전 절에는 받는 자·항목·목적·보유 기간이 있어야 한다
  const 국외=section(10);
  for(const need of ['받는 자','이전 항목','목적','보유 기간','거부'])
    assert.ok(국외.includes(need),'국외 이전 절에 "'+need+'" 가 있어야 한다');

  // 이번에 새로 저장하기 시작한 것들이 수집 항목에 적혀 있어야 한다
  assert.ok(p.includes('1:1 문의'),'문의 내용이 수집 항목에 있어야 한다');
  assert.ok(p.includes('알림 구독'),'기기 알림 구독 정보가 수집 항목에 있어야 한다');

  // 연락처와 적용 시점
  assert.ok(p.includes(legal.CONTACT),'문의처가 있어야 한다');
  assert.ok(p.includes(legal.LEGAL_VERSION),'적용 시점이 적혀 있어야 한다');

  // 초안이라는 표기를 지우면 안 된다. 아직 변호사 검토 전이다.
  assert.match(p.split('\n')[0],/초안/,'처리방침 첫 줄에 전문가 검토 전이라는 표기를 유지해야 한다');
  assert.match(legal.TERMS.split('\n')[0],/초안/,'약관 첫 줄에도 같은 표기를 유지해야 한다');

  // 해외 사업자는 위탁 절과 국외 이전 절에 모두 있어야 한다. 한쪽만 고치면 어긋난다.
  for(const vendor of ['OpenAI','Cloudflare','Brevo'])
    assert.ok(국외.includes(vendor),vendor+' 은(는) 해외 사업자이므로 국외 이전에도 적어야 한다');
});

// 소셜 로그인을 늘리면 처리방침도 같이 늘어야 한다. 코드만 고치고 문서를 두면 잡는다.
test('처리방침이 구글·네이버 로그인을 함께 적는다',()=>{
  const p=legal.PRIVACY;
  const section=n=>{
    const m=p.match(new RegExp('^'+n+'\\. [\\s\\S]*?(?=^'+(n+1)+'\\. )','m'));
    return m?m[0]:'';
  };
  // 실제로 붙인 제공자가 모두 적혀 있어야 한다. lib/social.ts 의 목록이 기준이다.
  const labels={google:'구글',naver:'네이버'};
  const 수집=section(1),위탁=section(5),연동=section(4);
  assert.ok(수집.includes('수집하는 항목'),'1번이 수집 항목이어야 한다');
  assert.ok(연동.includes('제3자 제공'),'4번이 제3자 제공·연동이어야 한다');
  for(const provider of social.PROVIDERS_LIST){
    const name=labels[provider];
    assert.ok(name,'새 제공자 "'+provider+'" 의 표기를 이 테스트에 넣어야 한다');
    assert.ok(수집.includes(name),name+' 로그인이 수집 항목에 적혀 있어야 한다');
    assert.ok(위탁.includes(name)||위탁.includes(provider==='google'?'Google':'네이버'),
      name+' 이(가) 위탁 절에 적혀 있어야 한다');
    assert.ok(연동.includes(name),name+' 연결을 끊는 방법이 적혀 있어야 한다');
  }
  // 받지 않기로 한 것을 받는다고 적으면 안 되고, 받지 않는다는 사실은 남아야 한다.
  assert.ok(/이메일·비밀번호[\s\S]*?받지도, 저장하지도 않습니다/.test(수집),
    '소셜 로그인에서 이메일을 받지 않는다는 사실이 적혀 있어야 한다');
  // 구글은 해외 사업자라 국외 이전에도 있어야 한다. 푸시 서버 줄과 구분해서 확인한다.
  const 국외=section(10);
  assert.ok(/받는 자: Google \(미국\)[\s\S]*?구글 로그인/.test(국외),
    '구글 로그인이 국외 이전 절에 따로 적혀 있어야 한다');
});

test('보유 기간 숫자가 코드와 어긋나지 않는다',()=>{
  const p=legal.PRIVACY;
  assert.ok(p.includes('1년'),'문의 1년');
  assert.ok(p.includes(String(KEEP.audit)+'일'),'운영 이력 '+KEEP.audit+'일');
  assert.ok(p.includes(String(KEEP.readNotice)+'일'),'읽은 알림 '+KEEP.readNotice+'일');
  assert.ok(p.includes(String(KEEP.unreadNotice)+'일'),'읽지 않은 알림 '+KEEP.unreadNotice+'일');
});

// --- 로고와 앱 아이콘 ---
// 사용자 결정(2026-09-18): 로고는 원본 파일 하나를 쓴다. 예전에는 코드로 다시 그렸고
// (Arial Black + skewX) 글꼴이 원본과 달랐다. 다시 그리는 쪽으로 돌아가지 않도록 고정한다.
function pngSize(file){
  const b=fs.readFileSync(file);
  assert.equal(b.slice(1,4).toString('latin1'),'PNG',file+' 가 PNG 가 아니다');
  return {w:b.readUInt32BE(16),h:b.readUInt32BE(20)};
}
test('첫 화면과 머리말 로고는 원본 파일을 쓴다',()=>{
  const src=fs.readFileSync('app/splash.tsx','utf8');
  const logo=src.match(/export const LOGO="([^"]+)"/);
  assert.ok(logo,'splash.tsx 가 LOGO 파일 경로를 내보내야 한다');
  const file=path.join('public',logo[1].replace(/^\//,''));
  assert.ok(fs.existsSync(file),logo[1]+' 파일이 없다');
  const {w,h}=pngSize(file);
  assert.equal(w,512);assert.equal(h,512);
  for(const name of ['SplashMark','BrandMark']){
    const body=src.slice(src.indexOf('export function '+name),src.indexOf('export function '+name)+400);
    assert.match(body,/<img[^>]*src=\{LOGO\}/,name+' 은 원본 파일을 그대로 써야 한다');
    assert.ok(!/<text|skewX/.test(body),name+' 에서 로고를 코드로 다시 그리면 안 된다');
  }
  // 머리말은 정사각 원본을 가로 자리에 넣는다. 눌러 찌그러뜨리지 않고 잘라 써야 한다.
  const css=fs.readFileSync('app/globals.css','utf8');
  const rule=css.match(/\.brand-mark-svg\{[^}]*\}/);
  assert.ok(rule&&/object-fit:cover/.test(rule[0]),'머리말 로고는 object-fit:cover 로 잘라 써야 한다');
  // 파일을 받는 동안 첫 화면이 비지 않도록 미리 받아 둔다.
  assert.match(fs.readFileSync('app/layout.tsx','utf8'),/rel="preload"[^>]*as="image"/,
    '로고를 preload 해야 첫 화면이 빈 채로 뜨지 않는다');
});

test('앱 아이콘이 홈 화면에서 잘리지 않게 준비되어 있다',()=>{
  const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
  // 안드로이드는 홈 화면 아이콘을 원·둥근네모로 잘라낸다. 잘려도 되는 아이콘을 따로 줘야 한다.
  const maskable=manifest.icons.filter(i=>String(i.purpose||'').split(/\s+/).includes('maskable'));
  assert.ok(maskable.length>0,'maskable 아이콘이 있어야 안드로이드에서 글자가 잘리지 않는다');
  // 적어놓은 파일이 실제로 있어야 한다. 없으면 설치할 때 아이콘이 깨진다.
  for(const icon of manifest.icons){
    const file=path.join('public',icon.src.replace(/^\//,''));
    assert.ok(fs.existsSync(file),icon.src+' 파일이 없다');
    // 적어둔 크기와 실제 크기가 다르면 설치할 때 흐릿하거나 아예 안 쓰인다.
    const [w,h]=String(icon.sizes).split('x').map(Number);
    assert.deepEqual(pngSize(file),{w,h},icon.src+' 의 실제 크기가 manifest 와 다르다');
  }
});

// --- 팀 찾기 ---
// 이름을 정확히 몰라도 일부만으로 찾을 수 있어야 한다. "oz" 로 "FCOZ" 를 찾는 식이다.
test('팀 찾기는 대소문자를 가리지 않고 일부만으로도 찾는다',()=>{
  const team={id:'t1',name:'FCOZ',region:'경기 남부'};
  for(const q of ['oz','OZ','Oz','fc','FCOZ','경기','경기 남부','남부',''])
    assert.equal(screens.teamMatches(team,q),true,'"'+q+'" 로 찾혀야 한다');
  for(const q of ['서울','zzz','FCOX'])
    assert.equal(screens.teamMatches(team,q),false,'"'+q+'" 로는 찾히면 안 된다');
  // 앞뒤 공백은 무시한다
  assert.equal(screens.teamMatches(team,'  oz  '),true);
  // 값이 없는 팀에서도 터지지 않는다
  assert.equal(screens.teamMatches({id:'t2'},'oz'),false);
  assert.equal(screens.teamMatches({id:'t2'},''),true);
});

// --- 구글·네이버 로그인 ---
// 실제 제공자 서버에는 닿을 수 없다. 보내는 쪽에서 확인할 수 있는 것만 확인한다.

function withSocial(vars,run){
  const env=globalThis.__teamkickTestEnv;
  Object.assign(env,vars);
  try{return run()}finally{for(const k of Object.keys(vars))delete env[k]}
}

test('키가 둘 다 있어야 소셜 로그인이 켜진다',()=>{
  assert.equal(social.socialReady('google'),false);
  withSocial({GOOGLE_CLIENT_ID:'id'},()=>
    assert.equal(social.socialReady('google'),false,'비밀키만 빠져도 켜지면 안 된다'));
  withSocial({GOOGLE_CLIENT_SECRET:'sec'},()=>
    assert.equal(social.socialReady('google'),false,'아이디만 빠져도 켜지면 안 된다'));
  withSocial({GOOGLE_CLIENT_ID:'id',GOOGLE_CLIENT_SECRET:'sec'},()=>
    assert.equal(social.socialReady('google'),true));
  // 한쪽을 켜도 다른 쪽은 그대로다
  withSocial({GOOGLE_CLIENT_ID:'id',GOOGLE_CLIENT_SECRET:'sec'},()=>
    assert.equal(social.socialReady('naver'),false));
});

test('설정 전에는 보내는 주소를 만들지 않는다',()=>{
  for(const p of ['google','naver'])
    assert.throws(()=>social.authorizeUrl(p,'https://teamkick.co.kr','s1'),/설정되지 않았어요/);
});

test('보내는 주소에 콜백과 상태값이 들어가고 이메일은 요구하지 않는다',()=>{
  withSocial({GOOGLE_CLIENT_ID:'gid',GOOGLE_CLIENT_SECRET:'gsec',
              NAVER_CLIENT_ID:'nid',NAVER_CLIENT_SECRET:'nsec'},()=>{
    const g=new URL(social.authorizeUrl('google','https://teamkick.co.kr','state-1'));
    assert.equal(g.origin+g.pathname,'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(g.searchParams.get('redirect_uri'),'https://teamkick.co.kr/api/google');
    assert.equal(g.searchParams.get('state'),'state-1');
    assert.equal(g.searchParams.get('client_id'),'gid');
    assert.equal(g.searchParams.get('response_type'),'code');
    assert.equal(g.searchParams.get('scope'),'openid profile');
    assert.ok(!/email/.test(g.searchParams.get('scope')),'이메일을 요구하면 안 된다');

    const n=new URL(social.authorizeUrl('naver','https://teamkick.co.kr','state-2'));
    assert.equal(n.origin+n.pathname,'https://nid.naver.com/oauth2.0/authorize');
    assert.equal(n.searchParams.get('redirect_uri'),'https://teamkick.co.kr/api/naver');
    assert.equal(n.searchParams.get('state'),'state-2');
    // 주소가 바뀌면 콜백도 따라간다
    assert.equal(new URL(social.authorizeUrl('naver','https://teamkick-jaeyeon.qkrwodus96.chatgpt.site','s'))
      .searchParams.get('redirect_uri'),'https://teamkick-jaeyeon.qkrwodus96.chatgpt.site/api/naver');
  });
});

test('제공자 응답에서 식별자와 이름만 읽는다',()=>{
  const g=social.config('google').read({sub:'google-123',name:'박재연',email:'x@y.z',picture:'p'});
  assert.deepEqual(g,{id:'google-123',nickname:'박재연'});
  const n=social.config('naver').read({response:{id:'naver-abc',name:'박재연',mobile:'010',birthyear:'1990'}});
  assert.deepEqual(n,{id:'naver-abc',nickname:'박재연'});
  // 이름을 안 주는 경우도 있다
  assert.equal(social.config('google').read({sub:'s'}).nickname,'');
  assert.equal(social.config('naver').read({}).id,'');
});

test('네이버는 200 으로 오는 실패도 실패로 본다',async()=>{
  await withSocial({NAVER_CLIENT_ID:'nid',NAVER_CLIENT_SECRET:'nsec'},async()=>{
    const real=globalThis.fetch;
    globalThis.fetch=async()=>new Response(JSON.stringify({error:'invalid_request'}),{status:200});
    try{await assert.rejects(()=>social.exchange('naver','code','https://teamkick.co.kr','s'),/실패했어요/)}
    finally{globalThis.fetch=real}
  });
});

test('제공자가 다르면 다른 계정이고, 같은 사람은 같은 계정이다',async()=>{
  const db=localDatabase();
  const a=await auth.signInWithSocial('google','same-id','구글 박재연');
  const again=await auth.signInWithSocial('google','same-id','이름 바뀜');
  assert.equal(a.user.userId,again.user.userId,'같은 제공자·같은 식별자는 같은 계정');

  const b=await auth.signInWithSocial('naver','same-id','네이버 박재연');
  assert.notEqual(a.user.userId,b.user.userId,'제공자가 다르면 다른 계정이어야 한다');

  await assert.rejects(()=>auth.signInWithSocial('google','','이름'),/로그인 정보를 가져오지 못했/);
  await assert.rejects(()=>auth.signInWithSocial('','id','이름'),/로그인 정보를 가져오지 못했/);
  db.close();
});

test('소셜 계정은 비밀번호로 들어올 수 없다',async()=>{
  const db=localDatabase();
  const {user}=await auth.signInWithSocial('naver','nv-1','박재연');
  const row=db.prepare('SELECT email,password,provider,provider_id,verified_at FROM accounts WHERE id=?').get(user.userId);
  assert.equal(row.password,'','비밀번호는 비어 있어야 한다');
  assert.equal(row.provider,'naver');
  assert.equal(row.provider_id,'nv-1');
  assert.ok(row.verified_at,'제공자가 확인했으므로 확인 완료로 둔다');
  for(const pw of ['','password',' '])
    await assert.rejects(()=>auth.signIn({email:row.email,password:pw}),/이메일 또는 비밀번호/);
  db.close();
});

test('카카오만 있던 계정도 새 열로 옮겨진다',async()=>{
  const db=localDatabase();
  db.prepare("INSERT INTO accounts(id,email,name,password,failures,agreed_at,verified_at,provider,kakao_id,at) VALUES(?,?,?,'',0,?,?, 'kakao',?,?)")
    .run('old-1','kakao-9@teamkick.invalid','옛 회원',iso(NOW),iso(NOW),'9',iso(NOW));
  await schema.backfillAccounts();
  const row=db.prepare('SELECT provider_id FROM accounts WHERE id=?').get('old-1');
  assert.equal(row.provider_id,'9','카카오 식별자가 provider_id 로 옮겨져야 한다');

  // 이미 옮긴 값을 덮어쓰지 않는다. 여러 번 돌아도 안전해야 한다.
  db.prepare('UPDATE accounts SET provider_id=? WHERE id=?').run('손으로 고침','old-1');
  await schema.backfillAccounts();
  assert.equal(db.prepare('SELECT provider_id FROM accounts WHERE id=?').get('old-1').provider_id,'손으로 고침');

  // 옮긴 뒤에는 그 계정으로 로그인이 이어진다
  db.prepare('UPDATE accounts SET provider_id=? WHERE id=?').run('9','old-1');
  const {user}=await auth.signInWithSocial('kakao','9','옛 회원');
  assert.equal(user.userId,'old-1','같은 사람이 새 계정을 만들면 안 된다');
  db.close();
});

// T20 검토 후 보완: 정책은 키 유무와 분리하고, 실제 계정·트랜잭션으로 회귀를 검사한다.
test('소셜 설정 유무·오류와 무관하게 명시적인 true만 이메일 가입을 허용한다',async()=>{
  globalThis.__teamkickTestIdentity=null;
  for(const ready of [false,true]){
    globalThis.__teamkickSocial=ready;
    for(const value of [undefined,'','false','TRUE','1','invalid','true']){
      if(value===undefined)delete globalThis.__teamkickTestEnv.EMAIL_SIGNUP_ENABLED;
      else globalThis.__teamkickTestEnv.EMAIL_SIGNUP_ENABLED=value;
      const out=await authPost({action:'signup'});
      assert.equal(out.status,value==='true'?200:403);
      const visible=await (await api.GET(new Request('https://teamkick.test/api/app'))).json();
      assert.equal(visible.emailSignupEnabled,value==='true','화면과 API가 같은 정책을 받아야 한다');
    }
  }
  delete globalThis.__teamkickTestEnv.EMAIL_SIGNUP_ENABLED;
});

const resetLink=()=>decodeURIComponent(globalThis.__teamkickTestMail.at(-1).text.match(/reset=([^\s]+)/)[1]);
async function recoveryAccount(){
  const db=localDatabase();globalThis.__teamkickTestMail=[];
  const registered=await register({email:'recovery@teamkick.test',name:'복구 검사',password:'original-1234'});
  await auth.requestPasswordReset({email:'recovery@teamkick.test'},'https://teamkick.test',NOW);
  return {db,registered,token:resetLink()};
}

test('같은 재설정 링크의 동시 사용은 한 건만 성공하고 이전 링크·세션을 무효화한다',async()=>{
  const {db,registered,token:older}=await recoveryAccount();
  const later=NOW+4*60000;
  await auth.requestPasswordReset({email:'recovery@teamkick.test'},'https://teamkick.test',later);
  const token=resetLink();
  const results=await Promise.allSettled([
    auth.resetPassword({token,password:'concurrent-A'},later),
    auth.resetPassword({token,password:'concurrent-B'},later),
  ]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.filter(x=>x.status==='rejected').length,1);
  const winner=results.find(x=>x.status==='fulfilled').value;
  assert.equal(winner.user.userId,registered.user.userId);
  assert.equal(await auth.currentUser(cookieRequest(registered.token),later),null);
  assert.ok(await auth.currentUser(cookieRequest(winner.token),later));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM write_guards').get().n,0);
  await assert.rejects(()=>auth.resetPassword({token:older,password:'old-link-again'},later),/만료|사용/);
  const password=results[0].status==='fulfilled'?'concurrent-A':'concurrent-B';
  assert.ok(await auth.signIn({email:'recovery@teamkick.test',password},later));
  db.close();
});

test('서로 다른 재설정 링크를 동시에 써도 같은 계정의 비밀번호는 한 번만 바뀐다',async()=>{
  const {db,token:first}=await recoveryAccount();
  const later=NOW+4*60000;
  await auth.requestPasswordReset({email:'recovery@teamkick.test'},'https://teamkick.test',later);
  const results=await Promise.allSettled([
    auth.resetPassword({token:first,password:'first-link-123'},later),
    auth.resetPassword({token:resetLink(),password:'second-link-123'},later),
  ]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM password_resets WHERE used=0').get().n,0);
  db.close();
});

test('재설정 중 새 세션 저장이 실패하면 비밀번호·토큰·기존 세션이 모두 복구된다',async()=>{
  const {db,registered,token}=await recoveryAccount();
  const original=db.prepare('SELECT password FROM accounts').get().password;
  db.exec("CREATE TRIGGER fail_reset_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT,'injected session failure'); END;");
  await assert.rejects(()=>auth.resetPassword({token,password:'replacement-123'},NOW),/injected session failure/);
  assert.equal(db.prepare('SELECT password FROM accounts').get().password,original);
  assert.equal(db.prepare('SELECT used FROM password_resets').get().used,0);
  assert.ok(await auth.currentUser(cookieRequest(registered.token),NOW));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM write_guards').get().n,0);
  db.exec('DROP TRIGGER fail_reset_session');
  assert.ok(await auth.resetPassword({token,password:'replacement-123'},NOW));
  db.close();
});

test('재설정 메일 발송 실패 뒤 바로 다시 요청하면 실제로 재발송한다',async()=>{
  const db=localDatabase();globalThis.__teamkickTestMail=[];
  await register({email:'retry@teamkick.test',name:'재시도',password:'original-1234'});
  globalThis.__teamkickTestMailFail=true;
  try{await assert.rejects(()=>auth.requestPasswordReset({email:'retry@teamkick.test'},'https://teamkick.test',NOW),/메일/)}
  finally{globalThis.__teamkickTestMailFail=false}
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM password_resets').get().n,0);
  await auth.requestPasswordReset({email:'retry@teamkick.test'},'https://teamkick.test',NOW+1000);
  assert.equal(globalThis.__teamkickTestMail.length,1);
  assert.ok(await auth.resetPassword({token:resetLink(),password:'retried-1234'},NOW+1000));
  db.close();
});

test('카카오·구글·네이버의 내부 주소에는 복구·확인 메일을 발송하지 않는다',async()=>{
  const db=localDatabase();globalThis.__teamkickTestMail=[];
  await auth.signInWithKakao('mail-kakao','카카오');
  await auth.signInWithSocial('google','mail-google','구글');
  await auth.signInWithSocial('naver','mail-naver','네이버');
  db.exec('UPDATE accounts SET verified_at=NULL');
  for(const row of db.prepare('SELECT id,email FROM accounts').all()){
    await auth.requestPasswordReset({email:row.email},'https://teamkick.test');
    assert.equal(await auth.resendVerification(row.id,'https://teamkick.test'),false);
  }
  assert.equal(globalThis.__teamkickTestMail.length,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM password_resets').get().n,0);
  db.close();
});

test('이메일 확인 링크도 동시에 한 건만 성공하고 새 세션을 만들지 않는다',async()=>{
  const db=localDatabase();globalThis.__teamkickTestMail=[];
  await auth.signUp({email:'verify-race@teamkick.test',name:'확인',password:'original-1234',agree:true,adult:true},'https://teamkick.test',NOW);
  const token=decodeURIComponent(globalThis.__teamkickTestMail.at(-1).text.match(/verify=([^\s]+)/)[1]);
  const before=db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n;
  const results=await Promise.allSettled([auth.verifyEmail({token},NOW),auth.verifyEmail({token},NOW)]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,before);
  assert.ok(db.prepare('SELECT verified_at FROM accounts').get().verified_at);
  db.close();
});

test('백업 복원 뒤 세 소셜 로그인과 기존 이메일 복구는 원래 내부 계정으로 돌아온다',async()=>{
  let db=localDatabase();globalThis.__teamkickTestMail=[];
  const local=await register({email:'restored@teamkick.test',name:'이메일',password:'original-1234'});
  const kakao=await auth.signInWithKakao('backup-kakao','카카오');
  const google=await auth.signInWithSocial('google','backup-google','구글');
  const naver=await auth.signInWithSocial('naver','backup-naver','네이버');
  const file=await backup.exportAll();
  assert.equal(file.format,2);
  assert.equal(file.accounts.find(x=>x.provider==='google').provider_id,'backup-google');
  db.close();db=localDatabase();
  await backup.restoreAll(file);
  assert.equal((await auth.signInWithKakao('backup-kakao','다른 이름')).user.userId,kakao.user.userId);
  assert.equal((await auth.signInWithSocial('google','backup-google','다른 이름')).user.userId,google.user.userId);
  assert.equal((await auth.signInWithSocial('naver','backup-naver','다른 이름')).user.userId,naver.user.userId);
  assert.equal(db.prepare('SELECT password FROM accounts WHERE id=?').get(local.user.userId).password,'');
  await auth.requestPasswordReset({email:'restored@teamkick.test'},'https://teamkick.test');
  assert.equal((await auth.resetPassword({token:resetLink(),password:'restored-1234'})).user.userId,local.user.userId);
  db.close();
});

test('옛 소셜 백업의 식별자가 누락됐으면 데이터를 쓰기 전에 거절한다',async()=>{
  const db=localDatabase();
  await auth.signInWithSocial('google','legacy-google','구글');
  const broken=await backup.exportAll();broken.format=1;delete broken.accounts[0].provider_id;
  const before=await repository.load();
  await assert.rejects(()=>backup.restoreAll(broken),/소셜 계정 식별자/);
  assert.deepEqual(await repository.load(),before);
  const legacy=await backup.exportAll();legacy.format=1;legacy.accounts=[];
  await backup.restoreAll(legacy);
  db.close();
});
