import { getDatabase } from '../src/index';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function verify() {
    console.log('Verifying routes table...');
    try {
        const db = getDatabase();
        const result = await db.execute(sql`SELECT count(*) FROM routes`);
        console.log('Routes count result:', result);
        console.log('SUCCESS: Routes table exists.');
    } catch (e) {
        console.error('FAILURE: Could not query routes table:', e);
    }
    process.exit(0);
}
verify();
