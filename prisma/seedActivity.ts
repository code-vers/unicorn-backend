import { ActivityType, ActivityStatus } from '@prisma/client';
import prisma from '../src/app/utils/prisma';

async function main() {
  console.log('Seeding activity logs...');
  
  const data = [
      {
        type: ActivityType.BOOKING,
        title: 'New Booking',
        description: 'Oliver Chen — BMW 5 Series · Self-Drive',
        status: ActivityStatus.NEW,
      },
      {
        type: ActivityType.ASSIGNMENT,
        title: 'Driver Assigned',
        description: 'Mike Asante assigned to BK-4021',
      },
      {
        type: ActivityType.PAYMENT,
        title: 'Payment Overdue',
        description: 'Sarah Johnson — Invoice #INV-2026',
        status: ActivityStatus.FAILED,
      },
      {
        type: ActivityType.SERVICE,
        title: 'Vehicle Maintenance',
        description: 'Toyota Camry sent for routine check',
        status: ActivityStatus.PENDING,
      },
    ];

  for (const item of data) {
    await prisma.activityLog.create({ data: item });
  }

  console.log('Activity logs seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
