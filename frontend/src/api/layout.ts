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
  UpdateSetorBody,
  UpdateSetorLayoutBody,
} from '@sgm/shared';

import { NETWORK_UNAVAILABLE_MSG, normalizeApiMessage } from './httpError';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

class LayoutApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function layoutRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hasBody = options.body != null && options.body !== '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'X-SGM-Role': 'editor',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new Error(NETWORK_UNAVAILABLE_MSG);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const payload = err as { error?: string; message?: string };
    const msg = normalizeApiMessage(payload.error || payload.message || res.statusText);
    throw new LayoutApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function deleteIdempotent(path: string): Promise<void> {
  try {
    await layoutRequest(path, { method: 'DELETE' });
  } catch (err) {
    if (err instanceof LayoutApiError && err.status === 404) return;
    throw err;
  }
}

export async function loadLayout(plantaId: string): Promise<PlantaResponse> {
  return layoutRequest(`/plantas/${plantaId}/layout`);
}

export function draftToSaveBody(draft: PlantaResponse, mensagem?: string): SaveLayoutBody {
  return {
    mensagem,
    setores: draft.setores.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      description: s.description,
      layout2d: s.layout2d,
      maquinas: s.maquinas.map((m) => ({
        id: m.id,
        name: m.name,
        limits: m.limits,
        posicao2d: m.posicao2d,
      })),
    })),
  };
}

export async function saveLayout(plantaId: string, body: SaveLayoutBody): Promise<PlantaResponse> {
  return layoutRequest(`/plantas/${plantaId}/layout`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function createSetor(plantaId: string, body: CreateSetorBody): Promise<SetorDto> {
  try {
    return await layoutRequest(`/plantas/${plantaId}/setores`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof LayoutApiError && err.status === 409) {
      await layoutRequest(`/setores/${body.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: body.name,
          type: body.type,
          description: body.description,
        }),
      });
      return layoutRequest(`/setores/${body.id}/layout`, {
        method: 'PATCH',
        body: JSON.stringify({ layout2d: body.layout2d }),
      });
    }
    throw err;
  }
}

export async function updateSetor(id: string, body: UpdateSetorBody): Promise<SetorDto> {
  return layoutRequest(`/setores/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function updateSetorLayout(id: string, body: UpdateSetorLayoutBody): Promise<SetorDto> {
  return layoutRequest(`/setores/${id}/layout`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteSetor(id: string): Promise<void> {
  return deleteIdempotent(`/setores/${id}`);
}

export async function createMaquina(setorId: string, body: CreateMaquinaBody): Promise<MaquinaDto> {
  try {
    return await layoutRequest(`/setores/${setorId}/maquinas`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof LayoutApiError && err.status === 409) {
      if (body.posicao2d) {
        await layoutRequest(`/maquinas/${body.id}/position`, {
          method: 'PATCH',
          body: JSON.stringify({ posicao2d: body.posicao2d }),
        });
      }
      return layoutRequest(`/maquinas/${body.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: body.name, limits: body.limits }),
      });
    }
    throw err;
  }
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
  return deleteIdempotent(`/maquinas/${id}`);
}

export async function publishLayout(plantaId: string, mensagem?: string) {
  return layoutRequest<{ id: string; createdAt: string }>(`/plantas/${plantaId}/layout/publish`, {
    method: 'POST',
    body: JSON.stringify({ mensagem: mensagem ?? 'Salvar layout' }),
  });
}

export async function listLayoutVersions(plantaId: string, limit = 20) {
  return layoutRequest<Array<{ id: string; createdAt: string; mensagem: string | null }>>(
    `/plantas/${plantaId}/layout/versions?limit=${limit}`
  );
}

export type { Layout2D, Posicao2D };
