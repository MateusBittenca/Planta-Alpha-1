import { prisma } from '../lib/prisma.js';
import { mapAlertaToFront } from './planta.service.js';

export async function listAlertas(plantaId: string) {
  const planta = await prisma.planta.findUnique({ where: { id: plantaId } });
  if (!planta) return null;

  const alertas = await prisma.alerta.findMany({
    where: { plantaId, resolvido: false },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return alertas.map((a) =>
    mapAlertaToFront(a, planta.simHour, planta.simMinute)
  );
}

export async function createAlerta(
  plantaId: string,
  severidade: string,
  msg: string,
  sectorId: string | null,
  machineId: string | null
) {
  const recent = await prisma.alerta.findFirst({
    where: {
      plantaId,
      msg,
      createdAt: { gte: new Date(Date.now() - 60000) },
    },
  });
  if (recent) return recent;

  const alerta = await prisma.alerta.create({
    data: { plantaId, severidade, msg, sectorId, machineId },
  });

  await prisma.eventoLog.create({
    data: { plantaId, type: 'alerta', text: msg },
  });

  const planta = await prisma.planta.findUnique({ where: { id: plantaId } });
  return mapAlertaToFront(
    alerta,
    planta?.simHour ?? 0,
    planta?.simMinute ?? 0
  );
}

export async function resolveAlerta(id: string) {
  return prisma.alerta.update({
    where: { id },
    data: { resolvido: true },
  });
}
