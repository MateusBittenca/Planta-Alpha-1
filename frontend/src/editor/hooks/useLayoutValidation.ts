import { useMemo } from 'react';
import type { PlantaResponse } from '@sgm/shared';
import {
  findMachinesOutsideSetor,
  findOverlappingSetores,
  hasBlockingLayoutIssues,
} from '@sgm/shared';

export interface LayoutIssue {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  sectorId?: string;
  machineId?: string;
  relatedSectorId?: string;
}

export function useLayoutValidation(draft: PlantaResponse | null) {
  return useMemo(() => buildLayoutValidation(draft), [draft]);
}

export function buildLayoutValidation(draft: PlantaResponse | null) {
  if (!draft) {
    return {
      issues: [] as LayoutIssue[],
      blocking: false,
      hasOverlaps: false,
      overlaps: [] as Array<[string, string]>,
    };
  }

  const issues: LayoutIssue[] = [];
  const overlaps = findOverlappingSetores(draft.setores);

  for (const setor of draft.setores) {
    if (setor.layout2d.w < 40 || setor.layout2d.h < 40) {
      issues.push({
        id: `size-${setor.id}`,
        severity: 'error',
        message: `Setor "${setor.name}" abaixo do tamanho mínimo (40×40 px)`,
        sectorId: setor.id,
      });
    }
  }

  for (const [a, b] of overlaps) {
    const sa = draft.setores.find((s) => s.id === a);
    const sb = draft.setores.find((s) => s.id === b);
    issues.push({
      id: `overlap-${a}-${b}`,
      severity: 'warning',
      message: `Sobreposição: "${sa?.name ?? a}" e "${sb?.name ?? b}"`,
      sectorId: a,
      relatedSectorId: b,
    });
  }

  for (const setor of draft.setores) {
    for (const machineId of findMachinesOutsideSetor(setor)) {
      const m = setor.maquinas.find((x) => x.id === machineId);
      issues.push({
        id: `machine-out-${machineId}`,
        severity: 'error',
        message: `Máquina "${m?.name ?? machineId}" fora do setor "${setor.name}"`,
        sectorId: setor.id,
        machineId,
      });
    }
  }

  const { blocking } = hasBlockingLayoutIssues(draft.setores);
  return { issues, blocking, hasOverlaps: overlaps.length > 0, overlaps };
}
