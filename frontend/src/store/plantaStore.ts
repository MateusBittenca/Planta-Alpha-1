import { create } from 'zustand';
import type { AlertaFront, EventoLogFront, OcorrenciaFront, PlantaResponse, StatusAtivo, WsMessage } from '@sgm/shared';
import * as api from '../api/client';
import { connectTelemetry } from '../api/websocket';
import { STATUS_COLORS } from '../utils/colors';
import { formatSimTime, getMachine, getSectorStatus, getSetor, seedHash } from '../utils/sectorStatus';

export type MainView = 'mapa' | 'dashboard';
export type DrawerName = 'alerts' | 'analysis' | null;

export interface Map2DState {
  scale: number;
  panX: number;
  panY: number;
  minScale: number;
  maxScale: number;
}

interface PlantaStore {
  planta: PlantaResponse | null;
  loadError: string | null;
  ready: boolean;
  mainView: MainView;
  is3D: boolean;
  selectedId: string | null;
  selectedMachineId: string | null;
  statusFilter: StatusAtivo | 'todos';
  alerts: AlertaFront[];
  eventLog: EventoLogFront[];
  map2d: Map2DState;
  drawer: DrawerName;
  occurrenceOpen: boolean;
  overlayOpen: boolean;
  simTick: number;
  simInterval: ReturnType<typeof setInterval> | null;
  clockInterval: ReturnType<typeof setInterval> | null;
  sceneRef: { current: Scene3DRef | null };
  bootstrap: () => Promise<void>;
  retryBootstrap: () => Promise<void>;
  applyTelemetryPatch: (msg: WsMessage) => void;
  selectZone: (id: string, machineId?: string | null, opts?: { focusCamera?: boolean }) => void;
  focusOnSelection: () => void;
  clearSelection: () => void;
  setMainView: (view: MainView) => void;
  setStatusFilter: (f: StatusAtivo | 'todos') => void;
  toggleView: () => void;
  setTurno: (t: 1 | 2 | 3) => void;
  openDrawer: (name: DrawerName) => void;
  closeDrawer: (_name?: DrawerName) => void;
  closeAllOverlays: () => void;
  openOccurrenceModal: () => void;
  closeOccurrenceModal: () => void;
  addAlert: (severidade: string, msg: string, sectorId: string, machineId?: string | null) => void;
  navigateAlert: (sectorId: string, machineId?: string | null) => void;
  triggerAndon: (tipo: string) => Promise<void>;
  saveOccurrence: (asset: string, type: string, desc: string) => Promise<void>;
  loadOcorrenciasRecent: () => Promise<OcorrenciaFront[]>;
  searchAndSelect: (query: string) => boolean;
  zoomMap2D: (factor: number) => void;
  resetMap2D: () => void;
  setMap2dPan: (panX: number, panY: number) => void;
  setMap2dScale: (scale: number) => void;
  resetView: () => void;
  updateVisualsFromData: () => void;
  startSimulator: () => void;
  stopSimulator: () => void;
  tickSimulator: () => void;
  setSceneRef: (ref: Scene3DRef | null) => void;
}

export interface Scene3DRef {
  focusCameraOn: (obj: unknown) => void;
  resetView: () => void;
  updateFromData: () => void;
  setPlanta: (planta: PlantaResponse) => void;
  setActive: (active: boolean) => void;
  applyIsolation: (selectedId: string | null) => void;
  applyStatusFilter: (filter: StatusAtivo | 'todos', getStatus: (id: string) => StatusAtivo) => void;
}

export function layoutFingerprint(planta: PlantaResponse): string {
  return planta.setores
    .map(
      (s) =>
        `${s.id}:${s.layout2d.x},${s.layout2d.y},${s.layout2d.w},${s.layout2d.h},${s.layout3d.x},${s.layout3d.z}:` +
        s.maquinas
          .map((m) => `${m.id}@${m.posicao2d?.cx ?? ''},${m.posicao2d?.cy ?? ''}`)
          .join(',')
    )
    .join('|');
}

export const usePlantaStore = create<PlantaStore>((set, get) => ({
  planta: null,
  loadError: null,
  ready: false,
  mainView: 'mapa',
  is3D: true,
  selectedId: null,
  selectedMachineId: null,
  statusFilter: 'todos',
  alerts: [],
  eventLog: [],
  map2d: { scale: 1, panX: 0, panY: 0, minScale: 0.4, maxScale: 5 },
  drawer: null,
  occurrenceOpen: false,
  overlayOpen: false,
  simTick: 0,
  simInterval: null,
  clockInterval: null,
  sceneRef: { current: null },

  setSceneRef: (ref) => {
    get().sceneRef.current = ref;
  },

  bootstrap: async () => {
    const alerts: AlertaFront[] = [];
    try {
      const planta = await api.loadPlanta('alpha-1');
      const loaded = await api.loadAlertas('alpha-1');
      alerts.push(...loaded);
      connectTelemetry((msg) => get().applyTelemetryPatch(msg));
      set({ planta, loadError: null, alerts, ready: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível carregar a planta.';
      console.error('Falha ao conectar API:', err);
      set({ planta: null, loadError: msg, alerts: [], ready: true });
    }
  },

  retryBootstrap: async () => {
    set({ ready: false, loadError: null });
    await get().bootstrap();
  },

  applyTelemetryPatch: (msg) => {
    const { planta, selectedId } = get();
    if (!planta || !msg.type) return;

    if (msg.type === 'telemetry') {
      const s = getSetor(planta, msg.sectorId);
      const m = s?.maquinas.find((x) => x.id === msg.machineId);
      if (m) {
        m.status = msg.status;
        m.kpis = msg.kpis;
        m.oeeHistory = msg.oeeHistory;
      }
      get().updateVisualsFromData();
      set({ planta: { ...planta } });
    } else if (msg.type === 'op_progress') {
      const s = getSetor(planta, msg.sectorId);
      if (s?.op) {
        s.op.produzida = msg.produzida;
        s.op.planejada = msg.planejada;
      }
      if (selectedId === msg.sectorId) set({ planta: { ...planta } });
    } else if (msg.type === 'maintenance') {
      const s = getSetor(planta, msg.sectorId);
      if (s?.manutencao) s.manutencao.minRestantes = msg.minRestantes;
      if (selectedId === msg.sectorId) set({ planta: { ...planta } });
    } else if (msg.type === 'clock') {
      planta.simTime = msg.simTime;
      planta.turnoAtual = msg.turnoAtual as 1 | 2 | 3;
      set({ planta: { ...planta } });
    } else if (msg.type === 'alert') {
      get().addAlert(msg.severidade, msg.msg, msg.sectorId, msg.machineId ?? null);
    }
  },

  selectZone: (id, machineId = null, opts) => {
    const { planta, is3D, sceneRef } = get();
    if (!planta || !getSetor(planta, id)) return;
    set({ selectedId: id, selectedMachineId: machineId });

    sceneRef.current?.applyIsolation(id);

    if (opts?.focusCamera && is3D) {
      if (machineId) sceneRef.current?.focusCameraOn(machineId);
      else sceneRef.current?.focusCameraOn(id);
    }
  },

  focusOnSelection: () => {
    const { selectedId, selectedMachineId, is3D, sceneRef } = get();
    if (!selectedId || !is3D) return;
    if (selectedMachineId) sceneRef.current?.focusCameraOn(selectedMachineId);
    else sceneRef.current?.focusCameraOn(selectedId);
  },

  clearSelection: () => {
    const { sceneRef } = get();
    set({ selectedId: null, selectedMachineId: null });
    sceneRef.current?.applyIsolation(null);
  },

  setMainView: (view) => set({ mainView: view }),

  setStatusFilter: (f) => {
    set({ statusFilter: f });
    get().updateVisualsFromData();
  },

  toggleView: () => {
    const is3D = !get().is3D;
    set({ is3D });
    if (!is3D) {
      const { map2d } = get();
      set({ map2d: { ...map2d } });
    }
  },

  setTurno: (t) => {
    const { planta } = get();
    if (!planta) return;
    planta.turnoAtual = t;
    set({ planta: { ...planta } });
  },

  openDrawer: (name) => set({ drawer: name, overlayOpen: true }),
  closeDrawer: (_name?: DrawerName) => set({ drawer: null, overlayOpen: false }),
  closeAllOverlays: () => set({ drawer: null, occurrenceOpen: false, overlayOpen: false }),

  openOccurrenceModal: () => set({ occurrenceOpen: true, overlayOpen: true }),
  closeOccurrenceModal: () => set({ occurrenceOpen: false, overlayOpen: false }),

  addAlert: (severidade, msg, sectorId, machineId = null) => {
    const { alerts, planta, eventLog } = get();
    if (!planta) return;
    const exists = alerts.some((a) => a.msg === msg && Date.now() - a.ts < 60000);
    if (exists) return;
    const time = formatSimTime(planta);
    const a: AlertaFront = {
      id: 'A' + Date.now(),
      severidade,
      msg,
      sectorId,
      machineId,
      ts: Date.now(),
      time,
    };
    const newLog = [{ type: 'alerta', text: msg, time }, ...eventLog].slice(0, 50);
    set({ alerts: [a, ...alerts].slice(0, 50), eventLog: newLog });
  },

  navigateAlert: (sectorId, machineId = null) => {
    get().closeAllOverlays();
    set({ mainView: 'mapa' });
    get().selectZone(sectorId, machineId, { focusCamera: true });
  },

  triggerAndon: async (tipo) => {
    const { selectedId, selectedMachineId, planta } = get();
    if (!selectedId || !planta) return;
    const target = selectedMachineId || selectedId;
    const labels: Record<string, string> = {
      parada: 'Parada',
      qualidade: 'Qualidade',
      material: 'Material',
      manutencao: 'Manutenção',
    };

    try {
      await api.triggerAndon({
        plantaId: 'alpha-1',
        sectorId: selectedId,
        machineId: selectedMachineId,
        tipo,
      });
      if (selectedMachineId) {
        const m = getMachine(planta, selectedId, selectedMachineId);
        if (m) m.status = tipo === 'manutencao' ? 'manutencao' : 'alerta';
      }
      get().addAlert('aviso', `Andon ${labels[tipo]}: ${target}`, selectedId, selectedMachineId);
      get().updateVisualsFromData();
      set({ planta: { ...planta } });
    } catch (err) {
      console.error('Andon error:', err);
    }
  },

  saveOccurrence: async (asset, type, desc) => {
    const { planta, eventLog } = get();
    if (!planta) return;
    const time = formatSimTime(planta);

    try {
      await api.saveOcorrencia({ plantaId: 'alpha-1', asset, type, descricao: desc });
    } catch (err) {
      console.error('Ocorrência error:', err);
    }

    const newLog = [{ type: 'ocorrencia', text: `${asset}: ${type}`, time }, ...eventLog].slice(0, 50);
    set({ eventLog: newLog });
  },

  loadOcorrenciasRecent: async () => {
    try {
      return await api.loadOcorrencias('alpha-1', 8);
    } catch {
      return [];
    }
  },

  searchAndSelect: (query) => {
    const { planta } = get();
    if (!planta) return false;
    const q = query.trim().toLowerCase();
    if (q.length < 2) return false;

    for (const s of planta.setores) {
      if (s.name.toLowerCase().includes(q) || s.id.includes(q)) {
        set({ mainView: 'mapa' });
        get().selectZone(s.id, null, { focusCamera: true });
        return true;
      }
      for (const m of s.maquinas) {
        if (
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          (m.opAtiva && m.opAtiva.toLowerCase().includes(q))
        ) {
          set({ mainView: 'mapa' });
          get().selectZone(s.id, m.id, { focusCamera: true });
          return true;
        }
      }
      if (s.op && s.op.id.toLowerCase().includes(q)) {
        set({ mainView: 'mapa' });
        get().selectZone(s.id, null, { focusCamera: true });
        return true;
      }
    }
    return false;
  },

  zoomMap2D: (factor) => {
    const { map2d } = get();
    const scale = Math.min(map2d.maxScale, Math.max(map2d.minScale, map2d.scale * factor));
    set({ map2d: { ...map2d, scale } });
  },

  resetMap2D: () => set({ map2d: { scale: 1, panX: 0, panY: 0, minScale: 0.4, maxScale: 5 } }),

  setMap2dPan: (panX, panY) => {
    const { map2d } = get();
    set({ map2d: { ...map2d, panX, panY } });
  },

  setMap2dScale: (scale) => {
    const { map2d } = get();
    set({ map2d: { ...map2d, scale: Math.min(map2d.maxScale, Math.max(map2d.minScale, scale)) } });
  },

  resetView: () => {
    const { is3D, sceneRef } = get();
    if (is3D) {
      sceneRef.current?.resetView();
    } else {
      get().resetMap2D();
    }
    get().clearSelection();
  },

  updateVisualsFromData: () => {
    const { planta, statusFilter, sceneRef } = get();
    if (!planta) return;
    sceneRef.current?.updateFromData();
    sceneRef.current?.applyStatusFilter(statusFilter, (id) => {
      const s = getSetor(planta, id);
      return s ? getSectorStatus(s) : 'offline';
    });
  },

  tickSimulator: () => {
    if (document.hidden) return;
    const { planta, simTick, selectedId } = get();
    if (!planta) return;
    const tick = simTick + 1;

    planta.setores.forEach((s) => {
      s.maquinas.forEach((m) => {
        if (m.status === 'offline' || m.status === 'manutencao') return;
        const h = seedHash(m.id + tick);
        m.kpis.oee = Math.min(99, Math.max(55, m.kpis.oee + ((h % 5) - 2)));
        m.kpis.temp = Math.min(65, Math.max(32, m.kpis.temp + ((h % 3) - 1)));
        m.kpis.rpm = Math.max(800, m.kpis.rpm + ((h % 7) - 3));
        m.oeeHistory.push(m.kpis.oee);
        if (m.oeeHistory.length > 12) m.oeeHistory.shift();
        if (m.kpis.temp > m.limits.tempMax && m.status === 'operando') {
          m.status = 'alerta';
          get().addAlert(
            'critico',
            `${m.id}: Temperatura ${m.kpis.temp}°C (limite ${m.limits.tempMax}°C)`,
            s.id,
            m.id
          );
        }
      });
      if (s.op && s.status === 'operando') {
        s.op.produzida = Math.min(s.op.planejada, s.op.produzida + 1 + (tick % 3));
      }
      if (s.manutencao && s.manutencao.minRestantes > 0 && tick % 2 === 0) {
        s.manutencao.minRestantes--;
      }
    });

    get().updateVisualsFromData();
    if (selectedId) set({ planta: { ...planta }, simTick: tick });
    else set({ planta: { ...planta }, simTick: tick });
  },

  startSimulator: () => {
    get().stopSimulator();
    const simInterval = setInterval(() => get().tickSimulator(), 4000);
    const clockInterval = setInterval(() => {
      const { planta } = get();
      if (!planta) return;
      planta.simTime.minute += 15;
      if (planta.simTime.minute >= 60) {
        planta.simTime.minute -= 60;
        planta.simTime.hour++;
      }
      if (planta.simTime.hour >= 24) planta.simTime.hour = 0;
      const h = planta.simTime.hour;
      if (h >= 6 && h < 14) planta.turnoAtual = 1;
      else if (h >= 14 && h < 22) planta.turnoAtual = 2;
      else planta.turnoAtual = 3;
      set({ planta: { ...planta } });
    }, 4000);
    set({ simInterval, clockInterval });
  },

  stopSimulator: () => {
    const { simInterval, clockInterval } = get();
    if (simInterval) clearInterval(simInterval);
    if (clockInterval) clearInterval(clockInterval);
    set({ simInterval: null, clockInterval: null });
  },
}));

export { STATUS_COLORS };
