export const NETWORK_UNAVAILABLE_MSG =
  'Servidor indisponível. Verifique se o backend está em execução (porta 3000).';

const KNOWN_NETWORK_MESSAGES: Record<string, string> = {
  'Load failed': NETWORK_UNAVAILABLE_MSG,
  'Failed to fetch': NETWORK_UNAVAILABLE_MSG,
  'NetworkError when attempting to fetch resource.': NETWORK_UNAVAILABLE_MSG,
  'Network request failed': NETWORK_UNAVAILABLE_MSG,
};

export function normalizeApiMessage(message: string | undefined | null): string {
  if (!message || !message.trim()) return 'Erro na requisição';
  const trimmed = message.trim();
  return KNOWN_NETWORK_MESSAGES[trimmed] ?? trimmed;
}
