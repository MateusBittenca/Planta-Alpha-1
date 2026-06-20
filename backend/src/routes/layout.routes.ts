import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPlantaById } from '../services/planta.service.js';
import {
  LayoutError,
  createMaquina,
  createSetor,
  deleteMaquina,
  deleteSetor,
  updateMaquina,
  updateMaquinaPosition,
  updateSetor,
  updateSetorLayout,
} from '../services/layout.service.js';
import { requireRole } from '../middleware/rbac.js';

const layout2dSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().min(40),
  h: z.number().min(40),
});

const createSetorSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1),
  type: z.enum(['produção', 'logística', 'qualidade']),
  description: z.string().optional(),
  layout2d: layout2dSchema,
});

const updateSetorSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['produção', 'logística', 'qualidade']).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
});

const updateSetorLayoutSchema = z.object({
  layout2d: layout2dSchema,
});

const createMaquinaSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1),
  posicao2d: z.object({ cx: z.number(), cy: z.number() }).optional(),
  limits: z.object({ tempMax: z.number() }).optional(),
});

const updateMaquinaSchema = z.object({
  name: z.string().min(1).optional(),
  limits: z.object({ tempMax: z.number() }).optional(),
});

const updateMaquinaPositionSchema = z.object({
  posicao2d: z.object({ cx: z.number(), cy: z.number() }),
});

function handleLayoutError(reply: import('fastify').FastifyReply, err: unknown) {
  if (err instanceof LayoutError) {
    return reply.status(err.statusCode).send({ error: err.message });
  }
  if (err instanceof z.ZodError) {
    return reply.status(400).send({ error: err.errors.map((e) => e.message).join('; ') });
  }
  throw err;
}

export async function layoutRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/plantas/:id/layout', async (req, reply) => {
    const planta = await getPlantaById(req.params.id);
    if (!planta) return reply.status(404).send({ error: 'Planta não encontrada' });
    return planta;
  });

  app.post<{ Params: { plantaId: string } }>(
    '/plantas/:plantaId/setores',
    { preHandler: requireRole('editor') },
    async (req, reply) => {
      try {
        const body = createSetorSchema.parse(req.body);
        const setor = await createSetor(req.params.plantaId, body);
        return reply.status(201).send(setor);
      } catch (err) {
        return handleLayoutError(reply, err);
      }
    }
  );

  app.patch<{ Params: { id: string } }>(
    '/setores/:id',
    { preHandler: requireRole('editor') },
    async (req, reply) => {
      try {
        const body = updateSetorSchema.parse(req.body);
        return await updateSetor(req.params.id, body);
      } catch (err) {
        return handleLayoutError(reply, err);
      }
    }
  );

  app.patch<{ Params: { id: string } }>(
    '/setores/:id/layout',
    { preHandler: requireRole('editor') },
    async (req, reply) => {
      try {
        const body = updateSetorLayoutSchema.parse(req.body);
        return await updateSetorLayout(req.params.id, body);
      } catch (err) {
        return handleLayoutError(reply, err);
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/setores/:id',
    { preHandler: requireRole('editor') },
    async (req, reply) => {
      try {
        await deleteSetor(req.params.id);
        return reply.status(204).send();
      } catch (err) {
        return handleLayoutError(reply, err);
      }
    }
  );

  app.post<{ Params: { setorId: string } }>(
    '/setores/:setorId/maquinas',
    { preHandler: requireRole('editor') },
    async (req, reply) => {
      try {
        const body = createMaquinaSchema.parse(req.body);
        const maquina = await createMaquina(req.params.setorId, body);
        return reply.status(201).send(maquina);
      } catch (err) {
        return handleLayoutError(reply, err);
      }
    }
  );

  app.patch<{ Params: { id: string } }>(
    '/maquinas/:id',
    { preHandler: requireRole('editor') },
    async (req, reply) => {
      try {
        const body = updateMaquinaSchema.parse(req.body);
        return await updateMaquina(req.params.id, body);
      } catch (err) {
        return handleLayoutError(reply, err);
      }
    }
  );

  app.patch<{ Params: { id: string } }>(
    '/maquinas/:id/position',
    { preHandler: requireRole('editor') },
    async (req, reply) => {
      try {
        const body = updateMaquinaPositionSchema.parse(req.body);
        return await updateMaquinaPosition(req.params.id, body);
      } catch (err) {
        return handleLayoutError(reply, err);
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/maquinas/:id',
    { preHandler: requireRole('editor') },
    async (req, reply) => {
      try {
        await deleteMaquina(req.params.id);
        return reply.status(204).send();
      } catch (err) {
        return handleLayoutError(reply, err);
      }
    }
  );
}
