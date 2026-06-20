import { useEditorStore } from '../store/editorStore';
import { useLayoutValidation } from './hooks/useLayoutValidation';

export function EditorLayoutAlerts() {
  const draft = useEditorStore((s) => s.draft);
  const select = useEditorStore((s) => s.select);
  const { issues } = useLayoutValidation(draft);

  if (issues.length === 0) return null;

  return (
    <div className="mt-6 border-t border-outline-variant pt-4">
      <p className="text-[10px] text-on-surface-variant uppercase font-bold">Alertas de layout</p>
      <ul className="mt-2 space-y-1 text-label-sm">
        {issues.map((issue) => (
          <li key={issue.id}>
            <button
              type="button"
              className={`text-left w-full rounded px-2 py-1.5 hover:bg-surface-container-low transition-colors ${
                issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'
              }`}
              onClick={() => {
                if (issue.sectorId) {
                  select(issue.sectorId, issue.machineId ?? null);
                }
              }}
            >
              {issue.message}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-on-surface-variant mt-2">Clique em um alerta para selecionar o elemento.</p>
    </div>
  );
}
