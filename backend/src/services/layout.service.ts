import type { Maquina, Planta, Setor } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type {
  CreateMaquinaBody,
  CreateSetorBody,
  Layout2D,
  MaquinaDto,
  Posicao2D,
  SetorDto,
  UpdateMaquinaBody,
  UpdateMaquinaPositionBody,
  UpdateSetorBody,
  UpdateSetorLayoutBody,
} from '@sgm/shared';
import {
  autoGridPosition,
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

  const updated = await prisma.setor.update({
    where: { id },
    data: {
      layout2d: body.layout2d as unknown as import('@prisma/client').Prisma.InputJsonValue,
      layout3d: layout3d as unknown as import('@prisma/client').Prisma.InputJsonValue,
    },
    include: { maquinas: true },
  });

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
