ALTER TABLE "orders_of_payment"
ADD COLUMN IF NOT EXISTS "property_ids" JSONB NOT NULL DEFAULT '[]'::jsonb;

