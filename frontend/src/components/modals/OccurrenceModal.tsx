import { FormEvent, useEffect, useState } from 'react';
import type { OcorrenciaFront } from '@sgm/shared';
import { usePlantaStore } from '../../store/plantaStore';

export function OccurrenceModal() {
  const occurrenceOpen = usePlantaStore((s) => s.occurrenceOpen);
  const selectedId = usePlantaStore((s) => s.selectedId);
  const selectedMachineId = usePlantaStore((s) => s.selectedMachineId);
  const closeOccurrenceModal = usePlantaStore((s) => s.closeOccurrenceModal);
  const saveOccurrence = usePlantaStore((s) => s.saveOccurrence);
  const loadOcorrenciasRecent = usePlantaStore((s) => s.loadOcorrenciasRecent);
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('parada');
  const [recent, setRecent] = useState<OcorrenciaFront[]>([]);

  const asset = selectedMachineId || selectedId || '';

  useEffect(() => {
    if (occurrenceOpen) {
      void loadOcorrenciasRecent().then(setRecent);
    }
  }, [occurrenceOpen, loadOcorrenciasRecent]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await saveOccurrence(asset, type, desc);
    setDesc('');
    const list = await loadOcorrenciasRecent();
    setRecent(list);
    closeOccurrenceModal();
  };

  return (
    <div className={`modal ${occurrenceOpen ? 'open' : ''}`} id="modal-occurrence" role="dialog" aria-modal="true" aria-label="Registrar Ocorrência">
      <div className="modal-panel m-4">
        <div className="p-6 border-b border-outline-variant flex justify-between">
          <h2 className="font-bold text-headline-md">Registrar Ocorrência</h2>
          <button type="button" onClick={closeOccurrenceModal} aria-label="Fechar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form className="p-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label className="text-label-sm font-bold block mb-1">Ativo</label>
            <input className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white" value={asset} readOnly />
          </div>
          <div>
            <label className="text-label-sm font-bold block mb-1">Tipo</label>
            <select
              className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              <option value="parada">Parada</option>
              <option value="qualidade">Qualidade</option>
              <option value="material">Material</option>
              <option value="manutencao">Manutenção</option>
            </select>
          </div>
          <div>
            <label className="text-label-sm font-bold block mb-1">Descrição</label>
            <textarea
              className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-white"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="w-full py-3 bg-primary text-white font-label-md rounded">
            Salvar
          </button>
        </form>
        <div className="px-6 pb-6">
          <p className="text-label-sm font-bold uppercase mb-2">Recentes</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recent.length ? (
              recent.slice(0, 8).map((o, i) => (
                <div key={i} className="text-label-sm border-b border-outline-variant pb-2">
                  <strong>{o.time}</strong> {o.asset} — {o.type}
                  <br />
                  <span className="text-on-surface-variant">{o.desc}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-on-surface-variant">Nenhuma ocorrência.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
