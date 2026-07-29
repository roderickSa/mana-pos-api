ALTER TABLE `products` ADD `short_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `products_short_code_unique` ON `products` (`short_code`);