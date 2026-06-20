import { useEffect, useRef } from 'react';
import { formatSimTime, getTurnoLabel } from '../../utils/sectorStatus';
import { usePlantaStore } from '../../store/plantaStore';
import { useEditorStore } from '../../store/editorStore';

export function TopBar() {
  const planta = usePlantaStore((s) => s.planta)!;
  const alerts = usePlantaStore((s) => s.alerts);
  const selectedId = usePlantaStore((s) => s.selectedId);
  const selectedMachineId = usePlantaStore((s) => s.selectedMachineId);
  const setTurno = usePlantaStore((s) => s.setTurno);
  const openDrawer = usePlantaStore((s) => s.openDrawer);
  const searchAndSelect = usePlantaStore((s) => s.searchAndSelect);
  const clearSelection = usePlantaStore((s) => s.clearSelection);
  const selectZone = usePlantaStore((s) => s.selectZone);
  const closeAllOverlays = usePlantaStore((s) => s.closeAllOverlays);
  const appMode = useEditorStore((s) => s.appMode);
  const dirty = useEditorStore((s) => s.dirty);
  const setAppMode = useEditorStore((s) => s.setAppMode);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasAlerts = alerts.some((a) => a.severidade !== 'info');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') closeAllOverlays();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeAllOverlays]);

  return (
    <header className="bg-surface border-b border-outline-variant h-16 flex items-center px-margin-desktop justify-between z-30 shrink-0">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex items-center bg-surface-container rounded border border-outline-variant px-3 py-1.5 w-80 max-w-full">
          <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
          <input
            ref={inputRef}
            className="bg-transparent border-none focus:ring-0 text-label-md w-full placeholder:text-on-surface-variant outline-none"
            placeholder="Pesquisar máquinas, sensores ou setores..."
            type="text"
            autoComplete="off"
            onChange={(e) => searchAndSelect(e.target.value)}
          />
        </div>
        <p className="text-label-sm text-on-surface-variant hidden xl:block whitespace-nowrap">
          <button type="button" className="hover:text-primary" onClick={clearSelection}>
            {planta.nome}
          </button>
          {selectedId && (
            <>
              {' › '}
              <button type="button" className="hover:text-primary" onClick={() => selectZone(selectedId, null, { focusCamera: true })}>
                {planta.setores.find((s) => s.id === selectedId)?.name}
              </button>
            </>
          )}
          {selectedMachineId && <span className="text-primary font-bold"> › {selectedMachineId}</span>}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center border border-outline-variant rounded overflow-hidden">
          <button
            type="button"
            className={`text-[10px] px-3 py-1.5 font-bold uppercase ${appMode === 'operate' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-secondary-container/10'}`}
            onClick={() => void setAppMode('operate')}
          >
            Operar
          </button>
          <button
            type="button"
            className={`text-[10px] px-3 py-1.5 font-bold uppercase flex items-center gap-1 ${appMode === 'edit' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-secondary-container/10'}`}
            onClick={() => void setAppMode('edit')}
          >
            Editar layout
            {dirty && appMode === 'edit' && <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />}
          </button>
        </div>
        <div className="hidden md:flex items-center gap-1 border border-outline-variant rounded px-2 py-1">
          {([1, 2, 3] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`turno-btn text-[10px] px-2 py-1 rounded font-bold uppercase ${planta.turnoAtual === t ? 'bg-primary text-white' : ''}`}
              onClick={() => setTurno(t)}
            >
              {t}º
            </button>
          ))}
        </div>
        <div className="text-right hidden lg:block">
          <p className="text-label-sm font-bold text-on-surface">{formatSimTime(planta)}</p>
          <p className="text-[10px] text-on-surface-variant">{getTurnoLabel(planta.turnoAtual)}</p>
        </div>
        <button
          type="button"
          className="p-2 text-on-surface-variant hover:bg-secondary-container/10 transition-colors rounded-full relative"
          onClick={() => openDrawer('alerts')}
          aria-label="Notificações"
        >
          <span className="material-symbols-outlined">notifications</span>
          {hasAlerts && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white status-pulse-red" />
          )}
        </button>
        <div className="h-8 w-[1px] bg-outline-variant mx-2" />
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="text-right hidden lg:block">
            <p className="text-label-md font-bold text-on-surface">Mateus Bittencourt</p>
            <p className="text-[10px] text-on-surface-variant font-label-md">Gerente de Operações</p>
          </div>
          <img
            className="w-10 h-10 rounded-full border border-outline-variant object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtzK3UyiDaodadpTtGxZhxhnrMmJU0Ae1GtsfJPgBUDo_RYHkhDz5oiDIKnNZcxD2dK--wAD8zCiCF7nXgYdCBRgSxs9a1QgzfBEesPg_lquVBrN1fDN6mLv0C8VGdAHwjD25WZCLkGrL7qJId_R-ZRcw1cA4vZlAtuNbWXfPSOhlqrzBu5Xnd_2oSb2VT4VXS5MOrexJ-VDxo-o4y9ojufEJR5nmtzy01bkc59AZYU3LxY3d_aFtky251J4m-YoOtKx4Uk_ptpE8"
            alt="Avatar"
          />
        </div>
      </div>
    </header>
  );
}
