ALTER TABLE "pages" DROP CONSTRAINT "pages_layout_id_layouts_id_fk";--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"can_be_layout" boolean DEFAULT false NOT NULL,
	"children" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "blocks_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
INSERT INTO "blocks" (
	"id",
	"published_at",
	"deleted_at",
	"created_at",
	"updated_at",
	"name",
	"slug",
	"description",
	"can_be_layout",
	"children"
)
SELECT
	"id",
	"published_at",
	"deleted_at",
	"created_at",
	"updated_at",
	"name",
	"slug",
	"description",
	true,
	"structure"
FROM "layouts";--> statement-breakpoint
ALTER TABLE "pages" RENAME COLUMN "layout_id" TO "block_id";--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DROP TABLE "layouts";
