import { useCallback, useEffect, useRef } from 'react';
import type { Layout2D } from '@sgm/shared';
import { STATUS_COLORS } from '../utils/colors';
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
  const map2d = usePlantaStore((s) => s.map2d);
  const setMap2dPan = usePlantaStore((s) => s.setMap2dPan);
  const setMap2dScale = usePlantaStore((s) => s.setMap2dScale);
  const zoomMap2D = usePlantaStore((s) => s.zoomMap2D);

  const select = useEditorStore((s) => s.select);
  const updateSectorLayout = useEditorStore((s) => s.updateSectorLayout);
  const addSectorFromRect = useEditorStore((s) => s.addSectorFromRect);
  const addMachineAt = useEditorStore((s) => s.addMachineAt);
  const setDrawPreview = useEditorStore((s) => s.setDrawPreview);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const undo = useEditorStore((s) => s.undo);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const redo = useEditorStore((s) => s.redo);
  const save = useEditorStore((s) => s.save);
  const setAppMode = useEditorStore((s) => s.setAppMode);

  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<{
    kind: 'draw' | 'drag' | 'resize' | 'pan' | null;
    handle: Handle;
    startX: number;
    startY: number;
    origin: Layout2D | null;
    panOrigin: { x: number; y: number };
  }>({ kind: null, handle: null, startX: 0, startY: 0, origin: null, panOrigin: { x: 0, y: 0 } });


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isFormField(e.target)) return;
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
        const { selectedSectorId } = useEditorStore.getState();
        if (selectedSectorId) {
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteSelected, redo, save, select, setAppMode, undo]);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.style.transform = `translate(${map2d.panX}px, ${map2d.panY}px) scale(${map2d.scale})`;
    }
  }, [map2d]);

  const onWheel = useCallback(
    (e: WheelEvent) => {
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

  const handles: Array<{ id: Handle; x: number; y: number; cursor: string }> = [];
  if (selected && tool === 'select') {
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

  const onSvgMouseDown = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);

    if (tool === 'pan') {
      interaction.current = {
        kind: 'pan',
        handle: null,
        startX: e.clientX,
        startY: e.clientY,
        origin: null,
        panOrigin: { x: map2d.panX, y: map2d.panY },
      };
      return;
    }

    if (tool === 'rect') {
      pushHistory();
      interaction.current = {
        kind: 'draw',
        handle: null,
        startX: x,
        startY: y,
        origin: null,
        panOrigin: { x: 0, y: 0 },
      };
      setDrawPreview({ x, y, w: 0, h: 0 });
      return;
    }

    if (tool === 'machine' && selectedSectorId) {
      addMachineAt(selectedSectorId, x, y);
      return;
    }
  };

  const onHandleDown = (e: React.MouseEvent, handle: Handle) => {
    e.stopPropagation();
    if (!selected) return;
    pushHistory();
    interaction.current = {
      kind: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...selected.layout2d },
      panOrigin: { x: 0, y: 0 },
    };
  };

  const onSectorDown = (e: React.MouseEvent, sectorId: string) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    select(sectorId);
    pushHistory();
    const sector = draft.setores.find((s) => s.id === sectorId);
    if (!sector) return;
    interaction.current = {
      kind: 'drag',
      handle: null,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...sector.layout2d },
      panOrigin: { x: 0, y: 0 },
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
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

      if (!state.origin || !selectedSectorId) return;
      const scale = map2d.scale || 1;
      const dx = (e.clientX - state.startX) / scale;
      const dy = (e.clientY - state.startY) / scale;

      if (state.kind === 'drag') {
        updateSectorLayout(selectedSectorId, {
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
          updateSectorLayout(selectedSectorId, { x: ox, y: oy, w, h });
        }
      }
    };

    const onUp = () => {
      const state = interaction.current;
      if (state.kind === 'draw' && drawPreview && drawPreview.w >= 40 && drawPreview.h >= 40) {
        addSectorFromRect(drawPreview);
      }
      interaction.current.kind = null;
      setDrawPreview(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [
    addSectorFromRect,
    drawPreview,
    map2d.scale,
    pushHistory,
    selectedSectorId,
    setDrawPreview,
    setMap2dPan,
    updateSectorLayout,
  ]);

  return (
    <section className="flex-1 relative flex flex-col bg-surface-container-lowest overflow-hidden">
      <div className="flex-1 relative overflow-hidden map-container" id="editor-pan-area">
          <div className="map-transform-layer" ref={layerRef}>
            <svg
              ref={svgRef}
              className="plant-svg"
              viewBox="0 0 1200 750"
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
                const isActive = selectedSectorId === s.id;
                const rows = Math.ceil(Math.sqrt(s.maquinas.length));
                const cols = Math.ceil(s.maquinas.length / rows) || 1;
                const pad = 14;
                const cw = (l.w - pad * 2) / cols;
                const ch = (l.h - pad * 2 - 20) / rows;
                return (
                  <g
                    key={s.id}
                    className={`zone-path ${isActive ? 'zone-active' : ''}`}
                    onMouseDown={(e) => onSectorDown(e, s.id)}
                  >
                    <rect x={l.x} y={l.y} width={l.w} height={l.h} rx="4" />
                    <text x={l.x + 10} y={l.y + 22} style={{ fontSize: 11, fontWeight: 700, fill: '#5d4039' }}>
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
                          cx={cx}
                          cy={cy}
                          r={Math.min(cw, ch) * 0.28}
                          fill={STATUS_COLORS[m.status as keyof typeof STATUS_COLORS] ?? '#757575'}
                          stroke="#fff"
                          strokeWidth={1}
                          onMouseDown={(ev) => {
                            ev.stopPropagation();
                            select(s.id, m.id);
                          }}
                        />
                      );
                    })}
                  </g>
                );
              })}
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
                  x={h.x - 5}
                  y={h.y - 5}
                  width={10}
                  height={10}
                  fill="#fff"
                  stroke="#b32200"
                  strokeWidth={2}
                  style={{ cursor: h.cursor }}
                  onMouseDown={(e) => onHandleDown(e, h.id)}
                />
              ))}
            </svg>
          </div>
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
