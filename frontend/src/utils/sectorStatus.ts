import type { PlantaResponse, SetorDto, StatusAtivo } from '@sgm/shared';

export function getSetor(planta: PlantaResponse, id: string): SetorDto | undefined {
  return planta.setores.find((s) => s.id === id);
}

export function getMachine(planta: PlantaResponse, sectorId: string, machineId: string) {
  const s = getSetor(planta, sectorId);
  return s?.maquinas.find((m) => m.id === machineId);
}

export function getSectorStatus(s: SetorDto): StatusAtivo {
  if (s.status === 'manutencao') return 'manutencao';
  const st = s.maquinas.map((m) => m.status);
  if (st.includes('alerta')) return 'alerta';
  if (st.every((m) => m === 'offline')) return 'offline';
  if (st.includes('manutencao')) return 'manutencao';
  return 'operando';
}

export function getTurnoLabel(t: number): string {
  return ['1º Turno', '2º Turno', '3º Turno'][t - 1] ?? '—';
}

export function formatSimTime(planta: PlantaResponse): string {
  const h = String(planta.simTime.hour).padStart(2, '0');
  const m = String(planta.simTime.minute).padStart(2, '0');
  return `${h}:${m}`;
}

export function seedHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
