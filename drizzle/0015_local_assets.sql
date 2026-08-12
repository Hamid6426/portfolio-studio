CREATE TABLE "assets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"stored_name" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size_bytes" integer NOT NULL,
	"url" varchar(512) NOT NULL,
	"uploaded_by" varchar,
	CONSTRAINT "assets_stored_name_unique" UNIQUE("stored_name")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "assets_uploaded_by_idx" ON "assets" USING btree ("uploaded_by");
--> statement-breakpoint

UPDATE "roles"
SET "permissions" = "permissions" || CASE
  WHEN "permissions" LIKE '%route:/dashboard/media/%' THEN ''
  WHEN "permissions" = '' THEN 'route:/dashboard/media/*,button:media-upload,button:media-delete'
  ELSE ',route:/dashboard/media/*,button:media-upload,button:media-delete'
END,
    "updated_at" = now()
WHERE "role_name" IN ('admin', 'editor')
  AND "permissions" NOT LIKE '%route:/dashboard/media/%';
