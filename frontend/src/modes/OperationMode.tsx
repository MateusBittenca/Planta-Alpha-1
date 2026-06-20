import { usePlantaStore } from '../store/plantaStore';
import { DashboardView } from '../components/dashboard/DashboardView';
import { MapView } from '../components/map/MapView';

export function OperationMode() {
  const mainView = usePlantaStore((s) => s.mainView);

  return (
    <>
      <section
        className={`flex-1 overflow-y-auto p-6 bg-surface-container-lowest view-dashboard ${mainView === 'dashboard' ? 'active' : ''}`}
        id="view-dashboard"
      >
        <DashboardView />
      </section>
      <div className={`flex flex-1 overflow-hidden view-mapa ${mainView !== 'mapa' ? 'hidden-view' : ''}`} id="view-mapa">
        <MapView />
      </div>
    </>
  );
}
