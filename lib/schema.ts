import {env} from "cloudflare:workers";
import {AppError} from "./model";

// 배포 환경에 migration 을 실행할 도구가 없어, 필요한 표가 없으면 앱이 직접 만든다.
// 모두 IF NOT EXISTS 이고 ALTER 는 이미 있으면 무시하므로 여러 번 실행해도 안전하다.
// drizzle/ 의 migration 과 같은 스키마를 만들어야 한다. 어긋나면 테스트가 잡는다.
export const STATEMENTS=[
 `CREATE TABLE IF NOT EXISTS entities (id text PRIMARY KEY NOT NULL, kind text NOT NULL, scope text, body text NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_entities_kind_scope ON entities (kind, scope)`,
 `CREATE TABLE IF NOT EXISTS write_guards (id text PRIMARY KEY NOT NULL, expected integer NOT NULL, actual integer NOT NULL, CONSTRAINT "revision_matches" CHECK("write_guards"."expected" = "write_guards"."actual"))`,
 `CREATE TABLE IF NOT EXISTS state_revision (id integer PRIMARY KEY NOT NULL, version integer DEFAULT 0 NOT NULL)`,
 // 기기 푸시 구독. 기기마다 하나씩 생긴다. entities 가 아니라 따로 두는 이유는
 // (1) 매 요청마다 읽히면 안 되고 (2) 기기 자격증명이라 백업에 담지 않기 위해서다.
 `CREATE TABLE IF NOT EXISTS push_subs (id text PRIMARY KEY NOT NULL, account_id text NOT NULL, endpoint text NOT NULL, p256dh text NOT NULL, auth text NOT NULL, at text NOT NULL)`,
 `CREATE UNIQUE INDEX IF NOT EXISTS push_subs_endpoint_unique ON push_subs (endpoint)`,
 `CREATE INDEX IF NOT EXISTS idx_push_subs_account ON push_subs (account_id)`,
 `CREATE TABLE IF NOT EXISTS accounts (id text PRIMARY KEY NOT NULL, email text NOT NULL, name text NOT NULL, password text NOT NULL, failures integer DEFAULT 0 NOT NULL, locked_until text, at text NOT NULL)`,
 `CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique ON accounts (email)`,
 `CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY NOT NULL, account_id text NOT NULL, expires text NOT NULL, at text NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions (account_id)`,
 `CREATE TABLE IF NOT EXISTS password_resets (id text PRIMARY KEY NOT NULL, account_id text NOT NULL, expires text NOT NULL, used integer DEFAULT 0 NOT NULL, at text NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_password_resets_account ON password_resets (account_id)`,
 `CREATE TABLE IF NOT EXISTS rate_limits (id text PRIMARY KEY NOT NULL, count integer DEFAULT 0 NOT NULL, reset_at text NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits (reset_at)`,
 `CREATE TABLE IF NOT EXISTS email_verifications (id text PRIMARY KEY NOT NULL, account_id text NOT NULL, expires text NOT NULL, used integer DEFAULT 0 NOT NULL, at text NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_email_verifications_account ON email_verifications (account_id)`,
 // SQLite 의 ADD COLUMN 에는 IF NOT EXISTS 가 없다. 이미 있으면 나는 오류만 넘긴다.
 `ALTER TABLE accounts ADD COLUMN agreed_at text`,
 `ALTER TABLE accounts ADD COLUMN verified_at text`,
 `ALTER TABLE accounts ADD COLUMN provider text DEFAULT 'local' NOT NULL`,
 `ALTER TABLE accounts ADD COLUMN kakao_id text`,
 `CREATE INDEX IF NOT EXISTS idx_accounts_kakao ON accounts (kakao_id)`,
 // 소셜 로그인이 늘어 제공자별 열을 계속 만들 수 없다. (provider, provider_id) 로 묶는다.
 `ALTER TABLE accounts ADD COLUMN provider_id text`,
 `CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_unique ON accounts (provider,provider_id)`,
 // 기기마다 "마지막으로 보낸 알림이 어떻게 됐는지" 를 남긴다. 알림이 안 올 때
 // 서버가 보냈는지 → 푸시 서버가 받았는지 → 폰이 받았는지 → 화면에 띄웠는지를 가른다.
 // 예전에는 이걸 볼 방법이 없어 추측하고 배포하기를 되풀이했다(2026-09-24).
 `ALTER TABLE push_subs ADD COLUMN last_try_at text`,
 `ALTER TABLE push_subs ADD COLUMN last_status integer`,
 `ALTER TABLE push_subs ADD COLUMN last_detail text`,
 `ALTER TABLE push_subs ADD COLUMN last_ok_at text`,
 `ALTER TABLE push_subs ADD COLUMN last_seen_at text`,
 `ALTER TABLE push_subs ADD COLUMN last_shown integer`,
 // 탈퇴한 계정의 번호(무작위 UUID)와 탈퇴 시각만 둔다. 이름·이메일은 없다.
 // 백업 파일로 복원할 때 탈퇴한 사람을 되살리지 않기 위해서다. 백업 보관 기간(최대 1년)이
 // 지나면 필요 없으므로 1년 뒤 지운다. entities 밖에 두는 이유: 복원이 entities 를 통째로
 // 바꾸므로 그 안에 두면 복원과 함께 사라진다.
 `CREATE TABLE IF NOT EXISTS closed_accounts (id text PRIMARY KEY NOT NULL, at text NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_closed_accounts_at ON closed_accounts (at)`,
 // 소셜로 처음 들어온 사람의 가입 대기(최대 10분). 약관 동의·만 14세 확인을 받기 전에는
 // 계정을 만들지 않는다. 동의하면 계정을 만들고 이 줄을 지운다. id 는 쿠키 값의 해시다.
 `CREATE TABLE IF NOT EXISTS social_signups (id text PRIMARY KEY NOT NULL, provider text NOT NULL, subject text NOT NULL, name text NOT NULL, expires text NOT NULL, at text NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_social_signups_expires ON social_signups (expires)`,
 // 채팅(1.16). 메시지는 entities 가 아니라 여기에 둔다 — 매 요청마다 읽히면 안 되고, 백업(entities)에도 넣지 않는다.
 // 팀 채팅은 1년, 경기 대화는 60일 지나면 지운다(보낼 때 함께 정리). 탈퇴하면 그 사람 메시지를 지운다.
 `CREATE TABLE IF NOT EXISTS chat_messages (id text PRIMARY KEY NOT NULL, room text NOT NULL, account_id text NOT NULL, name text NOT NULL, body text NOT NULL, at text NOT NULL, deleted integer DEFAULT 0 NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_chat_messages_room_at ON chat_messages (room,at)`,
 `CREATE INDEX IF NOT EXISTS idx_chat_messages_account ON chat_messages (account_id)`,
 // 방마다 마지막으로 읽은 시각(안 읽은 개수 표시용).
 `CREATE TABLE IF NOT EXISTS chat_reads (id text PRIMARY KEY NOT NULL, account_id text NOT NULL, room text NOT NULL, at text NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_chat_reads_account ON chat_reads (account_id)`,
 // 신고. 운영자가 확인할 수 있게 메시지 내용을 신고 시점 그대로 남긴다(90일 뒤 삭제).
 `CREATE TABLE IF NOT EXISTS chat_reports (id text PRIMARY KEY NOT NULL, message_id text NOT NULL, room text NOT NULL, reporter text NOT NULL, author text NOT NULL, body text NOT NULL, reason text NOT NULL, at text NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_chat_reports_at ON chat_reports (at)`,
 // 1.24 범위별 저장 번호(내 팀 t:팀, 나 u:계정, 공개 pub). 화면은 자기 범위 번호만 보고 바뀌면 다시 읽는다.
 `CREATE TABLE IF NOT EXISTS scope_revisions (scope text PRIMARY KEY NOT NULL, version integer DEFAULT 0 NOT NULL)`,
 // 1.24 스키마 준비 표시. 서버가 새로 뜰 때마다 위 문장을 하나씩(41번) 돌리던 것을 표시 한 번 읽기로 줄인다.
 `CREATE TABLE IF NOT EXISTS schema_meta (id integer PRIMARY KEY NOT NULL, sig text NOT NULL)`,
 // 1.25 알림을 받는 사람별 표로. 화면은 내 알림만 읽는다.
 `CREATE TABLE IF NOT EXISTS user_notifications (id text PRIMARY KEY NOT NULL, user_id text NOT NULL, team_id text, dest text, read integer DEFAULT 0 NOT NULL, at text NOT NULL, body text NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS idx_user_notifications_user_at ON user_notifications (user_id, at)`,
 `CREATE INDEX IF NOT EXISTS idx_user_notifications_dest ON user_notifications (dest)`,
];

// 배포된 코드가 어느 시점 것인지 화면으로 확인하기 위한 표시.
// 스키마나 진단에 영향을 주는 변경을 할 때 함께 올린다.
export const BUILD="2026-10-11-127";

export const TABLES=["entities","state_revision","write_guards","accounts","sessions","password_resets","rate_limits","email_verifications","push_subs","closed_accounts","social_signups","chat_messages","chat_reads","chat_reports","scope_revisions","schema_meta","user_notifications"];

// 카카오만 있던 시절의 계정을 새 열로 옮긴다. 여러 번 돌아도 안전하다.
export async function backfillAccounts(){
 if(!env.DB)return;
 await env.DB.prepare(
  `UPDATE accounts SET provider_id=kakao_id WHERE provider='kakao' AND kakao_id IS NOT NULL AND provider_id IS NULL`
 ).run();
}

export async function moveNotifications(){
 if(!env.DB)return;
 await env.DB.batch([
  env.DB.prepare("INSERT OR IGNORE INTO user_notifications(id,user_id,team_id,dest,read,at,body) SELECT substr(id,15),json_extract(body,'$.userId'),json_extract(body,'$.teamId'),json_extract(body,'$.to'),CASE WHEN json_extract(body,'$.read') THEN 1 ELSE 0 END,json_extract(body,'$.at'),body FROM entities WHERE kind='notifications' AND json_extract(body,'$.userId') IS NOT NULL"),
  env.DB.prepare("DELETE FROM entities WHERE kind='notifications'"),
 ]);
}

let prepared=false;
// 문장 목록이 바뀌면 표시도 바뀐다. 같으면 이미 준비된 데이터베이스다.
export const SCHEMA_SIG=(()=>{let h=5381;const t=STATEMENTS.join("\n");for(let i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;return "s"+(h>>>0).toString(36)+"-"+STATEMENTS.length})();
export async function ensureSchema(){
 if(prepared)return;
 if(!env.DB)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);
 // 1.24: 서버가 새로 뜰 때마다 41개 문장을 차례로 돌리면(왕복 41번) 첫 화면이 몇 초씩 늦었다.
 // 같은 문장 목록으로 이미 준비한 데이터베이스면 표시 한 줄만 읽고 끝낸다. 표가 없으면(처음) 아래로.
 try{const r=await env.DB.prepare("SELECT sig FROM schema_meta WHERE id=1").first<{sig:string}>();if(r?.sig===SCHEMA_SIG){prepared=true;return}}catch{}
 for(const sql of STATEMENTS){
  try{await env.DB.prepare(sql).run()}
  catch(e){
   if(/duplicate column name/i.test(String(e)))continue; // 이미 있는 열이면 넘어간다
   // 어느 단계에서 막혔는지 구분할 수 있어야 한다. 원문은 서버 로그에만 남긴다.
   console.error("TeamKick schema",sql.slice(0,60),e);
   throw new AppError("데이터베이스를 준비하지 못했어요. 관리자에게 문의해주세요.",503);
  }
 }
 // 표를 만든 뒤에 옮긴다. 열이 없는 상태에서 돌면 실패한다.
 try{await backfillAccounts()}catch(e){console.error("TeamKick schema backfill",e)}
 // 1.25 예전 알림(entities 안)을 새 표로 옮긴다. 한 번에(batch) 옮기고 지워서 중간 상태가 남지 않는다. 여러 번 돌아도 안전하다.
 try{await moveNotifications()}catch(e){console.error("TeamKick schema notifications",e)}
 try{await env.DB.prepare("INSERT INTO schema_meta(id,sig) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET sig=excluded.sig").bind(SCHEMA_SIG).run()}catch(e){console.error("TeamKick schema mark",e)}
 prepared=true;
}

// 진단용. 표가 실제로 있는지와 준비가 어디서 막혔는지 돌려준다.
// 개인정보나 키는 담지 않는다.
export async function schemaStatus(){
 if(!env.DB)return {db:false,tables:{} as Record<string,boolean>,error:"binding-missing"};
 let error="";
 try{await ensureSchema()}catch(e){error=e instanceof AppError?e.message:String(e).slice(0,200)}
 const tables:Record<string,boolean>={};
 try{
  const found=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const names=new Set((found.results as {name:string}[]).map(x=>x.name));
  for(const t of TABLES)tables[t]=names.has(t);
 }catch(e){error=error||String(e).slice(0,200)}
 return {db:true,tables,error};
}
