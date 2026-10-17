# Paystack production cutover

Complete these steps in order when promoting this change.

1. Rotate the Paystack test secret that was exposed outside the deployment configuration. Store fresh test and live `PAYSTACK_SECRET_KEY` values only in the deployment secret manager; never commit them.
2. In Paystack, enable Kenyan card and M-PESA channels and configure the public webhook URL as `https://<api-host>/api/v1/payments/webhook`. Configure the appropriate test and live callback URLs as well.
3. Reconcile open Stripe checkouts. Cancel every outstanding Stripe Checkout session and release its booking hold before this release. Historic Stripe payment rows stay in the database for reporting.
4. Back up production, deploy the database migration, then deploy the backend and frontend. Run `npm run prisma:deploy` from the backend release environment.
5. Add `PAYSTACK_SECRET_KEY` and `PAYMENT_CURRENCY=kes` to the backend deployment environment. Remove Stripe keys and the Stripe webhook endpoint only after reconciliation.
6. In Paystack test mode, exercise card payment, M-PESA payment, checkout cancellation, expiration, extension payment, duplicate webhooks, and the late-payment review/refund path. Confirm webhooks return HTTP 200 promptly.

The browser callback is deliberately informational. A booking is confirmed only after the signed Paystack webhook is independently verified against the Paystack transaction API.
