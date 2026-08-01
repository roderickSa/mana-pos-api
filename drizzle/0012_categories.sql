CREATE TABLE `categories` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `categories` (`slug`, `name`, `active`, `created_at`) VALUES
	('frutas-verduras', 'Frutas y verduras', 1, 1785555700000),
	('abarrotes', 'Abarrotes', 1, 1785555700000),
	('bebidas', 'Bebidas', 1, 1785555700000),
	('limpieza', 'Limpieza', 1, 1785555700000),
	('pan', 'Pan', 1, 1785555700000);
