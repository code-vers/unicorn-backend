import Stripe from 'stripe';
import config from '../../config';
import AppError from '../../errors/AppError';
import { NotificationService } from '../notification/notification.service';
import { sendEmail } from '../../utils/email';
import prisma from '../../utils/prisma';

const stripe = new Stripe(config.stripe.secretKey);

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

  const amountDue = booking.totalAmount.toNumber() - booking.amountPaid.toNumber();

  if (amountDue <= 0) {
    throw new AppError(400, 'This booking is already fully paid.');
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
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
    success_url: `${config.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontendUrl}/payment/cancel`,
    metadata: {
      bookingId,
      userId
    }
  });

  return { url: session.url, sessionId: session.id };
};

/**
 * Creates a Stripe Checkout Session specifically for a booking extension.
 */
const createExtensionCheckoutSession = async (bookingId: string, userId: string, extensionAmount: number) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vehicle: { select: { name: true } } }
  });

  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.userId !== userId) throw new AppError(403, 'Unauthorized');
  if (extensionAmount <= 0) throw new AppError(400, 'Extension amount must be greater than 0.');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
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
    success_url: `${config.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontendUrl}/payment/cancel`,
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
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  } catch (err: any) {
    throw new AppError(400, `Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { bookingId, userId, paymentType } = session.metadata || {};

    if (!bookingId || !userId) return;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return;

    const amountPaid = (session.amount_total ?? 0) / 100; // Convert from cents
    const newAmountPaid = booking.amountPaid.toNumber() + amountPaid;
    const isFullyPaid = newAmountPaid >= booking.totalAmount.toNumber();

    await prisma.$transaction(async (tx) => {
      // Record the payment
      await tx.payment.create({
        data: {
          bookingId,
          amount: amountPaid,
          paymentMethod: 'STRIPE',
          transactionId: session.payment_intent as string,
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
          bookingStatus: isFullyPaid ? 'CONFIRMED' : booking.bookingStatus
        }
      });
    });

    // Send notification and email asynchronously (don't block webhook response)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      NotificationService.createNotification({
        userId,
        title: 'Payment Successful',
        message: `Your payment of $${amountPaid.toFixed(2)} for booking ${booking.referenceId} has been received.`,
        type: 'PAYMENT'
      }).catch(() => {});

      sendEmail(
        user.email,
        'Payment Confirmed',
        `<p>Hello ${user.name},</p><p>We have received your payment of <strong>$${amountPaid.toFixed(2)}</strong> for booking <strong>${booking.referenceId}</strong>. Your booking is now <strong>Confirmed</strong>!</p>`
      ).catch(() => {});
    }
  }
};

export const PaymentService = {
  createCheckoutSession,
  createExtensionCheckoutSession,
  handleWebhook
};
