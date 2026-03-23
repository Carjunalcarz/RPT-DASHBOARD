CREATE TABLE IF NOT EXISTS "orders_of_payment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_number" text NOT NULL UNIQUE,
  "created_by" uuid NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'pending',
  "date_created" timestamptz NOT NULL DEFAULT now(),
  "date_modified" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "orders_of_payment_status_check" CHECK ("status" IN ('pending','paid','cancelled'))
);

CREATE INDEX IF NOT EXISTS "orders_of_payment_status_idx" ON "orders_of_payment" ("status");
CREATE INDEX IF NOT EXISTS "orders_of_payment_date_created_idx" ON "orders_of_payment" ("date_created");

CREATE TABLE IF NOT EXISTS "oop_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders_of_payment"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "performed_by" uuid NOT NULL,
  "payload" jsonb NOT NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "oop_history_action_check" CHECK ("action" IN ('created','updated','paid','cancelled'))
);

CREATE INDEX IF NOT EXISTS "oop_history_order_id_timestamp_idx" ON "oop_history" ("order_id", "timestamp");
CREATE INDEX IF NOT EXISTS "oop_history_action_idx" ON "oop_history" ("action");

CREATE OR REPLACE FUNCTION set_date_modified_orders_of_payment()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_modified = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_date_modified_orders_of_payment ON "orders_of_payment";
CREATE TRIGGER trg_set_date_modified_orders_of_payment
BEFORE UPDATE ON "orders_of_payment"
FOR EACH ROW
EXECUTE FUNCTION set_date_modified_orders_of_payment();

