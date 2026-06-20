import { useToastStore } from '../../store/toastStore';

const STYLES = {
  success: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  error: 'bg-red-50 border-red-300 text-red-900',
  info: 'bg-surface border-outline-variant text-on-surface',
  warning: 'bg-amber-50 border-amber-300 text-amber-900',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto border rounded-lg flex items-start gap-3 ${STYLES[t.type]} ${
            t.discrete
              ? 'shadow-sm px-3 py-2 text-xs opacity-95'
              : 'shadow-lg px-4 py-3 text-sm'
          }`}
          role="status"
        >
          <span className="flex-1">{t.message}</span>
          {t.actionLabel && t.onAction && (
            <button
              type="button"
              className="text-xs font-bold underline shrink-0"
              onClick={() => {
                t.onAction?.();
                dismiss(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          )}
          <button type="button" className="text-on-surface-variant hover:text-on-surface shrink-0" onClick={() => dismiss(t.id)} aria-label="Fechar">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}