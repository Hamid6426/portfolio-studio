CREATE INDEX "user_refresh_tokens_expires_at_idx" ON "user_refresh_tokens" USING btree ("expires_at");--> statement-breakpoint

-- System roles: drop catch-all `route:/dashboard/*` (default-deny undeclared paths).
UPDATE "roles"
SET "permissions" = 'route:/dashboard,route:/dashboard/overview,route:/dashboard/users/*,route:/dashboard/roles/*,route:/dashboard/pages/*,route:/dashboard/blocks/*,route:/setup,route:/setup-guide,route:/login,button:create-admin,button:sign-in,button:sign-out,button:open-dashboard,button:users-create,button:users-edit,button:users-delete,button:roles-create,button:roles-edit,button:roles-delete,button:pages-create,button:pages-edit,button:pages-delete,button:blocks-create,button:blocks-edit,button:blocks-delete',
    "updated_at" = now()
WHERE "role_name" = 'admin';--> statement-breakpoint

-- Custom roles: rewrite pre-wildcard tokens and strip the escalatory bare grant.
-- Leading/middle/trailing positions via comma-padded replace.
UPDATE "roles"
SET "permissions" = trim(both ',' from regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            ',' || "permissions" || ',',
            ',route:/dashboard,',
            ',',
            'g'
          ),
          ',route:/dashboard/\*,',
          ',',
          'g'
        ),
        ',route:/dashboard/users,',
        ',route:/dashboard/users/*,',
        'g'
      ),
      ',route:/dashboard/roles,',
      ',route:/dashboard/roles/*,',
      'g'
    ),
    ',route:/dashboard/pages,',
    ',route:/dashboard/pages/*,',
    'g'
  ),
  ',route:/dashboard/blocks,',
  ',route:/dashboard/blocks/*,',
  'g'
)),
    "updated_at" = now()
WHERE "role_name" NOT IN ('admin', 'editor', 'viewer');
