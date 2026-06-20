/** Tecla física "delete" no Mac envia Backspace; Delete real = Fn+⌫ */
export function isEditorDeleteKey(e: KeyboardEvent): boolean {
  return e.key === 'Backspace' || e.key === 'Delete';
}

export function isFormField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export const DELETE_SHORTCUT_LABEL = '⌫';
