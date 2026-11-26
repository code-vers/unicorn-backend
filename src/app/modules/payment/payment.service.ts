import crypto from 'node:crypto';

import { BookingStatus, PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';

import config from '../../config';
import AppError from '../../errors/AppError';
import { logger } from '../../utils/logger';
import prisma from '../../utils/prisma';
import { ActivityService } from '../activity/activity.service';
import { NotificationService } from '../notification/notification.service';
import { sendEmail } from '../../utils/email';

const INITIAL_CHECKOUT_DURATION_SECONDS = 31 * 60;
const PAYSTACK_API_URL = 'https://api.paystack.co';
const reviewablePaymentStatuses: PaymentStatus[] = [PaymentStatus.PENDING, PaymentStatus.FAILED];
type PaymentType = 'INITIAL' | 'EXTENSION';

interface PaystackResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url?: string;
    reference: string;
    status?: string;
    amount?: number;
    currency?: string;
    channel?: string;
  };
}
interface PaystackWebhookEvent {
  event: string;
  data: { reference?: string; transaction?: string | { reference?: string } };
}

const getSecret = () => {
  if (!config.paystack.secretKey) throw new AppError(503, 'Payment processing is not configured.');
  return config.paystack.secretKey;
};
const paystackRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(PAYSTACK_API_URL + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + getSecret(),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  const payload = (await response.json().catch(() => undefined)) as T | undefined;
  if (!response.ok || !payload)
    throw new AppError(502, 'Paystack could not process the payment request.');
  return payload;
};
const minorUnits = (amount: number) => Math.round(amount * 100);
const createReference = (bookingId: string, type: PaymentType) =>
  'PAY-' + type + '-' + bookingId.replace(/-/g, '') + '-' + crypto.randomUUID();
const channelToMethod = (channel?: string): PaymentMethod =>
  channel === 'mobile_money'
    ? PaymentMethod.MPESA
    : channel === 'card'
      ? PaymentMethod.CARD
      : PaymentMethod.PAYSTACK;

const initializeCheckout = async (
  bookingId: string,
  userId: string,
  paymentType: PaymentType,
  amount: number,
  email: string,
  bookingReference: string,
  paymentReference: string
) => {
  const callbackUrl = new URL('/checkout/success', config.frontendUrl);
  callbackUrl.searchParams.set('booking', bookingReference);
  const cancelUrl = new URL('/checkout/cancel', config.frontendUrl);
  cancelUrl.searchParams.set('booking', bookingReference);
  cancelUrl.searchParams.set('booking_id', bookingId);
  cancelUrl.searchParams.set('payment_type', paymentType);
  const result = await paystackRequest<PaystackResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: minorUnits(amount).toString(),
      currency: config.paystack.currency.toUpperCase(),
      reference: paymentReference,
      channels: ['card', 'mobile_money'],
      callback_url: callbackUrl.toString(),
      metadata: JSON.stringify({
        bookingId,
        userId,
        paymentType,
        cancel_action: cancelUrl.toString()
      })
    })
  });
  if (
    !result.status ||
    !result.data?.authorization_url ||
    result.data.reference !== paymentReference
  ) {
    throw new AppError(502, 'The payment provider did not return a valid checkout URL.');
  }
  return { url: result.data.authorization_url, reference: result.data.reference };
};

const createPaymentAttempt = async (
  bookingId: string,
  userId: string,
  paymentType: PaymentType
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: { select: { email: true } } }
  });
  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.userId !== userId) throw new AppError(403, 'Unauthorized');
  const amount = booking.totalAmount.toNumber() - booking.amountPaid.toNumber();
  if (amount <= 0) throw new AppError(400, 'This booking is already fully paid.');
  if (
    paymentType === 'INITIAL' &&
    (booking.bookingStatus !== BookingStatus.PENDING ||
      booking.paymentStatus !== PaymentStatus.PENDING ||
      booking.amountPaid.toNumber() !== 0 ||
      booking.paymentReference)
  )
    throw new AppError(409, 'This booking is not eligible for initial checkout.');

  if (paymentType === 'EXTENSION') {
    if (booking.bookingStatus === BookingStatus.CANCELLED)
      throw new AppError(409, 'Cancelled bookings cannot be extended.');
    const pending = await prisma.payment.findFirst({
      where: {
        bookingId,
        provider: PaymentProvider.PAYSTACK,
        paymentType: 'EXTENSION',
        paymentStatus: PaymentStatus.PENDING
      }
    });
    if (pending) {
      const expired =
        pending.createdAt.getTime() <= Date.now() - INITIAL_CHECKOUT_DURATION_SECONDS * 1000;
      if (!expired) throw new AppError(409, 'An extension payment is already awaiting completion.');
      await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { id: pending.id, paymentStatus: PaymentStatus.PENDING },
          data: { paymentStatus: PaymentStatus.FAILED }
        });
        await tx.booking.updateMany({
          where: { id: bookingId, paymentReference: pending.transactionId },
          data: { paymentReference: null, paymentExpiresAt: null }
        });
      });
    }
  }

  const reference = createReference(bookingId, paymentType);
  const expiresAt = new Date(Date.now() + INITIAL_CHECKOUT_DURATION_SECONDS * 1000);
  await prisma.$transaction(async (tx) => {
    const checkoutWhere =
      paymentType === 'INITIAL'
        ? {
            id: bookingId,
            userId,
            bookingStatus: BookingStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            amountPaid: 0,
            paymentReference: null
          }
        : {
            id: bookingId,
            userId,
            bookingStatus: { not: BookingStatus.CANCELLED },
            paymentReference: null
          };
    const updated = await tx.booking.updateMany({
      where: checkoutWhere,
      data: { paymentReference: reference, paymentExpiresAt: expiresAt }
    });
    if (updated.count !== 1)
      throw new AppError(409, 'The booking changed before checkout could start.');
    await tx.payment.create({
      data: {
        bookingId,
        amount,
        paymentMethod: PaymentMethod.PAYSTACK,
        provider: PaymentProvider.PAYSTACK,
        transactionId: reference,
        paymentStatus: PaymentStatus.PENDING,
        paymentType
      }
    });
  });
  try {
    return await initializeCheckout(
      bookingId,
      userId,
      paymentType,
      amount,
      booking.user.email,
      booking.referenceId,
      reference
    );
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: { transactionId: reference, paymentStatus: PaymentStatus.PENDING }
      });
      await tx.booking.updateMany({
        where: { id: bookingId, paymentReference: reference },
        data: { paymentReference: null, paymentExpiresAt: null }
      });
    });
    throw error;
  }
};

const createCheckoutSession = (bookingId: string, userId: string) =>
  createPaymentAttempt(bookingId, userId, 'INITIAL');
const createExtensionCheckoutSession = (bookingId: string, userId: string) =>
  createPaymentAttempt(bookingId, userId, 'EXTENSION');

const cancelCheckoutSession = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== userId) throw new AppError(404, 'Checkout booking not found.');
  if (
    booking.bookingStatus === BookingStatus.CANCELLED &&
    booking.paymentStatus === PaymentStatus.FAILED
  )
    return booking;
  const initialCheckout =
    booking.bookingStatus === BookingStatus.PENDING &&
    booking.paymentStatus === PaymentStatus.PENDING &&
    booking.amountPaid.toNumber() === 0 &&
    Boolean(booking.paymentReference);

  if (!initialCheckout) {
    const cancelledExtension = await prisma.$transaction(async (tx) => {
      const pending = await tx.payment.findFirst({
        where: {
          bookingId,
          provider: PaymentProvider.PAYSTACK,
          paymentType: 'EXTENSION',
          paymentStatus: PaymentStatus.PENDING
        }
      });
      if (!pending) return false;
      await tx.payment.update({
        where: { id: pending.id },
        data: { paymentStatus: PaymentStatus.FAILED }
      });
      await tx.booking.updateMany({
        where: { id: bookingId, paymentReference: pending.transactionId },
        data: { paymentReference: null, paymentExpiresAt: null }
      });
      return true;
    });
    if (cancelledExtension) return booking;
    throw new AppError(409, 'This checkout can no longer be cancelled.');
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: {
        id: bookingId,
        userId,
        bookingStatus: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        amountPaid: 0,
        paymentReference: booking.paymentReference
      },
      data: { bookingStatus: BookingStatus.CANCELLED, paymentStatus: PaymentStatus.FAILED }
    });
    if (updated.count !== 1) return false;
    await tx.payment.updateMany({
      where: { transactionId: booking.paymentReference, paymentStatus: PaymentStatus.PENDING },
      data: { paymentStatus: PaymentStatus.FAILED }
    });
    return true;
  });
  if (!cancelled) throw new AppError(409, 'Checkout status changed while it was being cancelled.');
  return prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
};

const verifyTransaction = (reference: string) =>
  paystackRequest<PaystackResponse>('/transaction/verify/' + encodeURIComponent(reference));

const notifySuccessfulPayment = async (bookingId: string, amount: number) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  if (!booking) return;
  NotificationService.createNotification({
    userId: booking.user.id,
    title: 'Payment Successful',
    message:
      'Your payment of KES ' +
      amount.toFixed(2) +
      ' for booking ' +
      booking.referenceId +
      ' has been received.',
    type: 'PAYMENT'
  }).catch(() => undefined);
  sendEmail(
    booking.user.email,
    'Payment Confirmed',
    '<p>Hello ' +
      booking.user.name +
      ',</p><p>We have received your payment of <strong>KES ' +
      amount.toFixed(2) +
      '</strong> for booking <strong>' +
      booking.referenceId +
      '</strong>.</p>'
  ).catch(() => undefined);
  void ActivityService.createActivity({
    type: 'PAYMENT',
    title: 'Paystack payment confirmed',
    description: 'Payment confirmed for booking ' + booking.referenceId + '.',
    status: 'COMPLETED'
  }).catch((error: unknown) => logger.error('Unable to record Paystack payment activity', error));
};

const markForReview = async (paymentId: string, bookingId: string, reason: string) => {
  const updated = await prisma.payment.updateMany({
    where: { id: paymentId, paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] } },
    data: { paymentStatus: PaymentStatus.REVIEW_REQUIRED }
  });
  if (updated.count !== 1) return;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  void ActivityService.createActivity({
    type: 'PAYMENT',
    title: 'Paystack payment requires review',
    description: 'Payment for booking ' + booking.referenceId + ' requires review: ' + reason,
    status: 'PENDING'
  }).catch((error: unknown) => logger.error('Unable to record payment review activity', error));
};

const handleChargeSuccess = async (reference: string) => {
  const payment = await prisma.payment.findUnique({ where: { transactionId: reference } });
  if (!payment || payment.provider !== PaymentProvider.PAYSTACK) return;
  const verification = await verifyTransaction(reference);
  const transaction = verification.data;
  if (
    !verification.status ||
    !transaction ||
    transaction.status !== 'success' ||
    transaction.reference !== reference ||
    transaction.currency?.toLowerCase() !== config.paystack.currency ||
    transaction.amount !== minorUnits(payment.amount.toNumber())
  )
    throw new AppError(400, 'Paystack payment verification did not match the payment attempt.');
  if (
    payment.paymentStatus === PaymentStatus.SUCCESS ||
    payment.paymentStatus === PaymentStatus.REFUNDED
  )
    return;

  // A cancelled initial checkout and any cancelled extension must never be
  // automatically confirmed if Paystack reports success afterwards.
  if (
    !reviewablePaymentStatuses.includes(payment.paymentStatus) ||
    (payment.paymentType === 'EXTENSION' && payment.paymentStatus === PaymentStatus.FAILED)
  ) {
    await markForReview(
      payment.id,
      payment.bookingId,
      'the checkout was cancelled before payment confirmation'
    );
    return;
  }

  const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId } });
  if (!booking) return;
  const initial = payment.paymentType === 'INITIAL';
  const amount = transaction.amount / 100;
  const correctBalance =
    minorUnits(booking.totalAmount.toNumber() - booking.amountPaid.toNumber()) ===
    transaction.amount;
  const validInitial =
    booking.bookingStatus === BookingStatus.PENDING &&
    booking.paymentStatus === PaymentStatus.PENDING &&
    booking.paymentReference === reference &&
    booking.paymentExpiresAt !== null &&
    booking.paymentExpiresAt > new Date();
  const validExtension =
    booking.bookingStatus !== BookingStatus.CANCELLED &&
    booking.paymentReference === reference &&
    booking.paymentExpiresAt !== null &&
    booking.paymentExpiresAt > new Date();
  if (!correctBalance || (initial && !validInitial) || (!initial && !validExtension)) {
    await markForReview(
      payment.id,
      booking.id,
      initial
        ? 'the booking hold was cancelled or expired'
        : 'the booking is no longer active or its balance changed'
    );
    return;
  }

  const confirmed = await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    const currentBooking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
    if (
      !currentPayment ||
      !currentBooking ||
      !reviewablePaymentStatuses.includes(currentPayment.paymentStatus)
    )
      return false;
    const currentBalance = minorUnits(
      currentBooking.totalAmount.toNumber() - currentBooking.amountPaid.toNumber()
    );
    const stillValidInitial =
      !initial ||
      (currentBooking.paymentReference === reference &&
        currentBooking.paymentExpiresAt !== null &&
        currentBooking.paymentExpiresAt > new Date() &&
        currentBooking.bookingStatus === BookingStatus.PENDING);
    const stillValidExtension =
      initial ||
      (currentBooking.bookingStatus !== BookingStatus.CANCELLED &&
        currentBooking.paymentReference === reference &&
        currentBooking.paymentExpiresAt !== null &&
        currentBooking.paymentExpiresAt > new Date());
    if (currentBalance !== transaction.amount || !stillValidInitial || !stillValidExtension) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.REVIEW_REQUIRED }
      });
      return false;
    }
    const newAmountPaid = currentBooking.amountPaid.toNumber() + amount;
    const fullyPaid = newAmountPaid >= currentBooking.totalAmount.toNumber();
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        paymentMethod: channelToMethod(transaction.channel),
        paymentStatus: PaymentStatus.SUCCESS
      }
    });
    await tx.booking.update({
      where: { id: currentBooking.id },
      data: {
        amountPaid: newAmountPaid,
        paymentStatus: fullyPaid ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
        bookingStatus: fullyPaid ? BookingStatus.CONFIRMED : currentBooking.bookingStatus,
        paymentReference: null,
        paymentExpiresAt: null
      }
    });
    return true;
  });
  if (confirmed) await notifySuccessfulPayment(payment.bookingId, amount);
};

const updateRefundStatus = async (event: PaystackWebhookEvent) => {
  const reference =
    event.data.reference ??
    (typeof event.data.transaction === 'string'
      ? event.data.transaction
      : event.data.transaction?.reference);
  if (!reference) return;
  const status =
    event.event === 'refund.processed'
      ? PaymentStatus.REFUNDED
      : event.event === 'refund.failed'
        ? PaymentStatus.REVIEW_REQUIRED
        : PaymentStatus.REFUND_PENDING;
  await prisma.payment.updateMany({
    where: { transactionId: reference, provider: PaymentProvider.PAYSTACK },
    data: { paymentStatus: status }
  });
};

const handleWebhook = async (rawBody: Buffer, signature: string) => {
  const expected = crypto.createHmac('sha512', getSecret()).update(rawBody).digest('hex');
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    received.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(received, expectedBuffer)
  ) {
    throw new AppError(400, 'Paystack signature verification failed.');
  }
  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookEvent;
  } catch {
    throw new AppError(400, 'Invalid Paystack webhook payload.');
  }
  if (event.event === 'charge.success' && event.data.reference)
    await handleChargeSuccess(event.data.reference);
  else if (event.event.startsWith('refund.')) await updateRefundStatus(event);
};

const reviewPayment = async (paymentId: string, action: 'CONFIRM' | 'REFUND') => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true }
  });
  if (
    !payment ||
    payment.provider !== PaymentProvider.PAYSTACK ||
    payment.paymentStatus !== PaymentStatus.REVIEW_REQUIRED ||
    !payment.transactionId
  )
    throw new AppError(404, 'Payment review item not found.');
  if (action === 'REFUND') {
    await paystackRequest('/refund', {
      method: 'POST',
      body: JSON.stringify({
        transaction: payment.transactionId,
        customer_note: 'Payment received after the booking hold ended.',
        merchant_note: 'Late payment for booking ' + payment.booking.referenceId
      })
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentStatus: PaymentStatus.REFUND_PENDING }
    });
    return prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: {
        booking: {
          select: {
            id: true,
            referenceId: true,
            totalAmount: true,
            amountPaid: true,
            vehicle: { select: { name: true } }
          }
        }
      }
    });
  }
  const verification = await verifyTransaction(payment.transactionId);
  const transaction = verification.data;
  if (
    !verification.status ||
    !transaction ||
    transaction.status !== 'success' ||
    transaction.amount !== minorUnits(payment.amount.toNumber()) ||
    transaction.currency?.toLowerCase() !== config.paystack.currency
  )
    throw new AppError(400, 'The payment cannot be verified for confirmation.');
  const booking = await prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({ where: { id: payment.id } });
    const currentBooking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
    if (!current || !currentBooking || current.paymentStatus !== PaymentStatus.REVIEW_REQUIRED) {
      throw new AppError(409, 'This payment review has already been resolved.');
    }
    const conflict = await tx.booking.findFirst({
      where: {
        id: { not: payment.bookingId },
        vehicleId: currentBooking.vehicleId,
        bookingStatus: { in: [BookingStatus.CONFIRMED, BookingStatus.ONGOING] },
        pickupDate: { lt: currentBooking.dropOffDate },
        dropOffDate: { gt: currentBooking.pickupDate }
      }
    });
    if (conflict) throw new AppError(409, 'The vehicle is no longer available for this payment.');
    const expectedAmount = minorUnits(
      currentBooking.totalAmount.toNumber() - currentBooking.amountPaid.toNumber()
    );
    if (expectedAmount !== transaction.amount) {
      throw new AppError(409, 'The booking balance changed and this payment must be refunded.');
    }
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        paymentMethod: channelToMethod(transaction.channel),
        paymentStatus: PaymentStatus.SUCCESS
      }
    });
    return tx.booking.update({
      where: { id: payment.bookingId },
      data: {
        amountPaid: { increment: payment.amount },
        paymentStatus: PaymentStatus.SUCCESS,
        bookingStatus: BookingStatus.CONFIRMED,
        paymentReference: null,
        paymentExpiresAt: null
      }
    });
  });
  await notifySuccessfulPayment(booking.id, payment.amount.toNumber());
  return prisma.payment.findUniqueOrThrow({
    where: { id: payment.id },
    include: {
      booking: {
        select: {
          id: true,
          referenceId: true,
          totalAmount: true,
          amountPaid: true,
          vehicle: { select: { name: true } }
        }
      }
    }
  });
};

const getMyPayments = async (userId: string, role: string) =>
  prisma.payment.findMany({
    where: role === 'ADMIN' ? undefined : { booking: { userId } },
    include: {
      booking: {
        select: {
          id: true,
          referenceId: true,
          totalAmount: true,
          amountPaid: true,
          vehicle: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

export const PaymentService = {
  createCheckoutSession,
  cancelCheckoutSession,
  createExtensionCheckoutSession,
  getMyPayments,
  handleWebhook,
  reviewPayment
};
