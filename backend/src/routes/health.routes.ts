import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'connected' };
    } catch {
      return { status: 'degraded', db: 'disconnected' };
    }
  });
}
