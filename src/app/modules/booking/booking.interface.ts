import type { PaymentMethod } from '@prisma/client';

export interface IBookingCalculatePayload {
  vehicleId: string;
  pickupLocationId: string;
  dropOffLocationId: string;
  pickupDate: string;
  dropOffDate: string;
  hasGps?: boolean;
  hasFullInsurance?: boolean;
  hasAdditionalDriver?: boolean;
  hasChildSeat?: boolean;
}

export interface IBookingDriverDetailPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  message?: string;
}

export interface IBookingBillingInfoPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  zipCode?: string;
  description?: string;
}

export interface IBookingCreatePayload extends IBookingCalculatePayload {
  driverDetails: IBookingDriverDetailPayload;
  billingInfo: IBookingBillingInfoPayload;
}

export interface IPaymentPayload {
  paymentMethod: PaymentMethod;
  amount: number;
}

export interface IBookingModifyPayload {
  dropOffDate?: string;
  hasGps?: boolean;
  hasFullInsurance?: boolean;
  hasAdditionalDriver?: boolean;
  hasChildSeat?: boolean;
}
