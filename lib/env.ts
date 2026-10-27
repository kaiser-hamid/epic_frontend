import { z } from "zod"

const serverEnvSchema = z.object({
  API_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
  SESSION_COOKIE: z.string().min(1).default("epic-erp-session"),
})

/** Server-only configuration (next.config.ts, proxy.ts). Never import from client code. */
export const serverEnv = serverEnvSchema.parse({
  API_URL: process.env.API_URL,
  SESSION_COOKIE: process.env.SESSION_COOKIE,
})
