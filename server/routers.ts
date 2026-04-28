import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { runChildAutoGeneration } from "./_core/auto-generate";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  sendEmail,
  hasEmailProvider,
  buildPasswordResetEmail,
} from "./_core/email";
import {
  addFamilyMember,
  createChild,
  createEvent,
  createFamily,
  createRoutineTask,
  createRsvp,
  createTaskCheckin,
  createTimelineEvent,
  deleteChild,
  deleteRoutineTask,
  deleteTimelineEvent,
  updateTimelineEvent,
  getAllMilestoneTemplates,
  getChildById,
  getChildrenByFamily,
  getEventByToken,
  getEventById,
  getEventsByFamily,
  getUpcomingTimelineByFamily,
  getFamilyByInviteCode,
  getFamilyById,
  getFamilyMembers,
  getMemberRole,
  getMilestonesByAge,
  getRsvpsByEvent,
  getRoutineTasks,
  getTaskCheckins,
  getTimelineEvents,
  getTodayCheckins,
  getUserFamilies,
  removeFamilyMember,
  updateChild,
  setChildShareCard,
  getChildByShareToken,
  updateEvent,
  updateFamily,
  updateMemberDates,
  updateMemberRole,
  syncMemberYearlyEvent,
  updateRoutineTask,
  updateUserBirthDate,
  updateUserProfile,
  sendConnectionRequest,
  acceptConnection,
  removeConnection,
  getMyConnections,
  getPendingRequests,
  getUserByUserId,
  checkExistingConnection,
  getTaskCheckinsByDate,
  getTaskCheckinHistory,
  getTaskFrequencyStats,
  addTaskCheckinWithValue,
  getTaskCheckinsByMonth,
  updateConnectionCategory,
  clearConnectionUpdate,
  searchUsersByName,
  getAcceptedConnectionsWithCategory,
  getPublicTimelineEventsByFamily,
  updateTimelineEventVisibility,
  getConnectionBetween,
  getMutualFriends,
  getFriendEventsFeed,
  createEventJoinRequest,
  getEventJoinRequests,
  getMyEventJoinRequests,
  getPendingJoinRequestsForHost,
  updateEventJoinRequestStatus,
  checkExistingJoinRequest,
  updateUserAvatar,
  createMemberEvent,
  getMemberEventsByFamily,
  getMemberEventsByUser,
  updateMemberEvent,
  deleteMemberEvent,
  updateFamilyName,
  deleteFamily,
  leaveFamilyMember,
  updateChildDetails,
  addEventImage,
    getEventImages,
    deleteEventImage,
    getUserByEmail,
    createEmailUser,
    updateUserCreditScore,
    getUserCreditScore,
    updateUserPassword,
    createPasswordResetToken,
    getValidPasswordResetToken,
    markPasswordResetTokenUsed,
    createRecommendation,
    getRecommendationChain,
    createSkill,
    getSkillsByUser,
    getActiveSkills,
    updateSkillStatus,
    createHelpRequest,
    getHelpRequestsByUser,
    getOpenHelpRequests,
    updateHelpRequestStatus,
    createSkillMatch,
    getMatchesByRequest,
    updateMatchStatus,
    createReview,
    getReviewsForUser,
    createUserReport,
    getPendingReports,
    updateReportStatus,
    blockUser,
    unblockUser,
    getBlockedUsers,
    isUserBlocked,
  } from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcEDD(transferDate: Date, embryoDay: number = 5): { lmp: Date; edd: Date; twin37w: Date } {
  // IVF: LMP = transfer date - (embryo day + 14) days
  const daysBack = embryoDay + 14;
  const lmp = new Date(transferDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000); // 40w
  const twin37w = new Date(lmp.getTime() + 259 * 24 * 60 * 60 * 1000); // 37w
  return { lmp, edd, twin37w };
}

function calcAge(birthDate: Date): { years: number; months: number; days: number; totalMonths: number } {
  const now = new Date();
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

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function getAppOrigin(req: { headers: { host?: string; "x-forwarded-host"?: string | string[]; "x-forwarded-proto"?: string | string[] } }): string {
  const forwardedHost = Array.isArray(req.headers["x-forwarded-host"])
    ? req.headers["x-forwarded-host"][0]
    : req.headers["x-forwarded-host"];
  const host = forwardedHost || req.headers.host || "localhost";
  const forwardedProto = Array.isArray(req.headers["x-forwarded-proto"])
    ? req.headers["x-forwarded-proto"][0]
    : req.headers["x-forwarded-proto"];
  const proto = forwardedProto || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function assertFamilyAdmin(familyId: number, userId: number) {
  const member = await getMemberRole(familyId, userId);
  if (!member || member.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
}

async function assertFamilyMember(familyId: number, userId: number) {
  const member = await getMemberRole(familyId, userId);
  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN", message: "您不是该家庭成员" });
  }
  return member;
}

async function assertFamilyCollaboratorOrAdmin(familyId: number, userId: number) {
  const member = await getMemberRole(familyId, userId);
  if (!member || member.role === "observer") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要协作者或管理员权限" });
  }
  return member;
}

// ─── Default Routine Tasks ────────────────────────────────────────────────────
const DEFAULT_TASKS = [
  { title: "产检记录", category: "checkup" as const, icon: "🩺", color: "#6366f1", repeatRule: "weekly" },
  { title: "孕期运动", category: "play" as const, icon: "🧘", color: "#a855f7", repeatRule: "daily" },
  { title: "补充叶酸", category: "feeding" as const, icon: "💊", color: "#22d3ee", repeatRule: "daily" },
  { title: "体重记录", category: "checkup" as const, icon: "⚖️", color: "#34D399", repeatRule: "weekly" },
];

// ─── Default Milestone Templates ──────────────────────────────────────────────
const DEFAULT_MILESTONES = [
  { ageMonthMin: 0, ageMonthMax: 1, title: "新生儿期：注意保暖与喂养", description: "每2-3小时喂奶一次，注意脐带护理，避免强光刺激眼睛。", category: "development" as const },
  { ageMonthMin: 0, ageMonthMax: 2, title: "乙肝疫苗第一针", description: "出生后24小时内接种乙肝疫苗第一针，同时接种卡介苗。", category: "vaccination" as const },
  { ageMonthMin: 1, ageMonthMax: 2, title: "开始追视与追声", description: "宝宝开始能追视移动物体，对声音有反应，可以尝试黑白卡刺激视觉。", category: "development" as const },
  { ageMonthMin: 2, ageMonthMax: 3, title: "社交性微笑出现", description: "宝宝开始出现社交性微笑，能认出熟悉的面孔，多和宝宝说话互动。", category: "development" as const },
  { ageMonthMin: 2, ageMonthMax: 3, title: "百白破+脊灰疫苗第一针", description: "2月龄接种百白破疫苗和脊灰疫苗第一针。", category: "vaccination" as const },
  { ageMonthMin: 3, ageMonthMax: 4, title: "抬头训练", description: "宝宝趴着时能抬头45度，可以开始Tummy Time练习，每次5-10分钟。", category: "development" as const },
  { ageMonthMin: 4, ageMonthMax: 6, title: "翻身里程碑", description: "大多数宝宝在4-6月龄学会翻身，注意床边安全防护。", category: "development" as const },
  { ageMonthMin: 6, ageMonthMax: 7, title: "开始添加辅食", description: "6月龄起可以开始添加辅食，从米糊、蔬菜泥开始，每次只引入一种新食物。", category: "nutrition" as const },
  { ageMonthMin: 6, ageMonthMax: 8, title: "坐立里程碑", description: "宝宝开始能独坐，可以提供安全的坐立环境，注意不要久坐。", category: "development" as const },
  { ageMonthMin: 8, ageMonthMax: 10, title: "爬行里程碑", description: "大多数宝宝在8-10月龄开始爬行，确保地面安全，移除危险物品。", category: "development" as const },
  { ageMonthMin: 9, ageMonthMax: 12, title: "扶站与学步", description: "宝宝开始扶物站立，可以准备学步鞋，注意家具边角防护。", category: "development" as const },
  { ageMonthMin: 12, ageMonthMax: 18, title: "独立行走", description: "大多数宝宝在12-18月龄学会独立行走，鼓励多走路，注意防跌倒。", category: "development" as const },
  { ageMonthMin: 12, ageMonthMax: 13, title: "1岁体检", description: "1岁体检包括身高体重、发育评估、血常规检查，建议同时接种麻腮风疫苗。", category: "checkup" as const },
];

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8).max(100),
        name: z.string().min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "该邮箱已注册" });

        const passwordHash = await sha256Hex(input.password);
        const openId = `email_${nanoid(16)}`;
        const userId = await createEmailUser({
          email: input.email,
          name: input.name,
          passwordHash,
          openId,
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.name,
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        // Return the full user so the client can skip an extra auth.me roundtrip.
        // On a cold start this saves ~20s because the follow-up call might
        // otherwise land on a different lambda and re-trigger schema bootstrap.
        const { getUserById } = await import("./db");
        const user = await getUserById(userId);
        return { userId, success: true, user };
      }),

    // 通用登录：identifier 可以是邮箱（含 @）或数字用户 ID
    loginWithIdentifier: publicProcedure
      .input(z.object({
        identifier: z.string().min(1).max(320),
        password: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const identifier = input.identifier.trim();
        let user: Awaited<ReturnType<typeof getUserByEmail>> | undefined;
        if (identifier.includes("@")) {
          user = await getUserByEmail(identifier);
        } else if (/^\d+$/.test(identifier)) {
          const { getUserById } = await import("./db");
          user = await getUserById(Number(identifier));
        } else {
          // 兜底：按 openId 查找（便于内部迁移账号登录）
          const { getUserByOpenId } = await import("./db");
          user = await getUserByOpenId(identifier);
        }
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "账号或密码错误" });
        }

        const passwordHash = await sha256Hex(input.password);
        if (passwordHash !== user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "账号或密码错误" });
        }

        const creditScore = await getUserCreditScore(user.id);
        if (creditScore < 10) {
          throw new TRPCError({ code: "FORBIDDEN", message: "您的信用分过低，无法登录" });
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { userId: user.id, success: true, user };
      }),

    // 兼容旧前端：保留 loginWithEmail 作为 loginWithIdentifier 的薄包装
    loginWithEmail: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "邮箱或密码错误" });
        }
        const passwordHash = await sha256Hex(input.password);
        if (passwordHash !== user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "邮箱或密码错误" });
        }
        const creditScore = await getUserCreditScore(user.id);
        if (creditScore < 10) {
          throw new TRPCError({ code: "FORBIDDEN", message: "您的信用分过低，无法登录" });
        }
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { userId: user.id, success: true };
      }),

    // 请求通过邮箱找回密码。始终返回 { sent: true } 以避免账号枚举。
    // 若未配置 RESEND_API_KEY，会在返回值里附带 resetUrl（仅开发/过渡用途）。
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        const EXPIRES_MINUTES = 30;
        const user = await getUserByEmail(input.email);
        // 不论用户是否存在，都"假装"已发送，防止枚举
        if (!user) {
          return { sent: true as const, emailed: false, resetUrl: null as string | null };
        }

        const token = nanoid(48);
        const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000);
        try {
          await createPasswordResetToken({ userId: user.id, token, expiresAt });
        } catch (err) {
          console.error("[auth] 创建重置 token 失败：", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "服务异常，请稍后重试" });
        }

        const origin = getAppOrigin(ctx.req);
        const resetUrl = `${origin}/?reset_token=${encodeURIComponent(token)}`;
        const { subject, html, text } = buildPasswordResetEmail({
          name: user.name || "",
          resetUrl,
          expiresMinutes: EXPIRES_MINUTES,
        });

        const result = await sendEmail({ to: input.email, subject, html, text });
        // 已配置邮件服务：仅返回 sent，永不回显链接
        if (hasEmailProvider()) {
          return { sent: true as const, emailed: result.sent, resetUrl: null as string | null };
        }
        // 未配置邮件服务：把 resetUrl 回传，前端可直接展示给用户（过渡方案）
        return { sent: true as const, emailed: false, resetUrl };
      }),

    // 用 token 重置密码
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(10).max(200),
        newPassword: z.string().min(8).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const record = await getValidPasswordResetToken(input.token);
        if (!record) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "链接已失效，请重新申请找回密码" });
        }
        const passwordHash = await sha256Hex(input.newPassword);
        await updateUserPassword(record.userId, passwordHash);
        await markPasswordResetTokenUsed(record.id);

        // 重置成功后直接签发会话，免去再次登录
        const { getUserById } = await import("./db");
        const user = await getUserById(record.userId);
        if (user) {
          const sessionToken = await sdk.createSessionToken(user.openId, {
            name: user.name || "",
            expiresInMs: ONE_YEAR_MS,
          });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        }
        return { success: true as const };
      }),
  }),

  // ─── Family ──────────────────────────────────────────────────────────────
  family: router({
    myFamilies: protectedProcedure.query(async ({ ctx }) => {
      return getUserFamilies(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const inviteCode = nanoid(8).toUpperCase();
        const familyId = await createFamily({
          name: input.name,
          description: input.description,
          createdBy: ctx.user.id,
          inviteCode,
        });
        await addFamilyMember({ familyId, userId: ctx.user.id, role: "admin" });
        // Create default routine tasks
        for (const task of DEFAULT_TASKS) {
          await createRoutineTask({ ...task, familyId, createdBy: ctx.user.id });
        }
        // Create default welcome event (pre-birth celebration)
        const welcomeEventDate = new Date();
        welcomeEventDate.setMonth(welcomeEventDate.getMonth() + 6);
        const welcomeToken = nanoid(16);
        const welcomeEventId = await createEvent({
          familyId,
          title: "🎉 宝宝降临庆祝会",
          description: "期待宝宝的到来！家人朋友们一起来庆祝这个美好时刻，分享喜悦与祝福。",
          location: "待定",
          eventDate: welcomeEventDate,
          inviteToken: welcomeToken,
          isPublic: true,
          createdBy: ctx.user.id,
        });
        // Add sample RSVPs
        await createRsvp({ eventId: welcomeEventId, guestName: "奶奶", status: "attending", note: "一定到！带了大红包 🧧" });
        await createRsvp({ eventId: welcomeEventId, guestName: "外婆", status: "attending", note: "提前准备好了小礼物 🎁" });
        await createRsvp({ eventId: welcomeEventId, guestName: "姑姑", status: "attending", note: "我来帮忙布置场地！" });
        await createRsvp({ eventId: welcomeEventId, guestName: "好朋友小李", status: "maybe", note: "尽量赶过来，看看能不能请到假" });
        await createRsvp({ eventId: welcomeEventId, guestName: "同事小王", status: "declined", note: "那天有出差，提前送上祝福！" });
        // Seed milestone templates if not exist
        const existing = await getAllMilestoneTemplates();
        if (existing.length === 0) {
          const { getDb } = await import("./db");
          const db = await getDb();
          if (db) {
            const { milestoneTemplates } = await import("../drizzle/schema");
            await db.insert(milestoneTemplates).values(DEFAULT_MILESTONES);
          }
        }
        return { familyId, inviteCode };
      }),

    join: protectedProcedure
      .input(z.object({ inviteCode: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const family = await getFamilyByInviteCode(input.inviteCode.toUpperCase());
        if (!family) throw new TRPCError({ code: "NOT_FOUND", message: "邀请码无效" });
        const existing = await getMemberRole(family.id, ctx.user.id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "您已经是该家庭成员" });
        await addFamilyMember({ familyId: family.id, userId: ctx.user.id, role: "observer" });
        return { familyId: family.id };
      }),

    get: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        return getFamilyById(input.familyId);
      }),

    update: protectedProcedure
      .input(z.object({ familyId: z.number(), name: z.string().optional(), description: z.string().optional(), coverUrl: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyAdmin(input.familyId, ctx.user.id);
        const { familyId, ...data } = input;
        await updateFamily(familyId, data);
        return { success: true };
      }),

    members: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        return getFamilyMembers(input.familyId);
      }),

    updateMemberRole: protectedProcedure
      .input(z.object({ familyId: z.number(), userId: z.number(), role: z.enum(["admin", "collaborator", "observer"]) }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyAdmin(input.familyId, ctx.user.id);
        // 防止把最后一个 admin 降级为非 admin：会让家庭没有管理员
        if (input.role !== "admin") {
          const members = await getFamilyMembers(input.familyId);
          const admins = members.filter((m: any) => m.role === "admin");
          const isTargetAdmin = admins.some((m: any) => m.userId === input.userId);
          if (isTargetAdmin && admins.length === 1) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "至少需要保留一名管理员，请先将管理员权限转让给其他成员",
            });
          }
        }
        await updateMemberRole(input.familyId, input.userId, input.role);
        return { success: true };
      }),

    removeMember: protectedProcedure
      .input(z.object({ familyId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyAdmin(input.familyId, ctx.user.id);
        // 防止移除最后一个 admin
        const members = await getFamilyMembers(input.familyId);
        const target = members.find((m: any) => m.userId === input.userId);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "该成员不存在" });
        }
        if (target.role === "admin") {
          const admins = members.filter((m: any) => m.role === "admin");
          if (admins.length === 1) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "不能移除最后一名管理员，请先转让管理员权限",
            });
          }
        }
        await removeFamilyMember(input.familyId, input.userId);
        return { success: true };
      }),

    updateMemberDates: protectedProcedure
      .input(z.object({
        familyId: z.number(),
        userId: z.number(),
        birthDate: z.string().optional().nullable(),
        anniversaryDate: z.string().optional().nullable(),
        nickname: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        const myRole = await getMemberRole(input.familyId, ctx.user.id);
        if (input.userId !== ctx.user.id && myRole?.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '只有管理员可以修改其他成员信息' });
        }
        const birthDate =
          input.birthDate ? new Date(input.birthDate) :
          input.birthDate === null ? null : undefined;
        const anniversaryDate =
          input.anniversaryDate ? new Date(input.anniversaryDate) :
          input.anniversaryDate === null ? null : undefined;
        await updateMemberDates(input.familyId, input.userId, {
          birthDate,
          anniversaryDate,
          nickname: input.nickname,
        });

        // 生日/纪念日年循环事件自动同步
        const member = (await getFamilyMembers(input.familyId)).find(
          (m: any) => m.userId === input.userId,
        );
        const displayName =
          input.nickname ??
          (member as any)?.nickname ??
          (member as any)?.user?.name ??
          "家人";
        if (birthDate !== undefined) {
          try {
            await syncMemberYearlyEvent({
              familyId: input.familyId,
              userId: input.userId,
              eventType: "birthday",
              title: `${displayName} 的生日`,
              date: birthDate,
              createdBy: ctx.user.id,
            });
          } catch (err) {
            console.warn("[family.updateMemberDates] sync birthday failed:", err);
          }
        }
        if (anniversaryDate !== undefined) {
          try {
            await syncMemberYearlyEvent({
              familyId: input.familyId,
              userId: input.userId,
              eventType: "anniversary",
              title: `${displayName} 的纪念日`,
              date: anniversaryDate,
              createdBy: ctx.user.id,
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
    updateMember: protectedProcedure
      .input(z.object({
        familyId: z.number(),
        userId: z.number(),
        role: z.enum(["admin", "collaborator", "observer"]).optional(),
        nickname: z.string().optional().nullable(),
        birthDate: z.string().optional().nullable(),
        anniversaryDate: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        const myRole = await getMemberRole(input.familyId, ctx.user.id);
        const isSelf = input.userId === ctx.user.id;
        const isAdmin = myRole?.role === "admin";

        // 角色变更必须由 admin 完成
        if (input.role !== undefined) {
          if (!isAdmin) {
            throw new TRPCError({ code: "FORBIDDEN", message: "只有管理员可以修改角色" });
          }
          if (input.role !== "admin") {
            const members = await getFamilyMembers(input.familyId);
            const admins = members.filter((m: any) => m.role === "admin");
            const isTargetAdmin = admins.some((m: any) => m.userId === input.userId);
            if (isTargetAdmin && admins.length === 1) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "至少需要保留一名管理员",
              });
            }
          }
          await updateMemberRole(input.familyId, input.userId, input.role);
        }

        // 昵称/生日/纪念日可由本人或 admin 修改
        if (
          input.nickname !== undefined ||
          input.birthDate !== undefined ||
          input.anniversaryDate !== undefined
        ) {
          if (!isSelf && !isAdmin) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "只有管理员可以修改他人的信息",
            });
          }
          const birthDate =
            input.birthDate ? new Date(input.birthDate) :
            input.birthDate === null ? null : undefined;
          const anniversaryDate =
            input.anniversaryDate ? new Date(input.anniversaryDate) :
            input.anniversaryDate === null ? null : undefined;
          await updateMemberDates(input.familyId, input.userId, {
            birthDate,
            anniversaryDate,
            nickname: input.nickname,
          });

          const member = (await getFamilyMembers(input.familyId)).find(
            (m: any) => m.userId === input.userId,
          );
          const displayName =
            input.nickname ??
            (member as any)?.nickname ??
            (member as any)?.user?.name ??
            "家人";
          if (birthDate !== undefined) {
            try {
              await syncMemberYearlyEvent({
                familyId: input.familyId,
                userId: input.userId,
                eventType: "birthday",
                title: `${displayName} 的生日`,
                date: birthDate,
                createdBy: ctx.user.id,
              });
            } catch {}
          }
          if (anniversaryDate !== undefined) {
            try {
              await syncMemberYearlyEvent({
                familyId: input.familyId,
                userId: input.userId,
                eventType: "anniversary",
                title: `${displayName} 的纪念日`,
                date: anniversaryDate,
                createdBy: ctx.user.id,
              });
            } catch {}
          }
        }

        return { success: true };
      }),

    rename: protectedProcedure
      .input(z.object({ familyId: z.number(), name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyAdmin(input.familyId, ctx.user.id);
        await updateFamilyName(input.familyId, input.name);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyAdmin(input.familyId, ctx.user.id);
        await deleteFamily(input.familyId);
        return { success: true };
      }),

    leave: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const member = await getMemberRole(input.familyId, ctx.user.id);
        if (!member) throw new TRPCError({ code: 'NOT_FOUND', message: '您不是该家庭成员' });
        if (member.role === 'admin') {
          // Check if there are other admins
          const allMembers = await getFamilyMembers(input.familyId);
          const otherAdmins = allMembers.filter(m => m.userId !== ctx.user.id && m.role === 'admin');
          if (otherAdmins.length === 0 && allMembers.length > 1) {
            throw new TRPCError({ code: 'FORBIDDEN', message: '请先将管理员权限转让给其他成员，再退出家庭' });
          }
        }
        await leaveFamilyMember(input.familyId, ctx.user.id);
        return { success: true };
      }),

    // ─── Member Events ─────────────────────────────────────────────────────
    memberEvents: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        return getMemberEventsByFamily(input.familyId);
      }),

    createMemberEvent: protectedProcedure
      .input(z.object({
        familyId: z.number(), userId: z.number(),
        title: z.string().min(1).max(100),
        eventType: z.enum(['birthday', 'anniversary', 'custom']),
        eventDate: z.string(), // ISO date string
        isYearly: z.boolean().optional(),
        note: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        const id = await createMemberEvent({
          familyId: input.familyId, userId: input.userId,
          title: input.title, eventType: input.eventType,
          eventDate: new Date(input.eventDate),
          isYearly: input.isYearly ?? true,
          note: input.note, createdBy: ctx.user.id,
        });
        return { id };
      }),

    updateMemberEvent: protectedProcedure
      .input(z.object({
        id: z.number(), familyId: z.number(),
        title: z.string().optional(), eventDate: z.string().optional(),
        note: z.string().optional().nullable(),
        eventType: z.enum(['birthday', 'anniversary', 'custom']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        const { id, familyId, ...data } = input;
        await updateMemberEvent(id, {
          ...data,
          eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
          note: data.note ?? undefined,
        });
        return { success: true };
      }),

    deleteMemberEvent: protectedProcedure
      .input(z.object({ id: z.number(), familyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        await deleteMemberEvent(input.id, input.familyId);
        return { success: true };
      }),
  }),

  // ─── Children ─────────────────────────────────────────────────────────────
  children: router({
    list: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .query(async ({ ctx, input }) => {
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

    get: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ ctx, input }) => {
        const child = await getChildById(input.childId);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        await assertFamilyMember(child.familyId, ctx.user.id);
        const ageInfo = child.birthDate ? calcAge(child.birthDate) : null;
        let eddInfo = null;
        if (child.embryoTransferDate) {
          eddInfo = calcEDD(child.embryoTransferDate, child.embryoDay ?? 5);
        }
        let milestones: any[] = [];
        if (ageInfo) {
          milestones = await getMilestonesByAge(ageInfo.totalMonths);
        }
        return { ...child, ageInfo, eddInfo, milestones };
      }),

    create: protectedProcedure
      .input(z.object({
        familyId: z.number(),
        nickname: z.string().min(1).max(50),
        fullName: z.string().optional(),
        gender: z.enum(["girl", "boy", "unknown"]).optional(),
        birthDate: z.string().optional(),
        avatarUrl: z.string().optional(),
        color: z.string().optional(),
        notes: z.string().optional().nullable(),
        embryoTransferDate: z.string().optional(),
        embryoDay: z.number().optional(),
        pregnancyRefDate: z.string().optional(),
        pregnancyWeeksAtRef: z.number().optional(),
        pregnancyDaysAtRef: z.number().optional(),
        isMultiple: z.boolean().optional(),
        childOneName: z.string().optional().nullable(),
        childTwoName: z.string().optional().nullable(),
        childOneGender: z.enum(["girl", "boy", "unknown"]).optional(),
        childTwoGender: z.enum(["girl", "boy", "unknown"]).optional(),
        // 控制是否执行自动生成逻辑（孕期/里程碑/欢迎活动）。默认 true。
        autoGenerate: z.boolean().optional().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyCollaboratorOrAdmin(input.familyId, ctx.user.id);
        const birthDate = input.birthDate ? new Date(input.birthDate) : undefined;
        const pregnancyRefDate = input.pregnancyRefDate
          ? new Date(input.pregnancyRefDate)
          : undefined;

        const { autoGenerate, ...createPayload } = input;

        // 1) 先创建主孩子记录
        const childId = await createChild({
          ...createPayload,
          birthDate,
          embryoTransferDate: input.embryoTransferDate ? new Date(input.embryoTransferDate) : undefined,
          pregnancyRefDate,
        });

        // 2) 如果是双胞胎，再插入第二个 child 记录，
        //    复制孕期参考点以便共享孕期事件生成
        const siblingIds: number[] = [];
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
              embryoTransferDate: input.embryoTransferDate
                ? new Date(input.embryoTransferDate)
                : undefined,
              pregnancyRefDate,
              pregnancyWeeksAtRef: input.pregnancyWeeksAtRef,
              pregnancyDaysAtRef: input.pregnancyDaysAtRef,
              isMultiple: true,
            });
            siblingIds.push(siblingId);
          }
        }

        // 3) 执行自动生成逻辑（可被前端关闭）
        let autoResult: Awaited<ReturnType<typeof runChildAutoGeneration>> | null = null;
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
              pregnancyDaysAtRef: input.pregnancyDaysAtRef,
            });
          } catch (err) {
            // 自动生成失败不应阻塞主创建流程
            console.warn("[children.create] autoGenerate failed:", err);
          }
        }

        return { childId, siblingIds, autoGenerated: autoResult };
      }),
    update: protectedProcedure
      .input(z.object({
        childId: z.number(),
        nickname: z.string().optional(),
        fullName: z.string().optional(),
        gender: z.enum(["girl", "boy", "unknown"]).optional(),
        birthDate: z.string().optional().nullable(),
        avatarUrl: z.string().optional().nullable(),
        color: z.string().optional(),
        embryoTransferDate: z.string().optional(),
        embryoDay: z.number().optional(),
        pregnancyRefDate: z.string().optional().nullable(),
        pregnancyWeeksAtRef: z.number().optional(),
        pregnancyDaysAtRef: z.number().optional(),
        isMultiple: z.boolean().optional(),
        childOneName: z.string().optional().nullable(),
        childTwoName: z.string().optional().nullable(),
        childOneGender: z.enum(["girl", "boy", "unknown"]).optional(),
        childTwoGender: z.enum(["girl", "boy", "unknown"]).optional(),
        notes: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const child = await getChildById(input.childId);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        await assertFamilyCollaboratorOrAdmin(child.familyId, ctx.user.id);
        const { childId, ...data } = input;
        await updateChildDetails(childId, {
          ...data,
          birthDate: data.birthDate ? new Date(data.birthDate) : data.birthDate === null ? null : undefined,
          embryoTransferDate: data.embryoTransferDate ? new Date(data.embryoTransferDate) : undefined,
          pregnancyRefDate: data.pregnancyRefDate ? new Date(data.pregnancyRefDate) : data.pregnancyRefDate === null ? null : undefined,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const child = await getChildById(input.childId);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        await assertFamilyAdmin(child.familyId, ctx.user.id);
        await deleteChild(input.childId, child.familyId);
        return { success: true };
      }),
    calcEDD: publicProcedure
      .input(z.object({ transferDate: z.string(), embryoDay: z.number().default(5) }))
      .query(({ input }) => {
        return calcEDD(new Date(input.transferDate), input.embryoDay);
      }),

    // ─── Share Card ─────────────────────────────────────────────────────
    // 生成或返回孩子的分享名片 token；默认可见范围 = family（仅家庭链接），
    // 可选 public（完全公开）/ connections（仅人脉）。
    shareCard: protectedProcedure
      .input(z.object({
        childId: z.number(),
        visibility: z.enum(["public", "connections", "family"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const child = await getChildById(input.childId);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        await assertFamilyCollaboratorOrAdmin(child.familyId, ctx.user.id);

        const token = (child as any).shareToken || nanoid(16);
        const visibility =
          input.visibility ?? (child as any).shareVisibility ?? "family";
        await setChildShareCard(child.id, {
          shareToken: token,
          shareVisibility: visibility as "public" | "connections" | "family",
        });
        return { token, visibility, shareUrl: `/c/${token}` };
      }),

    revokeShareCard: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const child = await getChildById(input.childId);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        await assertFamilyAdmin(child.familyId, ctx.user.id);
        await setChildShareCard(child.id, { shareToken: null });
        return { success: true };
      }),

    // 公开接口：按 token 读取名片。根据 visibility 返回不同粒度的数据。
    // 调用方如果已登录（ctx.user 存在），visibility='connections' 下会校验
    // 是否为该孩子家庭成员或家庭创建者的人脉好友；否则仅匿名字段可见。
    publicCard: publicProcedure
      .input(z.object({ token: z.string().min(8).max(64) }))
      .query(async ({ ctx, input }) => {
        const child = await getChildByShareToken(input.token);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        const visibility = ((child as any).shareVisibility ?? "family") as
          | "public"
          | "connections"
          | "family";

        const viewerId = (ctx as any)?.user?.id as number | undefined;
        const family = await getFamilyById(child.familyId);

        // 可见性闸门：
        //   public     → 任何人可看基础名片
        //   connections→ 需要是 family 成员或创建者的已接受人脉
        //   family     → 仅家庭成员可看
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
          isMultiple: child.isMultiple,
        };
        if (!allowed) {
          return { ...base, locked: true } as const;
        }
        return {
          ...base,
          fullName: child.fullName,
          birthDate: child.birthDate,
          notes: child.notes,
          locked: false,
        } as const;
      }),
  }),

  // ─── Timeline─────────────────────────────────────────────────────────────
  timeline: router({
    list: protectedProcedure
      .input(z.object({ childId: z.number(), limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        const child = await getChildById(input.childId);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        await assertFamilyMember(child.familyId, ctx.user.id);
        return getTimelineEvents(input.childId, input.limit, input.offset);
      }),

    // Public album view: get public events for a child (for connections/observers)
    publicAlbum: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ ctx, input }) => {
        const child = await getChildById(input.childId);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        // Check if user is family member or has accepted connection with a family member
        const memberRole = await getMemberRole(child.familyId, ctx.user.id);
        if (memberRole) {
          // Family members see all public events
          return getPublicTimelineEventsByFamily(child.familyId, 100);
        }
        // Non-members: only public events
        return getPublicTimelineEventsByFamily(child.familyId, 100);
      }),

    setVisibility: protectedProcedure
      .input(z.object({ eventId: z.number(), isPublic: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await updateTimelineEventVisibility(input.eventId, input.isPublic);
        return { success: true };
      }),

    create: protectedProcedure
      .input(z.object({
        childId: z.number(),
        type: z.enum(["pregnancy", "milestone", "post", "checkup", "vaccination", "system"]),
        title: z.string().min(1).max(200),
        content: z.string().optional(),
        mediaUrls: z.array(z.string()).optional(),
        xiaohongshuUrl: z.string().optional(),
        eventDate: z.string(),
        isPublic: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const child = await getChildById(input.childId);
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });
        await assertFamilyCollaboratorOrAdmin(child.familyId, ctx.user.id);
        const eventId = await createTimelineEvent({
          ...input,
          familyId: child.familyId,
          mediaUrls: input.mediaUrls ? JSON.stringify(input.mediaUrls) : undefined,
          eventDate: new Date(input.eventDate),
          createdBy: ctx.user.id,
        });
        return { eventId };
      }),

    edit: protectedProcedure
      .input(z.object({
        eventId: z.number(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().optional(),
        eventDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { eventId, ...data } = input;
        await updateTimelineEvent(eventId, {
          ...data,
          eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        });
        return { success: true };
      }),
     delete: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTimelineEvent(input.eventId);
        return { success: true };
      }),
    // Fetch URL metadata (for XHS/Xiaohongshu links)
    fetchMeta: protectedProcedure
      .input(z.object({ url: z.string().url() }))
      .query(async ({ ctx, input }) => {
        try {
          const { load } = await import("cheerio");
          const res = await fetch(input.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "zh-CN,zh;q=0.9",
              "Referer": "https://www.xiaohongshu.com/",
            },
            signal: AbortSignal.timeout(8000),
          });
          const html = await res.text();
          const $ = load(html);
          const title =
            $("meta[property='og:title']").attr("content") ||
            $("meta[name='title']").attr("content") ||
            $("title").text() ||
            "";
          const image =
            $("meta[property='og:image']").attr("content") ||
            $("meta[name='image']").attr("content") ||
            $("meta[itemprop='image']").attr("content") ||
            "";
          const description =
            $("meta[property='og:description']").attr("content") ||
            $("meta[name='description']").attr("content") ||
            "";
          return { title: title.trim(), image: image.trim(), description: description.trim(), url: input.url };
        } catch (e) {
          return { title: "", image: "", description: "", url: input.url };
        }
      }),
  }),
  // ─── Routine Tasks ────────────────────────────────────────────────────────
  tasks: router({
    list: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        const tasks = await getRoutineTasks(input.familyId);
        const todayCheckins = await getTodayCheckins(input.familyId);
        return tasks.map((task) => ({
          ...task,
          todayCheckins: todayCheckins.filter((c) => c.taskId === task.id).length,
        }));
      }),

    create: protectedProcedure
      .input(z.object({
        familyId: z.number(),
        childId: z.number().optional(),
        title: z.string().min(1).max(100),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        category: z.enum(["feeding", "sleep", "checkup", "play", "bath", "other"]).optional(),
        repeatRule: z.string().optional(),
        assignedTo: z.number().optional(),
        taskType: z.enum(["frequency", "value"]).optional(),
        valueUnit: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyCollaboratorOrAdmin(input.familyId, ctx.user.id);
        const taskId = await createRoutineTask({ ...input, createdBy: ctx.user.id });
        return { taskId };
      }),

    update: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        category: z.enum(["feeding", "sleep", "checkup", "play", "bath", "other"]).optional(),
        repeatRule: z.string().optional(),
        assignedTo: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { taskId, ...data } = input;
        await updateRoutineTask(taskId, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteRoutineTask(input.taskId);
        return { success: true };
      }),

    checkin: protectedProcedure
      .input(z.object({ taskId: z.number(), childId: z.number().optional(), note: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const checkinId = await createTaskCheckin({ ...input, checkedBy: ctx.user.id });
        return { checkinId };
      }),

    checkins: protectedProcedure
      .input(z.object({ taskId: z.number(), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return getTaskCheckins(input.taskId, input.limit);
      }),
  }),

  // ─── Events ───────────────────────────────────────────────────────────────
  events: router({
    list: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        const eventList = await getEventsByFamily(input.familyId);
        // Attach RSVP counts to each event
        const eventsWithRsvp = await Promise.all(eventList.map(async (event) => {
          const rsvpList = await getRsvpsByEvent(event.id);
          return {
            ...event,
            rsvpAttending: rsvpList.filter((r) => r.status === "attending").length,
            rsvpMaybe: rsvpList.filter((r) => r.status === "maybe").length,
            rsvpDeclined: rsvpList.filter((r) => r.status === "declined").length,
          };
        }));
        return eventsWithRsvp;
      }),

    create: protectedProcedure
      .input(z.object({
        familyId: z.number(),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        location: z.string().optional(),
        locationLat: z.string().optional(),
        locationLng: z.string().optional(),
        coverUrl: z.string().optional(),
        eventDate: z.string(),
        isPublic: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertFamilyCollaboratorOrAdmin(input.familyId, ctx.user.id);
        const inviteToken = nanoid(16);
        const eventId = await createEvent({
          ...input,
          eventDate: new Date(input.eventDate),
          inviteToken,
          createdBy: ctx.user.id,
        });
        return { eventId, inviteToken };
      }),

    update: protectedProcedure
      .input(z.object({
        eventId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        coverUrl: z.string().optional(),
        eventDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { eventId, ...data } = input;
        await updateEvent(eventId, {
          ...data,
          eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        });
        return { success: true };
      }),

    // Public: view event by invite token (no auth required)
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const event = await getEventByToken(input.token);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "活动不存在或链接已失效" });
        const rsvpList = await getRsvpsByEvent(event.id);
        const stats = {
          attending: rsvpList.filter((r) => r.status === "attending").length,
          maybe: rsvpList.filter((r) => r.status === "maybe").length,
          declined: rsvpList.filter((r) => r.status === "declined").length,
        };
        return { event, rsvpList, stats };
      }),

    rsvps: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        const event = await getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        await assertFamilyMember(event.familyId, ctx.user.id);
        return getRsvpsByEvent(input.eventId);
      }),

    // Public: submit RSVP (no auth required)
    submitRsvp: publicProcedure
      .input(z.object({
        token: z.string(),
        guestName: z.string().min(1).max(100),
        guestContact: z.string().optional(),
        status: z.enum(["attending", "maybe", "declined"]),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const event = await getEventByToken(input.token);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "活动不存在" });
        const rsvpId = await createRsvp({
          eventId: event.id,
          guestName: input.guestName,
          guestContact: input.guestContact,
          status: input.status,
          note: input.note,
        });
        return { rsvpId };
      }),
    // Get event by ID (for detail page)
    getById: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        const event = await getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "活动不存在" });
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
            declined: rsvpList.filter((r) => r.status === "declined").length,
          },
        };
      }),
    // Add image to event
    addImage: protectedProcedure
      .input(z.object({ eventId: z.number(), imageUrl: z.string().url(), sortOrder: z.number().default(0) }))
      .mutation(async ({ ctx, input }) => {
        const event = await getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        await assertFamilyMember(event.familyId, ctx.user.id);
        const id = await addEventImage({ eventId: input.eventId, imageUrl: input.imageUrl, sortOrder: input.sortOrder });
        return { id };
      }),
    // Delete image from event
    deleteImage: protectedProcedure
      .input(z.object({ imageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteEventImage(input.imageId);
        return { success: true };
      }),
    // Get images for event
    getImages: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        const event = await getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        await assertFamilyMember(event.familyId, ctx.user.id);
        return getEventImages(input.eventId);
      }),
  }),
  //  // ─── Userss ────────────────────────────────────────────────────────────
  users: router({
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        avatar: z.string().optional(), // emoji or URL
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, { name: input.name, avatarUrl: input.avatar });
        return { success: true };
      }),

    updateAvatar: protectedProcedure
      .input(z.object({
        avatarUrl: z.string().url().max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
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
      };
    }),

    findById: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const u = await getUserByUserId(input.userId);
        if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        return { id: u.id, name: u.name, avatarUrl: u.avatarUrl, openId: u.openId };
      }),
  }),
  // ─── Connections (人脉好友) ────────────────────────────────────────────
  connections: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const [rows, blocked] = await Promise.all([
        getMyConnections(ctx.user.id),
        getBlockedUsers(ctx.user.id),
      ]);
      const blockedIds = new Set(blocked.map((b: any) => b.blockedUserId));

      return rows
        .filter((r) => {
          const friendId =
            r.requesterId === ctx.user.id ? r.receiverId : r.requesterId;
          return !blockedIds.has(friendId);
        })
        .map((r) => {
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
              avatarUrl: friendAvatar,
            },
            isMeRequester,
            isMutual: false, // computed separately via statusWith
          };
        });
    }),
    pending: protectedProcedure.query(async ({ ctx }) => {
      return getPendingRequests(ctx.user.id);
    }),
    sendRequest: protectedProcedure
      .input(z.object({
        receiverId: z.number(),
        note: z.string().max(200).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.receiverId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能添加自己" });
        const existing = await checkExistingConnection(ctx.user.id, input.receiverId);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "已存在连接或请求" });
        const receiver = await getUserByUserId(input.receiverId);
        if (!receiver) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        const id = await sendConnectionRequest(ctx.user.id, input.receiverId, input.note);
        return { id };
      }),
    accept: protectedProcedure
      .input(z.object({ connectionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await acceptConnection(input.connectionId, ctx.user.id);
        return { success: true };
      }),
    /**
     * 删除好友关系 / 撤回或拒绝好友申请。任一方都可以调用：
     *   - pending 状态：请求方撤回 / 接收方拒绝
     *   - accepted 状态：任一方解除好友关系
     */
    remove: protectedProcedure
      .input(z.object({ connectionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const affected = await removeConnection(input.connectionId, ctx.user.id);
        if (affected === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "无权删除该连接或连接不存在" });
        }
        return { success: true };
      }),
    listWithCategory: protectedProcedure.query(async ({ ctx }) => {
      return getAcceptedConnectionsWithCategory(ctx.user.id);
    }),
    updateCategory: protectedProcedure
      .input(z.object({
        connectionId: z.number(),
        category: z.enum(["life", "work", "family", "kids", "pets"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateConnectionCategory(input.connectionId, ctx.user.id, input.category);
        return { success: true };
      }),
    clearUpdate: protectedProcedure
      .input(z.object({ connectionId: z.number() }))
      .mutation(async ({ input }) => {
        await clearConnectionUpdate(input.connectionId);
        return { success: true };
      }),
    search: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        return searchUsersByName(input.query, ctx.user.id);
      }),

    // Get connection status and mutual friends between me and another user
    statusWith: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conn = await getConnectionBetween(ctx.user.id, input.targetUserId);
        const mutual = await getMutualFriends(ctx.user.id, input.targetUserId);
        let followStatus: "none" | "following" | "followed" | "mutual" = "none";
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
    }),
  }),

  // ─── Friend Events (好友活动申请) ─────────────────────────────────────────
  friendEvents: router({
    // Request to join a friend's event
    requestJoin: protectedProcedure
      .input(z.object({
        eventId: z.number(),
        message: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const event = await getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "活动不存在" });
        if (event.createdBy === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能申请参加自己的活动" });
        const existing = await checkExistingJoinRequest(input.eventId, ctx.user.id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "已提交申请，请等待审批" });
        const id = await createEventJoinRequest({
          eventId: input.eventId,
          requesterId: ctx.user.id,
          hostId: event.createdBy,
          message: input.message,
        });
        return { id };
      }),

    // Get join requests for an event (host only)
    joinRequests: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        const event = await getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        if (event.createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只有活动创建者可查看申请" });
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
    reviewRequest: protectedProcedure
      .input(z.object({
        requestId: z.number(),
        action: z.enum(["approved", "rejected"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateEventJoinRequestStatus(input.requestId, ctx.user.id, input.action);
        return { success: true };
      }),

    // Check my join status for a specific event
    myStatus: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        const req = await checkExistingJoinRequest(input.eventId, ctx.user.id);
        return req ? { status: req.status, id: req.id } : null;
      }),
  }),
  // ─── Task Statistics ─────────────────────────────────────────────────
  taskStats: router({
    byDate: protectedProcedure
      .input(z.object({ taskId: z.number(), date: z.string() }))
      .query(async ({ input }) => {
        return getTaskCheckinsByDate(input.taskId, input.date);
      }),
    history: protectedProcedure
      .input(z.object({ taskId: z.number(), days: z.number().default(30) }))
      .query(async ({ input }) => {
        return getTaskCheckinHistory(input.taskId, input.days);
      }),
    frequency: protectedProcedure
      .input(z.object({ taskId: z.number(), days: z.number().default(14) }))
      .query(async ({ input }) => {
        return getTaskFrequencyStats(input.taskId, input.days);
      }),
    byMonth: protectedProcedure
      .input(z.object({ familyId: z.number(), year: z.number(), month: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertFamilyMember(input.familyId, ctx.user.id);
        return getTaskCheckinsByMonth(input.familyId, input.year, input.month);
      }),

    checkinWithValue: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        childId: z.number().optional(),
        value: z.string().optional(),
        unit: z.string().optional(),
        note: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await addTaskCheckinWithValue({
          taskId: input.taskId,
          childId: input.childId,
          value: input.value,
          unit: input.unit,
          note: input.note,
          checkedBy: ctx.user.id,
        });
        return { success: true };
      }),
  }),
  // ─── Milestones ─────────────────────────────────────────────────────
  milestones: router({
    all: publicProcedure.query(() => getAllMilestoneTemplates()),
    byAge: publicProcedure
      .input(z.object({ ageMonths: z.number() }))
      .query(({ input }) => getMilestonesByAge(input.ageMonths)),
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // v4.0 Pinple — 推荐链 / 技能市场 / 举报 / 屏蔽 / 信用体系
  // ═══════════════════════════════════════════════════════════════════════

  // ─── Recommendations 推荐链 ────────────────────────────────────────
  recommendations: router({
    create: protectedProcedure
      .input(z.object({
        userId: z.number(),
        targetUserId: z.number(),
        context: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createRecommendation({
          userId: input.userId,
          recommenderId: ctx.user.id,
          targetUserId: input.targetUserId,
          context: input.context,
        });
        return { id };
      }),

    chain: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getRecommendationChain(input.userId);
      }),
  }),

  // ─── Skills 技能市场 ───────────────────────────────────────────────
  skills: router({
    list: publicProcedure
      .input(z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return getActiveSkills(input.limit, input.offset);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        category: z.string().optional(),
        description: z.string().optional(),
        images: z.array(z.string()).optional(),
        priceMin: z.string().optional(),
        priceMax: z.string().optional(),
        location: z.string().optional(),
        serviceRadius: z.number().optional(),
        contactMethod: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const creditScore = await getUserCreditScore(ctx.user.id);
        if (creditScore < 20) {
          throw new TRPCError({ code: "FORBIDDEN", message: "信用分过低，无法发布技能" });
        }
        const id = await createSkill({
          userId: ctx.user.id,
          name: input.name,
          category: input.category,
          description: input.description,
          images: input.images ? JSON.stringify(input.images) : undefined,
          priceMin: input.priceMin,
          priceMax: input.priceMax,
          location: input.location,
          serviceRadius: input.serviceRadius,
          contactMethod: input.contactMethod,
        });
        return { id };
      }),

    mySkills: protectedProcedure.query(async ({ ctx }) => {
      return getSkillsByUser(ctx.user.id);
    }),

    updateStatus: protectedProcedure
      .input(z.object({ skillId: z.number(), status: z.enum(["active", "inactive"]) }))
      .mutation(async ({ input }) => {
        await updateSkillStatus(input.skillId, input.status);
        return { success: true };
      }),
  }),

  // ─── Help Requests 求助 ───────────────────────────────────────────
  helpRequests: router({
    list: publicProcedure
      .input(z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return getOpenHelpRequests(input.limit, input.offset);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        skillTags: z.array(z.string()).optional(),
        budgetMin: z.string().optional(),
        budgetMax: z.string().optional(),
        location: z.string().optional(),
        urgency: z.enum(["low", "medium", "high"]).default("medium"),
        deadline: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const creditScore = await getUserCreditScore(ctx.user.id);
        if (creditScore < 20) {
          throw new TRPCError({ code: "FORBIDDEN", message: "信用分过低，无法发布求助" });
        }
        const id = await createHelpRequest({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          skillTags: input.skillTags ? JSON.stringify(input.skillTags) : undefined,
          budgetMin: input.budgetMin,
          budgetMax: input.budgetMax,
          location: input.location,
          urgency: input.urgency,
          deadline: input.deadline ? new Date(input.deadline) : undefined,
        });
        return { id };
      }),

    myRequests: protectedProcedure.query(async ({ ctx }) => {
      return getHelpRequestsByUser(ctx.user.id);
    }),

    updateStatus: protectedProcedure
      .input(z.object({ requestId: z.number(), status: z.enum(["open", "matched", "closed"]) }))
      .mutation(async ({ input }) => {
        await updateHelpRequestStatus(input.requestId, input.status);
        return { success: true };
      }),

    match: protectedProcedure
      .input(z.object({ requestId: z.number(), skillId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const id = await createSkillMatch({
          requestId: input.requestId,
          skillId: input.skillId,
          providerId: ctx.user.id,
        });
        return { id };
      }),

    matchesByRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .query(async ({ input }) => {
        return getMatchesByRequest(input.requestId);
      }),

    acceptMatch: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ input }) => {
        await updateMatchStatus(input.matchId, "accepted");
        return { success: true };
      }),

    completeMatch: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await updateMatchStatus(input.matchId, "completed");
        await updateUserCreditScore(ctx.user.id, 5);
        return { success: true };
      }),
  }),

  // ─── Reviews 评价 ─────────────────────────────────────────────────
  reviews: router({
    create: protectedProcedure
      .input(z.object({
        toUserId: z.number(),
        matchId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createReview({
          fromUserId: ctx.user.id,
          toUserId: input.toUserId,
          matchId: input.matchId,
          rating: input.rating,
          comment: input.comment,
        });
        if (input.rating >= 4) {
          await updateUserCreditScore(input.toUserId, 2);
        }
        return { id };
      }),

    forUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getReviewsForUser(input.userId);
      }),
  }),

  // ─── Reports 举报 ─────────────────────────────────────────────────
  reports: router({
    create: protectedProcedure
      .input(z.object({
        reportedUserId: z.number(),
        reason: z.enum(["inappropriate", "fraud", "harassment", "other"]),
        description: z.string().optional(),
        evidence: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.reportedUserId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能举报自己" });
        }
        const id = await createUserReport({
          reporterId: ctx.user.id,
          reportedUserId: input.reportedUserId,
          reason: input.reason,
          description: input.description,
          evidence: input.evidence ? JSON.stringify(input.evidence) : undefined,
        });
        return { id };
      }),

    pending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
      }
      return getPendingReports();
    }),

    review: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        action: z.enum(["approved", "rejected"]),
        reportedUserId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
        }
        await updateReportStatus(input.reportId, input.action);
        if (input.action === "approved") {
          await updateUserCreditScore(input.reportedUserId, -10);
        }
        return { success: true };
      }),
  }),

  // ─── Blocks 屏蔽 ──────────────────────────────────────────────────
  blocks: router({
    block: protectedProcedure
      .input(z.object({ blockedUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (input.blockedUserId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能屏蔽自己" });
        }
        const id = await blockUser(ctx.user.id, input.blockedUserId);
        return { id };
      }),

    unblock: protectedProcedure
      .input(z.object({ blockedUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await unblockUser(ctx.user.id, input.blockedUserId);
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getBlockedUsers(ctx.user.id);
    }),

    check: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .query(async ({ ctx, input }) => {
        const blocked = await isUserBlocked(ctx.user.id, input.targetUserId);
        return { isBlocked: blocked };
      }),
  }),

  // ─── Calendar 多家庭日历聚合 ───────────────────────────────────────
  //  汇总活动(events) + 成员生日/纪念日(member_events, 年循环展开) +
  //  孩子里程碑/孕期事件(timeline_events)，给日历视图一次取到。
  calendar: router({
    upcoming: protectedProcedure
      .input(z.object({
        familyIds: z.array(z.number()).min(1),
        // 默认窗口：当前 UTC 日期起 90 天
        from: z.string().optional(),
        to: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const from = input.from ? new Date(input.from) : new Date();
        const to = input.to
          ? new Date(input.to)
          : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

        // 权限校验：每个 familyId 都必须是当前用户的家庭
        for (const fid of input.familyIds) {
          await assertFamilyMember(fid, ctx.user.id);
        }

        type Item = {
          kind: "event" | "memberEvent" | "milestone" | "pregnancy" | "birthday" | "anniversary";
          familyId: number;
          title: string;
          date: Date;
          refId: number;
          meta?: Record<string, unknown>;
        };

        const items: Item[] = [];

        for (const fid of input.familyIds) {
          // 1) 活动
          const evts = await getEventsByFamily(fid);
          for (const e of evts) {
            if (e.eventDate >= from && e.eventDate <= to) {
              items.push({
                kind: "event",
                familyId: fid,
                title: e.title,
                date: e.eventDate,
                refId: e.id,
                meta: { location: e.location, inviteToken: e.inviteToken },
              });
            }
          }

          // 2) 成员事件（年循环展开到窗口内的下一次发生）
          const memEvts = await getMemberEventsByFamily(fid);
          for (const me of memEvts) {
            const base = new Date(me.eventDate);
            if (!me.isYearly) {
              if (base >= from && base <= to) {
                items.push({
                  kind: me.eventType === "birthday" ? "birthday" :
                        me.eventType === "anniversary" ? "anniversary" : "memberEvent",
                  familyId: fid,
                  title: me.title,
                  date: base,
                  refId: me.id,
                  meta: { userId: me.userId },
                });
              }
              continue;
            }
            // 展开：取 [from.year - 1, to.year + 1] 内与月/日匹配的日期
            const startY = from.getUTCFullYear() - 1;
            const endY = to.getUTCFullYear() + 1;
            for (let y = startY; y <= endY; y++) {
              const occ = new Date(Date.UTC(y, base.getUTCMonth(), base.getUTCDate()));
              if (occ >= from && occ <= to) {
                items.push({
                  kind: me.eventType === "birthday" ? "birthday" :
                        me.eventType === "anniversary" ? "anniversary" : "memberEvent",
                  familyId: fid,
                  title: me.title,
                  date: occ,
                  refId: me.id,
                  meta: { userId: me.userId, yearly: true },
                });
              }
            }
          }

          // 3) 时间轴里程碑/孕期事件（仅窗口内未来时间的 milestone/pregnancy）
          const timelineItems = await getUpcomingTimelineByFamily(fid, from, to);
          for (const t of timelineItems) {
            if (t.type !== "milestone" && t.type !== "pregnancy") continue;
            items.push({
              kind: t.type,
              familyId: fid,
              title: t.title,
              date: t.eventDate,
              refId: t.id,
              meta: { childId: t.childId },
            });
          }
        }

        items.sort((a, b) => a.date.getTime() - b.date.getTime());
        return { from, to, count: items.length, items };
      }),
  }),
});

export type AppRouter = typeof appRouter;
