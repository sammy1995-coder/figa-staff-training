import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
// Falls back to the regular app credentials if no separate migration user is configured.
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

if (!databaseUrl && !sqlHost) {
  console.warn(
    "Neither DATABASE_URL nor SQL_HOST is set. drizzle-kit will fail to connect until one is configured in .env."
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: databaseUrl
    ? { url: databaseUrl }
    : {
        host: sqlHost || 'localhost',
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : undefined,
        user: user || 'postgres',
        password: password || '',
        database: sqlDbName || 'postgres',
        ssl: process.env.PGSSLMODE === 'require' || process.env.DB_SSL === 'true',
      },
  verbose: true,
});
