import { create } from 'zustand';
import type { Layout2D, MaquinaDto, PlantaResponse, Posicao2D, SetorDto } from '@sgm/shared';
import {
  clampPositionInsideSetor,
  findOverlappingSetores,
  hasBlockingLayoutIssues,
  isInsideSetor,
  resolveMaquinaPosition,
  snapToGrid,
} from '@sgm/shared';
import * as layoutApi from '../api/layout';
import { toastError, toastSuccess } from './toastStore';
import { usePlantaStore } from './plantaStore';

export type EditorTool = 'select' | 'rect' | 'machine' | 'pan';
export type AppMode = 'operate' | 'edit';

const AUTO_SAVE_MS = 2500;
const META_AUTOSAVE_MS = 400;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let saveQueue: Promise<void> = Promise.resolve();

function clonePlanta(p: PlantaResponse): PlantaResponse {
  return JSON.parse(JSON.stringify(p)) as PlantaResponse;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 48) || `setor-${Date.now()}`;
}

function clampMachinesInSetor(setor: SetorDto) {
  for (const m of setor.maquinas) {
    if (!m.posicao2d) continue;
    if (!isInsideSetor(setor.layout2d, m.posicao2d)) {
      m.posicao2d = clampPositionInsideSetor(setor.layout2d, m.posicao2d);
    }
  }
}

function materializeMachinePositions(planta: PlantaResponse) {
  for (const setor of planta.setores) {
    setor.maquinas.forEach((m, i) => {
      if (!m.posicao2d) {
        m.posicao2d = resolveMaquinaPosition(m, setor, i);
      }
    });
  }
}

interface SaveOptions {
  mensagem?: string;
  silent?: boolean;
}

interface EditorStore {
  appMode: AppMode;
  editorBooting: boolean;
  draft: PlantaResponse | null;
  baseline: PlantaResponse | null;
  dirty: boolean;
  saving: boolean;
  autoSaveEnabled: boolean;
  blockSaveOnOverlap: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
  pendingSave: boolean;
  tool: EditorTool;
  selectedSectorId: string | null;
  selectedMachineId: string | null;
  drawPreview: Layout2D | null;
  dimensionCursor: { x: number; y: number } | null;
  historyPast: PlantaResponse[];
  historyFuture: PlantaResponse[];
  setAppMode: (mode: AppMode) => Promise<void>;
  setTool: (tool: EditorTool) => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  setBlockSaveOnOverlap: (enabled: boolean) => void;
  select: (sectorId: string | null, machineId?: string | null) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  updateSectorLayout: (sectorId: string, layout2d: Layout2D) => void;
  updateSectorMeta: (sectorId: string, patch: Partial<Pick<SetorDto, 'name' | 'type' | 'description'>>) => void;
  addSectorFromRect: (layout2d: Layout2D) => void;
  addMachineAt: (sectorId: string, cx: number, cy: number) => void;
  updateMachinePosition: (sectorId: string, machineId: string, posicao2d: Posicao2D) => void;
  setDrawPreview: (rect: Layout2D | null) => void;
  setDimensionCursor: (pos: { x: number; y: number } | null) => void;
  updateMachineMeta: (
    sectorId: string,
    machineId: string,
    patch: Partial<Pick<MaquinaDto, 'name' | 'limits'>>
  ) => void;
  deleteSelected: () => void;
  scheduleAutoSave: (delayMs?: number) => void;
  finalizeInteraction: () => void;
  save: (opts?: SaveOptions) => Promise<void>;
  discard: () => void;
}

function validateMetaBeforeSave(setores: SetorDto[]): string | null {
  for (const setor of setores) {
    if (!setor.name.trim()) return 'Corrija nomes de setor vazios antes de salvar';
    for (const m of setor.maquinas) {
      if (!m.name.trim()) return 'Corrija nomes de máquina vazios antes de salvar';
      const temp = m.limits?.tempMax;
      if (temp != null && (!Number.isFinite(temp) || temp < 1 || temp > 200)) {
        return `Temperatura inválida na máquina ${m.id}`;
      }
    }
  }
  return null;
}

function markDirty(
  get: () => EditorStore,
  set: (p: Partial<EditorStore>) => void,
  opts?: { scheduleSave?: boolean }
) {
  const shouldSchedule = opts?.scheduleSave !== false;
  set(shouldSchedule ? { dirty: true, saveError: null } : { dirty: true });
  if (shouldSchedule) {
    get().scheduleAutoSave();
  }
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  appMode: 'operate',
  editorBooting: false,
  draft: null,
  baseline: null,
  dirty: false,
  saving: false,
  autoSaveEnabled: true,
  blockSaveOnOverlap: false,
  lastSavedAt: null,
  saveError: null,
  pendingSave: false,
  tool: 'select',
  selectedSectorId: null,
  selectedMachineId: null,
  drawPreview: null,
  dimensionCursor: null,
  historyPast: [],
  historyFuture: [],

  setAppMode: async (mode) => {
    if (mode === 'edit') {
      const planta = usePlantaStore.getState().planta;
      if (!planta) return;
      set({ appMode: mode, editorBooting: true });
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const snapshot = clonePlanta(planta);
      materializeMachinePositions(snapshot);
      set({
        editorBooting: false,
        draft: snapshot,
        baseline: clonePlanta(snapshot),
        dirty: false,
        saveError: null,
        tool: 'select',
        selectedSectorId: null,
        selectedMachineId: null,
        historyPast: [],
        historyFuture: [],
      });
    } else {
      const { dirty, saving, saveError } = get();
      if (saving) {
        if (
          !window.confirm(
            'Salvamento em andamento. Sair do editor mesmo assim? As alterações podem não ter sido gravadas.'
          )
        ) {
          return;
        }
      } else if (dirty) {
        if (!window.confirm('Há alterações não salvas no layout. Sair e descartar?')) return;
      } else if (saveError) {
        if (
          !window.confirm(
            'O último salvamento falhou. Sair do editor e descartar as alterações locais?'
          )
        ) {
          return;
        }
      }
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      set({
        appMode: mode,
        editorBooting: false,
        draft: null,
        baseline: null,
        dirty: false,
        drawPreview: null,
        dimensionCursor: null,
        pendingSave: false,
        saveError: null,
      });
    }
  },

  setTool: (tool) => set({ tool, drawPreview: null }),
  setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),
  setBlockSaveOnOverlap: (enabled) => set({ blockSaveOnOverlap: enabled }),

  select: (sectorId, machineId = null) =>
    set({ selectedSectorId: sectorId, selectedMachineId: machineId }),

  pushHistory: () => {
    const { draft, historyPast } = get();
    if (!draft) return;
    set({
      historyPast: [...historyPast.slice(-49), clonePlanta(draft)],
      historyFuture: [],
    });
  },

  undo: () => {
    const { draft, historyPast, historyFuture } = get();
    if (!draft || historyPast.length === 0) return;
    const prev = historyPast[historyPast.length - 1];
    set({
      draft: clonePlanta(prev),
      historyPast: historyPast.slice(0, -1),
      historyFuture: [clonePlanta(draft), ...historyFuture],
      dirty: true,
    });
    get().scheduleAutoSave();
  },

  redo: () => {
    const { draft, historyPast, historyFuture } = get();
    if (!draft || historyFuture.length === 0) return;
    const next = historyFuture[0];
    set({
      draft: clonePlanta(next),
      historyFuture: historyFuture.slice(1),
      historyPast: [...historyPast, clonePlanta(draft)],
      dirty: true,
    });
    get().scheduleAutoSave();
  },

  updateSectorLayout: (sectorId, layout2d) => {
    const { draft } = get();
    if (!draft) return;
    const setor = draft.setores.find((s) => s.id === sectorId);
    if (!setor) return;

    const prev = setor.layout2d;
    const snapped: Layout2D = {
      x: snapToGrid(layout2d.x),
      y: snapToGrid(layout2d.y),
      w: snapToGrid(Math.max(40, layout2d.w)),
      h: snapToGrid(Math.max(40, layout2d.h)),
    };
    const dx = snapped.x - prev.x;
    const dy = snapped.y - prev.y;
    const isTranslation = snapped.w === prev.w && snapped.h === prev.h;

    if (!isTranslation) {
      setor.maquinas.forEach((m, i) => {
        if (!m.posicao2d) {
          m.posicao2d = resolveMaquinaPosition(m, setor, i);
        }
      });
    }

    setor.layout2d = snapped;

    if (isTranslation && (dx !== 0 || dy !== 0)) {
      for (const m of setor.maquinas) {
        if (m.posicao2d) {
          m.posicao2d = { cx: m.posicao2d.cx + dx, cy: m.posicao2d.cy + dy };
        }
      }
    }

    clampMachinesInSetor(setor);
    set({ draft: { ...draft } });
    markDirty(get, set, { scheduleSave: false });
  },

  updateSectorMeta: (sectorId, patch) => {
    const { draft } = get();
    if (!draft) return;
    const setor = draft.setores.find((s) => s.id === sectorId);
    if (!setor) return;
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) return;
      patch = { ...patch, name: trimmed };
    }
    Object.assign(setor, patch);
    set({ draft: { ...draft } });
    markDirty(get, set, { scheduleSave: false });
    get().scheduleAutoSave(META_AUTOSAVE_MS);
  },

  updateMachineMeta: (sectorId, machineId, patch) => {
    const { draft } = get();
    if (!draft) return;
    const setor = draft.setores.find((s) => s.id === sectorId);
    const machine = setor?.maquinas.find((m) => m.id === machineId);
    if (!machine) return;
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) return;
      patch = { ...patch, name: trimmed };
    }
    if (patch.limits?.tempMax !== undefined) {
      const temp = patch.limits.tempMax;
      if (!Number.isFinite(temp) || temp < 1 || temp > 200) return;
    }
    Object.assign(machine, patch);
    set({ draft: { ...draft } });
    markDirty(get, set, { scheduleSave: false });
    get().scheduleAutoSave(META_AUTOSAVE_MS);
  },

  addSectorFromRect: (layout2d) => {
    const { draft } = get();
    if (!draft) return;
    const name = 'Nova Área';
    const id = `${slugify(name)}-${Date.now().toString(36)}`;
    const snapped: Layout2D = {
      x: snapToGrid(layout2d.x),
      y: snapToGrid(layout2d.y),
      w: snapToGrid(Math.max(40, layout2d.w)),
      h: snapToGrid(Math.max(40, layout2d.h)),
    };
    const setor: SetorDto = {
      id,
      name,
      type: 'produção',
      status: 'operando',
      description: '',
      kpis: { headcount: 0, oee: null, status_operacional: 'Novo setor' },
      layout2d: snapped,
      layout3d: { x: 0, z: 0, w: 4, d: 4, h: 2 },
      maquinas: [],
    };
    draft.setores.push(setor);
    set({
      draft: { ...draft },
      selectedSectorId: id,
      selectedMachineId: null,
      drawPreview: null,
    });
    markDirty(get, set);
  },

  addMachineAt: (sectorId, cx, cy) => {
    const { draft } = get();
    if (!draft) return;
    get().pushHistory();
    const setor = draft.setores.find((s) => s.id === sectorId);
    if (!setor) return;
    const pos: Posicao2D = {
      cx: snapToGrid(cx),
      cy: snapToGrid(cy),
    };
    const finalPos = isInsideSetor(setor.layout2d, pos)
      ? pos
      : clampPositionInsideSetor(setor.layout2d, pos);
    const n = setor.maquinas.length + 1;
    const id = `${sectorId.toUpperCase().slice(0, 6)}-M${n}-${Date.now().toString(36).slice(-4)}`;
    setor.maquinas.push({
      id,
      name: `Máquina ${n}`,
      status: 'operando',
      kpis: { oee: 80, temp: 40, rpm: 1500 },
      limits: { tempMax: 55 },
      opAtiva: null,
      oeeHistory: Array.from({ length: 12 }, () => 80),
      posicao2d: finalPos,
    });
    set({
      draft: { ...draft },
      selectedSectorId: sectorId,
      selectedMachineId: id,
    });
    markDirty(get, set);
  },

  updateMachinePosition: (sectorId, machineId, posicao2d) => {
    const { draft } = get();
    if (!draft) return;
    const setor = draft.setores.find((s) => s.id === sectorId);
    const machine = setor?.maquinas.find((m) => m.id === machineId);
    if (!setor || !machine) return;
    const snapped: Posicao2D = {
      cx: snapToGrid(posicao2d.cx),
      cy: snapToGrid(posicao2d.cy),
    };
    machine.posicao2d = isInsideSetor(setor.layout2d, snapped)
      ? snapped
      : clampPositionInsideSetor(setor.layout2d, snapped);
    set({ draft: { ...draft } });
    markDirty(get, set, { scheduleSave: false });
  },

  setDrawPreview: (rect) => set({ drawPreview: rect }),
  setDimensionCursor: (pos) => set({ dimensionCursor: pos }),

  deleteSelected: () => {
    const { draft, selectedSectorId, selectedMachineId } = get();
    if (!draft) return;
    get().pushHistory();

    if (selectedMachineId && selectedSectorId) {
      const setor = draft.setores.find((s) => s.id === selectedSectorId);
      if (!setor) return;
      setor.maquinas = setor.maquinas.filter((m) => m.id !== selectedMachineId);
      set({
        selectedMachineId: null,
        draft: { ...draft },
      });
      markDirty(get, set);
      return;
    }

    if (selectedSectorId) {
      draft.setores = draft.setores.filter((s) => s.id !== selectedSectorId);
      set({
        selectedSectorId: null,
        selectedMachineId: null,
        draft: { ...draft },
      });
      markDirty(get, set);
    }
  },

  scheduleAutoSave: (delayMs = AUTO_SAVE_MS) => {
    const { autoSaveEnabled, dirty, draft, saving, saveError } = get();
    if (!autoSaveEnabled || !dirty || !draft || saving || saveError) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      void get().save({ mensagem: 'Auto-save', silent: true });
    }, delayMs);
  },

  finalizeInteraction: () => {
    const { dirty, saveError } = get();
    if (dirty && !saveError) get().scheduleAutoSave();
  },

  save: async (opts) => {
    const state = get();
    if (!state.draft || !state.baseline || !state.dirty) return;
    if (state.saving && opts?.silent) return;

    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }

    const { blocking } = hasBlockingLayoutIssues(state.draft.setores);
    if (blocking) {
      const msg = 'Corrija máquinas fora do setor antes de salvar';
      set({ saveError: msg });
      if (!opts?.silent) toastError(msg);
      return;
    }

    if (state.blockSaveOnOverlap && findOverlappingSetores(state.draft.setores).length > 0) {
      const msg = 'Resolva sobreposições de setores antes de salvar';
      set({ saveError: msg });
      if (!opts?.silent) toastError(msg);
      return;
    }

    const metaError = validateMetaBeforeSave(state.draft.setores);
    if (metaError) {
      set({ saveError: metaError });
      if (!opts?.silent) toastError(metaError);
      return;
    }

    const run = async () => {
      const { draft, dirty } = get();
      if (!draft || !dirty) {
        set({ saving: false, pendingSave: false });
        return;
      }

      set({ saving: true, pendingSave: true, saveError: null });
      try {
        const body = layoutApi.draftToSaveBody(draft, opts?.mensagem ?? 'Salvar layout');
        const fresh = await layoutApi.saveLayout(draft.id, body);
        materializeMachinePositions(fresh);
        usePlantaStore.setState({ planta: fresh });
        set({
          draft: clonePlanta(fresh),
          baseline: clonePlanta(fresh),
          dirty: false,
          saving: false,
          pendingSave: false,
          lastSavedAt: new Date(),
          saveError: null,
        });

        if (!opts?.silent) {
          toastSuccess('Layout salvo', { discrete: true });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar layout';
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer);
          autoSaveTimer = null;
        }
        set({ saving: false, pendingSave: false, saveError: msg });
        console.error(err);
        if (!opts?.silent) {
          toastError(msg, () => void get().save({ ...opts, silent: false }));
        }
      }
    };

    saveQueue = saveQueue.then(run);
    await saveQueue;
  },

  discard: () => {
    const { baseline } = get();
    if (!baseline) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    set({
      draft: clonePlanta(baseline),
      dirty: false,
      saveError: null,
      historyPast: [],
      historyFuture: [],
      selectedSectorId: null,
      selectedMachineId: null,
    });
  },
}));
