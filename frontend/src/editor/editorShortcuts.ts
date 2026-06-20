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

export const EDITOR_SHORTCUTS = [
  { keys: 'V', label: 'Voltar ao modo Operar' },
  { keys: 'S', label: 'Ferramenta Selecionar' },
  { keys: 'R', label: 'Ferramenta Retângulo' },
  { keys: 'M', label: 'Ferramenta Máquina' },
  { keys: 'Espaço + arrastar', label: 'Mover mapa (pan)' },
  { keys: '⌘Z', label: 'Desfazer' },
  { keys: '⌘⇧Z', label: 'Refazer' },
  { keys: DELETE_SHORTCUT_LABEL, label: 'Excluir selecionado' },
  { keys: '⌘S', label: 'Salvar layout' },
  { keys: 'Esc', label: 'Limpar seleção' },
] as const;

export const TOOL_HINTS: Record<string, string> = {
  select: 'Selecionar (S)',
  rect: 'Desenhar setor (R)',
  machine: 'Adicionar máquina (M)',
  pan: 'Mover mapa — ou Espaço + arrastar',
};
