CREATE TABLE "layouts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"structure" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "layouts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"layout_id" varchar,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_layout_id_layouts_id_fk" FOREIGN KEY ("layout_id") REFERENCES "public"."layouts"("id") ON DELETE no action ON UPDATE no action;