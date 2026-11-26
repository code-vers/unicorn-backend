# Pesapal production cutover

Complete these steps in order when promoting this change.

1. Store live `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET` in the deployment secret manager; never commit them. Set `PESAPAL_ENV=live`, `PAYMENT_CURRENCY=KES`, and `BACKEND_PUBLIC_URL=https://<api-host>`.
2. Generate a random `PESAPAL_IPN_TOKEN` (32+ chars) and set it in the backend environment.
3. Run `npm run prisma:deploy` from the backend release environment to apply the Pesapal migration (this also removes legacy Stripe/Paystack payment records as requested).
4. Register the production IPN URL with Pesapal by running `npm run pesapal:register-ipn` and store the returned `PESAPAL_IPN_ID` in the backend environment.
5. Deploy the backend and frontend.
6. Exercise M-PESA payment, card payment, checkout cancellation, expiration, extension payment, duplicate IPNs, and the late-payment review/refund path. Confirm `GET /api/v1/payments/pesapal/ipn` returns HTTP 200 with Pesapal's JSON acknowledgement.

The browser callback is informational only. A booking is confirmed only after the backend verifies the transaction via Pesapal's `GetTransactionStatus` API.
