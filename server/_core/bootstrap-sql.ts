/**
 * Embed all drizzle migration SQL into the bundle (esbuild --loader:.sql=text).
 * Plus a final "v4" step that adds the password reset table and any missing
 * columns on `users` that were introduced after migration 0010.
 *
 * At runtime we:
 *   1) transform every "CREATE TABLE" → "CREATE TABLE IF NOT EXISTS"
 *   2) split by "--> statement-breakpoint"
 *   3) execute each statement; swallow "duplicate" / "already exists" errors
 *
 * Result: a fresh DB is fully provisioned, a partially-migrated DB is topped up,
 * and a fully-migrated DB is a no-op — all without an external migration step.
 */

import mig0000 from "../../drizzle/0000_boring_nehzno.sql";
import mig0001 from "../../drizzle/0001_sleepy_harrier.sql";
import mig0002 from "../../drizzle/0002_tired_blink.sql";
import mig0003 from "../../drizzle/0003_empty_photon.sql";
import mig0004 from "../../drizzle/0004_previous_sprite.sql";
import mig0005 from "../../drizzle/0005_polite_nemesis.sql";
import mig0006 from "../../drizzle/0006_flippant_polaris.sql";
import mig0007 from "../../drizzle/0007_many_stark_industries.sql";
import mig0008 from "../../drizzle/0008_public_junta.sql";
import mig0009 from "../../drizzle/0009_freezing_vance_astro.sql";
import mig0010 from "../../drizzle/0010_young_firestar.sql";
import mig0011 from "../../drizzle/0011_password_resets.sql";

/**
 * v4.0 columns on `users` + v4 tables that don't have a dedicated migration.
 * Hand-written here because schema.ts added them without a matching .sql file.
 */
const V4_ADDITIONS = `
ALTER TABLE \`users\` ADD COLUMN \`bio\` varchar(500);
--> statement-breakpoint
ALTER TABLE \`users\` ADD COLUMN \`location\` varchar(255);
--> statement-breakpoint
ALTER TABLE \`users\` ADD COLUMN \`skillTags\` text;
--> statement-breakpoint
ALTER TABLE \`users\` ADD COLUMN \`creditScore\` int DEFAULT 100;
--> statement-breakpoint
ALTER TABLE \`users\` ADD COLUMN \`passwordHash\` varchar(255);
--> statement-breakpoint
ALTER TABLE \`users\` ADD COLUMN \`wechatOpenId\` varchar(64);
--> statement-breakpoint
ALTER TABLE \`users\` ADD COLUMN \`reportedCount\` int DEFAULT 0;
--> statement-breakpoint
CREATE TABLE \`recommendations\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`recommenderId\` int NOT NULL,
  \`targetUserId\` int NOT NULL,
  \`context\` varchar(255),
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`recommendations_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE TABLE \`skills\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`category\` varchar(100),
  \`description\` text,
  \`images\` text,
  \`priceMin\` decimal(10,2),
  \`priceMax\` decimal(10,2),
  \`location\` varchar(255),
  \`serviceRadius\` int,
  \`availableTimes\` text,
  \`contactMethod\` varchar(50),
  \`status\` enum('active','inactive') DEFAULT 'active',
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`skills_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE TABLE \`help_requests\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`description\` text,
  \`skillTags\` text,
  \`budgetMin\` decimal(10,2),
  \`budgetMax\` decimal(10,2),
  \`location\` varchar(255),
  \`urgency\` enum('low','medium','high') DEFAULT 'medium',
  \`deadline\` timestamp NULL,
  \`status\` enum('open','matched','closed') DEFAULT 'open',
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`help_requests_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE TABLE \`skill_matches\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`requestId\` int NOT NULL,
  \`skillId\` int NOT NULL,
  \`providerId\` int NOT NULL,
  \`status\` enum('pending','accepted','rejected','completed') DEFAULT 'pending',
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`skill_matches_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE TABLE \`reviews\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`fromUserId\` int NOT NULL,
  \`toUserId\` int NOT NULL,
  \`matchId\` int NOT NULL,
  \`rating\` int NOT NULL,
  \`comment\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`reviews_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE TABLE \`user_reports\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`reporterId\` int NOT NULL,
  \`reportedUserId\` int NOT NULL,
  \`reason\` enum('inappropriate','fraud','harassment','other') DEFAULT 'other',
  \`description\` text,
  \`evidence\` text,
  \`status\` enum('pending','approved','rejected') DEFAULT 'pending',
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`user_reports_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE TABLE \`user_blocks\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`blockedUserId\` int NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`user_blocks_id\` PRIMARY KEY(\`id\`)
);
`;

export const ALL_BOOTSTRAP_SQL: string = [
  mig0000,
  mig0001,
  mig0002,
  mig0003,
  mig0004,
  mig0005,
  mig0006,
  mig0007,
  mig0008,
  mig0009,
  mig0010,
  mig0011,
  V4_ADDITIONS,
].join("\n--> statement-breakpoint\n");

/**
 * Split into individual statements and make every CREATE TABLE idempotent.
 * We can't rewrite ALTER TABLE ADD COLUMN to IF NOT EXISTS portably, so the
 * caller must swallow "duplicate column" errors.
 */
export function getBootstrapStatements(): string[] {
  return ALL_BOOTSTRAP_SQL
    .split(/-->\s*statement-breakpoint/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) =>
      // CREATE TABLE `name` → CREATE TABLE IF NOT EXISTS `name`
      s.replace(/^CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i, "CREATE TABLE IF NOT EXISTS "),
    );
}
