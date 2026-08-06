ALTER TABLE `categories` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `icon` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `color` text;--> statement-breakpoint
UPDATE `categories` SET `sort_order` = (SELECT COUNT(*) FROM `categories` c2 WHERE c2.`name` < `categories`.`name`);
