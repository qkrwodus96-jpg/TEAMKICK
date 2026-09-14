import {env} from "cloudflare:workers";
import {blank,collections,type State,AppError} from "./model";
function db(){if(!env.DB)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);return env.DB}
export async function load(){const d=db();const [r,v]=await d.batch([d.prepare("SELECT kind, body FROM entities"),d.prepare("SELECT version FROM state_revision WHERE id=1")]);const state=blank();for(const row of r.results as any[])if(collections.includes(row.kind))state[row.kind as keyof State].push(JSON.parse(row.body));return {state,version:Number((v.results as any[])[0]?.version??0)}}
export async function commit(before:State,after:State,version:number){
 const d=db(),tx=crypto.randomUUID();const queries=[d.prepare("INSERT OR IGNORE INTO state_revision(id,version) VALUES(1,0)"),d.prepare("INSERT INTO write_guards(id,expected,actual) SELECT ?,?,version FROM state_revision WHERE id=1").bind(tx,version)];
 for(const kind of collections){const old=new Map(before[kind].map(x=>[x.id,JSON.stringify(x)])),ids=new Set(after[kind].map(x=>x.id));for(const row of after[kind]){const body=JSON.stringify(row);if(old.get(row.id)!==body)queries.push(d.prepare("INSERT INTO entities(id,kind,scope,body) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET scope=excluded.scope,body=excluded.body").bind(kind+":"+row.id,kind,row.teamId??row.home??row.userId??null,body));}
 for(const row of before[kind])if(!ids.has(row.id))queries.push(d.prepare("DELETE FROM entities WHERE id=?").bind(kind+":"+row.id));}
 queries.push(d.prepare("UPDATE state_revision SET version=version+1 WHERE id=1"),d.prepare("DELETE FROM write_guards WHERE id=?").bind(tx));
 await d.batch(queries);
}
