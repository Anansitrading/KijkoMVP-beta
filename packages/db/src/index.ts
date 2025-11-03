import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Use a global variable to avoid creating multiple pool instances in dev (hot reload)
const globalForPg = global as unknown as { pgPool?: Pool };

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://opencut:opencutthegoat@localhost:5432/opencut";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create or reuse pg Pool
export const pgPool =
  globalForPg.pgPool ||
  new Pool({
    connectionString: DATABASE_URL,
    max: 10, // Maximum number of clients in the pool
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pgPool;
}

// Initialize Drizzle with pg Pool and schema
// Enable logging in development
export const db = drizzle(pgPool, { 
  schema,
  logger: process.env.NODE_ENV !== "production"
});

// Re-export schema for convenience
export * from "./schema";

// Re-export drizzle-orm functions to ensure version consistency
export {
  eq,
  and,
  or,
  not,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  exists,
  notExists,
  sql,
} from "drizzle-orm";
