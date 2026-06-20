import type { WebSocket } from 'ws';
import type { WsMessage } from '@sgm/shared';

const clientsByPlanta = new Map<string, Set<WebSocket>>();

export function registerClient(plantaId: string, socket: WebSocket) {
  if (!clientsByPlanta.has(plantaId)) {
    clientsByPlanta.set(plantaId, new Set());
  }
  clientsByPlanta.get(plantaId)!.add(socket);

  socket.on('close', () => {
    clientsByPlanta.get(plantaId)?.delete(socket);
  });
}

export function broadcast(plantaId: string, message: WsMessage) {
  const clients = clientsByPlanta.get(plantaId);
  if (!clients) return;

  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

export function registerTelemetryGateway(app: import('fastify').FastifyInstance) {
  app.get('/ws/telemetry', { websocket: true }, (socket, req) => {
    const query = req.query as { plantaId?: string };
    const plantaId = query.plantaId ?? 'alpha-1';
    registerClient(plantaId, socket);
    socket.send(JSON.stringify({ type: 'connected', plantaId }));
  });
}
