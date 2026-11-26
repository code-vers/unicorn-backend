import config from '../app/config';
import { PesapalClient } from '../app/modules/payment/pesapal.client';

const run = async (): Promise<void> => {
  const baseUrl = config.pesapal.backendPublicUrl.replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('BACKEND_PUBLIC_URL is required to register the Pesapal IPN URL.');
  }
  if (!config.pesapal.ipnToken) {
    throw new Error('PESAPAL_IPN_TOKEN is required to register the Pesapal IPN URL.');
  }

  const ipnUrl = new URL('/api/v1/payments/pesapal/ipn', baseUrl);
  ipnUrl.searchParams.set('token', config.pesapal.ipnToken);

  const registration = await PesapalClient.registerIpn(ipnUrl.toString(), 'GET');

  // eslint-disable-next-line no-console
  console.log('Pesapal IPN registered successfully:');
  // eslint-disable-next-line no-console
  console.log(`PESAPAL_IPN_ID=${registration.ipn_id}`);
  // eslint-disable-next-line no-console
  console.log(`URL=${registration.url}`);
};

run().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to register Pesapal IPN:', error);
  process.exit(1);
});
