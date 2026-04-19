import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
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
  skillTags: text("skillTags"), // JSON array of skill tags
  creditScore: int("creditScore").default(100),
  passwordHash: varchar("passwordHash", { length: 255 }),
  wechatOpenId: varchar("wechatOpenId", { length: 64 }),
  reportedCount: int("reportedCount").default(0),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Families ────────────────────────────────────────────────────────────────
export const families = mysqlTable("families", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  coverUrl: text("coverUrl"),
  createdBy: int("createdBy").notNull(), // user.id
  inviteCode: varchar("inviteCode", { length: 16 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Family = typeof families.$inferSelect;
export type InsertFamily = typeof families.$inferInsert;

// ─── Family Members ───────────────────────────────────────────────────────────
export const familyMembers = mysqlTable("family_members", {
  id: int("id").autoincrement().primaryKey(),
  familyId: int("familyId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["admin", "collaborator", "observer"]).default("observer").notNull(),
  nickname: varchar("nickname", { length: 50 }),
  birthDate: timestamp("birthDate"),
  anniversaryDate: timestamp("anniversaryDate"), // e.g. wedding anniversary
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = typeof familyMembers.$inferInsert;

// ─── Children ────────────────────────────────────────────────────────────────
export const children = mysqlTable("children", {
  id: int("id").autoincrement().primaryKey(),
  familyId: int("familyId").notNull(),
  nickname: varchar("nickname", { length: 50 }).notNull(),
  fullName: varchar("fullName", { length: 100 }),
  gender: mysqlEnum("gender", ["girl", "boy", "unknown"]).default("unknown"),
  birthDate: timestamp("birthDate"),
  avatarUrl: text("avatarUrl"),
  color: varchar("color", { length: 20 }).default("#FF6B6B"), // theme color for this child
  // Pregnancy reference fields
  pregnancyRefDate: timestamp("pregnancyRefDate"),  // reference date for pregnancy calculation
  pregnancyWeeksAtRef: int("pregnancyWeeksAtRef").default(0), // weeks pregnant at reference date
  pregnancyDaysAtRef: int("pregnancyDaysAtRef").default(0),   // extra days pregnant at reference date
  isMultiple: boolean("isMultiple").default(false), // twin/multiple pregnancy
  childOneName: varchar("childOneName", { length: 50 }), // 双胞胎孩子一的名字
  childTwoName: varchar("childTwoName", { length: 50 }), // 双胞胎孩子二的名字
  childOneGender: mysqlEnum("childOneGender", ["girl", "boy", "unknown"]).default("unknown"), // 双胞胎孩子一的性别
  childTwoGender: mysqlEnum("childTwoGender", ["girl", "boy", "unknown"]).default("unknown"), // 双胞胎孩子二的性别
  notes: text("notes"), // 孩子备注信息
  // Legacy IVF fields (kept for compatibility)
  embryoTransferDate: timestamp("embryoTransferDate"),
  embryoDay: int("embryoDay").default(5),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Child = typeof children.$inferSelect;
export type InsertChild = typeof children.$inferInsert;

// ─── Timeline Events ─────────────────────────────────────────────────────────
export const timelineEvents = mysqlTable("timeline_events", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  familyId: int("familyId").notNull(),
  type: mysqlEnum("type", [
    "pregnancy",      // 孕期事件
    "milestone",      // 成长里程碑
    "post",           // 日常动态
    "checkup",        // 体检记录
    "vaccination",    // 疫苗接种
    "system",         // 系统自动生成
  ]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"),
  mediaUrls: text("mediaUrls"), // JSON array of URLs
  xiaohongshuUrl: text("xiaohongshuUrl"), // 小红书笔记链接
  eventDate: timestamp("eventDate").notNull(),
  createdBy: int("createdBy").notNull(),
  // Visibility: public = visible to connections/observers, private = family only
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertTimelineEvent = typeof timelineEvents.$inferInsert;

// ─── Routine Tasks ────────────────────────────────────────────────────────────
export const routineTasks = mysqlTable("routine_tasks", {
  id: int("id").autoincrement().primaryKey(),
  familyId: int("familyId").notNull(),
  childId: int("childId"), // null = applies to all children
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }).default("circle"),
  color: varchar("color", { length: 20 }).default("#4ECDC4"),
  category: mysqlEnum("category", ["feeding", "sleep", "checkup", "play", "bath", "other"]).default("other"),
  repeatRule: varchar("repeatRule", { length: 100 }), // cron-like: "every_3h", "daily", "weekly"
  taskType: mysqlEnum("taskType", ["frequency", "value"]).default("frequency"),
  valueUnit: varchar("valueUnit", { length: 30 }), // unit for value-type tasks (kg, cm, ml)
  assignedTo: int("assignedTo"), // user.id, null = anyone
  isActive: boolean("isActive").default(true),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RoutineTask = typeof routineTasks.$inferSelect;
export type InsertRoutineTask = typeof routineTasks.$inferInsert;

// ─── Task Check-ins ───────────────────────────────────────────────────────────
export const taskCheckins = mysqlTable("task_checkins", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  childId: int("childId"),
  note: text("note"),
  value: varchar("value", { length: 50 }), // 数值记录（如体重、身高）
  unit: varchar("unit", { length: 20 }),   // 单位（kg、cm等）
  checkedBy: int("checkedBy").notNull(),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
});

export type TaskCheckin = typeof taskCheckins.$inferSelect;
export type InsertTaskCheckin = typeof taskCheckins.$inferInsert;

// ─── Events (Activities / Parties) ───────────────────────────────────────────
export const events = mysqlTable("events", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── Event Images (活动多张封面图片) ───────────────────────────────────────────────
export const eventImages = mysqlTable("event_images", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EventImage = typeof eventImages.$inferSelect;
export type InsertEventImage = typeof eventImages.$inferInsert;

// ─── RSVPs ────────────────────────────────────────────────────────────────────
export const rsvps = mysqlTable("rsvps", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  guestName: varchar("guestName", { length: 100 }).notNull(),
  guestContact: varchar("guestContact", { length: 200 }),
  status: mysqlEnum("status", ["attending", "maybe", "declined"]).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Rsvp = typeof rsvps.$inferSelect;
export type InsertRsvp = typeof rsvps.$inferInsert;

// ─── Milestone Templates ──────────────────────────────────────────────────────
export const milestoneTemplates = mysqlTable("milestone_templates", {
  id: int("id").autoincrement().primaryKey(),
  ageMonthMin: int("ageMonthMin").notNull(), // 适用月龄范围开始
  ageMonthMax: int("ageMonthMax").notNull(), // 适用月龄范围结束
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["development", "nutrition", "vaccination", "checkup", "safety"]).notNull(),
  isBuiltIn: boolean("isBuiltIn").default(true),
});

export type MilestoneTemplate = typeof milestoneTemplates.$inferSelect;

// ─── Connections (人脉好友) ────────────────────────────────────────────────────
export const connections = mysqlTable("connections", {
  id: int("id").autoincrement().primaryKey(),
  requesterId: int("requesterId").notNull(), // 发起人 user.id
  receiverId: int("receiverId").notNull(),   // 接受人 user.id
  status: mysqlEnum("status", ["pending", "accepted", "blocked"]).default("pending").notNull(),
  note: varchar("note", { length: 200 }), // 备注/关系说明
  category: mysqlEnum("category", ["life", "work", "family", "kids", "pets"]).default("life").notNull(), // 人脉圈分类
  hasUpdate: boolean("hasUpdate").default(false).notNull(), // 是否有新动态（头像高亮）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = typeof connections.$inferInsert;

// ─── Friend Event Join Requests ───────────────────────────────────────────────
// When a friend creates a public/private event, others can request to join
export const eventJoinRequests = mysqlTable("event_join_requests", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),          // references events.id
  requesterId: int("requesterId").notNull(),   // user.id who wants to join
  hostId: int("hostId").notNull(),             // user.id who created the event
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  message: text("message"),                    // optional message from requester
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EventJoinRequest = typeof eventJoinRequests.$inferSelect;
export type InsertEventJoinRequest = typeof eventJoinRequests.$inferInsert;

// ─── Member Events (成员大事件：生日/纪念日，每年循环) ───────────────────────
export const memberEvents = mysqlTable("member_events", {
  id: int("id").autoincrement().primaryKey(),
  familyId: int("familyId").notNull(),
  userId: int("userId").notNull(),        // 关联的家庭成员 user.id
  title: varchar("title", { length: 100 }).notNull(), // 事件名称
  eventType: mysqlEnum("eventType", ["birthday", "anniversary", "custom"]).default("custom").notNull(),
  eventDate: timestamp("eventDate").notNull(), // 事件日期（年份仅作参考，每年循环）
  isYearly: boolean("isYearly").default(true).notNull(), // 是否每年循环
  note: text("note"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MemberEvent = typeof memberEvents.$inferSelect;
export type InsertMemberEvent = typeof memberEvents.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// v4.0 Pinple 新增表 — 信任圈 + 技能市场 + 信用体系
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Recommendations 推荐链 ──────────────────────────────────────────────────
export const recommendations = mysqlTable("recommendations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),             // 被推荐的用户
  recommenderId: int("recommenderId").notNull(), // 推荐人
  targetUserId: int("targetUserId").notNull(),   // 推荐给谁
  context: varchar("context", { length: 255 }),  // 推荐理由/场景
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;

// ─── Skills 技能发布 ─────────────────────────────────────────────────────────
export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  images: text("images"), // JSON array of image URLs
  priceMin: decimal("priceMin", { precision: 10, scale: 2 }),
  priceMax: decimal("priceMax", { precision: 10, scale: 2 }),
  location: varchar("location", { length: 255 }),
  serviceRadius: int("serviceRadius"),
  availableTimes: text("availableTimes"), // JSON
  contactMethod: varchar("contactMethod", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

// ─── Help Requests 求助发布 ──────────────────────────────────────────────────
export const helpRequests = mysqlTable("help_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  skillTags: text("skillTags"), // JSON array of skill tags
  budgetMin: decimal("budgetMin", { precision: 10, scale: 2 }),
  budgetMax: decimal("budgetMax", { precision: 10, scale: 2 }),
  location: varchar("location", { length: 255 }),
  urgency: mysqlEnum("urgency", ["low", "medium", "high"]).default("medium"),
  deadline: timestamp("deadline"),
  status: mysqlEnum("status", ["open", "matched", "closed"]).default("open"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type HelpRequest = typeof helpRequests.$inferSelect;
export type InsertHelpRequest = typeof helpRequests.$inferInsert;

// ─── Skill Matches 匹配记录 ──────────────────────────────────────────────────
export const skillMatches = mysqlTable("skill_matches", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  skillId: int("skillId").notNull(),
  providerId: int("providerId").notNull(), // 技能提供者 user.id
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "completed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SkillMatch = typeof skillMatches.$inferSelect;
export type InsertSkillMatch = typeof skillMatches.$inferInsert;

// ─── Reviews 评价 ────────────────────────────────────────────────────────────
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  fromUserId: int("fromUserId").notNull(),
  toUserId: int("toUserId").notNull(),
  matchId: int("matchId").notNull(),
  rating: int("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// ─── User Reports 举报 ───────────────────────────────────────────────────────
export const userReports = mysqlTable("user_reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),
  reportedUserId: int("reportedUserId").notNull(),
  reason: mysqlEnum("reason", ["inappropriate", "fraud", "harassment", "other"]).default("other"),
  description: text("description"),
  evidence: text("evidence"), // JSON array of URLs
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = typeof userReports.$inferInsert;

// ─── User Blocks 屏蔽 ────────────────────────────────────────────────────────
export const userBlocks = mysqlTable("user_blocks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  blockedUserId: int("blockedUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type UserBlock = typeof userBlocks.$inferSelect;
export type InsertUserBlock = typeof userBlocks.$inferInsert;
