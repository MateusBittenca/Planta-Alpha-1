import { useCallback, useEffect, useRef, useState } from 'react';
import type { Layout2D, Posicao2D } from '@sgm/shared';
import { resolveMaquinaPosition } from '@sgm/shared';
import { STATUS_COLORS } from '../utils/colors';
import { EditorDimensionLabel } from './EditorDimensionLabel';
import { EditorValidationLayer } from './EditorValidationLayer';
import { useLayoutValidation } from './hooks/useLayoutValidation';
import { isEditorDeleteKey, isFormField } from './editorShortcuts';
import { useEditorStore } from '../store/editorStore';
import { usePlantaStore } from '../store/plantaStore';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

export function EditorCanvas() {
  const draft = useEditorStore((s) => s.draft);
  const tool = useEditorStore((s) => s.tool);
  const selectedSectorId = useEditorStore((s) => s.selectedSectorId);
  const selectedMachineId = useEditorStore((s) => s.selectedMachineId);
  const drawPreview = useEditorStore((s) => s.drawPreview);
  const dimensionCursor = useEditorStore((s) => s.dimensionCursor);
  const map2d = usePlantaStore((s) => s.map2d);
  const setMap2dPan = usePlantaStore((s) => s.setMap2dPan);
  const setMap2dScale = usePlantaStore((s) => s.setMap2dScale);
  const zoomMap2D = usePlantaStore((s) => s.zoomMap2D);

  const select = useEditorStore((s) => s.select);
  const updateSectorLayout = useEditorStore((s) => s.updateSectorLayout);
  const updateMachinePosition = useEditorStore((s) => s.updateMachinePosition);
  const addSectorFromRect = useEditorStore((s) => s.addSectorFromRect);
  const addMachineAt = useEditorStore((s) => s.addMachineAt);
  const setDrawPreview = useEditorStore((s) => s.setDrawPreview);
  const setDimensionCursor = useEditorStore((s) => s.setDimensionCursor);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const finalizeInteraction = useEditorStore((s) => s.finalizeInteraction);
  const undo = useEditorStore((s) => s.undo);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const redo = useEditorStore((s) => s.redo);
  const save = useEditorStore((s) => s.save);
  const setAppMode = useEditorStore((s) => s.setAppMode);

  const { overlaps } = useLayoutValidation(draft);

  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const spaceHeld = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingMachine, setIsDraggingMachine] = useState(false);
  const interaction = useRef<{
    kind: 'draw' | 'drag' | 'resize' | 'pan' | 'machine-drag' | null;
    handle: Handle;
    startX: number;
    startY: number;
    startSvgX: number;
    startSvgY: number;
    origin: Layout2D | null;
    machineOrigin: Posicao2D | null;
    machineSectorId: string | null;
    machineId: string | null;
    sectorId: string | null;
    panOrigin: { x: number; y: number };
  }>({
    kind: null,
    handle: null,
    startX: 0,
    startY: 0,
    startSvgX: 0,
    startSvgY: 0,
    origin: null,
    machineOrigin: null,
    machineSectorId: null,
    machineId: null,
    sectorId: null,
    panOrigin: { x: 0, y: 0 },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isFormField(e.target)) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        spaceHeld.current = true;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void save();
      }
      if (isEditorDeleteKey(e)) {
        const { selectedSectorId: sid, selectedMachineId: mid } = useEditorStore.getState();
        if (sid || mid) {
          e.preventDefault();
          deleteSelected();
        }
      }
      if (e.key === 'r' || e.key === 'R') useEditorStore.getState().setTool('rect');
      if (e.key === 'm' || e.key === 'M') useEditorStore.getState().setTool('machine');
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) useEditorStore.getState().setTool('select');
      if (e.key === 'v' || e.key === 'V') void setAppMode('operate');
      if (e.key === 'Escape') select(null);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [deleteSelected, redo, save, select, setAppMode, undo]);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.style.transform = `translate(${map2d.panX}px, ${map2d.panY}px) scale(${map2d.scale})`;
    }
  }, [map2d]);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (interaction.current.kind) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setMap2dScale(map2d.scale * factor);
    },
    [map2d.scale, setMap2dScale]
  );

  useEffect(() => {
    const el = layerRef.current?.parentElement;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  if (!draft) return null;

  const selected = selectedSectorId ? draft.setores.find((s) => s.id === selectedSectorId) : null;
  const activeLayout =
    drawPreview ??
    (interaction.current.kind === 'resize' || interaction.current.kind === 'drag'
      ? selected?.layout2d
      : null);

  const handles: Array<{ id: Handle; x: number; y: number; cursor: string }> = [];
  if (selected && tool === 'select' && !selectedMachineId) {
    const l = selected.layout2d;
    const pts: Array<[Handle, number, number, string]> = [
      ['nw', l.x, l.y, 'nwse-resize'],
      ['n', l.x + l.w / 2, l.y, 'ns-resize'],
      ['ne', l.x + l.w, l.y, 'nesw-resize'],
      ['e', l.x + l.w, l.y + l.h / 2, 'ew-resize'],
      ['se', l.x + l.w, l.y + l.h, 'nwse-resize'],
      ['s', l.x + l.w / 2, l.y + l.h, 'ns-resize'],
      ['sw', l.x, l.y + l.h, 'nesw-resize'],
      ['w', l.x, l.y + l.h / 2, 'ew-resize'],
    ];
    pts.forEach(([id, x, y, cursor]) => handles.push({ id, x, y, cursor }));
  }

  const startPan = (clientX: number, clientY: number) => {
    interaction.current = {
      kind: 'pan',
      handle: null,
      startX: clientX,
      startY: clientY,
      startSvgX: 0,
      startSvgY: 0,
      origin: null,
      machineOrigin: null,
      machineSectorId: null,
      machineId: null,
      sectorId: null,
      panOrigin: { x: map2d.panX, y: map2d.panY },
    };
    setIsPanning(true);
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;

    if (e.button === 1 || tool === 'pan' || (tool === 'select' && spaceHeld.current)) {
      e.preventDefault();
      startPan(e.clientX, e.clientY);
      return;
    }

    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);

    if (tool === 'select') {
      select(null);
      return;
    }

    if (tool === 'rect') {
      pushHistory();
      interaction.current = {
        kind: 'draw',
        handle: null,
        startX: x,
        startY: y,
        startSvgX: x,
        startSvgY: y,
        origin: null,
        machineOrigin: null,
        machineSectorId: null,
        machineId: null,
        sectorId: null,
        panOrigin: { x: 0, y: 0 },
      };
      setDrawPreview({ x, y, w: 0, h: 0 });
      return;
    }
  };

  const onHandleDown = (e: React.PointerEvent, handle: Handle) => {
    e.stopPropagation();
    if (!selected || selectedMachineId) return;
    pushHistory();
    interaction.current = {
      kind: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startSvgX: 0,
      startSvgY: 0,
      origin: { ...selected.layout2d },
      machineOrigin: null,
      machineSectorId: null,
      machineId: null,
      sectorId: selected.id,
      panOrigin: { x: 0, y: 0 },
    };
  };

  const onSectorRectDown = (e: React.PointerEvent, sectorId: string) => {
    e.stopPropagation();
    if (tool === 'pan' || e.button === 1 || (tool === 'select' && spaceHeld.current)) {
      e.preventDefault();
      startPan(e.clientX, e.clientY);
      return;
    }
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);

    if (tool === 'machine') {
      select(sectorId);
      addMachineAt(sectorId, x, y);
      return;
    }
    if (tool !== 'select') return;

    select(sectorId, null);
    pushHistory();
    const sector = draft.setores.find((s) => s.id === sectorId);
    if (!sector) return;
    interaction.current = {
      kind: 'drag',
      handle: null,
      startX: e.clientX,
      startY: e.clientY,
      startSvgX: 0,
      startSvgY: 0,
      origin: { ...sector.layout2d },
      machineOrigin: null,
      machineSectorId: null,
      machineId: null,
      sectorId,
      panOrigin: { x: 0, y: 0 },
    };
  };

  const onMachineDown = (
    e: React.PointerEvent,
    sectorId: string,
    machineId: string,
    pos: Posicao2D
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button === 1 || tool === 'pan' || (tool === 'select' && spaceHeld.current)) {
      startPan(e.clientX, e.clientY);
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);

    const svg = svgRef.current;
    if (!svg) return;
    const startSvg = clientToSvg(svg, e.clientX, e.clientY);

    if (tool === 'machine') {
      select(sectorId);
      addMachineAt(sectorId, startSvg.x, startSvg.y);
      return;
    }
    if (tool !== 'select') return;

    select(sectorId, machineId);
    pushHistory();
    setIsDraggingMachine(true);
    interaction.current = {
      kind: 'machine-drag',
      handle: null,
      startX: e.clientX,
      startY: e.clientY,
      startSvgX: startSvg.x,
      startSvgY: startSvg.y,
      origin: null,
      machineOrigin: { ...pos },
      machineSectorId: sectorId,
      machineId,
      sectorId: null,
      panOrigin: { x: 0, y: 0 },
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      const state = interaction.current;
      if (!state.kind || !svg) return;

      if (state.kind === 'pan') {
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        setMap2dPan(state.panOrigin.x + dx, state.panOrigin.y + dy);
        return;
      }

      const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
      setDimensionCursor({ x: e.clientX, y: e.clientY });

      if (state.kind === 'draw') {
        const w = x - state.startX;
        const h = y - state.startY;
        setDrawPreview({
          x: w < 0 ? x : state.startX,
          y: h < 0 ? y : state.startY,
          w: Math.abs(w),
          h: Math.abs(h),
        });
        return;
      }

      if (state.kind === 'machine-drag' && state.machineOrigin && state.machineSectorId && state.machineId) {
        const cur = clientToSvg(svg, e.clientX, e.clientY);
        updateMachinePosition(state.machineSectorId, state.machineId, {
          cx: state.machineOrigin.cx + (cur.x - state.startSvgX),
          cy: state.machineOrigin.cy + (cur.y - state.startSvgY),
        });
        return;
      }

      if (!state.origin || !state.sectorId) return;
      const scale = map2d.scale || 1;
      const dx = (e.clientX - state.startX) / scale;
      const dy = (e.clientY - state.startY) / scale;

      if (state.kind === 'drag') {
        updateSectorLayout(state.sectorId, {
          ...state.origin,
          x: state.origin.x + dx,
          y: state.origin.y + dy,
        });
        return;
      }

      if (state.kind === 'resize' && state.handle) {
        let { x: ox, y: oy, w, h } = state.origin;
        const hdl = state.handle;
        if (hdl.includes('e')) w = state.origin.w + dx;
        if (hdl.includes('w')) {
          ox = state.origin.x + dx;
          w = state.origin.w - dx;
        }
        if (hdl.includes('s')) h = state.origin.h + dy;
        if (hdl.includes('n')) {
          oy = state.origin.y + dy;
          h = state.origin.h - dy;
        }
        if (w >= 40 && h >= 40) {
          updateSectorLayout(state.sectorId, { x: ox, y: oy, w, h });
        }
      }
    };

    const onUp = () => {
      const state = interaction.current;
      const wasLayoutInteraction =
        state.kind === 'machine-drag' || state.kind === 'drag' || state.kind === 'resize';
      if (state.kind === 'draw' && drawPreview && drawPreview.w >= 40 && drawPreview.h >= 40) {
        addSectorFromRect(drawPreview);
      }
      if (state.kind === 'pan') setIsPanning(false);
      if (state.kind === 'machine-drag') setIsDraggingMachine(false);
      interaction.current.kind = null;
      setDrawPreview(null);
      setDimensionCursor(null);
      if (wasLayoutInteraction) finalizeInteraction();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [
    addSectorFromRect,
    drawPreview,
    finalizeInteraction,
    map2d.scale,
    setDimensionCursor,
    setDrawPreview,
    setMap2dPan,
    updateMachinePosition,
    updateSectorLayout,
  ]);

  const vb = draft.viewBox?.split(/\s+/) ?? ['0', '0', '1200', '750'];

  return (
    <section className="editor-mode flex-1 relative flex flex-col bg-surface-container-lowest overflow-hidden">
      <div
        className={`flex-1 relative overflow-hidden map-container editor-tool-${tool} ${isPanning ? 'is-panning' : ''} ${isDraggingMachine ? 'is-dragging-machine' : ''}`}
        id="editor-pan-area"
      >
        <div className="map-transform-layer" ref={layerRef}>
          <svg
            ref={svgRef}
            className="plant-svg"
            viewBox={`${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}`}
            preserveAspectRatio="xMidYMid meet"
            onMouseDown={onSvgMouseDown}
          >
            <defs>
              <pattern height="40" id="editor-grid" patternUnits="userSpaceOnUse" width="40">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="1" />
              </pattern>
            </defs>
            <rect fill="url(#editor-grid)" height="100%" width="100%" />
            {draft.setores.map((s) => {
              const l = s.layout2d;
              const isSectorActive = selectedSectorId === s.id && !selectedMachineId;
              const isParentOfMachine = selectedSectorId === s.id && !!selectedMachineId;
              const zoneClass = isSectorActive
                ? 'zone-active'
                : isParentOfMachine
                  ? 'zone-parent-selected'
                  : '';
              return (
                <g key={s.id} className={`zone-path ${zoneClass}`}>
                  <rect
                    x={l.x}
                    y={l.y}
                    width={l.w}
                    height={l.h}
                    rx="4"
                    onPointerDown={(e) => onSectorRectDown(e, s.id)}
                  />
                  <text
                    x={l.x + 10}
                    y={l.y + 22}
                    className="pointer-events-none"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#5d4039' }}
                  >
                    {s.name.toUpperCase()}
                  </text>
                </g>
              );
            })}
            <g className="machines-layer">
              {draft.setores.map((s) =>
                s.maquinas.map((m, i) => {
                  const pos = resolveMaquinaPosition(m, s, i);
                  const hitR = 16;
                  const r = 10;
                  const isMachineSelected = selectedMachineId === m.id;
                  return (
                    <g key={m.id}>
                      <circle
                        cx={pos.cx}
                        cy={pos.cy}
                        r={hitR}
                        fill="transparent"
                        className="machine-hit"
                        style={{
                          cursor:
                            tool === 'select'
                              ? isDraggingMachine && isMachineSelected
                                ? 'grabbing'
                                : 'grab'
                              : 'crosshair',
                        }}
                        onPointerDown={(ev) => onMachineDown(ev, s.id, m.id, pos)}
                      />
                      {isMachineSelected && (
                        <circle
                          className="machine-selection-ring"
                          cx={pos.cx}
                          cy={pos.cy}
                          r={14}
                        />
                      )}
                      <circle
                        className={`machine-dot pointer-events-none ${isMachineSelected ? 'machine-active' : ''}`}
                        cx={pos.cx}
                        cy={pos.cy}
                        r={r}
                        fill={STATUS_COLORS[m.status as keyof typeof STATUS_COLORS] ?? '#757575'}
                        stroke="#fff"
                        strokeWidth={isMachineSelected ? 2.5 : 1}
                      />
                    </g>
                  );
                })
              )}
            </g>
            <EditorValidationLayer
              draft={draft}
              overlaps={overlaps}
              onSelectSector={(sectorId) => select(sectorId, null)}
              onSelectMachine={(sectorId, machineId) => select(sectorId, machineId)}
            />
            {drawPreview && drawPreview.w > 0 && (
              <rect
                x={drawPreview.x}
                y={drawPreview.y}
                width={drawPreview.w}
                height={drawPreview.h}
                fill="rgba(179,34,0,0.08)"
                stroke="#b32200"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}
            {handles.map((h) => (
              <rect
                key={h.id}
                x={h.x - 6}
                y={h.y - 6}
                width={12}
                height={12}
                fill="#fff"
                stroke="#b32200"
                strokeWidth={2}
                style={{ cursor: h.cursor }}
                onPointerDown={(e) => onHandleDown(e, h.id)}
              />
            ))}
          </svg>
        </div>
        {activeLayout && dimensionCursor && (
          <EditorDimensionLabel
            layout={activeLayout}
            fatorEscala={draft.fatorEscala}
            x={dimensionCursor.x + 12}
            y={dimensionCursor.y + 12}
          />
        )}
        <div className="map-controls">
          <button type="button" className="bg-surface-container-highest border border-outline-variant p-2 rounded shadow-lg hover:bg-primary hover:text-white" onClick={() => zoomMap2D(1.2)}>
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
          <button type="button" className="bg-surface-container-highest border border-outline-variant p-2 rounded shadow-lg hover:bg-primary hover:text-white" onClick={() => zoomMap2D(0.8)}>
            <span className="material-symbols-outlined text-lg">remove</span>
          </button>
        </div>
      </div>
    </section>
  );
}
