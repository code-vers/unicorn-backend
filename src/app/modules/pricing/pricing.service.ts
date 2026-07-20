import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import type { IPricingPayload } from './pricing.interface';

const savePricing = async (payload: IPricingPayload) => {
  const { vehicleId, ...pricingData } = payload;

  if (vehicleId) {
    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new AppError(404, 'Vehicle not found.');
    }
  }

  // Upsert the pricing
  let result;
  if (vehicleId) {
    result = await prisma.pricing.upsert({
      where: { vehicleId },
      update: pricingData,
      create: {
        vehicleId,
        ...pricingData
      }
    });
  } else {
    const globalPricing = await prisma.pricing.findFirst({ where: { vehicleId: null } });
    if (globalPricing) {
      result = await prisma.pricing.update({
        where: { id: globalPricing.id },
        data: pricingData
      });
    } else {
      result = await prisma.pricing.create({
        data: {
          vehicleId: null,
          ...pricingData
        }
      });
    }
  }

  return result;
};

const getPricing = async (vehicleId?: string) => {
  if (vehicleId) {
    const pricing = await prisma.pricing.findUnique({
      where: { vehicleId }
    });
    // If specific pricing not found, fallback to global
    if (!pricing) {
      const globalPricing = await prisma.pricing.findFirst({
        where: { vehicleId: null }
      });
      return globalPricing;
    }
    return pricing;
  }

  // Return global pricing
  const globalPricing = await prisma.pricing.findFirst({
    where: { vehicleId: null }
  });

  return globalPricing;
};

const deletePricing = async (vehicleId: string) => {
  if (!vehicleId) {
    throw new AppError(400, 'Vehicle ID is required to delete specific pricing.');
  }

  const existing = await prisma.pricing.findUnique({
    where: { vehicleId }
  });

  if (!existing) {
    throw new AppError(404, 'Pricing configuration for this vehicle not found.');
  }

  await prisma.pricing.delete({
    where: { vehicleId }
  });
};

export const PricingService = {
  savePricing,
  getPricing,
  deletePricing
};
