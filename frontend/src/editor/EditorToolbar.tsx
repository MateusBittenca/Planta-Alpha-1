import type { EditorTool } from '../store/editorStore';
import { useEditorStore } from '../store/editorStore';
import { DELETE_SHORTCUT_LABEL } from './editorShortcuts';

const TOOLS: Array<{ id: EditorTool; icon: string; label: string }> = [
  { id: 'select', icon: 'near_me', label: 'Selecionar' },
  { id: 'rect', icon: 'crop_square', label: 'Retângulo' },
  { id: 'machine', icon: 'precision_manufacturing', label: 'Máquina' },
  { id: 'pan', icon: 'pan_tool_alt', label: 'Pan' },
];

export function EditorToolbar() {
  const tool = useEditorStore((s) => s.tool);
  const dirty = useEditorStore((s) => s.dirty);
  const saving = useEditorStore((s) => s.saving);
  const setTool = useEditorStore((s) => s.setTool);
  const save = useEditorStore((s) => s.save);
  const discard = useEditorStore((s) => s.discard);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const selectedSectorId = useEditorStore((s) => s.selectedSectorId);

  return (
    <div className="flex items-center gap-2 flex-wrap p-3 bg-white/90 backdrop-blur border-b border-outline-variant shrink-0">
      <div className="flex gap-1 border border-outline-variant rounded p-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-label-md rounded transition-all ${
              tool === t.id ? 'bg-primary/10 border border-primary text-primary font-bold' : 'text-on-surface-variant hover:bg-secondary-container/10'
            }`}
            onClick={() => setTool(t.id)}
          >
            <span className="material-symbols-outlined text-sm">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-1 ml-auto">
        <button type="button" className="p-2 border border-outline-variant rounded hover:bg-secondary-container/10" onClick={undo} title="Desfazer (⌘Z)">
          <span className="material-symbols-outlined text-sm">undo</span>
        </button>
        <button type="button" className="p-2 border border-outline-variant rounded hover:bg-secondary-container/10" onClick={redo} title="Refazer (⌘⇧Z)">
          <span className="material-symbols-outlined text-sm">redo</span>
        </button>
        <button
          type="button"
          className="p-2 border border-outline-variant rounded hover:bg-secondary-container/10 disabled:opacity-40 disabled:cursor-not-allowed text-red-700"
          onClick={deleteSelected}
          disabled={!selectedSectorId}
          title={`Excluir selecionado (${DELETE_SHORTCUT_LABEL})`}
        >
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
        <button type="button" className="px-3 py-1.5 text-xs border border-outline-variant rounded hover:bg-secondary-container/10" onClick={discard} disabled={!dirty}>
          Descartar
        </button>
        <button
          type="button"
          className="px-4 py-1.5 text-xs bg-primary text-white rounded font-bold disabled:opacity-50 flex items-center gap-2"
          onClick={() => void save()}
          disabled={!dirty || saving}
        >
          {saving ? 'Salvando…' : 'Salvar layout'}
          {dirty && !saving && <span className="w-2 h-2 rounded-full bg-amber-300" title="Alterações não salvas" />}
        </button>
      </div>
    </div>
  );
}
