ALTER TABLE "blocks" ALTER COLUMN "children" SET DEFAULT '{"version":1,"nodes":[]}'::jsonb;--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "content" SET DEFAULT '{"version":1,"nodes":[]}'::jsonb;--> statement-breakpoint
-- Legacy bare BlockNode[] → BlockDocument v1 (idempotent: only touches arrays).
UPDATE "pages"
SET "content" = jsonb_build_object('version', 1, 'nodes', "content")
WHERE jsonb_typeof("content") = 'array';--> statement-breakpoint
UPDATE "pages"
SET "published_snapshot" = jsonb_set(
  "published_snapshot",
  '{content}',
  jsonb_build_object('version', 1, 'nodes', "published_snapshot"->'content')
)
WHERE "published_snapshot" IS NOT NULL
  AND jsonb_typeof("published_snapshot"->'content') = 'array';--> statement-breakpoint
UPDATE "blocks"
SET "children" = jsonb_build_object('version', 1, 'nodes', "children")
WHERE jsonb_typeof("children") = 'array';
