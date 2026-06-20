import { useCallback, useEffect, useRef } from 'react';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/colors';
import { getSectorStatus } from '../../utils/sectorStatus';
import { FLOW_PATHS, oeeHeatColor, usePlantaStore } from '../../store/plantaStore';

export function Viewport2D() {
  const planta = usePlantaStore((s) => s.planta)!;
  const is3D = usePlantaStore((s) => s.is3D);
  const showFlow = usePlantaStore((s) => s.showFlow);
  const showHeatmap = usePlantaStore((s) => s.showHeatmap);
  const statusFilter = usePlantaStore((s) => s.statusFilter);
  const selectedId = usePlantaStore((s) => s.selectedId);
  const selectedMachineId = usePlantaStore((s) => s.selectedMachineId);
  const map2d = usePlantaStore((s) => s.map2d);
  const selectZone = usePlantaStore((s) => s.selectZone);
  const setMap2dPan = usePlantaStore((s) => s.setMap2dPan);
  const setMap2dScale = usePlantaStore((s) => s.setMap2dScale);
  const zoomMap2D = usePlantaStore((s) => s.zoomMap2D);
  const resetMap2D = usePlantaStore((s) => s.resetMap2D);

  const areaRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const minimapVpRef = useRef<HTMLDivElement>(null);
  const panning = useRef({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const updateMinimap = useCallback(() => {
    const vp = minimapVpRef.current;
    if (!vp) return;
    const sw = 140 / map2d.scale;
    const sh = 98 / map2d.scale;
    const sx = Math.max(0, Math.min(140 - sw, 70 - map2d.panX / 8 - sw / 2));
    const sy = Math.max(0, Math.min(98 - sh, 49 - map2d.panY / 8 - sh / 2));
    vp.style.cssText = `left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px;`;
  }, [map2d]);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.style.transform = `translate(${map2d.panX}px, ${map2d.panY}px) scale(${map2d.scale})`;
      updateMinimap();
    }
  }, [map2d, updateMinimap]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area || is3D) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setMap2dScale(map2d.scale * factor);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      panning.current = {
        active: true,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
        originX: map2d.panX,
        originY: map2d.panY,
      };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!panning.current.active) return;
      const dx = e.clientX - panning.current.startX;
      const dy = e.clientY - panning.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        panning.current.moved = true;
        area.classList.add('is-panning');
      }
      if (!panning.current.moved) return;
      setMap2dPan(panning.current.originX + dx, panning.current.originY + dy);
    };

    const onMouseUp = () => {
      if (panning.current.active) {
        panning.current.active = false;
        area.classList.remove('is-panning');
      }
    };

    area.addEventListener('wheel', onWheel, { passive: false });
    area.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      area.removeEventListener('wheel', onWheel);
      area.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [is3D, map2d.panX, map2d.panY, map2d.scale, setMap2dPan, setMap2dScale]);

  const handleZoneClick = (sectorId: string, machineId?: string) => {
    if (panning.current.moved) {
      panning.current.moved = false;
      return;
    }
    selectZone(sectorId, machineId);
  };

  return (
    <div className={`absolute inset-0 w-full h-full ${!is3D ? 'view-active' : 'view-hidden view-layer'}`} id="view-2d">
      <div className="w-full h-full map-container" ref={areaRef} id="pan-zoom-area">
        <div className="map-transform-layer" ref={layerRef}>
          <svg className="plant-svg" viewBox="0 0 1200 750" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern height="40" id="grid" patternUnits="userSpaceOnUse" width="40">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="1" />
              </pattern>
              <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#b32200" />
              </marker>
            </defs>
            <rect fill="url(#grid)" height="100%" width="100%" />
            <g id="flow-layer">
              {FLOW_PATHS.map((d) => (
                <path
                  key={d}
                  d={d}
                  className={`flow-arrow ${!showFlow ? 'hidden-flow' : ''}`}
                  markerEnd="url(#arrowhead)"
                />
              ))}
            </g>
            <g id="zones-layer">
              {planta.setores.map((s) => {
                const st = getSectorStatus(s);
                const match = statusFilter === 'todos' || st === statusFilter;
                const l = s.layout2d;
                const rows = Math.ceil(Math.sqrt(s.maquinas.length));
                const cols = Math.ceil(s.maquinas.length / rows);
                const pad = 14;
                const cw = (l.w - pad * 2) / cols;
                const ch = (l.h - pad * 2 - 20) / rows;
                const isActive = selectedId === s.id;
                return (
                  <g
                    key={s.id}
                    className={`zone-path zone-status-${st} ${!match ? 'zone-filtered-out' : ''} ${isActive ? 'zone-active' : ''} ${showHeatmap ? 'zone-heatmap' : ''}`}
                    id={`zone-${s.id}`}
                    data-zone={s.id}
                    onClick={() => handleZoneClick(s.id)}
                  >
                    <rect
                      x={l.x}
                      y={l.y}
                      width={l.w}
                      height={l.h}
                      rx="4"
                      fill={showHeatmap && s.kpis.oee != null ? oeeHeatColor(s.kpis.oee as number) : undefined}
                    />
                    <text
                      x={l.x + 10}
                      y={l.y + 22}
                      className="pointer-events-none"
                      style={{ fontSize: '11px', fontWeight: 700, fill: '#5d4039' }}
                    >
                      {s.name.toUpperCase()}
                    </text>
                    {s.maquinas.map((m, i) => {
                      const r = Math.floor(i / cols);
                      const c = i % cols;
                      const cx = l.x + pad + c * cw + cw / 2;
                      const cy = l.y + pad + 24 + r * ch + ch / 2;
                      return (
                        <circle
                          key={m.id}
                          className={`machine-dot ${selectedMachineId === m.id ? 'machine-active' : ''}`}
                          data-sector={s.id}
                          data-machine={m.id}
                          cx={cx}
                          cy={cy}
                          r={Math.min(cw, ch) * 0.28}
                          fill={STATUS_COLORS[m.status as keyof typeof STATUS_COLORS]}
                          stroke="#fff"
                          strokeWidth={1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleZoneClick(s.id, m.id);
                          }}
                          onMouseEnter={(e) => {
                            const t = document.getElementById('tooltip-floating-store');
                            if (t) {
                              t.innerHTML = `<strong>${m.id}</strong><br>${m.name}<br>Status: ${STATUS_LABELS[m.status as keyof typeof STATUS_LABELS]}<br>OEE: ${m.kpis.oee}%<br>${m.opAtiva || ''}`;
                              t.classList.add('visible');
                              t.style.left = `${e.clientX + 12}px`;
                              t.style.top = `${e.clientY + 12}px`;
                            }
                          }}
                          onMouseLeave={() => {
                            document.getElementById('tooltip-floating-store')?.classList.remove('visible');
                          }}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {!is3D && (
        <>
          <div className="minimap" id="minimap">
            <svg viewBox="0 0 1200 750" width="140" height="98">
              {planta.setores.map((s) => {
                const st = getSectorStatus(s);
                const l = s.layout2d;
                return (
                  <rect
                    key={s.id}
                    x={l.x}
                    y={l.y}
                    width={l.w}
                    height={l.h}
                    fill={STATUS_COLORS[st]}
                    opacity={0.3}
                  />
                );
              })}
            </svg>
            <div className="minimap-viewport" ref={minimapVpRef} />
          </div>
          <div className="map-controls" id="map-2d-controls">
            <button
              type="button"
              className="bg-surface-container-highest border border-outline-variant p-2 rounded shadow-lg hover:bg-primary hover:text-white transition-all"
              onClick={() => zoomMap2D(1.2)}
              title="Aumentar zoom"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
            <button
              type="button"
              className="bg-surface-container-highest border border-outline-variant p-2 rounded shadow-lg hover:bg-primary hover:text-white transition-all"
              onClick={() => zoomMap2D(0.8)}
              title="Diminuir zoom"
            >
              <span className="material-symbols-outlined text-lg">remove</span>
            </button>
            <button
              type="button"
              className="bg-surface-container-highest border border-outline-variant p-2 rounded shadow-lg hover:bg-primary hover:text-white transition-all"
              onClick={resetMap2D}
              title="Resetar zoom"
            >
              <span className="material-symbols-outlined text-lg">fit_screen</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
