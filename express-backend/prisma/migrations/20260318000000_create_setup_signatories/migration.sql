CREATE TABLE IF NOT EXISTS "public"."setup_signatories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(200) NOT NULL,
  "title" varchar(200) NOT NULL,
  "department" varchar(200) NOT NULL,
  "email" varchar(254),
  "phone" varchar(50),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by_id" uuid,
  "updated_by_id" uuid,
  "deleted_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "setup_signatories_deleted_at_idx" ON "public"."setup_signatories" ("deleted_at");
CREATE INDEX IF NOT EXISTS "setup_signatories_department_idx" ON "public"."setup_signatories" ("department");
CREATE INDEX IF NOT EXISTS "setup_signatories_title_idx" ON "public"."setup_signatories" ("title");
CREATE INDEX IF NOT EXISTS "setup_signatories_name_idx" ON "public"."setup_signatories" ("name");
CREATE INDEX IF NOT EXISTS "setup_signatories_is_active_idx" ON "public"."setup_signatories" ("is_active");
