import {sqliteTable,text,integer,index,check} from "drizzle-orm/sqlite-core";
import {sql} from "drizzle-orm";
export const entities=sqliteTable("entities",{id:text("id").primaryKey(),kind:text("kind").notNull(),scope:text("scope"),body:text("body").notNull()},t=>[index("idx_entities_kind_scope").on(t.kind,t.scope)]);
export const revision=sqliteTable("state_revision",{id:integer("id").primaryKey(),version:integer("version").notNull().default(0)});
export const guard=sqliteTable("write_guards",{id:text("id").primaryKey(),expected:integer("expected").notNull(),actual:integer("actual").notNull()},t=>[check("revision_matches",sql`${t.expected} = ${t.actual}`)]);
export const accounts=sqliteTable("accounts",{id:text("id").primaryKey(),email:text("email").notNull().unique(),name:text("name").notNull(),password:text("password").notNull(),failures:integer("failures").notNull().default(0),lockedUntil:text("locked_until"),agreedAt:text("agreed_at"),at:text("at").notNull()});
export const sessions=sqliteTable("sessions",{id:text("id").primaryKey(),accountId:text("account_id").notNull(),expires:text("expires").notNull(),at:text("at").notNull()},t=>[index("idx_sessions_account").on(t.accountId)]);
export const passwordResets=sqliteTable("password_resets",{id:text("id").primaryKey(),accountId:text("account_id").notNull(),expires:text("expires").notNull(),used:integer("used").notNull().default(0),at:text("at").notNull()},t=>[index("idx_password_resets_account").on(t.accountId)]);
export const rateLimits=sqliteTable("rate_limits",{id:text("id").primaryKey(),count:integer("count").notNull().default(0),resetAt:text("reset_at").notNull()},t=>[index("idx_rate_limits_reset").on(t.resetAt)]);
