import {env} from "cloudflare:workers";
import {AppError} from "./model";

// 1.27 서버 이전(GPT Sites → 운영자 Cloudflare 계정) 도구.
// 옛 서버: MIGRATE_SECRET 이 있을 때만 표의 줄·이미지 파일을 조금씩 내준다(export). 마지막 복사 전에 저장을 잠근다(freeze).
// 새 서버: 같은 비밀값으로 옛 서버에서 끌어와 넣는다(import). 지우기·넣기는 *.workers.dev 시험 주소에서만 된다 —
// 도메인을 옮긴 뒤 실수로 운영 데이터를 지우지 않게. 이전이 끝나면 두 서버 모두 MIGRATE_SECRET 을 지운다.
type Env={DB?:D1Database;BUCKET?:R2Bucket;MIGRATE_SECRET?:string};
const E=()=>env as unknown as Env;
const secret=()=>String(E().MIGRATE_SECRET??"").trim();
export const migrateReady=()=>secret().length>=24;

// 옮길 표. 잠깐 쓰고 버리는 것(write_guards·rate_limits)과 표 구조 표시(schema_meta)는 옮기지 않는다.
// sessions 를 옮기면 도메인을 바꾼 뒤에도 다시 로그인하지 않아도 된다(쿠키는 teamkick.co.kr 그대로).
export const COPY_TABLES=["entities","state_revision","scope_revisions","accounts","sessions","password_resets","email_verifications","push_subs","closed_accounts","social_signups","chat_messages","chat_reads","chat_reports","user_notifications"] as const;
export const ROW_PAGE=200,OBJ_PAGE=15;

const digest=async(v:string)=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)));
export async function migrateAuthorized(req:Request){
 if(!migrateReady())return false;
 const given=(req.headers.get("x-migrate-secret")??"").trim();if(!given)return false;
 const [a,b]=await Promise.all([digest(given),digest(secret())]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0;
}
const db=()=>{const d=E().DB;if(!d)throw new AppError("데이터 연결이 없어요.",503);return d};
const bucket=()=>E().BUCKET??null;
const table=(t:string)=>{if(!(COPY_TABLES as readonly string[]).includes(t))throw new AppError("옮길 수 없는 표예요.");return t};

// --- 저장 잠금(마지막 복사 동안) ---
// schema_meta 의 id=2 줄로 표시한다(id=1 은 표 구조 표시). MIGRATE_SECRET 이 없는 서버는 확인도 하지 않는다(평소 비용 0).
export async function frozen(){if(!migrateReady())return false;try{return !!(await db().prepare("SELECT 1 AS x FROM schema_meta WHERE id=2").first())}catch{return false}}
export async function assertWritable(){if(await frozen())throw new AppError("서버를 옮기는 중이라 잠깐 저장할 수 없어요. 몇 분 뒤 다시 시도해주세요.",503)}
export async function setFrozen(on:boolean){if(on)await db().prepare("INSERT INTO schema_meta(id,sig) VALUES(2,'frozen') ON CONFLICT(id) DO UPDATE SET sig='frozen'").run();else await db().prepare("DELETE FROM schema_meta WHERE id=2").run()}

// --- 내보내기(옛 서버) ---
export async function exportCounts(){
 const out:Record<string,number>={};
 for(const t of COPY_TABLES){try{out[t]=Number((await db().prepare(`SELECT COUNT(*) AS n FROM ${t}`).first<{n:number}>())?.n??0)}catch{out[t]=-1}}
 let objects=0;const b=bucket();if(b){let cursor:string|undefined;do{const l=await b.list({cursor,limit:1000});objects+=l.objects.length;cursor=l.truncated?l.cursor:undefined}while(cursor)}
 return {tables:out,objects,frozen:await frozen()};
}
export async function exportRows(t:string,offset:number){
 const r=await db().prepare(`SELECT * FROM ${table(t)} ORDER BY rowid LIMIT ? OFFSET ?`).bind(ROW_PAGE,Math.max(0,offset|0)).all<Record<string,unknown>>();
 const rows=r.results??[];return {rows,done:rows.length<ROW_PAGE};
}
export async function exportKeys(cursor?:string){
 const b=bucket();if(!b)return {keys:[] as string[],cursor:""};
 const l=await b.list({cursor:cursor||undefined,limit:OBJ_PAGE});
 return {keys:l.objects.map(o=>o.key),cursor:l.truncated?l.cursor:""};
}
export async function exportObject(key:string){
 const b=bucket();if(!b)throw new AppError("이미지 저장소가 없어요.",404);
 const o=await b.get(key);if(!o)throw new AppError("파일이 없어요.",404);
 const meta={contentType:o.httpMetadata?.contentType??"application/octet-stream",custom:o.customMetadata??{}};
 return new Response(o.body,{headers:{"content-type":meta.contentType,"x-object-meta":encodeURIComponent(JSON.stringify(meta.custom)),"cache-control":"no-store"}});
}

// --- 가져오기(새 서버, *.workers.dev 에서만) ---
export function importAllowed(req:Request){return /\.workers\.dev$/i.test(new URL(req.url).hostname)}
const origin=(from:string)=>{const u=new URL(String(from));if(u.protocol!=="https:")throw new AppError("옛 서버 주소는 https 로 적어주세요.");return u.origin};
async function pull(from:string,q:Record<string,string>,given:string){
 const u=new URL("/api/migrate",origin(from));for(const [k,v] of Object.entries(q))u.searchParams.set(k,v);
 const r=await fetch(u,{headers:{"x-migrate-secret":given}});
 if(!r.ok)throw new AppError("옛 서버가 거절했어요("+r.status+"): "+(await r.text().catch(()=>"")).slice(0,160),502);
 return r;
}
export async function wipe(){for(const t of COPY_TABLES)await db().prepare(`DELETE FROM ${t}`).run();
 const b=bucket();if(b){let cursor:string|undefined;do{const l=await b.list({cursor,limit:500});if(l.objects.length)await b.delete(l.objects.map(o=>o.key));cursor=l.truncated?l.cursor:undefined}while(cursor)}}
// 한 번에 한 표의 한 쪽(200줄) 또는 이미지 15개. 화면(가져오기 페이지)이 끝날 때까지 되풀이해 부른다.
export async function importStep(from:string,given:string,step:{table?:string;offset?:number;cursor?:string;phase:"rows"|"objects"}){
 if(step.phase==="rows"){
  const t=table(String(step.table)),offset=Math.max(0,Number(step.offset)|0);
  const {rows,done}=await (await pull(from,{op:"rows",table:t,offset:String(offset)},given)).json() as {rows:Record<string,unknown>[];done:boolean};
  if(rows.length){const qs=rows.map(r=>{const cols=Object.keys(r);return db().prepare(`INSERT OR REPLACE INTO ${t} (${cols.join(",")}) VALUES (${cols.map(()=>"?").join(",")})`).bind(...cols.map(c=>r[c]??null))});await db().batch(qs)}
  return {copied:rows.length,done,next:{phase:"rows" as const,table:t,offset:offset+rows.length}};
 }
 const b=bucket();if(!b)throw new AppError("새 서버에 이미지 저장소(BUCKET)가 없어요.",503);
 const {keys,cursor}=await (await pull(from,{op:"keys",cursor:String(step.cursor??"")},given)).json() as {keys:string[];cursor:string};
 for(const key of keys){
  const r=await pull(from,{op:"object",key},given);
  let custom:Record<string,string>={};try{custom=JSON.parse(decodeURIComponent(r.headers.get("x-object-meta")??"%7B%7D"))}catch{}
  await b.put(key,await r.arrayBuffer(),{httpMetadata:{contentType:r.headers.get("content-type")??"application/octet-stream"},customMetadata:custom});
 }
 return {copied:keys.length,done:!cursor,next:{phase:"objects" as const,cursor}};
}
