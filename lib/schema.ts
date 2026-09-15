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
];

let prepared=false;
export async function ensureSchema(){
 if(prepared)return;
 if(!env.DB)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);
 for(const sql of STATEMENTS){
  try{await env.DB.prepare(sql).run()}
  catch(e){if(!/duplicate column name/i.test(String(e)))throw e}
 }
 prepared=true;
}
