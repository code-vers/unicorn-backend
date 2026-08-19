import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const parseOptionalNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;

if (nodeEnv === 'production') {
  const requiredVariables = [
    'DATABASE_URL',
    'CORS_ORIGIN',
    'FRONTEND_URL',
    'TRUST_PROXY',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_RESET_SECRET',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'TAX_PERCENTAGE',
    'MODIFICATION_FEE',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];
  const missingVariables = requiredVariables.filter((name) => !process.env[name]);
  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingVariables.join(', ')}`
    );
  }
  if (process.env.CORS_ORIGIN === '*') {
    throw new Error('CORS_ORIGIN must be explicit in production.');
  }
  const jwtSecrets = [
    process.env.JWT_ACCESS_SECRET!,
    process.env.JWT_REFRESH_SECRET!,
    process.env.JWT_RESET_SECRET!
  ];
  if (jwtSecrets.some((secret) => secret.length < 32)) {
    throw new Error('JWT secrets must each contain at least 32 characters in production.');
  }
  if (new Set(jwtSecrets).size !== jwtSecrets.length) {
    throw new Error('JWT access, refresh, and reset secrets must be different.');
  }
  for (const value of [process.env.FRONTEND_URL!, ...process.env.CORS_ORIGIN!.split(',')]) {
    try {
      new URL(value.trim());
    } catch {
      throw new Error(`Invalid production URL: ${value}`);
    }
  }
  const taxPercentage = parseOptionalNumber(process.env.TAX_PERCENTAGE);
  const modificationFee = parseOptionalNumber(process.env.MODIFICATION_FEE);
  if (taxPercentage === undefined || taxPercentage < 0 || taxPercentage > 100) {
    throw new Error('TAX_PERCENTAGE must be a number between 0 and 100.');
  }
  if (modificationFee === undefined || modificationFee < 0) {
    throw new Error('MODIFICATION_FEE must be a non-negative number.');
  }
}

const config = {
  nodeEnv,
  port: parseNumber(process.env.PORT, 5000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL ?? 'http://localhost:3000',
  trustProxy: process.env.TRUST_PROXY ? parseNumber(process.env.TRUST_PROXY, 1) : false,
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  bcryptSaltRounds: parseNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  jwt: {
    accessSecret: jwtAccessSecret ?? 'development-only-secret',
    accessExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '1d') as SignOptions['expiresIn'],
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret',
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as SignOptions['expiresIn'],
    resetSecret: process.env.JWT_RESET_SECRET ?? 'development-reset-secret',
    resetExpiresIn: (process.env.JWT_RESET_EXPIRES_IN ?? '15m') as SignOptions['expiresIn']
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? ''
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    currency: (process.env.PAYMENT_CURRENCY ?? 'kes').toLowerCase()
  },
  pricing: {
    taxPercentage: parseOptionalNumber(process.env.TAX_PERCENTAGE),
    modificationFee: parseOptionalNumber(process.env.MODIFICATION_FEE)
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000'
};

export default config;
