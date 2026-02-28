PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_social_network` (
	`slug` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`added_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_social_network`("slug", "url", "is_active", "added_at") SELECT "slug", COALESCE("url", ''), "is_active", "added_at" FROM `social_network` WHERE "url" IS NOT NULL AND "url" != '';--> statement-breakpoint
DROP TABLE `social_network`;--> statement-breakpoint
ALTER TABLE `__new_social_network` RENAME TO `social_network`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `social_network_isActive_idx` ON `social_network` (`is_active`);