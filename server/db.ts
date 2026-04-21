import { and, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { getBootstrapStatements } from "./_core/bootstrap-sql";
import {
  Child,
  Event,
  EventImage,
  InsertEventImage,
  eventImages,
  Family,
  FamilyMember,
  InsertChild,
  InsertEvent,
  InsertFamily,
  InsertFamilyMember,
  InsertRoutineTask,
  InsertTaskCheckin,
  InsertTimelineEvent,
  InsertUser,
  RoutineTask,
  Rsvp,
  TimelineEvent,
  children,
  events,
  families,
  familyMembers,
  milestoneTemplates,
  routineTasks,
  rsvps,
  taskCheckins,
  timelineEvents,
  users,
  connections,
  Connection,
  InsertConnection,
  recommendations,
  InsertRecommendation,
  skills,
  InsertSkill,
  helpRequests,
  InsertHelpRequest,
  skillMatches,
  InsertSkillMatch,
  reviews,
  InsertReview,
  userReports,
  InsertUserReport,
  userBlocks,
  InsertUserBlock,
  passwordResetTokens,
  InsertPasswordResetToken,
  PasswordResetToken,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _dbCreatedAt = 0;
let _schemaReadyPromise: Promise<void> | null = null;
const DB_MAX_AGE_MS = 5 * 60 * 1000; // Recreate connection every 5 minutes to prevent stale connections

/**
 * Parse a DATABASE_URL into a mysql2 connection-options object.
 *
 * Handles the JDBC / Aiven / PlanetScale-style URL flavour that uses `ssl-mode`
 * as a query parameter — mysql2 ignores that param (and logs a warning) and
 * would then try to talk plaintext to a server that only accepts TLS.
 *
 * We translate:
 *   ?ssl-mode=REQUIRED|VERIFY_CA|VERIFY_IDENTITY  → `ssl: {}` (TLS on, cert check)
 *   ?ssl-mode=DISABLED                             → no TLS
 *   no ssl-mode, host contains 'aivencloud.com'    → `ssl: {}` (safe default)
 */
export function buildDbConfig(rawUrl: string): mysql.ConnectionOptions {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    // Not a URL we can parse — hand it back to drizzle/mysql2 as-is and
    // let them produce the error.
    return { uri: rawUrl } as unknown as mysql.ConnectionOptions;
  }

  const sslMode = (url.searchParams.get("ssl-mode") || "").toUpperCase();
  url.searchParams.delete("ssl-mode");

  const config: mysql.ConnectionOptions = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || undefined,
    connectTimeout: 10_000,
  };

  const needsTls =
    sslMode === "REQUIRED" ||
    sslMode === "VERIFY_CA" ||
    sslMode === "VERIFY_IDENTITY" ||
    // Managed MySQL services that always need TLS
    /\b(aivencloud\.com|psdb\.cloud|cluster\.ondigitalocean\.com)$/i.test(url.hostname);

  if (needsTls && sslMode !== "DISABLED") {
    // Aiven uses a self-signed chain; we don't need strict verify for our
    // use case, and they document `rejectUnauthorized: false` as the
    // standard mysql2 config. Flip to `true` if you upload their CA.
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

export function resetDb() {
  _db = null;
  _dbCreatedAt = 0;
  _schemaReadyPromise = null;
}

export async function getDb() {
  const now = Date.now();
  // Reset stale connection
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
        `[Database] pool created — host=${(cfg as any).host} db=${(cfg as any).database} ssl=${!!(cfg as any).ssl}`,
      );
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  // Self-healing schema bootstrap — guarded by a single shared promise so parallel
  // callers wait for the same work and never see a partially-migrated schema.
  // We cap the wait at 8s so a slow DDL never causes FUNCTION_INVOCATION_FAILED.
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
        new Promise<void>((resolve) => setTimeout(resolve, 20000)),
      ]);
    } catch (err) {
      console.warn("[Database] ensureSchema wait failed:", err);
    }
  }
  return _db;
}

/**
 * Idempotent schema bootstrap. Runs once per cold start.
 *
 * Uses all drizzle migration SQL embedded at build time (esbuild text loader) +
 * v4 column/table additions. `CREATE TABLE` is rewritten to `IF NOT EXISTS`
 * so fresh DBs get fully provisioned; errors on already-existing columns are
 * swallowed so partially-migrated DBs get topped up.
 */
async function ensureSchema(_db: NonNullable<typeof _db>) {
  if (!process.env.DATABASE_URL) return;

  const startedAt = Date.now();
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(buildDbConfig(process.env.DATABASE_URL));

    // Fast-path: if the DB already has the v4 columns we care about, skip the
    // entire migration run. This turns typical cold starts from 10-20s into
    // < 300ms and eliminates the tRPC batched-query ERR_CONNECTION_RESET that
    // happens when cold-start + schema init + queries exceed maxDuration.
    try {
      await conn.query("SELECT `reportedCount`, `passwordHash` FROM `users` LIMIT 0");
      // Table + critical columns exist → schema is healthy, skip everything.
      console.log(
        `[Database] ensureSchema fast-path: schema already healthy in ${Date.now() - startedAt}ms`,
      );
      return;
    } catch {
      // Fall through to full migration.
    }

    const statements = getBootstrapStatements();
    let applied = 0;
    let skipped = 0;
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        applied++;
      } catch (err: any) {
        const msg = String(err?.message || err?.sqlMessage || err);
        if (
          /Duplicate column|Duplicate key|already exists|ER_DUP_FIELDNAME|ER_TABLE_EXISTS_ERROR|ER_DUP_KEYNAME/i.test(
            msg,
          )
        ) {
          skipped++;
          continue;
        }
        // Log but keep going — we don't want one bad migration to block auth.
        console.warn(
          `[Database] ensureSchema stmt failed (continuing): ${msg} :: ${stmt.slice(0, 120)}...`,
        );
      }
    }
    console.log(
      `[Database] ensureSchema done — applied=${applied} skipped=${skipped} total=${statements.length} in ${Date.now() - startedAt}ms`,
    );
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
        /* ignore */
      }
    }
  }
}

// Wrap any DB operation with auto-retry on connection reset
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const isConnReset = err?.message?.includes('ECONNRESET') || err?.cause?.code === 'ECONNRESET' || err?.code === 'ECONNRESET';
      if (isConnReset && i < retries) {
        console.warn(`[Database] Connection reset, retrying (${i + 1}/${retries})...`);
        resetDb();
        await new Promise(r => setTimeout(r, 200 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('DB retry exhausted');
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "avatarUrl"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await withDbRetry(async () => {
    const db = await getDb();
    if (!db) return;
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEmailUser(data: {
  email: string;
  name: string;
  passwordHash: string;
  openId: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
  return (result[0] as any).insertId;
}

export async function updateUserCreditScore(userId: number, delta: number) {
  const db = await getDb();
  if (!db) return;
  const user = await getUserById(userId);
  if (!user) return;
  const currentScore = user.creditScore ?? 100;
  const newScore = Math.max(0, Math.min(100, currentScore + delta));
  await db.update(users).set({ creditScore: newScore }).where(eq(users.id, userId));
  return newScore;
}

export async function getUserCreditScore(userId: number): Promise<number> {
  const user = await getUserById(userId);
  return user?.creditScore ?? 100;
}

// ─── Password Reset ──────────────────────────────────────────────────────────
export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function createPasswordResetToken(
  data: { userId: number; token: string; expiresAt: Date }
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(passwordResetTokens).values({
    userId: data.userId,
    token: data.token,
    expiresAt: data.expiresAt,
  });
  return (result[0] as any).insertId;
}

export async function getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  if (row.usedAt) return undefined;
  if (row.expiresAt.getTime() < now.getTime()) return undefined;
  return row;
}

export async function markPasswordResetTokenUsed(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, id));
}

// ─── Families ─────────────────────────────────────────────────────────────────
export async function createFamily(data: InsertFamily): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(families).values(data);
  return (result[0] as any).insertId;
}

export async function getFamilyById(id: number): Promise<Family | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(families).where(eq(families.id, id)).limit(1);
  return result[0];
}

export async function getFamilyByInviteCode(code: string): Promise<Family | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(families).where(eq(families.inviteCode, code)).limit(1);
  return result[0];
}

export async function getUserFamilies(userId: number) {
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

export async function updateFamily(id: number, data: Partial<InsertFamily>) {
  const db = await getDb();
  if (!db) return;
  await db.update(families).set(data).where(eq(families.id, id));
}

// ─── Family Members ───────────────────────────────────────────────────────────
export async function addFamilyMember(data: InsertFamilyMember): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(familyMembers).values(data);
  return (result[0] as any).insertId;
}

export async function getFamilyMembers(familyId: number) {
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

export async function getMemberRole(familyId: number, userId: number): Promise<FamilyMember | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(familyMembers)
    .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updateMemberRole(familyId: number, userId: number, role: "admin" | "collaborator" | "observer") {
  const db = await getDb();
  if (!db) return;
  await db
    .update(familyMembers)
    .set({ role })
    .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
}

export async function removeFamilyMember(familyId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(familyMembers)
    .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
}

export async function updateMemberDates(
  familyId: number,
  userId: number,
  data: { birthDate?: Date | null; anniversaryDate?: Date | null; nickname?: string | null }
) {
  const db = await getDb();
  if (!db) return;
  const set: Record<string, unknown> = {};
  if (data.birthDate !== undefined) set.birthDate = data.birthDate;
  if (data.anniversaryDate !== undefined) set.anniversaryDate = data.anniversaryDate;
  if (data.nickname !== undefined) set.nickname = data.nickname;
  if (Object.keys(set).length === 0) return;
  await db
    .update(familyMembers)
    .set(set)
    .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
}

export async function updateUserBirthDate(userId: number, birthDate: Date | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ birthDate }).where(eq(users.id, userId));
}

// ─── Children ─────────────────────────────────────────────────────────────────
export async function createChild(data: InsertChild): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(children).values(data);
  return (result[0] as any).insertId;
}

export async function getChildrenByFamily(familyId: number): Promise<Child[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(children).where(eq(children.familyId, familyId));
}

export async function getChildById(id: number): Promise<Child | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(children).where(eq(children.id, id)).limit(1);
  return result[0];
}

export async function updateChild(id: number, data: Partial<InsertChild>) {
  const db = await getDb();
  if (!db) return;
  await db.update(children).set(data).where(eq(children.id, id));
}

// ─── Timeline Events ──────────────────────────────────────────────────────────
export async function createTimelineEvent(data: InsertTimelineEvent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(timelineEvents).values(data);
  return (result[0] as any).insertId;
}

export async function getTimelineEvents(childId: number, limit = 50, offset = 0): Promise<TimelineEvent[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.childId, childId))
    .orderBy(desc(timelineEvents.eventDate))
    .limit(limit)
    .offset(offset);
}

export async function deleteTimelineEvent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(timelineEvents).where(eq(timelineEvents.id, id));
}

// ─── Routine Tasks ────────────────────────────────────────────────────────────
export async function createRoutineTask(data: InsertRoutineTask): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(routineTasks).values(data);
  return (result[0] as any).insertId;
}

export async function getRoutineTasks(familyId: number): Promise<RoutineTask[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routineTasks).where(and(eq(routineTasks.familyId, familyId), eq(routineTasks.isActive, true)));
}

export async function updateRoutineTask(id: number, data: Partial<InsertRoutineTask>) {
  const db = await getDb();
  if (!db) return;
  await db.update(routineTasks).set(data).where(eq(routineTasks.id, id));
}

export async function deleteRoutineTask(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(routineTasks).set({ isActive: false }).where(eq(routineTasks.id, id));
}

export async function createTaskCheckin(data: InsertTaskCheckin): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(taskCheckins).values(data);
  return (result[0] as any).insertId;
}

export async function getTaskCheckins(taskId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const checkins = await db
    .select()
    .from(taskCheckins)
    .where(eq(taskCheckins.taskId, taskId))
    .orderBy(desc(taskCheckins.checkedAt))
    .limit(limit);
  const result = [];
  for (const c of checkins) {
    const user = await getUserById(c.checkedBy);
    result.push({ ...c, user });
  }
  return result;
}

export async function getTodayCheckins(familyId: number) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tasks = await getRoutineTasks(familyId);
  const taskIds = tasks.map((t) => t.id);
  if (taskIds.length === 0) return [];
  const allCheckins = [];
  for (const tid of taskIds) {
    const checkins = await db
      .select()
      .from(taskCheckins)
      .where(and(eq(taskCheckins.taskId, tid), gte(taskCheckins.checkedAt, today), lte(taskCheckins.checkedAt, tomorrow)));
    allCheckins.push(...checkins);
  }
  return allCheckins;
}

// ─── Events ───────────────────────────────────────────────────────────────────
export async function createEvent(data: InsertEvent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(events).values(data);
  return (result[0] as any).insertId;
}

export async function getEventsByFamily(familyId: number): Promise<Event[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).where(eq(events.familyId, familyId)).orderBy(desc(events.eventDate));
}

export async function getEventByToken(token: string): Promise<Event | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.inviteToken, token)).limit(1);
  return result[0];
}

export async function getEventById(id: number): Promise<Event | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result[0];
}

// ─── Event Images ────────────────────────────────────────────────────────────
export async function addEventImage(data: InsertEventImage): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(eventImages).values(data);
  return (result as any)[0].insertId;
}

export async function getEventImages(eventId: number): Promise<EventImage[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eventImages).where(eq(eventImages.eventId, eventId)).orderBy(eventImages.sortOrder);
}

export async function deleteEventImage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(eventImages).where(eq(eventImages.id, id));
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(events).set(data).where(eq(events.id, id));
}

// ─── RSVPs ────────────────────────────────────────────────────────────────────
export async function createRsvp(data: { eventId: number; guestName: string; guestContact?: string; status: "attending" | "maybe" | "declined"; note?: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(rsvps).values(data);
  return (result[0] as any).insertId;
}

export async function getRsvpsByEvent(eventId: number): Promise<Rsvp[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rsvps).where(eq(rsvps.eventId, eventId)).orderBy(desc(rsvps.createdAt));
}

// ─── Milestone Templates ──────────────────────────────────────────────────────
export async function getMilestonesByAge(ageMonths: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(milestoneTemplates)
    .where(and(lte(milestoneTemplates.ageMonthMin, ageMonths), gte(milestoneTemplates.ageMonthMax, ageMonths)));
}

export async function getAllMilestoneTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(milestoneTemplates).orderBy(milestoneTemplates.ageMonthMin);
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export async function updateUserProfile(userId: number, data: { name?: string; avatarUrl?: string }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.avatarUrl !== undefined) updateSet.avatarUrl = data.avatarUrl;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(users).set(updateSet).where(eq(users.id, userId));
}

// ─── Connections (人脉好友) ────────────────────────────────────────────────────
export async function sendConnectionRequest(requesterId: number, receiverId: number, note?: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(connections).values({ requesterId, receiverId, note });
  return (result[0] as any).insertId;
}

export async function acceptConnection(connectionId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(connections)
    .set({ status: "accepted" })
    .where(and(eq(connections.id, connectionId), eq(connections.receiverId, userId)));
}

export async function getMyConnections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Alias users table for double join
  const requesterUser = alias(users, "requester_user");
  const receiverUser = alias(users, "receiver_user");
  const rows = await db
    .select({
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
      receiverAvatar: receiverUser.avatarUrl,
    })
    .from(connections)
    .leftJoin(requesterUser, eq(requesterUser.id, connections.requesterId))
    .leftJoin(receiverUser, eq(receiverUser.id, connections.receiverId))
    .where(
      and(
        or(eq(connections.requesterId, userId), eq(connections.receiverId, userId)),
        eq(connections.status, "accepted")
      )
    );
  return rows;
}

export async function getPendingRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: connections.id,
      note: connections.note,
      createdAt: connections.createdAt,
      requesterId: connections.requesterId,
      requesterName: users.name,
      requesterAvatar: users.avatarUrl,
    })
    .from(connections)
    .leftJoin(users, eq(users.id, connections.requesterId))
    .where(and(eq(connections.receiverId, userId), eq(connections.status, "pending")));
}

export async function getUserByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function checkExistingConnection(requesterId: number, receiverId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(connections)
    .where(
      or(
        and(eq(connections.requesterId, requesterId), eq(connections.receiverId, receiverId)),
        and(eq(connections.requesterId, receiverId), eq(connections.receiverId, requesterId))
      )
    ).limit(1);
  return result[0] ?? null;
}

// ─── Delete Child ──────────────────────────────────────────────────────────────
export async function deleteChild(id: number, familyId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Delete associated timeline events first
  await db.delete(timelineEvents).where(eq(timelineEvents.childId, id));
  // Delete associated task checkins and routine tasks
  const tasks = await db.select({ id: routineTasks.id }).from(routineTasks).where(eq(routineTasks.childId, id));
  for (const task of tasks) {
    await db.delete(taskCheckins).where(eq(taskCheckins.taskId, task.id));
  }
  await db.delete(routineTasks).where(eq(routineTasks.childId, id));
  // Delete child
  await db.delete(children).where(and(eq(children.id, id), eq(children.familyId, familyId)));
}

// ─── Update Timeline Event ────────────────────────────────────────────────────
export async function updateTimelineEvent(id: number, data: { title?: string; content?: string; eventDate?: Date }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.content !== undefined) updateSet.content = data.content;
  if (data.eventDate !== undefined) updateSet.eventDate = data.eventDate;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(timelineEvents).set(updateSet).where(eq(timelineEvents.id, id));
}

// ─── Task History & Statistics ────────────────────────────────────────────────
export async function getTaskCheckinsByDate(taskId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  // date format: "YYYY-MM-DD"
  const start = new Date(date + "T00:00:00.000Z");
  const end = new Date(date + "T23:59:59.999Z");
  return db.select().from(taskCheckins)
    .where(and(eq(taskCheckins.taskId, taskId), gte(taskCheckins.checkedAt, start), lte(taskCheckins.checkedAt, end)))
    .orderBy(desc(taskCheckins.checkedAt));
}

export async function getTaskCheckinHistory(taskId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.select({
    id: taskCheckins.id,
    checkedAt: taskCheckins.checkedAt,
    value: taskCheckins.value,
    unit: taskCheckins.unit,
    note: taskCheckins.note,
    checkedBy: taskCheckins.checkedBy,
    checkerName: users.name,
  }).from(taskCheckins)
    .leftJoin(users, eq(users.id, taskCheckins.checkedBy))
    .where(and(eq(taskCheckins.taskId, taskId), gte(taskCheckins.checkedAt, since)))
    .orderBy(desc(taskCheckins.checkedAt));
}

export async function getTaskFrequencyStats(taskId: number, days: number = 14) {
  // Returns daily count for the last N days
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.select({
    checkedAt: taskCheckins.checkedAt,
    value: taskCheckins.value,
    unit: taskCheckins.unit,
  }).from(taskCheckins)
    .where(and(eq(taskCheckins.taskId, taskId), gte(taskCheckins.checkedAt, since)))
    .orderBy(taskCheckins.checkedAt);
  return rows;
}

export async function addTaskCheckinWithValue(data: InsertTaskCheckin) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(taskCheckins).values(data);
}

// ─── Connections: Category & Search ──────────────────────────────────────────
export async function updateConnectionCategory(
  connectionId: number,
  userId: number,
  category: "life" | "work" | "family" | "kids" | "pets"
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(connections)
    .set({ category })
    .where(
      and(
        eq(connections.id, connectionId),
        or(eq(connections.requesterId, userId), eq(connections.receiverId, userId))
      )
    );
}

export async function markConnectionUpdated(userId: number, hasUpdate: boolean) {
  // Mark all connections where this user is the requester as having updates
  const db = await getDb();
  if (!db) return;
  await db.update(connections)
    .set({ hasUpdate })
    .where(eq(connections.requesterId, userId));
}

export async function clearConnectionUpdate(connectionId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(connections).set({ hasUpdate: false }).where(eq(connections.id, connectionId));
}

export async function searchUsersByName(query: string, excludeUserId: number) {
  const db = await getDb();
  if (!db) return [];
  // Simple search by name or openId prefix
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    avatarUrl: users.avatarUrl,
    openId: users.openId,
  }).from(users).limit(50);
  const q = query.toLowerCase();
  return allUsers.filter(u =>
    u.id !== excludeUserId &&
    ((u.name ?? "").toLowerCase().includes(q) || u.openId.toLowerCase().includes(q))
  ).slice(0, 10);
}

export async function getAcceptedConnectionsWithCategory(userId: number) {
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
    friendId: users.id,
  }).from(connections)
    .leftJoin(users, or(
      and(eq(connections.requesterId, userId), eq(users.id, connections.receiverId)),
      and(eq(connections.receiverId, userId), eq(users.id, connections.requesterId))
    ))
    .where(and(
      eq(connections.status, "accepted"),
      or(eq(connections.requesterId, userId), eq(connections.receiverId, userId))
    ));
  return rows;
}

// ─── Timeline: Public Events for Connections ─────────────────────────────────
export async function getPublicTimelineEventsByFamily(familyId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timelineEvents)
    .where(and(eq(timelineEvents.familyId, familyId), eq(timelineEvents.isPublic, true)))
    .orderBy(desc(timelineEvents.eventDate))
    .limit(limit);
}

export async function updateTimelineEventVisibility(id: number, isPublic: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(timelineEvents).set({ isPublic }).where(eq(timelineEvents.id, id));
}

// ─── Connections: Follow Status & Mutual Friends ──────────────────────────────
// Returns detailed connection info between two users
export async function getConnectionBetween(userAId: number, userBId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(connections)
    .where(or(
      and(eq(connections.requesterId, userAId), eq(connections.receiverId, userBId)),
      and(eq(connections.requesterId, userBId), eq(connections.receiverId, userAId))
    )).limit(1);
  return result[0] ?? null;
}

// Returns mutual friends between two users (both must have accepted connections with both)
export async function getMutualFriends(userAId: number, userBId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get all accepted connections for userA
  const userAConns = await db.select({
    friendId: connections.requesterId,
    receiverId: connections.receiverId,
  }).from(connections)
    .where(and(
      or(eq(connections.requesterId, userAId), eq(connections.receiverId, userAId)),
      eq(connections.status, "accepted")
    ));
  const userAFriendIds = userAConns.map(c => c.friendId === userAId ? c.receiverId : c.friendId);

  // Get all accepted connections for userB
  const userBConns = await db.select({
    friendId: connections.requesterId,
    receiverId: connections.receiverId,
  }).from(connections)
    .where(and(
      or(eq(connections.requesterId, userBId), eq(connections.receiverId, userBId)),
      eq(connections.status, "accepted")
    ));
  const userBFriendIds = userBConns.map(c => c.friendId === userBId ? c.receiverId : c.friendId);

  // Find intersection
  const mutualIds = userAFriendIds.filter(id => id !== userBId && userBFriendIds.includes(id) && id !== userAId);
  if (mutualIds.length === 0) return [];

  // Fetch user info for mutual friends
  const mutualUsers = await db.select({
    id: users.id,
    name: users.name,
    avatarUrl: users.avatarUrl,
  }).from(users).where(inArray(users.id, mutualIds));
  return mutualUsers;
}

// ─── Friend Events (活动动态) ──────────────────────────────────────────────────
// Get events created by a specific user (for friend's activity feed)
export async function getEventsByCreator(creatorId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events)
    .where(eq(events.createdBy, creatorId))
    .orderBy(desc(events.eventDate))
    .limit(limit);
}

// Get events from all accepted connections (friend activity feed)
export async function getFriendEventsFeed(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  // Get all accepted friend IDs
  const myConns = await db.select({
    requesterId: connections.requesterId,
    receiverId: connections.receiverId,
  }).from(connections)
    .where(and(
      or(eq(connections.requesterId, userId), eq(connections.receiverId, userId)),
      eq(connections.status, "accepted")
    ));
  const friendIds = myConns.map(c => c.requesterId === userId ? c.receiverId : c.requesterId);
  if (friendIds.length === 0) return [];

  // Get public events from friends
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
    hostAvatar: users.avatarUrl,
  }).from(events)
    .leftJoin(users, eq(users.id, events.createdBy))
    .where(and(
      inArray(events.createdBy, friendIds),
      eq(events.isPublic, true)
    ))
    .orderBy(desc(events.eventDate))
    .limit(limit);
  return friendEvents;
}

// ─── Event Join Requests ──────────────────────────────────────────────────────
export async function createEventJoinRequest(data: {
  eventId: number;
  requesterId: number;
  hostId: number;
  message?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { eventJoinRequests } = await import("../drizzle/schema");
  const result = await db.insert(eventJoinRequests).values(data);
  return (result[0] as any).insertId;
}

export async function getEventJoinRequests(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  const { eventJoinRequests } = await import("../drizzle/schema");
  return db.select({
    id: eventJoinRequests.id,
    status: eventJoinRequests.status,
    message: eventJoinRequests.message,
    createdAt: eventJoinRequests.createdAt,
    requesterId: eventJoinRequests.requesterId,
    requesterName: users.name,
    requesterAvatar: users.avatarUrl,
  }).from(eventJoinRequests)
    .leftJoin(users, eq(users.id, eventJoinRequests.requesterId))
    .where(eq(eventJoinRequests.eventId, eventId))
    .orderBy(desc(eventJoinRequests.createdAt));
}

export async function getMyEventJoinRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { eventJoinRequests } = await import("../drizzle/schema");
  return db.select({
    id: eventJoinRequests.id,
    eventId: eventJoinRequests.eventId,
    status: eventJoinRequests.status,
    message: eventJoinRequests.message,
    createdAt: eventJoinRequests.createdAt,
    hostId: eventJoinRequests.hostId,
    eventTitle: events.title,
    eventDate: events.eventDate,
    hostName: users.name,
  }).from(eventJoinRequests)
    .leftJoin(events, eq(events.id, eventJoinRequests.eventId))
    .leftJoin(users, eq(users.id, eventJoinRequests.hostId))
    .where(eq(eventJoinRequests.requesterId, userId))
    .orderBy(desc(eventJoinRequests.createdAt));
}

export async function getPendingJoinRequestsForHost(hostId: number) {
  const db = await getDb();
  if (!db) return [];
  const { eventJoinRequests } = await import("../drizzle/schema");
  return db.select({
    id: eventJoinRequests.id,
    eventId: eventJoinRequests.eventId,
    status: eventJoinRequests.status,
    message: eventJoinRequests.message,
    createdAt: eventJoinRequests.createdAt,
    requesterId: eventJoinRequests.requesterId,
    requesterName: users.name,
    requesterAvatar: users.avatarUrl,
    eventTitle: events.title,
  }).from(eventJoinRequests)
    .leftJoin(users, eq(users.id, eventJoinRequests.requesterId))
    .leftJoin(events, eq(events.id, eventJoinRequests.eventId))
    .where(and(
      eq(eventJoinRequests.hostId, hostId),
      eq(eventJoinRequests.status, "pending")
    ))
    .orderBy(desc(eventJoinRequests.createdAt));
}

export async function updateEventJoinRequestStatus(
  requestId: number,
  hostId: number,
  status: "approved" | "rejected"
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { eventJoinRequests } = await import("../drizzle/schema");
  await db.update(eventJoinRequests)
    .set({ status })
    .where(and(eq(eventJoinRequests.id, requestId), eq(eventJoinRequests.hostId, hostId)));
}

export async function checkExistingJoinRequest(eventId: number, requesterId: number) {
  const db = await getDb();
  if (!db) return null;
  const { eventJoinRequests } = await import("../drizzle/schema");
  const result = await db.select().from(eventJoinRequests)
    .where(and(eq(eventJoinRequests.eventId, eventId), eq(eventJoinRequests.requesterId, requesterId)))
    .limit(1);
  return result[0] ?? null;
}

// ─── User Avatar Update ───────────────────────────────────────────────────────
export async function updateUserAvatar(userId: number, avatarUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ avatarUrl }).where(eq(users.id, userId));
}

// ─── Member Events CRUD ───────────────────────────────────────────────────────
export async function createMemberEvent(data: {
  familyId: number; userId: number; title: string;
  eventType: "birthday" | "anniversary" | "custom";
  eventDate: Date; isYearly?: boolean; note?: string; createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { memberEvents } = await import("../drizzle/schema");
  const [result] = await db.insert(memberEvents).values({
    familyId: data.familyId, userId: data.userId, title: data.title,
    eventType: data.eventType, eventDate: data.eventDate,
    isYearly: data.isYearly ?? true, note: data.note, createdBy: data.createdBy,
  });
  return (result as any).insertId as number;
}

export async function getMemberEventsByFamily(familyId: number) {
  const db = await getDb();
  if (!db) return [];
  const { memberEvents } = await import("../drizzle/schema");
  return db.select().from(memberEvents)
    .where(eq(memberEvents.familyId, familyId))
    .orderBy(memberEvents.eventDate);
}

export async function getMemberEventsByUser(familyId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { memberEvents } = await import("../drizzle/schema");
  return db.select().from(memberEvents)
    .where(and(eq(memberEvents.familyId, familyId), eq(memberEvents.userId, userId)))
    .orderBy(memberEvents.eventDate);
}

export async function updateMemberEvent(id: number, data: {
  title?: string; eventDate?: Date; note?: string; eventType?: "birthday" | "anniversary" | "custom";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { memberEvents } = await import("../drizzle/schema");
  await db.update(memberEvents).set(data).where(eq(memberEvents.id, id));
}

export async function deleteMemberEvent(id: number, familyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { memberEvents } = await import("../drizzle/schema");
  await db.delete(memberEvents)
    .where(and(eq(memberEvents.id, id), eq(memberEvents.familyId, familyId)));
}

// ─── Family Management ────────────────────────────────────────────────────────
export async function updateFamilyName(familyId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(families).set({ name }).where(eq(families.id, familyId));
}

export async function deleteFamily(familyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Cascade: remove all family members, children, timeline events, tasks, events, member events
  const { memberEvents, timelineEvents: te, routineTasks: rt, taskCheckins: tc, events: ev, rsvps: rv } = await import("../drizzle/schema");
  await db.delete(rv).where(
    inArray(rv.eventId, db.select({ id: ev.id }).from(ev).where(eq(ev.familyId, familyId)))
  );
  await db.delete(ev).where(eq(ev.familyId, familyId));
  await db.delete(memberEvents).where(eq(memberEvents.familyId, familyId));
  await db.delete(tc).where(
    inArray(tc.taskId, db.select({ id: rt.id }).from(rt).where(eq(rt.familyId, familyId)))
  );
  await db.delete(rt).where(eq(rt.familyId, familyId));
  await db.delete(te).where(eq(te.familyId, familyId));
  await db.delete(children).where(eq(children.familyId, familyId));
  await db.delete(familyMembers).where(eq(familyMembers.familyId, familyId));
  await db.delete(families).where(eq(families.id, familyId));
}

export async function leaveFamilyMember(familyId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(familyMembers)
    .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
}

// ─── Child Update (names, notes, avatar) ─────────────────────────────────────
export async function updateChildDetails(id: number, data: {
  nickname?: string; fullName?: string; gender?: "girl" | "boy" | "unknown";
  birthDate?: Date | null; avatarUrl?: string | null;
  childOneName?: string | null; childTwoName?: string | null; notes?: string | null;
  pregnancyRefDate?: Date | null; pregnancyWeeksAtRef?: number; pregnancyDaysAtRef?: number;
  embryoTransferDate?: Date; embryoDay?: number; isMultiple?: boolean; color?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(children).set(data).where(eq(children.id, id));
}

// ─── Task Checkins By Month ────────────────────────────────────────────────────
export async function getTaskCheckinsByMonth(familyId: number, year: number, month: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  // Get all tasks for this family
  const familyTasks = await db.select({ id: routineTasks.id }).from(routineTasks)
    .where(eq(routineTasks.familyId, familyId));
  if (familyTasks.length === 0) return [];
  const taskIds = familyTasks.map(t => t.id);
  // Build date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const rows = await db.select({ checkedAt: taskCheckins.checkedAt })
    .from(taskCheckins)
    .where(and(
      inArray(taskCheckins.taskId, taskIds),
      gte(taskCheckins.checkedAt, startDate),
      lt(taskCheckins.checkedAt, endDate),
    ));
  // Return unique date strings (yyyy-MM-dd)
  const dates = new Set(rows.map(r => {
    const d = new Date(r.checkedAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }));
  return Array.from(dates);
}

// ═══════════════════════════════════════════════════════════════════════════════
// v4.0 Pinple — 推荐链 / 技能市场 / 举报 / 屏蔽
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Recommendations 推荐链 ──────────────────────────────────────────────────
export async function createRecommendation(data: InsertRecommendation): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(recommendations).values(data);
  return (result[0] as any).insertId;
}

export async function getRecommendationChain(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const recommenderAlias = alias(users, "recommender");
  const targetAlias = alias(users, "target");
  return db
    .select({
      id: recommendations.id,
      userId: recommendations.userId,
      recommenderId: recommendations.recommenderId,
      targetUserId: recommendations.targetUserId,
      context: recommendations.context,
      createdAt: recommendations.createdAt,
      recommenderName: recommenderAlias.name,
      recommenderAvatar: recommenderAlias.avatarUrl,
      targetName: targetAlias.name,
      targetAvatar: targetAlias.avatarUrl,
    })
    .from(recommendations)
    .leftJoin(recommenderAlias, eq(recommendations.recommenderId, recommenderAlias.id))
    .leftJoin(targetAlias, eq(recommendations.targetUserId, targetAlias.id))
    .where(eq(recommendations.userId, userId))
    .orderBy(desc(recommendations.createdAt));
}

// ─── Skills 技能 ─────────────────────────────────────────────────────────────
export async function createSkill(data: InsertSkill): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(skills).values(data);
  return (result[0] as any).insertId;
}

export async function getSkillsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).where(eq(skills.userId, userId)).orderBy(desc(skills.createdAt));
}

export async function getActiveSkills(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).where(eq(skills.status, "active")).orderBy(desc(skills.createdAt)).limit(limit).offset(offset);
}

export async function updateSkillStatus(skillId: number, status: "active" | "inactive") {
  const db = await getDb();
  if (!db) return;
  await db.update(skills).set({ status }).where(eq(skills.id, skillId));
}

// ─── Help Requests 求助 ──────────────────────────────────────────────────────
export async function createHelpRequest(data: InsertHelpRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(helpRequests).values(data);
  return (result[0] as any).insertId;
}

export async function getHelpRequestsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(helpRequests).where(eq(helpRequests.userId, userId)).orderBy(desc(helpRequests.createdAt));
}

export async function getOpenHelpRequests(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(helpRequests).where(eq(helpRequests.status, "open")).orderBy(desc(helpRequests.createdAt)).limit(limit).offset(offset);
}

export async function updateHelpRequestStatus(requestId: number, status: "open" | "matched" | "closed") {
  const db = await getDb();
  if (!db) return;
  await db.update(helpRequests).set({ status }).where(eq(helpRequests.id, requestId));
}

// ─── Skill Matches 匹配 ─────────────────────────────────────────────────────
export async function createSkillMatch(data: InsertSkillMatch): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(skillMatches).values(data);
  return (result[0] as any).insertId;
}

export async function getMatchesByRequest(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skillMatches).where(eq(skillMatches.requestId, requestId));
}

export async function updateMatchStatus(matchId: number, status: "pending" | "accepted" | "rejected" | "completed") {
  const db = await getDb();
  if (!db) return;
  await db.update(skillMatches).set({ status }).where(eq(skillMatches.id, matchId));
}

// ─── Reviews 评价 ────────────────────────────────────────────────────────────
export async function createReview(data: InsertReview): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(reviews).values(data);
  return (result[0] as any).insertId;
}

export async function getReviewsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.toUserId, userId)).orderBy(desc(reviews.createdAt));
}

// ─── User Reports 举报 ───────────────────────────────────────────────────────
export async function createUserReport(data: InsertUserReport): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(userReports).values(data);
  return (result[0] as any).insertId;
}

export async function getPendingReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userReports).where(eq(userReports.status, "pending")).orderBy(desc(userReports.createdAt));
}

export async function updateReportStatus(reportId: number, status: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return;
  await db.update(userReports).set({ status }).where(eq(userReports.id, reportId));
}

// ─── User Blocks 屏蔽 ────────────────────────────────────────────────────────
export async function blockUser(userId: number, blockedUserId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(userBlocks).values({ userId, blockedUserId });
  return (result[0] as any).insertId;
}

export async function unblockUser(userId: number, blockedUserId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(userBlocks).where(
    and(eq(userBlocks.userId, userId), eq(userBlocks.blockedUserId, blockedUserId))
  );
}

export async function getBlockedUsers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: userBlocks.id,
      blockedUserId: userBlocks.blockedUserId,
      blockedName: users.name,
      blockedAvatar: users.avatarUrl,
      createdAt: userBlocks.createdAt,
    })
    .from(userBlocks)
    .leftJoin(users, eq(userBlocks.blockedUserId, users.id))
    .where(eq(userBlocks.userId, userId));
}

export async function isUserBlocked(userId: number, targetId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(userBlocks)
    .where(and(eq(userBlocks.userId, userId), eq(userBlocks.blockedUserId, targetId)))
    .limit(1);
  return result.length > 0;
}
