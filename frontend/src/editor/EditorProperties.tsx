import { useCallback } from 'react';
import type { Layout2D } from '@sgm/shared';
import { formatMeters, layout2dToMeters } from '@sgm/shared';
import { useEditorStore } from '../store/editorStore';
import { EDITOR_SHORTCUTS } from './editorShortcuts';
import { usePropertyField, validateName, validateTempMax } from './hooks/usePropertyField';
import { EditorLayoutAlerts } from './EditorLayoutAlerts';

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-[11px] text-red-700 mt-1">{message}</p>;
}

function MachineProperties({
  sectorId,
  machineId,
  machineName,
  tempMax,
  posicao2d,
}: {
  sectorId: string;
  machineId: string;
  machineName: string;
  tempMax: number;
  posicao2d?: { cx: number; cy: number };
}) {
  const updateMachineMeta = useEditorStore((s) => s.updateMachineMeta);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);

  const commitName = useCallback(
    (name: string) => updateMachineMeta(sectorId, machineId, { name }),
    [machineId, sectorId, updateMachineMeta]
  );
  const commitTemp = useCallback(
    (value: number) =>
      updateMachineMeta(sectorId, machineId, { limits: { tempMax: value } }),
    [machineId, sectorId, updateMachineMeta]
  );

  const nameField = usePropertyField(
    `${sectorId}:${machineId}:name`,
    machineName,
    commitName,
    validateName
  );
  const tempField = usePropertyField(
    `${sectorId}:${machineId}:temp`,
    tempMax,
    commitTemp,
    validateTempMax
  );

  return (
    <aside className="w-[320px] bg-surface flex flex-col border-l border-outline-variant p-8 shrink-0 detail-panel overflow-y-auto">
      <span className="text-label-sm text-primary uppercase font-bold">Máquina</span>
      <h3 className="font-headline-md mt-1">{machineId}</h3>
      {posicao2d && (
        <p className="text-label-sm text-on-surface-variant mt-2">
          Posição: {Math.round(posicao2d.cx)}, {Math.round(posicao2d.cy)} px
        </p>
      )}
      <label className="block mt-4 text-label-sm font-bold">Nome</label>
      <input
        className={`w-full border rounded px-3 py-2 text-sm mt-1 ${
          nameField.error ? 'border-red-400' : 'border-outline-variant'
        }`}
        value={nameField.local}
        onChange={(e) => nameField.onChange(e.target.value)}
        onBlur={nameField.onBlur}
      />
      <FieldError message={nameField.error} />
      <label className="block mt-4 text-label-sm font-bold">Temp. máxima (°C)</label>
      <input
        type="number"
        min={1}
        max={200}
        className={`w-full border rounded px-3 py-2 text-sm mt-1 ${
          tempField.error ? 'border-red-400' : 'border-outline-variant'
        }`}
        value={tempField.local}
        onChange={(e) => tempField.onChange(Number(e.target.value))}
        onBlur={tempField.onBlur}
      />
      <FieldError message={tempField.error} />
      <EditorLayoutAlerts />
      <button
        type="button"
        className="mt-6 w-full py-2 border border-red-300 text-red-700 rounded text-sm"
        onClick={deleteSelected}
      >
        Excluir máquina
      </button>
    </aside>
  );
}

function SectorProperties({
  sectorId,
  sectorName,
  sectorType,
  sectorDescription,
  layout2d,
  fatorEscala,
}: {
  sectorId: string;
  sectorName: string;
  sectorType: string;
  sectorDescription: string;
  layout2d: Layout2D;
  fatorEscala: number;
}) {
  const updateSectorMeta = useEditorStore((s) => s.updateSectorMeta);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);

  const commitName = useCallback(
    (name: string) => updateSectorMeta(sectorId, { name }),
    [sectorId, updateSectorMeta]
  );
  const commitDescription = useCallback(
    (description: string) => updateSectorMeta(sectorId, { description }),
    [sectorId, updateSectorMeta]
  );

  const nameField = usePropertyField(`${sectorId}:name`, sectorName, commitName, validateName);
  const descriptionField = usePropertyField(
    `${sectorId}:desc`,
    sectorDescription,
    commitDescription
  );

  const dims = layout2dToMeters(layout2d, fatorEscala);

  const onTypeChange = (type: string) => {
    pushHistory();
    updateSectorMeta(sectorId, { type });
  };

  return (
    <aside className="w-[320px] bg-surface flex flex-col border-l border-outline-variant p-8 shrink-0 detail-panel overflow-y-auto">
      <span className="text-label-sm text-primary uppercase font-bold">Setor</span>
      <h3 className="font-headline-md mt-1">{sectorId}</h3>
      <label className="block mt-4 text-label-sm font-bold">Nome</label>
      <input
        className={`w-full border rounded px-3 py-2 text-sm mt-1 ${
          nameField.error ? 'border-red-400' : 'border-outline-variant'
        }`}
        value={nameField.local}
        onChange={(e) => nameField.onChange(e.target.value)}
        onBlur={nameField.onBlur}
      />
      <FieldError message={nameField.error} />
      <label className="block mt-4 text-label-sm font-bold">Tipo</label>
      <select
        className="w-full border border-outline-variant rounded px-3 py-2 text-sm mt-1"
        value={sectorType}
        onChange={(e) => onTypeChange(e.target.value)}
      >
        <option value="produção">Produção</option>
        <option value="logística">Logística</option>
        <option value="qualidade">Qualidade</option>
      </select>
      <label className="block mt-4 text-label-sm font-bold">Descrição</label>
      <textarea
        className="w-full border border-outline-variant rounded px-3 py-2 text-sm mt-1"
        rows={3}
        value={descriptionField.local}
        onChange={(e) => descriptionField.onChange(e.target.value)}
        onBlur={descriptionField.onBlur}
      />
      <div className="mt-4 p-3 bg-surface-container-low rounded border border-outline-variant text-label-sm">
        <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Dimensões</p>
        <p>
          {layout2d.w} × {layout2d.h} px
        </p>
        <p className="text-on-surface-variant mt-1">
          {formatMeters(dims.wM)} × {formatMeters(dims.hM)} m · área {formatMeters(dims.areaM2)} m²
        </p>
      </div>
      <EditorLayoutAlerts />
      <button
        type="button"
        className="mt-6 w-full py-2 border border-red-300 text-red-700 rounded text-sm"
        onClick={deleteSelected}
      >
        Excluir setor
      </button>
    </aside>
  );
}

export function EditorProperties() {
  const draft = useEditorStore((s) => s.draft);
  const selectedSectorId = useEditorStore((s) => s.selectedSectorId);
  const selectedMachineId = useEditorStore((s) => s.selectedMachineId);

  if (!draft) return null;

  const sector = selectedSectorId ? draft.setores.find((s) => s.id === selectedSectorId) : null;
  const machine =
    sector && selectedMachineId ? sector.maquinas.find((m) => m.id === selectedMachineId) : null;

  if (!sector) {
    return (
      <aside className="w-[320px] bg-surface flex flex-col border-l border-outline-variant p-8 shrink-0 detail-panel overflow-y-auto">
        <h3 className="font-headline-md text-on-surface">Propriedades</h3>
        <p className="text-label-sm text-on-surface-variant mt-2">
          Selecione um setor ou use a ferramenta Retângulo para criar uma nova área.
        </p>
        <EditorLayoutAlerts />
        <p className="text-[10px] text-on-surface-variant mt-6 uppercase font-bold">Atalhos</p>
        <ul className="text-label-sm text-on-surface-variant mt-2 space-y-1">
          {EDITOR_SHORTCUTS.map((s) => (
            <li key={s.keys}>
              <kbd className="px-1 border rounded text-[10px]">{s.keys}</kbd> {s.label}
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  if (machine) {
    return (
      <MachineProperties
        sectorId={sector.id}
        machineId={machine.id}
        machineName={machine.name}
        tempMax={machine.limits.tempMax}
        posicao2d={machine.posicao2d}
      />
    );
  }

  return (
    <SectorProperties
      sectorId={sector.id}
      sectorName={sector.name}
      sectorType={sector.type}
      sectorDescription={sector.description}
      layout2d={sector.layout2d}
      fatorEscala={draft.fatorEscala}
    />
  );
}
