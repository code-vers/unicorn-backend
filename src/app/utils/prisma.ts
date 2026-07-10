import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import config from '../config';

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL must be set.');
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Export the pool so we can close it gracefully later during shutdown
export const pool = new Pool({
  connectionString: config.databaseUrl
});

const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: config.nodeEnv === 'development' ? ['query', 'warn', 'error'] : ['error']
  });
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
