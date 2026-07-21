import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';

import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../utils/QueryBuilder';
import prisma from '../../utils/prisma';
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

const calculateCosts = async (payload: IBookingCalculatePayload) => {
  const pickupDate = new Date(payload.pickupDate);
  const dropOffDate = new Date(payload.dropOffDate);

  if (dropOffDate <= pickupDate) {
    throw new AppError(400, 'Drop-off date must be after pick-up date');
  }

  const durationMs = dropOffDate.getTime() - pickupDate.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  // Fetch Vehicle
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: payload.vehicleId },
    include: { pricing: true }
  });

  if (!vehicle) {
    throw new AppError(404, 'Vehicle not found');
  }

  const globalPricing = await prisma.pricing.findFirst({
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
    const isDiscountValid = !pricing.discountValidUntil || new Date(pricing.discountValidUntil) >= new Date();
    if (isDiscountValid) {
       discountAmount = rentalCost * (pricing.discountPercentage.toNumber() / 100);
       rentalCost -= discountAmount;
    }
  }

  // Fetch Drop-off charge
  let pickupFee = 0;
  let dropOffFee = 0;
  
  if (payload.pickupLocationId !== payload.dropOffLocationId) {
    const charge = await prisma.dropOffCharge.findFirst({
      where: {
        pickupLocationId: payload.pickupLocationId,
        dropOffLocationId: payload.dropOffLocationId,
        isDeleted: false,
        status: 'ACTIVE'
      }
    });
    
    // In actual implementation, we might have separate pickup and dropoff delivery fees based on business rules
    // Using simple logic here
    if (charge) {
      dropOffFee = charge.amount.toNumber();
    }
  }

  // Calculate Add-ons
  let addonsCost = 0;
  if (payload.hasGps) addonsCost += pricing.gpsCharge.toNumber();
  if (payload.hasFullInsurance) addonsCost += pricing.fullInsuranceCharge.toNumber();
  if (payload.hasAdditionalDriver) addonsCost += pricing.additionalDriverCharge.toNumber();
  if (payload.hasChildSeat) addonsCost += pricing.childSeatCharge.toNumber();

  // Fetch Tax Percentage
  let taxPercentage = 16.0;
  const taxSetting = await prisma.systemSetting.findUnique({ where: { key: 'TAX_PERCENTAGE' } });
  if (taxSetting && !isNaN(Number(taxSetting.value))) {
    taxPercentage = Number(taxSetting.value);
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

const createBooking = async (userId: string, payload: IBookingCreatePayload) => {
  const costs = await calculateCosts(payload);

  let referenceId = generateReferenceId();
  // Ensure uniqueness
  let exists = await prisma.booking.findUnique({ where: { referenceId } });
  while (exists) {
    referenceId = generateReferenceId();
    exists = await prisma.booking.findUnique({ where: { referenceId } });
  }

  const result = await prisma.$transaction(async (tx) => {
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
        dateOfBirth: payload.driverDetails.dateOfBirth ? new Date(payload.driverDetails.dateOfBirth) : null,
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

  return prisma.booking.findUnique({
    where: { id: result.id },
    include: {
      vehicle: true,
      pickupLocation: true,
      dropOffLocation: true,
      driverDetails: true,
      billingInfo: true
    }
  });
};

const getMyBookings = async (userId: string, query: any) => {
  const bookingQuery = new QueryBuilder(query)
    .filter()
    .sort()
    .paginate();

  // We have to merge the where condition for userId
  const builtQuery = bookingQuery.build();
  const prismaQuery = {
    ...builtQuery,
    where: {
      ...builtQuery.where,
      userId
    },
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
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new AppError(404, 'Booking not found');

  const result = await prisma.$transaction(async (tx) => {
    // Generate mock transaction ID
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
        bookingStatus: paymentStatus === PaymentStatus.SUCCESS ? BookingStatus.CONFIRMED : booking.bookingStatus
      }
    });

    return { payment, booking: updatedBooking };
  });

  return result;
};

const modifyBooking = async (id: string, userId: string, payload: IBookingModifyPayload) => {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.userId !== userId) throw new AppError(403, 'Unauthorized');

  const newDropOffDate = payload.dropOffDate ? payload.dropOffDate : booking.dropOffDate.toISOString();
  
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

  const costs = await calculateCosts(calculatePayload);

  // Example Modification Fee logic: If modification happens less than 48 hours before pickup
  let modificationFee = 0;
  const now = new Date();
  const hoursUntilPickup = (booking.pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilPickup < 48 && hoursUntilPickup > 0) {
    modificationFee = 25; // Constant as per screenshot, could be dynamic
  }

  const updatedTotal = costs.totalAmount + modificationFee;

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      dropOffDate: new Date(newDropOffDate),
      hasGps: calculatePayload.hasGps,
      hasFullInsurance: calculatePayload.hasFullInsurance,
      hasAdditionalDriver: calculatePayload.hasAdditionalDriver,
      hasChildSeat: calculatePayload.hasChildSeat,
      
      rentalCost: costs.rentalCost,
      addonsCost: costs.addonsCost,
      taxAmount: costs.taxAmount,
      totalAmount: updatedTotal,
      modificationFee: booking.modificationFee.toNumber() + modificationFee,
      
      // Update payment status since total changed
      paymentStatus: (booking.amountPaid.toNumber() >= updatedTotal) ? PaymentStatus.SUCCESS : PaymentStatus.PENDING
    }
  });

  return updatedBooking;
};

const getAllBookings = async (query: any) => {
  const bookingQuery = new QueryBuilder(query)
    .filter()
    .sort()
    .paginate();

  const builtQuery = bookingQuery.build();
  
  const prismaQuery = {
    ...builtQuery,
    include: {
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
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new AppError(404, 'Booking not found');

  const result = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id },
      data: {
        bookingStatus: payload.status,
        assignedDriverId: payload.assignedDriverId || booking.assignedDriverId
      },
      include: {
        vehicle: true,
        assignedDriver: true
      }
    });

    if (payload.status === 'ONGOING') {
      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: { availability: 'RENTED' }
      });
    } else if (payload.status === 'COMPLETED' || payload.status === 'CANCELLED') {
      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: { availability: 'AVAILABLE' }
      });
    }

    return updatedBooking;
  });

  return result;
};

export const BookingService = {
  calculate,
  createBooking,
  getMyBookings,
  getBookingById,
  addPayment,
  modifyBooking,
  getAllBookings,
  updateBookingStatus
};
