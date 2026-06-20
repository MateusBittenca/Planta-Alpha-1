# SGM Industrial

Sistema de monitoramento operacional de planta industrial com gêmeo digital 3D (Three.js) e planta baixa 2D (SVG) — **Planta Alpha-1**.

Monorepo npm workspaces: `backend` (Fastify + Prisma), `frontend` (React + Vite), `packages/shared` (tipos compartilhados).

## Pré-requisitos

- Node.js 20 LTS
- Docker e Docker Compose

## Setup rápido

```bash
# Na raiz do repositório
npm install

# Banco PostgreSQL (porta host 15432)
npm run db:up
npm run db:migrate
npm run db:seed

# Backend + Frontend em paralelo
npm run dev
```

| Serviço | URL |
|---------|-----|
| Frontend React | http://localhost:5173 |
| API REST | http://localhost:3000/api |
| WebSocket | ws://localhost:3000/ws/telemetry?plantaId=alpha-1 |
| Prisma Studio | `npm run db:studio` |

## Variáveis de ambiente

```bash
cp .env.example backend/.env
cp frontend/.env.example frontend/.env   # opcional — Vite usa proxy em dev
```

`CORS_ORIGIN` no `backend/.env` deve incluir `http://localhost:5173`.

## Modo mock (offline)

```
http://localhost:5173?mock=1
```

Sem backend: dados locais + simulador de telemetria no navegador.

Legado HTML (referência): `docs/legacy/html-app/index.html`

## Estrutura

```
├── backend/          # API Fastify + Prisma + WebSocket
├── frontend/         # React 18 + TypeScript + Vite + Tailwind
├── packages/shared/  # @sgm/shared — contratos PlantaResponse, WsMessage
├── docs/legacy/      # HTML monolítico arquivado
└── docker-compose.yml
```

## Scripts (raiz)

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Backend + frontend em paralelo |
| `npm run dev:backend` | Apenas API (porta 3000) |
| `npm run dev:frontend` | Apenas Vite (porta 5173) |
| `npm run build` | Build shared → backend → frontend |
| `npm run db:up` | Sobe PostgreSQL via Docker |
| `npm run db:migrate` | Prisma migrate |
| `npm run db:seed` | Seed Planta Alpha-1 |

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `db: disconnected` | `docker compose ps` — porta host `15432` |
| CORS bloqueado | Incluir `http://localhost:5173` em `CORS_ORIGIN` |
| Front sem dados | Backend em `:3000` ou use `?mock=1` |
| Build falha em `@sgm/shared` | `npm run build -w @sgm/shared` antes do front |

## Editor de Planta

Modo **Editar layout** na TopBar (atalho `V` para voltar a Operar).

| Ferramenta | Atalho | Ação |
|------------|--------|------|
| Selecionar | `S` | Mover/redimensionar setores (8 handles) |
| Retângulo | `R` | Desenhar novo setor (click + drag) |
| Máquina | `M` | Clicar no setor para posicionar; arrastar com Selecionar |
| Pan | toolbar | Arrastar o canvas |

- **Posição de máquina:** `posicao2d` persistido; drag com snap 40px dentro do setor.
- **Dimensões:** label flutuante em px e metros (`fatorEscala` da planta).
- **Validação visual:** sobreposição de setores (aviso), máquina fora do setor (bloqueia auto-save).
- **Auto-save:** debounce 2,5s (toggle na toolbar); toasts de sucesso/erro.
- **Histórico:** cada save cria `LayoutVersion` no PostgreSQL.
- **Salvar:** botão na toolbar ou `⌘S` — persiste via API REST; `layout3d` derivado no backend.
- **Undo/redo:** `Ctrl+Z` / `Ctrl+Shift+Z`
- **Gêmeo 3D:** visualize após salvar, alternando para o modo **Operar**.
- **Snap to grid:** 40px (mesmo grid do viewer).

Documentação detalhada no vault Obsidian `SGM Industrial/` (notas *Editor de Planta — …*).

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/plantas/:id` | Planta completa |
| GET | `/plantas/:id/dashboard` | Dashboard agregado |
| GET | `/alertas?plantaId=` | Alertas ativos |
| GET | `/ocorrencias?plantaId=` | Ocorrências recentes |
| POST | `/ocorrencias` | Registrar ocorrência |
| POST | `/andon` | Acionar Andon |
| GET | `/maquinas/:id/analytics` | Análise profunda |

### Layout (editor)

Header opcional `X-SGM-Role`: `viewer` | `editor` | `admin` (stub RBAC; padrão `editor`).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/plantas/:id/layout` | Planta completa para edição |
| POST | `/plantas/:plantaId/setores` | Criar setor |
| PATCH | `/setores/:id` | Metadados do setor |
| PATCH | `/setores/:id/layout` | Atualizar `layout2d` (+ deriva `layout3d`) |
| DELETE | `/setores/:id` | Remover setor e máquinas |
| POST | `/setores/:setorId/maquinas` | Criar máquina |
| PATCH | `/maquinas/:id` | Atualizar máquina |
| PATCH | `/maquinas/:id/position` | Posição 2D da máquina |
| DELETE | `/maquinas/:id` | Remover máquina |
| POST | `/plantas/:id/layout/publish` | Snapshot `LayoutVersion` |
| GET | `/plantas/:id/layout/versions` | Histórico de versões |
| GET | `/plantas/:id/layout/versions/:versionId` | Snapshot completo |
