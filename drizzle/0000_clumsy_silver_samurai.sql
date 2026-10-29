CREATE TABLE `inputs` (
	`room` text NOT NULL,
	`player` text NOT NULL,
	`name` text NOT NULL,
	`party` text NOT NULL,
	`input` text NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`room`, `player`)
);
--> statement-breakpoint
CREATE TABLE `parties` (
	`code` text PRIMARY KEY NOT NULL,
	`mode` integer NOT NULL,
	`room` text,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `probe` (
	`id` text PRIMARY KEY NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`joins` integer DEFAULT 0 NOT NULL,
	`updated` integer DEFAULT 0 NOT NULL,
	`payload` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`name` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`matches` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`defeats` integer DEFAULT 0 NOT NULL,
	`revives` integer DEFAULT 0 NOT NULL,
	`daily` text DEFAULT '{}' NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `results` (
	`room` text NOT NULL,
	`player` text NOT NULL,
	`reward` text NOT NULL,
	PRIMARY KEY(`room`, `player`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` integer NOT NULL,
	`state` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`lease` integer DEFAULT 0 NOT NULL,
	`open_until` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `room_queue` ON `rooms` (`mode`,`open_until`);