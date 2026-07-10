import 'dotenv/config';
import type { SignOptions } from 'jsonwebtoken';

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;

if (nodeEnv === 'production' && !jwtAccessSecret) {
  throw new Error('JWT_ACCESS_SECRET must be set in production.');
}

const config = {
  nodeEnv,
  port: parseNumber(process.env.PORT, 5000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  bcryptSaltRounds: parseNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  rateLimit: {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.RATE_LIMIT_MAX, 100)
  },
  jwt: {
    accessSecret: jwtAccessSecret ?? 'development-only-secret',
    accessExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '1d') as SignOptions['expiresIn'],
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret',
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as SignOptions['expiresIn'],
    resetSecret: process.env.JWT_RESET_SECRET ?? 'development-reset-secret',
    resetExpiresIn: (process.env.JWT_RESET_EXPIRES_IN ?? '15m') as SignOptions['expiresIn']
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@example.com',
    password: process.env.ADMIN_PASSWORD ?? 'admin123'
  },
  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.ethereal.email',
    port: parseNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'noreply@example.com'
  }
};

export default config;
