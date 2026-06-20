import 'dotenv/config';
import { loadEnv } from './config/env.js';
import { buildApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { startTelemetrySimulator, stopTelemetrySimulator } from './workers/telemetry-simulator.js';

const env = loadEnv();

async function main() {
  const app = await buildApp(env);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    startTelemetrySimulator('alpha-1', env.TELEMETRY_INTERVAL_MS);
    console.log(`SGM Industrial API rodando em http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    stopTelemetrySimulator();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
