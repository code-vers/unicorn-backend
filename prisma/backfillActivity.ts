import { ActivityType, ActivityStatus } from '@prisma/client';
import prisma from '../src/app/utils/prisma';

async function main() {
  console.log('Cleaning up dummy activity logs...');
  await prisma.activityLog.deleteMany({});

  console.log('Backfilling activity logs from real data...');
  
  // 1. Backfill Bookings
  const bookings = await prisma.booking.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      vehicle: true,
    }
  });

  for (const booking of bookings) {
    let status: ActivityStatus = ActivityStatus.NEW;
    if (booking.bookingStatus === 'COMPLETED') status = ActivityStatus.COMPLETED;
    else if (booking.bookingStatus === 'PENDING') status = ActivityStatus.PENDING;

    await prisma.activityLog.create({
      data: {
        type: ActivityType.BOOKING,
        title: 'New Booking',
        description: `${booking.user.name} — ${booking.vehicle.brand} ${booking.vehicle.name}`,
        status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      }
    });
  }

  // 2. Backfill Payments
  const payments = await prisma.payment.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      booking: {
        include: { user: true }
      }
    }
  });

  for (const payment of payments) {
    let status: ActivityStatus = ActivityStatus.PENDING;
    let title = 'Payment Pending';
    
    if (payment.paymentStatus === 'SUCCESS') {
      status = ActivityStatus.COMPLETED;
      title = 'Payment Received';
    } else if (payment.paymentStatus === 'FAILED') {
      status = ActivityStatus.FAILED;
      title = 'Payment Failed';
    }

    await prisma.activityLog.create({
      data: {
        type: ActivityType.PAYMENT,
        title,
        description: `${payment.booking.user.name} — Amount: $${payment.amount}`,
        status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      }
    });
  }

  console.log('Activity logs successfully backfilled from real database records!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
