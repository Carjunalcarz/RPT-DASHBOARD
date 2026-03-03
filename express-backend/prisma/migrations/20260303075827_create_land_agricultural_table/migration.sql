-- CreateTable
CREATE TABLE "land_agricultural" (
    "id" SERIAL NOT NULL,
    "land_type" VARCHAR(100) NOT NULL,
    "class_level" VARCHAR(20),
    "unit_value" DECIMAL(12,2) NOT NULL,
    "ordinance_no" VARCHAR(50) NOT NULL DEFAULT '716-2024',
    "effectivity_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_agricultural_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "land_agricultural_land_type_idx" ON "land_agricultural"("land_type");
