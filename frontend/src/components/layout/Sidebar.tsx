import { STATUS_COLORS } from '../../utils/colors';
import { getSectorStatus } from '../../utils/sectorStatus';
import { usePlantaStore } from '../../store/plantaStore';
import type { StatusAtivo } from '@sgm/shared';

const FILTERS: Array<{ id: StatusAtivo | 'todos'; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'operando', label: 'Operando' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'alerta', label: 'Alerta' },
  { id: 'offline', label: 'Offline' },
];

export function Sidebar() {
  const planta = usePlantaStore((s) => s.planta)!;
  const mainView = usePlantaStore((s) => s.mainView);
  const statusFilter = usePlantaStore((s) => s.statusFilter);
  const selectedId = usePlantaStore((s) => s.selectedId);
  const selectedMachineId = usePlantaStore((s) => s.selectedMachineId);
  const alerts = usePlantaStore((s) => s.alerts);
  const setMainView = usePlantaStore((s) => s.setMainView);
  const setStatusFilter = usePlantaStore((s) => s.setStatusFilter);
  const selectZone = usePlantaStore((s) => s.selectZone);
  const openDrawer = usePlantaStore((s) => s.openDrawer);

  const alertCount = alerts.filter((a) => a.severidade !== 'info').length;

  const sector = selectedId ? planta.setores.find((s) => s.id === selectedId) : null;
  const machine = sector && selectedMachineId ? sector.maquinas.find((m) => m.id === selectedMachineId) : null;

  return (
    <nav className="fixed left-0 top-0 h-full flex flex-col z-40 bg-surface-container-low border-r border-outline-variant w-72 transition-all duration-200 app-nav">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary flex items-center justify-center rounded">
          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            precision_manufacturing
          </span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface leading-tight">SGM Industrial</h1>
          <p className="text-on-surface-variant font-label-md">Planta Alpha-1</p>
        </div>
      </div>

      <div className="flex-1 px-4 mt-2 overflow-y-auto space-y-6">
        <div className="space-y-1">
          <button
            type="button"
            className={`nav-link w-full flex items-center gap-4 px-4 py-3 text-on-surface-variant font-label-md hover:bg-secondary-container/10 transition-all rounded cursor-pointer ${mainView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setMainView('dashboard')}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`nav-link w-full flex items-center gap-4 px-4 py-3 font-label-md transition-all rounded cursor-pointer ${mainView === 'mapa' ? 'active' : ''}`}
            onClick={() => setMainView('mapa')}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              map
            </span>
            <span>Mapa da Planta</span>
          </button>
        </div>

        <div>
          <h3 className="px-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Filtros</h3>
          <div className="px-2 flex flex-wrap gap-1 mb-3">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter-chip text-[10px] px-2 py-1 border border-outline-variant rounded uppercase ${statusFilter === f.id ? 'active font-bold' : ''}`}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <h3 className="px-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
            Setores de Produção
          </h3>
          <div className="space-y-1">
            {planta.setores.map((s) => {
              const st = getSectorStatus(s);
              const match = statusFilter === 'todos' || st === statusFilter;
              if (!match) return null;
              const pulse = st === 'alerta' ? 'status-pulse-red' : '';
              return (
                <button
                  key={s.id}
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container rounded transition-colors group sector-nav-btn"
                  onClick={() => selectZone(s.id, null, { focusCamera: true })}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${pulse}`} style={{ background: STATUS_COLORS[st] }} />
                    {s.name}
                  </span>
                  <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100">chevron_right</span>
                </button>
              );
            })}
          </div>
        </div>

        {(selectedId || selectedMachineId) && (
          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            <h3 className="px-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Telemetria de Ativo
            </h3>
            <div className="px-4 py-4 bg-surface-container-highest/30 rounded-lg border border-outline-variant space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-on-surface-variant">Temperatura</span>
                <span className="text-label-md font-bold text-on-surface">
                  {machine ? `${machine.kpis.temp}°C` : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-on-surface-variant">Turno Atual</span>
                <span className="text-label-md font-bold text-on-surface">
                  {['1º Turno', '2º Turno', '3º Turno'][planta.turnoAtual - 1]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-on-surface-variant">OEE / Yield</span>
                <span className="text-label-md font-bold text-on-surface">
                  {machine ? `${machine.kpis.oee}%` : sector?.kpis.oee ? `${sector.kpis.oee}%` : '--'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-on-surface-variant uppercase font-bold">
                  <span>Status Operacional</span>
                </div>
                <p className="text-label-sm text-primary font-bold">
                  {machine
                    ? `${machine.kpis.rpm} RPM · ${machine.opAtiva || 'Sem OP'}`
                    : String(sector?.kpis.status_operacional ?? '—')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-outline-variant">
        <button
          type="button"
          className="w-full bg-primary text-white font-label-md py-3 rounded hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          onClick={() => openDrawer('alerts')}
          aria-label="Centro de Alertas"
        >
          <span className="material-symbols-outlined text-sm">notifications_active</span>
          Centro de Alertas{' '}
          <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{alertCount}</span>
        </button>
      </div>
    </nav>
  );
}
