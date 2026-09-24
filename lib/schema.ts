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
];

// 배포된 코드가 어느 시점 것인지 화면으로 확인하기 위한 표시.
// 스키마나 진단에 영향을 주는 변경을 할 때 함께 올린다.
export const BUILD="2026-09-24-closed-accounts";

export const TABLES=["entities","state_revision","write_guards","accounts","sessions","password_resets","rate_limits","email_verifications","push_subs","closed_accounts"];

// 카카오만 있던 시절의 계정을 새 열로 옮긴다. 여러 번 돌아도 안전하다.
export async function backfillAccounts(){
 if(!env.DB)return;
 await env.DB.prepare(
  `UPDATE accounts SET provider_id=kakao_id WHERE provider='kakao' AND kakao_id IS NOT NULL AND provider_id IS NULL`
 ).run();
}

let prepared=false;
export async function ensureSchema(){
 if(prepared)return;
 if(!env.DB)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);
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
