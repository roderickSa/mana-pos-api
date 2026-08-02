CREATE TABLE `product_lots` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`expiry_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `product_lots_product_idx` ON `product_lots` (`product_id`);
--> statement-breakpoint
INSERT INTO `product_lots` (`id`, `product_id`, `quantity`, `expiry_date`, `created_at`)
SELECT 'lote-inicial-' || `id`, `id`, `stock_quantity`, `expiry_date`, CAST(strftime('%s','now') AS INTEGER) * 1000
FROM `products`
WHERE `expiry_date` IS NOT NULL AND `stock_quantity` > 0;
