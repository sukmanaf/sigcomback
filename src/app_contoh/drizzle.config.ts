// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql", // Tambahkan ini untuk menentukan dialek PostgreSQL
  dbCredentials: {
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "123123", // Ganti dengan password Anda
    database: "maps",
  },
});