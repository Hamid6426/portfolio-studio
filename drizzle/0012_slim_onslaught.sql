ALTER TABLE "blocks" ADD COLUMN "published_children" jsonb;--> statement-breakpoint
CREATE INDEX "blocks_can_be_layout_idx" ON "blocks" USING btree ("can_be_layout");--> statement-breakpoint
CREATE UNIQUE INDEX "user_refresh_tokens_token_uidx" ON "user_refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_refresh_tokens_user_id_idx" ON "user_refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");