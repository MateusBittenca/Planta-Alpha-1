import type { FastifyInstance } from 'fastify';
import { getDashboard, getMaquinaAnalytics, getPlantaById } from '../services/planta.service.js';

export async function plantasRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/plantas/:id', async (req, reply) => {
    const planta = await getPlantaById(req.params.id);
    if (!planta) return reply.status(404).send({ error: 'Planta não encontrada' });
    return planta;
  });

  app.get<{ Params: { id: string } }>('/plantas/:id/dashboard', async (req, reply) => {
    const dashboard = await getDashboard(req.params.id);
    if (!dashboard) return reply.status(404).send({ error: 'Planta não encontrada' });
    return dashboard;
  });

  app.get<{ Params: { id: string } }>('/maquinas/:id/analytics', async (req, reply) => {
    const analytics = await getMaquinaAnalytics(req.params.id);
    if (!analytics) return reply.status(404).send({ error: 'Máquina não encontrada' });
    return analytics;
  });
}
