import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDatabase } from '../src/index';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function runMigrations() {
    console.log('⏳ Running migrations...');

    // Get database connection
    // Note: getDatabase uses process.env.DATABASE_URL
    const db = getDatabase();

    try {
        // Run migrations
        await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
        console.log('✅ Migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }

    // We need to close the connection, but getDatabase uses a singleton and doesn't expose a close method directly on the db instance easily with postgres-js 
    // without access to the underlying sql client. 
    // However, for a script, process.exit(0) is usually fine.
    process.exit(0);
}

runMigrations();
