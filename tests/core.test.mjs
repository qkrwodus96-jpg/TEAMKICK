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
compile('lib/owner-config.ts','owner-config.mjs');
compile('lib/mail.ts','mail.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;').replace('"./model"','"./model.mjs"'));
compile('lib/auth.ts','auth.mjs',s=>s.replace('import {env} from "cloudflare:workers";','const env=globalThis.__teamkickTestEnv;').replace('import {sendMail,mailReady} from "./mail";','const sendMail=async(to,subject,text)=>{(globalThis.__teamkickTestMail??=[]).push({to,subject,text})};const mailReady=()=>globalThis.__teamkickTestMailReady!==false;').replace('"./model"','"./model.mjs"'));
compile('app/api/app/route.ts','api.mjs',s=>s.replace('import {currentUser,accountExists,closeAccount,clearedCookie} from "@/lib/auth";','const currentUser=async()=>globalThis.__teamkickTestIdentity;const accountExists=async(x)=>(globalThis.__teamkickTestAccounts??[]).includes(x);const closeAccount=async()=>{};const clearedCookie=()=>"";').replace('import {storageReady} from "@/lib/images";','const storageReady=()=>true;').replace('import {placeSearchReady} from "@/lib/places";','const placeSearchReady=()=>true;').replace('import {mailReady} from "@/lib/mail";','const mailReady=()=>true;').replace('"@/lib/store"','"./store.mjs"').replace('"@/lib/model"','"./model.mjs"').replace('"@/lib/owner-config"','"./owner-config.mjs"'));
globalThis.__teamkickTestEnv={};
const {blank,applyCommand,visibleState,summaries,sideOf,rosterFor,attendanceDraft,approvedGuests,iso}=await import(path.join(runtime,'model.mjs'));
const repository=await import(path.join(runtime,'store.mjs'));
const auth=await import(path.join(runtime,'auth.mjs'));
const mail=await import(path.join(runtime,'mail.mjs'));
const api=await import(path.join(runtime,'api.mjs'));
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
  const api={prepare(sql){return {sql,args:[],bind(...args){this.args=args;return this},async first(){return db.prepare(this.sql).get(...this.args)??null},async run(){db.prepare(this.sql).run(...this.args);return {success:true}},async all(){return {results:db.prepare(this.sql).all(...this.args)}}}},async batch(statements){db.exec('BEGIN IMMEDIATE');try{const out=statements.map(x=>({success:true,results:db.prepare(x.sql).all(...x.args)}));db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
  globalThis.__teamkickTestEnv.DB=api;return db;
}

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
  assert.ok(row.password.startsWith('pbkdf2$600000$'),'OWASP 권고 반복 횟수로 저장한다');
  assert.equal(row.password.includes('teamkick-1234'),false,'비밀번호 원문이 저장되면 안 된다');
  const stored=db.prepare('SELECT id FROM sessions').get();
  assert.notEqual(stored.id,token,'세션 토큰 원문이 저장되면 안 된다');
  assert.deepEqual(await auth.currentUser(cookieRequest(token)),{userId:user.userId,fullName:'박재연'});
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
