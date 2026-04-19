/**
 * Tests for new features:
 * - Timeline event visibility (isPublic)
 * - Friend event join requests
 * - Connection follow status
 * - User avatar update
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock db module ────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    updateTimelineEventVisibility: vi.fn().mockResolvedValue(undefined),
    updateUserAvatar: vi.fn().mockResolvedValue(undefined),
    getConnectionBetween: vi.fn().mockResolvedValue(null),
    getMutualFriends: vi.fn().mockResolvedValue([]),
    checkExistingJoinRequest: vi.fn().mockResolvedValue(null),
    getEventById: vi.fn().mockResolvedValue({
      id: 1,
      familyId: 1,
      title: "Test Event",
      description: "Test",
      location: "Home",
      eventDate: new Date(),
      inviteToken: "token123",
      isPublic: true,
      createdBy: 2, // different from requester
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    createEventJoinRequest: vi.fn().mockResolvedValue(42),
    getPendingJoinRequestsForHost: vi.fn().mockResolvedValue([]),
    getMyEventJoinRequests: vi.fn().mockResolvedValue([]),
    getFriendEventsFeed: vi.fn().mockResolvedValue([]),
    getAcceptedConnectionsWithCategory: vi.fn().mockResolvedValue([]),
    getMyConnections: vi.fn().mockResolvedValue([]),
    getPendingRequests: vi.fn().mockResolvedValue([]),
    updateEventJoinRequestStatus: vi.fn().mockResolvedValue(undefined),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

// ─── Timeline visibility tests ────────────────────────────────────────────────
describe("timeline.setVisibility", () => {
  it("calls updateTimelineEventVisibility with correct params", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const { updateTimelineEventVisibility } = await import("./db");

    await caller.timeline.setVisibility({ eventId: 10, isPublic: true });

    expect(updateTimelineEventVisibility).toHaveBeenCalledWith(10, true);
  });

  it("can set event to private", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const { updateTimelineEventVisibility } = await import("./db");

    await caller.timeline.setVisibility({ eventId: 10, isPublic: false });

    expect(updateTimelineEventVisibility).toHaveBeenCalledWith(10, false);
  });
});

// ─── User avatar update tests ─────────────────────────────────────────────────
describe("users.updateAvatar", () => {
  it("updates avatar URL for authenticated user", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const { updateUserAvatar } = await import("./db");

    const result = await caller.users.updateAvatar({ avatarUrl: "https://example.com/avatar.jpg" });

    expect(updateUserAvatar).toHaveBeenCalledWith(1, "https://example.com/avatar.jpg");
    expect(result).toEqual({ success: true });
  });
});

// ─── Connection status tests ───────────────────────────────────────────────────
describe("connections.statusWith", () => {
  it("returns none status when no connection exists", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.connections.statusWith({ targetUserId: 99 });

    expect(result.followStatus).toBe("none");
    expect(result.mutualFriends).toEqual([]);
  });

  it("returns mutual status when connection is accepted", async () => {
    const { getConnectionBetween } = await import("./db");
    vi.mocked(getConnectionBetween).mockResolvedValueOnce({
      id: 1,
      requesterId: 1,
      receiverId: 99,
      status: "accepted",
      note: null,
      category: "life",
      hasUpdate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.connections.statusWith({ targetUserId: 99 });

    expect(result.followStatus).toBe("mutual");
  });

  it("returns following status when I sent the request", async () => {
    const { getConnectionBetween } = await import("./db");
    vi.mocked(getConnectionBetween).mockResolvedValueOnce({
      id: 1,
      requesterId: 1, // I am the requester
      receiverId: 99,
      status: "pending",
      note: null,
      category: "life",
      hasUpdate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.connections.statusWith({ targetUserId: 99 });

    expect(result.followStatus).toBe("following");
  });

  it("returns followed status when they sent the request", async () => {
    const { getConnectionBetween } = await import("./db");
    vi.mocked(getConnectionBetween).mockResolvedValueOnce({
      id: 1,
      requesterId: 99, // They are the requester
      receiverId: 1,
      status: "pending",
      note: null,
      category: "life",
      hasUpdate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.connections.statusWith({ targetUserId: 99 });

    expect(result.followStatus).toBe("followed");
  });
});

// ─── Friend event join request tests ─────────────────────────────────────────
describe("friendEvents.requestJoin", () => {
  it("creates a join request for an event", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const { createEventJoinRequest } = await import("./db");

    const result = await caller.friendEvents.requestJoin({ eventId: 1, message: "I want to join!" });

    expect(createEventJoinRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 1,
        requesterId: 1,
        hostId: 2,
        message: "I want to join!",
      })
    );
    expect(result).toEqual({ id: 42 });
  });

  it("throws CONFLICT when request already exists", async () => {
    const { checkExistingJoinRequest } = await import("./db");
    vi.mocked(checkExistingJoinRequest).mockResolvedValueOnce({
      id: 5,
      eventId: 1,
      requesterId: 1,
      hostId: 2,
      status: "pending",
      message: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.friendEvents.requestJoin({ eventId: 1 })
    ).rejects.toThrow("已提交申请");
  });

  it("throws BAD_REQUEST when trying to join own event", async () => {
    const { getEventById } = await import("./db");
    vi.mocked(getEventById).mockResolvedValueOnce({
      id: 1,
      familyId: 1,
      title: "My Event",
      description: null,
      location: null,
      locationLat: null,
      locationLng: null,
      coverUrl: null,
      eventDate: new Date(),
      inviteToken: "token",
      isPublic: true,
      createdBy: 1, // same as requester
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.friendEvents.requestJoin({ eventId: 1 })
    ).rejects.toThrow("不能申请参加自己的活动");
  });
});

// ─── Friend event feed tests ───────────────────────────────────────────────────
describe("connections.friendFeed", () => {
  it("returns empty array when no friends have events", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.connections.friendFeed();

    expect(result).toEqual([]);
  });
});

// ─── Pending join requests tests ──────────────────────────────────────────────
describe("friendEvents.pendingForMe", () => {
  it("returns empty array when no pending requests", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.friendEvents.pendingForMe();

    expect(result).toEqual([]);
  });
});
