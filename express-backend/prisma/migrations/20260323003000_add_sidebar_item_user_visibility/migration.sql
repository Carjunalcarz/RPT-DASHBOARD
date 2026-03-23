CREATE TABLE IF NOT EXISTS "sidebar_item_user_visibility" (
  "sidebar_item_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sidebar_item_user_visibility_pkey" PRIMARY KEY ("sidebar_item_id", "user_id"),
  CONSTRAINT "sidebar_item_user_visibility_sidebar_item_id_fkey"
    FOREIGN KEY ("sidebar_item_id") REFERENCES "sidebar_items"("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "sidebar_item_user_visibility_user_id_idx"
  ON "sidebar_item_user_visibility" ("user_id");

