import{createRequire}from'module';const require=createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/0000_boring_nehzno.sql
var boring_nehzno_default;
var init_boring_nehzno = __esm({
  "drizzle/0000_boring_nehzno.sql"() {
    boring_nehzno_default = "CREATE TABLE `users` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`openId` varchar(64) NOT NULL,\r\n	`name` text,\r\n	`email` varchar(320),\r\n	`loginMethod` varchar(64),\r\n	`role` enum('user','admin') NOT NULL DEFAULT 'user',\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,\r\n	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),\r\n	CONSTRAINT `users_id` PRIMARY KEY(`id`),\r\n	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)\r\n);\r\n";
  }
});

// drizzle/0001_sleepy_harrier.sql
var sleepy_harrier_default;
var init_sleepy_harrier = __esm({
  "drizzle/0001_sleepy_harrier.sql"() {
    sleepy_harrier_default = "CREATE TABLE `children` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`familyId` int NOT NULL,\r\n	`nickname` varchar(50) NOT NULL,\r\n	`fullName` varchar(100),\r\n	`gender` enum('girl','boy','unknown') DEFAULT 'unknown',\r\n	`birthDate` timestamp,\r\n	`avatarUrl` text,\r\n	`color` varchar(20) DEFAULT '#FF6B6B',\r\n	`embryoTransferDate` timestamp,\r\n	`embryoDay` int DEFAULT 5,\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,\r\n	CONSTRAINT `children_id` PRIMARY KEY(`id`)\r\n);\r\n--> statement-breakpoint\r\nCREATE TABLE `events` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`familyId` int NOT NULL,\r\n	`title` varchar(200) NOT NULL,\r\n	`description` text,\r\n	`location` varchar(300),\r\n	`locationLat` varchar(30),\r\n	`locationLng` varchar(30),\r\n	`coverUrl` text,\r\n	`eventDate` timestamp NOT NULL,\r\n	`inviteToken` varchar(32) NOT NULL,\r\n	`isPublic` boolean DEFAULT true,\r\n	`createdBy` int NOT NULL,\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,\r\n	CONSTRAINT `events_id` PRIMARY KEY(`id`),\r\n	CONSTRAINT `events_inviteToken_unique` UNIQUE(`inviteToken`)\r\n);\r\n--> statement-breakpoint\r\nCREATE TABLE `families` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`name` varchar(100) NOT NULL,\r\n	`description` text,\r\n	`coverUrl` text,\r\n	`createdBy` int NOT NULL,\r\n	`inviteCode` varchar(16) NOT NULL,\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,\r\n	CONSTRAINT `families_id` PRIMARY KEY(`id`),\r\n	CONSTRAINT `families_inviteCode_unique` UNIQUE(`inviteCode`)\r\n);\r\n--> statement-breakpoint\r\nCREATE TABLE `family_members` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`familyId` int NOT NULL,\r\n	`userId` int NOT NULL,\r\n	`role` enum('admin','collaborator','observer') NOT NULL DEFAULT 'observer',\r\n	`nickname` varchar(50),\r\n	`joinedAt` timestamp NOT NULL DEFAULT (now()),\r\n	CONSTRAINT `family_members_id` PRIMARY KEY(`id`)\r\n);\r\n--> statement-breakpoint\r\nCREATE TABLE `milestone_templates` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`ageMonthMin` int NOT NULL,\r\n	`ageMonthMax` int NOT NULL,\r\n	`title` varchar(200) NOT NULL,\r\n	`description` text,\r\n	`category` enum('development','nutrition','vaccination','checkup','safety') NOT NULL,\r\n	`isBuiltIn` boolean DEFAULT true,\r\n	CONSTRAINT `milestone_templates_id` PRIMARY KEY(`id`)\r\n);\r\n--> statement-breakpoint\r\nCREATE TABLE `routine_tasks` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`familyId` int NOT NULL,\r\n	`childId` int,\r\n	`title` varchar(100) NOT NULL,\r\n	`description` text,\r\n	`icon` varchar(50) DEFAULT 'circle',\r\n	`color` varchar(20) DEFAULT '#4ECDC4',\r\n	`category` enum('feeding','sleep','checkup','play','bath','other') DEFAULT 'other',\r\n	`repeatRule` varchar(100),\r\n	`assignedTo` int,\r\n	`isActive` boolean DEFAULT true,\r\n	`createdBy` int NOT NULL,\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,\r\n	CONSTRAINT `routine_tasks_id` PRIMARY KEY(`id`)\r\n);\r\n--> statement-breakpoint\r\nCREATE TABLE `rsvps` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`eventId` int NOT NULL,\r\n	`guestName` varchar(100) NOT NULL,\r\n	`guestContact` varchar(200),\r\n	`status` enum('attending','maybe','declined') NOT NULL,\r\n	`note` text,\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	CONSTRAINT `rsvps_id` PRIMARY KEY(`id`)\r\n);\r\n--> statement-breakpoint\r\nCREATE TABLE `task_checkins` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`taskId` int NOT NULL,\r\n	`childId` int,\r\n	`note` text,\r\n	`checkedBy` int NOT NULL,\r\n	`checkedAt` timestamp NOT NULL DEFAULT (now()),\r\n	CONSTRAINT `task_checkins_id` PRIMARY KEY(`id`)\r\n);\r\n--> statement-breakpoint\r\nCREATE TABLE `timeline_events` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`childId` int NOT NULL,\r\n	`familyId` int NOT NULL,\r\n	`type` enum('pregnancy','milestone','post','checkup','vaccination','system') NOT NULL,\r\n	`title` varchar(200) NOT NULL,\r\n	`content` text,\r\n	`mediaUrls` text,\r\n	`xiaohongshuUrl` text,\r\n	`eventDate` timestamp NOT NULL,\r\n	`createdBy` int NOT NULL,\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,\r\n	CONSTRAINT `timeline_events_id` PRIMARY KEY(`id`)\r\n);\r\n--> statement-breakpoint\r\nALTER TABLE `users` ADD `avatarUrl` text;";
  }
});

// drizzle/0002_tired_blink.sql
var tired_blink_default;
var init_tired_blink = __esm({
  "drizzle/0002_tired_blink.sql"() {
    tired_blink_default = "CREATE TABLE `connections` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`requesterId` int NOT NULL,\r\n	`receiverId` int NOT NULL,\r\n	`status` enum('pending','accepted','blocked') NOT NULL DEFAULT 'pending',\r\n	`note` varchar(200),\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,\r\n	CONSTRAINT `connections_id` PRIMARY KEY(`id`)\r\n);\r\n";
  }
});

// drizzle/0003_empty_photon.sql
var empty_photon_default;
var init_empty_photon = __esm({
  "drizzle/0003_empty_photon.sql"() {
    empty_photon_default = "ALTER TABLE `children` ADD `pregnancyRefDate` timestamp;--> statement-breakpoint\r\nALTER TABLE `children` ADD `pregnancyWeeksAtRef` int DEFAULT 0;--> statement-breakpoint\r\nALTER TABLE `children` ADD `pregnancyDaysAtRef` int DEFAULT 0;--> statement-breakpoint\r\nALTER TABLE `children` ADD `isMultiple` boolean DEFAULT false;";
  }
});

// drizzle/0004_previous_sprite.sql
var previous_sprite_default;
var init_previous_sprite = __esm({
  "drizzle/0004_previous_sprite.sql"() {
    previous_sprite_default = "ALTER TABLE `connections` ADD `category` enum('life','work','family','kids','pets') DEFAULT 'life' NOT NULL;--> statement-breakpoint\r\nALTER TABLE `connections` ADD `hasUpdate` boolean DEFAULT false NOT NULL;--> statement-breakpoint\r\nALTER TABLE `task_checkins` ADD `value` varchar(50);--> statement-breakpoint\r\nALTER TABLE `task_checkins` ADD `unit` varchar(20);";
  }
});

// drizzle/0005_polite_nemesis.sql
var polite_nemesis_default;
var init_polite_nemesis = __esm({
  "drizzle/0005_polite_nemesis.sql"() {
    polite_nemesis_default = "ALTER TABLE `routine_tasks` ADD `taskType` enum('frequency','value') DEFAULT 'frequency';--> statement-breakpoint\r\nALTER TABLE `routine_tasks` ADD `valueUnit` varchar(30);";
  }
});

// drizzle/0006_flippant_polaris.sql
var flippant_polaris_default;
var init_flippant_polaris = __esm({
  "drizzle/0006_flippant_polaris.sql"() {
    flippant_polaris_default = "CREATE TABLE `event_join_requests` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`eventId` int NOT NULL,\r\n	`requesterId` int NOT NULL,\r\n	`hostId` int NOT NULL,\r\n	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',\r\n	`message` text,\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,\r\n	CONSTRAINT `event_join_requests_id` PRIMARY KEY(`id`)\r\n);\r\n--> statement-breakpoint\r\nALTER TABLE `timeline_events` ADD `isPublic` boolean DEFAULT false NOT NULL;";
  }
});

// drizzle/0007_many_stark_industries.sql
var many_stark_industries_default;
var init_many_stark_industries = __esm({
  "drizzle/0007_many_stark_industries.sql"() {
    many_stark_industries_default = "ALTER TABLE `family_members` ADD `birthDate` timestamp;--> statement-breakpoint\r\nALTER TABLE `family_members` ADD `anniversaryDate` timestamp;--> statement-breakpoint\r\nALTER TABLE `users` ADD `birthDate` timestamp;";
  }
});

// drizzle/0008_public_junta.sql
var public_junta_default;
var init_public_junta = __esm({
  "drizzle/0008_public_junta.sql"() {
    public_junta_default = "CREATE TABLE `member_events` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`familyId` int NOT NULL,\r\n	`userId` int NOT NULL,\r\n	`title` varchar(100) NOT NULL,\r\n	`eventType` enum('birthday','anniversary','custom') NOT NULL DEFAULT 'custom',\r\n	`eventDate` timestamp NOT NULL,\r\n	`isYearly` boolean NOT NULL DEFAULT true,\r\n	`note` text,\r\n	`createdBy` int NOT NULL,\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,\r\n	CONSTRAINT `member_events_id` PRIMARY KEY(`id`)\r\n);\r\n--> statement-breakpoint\r\nALTER TABLE `children` ADD `childOneName` varchar(50);--> statement-breakpoint\r\nALTER TABLE `children` ADD `childTwoName` varchar(50);--> statement-breakpoint\r\nALTER TABLE `children` ADD `notes` text;";
  }
});

// drizzle/0009_freezing_vance_astro.sql
var freezing_vance_astro_default;
var init_freezing_vance_astro = __esm({
  "drizzle/0009_freezing_vance_astro.sql"() {
    freezing_vance_astro_default = "ALTER TABLE `children` ADD `childOneGender` enum('girl','boy','unknown') DEFAULT 'unknown';--> statement-breakpoint\r\nALTER TABLE `children` ADD `childTwoGender` enum('girl','boy','unknown') DEFAULT 'unknown';";
  }
});

// drizzle/0010_young_firestar.sql
var young_firestar_default;
var init_young_firestar = __esm({
  "drizzle/0010_young_firestar.sql"() {
    young_firestar_default = "CREATE TABLE `event_images` (\r\n	`id` int AUTO_INCREMENT NOT NULL,\r\n	`eventId` int NOT NULL,\r\n	`imageUrl` text NOT NULL,\r\n	`sortOrder` int DEFAULT 0,\r\n	`createdAt` timestamp NOT NULL DEFAULT (now()),\r\n	CONSTRAINT `event_images_id` PRIMARY KEY(`id`)\r\n);\r\n";
  }
});

// drizzle/0011_password_resets.sql
var password_resets_default;
var init_password_resets = __esm({
  "drizzle/0011_password_resets.sql"() {
    password_resets_default = "CREATE TABLE IF NOT EXISTS `password_reset_tokens` (\r\n  `id` int AUTO_INCREMENT NOT NULL,\r\n  `userId` int NOT NULL,\r\n  `token` varchar(128) NOT NULL,\r\n  `expiresAt` timestamp NOT NULL,\r\n  `usedAt` timestamp NULL,\r\n  `createdAt` timestamp NOT NULL DEFAULT (now()),\r\n  CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),\r\n  CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)\r\n);\r\n";
  }
});

// server/_core/bootstrap-sql.ts
function getBootstrapStatements() {
  return ALL_BOOTSTRAP_SQL.split(/-->\s*statement-breakpoint/g).map((s) => s.trim()).filter((s) => s.length > 0).map(
    (s) => (
      // CREATE TABLE `name` → CREATE TABLE IF NOT EXISTS `name`
      s.replace(/^CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i, "CREATE TABLE IF NOT EXISTS ")
    )
  );
}
var V4_ADDITIONS, ALL_BOOTSTRAP_SQL;
var init_bootstrap_sql = __esm({
  "server/_core/bootstrap-sql.ts"() {
    "use strict";
    init_boring_nehzno();
    init_sleepy_harrier();
    init_tired_blink();
    init_empty_photon();
    init_previous_sprite();
    init_polite_nemesis();
    init_flippant_polaris();
    init_many_stark_industries();
    init_public_junta();
    init_freezing_vance_astro();
    init_young_firestar();
    init_password_resets();
    V4_ADDITIONS = `
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
ALTER TABLE \`children\` ADD COLUMN \`shareToken\` varchar(32);
--> statement-breakpoint
ALTER TABLE \`children\` ADD COLUMN \`shareVisibility\` enum('public','connections','family') DEFAULT 'family';
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
    ALL_BOOTSTRAP_SQL = [
      boring_nehzno_default,
      sleepy_harrier_default,
      tired_blink_default,
      empty_photon_default,
      previous_sprite_default,
      polite_nemesis_default,
      flippant_polaris_default,
      many_stark_industries_default,
      public_junta_default,
      freezing_vance_astro_default,
      young_firestar_default,
      password_resets_default,
      V4_ADDITIONS
    ].join("\n--> statement-breakpoint\n");
  }
});

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  children: () => children,
  connections: () => connections,
  eventImages: () => eventImages,
  eventJoinRequests: () => eventJoinRequests,
  events: () => events,
  families: () => families,
  familyMembers: () => familyMembers,
  helpRequests: () => helpRequests,
  memberEvents: () => memberEvents,
  milestoneTemplates: () => milestoneTemplates,
  passwordResetTokens: () => passwordResetTokens,
  recommendations: () => recommendations,
  reviews: () => reviews,
  routineTasks: () => routineTasks,
  rsvps: () => rsvps,
  skillMatches: () => skillMatches,
  skills: () => skills,
  taskCheckins: () => taskCheckins,
  timelineEvents: () => timelineEvents,
  userBlocks: () => userBlocks,
  userReports: () => userReports,
  users: () => users
});
import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar
} from "drizzle-orm/mysql-core";
var users, passwordResetTokens, families, familyMembers, children, timelineEvents, routineTasks, taskCheckins, events, eventImages, rsvps, milestoneTemplates, connections, eventJoinRequests, memberEvents, recommendations, skills, helpRequests, skillMatches, reviews, userReports, userBlocks;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      id: int("id").autoincrement().primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      avatarUrl: text("avatarUrl"),
      birthDate: timestamp("birthDate"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
      // ─── v4.0 Pinple 扩展字段 ─────────────────────────────────────────────────
      bio: varchar("bio", { length: 500 }),
      location: varchar("location", { length: 255 }),
      skillTags: text("skillTags"),
      // JSON array of skill tags
      creditScore: int("creditScore").default(100),
      passwordHash: varchar("passwordHash", { length: 255 }),
      wechatOpenId: varchar("wechatOpenId", { length: 64 }),
      reportedCount: int("reportedCount").default(0)
    });
    passwordResetTokens = mysqlTable("password_reset_tokens", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      token: varchar("token", { length: 128 }).notNull().unique(),
      expiresAt: timestamp("expiresAt").notNull(),
      usedAt: timestamp("usedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    families = mysqlTable("families", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      description: text("description"),
      coverUrl: text("coverUrl"),
      createdBy: int("createdBy").notNull(),
      // user.id
      inviteCode: varchar("inviteCode", { length: 16 }).notNull().unique(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    familyMembers = mysqlTable("family_members", {
      id: int("id").autoincrement().primaryKey(),
      familyId: int("familyId").notNull(),
      userId: int("userId").notNull(),
      role: mysqlEnum("role", ["admin", "collaborator", "observer"]).default("observer").notNull(),
      nickname: varchar("nickname", { length: 50 }),
      birthDate: timestamp("birthDate"),
      anniversaryDate: timestamp("anniversaryDate"),
      // e.g. wedding anniversary
      joinedAt: timestamp("joinedAt").defaultNow().notNull()
    });
    children = mysqlTable("children", {
      id: int("id").autoincrement().primaryKey(),
      familyId: int("familyId").notNull(),
      nickname: varchar("nickname", { length: 50 }).notNull(),
      fullName: varchar("fullName", { length: 100 }),
      gender: mysqlEnum("gender", ["girl", "boy", "unknown"]).default("unknown"),
      birthDate: timestamp("birthDate"),
      avatarUrl: text("avatarUrl"),
      color: varchar("color", { length: 20 }).default("#FF6B6B"),
      // theme color for this child
      // Pregnancy reference fields
      pregnancyRefDate: timestamp("pregnancyRefDate"),
      // reference date for pregnancy calculation
      pregnancyWeeksAtRef: int("pregnancyWeeksAtRef").default(0),
      // weeks pregnant at reference date
      pregnancyDaysAtRef: int("pregnancyDaysAtRef").default(0),
      // extra days pregnant at reference date
      isMultiple: boolean("isMultiple").default(false),
      // twin/multiple pregnancy
      childOneName: varchar("childOneName", { length: 50 }),
      // 双胞胎孩子一的名字
      childTwoName: varchar("childTwoName", { length: 50 }),
      // 双胞胎孩子二的名字
      childOneGender: mysqlEnum("childOneGender", ["girl", "boy", "unknown"]).default("unknown"),
      // 双胞胎孩子一的性别
      childTwoGender: mysqlEnum("childTwoGender", ["girl", "boy", "unknown"]).default("unknown"),
      // 双胞胎孩子二的性别
      notes: text("notes"),
      // 孩子备注信息
      // v4.0 share card
      shareToken: varchar("shareToken", { length: 32 }),
      shareVisibility: mysqlEnum("shareVisibility", ["public", "connections", "family"]).default("family"),
      // Legacy IVF fields (kept for compatibility)
      embryoTransferDate: timestamp("embryoTransferDate"),
      embryoDay: int("embryoDay").default(5),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    timelineEvents = mysqlTable("timeline_events", {
      id: int("id").autoincrement().primaryKey(),
      childId: int("childId").notNull(),
      familyId: int("familyId").notNull(),
      type: mysqlEnum("type", [
        "pregnancy",
        // 孕期事件
        "milestone",
        // 成长里程碑
        "post",
        // 日常动态
        "checkup",
        // 体检记录
        "vaccination",
        // 疫苗接种
        "system"
        // 系统自动生成
      ]).notNull(),
      title: varchar("title", { length: 200 }).notNull(),
      content: text("content"),
      mediaUrls: text("mediaUrls"),
      // JSON array of URLs
      xiaohongshuUrl: text("xiaohongshuUrl"),
      // 小红书笔记链接
      eventDate: timestamp("eventDate").notNull(),
      createdBy: int("createdBy").notNull(),
      // Visibility: public = visible to connections/observers, private = family only
      isPublic: boolean("isPublic").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    routineTasks = mysqlTable("routine_tasks", {
      id: int("id").autoincrement().primaryKey(),
      familyId: int("familyId").notNull(),
      childId: int("childId"),
      // null = applies to all children
      title: varchar("title", { length: 100 }).notNull(),
      description: text("description"),
      icon: varchar("icon", { length: 50 }).default("circle"),
      color: varchar("color", { length: 20 }).default("#4ECDC4"),
      category: mysqlEnum("category", ["feeding", "sleep", "checkup", "play", "bath", "other"]).default("other"),
      repeatRule: varchar("repeatRule", { length: 100 }),
      // cron-like: "every_3h", "daily", "weekly"
      taskType: mysqlEnum("taskType", ["frequency", "value"]).default("frequency"),
      valueUnit: varchar("valueUnit", { length: 30 }),
      // unit for value-type tasks (kg, cm, ml)
      assignedTo: int("assignedTo"),
      // user.id, null = anyone
      isActive: boolean("isActive").default(true),
      createdBy: int("createdBy").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    taskCheckins = mysqlTable("task_checkins", {
      id: int("id").autoincrement().primaryKey(),
      taskId: int("taskId").notNull(),
      childId: int("childId"),
      note: text("note"),
      value: varchar("value", { length: 50 }),
      // 数值记录（如体重、身高）
      unit: varchar("unit", { length: 20 }),
      // 单位（kg、cm等）
      checkedBy: int("checkedBy").notNull(),
      checkedAt: timestamp("checkedAt").defaultNow().notNull()
    });
    events = mysqlTable("events", {
      id: int("id").autoincrement().primaryKey(),
      familyId: int("familyId").notNull(),
      title: varchar("title", { length: 200 }).notNull(),
      description: text("description"),
      location: varchar("location", { length: 300 }),
      locationLat: varchar("locationLat", { length: 30 }),
      locationLng: varchar("locationLng", { length: 30 }),
      coverUrl: text("coverUrl"),
      eventDate: timestamp("eventDate").notNull(),
      inviteToken: varchar("inviteToken", { length: 32 }).notNull().unique(),
      isPublic: boolean("isPublic").default(true),
      createdBy: int("createdBy").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    eventImages = mysqlTable("event_images", {
      id: int("id").autoincrement().primaryKey(),
      eventId: int("eventId").notNull(),
      imageUrl: text("imageUrl").notNull(),
      sortOrder: int("sortOrder").default(0),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    rsvps = mysqlTable("rsvps", {
      id: int("id").autoincrement().primaryKey(),
      eventId: int("eventId").notNull(),
      guestName: varchar("guestName", { length: 100 }).notNull(),
      guestContact: varchar("guestContact", { length: 200 }),
      status: mysqlEnum("status", ["attending", "maybe", "declined"]).notNull(),
      note: text("note"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    milestoneTemplates = mysqlTable("milestone_templates", {
      id: int("id").autoincrement().primaryKey(),
      ageMonthMin: int("ageMonthMin").notNull(),
      // 适用月龄范围开始
      ageMonthMax: int("ageMonthMax").notNull(),
      // 适用月龄范围结束
      title: varchar("title", { length: 200 }).notNull(),
      description: text("description"),
      category: mysqlEnum("category", ["development", "nutrition", "vaccination", "checkup", "safety"]).notNull(),
      isBuiltIn: boolean("isBuiltIn").default(true)
    });
    connections = mysqlTable("connections", {
      id: int("id").autoincrement().primaryKey(),
      requesterId: int("requesterId").notNull(),
      // 发起人 user.id
      receiverId: int("receiverId").notNull(),
      // 接受人 user.id
      status: mysqlEnum("status", ["pending", "accepted", "blocked"]).default("pending").notNull(),
      note: varchar("note", { length: 200 }),
      // 备注/关系说明
      category: mysqlEnum("category", ["life", "work", "family", "kids", "pets"]).default("life").notNull(),
      // 人脉圈分类
      hasUpdate: boolean("hasUpdate").default(false).notNull(),
      // 是否有新动态（头像高亮）
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    eventJoinRequests = mysqlTable("event_join_requests", {
      id: int("id").autoincrement().primaryKey(),
      eventId: int("eventId").notNull(),
      // references events.id
      requesterId: int("requesterId").notNull(),
      // user.id who wants to join
      hostId: int("hostId").notNull(),
      // user.id who created the event
      status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
      message: text("message"),
      // optional message from requester
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    memberEvents = mysqlTable("member_events", {
      id: int("id").autoincrement().primaryKey(),
      familyId: int("familyId").notNull(),
      userId: int("userId").notNull(),
      // 关联的家庭成员 user.id
      title: varchar("title", { length: 100 }).notNull(),
      // 事件名称
      eventType: mysqlEnum("eventType", ["birthday", "anniversary", "custom"]).default("custom").notNull(),
      eventDate: timestamp("eventDate").notNull(),
      // 事件日期（年份仅作参考，每年循环）
      isYearly: boolean("isYearly").default(true).notNull(),
      // 是否每年循环
      note: text("note"),
      createdBy: int("createdBy").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    recommendations = mysqlTable("recommendations", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      // 被推荐的用户
      recommenderId: int("recommenderId").notNull(),
      // 推荐人
      targetUserId: int("targetUserId").notNull(),
      // 推荐给谁
      context: varchar("context", { length: 255 }),
      // 推荐理由/场景
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    skills = mysqlTable("skills", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      category: varchar("category", { length: 100 }),
      description: text("description"),
      images: text("images"),
      // JSON array of image URLs
      priceMin: decimal("priceMin", { precision: 10, scale: 2 }),
      priceMax: decimal("priceMax", { precision: 10, scale: 2 }),
      location: varchar("location", { length: 255 }),
      serviceRadius: int("serviceRadius"),
      availableTimes: text("availableTimes"),
      // JSON
      contactMethod: varchar("contactMethod", { length: 50 }),
      status: mysqlEnum("status", ["active", "inactive"]).default("active"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    helpRequests = mysqlTable("help_requests", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      skillTags: text("skillTags"),
      // JSON array of skill tags
      budgetMin: decimal("budgetMin", { precision: 10, scale: 2 }),
      budgetMax: decimal("budgetMax", { precision: 10, scale: 2 }),
      location: varchar("location", { length: 255 }),
      urgency: mysqlEnum("urgency", ["low", "medium", "high"]).default("medium"),
      deadline: timestamp("deadline"),
      status: mysqlEnum("status", ["open", "matched", "closed"]).default("open"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    skillMatches = mysqlTable("skill_matches", {
      id: int("id").autoincrement().primaryKey(),
      requestId: int("requestId").notNull(),
      skillId: int("skillId").notNull(),
      providerId: int("providerId").notNull(),
      // 技能提供者 user.id
      status: mysqlEnum("status", ["pending", "accepted", "rejected", "completed"]).default("pending"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    reviews = mysqlTable("reviews", {
      id: int("id").autoincrement().primaryKey(),
      fromUserId: int("fromUserId").notNull(),
      toUserId: int("toUserId").notNull(),
      matchId: int("matchId").notNull(),
      rating: int("rating").notNull(),
      // 1-5
      comment: text("comment"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    userReports = mysqlTable("user_reports", {
      id: int("id").autoincrement().primaryKey(),
      reporterId: int("reporterId").notNull(),
      reportedUserId: int("reportedUserId").notNull(),
      reason: mysqlEnum("reason", ["inappropriate", "fraud", "harassment", "other"]).default("other"),
      description: text("description"),
      evidence: text("evidence"),
      // JSON array of URLs
      status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    userBlocks = mysqlTable("user_blocks", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      blockedUserId: int("blockedUserId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  acceptConnection: () => acceptConnection,
  addEventImage: () => addEventImage,
  addFamilyMember: () => addFamilyMember,
  addTaskCheckinWithValue: () => addTaskCheckinWithValue,
  blockUser: () => blockUser,
  buildDbConfig: () => buildDbConfig,
  checkExistingConnection: () => checkExistingConnection,
  checkExistingJoinRequest: () => checkExistingJoinRequest,
  clearConnectionUpdate: () => clearConnectionUpdate,
  createChild: () => createChild,
  createEmailUser: () => createEmailUser,
  createEvent: () => createEvent,
  createEventJoinRequest: () => createEventJoinRequest,
  createFamily: () => createFamily,
  createHelpRequest: () => createHelpRequest,
  createMemberEvent: () => createMemberEvent,
  createPasswordResetToken: () => createPasswordResetToken,
  createRecommendation: () => createRecommendation,
  createReview: () => createReview,
  createRoutineTask: () => createRoutineTask,
  createRsvp: () => createRsvp,
  createSkill: () => createSkill,
  createSkillMatch: () => createSkillMatch,
  createTaskCheckin: () => createTaskCheckin,
  createTimelineEvent: () => createTimelineEvent,
  createUserReport: () => createUserReport,
  deleteChild: () => deleteChild,
  deleteEventImage: () => deleteEventImage,
  deleteFamily: () => deleteFamily,
  deleteMemberEvent: () => deleteMemberEvent,
  deleteRoutineTask: () => deleteRoutineTask,
  deleteTimelineEvent: () => deleteTimelineEvent,
  getAcceptedConnectionsWithCategory: () => getAcceptedConnectionsWithCategory,
  getActiveSkills: () => getActiveSkills,
  getAllMilestoneTemplates: () => getAllMilestoneTemplates,
  getBlockedUsers: () => getBlockedUsers,
  getChildById: () => getChildById,
  getChildByShareToken: () => getChildByShareToken,
  getChildrenByFamily: () => getChildrenByFamily,
  getConnectionBetween: () => getConnectionBetween,
  getDb: () => getDb,
  getEventById: () => getEventById,
  getEventByToken: () => getEventByToken,
  getEventImages: () => getEventImages,
  getEventJoinRequests: () => getEventJoinRequests,
  getEventsByCreator: () => getEventsByCreator,
  getEventsByFamily: () => getEventsByFamily,
  getFamilyById: () => getFamilyById,
  getFamilyByInviteCode: () => getFamilyByInviteCode,
  getFamilyMembers: () => getFamilyMembers,
  getFriendEventsFeed: () => getFriendEventsFeed,
  getHelpRequestById: () => getHelpRequestById,
  getHelpRequestsByUser: () => getHelpRequestsByUser,
  getMatchesByRequest: () => getMatchesByRequest,
  getMemberEventsByFamily: () => getMemberEventsByFamily,
  getMemberEventsByUser: () => getMemberEventsByUser,
  getMemberRole: () => getMemberRole,
  getMilestonesByAge: () => getMilestonesByAge,
  getMutualFriends: () => getMutualFriends,
  getMyConnections: () => getMyConnections,
  getMyEventJoinRequests: () => getMyEventJoinRequests,
  getOpenHelpRequests: () => getOpenHelpRequests,
  getPendingJoinRequestsForHost: () => getPendingJoinRequestsForHost,
  getPendingReports: () => getPendingReports,
  getPendingRequests: () => getPendingRequests,
  getPublicTimelineEventsByFamily: () => getPublicTimelineEventsByFamily,
  getRecommendationChain: () => getRecommendationChain,
  getReviewByMatchAndAuthor: () => getReviewByMatchAndAuthor,
  getReviewsForUser: () => getReviewsForUser,
  getRoutineTasks: () => getRoutineTasks,
  getRsvpsByEvent: () => getRsvpsByEvent,
  getSkillById: () => getSkillById,
  getSkillMatchById: () => getSkillMatchById,
  getSkillsByUser: () => getSkillsByUser,
  getTaskCheckinHistory: () => getTaskCheckinHistory,
  getTaskCheckins: () => getTaskCheckins,
  getTaskCheckinsByDate: () => getTaskCheckinsByDate,
  getTaskCheckinsByMonth: () => getTaskCheckinsByMonth,
  getTaskFrequencyStats: () => getTaskFrequencyStats,
  getTimelineEvents: () => getTimelineEvents,
  getTodayCheckins: () => getTodayCheckins,
  getUpcomingTimelineByFamily: () => getUpcomingTimelineByFamily,
  getUserByEmail: () => getUserByEmail,
  getUserById: () => getUserById,
  getUserByOpenId: () => getUserByOpenId,
  getUserByUserId: () => getUserByUserId,
  getUserCreditScore: () => getUserCreditScore,
  getUserFamilies: () => getUserFamilies,
  getValidPasswordResetToken: () => getValidPasswordResetToken,
  incrementUserReportedCount: () => incrementUserReportedCount,
  isUserBlocked: () => isUserBlocked,
  leaveFamilyMember: () => leaveFamilyMember,
  markConnectionUpdated: () => markConnectionUpdated,
  markPasswordResetTokenUsed: () => markPasswordResetTokenUsed,
  removeConnection: () => removeConnection,
  removeFamilyMember: () => removeFamilyMember,
  resetDb: () => resetDb,
  searchUsersByName: () => searchUsersByName,
  sendConnectionRequest: () => sendConnectionRequest,
  setChildShareCard: () => setChildShareCard,
  syncMemberYearlyEvent: () => syncMemberYearlyEvent,
  unblockUser: () => unblockUser,
  updateChild: () => updateChild,
  updateChildDetails: () => updateChildDetails,
  updateConnectionCategory: () => updateConnectionCategory,
  updateEvent: () => updateEvent,
  updateEventJoinRequestStatus: () => updateEventJoinRequestStatus,
  updateFamily: () => updateFamily,
  updateFamilyName: () => updateFamilyName,
  updateHelpRequestStatus: () => updateHelpRequestStatus,
  updateMatchStatus: () => updateMatchStatus,
  updateMemberDates: () => updateMemberDates,
  updateMemberEvent: () => updateMemberEvent,
  updateMemberRole: () => updateMemberRole,
  updateReportStatus: () => updateReportStatus,
  updateRoutineTask: () => updateRoutineTask,
  updateSkillStatus: () => updateSkillStatus,
  updateTimelineEvent: () => updateTimelineEvent,
  updateTimelineEventVisibility: () => updateTimelineEventVisibility,
  updateUserAvatar: () => updateUserAvatar,
  updateUserBirthDate: () => updateUserBirthDate,
  updateUserCreditScore: () => updateUserCreditScore,
  updateUserPassword: () => updateUserPassword,
  updateUserProfile: () => updateUserProfile,
  upsertUser: () => upsertUser,
  withDbRetry: () => withDbRetry
});
import { and, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
function buildDbConfig(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { uri: rawUrl };
  }
  const sslMode = (url.searchParams.get("ssl-mode") || "").toUpperCase();
  url.searchParams.delete("ssl-mode");
  const config = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || void 0,
    connectTimeout: 1e4
  };
  const needsTls = sslMode === "REQUIRED" || sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY" || // Managed MySQL services that always need TLS
  /\b(aivencloud\.com|psdb\.cloud|cluster\.ondigitalocean\.com)$/i.test(url.hostname);
  if (needsTls && sslMode !== "DISABLED") {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}
function resetDb() {
  _db = null;
  _dbCreatedAt = 0;
  _schemaReadyPromise = null;
}
async function getDb() {
  const now = Date.now();
  if (_db && now - _dbCreatedAt > DB_MAX_AGE_MS) {
    _db = null;
    _schemaReadyPromise = null;
  }
  if (!_db && process.env.DATABASE_URL) {
    try {
      const cfg = buildDbConfig(process.env.DATABASE_URL);
      const pool = mysql.createPool(cfg);
      _db = drizzle(pool);
      _dbCreatedAt = now;
      console.log(
        `[Database] pool created \u2014 host=${cfg.host} db=${cfg.database} ssl=${!!cfg.ssl}`
      );
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (_db && !_schemaReadyPromise) {
    const dbRef = _db;
    _schemaReadyPromise = ensureSchema(dbRef).catch((err) => {
      console.warn("[Database] ensureSchema failed (continuing):", err);
    });
  }
  if (_schemaReadyPromise) {
    try {
      await Promise.race([
        _schemaReadyPromise,
        new Promise((resolve) => setTimeout(resolve, 2e4))
      ]);
    } catch (err) {
      console.warn("[Database] ensureSchema wait failed:", err);
    }
  }
  return _db;
}
async function ensureSchema(_db2) {
  if (!process.env.DATABASE_URL) return;
  const startedAt = Date.now();
  let conn = null;
  try {
    conn = await mysql.createConnection(buildDbConfig(process.env.DATABASE_URL));
    try {
      await conn.query("SELECT `reportedCount`, `passwordHash` FROM `users` LIMIT 0");
      console.log(
        `[Database] ensureSchema fast-path: schema already healthy in ${Date.now() - startedAt}ms`
      );
      return;
    } catch {
    }
    const statements = getBootstrapStatements();
    let applied = 0;
    let skipped = 0;
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        applied++;
      } catch (err) {
        const msg = String(err?.message || err?.sqlMessage || err);
        if (/Duplicate column|Duplicate key|already exists|ER_DUP_FIELDNAME|ER_TABLE_EXISTS_ERROR|ER_DUP_KEYNAME/i.test(
          msg
        )) {
          skipped++;
          continue;
        }
        console.warn(
          `[Database] ensureSchema stmt failed (continuing): ${msg} :: ${stmt.slice(0, 120)}...`
        );
      }
    }
    console.log(
      `[Database] ensureSchema done \u2014 applied=${applied} skipped=${skipped} total=${statements.length} in ${Date.now() - startedAt}ms`
    );
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
      }
    }
  }
}
async function withDbRetry(fn, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isConnReset = err?.message?.includes("ECONNRESET") || err?.cause?.code === "ECONNRESET" || err?.code === "ECONNRESET";
      if (isConnReset && i < retries) {
        console.warn(`[Database] Connection reset, retrying (${i + 1}/${retries})...`);
        resetDb();
        await new Promise((r) => setTimeout(r, 200 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("DB retry exhausted");
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod", "avatarUrl"];
  const assignNullable = (field) => {
    const value = user[field];
    if (value === void 0) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await withDbRetry(async () => {
    const db = await getDb();
    if (!db) return;
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createEmailUser(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    lastSignedIn: /* @__PURE__ */ new Date()
  });
  return result[0].insertId;
}
async function updateUserCreditScore(userId, delta) {
  const db = await getDb();
  if (!db) return;
  const user = await getUserById(userId);
  if (!user) return;
  const currentScore = user.creditScore ?? 100;
  const newScore = Math.max(0, Math.min(100, currentScore + delta));
  await db.update(users).set({ creditScore: newScore }).where(eq(users.id, userId));
  return newScore;
}
async function incrementUserReportedCount(userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ reportedCount: sql`COALESCE(${users.reportedCount}, 0) + 1` }).where(eq(users.id, userId));
}
async function getUserCreditScore(userId) {
  const user = await getUserById(userId);
  return user?.creditScore ?? 100;
}
async function updateUserPassword(userId, passwordHash) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}
async function createPasswordResetToken(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(passwordResetTokens).values({
    userId: data.userId,
    token: data.token,
    expiresAt: data.expiresAt
  });
  return result[0].insertId;
}
async function getValidPasswordResetToken(token) {
  const db = await getDb();
  if (!db) return void 0;
  const now = /* @__PURE__ */ new Date();
  const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  const row = rows[0];
  if (!row) return void 0;
  if (row.usedAt) return void 0;
  if (row.expiresAt.getTime() < now.getTime()) return void 0;
  return row;
}
async function markPasswordResetTokenUsed(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordResetTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(eq(passwordResetTokens.id, id));
}
async function createFamily(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(families).values(data);
  return result[0].insertId;
}
async function getFamilyById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(families).where(eq(families.id, id)).limit(1);
  return result[0];
}
async function getFamilyByInviteCode(code) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(families).where(eq(families.inviteCode, code)).limit(1);
  return result[0];
}
async function getUserFamilies(userId) {
  const db = await getDb();
  if (!db) return [];
  const members = await db.select().from(familyMembers).where(eq(familyMembers.userId, userId));
  if (members.length === 0) return [];
  const familyIds = members.map((m) => m.familyId);
  const result = [];
  for (const fid of familyIds) {
    const fam = await getFamilyById(fid);
    if (fam) {
      const member = members.find((m) => m.familyId === fid);
      result.push({ ...fam, memberRole: member?.role });
    }
  }
  return result;
}
async function updateFamily(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(families).set(data).where(eq(families.id, id));
}
async function addFamilyMember(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(familyMembers).values(data);
  return result[0].insertId;
}
async function getFamilyMembers(familyId) {
  const db = await getDb();
  if (!db) return [];
  const members = await db.select().from(familyMembers).where(eq(familyMembers.familyId, familyId));
  const result = [];
  for (const m of members) {
    const user = await getUserById(m.userId);
    if (user) result.push({ ...m, user });
  }
  return result;
}
async function getMemberRole(familyId, userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(familyMembers).where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId))).limit(1);
  return result[0];
}
async function updateMemberRole(familyId, userId, role) {
  const db = await getDb();
  if (!db) return;
  await db.update(familyMembers).set({ role }).where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
}
async function removeFamilyMember(familyId, userId) {
  const db = await getDb();
  if (!db) return;
  await db.delete(familyMembers).where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
}
async function updateMemberDates(familyId, userId, data) {
  const db = await getDb();
  if (!db) return;
  const set = {};
  if (data.birthDate !== void 0) set.birthDate = data.birthDate;
  if (data.anniversaryDate !== void 0) set.anniversaryDate = data.anniversaryDate;
  if (data.nickname !== void 0) set.nickname = data.nickname;
  if (Object.keys(set).length === 0) return;
  await db.update(familyMembers).set(set).where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
}
async function updateUserBirthDate(userId, birthDate) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ birthDate }).where(eq(users.id, userId));
}
async function createChild(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(children).values(data);
  return result[0].insertId;
}
async function getChildrenByFamily(familyId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(children).where(eq(children.familyId, familyId));
}
async function getChildById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(children).where(eq(children.id, id)).limit(1);
  return result[0];
}
async function updateChild(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(children).set(data).where(eq(children.id, id));
}
async function getUpcomingTimelineByFamily(familyId, from, to) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: timelineEvents.id,
    familyId: timelineEvents.familyId,
    childId: timelineEvents.childId,
    type: timelineEvents.type,
    title: timelineEvents.title,
    eventDate: timelineEvents.eventDate
  }).from(timelineEvents).where(
    and(
      eq(timelineEvents.familyId, familyId),
      gte(timelineEvents.eventDate, from),
      lte(timelineEvents.eventDate, to)
    )
  ).orderBy(timelineEvents.eventDate);
}
async function setChildShareCard(id, data) {
  const db = await getDb();
  if (!db) return;
  const patch = { shareToken: data.shareToken };
  if (data.shareVisibility) patch.shareVisibility = data.shareVisibility;
  await db.update(children).set(patch).where(eq(children.id, id));
}
async function getChildByShareToken(token) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(children).where(eq(children.shareToken, token)).limit(1);
  return result[0];
}
async function createTimelineEvent(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(timelineEvents).values(data);
  return result[0].insertId;
}
async function getTimelineEvents(childId, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timelineEvents).where(eq(timelineEvents.childId, childId)).orderBy(desc(timelineEvents.eventDate)).limit(limit).offset(offset);
}
async function deleteTimelineEvent(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(timelineEvents).where(eq(timelineEvents.id, id));
}
async function createRoutineTask(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(routineTasks).values(data);
  return result[0].insertId;
}
async function getRoutineTasks(familyId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routineTasks).where(and(eq(routineTasks.familyId, familyId), eq(routineTasks.isActive, true)));
}
async function updateRoutineTask(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(routineTasks).set(data).where(eq(routineTasks.id, id));
}
async function deleteRoutineTask(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(routineTasks).set({ isActive: false }).where(eq(routineTasks.id, id));
}
async function createTaskCheckin(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(taskCheckins).values(data);
  return result[0].insertId;
}
async function getTaskCheckins(taskId, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const checkins = await db.select().from(taskCheckins).where(eq(taskCheckins.taskId, taskId)).orderBy(desc(taskCheckins.checkedAt)).limit(limit);
  const result = [];
  for (const c of checkins) {
    const user = await getUserById(c.checkedBy);
    result.push({ ...c, user });
  }
  return result;
}
async function getTodayCheckins(familyId) {
  const db = await getDb();
  if (!db) return [];
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tasks = await getRoutineTasks(familyId);
  const taskIds = tasks.map((t2) => t2.id);
  if (taskIds.length === 0) return [];
  const allCheckins = [];
  for (const tid of taskIds) {
    const checkins = await db.select().from(taskCheckins).where(and(eq(taskCheckins.taskId, tid), gte(taskCheckins.checkedAt, today), lte(taskCheckins.checkedAt, tomorrow)));
    allCheckins.push(...checkins);
  }
  return allCheckins;
}
async function createEvent(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(events).values(data);
  return result[0].insertId;
}
async function getEventsByFamily(familyId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).where(eq(events.familyId, familyId)).orderBy(desc(events.eventDate));
}
async function getEventByToken(token) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(events).where(eq(events.inviteToken, token)).limit(1);
  return result[0];
}
async function getEventById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result[0];
}
async function addEventImage(data) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(eventImages).values(data);
  return result[0].insertId;
}
async function getEventImages(eventId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eventImages).where(eq(eventImages.eventId, eventId)).orderBy(eventImages.sortOrder);
}
async function deleteEventImage(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(eventImages).where(eq(eventImages.id, id));
}
async function updateEvent(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(events).set(data).where(eq(events.id, id));
}
async function createRsvp(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(rsvps).values(data);
  return result[0].insertId;
}
async function getRsvpsByEvent(eventId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rsvps).where(eq(rsvps.eventId, eventId)).orderBy(desc(rsvps.createdAt));
}
async function getMilestonesByAge(ageMonths) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(milestoneTemplates).where(and(lte(milestoneTemplates.ageMonthMin, ageMonths), gte(milestoneTemplates.ageMonthMax, ageMonths)));
}
async function getAllMilestoneTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(milestoneTemplates).orderBy(milestoneTemplates.ageMonthMin);
}
async function updateUserProfile(userId, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateSet = {};
  if (data.name !== void 0) updateSet.name = data.name;
  if (data.avatarUrl !== void 0) updateSet.avatarUrl = data.avatarUrl;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(users).set(updateSet).where(eq(users.id, userId));
}
async function sendConnectionRequest(requesterId, receiverId, note) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(connections).values({ requesterId, receiverId, note });
  return result[0].insertId;
}
async function acceptConnection(connectionId, userId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(connections).set({ status: "accepted" }).where(and(eq(connections.id, connectionId), eq(connections.receiverId, userId)));
}
async function removeConnection(connectionId, userId) {
  const db = await getDb();
  if (!db) return 0;
  const existing = await db.select().from(connections).where(eq(connections.id, connectionId)).limit(1);
  const row = existing[0];
  if (!row) return 0;
  if (row.requesterId !== userId && row.receiverId !== userId) return 0;
  await db.delete(connections).where(eq(connections.id, connectionId));
  return 1;
}
async function getMyConnections(userId) {
  const db = await getDb();
  if (!db) return [];
  const requesterUser = alias(users, "requester_user");
  const receiverUser = alias(users, "receiver_user");
  const rows = await db.select({
    id: connections.id,
    status: connections.status,
    note: connections.note,
    category: connections.category,
    hasUpdate: connections.hasUpdate,
    createdAt: connections.createdAt,
    requesterId: connections.requesterId,
    receiverId: connections.receiverId,
    requesterName: requesterUser.name,
    requesterAvatar: requesterUser.avatarUrl,
    receiverName: receiverUser.name,
    receiverAvatar: receiverUser.avatarUrl
  }).from(connections).leftJoin(requesterUser, eq(requesterUser.id, connections.requesterId)).leftJoin(receiverUser, eq(receiverUser.id, connections.receiverId)).where(
    and(
      or(eq(connections.requesterId, userId), eq(connections.receiverId, userId)),
      eq(connections.status, "accepted")
    )
  );
  return rows;
}
async function getPendingRequests(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: connections.id,
    note: connections.note,
    createdAt: connections.createdAt,
    requesterId: connections.requesterId,
    requesterName: users.name,
    requesterAvatar: users.avatarUrl
  }).from(connections).leftJoin(users, eq(users.id, connections.requesterId)).where(and(eq(connections.receiverId, userId), eq(connections.status, "pending")));
}
async function getUserByUserId(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}
async function checkExistingConnection(requesterId, receiverId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(connections).where(
    or(
      and(eq(connections.requesterId, requesterId), eq(connections.receiverId, receiverId)),
      and(eq(connections.requesterId, receiverId), eq(connections.receiverId, requesterId))
    )
  ).limit(1);
  return result[0] ?? null;
}
async function deleteChild(id, familyId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(timelineEvents).where(eq(timelineEvents.childId, id));
  const tasks = await db.select({ id: routineTasks.id }).from(routineTasks).where(eq(routineTasks.childId, id));
  for (const task of tasks) {
    await db.delete(taskCheckins).where(eq(taskCheckins.taskId, task.id));
  }
  await db.delete(routineTasks).where(eq(routineTasks.childId, id));
  await db.delete(children).where(and(eq(children.id, id), eq(children.familyId, familyId)));
}
async function updateTimelineEvent(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateSet = {};
  if (data.title !== void 0) updateSet.title = data.title;
  if (data.content !== void 0) updateSet.content = data.content;
  if (data.eventDate !== void 0) updateSet.eventDate = data.eventDate;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(timelineEvents).set(updateSet).where(eq(timelineEvents.id, id));
}
async function getTaskCheckinsByDate(taskId, date) {
  const db = await getDb();
  if (!db) return [];
  const start = /* @__PURE__ */ new Date(date + "T00:00:00.000Z");
  const end = /* @__PURE__ */ new Date(date + "T23:59:59.999Z");
  return db.select().from(taskCheckins).where(and(eq(taskCheckins.taskId, taskId), gte(taskCheckins.checkedAt, start), lte(taskCheckins.checkedAt, end))).orderBy(desc(taskCheckins.checkedAt));
}
async function getTaskCheckinHistory(taskId, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
  return db.select({
    id: taskCheckins.id,
    checkedAt: taskCheckins.checkedAt,
    value: taskCheckins.value,
    unit: taskCheckins.unit,
    note: taskCheckins.note,
    checkedBy: taskCheckins.checkedBy,
    checkerName: users.name
  }).from(taskCheckins).leftJoin(users, eq(users.id, taskCheckins.checkedBy)).where(and(eq(taskCheckins.taskId, taskId), gte(taskCheckins.checkedAt, since))).orderBy(desc(taskCheckins.checkedAt));
}
async function getTaskFrequencyStats(taskId, days = 14) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
  const rows = await db.select({
    checkedAt: taskCheckins.checkedAt,
    value: taskCheckins.value,
    unit: taskCheckins.unit
  }).from(taskCheckins).where(and(eq(taskCheckins.taskId, taskId), gte(taskCheckins.checkedAt, since))).orderBy(taskCheckins.checkedAt);
  return rows;
}
async function addTaskCheckinWithValue(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(taskCheckins).values(data);
}
async function updateConnectionCategory(connectionId, userId, category) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(connections).set({ category }).where(
    and(
      eq(connections.id, connectionId),
      or(eq(connections.requesterId, userId), eq(connections.receiverId, userId))
    )
  );
}
async function markConnectionUpdated(userId, hasUpdate) {
  const db = await getDb();
  if (!db) return;
  await db.update(connections).set({ hasUpdate }).where(eq(connections.requesterId, userId));
}
async function clearConnectionUpdate(connectionId) {
  const db = await getDb();
  if (!db) return;
  await db.update(connections).set({ hasUpdate: false }).where(eq(connections.id, connectionId));
}
async function searchUsersByName(query, excludeUserId) {
  const db = await getDb();
  if (!db) return [];
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    avatarUrl: users.avatarUrl,
    openId: users.openId
  }).from(users).limit(50);
  const q = query.toLowerCase();
  return allUsers.filter(
    (u) => u.id !== excludeUserId && ((u.name ?? "").toLowerCase().includes(q) || u.openId.toLowerCase().includes(q))
  ).slice(0, 10);
}
async function getAcceptedConnectionsWithCategory(userId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: connections.id,
    status: connections.status,
    category: connections.category,
    hasUpdate: connections.hasUpdate,
    note: connections.note,
    requesterId: connections.requesterId,
    receiverId: connections.receiverId,
    createdAt: connections.createdAt,
    friendName: users.name,
    friendAvatar: users.avatarUrl,
    friendOpenId: users.openId,
    friendId: users.id
  }).from(connections).leftJoin(users, or(
    and(eq(connections.requesterId, userId), eq(users.id, connections.receiverId)),
    and(eq(connections.receiverId, userId), eq(users.id, connections.requesterId))
  )).where(and(
    eq(connections.status, "accepted"),
    or(eq(connections.requesterId, userId), eq(connections.receiverId, userId))
  ));
  return rows;
}
async function getPublicTimelineEventsByFamily(familyId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timelineEvents).where(and(eq(timelineEvents.familyId, familyId), eq(timelineEvents.isPublic, true))).orderBy(desc(timelineEvents.eventDate)).limit(limit);
}
async function updateTimelineEventVisibility(id, isPublic) {
  const db = await getDb();
  if (!db) return;
  await db.update(timelineEvents).set({ isPublic }).where(eq(timelineEvents.id, id));
}
async function getConnectionBetween(userAId, userBId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(connections).where(or(
    and(eq(connections.requesterId, userAId), eq(connections.receiverId, userBId)),
    and(eq(connections.requesterId, userBId), eq(connections.receiverId, userAId))
  )).limit(1);
  return result[0] ?? null;
}
async function getMutualFriends(userAId, userBId) {
  const db = await getDb();
  if (!db) return [];
  const userAConns = await db.select({
    friendId: connections.requesterId,
    receiverId: connections.receiverId
  }).from(connections).where(and(
    or(eq(connections.requesterId, userAId), eq(connections.receiverId, userAId)),
    eq(connections.status, "accepted")
  ));
  const userAFriendIds = userAConns.map((c) => c.friendId === userAId ? c.receiverId : c.friendId);
  const userBConns = await db.select({
    friendId: connections.requesterId,
    receiverId: connections.receiverId
  }).from(connections).where(and(
    or(eq(connections.requesterId, userBId), eq(connections.receiverId, userBId)),
    eq(connections.status, "accepted")
  ));
  const userBFriendIds = userBConns.map((c) => c.friendId === userBId ? c.receiverId : c.friendId);
  const mutualIds = userAFriendIds.filter((id) => id !== userBId && userBFriendIds.includes(id) && id !== userAId);
  if (mutualIds.length === 0) return [];
  const mutualUsers = await db.select({
    id: users.id,
    name: users.name,
    avatarUrl: users.avatarUrl
  }).from(users).where(inArray(users.id, mutualIds));
  return mutualUsers;
}
async function getEventsByCreator(creatorId, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).where(eq(events.createdBy, creatorId)).orderBy(desc(events.eventDate)).limit(limit);
}
async function getFriendEventsFeed(userId, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  const myConns = await db.select({
    requesterId: connections.requesterId,
    receiverId: connections.receiverId
  }).from(connections).where(and(
    or(eq(connections.requesterId, userId), eq(connections.receiverId, userId)),
    eq(connections.status, "accepted")
  ));
  const friendIds = myConns.map((c) => c.requesterId === userId ? c.receiverId : c.requesterId);
  if (friendIds.length === 0) return [];
  const friendEvents = await db.select({
    id: events.id,
    title: events.title,
    description: events.description,
    location: events.location,
    eventDate: events.eventDate,
    isPublic: events.isPublic,
    inviteToken: events.inviteToken,
    coverUrl: events.coverUrl,
    createdBy: events.createdBy,
    createdAt: events.createdAt,
    hostName: users.name,
    hostAvatar: users.avatarUrl
  }).from(events).leftJoin(users, eq(users.id, events.createdBy)).where(and(
    inArray(events.createdBy, friendIds),
    eq(events.isPublic, true)
  )).orderBy(desc(events.eventDate)).limit(limit);
  return friendEvents;
}
async function createEventJoinRequest(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { eventJoinRequests: eventJoinRequests2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const result = await db.insert(eventJoinRequests2).values(data);
  return result[0].insertId;
}
async function getEventJoinRequests(eventId) {
  const db = await getDb();
  if (!db) return [];
  const { eventJoinRequests: eventJoinRequests2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return db.select({
    id: eventJoinRequests2.id,
    status: eventJoinRequests2.status,
    message: eventJoinRequests2.message,
    createdAt: eventJoinRequests2.createdAt,
    requesterId: eventJoinRequests2.requesterId,
    requesterName: users.name,
    requesterAvatar: users.avatarUrl
  }).from(eventJoinRequests2).leftJoin(users, eq(users.id, eventJoinRequests2.requesterId)).where(eq(eventJoinRequests2.eventId, eventId)).orderBy(desc(eventJoinRequests2.createdAt));
}
async function getMyEventJoinRequests(userId) {
  const db = await getDb();
  if (!db) return [];
  const { eventJoinRequests: eventJoinRequests2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return db.select({
    id: eventJoinRequests2.id,
    eventId: eventJoinRequests2.eventId,
    status: eventJoinRequests2.status,
    message: eventJoinRequests2.message,
    createdAt: eventJoinRequests2.createdAt,
    hostId: eventJoinRequests2.hostId,
    eventTitle: events.title,
    eventDate: events.eventDate,
    hostName: users.name
  }).from(eventJoinRequests2).leftJoin(events, eq(events.id, eventJoinRequests2.eventId)).leftJoin(users, eq(users.id, eventJoinRequests2.hostId)).where(eq(eventJoinRequests2.requesterId, userId)).orderBy(desc(eventJoinRequests2.createdAt));
}
async function getPendingJoinRequestsForHost(hostId) {
  const db = await getDb();
  if (!db) return [];
  const { eventJoinRequests: eventJoinRequests2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return db.select({
    id: eventJoinRequests2.id,
    eventId: eventJoinRequests2.eventId,
    status: eventJoinRequests2.status,
    message: eventJoinRequests2.message,
    createdAt: eventJoinRequests2.createdAt,
    requesterId: eventJoinRequests2.requesterId,
    requesterName: users.name,
    requesterAvatar: users.avatarUrl,
    eventTitle: events.title
  }).from(eventJoinRequests2).leftJoin(users, eq(users.id, eventJoinRequests2.requesterId)).leftJoin(events, eq(events.id, eventJoinRequests2.eventId)).where(and(
    eq(eventJoinRequests2.hostId, hostId),
    eq(eventJoinRequests2.status, "pending")
  )).orderBy(desc(eventJoinRequests2.createdAt));
}
async function updateEventJoinRequestStatus(requestId, hostId, status) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { eventJoinRequests: eventJoinRequests2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  await db.update(eventJoinRequests2).set({ status }).where(and(eq(eventJoinRequests2.id, requestId), eq(eventJoinRequests2.hostId, hostId)));
}
async function checkExistingJoinRequest(eventId, requesterId) {
  const db = await getDb();
  if (!db) return null;
  const { eventJoinRequests: eventJoinRequests2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const result = await db.select().from(eventJoinRequests2).where(and(eq(eventJoinRequests2.eventId, eventId), eq(eventJoinRequests2.requesterId, requesterId))).limit(1);
  return result[0] ?? null;
}
async function updateUserAvatar(userId, avatarUrl) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ avatarUrl }).where(eq(users.id, userId));
}
async function createMemberEvent(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { memberEvents: memberEvents2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const [result] = await db.insert(memberEvents2).values({
    familyId: data.familyId,
    userId: data.userId,
    title: data.title,
    eventType: data.eventType,
    eventDate: data.eventDate,
    isYearly: data.isYearly ?? true,
    note: data.note,
    createdBy: data.createdBy
  });
  return result.insertId;
}
async function getMemberEventsByFamily(familyId) {
  const db = await getDb();
  if (!db) return [];
  const { memberEvents: memberEvents2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return db.select().from(memberEvents2).where(eq(memberEvents2.familyId, familyId)).orderBy(memberEvents2.eventDate);
}
async function getMemberEventsByUser(familyId, userId) {
  const db = await getDb();
  if (!db) return [];
  const { memberEvents: memberEvents2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return db.select().from(memberEvents2).where(and(eq(memberEvents2.familyId, familyId), eq(memberEvents2.userId, userId))).orderBy(memberEvents2.eventDate);
}
async function updateMemberEvent(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { memberEvents: memberEvents2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  await db.update(memberEvents2).set(data).where(eq(memberEvents2.id, id));
}
async function deleteMemberEvent(id, familyId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { memberEvents: memberEvents2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  await db.delete(memberEvents2).where(and(eq(memberEvents2.id, id), eq(memberEvents2.familyId, familyId)));
}
async function syncMemberYearlyEvent(args) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { memberEvents: memberEvents2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const existing = await db.select().from(memberEvents2).where(
    and(
      eq(memberEvents2.familyId, args.familyId),
      eq(memberEvents2.userId, args.userId),
      eq(memberEvents2.eventType, args.eventType)
    )
  ).limit(1);
  if (!args.date) {
    if (existing[0]) {
      await db.delete(memberEvents2).where(eq(memberEvents2.id, existing[0].id));
    }
    return { action: "deleted" };
  }
  if (existing[0]) {
    await db.update(memberEvents2).set({ eventDate: args.date, title: args.title, isYearly: true }).where(eq(memberEvents2.id, existing[0].id));
    return { action: "updated", id: existing[0].id };
  }
  const [result] = await db.insert(memberEvents2).values({
    familyId: args.familyId,
    userId: args.userId,
    title: args.title,
    eventType: args.eventType,
    eventDate: args.date,
    isYearly: true,
    createdBy: args.createdBy
  });
  return { action: "inserted", id: result.insertId };
}
async function updateFamilyName(familyId, name) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(families).set({ name }).where(eq(families.id, familyId));
}
async function deleteFamily(familyId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { memberEvents: memberEvents2, timelineEvents: te, routineTasks: rt, taskCheckins: tc, events: ev, rsvps: rv } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  await db.delete(rv).where(
    inArray(rv.eventId, db.select({ id: ev.id }).from(ev).where(eq(ev.familyId, familyId)))
  );
  await db.delete(ev).where(eq(ev.familyId, familyId));
  await db.delete(memberEvents2).where(eq(memberEvents2.familyId, familyId));
  await db.delete(tc).where(
    inArray(tc.taskId, db.select({ id: rt.id }).from(rt).where(eq(rt.familyId, familyId)))
  );
  await db.delete(rt).where(eq(rt.familyId, familyId));
  await db.delete(te).where(eq(te.familyId, familyId));
  await db.delete(children).where(eq(children.familyId, familyId));
  await db.delete(familyMembers).where(eq(familyMembers.familyId, familyId));
  await db.delete(families).where(eq(families.id, familyId));
}
async function leaveFamilyMember(familyId, userId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(familyMembers).where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
}
async function updateChildDetails(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(children).set(data).where(eq(children.id, id));
}
async function getTaskCheckinsByMonth(familyId, year, month) {
  const db = await getDb();
  if (!db) return [];
  const familyTasks = await db.select({ id: routineTasks.id }).from(routineTasks).where(eq(routineTasks.familyId, familyId));
  if (familyTasks.length === 0) return [];
  const taskIds = familyTasks.map((t2) => t2.id);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const rows = await db.select({ checkedAt: taskCheckins.checkedAt }).from(taskCheckins).where(and(
    inArray(taskCheckins.taskId, taskIds),
    gte(taskCheckins.checkedAt, startDate),
    lt(taskCheckins.checkedAt, endDate)
  ));
  const dates = new Set(rows.map((r) => {
    const d = new Date(r.checkedAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }));
  return Array.from(dates);
}
async function createRecommendation(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(recommendations).values(data);
  return result[0].insertId;
}
async function getRecommendationChain(userId) {
  const db = await getDb();
  if (!db) return [];
  const recommenderAlias = alias(users, "recommender");
  const targetAlias = alias(users, "target");
  return db.select({
    id: recommendations.id,
    userId: recommendations.userId,
    recommenderId: recommendations.recommenderId,
    targetUserId: recommendations.targetUserId,
    context: recommendations.context,
    createdAt: recommendations.createdAt,
    recommenderName: recommenderAlias.name,
    recommenderAvatar: recommenderAlias.avatarUrl,
    targetName: targetAlias.name,
    targetAvatar: targetAlias.avatarUrl
  }).from(recommendations).leftJoin(recommenderAlias, eq(recommendations.recommenderId, recommenderAlias.id)).leftJoin(targetAlias, eq(recommendations.targetUserId, targetAlias.id)).where(eq(recommendations.userId, userId)).orderBy(desc(recommendations.createdAt));
}
async function createSkill(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(skills).values(data);
  return result[0].insertId;
}
async function getSkillsByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).where(eq(skills.userId, userId)).orderBy(desc(skills.createdAt));
}
async function getSkillById(skillId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(skills).where(eq(skills.id, skillId)).limit(1);
  return result[0];
}
async function getActiveSkills(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).where(eq(skills.status, "active")).orderBy(desc(skills.createdAt)).limit(limit).offset(offset);
}
async function updateSkillStatus(skillId, status) {
  const db = await getDb();
  if (!db) return;
  await db.update(skills).set({ status }).where(eq(skills.id, skillId));
}
async function createHelpRequest(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(helpRequests).values(data);
  return result[0].insertId;
}
async function getHelpRequestsByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(helpRequests).where(eq(helpRequests.userId, userId)).orderBy(desc(helpRequests.createdAt));
}
async function getHelpRequestById(requestId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(helpRequests).where(eq(helpRequests.id, requestId)).limit(1);
  return result[0];
}
async function getOpenHelpRequests(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(helpRequests).where(eq(helpRequests.status, "open")).orderBy(desc(helpRequests.createdAt)).limit(limit).offset(offset);
}
async function updateHelpRequestStatus(requestId, status) {
  const db = await getDb();
  if (!db) return;
  await db.update(helpRequests).set({ status }).where(eq(helpRequests.id, requestId));
}
async function createSkillMatch(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(skillMatches).values(data);
  return result[0].insertId;
}
async function getMatchesByRequest(requestId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skillMatches).where(eq(skillMatches.requestId, requestId));
}
async function getSkillMatchById(matchId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(skillMatches).where(eq(skillMatches.id, matchId)).limit(1);
  return result[0];
}
async function updateMatchStatus(matchId, status) {
  const db = await getDb();
  if (!db) return;
  await db.update(skillMatches).set({ status }).where(eq(skillMatches.id, matchId));
}
async function createReview(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(reviews).values(data);
  return result[0].insertId;
}
async function getReviewsForUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.toUserId, userId)).orderBy(desc(reviews.createdAt));
}
async function getReviewByMatchAndAuthor(matchId, fromUserId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(reviews).where(and(eq(reviews.matchId, matchId), eq(reviews.fromUserId, fromUserId))).limit(1);
  return result[0];
}
async function createUserReport(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(userReports).values(data);
  return result[0].insertId;
}
async function getPendingReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userReports).where(eq(userReports.status, "pending")).orderBy(desc(userReports.createdAt));
}
async function updateReportStatus(reportId, status) {
  const db = await getDb();
  if (!db) return;
  await db.update(userReports).set({ status }).where(eq(userReports.id, reportId));
}
async function blockUser(userId, blockedUserId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(userBlocks).values({ userId, blockedUserId });
  return result[0].insertId;
}
async function unblockUser(userId, blockedUserId) {
  const db = await getDb();
  if (!db) return;
  await db.delete(userBlocks).where(
    and(eq(userBlocks.userId, userId), eq(userBlocks.blockedUserId, blockedUserId))
  );
}
async function getBlockedUsers(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: userBlocks.id,
    blockedUserId: userBlocks.blockedUserId,
    blockedName: users.name,
    blockedAvatar: users.avatarUrl,
    createdAt: userBlocks.createdAt
  }).from(userBlocks).leftJoin(users, eq(userBlocks.blockedUserId, users.id)).where(eq(userBlocks.userId, userId));
}
async function isUserBlocked(userId, targetId) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(userBlocks).where(and(eq(userBlocks.userId, userId), eq(userBlocks.blockedUserId, targetId))).limit(1);
  return result.length > 0;
}
var _db, _dbCreatedAt, _schemaReadyPromise, DB_MAX_AGE_MS;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_bootstrap_sql();
    init_schema();
    _db = null;
    _dbCreatedAt = 0;
    _schemaReadyPromise = null;
    DB_MAX_AGE_MS = 5 * 60 * 1e3;
  }
});

// server/vercel-handler.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// server/_core/env.ts
var ENV = {
  // appId is a Manus-OAuth leftover that we still embed in session JWTs.
  // It MUST be a non-empty string, otherwise verifySession() rejects the
  // cookie and every protected route returns 401. Default to the project
  // slug so email/password deployments don't need to set VITE_APP_ID.
  appId: process.env.VITE_APP_ID || "pinple",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/sdk.ts
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId)) {
        console.warn("[Auth] Session payload missing openId");
        return null;
      }
      return {
        openId,
        appId: isNonEmptyString(appId) ? appId : "pinple",
        name: isNonEmptyString(name) ? name : ""
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/oauth.ts
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure
  };
}

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      let upsertErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: /* @__PURE__ */ new Date()
          });
          upsertErr = null;
          break;
        } catch (err) {
          upsertErr = err;
          const isConnReset = err?.message?.includes("ECONNRESET") || err?.cause?.code === "ECONNRESET";
          if (isConnReset && attempt < 2) {
            resetDb();
            await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
            continue;
          }
          break;
        }
      }
      if (upsertErr) {
        console.error("[OAuth] upsertUser failed after retries", upsertErr);
      }
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.redirect(302, "/?auth_error=1");
    }
  });
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { nanoid as nanoid2 } from "nanoid";
import { z as z2 } from "zod";

// server/_core/auto-generate.ts
init_db();
import { nanoid } from "nanoid";
function addDays(d, days) {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}
function addMonths(d, months) {
  const out = new Date(d.getTime());
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}
function addYears(d, years) {
  const out = new Date(d.getTime());
  out.setUTCFullYear(out.getUTCFullYear() + years);
  return out;
}
async function generatePregnancyEvents(input) {
  if (!input.pregnancyRefDate) return 0;
  const weeks = input.pregnancyWeeksAtRef ?? 0;
  const days = input.pregnancyDaysAtRef ?? 0;
  const lmp = addDays(input.pregnancyRefDate, -(weeks * 7 + days));
  const implantation = addDays(lmp, 14);
  const edd = addDays(lmp, 280);
  const items = [
    {
      title: "\u672B\u6B21\u6708\u7ECF\uFF08LMP\uFF09",
      content: `${input.nickname} \u7684\u5B55\u671F\u8D77\u70B9\uFF0C\u7528\u4E8E\u63A8\u7B97\u5B55\u5468\u3002`,
      date: lmp
    },
    {
      title: "\u9884\u8BA1\u7740\u5E8A\u65E5",
      content: "\u53D7\u7CBE\u540E 7-10 \u5929\u7740\u5E8A\uFF0C\u7EA6\u4E3A LMP \u540E 14 \u5929\u3002",
      date: implantation
    }
  ];
  for (const wk of [8, 12, 16, 20, 24, 28, 32, 36]) {
    items.push({
      title: `\u5B55 ${wk} \u5468\u4EA7\u68C0`,
      content: `\u5EFA\u8BAE\u5728 ${wk} \u5468\u524D\u540E\u5B8C\u6210\u4E00\u6B21\u5E38\u89C4\u4EA7\u68C0\u3002`,
      date: addDays(lmp, wk * 7)
    });
  }
  items.push({
    title: "\u9884\u4EA7\u671F\uFF08EDD\uFF09",
    content: "\u6839\u636E LMP \u63A8\u7B97\uFF1ALMP + 280 \u5929\u3002\u5B9E\u9645\u5206\u5A29\u65F6\u95F4\u4F1A\u6709 \xB12 \u5468\u6CE2\u52A8\u3002",
    date: edd
  });
  let created = 0;
  for (const it of items) {
    await createTimelineEvent({
      childId: input.childId,
      familyId: input.familyId,
      type: "pregnancy",
      title: it.title,
      content: it.content,
      eventDate: it.date,
      createdBy: input.createdBy,
      isPublic: false
    });
    created++;
  }
  return created;
}
async function generateMilestoneEvents(input) {
  if (!input.birthDate) return 0;
  const b = input.birthDate;
  const items = [
    { title: "\u51FA\u751F", content: `${input.nickname} \u6765\u5230\u8FD9\u4E2A\u4E16\u754C\uFF01`, date: b },
    { title: "\u6EE1\u6708", content: "\u5B9D\u5B9D\u6EE1\u6708\u5566\uFF01", date: addDays(b, 30) },
    { title: "42\u5929\u4F53\u68C0", content: "\u4EA7\u540E 42 \u5929\u6BCD\u5A74\u5E38\u89C4\u590D\u67E5\u3002", date: addDays(b, 42) },
    { title: "\u767E\u65E5", content: "\u5B9D\u5B9D 100 \u5929\u5566\uFF01", date: addDays(b, 100) },
    { title: "3 \u4E2A\u6708", content: "3 \u6708\u9F84\u53D1\u80B2\u91CC\u7A0B\u7891\u3002", date: addMonths(b, 3) },
    { title: "6 \u4E2A\u6708", content: "6 \u6708\u9F84\u53D1\u80B2\u91CC\u7A0B\u7891\u3002", date: addMonths(b, 6) },
    { title: "9 \u4E2A\u6708", content: "9 \u6708\u9F84\u53D1\u80B2\u91CC\u7A0B\u7891\u3002", date: addMonths(b, 9) },
    { title: "1 \u5468\u5C81", content: "\u7B2C\u4E00\u4E2A\u751F\u65E5\uFF01", date: addMonths(b, 12) },
    { title: "1 \u5C81\u534A", content: "18 \u6708\u9F84\u53D1\u80B2\u91CC\u7A0B\u7891\u3002", date: addMonths(b, 18) },
    { title: "2 \u5468\u5C81", content: "\u7B2C\u4E8C\u4E2A\u751F\u65E5\u3002", date: addMonths(b, 24) },
    { title: "3 \u5468\u5C81", content: "\u7B2C\u4E09\u4E2A\u751F\u65E5\u3002", date: addMonths(b, 36) }
  ];
  for (const age of [4, 5, 6]) {
    items.push({
      title: `${age} \u5468\u5C81`,
      content: `${input.nickname} ${age} \u5C81\u751F\u65E5\u5FEB\u4E50\uFF01`,
      date: addYears(b, age)
    });
  }
  let created = 0;
  for (const it of items) {
    await createTimelineEvent({
      childId: input.childId,
      familyId: input.familyId,
      type: "milestone",
      title: it.title,
      content: it.content,
      eventDate: it.date,
      createdBy: input.createdBy,
      isPublic: false
    });
    created++;
  }
  return created;
}
var DEFAULT_RSVP_ROLES = ["\u7238\u7238", "\u5988\u5988", "\u7237\u7237", "\u5976\u5976", "\u597D\u53CB"];
async function generateWelcomeEvent(input) {
  const eventDate = input.birthDate ? input.birthDate : addDays(/* @__PURE__ */ new Date(), 7);
  const eventId = await createEvent({
    familyId: input.familyId,
    title: `\u6B22\u8FCE ${input.nickname}\uFF01`,
    description: "\u7CFB\u7EDF\u81EA\u52A8\u521B\u5EFA\u7684\u6B22\u8FCE\u6D3B\u52A8\u3002\u53EF\u7F16\u8F91\u65F6\u95F4\u3001\u5730\u70B9\u540E\u5206\u4EAB\u7ED9\u4EB2\u53CB\u3002",
    eventDate,
    inviteToken: nanoid(12),
    isPublic: false,
    createdBy: input.createdBy
  });
  let rsvpCount = 0;
  for (const role of DEFAULT_RSVP_ROLES) {
    await createRsvp({
      eventId,
      guestName: role,
      status: "maybe",
      note: "\u7CFB\u7EDF\u9884\u8BBE RSVP\uFF0C\u7B49\u5F85\u5BB6\u4EBA\u786E\u8BA4"
    });
    rsvpCount++;
  }
  return { eventId, rsvpCount };
}
async function runChildAutoGeneration(input) {
  const result = {
    pregnancyEvents: 0,
    milestoneEvents: 0,
    welcomeEventId: null,
    welcomeRsvps: 0,
    errors: []
  };
  try {
    result.pregnancyEvents = await generatePregnancyEvents({
      childId: input.childId,
      familyId: input.familyId,
      createdBy: input.createdBy,
      nickname: input.nickname,
      pregnancyRefDate: input.pregnancyRefDate,
      pregnancyWeeksAtRef: input.pregnancyWeeksAtRef,
      pregnancyDaysAtRef: input.pregnancyDaysAtRef
    });
  } catch (err) {
    result.errors.push({ step: "pregnancy", message: String(err?.message || err) });
  }
  try {
    result.milestoneEvents = await generateMilestoneEvents({
      childId: input.childId,
      familyId: input.familyId,
      createdBy: input.createdBy,
      nickname: input.nickname,
      birthDate: input.birthDate
    });
  } catch (err) {
    result.errors.push({ step: "milestone", message: String(err?.message || err) });
  }
  try {
    const welcome = await generateWelcomeEvent({
      childId: input.childId,
      familyId: input.familyId,
      createdBy: input.createdBy,
      nickname: input.nickname,
      birthDate: input.birthDate
    });
    result.welcomeEventId = welcome.eventId;
    result.welcomeRsvps = welcome.rsvpCount;
  } catch (err) {
    result.errors.push({ step: "welcome", message: String(err?.message || err) });
  }
  return result;
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/_core/email.ts
function hasEmailProvider() {
  return Boolean(process.env.RESEND_API_KEY);
}
async function sendEmail(params) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Pinple <onboarding@resend.dev>";
  if (!apiKey) {
    console.log("[email] RESEND_API_KEY \u672A\u914D\u7F6E\uFF0C\u8DF3\u8FC7\u5B9E\u9645\u53D1\u9001\u3002");
    console.log("[email] \u2192 to:", params.to, "| subject:", params.subject);
    return { sent: false, reason: "no-provider" };
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text
      })
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.error("[email] Resend \u53D1\u9001\u5931\u8D25:", resp.status, body);
      return { sent: false, reason: `resend-${resp.status}` };
    }
    const data = await resp.json();
    return { sent: true, providerId: data?.id };
  } catch (err) {
    console.error("[email] \u53D1\u9001\u5F02\u5E38:", err);
    return { sent: false, reason: "exception" };
  }
}
function buildPasswordResetEmail(params) {
  const { name, resetUrl, expiresMinutes } = params;
  const subject = "\u3010\u62FC\u670B\u53CB Pinple\u3011\u91CD\u7F6E\u4F60\u7684\u767B\u5F55\u5BC6\u7801";
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Space Grotesk','PingFang SC',sans-serif;background:#030407;color:#fff;padding:40px 0;">
      <div style="max-width:520px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:36px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.18em;color:rgba(255,255,255,0.55);background:rgba(255,255,255,0.08);padding:4px 12px;border-radius:999px;display:inline-block;text-transform:uppercase;">PINPLE.IDENTITY</div>
        <h1 style="margin:18px 0 10px;font-size:24px;font-weight:500;">\u4F60\u597D ${escapeHtml(name) || "\u670B\u53CB"}\uFF0C</h1>
        <p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.6;margin:0 0 24px;">
          \u6211\u4EEC\u6536\u5230\u4E86\u4F60\u91CD\u7F6E"\u62FC\u670B\u53CB"\u8D26\u53F7\u5BC6\u7801\u7684\u8BF7\u6C42\u3002\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u5373\u53EF\u8BBE\u7F6E\u65B0\u5BC6\u7801\uFF0C\u94FE\u63A5\u5C06\u5728 <b>${expiresMinutes} \u5206\u949F</b> \u5185\u6709\u6548\u3002
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#fff;color:#030407;font-weight:600;padding:14px 28px;border-radius:999px;text-decoration:none;letter-spacing:0.04em;">\u91CD\u7F6E\u5BC6\u7801 \u2192</a>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:28px 0 0;line-height:1.6;">
          \u5982\u679C\u6309\u94AE\u65E0\u6CD5\u70B9\u51FB\uFF0C\u8BF7\u590D\u5236\u4EE5\u4E0B\u94FE\u63A5\u5230\u6D4F\u89C8\u5668\uFF1A<br/>
          <span style="color:rgba(255,255,255,0.7);word-break:break-all;">${resetUrl}</span>
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:28px 0;" />
        <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0;">\u5982\u679C\u4E0D\u662F\u4F60\u672C\u4EBA\u53D1\u8D77\uFF0C\u5FFD\u7565\u6B64\u90AE\u4EF6\u5373\u53EF\uFF0C\u8D26\u53F7\u5B89\u5168\u4E0D\u4F1A\u53D7\u5230\u5F71\u54CD\u3002</p>
      </div>
    </div>
  `;
  const text2 = `\u4F60\u597D ${name || "\u670B\u53CB"}\uFF0C

\u6211\u4EEC\u6536\u5230\u4E86\u4F60\u91CD\u7F6E"\u62FC\u670B\u53CB"\u8D26\u53F7\u5BC6\u7801\u7684\u8BF7\u6C42\u3002\u8BF7\u5728 ${expiresMinutes} \u5206\u949F\u5185\u6253\u5F00\u4EE5\u4E0B\u94FE\u63A5\u91CD\u7F6E\u5BC6\u7801\uFF1A

${resetUrl}

\u5982\u679C\u4E0D\u662F\u4F60\u672C\u4EBA\u53D1\u8D77\uFF0C\u8BF7\u5FFD\u7565\u6B64\u90AE\u4EF6\u3002`;
  return { subject, html, text: text2 };
}
function escapeHtml(input) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// server/routers.ts
init_db();
function calcEDD(transferDate, embryoDay = 5) {
  const daysBack = embryoDay + 14;
  const lmp = new Date(transferDate.getTime() - daysBack * 24 * 60 * 60 * 1e3);
  const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1e3);
  const twin37w = new Date(lmp.getTime() + 259 * 24 * 60 * 60 * 1e3);
  return { lmp, edd, twin37w };
}
function calcAge(birthDate) {
  const now = /* @__PURE__ */ new Date();
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  let days = now.getDate() - birthDate.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  const totalMonths = years * 12 + months;
  return { years, months, days, totalMonths };
}
async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
function getAppOrigin(req) {
  const forwardedHost = Array.isArray(req.headers["x-forwarded-host"]) ? req.headers["x-forwarded-host"][0] : req.headers["x-forwarded-host"];
  const host = forwardedHost || req.headers.host || "localhost";
  const forwardedProto = Array.isArray(req.headers["x-forwarded-proto"]) ? req.headers["x-forwarded-proto"][0] : req.headers["x-forwarded-proto"];
  const proto = forwardedProto || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
async function assertFamilyAdmin(familyId, userId) {
  const member = await getMemberRole(familyId, userId);
  if (!member || member.role !== "admin") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650" });
  }
}
async function assertFamilyMember(familyId, userId) {
  const member = await getMemberRole(familyId, userId);
  if (!member) {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\u60A8\u4E0D\u662F\u8BE5\u5BB6\u5EAD\u6210\u5458" });
  }
  return member;
}
async function assertFamilyCollaboratorOrAdmin(familyId, userId) {
  const member = await getMemberRole(familyId, userId);
  if (!member || member.role === "observer") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\u9700\u8981\u534F\u4F5C\u8005\u6216\u7BA1\u7406\u5458\u6743\u9650" });
  }
  return member;
}
var DEFAULT_TASKS = [
  { title: "\u4EA7\u68C0\u8BB0\u5F55", category: "checkup", icon: "\u{1FA7A}", color: "#6366f1", repeatRule: "weekly" },
  { title: "\u5B55\u671F\u8FD0\u52A8", category: "play", icon: "\u{1F9D8}", color: "#a855f7", repeatRule: "daily" },
  { title: "\u8865\u5145\u53F6\u9178", category: "feeding", icon: "\u{1F48A}", color: "#22d3ee", repeatRule: "daily" },
  { title: "\u4F53\u91CD\u8BB0\u5F55", category: "checkup", icon: "\u2696\uFE0F", color: "#34D399", repeatRule: "weekly" }
];
var DEFAULT_MILESTONES = [
  { ageMonthMin: 0, ageMonthMax: 1, title: "\u65B0\u751F\u513F\u671F\uFF1A\u6CE8\u610F\u4FDD\u6696\u4E0E\u5582\u517B", description: "\u6BCF2-3\u5C0F\u65F6\u5582\u5976\u4E00\u6B21\uFF0C\u6CE8\u610F\u8110\u5E26\u62A4\u7406\uFF0C\u907F\u514D\u5F3A\u5149\u523A\u6FC0\u773C\u775B\u3002", category: "development" },
  { ageMonthMin: 0, ageMonthMax: 2, title: "\u4E59\u809D\u75AB\u82D7\u7B2C\u4E00\u9488", description: "\u51FA\u751F\u540E24\u5C0F\u65F6\u5185\u63A5\u79CD\u4E59\u809D\u75AB\u82D7\u7B2C\u4E00\u9488\uFF0C\u540C\u65F6\u63A5\u79CD\u5361\u4ECB\u82D7\u3002", category: "vaccination" },
  { ageMonthMin: 1, ageMonthMax: 2, title: "\u5F00\u59CB\u8FFD\u89C6\u4E0E\u8FFD\u58F0", description: "\u5B9D\u5B9D\u5F00\u59CB\u80FD\u8FFD\u89C6\u79FB\u52A8\u7269\u4F53\uFF0C\u5BF9\u58F0\u97F3\u6709\u53CD\u5E94\uFF0C\u53EF\u4EE5\u5C1D\u8BD5\u9ED1\u767D\u5361\u523A\u6FC0\u89C6\u89C9\u3002", category: "development" },
  { ageMonthMin: 2, ageMonthMax: 3, title: "\u793E\u4EA4\u6027\u5FAE\u7B11\u51FA\u73B0", description: "\u5B9D\u5B9D\u5F00\u59CB\u51FA\u73B0\u793E\u4EA4\u6027\u5FAE\u7B11\uFF0C\u80FD\u8BA4\u51FA\u719F\u6089\u7684\u9762\u5B54\uFF0C\u591A\u548C\u5B9D\u5B9D\u8BF4\u8BDD\u4E92\u52A8\u3002", category: "development" },
  { ageMonthMin: 2, ageMonthMax: 3, title: "\u767E\u767D\u7834+\u810A\u7070\u75AB\u82D7\u7B2C\u4E00\u9488", description: "2\u6708\u9F84\u63A5\u79CD\u767E\u767D\u7834\u75AB\u82D7\u548C\u810A\u7070\u75AB\u82D7\u7B2C\u4E00\u9488\u3002", category: "vaccination" },
  { ageMonthMin: 3, ageMonthMax: 4, title: "\u62AC\u5934\u8BAD\u7EC3", description: "\u5B9D\u5B9D\u8DB4\u7740\u65F6\u80FD\u62AC\u593445\u5EA6\uFF0C\u53EF\u4EE5\u5F00\u59CBTummy Time\u7EC3\u4E60\uFF0C\u6BCF\u6B215-10\u5206\u949F\u3002", category: "development" },
  { ageMonthMin: 4, ageMonthMax: 6, title: "\u7FFB\u8EAB\u91CC\u7A0B\u7891", description: "\u5927\u591A\u6570\u5B9D\u5B9D\u57284-6\u6708\u9F84\u5B66\u4F1A\u7FFB\u8EAB\uFF0C\u6CE8\u610F\u5E8A\u8FB9\u5B89\u5168\u9632\u62A4\u3002", category: "development" },
  { ageMonthMin: 6, ageMonthMax: 7, title: "\u5F00\u59CB\u6DFB\u52A0\u8F85\u98DF", description: "6\u6708\u9F84\u8D77\u53EF\u4EE5\u5F00\u59CB\u6DFB\u52A0\u8F85\u98DF\uFF0C\u4ECE\u7C73\u7CCA\u3001\u852C\u83DC\u6CE5\u5F00\u59CB\uFF0C\u6BCF\u6B21\u53EA\u5F15\u5165\u4E00\u79CD\u65B0\u98DF\u7269\u3002", category: "nutrition" },
  { ageMonthMin: 6, ageMonthMax: 8, title: "\u5750\u7ACB\u91CC\u7A0B\u7891", description: "\u5B9D\u5B9D\u5F00\u59CB\u80FD\u72EC\u5750\uFF0C\u53EF\u4EE5\u63D0\u4F9B\u5B89\u5168\u7684\u5750\u7ACB\u73AF\u5883\uFF0C\u6CE8\u610F\u4E0D\u8981\u4E45\u5750\u3002", category: "development" },
  { ageMonthMin: 8, ageMonthMax: 10, title: "\u722C\u884C\u91CC\u7A0B\u7891", description: "\u5927\u591A\u6570\u5B9D\u5B9D\u57288-10\u6708\u9F84\u5F00\u59CB\u722C\u884C\uFF0C\u786E\u4FDD\u5730\u9762\u5B89\u5168\uFF0C\u79FB\u9664\u5371\u9669\u7269\u54C1\u3002", category: "development" },
  { ageMonthMin: 9, ageMonthMax: 12, title: "\u6276\u7AD9\u4E0E\u5B66\u6B65", description: "\u5B9D\u5B9D\u5F00\u59CB\u6276\u7269\u7AD9\u7ACB\uFF0C\u53EF\u4EE5\u51C6\u5907\u5B66\u6B65\u978B\uFF0C\u6CE8\u610F\u5BB6\u5177\u8FB9\u89D2\u9632\u62A4\u3002", category: "development" },
  { ageMonthMin: 12, ageMonthMax: 18, title: "\u72EC\u7ACB\u884C\u8D70", description: "\u5927\u591A\u6570\u5B9D\u5B9D\u572812-18\u6708\u9F84\u5B66\u4F1A\u72EC\u7ACB\u884C\u8D70\uFF0C\u9F13\u52B1\u591A\u8D70\u8DEF\uFF0C\u6CE8\u610F\u9632\u8DCC\u5012\u3002", category: "development" },
  { ageMonthMin: 12, ageMonthMax: 13, title: "1\u5C81\u4F53\u68C0", description: "1\u5C81\u4F53\u68C0\u5305\u62EC\u8EAB\u9AD8\u4F53\u91CD\u3001\u53D1\u80B2\u8BC4\u4F30\u3001\u8840\u5E38\u89C4\u68C0\u67E5\uFF0C\u5EFA\u8BAE\u540C\u65F6\u63A5\u79CD\u9EBB\u816E\u98CE\u75AB\u82D7\u3002", category: "checkup" }
];
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    register: publicProcedure.input(z2.object({
      email: z2.string().email(),
      password: z2.string().min(8).max(100),
      name: z2.string().min(1).max(100)
    })).mutation(async ({ ctx, input }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) throw new TRPCError3({ code: "CONFLICT", message: "\u8BE5\u90AE\u7BB1\u5DF2\u6CE8\u518C" });
      const passwordHash = await sha256Hex(input.password);
      const openId = `email_${nanoid2(16)}`;
      const userId = await createEmailUser({
        email: input.email,
        name: input.name,
        passwordHash,
        openId
      });
      const sessionToken = await sdk.createSessionToken(openId, {
        name: input.name,
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      const { getUserById: getUserById2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const user = await getUserById2(userId);
      return { userId, success: true, user };
    }),
    // 通用登录：identifier 可以是邮箱（含 @）或数字用户 ID
    loginWithIdentifier: publicProcedure.input(z2.object({
      identifier: z2.string().min(1).max(320),
      password: z2.string()
    })).mutation(async ({ ctx, input }) => {
      const identifier = input.identifier.trim();
      let user;
      if (identifier.includes("@")) {
        user = await getUserByEmail(identifier);
      } else if (/^\d+$/.test(identifier)) {
        const { getUserById: getUserById2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        user = await getUserById2(Number(identifier));
      } else {
        const { getUserByOpenId: getUserByOpenId2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        user = await getUserByOpenId2(identifier);
      }
      if (!user || !user.passwordHash) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF" });
      }
      const passwordHash = await sha256Hex(input.password);
      if (passwordHash !== user.passwordHash) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF" });
      }
      const creditScore = await getUserCreditScore(user.id);
      if (creditScore < 10) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u60A8\u7684\u4FE1\u7528\u5206\u8FC7\u4F4E\uFF0C\u65E0\u6CD5\u767B\u5F55" });
      }
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { userId: user.id, success: true, user };
    }),
    // 兼容旧前端：保留 loginWithEmail 作为 loginWithIdentifier 的薄包装
    loginWithEmail: publicProcedure.input(z2.object({
      email: z2.string().email(),
      password: z2.string()
    })).mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF" });
      }
      const passwordHash = await sha256Hex(input.password);
      if (passwordHash !== user.passwordHash) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF" });
      }
      const creditScore = await getUserCreditScore(user.id);
      if (creditScore < 10) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u60A8\u7684\u4FE1\u7528\u5206\u8FC7\u4F4E\uFF0C\u65E0\u6CD5\u767B\u5F55" });
      }
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { userId: user.id, success: true };
    }),
    // 请求通过邮箱找回密码。始终返回 { sent: true } 以避免账号枚举。
    // 若未配置 RESEND_API_KEY，会在返回值里附带 resetUrl（仅开发/过渡用途）。
    requestPasswordReset: publicProcedure.input(z2.object({ email: z2.string().email() })).mutation(async ({ ctx, input }) => {
      const EXPIRES_MINUTES = 30;
      const user = await getUserByEmail(input.email);
      if (!user) {
        return { sent: true, emailed: false, resetUrl: null };
      }
      const token = nanoid2(48);
      const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1e3);
      try {
        await createPasswordResetToken({ userId: user.id, token, expiresAt });
      } catch (err) {
        console.error("[auth] \u521B\u5EFA\u91CD\u7F6E token \u5931\u8D25\uFF1A", err);
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u670D\u52A1\u5F02\u5E38\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" });
      }
      const origin = getAppOrigin(ctx.req);
      const resetUrl = `${origin}/?reset_token=${encodeURIComponent(token)}`;
      const { subject, html, text: text2 } = buildPasswordResetEmail({
        name: user.name || "",
        resetUrl,
        expiresMinutes: EXPIRES_MINUTES
      });
      const result = await sendEmail({ to: input.email, subject, html, text: text2 });
      if (hasEmailProvider()) {
        return { sent: true, emailed: result.sent, resetUrl: null };
      }
      return { sent: true, emailed: false, resetUrl };
    }),
    // 用 token 重置密码
    resetPassword: publicProcedure.input(z2.object({
      token: z2.string().min(10).max(200),
      newPassword: z2.string().min(8).max(100)
    })).mutation(async ({ ctx, input }) => {
      const record = await getValidPasswordResetToken(input.token);
      if (!record) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u94FE\u63A5\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u7533\u8BF7\u627E\u56DE\u5BC6\u7801" });
      }
      const passwordHash = await sha256Hex(input.newPassword);
      await updateUserPassword(record.userId, passwordHash);
      await markPasswordResetTokenUsed(record.id);
      const { getUserById: getUserById2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const user = await getUserById2(record.userId);
      if (user) {
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      }
      return { success: true };
    })
  }),
  // ─── Family ──────────────────────────────────────────────────────────────
  family: router({
    myFamilies: protectedProcedure.query(async ({ ctx }) => {
      return getUserFamilies(ctx.user.id);
    }),
    create: protectedProcedure.input(z2.object({ name: z2.string().min(1).max(100), description: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      const inviteCode = nanoid2(8).toUpperCase();
      const familyId = await createFamily({
        name: input.name,
        description: input.description,
        createdBy: ctx.user.id,
        inviteCode
      });
      await addFamilyMember({ familyId, userId: ctx.user.id, role: "admin" });
      for (const task of DEFAULT_TASKS) {
        await createRoutineTask({ ...task, familyId, createdBy: ctx.user.id });
      }
      const welcomeEventDate = /* @__PURE__ */ new Date();
      welcomeEventDate.setMonth(welcomeEventDate.getMonth() + 6);
      const welcomeToken = nanoid2(16);
      const welcomeEventId = await createEvent({
        familyId,
        title: "\u{1F389} \u5B9D\u5B9D\u964D\u4E34\u5E86\u795D\u4F1A",
        description: "\u671F\u5F85\u5B9D\u5B9D\u7684\u5230\u6765\uFF01\u5BB6\u4EBA\u670B\u53CB\u4EEC\u4E00\u8D77\u6765\u5E86\u795D\u8FD9\u4E2A\u7F8E\u597D\u65F6\u523B\uFF0C\u5206\u4EAB\u559C\u60A6\u4E0E\u795D\u798F\u3002",
        location: "\u5F85\u5B9A",
        eventDate: welcomeEventDate,
        inviteToken: welcomeToken,
        isPublic: true,
        createdBy: ctx.user.id
      });
      await createRsvp({ eventId: welcomeEventId, guestName: "\u5976\u5976", status: "attending", note: "\u4E00\u5B9A\u5230\uFF01\u5E26\u4E86\u5927\u7EA2\u5305 \u{1F9E7}" });
      await createRsvp({ eventId: welcomeEventId, guestName: "\u5916\u5A46", status: "attending", note: "\u63D0\u524D\u51C6\u5907\u597D\u4E86\u5C0F\u793C\u7269 \u{1F381}" });
      await createRsvp({ eventId: welcomeEventId, guestName: "\u59D1\u59D1", status: "attending", note: "\u6211\u6765\u5E2E\u5FD9\u5E03\u7F6E\u573A\u5730\uFF01" });
      await createRsvp({ eventId: welcomeEventId, guestName: "\u597D\u670B\u53CB\u5C0F\u674E", status: "maybe", note: "\u5C3D\u91CF\u8D76\u8FC7\u6765\uFF0C\u770B\u770B\u80FD\u4E0D\u80FD\u8BF7\u5230\u5047" });
      await createRsvp({ eventId: welcomeEventId, guestName: "\u540C\u4E8B\u5C0F\u738B", status: "declined", note: "\u90A3\u5929\u6709\u51FA\u5DEE\uFF0C\u63D0\u524D\u9001\u4E0A\u795D\u798F\uFF01" });
      const existing = await getAllMilestoneTemplates();
      if (existing.length === 0) {
        const { getDb: getDb3 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const db = await getDb3();
        if (db) {
          const { milestoneTemplates: milestoneTemplates2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          await db.insert(milestoneTemplates2).values(DEFAULT_MILESTONES);
        }
      }
      return { familyId, inviteCode };
    }),
    join: protectedProcedure.input(z2.object({ inviteCode: z2.string() })).mutation(async ({ ctx, input }) => {
      const family = await getFamilyByInviteCode(input.inviteCode.toUpperCase());
      if (!family) throw new TRPCError3({ code: "NOT_FOUND", message: "\u9080\u8BF7\u7801\u65E0\u6548" });
      const existing = await getMemberRole(family.id, ctx.user.id);
      if (existing) throw new TRPCError3({ code: "CONFLICT", message: "\u60A8\u5DF2\u7ECF\u662F\u8BE5\u5BB6\u5EAD\u6210\u5458" });
      await addFamilyMember({ familyId: family.id, userId: ctx.user.id, role: "observer" });
      return { familyId: family.id };
    }),
    get: protectedProcedure.input(z2.object({ familyId: z2.number() })).query(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      return getFamilyById(input.familyId);
    }),
    update: protectedProcedure.input(z2.object({ familyId: z2.number(), name: z2.string().optional(), description: z2.string().optional(), coverUrl: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      await assertFamilyAdmin(input.familyId, ctx.user.id);
      const { familyId, ...data } = input;
      await updateFamily(familyId, data);
      return { success: true };
    }),
    members: protectedProcedure.input(z2.object({ familyId: z2.number() })).query(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      return getFamilyMembers(input.familyId);
    }),
    updateMemberRole: protectedProcedure.input(z2.object({ familyId: z2.number(), userId: z2.number(), role: z2.enum(["admin", "collaborator", "observer"]) })).mutation(async ({ ctx, input }) => {
      await assertFamilyAdmin(input.familyId, ctx.user.id);
      if (input.role !== "admin") {
        const members = await getFamilyMembers(input.familyId);
        const admins = members.filter((m) => m.role === "admin");
        const isTargetAdmin = admins.some((m) => m.userId === input.userId);
        if (isTargetAdmin && admins.length === 1) {
          throw new TRPCError3({
            code: "FORBIDDEN",
            message: "\u81F3\u5C11\u9700\u8981\u4FDD\u7559\u4E00\u540D\u7BA1\u7406\u5458\uFF0C\u8BF7\u5148\u5C06\u7BA1\u7406\u5458\u6743\u9650\u8F6C\u8BA9\u7ED9\u5176\u4ED6\u6210\u5458"
          });
        }
      }
      await updateMemberRole(input.familyId, input.userId, input.role);
      return { success: true };
    }),
    removeMember: protectedProcedure.input(z2.object({ familyId: z2.number(), userId: z2.number() })).mutation(async ({ ctx, input }) => {
      await assertFamilyAdmin(input.familyId, ctx.user.id);
      const members = await getFamilyMembers(input.familyId);
      const target = members.find((m) => m.userId === input.userId);
      if (!target) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u8BE5\u6210\u5458\u4E0D\u5B58\u5728" });
      }
      if (target.role === "admin") {
        const admins = members.filter((m) => m.role === "admin");
        if (admins.length === 1) {
          throw new TRPCError3({
            code: "FORBIDDEN",
            message: "\u4E0D\u80FD\u79FB\u9664\u6700\u540E\u4E00\u540D\u7BA1\u7406\u5458\uFF0C\u8BF7\u5148\u8F6C\u8BA9\u7BA1\u7406\u5458\u6743\u9650"
          });
        }
      }
      await removeFamilyMember(input.familyId, input.userId);
      return { success: true };
    }),
    updateMemberDates: protectedProcedure.input(z2.object({
      familyId: z2.number(),
      userId: z2.number(),
      birthDate: z2.string().optional().nullable(),
      anniversaryDate: z2.string().optional().nullable(),
      nickname: z2.string().optional().nullable()
    })).mutation(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      const myRole = await getMemberRole(input.familyId, ctx.user.id);
      if (input.userId !== ctx.user.id && myRole?.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u7BA1\u7406\u5458\u53EF\u4EE5\u4FEE\u6539\u5176\u4ED6\u6210\u5458\u4FE1\u606F" });
      }
      const birthDate = input.birthDate ? new Date(input.birthDate) : input.birthDate === null ? null : void 0;
      const anniversaryDate = input.anniversaryDate ? new Date(input.anniversaryDate) : input.anniversaryDate === null ? null : void 0;
      await updateMemberDates(input.familyId, input.userId, {
        birthDate,
        anniversaryDate,
        nickname: input.nickname
      });
      const member = (await getFamilyMembers(input.familyId)).find(
        (m) => m.userId === input.userId
      );
      const displayName = input.nickname ?? member?.nickname ?? member?.user?.name ?? "\u5BB6\u4EBA";
      if (birthDate !== void 0) {
        try {
          await syncMemberYearlyEvent({
            familyId: input.familyId,
            userId: input.userId,
            eventType: "birthday",
            title: `${displayName} \u7684\u751F\u65E5`,
            date: birthDate,
            createdBy: ctx.user.id
          });
        } catch (err) {
          console.warn("[family.updateMemberDates] sync birthday failed:", err);
        }
      }
      if (anniversaryDate !== void 0) {
        try {
          await syncMemberYearlyEvent({
            familyId: input.familyId,
            userId: input.userId,
            eventType: "anniversary",
            title: `${displayName} \u7684\u7EAA\u5FF5\u65E5`,
            date: anniversaryDate,
            createdBy: ctx.user.id
          });
        } catch (err) {
          console.warn("[family.updateMemberDates] sync anniversary failed:", err);
        }
      }
      return { success: true };
    }),
    /**
     * 统一的成员编辑接口：可在一次请求中改角色 + 昵称 + 生日 + 纪念日。
     * 前端若已使用 updateMemberRole / updateMemberDates，可继续保留；本接口
     * 用于简化 v4 成员管理页面的一次性提交。
     */
    updateMember: protectedProcedure.input(z2.object({
      familyId: z2.number(),
      userId: z2.number(),
      role: z2.enum(["admin", "collaborator", "observer"]).optional(),
      nickname: z2.string().optional().nullable(),
      birthDate: z2.string().optional().nullable(),
      anniversaryDate: z2.string().optional().nullable()
    })).mutation(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      const myRole = await getMemberRole(input.familyId, ctx.user.id);
      const isSelf = input.userId === ctx.user.id;
      const isAdmin = myRole?.role === "admin";
      if (input.role !== void 0) {
        if (!isAdmin) {
          throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u7BA1\u7406\u5458\u53EF\u4EE5\u4FEE\u6539\u89D2\u8272" });
        }
        if (input.role !== "admin") {
          const members = await getFamilyMembers(input.familyId);
          const admins = members.filter((m) => m.role === "admin");
          const isTargetAdmin = admins.some((m) => m.userId === input.userId);
          if (isTargetAdmin && admins.length === 1) {
            throw new TRPCError3({
              code: "FORBIDDEN",
              message: "\u81F3\u5C11\u9700\u8981\u4FDD\u7559\u4E00\u540D\u7BA1\u7406\u5458"
            });
          }
        }
        await updateMemberRole(input.familyId, input.userId, input.role);
      }
      if (input.nickname !== void 0 || input.birthDate !== void 0 || input.anniversaryDate !== void 0) {
        if (!isSelf && !isAdmin) {
          throw new TRPCError3({
            code: "FORBIDDEN",
            message: "\u53EA\u6709\u7BA1\u7406\u5458\u53EF\u4EE5\u4FEE\u6539\u4ED6\u4EBA\u7684\u4FE1\u606F"
          });
        }
        const birthDate = input.birthDate ? new Date(input.birthDate) : input.birthDate === null ? null : void 0;
        const anniversaryDate = input.anniversaryDate ? new Date(input.anniversaryDate) : input.anniversaryDate === null ? null : void 0;
        await updateMemberDates(input.familyId, input.userId, {
          birthDate,
          anniversaryDate,
          nickname: input.nickname
        });
        const member = (await getFamilyMembers(input.familyId)).find(
          (m) => m.userId === input.userId
        );
        const displayName = input.nickname ?? member?.nickname ?? member?.user?.name ?? "\u5BB6\u4EBA";
        if (birthDate !== void 0) {
          try {
            await syncMemberYearlyEvent({
              familyId: input.familyId,
              userId: input.userId,
              eventType: "birthday",
              title: `${displayName} \u7684\u751F\u65E5`,
              date: birthDate,
              createdBy: ctx.user.id
            });
          } catch {
          }
        }
        if (anniversaryDate !== void 0) {
          try {
            await syncMemberYearlyEvent({
              familyId: input.familyId,
              userId: input.userId,
              eventType: "anniversary",
              title: `${displayName} \u7684\u7EAA\u5FF5\u65E5`,
              date: anniversaryDate,
              createdBy: ctx.user.id
            });
          } catch {
          }
        }
      }
      return { success: true };
    }),
    rename: protectedProcedure.input(z2.object({ familyId: z2.number(), name: z2.string().min(1).max(100) })).mutation(async ({ ctx, input }) => {
      await assertFamilyAdmin(input.familyId, ctx.user.id);
      await updateFamilyName(input.familyId, input.name);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ familyId: z2.number() })).mutation(async ({ ctx, input }) => {
      await assertFamilyAdmin(input.familyId, ctx.user.id);
      await deleteFamily(input.familyId);
      return { success: true };
    }),
    leave: protectedProcedure.input(z2.object({ familyId: z2.number() })).mutation(async ({ ctx, input }) => {
      const member = await getMemberRole(input.familyId, ctx.user.id);
      if (!member) throw new TRPCError3({ code: "NOT_FOUND", message: "\u60A8\u4E0D\u662F\u8BE5\u5BB6\u5EAD\u6210\u5458" });
      if (member.role === "admin") {
        const allMembers = await getFamilyMembers(input.familyId);
        const otherAdmins = allMembers.filter((m) => m.userId !== ctx.user.id && m.role === "admin");
        if (otherAdmins.length === 0 && allMembers.length > 1) {
          throw new TRPCError3({ code: "FORBIDDEN", message: "\u8BF7\u5148\u5C06\u7BA1\u7406\u5458\u6743\u9650\u8F6C\u8BA9\u7ED9\u5176\u4ED6\u6210\u5458\uFF0C\u518D\u9000\u51FA\u5BB6\u5EAD" });
        }
      }
      await leaveFamilyMember(input.familyId, ctx.user.id);
      return { success: true };
    }),
    // ─── Member Events ─────────────────────────────────────────────────────
    memberEvents: protectedProcedure.input(z2.object({ familyId: z2.number() })).query(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      return getMemberEventsByFamily(input.familyId);
    }),
    createMemberEvent: protectedProcedure.input(z2.object({
      familyId: z2.number(),
      userId: z2.number(),
      title: z2.string().min(1).max(100),
      eventType: z2.enum(["birthday", "anniversary", "custom"]),
      eventDate: z2.string(),
      // ISO date string
      isYearly: z2.boolean().optional(),
      note: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      const id = await createMemberEvent({
        familyId: input.familyId,
        userId: input.userId,
        title: input.title,
        eventType: input.eventType,
        eventDate: new Date(input.eventDate),
        isYearly: input.isYearly ?? true,
        note: input.note,
        createdBy: ctx.user.id
      });
      return { id };
    }),
    updateMemberEvent: protectedProcedure.input(z2.object({
      id: z2.number(),
      familyId: z2.number(),
      title: z2.string().optional(),
      eventDate: z2.string().optional(),
      note: z2.string().optional().nullable(),
      eventType: z2.enum(["birthday", "anniversary", "custom"]).optional()
    })).mutation(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      const { id, familyId, ...data } = input;
      await updateMemberEvent(id, {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate) : void 0,
        note: data.note ?? void 0
      });
      return { success: true };
    }),
    deleteMemberEvent: protectedProcedure.input(z2.object({ id: z2.number(), familyId: z2.number() })).mutation(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      await deleteMemberEvent(input.id, input.familyId);
      return { success: true };
    })
  }),
  // ─── Children ─────────────────────────────────────────────────────────────
  children: router({
    list: protectedProcedure.input(z2.object({ familyId: z2.number() })).query(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      const kids = await getChildrenByFamily(input.familyId);
      return kids.map((child) => {
        const ageInfo = child.birthDate ? calcAge(child.birthDate) : null;
        let eddInfo = null;
        if (child.embryoTransferDate) {
          eddInfo = calcEDD(child.embryoTransferDate, child.embryoDay ?? 5);
        }
        return { ...child, ageInfo, eddInfo };
      });
    }),
    get: protectedProcedure.input(z2.object({ childId: z2.number() })).query(async ({ ctx, input }) => {
      const child = await getChildById(input.childId);
      if (!child) throw new TRPCError3({ code: "NOT_FOUND" });
      await assertFamilyMember(child.familyId, ctx.user.id);
      const ageInfo = child.birthDate ? calcAge(child.birthDate) : null;
      let eddInfo = null;
      if (child.embryoTransferDate) {
        eddInfo = calcEDD(child.embryoTransferDate, child.embryoDay ?? 5);
      }
      let milestones = [];
      if (ageInfo) {
        milestones = await getMilestonesByAge(ageInfo.totalMonths);
      }
      return { ...child, ageInfo, eddInfo, milestones };
    }),
    create: protectedProcedure.input(z2.object({
      familyId: z2.number(),
      nickname: z2.string().min(1).max(50),
      fullName: z2.string().optional(),
      gender: z2.enum(["girl", "boy", "unknown"]).optional(),
      birthDate: z2.string().optional(),
      avatarUrl: z2.string().optional(),
      color: z2.string().optional(),
      notes: z2.string().optional().nullable(),
      embryoTransferDate: z2.string().optional(),
      embryoDay: z2.number().optional(),
      pregnancyRefDate: z2.string().optional(),
      pregnancyWeeksAtRef: z2.number().optional(),
      pregnancyDaysAtRef: z2.number().optional(),
      isMultiple: z2.boolean().optional(),
      childOneName: z2.string().optional().nullable(),
      childTwoName: z2.string().optional().nullable(),
      childOneGender: z2.enum(["girl", "boy", "unknown"]).optional(),
      childTwoGender: z2.enum(["girl", "boy", "unknown"]).optional(),
      // 控制是否执行自动生成逻辑（孕期/里程碑/欢迎活动）。默认 true。
      autoGenerate: z2.boolean().optional().default(true)
    })).mutation(async ({ ctx, input }) => {
      await assertFamilyCollaboratorOrAdmin(input.familyId, ctx.user.id);
      const birthDate = input.birthDate ? new Date(input.birthDate) : void 0;
      const pregnancyRefDate = input.pregnancyRefDate ? new Date(input.pregnancyRefDate) : void 0;
      const { autoGenerate, ...createPayload } = input;
      const childId = await createChild({
        ...createPayload,
        birthDate,
        embryoTransferDate: input.embryoTransferDate ? new Date(input.embryoTransferDate) : void 0,
        pregnancyRefDate
      });
      const siblingIds = [];
      if (input.isMultiple) {
        const twinA = input.childOneName?.trim();
        const twinB = input.childTwoName?.trim();
        if (twinA && twinB) {
          const siblingId = await createChild({
            familyId: input.familyId,
            nickname: twinB,
            fullName: twinB,
            gender: input.childTwoGender ?? "unknown",
            birthDate,
            color: input.color,
            embryoTransferDate: input.embryoTransferDate ? new Date(input.embryoTransferDate) : void 0,
            pregnancyRefDate,
            pregnancyWeeksAtRef: input.pregnancyWeeksAtRef,
            pregnancyDaysAtRef: input.pregnancyDaysAtRef,
            isMultiple: true
          });
          siblingIds.push(siblingId);
        }
      }
      let autoResult = null;
      if (autoGenerate !== false) {
        try {
          autoResult = await runChildAutoGeneration({
            childId,
            familyId: input.familyId,
            createdBy: ctx.user.id,
            nickname: input.nickname,
            birthDate,
            pregnancyRefDate,
            pregnancyWeeksAtRef: input.pregnancyWeeksAtRef,
            pregnancyDaysAtRef: input.pregnancyDaysAtRef
          });
        } catch (err) {
          console.warn("[children.create] autoGenerate failed:", err);
        }
      }
      return { childId, siblingIds, autoGenerated: autoResult };
    }),
    update: protectedProcedure.input(z2.object({
      childId: z2.number(),
      nickname: z2.string().optional(),
      fullName: z2.string().optional(),
      gender: z2.enum(["girl", "boy", "unknown"]).optional(),
      birthDate: z2.string().optional().nullable(),
      avatarUrl: z2.string().optional().nullable(),
      color: z2.string().optional(),
      embryoTransferDate: z2.string().optional(),
      embryoDay: z2.number().optional(),
      pregnancyRefDate: z2.string().optional().nullable(),
      pregnancyWeeksAtRef: z2.number().optional(),
      pregnancyDaysAtRef: z2.number().optional(),
      isMultiple: z2.boolean().optional(),
      childOneName: z2.string().optional().nullable(),
      childTwoName: z2.string().optional().nullable(),
      childOneGender: z2.enum(["girl", "boy", "unknown"]).optional(),
      childTwoGender: z2.enum(["girl", "boy", "unknown"]).optional(),
      notes: z2.string().optional().nullable()
    })).mutation(async ({ ctx, input }) => {
      const child = await getChildById(input.childId);
      if (!child) throw new TRPCError3({ code: "NOT_FOUND" });
      await assertFamilyCollaboratorOrAdmin(child.familyId, ctx.user.id);
      const { childId, ...data } = input;
      await updateChildDetails(childId, {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : data.birthDate === null ? null : void 0,
        embryoTransferDate: data.embryoTransferDate ? new Date(data.embryoTransferDate) : void 0,
        pregnancyRefDate: data.pregnancyRefDate ? new Date(data.pregnancyRefDate) : data.pregnancyRefDate === null ? null : void 0
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ childId: z2.number() })).mutation(async ({ ctx, input }) => {
      const child = await getChildById(input.childId);
      if (!child) throw new TRPCError3({ code: "NOT_FOUND" });
      await assertFamilyAdmin(child.familyId, ctx.user.id);
      await deleteChild(input.childId, child.familyId);
      return { success: true };
    }),
    calcEDD: publicProcedure.input(z2.object({ transferDate: z2.string(), embryoDay: z2.number().default(5) })).query(({ input }) => {
      return calcEDD(new Date(input.transferDate), input.embryoDay);
    }),
    // ─── Share Card ─────────────────────────────────────────────────────
    // 生成或返回孩子的分享名片 token；默认可见范围 = family（仅家庭链接），
    // 可选 public（完全公开）/ connections（仅人脉）。
    shareCard: protectedProcedure.input(z2.object({
      childId: z2.number(),
      visibility: z2.enum(["public", "connections", "family"]).optional()
    })).mutation(async ({ ctx, input }) => {
      const child = await getChildById(input.childId);
      if (!child) throw new TRPCError3({ code: "NOT_FOUND" });
      await assertFamilyCollaboratorOrAdmin(child.familyId, ctx.user.id);
      const token = child.shareToken || nanoid2(16);
      const visibility = input.visibility ?? child.shareVisibility ?? "family";
      await setChildShareCard(child.id, {
        shareToken: token,
        shareVisibility: visibility
      });
      return { token, visibility, shareUrl: `/c/${token}` };
    }),
    revokeShareCard: protectedProcedure.input(z2.object({ childId: z2.number() })).mutation(async ({ ctx, input }) => {
      const child = await getChildById(input.childId);
      if (!child) throw new TRPCError3({ code: "NOT_FOUND" });
      await assertFamilyAdmin(child.familyId, ctx.user.id);
      await setChildShareCard(child.id, { shareToken: null });
      return { success: true };
    }),
    // 公开接口：按 token 读取名片。根据 visibility 返回不同粒度的数据。
    // 调用方如果已登录（ctx.user 存在），visibility='connections' 下会校验
    // 是否为该孩子家庭成员或家庭创建者的人脉好友；否则仅匿名字段可见。
    publicCard: publicProcedure.input(z2.object({ token: z2.string().min(8).max(64) })).query(async ({ ctx, input }) => {
      const child = await getChildByShareToken(input.token);
      if (!child) throw new TRPCError3({ code: "NOT_FOUND" });
      const visibility = child.shareVisibility ?? "family";
      const viewerId = ctx?.user?.id;
      const family = await getFamilyById(child.familyId);
      let allowed = false;
      if (visibility === "public") {
        allowed = true;
      } else if (viewerId) {
        const role = await getMemberRole(child.familyId, viewerId);
        if (role) {
          allowed = true;
        } else if (visibility === "connections" && family?.createdBy) {
          const conn = await getConnectionBetween(viewerId, family.createdBy);
          allowed = !!conn && conn.status === "accepted";
        }
      }
      const ageInfo = child.birthDate ? calcAge(child.birthDate) : null;
      const base = {
        nickname: child.nickname,
        gender: child.gender,
        avatarUrl: child.avatarUrl,
        color: child.color,
        ageInfo,
        familyName: family?.name ?? null,
        visibility,
        isMultiple: child.isMultiple
      };
      if (!allowed) {
        return { ...base, locked: true };
      }
      return {
        ...base,
        fullName: child.fullName,
        birthDate: child.birthDate,
        notes: child.notes,
        locked: false
      };
    })
  }),
  // ─── Timeline─────────────────────────────────────────────────────────────
  timeline: router({
    list: protectedProcedure.input(z2.object({ childId: z2.number(), limit: z2.number().default(50), offset: z2.number().default(0) })).query(async ({ ctx, input }) => {
      const child = await getChildById(input.childId);
      if (!child) throw new TRPCError3({ code: "NOT_FOUND" });
      await assertFamilyMember(child.familyId, ctx.user.id);
      return getTimelineEvents(input.childId, input.limit, input.offset);
    }),
    // Public album view: get public events for a child (for connections/observers)
    publicAlbum: protectedProcedure.input(z2.object({ childId: z2.number() })).query(async ({ ctx, input }) => {
      const child = await getChildById(input.childId);
      if (!child) throw new TRPCError3({ code: "NOT_FOUND" });
      const memberRole = await getMemberRole(child.familyId, ctx.user.id);
      if (memberRole) {
        return getPublicTimelineEventsByFamily(child.familyId, 100);
      }
      return getPublicTimelineEventsByFamily(child.familyId, 100);
    }),
    setVisibility: protectedProcedure.input(z2.object({ eventId: z2.number(), isPublic: z2.boolean() })).mutation(async ({ ctx, input }) => {
      await updateTimelineEventVisibility(input.eventId, input.isPublic);
      return { success: true };
    }),
    create: protectedProcedure.input(z2.object({
      childId: z2.number(),
      type: z2.enum(["pregnancy", "milestone", "post", "checkup", "vaccination", "system"]),
      title: z2.string().min(1).max(200),
      content: z2.string().optional(),
      mediaUrls: z2.array(z2.string()).optional(),
      xiaohongshuUrl: z2.string().optional(),
      eventDate: z2.string(),
      isPublic: z2.boolean().default(false)
    })).mutation(async ({ ctx, input }) => {
      const child = await getChildById(input.childId);
      if (!child) throw new TRPCError3({ code: "NOT_FOUND" });
      await assertFamilyCollaboratorOrAdmin(child.familyId, ctx.user.id);
      const eventId = await createTimelineEvent({
        ...input,
        familyId: child.familyId,
        mediaUrls: input.mediaUrls ? JSON.stringify(input.mediaUrls) : void 0,
        eventDate: new Date(input.eventDate),
        createdBy: ctx.user.id
      });
      return { eventId };
    }),
    edit: protectedProcedure.input(z2.object({
      eventId: z2.number(),
      title: z2.string().min(1).max(200).optional(),
      content: z2.string().optional(),
      eventDate: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const { eventId, ...data } = input;
      await updateTimelineEvent(eventId, {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate) : void 0
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ eventId: z2.number() })).mutation(async ({ ctx, input }) => {
      await deleteTimelineEvent(input.eventId);
      return { success: true };
    }),
    // Fetch URL metadata (for XHS/Xiaohongshu links)
    fetchMeta: protectedProcedure.input(z2.object({ url: z2.string().url() })).query(async ({ ctx, input }) => {
      try {
        const { load } = await import("cheerio");
        const res = await fetch(input.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Referer": "https://www.xiaohongshu.com/"
          },
          signal: AbortSignal.timeout(8e3)
        });
        const html = await res.text();
        const $ = load(html);
        const title = $("meta[property='og:title']").attr("content") || $("meta[name='title']").attr("content") || $("title").text() || "";
        const image = $("meta[property='og:image']").attr("content") || $("meta[name='image']").attr("content") || $("meta[itemprop='image']").attr("content") || "";
        const description = $("meta[property='og:description']").attr("content") || $("meta[name='description']").attr("content") || "";
        return { title: title.trim(), image: image.trim(), description: description.trim(), url: input.url };
      } catch (e) {
        return { title: "", image: "", description: "", url: input.url };
      }
    })
  }),
  // ─── Routine Tasks ────────────────────────────────────────────────────────
  tasks: router({
    list: protectedProcedure.input(z2.object({ familyId: z2.number() })).query(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      const tasks = await getRoutineTasks(input.familyId);
      const todayCheckins = await getTodayCheckins(input.familyId);
      return tasks.map((task) => ({
        ...task,
        todayCheckins: todayCheckins.filter((c) => c.taskId === task.id).length
      }));
    }),
    create: protectedProcedure.input(z2.object({
      familyId: z2.number(),
      childId: z2.number().optional(),
      title: z2.string().min(1).max(100),
      description: z2.string().optional(),
      icon: z2.string().optional(),
      color: z2.string().optional(),
      category: z2.enum(["feeding", "sleep", "checkup", "play", "bath", "other"]).optional(),
      repeatRule: z2.string().optional(),
      assignedTo: z2.number().optional(),
      taskType: z2.enum(["frequency", "value"]).optional(),
      valueUnit: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      await assertFamilyCollaboratorOrAdmin(input.familyId, ctx.user.id);
      const taskId = await createRoutineTask({ ...input, createdBy: ctx.user.id });
      return { taskId };
    }),
    update: protectedProcedure.input(z2.object({
      taskId: z2.number(),
      title: z2.string().optional(),
      description: z2.string().optional(),
      icon: z2.string().optional(),
      color: z2.string().optional(),
      category: z2.enum(["feeding", "sleep", "checkup", "play", "bath", "other"]).optional(),
      repeatRule: z2.string().optional(),
      assignedTo: z2.number().optional(),
      isActive: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      const { taskId, ...data } = input;
      await updateRoutineTask(taskId, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ taskId: z2.number() })).mutation(async ({ ctx, input }) => {
      await deleteRoutineTask(input.taskId);
      return { success: true };
    }),
    checkin: protectedProcedure.input(z2.object({ taskId: z2.number(), childId: z2.number().optional(), note: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      const checkinId = await createTaskCheckin({ ...input, checkedBy: ctx.user.id });
      return { checkinId };
    }),
    checkins: protectedProcedure.input(z2.object({ taskId: z2.number(), limit: z2.number().default(20) })).query(async ({ ctx, input }) => {
      return getTaskCheckins(input.taskId, input.limit);
    })
  }),
  // ─── Events ───────────────────────────────────────────────────────────────
  events: router({
    list: protectedProcedure.input(z2.object({ familyId: z2.number() })).query(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      const eventList = await getEventsByFamily(input.familyId);
      const eventsWithRsvp = await Promise.all(eventList.map(async (event) => {
        const rsvpList = await getRsvpsByEvent(event.id);
        return {
          ...event,
          rsvpAttending: rsvpList.filter((r) => r.status === "attending").length,
          rsvpMaybe: rsvpList.filter((r) => r.status === "maybe").length,
          rsvpDeclined: rsvpList.filter((r) => r.status === "declined").length
        };
      }));
      return eventsWithRsvp;
    }),
    create: protectedProcedure.input(z2.object({
      familyId: z2.number(),
      title: z2.string().min(1).max(200),
      description: z2.string().optional(),
      location: z2.string().optional(),
      locationLat: z2.string().optional(),
      locationLng: z2.string().optional(),
      coverUrl: z2.string().optional(),
      eventDate: z2.string(),
      isPublic: z2.boolean().default(true)
    })).mutation(async ({ ctx, input }) => {
      await assertFamilyCollaboratorOrAdmin(input.familyId, ctx.user.id);
      const inviteToken = nanoid2(16);
      const eventId = await createEvent({
        ...input,
        eventDate: new Date(input.eventDate),
        inviteToken,
        createdBy: ctx.user.id
      });
      return { eventId, inviteToken };
    }),
    update: protectedProcedure.input(z2.object({
      eventId: z2.number(),
      title: z2.string().optional(),
      description: z2.string().optional(),
      location: z2.string().optional(),
      coverUrl: z2.string().optional(),
      eventDate: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const { eventId, ...data } = input;
      await updateEvent(eventId, {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate) : void 0
      });
      return { success: true };
    }),
    // Public: view event by invite token (no auth required)
    getByToken: publicProcedure.input(z2.object({ token: z2.string() })).query(async ({ input }) => {
      const event = await getEventByToken(input.token);
      if (!event) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6D3B\u52A8\u4E0D\u5B58\u5728\u6216\u94FE\u63A5\u5DF2\u5931\u6548" });
      const rsvpList = await getRsvpsByEvent(event.id);
      const stats = {
        attending: rsvpList.filter((r) => r.status === "attending").length,
        maybe: rsvpList.filter((r) => r.status === "maybe").length,
        declined: rsvpList.filter((r) => r.status === "declined").length
      };
      return { event, rsvpList, stats };
    }),
    rsvps: protectedProcedure.input(z2.object({ eventId: z2.number() })).query(async ({ ctx, input }) => {
      const event = await getEventById(input.eventId);
      if (!event) throw new TRPCError3({ code: "NOT_FOUND" });
      await assertFamilyMember(event.familyId, ctx.user.id);
      return getRsvpsByEvent(input.eventId);
    }),
    // Public: submit RSVP (no auth required)
    submitRsvp: publicProcedure.input(z2.object({
      token: z2.string(),
      guestName: z2.string().min(1).max(100),
      guestContact: z2.string().optional(),
      status: z2.enum(["attending", "maybe", "declined"]),
      note: z2.string().optional()
    })).mutation(async ({ input }) => {
      const event = await getEventByToken(input.token);
      if (!event) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6D3B\u52A8\u4E0D\u5B58\u5728" });
      const rsvpId = await createRsvp({
        eventId: event.id,
        guestName: input.guestName,
        guestContact: input.guestContact,
        status: input.status,
        note: input.note
      });
      return { rsvpId };
    }),
    // Get event by ID (for detail page)
    getById: protectedProcedure.input(z2.object({ eventId: z2.number() })).query(async ({ ctx, input }) => {
      const event = await getEventById(input.eventId);
      if (!event) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6D3B\u52A8\u4E0D\u5B58\u5728" });
      await assertFamilyMember(event.familyId, ctx.user.id);
      const rsvpList = await getRsvpsByEvent(event.id);
      const images = await getEventImages(event.id);
      return {
        event,
        rsvpList,
        images,
        stats: {
          attending: rsvpList.filter((r) => r.status === "attending").length,
          maybe: rsvpList.filter((r) => r.status === "maybe").length,
          declined: rsvpList.filter((r) => r.status === "declined").length
        }
      };
    }),
    // Add image to event
    addImage: protectedProcedure.input(z2.object({ eventId: z2.number(), imageUrl: z2.string().url(), sortOrder: z2.number().default(0) })).mutation(async ({ ctx, input }) => {
      const event = await getEventById(input.eventId);
      if (!event) throw new TRPCError3({ code: "NOT_FOUND" });
      await assertFamilyMember(event.familyId, ctx.user.id);
      const id = await addEventImage({ eventId: input.eventId, imageUrl: input.imageUrl, sortOrder: input.sortOrder });
      return { id };
    }),
    // Delete image from event
    deleteImage: protectedProcedure.input(z2.object({ imageId: z2.number() })).mutation(async ({ ctx, input }) => {
      await deleteEventImage(input.imageId);
      return { success: true };
    }),
    // Get images for event
    getImages: protectedProcedure.input(z2.object({ eventId: z2.number() })).query(async ({ ctx, input }) => {
      const event = await getEventById(input.eventId);
      if (!event) throw new TRPCError3({ code: "NOT_FOUND" });
      await assertFamilyMember(event.familyId, ctx.user.id);
      return getEventImages(input.eventId);
    })
  }),
  //  // ─── Userss ────────────────────────────────────────────────────────────
  users: router({
    updateProfile: protectedProcedure.input(z2.object({
      name: z2.string().min(1).max(100),
      avatar: z2.string().optional()
      // emoji or URL
    })).mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, { name: input.name, avatarUrl: input.avatar });
      return { success: true };
    }),
    updateAvatar: protectedProcedure.input(z2.object({
      avatarUrl: z2.string().url().max(2e3)
    })).mutation(async ({ ctx, input }) => {
      await updateUserAvatar(ctx.user.id, input.avatarUrl);
      return { success: true };
    }),
    me: protectedProcedure.query(async ({ ctx }) => {
      return {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        avatarUrl: ctx.user.avatarUrl,
        loginMethod: ctx.user.loginMethod,
        openId: ctx.user.openId,
        creditScore: ctx.user.creditScore ?? 100,
        reportedCount: ctx.user.reportedCount ?? 0
      };
    }),
    findById: protectedProcedure.input(z2.object({ userId: z2.number() })).query(async ({ input }) => {
      const u = await getUserByUserId(input.userId);
      if (!u) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
      return { id: u.id, name: u.name, avatarUrl: u.avatarUrl, openId: u.openId };
    })
  }),
  // ─── Connections (人脉好友) ────────────────────────────────────────────
  connections: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const [rows, blocked] = await Promise.all([
        getMyConnections(ctx.user.id),
        getBlockedUsers(ctx.user.id)
      ]);
      const blockedIds = new Set(blocked.map((b) => b.blockedUserId));
      return rows.filter((r) => {
        const friendId = r.requesterId === ctx.user.id ? r.receiverId : r.requesterId;
        return !blockedIds.has(friendId);
      }).map((r) => {
        const isMeRequester = r.requesterId === ctx.user.id;
        const friendId = isMeRequester ? r.receiverId : r.requesterId;
        const friendName = isMeRequester ? r.receiverName : r.requesterName;
        const friendAvatar = isMeRequester ? r.receiverAvatar : r.requesterAvatar;
        return {
          id: r.id,
          note: r.note,
          category: r.category,
          hasUpdate: r.hasUpdate,
          createdAt: r.createdAt,
          requesterId: r.requesterId,
          receiverId: r.receiverId,
          friendId,
          friend: {
            id: friendId,
            name: friendName,
            avatarUrl: friendAvatar
          },
          isMeRequester,
          isMutual: false
          // computed separately via statusWith
        };
      });
    }),
    pending: protectedProcedure.query(async ({ ctx }) => {
      return getPendingRequests(ctx.user.id);
    }),
    sendRequest: protectedProcedure.input(z2.object({
      receiverId: z2.number(),
      note: z2.string().max(200).optional()
    })).mutation(async ({ ctx, input }) => {
      if (input.receiverId === ctx.user.id) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u6DFB\u52A0\u81EA\u5DF1" });
      const existing = await checkExistingConnection(ctx.user.id, input.receiverId);
      if (existing) throw new TRPCError3({ code: "CONFLICT", message: "\u5DF2\u5B58\u5728\u8FDE\u63A5\u6216\u8BF7\u6C42" });
      const receiver = await getUserByUserId(input.receiverId);
      if (!receiver) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
      const id = await sendConnectionRequest(ctx.user.id, input.receiverId, input.note);
      return { id };
    }),
    accept: protectedProcedure.input(z2.object({ connectionId: z2.number() })).mutation(async ({ ctx, input }) => {
      await acceptConnection(input.connectionId, ctx.user.id);
      return { success: true };
    }),
    /**
     * 删除好友关系 / 撤回或拒绝好友申请。任一方都可以调用：
     *   - pending 状态：请求方撤回 / 接收方拒绝
     *   - accepted 状态：任一方解除好友关系
     */
    remove: protectedProcedure.input(z2.object({ connectionId: z2.number() })).mutation(async ({ ctx, input }) => {
      const affected = await removeConnection(input.connectionId, ctx.user.id);
      if (affected === 0) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u65E0\u6743\u5220\u9664\u8BE5\u8FDE\u63A5\u6216\u8FDE\u63A5\u4E0D\u5B58\u5728" });
      }
      return { success: true };
    }),
    listWithCategory: protectedProcedure.query(async ({ ctx }) => {
      return getAcceptedConnectionsWithCategory(ctx.user.id);
    }),
    updateCategory: protectedProcedure.input(z2.object({
      connectionId: z2.number(),
      category: z2.enum(["life", "work", "family", "kids", "pets"])
    })).mutation(async ({ ctx, input }) => {
      await updateConnectionCategory(input.connectionId, ctx.user.id, input.category);
      return { success: true };
    }),
    clearUpdate: protectedProcedure.input(z2.object({ connectionId: z2.number() })).mutation(async ({ input }) => {
      await clearConnectionUpdate(input.connectionId);
      return { success: true };
    }),
    search: protectedProcedure.input(z2.object({ query: z2.string().min(1) })).query(async ({ ctx, input }) => {
      return searchUsersByName(input.query, ctx.user.id);
    }),
    // Get connection status and mutual friends between me and another user
    statusWith: protectedProcedure.input(z2.object({ targetUserId: z2.number() })).query(async ({ ctx, input }) => {
      const conn = await getConnectionBetween(ctx.user.id, input.targetUserId);
      const mutual = await getMutualFriends(ctx.user.id, input.targetUserId);
      let followStatus = "none";
      if (conn && conn.status === "accepted") {
        followStatus = "mutual";
      } else if (conn && conn.status === "pending") {
        followStatus = conn.requesterId === ctx.user.id ? "following" : "followed";
      }
      return { connection: conn, followStatus, mutualFriends: mutual };
    }),
    // Friend activity feed (public events from accepted connections)
    friendFeed: protectedProcedure.query(async ({ ctx }) => {
      return getFriendEventsFeed(ctx.user.id, 30);
    })
  }),
  // ─── Friend Events (好友活动申请) ─────────────────────────────────────────
  friendEvents: router({
    // Request to join a friend's event
    requestJoin: protectedProcedure.input(z2.object({
      eventId: z2.number(),
      message: z2.string().max(500).optional()
    })).mutation(async ({ ctx, input }) => {
      const event = await getEventById(input.eventId);
      if (!event) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6D3B\u52A8\u4E0D\u5B58\u5728" });
      if (event.createdBy === ctx.user.id) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u7533\u8BF7\u53C2\u52A0\u81EA\u5DF1\u7684\u6D3B\u52A8" });
      const existing = await checkExistingJoinRequest(input.eventId, ctx.user.id);
      if (existing) throw new TRPCError3({ code: "CONFLICT", message: "\u5DF2\u63D0\u4EA4\u7533\u8BF7\uFF0C\u8BF7\u7B49\u5F85\u5BA1\u6279" });
      const id = await createEventJoinRequest({
        eventId: input.eventId,
        requesterId: ctx.user.id,
        hostId: event.createdBy,
        message: input.message
      });
      return { id };
    }),
    // Get join requests for an event (host only)
    joinRequests: protectedProcedure.input(z2.object({ eventId: z2.number() })).query(async ({ ctx, input }) => {
      const event = await getEventById(input.eventId);
      if (!event) throw new TRPCError3({ code: "NOT_FOUND" });
      if (event.createdBy !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u6D3B\u52A8\u521B\u5EFA\u8005\u53EF\u67E5\u770B\u7533\u8BF7" });
      return getEventJoinRequests(input.eventId);
    }),
    // Get my join requests
    myRequests: protectedProcedure.query(async ({ ctx }) => {
      return getMyEventJoinRequests(ctx.user.id);
    }),
    // Get pending requests for events I created
    pendingForMe: protectedProcedure.query(async ({ ctx }) => {
      return getPendingJoinRequestsForHost(ctx.user.id);
    }),
    // Approve or reject a join request
    reviewRequest: protectedProcedure.input(z2.object({
      requestId: z2.number(),
      action: z2.enum(["approved", "rejected"])
    })).mutation(async ({ ctx, input }) => {
      await updateEventJoinRequestStatus(input.requestId, ctx.user.id, input.action);
      return { success: true };
    }),
    // Check my join status for a specific event
    myStatus: protectedProcedure.input(z2.object({ eventId: z2.number() })).query(async ({ ctx, input }) => {
      const req = await checkExistingJoinRequest(input.eventId, ctx.user.id);
      return req ? { status: req.status, id: req.id } : null;
    })
  }),
  // ─── Task Statistics ─────────────────────────────────────────────────
  taskStats: router({
    byDate: protectedProcedure.input(z2.object({ taskId: z2.number(), date: z2.string() })).query(async ({ input }) => {
      return getTaskCheckinsByDate(input.taskId, input.date);
    }),
    history: protectedProcedure.input(z2.object({ taskId: z2.number(), days: z2.number().default(30) })).query(async ({ input }) => {
      return getTaskCheckinHistory(input.taskId, input.days);
    }),
    frequency: protectedProcedure.input(z2.object({ taskId: z2.number(), days: z2.number().default(14) })).query(async ({ input }) => {
      return getTaskFrequencyStats(input.taskId, input.days);
    }),
    byMonth: protectedProcedure.input(z2.object({ familyId: z2.number(), year: z2.number(), month: z2.number() })).query(async ({ ctx, input }) => {
      await assertFamilyMember(input.familyId, ctx.user.id);
      return getTaskCheckinsByMonth(input.familyId, input.year, input.month);
    }),
    checkinWithValue: protectedProcedure.input(z2.object({
      taskId: z2.number(),
      childId: z2.number().optional(),
      value: z2.string().optional(),
      unit: z2.string().optional(),
      note: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      await addTaskCheckinWithValue({
        taskId: input.taskId,
        childId: input.childId,
        value: input.value,
        unit: input.unit,
        note: input.note,
        checkedBy: ctx.user.id
      });
      return { success: true };
    })
  }),
  // ─── Milestones ─────────────────────────────────────────────────────
  milestones: router({
    all: publicProcedure.query(() => getAllMilestoneTemplates()),
    byAge: publicProcedure.input(z2.object({ ageMonths: z2.number() })).query(({ input }) => getMilestonesByAge(input.ageMonths))
  }),
  // ═══════════════════════════════════════════════════════════════════════
  // v4.0 Pinple — 推荐链 / 技能市场 / 举报 / 屏蔽 / 信用体系
  // ═══════════════════════════════════════════════════════════════════════
  // ─── Recommendations 推荐链 ────────────────────────────────────────
  recommendations: router({
    create: protectedProcedure.input(z2.object({
      userId: z2.number(),
      targetUserId: z2.number(),
      context: z2.string().max(255).optional()
    })).mutation(async ({ ctx, input }) => {
      const id = await createRecommendation({
        userId: input.userId,
        recommenderId: ctx.user.id,
        targetUserId: input.targetUserId,
        context: input.context
      });
      return { id };
    }),
    chain: protectedProcedure.input(z2.object({ userId: z2.number() })).query(async ({ input }) => {
      return getRecommendationChain(input.userId);
    })
  }),
  // ─── Skills 技能市场 ───────────────────────────────────────────────
  skills: router({
    list: publicProcedure.input(z2.object({
      limit: z2.number().default(20),
      offset: z2.number().default(0)
    })).query(async ({ input }) => {
      return getActiveSkills(input.limit, input.offset);
    }),
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(1).max(255),
      category: z2.string().optional(),
      description: z2.string().optional(),
      images: z2.array(z2.string()).optional(),
      priceMin: z2.string().optional(),
      priceMax: z2.string().optional(),
      location: z2.string().optional(),
      serviceRadius: z2.number().optional(),
      contactMethod: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const creditScore = await getUserCreditScore(ctx.user.id);
      if (creditScore < 20) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4FE1\u7528\u5206\u8FC7\u4F4E\uFF0C\u65E0\u6CD5\u53D1\u5E03\u6280\u80FD" });
      }
      const id = await createSkill({
        userId: ctx.user.id,
        name: input.name,
        category: input.category,
        description: input.description,
        images: input.images ? JSON.stringify(input.images) : void 0,
        priceMin: input.priceMin,
        priceMax: input.priceMax,
        location: input.location,
        serviceRadius: input.serviceRadius,
        contactMethod: input.contactMethod
      });
      return { id };
    }),
    mySkills: protectedProcedure.query(async ({ ctx }) => {
      return getSkillsByUser(ctx.user.id);
    }),
    updateStatus: protectedProcedure.input(z2.object({ skillId: z2.number(), status: z2.enum(["active", "inactive"]) })).mutation(async ({ ctx, input }) => {
      const skill = await getSkillById(input.skillId);
      if (!skill) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6280\u80FD\u4E0D\u5B58\u5728" });
      if (skill.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u80FD\u4FEE\u6539\u81EA\u5DF1\u7684\u6280\u80FD" });
      }
      await updateSkillStatus(input.skillId, input.status);
      return { success: true };
    })
  }),
  // ─── Help Requests 求助 ───────────────────────────────────────────
  helpRequests: router({
    list: publicProcedure.input(z2.object({
      limit: z2.number().default(20),
      offset: z2.number().default(0)
    })).query(async ({ input }) => {
      return getOpenHelpRequests(input.limit, input.offset);
    }),
    create: protectedProcedure.input(z2.object({
      title: z2.string().min(1).max(255),
      description: z2.string().optional(),
      skillTags: z2.array(z2.string()).optional(),
      budgetMin: z2.string().optional(),
      budgetMax: z2.string().optional(),
      location: z2.string().optional(),
      urgency: z2.enum(["low", "medium", "high"]).default("medium"),
      deadline: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const creditScore = await getUserCreditScore(ctx.user.id);
      if (creditScore < 20) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4FE1\u7528\u5206\u8FC7\u4F4E\uFF0C\u65E0\u6CD5\u53D1\u5E03\u6C42\u52A9" });
      }
      const id = await createHelpRequest({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        skillTags: input.skillTags ? JSON.stringify(input.skillTags) : void 0,
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        location: input.location,
        urgency: input.urgency,
        deadline: input.deadline ? new Date(input.deadline) : void 0
      });
      return { id };
    }),
    myRequests: protectedProcedure.query(async ({ ctx }) => {
      return getHelpRequestsByUser(ctx.user.id);
    }),
    updateStatus: protectedProcedure.input(z2.object({ requestId: z2.number(), status: z2.enum(["open", "matched", "closed"]) })).mutation(async ({ ctx, input }) => {
      const request = await getHelpRequestById(input.requestId);
      if (!request) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6C42\u52A9\u4E0D\u5B58\u5728" });
      if (request.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u80FD\u4FEE\u6539\u81EA\u5DF1\u7684\u6C42\u52A9" });
      }
      await updateHelpRequestStatus(input.requestId, input.status);
      return { success: true };
    }),
    match: protectedProcedure.input(z2.object({ requestId: z2.number(), skillId: z2.number() })).mutation(async ({ ctx, input }) => {
      const request = await getHelpRequestById(input.requestId);
      if (!request) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6C42\u52A9\u4E0D\u5B58\u5728" });
      if (request.userId === ctx.user.id) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u63A5\u81EA\u5DF1\u7684\u6C42\u52A9" });
      }
      if (request.status !== "open") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u6C42\u52A9\u5DF2\u4E0D\u53EF\u63A5\u5355" });
      }
      const skill = await getSkillById(input.skillId);
      if (!skill) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6280\u80FD\u4E0D\u5B58\u5728" });
      if (skill.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u80FD\u7528\u81EA\u5DF1\u7684\u6280\u80FD\u63A5\u5355" });
      }
      if (skill.status !== "active") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u6280\u80FD\u672A\u542F\u7528" });
      }
      const creditScore = await getUserCreditScore(ctx.user.id);
      if (creditScore < 20) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4FE1\u7528\u5206\u8FC7\u4F4E\uFF0C\u65E0\u6CD5\u63A5\u5355" });
      }
      const id = await createSkillMatch({
        requestId: input.requestId,
        skillId: input.skillId,
        providerId: ctx.user.id
      });
      return { id };
    }),
    matchesByRequest: protectedProcedure.input(z2.object({ requestId: z2.number() })).query(async ({ input }) => {
      return getMatchesByRequest(input.requestId);
    }),
    acceptMatch: protectedProcedure.input(z2.object({ matchId: z2.number() })).mutation(async ({ ctx, input }) => {
      const match = await getSkillMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND", message: "\u5339\u914D\u4E0D\u5B58\u5728" });
      const request = await getHelpRequestById(match.requestId);
      if (!request) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6C42\u52A9\u4E0D\u5B58\u5728" });
      if (request.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u6C42\u52A9\u53D1\u5E03\u8005\u53EF\u4EE5\u63A5\u53D7\u5339\u914D" });
      }
      await updateMatchStatus(input.matchId, "accepted");
      await updateHelpRequestStatus(match.requestId, "matched");
      await updateUserCreditScore(match.providerId, 2);
      return { success: true };
    }),
    completeMatch: protectedProcedure.input(z2.object({ matchId: z2.number() })).mutation(async ({ ctx, input }) => {
      const match = await getSkillMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND", message: "\u5339\u914D\u4E0D\u5B58\u5728" });
      const request = await getHelpRequestById(match.requestId);
      if (!request) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6C42\u52A9\u4E0D\u5B58\u5728" });
      if (request.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u6C42\u52A9\u53D1\u5E03\u8005\u53EF\u4EE5\u786E\u8BA4\u5B8C\u6210" });
      }
      if (match.status !== "accepted") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u53EA\u6709\u5DF2\u63A5\u53D7\u7684\u5339\u914D\u53EF\u4EE5\u5B8C\u6210" });
      }
      await updateMatchStatus(input.matchId, "completed");
      await updateHelpRequestStatus(match.requestId, "closed");
      await updateUserCreditScore(match.providerId, 5);
      return { success: true };
    })
  }),
  // ─── Reviews 评价 ─────────────────────────────────────────────────
  reviews: router({
    create: protectedProcedure.input(z2.object({
      toUserId: z2.number(),
      matchId: z2.number(),
      rating: z2.number().min(1).max(5),
      comment: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const match = await getSkillMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND", message: "\u5339\u914D\u4E0D\u5B58\u5728" });
      const request = await getHelpRequestById(match.requestId);
      if (!request) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6C42\u52A9\u4E0D\u5B58\u5728" });
      if (match.status !== "completed") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5B8C\u6210\u540E\u624D\u80FD\u8BC4\u4EF7" });
      }
      const isRequester = request.userId === ctx.user.id;
      const isProvider = match.providerId === ctx.user.id;
      if (!isRequester && !isProvider) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u4EA4\u6613\u53CC\u65B9\u53EF\u4EE5\u8BC4\u4EF7" });
      }
      if (input.toUserId !== request.userId && input.toUserId !== match.providerId) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BC4\u4EF7\u5BF9\u8C61\u5FC5\u987B\u662F\u4EA4\u6613\u53E6\u4E00\u65B9" });
      }
      if (input.toUserId === ctx.user.id) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u8BC4\u4EF7\u81EA\u5DF1" });
      }
      const existing = await getReviewByMatchAndAuthor(input.matchId, ctx.user.id);
      if (existing) {
        throw new TRPCError3({ code: "CONFLICT", message: "\u4F60\u5DF2\u8BC4\u4EF7\u8FC7\u8BE5\u4EA4\u6613" });
      }
      const id = await createReview({
        fromUserId: ctx.user.id,
        toUserId: input.toUserId,
        matchId: input.matchId,
        rating: input.rating,
        comment: input.comment
      });
      if (input.rating >= 4) {
        await updateUserCreditScore(input.toUserId, 2);
      } else if (input.rating <= 2) {
        await updateUserCreditScore(input.toUserId, -2);
      }
      return { id };
    }),
    forUser: protectedProcedure.input(z2.object({ userId: z2.number() })).query(async ({ input }) => {
      return getReviewsForUser(input.userId);
    })
  }),
  // ─── Reports 举报 ─────────────────────────────────────────────────
  reports: router({
    create: protectedProcedure.input(z2.object({
      reportedUserId: z2.number(),
      reason: z2.enum(["inappropriate", "fraud", "harassment", "other"]),
      description: z2.string().optional(),
      evidence: z2.array(z2.string()).optional()
    })).mutation(async ({ ctx, input }) => {
      if (input.reportedUserId === ctx.user.id) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u4E3E\u62A5\u81EA\u5DF1" });
      }
      const id = await createUserReport({
        reporterId: ctx.user.id,
        reportedUserId: input.reportedUserId,
        reason: input.reason,
        description: input.description,
        evidence: input.evidence ? JSON.stringify(input.evidence) : void 0
      });
      return { id };
    }),
    pending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650" });
      }
      return getPendingReports();
    }),
    review: protectedProcedure.input(z2.object({
      reportId: z2.number(),
      action: z2.enum(["approved", "rejected"]),
      reportedUserId: z2.number()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650" });
      }
      await updateReportStatus(input.reportId, input.action);
      if (input.action === "approved") {
        await incrementUserReportedCount(input.reportedUserId);
        await updateUserCreditScore(input.reportedUserId, -10);
      }
      return { success: true };
    })
  }),
  // ─── Blocks 屏蔽 ──────────────────────────────────────────────────
  blocks: router({
    block: protectedProcedure.input(z2.object({ blockedUserId: z2.number() })).mutation(async ({ ctx, input }) => {
      if (input.blockedUserId === ctx.user.id) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u5C4F\u853D\u81EA\u5DF1" });
      }
      const id = await blockUser(ctx.user.id, input.blockedUserId);
      return { id };
    }),
    unblock: protectedProcedure.input(z2.object({ blockedUserId: z2.number() })).mutation(async ({ ctx, input }) => {
      await unblockUser(ctx.user.id, input.blockedUserId);
      return { success: true };
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      return getBlockedUsers(ctx.user.id);
    }),
    check: protectedProcedure.input(z2.object({ targetUserId: z2.number() })).query(async ({ ctx, input }) => {
      const blocked = await isUserBlocked(ctx.user.id, input.targetUserId);
      return { isBlocked: blocked };
    })
  }),
  // ─── Calendar 多家庭日历聚合 ───────────────────────────────────────
  //  汇总活动(events) + 成员生日/纪念日(member_events, 年循环展开) +
  //  孩子里程碑/孕期事件(timeline_events)，给日历视图一次取到。
  calendar: router({
    upcoming: protectedProcedure.input(z2.object({
      familyIds: z2.array(z2.number()).min(1),
      // 默认窗口：当前 UTC 日期起 90 天
      from: z2.string().optional(),
      to: z2.string().optional()
    })).query(async ({ ctx, input }) => {
      const from = input.from ? new Date(input.from) : /* @__PURE__ */ new Date();
      const to = input.to ? new Date(input.to) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1e3);
      for (const fid of input.familyIds) {
        await assertFamilyMember(fid, ctx.user.id);
      }
      const items = [];
      for (const fid of input.familyIds) {
        const evts = await getEventsByFamily(fid);
        for (const e of evts) {
          if (e.eventDate >= from && e.eventDate <= to) {
            items.push({
              kind: "event",
              familyId: fid,
              title: e.title,
              date: e.eventDate,
              refId: e.id,
              meta: { location: e.location, inviteToken: e.inviteToken }
            });
          }
        }
        const memEvts = await getMemberEventsByFamily(fid);
        for (const me of memEvts) {
          const base = new Date(me.eventDate);
          if (!me.isYearly) {
            if (base >= from && base <= to) {
              items.push({
                kind: me.eventType === "birthday" ? "birthday" : me.eventType === "anniversary" ? "anniversary" : "memberEvent",
                familyId: fid,
                title: me.title,
                date: base,
                refId: me.id,
                meta: { userId: me.userId }
              });
            }
            continue;
          }
          const startY = from.getUTCFullYear() - 1;
          const endY = to.getUTCFullYear() + 1;
          for (let y = startY; y <= endY; y++) {
            const occ = new Date(Date.UTC(y, base.getUTCMonth(), base.getUTCDate()));
            if (occ >= from && occ <= to) {
              items.push({
                kind: me.eventType === "birthday" ? "birthday" : me.eventType === "anniversary" ? "anniversary" : "memberEvent",
                familyId: fid,
                title: me.title,
                date: occ,
                refId: me.id,
                meta: { userId: me.userId, yearly: true }
              });
            }
          }
        }
        const timelineItems = await getUpcomingTimelineByFamily(fid, from, to);
        for (const t2 of timelineItems) {
          if (t2.type !== "milestone" && t2.type !== "pregnancy") continue;
          items.push({
            kind: t2.type,
            familyId: fid,
            title: t2.title,
            date: t2.eventDate,
            refId: t2.id,
            meta: { childId: t2.childId }
          });
        }
      }
      items.sort((a, b) => a.date.getTime() - b.date.getTime());
      return { from, to, count: items.length, items };
    })
  })
});

// server/vercel-handler.ts
init_db();
init_bootstrap_sql();
import mysql2 from "mysql2/promise";
var app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    node: process.version,
    hasDb: Boolean(process.env.DATABASE_URL),
    hasJwt: Boolean(process.env.JWT_SECRET),
    hasOAuth: Boolean(process.env.OAUTH_SERVER_URL),
    hasResend: Boolean(process.env.RESEND_API_KEY),
    // Surface what the request looks like to the server so we can verify
    // trust-proxy is working and session cookies will be accepted.
    request: {
      protocol: req.protocol,
      secure: req.secure,
      xForwardedProto: req.headers["x-forwarded-proto"] ?? null,
      hasCookieHeader: Boolean(req.headers.cookie),
      cookieHeaderLength: (req.headers.cookie ?? "").length
    }
  });
});
app.get("/api/db-ping", async (_req, res) => {
  const started = Date.now();
  const diag = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    databaseUrlLength: process.env.DATABASE_URL?.length ?? 0
  };
  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      diag.parsedUrl = {
        protocol: u.protocol,
        host: u.hostname,
        port: u.port,
        database: u.pathname.replace(/^\//, ""),
        user: u.username,
        hasPassword: Boolean(u.password),
        passwordLength: u.password.length,
        sslMode: u.searchParams.get("ssl-mode")
      };
    } catch (err) {
      diag.parseError = String(err?.message || err);
      res.status(500).json({ ok: false, stage: "parseUrl", elapsedMs: Date.now() - started, ...diag });
      return;
    }
  } else {
    res.status(500).json({
      ok: false,
      stage: "env",
      message: "DATABASE_URL not set. Check Vercel \u2192 Settings \u2192 Environment Variables \u2192 make sure it's assigned to Production AND redeploy.",
      elapsedMs: Date.now() - started,
      ...diag
    });
    return;
  }
  let conn = null;
  try {
    conn = await mysql2.createConnection(buildDbConfig(process.env.DATABASE_URL));
  } catch (err) {
    const cause = err?.cause;
    res.status(500).json({
      ok: false,
      stage: "connect",
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      message: String(err?.sqlMessage || err?.message || err),
      cause: cause ? {
        code: cause.code,
        errno: cause.errno,
        message: String(cause.sqlMessage || cause.message || cause)
      } : void 0,
      elapsedMs: Date.now() - started,
      ...diag
    });
    return;
  }
  try {
    const [rows] = await conn.query("SELECT 1 AS ok");
    let usersColumns = null;
    let tables = null;
    try {
      const [colRows] = await conn.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' ORDER BY ORDINAL_POSITION"
      );
      usersColumns = colRows;
      const [tblRows] = await conn.query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
      );
      tables = tblRows;
    } catch {
    }
    res.json({
      ok: true,
      elapsedMs: Date.now() - started,
      result: Array.isArray(rows) ? rows[0] : rows,
      usersColumns,
      tables,
      ...diag
    });
  } catch (err) {
    const cause = err?.cause;
    res.status(500).json({
      ok: false,
      stage: "query",
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      message: String(err?.sqlMessage || err?.message || err),
      cause: cause ? {
        code: cause.code,
        errno: cause.errno,
        message: String(cause.sqlMessage || cause.message || cause)
      } : void 0,
      elapsedMs: Date.now() - started,
      ...diag
    });
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
      }
    }
  }
});
app.get("/api/db-columns", async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ ok: false, message: "DATABASE_URL not set" });
    return;
  }
  let conn = null;
  try {
    conn = await mysql2.createConnection(buildDbConfig(process.env.DATABASE_URL));
    const [rows] = await conn.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' ORDER BY ORDINAL_POSITION"
    );
    const [tables] = await conn.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
    );
    res.json({ ok: true, usersColumns: rows, tables });
  } catch (err) {
    res.status(500).json({
      ok: false,
      code: err?.code,
      sqlState: err?.sqlState,
      message: String(err?.sqlMessage || err?.message || err)
    });
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
      }
    }
  }
});
app.get("/api/db-repair", async (req, res) => {
  const required = process.env.DB_REPAIR_SECRET;
  const given = req.query.secret || req.headers["x-repair-secret"];
  if (required && given !== required) {
    res.status(401).json({ ok: false, message: "Unauthorized" });
    return;
  }
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ ok: false, message: "DATABASE_URL not set" });
    return;
  }
  const statements = getBootstrapStatements();
  const results = [];
  let applied = 0;
  let skipped = 0;
  let failed = 0;
  let conn = null;
  try {
    conn = await mysql2.createConnection(buildDbConfig(process.env.DATABASE_URL));
    for (const stmt of statements) {
      const preview = stmt.replace(/\s+/g, " ").slice(0, 120);
      try {
        await conn.query(stmt);
        applied++;
        results.push({ preview, status: "applied" });
      } catch (err) {
        const msg = String(err?.sqlMessage || err?.message || err);
        if (/Duplicate column|Duplicate key|already exists|ER_DUP_FIELDNAME|ER_TABLE_EXISTS_ERROR|ER_DUP_KEYNAME/i.test(
          msg
        )) {
          skipped++;
          results.push({ preview, status: "skipped", message: msg, code: err?.code });
        } else {
          failed++;
          results.push({ preview, status: "failed", message: msg, code: err?.code });
        }
      }
    }
    res.json({ ok: failed === 0, applied, skipped, failed, total: statements.length, results });
  } catch (err) {
    res.status(500).json({
      ok: false,
      code: err?.code,
      sqlState: err?.sqlState,
      message: String(err?.sqlMessage || err?.message || err),
      applied,
      skipped,
      failed,
      results
    });
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
      }
    }
  }
});
var BUSINESS_TABLES = [
  "users",
  "password_reset_tokens",
  "families",
  "family_members",
  "children",
  "timeline_events",
  "routine_tasks",
  "task_checkins",
  "events",
  "event_images",
  "rsvps",
  "milestone_templates",
  "connections",
  "event_join_requests",
  "member_events",
  "recommendations",
  "skills",
  "help_requests",
  "skill_matches",
  "reviews"
];
async function tableExists(conn, tableName) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName]
  );
  return rows[0].c > 0;
}
async function runBackup(conn) {
  const tables = {};
  const data = {};
  let totalRows = 0;
  for (const t2 of BUSINESS_TABLES) {
    if (!await tableExists(conn, t2)) continue;
    const [rows] = await conn.query(`SELECT * FROM \`${t2}\``);
    const list = rows;
    tables[t2] = list.length;
    data[t2] = list;
    totalRows += list.length;
  }
  return { backupAt: (/* @__PURE__ */ new Date()).toISOString(), totalRows, tables, data };
}
async function runMigrate(conn) {
  const results = {};
  const [userUpdate] = await conn.query(`
    UPDATE \`users\` SET
      \`bio\`           = COALESCE(\`bio\`, ''),
      \`location\`      = COALESCE(\`location\`, ''),
      \`skillTags\`     = COALESCE(\`skillTags\`, '[]'),
      \`creditScore\`   = COALESCE(\`creditScore\`, 100),
      \`reportedCount\` = COALESCE(\`reportedCount\`, 0)
    WHERE
      \`bio\` IS NULL OR
      \`location\` IS NULL OR
      \`skillTags\` IS NULL OR
      \`creditScore\` IS NULL OR
      \`reportedCount\` IS NULL
  `);
  results.usersUpdated = userUpdate.affectedRows;
  if (await tableExists(conn, "connections")) {
    const [connUpdate] = await conn.query(`
      UPDATE \`connections\` SET
        \`category\`  = COALESCE(\`category\`, 'life'),
        \`hasUpdate\` = COALESCE(\`hasUpdate\`, 0)
      WHERE \`category\` IS NULL OR \`hasUpdate\` IS NULL
    `);
    results.connectionsUpdated = connUpdate.affectedRows;
  }
  return results;
}
async function runVerify(conn) {
  const report = {
    verifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
    counts: {},
    orphans: {},
    v4FieldHealth: {}
  };
  for (const t2 of BUSINESS_TABLES) {
    if (!await tableExists(conn, t2)) {
      report.counts[t2] = null;
      continue;
    }
    const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t2}\``);
    report.counts[t2] = rows[0].c;
  }
  const orphanQueries = {
    familyMembersWithoutFamily: `
      SELECT COUNT(*) AS c FROM \`family_members\` fm
      LEFT JOIN \`families\` f ON f.id = fm.familyId
      WHERE f.id IS NULL
    `,
    familyMembersWithoutUser: `
      SELECT COUNT(*) AS c FROM \`family_members\` fm
      LEFT JOIN \`users\` u ON u.id = fm.userId
      WHERE u.id IS NULL
    `,
    childrenWithoutFamily: `
      SELECT COUNT(*) AS c FROM \`children\` c
      LEFT JOIN \`families\` f ON f.id = c.familyId
      WHERE f.id IS NULL
    `,
    timelineEventsWithoutChild: `
      SELECT COUNT(*) AS c FROM \`timeline_events\` te
      LEFT JOIN \`children\` c ON c.id = te.childId
      WHERE c.id IS NULL
    `,
    routineTasksWithoutFamily: `
      SELECT COUNT(*) AS c FROM \`routine_tasks\` rt
      LEFT JOIN \`families\` f ON f.id = rt.familyId
      WHERE f.id IS NULL
    `,
    eventsWithoutFamily: `
      SELECT COUNT(*) AS c FROM \`events\` e
      LEFT JOIN \`families\` f ON f.id = e.familyId
      WHERE f.id IS NULL
    `,
    rsvpsWithoutEvent: `
      SELECT COUNT(*) AS c FROM \`rsvps\` r
      LEFT JOIN \`events\` e ON e.id = r.eventId
      WHERE e.id IS NULL
    `,
    connectionsWithoutUser: `
      SELECT COUNT(*) AS c FROM \`connections\` cn
      LEFT JOIN \`users\` ur ON ur.id = cn.requesterId
      LEFT JOIN \`users\` ue ON ue.id = cn.receiverId
      WHERE ur.id IS NULL OR ue.id IS NULL
    `
  };
  for (const [key, sqlText] of Object.entries(orphanQueries)) {
    try {
      const [rows] = await conn.query(sqlText);
      report.orphans[key] = rows[0].c;
    } catch (err) {
      report.orphans[key] = `error: ${String(err?.message || err)}`;
    }
  }
  const healthQueries = {
    usersMissingBio: "SELECT COUNT(*) AS c FROM `users` WHERE `bio` IS NULL",
    usersMissingSkillTags: "SELECT COUNT(*) AS c FROM `users` WHERE `skillTags` IS NULL",
    usersMissingCreditScore: "SELECT COUNT(*) AS c FROM `users` WHERE `creditScore` IS NULL",
    usersMissingReportedCount: "SELECT COUNT(*) AS c FROM `users` WHERE `reportedCount` IS NULL"
  };
  for (const [key, sqlText] of Object.entries(healthQueries)) {
    try {
      const [rows] = await conn.query(sqlText);
      report.v4FieldHealth[key] = rows[0].c;
    } catch (err) {
      report.v4FieldHealth[key] = `error: ${String(err?.message || err)}`;
    }
  }
  return report;
}
app.get("/api/admin/migrate", async (req, res) => {
  const required = process.env.DB_REPAIR_SECRET;
  const given = req.query.secret || req.headers["x-repair-secret"];
  if (required && given !== required) {
    res.status(401).json({ ok: false, message: "Unauthorized" });
    return;
  }
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ ok: false, message: "DATABASE_URL not set" });
    return;
  }
  const action = String(req.query.action || "verify").toLowerCase();
  const started = Date.now();
  let conn = null;
  try {
    conn = await mysql2.createConnection(buildDbConfig(process.env.DATABASE_URL));
    const result = {
      ok: true,
      action,
      startedAt: new Date(started).toISOString()
    };
    switch (action) {
      case "backup":
        result.backup = await runBackup(conn);
        break;
      case "migrate":
        result.migrate = await runMigrate(conn);
        break;
      case "verify":
        result.verify = await runVerify(conn);
        break;
      case "all":
        result.backup = await runBackup(conn);
        result.migrate = await runMigrate(conn);
        result.verify = await runVerify(conn);
        break;
      default:
        res.status(400).json({ ok: false, message: `Unknown action: ${action}` });
        return;
    }
    result.elapsedMs = Date.now() - started;
    res.json(result);
  } catch (err) {
    res.status(500).json({
      ok: false,
      action,
      elapsedMs: Date.now() - started,
      code: err?.code,
      sqlState: err?.sqlState,
      message: String(err?.sqlMessage || err?.message || err)
    });
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
      }
    }
  }
});
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`[trpc] error on ${path ?? "?"}:`, error);
    }
  })
);
app.all("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
    method: req.method,
    message: "No API route matched this path."
  });
});
app.use((err, _req, res, _next) => {
  const e = err;
  console.error("[api] Unhandled error:", e?.message || err, e?.stack);
  if (res.headersSent) return;
  res.status(500).json({
    error: "ServerError",
    message: e?.message || "Internal server error"
  });
});
var vercel_handler_default = app;
export {
  vercel_handler_default as default
};
