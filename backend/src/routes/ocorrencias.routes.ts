import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createOcorrencia, listOcorrencias, triggerAndon } from '../services/ocorrencia.service.js';
import { createAlerta } from '../services/alerta.service.js';

const ocorrenciaSchema = z.object({
  plantaId: z.string().default('alpha-1'),
  asset: z.string().min(1),
  type: z.string().min(1),
  descricao: z.string().min(1),
});

const andonSchema = z.object({
  plantaId: z.string().default('alpha-1'),
  sectorId: z.string().min(1),
  machineId: z.string().optional().nullable(),
  tipo: z.enum(['parada', 'qualidade', 'material', 'manutencao']),
});

export async function ocorrenciasRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { plantaId?: string; limit?: string } }>(
    '/ocorrencias',
    async (req) => {
      const plantaId = req.query.plantaId ?? 'alpha-1';
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 8;
      return listOcorrencias(plantaId, limit);
    }
  );

  app.post('/ocorrencias', async (req, reply) => {
    const parsed = ocorrenciaSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { plantaId, asset, type, descricao } = parsed.data;
    const result = await createOcorrencia(plantaId, asset, type, descricao);
    return reply.status(201).send(result);
  });

  app.post('/andon', async (req, reply) => {
    const parsed = andonSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { plantaId, sectorId, machineId, tipo } = parsed.data;
    const result = await triggerAndon(plantaId, sectorId, machineId, tipo);
    await createAlerta(plantaId, 'aviso', result.msg, sectorId, machineId ?? null);
    return reply.status(201).send(result);
  });
}
