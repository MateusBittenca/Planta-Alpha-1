import type { WsMessage } from '@sgm/shared';

const WS_URL =
  import.meta.env.VITE_WS_URL ??
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/telemetry?plantaId=alpha-1`;

let ws: WebSocket | null = null;
let reconnectAttempt = 0;
let onMessageHandler: ((msg: WsMessage) => void) | null = null;

export function connectTelemetry(onMessage: (msg: WsMessage) => void): void {
  onMessageHandler = onMessage;

  function connect() {
    ws = new WebSocket(WS_URL);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as WsMessage;
        if (msg.type !== 'connected' && onMessageHandler) onMessageHandler(msg);
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      reconnectAttempt++;
      const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt);
      setTimeout(connect, delay);
    };
    ws.onopen = () => {
      reconnectAttempt = 0;
    };
  }
  connect();
}

export function disconnectTelemetry(): void {
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  onMessageHandler = null;
}
