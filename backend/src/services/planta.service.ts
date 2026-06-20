import type { Maquina, Setor } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type {
  AlertaFront,
  MaquinaDto,
  ManutencaoDto,
  OpDto,
  PlantaResponse,
  SetorDto,
  StatusAtivo,
} from '@sgm/shared';

function mapMaquina(m: Maquina): MaquinaDto {
  return {
    id: m.id,
    name: m.name,
    status: m.status,
    kpis: m.kpis as unknown as MaquinaDto['kpis'],
    limits: m.limits as unknown as MaquinaDto['limits'],
    opAtiva: m.opAtiva,
    oeeHistory: m.oeeHistory as unknown as number[],
  };
}

function mapSetor(s: Setor & { maquinas: Maquina[] }): SetorDto {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    status: s.status,
    description: s.description,
    kpis: s.kpis as unknown as Record<string, unknown>,
    layout2d: s.layout2d as unknown as SetorDto['layout2d'],
    layout3d: s.layout3d as unknown as SetorDto['layout3d'],
    maquinas: s.maquinas.map(mapMaquina),
    ...(s.op ? { op: s.op as unknown as OpDto } : {}),
    ...(s.manutencao ? { manutencao: s.manutencao as unknown as ManutencaoDto } : {}),
  };
}

export function getSectorStatusFromMachines(statuses: string[]): StatusAtivo {
  if (statuses.includes('alerta')) return 'alerta';
  if (statuses.every((s) => s === 'offline')) return 'offline';
  if (statuses.includes('manutencao')) return 'manutencao';
  return 'operando';
}

export function formatSimTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export async function getPlantaById(id: string): Promise<PlantaResponse | null> {
  const planta = await prisma.planta.findUnique({
    where: { id },
    include: {
      setores: {
        orderBy: { ordem: 'asc' },
        include: { maquinas: true },
      },
    },
  });

  if (!planta) return null;

  return {
    id: planta.id,
    nome: planta.nome,
    turnoAtual: planta.turnoAtual as 1 | 2 | 3,
    simTime: { hour: planta.simHour, minute: planta.simMinute },
    setores: planta.setores.map(mapSetor),
  };
}

export async function getDashboard(plantaId: string) {
  const planta = await getPlantaById(plantaId);
  if (!planta) return null;

  const oees = planta.setores
    .map((s) => s.kpis.oee)
    .filter((o): o is number => typeof o === 'number');
  const globalOee = oees.length
    ? Math.round((oees.reduce((a, b) => a + b, 0) / oees.length) * 10) / 10
    : 0;

  let alertCount = 0;
  planta.setores.forEach((s) => s.maquinas.forEach((m) => { if (m.status === 'alerta') alertCount++; }));

  const operando = planta.setores.filter((s) => {
    const st = s.status === 'manutencao' ? 'manutencao' : getSectorStatusFromMachines(s.maquinas.map((m) => m.status));
    return st === 'operando';
  }).length;

  const criticos = [...planta.setores]
    .filter((s) => typeof s.kpis.oee === 'number')
    .sort((a, b) => (a.kpis.oee as number) - (b.kpis.oee as number))
    .slice(0, 3)
    .map((s) => ({ name: s.name, oee: s.kpis.oee }));

  const alertasDb = await prisma.alerta.count({
    where: { plantaId, resolvido: false, severidade: { not: 'info' } },
  });

  const eventos = await prisma.eventoLog.findMany({
    where: { plantaId },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  const ocorrencias = await prisma.ocorrencia.findMany({
    where: { plantaId },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  const timeline = [
    ...eventos.map((e) => ({
      type: e.type,
      text: e.text,
      time: formatSimTime(e.createdAt.getHours(), e.createdAt.getMinutes()),
    })),
    ...ocorrencias.map((o) => ({
      type: 'ocorrencia',
      text: o.descricao,
      time: formatSimTime(o.createdAt.getHours(), o.createdAt.getMinutes()),
    })),
  ].slice(0, 15);

  const turnoData = [
    78 + planta.turnoAtual * 3,
    82 + planta.turnoAtual * 2,
    85 + planta.turnoAtual,
    88,
  ];

  return {
    oeeGlobal: globalOee,
    alertasAbertos: alertasDb,
    setoresOperando: `${operando}/${planta.setores.length}`,
    maquinasAlerta: alertCount,
    criticos,
    timeline,
    turnoData,
  };
}

export async function getMaquinaAnalytics(machineId: string) {
  const maquina = await prisma.maquina.findUnique({
    where: { id: machineId },
    include: { setor: true },
  });
  if (!maquina) return null;

  const kpis = maquina.kpis as { oee: number };
  const oee = kpis.oee ?? 85;
  const d = Math.round(oee * 0.96);
  const p = Math.min(99, Math.round(oee * 1.02));
  const q = Math.round(oee * 0.98);

  return {
    oeeBreakdown: [
      { label: 'Disponib.', value: d },
      { label: 'Perform.', value: p },
      { label: 'Qualidade', value: q },
    ],
    paretoCauses: [
      { cause: 'Troca de bico', pct: 28 },
      { cause: 'Falta material', pct: 22 },
      { cause: 'Ajuste qualidade', pct: 18 },
      { cause: 'Calibração', pct: 14 },
      { cause: 'Outros', pct: 10 },
    ],
    maintHistory: ['12/06 — Preventiva bicos', '05/06 — Calibração visão', '28/05 — Troca filtros'],
    machine: { id: maquina.id, name: maquina.name, sectorId: maquina.setorId },
  };
}

export function mapAlertaToFront(a: {
  id: string;
  severidade: string;
  msg: string;
  sectorId: string | null;
  machineId: string | null;
  createdAt: Date;
}, simHour: number, simMinute: number): AlertaFront {
  return {
    id: a.id,
    severidade: a.severidade,
    msg: a.msg,
    sectorId: a.sectorId,
    machineId: a.machineId,
    ts: a.createdAt.getTime(),
    time: formatSimTime(simHour, simMinute),
  };
}
