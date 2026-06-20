import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  durationMs: number;
  discrete?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
  dismissByType: (type: ToastType) => void;
}

const MAX_TOASTS = 3;
let toastSeq = 0;
const recentErrors = new Map<string, number>();
const ERROR_DEBOUNCE_MS = 8000;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = `toast-${++toastSeq}`;
    let next = get().toasts;

    if (toast.type === 'error') {
      next = next.filter((t) => t.type !== 'error');
    }
    next = [...next, { ...toast, id }].slice(-MAX_TOASTS);
    set({ toasts: next });

    if (!toast.actionLabel) {
      window.setTimeout(() => get().dismiss(id), toast.durationMs);
    }
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  dismissByType: (type) => set({ toasts: get().toasts.filter((t) => t.type !== type) }),
}));

export function toastSuccess(message: string, opts?: { discrete?: boolean }) {
  useToastStore.getState().push({
    type: 'success',
    message,
    durationMs: opts?.discrete ? 2200 : 3000,
    discrete: opts?.discrete,
  });
}

export function toastError(message: string, onRetry?: () => void) {
  const now = Date.now();
  const lastAt = recentErrors.get(message);
  if (lastAt != null && now - lastAt < ERROR_DEBOUNCE_MS) return;
  recentErrors.set(message, now);
  window.setTimeout(() => {
    if (recentErrors.get(message) === now) recentErrors.delete(message);
  }, ERROR_DEBOUNCE_MS);

  useToastStore.getState().push({
    type: 'error',
    message,
    durationMs: 8000,
    actionLabel: onRetry ? 'Tentar novamente' : undefined,
    onAction: onRetry,
  });
}

export function toastInfo(message: string) {
  useToastStore.getState().push({ type: 'info', message, durationMs: 3000 });
}
