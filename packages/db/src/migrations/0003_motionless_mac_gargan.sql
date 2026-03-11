ALTER TABLE `contact_submission` ADD `where_met` text;--> statement-breakpoint
ALTER TABLE `contact_submission` ADD `rating` integer;--> statement-breakpoint
ALTER TABLE `contact_submission` ADD `attending` text;--> statement-breakpoint
ALTER TABLE `contact_submission` ADD `guests` integer;--> statement-breakpoint
UPDATE `block` SET `type` = 'form' WHERE `type` = 'contact_form';