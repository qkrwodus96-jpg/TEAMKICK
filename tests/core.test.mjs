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
compile('app/api/app/route.ts','api.mjs',s=>s.replace('import {getChatGPTUser} from "@/app/chatgpt-auth";','const getChatGPTUser=async()=>globalThis.__teamkickTestIdentity;').replace('"@/lib/store"','"./store.mjs"').replace('"@/lib/model"','"./model.mjs"').replace('"@/lib/owner-config"','"./owner-config.mjs"'));
globalThis.__teamkickTestEnv={};
const {blank,applyCommand,visibleState,summaries,sideOf,rosterFor,attendanceDraft,iso}=await import(path.join(runtime,'model.mjs'));
const repository=await import(path.join(runtime,'store.mjs'));
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
function localDatabase(){
  const db=new DatabaseSync(':memory:');
  for(const name of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())db.exec(fs.readFileSync(path.join('drizzle',name),'utf8'));
  const api={prepare(sql){return {sql,args:[],bind(...args){this.args=args;return this}}},async batch(statements){db.exec('BEGIN IMMEDIATE');try{const out=statements.map(x=>({success:true,results:db.prepare(x.sql).all(...x.args)}));db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
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
