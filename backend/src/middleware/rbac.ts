import type { FastifyReply, FastifyRequest } from 'fastify';

export type SgmRole = 'viewer' | 'editor' | 'admin';

const ROLE_LEVEL: Record<SgmRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

export function getRole(request: FastifyRequest): SgmRole {
  const raw = request.headers['x-sgm-role'];
  const role = (Array.isArray(raw) ? raw[0] : raw) as SgmRole | undefined;
  if (role && role in ROLE_LEVEL) return role;
  return 'editor';
}

export function requireRole(minRole: SgmRole) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const role = getRole(request);
    if (ROLE_LEVEL[role] < ROLE_LEVEL[minRole]) {
      return reply.status(403).send({ error: 'Permissão insuficiente para esta operação' });
    }
  };
}
