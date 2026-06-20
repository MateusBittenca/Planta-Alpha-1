-- CreateTable
CREATE TABLE "layout_versions" (
    "id" TEXT NOT NULL,
    "planta_id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "autor" TEXT,
    "mensagem" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "layout_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "layout_versions_planta_id_created_at_idx" ON "layout_versions"("planta_id", "created_at");

-- AddForeignKey
ALTER TABLE "layout_versions" ADD CONSTRAINT "layout_versions_planta_id_fkey" FOREIGN KEY ("planta_id") REFERENCES "plantas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
