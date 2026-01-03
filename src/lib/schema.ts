import { pgTable, serial, varchar, timestamp, geometry } from 'drizzle-orm/pg-core';

export const nops = pgTable('nops', {
  id: serial('id').primaryKey(),
  d_nop: varchar('d_nop', { length: 255 }).notNull(),
  d_luas: varchar('d_luas', { length: 255 }).notNull(),
  geom: geometry('geom').notNull(),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const kecamatans = pgTable('kecamatans', {
  id: serial('id').primaryKey(),
  d_kd_kec: varchar('d_kd_kec', { length: 255 }).notNull(),
  d_nm_kec: varchar('d_nm_kec', { length: 255 }).notNull(),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const desas = pgTable('desas', {
  id: serial('id').primaryKey(),
  d_kd_kel: varchar('d_kd_kel', { length: 255 }).notNull(),
  d_nm_kel: varchar('d_nm_kel', { length: 255 }).notNull(),
  geom: geometry('geom').notNull(),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const bloks = pgTable('bloks', {
  id: serial('id').primaryKey(),
  d_blok: varchar('d_blok', { length: 255 }).notNull(),
  geom: geometry('geom').notNull(),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const bangunans = pgTable('bangunans', {
  id: serial('id').primaryKey(),
  d_nop: varchar('d_nop', { length: 255 }).notNull(),
  geom: geometry('geom').notNull(),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

// User roles enum (for backward compatibility)
export type UserRole = 'admin' | 'bapenda' | 'bpn' | 'kecamatan' | 'desa';

// Roles table
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().$type<UserRole>(),
  kode_wilayah: varchar('kode_wilayah', { length: 20 }), // kode kecamatan/desa for filtered access
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Usulan status enum
export type UsulanStatus = 'pending' | 'diproses' | 'selesai' | 'ditolak';

// Usulan table for desa/kecamatan proposals
export const usulan = pgTable('usulan', {
  id: serial('id').primaryKey(),
  nop: varchar('nop', { length: 30 }).notNull(),
  user_id: serial('user_id').notNull(), // FK to users table
  jenis_usulan: varchar('jenis_usulan', { length: 100 }).notNull(),
  keterangan: varchar('keterangan', { length: 1000 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending').$type<UsulanStatus>(),
  catatan_bapenda: varchar('catatan_bapenda', { length: 500 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export type Nop = typeof nops.$inferSelect;
export type Kecamatan = typeof kecamatans.$inferSelect;
export type Desa = typeof desas.$inferSelect;
export type Blok = typeof bloks.$inferSelect;
export type Bangunan = typeof bangunans.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Usulan = typeof usulan.$inferSelect;
export type NewUsulan = typeof usulan.$inferInsert;
