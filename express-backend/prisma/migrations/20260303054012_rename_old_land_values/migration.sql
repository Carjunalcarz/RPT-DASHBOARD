/*
  Warnings:

  - You are about to drop the `land_market_values` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "land_market_values";

-- CreateTable
CREATE TABLE "simple_land_market_values" (
    "id" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "sub_class" TEXT,
    "first_class" DECIMAL(12,2),
    "second_class" DECIMAL(12,2),
    "third_class" DECIMAL(12,2),
    "fourth_class" DECIMAL(12,2),
    "unit" TEXT NOT NULL DEFAULT 'SQM',
    "ordinance_no" TEXT NOT NULL DEFAULT '716-2024',
    "ordinance_date" DATE,
    "effectivity_year" INTEGER NOT NULL DEFAULT 2025,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simple_land_market_values_pkey" PRIMARY KEY ("id")
);
