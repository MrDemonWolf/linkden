ALTER TABLE `user` ADD `two_factor_enabled` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `user` ADD `two_factor_secret` text;--> statement-breakpoint
ALTER TABLE `user` ADD `two_factor_backup_codes` text;