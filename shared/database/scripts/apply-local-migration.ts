import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM if needed, or just compile with tsc. 
// But since I'll run with tsx, I can use import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function run() {
    // Note: adjusting path because script is in scripts/ folder
    const sqlPath = path.join(__dirname, '../drizzle/0000_quiet_purple_man.sql');
    console.log('Reading migration file:', sqlPath);

    if (!fs.existsSync(sqlPath)) {
        console.error('Migration file not found');
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('Migration content length:', sqlContent.length);

    if (!sqlContent.includes('"routes"')) {
        console.warn('WARNING: "routes" table keyword not found in migration file!');

        // If not found, we print the first 500 chars to debug
        console.log('First 500 chars:', sqlContent.substring(0, 500));
    } else {
        console.log('"routes" table definition found in migration file.');
    }

    const dbUrl = process.env.DATABASE_URL || 'postgresql://margwa_user:margwa_password@localhost:5432/margwa_db';
    console.log('Connecting to DB...');

    const sql = postgres(dbUrl);

    try {
        console.log('Executing migration...');
        await sql.unsafe(sqlContent);
        console.log('Migration executed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await sql.end();
    }
}

run();
