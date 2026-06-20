import type { AlertaFront, OcorrenciaFront, PlantaResponse } from '@sgm/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> | undefined) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function loadPlanta(id: string): Promise<PlantaResponse> {
  return request(`/plantas/${id}`);
}

export async function loadAlertas(plantaId: string): Promise<AlertaFront[]> {
  return request(`/alertas?plantaId=${plantaId}`);
}

export async function loadOcorrencias(plantaId: string, limit = 8): Promise<OcorrenciaFront[]> {
  return request(`/ocorrencias?plantaId=${plantaId}&limit=${limit}`);
}

export async function saveOcorrencia(body: {
  plantaId: string;
  asset: string;
  type: string;
  descricao: string;
}): Promise<OcorrenciaFront> {
  return request('/ocorrencias', { method: 'POST', body: JSON.stringify(body) });
}

export async function triggerAndon(body: {
  plantaId: string;
  sectorId: string;
  machineId: string | null;
  tipo: string;
}): Promise<void> {
  await request('/andon', { method: 'POST', body: JSON.stringify(body) });
}
