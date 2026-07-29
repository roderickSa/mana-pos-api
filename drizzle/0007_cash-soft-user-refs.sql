PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cash_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`cash_session_id` text NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`concept` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_cash_movements`("id", "cash_session_id", "type", "amount_cents", "concept", "user_id", "created_at") SELECT "id", "cash_session_id", "type", "amount_cents", "concept", "user_id", "created_at" FROM `cash_movements`;--> statement-breakpoint
DROP TABLE `cash_movements`;--> statement-breakpoint
ALTER TABLE `__new_cash_movements` RENAME TO `cash_movements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `cash_movements_session_idx` ON `cash_movements` (`cash_session_id`);--> statement-breakpoint
CREATE TABLE `__new_cash_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`shift` text NOT NULL,
	`status` text NOT NULL,
	`opened_by` text NOT NULL,
	`opened_at` integer NOT NULL,
	`opening_amount_cents` integer NOT NULL,
	`closed_by` text,
	`closed_at` integer,
	`expected_cash_cents` integer,
	`counted_cash_cents` integer
);
--> statement-breakpoint
INSERT INTO `__new_cash_sessions`("id", "shift", "status", "opened_by", "opened_at", "opening_amount_cents", "closed_by", "closed_at", "expected_cash_cents", "counted_cash_cents") SELECT "id", "shift", "status", "opened_by", "opened_at", "opening_amount_cents", "closed_by", "closed_at", "expected_cash_cents", "counted_cash_cents" FROM `cash_sessions`;--> statement-breakpoint
DROP TABLE `cash_sessions`;--> statement-breakpoint
ALTER TABLE `__new_cash_sessions` RENAME TO `cash_sessions`;--> statement-breakpoint
CREATE INDEX `cash_sessions_status_idx` ON `cash_sessions` (`status`);