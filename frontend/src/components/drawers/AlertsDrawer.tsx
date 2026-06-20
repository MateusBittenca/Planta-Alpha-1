import { usePlantaStore } from '../../store/plantaStore';

export function AlertsDrawer() {
  const drawer = usePlantaStore((s) => s.drawer);
  const alerts = usePlantaStore((s) => s.alerts);
  const closeDrawer = usePlantaStore((s) => s.closeDrawer);
  const navigateAlert = usePlantaStore((s) => s.navigateAlert);

  const open = drawer === 'alerts';

  return (
    <div className={`drawer ${open ? 'open' : ''}`} id="drawer-alerts" role="dialog" aria-label="Centro de Alertas">
      <div className="p-6 border-b border-outline-variant flex justify-between items-center sticky top-0 bg-surface z-10">
        <h2 className="font-headline-md font-bold">Centro de Alertas</h2>
        <button type="button" onClick={() => closeDrawer()} aria-label="Fechar">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="p-4 space-y-3">
        {alerts.length ? (
          alerts.map((a) => (
            <div
              key={a.id}
              className={`alert-item alert-${a.severidade}`}
              onClick={() => navigateAlert(a.sectorId ?? '', a.machineId)}
              onKeyDown={(e) => e.key === 'Enter' && navigateAlert(a.sectorId ?? '', a.machineId)}
              role="button"
              tabIndex={0}
            >
              <p className="text-[10px] text-on-surface-variant uppercase font-bold">
                {a.time} · {a.severidade}
              </p>
              <p className="text-label-sm font-bold mt-1">{a.msg}</p>
            </div>
          ))
        ) : (
          <p className="text-on-surface-variant text-sm px-2">Nenhum alerta ativo.</p>
        )}
      </div>
    </div>
  );
}
