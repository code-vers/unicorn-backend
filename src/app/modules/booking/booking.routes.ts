import { Router } from 'express';

import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { BookingController } from './booking.controller';
import { BookingValidation } from './booking.validation';

const router = Router();

router.post(
  '/calculate',
  validateRequest(BookingValidation.calculateBookingZodSchema),
  BookingController.calculate
);

router.post(
  '/',
  auth('USER', 'ADMIN'),
  validateRequest(BookingValidation.createBookingZodSchema),
  BookingController.createBooking
);

router.get(
  '/',
  auth('ADMIN'),
  BookingController.getAllBookings
);

router.get(
  '/my-bookings',
  auth('USER', 'ADMIN'),
  BookingController.getMyBookings
);

router.get(
  '/:id',
  auth('USER', 'ADMIN'),
  BookingController.getBookingById
);

router.patch(
  '/:id/payment',
  auth('USER', 'ADMIN'),
  validateRequest(BookingValidation.paymentZodSchema),
  BookingController.addPayment
);

router.post(
  '/:id/extend-payment',
  auth('USER', 'ADMIN'),
  validateRequest(BookingValidation.paymentZodSchema),
  BookingController.extendPayment
);

router.patch(
  '/:id/modify',
  auth('USER', 'ADMIN'),
  validateRequest(BookingValidation.modifyBookingZodSchema),
  BookingController.modifyBooking
);

router.patch(
  '/:id/status',
  auth('ADMIN'),
  validateRequest(BookingValidation.statusZodSchema),
  BookingController.updateBookingStatus
);

export const BookingRoutes = router;
