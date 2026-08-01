CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`supplier_id` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `purchase_orders_status_idx` ON `purchase_orders` (`status`);--> statement-breakpoint
CREATE TABLE `purchase_order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`description` text NOT NULL,
	`sale_type` text NOT NULL,
	`quantity_ordered` integer NOT NULL,
	`quantity_received` integer DEFAULT 0 NOT NULL,
	`unit_cost_cents` integer NOT NULL,
	`pack_size` integer,
	`pack_cost_cents` integer,
	FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `purchase_order_lines_order_idx` ON `purchase_order_lines` (`order_id`);
