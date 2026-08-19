import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
    adapter: new PrismaPg(
      new Pool({
        connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL
      })
    )
  }
});
