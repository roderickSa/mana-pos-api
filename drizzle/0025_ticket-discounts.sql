ALTER TABLE `tickets` ADD `discount_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `discount_authorized_by` text;
