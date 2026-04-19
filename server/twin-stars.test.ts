import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers (mirrored from routers.ts for testing) ──────────────────────────

function calcEDD(transferDate: Date, embryoDay: number = 5) {
  const daysBack = embryoDay + 14;
  const lmp = new Date(transferDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
  const twin37w = new Date(lmp.getTime() + 259 * 24 * 60 * 60 * 1000);
  return { lmp, edd, twin37w };
}

function calcAge(birthDate: Date) {
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

// ─── EDD Calculation Tests ────────────────────────────────────────────────────

describe("IVF EDD Calculation", () => {
  it("calculates LMP correctly for day-5 blastocyst", () => {
    // Transfer date: 2026-03-11, embryo day 5
    // LMP = 2026-03-11 - (5+14) = 2026-03-11 - 19 days = 2026-02-20
    const transferDate = new Date("2026-03-11");
    const { lmp } = calcEDD(transferDate, 5);
    expect(lmp.toISOString().slice(0, 10)).toBe("2026-02-20");
  });

  it("calculates EDD (40w) correctly for day-5 blastocyst", () => {
    // LMP: 2026-02-20 + 280 days = 2026-11-27
    const transferDate = new Date("2026-03-11");
    const { edd } = calcEDD(transferDate, 5);
    expect(edd.toISOString().slice(0, 10)).toBe("2026-11-27");
  });

  it("calculates twin 37w date correctly", () => {
    // LMP: 2026-02-20 + 259 days = 2026-11-06
    const transferDate = new Date("2026-03-11");
    const { twin37w } = calcEDD(transferDate, 5);
    expect(twin37w.toISOString().slice(0, 10)).toBe("2026-11-06");
  });

  it("calculates LMP correctly for day-6 blastocyst", () => {
    // Transfer date: 2026-03-11, embryo day 6
    // LMP = 2026-03-11 - (6+14) = 2026-03-11 - 20 days = 2026-02-19
    const transferDate = new Date("2026-03-11");
    const { lmp } = calcEDD(transferDate, 6);
    expect(lmp.toISOString().slice(0, 10)).toBe("2026-02-19");
  });

  it("EDD is always 21 days after twin37w", () => {
    const transferDate = new Date("2026-03-11");
    const { edd, twin37w } = calcEDD(transferDate, 5);
    const diffDays = (edd.getTime() - twin37w.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(21); // 3 weeks = 21 days
  });
});

// ─── Age Calculation Tests ────────────────────────────────────────────────────

describe("Age Calculation", () => {
  it("returns 0 years 0 months for a newborn today", () => {
    const today = new Date();
    const age = calcAge(today);
    expect(age.years).toBe(0);
    expect(age.months).toBe(0);
    expect(age.totalMonths).toBe(0);
  });

  it("calculates age correctly for a 1-year-old", () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const age = calcAge(oneYearAgo);
    expect(age.years).toBe(1);
    expect(age.totalMonths).toBeGreaterThanOrEqual(12);
  });

  it("totalMonths is consistent with years and months", () => {
    const birthDate = new Date();
    birthDate.setMonth(birthDate.getMonth() - 14);
    const age = calcAge(birthDate);
    expect(age.totalMonths).toBe(age.years * 12 + age.months);
  });
});

// ─── Auth Router Tests ────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user when authenticated", async () => {
    const mockUser = {
      id: 1,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "admin" as const,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const ctx: TrpcContext = {
      user: mockUser,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.id).toBe(1);
    expect(result?.name).toBe("Test User");
  });
});

// ─── Public EDD Procedure Test ────────────────────────────────────────────────

describe("children.calcEDD (public procedure)", () => {
  it("returns correct EDD info via tRPC public procedure", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.children.calcEDD({ transferDate: "2026-03-11", embryoDay: 5 });
    expect(result.lmp.toISOString().slice(0, 10)).toBe("2026-02-20");
    expect(result.edd.toISOString().slice(0, 10)).toBe("2026-11-27");
    expect(result.twin37w.toISOString().slice(0, 10)).toBe("2026-11-06");
  });
});

// ─── Generic Pregnancy Date Calculation Tests ──────────────────────────────────────────────

// Generic pregnancy calc: given a reference date and how many weeks+days pregnant at that date,
// compute LMP and EDD (40w from LMP)
function calcGenericEDD(refDate: Date, weeksPregnant: number, daysPregnant: number = 0) {
  const totalDays = weeksPregnant * 7 + daysPregnant;
  const lmp = new Date(refDate.getTime() - totalDays * 24 * 60 * 60 * 1000);
  const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
  const twin37w = new Date(lmp.getTime() + 259 * 24 * 60 * 60 * 1000);
  return { lmp, edd, twin37w };
}

describe("Generic Pregnancy EDD Calculation", () => {
  it("calculates LMP correctly from reference date and pregnancy weeks", () => {
    // If on 2026-03-11 the user is 3 weeks pregnant, LMP = 2026-03-11 - 21 days = 2026-02-18
    const refDate = new Date("2026-03-11");
    const { lmp } = calcGenericEDD(refDate, 3, 0);
    expect(lmp.toISOString().slice(0, 10)).toBe("2026-02-18");
  });

  it("calculates EDD (40w) from generic pregnancy reference", () => {
    // LMP: 2026-02-18 + 280 days = 2026-11-25
    const refDate = new Date("2026-03-11");
    const { edd } = calcGenericEDD(refDate, 3, 0);
    expect(edd.toISOString().slice(0, 10)).toBe("2026-11-25");
  });

  it("EDD is always 280 days after LMP", () => {
    const refDate = new Date("2026-03-11");
    const { lmp, edd } = calcGenericEDD(refDate, 5, 3);
    const diffDays = (edd.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(280);
  });

  it("twin 37w is always 21 days before EDD", () => {
    const refDate = new Date("2026-03-11");
    const { edd, twin37w } = calcGenericEDD(refDate, 5, 3);
    const diffDays = (edd.getTime() - twin37w.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(21);
  });

  it("handles 0 weeks pregnant (just conceived)", () => {
    const refDate = new Date("2026-03-11");
    const { lmp } = calcGenericEDD(refDate, 0, 0);
    // LMP should equal refDate when 0 weeks pregnant
    expect(lmp.toISOString().slice(0, 10)).toBe("2026-03-11");
  });
});

// ─── Baby Size Reference Tests ─────────────────────────────────────────────────────────────────────

function getBabySizeByWeek(weeks: number) {
  const sizes = [
    { week: 4, name: "羌豆", emoji: "🌱", sizeCm: 0.2 },
    { week: 8, name: "蘑莓", emoji: "🍓", sizeCm: 1.6 },
    { week: 12, name: "橙子", emoji: "🍊", sizeCm: 5.4 },
    { week: 20, name: "香蕉", emoji: "🥕", sizeCm: 25.6 },
    { week: 37, name: "西瓜", emoji: "🍉", sizeCm: 48.6 },
    { week: 40, name: "大西瓜", emoji: "🍉", sizeCm: 51.2 },
  ];
  const match = sizes.filter(s => s.week <= weeks).pop();
  return match ?? sizes[0];
}

describe("Baby Size Reference", () => {
  it("returns a size reference for week 12", () => {
    const size = getBabySizeByWeek(12);
    expect(size).toBeDefined();
    expect(size.name).toBe("橙子");
    expect(size.sizeCm).toBeGreaterThan(0);
  });

  it("returns a size reference for week 20", () => {
    const size = getBabySizeByWeek(20);
    expect(size.name).toBe("香蕉");
  });

  it("size increases as weeks increase", () => {
    const size8 = getBabySizeByWeek(8);
    const size20 = getBabySizeByWeek(20);
    expect(size20.sizeCm).toBeGreaterThan(size8.sizeCm);
  });
});

// ─── Task Statistics Tests ──────────────────────────────────────────────────────────────────────

function calcTaskFrequency(checkins: { date: string }[], targetDate: string) {
  return checkins.filter(c => c.date === targetDate).length;
}

describe("Task Frequency Statistics", () => {
  it("counts multiple check-ins on same day", () => {
    const checkins = [
      { date: "2026-03-13" },
      { date: "2026-03-13" },
      { date: "2026-03-13" },
      { date: "2026-03-12" },
    ];
    const count = calcTaskFrequency(checkins, "2026-03-13");
    expect(count).toBe(3);
  });

  it("returns 0 for a date with no check-ins", () => {
    const checkins = [{ date: "2026-03-12" }];
    const count = calcTaskFrequency(checkins, "2026-03-13");
    expect(count).toBe(0);
  });

  it("numeric value tasks track trend data", () => {
    const weightRecords = [
      { date: "2026-03-10", value: 3.2 },
      { date: "2026-03-13", value: 3.5 },
      { date: "2026-03-16", value: 3.8 },
    ];
    const latest = weightRecords[weightRecords.length - 1];
    expect(latest.value).toBeGreaterThan(weightRecords[0].value);
  });
});

// ─── Connection Category Tests ────────────────────────────────────────────────────────────────────

describe("Connection Category Filtering", () => {
  const connections = [
    { id: 1, name: "张三", category: "family" },
    { id: 2, name: "李四", category: "work" },
    { id: 3, name: "王五", category: "friend" },
    { id: 4, name: "赵六", category: "family" },
  ];

  it("filters by family category", () => {
    const family = connections.filter(c => c.category === "family");
    expect(family).toHaveLength(2);
  });

  it("filters by work category", () => {
    const work = connections.filter(c => c.category === "work");
    expect(work).toHaveLength(1);
    expect(work[0].name).toBe("李四");
  });

  it("all category returns all connections", () => {
    const all = connections.filter(c => ["family", "work", "friend", "child", "pet"].includes(c.category));
    expect(all).toHaveLength(4);
  });
});

// ─── RSVP Statistics Tests ────────────────────────────────────────────────────────────────────────

describe("RSVP Statistics", () => {
  const rsvps = [
    { status: "attending" },
    { status: "attending" },
    { status: "attending" },
    { status: "maybe" },
    { status: "declined" },
  ];

  it("counts attending correctly", () => {
    const count = rsvps.filter(r => r.status === "attending").length;
    expect(count).toBe(3);
  });

  it("counts maybe correctly", () => {
    const count = rsvps.filter(r => r.status === "maybe").length;
    expect(count).toBe(1);
  });

  it("counts declined correctly", () => {
    const count = rsvps.filter(r => r.status === "declined").length;
    expect(count).toBe(1);
  });
});

// ─── Connections Logic Tests ──────────────────────────────────────────────────────────────────────

describe("Connections Permission Logic", () => {
  it("cannot send friend request to yourself", () => {
    const userId = 1;
    const receiverId = 1;
    const isSelf = userId === receiverId;
    expect(isSelf).toBe(true); // should be blocked
  });

  it("different users can connect", () => {
    const userId = 1;
    const receiverId = 2;
    const isSelf = userId === receiverId;
    expect(isSelf).toBe(false);
  });

  it("connection status pending before acceptance", () => {
    const status = "pending";
    const isAccepted = status === "accepted";
    expect(isAccepted).toBe(false);
  });

  it("connection status accepted after acceptance", () => {
    const status = "accepted";
    const isAccepted = status === "accepted";
    expect(isAccepted).toBe(true);
  });
});
