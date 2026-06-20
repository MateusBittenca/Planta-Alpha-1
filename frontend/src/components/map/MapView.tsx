import { Viewport3D } from './Viewport3D';
import { Viewport2D } from './Viewport2D';
import { DetailPanel } from '../layout/DetailPanel';
import { usePlantaStore } from '../../store/plantaStore';

export function MapView() {
  const is3D = usePlantaStore((s) => s.is3D);
  const selectedId = usePlantaStore((s) => s.selectedId);
  const toggleView = usePlantaStore((s) => s.toggleView);
  const toggleMaterialFlow = usePlantaStore((s) => s.toggleMaterialFlow);
  const toggleHeatmap = usePlantaStore((s) => s.toggleHeatmap);
  const focusOnSelection = usePlantaStore((s) => s.focusOnSelection);
  const showHeatmap = usePlantaStore((s) => s.showHeatmap);

  return (
    <>
      <section className="flex-1 relative flex flex-col bg-surface-container-lowest border-r border-outline-variant overflow-hidden">
        <div className="p-4 flex justify-between items-center bg-white/80 backdrop-blur z-20 border-b border-outline-variant shrink-0">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              {is3D ? 'Visualizador 3D Alpha-1' : 'Plano de Chão 2D'}
            </h2>
            <p className="text-on-surface-variant font-label-md">
              {is3D
                ? 'Arrastar: orbitar · Botão direito: pan · Scroll: zoom · Duplo clique: centralizar'
                : 'Arraste · Scroll · Clique setores/máquinas'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-2 border border-outline-variant text-on-surface-variant font-label-md hover:bg-secondary-container/10 transition-all text-xs"
              onClick={toggleMaterialFlow}
            >
              <span className="material-symbols-outlined text-sm">route</span>
              <span>Fluxo</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-1 px-3 py-2 border text-on-surface-variant font-label-md hover:bg-secondary-container/10 transition-all text-xs ${showHeatmap ? 'border-primary' : 'border-outline-variant'}`}
              onClick={toggleHeatmap}
            >
              <span className="material-symbols-outlined text-sm">thermostat</span>
              <span>Heatmap</span>
            </button>
            {is3D && selectedId && (
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 border border-outline-variant text-on-surface-variant font-label-md hover:bg-secondary-container/10 transition-all text-xs"
                onClick={() => focusOnSelection()}
                title="Centralizar câmera no ativo selecionado"
              >
                <span className="material-symbols-outlined text-sm">center_focus_strong</span>
                <span>Centralizar</span>
              </button>
            )}
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 border border-primary text-primary font-label-md hover:bg-primary/5 transition-all"
              onClick={toggleView}
            >
              <span className="material-symbols-outlined text-sm">{is3D ? 'map' : 'view_in_ar'}</span>
              <span>{is3D ? 'Ver Plano 2D' : 'Ver Gêmeo 3D'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-[#f0f4f4]" id="map-viewport">
          <Viewport3D />
          <Viewport2D />

          <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur border border-outline-variant p-4 flex flex-col gap-3 z-20 rounded shadow-sm">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 border-b border-outline-variant pb-1">
              Status dos Ativos
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                ['#2e7d32', 'Operando'],
                ['#0288d1', 'Manut.'],
                ['#f84018', 'Alerta'],
                ['#757575', 'Offline'],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className="text-label-sm text-on-surface-variant">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <DetailPanel />
    </>
  );
}
