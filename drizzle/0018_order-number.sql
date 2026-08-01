ALTER TABLE `purchase_orders` ADD `number` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `purchase_orders` SET `number` = (
	SELECT COUNT(*) FROM `purchase_orders` p2 WHERE p2.`created_at` <= `purchase_orders`.`created_at`
);
