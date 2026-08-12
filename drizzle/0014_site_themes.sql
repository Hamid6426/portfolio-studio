CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"key" varchar(64) DEFAULT 'default' NOT NULL,
	"theme_id" varchar(64) DEFAULT 'developer' NOT NULL,
	"theme_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
INSERT INTO "site_settings" ("key", "theme_id", "theme_settings")
VALUES ('default', 'developer', '{}'::jsonb)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- Grant themes route to system admin / editor (seed also upserts defaults).
UPDATE "roles"
SET "permissions" = "permissions" || CASE
  WHEN "permissions" LIKE '%route:/dashboard/themes/%' THEN ''
  WHEN "permissions" = '' THEN 'route:/dashboard/themes/*,button:themes-edit'
  ELSE ',route:/dashboard/themes/*,button:themes-edit'
END,
    "updated_at" = now()
WHERE "role_name" IN ('admin', 'editor')
  AND "permissions" NOT LIKE '%route:/dashboard/themes/%';
