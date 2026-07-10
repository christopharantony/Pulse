import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  DATABASE_NAME: z.string().min(1, 'DATABASE_NAME is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRES: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES: z.string().default('30d'),
  REMEMBER_ME_REFRESH_EXPIRES: z.string().default('30d'),
  EMAIL_VERIFICATION_TOKEN_EXPIRES: z.string().default('24h'),
  PASSWORD_RESET_TOKEN_EXPIRES: z.string().default('1h'),
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  APP_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().min(1, 'EMAIL_FROM is required'),
});

export const serverEnv = serverEnvSchema.parse({
  MONGODB_URI: process.env.MONGODB_URI,
  DATABASE_NAME: process.env.DATABASE_NAME,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRES: process.env.ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES,
  REMEMBER_ME_REFRESH_EXPIRES: process.env.REMEMBER_ME_REFRESH_EXPIRES,
  EMAIL_VERIFICATION_TOKEN_EXPIRES: process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES,
  PASSWORD_RESET_TOKEN_EXPIRES: process.env.PASSWORD_RESET_TOKEN_EXPIRES,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
  APP_URL: process.env.APP_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
});
