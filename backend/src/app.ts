import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { getCorsOrigins, type Env } from './config/env.js';
import { healthRoutes } from './routes/health.routes.js';
import { plantasRoutes } from './routes/plantas.routes.js';
import { alertasRoutes } from './routes/alertas.routes.js';
import { ocorrenciasRoutes } from './routes/ocorrencias.routes.js';
import { registerTelemetryGateway } from './ws/telemetry.gateway.js';

export async function buildApp(env: Env) {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: getCorsOrigins(env.CORS_ORIGIN),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(websocket);

  await app.register(async (api) => {
    await api.register(healthRoutes);
    await api.register(plantasRoutes);
    await api.register(alertasRoutes);
    await api.register(ocorrenciasRoutes);
  }, { prefix: '/api' });

  registerTelemetryGateway(app);

  return app;
}
