import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { buildScene3D } from '../../scenes/buildScene3D';
import { usePlantaStore, layoutFingerprint } from '../../store/plantaStore';
import type { Scene3DRef } from '../../store/plantaStore';

export function Viewport3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<(Scene3DRef & { dispose: () => void }) | null>(null);
  const layoutFpRef = useRef<string | null>(null);
  const planta = usePlantaStore((s) => s.planta);
  const plantaId = planta?.id ?? null;
  const selectZone = usePlantaStore((s) => s.selectZone);
  const setSceneRef = usePlantaStore((s) => s.setSceneRef);
  const is3D = usePlantaStore((s) => s.is3D);
  const [webglError, setWebglError] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);

  const selectZoneRef = useRef(selectZone);
  selectZoneRef.current = selectZone;

  const showTooltip = useCallback((m: { id: string; kpis: { oee: number }; status: string }) => {
    setTooltip({
      x: 0,
      y: 0,
      html: `<strong>${m.id}</strong> · OEE ${m.kpis.oee}%`,
    });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  const disposeScene = useCallback(() => {
    sceneRef.current?.dispose();
    sceneRef.current = null;
    layoutFpRef.current = null;
    setSceneRef(null);
  }, [setSceneRef]);

  const tryMountScene = useCallback(() => {
    const el = containerRef.current;
    const currentPlanta = usePlantaStore.getState().planta;
    if (!el || !currentPlanta || sceneRef.current) return false;
    if (el.clientWidth < 1 || el.clientHeight < 1) return false;

    try {
      const scene = buildScene3D(
        el,
        currentPlanta,
        (sectorId, machineId) => selectZoneRef.current(sectorId, machineId),
        showTooltip,
        hideTooltip
      );
      sceneRef.current = scene;
      layoutFpRef.current = layoutFingerprint(currentPlanta);
      setSceneRef(scene);
      scene.setActive(is3D && !document.hidden);
      setWebglError(false);
      return true;
    } catch (err) {
      console.error('Falha ao inicializar WebGL/Three.js:', err);
      setWebglError(true);
      return false;
    }
  }, [setSceneRef, showTooltip, hideTooltip, is3D]);

  // Monta uma vez por planta — nunca remonta em tick do simulador
  useLayoutEffect(() => {
    if (!plantaId) return;

    if (tryMountScene()) {
      return () => disposeScene();
    }

    const el = containerRef.current;
    if (!el) return () => disposeScene();

    const observer = new ResizeObserver(() => {
      if (!sceneRef.current) tryMountScene();
    });
    observer.observe(el);

    const raf = requestAnimationFrame(() => {
      if (!sceneRef.current) tryMountScene();
    });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      disposeScene();
    };
  }, [plantaId, tryMountScene, disposeScene]);

  // KPI/status vs layout
  useEffect(() => {
    if (!planta || !sceneRef.current) return;
    const fp = layoutFingerprint(planta);
    if (fp !== layoutFpRef.current) {
      layoutFpRef.current = fp;
      sceneRef.current.setPlanta(planta);
      return;
    }
    sceneRef.current.updateFromData();
  }, [planta]);

  useEffect(() => {
    sceneRef.current?.setActive(is3D && !document.hidden);
  }, [is3D]);

  useEffect(() => {
    const onVisibility = () => {
      sceneRef.current?.setActive(is3D && !document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [is3D]);

  const selectedId = usePlantaStore((s) => s.selectedId);
  useEffect(() => {
    sceneRef.current?.applyIsolation(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (tooltip) setTooltip((t) => (t ? { ...t, x: e.clientX + 12, y: e.clientY + 12 } : null));
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [tooltip]);

  return (
    <div className={`absolute inset-0 w-full h-full ${is3D ? 'view-active' : 'view-hidden view-layer'}`} id="view-3d">
      <div className="absolute inset-0 w-full h-full" ref={containerRef} />
      {webglError && is3D && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f0f4f4] z-20 p-6 text-center">
          <div>
            <span className="material-symbols-outlined text-4xl text-primary">view_in_ar</span>
            <p className="mt-3 font-label-md text-on-surface">Não foi possível iniciar o visualizador 3D.</p>
            <p className="text-label-sm text-on-surface-variant mt-1">
              Verifique se a aceleração de hardware/WebGL está ativa no navegador.
            </p>
          </div>
        </div>
      )}
      {is3D && (
        <button
          type="button"
          className="absolute bottom-8 right-8 bg-surface-container-highest border border-outline-variant p-3 rounded-full shadow-lg hover:bg-primary hover:text-white transition-all group z-30 flex items-center gap-2"
          onClick={() => usePlantaStore.getState().resetView()}
        >
          <span className="material-symbols-outlined text-xl">recenter</span>
          <span className="text-label-sm font-bold opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-[100px] overflow-hidden transition-all whitespace-nowrap">
            Resetar Vista
          </span>
        </button>
      )}
      {tooltip && (
        <div
          className="tooltip-floating visible bg-white border border-outline-variant rounded shadow-lg p-3 text-label-sm"
          style={{ left: tooltip.x, top: tooltip.y }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}
    </div>
  );
}
