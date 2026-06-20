import type { FastifyInstance } from 'fastify';
import { listAlertas } from '../services/alerta.service.js';

export async function alertasRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { plantaId?: string } }>('/alertas', async (req, reply) => {
    const plantaId = req.query.plantaId ?? 'alpha-1';
    const alertas = await listAlertas(plantaId);
    if (!alertas) return reply.status(404).send({ error: 'Planta não encontrada' });
    return alertas;
  });
}
