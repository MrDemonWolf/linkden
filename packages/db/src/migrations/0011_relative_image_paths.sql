-- Data fix (custom migration, no schema change): uploads used to be stored as
-- absolute URLs on the API's origin (`https://<api host>/api/images/<key>`), so
-- moving the site to another origin (workers.dev → custom domain, or the
-- single-origin proxy) broke every saved image. Uploads are now stored as the
-- origin-relative path the API returns; rewrite existing rows to match.
-- Only values whose whole content is one URL ending in an /api/images/ key.
UPDATE `site_settings`
SET `value` = substr(`value`, instr(`value`, '/api/images/'))
WHERE `key` IN (
	'avatar_url', 'banner_custom_url', 'seo_og_image', 'branding_logo_url',
	'branding_login_logo_url', 'branding_login_bg_custom_url', 'branding_favicon_url',
	'wallet_logo_url', 'wallet_icon_url', 'wallet_thumbnail_url', 'wallet_strip_url'
)
	AND `value` LIKE 'http%://%/api/images/%'
	AND instr(`value`, ' ') = 0;
--> statement-breakpoint
UPDATE `block`
SET `config` = json_set(
	`config`,
	'$.thumbnail',
	substr(json_extract(`config`, '$.thumbnail'), instr(json_extract(`config`, '$.thumbnail'), '/api/images/'))
)
WHERE json_valid(`config`)
	AND json_extract(`config`, '$.thumbnail') LIKE 'http%://%/api/images/%';
--> statement-breakpoint
UPDATE `block`
SET `config` = json_set(
	`config`,
	'$.src',
	substr(json_extract(`config`, '$.src'), instr(json_extract(`config`, '$.src'), '/api/images/'))
)
WHERE json_valid(`config`)
	AND json_extract(`config`, '$.src') LIKE 'http%://%/api/images/%';
