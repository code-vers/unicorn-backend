import config from '../../config';
import AppError from '../../errors/AppError';
import { logger } from '../../utils/logger';

const REQUEST_TIMEOUT_MS = 15_000;
const TOKEN_REFRESH_BUFFER_MS = 60_000;

export interface PesapalErrorDetail {
  error_type?: string | null;
  code?: string | null;
  message?: string | null;
}

export interface PesapalAuthResponse {
  token?: string;
  expiryDate?: string;
  status?: string;
  message?: string;
  error?: PesapalErrorDetail | null;
}

export interface PesapalIpnRegistration {
  url: string;
  ipn_id: string;
  created_date?: string;
  ipn_status?: number;
  ipn_notification_type?: string;
  status?: string;
  error?: PesapalErrorDetail | null;
}

export interface PesapalBillingAddress {
  email_address: string;
  phone_number?: string;
  country_code?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  line_1?: string;
  line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  zip_code?: string;
}

export interface PesapalSubmitOrderRequest {
  id: string;
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  cancellation_url?: string;
  notification_id: string;
  branch?: string;
  billing_address: PesapalBillingAddress;
}

export interface PesapalSubmitOrderResponse {
  order_tracking_id?: string;
  merchant_reference?: string;
  redirect_url?: string;
  status?: string;
  message?: string;
  error?: PesapalErrorDetail | null;
}

export interface PesapalTransactionStatusResponse {
  payment_method?: string;
  amount?: number;
  created_date?: string;
  confirmation_code?: string;
  payment_status_description?: string;
  description?: string;
  message?: string;
  payment_account?: string;
  call_back_url?: string;
  status_code?: number; // 0 = INVALID, 1 = COMPLETED, 2 = FAILED, 3 = REVERSED
  merchant_reference?: string;
  currency?: string;
  status?: string;
  error?: PesapalErrorDetail | null;
}

export interface PesapalCancelOrderResponse {
  status?: string;
  message?: string;
  error?: PesapalErrorDetail | null;
}

export interface PesapalRefundRequest {
  confirmation_code: string;
  amount: string;
  username: string;
  remarks: string;
}

export interface PesapalRefundResponse {
  status?: string;
  message?: string;
  error?: PesapalErrorDetail | null;
}

interface CachedToken {
  value: string;
  expiresAtMs: number;
}

let cachedToken: CachedToken | null = null;
let inFlightTokenRequest: Promise<string> | null = null;

const clearTokenCache = (): void => {
  cachedToken = null;
  inFlightTokenRequest = null;
};

const ensureCredentials = (): { consumerKey: string; consumerSecret: string } => {
  const { consumerKey, consumerSecret } = config.pesapal;
  if (!consumerKey || !consumerSecret) {
    throw new AppError(503, 'Payment processing is not configured.');
  }
  return { consumerKey, consumerSecret };
};

const hasPesapalError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const error = record.error as PesapalErrorDetail | null | undefined;
  if (error && (error.message || error.code || error.error_type)) {
    return error.message || error.code || error.error_type || 'Pesapal request failed.';
  }
  if (record.status === '500') {
    return typeof record.message === 'string' ? record.message : 'Pesapal returned status 500.';
  }
  return null;
};

const requestNewToken = async (): Promise<string> => {
  const { consumerKey, consumerSecret } = ensureCredentials();
  const response = await fetch(`${config.pesapal.baseUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret
    })
  });

  const payload = (await response.json().catch(() => undefined)) as PesapalAuthResponse | undefined;
  const errorDetail = hasPesapalError(payload);

  if (!response.ok || !payload?.token || errorDetail) {
    logger.error(
      `Pesapal token request failed (env=${config.pesapal.env}, status=${response.status}, detail=${errorDetail ?? payload?.message ?? 'unknown'})`
    );
    throw new AppError(502, 'Unable to authenticate with the payment provider.');
  }

  const parsedExpiry = payload.expiryDate ? Date.parse(payload.expiryDate) : NaN;
  const expiresAtMs = Number.isFinite(parsedExpiry) ? parsedExpiry : Date.now() + 4 * 60 * 1000;

  cachedToken = {
    value: payload.token,
    expiresAtMs
  };
  return payload.token;
};

const getToken = async (): Promise<string> => {
  if (cachedToken && cachedToken.expiresAtMs - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
    return cachedToken.value;
  }

  if (!inFlightTokenRequest) {
    inFlightTokenRequest = requestNewToken().finally(() => {
      inFlightTokenRequest = null;
    });
  }

  return inFlightTokenRequest;
};

const pesapalRequest = async <T>(
  path: string,
  init?: RequestInit,
  retryOnUnauthorized = true
): Promise<T> => {
  const token = await getToken();
  const response = await fetch(`${config.pesapal.baseUrl}${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });
  console.log('pesapalRequest====>', response);
  if (response.status === 401 && retryOnUnauthorized) {
    clearTokenCache();
    return pesapalRequest<T>(path, init, false);
  }

  const payload = (await response.json().catch(() => undefined)) as T | undefined;
  const errorDetail = hasPesapalError(payload);
  console.log('pesapalRequest====>', payload);

  if (!response.ok || !payload || errorDetail) {
    logger.error(
      `Pesapal API request failed (path=${path}, status=${response.status}, detail=${errorDetail ?? 'unknown'})`
    );
    throw new AppError(502, 'Pesapal could not process the payment request.');
  }

  return payload;
};

const registerIpn = (
  url: string,
  ipnNotificationType: 'GET' | 'POST' = 'GET'
): Promise<PesapalIpnRegistration> =>
  pesapalRequest<PesapalIpnRegistration>('/api/URLSetup/RegisterIPN', {
    method: 'POST',
    body: JSON.stringify({
      url,
      ipn_notification_type: ipnNotificationType
    })
  });

const getIpnList = (): Promise<PesapalIpnRegistration[]> =>
  pesapalRequest<PesapalIpnRegistration[]>('/api/URLSetup/GetIpnList', {
    method: 'GET'
  });

const submitOrder = (payload: PesapalSubmitOrderRequest): Promise<PesapalSubmitOrderResponse> =>
  pesapalRequest<PesapalSubmitOrderResponse>('/api/Transactions/SubmitOrderRequest', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

const getTransactionStatus = (orderTrackingId: string): Promise<PesapalTransactionStatusResponse> =>
  pesapalRequest<PesapalTransactionStatusResponse>(
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    { method: 'GET' }
  );

const cancelOrder = (orderTrackingId: string): Promise<PesapalCancelOrderResponse> =>
  pesapalRequest<PesapalCancelOrderResponse>('/api/Transactions/CancelOrder', {
    method: 'POST',
    body: JSON.stringify({ order_tracking_id: orderTrackingId })
  });

const refundRequest = (payload: PesapalRefundRequest): Promise<PesapalRefundResponse> =>
  pesapalRequest<PesapalRefundResponse>('/api/Transactions/RefundRequest', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const PesapalClient = {
  clearTokenCache,
  getToken,
  registerIpn,
  getIpnList,
  submitOrder,
  getTransactionStatus,
  cancelOrder,
  refundRequest
};
