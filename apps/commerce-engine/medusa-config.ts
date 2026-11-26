import { defineConfig } from '@medusajs/framework/utils';
import { ZIRO_PLATFORM_FEE_BPS } from '@ziro/shared-types';

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? 'postgresql://ziro:ziro@localhost:5432/ziro',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    http: {
      storeCors: process.env.STORE_CORS ?? 'http://localhost:3000,http://localhost:3001',
      adminCors: process.env.ADMIN_CORS ?? 'http://localhost:7001,http://localhost:9000',
      authCors: process.env.AUTH_CORS ?? 'http://localhost:3000,http://localhost:9000',
      jwtSecret: process.env.JWT_SECRET ?? 'ziro-dev-jwt-secret',
      cookieSecret: process.env.COOKIE_SECRET ?? 'ziro-dev-cookie-secret',
    },
  },
  modules: [
    {
      resolve: '@medusajs/medusa/payment',
      options: {
        providers: [
          {
            resolve: '@ziro/rails/providers',
            id: 'ziro-razorpay',
            options: {
              key_id: process.env.RAZORPAY_KEY_ID ?? 'rzp_test_sandbox',
              key_secret: process.env.RAZORPAY_KEY_SECRET ?? 'rzp_test_secret',
              webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
              platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
            },
          },
          {
            resolve: '@ziro/rails/providers',
            id: 'ziro-stripe',
            options: {
              api_key: process.env.STRIPE_API_KEY ?? 'sk_test_sandbox',
              webhook_secret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
              platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
            },
          },
          {
            resolve: '@ziro/rails/providers',
            id: 'ziro-net30',
            options: {
              platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
            },
          },
        ],
      },
    },
    {
      resolve: '@medusajs/medusa/tax',
      options: {
        providers: [
          {
            resolve: '@ziro/rails/tax',
            id: 'ziro-tax',
            options: {
              defaultOriginStateCode: process.env.ORIGIN_STATE_CODE ?? '27',
            },
          },
        ],
      },
    },
  ],
});
