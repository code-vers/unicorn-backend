import crypto from 'node:crypto';

import { BookingStatus, PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';

import config from '../../config';
import AppError from '../../errors/AppError';
import { sendEmail } from '../../utils/email';
import { logger } from '../../utils/logger';
import prisma from '../../utils/prisma';
import { ActivityService } from '../activity/activity.service';
import { NotificationService } from '../notification/notification.service';
import { PesapalClient, type PesapalTransactionStatusResponse } from './pesapal.client';

const INITIAL_CHECKOUT_DURATION_SECONDS = 31 * 60;
const SWEEPER_INTERVAL_MS = 5 * 60 * 1000;
const SWEEPER_MIN_AGE_MS = 2 * 60 * 1000;
const SWEEPER_BATCH_SIZE = 25;
const SWEEPER_LOCK_KEY = 'pesapal_reconcile_sweeper';

const reviewablePaymentStatuses: PaymentStatus[] = [PaymentStatus.PENDING, PaymentStatus.FAILED];
type PaymentType = 'INITIAL' | 'EXTENSION';

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  kenya: 'KE',
  uganda: 'UG',
  tanzania: 'TZ',
  rwanda: 'RW',
  ethiopia: 'ET',
  'south africa': 'ZA',
  nigeria: 'NG',
  'united states': 'US',
  usa: 'US',
  'united kingdom': 'GB',
  uk: 'GB'
};

let cachedIpnId: string | null = null;
let sweeperTimer: NodeJS.Timeout | null = null;

const minorUnits = (amount: number): number => Math.round(amount * 100);

const createReference = (type: PaymentType): string => {
  const prefix = type === 'INITIAL' ? 'I' : 'E';
  return `${prefix}-${crypto.randomUUID()}`;
};

const toIsoCountryCode = (country?: string | null): string => {
  if (!country) return 'KE';
  const trimmed = country.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return COUNTRY_NAME_TO_ISO2[trimmed.toLowerCase()] ?? 'KE';
};

const sanitizeBillingField = (value?: string | null, maxLength = 50): string | undefined => {
  if (!value) return undefined;
  const cleaned = value
    .replace(/[^a-zA-Z0-9\s_.:@-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  return cleaned || undefined;
};

const mapPesapalPaymentMethod = (method?: string | null): PaymentMethod => {
  const normalized = (method ?? '').toLowerCase();
  if (normalized.includes('mpesa') || normalized.includes('m-pesa')) return PaymentMethod.MPESA;
  if (normalized.includes('airtel')) return PaymentMethod.AIRTEL;
  if (
    normalized.includes('card') ||
    normalized.includes('visa') ||
    normalized.includes('mastercard') ||
    normalized.includes('amex')
  ) {
    return PaymentMethod.CARD;
  }
  return PaymentMethod.PESAPAL;
};

const ensureIpnId = async (): Promise<string> => {
  if (config.pesapal.ipnId) return config.pesapal.ipnId;
  if (cachedIpnId) return cachedIpnId;

  if (config.pesapal.backendPublicUrl && config.pesapal.ipnToken) {
    const ipnUrl = new URL(
      '/api/v1/payments/pesapal/ipn',
      config.pesapal.backendPublicUrl.replace(/\/+$/, '')
    );
    ipnUrl.searchParams.set('token', config.pesapal.ipnToken);
    const registration = await PesapalClient.registerIpn(ipnUrl.toString(), 'GET');
    if (registration.ipn_id) {
      cachedIpnId = registration.ipn_id;
      return cachedIpnId;
    }
  }

  throw new AppError(503, 'Pesapal IPN ID is not configured.');
};

const initializeCheckout = async (params: {
  bookingId: string;
  paymentType: PaymentType;
  amount: number;
  bookingReference: string;
  paymentReference: string;
  userEmail: string;
  userName: string;
  billingInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string | null;
    country: string;
    zipCode: string | null;
  } | null;
}) => {
  const ipnId = await ensureIpnId();

  const callbackUrl = new URL('/checkout/success', config.frontendUrl);
  callbackUrl.searchParams.set('booking', params.bookingReference);

  const cancellationUrl = new URL('/checkout/cancel', config.frontendUrl);
  cancellationUrl.searchParams.set('booking', params.bookingReference);
  cancellationUrl.searchParams.set('booking_id', params.bookingId);
  cancellationUrl.searchParams.set('payment_type', params.paymentType);

  const nameParts = params.userName.trim().split(/\s+/);
  const billing = params.billingInfo;

  const result = await PesapalClient.submitOrder({
    id: params.paymentReference,
    currency: config.pesapal.currency,
    amount: Number(params.amount.toFixed(2)),
    description: `Booking ${params.bookingReference} (${params.paymentType.toLowerCase()})`.slice(
      0,
      100
    ),
    callback_url: callbackUrl.toString(),
    cancellation_url: cancellationUrl.toString(),
    notification_id: ipnId,
    billing_address: {
      email_address: billing?.email || params.userEmail,
      phone_number: billing?.phone || undefined,
      country_code: toIsoCountryCode(billing?.country),
      first_name: sanitizeBillingField(billing?.firstName || nameParts[0]),
      last_name: sanitizeBillingField(billing?.lastName || nameParts.slice(1).join(' ')),
      line_1: sanitizeBillingField(billing?.address, 100),
      city: sanitizeBillingField(billing?.city),
      state: sanitizeBillingField(billing?.state),
      postal_code: sanitizeBillingField(billing?.zipCode, 20)
    }
  });

  if (
    !result.order_tracking_id ||
    !result.redirect_url ||
    (result.merchant_reference && result.merchant_reference !== params.paymentReference)
  ) {
    throw new AppError(502, 'The payment provider did not return a valid checkout URL.');
  }

  return {
    url: result.redirect_url,
    reference: params.paymentReference,
    trackingId: result.order_tracking_id
  };
};

const createPaymentAttempt = async (
  bookingId: string,
  userId: string,
  paymentType: PaymentType
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { email: true, name: true } },
      billingInfo: true
    }
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
  ) {
    throw new AppError(409, 'This booking is not eligible for initial checkout.');
  }

  if (paymentType === 'EXTENSION') {
    if (booking.bookingStatus === BookingStatus.CANCELLED) {
      throw new AppError(409, 'Cancelled bookings cannot be extended.');
    }
    const pending = await prisma.payment.findFirst({
      where: {
        bookingId,
        provider: PaymentProvider.PESAPAL,
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

  const reference = createReference(paymentType);
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
    if (updated.count !== 1) {
      throw new AppError(409, 'The booking changed before checkout could start.');
    }
    await tx.payment.create({
      data: {
        bookingId,
        amount,
        paymentMethod: PaymentMethod.PESAPAL,
        provider: PaymentProvider.PESAPAL,
        transactionId: reference,
        paymentStatus: PaymentStatus.PENDING,
        paymentType
      }
    });
  });

  try {
    const checkout = await initializeCheckout({
      bookingId,
      paymentType,
      amount,
      bookingReference: booking.referenceId,
      paymentReference: reference,
      userEmail: booking.user.email,
      userName: booking.user.name,
      billingInfo: booking.billingInfo
    });

    await prisma.payment.update({
      where: { transactionId: reference },
      data: { providerTrackingId: checkout.trackingId }
    });

    return { url: checkout.url, reference: checkout.reference };
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
    title: 'Pesapal payment confirmed',
    description: 'Payment confirmed for booking ' + booking.referenceId + '.',
    status: 'COMPLETED'
  }).catch((error: unknown) => logger.error('Unable to record Pesapal payment activity', error));
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
    title: 'Pesapal payment requires review',
    description: 'Payment for booking ' + booking.referenceId + ' requires review: ' + reason,
    status: 'PENDING'
  }).catch((error: unknown) => logger.error('Unable to record payment review activity', error));
};

const verifyStatusMatchesPayment = (
  txStatus: PesapalTransactionStatusResponse,
  expectedReference: string,
  expectedAmount: number
): void => {
  if (txStatus.merchant_reference && txStatus.merchant_reference !== expectedReference) {
    throw new AppError(400, 'Pesapal transaction reference did not match the payment attempt.');
  }
  if (txStatus.currency && txStatus.currency.toUpperCase() !== config.pesapal.currency) {
    throw new AppError(400, 'Pesapal transaction currency did not match the payment attempt.');
  }
  if (
    typeof txStatus.amount !== 'number' ||
    minorUnits(txStatus.amount) !== minorUnits(expectedAmount)
  ) {
    throw new AppError(400, 'Pesapal transaction amount did not match the payment attempt.');
  }
};

const handleCompletedTransaction = async (
  paymentId: string,
  txStatus: PesapalTransactionStatusResponse
) => {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== PaymentProvider.PESAPAL || !payment.transactionId) return;

  verifyStatusMatchesPayment(txStatus, payment.transactionId, payment.amount.toNumber());

  if (
    payment.paymentStatus === PaymentStatus.SUCCESS ||
    payment.paymentStatus === PaymentStatus.REFUNDED
  ) {
    return;
  }

  // A cancelled initial checkout and any cancelled extension must never be
  // automatically confirmed if Pesapal reports completion afterwards.
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
  const amount = payment.amount.toNumber();
  const paidMinor = minorUnits(txStatus.amount ?? amount);
  const reference = payment.transactionId;
  const correctBalance =
    minorUnits(booking.totalAmount.toNumber() - booking.amountPaid.toNumber()) === paidMinor;

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
    ) {
      return false;
    }

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

    if (currentBalance !== paidMinor || !stillValidInitial || !stillValidExtension) {
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
        paymentMethod: mapPesapalPaymentMethod(txStatus.payment_method),
        paymentStatus: PaymentStatus.SUCCESS,
        providerConfirmationCode:
          txStatus.confirmation_code ?? currentPayment.providerConfirmationCode,
        providerPaymentMethod: txStatus.payment_method ?? currentPayment.providerPaymentMethod,
        providerStatus: txStatus.payment_status_description ?? 'COMPLETED'
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

  if (confirmed) {
    await notifySuccessfulPayment(payment.bookingId, amount);
  }
};

const reconcileOrder = async (trackingId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { providerTrackingId: trackingId },
    include: { booking: true }
  });
  if (!payment || payment.provider !== PaymentProvider.PESAPAL) {
    return null;
  }

  const txStatus = await PesapalClient.getTransactionStatus(trackingId);

  if (txStatus.merchant_reference && payment.transactionId) {
    if (txStatus.merchant_reference !== payment.transactionId) {
      throw new AppError(400, 'Pesapal merchant reference mismatch.');
    }
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerStatus: txStatus.payment_status_description ?? payment.providerStatus,
      providerPaymentMethod: txStatus.payment_method ?? payment.providerPaymentMethod,
      providerConfirmationCode: txStatus.confirmation_code ?? payment.providerConfirmationCode
    }
  });

  if (txStatus.status_code === 1) {
    await handleCompletedTransaction(payment.id, txStatus);
  } else if (txStatus.status_code === 3) {
    const updated = await prisma.payment.updateMany({
      where: {
        id: payment.id,
        paymentStatus: { in: [PaymentStatus.REFUND_PENDING, PaymentStatus.SUCCESS] }
      },
      data: { paymentStatus: PaymentStatus.REFUNDED, providerStatus: 'REVERSED' }
    });
    if (updated.count === 1) {
      void ActivityService.createActivity({
        type: 'PAYMENT',
        title: 'Pesapal payment refunded',
        description: `Payment for booking ${payment.booking.referenceId} was reversed/refunded.`,
        status: 'COMPLETED'
      }).catch((error: unknown) => logger.error('Unable to record refund activity', error));
    }
  }

  return prisma.payment.findUnique({
    where: { id: payment.id },
    include: {
      booking: {
        select: {
          id: true,
          referenceId: true,
          bookingStatus: true,
          paymentStatus: true,
          totalAmount: true,
          amountPaid: true,
          vehicle: { select: { name: true } }
        }
      }
    }
  });
};

const cancelCheckoutSession = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== userId) throw new AppError(404, 'Checkout booking not found.');

  if (
    booking.bookingStatus === BookingStatus.CANCELLED &&
    booking.paymentStatus === PaymentStatus.FAILED
  ) {
    return booking;
  }

  const pendingPayment = booking.paymentReference
    ? await prisma.payment.findUnique({ where: { transactionId: booking.paymentReference } })
    : await prisma.payment.findFirst({
        where: {
          bookingId,
          provider: PaymentProvider.PESAPAL,
          paymentType: 'EXTENSION',
          paymentStatus: PaymentStatus.PENDING
        }
      });

  if (pendingPayment?.providerTrackingId) {
    try {
      const txStatus = await PesapalClient.getTransactionStatus(pendingPayment.providerTrackingId);
      if (txStatus.status_code === 1) {
        await reconcileOrder(pendingPayment.providerTrackingId);
        throw new AppError(409, 'Payment was already completed for this checkout.');
      }
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 409) throw error;
      logger.warn('Unable to verify Pesapal status before cancel; proceeding with hold release', {
        bookingId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

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
          provider: PaymentProvider.PESAPAL,
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
    if (cancelledExtension) {
      if (pendingPayment?.providerTrackingId) {
        void PesapalClient.cancelOrder(pendingPayment.providerTrackingId).catch((err: unknown) =>
          logger.warn('Best-effort Pesapal CancelOrder failed', err)
        );
      }
      return booking;
    }
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

  if (pendingPayment?.providerTrackingId) {
    void PesapalClient.cancelOrder(pendingPayment.providerTrackingId).catch((err: unknown) =>
      logger.warn('Best-effort Pesapal CancelOrder failed', err)
    );
  }

  return prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
};

const verifyIpnToken = (providedToken?: string): void => {
  const expected = config.pesapal.ipnToken;
  if (!expected) return;

  if (!providedToken) {
    throw new AppError(401, 'Invalid IPN token.');
  }
  const receivedBuf = Buffer.from(providedToken);
  const expectedBuf = Buffer.from(expected);
  if (
    receivedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(receivedBuf, expectedBuf)
  ) {
    throw new AppError(401, 'Invalid IPN token.');
  }
};

const handleIpn = async (
  params: {
    OrderTrackingId?: string;
    OrderMerchantReference?: string;
    OrderNotificationType?: string;
  },
  token?: string
) => {
  verifyIpnToken(token);

  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = params;
  if (!OrderTrackingId || !OrderMerchantReference || !OrderNotificationType) {
    throw new AppError(400, 'Invalid Pesapal IPN payload.');
  }

  try {
    const reconciled = await reconcileOrder(OrderTrackingId);
    if (!reconciled) {
      logger.warn('Received Pesapal IPN for unknown tracking ID', {
        orderTrackingId: OrderTrackingId,
        orderMerchantReference: OrderMerchantReference
      });
    }
    return {
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200
    };
  } catch (error) {
    logger.error('Failed to process Pesapal IPN', {
      orderTrackingId: OrderTrackingId,
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 500
    };
  }
};

const getPaymentStatus = async (trackingId: string, userId: string, role: string) => {
  const payment = await prisma.payment.findUnique({
    where: { providerTrackingId: trackingId },
    include: {
      booking: {
        select: {
          id: true,
          userId: true,
          referenceId: true,
          bookingStatus: true,
          paymentStatus: true
        }
      }
    }
  });

  if (!payment) {
    throw new AppError(404, 'Payment record not found.');
  }
  if (role !== 'ADMIN' && payment.booking.userId !== userId) {
    throw new AppError(403, 'You are not authorized to view this payment.');
  }

  if (
    payment.provider === PaymentProvider.PESAPAL &&
    (payment.paymentStatus === PaymentStatus.PENDING ||
      payment.paymentStatus === PaymentStatus.REFUND_PENDING)
  ) {
    try {
      await reconcileOrder(trackingId);
    } catch (error) {
      logger.warn('Status poll reconciliation failed; returning latest persisted state', {
        trackingId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const latest = await prisma.payment.findUniqueOrThrow({
    where: { id: payment.id },
    include: {
      booking: {
        select: {
          referenceId: true,
          bookingStatus: true,
          paymentStatus: true
        }
      }
    }
  });

  return {
    paymentStatus: latest.paymentStatus,
    bookingStatus: latest.booking.bookingStatus,
    bookingReference: latest.booking.referenceId,
    paymentType: latest.paymentType,
    amount: latest.amount,
    paymentMethod: latest.paymentMethod
  };
};

const reviewPayment = async (
  paymentId: string,
  action: 'CONFIRM' | 'REFUND',
  adminEmail: string
) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true }
  });
  if (
    !payment ||
    payment.provider !== PaymentProvider.PESAPAL ||
    payment.paymentStatus !== PaymentStatus.REVIEW_REQUIRED ||
    !payment.providerTrackingId ||
    !payment.transactionId
  ) {
    throw new AppError(404, 'Payment review item not found.');
  }

  if (action === 'REFUND') {
    let confirmationCode = payment.providerConfirmationCode;
    if (!confirmationCode) {
      const txStatus = await PesapalClient.getTransactionStatus(payment.providerTrackingId);
      confirmationCode = txStatus.confirmation_code ?? null;
    }
    if (!confirmationCode) {
      throw new AppError(400, 'Payment confirmation code is unavailable for refund.');
    }

    await PesapalClient.refundRequest({
      confirmation_code: confirmationCode,
      amount: payment.amount.toNumber().toFixed(2),
      username: adminEmail,
      remarks: 'Late payment for booking ' + payment.booking.referenceId
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: PaymentStatus.REFUND_PENDING,
        providerConfirmationCode: confirmationCode
      }
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

  const txStatus = await PesapalClient.getTransactionStatus(payment.providerTrackingId);
  if (txStatus.status_code !== 1) {
    throw new AppError(400, 'The payment cannot be verified for confirmation.');
  }
  verifyStatusMatchesPayment(txStatus, payment.transactionId, payment.amount.toNumber());

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
    if (expectedAmount !== minorUnits(payment.amount.toNumber())) {
      throw new AppError(409, 'The booking balance changed and this payment must be refunded.');
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        paymentMethod: mapPesapalPaymentMethod(txStatus.payment_method),
        paymentStatus: PaymentStatus.SUCCESS,
        providerConfirmationCode: txStatus.confirmation_code ?? current.providerConfirmationCode,
        providerPaymentMethod: txStatus.payment_method ?? current.providerPaymentMethod,
        providerStatus: txStatus.payment_status_description ?? 'COMPLETED'
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

const refreshPaymentStatus = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== PaymentProvider.PESAPAL || !payment.providerTrackingId) {
    throw new AppError(404, 'Pesapal payment record not found.');
  }

  const reconciled = await reconcileOrder(payment.providerTrackingId);
  if (!reconciled) {
    throw new AppError(404, 'Pesapal payment record not found.');
  }
  return reconciled;
};

const reconcilePendingPayments = async (): Promise<void> => {
  const lockRows = await prisma.$queryRaw<Array<{ acquired: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${SWEEPER_LOCK_KEY})) AS acquired
  `;
  if (!lockRows[0]?.acquired) return;

  try {
    const minAgeCutoff = new Date(Date.now() - SWEEPER_MIN_AGE_MS);
    const candidates = await prisma.payment.findMany({
      where: {
        provider: PaymentProvider.PESAPAL,
        providerTrackingId: { not: null },
        OR: [
          { paymentStatus: PaymentStatus.PENDING, createdAt: { lt: minAgeCutoff } },
          { paymentStatus: PaymentStatus.REFUND_PENDING }
        ]
      },
      include: { booking: true },
      orderBy: { createdAt: 'asc' },
      take: SWEEPER_BATCH_SIZE
    });

    for (const candidate of candidates) {
      if (!candidate.providerTrackingId) continue;
      try {
        await reconcileOrder(candidate.providerTrackingId);
      } catch (error) {
        logger.warn('Pesapal sweeper reconciliation failed for payment', {
          paymentId: candidate.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      if (
        candidate.paymentStatus === PaymentStatus.PENDING &&
        candidate.booking.paymentExpiresAt &&
        candidate.booking.paymentExpiresAt <= new Date()
      ) {
        await prisma.$transaction(async (tx) => {
          const updated = await tx.payment.updateMany({
            where: { id: candidate.id, paymentStatus: PaymentStatus.PENDING },
            data: { paymentStatus: PaymentStatus.FAILED }
          });
          if (updated.count === 1 && candidate.transactionId) {
            await tx.booking.updateMany({
              where: {
                id: candidate.bookingId,
                paymentReference: candidate.transactionId
              },
              data: { paymentReference: null, paymentExpiresAt: null }
            });
          }
        });
      }
    }
  } finally {
    await prisma.$queryRaw`
      SELECT pg_advisory_unlock(hashtext(${SWEEPER_LOCK_KEY}))
    `.catch(() => undefined);
  }
};

const startReconcileSweeper = (): void => {
  if (config.nodeEnv === 'test' || sweeperTimer) return;
  sweeperTimer = setInterval(() => {
    void reconcilePendingPayments().catch((error: unknown) =>
      logger.error('Pesapal reconcile sweeper error', error)
    );
  }, SWEEPER_INTERVAL_MS);
  sweeperTimer.unref();
};

const stopReconcileSweeper = (): void => {
  if (!sweeperTimer) return;
  clearInterval(sweeperTimer);
  sweeperTimer = null;
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
  getPaymentStatus,
  handleIpn,
  reconcileOrder,
  reconcilePendingPayments,
  refreshPaymentStatus,
  reviewPayment,
  startReconcileSweeper,
  stopReconcileSweeper
};
