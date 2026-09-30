import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/branchpruner?schema=public'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('branchpruner_super_secret_jwt_access_token_key_32_chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').default('branchpruner_super_secret_jwt_refresh_token_key_32_chars'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters').default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  GIT_PROVIDER_MODE: z.enum(['mock', 'live']).default('mock'),
  SLACK_MODE: z.enum(['mock', 'live']).default('mock'),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  GITHUB_CALLBACK_URL: z.string().default('http://localhost:3001/api/auth/github/callback'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3001/api/auth/google/callback'),
  GITHUB_WEBHOOK_SECRET: z.string().default('branchpruner_github_webhook_secret_key'),
  GITLAB_API_URL: z.string().default('https://gitlab.com/api/v4'),
  GITLAB_TOKEN: z.string().optional().default(''),
  SLACK_BOT_TOKEN: z.string().optional().default(''),
  SLACK_DEFAULT_CHANNEL: z.string().default('#git-hygiene'),
  // Email configuration
  EMAIL_PROVIDER: z.enum(['mailpit', 'smtp', 'resend', 'sendgrid', 'console']).default('mailpit'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  EMAIL_FROM: z.string().default('BranchPruner <no-reply@branchpruner.io>'),
  RESEND_API_KEY: z.string().optional().default(''),
  SENDGRID_API_KEY: z.string().optional().default(''),
  APP_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:3001'),
  CSRF_SECRET: z.string().min(16).default('branchpruner_super_secret_csrf_secret_key_32_chars')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
