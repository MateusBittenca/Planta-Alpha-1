import type { PlantaResponse } from '@sgm/shared';
import { findMachinesOutsideSetor, resolveMaquinaPosition } from '@sgm/shared';

interface Props {
  draft: PlantaResponse;
  overlaps: Array<[string, string]>;
  onSelectSector: (sectorId: string) => void;
  onSelectMachine: (sectorId: string, machineId: string) => void;
}

export function EditorValidationLayer({
  draft,
  overlaps,
  onSelectSector,
  onSelectMachine,
}: Props) {
  const overlapIds = new Set(overlaps.flat());

  return (
    <g className="validation-layer">
      {draft.setores.map((s) => {
        const l = s.layout2d;
        const isOverlap = overlapIds.has(s.id);
        const tooSmall = l.w < 40 || l.h < 40;
        if (!isOverlap && !tooSmall) return null;
        return (
          <g key={`val-${s.id}`}>
            <rect
              x={l.x}
              y={l.y}
              width={l.w}
              height={l.h}
              fill="none"
              stroke={tooSmall ? '#dc2626' : '#f59e0b'}
              strokeWidth={3}
              strokeDasharray={isOverlap ? '8 4' : undefined}
              rx={4}
              className="pointer-events-none"
            />
            <rect
              x={l.x}
              y={l.y}
              width={l.w}
              height={l.h}
              fill="transparent"
              stroke="transparent"
              strokeWidth={14}
              rx={4}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSector(s.id);
              }}
            />
          </g>
        );
      })}
      {draft.setores.flatMap((s) =>
        findMachinesOutsideSetor(s).map((machineId, i) => {
          const m = s.maquinas.find((x) => x.id === machineId);
          const pos = m ? resolveMaquinaPosition(m, s, i) : null;
          if (!pos) return null;
          return (
            <g key={`mval-${machineId}`}>
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={14}
                fill="none"
                stroke="#dc2626"
                strokeWidth={3}
                className="pointer-events-none"
              />
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={18}
                fill="transparent"
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMachine(s.id, machineId);
                }}
              />
              <text
                x={pos.cx + 16}
                y={pos.cy + 4}
                fill="#dc2626"
                fontSize={12}
                fontWeight={700}
                className="pointer-events-none"
              >
                ⚠
              </text>
            </g>
          );
        })
      )}
    </g>
  );
}
