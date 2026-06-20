function seedHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function makeMachine(id: string, name: string, status: string, baseOee?: number) {
  const h = seedHash(id);
  return {
    id,
    name,
    status,
    kpis: {
      oee: baseOee !== undefined ? baseOee : 75 + (h % 20),
      temp: 36 + (h % 16),
      rpm: 1400 + (h % 2000),
    },
    limits: { tempMax: 50 + (h % 10) },
    opAtiva: status === 'operando' || status === 'alerta' ? `#${4500 + (h % 200)}` : null,
    oeeHistory: Array.from({ length: 12 }, (_, i) =>
      Math.max(60, (baseOee || 80) - 5 + ((h + i * 7) % 15))
    ),
  };
}

type SectorExtra = {
  op?: { id: string; produto: string; planejada: number; produzida: number; eta: string };
  manutencao?: { tecnico: string; minRestantes: number; checklist: string[] };
};

export function makeSector(
  id: string,
  name: string,
  type: string,
  status: string,
  desc: string,
  kpis: Record<string, unknown>,
  l2d: { x: number; y: number; w: number; h: number },
  l3d: { x: number; z: number; w: number; d: number; h: number },
  machines: ReturnType<typeof makeMachine>[],
  extra?: SectorExtra,
  ordem = 0
) {
  return { id, name, type, status, description: desc, kpis, layout2d: l2d, layout3d: l3d, maquinas: machines, ordem, ...extra };
}

export const PLANTA_SEED = {
  id: 'alpha-1',
  nome: 'Planta Alpha-1',
  turnoAtual: 2,
  simHour: 14,
  simMinute: 30,
  setores: [
    makeSector(
      'recebimento', 'Recebimento', 'logística', 'operando', 'Descarga e triagem de componentes.',
      { headcount: 8, oee: null, status_operacional: 'Normal' },
      { x: 40, y: 580, w: 180, h: 90 }, { x: -55, z: 45, w: 16, d: 22, h: 2 },
      [makeMachine('REC-M1', 'Doca 1', 'operando', 90), makeMachine('REC-M2', 'Doca 2', 'operando', 88)],
      undefined, 0
    ),
    makeSector(
      'smt-1', 'Linha SMT 1', 'produção', 'operando', 'Montagem em superfície alta velocidade.',
      { headcount: 12, oee: 88, status_operacional: 'Executando OP #4521' },
      { x: 40, y: 200, w: 280, h: 75 }, { x: -38, z: 12, w: 32, d: 14, h: 2 },
      [
        makeMachine('SMT-1-M1', 'Pick & Place 1', 'operando', 91),
        makeMachine('SMT-1-M2', 'Pick & Place 2', 'operando', 87),
        makeMachine('SMT-1-M3', 'Reflow 1', 'operando', 89),
        makeMachine('SMT-1-M4', 'SPI', 'operando', 85),
        makeMachine('SMT-1-M5', 'AOI Inline', 'operando', 90),
      ],
      { op: { id: 'OP #4521', produto: 'Módulo BCM v2.4', planejada: 2400, produzida: 1840, eta: '18:45' } },
      1
    ),
    makeSector(
      'smt-2', 'Linha SMT 2', 'produção', 'manutencao', 'SMT módulos de controle de potência.',
      { headcount: 4, oee: 0, status_operacional: 'Troca de bicos (Preventiva)' },
      { x: 40, y: 295, w: 280, h: 75 }, { x: -38, z: -8, w: 32, d: 14, h: 2 },
      [
        makeMachine('SMT-2-M1', 'Pick & Place 1', 'alerta', 0),
        makeMachine('SMT-2-M2', 'Pick & Place 2', 'manutencao', 0),
        makeMachine('SMT-2-M3', 'Reflow 2', 'manutencao', 0),
        makeMachine('SMT-2-M4', 'AOI', 'offline', 0),
      ],
      {
        manutencao: {
          tecnico: 'Carlos Mendes',
          minRestantes: 45,
          checklist: ['Desmontar bicos zona 3', 'Inspeção visual', 'Calibração torque', 'Teste deposição'],
        },
      },
      2
    ),
    makeSector(
      'soldagem', 'Soldagem Reflow', 'produção', 'operando', 'Processo reflow e inspeção pós-SMT.',
      { headcount: 6, oee: 86, status_operacional: 'Fluxo contínuo' },
      { x: 340, y: 200, w: 120, h: 170 }, { x: -5, z: 12, w: 14, d: 18, h: 2 },
      [makeMachine('SOL-M1', 'Forno Reflow', 'operando', 88), makeMachine('SOL-M2', 'Lava Flux', 'operando', 84)],
      undefined, 3
    ),
    makeSector(
      'wip', 'Depósito WIP', 'logística', 'operando', 'Buffer entre linhas SMT e montagem.',
      { headcount: 3, oee: null, status_operacional: '12 pallets ativos' },
      { x: 340, y: 390, w: 120, h: 80 }, { x: -5, z: -5, w: 14, d: 12, h: 2 },
      [makeMachine('WIP-M1', 'Scanner WIP', 'operando', 95), makeMachine('WIP-M2', 'AGV Station', 'operando', 92)],
      undefined, 4
    ),
    makeSector(
      'montagem', 'Montagem Final', 'produção', 'operando', 'Montagem mecânica e chicotes elétricos.',
      { headcount: 25, oee: 92, status_operacional: 'Fluxo contínuo' },
      { x: 480, y: 200, w: 320, h: 270 }, { x: 18, z: -2, w: 42, d: 40, h: 2 },
      [
        makeMachine('MON-M1', 'Estação 1', 'operando', 93),
        makeMachine('MON-M2', 'Estação 2', 'operando', 91),
        makeMachine('MON-M3', 'Estação 3', 'operando', 90),
        makeMachine('MON-M4', 'Estação 4', 'operando', 89),
        makeMachine('MON-M5', 'Estação 5', 'operando', 92),
        makeMachine('MON-M6', 'Estação 6', 'operando', 88),
        makeMachine('MON-M7', 'Crimpagem', 'operando', 87),
        makeMachine('MON-M8', 'Crimpagem 2', 'operando', 86),
        makeMachine('MON-M9', 'Teste Inline', 'operando', 94),
        makeMachine('MON-M10', 'Torque', 'operando', 91),
        makeMachine('MON-M11', 'Visual', 'operando', 90),
        makeMachine('MON-M12', 'Embalagem parcial', 'operando', 89),
      ],
      { op: { id: 'OP #4520', produto: 'Harness Assembly A12', planejada: 1800, produzida: 1420, eta: '19:30' } },
      5
    ),
    makeSector(
      'qc', 'Teste / QC', 'qualidade', 'operando', 'QC, testes funcionais e AOI.',
      { headcount: 10, oee: 99.4, status_operacional: 'Yield 99.4%' },
      { x: 820, y: 200, w: 160, h: 140 }, { x: 42, z: 12, w: 20, d: 18, h: 2 },
      [
        makeMachine('QC-M1', 'AOI Final', 'operando', 99),
        makeMachine('QC-M2', 'ICT', 'operando', 98),
        makeMachine('QC-M3', 'FCT', 'operando', 97),
        makeMachine('QC-M4', 'Visual QC', 'operando', 99),
        makeMachine('QC-M5', 'Laser Mark', 'operando', 96),
        makeMachine('QC-M6', 'Pack Scan', 'operando', 98),
      ],
      undefined, 6
    ),
    makeSector(
      'emc', 'EMC / Teste Elétrico', 'qualidade', 'operando', 'Testes EMC e elétricos automotivos.',
      { headcount: 5, oee: 96, status_operacional: 'Sequência ativa' },
      { x: 820, y: 360, w: 160, h: 90 }, { x: 42, z: -5, w: 18, d: 12, h: 2 },
      [makeMachine('EMC-M1', 'Câmara EMC', 'operando', 95), makeMachine('EMC-M2', 'Hipot', 'operando', 97)],
      undefined, 7
    ),
    makeSector(
      'expedicao', 'Embalagem & Expedição', 'logística', 'operando', 'Embalagem final e expedição.',
      { headcount: 7, oee: 94, status_operacional: '3 docas ativas' },
      { x: 820, y: 470, w: 200, h: 100 }, { x: 55, z: 35, w: 22, d: 16, h: 2 },
      [
        makeMachine('EXP-M1', 'Palete 1', 'operando', 93),
        makeMachine('EXP-M2', 'Palete 2', 'operando', 91),
        makeMachine('EXP-M3', 'Doca Exp', 'operando', 95),
      ],
      undefined, 8
    ),
  ],
};

export const ALERTAS_SEED = [
  {
    severidade: 'aviso',
    msg: 'SMT 2 em manutenção preventiva — OP pausada',
    sectorId: 'smt-2',
    machineId: null as string | null,
  },
  {
    severidade: 'info',
    msg: 'QC: Yield estável em 99.4%',
    sectorId: 'qc',
    machineId: null as string | null,
  },
];
