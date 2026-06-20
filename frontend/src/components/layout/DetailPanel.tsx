import { useEffect, useRef } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';
import { STATUS_LABELS } from '../../utils/colors';
import { getMachine, getSectorStatus, getTurnoLabel } from '../../utils/sectorStatus';
import { usePlantaStore } from '../../store/plantaStore';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale);

export function DetailPanel() {
  const planta = usePlantaStore((s) => s.planta)!;
  const selectedId = usePlantaStore((s) => s.selectedId);
  const selectedMachineId = usePlantaStore((s) => s.selectedMachineId);
  const openDrawer = usePlantaStore((s) => s.openDrawer);
  const openOccurrenceModal = usePlantaStore((s) => s.openOccurrenceModal);
  const triggerAndon = usePlantaStore((s) => s.triggerAndon);
  const sparkRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const sector = selectedId ? planta.setores.find((s) => s.id === selectedId) : null;
  const machine = sector && selectedMachineId && selectedId ? getMachine(planta, selectedId, selectedMachineId) : null;
  const st = sector ? getSectorStatus(sector) : 'offline';
  const statusKey = machine ? machine.status : st;
  const oee = machine ? machine.kpis.oee : (sector?.kpis.oee ?? 99.4);
  const oeeNum = typeof oee === 'number' ? oee : parseFloat(String(oee));

  useEffect(() => {
    const ctx = sparkRef.current;
    if (!ctx || !selectedId) return;
    const hist =
      machine?.oeeHistory ??
      sector?.maquinas[0]?.oeeHistory ??
      [80, 82, 85, 84, 86, 88, 87, 89, 90, 88, 91, 89];
    chartRef.current?.destroy();
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hist.map((_, i) => i),
        datasets: [{ data: hist, borderColor: '#b32200', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false, min: 50, max: 100 } },
      },
    });
    return () => chartRef.current?.destroy();
  }, [selectedId, selectedMachineId, machine, sector, planta]);

  if (!selectedId || !sector) {
    return (
      <aside className="w-[320px] bg-surface flex flex-col border-l border-outline-variant overflow-y-auto shrink-0 detail-panel">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6">
          <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mb-6 border border-outline-variant">
            <span className="material-symbols-outlined text-outline text-3xl">touch_app</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Selecione um Ativo</h3>
          <p className="text-on-surface-variant font-body-md mt-2">
            Clique em um setor ou máquina específica no gêmeo 3D para visualizar métricas em tempo real.
          </p>
        </div>
      </aside>
    );
  }

  const isOperando = statusKey === 'operando';

  return (
    <aside className="w-[320px] bg-surface flex flex-col border-l border-outline-variant overflow-y-auto shrink-0 detail-panel">
      <div className="animate-in slide-in-from-right-4 fade-in duration-300 p-8">
        <div className="mb-8">
          <span className="text-label-sm text-primary uppercase tracking-widest block mb-1 font-bold">
            {machine ? 'MÁQUINA INDIVIDUAL' : sector.type.toUpperCase()}
          </span>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">{machine ? machine.id : sector.name}</h2>
          <div
            className={`mt-3 px-3 py-1 inline-block border text-label-sm font-bold uppercase ${
              isOperando ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800'
            }`}
          >
            {(STATUS_LABELS[statusKey as keyof typeof STATUS_LABELS] ?? statusKey).toUpperCase()}
          </div>
        </div>

        {machine && (
          <div className="space-y-6 mb-8">
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg machine-card-active">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-primary">settings_suggest</span>
                <h4 className="font-bold text-on-surface">{machine.name}</h4>
              </div>
              <p className="text-label-sm text-on-surface-variant">Unidade de Processamento Selecionada</p>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <div className="p-4 border border-outline-variant bg-white shadow-sm rounded">
            <div className="flex justify-between items-end mb-2">
              <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">
                {machine ? 'OEE Ativo' : sector.type === 'qualidade' ? 'Yield' : 'OEE Setor'}
              </p>
              <p className="text-headline-md font-bold text-on-surface">{typeof oee === 'number' ? `${oee}%` : String(oee)}</p>
            </div>
            <div className="w-full bg-outline-variant h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${oeeNum}%` }} />
            </div>
            <div className="sparkline-wrap">
              <canvas ref={sparkRef} />
            </div>
          </div>

          {sector.op && !machine && (
            <div className="p-4 border border-outline-variant bg-white shadow-sm rounded">
              <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider mb-2">
                Ordem de Produção
              </p>
              <p className="font-bold text-on-surface">{sector.op.id}</p>
              <p className="text-label-sm text-on-surface-variant mt-1">{sector.op.produto}</p>
              <div className="flex justify-between text-label-sm mt-2">
                <span>
                  {sector.op.produzida} / {sector.op.planejada}
                </span>
                <span>ETA {sector.op.eta}</span>
              </div>
              <div className="w-full bg-outline-variant h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-tertiary h-full transition-all"
                  style={{ width: `${(sector.op.produzida / sector.op.planejada) * 100}%` }}
                />
              </div>
            </div>
          )}

          {sector.manutencao && !machine && (
            <div className="p-4 border border-blue-200 bg-blue-50/50 shadow-sm rounded">
              <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider mb-2">Manutenção</p>
              <p className="text-label-sm">
                <strong>Técnico:</strong> {sector.manutencao.tecnico}
              </p>
              <p className="text-label-sm mt-1">
                <strong>Restante:</strong> {sector.manutencao.minRestantes} min
              </p>
              <ul className="text-label-sm mt-2 list-disc pl-4 text-on-surface-variant">
                {sector.manutencao.checklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-2">Andon Digital</p>
            <div className="flex gap-1">
              {(['parada', 'qualidade', 'material', 'manutencao'] as const).map((tipo) => (
                <button key={tipo} type="button" className="andon-btn" onClick={() => void triggerAndon(tipo)}>
                  {tipo === 'parada' ? 'Parada' : tipo === 'qualidade' ? 'Qualidade' : tipo === 'material' ? 'Material' : 'Manutenção'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-outline-variant bg-white shadow-sm rounded">
              <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">
                {machine ? 'Temperatura' : 'Pessoal / Temp'}
              </p>
              <p className="text-headline-md font-bold text-on-surface mt-1">
                {machine ? `${machine.kpis.temp}°C` : String(sector.kpis.headcount)}
              </p>
            </div>
            <div className="p-4 border border-outline-variant bg-white shadow-sm rounded">
              <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">Turno</p>
              <p className="text-label-md font-bold text-on-surface mt-2">{getTurnoLabel(planta.turnoAtual)}</p>
            </div>
          </div>

          <div className="p-4 border border-outline-variant bg-white shadow-sm rounded">
            <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider mb-2">
              Resumo de Atividade
            </p>
            <p className="text-label-sm text-on-surface-variant leading-relaxed">{sector.description}</p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-outline-variant">
          <button
            type="button"
            className="w-full py-3 bg-on-surface text-white font-label-md hover:bg-on-surface/90 transition-all rounded shadow-sm flex items-center justify-center gap-2"
            onClick={() => openDrawer('analysis')}
          >
            <span className="material-symbols-outlined text-sm">analytics</span>
            Análise Profunda
          </button>
          <button
            type="button"
            className="w-full py-3 border border-outline text-on-surface font-label-md hover:bg-secondary-container/10 transition-all rounded"
            onClick={openOccurrenceModal}
          >
            Registrar Ocorrência
          </button>
        </div>
      </div>
    </aside>
  );
}
