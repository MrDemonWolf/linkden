-- Data fixes for existing installs (custom migration, no schema change).
--
-- 1. The setup wizard creates the single admin through signUp.email and never
--    sends a verification email, so `email_verified` stayed 0. Better Auth's
--    magic-link verify treats an unverified user as unproven and deletes their
--    password and every session on the first magic-link sign-in. New admins are
--    now created verified (packages/auth createAuthOptions databaseHooks); this
--    backfills the admin that already exists.
UPDATE `user` SET `email_verified` = 1 WHERE `email_verified` = 0;--> statement-breakpoint
-- 2. 0003 renamed `contact_form` blocks to `form`; LD-4 then replaced the form
--    block with `connect` without migrating rows, so those blocks rendered as
--    nothing. The old form config keys (buttonText, preset, show*, ...) are a
--    subset of connectConfigSchema, so the config is kept as-is.
UPDATE `block` SET `type` = 'connect' WHERE `type` IN ('form', 'contact_form');
