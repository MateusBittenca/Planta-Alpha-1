import { getPlantaById } from './planta.service.js';
import { prisma } from '../lib/prisma.js';
import type { Maquina, Planta, Setor } from '@prisma/client';
import type {
  CreateMaquinaBody,
  CreateSetorBody,
  Layout2D,
  MaquinaDto,
  PlantaResponse,
  Posicao2D,
  SaveLayoutBody,
  SetorDto,
  UpdateMaquinaBody,
  UpdateMaquinaPositionBody,
  UpdateSetorBody,
  UpdateSetorLayoutBody,
} from '@sgm/shared';
import {
  autoGridPosition,
  clampPositionInsideSetor,
  deriveLayout3D,
  isInsideSetor,
} from '@sgm/shared';

const MIN_SIZE = 40;

function mapMaquina(m: Maquina): MaquinaDto {
  return {
    id: m.id,
    name: m.name,
    status: m.status,
    kpis: m.kpis as unknown as MaquinaDto['kpis'],
    limits: m.limits as unknown as MaquinaDto['limits'],
    opAtiva: m.opAtiva,
    oeeHistory: m.oeeHistory as unknown as number[],
    ...(m.posicao2d
      ? { posicao2d: m.posicao2d as unknown as Posicao2D }
      : {}),
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
    layout2d: s.layout2d as unknown as Layout2D,
    layout3d: s.layout3d as unknown as SetorDto['layout3d'],
    maquinas: s.maquinas.map(mapMaquina),
    ...(s.op ? { op: s.op as unknown as SetorDto['op'] } : {}),
    ...(s.manutencao ? { manutencao: s.manutencao as unknown as SetorDto['manutencao'] } : {}),
  };
}

function validateLayout2d(layout2d: Layout2D): string | null {
  if (layout2d.w < MIN_SIZE || layout2d.h < MIN_SIZE) {
    return `Área mínima do setor: ${MIN_SIZE}×${MIN_SIZE}px`;
  }
  if (layout2d.x < 0 || layout2d.y < 0) {
    return 'Posição do setor não pode ser negativa';
  }
  return null;
}

async function getPlantaOrThrow(plantaId: string): Promise<Planta> {
  const planta = await prisma.planta.findUnique({ where: { id: plantaId } });
  if (!planta) throw new LayoutError('Planta não encontrada', 404);
  return planta;
}

export class LayoutError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
  }
}

function defaultKpis() {
  return { oee: 80, temp: 40, rpm: 1500 };
}

function defaultLimits(tempMax = 55) {
  return { tempMax };
}

export async function createSetor(plantaId: string, body: CreateSetorBody): Promise<SetorDto> {
  const planta = await getPlantaOrThrow(plantaId);
  const err = validateLayout2d(body.layout2d);
  if (err) throw new LayoutError(err, 422);

  const exists = await prisma.setor.findUnique({ where: { id: body.id } });
  if (exists) throw new LayoutError('ID de setor já existe', 409);

  const layout3d = deriveLayout3D(body.layout2d, planta.viewBox, planta.fatorEscala);
  const maxOrdem = await prisma.setor.aggregate({
    where: { plantaId },
    _max: { ordem: true },
  });

  const setor = await prisma.setor.create({
    data: {
      id: body.id,
      plantaId,
      name: body.name,
      type: body.type,
      status: 'operando',
      description: body.description ?? '',
      layout2d: body.layout2d as unknown as import('@prisma/client').Prisma.InputJsonValue,
      layout3d: layout3d as unknown as import('@prisma/client').Prisma.InputJsonValue,
      kpis: { headcount: 0, oee: null, status_operacional: 'Novo setor' },
      ordem: (maxOrdem._max.ordem ?? -1) + 1,
    },
    include: { maquinas: true },
  });

  return mapSetor(setor);
}

export async function updateSetor(id: string, body: UpdateSetorBody): Promise<SetorDto> {
  const setor = await prisma.setor.findUnique({ where: { id }, include: { maquinas: true } });
  if (!setor) throw new LayoutError('Setor não encontrado', 404);

  const updated = await prisma.setor.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
    include: { maquinas: true },
  });

  return mapSetor(updated);
}

export async function updateSetorLayout(id: string, body: UpdateSetorLayoutBody): Promise<SetorDto> {
  const setor = await prisma.setor.findUnique({
    where: { id },
    include: { planta: true, maquinas: true },
  });
  if (!setor) throw new LayoutError('Setor não encontrado', 404);

  const err = validateLayout2d(body.layout2d);
  if (err) throw new LayoutError(err, 422);

  const layout3d = deriveLayout3D(body.layout2d, setor.planta.viewBox, setor.planta.fatorEscala);

  const updated = await prisma.$transaction(async (tx) => {
    const sector = await tx.setor.update({
      where: { id },
      data: {
        layout2d: body.layout2d as unknown as import('@prisma/client').Prisma.InputJsonValue,
        layout3d: layout3d as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
      include: { maquinas: true },
    });

    for (const maquina of sector.maquinas) {
      if (!maquina.posicao2d) continue;
      const pos = maquina.posicao2d as unknown as Posicao2D;
      if (!isInsideSetor(body.layout2d, pos)) {
        const clamped = clampPositionInsideSetor(body.layout2d, pos);
        await tx.maquina.update({
          where: { id: maquina.id },
          data: {
            posicao2d: clamped as unknown as import('@prisma/client').Prisma.InputJsonValue,
          },
        });
      }
    }

    return tx.setor.findUnique({
      where: { id },
      include: { maquinas: true },
    });
  });

  if (!updated) throw new LayoutError('Setor não encontrado', 404);
  return mapSetor(updated);
}

export async function deleteSetor(id: string): Promise<void> {
  const setor = await prisma.setor.findUnique({ where: { id } });
  if (!setor) throw new LayoutError('Setor não encontrado', 404);
  await prisma.setor.delete({ where: { id } });
}

export async function createMaquina(setorId: string, body: CreateMaquinaBody): Promise<MaquinaDto> {
  const setor = await prisma.setor.findUnique({
    where: { id: setorId },
    include: { maquinas: true },
  });
  if (!setor) throw new LayoutError('Setor não encontrado', 404);

  const exists = await prisma.maquina.findUnique({ where: { id: body.id } });
  if (exists) throw new LayoutError('ID de máquina já existe', 409);

  const layout2d = setor.layout2d as unknown as Layout2D;
  let posicao2d: Posicao2D;
  if (body.posicao2d) {
    if (!isInsideSetor(layout2d, body.posicao2d)) {
      throw new LayoutError('Máquina deve estar dentro do setor', 422);
    }
    posicao2d = body.posicao2d;
  } else {
    posicao2d = autoGridPosition(layout2d, setor.maquinas.length, setor.maquinas.length + 1);
  }

  const limits = body.limits ?? defaultLimits();
  const maquina = await prisma.maquina.create({
    data: {
      id: body.id,
      setorId,
      name: body.name,
      status: 'operando',
      kpis: defaultKpis(),
      limits,
      opAtiva: '#4500',
      oeeHistory: Array.from({ length: 12 }, () => 80),
      posicao2d: posicao2d as unknown as import('@prisma/client').Prisma.InputJsonValue,
    },
  });

  return mapMaquina(maquina);
}

export async function updateMaquina(id: string, body: UpdateMaquinaBody): Promise<MaquinaDto> {
  const maquina = await prisma.maquina.findUnique({ where: { id } });
  if (!maquina) throw new LayoutError('Máquina não encontrada', 404);

  const updated = await prisma.maquina.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.limits !== undefined ? { limits: body.limits } : {}),
    },
  });

  return mapMaquina(updated);
}

export async function updateMaquinaPosition(
  id: string,
  body: UpdateMaquinaPositionBody
): Promise<MaquinaDto> {
  const maquina = await prisma.maquina.findUnique({
    where: { id },
    include: { setor: true },
  });
  if (!maquina) throw new LayoutError('Máquina não encontrada', 404);

  const layout2d = maquina.setor.layout2d as unknown as Layout2D;
  if (!isInsideSetor(layout2d, body.posicao2d)) {
    throw new LayoutError('Máquina deve estar dentro do setor', 422);
  }

  const updated = await prisma.maquina.update({
    where: { id },
    data: {
      posicao2d: body.posicao2d as unknown as import('@prisma/client').Prisma.InputJsonValue,
    },
  });

  return mapMaquina(updated);
}

export async function deleteMaquina(id: string): Promise<void> {
  const maquina = await prisma.maquina.findUnique({ where: { id } });
  if (!maquina) throw new LayoutError('Máquina não encontrada', 404);
  await prisma.maquina.delete({ where: { id } });
}

export async function replacePlantaLayout(
  plantaId: string,
  body: SaveLayoutBody,
  opts?: { autor?: string }
): Promise<PlantaResponse> {
  const planta = await getPlantaOrThrow(plantaId);

  const sectorIds = body.setores.map((s) => s.id);
  if (new Set(sectorIds).size !== sectorIds.length) {
    throw new LayoutError('IDs de setor duplicados no layout', 422);
  }

  const machineIds = body.setores.flatMap((s) => s.maquinas.map((m) => m.id));
  if (new Set(machineIds).size !== machineIds.length) {
    throw new LayoutError('IDs de máquina duplicados no layout', 422);
  }

  for (const setor of body.setores) {
    const err = validateLayout2d(setor.layout2d);
    if (err) throw new LayoutError(err, 422);
    for (const m of setor.maquinas) {
      if (m.posicao2d && !isInsideSetor(setor.layout2d, m.posicao2d)) {
        throw new LayoutError(`Máquina ${m.id} deve estar dentro do setor ${setor.id}`, 422);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    const existingSetores = await tx.setor.findMany({
      where: { plantaId },
      include: { maquinas: true },
    });
    const existingById = new Map(existingSetores.map((s) => [s.id, s]));
    const payloadSectorIds = new Set(sectorIds);

    for (const existing of existingSetores) {
      if (!payloadSectorIds.has(existing.id)) {
        await tx.setor.delete({ where: { id: existing.id } });
      }
    }

    for (let ordem = 0; ordem < body.setores.length; ordem++) {
      const input = body.setores[ordem];
      const layout3d = deriveLayout3D(input.layout2d, planta.viewBox, planta.fatorEscala);
      const prev = existingById.get(input.id);
      type Json = import('@prisma/client').Prisma.InputJsonValue;

      if (prev) {
        await tx.setor.update({
          where: { id: input.id },
          data: {
            name: input.name,
            type: input.type,
            description: input.description ?? '',
            layout2d: input.layout2d as unknown as Json,
            layout3d: layout3d as unknown as Json,
            ordem,
          },
        });
      } else {
        await tx.setor.create({
          data: {
            id: input.id,
            plantaId,
            name: input.name,
            type: input.type,
            status: 'operando',
            description: input.description ?? '',
            layout2d: input.layout2d as unknown as Json,
            layout3d: layout3d as unknown as Json,
            kpis: { headcount: 0, oee: null, status_operacional: 'Novo setor' },
            ordem,
          },
        });
      }

      const prevMachines = prev?.maquinas ?? [];
      const prevById = new Map(prevMachines.map((m) => [m.id, m]));
      const payloadMachineIds = new Set(input.maquinas.map((m) => m.id));

      for (const em of prevMachines) {
        if (!payloadMachineIds.has(em.id)) {
          await tx.maquina.delete({ where: { id: em.id } });
        }
      }

      for (let mi = 0; mi < input.maquinas.length; mi++) {
        const m = input.maquinas[mi];
        const limits = m.limits ?? defaultLimits();
        const posicao2d =
          m.posicao2d ?? autoGridPosition(input.layout2d, mi, input.maquinas.length);
        const prevM = prevById.get(m.id);

        if (prevM) {
          await tx.maquina.update({
            where: { id: m.id },
            data: {
              setorId: input.id,
              name: m.name,
              limits,
              posicao2d: posicao2d as unknown as Json,
            },
          });
        } else {
          const elsewhere = await tx.maquina.findUnique({ where: { id: m.id } });
          if (elsewhere) {
            await tx.maquina.update({
              where: { id: m.id },
              data: {
                setorId: input.id,
                name: m.name,
                limits,
                posicao2d: posicao2d as unknown as Json,
              },
            });
          } else {
            await tx.maquina.create({
              data: {
                id: m.id,
                setorId: input.id,
                name: m.name,
                status: 'operando',
                kpis: defaultKpis(),
                limits,
                opAtiva: '#4500',
                oeeHistory: Array.from({ length: 12 }, () => 80),
                posicao2d: posicao2d as unknown as Json,
              },
            });
          }
        }
      }
    }
  });

  const fresh = await getPlantaById(plantaId);
  if (!fresh) throw new LayoutError('Planta não encontrada', 404);

  await publishLayoutVersion(plantaId, fresh, {
    autor: opts?.autor,
    mensagem: body.mensagem ?? 'Salvar layout',
  });

  return fresh;
}

export async function publishLayoutVersion(
  plantaId: string,
  snapshot: import('@sgm/shared').PlantaResponse,
  opts?: { autor?: string; mensagem?: string }
) {
  await getPlantaOrThrow(plantaId);
  const version = await prisma.layoutVersion.create({
    data: {
      plantaId,
      snapshot: snapshot as unknown as import('@prisma/client').Prisma.InputJsonValue,
      autor: opts?.autor ?? 'editor',
      mensagem: opts?.mensagem ?? 'Salvar layout',
    },
  });
  return {
    id: version.id,
    plantaId: version.plantaId,
    autor: version.autor,
    mensagem: version.mensagem,
    createdAt: version.createdAt.toISOString(),
  };
}

export async function listLayoutVersions(plantaId: string, limit = 20) {
  await getPlantaOrThrow(plantaId);
  const rows = await prisma.layoutVersion.findMany({
    where: { plantaId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      plantaId: true,
      autor: true,
      mensagem: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    plantaId: r.plantaId,
    autor: r.autor,
    mensagem: r.mensagem,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getLayoutVersion(plantaId: string, versionId: string) {
  const version = await prisma.layoutVersion.findFirst({
    where: { id: versionId, plantaId },
  });
  if (!version) throw new LayoutError('Versão não encontrada', 404);
  return {
    id: version.id,
    plantaId: version.plantaId,
    autor: version.autor,
    mensagem: version.mensagem,
    createdAt: version.createdAt.toISOString(),
    snapshot: version.snapshot as unknown as import('@sgm/shared').PlantaResponse,
  };
}
