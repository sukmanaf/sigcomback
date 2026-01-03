import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// PostgreSQL connection configuration
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123123',
  database: process.env.DB_NAME || 'maps',
  max: 20, // Maksimum koneksi di pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false // <--- INI WAJIB ADA UNTUK NEON
  },
});

export const db = drizzle(pool);

export default db;
