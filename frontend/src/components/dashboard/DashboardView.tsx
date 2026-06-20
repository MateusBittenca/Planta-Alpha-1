import { useEffect, useRef } from 'react';
import { Chart, BarController, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { getSectorStatus } from '../../utils/sectorStatus';
import { usePlantaStore } from '../../store/plantaStore';

Chart.register(BarController, BarElement, CategoryScale, LinearScale);

export function DashboardView() {
  const planta = usePlantaStore((s) => s.planta)!;
  const alerts = usePlantaStore((s) => s.alerts);
  const eventLog = usePlantaStore((s) => s.eventLog);
  const useMock = usePlantaStore((s) => s.useMock);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const oees = planta.setores.filter((s) => s.kpis.oee != null).map((s) => s.kpis.oee as number);
  const globalOee = oees.length ? Math.round((oees.reduce((a, b) => a + b, 0) / oees.length) * 10) / 10 : 0;
  const operandoCount = planta.setores.filter((s) => getSectorStatus(s) === 'operando').length;
  let alertMachineCount = 0;
  planta.setores.forEach((s) => s.maquinas.forEach((m) => { if (m.status === 'alerta') alertMachineCount++; }));
  const alertCount = alerts.filter((a) => a.severidade !== 'info').length;
  const sorted = [...planta.setores]
    .filter((s) => s.kpis.oee != null)
    .sort((a, b) => (a.kpis.oee as number) - (b.kpis.oee as number))
    .slice(0, 3);

  const timeline = useMock
    ? [
        ...eventLog,
        ...JSON.parse(localStorage.getItem('sgm_occurrences') || '[]').map(
          (o: { desc: string; time: string }) => ({ type: 'ocorrencia', text: o.desc, time: o.time })
        ),
      ].slice(0, 15)
    : eventLog.slice(0, 15);

  useEffect(() => {
    const ctx = chartRef.current;
    if (!ctx) return;
    const turnoData = [78 + planta.turnoAtual * 3, 82 + planta.turnoAtual * 2, 85 + planta.turnoAtual, 88];
    chartInstance.current?.destroy();
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['1º Turno', '2º Turno', '3º Turno', 'Meta'],
        datasets: [{ data: turnoData, backgroundColor: ['#cde8e6', '#b32200', '#cde8e6', '#0288d1'] }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: false, min: 60, max: 100 } },
      },
    });
    return () => chartInstance.current?.destroy();
  }, [planta.turnoAtual]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="p-5 bg-white border border-outline-variant rounded-lg shadow-sm">
          <p className="text-label-sm text-on-surface-variant uppercase font-bold">OEE Global</p>
          <p className="text-headline-lg font-bold text-primary mt-1">{globalOee}%</p>
        </div>
        <div className="p-5 bg-white border border-outline-variant rounded-lg shadow-sm">
          <p className="text-label-sm text-on-surface-variant uppercase font-bold">Alertas Abertos</p>
          <p className="text-headline-lg font-bold text-on-surface mt-1">{alertCount}</p>
        </div>
        <div className="p-5 bg-white border border-outline-variant rounded-lg shadow-sm">
          <p className="text-label-sm text-on-surface-variant uppercase font-bold">Setores Operando</p>
          <p className="text-headline-lg font-bold text-green-700 mt-1">
            {operandoCount}/{planta.setores.length}
          </p>
        </div>
        <div className="p-5 bg-white border border-outline-variant rounded-lg shadow-sm">
          <p className="text-label-sm text-on-surface-variant uppercase font-bold">Máquinas em Alerta</p>
          <p className="text-headline-lg font-bold text-primary mt-1">{alertMachineCount}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-5 bg-white border border-outline-variant rounded-lg shadow-sm">
          <h3 className="font-bold text-on-surface mb-4">Produção por Turno</h3>
          <canvas ref={chartRef} height={200} />
        </div>
        <div className="p-5 bg-white border border-outline-variant rounded-lg shadow-sm">
          <h3 className="font-bold text-on-surface mb-4">Setores Críticos (OEE)</h3>
          <div className="space-y-3">
            {sorted.map((s) => (
              <div key={s.id} className="flex justify-between items-center">
                <span className="font-bold">{s.name}</span>
                <span className="text-primary font-bold">{String(s.kpis.oee)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="p-5 bg-white border border-outline-variant rounded-lg shadow-sm">
        <h3 className="font-bold text-on-surface mb-4">Timeline de Eventos</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {timeline.length ? (
            timeline.map((e, i) => (
              <div key={i} className="flex gap-3 text-label-sm py-2 border-b border-outline-variant">
                <span className="text-on-surface-variant shrink-0">{e.time}</span>
                <span>{e.text}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-on-surface-variant">Sem eventos.</p>
          )}
        </div>
      </div>
    </>
  );
}
