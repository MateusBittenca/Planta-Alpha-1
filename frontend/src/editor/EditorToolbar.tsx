import type { EditorTool } from '../store/editorStore';
import { useEditorStore } from '../store/editorStore';
import { DELETE_SHORTCUT_LABEL, TOOL_HINTS } from './editorShortcuts';

const TOOLS: Array<{ id: EditorTool; icon: string; label: string }> = [
  { id: 'select', icon: 'near_me', label: 'Selecionar' },
  { id: 'rect', icon: 'crop_square', label: 'Retângulo' },
  { id: 'machine', icon: 'precision_manufacturing', label: 'Máquina' },
  { id: 'pan', icon: 'pan_tool_alt', label: 'Pan' },
];

function formatSavedAt(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function EditorToolbar() {
  const tool = useEditorStore((s) => s.tool);
  const dirty = useEditorStore((s) => s.dirty);
  const saving = useEditorStore((s) => s.saving);
  const autoSaveEnabled = useEditorStore((s) => s.autoSaveEnabled);
  const blockSaveOnOverlap = useEditorStore((s) => s.blockSaveOnOverlap);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const saveError = useEditorStore((s) => s.saveError);
  const setTool = useEditorStore((s) => s.setTool);
  const setAutoSaveEnabled = useEditorStore((s) => s.setAutoSaveEnabled);
  const setBlockSaveOnOverlap = useEditorStore((s) => s.setBlockSaveOnOverlap);
  const save = useEditorStore((s) => s.save);
  const discard = useEditorStore((s) => s.discard);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const selectedSectorId = useEditorStore((s) => s.selectedSectorId);
  const selectedMachineId = useEditorStore((s) => s.selectedMachineId);

  const statusLabel = saving
    ? 'Salvando…'
    : saveError
      ? 'Erro ao salvar'
      : dirty
        ? autoSaveEnabled
          ? 'Alterações pendentes'
          : 'Não salvo'
        : lastSavedAt
          ? `Salvo às ${formatSavedAt(lastSavedAt)}`
          : '';

  return (
    <div className="flex items-center gap-2 flex-wrap p-3 bg-white/90 backdrop-blur border-b border-outline-variant shrink-0">
      <div className="flex gap-1 border border-outline-variant rounded p-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={TOOL_HINTS[t.id] ?? t.label}
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
      <span
        className="hidden xl:inline text-[10px] text-on-surface-variant border-l border-outline-variant pl-2"
        title="Atalhos do editor"
      >
        V operar · ⌘S salvar · Esc limpar
      </span>
      <label className="flex items-center gap-2 text-[10px] text-on-surface-variant px-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={autoSaveEnabled}
          onChange={(e) => setAutoSaveEnabled(e.target.checked)}
          className="rounded border-outline-variant"
        />
        Auto-save
      </label>
      <label className="flex items-center gap-2 text-[10px] text-on-surface-variant px-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={blockSaveOnOverlap}
          onChange={(e) => setBlockSaveOnOverlap(e.target.checked)}
          className="rounded border-outline-variant"
        />
        Bloquear save com sobreposição
      </label>
      {statusLabel && (
        <span
          className={`text-[10px] font-bold uppercase ${
            saveError ? 'text-red-700' : dirty ? 'text-amber-700' : 'text-emerald-700'
          }`}
          title={saveError ?? undefined}
        >
          {statusLabel}
        </span>
      )}
      {saveError && (
        <button
          type="button"
          className="text-[10px] font-bold text-red-700 underline"
          onClick={() => void save({ mensagem: 'Salvar layout', silent: false })}
        >
          Tentar novamente
        </button>
      )}
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
          disabled={!selectedSectorId && !selectedMachineId}
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
          onClick={() => void save({ mensagem: 'Salvar layout' })}
          disabled={!dirty || saving}
        >
          {saving ? 'Salvando…' : 'Salvar layout'}
          {dirty && !saving && <span className="w-2 h-2 rounded-full bg-amber-300" title="Alterações não salvas" />}
        </button>
      </div>
    </div>
  );
}
