import { vercel } from "@t3-oss/env-core/presets-zod";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  extends: [vercel()],
  server: {
    // Database
    POSTGRES_URL: z.string().url().min(1),
    
    // Supabase
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // OpenAI (optional - required only for OpenAI nodes)
    OPENAI_API_KEY: z.string().startsWith("sk-").optional().or(z.literal("")),

    // Resend (optional - required only for Email nodes)
    RESEND_TOKEN: z.string().startsWith("re_").optional().or(z.literal("")),
    RESEND_EMAIL: z.string().email().optional().or(z.literal("")),

    // Google OAuth (for Gmail and Google Sheets nodes)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    
    // Google Service Account (optional fallback for Google Sheets)
    GOOGLE_SHEETS_CREDENTIALS: z.string().optional(),

    // Credentials encryption key (32 bytes hex for AES-256)
    CREDENTIALS_ENCRYPTION_KEY: z.string().length(64).optional(),

    // Rate limiting (optional)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  },
  client: {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

    // Analytics (optional)
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },
  runtimeEnv: {
    POSTGRES_URL: process.env.POSTGRES_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RESEND_TOKEN: process.env.RESEND_TOKEN,
    RESEND_EMAIL: process.env.RESEND_EMAIL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_SHEETS_CREDENTIALS: process.env.GOOGLE_SHEETS_CREDENTIALS,
    CREDENTIALS_ENCRYPTION_KEY: process.env.CREDENTIALS_ENCRYPTION_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  // Skip validation during build (CI) when env vars aren't available
  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
});


