import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5500,http://127.0.0.1:5173'),
  TELEMETRY_INTERVAL_MS: z.coerce.number().default(4000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export function getCorsOrigins(corsOrigin: string): string[] {
  return corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
}
