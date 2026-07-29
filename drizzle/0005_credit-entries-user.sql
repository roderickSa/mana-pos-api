PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_credit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`ticket_id` text,
	`payment_method` text,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_credit_entries`("id", "customer_id", "type", "amount_cents", "ticket_id", "payment_method", "user_id", "created_at") SELECT "id", "customer_id", "type", "amount_cents", "ticket_id", "payment_method", "user_id", "created_at" FROM `credit_entries`;--> statement-breakpoint
DROP TABLE `credit_entries`;--> statement-breakpoint
ALTER TABLE `__new_credit_entries` RENAME TO `credit_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `credit_entries_customer_idx` ON `credit_entries` (`customer_id`);