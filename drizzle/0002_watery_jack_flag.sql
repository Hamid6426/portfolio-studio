CREATE TABLE "roles" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"role_name" varchar(64) NOT NULL,
	"permissions" text DEFAULT '' NOT NULL,
	CONSTRAINT "roles_role_name_unique" UNIQUE("role_name")
);
