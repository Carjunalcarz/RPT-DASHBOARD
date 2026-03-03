-- CreateTable
CREATE TABLE "municipalities" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_classifications" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_sub_classes" (
    "id" SERIAL NOT NULL,
    "classification_id" INTEGER NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_sub_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_market_values" (
    "id" SERIAL NOT NULL,
    "municipality_id" INTEGER NOT NULL,
    "sub_class_id" INTEGER NOT NULL,
    "classLevel" VARCHAR(20) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'SQM',
    "ordinance_no" VARCHAR(50) NOT NULL,
    "effectivity_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_market_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipalities_code_key" ON "municipalities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "land_classifications_code_key" ON "land_classifications"("code");

-- CreateIndex
CREATE UNIQUE INDEX "land_sub_classes_classification_id_code_key" ON "land_sub_classes"("classification_id", "code");

-- CreateIndex
CREATE INDEX "land_market_values_municipality_id_idx" ON "land_market_values"("municipality_id");

-- CreateIndex
CREATE INDEX "land_market_values_sub_class_id_idx" ON "land_market_values"("sub_class_id");

-- CreateIndex
CREATE INDEX "land_market_values_ordinance_no_idx" ON "land_market_values"("ordinance_no");

-- CreateIndex
CREATE INDEX "land_market_values_effectivity_date_idx" ON "land_market_values"("effectivity_date");

-- AddForeignKey
ALTER TABLE "land_sub_classes" ADD CONSTRAINT "land_sub_classes_classification_id_fkey" FOREIGN KEY ("classification_id") REFERENCES "land_classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_market_values" ADD CONSTRAINT "land_market_values_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_market_values" ADD CONSTRAINT "land_market_values_sub_class_id_fkey" FOREIGN KEY ("sub_class_id") REFERENCES "land_sub_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
