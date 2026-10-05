import {env} from "cloudflare:workers";
import {blank,collections,type State,AppError} from "./model";

// 채팅처럼 자주 부르는 곳에서 **필요한 줄만** 읽는다(1.17). 전체 상태(load)를 4초마다 읽던 것이 채팅이 느린 이유였다.
// kind 와 id(또는 scope=팀) 로 고른다. 읽기 전용 — 저장은 여전히 load/commit 으로만 한다.
type Part={kind:typeof collections[number];ids?:string[];scopes?:string[]};
function db(){if(!env.DB)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);return env.DB}
export async function loadSome(parts:Part[],into:State=blank()){
 const d=db();const qs:D1PreparedStatement[]=[];
 for(const p of parts){
  const ids=(p.ids??[]).filter(Boolean).slice(0,50),scopes=(p.scopes??[]).filter(Boolean).slice(0,50);
  if(ids.length)qs.push(d.prepare(`SELECT kind, body FROM entities WHERE kind=? AND id IN (${ids.map(()=>"?").join(",")})`).bind(p.kind,...ids.map(x=>p.kind+":"+x)));
  if(scopes.length)qs.push(d.prepare(`SELECT kind, body FROM entities WHERE kind=? AND scope IN (${scopes.map(()=>"?").join(",")})`).bind(p.kind,...scopes));
 }
 if(!qs.length)return into;
 const seen=new Set<string>();
 for(const r of await d.batch(qs))for(const row of (r.results??[]) as {kind:string;body:string}[]){
  if(!collections.includes(row.kind as typeof collections[number]))continue;
  const x=JSON.parse(row.body);const key=row.kind+":"+x.id;if(seen.has(key))continue;seen.add(key);
  into[row.kind as keyof State].push(x);
 }
 return into;
}
// 방 하나에 들어갈 수 있는지 판단하는 데 필요한 줄만. model.chatRoom 이 그대로 쓴다.
export async function loadRoomState(room:string){
 let m=String(room).match(/^team:([A-Za-z0-9_-]{1,80})$/);
 if(m)return loadSome([{kind:"teams",ids:[m[1]]},{kind:"members",scopes:[m[1]]}]);
 const gm=String(room).match(/^guest:([A-Za-z0-9_-]{1,80}):([A-Za-z0-9_-]{1,80})$/);
 if(gm){const s=await loadSome([{kind:"games",ids:[gm[1]]},{kind:"guests",ids:[gm[2]]}]);const x=s.guests[0];if(!x)return s;
  return loadSome([{kind:"teams",ids:[x.teamId]},{kind:"members",scopes:[x.teamId]}],s);}
 m=String(room).match(/^match:([A-Za-z0-9_-]{1,80}):([A-Za-z0-9_-]{1,80})$/);
 if(!m)return blank();
 const s=await loadSome([{kind:"games",ids:[m[1]]},{kind:"requests",scopes:[m[2]]}]);
 const g=s.games[0];if(!g)return s;
 s.requests=s.requests.filter(x=>x.gameId===g.id);
 return loadSome([{kind:"teams",ids:[g.home,m[2]]},{kind:"members",scopes:[g.home,m[2]]}],s);
}
