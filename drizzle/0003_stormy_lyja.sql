ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_roles_role_name_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("role_name") ON DELETE no action ON UPDATE no action;