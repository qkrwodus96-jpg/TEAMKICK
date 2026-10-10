import {env} from "cloudflare:workers";
import {blank,collections,type State,AppError} from "./model";
function db(){if(!env.DB)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);return env.DB}
// 1.19 속도: 같은 서버 안에서 저장 번호가 그대로면 전에 읽은 상태를 다시 쓴다.
// 예전에는 요청마다 entities 전체를 읽어 와서(행이 늘수록 느려짐) 채팅·팀 등록 같은 화면이 굼떴다.
// 이제는 번호 한 줄만 읽고, 바뀌었을 때만 전체를 읽는다. entities 에 쓰는 곳은 commit 하나뿐이고
// commit 은 반드시 번호를 올리므로, 번호가 같으면 내용도 같다. 돌려줄 때는 복사본을 줘서
// 부르는 쪽이 고쳐도 기억해 둔 상태가 오염되지 않는다.
// 운영 콘솔에서 행을 직접 지우는 것처럼 번호를 거치지 않은 변경도 놓치지 않게 행 개수도 함께 본다.
const memo=new WeakMap<object,{version:number;rows:number;state:State}>();
// 1.25 알림은 entities 가 아니라 user_notifications 에 받는 사람별로 있다. 전체 상태에는 넣지 않고,
// 부르는 쪽이 필요한 사람 몫만 함께 읽는다(화면은 본인 것, 채팅 알림은 같은 방의 안 읽은 최근 알림).
// 같은 왕복(batch) 안에서 읽어 요청 시간이 늘지 않는다.
// 1.25 읽은 상태에 저장 번호를 숨은 표시(__rev)로 붙인다. 랭킹처럼 무거운 계산을 번호마다 한 번만 하도록(lib/model rankingBase).
export function stamp(state:State,version:number){Object.defineProperty(state,"__rev",{value:version,enumerable:false,configurable:true,writable:true})}
export type LoadOptions={notify?:string[];chatRoom?:string};
const NOTIFY_LIMIT=300;
function notifyQueries(d:D1Database,o:LoadOptions){
 const q:D1PreparedStatement[]=[];
 const users=[...new Set(o.notify??[])].filter(Boolean).slice(0,20);
 if(users.length)q.push(d.prepare("SELECT body FROM user_notifications WHERE user_id IN ("+users.map(()=>"?").join(",")+") ORDER BY at DESC LIMIT "+NOTIFY_LIMIT*users.length).bind(...users));
 if(o.chatRoom)q.push(d.prepare("SELECT body FROM user_notifications WHERE dest=? AND read=0 AND at>?").bind("chat:"+o.chatRoom,new Date(Date.now()-15*60e3).toISOString()));
 return q;
}
// 화면과 규칙은 예전처럼 오래된 것부터 쌓인 순서(마지막이 가장 최근)를 기대한다. 읽기는 최근 것부터 잘라 오므로 다시 정렬한다.
function addNotifications(state:State,results:D1Result[]){const seen=new Set<string>();for(const r of results)for(const row of (r.results??[]) as {body:string}[]){const n=JSON.parse(row.body);if(!seen.has(n.id)){seen.add(n.id);state.notifications.push(n)}}state.notifications.sort((x,y)=>String(x.at).localeCompare(String(y.at)))}
export async function load(o:LoadOptions={}){const d=db(),extra=notifyQueries(d,o);
 const hit=memo.get(d);
 if(hit){const [v,...more]=await d.batch([d.prepare("SELECT (SELECT version FROM state_revision WHERE id=1) AS version,(SELECT COUNT(*) FROM entities) AS n"),...extra]);const row=(v.results as {version:number;n:number}[])[0];
  if(Number(row?.version??0)===hit.version&&Number(row?.n??-1)===hit.rows){const state=structuredClone(hit.state);addNotifications(state,more);stamp(state,hit.version);return {state,version:hit.version}}}
 const [r,v,...more]=await d.batch([d.prepare("SELECT kind, body FROM entities WHERE kind<>'notifications'"),d.prepare("SELECT version FROM state_revision WHERE id=1"),...extra]);const state=blank();const rows=r.results as {kind:string;body:string}[];for(const row of rows)if((collections as readonly string[]).includes(row.kind))state[row.kind as keyof State].push(JSON.parse(row.body));
 const version=Number((v.results as {version:number}[])[0]?.version??0);memo.set(d,{version,rows:rows.length,state:structuredClone(state)});addNotifications(state,more);stamp(state,version);return {state,version}}
export async function commit(before:State,after:State,version:number){
 const d=db(),tx=crypto.randomUUID();let added=0,removed=0;const queries=[d.prepare("INSERT OR IGNORE INTO state_revision(id,version) VALUES(1,0)"),d.prepare("INSERT INTO write_guards(id,expected,actual) SELECT ?,?,version FROM state_revision WHERE id=1").bind(tx,version)];
 const touched=new Set<string>(),prev=new Map<string,Record<string,unknown>>();
 for(const kind of collections){const old=new Map(before[kind].map(x=>[x.id,JSON.stringify(x)])),ids=new Set(after[kind].map(x=>x.id));for(const x of before[kind])prev.set(kind+":"+x.id,x);for(const row of after[kind]){const body=JSON.stringify(row);if(!old.has(row.id)&&kind!=="notifications")added++;if(old.get(row.id)!==body){const was=prev.get(kind+":"+row.id);scopesOf(kind,row,touched,was);if(was)scopesOf(kind,was,touched,row)}if(old.get(row.id)!==body)queries.push(kind==="notifications"?d.prepare("INSERT INTO user_notifications(id,user_id,team_id,dest,read,at,body) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET read=excluded.read,dest=excluded.dest,body=excluded.body").bind(row.id,String(row.userId??""),row.teamId??null,row.to??null,row.read?1:0,String(row.at??new Date().toISOString()),body):d.prepare("INSERT INTO entities(id,kind,scope,body) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET scope=excluded.scope,body=excluded.body").bind(kind+":"+row.id,kind,row.teamId??row.home??row.userId??null,body));}
 for(const row of before[kind])if(!ids.has(row.id)&&scopesOf(kind,row,touched)){if(kind==="notifications"){queries.push(d.prepare("DELETE FROM user_notifications WHERE id=?").bind(row.id));continue}removed++;queries.push(d.prepare("DELETE FROM entities WHERE id=?").bind(kind+":"+row.id))}}
 for(const scope of touched)queries.push(d.prepare("INSERT INTO scope_revisions(scope,version) VALUES(?,1) ON CONFLICT(scope) DO UPDATE SET version=version+1").bind(scope));
 queries.push(d.prepare("UPDATE state_revision SET version=version+1 WHERE id=1"),d.prepare("DELETE FROM write_guards WHERE id=?").bind(tx));
 await d.batch(queries);
 // 방금 쓴 상태가 곧 다음 번호의 상태다. 다음 읽기에서 전체를 다시 읽지 않아도 된다.
 const base=memo.get(d);
 // 알림은 기억해 두지 않는다(사람별로 매번 새로 읽는다). 남겨 두면 다른 사람 요청에 섞이거나 읽음 표시가 낡는다.
 if(base&&base.version===version)memo.set(d,{version:version+1,rows:base.rows+added-removed,state:{...structuredClone(after),notifications:[]}});else memo.delete(d);
}

// 1.19 실시간 반영: 화면이 15초마다 이 숫자만 물어본다. 바뀌었을 때만 전체를 다시 읽는다.
export async function revision(){const r=await db().prepare("SELECT version FROM state_revision WHERE id=1").first<{version:number}>();return Number(r?.version??0)}

// 1.24 범위별 저장 번호. 팀이 1만 개가 되어도 다른 팀의 투표 때문에 내 화면이 다시 읽지 않게,
// 바뀐 행이 누구 화면에 보이는지를 범위로 나눠 번호를 올린다.
//  t:<팀>  그 팀 화면(경기·투표·공지·팀원·회비…)   u:<계정>  그 사람에게만(알림·내 가입 신청·프로필)
//  pub     여러 팀이 함께 보는 것(팀 목록·매칭·용병 모집·랭킹 기준이 되는 계정 설정·공지사항)
// 운영 기록(audit)과 중복 요청 기록(receipts)은 화면에 보이지 않으므로 번호를 올리지 않는다.
const QUIET=new Set(["audit","receipts"]);
const PUBLIC=new Set(["teams","games","requests","guests","users","announcements","settings","inquiries"]);
// 계정 행에서 이것들만 바뀌면 본인 화면만 다시 읽으면 된다(알림 설정·숨긴 채팅방·좋아하는 팀·코드 시도·생일 알림 표시).
const PRIVATE_USER=new Set(["notify","chatHidden","newsTeams","codeTries","birthdayAt"]);
export function scopesOf(kind:string,row:Record<string,unknown>,out:Set<string>,was?:Record<string,unknown>){
 if(QUIET.has(kind))return true;
 // 알림은 받는 사람 것이다. 팀 번호까지 올리면 한 사람이 읽음 처리할 때마다 팀 전체가 다시 읽는다.
 if(kind==="notifications"){if(typeof row?.userId==="string"&&row.userId)out.add("u:"+row.userId);return true}
 const privateOnly=kind==="users"&&!!was&&[...new Set([...Object.keys(row??{}),...Object.keys(was)])].every(k=>PRIVATE_USER.has(k)||JSON.stringify(row?.[k])===JSON.stringify(was[k]));
 if(PUBLIC.has(kind)&&!privateOnly)out.add("pub");
 for(const k of ["teamId","home","away"])if(typeof row?.[k]==="string"&&row[k])out.add("t:"+row[k]);
 if(typeof row?.userId==="string"&&row.userId)out.add("u:"+row.userId);
 if(kind==="users"&&typeof row?.id==="string")out.add("u:"+row.id);
 return true;
}
// 화면이 보는 범위들의 번호를 한 줄로 이어 준다(없는 범위는 0). 이 문자열이 바뀌었을 때만 화면이 다시 읽는다.
export async function scopeToken(scopes:string[]){
 const list=[...new Set(scopes)].filter(x=>/^(pub|[tu]:[A-Za-z0-9_-]{1,80})$/.test(x)).slice(0,24).sort();
 if(!list.length)return "";
 const r=await db().prepare("SELECT scope,version FROM scope_revisions WHERE scope IN ("+list.map(()=>"?").join(",")+")").bind(...list).all<{scope:string;version:number}>();
 const got=new Map((r.results??[]).map(x=>[x.scope,Number(x.version)]));
 return list.map(x=>x+"="+(got.get(x)??0)).join("|");
}

// 1.25 알림 보관 기간(KEEP 과 같음): 읽은 알림 30일, 안 읽은 알림 180일. 예약 실행(10분마다)이 지운다.
export async function cleanupNotifications(now=Date.now()){
 const day=864e5;
 await db().prepare("DELETE FROM user_notifications WHERE (read=1 AND at<?) OR at<?").bind(new Date(now-30*day).toISOString(),new Date(now-180*day).toISOString()).run();
}
