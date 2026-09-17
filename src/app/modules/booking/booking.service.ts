import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import crypto from 'node:crypto';

import AppError from '../../errors/AppError';
import config from '../../config';
import { NotificationService } from '../notification/notification.service';
import { sendEmail } from '../../utils/email';
import { QueryBuilder } from '../../utils/QueryBuilder';
import prisma from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { ActivityService } from '../activity/activity.service';
import type {
  IBookingCalculatePayload,
  IBookingCreatePayload,
  IBookingModifyPayload,
  IPaymentPayload,
  IBookingUpdateStatusPayload
} from './booking.interface';

const generateReferenceId = () => {
  const currentYear = new Date().getFullYear();
  const randomStr = crypto.randomInt(1000, 9999);
  return `UC${currentYear}-${randomStr}`;
};

type BookingPricingClient = Pick<
  Prisma.TransactionClient,
  'vehicle' | 'location' | 'pricing' | 'dropOffCharge' | 'systemSetting'
>;

interface CreateBookingOptions {
  notify?: boolean;
}

const getBlockingBookingWhere = (): Prisma.BookingWhereInput => ({
  OR: [
    { bookingStatus: { in: [BookingStatus.CONFIRMED, BookingStatus.ONGOING] } },
    {
      bookingStatus: BookingStatus.PENDING,
      OR: [{ checkoutExpiresAt: null }, { checkoutExpiresAt: { gt: new Date() } }]
    }
  ]
});

export const buildMyBookingsWhere = (
  userId: string,
  queryWhere?: Prisma.BookingWhereInput
): Prisma.BookingWhereInput => ({
  AND: [
    ...(queryWhere ? [queryWhere] : []),
    { userId },
    {
      OR: [
        { checkoutSessionId: null },
        { paymentStatus: { in: [PaymentStatus.SUCCESS, PaymentStatus.REFUNDED] } }
      ]
    }
  ]
});

const calculateCosts = async (
  payload: IBookingCalculatePayload,
  db: BookingPricingClient = prisma
) => {
  const pickupDate = new Date(payload.pickupDate);
  const dropOffDate = new Date(payload.dropOffDate);

  if (dropOffDate <= pickupDate) {
    throw new AppError(400, 'Drop-off date must be after pick-up date');
  }

  const durationMs = dropOffDate.getTime() - pickupDate.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  // Fetch Vehicle
  const vehicle = await db.vehicle.findUnique({
    where: { id: payload.vehicleId },
    include: { pricing: true }
  });

  if (!vehicle) {
    throw new AppError(404, 'Vehicle not found');
  }

  if (vehicle.status !== 'ACTIVE' || vehicle.availability === 'MAINTENANCE') {
    throw new AppError(409, 'Vehicle is not available for booking.');
  }

  const requestedLocationIds = [...new Set([payload.pickupLocationId, payload.dropOffLocationId])];
  const activeLocationCount = await db.location.count({
    where: {
      id: { in: requestedLocationIds },
      status: 'ACTIVE',
      isDeleted: false
    }
  });

  if (activeLocationCount !== requestedLocationIds.length) {
    throw new AppError(400, 'Pickup or drop-off location is unavailable.');
  }

  const globalPricing = await db.pricing.findFirst({
    where: { vehicleId: null }
  });

  const pricing = vehicle.pricing || globalPricing;

  if (!pricing) {
    throw new AppError(500, 'Pricing configuration is missing in the system.');
  }

  // Calculate base rental cost
  let rentalCost = pricing.dailyRate.toNumber() * durationDays;
  if (durationDays >= 30 && pricing.monthlyRate.toNumber() > 0) {
    rentalCost = pricing.monthlyRate.toNumber() * (durationDays / 30);
  } else if (durationDays >= 7 && pricing.weeklyRate.toNumber() > 0) {
    rentalCost = pricing.weeklyRate.toNumber() * (durationDays / 7);
  }

  // Apply Discount if applicable
  let discountAmount = 0;
  if (pricing.discountPercentage.toNumber() > 0) {
    const now = new Date();
    const isDiscountValid =
      (!pricing.discountValidFrom || new Date(pricing.discountValidFrom) <= now) &&
      (!pricing.discountValidUntil || new Date(pricing.discountValidUntil) >= now);
    if (isDiscountValid) {
      discountAmount = rentalCost * (pricing.discountPercentage.toNumber() / 100);
      rentalCost -= discountAmount;
    }
  }

  // Fetch Drop-off charge
  let pickupFee = 0;
  let dropOffFee = 0;

  if (payload.pickupLocationId !== payload.dropOffLocationId) {
    const charges = await db.dropOffCharge.findMany({
      where: {
        pickupLocationId: payload.pickupLocationId,
        dropOffLocationId: payload.dropOffLocationId,
        isDeleted: false,
        status: 'ACTIVE',
        OR: [
          { vehicleId: payload.vehicleId },
          { vehicleId: null, vehicleCategory: vehicle.category },
          { vehicleId: null, vehicleCategory: null }
        ]
      }
    });

    const charge =
      charges.find((item) => item.vehicleId === payload.vehicleId) ??
      charges.find((item) => item.vehicleCategory === vehicle.category) ??
      charges.find((item) => item.vehicleId === null && item.vehicleCategory === null);

    if (charge) {
      if (charge.chargeType === 'PER_KM') {
        if (!charge.distanceKm) {
          throw new AppError(500, 'Per-kilometre drop-off pricing is missing its distance.');
        }
        dropOffFee = charge.amount.toNumber() * charge.distanceKm.toNumber();
      } else {
        dropOffFee = charge.amount.toNumber();
      }
    }
  }

  // Calculate Add-ons
  let addonsCost = 0;
  if (payload.hasGps) addonsCost += pricing.gpsCharge.toNumber();
  if (payload.hasFullInsurance) addonsCost += pricing.fullInsuranceCharge.toNumber();
  if (payload.hasAdditionalDriver) addonsCost += pricing.additionalDriverCharge.toNumber();
  if (payload.hasChildSeat) addonsCost += pricing.childSeatCharge.toNumber();

  // Fetch Tax Percentage
  const taxSetting = await db.systemSetting.findUnique({ where: { key: 'TAX_PERCENTAGE' } });
  const taxPercentage = Number(taxSetting?.value ?? config.pricing.taxPercentage);
  if (!Number.isFinite(taxPercentage) || taxPercentage < 0 || taxPercentage > 100) {
    throw new AppError(500, 'Tax configuration is missing or invalid.');
  }

  const subtotal = rentalCost + pickupFee + dropOffFee + addonsCost;
  const taxAmount = subtotal * (taxPercentage / 100);
  const totalAmount = subtotal + taxAmount;

  return {
    durationDays,
    rentalCost,
    pickupFee,
    dropOffFee,
    addonsCost,
    subtotal,
    taxPercentage,
    taxAmount,
    totalAmount
  };
};

const calculate = async (payload: IBookingCalculatePayload) => {
  return calculateCosts(payload);
};

const createBooking = async (
  userId: string,
  payload: IBookingCreatePayload,
  options: CreateBookingOptions = {}
) => {
  let referenceId = generateReferenceId();
  // Ensure uniqueness
  let exists = await prisma.booking.findUnique({ where: { referenceId } });
  while (exists) {
    referenceId = generateReferenceId();
    exists = await prisma.booking.findUnique({ where: { referenceId } });
  }

  const requestedPickup = new Date(payload.pickupDate);
  const requestedDropOff = new Date(payload.dropOffDate);

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payload.vehicleId}))`;

    const costs = await calculateCosts(payload, tx);

    const overlappingVehicleBooking = await tx.booking.findFirst({
      where: {
        vehicleId: payload.vehicleId,
        ...getBlockingBookingWhere(),
        pickupDate: { lt: requestedDropOff },
        dropOffDate: { gt: requestedPickup }
      }
    });

    if (overlappingVehicleBooking) {
      throw new AppError(409, 'Vehicle is already booked for the selected dates.');
    }

    const booking = await tx.booking.create({
      data: {
        referenceId,
        userId,
        vehicleId: payload.vehicleId,
        pickupLocationId: payload.pickupLocationId,
        dropOffLocationId: payload.dropOffLocationId,
        pickupDate: new Date(payload.pickupDate),
        dropOffDate: new Date(payload.dropOffDate),

        rentalCost: costs.rentalCost,
        pickupFee: costs.pickupFee,
        dropOffFee: costs.dropOffFee,

        hasGps: payload.hasGps,
        hasFullInsurance: payload.hasFullInsurance,
        hasAdditionalDriver: payload.hasAdditionalDriver,
        hasChildSeat: payload.hasChildSeat,
        addonsCost: costs.addonsCost,

        taxPercentage: costs.taxPercentage,
        taxAmount: costs.taxAmount,
        totalAmount: costs.totalAmount,
        amountPaid: 0,

        bookingStatus: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING
      }
    });

    await tx.bookingDriverDetail.create({
      data: {
        bookingId: booking.id,
        firstName: payload.driverDetails.firstName,
        lastName: payload.driverDetails.lastName,
        email: payload.driverDetails.email,
        phone: payload.driverDetails.phone,
        dateOfBirth: payload.driverDetails.dateOfBirth
          ? new Date(payload.driverDetails.dateOfBirth)
          : null,
        message: payload.driverDetails.message
      }
    });

    await tx.billingInfo.create({
      data: {
        bookingId: booking.id,
        firstName: payload.billingInfo.firstName,
        lastName: payload.billingInfo.lastName,
        email: payload.billingInfo.email,
        phone: payload.billingInfo.phone,
        address: payload.billingInfo.address,
        city: payload.billingInfo.city,
        state: payload.billingInfo.state,
        country: payload.billingInfo.country,
        zipCode: payload.billingInfo.zipCode,
        description: payload.billingInfo.description
      }
    });

    return booking;
  });

  const finalBooking = await prisma.booking.findUnique({
    where: { id: result.id },
    include: {
      user: { select: { name: true, email: true } },
      vehicle: true,
      pickupLocation: true,
      dropOffLocation: true,
      driverDetails: true,
      billingInfo: true
    }
  });

  if (options.notify !== false && finalBooking) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const title = 'Booking Created Successfully';
      const message = `Your booking ${finalBooking.referenceId} for ${finalBooking.vehicle.name} has been created and is pending confirmation.`;

      await NotificationService.createNotification({
        userId,
        title,
        message,
        type: 'BOOKING'
      });

      await sendEmail(user.email, title, `<p>Hello ${user.name},</p><p>${message}</p>`);
    }

    void ActivityService.createActivity({
      type: 'BOOKING',
      title: 'Booking created',
      description: `${finalBooking.referenceId} was created for ${finalBooking.vehicle.name}.`,
      status: 'NEW'
    }).catch((error: unknown) => logger.error('Unable to record booking activity', error));
  }

  return finalBooking;
};

const deleteUnpaidBooking = async (id: string, userId: string) => {
  await prisma.booking.deleteMany({
    where: {
      id,
      userId,
      bookingStatus: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      amountPaid: 0
    }
  });
};

const getMyBookings = async (userId: string, query: any) => {
  const bookingQuery = new QueryBuilder(query).filter().sort().paginate();

  // We have to merge the where condition for userId
  const builtQuery = bookingQuery.build();
  const where = buildMyBookingsWhere(
    userId,
    builtQuery.where as Prisma.BookingWhereInput | undefined
  );
  const prismaQuery = {
    ...builtQuery,
    where,
    include: {
      vehicle: true,
      pickupLocation: true,
      dropOffLocation: true,
      assignedDriver: true
    }
  };

  const data = await prisma.booking.findMany(prismaQuery);
  const total = await prisma.booking.count({ where: prismaQuery.where });
  const take = builtQuery.take || 10;
  const skip = builtQuery.skip || 0;
  const totalPages = Math.ceil(total / take);

  return {
    meta: {
      page: skip / take + 1,
      limit: take,
      total,
      totalPages
    },
    data
  };
};

const getBookingById = async (id: string, userId?: string, role?: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      vehicle: true,
      pickupLocation: true,
      dropOffLocation: true,
      driverDetails: true,
      billingInfo: true,
      payments: true,
      assignedDriver: true
    }
  });

  if (!booking) {
    throw new AppError(404, 'Booking not found');
  }

  if (role !== 'ADMIN' && booking.userId !== userId) {
    throw new AppError(403, 'You are not authorized to view this booking');
  }

  return booking;
};

const addPayment = async (id: string, payload: IPaymentPayload, paymentType = 'INITIAL') => {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment:${id}`}))`;
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw new AppError(404, 'Booking not found');

    const outstandingAmount = booking.totalAmount.toNumber() - booking.amountPaid.toNumber();
    if (outstandingAmount <= 0) {
      throw new AppError(409, 'Booking is already fully paid.');
    }
    if (payload.amount > outstandingAmount) {
      throw new AppError(400, 'Payment cannot exceed the outstanding booking balance.');
    }

    const transactionId = `TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const payment = await tx.payment.create({
      data: {
        bookingId: id,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        transactionId,
        paymentStatus: PaymentStatus.SUCCESS,
        paymentType
      }
    });

    const newAmountPaid = booking.amountPaid.toNumber() + payload.amount;
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    if (newAmountPaid >= booking.totalAmount.toNumber()) {
      paymentStatus = PaymentStatus.SUCCESS;
    }

    const updatedBooking = await tx.booking.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        paymentStatus,
        bookingStatus:
          paymentStatus === PaymentStatus.SUCCESS ? BookingStatus.CONFIRMED : booking.bookingStatus
      }
    });

    return { payment, booking: updatedBooking, originalBooking: booking };
  });

  const booking = result.originalBooking;
  const user = await prisma.user.findUnique({ where: { id: booking.userId } });
  if (user) {
    const title = 'Payment Received';
    const message = `We have received a payment of ${payload.amount} for booking ${booking.referenceId}.`;

    await NotificationService.createNotification({
      userId: booking.userId,
      title,
      message,
      type: 'PAYMENT'
    });

    await sendEmail(user.email, title, `<p>Hello ${user.name},</p><p>${message}</p>`);
  }

  void ActivityService.createActivity({
    type: 'PAYMENT',
    title: 'Manual payment recorded',
    description: `Payment recorded for booking ${booking.referenceId}.`,
    status: 'COMPLETED'
  }).catch((error: unknown) => logger.error('Unable to record payment activity', error));

  return { payment: result.payment, booking: result.booking };
};

const modifyBooking = async (
  id: string,
  userId: string,
  role: string,
  payload: IBookingModifyPayload
) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw new AppError(404, 'Booking not found');
    if (role !== 'ADMIN' && booking.userId !== userId) throw new AppError(403, 'Unauthorized');
    if (
      role !== 'ADMIN' &&
      booking.checkoutSessionId &&
      booking.paymentStatus === PaymentStatus.PENDING
    ) {
      throw new AppError(409, 'Complete or cancel checkout before modifying this booking.');
    }
    if (!['PENDING', 'CONFIRMED'].includes(booking.bookingStatus)) {
      throw new AppError(409, 'Only pending or confirmed bookings can be modified.');
    }
    if (booking.pickupDate <= new Date()) {
      throw new AppError(409, 'A booking cannot be modified after its pickup time.');
    }

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${booking.vehicleId}))`;

    const newDropOffDate = payload.dropOffDate ?? booking.dropOffDate.toISOString();
    const requestedDropOff = new Date(newDropOffDate);

    const overlappingVehicleBooking = await tx.booking.findFirst({
      where: {
        id: { not: booking.id },
        vehicleId: booking.vehicleId,
        ...getBlockingBookingWhere(),
        pickupDate: { lt: requestedDropOff },
        dropOffDate: { gt: booking.pickupDate }
      }
    });

    if (overlappingVehicleBooking) {
      throw new AppError(409, 'Vehicle is already booked for the modified dates.');
    }

    const calculatePayload: IBookingCalculatePayload = {
      vehicleId: booking.vehicleId,
      pickupLocationId: booking.pickupLocationId,
      dropOffLocationId: booking.dropOffLocationId,
      pickupDate: booking.pickupDate.toISOString(),
      dropOffDate: newDropOffDate,
      hasGps: payload.hasGps ?? booking.hasGps,
      hasFullInsurance: payload.hasFullInsurance ?? booking.hasFullInsurance,
      hasAdditionalDriver: payload.hasAdditionalDriver ?? booking.hasAdditionalDriver,
      hasChildSeat: payload.hasChildSeat ?? booking.hasChildSeat
    };
    const costs = await calculateCosts(calculatePayload, tx);

    let modificationFee = 0;
    const hoursUntilPickup = (booking.pickupDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilPickup < 48 && hoursUntilPickup > 0) {
      const feeSetting = await tx.systemSetting.findUnique({
        where: { key: 'MODIFICATION_FEE' }
      });
      const configuredFee = Number(feeSetting?.value ?? config.pricing.modificationFee);
      modificationFee = Number.isFinite(configuredFee) && configuredFee > 0 ? configuredFee : 0;
    }

    const accumulatedModificationFee = booking.modificationFee.toNumber() + modificationFee;
    const updatedTotal = costs.totalAmount + accumulatedModificationFee;

    return tx.booking.update({
      where: { id },
      data: {
        dropOffDate: requestedDropOff,
        hasGps: calculatePayload.hasGps,
        hasFullInsurance: calculatePayload.hasFullInsurance,
        hasAdditionalDriver: calculatePayload.hasAdditionalDriver,
        hasChildSeat: calculatePayload.hasChildSeat,
        rentalCost: costs.rentalCost,
        pickupFee: costs.pickupFee,
        dropOffFee: costs.dropOffFee,
        addonsCost: costs.addonsCost,
        taxPercentage: costs.taxPercentage,
        taxAmount: costs.taxAmount,
        totalAmount: updatedTotal,
        modificationFee: accumulatedModificationFee,
        paymentStatus:
          booking.amountPaid.toNumber() >= updatedTotal
            ? PaymentStatus.SUCCESS
            : PaymentStatus.PENDING
      }
    });
  });
};

const getAllBookings = async (query: any) => {
  const bookingQuery = new QueryBuilder(query).filter().sort().paginate();

  const builtQuery = bookingQuery.build();

  const prismaQuery = {
    ...builtQuery,
    include: {
      user: { select: { name: true, email: true } },
      vehicle: true,
      pickupLocation: true,
      dropOffLocation: true,
      driverDetails: true,
      assignedDriver: true
    }
  };

  const data = await prisma.booking.findMany(prismaQuery);
  const total = await prisma.booking.count({ where: builtQuery.where });
  const take = builtQuery.take || 10;
  const skip = builtQuery.skip || 0;
  const totalPages = Math.ceil(total / take);

  return {
    meta: {
      page: skip / take + 1,
      limit: take,
      total,
      totalPages
    },
    data
  };
};

const updateBookingStatus = async (id: string, payload: IBookingUpdateStatusPayload) => {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw new AppError(404, 'Booking not found');

    if (payload.assignedDriverId && payload.assignedDriverId !== booking.assignedDriverId) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`driver:${payload.assignedDriverId}`}))`;

      const driver = await tx.driver.findFirst({
        where: {
          id: payload.assignedDriverId,
          isDeleted: false,
          availability: { not: 'UNAVAILABLE' }
        }
      });
      if (!driver) throw new AppError(409, 'Driver is unavailable.');

      const overlappingDriverBooking = await tx.booking.findFirst({
        where: {
          id: { not: booking.id },
          assignedDriverId: payload.assignedDriverId,
          ...getBlockingBookingWhere(),
          pickupDate: { lt: booking.dropOffDate },
          dropOffDate: { gt: booking.pickupDate }
        }
      });

      if (overlappingDriverBooking) {
        throw new AppError(
          409,
          'Driver is already assigned to another booking during these dates.'
        );
      }
    }

    let { rentalCost, taxAmount, totalAmount, paymentStatus } = booking;

    if (payload.status === 'COMPLETED') {
      const now = new Date();
      const dropOffDate = new Date(booking.dropOffDate);
      const diffMs = now.getTime() - dropOffDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 2) {
        let pricing = await tx.pricing.findUnique({ where: { vehicleId: booking.vehicleId } });
        if (!pricing) {
          pricing = await tx.pricing.findFirst({ where: { vehicleId: null } });
        }
        
        if (pricing) {
          const extraCharge = pricing.dailyRate.toNumber();
          rentalCost = new Prisma.Decimal(rentalCost.toNumber() + extraCharge);

          const taxSetting = await tx.systemSetting.findUnique({ where: { key: 'TAX_PERCENTAGE' } });
          const taxPercentage = Number(taxSetting?.value ?? config.pricing.taxPercentage);

          const subtotal = rentalCost.toNumber() + booking.pickupFee.toNumber() + booking.dropOffFee.toNumber() + booking.addonsCost.toNumber();
          const newTaxAmount = subtotal * (taxPercentage / 100);
          const newTotalAmount = subtotal + newTaxAmount;

          taxAmount = new Prisma.Decimal(newTaxAmount);
          totalAmount = new Prisma.Decimal(newTotalAmount);

          if (newTotalAmount > booking.amountPaid.toNumber()) {
            paymentStatus = 'PENDING';
          }
        }
      }
    }

    const updatedBooking = await tx.booking.update({
      where: { id },
      data: {
        bookingStatus: payload.status,
        assignedDriverId: payload.assignedDriverId || booking.assignedDriverId,
        rentalCost,
        taxAmount,
        totalAmount,
        paymentStatus
      },
      include: {
        vehicle: true,
        assignedDriver: true
      }
    });

    return { updatedBooking, previousBooking: booking };
  });

  const booking = result.previousBooking;

  // Status Update & Driver Assignment Notification
  const user = await prisma.user.findUnique({ where: { id: booking.userId } });
  if (user) {
    let title = `Booking Status Updated`;
    let message = `Your booking ${booking.referenceId} status has been updated to ${payload.status}.`;
    let type: any = 'BOOKING';

    if (payload.assignedDriverId && !booking.assignedDriverId) {
      title = 'Driver Assigned to Your Booking';
      message = `A driver has been assigned to your booking ${booking.referenceId}. Please check your dashboard for details.`;
      type = 'CHAUFFEUR';
    }

    await NotificationService.createNotification({
      userId: booking.userId,
      title,
      message,
      type
    });

    await sendEmail(user.email, title, `<p>Hello ${user.name},</p><p>${message}</p>`);
  }

  void ActivityService.createActivity({
    type: payload.assignedDriverId ? 'ASSIGNMENT' : 'BOOKING',
    title: payload.assignedDriverId ? 'Driver assigned' : 'Booking status updated',
    description: `${booking.referenceId} was updated to ${payload.status}.`,
    status: 'COMPLETED'
  }).catch((error: unknown) => logger.error('Unable to record booking status activity', error));

  return result.updatedBooking;
};

export const BookingService = {
  calculate,
  createBooking,
  deleteUnpaidBooking,
  getMyBookings,
  getBookingById,
  addPayment,
  modifyBooking,
  getAllBookings,
  updateBookingStatus
};
