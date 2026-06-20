import type { Layout2D, Layout3D } from './planta.js';

export interface Posicao2D {
  cx: number;
  cy: number;
}

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
  const cols = Math.ceil(total / rows);
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
