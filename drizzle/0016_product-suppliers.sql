CREATE TABLE `product_suppliers` (
	`product_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	PRIMARY KEY(`product_id`, `supplier_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `product_suppliers_supplier_idx` ON `product_suppliers` (`supplier_id`);--> statement-breakpoint
INSERT INTO `product_suppliers` (`product_id`, `supplier_id`) SELECT `id`, `supplier_id` FROM `products` WHERE `supplier_id` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `supplier_id`;
