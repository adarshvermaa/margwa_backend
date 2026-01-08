import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default {
    schema: './src/schema/index.ts',
    out: './drizzle',
    driver: 'pg',
    dbCredentials: {
        connectionString: process.env.DATABASE_URL || 'postgresql://margwa_user:margwa_password@localhost:5432/margwa_db',
    },
    verbose: true,
    strict: true,
} satisfies Config;
