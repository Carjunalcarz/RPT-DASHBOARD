-- AlterTable
ALTER TABLE "setup_signatories" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "setup_signatory_templates" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "appraised_by_id" UUID,
    "assessed_by_id" UUID,
    "recommending_by_id" UUID,
    "approved_by_id" UUID,
    "provincial_assessor_id" UUID,
    "city_assessor_id" UUID,
    "deputy_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "setup_signatory_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "setup_signatory_templates_year_deleted_at_key" ON "setup_signatory_templates"("year", "deleted_at");

-- AddForeignKey
ALTER TABLE "setup_signatory_templates" ADD CONSTRAINT "setup_signatory_templates_appraised_by_id_fkey" FOREIGN KEY ("appraised_by_id") REFERENCES "setup_signatories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setup_signatory_templates" ADD CONSTRAINT "setup_signatory_templates_assessed_by_id_fkey" FOREIGN KEY ("assessed_by_id") REFERENCES "setup_signatories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setup_signatory_templates" ADD CONSTRAINT "setup_signatory_templates_recommending_by_id_fkey" FOREIGN KEY ("recommending_by_id") REFERENCES "setup_signatories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setup_signatory_templates" ADD CONSTRAINT "setup_signatory_templates_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "setup_signatories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setup_signatory_templates" ADD CONSTRAINT "setup_signatory_templates_provincial_assessor_id_fkey" FOREIGN KEY ("provincial_assessor_id") REFERENCES "setup_signatories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setup_signatory_templates" ADD CONSTRAINT "setup_signatory_templates_city_assessor_id_fkey" FOREIGN KEY ("city_assessor_id") REFERENCES "setup_signatories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setup_signatory_templates" ADD CONSTRAINT "setup_signatory_templates_deputy_id_fkey" FOREIGN KEY ("deputy_id") REFERENCES "setup_signatories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
