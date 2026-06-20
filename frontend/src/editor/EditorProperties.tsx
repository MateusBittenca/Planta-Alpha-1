import { useEditorStore } from '../store/editorStore';
import { DELETE_SHORTCUT_LABEL } from './editorShortcuts';

export function EditorProperties() {
  const draft = useEditorStore((s) => s.draft);
  const selectedSectorId = useEditorStore((s) => s.selectedSectorId);
  const selectedMachineId = useEditorStore((s) => s.selectedMachineId);
  const updateSectorMeta = useEditorStore((s) => s.updateSectorMeta);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);

  if (!draft) return null;

  const sector = selectedSectorId ? draft.setores.find((s) => s.id === selectedSectorId) : null;
  const machine =
    sector && selectedMachineId ? sector.maquinas.find((m) => m.id === selectedMachineId) : null;

  if (!sector) {
    return (
      <aside className="w-[320px] bg-surface flex flex-col border-l border-outline-variant p-8 shrink-0 detail-panel">
        <h3 className="font-headline-md text-on-surface">Propriedades</h3>
        <p className="text-label-sm text-on-surface-variant mt-2">
          Selecione um setor ou use a ferramenta Retângulo para criar uma nova área.
        </p>
        <p className="text-[10px] text-on-surface-variant mt-6 uppercase font-bold">Atalhos</p>
        <ul className="text-label-sm text-on-surface-variant mt-2 space-y-1">
          <li><kbd className="px-1 border rounded">R</kbd> Retângulo</li>
          <li><kbd className="px-1 border rounded">M</kbd> Máquina</li>
          <li><kbd className="px-1 border rounded">{DELETE_SHORTCUT_LABEL}</kbd> Excluir selecionado</li>
          <li><kbd className="px-1 border rounded">⌘S</kbd> Salvar</li>
        </ul>
      </aside>
    );
  }

  if (machine) {
    return (
      <aside className="w-[320px] bg-surface flex flex-col border-l border-outline-variant p-8 shrink-0 detail-panel overflow-y-auto">
        <span className="text-label-sm text-primary uppercase font-bold">Máquina</span>
        <h3 className="font-headline-md mt-1">{machine.id}</h3>
        <label className="block mt-4 text-label-sm font-bold">Nome</label>
        <input
          className="w-full border border-outline-variant rounded px-3 py-2 text-sm mt-1"
          value={machine.name}
          onChange={(e) => {
            machine.name = e.target.value;
            updateSectorMeta(sector.id, {});
            useEditorStore.setState({ draft: { ...draft }, dirty: true });
          }}
        />
        <label className="block mt-4 text-label-sm font-bold">Temp. máxima (°C)</label>
        <input
          type="number"
          className="w-full border border-outline-variant rounded px-3 py-2 text-sm mt-1"
          value={machine.limits.tempMax}
          onChange={(e) => {
            machine.limits.tempMax = Number(e.target.value);
            useEditorStore.setState({ draft: { ...draft }, dirty: true });
          }}
        />
        <button type="button" className="mt-6 w-full py-2 border border-red-300 text-red-700 rounded text-sm" onClick={deleteSelected}>
          Excluir máquina
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[320px] bg-surface flex flex-col border-l border-outline-variant p-8 shrink-0 detail-panel overflow-y-auto">
      <span className="text-label-sm text-primary uppercase font-bold">Setor</span>
      <h3 className="font-headline-md mt-1">{sector.id}</h3>
      <label className="block mt-4 text-label-sm font-bold">Nome</label>
      <input
        className="w-full border border-outline-variant rounded px-3 py-2 text-sm mt-1"
        value={sector.name}
        onChange={(e) => updateSectorMeta(sector.id, { name: e.target.value })}
      />
      <label className="block mt-4 text-label-sm font-bold">Tipo</label>
      <select
        className="w-full border border-outline-variant rounded px-3 py-2 text-sm mt-1"
        value={sector.type}
        onChange={(e) => updateSectorMeta(sector.id, { type: e.target.value })}
      >
        <option value="produção">Produção</option>
        <option value="logística">Logística</option>
        <option value="qualidade">Qualidade</option>
      </select>
      <label className="block mt-4 text-label-sm font-bold">Descrição</label>
      <textarea
        className="w-full border border-outline-variant rounded px-3 py-2 text-sm mt-1"
        rows={3}
        value={sector.description}
        onChange={(e) => updateSectorMeta(sector.id, { description: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2 mt-4 text-label-sm">
        <div>
          <span className="text-on-surface-variant">X</span> {sector.layout2d.x}
        </div>
        <div>
          <span className="text-on-surface-variant">Y</span> {sector.layout2d.y}
        </div>
        <div>
          <span className="text-on-surface-variant">W</span> {sector.layout2d.w}
        </div>
        <div>
          <span className="text-on-surface-variant">H</span> {sector.layout2d.h}
        </div>
      </div>
      <button type="button" className="mt-6 w-full py-2 border border-red-300 text-red-700 rounded text-sm" onClick={deleteSelected}>
        Excluir setor
      </button>
    </aside>
  );
}
