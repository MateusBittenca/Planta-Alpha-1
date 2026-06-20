import type {
  CreateMaquinaBody,
  CreateSetorBody,
  Layout2D,
  MaquinaDto,
  PlantaResponse,
  Posicao2D,
  SetorDto,
  UpdateMaquinaBody,
  UpdateSetorBody,
  UpdateSetorLayoutBody,
} from '@sgm/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function layoutRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-SGM-Role': 'editor',
      ...(options.headers as Record<string, string> | undefined),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function loadLayout(plantaId: string): Promise<PlantaResponse> {
  return layoutRequest(`/plantas/${plantaId}/layout`);
}

export async function createSetor(plantaId: string, body: CreateSetorBody): Promise<SetorDto> {
  return layoutRequest(`/plantas/${plantaId}/setores`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateSetor(id: string, body: UpdateSetorBody): Promise<SetorDto> {
  return layoutRequest(`/setores/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function updateSetorLayout(id: string, body: UpdateSetorLayoutBody): Promise<SetorDto> {
  return layoutRequest(`/setores/${id}/layout`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteSetor(id: string): Promise<void> {
  return layoutRequest(`/setores/${id}`, { method: 'DELETE' });
}

export async function createMaquina(setorId: string, body: CreateMaquinaBody): Promise<MaquinaDto> {
  return layoutRequest(`/setores/${setorId}/maquinas`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateMaquina(id: string, body: UpdateMaquinaBody): Promise<MaquinaDto> {
  return layoutRequest(`/maquinas/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function updateMaquinaPosition(id: string, posicao2d: Posicao2D): Promise<MaquinaDto> {
  return layoutRequest(`/maquinas/${id}/position`, {
    method: 'PATCH',
    body: JSON.stringify({ posicao2d }),
  });
}

export async function deleteMaquina(id: string): Promise<void> {
  return layoutRequest(`/maquinas/${id}`, { method: 'DELETE' });
}

export type { Layout2D, Posicao2D };
