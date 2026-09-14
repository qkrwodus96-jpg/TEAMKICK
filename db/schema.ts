import {sqliteTable,text,integer,index,check} from "drizzle-orm/sqlite-core";
import {sql} from "drizzle-orm";
export const entities=sqliteTable("entities",{id:text("id").primaryKey(),kind:text("kind").notNull(),scope:text("scope"),body:text("body").notNull()},t=>[index("idx_entities_kind_scope").on(t.kind,t.scope)]);
export const revision=sqliteTable("state_revision",{id:integer("id").primaryKey(),version:integer("version").notNull().default(0)});
export const guard=sqliteTable("write_guards",{id:text("id").primaryKey(),expected:integer("expected").notNull(),actual:integer("actual").notNull()},t=>[check("revision_matches",sql`${t.expected} = ${t.actual}`)]);
