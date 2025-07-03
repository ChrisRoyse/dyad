CREATE TABLE `mcp_server_resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`server_id` integer NOT NULL,
	`uri` text NOT NULL,
	`name` text,
	`description` text,
	`mime_type` text,
	`last_synced_at` integer,
	FOREIGN KEY (`server_id`) REFERENCES `mcp_servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mcp_server_tools` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`server_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`input_schema` text,
	`last_synced_at` integer,
	FOREIGN KEY (`server_id`) REFERENCES `mcp_servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mcp_servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`transport_type` text NOT NULL,
	`command` text,
	`args` text,
	`url` text,
	`env_vars` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
