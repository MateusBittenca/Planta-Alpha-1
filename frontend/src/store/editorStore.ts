import { create } from 'zustand';
import type { Layout2D, PlantaResponse, SetorDto } from '@sgm/shared';
import { snapToGrid } from '@sgm/shared';
import * as layoutApi from '../api/layout';
import { usePlantaStore } from './plantaStore';

export type EditorTool = 'select' | 'rect' | 'machine' | 'pan';
export type AppMode = 'operate' | 'edit';

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

interface EditorStore {
  appMode: AppMode;
  draft: PlantaResponse | null;
  baseline: PlantaResponse | null;
  dirty: boolean;
  saving: boolean;
  tool: EditorTool;
  selectedSectorId: string | null;
  selectedMachineId: string | null;
  drawPreview: Layout2D | null;
  deletedSectorIds: string[];
  deletedMachineIds: string[];
  newSectorIds: Set<string>;
  historyPast: PlantaResponse[];
  historyFuture: PlantaResponse[];
  setAppMode: (mode: AppMode) => Promise<void>;
  setTool: (tool: EditorTool) => void;
  select: (sectorId: string | null, machineId?: string | null) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  updateSectorLayout: (sectorId: string, layout2d: Layout2D) => void;
  updateSectorMeta: (sectorId: string, patch: Partial<Pick<SetorDto, 'name' | 'type' | 'description'>>) => void;
  addSectorFromRect: (layout2d: Layout2D) => void;
  addMachineAt: (sectorId: string, cx: number, cy: number) => void;
  setDrawPreview: (rect: Layout2D | null) => void;
  deleteSelected: () => void;
  save: () => Promise<void>;
  discard: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  appMode: 'operate',
  draft: null,
  baseline: null,
  dirty: false,
  saving: false,
  tool: 'select',
  selectedSectorId: null,
  selectedMachineId: null,
  drawPreview: null,
  deletedSectorIds: [],
  deletedMachineIds: [],
  newSectorIds: new Set(),
  historyPast: [],
  historyFuture: [],

  setAppMode: async (mode) => {
    if (mode === 'edit') {
      const planta = usePlantaStore.getState().planta;
      if (!planta) return;
      const snapshot = clonePlanta(planta);
      set({
        appMode: mode,
        draft: snapshot,
        baseline: clonePlanta(planta),
        dirty: false,
        tool: 'select',
        selectedSectorId: null,
        selectedMachineId: null,
        deletedSectorIds: [],
        deletedMachineIds: [],
        newSectorIds: new Set(),
        historyPast: [],
        historyFuture: [],
      });
    } else {
      const { dirty } = get();
      if (dirty && !window.confirm('Descartar alterações não salvas?')) return;
      set({
        appMode: mode,
        draft: null,
        baseline: null,
        dirty: false,
        drawPreview: null,
      });
    }
  },

  setTool: (tool) => set({ tool, drawPreview: null }),

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
  },

  updateSectorLayout: (sectorId, layout2d) => {
    const { draft } = get();
    if (!draft) return;
    const snapped: Layout2D = {
      x: snapToGrid(layout2d.x),
      y: snapToGrid(layout2d.y),
      w: snapToGrid(Math.max(40, layout2d.w)),
      h: snapToGrid(Math.max(40, layout2d.h)),
    };
    const setor = draft.setores.find((s) => s.id === sectorId);
    if (setor) setor.layout2d = snapped;
    set({ draft: { ...draft }, dirty: true });
  },

  updateSectorMeta: (sectorId, patch) => {
    const { draft } = get();
    if (!draft) return;
    get().pushHistory();
    const setor = draft.setores.find((s) => s.id === sectorId);
    if (setor) Object.assign(setor, patch);
    set({ draft: { ...draft }, dirty: true });
  },

  addSectorFromRect: (layout2d) => {
    const { draft, newSectorIds } = get();
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
    const ids = new Set(newSectorIds);
    ids.add(id);
    set({
      draft: { ...draft },
      dirty: true,
      newSectorIds: ids,
      selectedSectorId: id,
      selectedMachineId: null,
      drawPreview: null,
    });
  },

  addMachineAt: (sectorId, cx, cy) => {
    const { draft } = get();
    if (!draft) return;
    get().pushHistory();
    const setor = draft.setores.find((s) => s.id === sectorId);
    if (!setor) return;
    const n = setor.maquinas.length + 1;
    const id = `${sectorId.toUpperCase().slice(0, 6)}-M${n}`;
    setor.maquinas.push({
      id,
      name: `Máquina ${n}`,
      status: 'operando',
      kpis: { oee: 80, temp: 40, rpm: 1500 },
      limits: { tempMax: 55 },
      opAtiva: null,
      oeeHistory: Array.from({ length: 12 }, () => 80),
    });
    set({
      draft: { ...draft },
      dirty: true,
      selectedSectorId: sectorId,
      selectedMachineId: id,
    });
    void cx;
    void cy;
  },

  setDrawPreview: (rect) => set({ drawPreview: rect }),

  deleteSelected: () => {
    const { draft, selectedSectorId, selectedMachineId, deletedSectorIds, deletedMachineIds, newSectorIds } =
      get();
    if (!draft) return;
    get().pushHistory();
    if (selectedMachineId && selectedSectorId) {
      const setor = draft.setores.find((s) => s.id === selectedSectorId);
      if (setor) {
        setor.maquinas = setor.maquinas.filter((m) => m.id !== selectedMachineId);
        if (!newSectorIds.has(selectedSectorId)) {
          set({ deletedMachineIds: [...deletedMachineIds, selectedMachineId] });
        }
      }
      set({ selectedMachineId: null, draft: { ...draft }, dirty: true });
      return;
    }
    if (selectedSectorId) {
      draft.setores = draft.setores.filter((s) => s.id !== selectedSectorId);
      if (newSectorIds.has(selectedSectorId)) {
        const ids = new Set(newSectorIds);
        ids.delete(selectedSectorId);
        set({ newSectorIds: ids });
      } else {
        set({ deletedSectorIds: [...deletedSectorIds, selectedSectorId] });
      }
      set({ selectedSectorId: null, draft: { ...draft }, dirty: true });
    }
  },

  save: async () => {
    const {
      draft,
      baseline,
      deletedSectorIds,
      deletedMachineIds,
      newSectorIds,
    } = get();
    if (!draft || !baseline) return;
    set({ saving: true });
    try {
      const plantaId = draft.id;

      for (const id of deletedMachineIds) {
        await layoutApi.deleteMaquina(id);
      }
      for (const id of deletedSectorIds) {
        await layoutApi.deleteSetor(id);
      }

      for (const setor of draft.setores) {
        if (newSectorIds.has(setor.id)) {
          await layoutApi.createSetor(plantaId, {
            id: setor.id,
            name: setor.name,
            type: setor.type,
            description: setor.description,
            layout2d: setor.layout2d,
          });
          for (const m of setor.maquinas) {
            await layoutApi.createMaquina(setor.id, {
              id: m.id,
              name: m.name,
              limits: m.limits,
            });
          }
        } else {
          const orig = baseline.setores.find((s) => s.id === setor.id);
          if (!orig) continue;
          const layoutChanged =
            JSON.stringify(orig.layout2d) !== JSON.stringify(setor.layout2d);
          const metaChanged =
            orig.name !== setor.name ||
            orig.type !== setor.type ||
            orig.description !== setor.description;
          if (metaChanged) {
            await layoutApi.updateSetor(setor.id, {
              name: setor.name,
              type: setor.type,
              description: setor.description,
            });
          }
          if (layoutChanged) {
            await layoutApi.updateSetorLayout(setor.id, { layout2d: setor.layout2d });
          }
          const origMachineIds = new Set(orig.maquinas.map((m) => m.id));
          for (const m of setor.maquinas) {
            if (!origMachineIds.has(m.id)) {
              await layoutApi.createMaquina(setor.id, {
                id: m.id,
                name: m.name,
                limits: m.limits,
              });
            } else {
              const om = orig.maquinas.find((x) => x.id === m.id);
              if (om && (om.name !== m.name || om.limits.tempMax !== m.limits.tempMax)) {
                await layoutApi.updateMaquina(m.id, { name: m.name, limits: m.limits });
              }
            }
          }
        }
      }

      const fresh = await layoutApi.loadLayout(plantaId);
      usePlantaStore.setState({ planta: fresh });
      set({
        draft: clonePlanta(fresh),
        baseline: clonePlanta(fresh),
        dirty: false,
        deletedSectorIds: [],
        deletedMachineIds: [],
        newSectorIds: new Set(),
        saving: false,
      });
    } catch (err) {
      set({ saving: false });
      console.error(err);
      alert(err instanceof Error ? err.message : 'Erro ao salvar layout');
    }
  },

  discard: () => {
    const { baseline } = get();
    if (!baseline) return;
    set({
      draft: clonePlanta(baseline),
      dirty: false,
      deletedSectorIds: [],
      deletedMachineIds: [],
      newSectorIds: new Set(),
      historyPast: [],
      historyFuture: [],
      selectedSectorId: null,
      selectedMachineId: null,
    });
  },
}));
