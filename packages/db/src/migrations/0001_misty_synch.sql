ALTER TABLE `block` ADD `status` text DEFAULT 'published' NOT NULL;--> statement-breakpoint
CREATE INDEX `block_status_idx` ON `block` (`status`);--> statement-breakpoint
ALTER TABLE `social_network` ADD `url` text;