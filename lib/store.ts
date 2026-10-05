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
export async function load(){const d=db();
 const hit=memo.get(d);
 if(hit){const v=await d.prepare("SELECT (SELECT version FROM state_revision WHERE id=1) AS version,(SELECT COUNT(*) FROM entities) AS n").first<{version:number;n:number}>();if(Number(v?.version??0)===hit.version&&Number(v?.n??-1)===hit.rows)return {state:structuredClone(hit.state),version:hit.version};}
 const [r,v]=await d.batch([d.prepare("SELECT kind, body FROM entities"),d.prepare("SELECT version FROM state_revision WHERE id=1")]);const state=blank();const rows=r.results as any[];for(const row of rows)if(collections.includes(row.kind))state[row.kind as keyof State].push(JSON.parse(row.body));
 const version=Number((v.results as any[])[0]?.version??0);memo.set(d,{version,rows:rows.length,state:structuredClone(state)});return {state,version}}
export async function commit(before:State,after:State,version:number){
 const d=db(),tx=crypto.randomUUID();let added=0,removed=0;const queries=[d.prepare("INSERT OR IGNORE INTO state_revision(id,version) VALUES(1,0)"),d.prepare("INSERT INTO write_guards(id,expected,actual) SELECT ?,?,version FROM state_revision WHERE id=1").bind(tx,version)];
 for(const kind of collections){const old=new Map(before[kind].map(x=>[x.id,JSON.stringify(x)])),ids=new Set(after[kind].map(x=>x.id));for(const row of after[kind]){const body=JSON.stringify(row);if(!old.has(row.id))added++;if(old.get(row.id)!==body)queries.push(d.prepare("INSERT INTO entities(id,kind,scope,body) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET scope=excluded.scope,body=excluded.body").bind(kind+":"+row.id,kind,row.teamId??row.home??row.userId??null,body));}
 for(const row of before[kind])if(!ids.has(row.id)&&++removed)queries.push(d.prepare("DELETE FROM entities WHERE id=?").bind(kind+":"+row.id));}
 queries.push(d.prepare("UPDATE state_revision SET version=version+1 WHERE id=1"),d.prepare("DELETE FROM write_guards WHERE id=?").bind(tx));
 await d.batch(queries);
 // 방금 쓴 상태가 곧 다음 번호의 상태다. 다음 읽기에서 전체를 다시 읽지 않아도 된다.
 const base=memo.get(d);
 if(base&&base.version===version)memo.set(d,{version:version+1,rows:base.rows+added-removed,state:structuredClone(after)});else memo.delete(d);
}

// 1.19 실시간 반영: 화면이 15초마다 이 숫자만 물어본다. 바뀌었을 때만 전체를 다시 읽는다.
export async function revision(){const r=await db().prepare("SELECT version FROM state_revision WHERE id=1").first<{version:number}>();return Number(r?.version??0)}
