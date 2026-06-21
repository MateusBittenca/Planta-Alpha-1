import { usePlantaStore } from './store/plantaStore';
import { useEditorStore } from './store/editorStore';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AlertsDrawer } from './components/drawers/AlertsDrawer';
import { AnalysisDrawer } from './components/drawers/AnalysisDrawer';
import { OccurrenceModal } from './components/modals/OccurrenceModal';
import { TooltipFloating } from './components/TooltipFloating';
import { OperationMode } from './modes/OperationMode';
import { EditorMode } from './modes/EditorMode';

export default function App() {
  const ready = usePlantaStore((s) => s.ready);
  const planta = usePlantaStore((s) => s.planta);
  const loadError = usePlantaStore((s) => s.loadError);
  const retryBootstrap = usePlantaStore((s) => s.retryBootstrap);
  const overlayOpen = usePlantaStore((s) => s.overlayOpen);
  const closeAllOverlays = usePlantaStore((s) => s.closeAllOverlays);
  const appMode = useEditorStore((s) => s.appMode);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-primary animate-pulse">precision_manufacturing</span>
          <p className="mt-4 font-label-md text-on-surface-variant">Carregando Planta Alpha-1…</p>
        </div>
      </div>
    );
  }

  if (!planta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface p-6">
        <div className="max-w-md text-center">
          <span className="material-symbols-outlined text-5xl text-primary">cloud_off</span>
          <h1 className="mt-4 font-headline-md text-on-surface">Planta indisponível</h1>
          <p className="mt-2 text-label-md text-on-surface-variant">{loadError}</p>
          <p className="mt-4 text-label-sm text-on-surface-variant">
            Inicie o backend e o banco de dados na raiz do projeto:{' '}
            <code className="text-xs bg-surface-container px-1 py-0.5 rounded">npm run dev</code>
          </p>
          <button
            type="button"
            className="mt-6 px-5 py-2.5 bg-primary text-white rounded font-bold text-sm hover:opacity-90 transition-opacity"
            onClick={() => void retryBootstrap()}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-72 flex flex-col h-screen overflow-hidden app-main">
        <TopBar />
        <div className="flex flex-1 overflow-hidden relative">
          {appMode === 'operate' ? <OperationMode /> : <EditorMode />}
        </div>
      </main>
      <div
        className={`overlay-backdrop ${overlayOpen ? 'open' : ''}`}
        onClick={closeAllOverlays}
        role="presentation"
      />
      <AlertsDrawer />
      <AnalysisDrawer />
      <OccurrenceModal />
      <TooltipFloating />
    </div>
  );
}
