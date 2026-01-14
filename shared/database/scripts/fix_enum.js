const postgres = require('postgres');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(__dirname, '../../../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

const dbUrl = process.env.DATABASE_URL || 'postgresql://margwa_user:margwa_password@localhost:5432/margwa_db';
console.log(`Connecting to database...`); // Masking secrets in logs

const sql = postgres(dbUrl);

async function run() {
    try {
        console.log('Attempting to add "auto" to vehicle_type enum...');
        try {
            await sql`ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'auto'`;
            console.log('✅ Successfully added "auto".');
        } catch (e) {
            console.log(`ℹ️ Note on "auto": ${e.message}`);
        }

        console.log('Attempting to add "muv" to vehicle_type enum...');
        try {
            await sql`ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'muv'`;
            console.log('✅ Successfully added "muv".');
        } catch (e) {
            console.log(`ℹ️ Note on "muv": ${e.message}`);
        }

        console.log('Migration script finished.');
    } catch (e) {
        console.error('❌ Critical Error:', e);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

run();
