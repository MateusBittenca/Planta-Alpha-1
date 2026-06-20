import type { StatusAtivo } from '@sgm/shared';

export const STATUS_COLORS: Record<StatusAtivo, string> = {
  operando: '#2e7d32',
  manutencao: '#0288d1',
  alerta: '#d32f2f',
  offline: '#757575',
};

export const COLORS_3D: Record<StatusAtivo, number> = {
  operando: 0x2e7d32,
  manutencao: 0x0288d1,
  alerta: 0xd32f2f,
  offline: 0x757575,
};

export const STATUS_LABELS: Record<StatusAtivo, string> = {
  operando: 'Operando',
  manutencao: 'Manutenção',
  alerta: 'Alerta',
  offline: 'Offline',
};
