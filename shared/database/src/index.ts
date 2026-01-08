import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database connection singleton
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDatabase(connectionString?: string) {
    if (dbInstance) {
        return dbInstance;
    }

    const dbUrl = connectionString || process.env.DATABASE_URL;

    if (!dbUrl) {
        throw new Error('DATABASE_URL is not defined');
    }

    const client = postgres(dbUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
    });

    dbInstance = drizzle(client, { schema });

    return dbInstance;
}

export { schema };
export * from './schema';
