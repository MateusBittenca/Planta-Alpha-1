export type StatusAtivo = 'operando' | 'manutencao' | 'alerta' | 'offline';

export interface Layout2D {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout3D {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export interface MaquinaKpis {
  oee: number;
  temp: number;
  rpm: number;
}

export interface MaquinaLimits {
  tempMax: number;
}

export interface MaquinaDto {
  id: string;
  name: string;
  status: string;
  kpis: MaquinaKpis;
  limits: MaquinaLimits;
  opAtiva?: string | null;
  oeeHistory: number[];
}

export interface OpDto {
  id: string;
  produto: string;
  planejada: number;
  produzida: number;
  eta: string;
}

export interface ManutencaoDto {
  tecnico: string;
  minRestantes: number;
  checklist: string[];
}

export interface SetorDto {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  kpis: Record<string, unknown>;
  layout2d: Layout2D;
  layout3d: Layout3D;
  maquinas: MaquinaDto[];
  op?: OpDto;
  manutencao?: ManutencaoDto;
}

export interface PlantaResponse {
  id: string;
  nome: string;
  turnoAtual: 1 | 2 | 3;
  simTime: { hour: number; minute: number };
  setores: SetorDto[];
}

export interface AlertaFront {
  id: string;
  severidade: string;
  msg: string;
  sectorId: string | null;
  machineId: string | null;
  ts: number;
  time: string;
}

export interface OcorrenciaFront {
  id?: string;
  asset: string;
  type: string;
  desc: string;
  time: string;
  ts?: number;
}

export interface EventoLogFront {
  type: string;
  text: string;
  time: string;
}

export type WsMessage =
  | { type: 'telemetry'; sectorId: string; machineId: string; status: string; kpis: MaquinaKpis; oeeHistory: number[] }
  | { type: 'op_progress'; sectorId: string; produzida: number; planejada: number }
  | { type: 'maintenance'; sectorId: string; minRestantes: number }
  | { type: 'clock'; simTime: { hour: number; minute: number }; turnoAtual: number }
  | { type: 'alert'; severidade: string; msg: string; sectorId: string; machineId?: string | null; time: string }
  | { type: 'connected'; plantaId: string };
