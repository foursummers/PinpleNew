/**
 * Pinple v4 — 自动生成逻辑
 *
 * 在 `children.create` 插入新孩子记录后调用，自动产出：
 *   1. 孕期事件（若填了孕期参考点）：LMP / 着床 / 每 4 周产检 / EDD
 *   2. 里程碑事件（若填了出生日期）：出生 / 满月 / 42天 / 百日 / 3-9月 / 1-3岁 / 未来 3 年生日
 *   3. 欢迎宝宝活动（始终生成）+ 5 条预设 RSVP
 *
 * 所有时间/月龄计算都基于 UTC，避免时区漂移；front-end 渲染时按本地时区即可。
 */

import { nanoid } from "nanoid";
import { createEvent, createRsvp, createTimelineEvent } from "../db";

// ─── 日期工具 ────────────────────────────────────────────────────────────────
function addDays(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

function addYears(d: Date, years: number): Date {
  const out = new Date(d.getTime());
  out.setUTCFullYear(out.getUTCFullYear() + years);
  return out;
}

// ─── Pregnancy Events ────────────────────────────────────────────────────────
export interface PregnancyInput {
  childId: number;
  familyId: number;
  createdBy: number;
  nickname: string;
  pregnancyRefDate: Date | null | undefined;
  pregnancyWeeksAtRef?: number | null;
  pregnancyDaysAtRef?: number | null;
}

export async function generatePregnancyEvents(input: PregnancyInput): Promise<number> {
  if (!input.pregnancyRefDate) return 0;

  const weeks = input.pregnancyWeeksAtRef ?? 0;
  const days = input.pregnancyDaysAtRef ?? 0;
  const lmp = addDays(input.pregnancyRefDate, -(weeks * 7 + days));
  const implantation = addDays(lmp, 14);
  const edd = addDays(lmp, 280);

  const items: Array<{ title: string; content: string; date: Date }> = [
    {
      title: "末次月经（LMP）",
      content: `${input.nickname} 的孕期起点，用于推算孕周。`,
      date: lmp,
    },
    {
      title: "预计着床日",
      content: "受精后 7-10 天着床，约为 LMP 后 14 天。",
      date: implantation,
    },
  ];

  // 4 周一次的产检提醒（8/12/16/20/24/28/32/36 周）
  for (const wk of [8, 12, 16, 20, 24, 28, 32, 36]) {
    items.push({
      title: `孕 ${wk} 周产检`,
      content: `建议在 ${wk} 周前后完成一次常规产检。`,
      date: addDays(lmp, wk * 7),
    });
  }

  items.push({
    title: "预产期（EDD）",
    content: "根据 LMP 推算：LMP + 280 天。实际分娩时间会有 ±2 周波动。",
    date: edd,
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
      isPublic: false,
    });
    created++;
  }
  return created;
}

// ─── Milestone Events ────────────────────────────────────────────────────────
export interface MilestoneInput {
  childId: number;
  familyId: number;
  createdBy: number;
  nickname: string;
  birthDate: Date | null | undefined;
}

export async function generateMilestoneEvents(input: MilestoneInput): Promise<number> {
  if (!input.birthDate) return 0;
  const b = input.birthDate;

  const items: Array<{ title: string; content: string; date: Date }> = [
    { title: "出生", content: `${input.nickname} 来到这个世界！`, date: b },
    { title: "满月", content: "宝宝满月啦！", date: addDays(b, 30) },
    { title: "42天体检", content: "产后 42 天母婴常规复查。", date: addDays(b, 42) },
    { title: "百日", content: "宝宝 100 天啦！", date: addDays(b, 100) },
    { title: "3 个月", content: "3 月龄发育里程碑。", date: addMonths(b, 3) },
    { title: "6 个月", content: "6 月龄发育里程碑。", date: addMonths(b, 6) },
    { title: "9 个月", content: "9 月龄发育里程碑。", date: addMonths(b, 9) },
    { title: "1 周岁", content: "第一个生日！", date: addMonths(b, 12) },
    { title: "1 岁半", content: "18 月龄发育里程碑。", date: addMonths(b, 18) },
    { title: "2 周岁", content: "第二个生日。", date: addMonths(b, 24) },
    { title: "3 周岁", content: "第三个生日。", date: addMonths(b, 36) },
  ];

  // 未来 3 年的年生日（4/5/6 岁）
  for (const age of [4, 5, 6]) {
    items.push({
      title: `${age} 周岁`,
      content: `${input.nickname} ${age} 岁生日快乐！`,
      date: addYears(b, age),
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
      isPublic: false,
    });
    created++;
  }
  return created;
}

// ─── Welcome Event + Default RSVPs ───────────────────────────────────────────
export interface WelcomeInput {
  childId: number;
  familyId: number;
  createdBy: number;
  nickname: string;
  birthDate: Date | null | undefined;
}

const DEFAULT_RSVP_ROLES = ["爸爸", "妈妈", "爷爷", "奶奶", "好友"] as const;

export async function generateWelcomeEvent(input: WelcomeInput): Promise<{
  eventId: number | null;
  rsvpCount: number;
}> {
  // 活动日期：有出生日期就用出生日期，否则默认一周后
  const eventDate = input.birthDate ? input.birthDate : addDays(new Date(), 7);

  const eventId = await createEvent({
    familyId: input.familyId,
    title: `欢迎 ${input.nickname}！`,
    description: "系统自动创建的欢迎活动。可编辑时间、地点后分享给亲友。",
    eventDate,
    inviteToken: nanoid(12),
    isPublic: false,
    createdBy: input.createdBy,
  });

  let rsvpCount = 0;
  for (const role of DEFAULT_RSVP_ROLES) {
    await createRsvp({
      eventId,
      guestName: role,
      status: "maybe",
      note: "系统预设 RSVP，等待家人确认",
    });
    rsvpCount++;
  }

  return { eventId, rsvpCount };
}

// ─── 统一入口 ────────────────────────────────────────────────────────────────
export interface AutoGenerateInput {
  childId: number;
  familyId: number;
  createdBy: number;
  nickname: string;
  birthDate?: Date | null;
  pregnancyRefDate?: Date | null;
  pregnancyWeeksAtRef?: number | null;
  pregnancyDaysAtRef?: number | null;
}

export interface AutoGenerateResult {
  pregnancyEvents: number;
  milestoneEvents: number;
  welcomeEventId: number | null;
  welcomeRsvps: number;
  errors: Array<{ step: string; message: string }>;
}

export async function runChildAutoGeneration(
  input: AutoGenerateInput,
): Promise<AutoGenerateResult> {
  const result: AutoGenerateResult = {
    pregnancyEvents: 0,
    milestoneEvents: 0,
    welcomeEventId: null,
    welcomeRsvps: 0,
    errors: [],
  };

  try {
    result.pregnancyEvents = await generatePregnancyEvents({
      childId: input.childId,
      familyId: input.familyId,
      createdBy: input.createdBy,
      nickname: input.nickname,
      pregnancyRefDate: input.pregnancyRefDate,
      pregnancyWeeksAtRef: input.pregnancyWeeksAtRef,
      pregnancyDaysAtRef: input.pregnancyDaysAtRef,
    });
  } catch (err: any) {
    result.errors.push({ step: "pregnancy", message: String(err?.message || err) });
  }

  try {
    result.milestoneEvents = await generateMilestoneEvents({
      childId: input.childId,
      familyId: input.familyId,
      createdBy: input.createdBy,
      nickname: input.nickname,
      birthDate: input.birthDate,
    });
  } catch (err: any) {
    result.errors.push({ step: "milestone", message: String(err?.message || err) });
  }

  try {
    const welcome = await generateWelcomeEvent({
      childId: input.childId,
      familyId: input.familyId,
      createdBy: input.createdBy,
      nickname: input.nickname,
      birthDate: input.birthDate,
    });
    result.welcomeEventId = welcome.eventId;
    result.welcomeRsvps = welcome.rsvpCount;
  } catch (err: any) {
    result.errors.push({ step: "welcome", message: String(err?.message || err) });
  }

  return result;
}
