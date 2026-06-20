import type { Layout2D } from '@sgm/shared';
import { formatMeters, layout2dToMeters } from '@sgm/shared';

interface Props {
  layout: Layout2D;
  fatorEscala: number;
  x: number;
  y: number;
}

export function EditorDimensionLabel({ layout, fatorEscala, x, y }: Props) {
  const { wM, hM, areaM2 } = layout2dToMeters(layout, fatorEscala);
  return (
    <div
      className="absolute z-30 pointer-events-none bg-white/95 border border-primary text-primary text-[11px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
      style={{ left: x, top: y }}
    >
      {layout.w} × {layout.h} px · {formatMeters(wM)} × {formatMeters(hM)} m · {formatMeters(areaM2)} m²
    </div>
  );
}
