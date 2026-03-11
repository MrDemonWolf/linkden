ALTER TABLE `contact_submission` ADD `block_id` text;--> statement-breakpoint
ALTER TABLE `contact_submission` ADD `block_title` text;--> statement-breakpoint
CREATE INDEX `contact_submission_blockId_idx` ON `contact_submission` (`block_id`);