-- CreateTable
CREATE TABLE "plantas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "turno_atual" INTEGER NOT NULL DEFAULT 2,
    "sim_hour" INTEGER NOT NULL DEFAULT 14,
    "sim_minute" INTEGER NOT NULL DEFAULT 30,
    "viewBox" TEXT NOT NULL DEFAULT '0 0 1200 750',
    "fator_escala" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setores" (
    "id" TEXT NOT NULL,
    "planta_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "layout2d" JSONB NOT NULL,
    "layout3d" JSONB NOT NULL,
    "kpis" JSONB NOT NULL,
    "op" JSONB,
    "manutencao" JSONB,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maquinas" (
    "id" TEXT NOT NULL,
    "setor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "kpis" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "op_ativa" TEXT,
    "oee_history" JSONB NOT NULL,
    "posicao_2d" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maquinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "planta_id" TEXT NOT NULL,
    "sector_id" TEXT,
    "machine_id" TEXT,
    "severidade" TEXT NOT NULL,
    "msg" TEXT NOT NULL,
    "resolvido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocorrencias" (
    "id" TEXT NOT NULL,
    "planta_id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocorrencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_log" (
    "id" TEXT NOT NULL,
    "planta_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "setores_planta_id_idx" ON "setores"("planta_id");

-- CreateIndex
CREATE INDEX "maquinas_setor_id_idx" ON "maquinas"("setor_id");

-- CreateIndex
CREATE INDEX "alertas_planta_id_resolvido_idx" ON "alertas"("planta_id", "resolvido");

-- CreateIndex
CREATE INDEX "ocorrencias_planta_id_idx" ON "ocorrencias"("planta_id");

-- CreateIndex
CREATE INDEX "eventos_log_planta_id_idx" ON "eventos_log"("planta_id");

-- AddForeignKey
ALTER TABLE "setores" ADD CONSTRAINT "setores_planta_id_fkey" FOREIGN KEY ("planta_id") REFERENCES "plantas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maquinas" ADD CONSTRAINT "maquinas_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "setores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_planta_id_fkey" FOREIGN KEY ("planta_id") REFERENCES "plantas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_planta_id_fkey" FOREIGN KEY ("planta_id") REFERENCES "plantas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_log" ADD CONSTRAINT "eventos_log_planta_id_fkey" FOREIGN KEY ("planta_id") REFERENCES "plantas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
