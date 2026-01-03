import { pgTable, serial, varchar, timestamp, geometry } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const nops = pgTable("nops", {
  id: serial("id").primaryKey(),
  d_nop: varchar("d_nop", { length: 255 }).notNull(),
  d_luas: varchar("d_luas", { length: 255 }).notNull(),
  geom: geometry("geom", { type: "multipolygon", srid: 4326 }).notNull(),
  created_at: timestamp("created_at", { precision: 0 }),
  updated_at: timestamp("updated_at", { precision: 0 }),
});

export const desas = pgTable("desas", {
  id: serial("id").primaryKey(),
  d_kd_kel: varchar("d_kd_kel", { length: 255 }).notNull(),
  d_nm_kel: varchar("d_nm_kel", { length: 255 }).notNull(),
  geom: geometry("geom", { type: "multipolygon", srid: 4326 }).notNull(),
  created_at: timestamp("created_at", { precision: 0 }),
  updated_at: timestamp("updated_at", { precision: 0 }),
});

export const bangunans = pgTable("bangunans", {
  id: serial("id").primaryKey(),
  d_nop: varchar("d_nop", { length: 255 }).notNull(),
  geom: geometry("geom", { type: "multipolygon", srid: 4326 }).notNull(),
  created_at: timestamp("created_at", { precision: 0 }),
  updated_at: timestamp("updated_at", { precision: 0 }),
});

export const bloks = pgTable("bloks", {
  id: serial("id").primaryKey(),
  d_blok: varchar("d_blok", { length: 255 }).notNull(),
  geom: geometry("geom", { type: "polygon", srid: 4326 }).notNull(),
  created_at: timestamp("created_at", { precision: 0 }),
  updated_at: timestamp("updated_at", { precision: 0 }),
});
