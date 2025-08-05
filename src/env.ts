import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    GEMINI_API_KEY: z.string().nonempty(),
    ARCJET_KEY: z.string().nonempty(),
    CLERK_SECRET_KEY: z.string().nonempty(),
    DATABASE_URL: z.string().nonempty(),
  },

  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().nonempty(),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().nonempty(),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().nonempty(),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().nonempty(),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().nonempty(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().nonempty(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().nonempty(),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
});
