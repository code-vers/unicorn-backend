import bcrypt from 'bcryptjs';

import config from '../src/app/config';
import { logger } from '../src/app/utils/logger';
import prisma from '../src/app/utils/prisma';

async function main() {
  logger.info('Start seeding...');

  const adminEmail = config.admin.email;
  const adminPassword = config.admin.password;

  const hashedPassword = await bcrypt.hash(adminPassword, config.bcryptSaltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      name: 'System Admin'
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      name: 'System Admin'
    }
  });

  logger.info(`Admin user ensured in database: ${adminUser.email}`);
  logger.info('Seeding finished.');
}

main()
  .catch((e) => {
    logger.error('Error during seeding', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
