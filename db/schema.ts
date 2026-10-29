import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
export const rooms = sqliteTable("rooms", {
 id: text("id").primaryKey(), mode: integer("mode").notNull(), state: text("state").notNull(),
 version: integer("version").notNull().default(0), updated: integer("updated").notNull(),
 owner: text("owner").notNull().default(""), lease: integer("lease").notNull().default(0),
 openUntil: integer("open_until").notNull(), expires: integer("expires").notNull(),
}, t => [index("room_queue").on(t.mode,t.openUntil)]);
export const profiles = sqliteTable("profiles", {
 id: text("id").primaryKey(), secret: text("secret").notNull(), name: text("name").notNull(),
 xp: integer("xp").notNull().default(0), matches: integer("matches").notNull().default(0), wins: integer("wins").notNull().default(0),
 defeats: integer("defeats").notNull().default(0), revives: integer("revives").notNull().default(0),
 daily: text("daily").notNull().default("{}"), updated: integer("updated").notNull(),
});
export const inputs = sqliteTable("inputs", {
 room: text("room").notNull(), player: text("player").notNull(), name: text("name").notNull(), party: text("party").notNull(),
 input: text("input").notNull(), updated: integer("updated").notNull(),
}, t => [primaryKey({columns:[t.room,t.player]})]);
export const parties = sqliteTable("parties", {
 code: text("code").primaryKey(), mode: integer("mode").notNull(), room: text("room"), updated: integer("updated").notNull(),
});
export const results = sqliteTable("results", {
 room: text("room").notNull(), player: text("player").notNull(), reward: text("reward").notNull(), applied:integer("applied").notNull().default(0),
}, t => [primaryKey({columns:[t.room,t.player]})]);
export const probe = sqliteTable("probe", {id:text("id").primaryKey(), value:integer("value").notNull().default(0),joins:integer("joins").notNull().default(0),updated:integer("updated").notNull().default(0), payload:text("payload").notNull().default("")});
export const signals = sqliteTable("signals", {
 id:integer("id").primaryKey({autoIncrement:true}),room:text("room").notNull(),sender:text("sender").notNull(),recipient:text("recipient").notNull(),data:text("data").notNull(),created:integer("created").notNull(),
},t=>[index("signal_inbox").on(t.room,t.recipient,t.id)]);
export const limits = sqliteTable("limits",{key:text("key").primaryKey(),count:integer("count").notNull().default(0)});
