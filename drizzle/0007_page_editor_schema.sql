ALTER TABLE "blocks" DROP CONSTRAINT "blocks_slug_unique";--> statement-breakpoint
ALTER TABLE "blocks" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "content" jsonb DEFAULT '[]'::jsonb NOT NULL;
