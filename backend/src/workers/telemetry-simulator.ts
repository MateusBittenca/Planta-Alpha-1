import { prisma } from '../lib/prisma.js';
import { broadcast } from '../ws/telemetry.gateway.js';
import { createAlerta } from '../services/alerta.service.js';
import { formatSimTime } from '../services/planta.service.js';
import type { MaquinaKpis } from '@sgm/shared';

function seedHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function calcTurno(hour: number): 1 | 2 | 3 {
  if (hour >= 6 && hour < 14) return 1;
  if (hour >= 14 && hour < 22) return 2;
  return 3;
}

let simTick = 0;
let telemetryTimer: ReturnType<typeof setInterval> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;

export function startTelemetrySimulator(plantaId: string, intervalMs: number) {
  if (telemetryTimer) return;

  telemetryTimer = setInterval(() => {
    void runTelemetryTick(plantaId);
  }, intervalMs);

  clockTimer = setInterval(() => {
    void runClockTick(plantaId);
  }, intervalMs);
}

export function stopTelemetrySimulator() {
  if (telemetryTimer) clearInterval(telemetryTimer);
  if (clockTimer) clearInterval(clockTimer);
  telemetryTimer = null;
  clockTimer = null;
}

async function runTelemetryTick(plantaId: string) {
  simTick++;

  const setores = await prisma.setor.findMany({
    where: { plantaId },
    include: { maquinas: true },
  });

  const planta = await prisma.planta.findUnique({ where: { id: plantaId } });
  if (!planta) return;

  for (const setor of setores) {
    for (const maquina of setor.maquinas) {
      if (maquina.status === 'offline' || maquina.status === 'manutencao') continue;

      const kpis = maquina.kpis as unknown as MaquinaKpis;
      const limits = maquina.limits as unknown as { tempMax: number };
      const h = seedHash(maquina.id + simTick);

      kpis.oee = Math.min(99, Math.max(55, kpis.oee + ((h % 5) - 2)));
      kpis.temp = Math.min(65, Math.max(32, kpis.temp + ((h % 3) - 1)));
      kpis.rpm = Math.max(800, kpis.rpm + ((h % 7) - 3));

      let oeeHistory = maquina.oeeHistory as number[];
      oeeHistory = [...oeeHistory, kpis.oee];
      if (oeeHistory.length > 12) oeeHistory = oeeHistory.slice(-12);

      let newStatus = maquina.status;
      if (kpis.temp > limits.tempMax && maquina.status === 'operando') {
        newStatus = 'alerta';
        const msg = `${maquina.id}: Temperatura ${kpis.temp}°C (limite ${limits.tempMax}°C)`;
        const alerta = await createAlerta(plantaId, 'critico', msg, setor.id, maquina.id);
        broadcast(plantaId, {
          type: 'alert',
          severidade: alerta.severidade,
          msg: alerta.msg,
          sectorId: setor.id,
          machineId: maquina.id,
          time: formatSimTime(planta.simHour, planta.simMinute),
        });
      }

      await prisma.maquina.update({
        where: { id: maquina.id },
        data: {
          kpis: kpis as unknown as import('@prisma/client').Prisma.InputJsonValue,
          oeeHistory: oeeHistory as unknown as import('@prisma/client').Prisma.InputJsonValue,
          status: newStatus,
        },
      });

      broadcast(plantaId, {
        type: 'telemetry',
        sectorId: setor.id,
        machineId: maquina.id,
        status: newStatus,
        kpis,
        oeeHistory,
      });
    }

    const op = setor.op as { planejada: number; produzida: number } | null;
    if (op && setor.status === 'operando') {
      const produzida = Math.min(op.planejada, op.produzida + 1 + (simTick % 3));
      const updatedOp = { ...op, produzida };
      await prisma.setor.update({
        where: { id: setor.id },
        data: { op: updatedOp },
      });
      broadcast(plantaId, {
        type: 'op_progress',
        sectorId: setor.id,
        produzida,
        planejada: op.planejada,
      });
    }

    const manutencao = setor.manutencao as { minRestantes: number; tecnico: string; checklist: string[] } | null;
    if (manutencao && manutencao.minRestantes > 0 && simTick % 2 === 0) {
      const minRestantes = manutencao.minRestantes - 1;
      const updatedManut = { ...manutencao, minRestantes };
      await prisma.setor.update({
        where: { id: setor.id },
        data: { manutencao: updatedManut },
      });
      broadcast(plantaId, {
        type: 'maintenance',
        sectorId: setor.id,
        minRestantes,
      });
    }
  }
}

async function runClockTick(plantaId: string) {
  const planta = await prisma.planta.findUnique({ where: { id: plantaId } });
  if (!planta) return;

  let minute = planta.simMinute + 15;
  let hour = planta.simHour;
  if (minute >= 60) {
    minute -= 60;
    hour++;
  }
  if (hour >= 24) hour = 0;

  const turnoAtual = calcTurno(hour);

  await prisma.planta.update({
    where: { id: plantaId },
    data: { simHour: hour, simMinute: minute, turnoAtual },
  });

  broadcast(plantaId, {
    type: 'clock',
    simTime: { hour, minute },
    turnoAtual,
  });
}
