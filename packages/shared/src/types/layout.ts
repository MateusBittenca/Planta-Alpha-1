import type { Layout2D, Layout3D, MaquinaDto, Posicao2D, SetorDto } from './planta.js';

export type { Posicao2D } from './planta.js';

export interface CreateSetorBody {
  id: string;
  name: string;
  type: string;
  description?: string;
  layout2d: Layout2D;
}

export interface UpdateSetorBody {
  name?: string;
  type?: string;
  description?: string;
  status?: string;
}

export interface UpdateSetorLayoutBody {
  layout2d: Layout2D;
}

export interface CreateMaquinaBody {
  id: string;
  name: string;
  posicao2d?: Posicao2D;
  limits?: { tempMax: number };
}

export interface UpdateMaquinaBody {
  name?: string;
  limits?: { tempMax: number };
}

export interface UpdateMaquinaPositionBody {
  posicao2d: Posicao2D;
}

export interface SaveLayoutMachineBody {
  id: string;
  name: string;
  limits?: { tempMax: number };
  posicao2d?: Posicao2D;
}

export interface SaveLayoutSetorBody {
  id: string;
  name: string;
  type: string;
  description?: string;
  layout2d: Layout2D;
  maquinas: SaveLayoutMachineBody[];
}

export interface SaveLayoutBody {
  setores: SaveLayoutSetorBody[];
  mensagem?: string;
}

export function parseViewBox(viewBox: string): { width: number; height: number } {
  const parts = viewBox.split(/\s+/).map(Number);
  return { width: parts[2] ?? 1200, height: parts[3] ?? 750 };
}

export function deriveLayout3D(
  layout2d: Layout2D,
  viewBox: string,
  fatorEscala: number,
  height3d = 2
): Layout3D {
  const { width, height } = parseViewBox(viewBox);
  const cx2d = layout2d.x + layout2d.w / 2;
  const cy2d = layout2d.y + layout2d.h / 2;
  const normX = (cx2d - width / 2) * fatorEscala;
  const normZ = (cy2d - height / 2) * fatorEscala;
  return {
    x: Math.round(normX * 10) / 10,
    z: Math.round(normZ * 10) / 10,
    w: Math.round(layout2d.w * fatorEscala * 10) / 10,
    d: Math.round(layout2d.h * fatorEscala * 10) / 10,
    h: height3d,
  };
}

export function isInsideSetor(layout2d: Layout2D, pos: Posicao2D): boolean {
  return (
    pos.cx >= layout2d.x &&
    pos.cx <= layout2d.x + layout2d.w &&
    pos.cy >= layout2d.y &&
    pos.cy <= layout2d.y + layout2d.h
  );
}

export function snapToGrid(value: number, grid = 40): number {
  return Math.round(value / grid) * grid;
}

export function autoGridPosition(
  layout2d: Layout2D,
  index: number,
  total: number
): Posicao2D {
  const rows = Math.ceil(Math.sqrt(total));
  const cols = Math.ceil(total / rows) || 1;
  const pad = 14;
  const cw = (layout2d.w - pad * 2) / cols;
  const ch = (layout2d.h - pad * 2 - 20) / rows;
  const r = Math.floor(index / cols);
  const c = index % cols;
  return {
    cx: layout2d.x + pad + c * cw + cw / 2,
    cy: layout2d.y + pad + 24 + r * ch + ch / 2,
  };
}

export function pxToMeters(px: number, fatorEscala: number): number {
  return Math.round(px * fatorEscala * 10) / 10;
}

export function formatMeters(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function layout2dToMeters(
  layout2d: Layout2D,
  fatorEscala: number
): { wM: number; hM: number; areaM2: number } {
  const wM = pxToMeters(layout2d.w, fatorEscala);
  const hM = pxToMeters(layout2d.h, fatorEscala);
  return { wM, hM, areaM2: Math.round(wM * hM * 10) / 10 };
}

export function rectsOverlap(a: Layout2D, b: Layout2D): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function findOverlappingSetores(setores: SetorDto[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < setores.length; i++) {
    for (let j = i + 1; j < setores.length; j++) {
      if (rectsOverlap(setores[i].layout2d, setores[j].layout2d)) {
        pairs.push([setores[i].id, setores[j].id]);
      }
    }
  }
  return pairs;
}

export function clampPositionInsideSetor(
  layout2d: Layout2D,
  pos: Posicao2D,
  margin = 8
): Posicao2D {
  const minX = layout2d.x + margin;
  const maxX = layout2d.x + layout2d.w - margin;
  const minY = layout2d.y + margin;
  const maxY = layout2d.y + layout2d.h - margin;
  return {
    cx: Math.min(maxX, Math.max(minX, pos.cx)),
    cy: Math.min(maxY, Math.max(minY, pos.cy)),
  };
}

export function resolveMaquinaPosition(
  maquina: MaquinaDto,
  setor: SetorDto,
  index: number
): Posicao2D {
  if (maquina.posicao2d) return maquina.posicao2d;
  return autoGridPosition(setor.layout2d, index, setor.maquinas.length);
}

export function findMachinesOutsideSetor(setor: SetorDto): string[] {
  return setor.maquinas
    .filter((m) => m.posicao2d && !isInsideSetor(setor.layout2d, m.posicao2d))
    .map((m) => m.id);
}

export function hasBlockingLayoutIssues(
  setores: SetorDto[]
): { blocking: boolean; machineIds: string[] } {
  const machineIds = setores.flatMap((s) => findMachinesOutsideSetor(s));
  return { blocking: machineIds.length > 0, machineIds };
}
