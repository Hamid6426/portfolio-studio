-- Rewrite system role grants after route permissions became exact / explicit-wildcard.
-- Removes the over-broad `route:/dashboard` prefix escalation.
UPDATE "roles"
SET "permissions" = 'route:/dashboard/*,route:/dashboard/overview,route:/dashboard/users/*,route:/dashboard/roles/*,route:/dashboard/pages/*,route:/dashboard/blocks/*,route:/setup,route:/setup-guide,route:/login,button:create-admin,button:sign-in,button:sign-out,button:open-dashboard,button:users-create,button:users-edit,button:users-delete,button:roles-create,button:roles-edit,button:roles-delete,button:pages-create,button:pages-edit,button:pages-delete,button:blocks-create,button:blocks-edit,button:blocks-delete',
    "updated_at" = now()
WHERE "role_name" = 'admin';--> statement-breakpoint
UPDATE "roles"
SET "permissions" = 'route:/dashboard/overview,route:/dashboard/pages/*,route:/dashboard/blocks/*,route:/login,button:sign-in,button:sign-out,button:open-dashboard,button:pages-create,button:pages-edit,button:pages-delete,button:blocks-create,button:blocks-edit,button:blocks-delete',
    "updated_at" = now()
WHERE "role_name" = 'editor';--> statement-breakpoint
UPDATE "roles"
SET "permissions" = 'route:/dashboard/overview,route:/login,button:sign-in,button:sign-out,button:open-dashboard',
    "updated_at" = now()
WHERE "role_name" = 'viewer';
