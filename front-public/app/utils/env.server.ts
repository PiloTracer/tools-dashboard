import { z } from "zod";

const envSchema = z.object({
  BACK_AUTH_BASE_URL: z.string().url(),
});

type EnvConfig = {
  backAuthBaseUrl: string;
};

let cachedEnv: EnvConfig | null = null;

export function getBackAuthEnv(): EnvConfig {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse({
    BACK_AUTH_BASE_URL: process.env.BACK_AUTH_BASE_URL,
  });

  if (!parsed.success) {
    const formatted = parsed.error.format();
    throw new Error(`Missing or invalid BACK_AUTH_BASE_URL environment variable: ${JSON.stringify(formatted)}`);
  }

  const normalizedBaseUrl = parsed.data.BACK_AUTH_BASE_URL.replace(/\/+$/, "");

  cachedEnv = {
    backAuthBaseUrl: normalizedBaseUrl,
  };

  return cachedEnv;
}
