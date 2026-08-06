CREATE TABLE `ticket_refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`reason` text NOT NULL,
	`registered_by` text NOT NULL,
	`refunded_to_credit` integer DEFAULT 0 NOT NULL,
	`total_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `ticket_refunds_ticket_idx` ON `ticket_refunds` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `ticket_refund_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`refund_id` text NOT NULL,
	`ticket_line_id` text NOT NULL,
	`product_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	FOREIGN KEY (`refund_id`) REFERENCES `ticket_refunds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `ticket_refund_lines_refund_idx` ON `ticket_refund_lines` (`refund_id`);
