import prisma from '../../utils/prisma';
import { PaymentStatus, BookingStatus } from '@prisma/client';

const getOverview = async () => {
  // 1. Total Revenue (sum of all successful payments)
  const payments = await prisma.payment.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      paymentStatus: PaymentStatus.SUCCESS,
    },
  });
  const totalRevenue = Number(payments._sum.amount || 0);

  // 2. Reservations (Total number of bookings)
  const reservations = await prisma.booking.count();

  // 3. Upcoming Rentals
  const upcomingRentals = await prisma.booking.count({
    where: {
      bookingStatus: BookingStatus.CONFIRMED,
      pickupDate: {
        gt: new Date(),
      },
    },
  });

  // 4. Pending Arrivals (Bookings that are pending, maybe starting today)
  const pendingArrivals = await prisma.booking.count({
    where: {
      bookingStatus: BookingStatus.PENDING,
    },
  });

  // 5. Active Vehicles
  const activeVehicles = await prisma.vehicle.count({
    where: {
      status: 'ACTIVE',
    },
  });

  // 6. Completed Today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const completedToday = await prisma.booking.count({
    where: {
      bookingStatus: BookingStatus.COMPLETED,
      updatedAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  return {
    totalRevenue,
    reservations,
    upcomingRentals,
    pendingArrivals,
    activeVehicles,
    completedToday,
  };
};

const getRevenueTrends = async () => {
  // Get payments from the last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const payments = await prisma.payment.findMany({
    where: {
      paymentStatus: PaymentStatus.SUCCESS,
      createdAt: {
        gte: twelveMonthsAgo,
      },
    },
    select: {
      amount: true,
      createdAt: true,
    },
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendsMap: Record<string, { month: string; revenue: number; expenses: number; net: number }> = {};

  // Initialize last 12 months
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const monthName = monthNames[d.getMonth()];
    trendsMap[monthName] = { month: monthName, revenue: 0, expenses: 0, net: 0 };
  }

  payments.forEach((p: any) => {
    const monthName = monthNames[p.createdAt.getMonth()];
    if (trendsMap[monthName]) {
      trendsMap[monthName].revenue += Number(p.amount);
      trendsMap[monthName].expenses += Number(p.amount) * 0.4; // Dummy expense 40%
      trendsMap[monthName].net = trendsMap[monthName].revenue - trendsMap[monthName].expenses;
    }
  });

  return Object.values(trendsMap);
};

const getBookingTrends = async () => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: {
        gte: twelveMonthsAgo,
      },
    },
    select: {
      createdAt: true,
    },
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendsMap: Record<string, { month: string; bookings: number }> = {};

  // Initialize last 12 months
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const monthName = monthNames[d.getMonth()];
    trendsMap[monthName] = { month: monthName, bookings: 0 };
  }

  bookings.forEach((b: any) => {
    const monthName = monthNames[b.createdAt.getMonth()];
    if (trendsMap[monthName]) {
      trendsMap[monthName].bookings += 1;
    }
  });

  return Object.values(trendsMap);
};

const getVehicleStats = async () => {
  const stats = await prisma.vehicle.groupBy({
    by: ['category'],
    _count: {
      category: true,
    },
  });

  const colorMap: Record<string, string> = {
    SALOON: '#3FA34D',
    SUV: '#FF7F00',
    VAN: '#333333',
    LUXURY: '#FFD700',
    FOUR_WD: '#8B4513',
    CHAUFFEUR_DRIVEN: '#4682B4',
    SELF_DRIVEN: '#8A2BE2',
  };

  return stats.map((s: any) => ({
    type: s.category,
    count: s._count.category,
    color: colorMap[s.category] || '#999999',
  }));
};

const getPerformance = async () => {
  // Dummy performance data for now since we don't have a Review model
  return {
    score: 98,
    reviewsCount: 154,
    rating: 4.8,
  };
};

export const AnalyticsService = {
  getOverview,
  getRevenueTrends,
  getBookingTrends,
  getVehicleStats,
  getPerformance,
};
