(function () {
  const API_BASE = 'http://localhost:3000/api';
  const WS_BASE = 'ws://localhost:3000/ws/telemetry';

  let ws = null;
  let reconnectAttempt = 0;
  let onMessageHandler = null;

  async function request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  }

  function connectTelemetry(onMessage) {
    onMessageHandler = onMessage;
    const plantaId = 'alpha-1';
    const url = `${WS_BASE}?plantaId=${plantaId}`;

    function connect() {
      ws = new WebSocket(url);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type !== 'connected' && onMessageHandler) onMessageHandler(msg);
        } catch (_) { /* ignore */ }
      };
      ws.onclose = () => {
        reconnectAttempt++;
        const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt));
        setTimeout(connect, delay);
      };
      ws.onopen = () => { reconnectAttempt = 0; };
    }
    connect();
  }

  window.SgmApi = {
    isMockMode() {
      return new URLSearchParams(location.search).has('mock');
    },

    async loadPlanta(id) {
      return request(`/plantas/${id}`);
    },

    async loadAlertas(plantaId) {
      const list = await request(`/alertas?plantaId=${plantaId}`);
      if (typeof alerts !== 'undefined') {
        alerts.length = 0;
        list.forEach((a) => alerts.push(a));
      }
      return list;
    },

    async loadOcorrencias(plantaId, limit = 8) {
      return request(`/ocorrencias?plantaId=${plantaId}&limit=${limit}`);
    },

    async saveOcorrencia(body) {
      return request('/ocorrencias', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },

    async triggerAndon(body) {
      return request('/andon', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },

    connectTelemetry,
  };
})();
