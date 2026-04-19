/**
 * Pinple v4.0 Tests:
 * - Email registration & login
 * - Credit score system
 * - Skill market (publish / list)
 * - Help requests (publish / list)
 * - User reports & blocks
 * - Recommendation chain
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock db module ────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserByEmail: vi.fn().mockResolvedValue(undefined),
    createEmailUser: vi.fn().mockResolvedValue(99),
    getUserCreditScore: vi.fn().mockResolvedValue(100),
    updateUserCreditScore: vi.fn().mockResolvedValue(95),
    createRecommendation: vi.fn().mockResolvedValue(1),
    getRecommendationChain: vi.fn().mockResolvedValue([]),
    createSkill: vi.fn().mockResolvedValue(1),
    getSkillsByUser: vi.fn().mockResolvedValue([]),
    getActiveSkills: vi.fn().mockResolvedValue([]),
    updateSkillStatus: vi.fn().mockResolvedValue(undefined),
    createHelpRequest: vi.fn().mockResolvedValue(1),
    getHelpRequestsByUser: vi.fn().mockResolvedValue([]),
    getOpenHelpRequests: vi.fn().mockResolvedValue([]),
    updateHelpRequestStatus: vi.fn().mockResolvedValue(undefined),
    createSkillMatch: vi.fn().mockResolvedValue(1),
    getMatchesByRequest: vi.fn().mockResolvedValue([]),
    updateMatchStatus: vi.fn().mockResolvedValue(undefined),
    createReview: vi.fn().mockResolvedValue(1),
    getReviewsForUser: vi.fn().mockResolvedValue([]),
    createUserReport: vi.fn().mockResolvedValue(1),
    getPendingReports: vi.fn().mockResolvedValue([]),
    updateReportStatus: vi.fn().mockResolvedValue(undefined),
    blockUser: vi.fn().mockResolvedValue(1),
    unblockUser: vi.fn().mockResolvedValue(undefined),
    getBlockedUsers: vi.fn().mockResolvedValue([]),
    isUserBlocked: vi.fn().mockResolvedValue(false),
    getAllMilestoneTemplates: vi.fn().mockResolvedValue([]),
    getMilestonesByAge: vi.fn().mockResolvedValue([]),
  };
});

// ─── Mock sdk for session token creation ────────────────────────────────────
vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
    authenticateRequest: vi.fn().mockResolvedValue(null),
  },
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1, role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test_${userId}`,
    name: `User ${userId}`,
    email: `user${userId}@test.com`,
    loginMethod: "email",
    role,
    avatarUrl: null,
    birthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    bio: null,
    location: null,
    skillTags: null,
    creditScore: 100,
    passwordHash: null,
    wechatOpenId: null,
    reportedCount: 0,
  };
  const mockRes: any = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
  return {
    ctx: {
      req: { headers: {} } as any,
      res: mockRes,
      user,
    },
  };
}

const caller = (ctx: TrpcContext) => appRouter.createCaller(ctx);

// ─── Skill Market Tests ─────────────────────────────────────────────────────

describe("Skill Market", () => {
  it("creates a skill successfully", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).skills.create({
      name: "钢琴教学",
      category: "education",
      description: "专业钢琴教师，10年教学经验",
      location: "北京朝阳区",
    });
    expect(result.id).toBe(1);
  });

  it("lists active skills", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).skills.list({ limit: 10, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets my skills", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).skills.mySkills();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Help Request Tests ──────────────────────────────────────────────────────

describe("Help Requests", () => {
  it("creates a help request successfully", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).helpRequests.create({
      title: "寻找钢琴老师",
      description: "为5岁孩子找钢琴启蒙老师",
      urgency: "medium",
      location: "北京海淀区",
    });
    expect(result.id).toBe(1);
  });

  it("lists open help requests", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).helpRequests.list({ limit: 10, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets my help requests", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).helpRequests.myRequests();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Recommendation Chain Tests ──────────────────────────────────────────────

describe("Recommendation Chain", () => {
  it("creates a recommendation", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).recommendations.create({
      userId: 2,
      targetUserId: 3,
      context: "月嫂推荐，服务很好",
    });
    expect(result.id).toBe(1);
  });

  it("gets recommendation chain for a user", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).recommendations.chain({ userId: 2 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Report Tests ────────────────────────────────────────────────────────────

describe("User Reports", () => {
  it("creates a report successfully", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).reports.create({
      reportedUserId: 2,
      reason: "harassment",
      description: "发送骚扰信息",
    });
    expect(result.id).toBe(1);
  });

  it("prevents self-reporting", async () => {
    const { ctx } = createAuthContext(1);
    await expect(
      caller(ctx).reports.create({
        reportedUserId: 1,
        reason: "other",
      })
    ).rejects.toThrow("不能举报自己");
  });

  it("admin can review reports", async () => {
    const { ctx } = createAuthContext(1, "admin");
    const result = await caller(ctx).reports.review({
      reportId: 1,
      action: "approved",
      reportedUserId: 2,
    });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot review reports", async () => {
    const { ctx } = createAuthContext(1, "user");
    await expect(
      caller(ctx).reports.review({
        reportId: 1,
        action: "approved",
        reportedUserId: 2,
      })
    ).rejects.toThrow("需要管理员权限");
  });
});

// ─── Block Tests ─────────────────────────────────────────────────────────────

describe("User Blocks", () => {
  it("blocks a user", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).blocks.block({ blockedUserId: 2 });
    expect(result.id).toBe(1);
  });

  it("prevents self-blocking", async () => {
    const { ctx } = createAuthContext(1);
    await expect(
      caller(ctx).blocks.block({ blockedUserId: 1 })
    ).rejects.toThrow("不能屏蔽自己");
  });

  it("unblocks a user", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).blocks.unblock({ blockedUserId: 2 });
    expect(result.success).toBe(true);
  });

  it("lists blocked users", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).blocks.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("checks if user is blocked", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).blocks.check({ targetUserId: 2 });
    expect(result.isBlocked).toBe(false);
  });
});

// ─── Review Tests ────────────────────────────────────────────────────────────

describe("Reviews", () => {
  it("creates a review", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).reviews.create({
      toUserId: 2,
      matchId: 1,
      rating: 5,
      comment: "服务非常好！",
    });
    expect(result.id).toBe(1);
  });

  it("gets reviews for a user", async () => {
    const { ctx } = createAuthContext(1);
    const result = await caller(ctx).reviews.forUser({ userId: 2 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Credit Score Integration Tests ──────────────────────────────────────────

describe("Credit Score System", () => {
  it("blocks skill creation when credit score is low", async () => {
    const db = await import("./db");
    (db.getUserCreditScore as any).mockResolvedValueOnce(15);

    const { ctx } = createAuthContext(1);
    await expect(
      caller(ctx).skills.create({
        name: "低信用技能",
        category: "other",
      })
    ).rejects.toThrow("信用分过低");
  });

  it("blocks help request creation when credit score is low", async () => {
    const db = await import("./db");
    (db.getUserCreditScore as any).mockResolvedValueOnce(10);

    const { ctx } = createAuthContext(1);
    await expect(
      caller(ctx).helpRequests.create({
        title: "低信用求助",
      })
    ).rejects.toThrow("信用分过低");
  });
});
