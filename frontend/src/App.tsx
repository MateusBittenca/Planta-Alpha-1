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
