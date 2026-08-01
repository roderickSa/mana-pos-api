CREATE TABLE `product_barcodes` (
	`barcode` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `product_barcodes_product_idx` ON `product_barcodes` (`product_id`);
