import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';

const META_DEBOUNCE_MS = 400;

export function usePropertyField<T>(
  entityKey: string,
  value: T,
  onCommit: (next: T) => void,
  validate?: (next: T) => string | null
) {
  const [local, setLocal] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const historyTaken = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback(
    (next: T) => {
      const validationError = validate?.(next) ?? null;
      setError(validationError);
      if (validationError) return;

      if (!historyTaken.current) {
        useEditorStore.getState().pushHistory();
        historyTaken.current = true;
      }
      onCommit(next);
    },
    [onCommit, validate]
  );

  const localRef = useRef(local);
  const commitRef = useRef(commit);
  localRef.current = local;
  commitRef.current = commit;

  useEffect(() => {
    setLocal(value);
    setError(null);
    historyTaken.current = false;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [entityKey, value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      commitRef.current(localRef.current);
    };
  }, [entityKey]);

  const onChange = useCallback(
    (next: T) => {
      setLocal(next);
      setError(validate?.(next) ?? null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        commit(next);
      }, META_DEBOUNCE_MS);
    },
    [commit, validate]
  );

  const onBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    commit(local);
  }, [commit, local]);

  const commitNow = useCallback(
    (next: T) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setLocal(next);
      commit(next);
    },
    [commit]
  );

  return { local, error, onChange, onBlur, commitNow };
}

export function validateName(value: string): string | null {
  if (!value.trim()) return 'Nome não pode ficar vazio';
  return null;
}

export function validateTempMax(value: number): string | null {
  if (!Number.isFinite(value)) return 'Informe um número válido';
  if (value < 1 || value > 200) return 'Use um valor entre 1 e 200 °C';
  return null;
}
