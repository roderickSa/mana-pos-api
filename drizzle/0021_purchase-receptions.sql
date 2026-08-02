CREATE TABLE `purchase_receptions` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`received_at` integer NOT NULL,
	`received_by` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_reception_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`reception_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost_cents` integer NOT NULL,
	`expiry_date` integer,
	FOREIGN KEY (`reception_id`) REFERENCES `purchase_receptions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
