import { getMachine } from '../../utils/sectorStatus';
import { usePlantaStore } from '../../store/plantaStore';

export function AnalysisDrawer() {
  const drawer = usePlantaStore((s) => s.drawer);
  const planta = usePlantaStore((s) => s.planta);
  const selectedId = usePlantaStore((s) => s.selectedId);
  const selectedMachineId = usePlantaStore((s) => s.selectedMachineId);
  const closeDrawer = usePlantaStore((s) => s.closeDrawer);

  const open = drawer === 'analysis';

  if (!planta || !selectedId) {
    return (
      <div className={`drawer ${open ? 'open' : ''}`} id="drawer-analysis" role="dialog" aria-label="Análise Profunda">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center sticky top-0 bg-surface z-10">
          <h2 className="font-headline-md font-bold">Análise Profunda</h2>
          <button type="button" onClick={() => closeDrawer()} aria-label="Fechar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="p-6 text-on-surface-variant text-sm">Selecione um ativo para ver a análise.</p>
      </div>
    );
  }

  const sector = planta.setores.find((s) => s.id === selectedId);
  const machine = selectedMachineId ? getMachine(planta, selectedId, selectedMachineId) : null;
  const oee = machine ? machine.kpis.oee : (sector?.kpis.oee ?? 85);
  const oeeNum = typeof oee === 'number' ? oee : 85;
  const d = Math.round(oeeNum * 0.96);
  const p = Math.min(99, Math.round(oeeNum * 1.02));
  const q = Math.round(oeeNum * 0.98);
  const causes = [
    ['Troca de bico', 28],
    ['Falta material', 22],
    ['Ajuste qualidade', 18],
    ['Calibração', 14],
    ['Outros', 10],
  ];
  const maintHistory = ['12/06 — Preventiva bicos', '05/06 — Calibração visão', '28/05 — Troca filtros'];

  return (
    <div className={`drawer ${open ? 'open' : ''}`} id="drawer-analysis" role="dialog" aria-label="Análise Profunda">
      <div className="p-6 border-b border-outline-variant flex justify-between items-center sticky top-0 bg-surface z-10">
        <h2 className="font-headline-md font-bold">Análise Profunda</h2>
        <button type="button" onClick={() => closeDrawer()} aria-label="Fechar">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <p className="text-label-sm font-bold uppercase text-on-surface-variant mb-2">OEE Breakdown</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Disponib.', d],
              ['Perform.', p],
              ['Qualidade', q],
            ].map(([label, val]) => (
              <div key={label} className="p-3 bg-surface-container rounded border border-outline-variant">
                <p className="text-[10px] uppercase font-bold text-on-surface-variant">{label}</p>
                <p className="text-headline-md font-bold">{val}%</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-label-sm font-bold uppercase text-on-surface-variant mb-2">Top Causas de Parada</p>
          <div className="space-y-2">
            {causes.map(([c, v]) => (
              <div key={c}>
                <div className="flex justify-between text-label-sm mb-1">
                  <span>{c}</span>
                  <span>{v}%</span>
                </div>
                <div className="h-2 bg-outline-variant rounded">
                  <div className="h-full bg-primary rounded" style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-label-sm font-bold uppercase text-on-surface-variant mb-2">Histórico Manutenção</p>
          <ul className="text-label-sm space-y-1 text-on-surface-variant">
            {maintHistory.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
