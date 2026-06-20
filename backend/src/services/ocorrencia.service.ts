import { prisma } from '../lib/prisma.js';
import { formatSimTime } from './planta.service.js';

export async function listOcorrencias(plantaId: string, limit = 8) {
  const rows = await prisma.ocorrencia.findMany({
    where: { plantaId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const planta = await prisma.planta.findUnique({ where: { id: plantaId } });
  const h = planta?.simHour ?? 0;
  const m = planta?.simMinute ?? 0;

  return rows.map((o) => ({
    id: o.id,
    asset: o.asset,
    type: o.type,
    desc: o.descricao,
    time: formatSimTime(h, m),
    ts: o.createdAt.getTime(),
  }));
}

export async function createOcorrencia(
  plantaId: string,
  asset: string,
  type: string,
  descricao: string
) {
  const ocorrencia = await prisma.ocorrencia.create({
    data: { plantaId, asset, type, descricao },
  });

  await prisma.eventoLog.create({
    data: {
      plantaId,
      type: 'ocorrencia',
      text: `${asset}: ${type} — ${descricao}`,
    },
  });

  const planta = await prisma.planta.findUnique({ where: { id: plantaId } });
  return {
    id: ocorrencia.id,
    asset: ocorrencia.asset,
    type: ocorrencia.type,
    desc: ocorrencia.descricao,
    time: formatSimTime(planta?.simHour ?? 0, planta?.simMinute ?? 0),
    ts: ocorrencia.createdAt.getTime(),
  };
}

export async function triggerAndon(
  plantaId: string,
  sectorId: string,
  machineId: string | null | undefined,
  tipo: string
) {
  const labels: Record<string, string> = {
    parada: 'Parada',
    qualidade: 'Qualidade',
    material: 'Material',
    manutencao: 'Manutenção',
  };
  const label = labels[tipo] ?? tipo;
  const target = machineId ?? sectorId;

  if (machineId) {
    const newStatus = tipo === 'manutencao' ? 'manutencao' : 'alerta';
    await prisma.maquina.update({
      where: { id: machineId },
      data: { status: newStatus },
    });
  }

  const msg = `Andon ${label}: ${target}`;
  await createOcorrencia(plantaId, target, tipo, `Andon acionado: ${label}`);

  return { target, tipo, label, msg };
}
