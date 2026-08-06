ALTER TABLE `tickets` ADD `customer_id` text REFERENCES customers(id);
