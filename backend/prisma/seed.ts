import { PrismaClient } from '@prisma/client';
import { ALERTAS_SEED, PLANTA_SEED } from './seed-data';

const prisma = new PrismaClient();

async function main() {
  const { id, nome, turnoAtual, simHour, simMinute, setores } = PLANTA_SEED;

  await prisma.planta.upsert({
    where: { id },
    create: { id, nome, turnoAtual, simHour, simMinute },
    update: { nome, turnoAtual, simHour, simMinute },
  });

  for (const setor of setores) {
    const { maquinas, op, manutencao, ordem, ...setorData } = setor;

    await prisma.setor.upsert({
      where: { id: setor.id },
      create: {
        id: setor.id,
        plantaId: id,
        name: setorData.name,
        type: setorData.type,
        status: setorData.status,
        description: setorData.description,
        layout2d: setorData.layout2d,
        layout3d: setorData.layout3d,
        kpis: setorData.kpis,
        op: op ?? undefined,
        manutencao: manutencao ?? undefined,
        ordem,
      },
      update: {
        name: setorData.name,
        type: setorData.type,
        status: setorData.status,
        description: setorData.description,
        layout2d: setorData.layout2d,
        layout3d: setorData.layout3d,
        kpis: setorData.kpis,
        op: op ?? undefined,
        manutencao: manutencao ?? undefined,
        ordem,
      },
    });

    for (const m of maquinas) {
      await prisma.maquina.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          setorId: setor.id,
          name: m.name,
          status: m.status,
          kpis: m.kpis,
          limits: m.limits,
          opAtiva: m.opAtiva,
          oeeHistory: m.oeeHistory,
        },
        update: {
          name: m.name,
          status: m.status,
          kpis: m.kpis,
          limits: m.limits,
          opAtiva: m.opAtiva,
          oeeHistory: m.oeeHistory,
        },
      });
    }
  }

  for (const alerta of ALERTAS_SEED) {
    const existing = await prisma.alerta.findFirst({
      where: { plantaId: id, msg: alerta.msg },
    });
    if (!existing) {
      await prisma.alerta.create({
        data: {
          plantaId: id,
          sectorId: alerta.sectorId,
          machineId: alerta.machineId,
          severidade: alerta.severidade,
          msg: alerta.msg,
        },
      });
    }
  }

  console.log(`Seed concluído: Planta ${id} com ${setores.length} setores`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
