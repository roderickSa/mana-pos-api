PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`status` text NOT NULL,
	`cash_session_id` text,
	`user_id` text NOT NULL,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`charged_at` integer,
	`voided_at` integer,
	`voided_by` text,
	FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_tickets`("id", "number", "status", "cash_session_id", "user_id", "total_cents", "created_at", "charged_at", "voided_at", "voided_by") SELECT "id", "number", "status", "cash_session_id", "user_id", "total_cents", "created_at", "charged_at", "voided_at", "voided_by" FROM `tickets`;--> statement-breakpoint
DROP TABLE `tickets`;--> statement-breakpoint
ALTER TABLE `__new_tickets` RENAME TO `tickets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `tickets` (`status`);--> statement-breakpoint
CREATE INDEX `tickets_session_idx` ON `tickets` (`cash_session_id`);