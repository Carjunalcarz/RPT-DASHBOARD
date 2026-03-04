-- CreateTable
CREATE TABLE "building_appraisals" (
    "id" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "classification_code" TEXT NOT NULL,
    "building_type" TEXT NOT NULL,
    "building_subclass" TEXT,
    "rate" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "building_appraisals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faas_records" (
    "id" TEXT NOT NULL,
    "tdn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "data" JSONB NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faas_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_logs" (
    "id" SERIAL NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'synced',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "migration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faas_records_tdn_key" ON "faas_records"("tdn");

-- CreateIndex
CREATE INDEX "migration_logs_source_id_idx" ON "migration_logs"("source_id");
