CREATE TABLE "content_revisions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"entity_type" varchar(16) NOT NULL,
	"entity_id" varchar NOT NULL,
	"document" jsonb NOT NULL,
	"source" varchar(16) NOT NULL,
	"created_by" varchar
);
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "content_revisions_entity_created_idx" ON "content_revisions" USING btree ("entity_type","entity_id","created_at");
