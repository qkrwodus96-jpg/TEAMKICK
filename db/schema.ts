import {sqliteTable,text,integer,index,check} from "drizzle-orm/sqlite-core";
import {sql} from "drizzle-orm";
export const entities=sqliteTable("entities",{id:text("id").primaryKey(),kind:text("kind").notNull(),scope:text("scope"),body:text("body").notNull()},t=>[index("idx_entities_kind_scope").on(t.kind,t.scope)]);
export const revision=sqliteTable("state_revision",{id:integer("id").primaryKey(),version:integer("version").notNull().default(0)});
export const guard=sqliteTable("write_guards",{id:text("id").primaryKey(),expected:integer("expected").notNull(),actual:integer("actual").notNull()},t=>[check("revision_matches",sql`${t.expected} = ${t.actual}`)]);
export const accounts=sqliteTable("accounts",{id:text("id").primaryKey(),email:text("email").notNull().unique(),name:text("name").notNull(),password:text("password").notNull(),failures:integer("failures").notNull().default(0),lockedUntil:text("locked_until"),agreedAt:text("agreed_at"),verifiedAt:text("verified_at"),provider:text("provider").notNull().default("local"),kakaoId:text("kakao_id"),at:text("at").notNull()},t=>[index("idx_accounts_kakao").on(t.kakaoId)]);
export const sessions=sqliteTable("sessions",{id:text("id").primaryKey(),accountId:text("account_id").notNull(),expires:text("expires").notNull(),at:text("at").notNull()},t=>[index("idx_sessions_account").on(t.accountId)]);
export const passwordResets=sqliteTable("password_resets",{id:text("id").primaryKey(),accountId:text("account_id").notNull(),expires:text("expires").notNull(),used:integer("used").notNull().default(0),at:text("at").notNull()},t=>[index("idx_password_resets_account").on(t.accountId)]);
export const rateLimits=sqliteTable("rate_limits",{id:text("id").primaryKey(),count:integer("count").notNull().default(0),resetAt:text("reset_at").notNull()},t=>[index("idx_rate_limits_reset").on(t.resetAt)]);
export const emailVerifications=sqliteTable("email_verifications",{id:text("id").primaryKey(),accountId:text("account_id").notNull(),expires:text("expires").notNull(),used:integer("used").notNull().default(0),at:text("at").notNull()},t=>[index("idx_email_verifications_account").on(t.accountId)]);
// 탈퇴한 계정 번호만(이름·이메일 없음). 백업 복원 때 되살리지 않기 위해 1년 보관.
export const closedAccounts=sqliteTable("closed_accounts",{id:text("id").primaryKey(),at:text("at").notNull()},t=>[index("idx_closed_accounts_at").on(t.at)]);
// 소셜 가입 대기(최대 10분). 동의·만 14세 확인 전에는 계정을 만들지 않는다.
export const socialSignups=sqliteTable("social_signups",{id:text("id").primaryKey(),provider:text("provider").notNull(),subject:text("subject").notNull(),name:text("name").notNull(),expires:text("expires").notNull(),at:text("at").notNull()},t=>[index("idx_social_signups_expires").on(t.expires)]);
