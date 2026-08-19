import Stripe from 'stripe';
import config from '../../config';
import AppError from '../../errors/AppError';
import { NotificationService } from '../notification/notification.service';
import { sendEmail } from '../../utils/email';
import prisma from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { ActivityService } from '../activity/activity.service';

let stripeClient: Stripe | undefined;
const INITIAL_CHECKOUT_DURATION_SECONDS = 31 * 60;

const getStripe = (): Stripe => {
  if (!config.stripe.secretKey) {
    throw new AppError(503, 'Payment processing is not configured.');
  }

  stripeClient ??= new Stripe(config.stripe.secretKey);
  return stripeClient;
};

/**
 * Creates a Stripe Checkout Session for a given booking.
 * Returns a URL that the frontend should redirect the user to.
 */
const createCheckoutSession = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vehicle: { select: { name: true } } }
  });

  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.userId !== userId) throw new AppError(403, 'Unauthorized');
  if (
    booking.bookingStatus !== 'PENDING' ||
    booking.paymentStatus !== 'PENDING' ||
    booking.amountPaid.toNumber() !== 0 ||
    booking.checkoutSessionId
  ) {
    throw new AppError(409, 'This booking is not eligible for initial checkout.');
  }

  const amountDue = booking.totalAmount.toNumber() - booking.amountPaid.toNumber();

  if (amountDue <= 0) {
    throw new AppError(400, 'This booking is already fully paid.');
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: config.stripe.currency,
          product_data: {
            name: `Car Rental - ${booking.vehicle.name}`,
            description: `Booking Reference: ${booking.referenceId}`
          },
          unit_amount: Math.round(amountDue * 100) // Stripe uses cents
        },
        quantity: 1
      }
    ],
    mode: 'payment',
    client_reference_id: booking.id,
    expires_at: Math.floor(Date.now() / 1000) + INITIAL_CHECKOUT_DURATION_SECONDS,
    success_url: `${config.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&booking=${booking.referenceId}`,
    cancel_url: `${config.frontendUrl}/checkout/cancel?booking=${booking.referenceId}&booking_id=${booking.id}`,
    metadata: {
      bookingId,
      userId,
      paymentType: 'INITIAL'
    }
  });

  if (!session.url) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    throw new AppError(502, 'The payment provider did not return a checkout URL.');
  }

  try {
    const updated = await prisma.booking.updateMany({
      where: {
        id: bookingId,
        userId,
        bookingStatus: 'PENDING',
        paymentStatus: 'PENDING',
        amountPaid: 0,
        checkoutSessionId: null
      },
      data: {
        checkoutSessionId: session.id,
        checkoutExpiresAt: new Date(session.expires_at * 1000)
      }
    });

    if (updated.count !== 1) {
      throw new AppError(409, 'The booking changed before checkout could start.');
    }
  } catch (error) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    throw error;
  }

  return { url: session.url, sessionId: session.id };
};

const cancelCheckoutSession = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking || booking.userId !== userId) {
    throw new AppError(404, 'Checkout booking not found.');
  }
  if (booking.bookingStatus === 'CANCELLED' && booking.paymentStatus === 'FAILED') {
    return booking;
  }
  if (
    booking.bookingStatus !== 'PENDING' ||
    booking.paymentStatus !== 'PENDING' ||
    booking.amountPaid.toNumber() !== 0 ||
    !booking.checkoutSessionId
  ) {
    throw new AppError(409, 'This checkout can no longer be cancelled.');
  }

  const stripe = getStripe();
  try {
    await stripe.checkout.sessions.expire(booking.checkoutSessionId);
  } catch {
    const session = await stripe.checkout.sessions.retrieve(booking.checkoutSessionId);
    if (session.payment_status === 'paid' || session.status === 'complete') {
      throw new AppError(409, 'Payment has already completed and the booking cannot be cancelled.');
    }
    if (session.status !== 'expired') {
      throw new AppError(502, 'Unable to cancel the payment session. Please try again.');
    }
  }

  const updated = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      userId,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      amountPaid: 0,
      checkoutSessionId: booking.checkoutSessionId
    },
    data: {
      bookingStatus: 'CANCELLED',
      paymentStatus: 'FAILED'
    }
  });

  if (updated.count !== 1) {
    const currentBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (
      currentBooking?.bookingStatus === 'CANCELLED' &&
      currentBooking.paymentStatus === 'FAILED'
    ) {
      return currentBooking;
    }
    throw new AppError(409, 'Checkout status changed while it was being cancelled.');
  }

  return prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
};

/**
 * Creates a Stripe Checkout Session specifically for a booking extension.
 */
const createExtensionCheckoutSession = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vehicle: { select: { name: true } } }
  });

  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.userId !== userId) throw new AppError(403, 'Unauthorized');
  const extensionAmount = booking.totalAmount.toNumber() - booking.amountPaid.toNumber();
  if (extensionAmount <= 0) {
    throw new AppError(400, 'This booking has no outstanding extension balance.');
  }

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: config.stripe.currency,
          product_data: {
            name: `Booking Extension - ${booking.vehicle.name}`,
            description: `Extension for Booking Reference: ${booking.referenceId}`
          },
          unit_amount: Math.round(extensionAmount * 100)
        },
        quantity: 1
      }
    ],
    mode: 'payment',
    success_url: `${config.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&booking=${booking.referenceId}`,
    cancel_url: `${config.frontendUrl}/checkout/cancel?booking=${booking.referenceId}`,
    metadata: {
      bookingId,
      userId,
      paymentType: 'EXTENSION'
    }
  });

  return { url: session.url, sessionId: session.id };
};

/**
 * Handles incoming Stripe webhook events.
 * Verifies the signature and processes 'checkout.session.completed' events.
 * This is called ONLY by Stripe, not by the frontend directly.
 */
const handleWebhook = async (rawBody: Buffer, signature: string) => {
  let event: Stripe.Event;

  try {
    if (!config.stripe.webhookSecret) {
      throw new AppError(503, 'Stripe webhook processing is not configured.');
    }
    event = getStripe().webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown Stripe error';
    throw new AppError(400, `Webhook signature verification failed: ${message}`);
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { bookingId, userId, paymentType } = session.metadata || {};

    if (bookingId && userId && paymentType === 'INITIAL') {
      await prisma.booking.updateMany({
        where: {
          id: bookingId,
          userId,
          checkoutSessionId: session.id,
          bookingStatus: 'PENDING',
          paymentStatus: 'PENDING',
          amountPaid: 0
        },
        data: {
          bookingStatus: 'CANCELLED',
          paymentStatus: 'FAILED'
        }
      });
    }
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { bookingId, userId, paymentType } = session.metadata || {};

    if (!bookingId || !userId) return;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return;
    if (booking.userId !== userId) {
      throw new AppError(400, 'Payment metadata does not match the booking owner.');
    }

    const isExtension = paymentType === 'EXTENSION';
    if (!['INITIAL', 'EXTENSION'].includes(paymentType ?? '')) {
      throw new AppError(400, 'Payment type is missing or invalid.');
    }
    if (!isExtension && booking.checkoutSessionId !== session.id) {
      throw new AppError(400, 'Payment session does not match the booking checkout.');
    }
    if (session.payment_status !== 'paid') {
      throw new AppError(400, 'Stripe has not marked this checkout as paid.');
    }
    if (session.currency?.toLowerCase() !== config.stripe.currency.toLowerCase()) {
      throw new AppError(400, 'Stripe payment currency does not match the booking currency.');
    }

    const amountPaid = (session.amount_total ?? 0) / 100; // Convert from cents
    if (amountPaid <= 0 || !session.payment_intent) {
      throw new AppError(400, 'Stripe session did not contain a valid payment.');
    }

    const transactionId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent.id;
    const existingPayment = await prisma.payment.findUnique({ where: { transactionId } });
    if (existingPayment) return;

    await prisma.$transaction(async (tx) => {
      const currentBooking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!currentBooking) return;
      const outstandingAmount =
        currentBooking.totalAmount.toNumber() - currentBooking.amountPaid.toNumber();
      if (Math.round(outstandingAmount * 100) !== Math.round(amountPaid * 100)) {
        throw new AppError(400, 'Stripe payment amount does not match the booking balance.');
      }
      const newAmountPaid = currentBooking.amountPaid.toNumber() + amountPaid;
      const isFullyPaid = newAmountPaid >= currentBooking.totalAmount.toNumber();

      // Record the payment
      await tx.payment.create({
        data: {
          bookingId,
          amount: amountPaid,
          paymentMethod: 'STRIPE',
          transactionId,
          paymentStatus: 'SUCCESS',
          paymentType: paymentType === 'EXTENSION' ? 'EXTENSION' : 'INITIAL'
        }
      });

      // Update the booking
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          amountPaid: newAmountPaid,
          paymentStatus: isFullyPaid ? 'SUCCESS' : 'PENDING',
          bookingStatus: isFullyPaid ? 'CONFIRMED' : currentBooking.bookingStatus,
          checkoutExpiresAt: isExtension ? currentBooking.checkoutExpiresAt : null
        }
      });
    });

    // Send notification and email asynchronously (don't block webhook response)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      NotificationService.createNotification({
        userId,
        title: 'Payment Successful',
        message: `Your payment of KES ${amountPaid.toFixed(2)} for booking ${booking.referenceId} has been received.`,
        type: 'PAYMENT'
      }).catch(() => {});

      sendEmail(
        user.email,
        'Payment Confirmed',
        `<p>Hello ${user.name},</p><p>We have received your payment of <strong>KES ${amountPaid.toFixed(2)}</strong> for booking <strong>${booking.referenceId}</strong>.</p>`
      ).catch(() => {});
    }

    void ActivityService.createActivity({
      type: 'PAYMENT',
      title: 'Stripe payment confirmed',
      description: `Payment confirmed for booking ${booking.referenceId}.`,
      status: 'COMPLETED'
    }).catch((error: unknown) => logger.error('Unable to record Stripe payment activity', error));
  }
};

const getMyPayments = async (userId: string, role: string) => {
  return prisma.payment.findMany({
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
};

export const PaymentService = {
  createCheckoutSession,
  cancelCheckoutSession,
  createExtensionCheckoutSession,
  getMyPayments,
  handleWebhook
};
