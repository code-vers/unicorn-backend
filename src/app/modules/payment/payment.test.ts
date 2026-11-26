import {
  BookingStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma
} from '@prisma/client';

import config from '../../config';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { PesapalClient } from './pesapal.client';
import { PaymentService } from './payment.service';

jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  default: {
    booking: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    payment: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn()
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn()
  }
}));

jest.mock('../activity/activity.service', () => ({
  ActivityService: { createActivity: jest.fn().mockResolvedValue(undefined) }
}));

jest.mock('../notification/notification.service', () => ({
  NotificationService: { createNotification: jest.fn().mockResolvedValue(undefined) }
}));

jest.mock('../../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined)
}));

const mockedPrisma = prisma as unknown as {
  booking: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  payment: {
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('PesapalClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    PesapalClient.clearTokenCache();
    config.pesapal.consumerKey = 'test-key';
    config.pesapal.consumerSecret = 'test-secret';
    config.pesapal.baseUrl = 'https://pay.pesapal.com/v3';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('caches the bearer token across concurrent calls', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        token: 'tok-123',
        expiryDate: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const [t1, t2] = await Promise.all([PesapalClient.getToken(), PesapalClient.getToken()]);
    expect(t1).toBe('tok-123');
    expect(t2).toBe('tok-123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws 502 when Pesapal returns HTTP 200 with an error object', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          token: 'tok-123',
          expiryDate: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          error: { code: 'invalid_request', message: 'Bad amount' }
        })
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(PesapalClient.getTransactionStatus('trk-1')).rejects.toThrow(AppError);
  });
});

describe('PaymentService (Pesapal)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('confirms a pending booking when Pesapal reports COMPLETED and values match', async () => {
    const future = new Date(Date.now() + 15 * 60 * 1000);
    const pendingPayment = {
      id: 'pay-1',
      bookingId: 'bk-1',
      amount: new Prisma.Decimal(1500),
      paymentMethod: PaymentMethod.PESAPAL,
      provider: PaymentProvider.PESAPAL,
      transactionId: 'I-ref-1',
      providerTrackingId: 'trk-1',
      providerConfirmationCode: null,
      providerPaymentMethod: null,
      providerStatus: null,
      paymentStatus: PaymentStatus.PENDING,
      paymentType: 'INITIAL',
      booking: {
        id: 'bk-1',
        referenceId: 'UC2026-1001',
        totalAmount: new Prisma.Decimal(1500),
        amountPaid: new Prisma.Decimal(0),
        bookingStatus: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentReference: 'I-ref-1',
        paymentExpiresAt: future,
        user: { id: 'u-1', name: 'Test User', email: 'test@example.com' }
      }
    };

    jest.spyOn(PesapalClient, 'getTransactionStatus').mockResolvedValue({
      status_code: 1,
      payment_status_description: 'COMPLETED',
      payment_method: 'MpesaKE',
      confirmation_code: 'CONF-999',
      merchant_reference: 'I-ref-1',
      currency: 'KES',
      amount: 1500
    });

    mockedPrisma.payment.findUnique.mockResolvedValue(pendingPayment);
    mockedPrisma.payment.update.mockResolvedValue(pendingPayment);
    mockedPrisma.booking.findUnique.mockResolvedValue(pendingPayment.booking);

    const txPaymentUpdate = jest.fn().mockResolvedValue({});
    const txBookingUpdate = jest.fn().mockResolvedValue({});
    mockedPrisma.$transaction.mockImplementation(async (fn) =>
      fn({
        payment: {
          findUnique: jest.fn().mockResolvedValue(pendingPayment),
          update: txPaymentUpdate
        },
        booking: {
          findUnique: jest.fn().mockResolvedValue(pendingPayment.booking),
          update: txBookingUpdate
        }
      })
    );

    await PaymentService.reconcileOrder('trk-1');

    expect(txPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentMethod: PaymentMethod.MPESA,
          paymentStatus: PaymentStatus.SUCCESS,
          providerConfirmationCode: 'CONF-999'
        })
      })
    );
    expect(txBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingStatus: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.SUCCESS,
          paymentReference: null,
          paymentExpiresAt: null
        })
      })
    );
  });

  it('rejects COMPLETED transaction when amount does not match', async () => {
    const payment = {
      id: 'pay-2',
      bookingId: 'bk-2',
      amount: new Prisma.Decimal(2000),
      provider: PaymentProvider.PESAPAL,
      transactionId: 'I-ref-2',
      providerTrackingId: 'trk-2',
      paymentStatus: PaymentStatus.PENDING,
      paymentType: 'INITIAL',
      booking: { id: 'bk-2', referenceId: 'UC2026-1002' }
    };

    jest.spyOn(PesapalClient, 'getTransactionStatus').mockResolvedValue({
      status_code: 1,
      merchant_reference: 'I-ref-2',
      currency: 'KES',
      amount: 100
    });

    mockedPrisma.payment.findUnique.mockResolvedValue(payment);
    mockedPrisma.payment.update.mockResolvedValue(payment);

    await expect(PaymentService.reconcileOrder('trk-2')).rejects.toThrow(
      'Pesapal transaction amount did not match the payment attempt.'
    );
  });

  it('marks late payment as REVIEW_REQUIRED when booking hold expired', async () => {
    const expired = new Date(Date.now() - 60_000);
    const payment = {
      id: 'pay-3',
      bookingId: 'bk-3',
      amount: new Prisma.Decimal(1500),
      provider: PaymentProvider.PESAPAL,
      transactionId: 'I-ref-3',
      providerTrackingId: 'trk-3',
      paymentStatus: PaymentStatus.PENDING,
      paymentType: 'INITIAL',
      booking: {
        id: 'bk-3',
        referenceId: 'UC2026-1003',
        totalAmount: new Prisma.Decimal(1500),
        amountPaid: new Prisma.Decimal(0),
        bookingStatus: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentReference: 'I-ref-3',
        paymentExpiresAt: expired
      }
    };

    jest.spyOn(PesapalClient, 'getTransactionStatus').mockResolvedValue({
      status_code: 1,
      merchant_reference: 'I-ref-3',
      currency: 'KES',
      amount: 1500
    });

    mockedPrisma.payment.findUnique.mockResolvedValue(payment);
    mockedPrisma.payment.update.mockResolvedValue(payment);
    mockedPrisma.booking.findUnique.mockResolvedValue(payment.booking);
    mockedPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

    await PaymentService.reconcileOrder('trk-3');

    expect(mockedPrisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'pay-3' }),
        data: { paymentStatus: PaymentStatus.REVIEW_REQUIRED }
      })
    );
  });

  it('transitions REFUND_PENDING to REFUNDED when Pesapal reports REVERSED', async () => {
    const payment = {
      id: 'pay-4',
      bookingId: 'bk-4',
      amount: new Prisma.Decimal(1500),
      provider: PaymentProvider.PESAPAL,
      transactionId: 'I-ref-4',
      providerTrackingId: 'trk-4',
      paymentStatus: PaymentStatus.REFUND_PENDING,
      paymentType: 'INITIAL',
      booking: { id: 'bk-4', referenceId: 'UC2026-1004' }
    };

    jest.spyOn(PesapalClient, 'getTransactionStatus').mockResolvedValue({
      status_code: 3,
      payment_status_description: 'REVERSED'
    });

    mockedPrisma.payment.findUnique.mockResolvedValue(payment);
    mockedPrisma.payment.update.mockResolvedValue(payment);
    mockedPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

    await PaymentService.reconcileOrder('trk-4');

    expect(mockedPrisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { paymentStatus: PaymentStatus.REFUNDED, providerStatus: 'REVERSED' }
      })
    );
  });

  it('validates IPN token and returns Pesapal ack payload', async () => {
    config.pesapal.ipnToken = 'secret-ipn-token';
    mockedPrisma.payment.findUnique.mockResolvedValue(null);

    await expect(
      PaymentService.handleIpn(
        {
          OrderTrackingId: 'trk-x',
          OrderMerchantReference: 'ref-x',
          OrderNotificationType: 'IPNCHANGE'
        },
        'wrong-token'
      )
    ).rejects.toThrow('Invalid IPN token.');

    const ack = await PaymentService.handleIpn(
      {
        OrderTrackingId: 'trk-x',
        OrderMerchantReference: 'ref-x',
        OrderNotificationType: 'IPNCHANGE'
      },
      'secret-ipn-token'
    );

    expect(ack).toEqual({
      orderNotificationType: 'IPNCHANGE',
      orderTrackingId: 'trk-x',
      orderMerchantReference: 'ref-x',
      status: 200
    });
  });

  it('refuses to cancel checkout if Pesapal already COMPLETED the payment', async () => {
    mockedPrisma.booking.findUnique.mockResolvedValue({
      id: 'bk-5',
      userId: 'user-1',
      bookingStatus: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      amountPaid: new Prisma.Decimal(0),
      paymentReference: 'I-ref-5'
    });
    mockedPrisma.payment.findUnique.mockResolvedValue(null);

    const pendingPayment = {
      id: 'pay-5',
      bookingId: 'bk-5',
      amount: new Prisma.Decimal(1500),
      provider: PaymentProvider.PESAPAL,
      transactionId: 'I-ref-5',
      providerTrackingId: 'trk-5',
      paymentStatus: PaymentStatus.SUCCESS,
      paymentType: 'INITIAL',
      booking: { id: 'bk-5', referenceId: 'UC2026-1005' }
    };
    mockedPrisma.payment.findUnique.mockResolvedValue(pendingPayment);

    jest.spyOn(PesapalClient, 'getTransactionStatus').mockResolvedValue({
      status_code: 1,
      merchant_reference: 'I-ref-5',
      currency: 'KES',
      amount: 1500
    });

    await expect(PaymentService.cancelCheckoutSession('bk-5', 'user-1')).rejects.toThrow(
      'Payment was already completed for this checkout.'
    );
  });

  it('calls RefundRequest with confirmation_code when admin refunds a review item', async () => {
    const payment = {
      id: 'pay-6',
      bookingId: 'bk-6',
      amount: new Prisma.Decimal(2500),
      provider: PaymentProvider.PESAPAL,
      transactionId: 'I-ref-6',
      providerTrackingId: 'trk-6',
      providerConfirmationCode: 'CONF-6',
      paymentStatus: PaymentStatus.REVIEW_REQUIRED,
      paymentType: 'INITIAL',
      booking: { id: 'bk-6', referenceId: 'UC2026-1006' }
    };

    mockedPrisma.payment.findUnique.mockResolvedValue(payment);
    mockedPrisma.payment.update.mockResolvedValue({
      ...payment,
      paymentStatus: PaymentStatus.REFUND_PENDING
    });
    mockedPrisma.payment.findUniqueOrThrow.mockResolvedValue({
      ...payment,
      paymentStatus: PaymentStatus.REFUND_PENDING
    });

    const refundSpy = jest.spyOn(PesapalClient, 'refundRequest').mockResolvedValue({
      status: '200',
      message: 'Refund requested'
    });

    await PaymentService.reviewPayment('pay-6', 'REFUND', 'admin@unicorn.co.ke');

    expect(refundSpy).toHaveBeenCalledWith({
      confirmation_code: 'CONF-6',
      amount: '2500.00',
      username: 'admin@unicorn.co.ke',
      remarks: 'Late payment for booking UC2026-1006'
    });
  });
});
