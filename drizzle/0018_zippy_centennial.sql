ALTER TABLE "assets" DROP CONSTRAINT "assets_uploaded_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_created_by_users_id_fk";
--> statement-breakpoint
DROP INDEX "assets_uploaded_by_idx";--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_live_created_idx" ON "assets" USING btree ("deleted_at","created_at");--> statement-breakpoint
CREATE INDEX "pages_block_id_idx" ON "pages" USING btree ("block_id");