ALTER TABLE "site_settings" ADD COLUMN "default_layout_block_id" varchar;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_layout_block_id_blocks_id_fk" FOREIGN KEY ("default_layout_block_id") REFERENCES "public"."blocks"("id") ON DELETE set null ON UPDATE no action;
