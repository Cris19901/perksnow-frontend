import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  env: optionalEnv('NODE_ENV', 'development'),
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  apiUrl: optionalEnv('API_URL', 'http://localhost:3001'),

  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    anonKey: optionalEnv('SUPABASE_ANON_KEY', ''),
  },

  paystack: {
    secretKey: requireEnv('PAYSTACK_SECRET_KEY'),
    publicKey: optionalEnv('PAYSTACK_PUBLIC_KEY', ''),
    webhookSecret: requireEnv('PAYSTACK_WEBHOOK_SECRET'),
  },

  flutterwave: {
    secretKey: optionalEnv('FLUTTERWAVE_SECRET_KEY', ''),
    publicKey: optionalEnv('FLUTTERWAVE_PUBLIC_KEY', ''),
    encryptionKey: optionalEnv('FLUTTERWAVE_ENCRYPTION_KEY', ''),
    webhookSecret: optionalEnv('FLUTTERWAVE_WEBHOOK_SECRET', ''),
  },

  r2: {
    accountId: optionalEnv('R2_ACCOUNT_ID', ''),
    accessKeyId: optionalEnv('R2_ACCESS_KEY_ID', ''),
    secretAccessKey: optionalEnv('R2_SECRET_ACCESS_KEY', ''),
    bucketName: optionalEnv('R2_BUCKET_NAME', 'lavlay-uploads'),
    publicUrl: optionalEnv('R2_PUBLIC_URL', ''),
  },

  jwt: {
    secret: optionalEnv('JWT_SECRET', 'change-me-in-production'),
  },

  withdrawal: {
    minAmount: parseFloat(optionalEnv('MIN_WITHDRAWAL_AMOUNT', '1000')),
  },

  platformFeePercentage: parseFloat(optionalEnv('PLATFORM_FEE_PERCENTAGE', '15')),
  pointsToMoneyRate: parseInt(optionalEnv('POINTS_TO_MONEY_RATE', '100'), 10),

  frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  logLevel: optionalEnv('LOG_LEVEL', 'info'),

  isProduction: optionalEnv('NODE_ENV', 'development') === 'production',
};

export default config;
