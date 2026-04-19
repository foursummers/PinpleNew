/**
 * Pinple — 拼朋友
 * Full-stack React frontend connecting to tRPC backend
 * Design: Warm editorial — organic textures, confident typography, generous space
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

// ─── tRPC Client ──────────────────────────────────────────────────────────────
// credentials: "include" ensures the session cookie is sent on every request,
// even if the browser has unusual defaults or the frontend is later hosted on
// a different subdomain than /api.
const trpc = createTRPCProxyClient<any>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return fetch(input, { ...init, credentials: "include" });
      },
    }),
  ],
});

// ─── Types ────────────────────────────────────────────────────────────────────
type User = { id: number; name: string | null; email: string | null; avatarUrl: string | null; openId: string };
type Family = { id: number; name: string; inviteCode: string; memberRole?: string };
type Child = {
  id: number; familyId: number; nickname: string; fullName?: string;
  gender?: string; birthDate?: string; isMultiple?: boolean;
  childOneName?: string; childTwoName?: string;
  pregnancyRefDate?: string; pregnancyWeeksAtRef?: number;
  embryoTransferDate?: string; embryoDay?: number;
  ageInfo?: { years: number; months: number; totalMonths: number };
  eddInfo?: { lmp: Date; edd: Date; twin37w: Date };
  notes?: string;
};
type TimelineEvent = {
  id: number; childId: number; type: string; title: string;
  content?: string; eventDate: string; isPublic: boolean; createdAt: string;
};
type RoutineTask = {
  id: number; title: string; category: string; icon?: string;
  color?: string; todayCheckins: number; taskType?: string;
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt = (d: string | Date | undefined) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
};

const fmtFull = (d: string | Date | undefined) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
};

function calcCurrentPregnancyWeeks(child: Child): { weeks: number; days: number } | null {
  if (child.pregnancyRefDate && child.pregnancyWeeksAtRef !== undefined) {
    const ref = new Date(child.pregnancyRefDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - ref.getTime()) / 86400000);
    const totalDays = (child.pregnancyWeeksAtRef * 7) + diffDays;
    return { weeks: Math.floor(totalDays / 7), days: totalDays % 7 };
  }
  if (child.embryoTransferDate) {
    const transfer = new Date(child.embryoTransferDate);
    const embryoDay = child.embryoDay ?? 5;
    const daysBack = embryoDay + 14;
    const lmpDate = new Date(transfer.getTime() - daysBack * 86400000);
    const now = new Date();
    const totalDays = Math.floor((now.getTime() - lmpDate.getTime()) / 86400000);
    return { weeks: Math.floor(totalDays / 7), days: totalDays % 7 };
  }
  return null;
}

function daysUntil(d: string | Date | undefined): number | null {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

const PREGNANCY_TIMELINE = [
  { week: "8周", title: "一超", desc: "确认孕囊" },
  { week: "11-13周", title: "NT检查", desc: "早唐筛查" },
  { week: "15-20周", title: "无创DNA", desc: "染色体筛查" },
  { week: "22-24周", title: "大排畸", desc: "四维超声" },
  { week: "24-28周", title: "糖耐量", desc: "GDM筛查" },
  { week: "32-34周", title: "胎位+监护", desc: "每周产检" },
  { week: "37周", title: "预计分娩", desc: "剖宫产" },
];

const ITEM_CHECKLIST = [
  { cat: "🍼 喂养", items: ["奶瓶（宽口）×6", "奶嘴SS/S号×8", "奶瓶消毒器", "温奶器", "吸奶器（电动双边）", "储奶袋×2盒"] },
  { cat: "👕 衣物", items: ["和尚服/连体衣×14件", "包被×4", "帽子×4", "袜子×8双", "口水巾×12条"] },
  { cat: "🛁 洗护", items: ["婴儿浴盆×2", "浴巾×4", "小毛巾×10条", "护臀膏×2", "婴儿沐浴露"] },
  { cat: "🛏️ 睡眠", items: ["婴儿床×2", "床垫×2", "床单×6条", "睡袋（薄款）×4"] },
  { cat: "🚗 出行", items: ["安全提篮×2", "双胞胎推车×1", "妈咪包×1"] },
  { cat: "💊 医护", items: ["耳温枪×2", "吸鼻器×2", "肚脐贴×2盒", "维生素D×1"] },
  { cat: "👩 产妇", items: ["哺乳内衣×4-6件", "一次性内裤×20条", "产妇卫生巾×3包", "防溢乳垫×2盒", "收腹带×1"] },
];

const EMERGENCY_DATA = [
  { type: "🤰 孕期", level: "critical" as const, symptom: "阴道流血", action: "立即急诊" },
  { type: "🤰 孕期", level: "critical" as const, symptom: "剧烈腹痛", action: "立即急诊" },
  { type: "🤰 孕期", level: "critical" as const, symptom: "破水", action: "平躺垫高臀部，急诊" },
  { type: "🤰 孕期", level: "warning" as const, symptom: "持续头痛+眼花", action: "急诊（子痫前期）" },
  { type: "🤰 孕期", level: "warning" as const, symptom: "胎动明显减少", action: "立即就医" },
  { type: "🌸 产后", level: "critical" as const, symptom: "产后大出血", action: "按压子宫，通知医护" },
  { type: "🌸 产后", level: "warning" as const, symptom: "发烧>38.5℃", action: "就医（乳腺炎？感染？）" },
  { type: "🌸 产后", level: "warning" as const, symptom: "情绪低落超2周", action: "心理咨询（产后抑郁）" },
  { type: "👶 新生儿", level: "critical" as const, symptom: "体温>37.5℃", action: "立即就医" },
  { type: "👶 新生儿", level: "warning" as const, symptom: "黄疸严重", action: "就医，可能需蓝光" },
  { type: "👶 新生儿", level: "warning" as const, symptom: "拒奶/嗜睡", action: "观察，持续则就医" },
];

const CONTACTS = [
  { role: "南山医院急诊", phone: "0755-26553111", note: "24小时", urgent: true },
  { role: "深圳市妇幼急诊", phone: "0755-82889999", note: "24小时", urgent: true },
  { role: "产检医生", phone: "待填写", note: "南山医院", urgent: false },
  { role: "月嫂A（空空）", phone: "待填写", note: "负责空空", urgent: false },
  { role: "月嫂B（多多）", phone: "待填写", note: "负责多多", urgent: false },
  { role: "通乳师", phone: "待填写", note: "母乳指导", urgent: false },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=Noto+Serif+SC:wght@400;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --c-bg: #FAFAF7;
  --c-surface: #FFFFFF;
  --c-surface2: #F5F3EE;
  --c-border: rgba(60,50,30,0.1);
  --c-border2: rgba(60,50,30,0.18);
  --c-ink: #1E1C18;
  --c-ink2: #5C5448;
  --c-ink3: #9C9385;
  --c-accent: #4A7C5F;
  --c-accent-light: #EAF2EE;
  --c-accent2: #C4732A;
  --c-accent2-light: #FDF3E8;
  --c-rose: #C45058;
  --c-rose-light: #FDF0F1;
  --c-amber: #B88A2A;
  --c-amber-light: #FDF8EC;
  --ff-display: 'Noto Serif SC', 'Instrument Serif', Georgia, serif;
  --ff-body: 'DM Sans', system-ui, sans-serif;
  --r: 12px; --r-lg: 18px; --r-xl: 24px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06);
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
}

html { scroll-behavior: smooth; }
body { background: var(--c-bg); color: var(--c-ink); font-family: var(--ff-body); font-size: 15px; line-height: 1.6; -webkit-font-smoothing: antialiased; }

/* ── Layout ── */
.app-shell { display: flex; min-height: 100vh; }
.sidebar { width: 240px; flex-shrink: 0; background: var(--c-surface); border-right: 1px solid var(--c-border); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.main-area { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.topbar { background: var(--c-surface); border-bottom: 1px solid var(--c-border); padding: 0 28px; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
.page-body { flex: 1; padding: 32px 32px 80px; max-width: 960px; }

/* ── Sidebar ── */
.sidebar-logo { padding: 24px 20px 16px; }
.logo-mark { font-family: var(--ff-display); font-size: 22px; font-weight: 700; color: var(--c-ink); letter-spacing: -0.5px; }
.logo-mark span { color: var(--c-accent); }
.logo-sub { font-size: 11px; color: var(--c-ink3); margin-top: 2px; letter-spacing: 0.5px; text-transform: uppercase; }
.sidebar-family { margin: 0 12px 8px; }
.family-pill { background: var(--c-accent-light); border: 1px solid rgba(74,124,95,0.2); border-radius: var(--r); padding: 10px 12px; cursor: pointer; transition: all 0.15s; }
.family-pill:hover { background: #DDF0E6; }
.family-pill-name { font-size: 13px; font-weight: 600; color: var(--c-accent); }
.family-pill-code { font-size: 11px; color: var(--c-ink3); margin-top: 1px; }
.sidebar-nav { flex: 1; padding: 4px 12px; }
.nav-section { margin-bottom: 20px; }
.nav-section-label { font-size: 10px; font-weight: 600; color: var(--c-ink3); letter-spacing: 1px; text-transform: uppercase; padding: 0 8px; margin-bottom: 4px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: var(--r); cursor: pointer; transition: all 0.12s; color: var(--c-ink2); font-size: 14px; font-weight: 400; border: none; background: transparent; width: 100%; text-align: left; }
.nav-item:hover { background: var(--c-surface2); color: var(--c-ink); }
.nav-item.active { background: var(--c-accent-light); color: var(--c-accent); font-weight: 500; }
.nav-item .nav-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
.nav-badge { margin-left: auto; background: var(--c-accent); color: white; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 10px; }
.sidebar-bottom { padding: 16px 12px; border-top: 1px solid var(--c-border); }
.user-chip { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--r); cursor: pointer; }
.user-chip:hover { background: var(--c-surface2); }
.avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: white; flex-shrink: 0; }
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 13px; font-weight: 500; color: var(--c-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-email { font-size: 11px; color: var(--c-ink3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Mobile ── */
.mobile-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-top: 1px solid var(--c-border); z-index: 200; padding: 6px 0 env(safe-area-inset-bottom, 0); }
.mobile-nav-items { display: flex; justify-content: space-around; }
.mobile-nav-btn { flex: 1; background: transparent; border: none; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 4px; cursor: pointer; color: var(--c-ink3); font-family: var(--ff-body); transition: color 0.12s; }
.mobile-nav-btn.active { color: var(--c-accent); }
.mobile-nav-btn .mn-icon { font-size: 20px; line-height: 1; }
.mobile-nav-btn span { font-size: 10px; font-weight: 500; }
.topbar-hamburger { display: none; background: transparent; border: none; cursor: pointer; padding: 4px; color: var(--c-ink2); }
.mobile-sidebar { display: none; position: fixed; inset: 0; z-index: 300; }
.mobile-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); }
.mobile-drawer { position: absolute; left: 0; top: 0; bottom: 0; width: 260px; background: var(--c-surface); box-shadow: 4px 0 20px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow-y: auto; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .mobile-nav { display: block; }
  .topbar-hamburger { display: flex; }
  .page-body { padding: 20px 16px 100px; }
  .topbar { padding: 0 16px; }
  .mobile-sidebar.open { display: block; }
}

/* ── Cards ── */
.card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r-lg); padding: 20px 24px; box-shadow: var(--shadow-sm); }
.card-sm { padding: 14px 16px; }
.card + .card { margin-top: 12px; }

/* ── Page header ── */
.page-header { margin-bottom: 28px; }
.page-title { font-family: var(--ff-display); font-size: 26px; font-weight: 700; color: var(--c-ink); letter-spacing: -0.5px; line-height: 1.2; }
.page-subtitle { font-size: 14px; color: var(--c-ink3); margin-top: 4px; }

/* ── Hero card (family dashboard) ── */
.hero-card { background: linear-gradient(135deg, var(--c-accent) 0%, #3A6B50 100%); color: white; border-radius: var(--r-xl); padding: 28px 32px; margin-bottom: 24px; position: relative; overflow: hidden; }
.hero-card::before { content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: rgba(255,255,255,0.07); border-radius: 50%; }
.hero-card::after { content: ''; position: absolute; bottom: -40px; left: 40px; width: 120px; height: 120px; background: rgba(255,255,255,0.05); border-radius: 50%; }
.hero-title { font-family: var(--ff-display); font-size: 22px; font-weight: 700; margin-bottom: 4px; }
.hero-sub { font-size: 13px; opacity: 0.8; }
.hero-stats { display: flex; gap: 20px; margin-top: 20px; }
.hero-stat { }
.hero-stat-val { font-family: var(--ff-display); font-size: 28px; font-weight: 700; line-height: 1; }
.hero-stat-label { font-size: 11px; opacity: 0.75; margin-top: 2px; }

/* ── Stats grid ── */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r); padding: 16px 18px; }
.stat-label { font-size: 12px; color: var(--c-ink3); font-weight: 500; letter-spacing: 0.3px; }
.stat-value { font-family: var(--ff-display); font-size: 24px; font-weight: 700; color: var(--c-ink); margin-top: 4px; line-height: 1; }
.stat-value.accent { color: var(--c-accent); }
.stat-value.amber { color: var(--c-accent2); }
.stat-note { font-size: 11px; color: var(--c-ink3); margin-top: 3px; }

/* ── Timeline ── */
.timeline { position: relative; }
.timeline::before { content: ''; position: absolute; left: 16px; top: 8px; bottom: 8px; width: 2px; background: var(--c-border2); border-radius: 1px; }
.tl-item { position: relative; padding-left: 44px; margin-bottom: 16px; }
.tl-dot { position: absolute; left: 8px; top: 14px; width: 18px; height: 18px; border-radius: 50%; background: var(--c-surface); border: 2px solid var(--c-border2); display: flex; align-items: center; justify-content: center; font-size: 8px; z-index: 1; }
.tl-dot.done { background: var(--c-accent); border-color: var(--c-accent); color: white; }
.tl-dot.current { background: var(--c-accent2); border-color: var(--c-accent2); color: white; animation: pulse 2s infinite; }
.tl-dot.target { background: var(--c-rose); border-color: var(--c-rose); color: white; }
@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(196,115,42,0.3)} 50%{box-shadow:0 0 0 6px rgba(196,115,42,0)} }
.tl-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r); padding: 14px 16px; border-left: 3px solid transparent; }
.tl-card.done { border-left-color: var(--c-accent); }
.tl-card.current { border-left-color: var(--c-accent2); }
.tl-card.target { border-left-color: var(--c-rose); }
.tl-card-row { display: flex; justify-content: space-between; align-items: center; }
.tl-title { font-size: 14px; font-weight: 600; color: var(--c-ink); }
.tl-week { font-size: 11px; color: var(--c-ink3); }
.tl-desc { font-size: 13px; color: var(--c-ink2); margin-top: 3px; }
.tl-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.tl-date { font-size: 11px; color: var(--c-ink3); }
.tl-tag { font-size: 11px; background: var(--c-surface2); color: var(--c-ink2); padding: 2px 8px; border-radius: 6px; }

/* ── Items checklist ── */
.checklist-cat { margin-bottom: 12px; }
.checklist-cat-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r); }
.checklist-cat-header:hover { background: var(--c-surface2); }
.checklist-cat-title { font-size: 14px; font-weight: 600; color: var(--c-ink); }
.checklist-cat-prog { font-size: 12px; color: var(--c-ink3); }
.checklist-items { background: var(--c-surface); border: 1px solid var(--c-border); border-top: none; border-radius: 0 0 var(--r) var(--r); overflow: hidden; }
.checklist-item { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-bottom: 1px solid var(--c-border); cursor: pointer; transition: background 0.1s; }
.checklist-item:last-child { border-bottom: none; }
.checklist-item:hover { background: var(--c-surface2); }
.check-box { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--c-border2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
.check-box.checked { background: var(--c-accent); border-color: var(--c-accent); color: white; }
.checklist-item-name { flex: 1; font-size: 13px; color: var(--c-ink); transition: all 0.15s; }
.checklist-item-name.done { color: var(--c-ink3); text-decoration: line-through; }
.progress-bar { height: 4px; background: var(--c-surface2); border-radius: 2px; overflow: hidden; margin-bottom: 16px; }
.progress-fill { height: 100%; background: var(--c-accent); border-radius: 2px; transition: width 0.4s ease; }

/* ── Emergency ── */
.em-section { margin-bottom: 20px; }
.em-section-title { font-size: 12px; font-weight: 600; color: var(--c-ink3); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; }
.em-card { display: flex; gap: 12px; padding: 12px 14px; border-radius: var(--r); margin-bottom: 8px; }
.em-card.critical { background: var(--c-rose-light); border: 1px solid rgba(196,80,88,0.2); }
.em-card.warning { background: var(--c-amber-light); border: 1px solid rgba(184,138,42,0.2); }
.em-symptom { font-size: 14px; font-weight: 600; }
.em-card.critical .em-symptom { color: var(--c-rose); }
.em-card.warning .em-symptom { color: var(--c-amber); }
.em-action { font-size: 12px; margin-top: 2px; color: var(--c-ink2); }
.em-icon { font-size: 18px; flex-shrink: 0; }

/* ── Contacts ── */
.contact-card { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; }
.contact-card + .contact-card { border-top: 1px solid var(--c-border); }
.contact-urgent { background: var(--c-rose-light); }
.contact-name { font-size: 14px; font-weight: 500; }
.contact-urgent .contact-name { color: var(--c-rose); }
.contact-note { font-size: 12px; color: var(--c-ink3); margin-top: 1px; }
.contact-phone { font-size: 14px; font-weight: 600; }
.contact-urgent .contact-phone { color: var(--c-rose); }

/* ── Team ── */
.team-card { display: flex; gap: 14px; align-items: center; padding: 16px; }
.team-card + .team-card { border-top: 1px solid var(--c-border); }
.team-avatar-circle { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: white; flex-shrink: 0; }
.team-info { flex: 1; }
.team-role { font-size: 14px; font-weight: 600; color: var(--c-ink); }
.team-time { font-size: 11px; color: var(--c-ink3); }
.team-duty { font-size: 13px; color: var(--c-ink2); margin-top: 2px; }

/* ── Auth ── */
.auth-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--c-bg); padding: 20px; }
.auth-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r-xl); padding: 40px; width: 100%; max-width: 420px; box-shadow: var(--shadow); }
.auth-logo { text-align: center; margin-bottom: 32px; }
.auth-logo-mark { font-family: var(--ff-display); font-size: 32px; font-weight: 700; }
.auth-logo-mark span { color: var(--c-accent); }
.auth-tabs { display: flex; background: var(--c-surface2); border-radius: var(--r); padding: 4px; margin-bottom: 24px; }
.auth-tab { flex: 1; border: none; background: transparent; padding: 9px; border-radius: 8px; font-family: var(--ff-body); font-size: 14px; font-weight: 500; color: var(--c-ink3); cursor: pointer; transition: all 0.15s; }
.auth-tab.active { background: var(--c-surface); color: var(--c-ink); box-shadow: var(--shadow-sm); }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; font-weight: 500; color: var(--c-ink2); margin-bottom: 6px; }
.field input { width: 100%; padding: 11px 14px; border: 1.5px solid var(--c-border2); border-radius: var(--r); font-family: var(--ff-body); font-size: 15px; background: var(--c-surface); color: var(--c-ink); outline: none; transition: border-color 0.15s; }
.field input:focus { border-color: var(--c-accent); }
.btn-primary { width: 100%; padding: 13px; background: var(--c-accent); color: white; border: none; border-radius: var(--r); font-family: var(--ff-body); font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.15s; margin-top: 4px; }
.btn-primary:hover { background: #3A6B50; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-outline { padding: 9px 18px; background: transparent; color: var(--c-accent); border: 1.5px solid var(--c-accent); border-radius: var(--r); font-family: var(--ff-body); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.btn-outline:hover { background: var(--c-accent-light); }
.btn-sm { padding: 7px 14px; font-size: 13px; border-radius: 8px; }
.alert { padding: 11px 14px; border-radius: var(--r); font-size: 13px; margin-bottom: 12px; }
.alert-error { background: var(--c-rose-light); color: var(--c-rose); border: 1px solid rgba(196,80,88,0.2); }
.alert-success { background: var(--c-accent-light); color: var(--c-accent); border: 1px solid rgba(74,124,95,0.2); }
.divider { display: flex; align-items: center; gap: 12px; margin: 18px 0; font-size: 12px; color: var(--c-ink3); }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--c-border2); }

/* ── AURA Auth Screen Overrides (scoped to .auth-screen) ── */
.auth-screen {
  position: relative;
  min-height: 100vh;
  background: #030407;
  color: #FFFFFF;
  font-family: 'Space Grotesk', 'DM Sans', system-ui, sans-serif;
  overflow: hidden;
  padding: 24px;
}
.auth-screen::before {
  content: '';
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(900px 520px at 12% 50%, rgba(74,136,255,0.22), transparent 60%),
    radial-gradient(620px 360px at 16% 46%, rgba(255,255,255,0.18), transparent 55%),
    radial-gradient(460px 240px at 22% 55%, rgba(200,220,255,0.14), transparent 50%),
    radial-gradient(700px 320px at 92% 20%, rgba(74,136,255,0.10), transparent 60%);
  filter: blur(20px);
  animation: auraSweep 14s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 0;
}
.auth-screen::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 3px 3px;
  opacity: 0.55;
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 1;
}
@keyframes auraSweep {
  0%   { transform: translate3d(-3%, -2%, 0) scale(1); }
  100% { transform: translate3d(3%, 2%, 0) scale(1.06); }
}

.auth-tech-label {
  position: absolute;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  color: rgba(255,255,255,0.32);
  text-transform: uppercase;
  z-index: 2;
  pointer-events: none;
}
.auth-tech-label.tl { top: 28px; left: 28px; }
.auth-tech-label.bl { bottom: 28px; left: 28px; }
.auth-tech-label.tr { top: 28px; right: 28px; }
.auth-tech-label.br { bottom: 28px; right: 28px; }

.auth-screen .auth-card {
  position: relative;
  z-index: 3;
  width: 100%;
  max-width: 460px;
  margin: 0 auto;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 40px;
  padding: 44px 40px;
  display: flex;
  flex-direction: column;
  gap: 26px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: 0 40px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08);
}

.auth-screen .auth-logo { text-align: left; margin-bottom: 0; }
.auth-screen .auth-logo-mark {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 34px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #fff;
}
.auth-screen .auth-logo-mark span { color: rgba(255,255,255,0.55); font-weight: 300; }

.auth-system-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.08);
  padding: 5px 12px;
  border-radius: 999px;
  align-self: flex-start;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.auth-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: #fff;
  margin-top: 10px;
}
.auth-subtitle {
  color: rgba(255,255,255,0.5);
  font-size: 14px;
  font-weight: 400;
  margin-top: 6px;
}

.auth-screen .auth-tabs {
  display: flex;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 999px;
  padding: 4px;
  margin-bottom: 0;
  gap: 4px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
.auth-screen .auth-tab {
  color: rgba(255,255,255,0.55);
  border-radius: 999px;
  padding: 11px 16px;
  font-family: inherit;
  font-weight: 500;
  font-size: 13px;
  letter-spacing: 0.04em;
  transition: all .25s cubic-bezier(.16,1,.3,1);
}
.auth-screen .auth-tab:hover { color: rgba(255,255,255,0.85); }
.auth-screen .auth-tab.active {
  background: #FFFFFF;
  color: #030407;
  font-weight: 600;
  box-shadow: 0 0 24px rgba(255,255,255,0.22);
}

.auth-sso-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.auth-btn-sso {
  height: 56px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all .2s ease;
  text-decoration: none;
}
.auth-btn-sso:hover {
  background: rgba(255,255,255,0.10);
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.16);
}
.auth-btn-sso svg { width: 18px; height: 18px; }

.auth-screen .divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.auth-screen .divider::before,
.auth-screen .divider::after {
  content: "";
  flex: 1;
  height: 2px;
  background: rgba(255,255,255,0.08);
  border-radius: 999px;
}

.auth-screen .field { margin-bottom: 0; display: flex; flex-direction: column; gap: 8px; }
.auth-screen .field label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  color: rgba(255,255,255,0.55);
  text-transform: uppercase;
  letter-spacing: 0.22em;
  padding-left: 20px;
  margin-bottom: 0;
}
.auth-screen .field input {
  width: 100%;
  height: 56px;
  padding: 0 24px;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  color: #fff;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 15px;
  transition: background 0.2s, border-color 0.2s;
  outline: none;
}
.auth-screen .field input::placeholder { color: rgba(255,255,255,0.28); }
.auth-screen .field input:focus {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.18);
}

.auth-screen .btn-primary {
  width: 100%;
  height: 64px;
  padding: 0;
  margin: 0;
  border-radius: 999px;
  background: #FFFFFF;
  color: #030407;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 0 40px rgba(255,255,255,0.18);
  transition: all .2s ease;
}
.auth-screen .btn-primary:hover:not(:disabled) {
  background: #E0EDFF;
  transform: translateY(-2px);
  box-shadow: 0 0 60px rgba(224,237,255,0.34);
}
.auth-screen .btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.auth-screen .btn-outline {
  width: 100%;
  height: 56px;
  padding: 0;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  color: #fff;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all .2s ease;
}
.auth-screen .btn-outline:hover {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.16);
  transform: translateY(-2px);
}

.auth-screen .alert {
  padding: 12px 18px;
  border-radius: 18px;
  font-size: 13px;
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
}
.auth-screen .alert-error {
  background: rgba(196,80,88,0.14);
  color: #FFB1B6;
  border: 1px solid rgba(196,80,88,0.30);
}
.auth-screen .alert-success {
  background: rgba(74,205,160,0.12);
  color: #9EF5D0;
  border: 1px solid rgba(74,205,160,0.30);
}

.auth-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 0 4px;
}

@media (max-width: 540px) {
  .auth-screen { padding: 16px; }
  .auth-screen .auth-card { padding: 32px 24px; border-radius: 32px; }
  .auth-title { font-size: 26px; }
  .auth-tech-label.tr, .auth-tech-label.br { display: none; }
}

/* ── AURA Boot Screen (shares aura bg with auth screen) ── */
.aura-boot {
  position: relative;
  min-height: 100vh;
  background: #030407;
  color: #fff;
  font-family: 'Space Grotesk', 'DM Sans', system-ui, sans-serif;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.aura-boot::before {
  content: '';
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(900px 520px at 12% 50%, rgba(74,136,255,0.22), transparent 60%),
    radial-gradient(620px 360px at 16% 46%, rgba(255,255,255,0.18), transparent 55%),
    radial-gradient(460px 240px at 22% 55%, rgba(200,220,255,0.14), transparent 50%),
    radial-gradient(700px 320px at 92% 20%, rgba(74,136,255,0.10), transparent 60%);
  filter: blur(20px);
  animation: auraSweep 14s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 0;
}
.aura-boot::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 3px 3px;
  opacity: 0.55;
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 1;
}
.aura-boot-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  text-align: center;
}
.aura-boot-mark {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 42px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #fff;
}
.aura-boot-mark span {
  color: rgba(255,255,255,0.55);
  font-weight: 300;
}
.aura-boot-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(255,255,255,0.75);
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 5px 12px;
  border-radius: 999px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.aura-boot-status {
  font-size: 14px;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.02em;
  min-height: 22px;
}
.aura-boot-dots {
  display: inline-flex;
  gap: 4px;
  margin-left: 6px;
  vertical-align: middle;
}
.aura-boot-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255,255,255,0.6);
  animation: auraBootDot 1.2s ease-in-out infinite;
}
.aura-boot-dots span:nth-child(2) { animation-delay: 0.15s; }
.aura-boot-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes auraBootDot {
  0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
  30%           { opacity: 1;    transform: translateY(-2px); }
}
.aura-boot-bar {
  width: 220px;
  height: 2px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
  position: relative;
}
.aura-boot-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 40%;
  background: linear-gradient(90deg, transparent, rgba(74,136,255,0.9), transparent);
  animation: auraBootBar 1.6s ease-in-out infinite;
}
@keyframes auraBootBar {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
.aura-boot-footer {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  z-index: 2;
}

/* ── Tasks ── */
.task-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.task-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r); padding: 16px; position: relative; overflow: hidden; }
.task-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: var(--r) var(--r) 0 0; }
.task-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.task-title { font-size: 14px; font-weight: 600; color: var(--c-ink); }
.task-count { font-family: var(--ff-display); font-size: 24px; font-weight: 700; color: var(--c-ink); }
.task-label { font-size: 11px; color: var(--c-ink3); }
.task-btn { margin-top: 12px; width: 100%; padding: 8px; background: var(--c-surface2); border: none; border-radius: 8px; font-family: var(--ff-body); font-size: 13px; cursor: pointer; font-weight: 500; transition: background 0.12s; }
.task-btn:hover { background: var(--c-border2); }

/* ── Family selector ── */
.family-select-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--c-bg); padding: 20px; }
.family-select-inner { width: 100%; max-width: 500px; }
.family-select-title { font-family: var(--ff-display); font-size: 28px; font-weight: 700; color: var(--c-ink); margin-bottom: 4px; }
.family-select-sub { font-size: 14px; color: var(--c-ink3); margin-bottom: 28px; }
.family-option { background: var(--c-surface); border: 1.5px solid var(--c-border2); border-radius: var(--r-lg); padding: 18px 20px; cursor: pointer; margin-bottom: 10px; transition: all 0.15s; display: flex; align-items: center; justify-content: space-between; }
.family-option:hover { border-color: var(--c-accent); background: var(--c-accent-light); }
.family-option-name { font-size: 16px; font-weight: 600; color: var(--c-ink); }
.family-option-code { font-size: 12px; color: var(--c-ink3); margin-top: 2px; }
.family-option-arrow { color: var(--c-ink3); font-size: 18px; }

/* ── Loading ── */
.spinner { width: 32px; height: 32px; border: 3px solid var(--c-border2); border-top-color: var(--c-accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 12px; color: var(--c-ink3); font-size: 14px; }

/* ── Children grid ── */
.children-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
.child-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r-lg); padding: 20px; cursor: pointer; transition: all 0.15s; }
.child-card:hover { box-shadow: var(--shadow); border-color: var(--c-accent); }
.child-card-top { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.child-bubble { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.child-name { font-family: var(--ff-display); font-size: 18px; font-weight: 700; color: var(--c-ink); }
.child-gender { font-size: 12px; color: var(--c-ink3); }
.child-pregnancy { margin-top: 4px; display: flex; align-items: baseline; gap: 6px; }
.week-big { font-family: var(--ff-display); font-size: 36px; font-weight: 700; color: var(--c-accent); line-height: 1; }
.week-label { font-size: 13px; color: var(--c-ink3); }
.child-meta { font-size: 12px; color: var(--c-ink3); margin-top: 8px; }
.edd-badge { display: inline-flex; align-items: center; gap: 4px; background: var(--c-accent-light); color: var(--c-accent); font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 8px; margin-top: 8px; }

/* ── Tabs ── */
.tab-bar { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--c-border); }
.tab-btn { padding: 10px 16px; background: transparent; border: none; border-bottom: 2px solid transparent; font-family: var(--ff-body); font-size: 14px; font-weight: 500; color: var(--c-ink3); cursor: pointer; transition: all 0.15s; margin-bottom: -1px; }
.tab-btn.active { color: var(--c-accent); border-bottom-color: var(--c-accent); }
.tab-btn:hover { color: var(--c-ink); }

/* ── Form modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-box { background: var(--c-surface); border-radius: var(--r-xl); padding: 28px; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; }
.modal-title { font-family: var(--ff-display); font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.modal-actions .btn-primary { flex: 1; width: auto; }
.btn-ghost { padding: 11px 20px; background: transparent; color: var(--c-ink2); border: 1px solid var(--c-border2); border-radius: var(--r); font-family: var(--ff-body); font-size: 15px; cursor: pointer; transition: all 0.12s; }
.btn-ghost:hover { background: var(--c-surface2); }

/* ── Invite banner ── */
.invite-banner { background: var(--c-accent-light); border: 1px solid rgba(74,124,95,0.25); border-radius: var(--r); padding: 14px 18px; display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.invite-code { font-family: monospace; font-size: 18px; font-weight: 700; color: var(--c-accent); letter-spacing: 2px; }
.invite-label { font-size: 12px; color: var(--c-ink3); margin-bottom: 2px; }
.btn-copy { background: var(--c-accent); color: white; border: none; padding: 6px 14px; border-radius: 8px; font-family: var(--ff-body); font-size: 13px; cursor: pointer; flex-shrink: 0; transition: all 0.12s; }
.btn-copy:hover { background: #3A6B50; }

/* ── Section label ── */
.section-label { font-size: 12px; font-weight: 600; color: var(--c-ink3); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }

/* ── Info pill ── */
.info-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 500; }
.pill-green { background: var(--c-accent-light); color: var(--c-accent); }
.pill-amber { background: var(--c-accent2-light); color: var(--c-accent2); }
.pill-rose { background: var(--c-rose-light); color: var(--c-rose); }

/* ── Skill/Help items ── */
.list-item { padding: 16px 20px; }
.list-item + .list-item { border-top: 1px solid var(--c-border); }
.list-item-title { font-size: 15px; font-weight: 600; color: var(--c-ink); }
.list-item-meta { font-size: 12px; color: var(--c-ink3); margin-top: 3px; }
.list-item-desc { font-size: 13px; color: var(--c-ink2); margin-top: 6px; }

/* ── Profile ── */
.profile-header { text-align: center; padding: 28px 0 20px; }
.profile-avatar-lg { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: white; margin: 0 auto 12px; }
.profile-name { font-family: var(--ff-display); font-size: 22px; font-weight: 700; }
.profile-email { font-size: 13px; color: var(--c-ink3); margin-top: 3px; }
.credit-bar { background: var(--c-surface2); border-radius: 6px; height: 8px; overflow: hidden; margin-top: 8px; }
.credit-fill { height: 100%; border-radius: 6px; background: linear-gradient(90deg, var(--c-accent), var(--c-accent2)); }
.profile-row { display: flex; align-items: center; gap: 12px; padding: 14px 20px; cursor: pointer; }
.profile-row:hover { background: var(--c-surface2); }
.profile-row + .profile-row { border-top: 1px solid var(--c-border); }
.profile-row-icon { font-size: 18px; width: 24px; text-align: center; }
.profile-row-label { flex: 1; font-size: 14px; font-weight: 500; color: var(--c-ink); }
.profile-row-value { font-size: 13px; color: var(--c-ink3); }
.profile-row-arrow { color: var(--c-ink3); font-size: 16px; }
.btn-danger { width: 100%; padding: 12px; background: transparent; color: var(--c-rose); border: 1.5px solid rgba(196,80,88,0.3); border-radius: var(--r); font-family: var(--ff-body); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.12s; margin-top: 8px; }
.btn-danger:hover { background: var(--c-rose-light); }

/* ── Badge ── */
.new-badge { background: var(--c-rose); color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; }

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--c-border2); border-radius: 3px; }

/* ── Animations ── */
@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.fade-up { animation: fadeUp 0.3s ease forwards; }
`;

// ─── Avatar Color ─────────────────────────────────────────────────────────────
const COLORS = ["#4A7C5F","#C4732A","#A3536B","#4A6EA8","#7A5FA0","#2E8B8B"];
const getAvatarColor = (s: string) => COLORS[s.charCodeAt(0) % COLORS.length];
const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
  const n = name || email || "?";
  return n.slice(0, 2).toUpperCase();
};

// ─── Components ───────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="loading-center"><div className="spinner" /><span>加载中...</span></div>;
}

function AlertMsg({ type, msg }: { type: "error" | "success"; msg: string }) {
  return <div className={`alert alert-${type}`}>{msg}</div>;
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
type AuthMode = "login" | "register" | "forgot" | "reset";

function AuthScreen({ onAuth }: { onAuth: (u: User) => void }) {
  // 如果 URL 里带有 ?reset_token=xxx，进入 reset 模式
  const initialToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("reset_token") || "";
  }, []);

  const [mode, setMode] = useState<AuthMode>(initialToken ? "reset" : "login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [resetToken, setResetToken] = useState(initialToken);
  const [resetUrlFallback, setResetUrlFallback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setSuccess("");
    setResetUrlFallback(null);
  };

  const submit = async () => {
    setError(""); setSuccess("");
    try {
      setLoading(true);
      if (mode === "register") {
        if (!identifier || !password) { setError("请填写邮箱和密码"); return; }
        if (!name) { setError("请填写昵称"); return; }
        if (password.length < 8) { setError("密码至少 8 位"); return; }
        setSuccess("正在创建账号…首次启动可能需要 10–20 秒");
        const res = await (trpc as any).auth.register.mutate({ email: identifier, password, name });
        setSuccess("注册成功，正在进入…");
        // Prefer the user object returned by register to avoid a second DB roundtrip
        // (which on a cold start can hit a fresh lambda and trigger schema bootstrap again).
        const user = res?.user ?? (await (trpc as any).auth.me.query().catch(() => null));
        if (user) onAuth(user);
        else setError("注册成功但获取用户信息失败，请刷新重试");
      } else if (mode === "login") {
        if (!identifier || !password) { setError("请填写账号和密码"); return; }
        const res = await (trpc as any).auth.loginWithIdentifier.mutate({ identifier: identifier.trim(), password });
        setSuccess("登录成功，正在进入…");
        const user = res?.user ?? (await (trpc as any).auth.me.query().catch(() => null));
        if (user) onAuth(user);
        else setError("登录成功但获取用户信息失败，请刷新重试");
      } else if (mode === "forgot") {
        if (!identifier) { setError("请输入你的注册邮箱"); return; }
        const res = await (trpc as any).auth.requestPasswordReset.mutate({ email: identifier.trim() });
        setSuccess("如果该邮箱已注册，我们已向你发送重置链接，请查收邮箱（30 分钟内有效）。");
        if (res?.resetUrl) {
          // 未配置邮件服务时的过渡方案：前端直接显示重置链接
          setResetUrlFallback(res.resetUrl);
        }
      } else if (mode === "reset") {
        if (!resetToken) { setError("重置链接无效，请重新申请"); return; }
        if (password.length < 8) { setError("新密码至少 8 位"); return; }
        if (password !== password2) { setError("两次输入的密码不一致"); return; }
        await (trpc as any).auth.resetPassword.mutate({ token: resetToken, newPassword: password });
        setSuccess("密码已重置，正在登录…");
        // 清掉 URL 上的 token，避免刷新后再次进入 reset 模式
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("reset_token");
          window.history.replaceState({}, "", url.toString());
        }
        const user = await (trpc as any).auth.me.query();
        if (user) onAuth(user);
      }
    } catch (e: any) {
      setError(e?.message || "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const titleMap: Record<AuthMode, string> = {
    login: "欢迎回来",
    register: "加入拼朋友",
    forgot: "找回密码",
    reset: "设置新密码",
  };
  const subtitleMap: Record<AuthMode, string> = {
    login: "信任圈社交 · 技能共享市场 · 用你的邻居守护你的孩子。",
    register: "创建你的信任身份，进入真实社区。",
    forgot: "输入注册邮箱，我们将向你发送带有重置链接的邮件。",
    reset: "为你的账号设置一个新的登录密码。",
  };
  const primaryLabel: Record<AuthMode, React.ReactNode> = {
    login: <>INITIALIZE UPLINK <span aria-hidden>→</span></>,
    register: <>CREATE IDENTITY <span aria-hidden>→</span></>,
    forgot: <>SEND RESET LINK <span aria-hidden>→</span></>,
    reset: <>UPDATE PASSCODE <span aria-hidden>→</span></>,
  };

  const onKeyEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="auth-screen">
      <style>{CSS}</style>

      {/* 科技感角标 */}
      <div className="auth-tech-label tl">SYS.TRUST // ON-LINE</div>
      <div className="auth-tech-label bl">UPLINK_ESTABLISHED_</div>
      <div className="auth-tech-label tr">PINPLE · V04.00</div>
      <div className="auth-tech-label br">[ 拼 · 朋 · 友 ]</div>

      <div className="auth-card fade-up">
        {/* 头部：品牌 + 标题 */}
        <div className="auth-logo">
          <div className="auth-system-badge">PINPLE.IDENTITY</div>
          <div className="auth-logo-mark" style={{ marginTop: 14 }}>pin<span>ple</span></div>
          <h1 className="auth-title">{titleMap[mode]}</h1>
          <p className="auth-subtitle">{subtitleMap[mode]}</p>
        </div>

        {/* 登录 / 注册 切换（在找回/重置模式下隐藏） */}
        {(mode === "login" || mode === "register") && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => switchMode("login")}
            >
              登录
            </button>
            <button
              className={`auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => switchMode("register")}
            >
              注册账号
            </button>
          </div>
        )}

        {error && <AlertMsg type="error" msg={error} />}
        {success && <AlertMsg type="success" msg={success} />}

        {resetUrlFallback && (
          <div className="alert alert-success" style={{ wordBreak: "break-all" }}>
            邮件服务暂未配置，请直接使用此链接重置密码：
            <div style={{ marginTop: 8 }}>
              <a href={resetUrlFallback} style={{ color: "inherit", textDecoration: "underline" }}>
                {resetUrlFallback}
              </a>
            </div>
          </div>
        )}

        {/* 注册专属：昵称 */}
        {mode === "register" && (
          <div className="field">
            <label>NICKNAME · 昵称</label>
            <input
              placeholder="例如：苏瑾"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={onKeyEnter}
            />
          </div>
        )}

        {/* 账号输入：login/register/forgot 都有 */}
        {(mode === "login" || mode === "register" || mode === "forgot") && (
          <div className="field">
            <label>
              {mode === "login" ? "IDENTIFIER · 邮箱 / 用户 ID" : "IDENTIFIER · 邮箱"}
            </label>
            <input
              type={mode === "login" ? "text" : "email"}
              placeholder={mode === "login" ? "邮箱地址 或 数字 ID" : "you@domain.net"}
              autoComplete={mode === "login" ? "username" : "email"}
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              onKeyDown={onKeyEnter}
            />
          </div>
        )}

        {/* 密码输入：login/register/reset 需要 */}
        {(mode === "login" || mode === "register" || mode === "reset") && (
          <div className="field">
            <label>
              PASSCODE · 密码
              {(mode === "register" || mode === "reset") ? " // ≥ 8" : ""}
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={onKeyEnter}
            />
          </div>
        )}

        {/* 重置密码时再加一个"确认密码" */}
        {mode === "reset" && (
          <div className="field">
            <label>CONFIRM · 再次输入</label>
            <input
              type="password"
              placeholder="••••••••••••"
              autoComplete="new-password"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              onKeyDown={onKeyEnter}
            />
          </div>
        )}

        {/* 登录模式下显示"忘记密码" */}
        {mode === "login" && (
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}>
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.55)",
                cursor: "pointer",
                padding: "4px 2px",
                fontFamily: "inherit",
                fontSize: "inherit",
                letterSpacing: "inherit",
                textTransform: "inherit",
              }}
            >
              忘记密码？
            </button>
          </div>
        )}

        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? "处理中…" : primaryLabel[mode]}
        </button>

        {/* 找回/重置模式下提供返回登录入口 */}
        {(mode === "forgot" || mode === "reset") && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}>
            <button
              type="button"
              onClick={() => switchMode("login")}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.55)",
                cursor: "pointer",
                padding: "4px 2px",
                fontFamily: "inherit",
                fontSize: "inherit",
                letterSpacing: "inherit",
                textTransform: "inherit",
              }}
            >
              ← 返回登录
            </button>
          </div>
        )}

        <div className="auth-footer">
          <span>SECURE · E2E · TRUST-RING</span>
          <span>{new Date().getFullYear()} · PINPLE</span>
        </div>
      </div>
    </div>
  );
}

// ─── Family Selector ──────────────────────────────────────────────────────────
function FamilySelector({ user, onSelect }: { user: User; onSelect: (f: Family) => void }) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [famName, setFamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (trpc as any).family.myFamilies.query().then((r: Family[]) => { setFamilies(r); setLoading(false); });
  }, []);

  const createFamily = async () => {
    if (!famName.trim()) { setError("请输入家庭名称"); return; }
    setBusy(true); setError("");
    try {
      const { familyId } = await (trpc as any).family.create.mutate({ name: famName });
      const updated = await (trpc as any).family.myFamilies.query();
      setFamilies(updated);
      const newFam = updated.find((f: Family) => f.id === familyId);
      if (newFam) onSelect(newFam);
    } catch (e: any) { setError(e?.message || "创建失败"); }
    setBusy(false);
  };

  const joinFamily = async () => {
    if (!inviteCode.trim()) { setError("请输入邀请码"); return; }
    setBusy(true); setError("");
    try {
      const { familyId } = await (trpc as any).family.join.mutate({ inviteCode: inviteCode.trim().toUpperCase() });
      const updated = await (trpc as any).family.myFamilies.query();
      setFamilies(updated);
      const joined = updated.find((f: Family) => f.id === familyId);
      if (joined) onSelect(joined);
    } catch (e: any) { setError(e?.message || "加入失败"); }
    setBusy(false);
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div className="spinner" /></div>;

  return (
    <div className="family-select-screen">
      <style>{CSS}</style>
      <div className="family-select-inner fade-up">
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: getAvatarColor(user.openId), display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14 }}>
              {getInitials(user.name, user.email)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-ink)" }}>{user.name || user.email}</div>
              <div style={{ fontSize: 12, color: "var(--c-ink3)" }}>欢迎回来</div>
            </div>
          </div>
        </div>
        <div className="family-select-title">选择家庭空间</div>
        <div className="family-select-sub">选择一个家庭继续，或创建新的</div>
        {error && <AlertMsg type="error" msg={error} />}
        {families.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--c-ink3)", fontSize: 14 }}>还没有家庭，创建或加入一个吧 👨‍👩‍👧</div>
        ) : (
          families.map(f => (
            <div key={f.id} className="family-option" onClick={() => onSelect(f)}>
              <div>
                <div className="family-option-name">{f.name}</div>
                <div className="family-option-code">邀请码：{f.inviteCode} · 角色：{f.memberRole === "admin" ? "管理员" : f.memberRole === "collaborator" ? "协作者" : "观察者"}</div>
              </div>
              <span className="family-option-arrow">›</span>
            </div>
          ))
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn-outline" style={{ flex: 1 }} onClick={() => setShowCreate(true)}>+ 创建家庭</button>
          <button className="btn-outline" style={{ flex: 1 }} onClick={() => setShowJoin(true)}>加入家庭</button>
        </div>
      </div>
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">创建新家庭</div>
            <div className="field"><label>家庭名称</label><input placeholder="例：小橙子一家" value={famName} onChange={e => setFamName(e.target.value)} /></div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>取消</button>
              <button className="btn-primary" onClick={createFamily} disabled={busy}>{busy ? "创建中…" : "创建"}</button>
            </div>
          </div>
        </div>
      )}
      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">加入家庭</div>
            <div className="field"><label>邀请码</label><input placeholder="输入6-8位邀请码" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} /></div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowJoin(false)}>取消</button>
              <button className="btn-primary" onClick={joinFamily} disabled={busy}>{busy ? "加入中…" : "加入"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
function DashboardPage({ family, user, children, tasks }: { family: Family; user: User; children: Child[]; tasks: RoutineTask[] }) {
  const child = children[0];
  const pg = child ? calcCurrentPregnancyWeeks(child) : null;
  const eddDate = child?.eddInfo?.twin37w || child?.eddInfo?.edd;
  const daysLeft = daysUntil(eddDate?.toString());
  const totalCheckins = tasks.reduce((s, t) => s + t.todayCheckins, 0);

  return (
    <div className="fade-up">
      <div className="hero-card">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="hero-title">{family.name} 👶</div>
          <div className="hero-sub">
            {children.map(c => c.childOneName || c.nickname).filter(Boolean).join(" & ") || "家庭管理中心"}
            {child?.isMultiple && " · 龙凤胎 DCDA"}
          </div>
          <div className="hero-stats">
            {pg && (
              <div className="hero-stat">
                <div className="hero-stat-val">{pg.weeks}+{pg.days}</div>
                <div className="hero-stat-label">当前孕周</div>
              </div>
            )}
            {daysLeft !== null && (
              <div className="hero-stat">
                <div className="hero-stat-val">{daysLeft > 0 ? daysLeft : 0}</div>
                <div className="hero-stat-label">距预产还剩天</div>
              </div>
            )}
            <div className="hero-stat">
              <div className="hero-stat-val">{totalCheckins}</div>
              <div className="hero-stat-label">今日打卡</div>
            </div>
          </div>
        </div>
      </div>

      {children.length > 0 && (
        <>
          <div className="section-label">孩子档案</div>
          <div className="children-grid" style={{ marginBottom: 24 }}>
            {children.map(c => {
              const cpg = calcCurrentPregnancyWeeks(c);
              return (
                <div key={c.id} className="child-card">
                  <div className="child-card-top">
                    <div className="child-bubble" style={{ background: c.gender === "girl" ? "var(--c-rose-light)" : "var(--c-accent-light)", fontSize: 22 }}>
                      {c.gender === "girl" ? "👧" : c.gender === "boy" ? "👦" : "👶"}
                    </div>
                    <div>
                      <div className="child-name">{c.childOneName && c.childTwoName ? `${c.childOneName} & ${c.childTwoName}` : c.nickname}</div>
                      <div className="child-gender">{c.isMultiple ? "双胎 DCDA" : c.gender === "girl" ? "女宝" : c.gender === "boy" ? "男宝" : "性别待定"}</div>
                    </div>
                  </div>
                  {cpg && (
                    <div className="child-pregnancy">
                      <div className="week-big">{cpg.weeks}</div>
                      <div className="week-label">周+{cpg.days}天</div>
                    </div>
                  )}
                  {(c.eddInfo?.twin37w || c.eddInfo?.edd) && (
                    <div className="edd-badge">
                      🎯 {c.isMultiple ? "37周" : ""}预产 {fmt(c.eddInfo.twin37w?.toString() || c.eddInfo.edd?.toString())}
                    </div>
                  )}
                  {c.notes && <div className="child-meta" style={{ marginTop: 8 }}>{c.notes}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Family invite code */}
      <div className="invite-banner">
        <div style={{ flex: 1 }}>
          <div className="invite-label">家庭邀请码</div>
          <div className="invite-code">{family.inviteCode}</div>
        </div>
        <button className="btn-copy" onClick={() => navigator.clipboard?.writeText(family.inviteCode)}>复制</button>
      </div>

      {/* Today tasks quick overview */}
      {tasks.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 24 }}>今日打卡</div>
          <div className="task-grid">
            {tasks.slice(0, 4).map(t => (
              <div key={t.id} className="task-card" style={{ "--accent": t.color || "#4A7C5F" } as any}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: t.color || "var(--c-accent)", borderRadius: "var(--r) var(--r) 0 0" }} />
                <div className="task-top">
                  <div className="task-title">{t.title}</div>
                  <span style={{ fontSize: 18 }}>{t.icon || "📋"}</span>
                </div>
                <div className="task-count">{t.todayCheckins}</div>
                <div className="task-label">今日次数</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Children Page ────────────────────────────────────────────────────────────
function ChildrenPage({ family, children, onRefresh }: { family: Family; children: Child[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ nickname: "", isMultiple: false, childOneName: "", childTwoName: "", childOneGender: "unknown", childTwoGender: "unknown", pregnancyRefDate: "", pregnancyWeeksAtRef: 8, embryoTransferDate: "", embryoDay: 5, notes: "" });

  const addChild = async () => {
    if (!form.nickname) { setError("请填写昵称"); return; }
    setBusy(true); setError("");
    try {
      await (trpc as any).children.create.mutate({
        familyId: family.id,
        nickname: form.nickname,
        isMultiple: form.isMultiple,
        childOneName: form.childOneName || undefined,
        childTwoName: form.childTwoName || undefined,
        childOneGender: form.childOneGender as any,
        childTwoGender: form.childTwoGender as any,
        pregnancyRefDate: form.pregnancyRefDate || undefined,
        pregnancyWeeksAtRef: form.pregnancyRefDate ? form.pregnancyWeeksAtRef : undefined,
        embryoTransferDate: form.embryoTransferDate || undefined,
        embryoDay: form.embryoTransferDate ? form.embryoDay : undefined,
        notes: form.notes || undefined,
      });
      onRefresh(); setShowAdd(false);
    } catch (e: any) { setError(e?.message || "添加失败"); }
    setBusy(false);
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="page-title">孩子档案</div>
            <div className="page-subtitle">管理孕期信息与成长记录</div>
          </div>
          <button className="btn-outline btn-sm" onClick={() => setShowAdd(true)}>+ 添加</button>
        </div>
      </div>
      {children.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--c-ink3)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👶</div>
          <div style={{ fontSize: 15 }}>还没有孩子档案</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>点击「添加」开始记录</div>
        </div>
      ) : (
        <div className="children-grid">
          {children.map(c => {
            const pg = calcCurrentPregnancyWeeks(c);
            return (
              <div key={c.id} className="child-card" style={{ cursor: "default" }}>
                <div className="child-card-top">
                  <div className="child-bubble" style={{ background: "var(--c-accent-light)", fontSize: 24 }}>
                    {c.isMultiple ? "👫" : c.childOneGender === "girl" ? "👧" : "👦"}
                  </div>
                  <div>
                    <div className="child-name">{c.childOneName && c.childTwoName ? `${c.childOneName} & ${c.childTwoName}` : c.nickname}</div>
                    <div className="child-gender">{c.isMultiple ? "DCDA 双胎" : "单胎"}</div>
                  </div>
                </div>
                {pg && (
                  <div className="child-pregnancy">
                    <div className="week-big">{pg.weeks}</div>
                    <div className="week-label">周+{pg.days}天</div>
                  </div>
                )}
                <div className="info-row">
                  {c.eddInfo?.twin37w && <span className="pill pill-green">🎯 37w: {fmt(c.eddInfo.twin37w.toString())}</span>}
                  {c.eddInfo?.edd && <span className="pill pill-amber">预产 {fmt(c.eddInfo.edd.toString())}</span>}
                </div>
                {c.notes && <div style={{ fontSize: 13, color: "var(--c-ink2)", marginTop: 10, padding: "8px 12px", background: "var(--c-surface2)", borderRadius: 8 }}>{c.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">添加孩子</div>
            {error && <AlertMsg type="error" msg={error} />}
            <div className="field"><label>档案昵称（如：小星星）</label><input value={form.nickname} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))} /></div>
            <div className="field">
              <label>
                <input type="checkbox" checked={form.isMultiple} onChange={e => setForm(p => ({ ...p, isMultiple: e.target.checked }))} style={{ marginRight: 8, width: "auto" }} />
                双胎（DCDA）
              </label>
            </div>
            {form.isMultiple ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field"><label>孩子一名字</label><input placeholder="空空" value={form.childOneName} onChange={e => setForm(p => ({ ...p, childOneName: e.target.value }))} /></div>
                <div className="field"><label>孩子二名字</label><input placeholder="多多" value={form.childTwoName} onChange={e => setForm(p => ({ ...p, childTwoName: e.target.value }))} /></div>
              </div>
            ) : null}
            <div className="field"><label>参考孕周日期（某天你 X 周几天）</label><input type="date" value={form.pregnancyRefDate} onChange={e => setForm(p => ({ ...p, pregnancyRefDate: e.target.value }))} /></div>
            {form.pregnancyRefDate && (
              <div className="field"><label>那天是第几周（如 8）</label><input type="number" value={form.pregnancyWeeksAtRef} onChange={e => setForm(p => ({ ...p, pregnancyWeeksAtRef: +e.target.value }))} /></div>
            )}
            <div className="field"><label>或：IVF 移植日期</label><input type="date" value={form.embryoTransferDate} onChange={e => setForm(p => ({ ...p, embryoTransferDate: e.target.value }))} /></div>
            {form.embryoTransferDate && (
              <div className="field"><label>胚胎几天（3/5/6天）</label><input type="number" value={form.embryoDay} onChange={e => setForm(p => ({ ...p, embryoDay: +e.target.value }))} /></div>
            )}
            <div className="field"><label>备注</label><input placeholder="DCDA 双胎确认 ✓" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn-primary" onClick={addChild} disabled={busy}>{busy ? "添加中…" : "添加"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pregnancy Manual Page ────────────────────────────────────────────────────
function ManualPage({ children }: { children: Child[] }) {
  const child = children[0];
  const pg = child ? calcCurrentPregnancyWeeks(child) : null;
  const [tab, setTab] = useState<"timeline" | "items" | "emergency" | "contacts" | "team">("timeline");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("pinple_items") || "{}"); } catch { return {}; }
  });
  const [expanded, setExpanded] = useState<number | null>(0);

  const toggleItem = (ci: number, ii: number) => {
    const k = `${ci}-${ii}`;
    setCheckedItems(p => { const n = { ...p, [k]: !p[k] }; localStorage.setItem("pinple_items", JSON.stringify(n)); return n; });
  };
  const total = ITEM_CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const checked = Object.values(checkedItems).filter(Boolean).length;
  const pct = Math.round((checked / total) * 100);

  const TEAM = [
    { role: "月嫂A（主）", duty: "负责空空全面护理", time: "24小时住家", color: "#4A6EA8" },
    { role: "月嫂B（副）", duty: "负责多多全面护理", time: "24小时住家", color: "#C4732A" },
    { role: "外婆", duty: "月子餐、家务、后勤", time: "长期", color: "#B88A2A" },
    { role: "妈妈", duty: "母乳喂养、亲子互动", time: "恢复期", color: "#A3536B" },
    { role: "爸爸", duty: "夜间协助、采购、对外", time: "全程", color: "#4A7C5F" },
  ];

  const emGroups = EMERGENCY_DATA.reduce((acc, e) => {
    if (!acc[e.type]) acc[e.type] = [];
    acc[e.type].push(e);
    return acc;
  }, {} as Record<string, typeof EMERGENCY_DATA>);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="page-title">孕育手册</div>
        <div className="page-subtitle">
          {pg ? `当前 ${pg.weeks}周+${pg.days}天 · ` : ""}关键节点 · 待产清单 · 应急预案
        </div>
      </div>

      <div className="tab-bar">
        {[
          { k: "timeline", l: "📅 孕期" },
          { k: "items", l: `🛒 清单 ${pct}%` },
          { k: "emergency", l: "🚨 应急" },
          { k: "contacts", l: "📞 联系" },
          { k: "team", l: "👥 团队" },
        ].map(({ k, l }) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k as any)}>{l}</button>
        ))}
      </div>

      {tab === "timeline" && (
        <div>
          {child && pg && (
            <div className="card" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--c-ink3)" }}>当前孕周</div>
                <div style={{ fontFamily: "var(--ff-display)", fontSize: 36, fontWeight: 700, color: "var(--c-accent)", lineHeight: 1 }}>{pg.weeks}<span style={{ fontSize: 16 }}>周</span>+{pg.days}天</div>
              </div>
              {(child.eddInfo?.twin37w || child.eddInfo?.edd) && (
                <div style={{ borderLeft: "1px solid var(--c-border)", paddingLeft: 20 }}>
                  <div style={{ fontSize: 12, color: "var(--c-ink3)" }}>{child.isMultiple ? "双胎37周预产" : "预产期"}</div>
                  <div style={{ fontFamily: "var(--ff-display)", fontSize: 22, fontWeight: 700, color: "var(--c-accent2)" }}>
                    {fmtFull(child.eddInfo.twin37w?.toString() || child.eddInfo.edd?.toString())}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-ink3)", marginTop: 2 }}>
                    还有 {Math.max(0, daysUntil(child.eddInfo.twin37w?.toString() || child.eddInfo.edd?.toString()) || 0)} 天
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="timeline">
            {PREGNANCY_TIMELINE.map((item, i) => {
              const status = i === 0 ? "done" : i === 1 ? "current" : i === PREGNANCY_TIMELINE.length - 1 ? "target" : "upcoming";
              return (
                <div key={i} className="tl-item">
                  <div className={`tl-dot ${status}`}>{status === "done" ? "✓" : status === "target" ? "♥" : ""}</div>
                  <div className={`tl-card ${status}`}>
                    <div className="tl-card-row">
                      <span className="tl-title">{item.title}</span>
                      <span className="tl-week">{item.week}</span>
                    </div>
                    <div className="tl-desc">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "items" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "var(--c-ink3)" }}>{checked}/{total} 已准备</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-accent)" }}>{pct}%</div>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          {ITEM_CHECKLIST.map((cat, ci) => {
            const catChecked = cat.items.filter((_, ii) => checkedItems[`${ci}-${ii}`]).length;
            const isOpen = expanded === ci;
            return (
              <div key={ci} className="checklist-cat">
                <div className="checklist-cat-header" onClick={() => setExpanded(isOpen ? null : ci)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{cat.cat.split(" ")[0]}</span>
                    <span className="checklist-cat-title">{cat.cat.split(" ").slice(1).join(" ")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="checklist-cat-prog">{catChecked}/{cat.items.length}</span>
                    <span style={{ fontSize: 12, color: "var(--c-ink3)", transform: isOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="checklist-items">
                    {cat.items.map((item, ii) => {
                      const k = `${ci}-${ii}`;
                      return (
                        <div key={ii} className="checklist-item" onClick={() => toggleItem(ci, ii)}>
                          <div className={`check-box ${checkedItems[k] ? "checked" : ""}`}>{checkedItems[k] ? "✓" : ""}</div>
                          <span className={`checklist-item-name ${checkedItems[k] ? "done" : ""}`}>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "emergency" && (
        <div>
          {Object.entries(emGroups).map(([type, items]) => (
            <div key={type} className="em-section">
              <div className="em-section-title">{type}</div>
              {items.map((item, i) => (
                <div key={i} className={`em-card ${item.level}`}>
                  <span className="em-icon">{item.level === "critical" ? "🚨" : "⚠️"}</span>
                  <div>
                    <div className="em-symptom">{item.symptom}</div>
                    <div className="em-action">{item.action}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div className="card" style={{ background: "var(--c-accent-light)", border: "1px solid rgba(74,124,95,0.2)" }}>
            <div style={{ fontWeight: 600, color: "var(--c-accent)", marginBottom: 4 }}>📍 最近医院</div>
            <div style={{ fontSize: 14, color: "var(--c-accent)" }}>南山区人民医院（南山医院）</div>
            <div style={{ fontSize: 12, color: "var(--c-ink3)", marginTop: 3 }}>桃园路89号 · 急诊：0755-26553111</div>
          </div>
        </div>
      )}

      {tab === "contacts" && (
        <div>
          <div className="section-label">🚨 紧急联系</div>
          <div className="card card-sm" style={{ padding: 0, marginBottom: 16 }}>
            {CONTACTS.filter(c => c.urgent).map((c, i) => (
              <a key={i} href={`tel:${c.phone}`} style={{ textDecoration: "none", display: "block" }}>
                <div className="contact-card contact-urgent">
                  <div><div className="contact-name">{c.role}</div><div className="contact-note">{c.note}</div></div>
                  <div className="contact-phone">{c.phone}</div>
                </div>
              </a>
            ))}
          </div>
          <div className="section-label">📋 其他联系人</div>
          <div className="card card-sm" style={{ padding: 0 }}>
            {CONTACTS.filter(c => !c.urgent).map((c, i) => (
              <div key={i} className="contact-card">
                <div><div className="contact-name">{c.role}</div><div className="contact-note">{c.note}</div></div>
                <div className="contact-phone" style={{ color: "var(--c-ink2)" }}>{c.phone}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "team" && (
        <div>
          <div className="card card-sm" style={{ padding: 0 }}>
            {TEAM.map((m, i) => (
              <div key={i} className="team-card">
                <div className="team-avatar-circle" style={{ background: m.color }}>{m.role.slice(0, 1)}</div>
                <div className="team-info">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="team-role">{m.role}</span>
                    <span className="team-time">{m.time}</span>
                  </div>
                  <div className="team-duty">{m.duty}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: 16, background: "var(--c-amber-light)", border: "1px solid rgba(184,138,42,0.2)" }}>
            <div style={{ fontWeight: 600, color: "var(--c-amber)", marginBottom: 8 }}>💡 月嫂选择提醒</div>
            <div style={{ fontSize: 13, color: "var(--c-ink2)", lineHeight: 1.8 }}>
              · 必须有双胎护理经验<br />
              · 深圳金牌月嫂约 2.8-3.5万/月<br />
              · 建议提前2-3个月预约
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tasks Page ───────────────────────────────────────────────────────────────
function TasksPage({ family, children, tasks, onRefresh }: { family: Family; children: Child[]; tasks: RoutineTask[]; onRefresh: () => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", icon: "📋", color: "#4A7C5F", category: "other" as const, repeatRule: "daily" });

  const checkin = async (taskId: number) => {
    setBusy(taskId);
    try {
      await (trpc as any).tasks.checkin.mutate({ taskId });
      onRefresh();
    } catch {}
    setBusy(null);
  };

  const addTask = async () => {
    if (!form.title) return;
    try {
      await (trpc as any).tasks.create.mutate({ familyId: family.id, ...form });
      onRefresh(); setShowAdd(false);
    } catch {}
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="page-title">日常打卡</div>
            <div className="page-subtitle">今日已打卡 {tasks.reduce((s, t) => s + t.todayCheckins, 0)} 次</div>
          </div>
          <button className="btn-outline btn-sm" onClick={() => setShowAdd(true)}>+ 添加任务</button>
        </div>
      </div>
      {tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--c-ink3)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div>还没有任务</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {tasks.map(t => (
            <div key={t.id} className="card" style={{ borderTop: `3px solid ${t.color || "#4A7C5F"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--c-ink3)", marginTop: 2 }}>{t.category === "feeding" ? "喂养" : t.category === "checkup" ? "检查" : t.category === "sleep" ? "睡眠" : t.category === "play" ? "运动" : "其他"}</div>
                </div>
                <span style={{ fontSize: 20 }}>{t.icon || "📋"}</span>
              </div>
              <div style={{ fontFamily: "var(--ff-display)", fontSize: 32, fontWeight: 700, color: "var(--c-ink)", marginBottom: 4 }}>{t.todayCheckins}</div>
              <div style={{ fontSize: 11, color: "var(--c-ink3)", marginBottom: 12 }}>今日次数</div>
              <button onClick={() => checkin(t.id)} disabled={busy === t.id}
                style={{ width: "100%", padding: "9px", background: busy === t.id ? "var(--c-surface2)" : t.color || "var(--c-accent)", color: busy === t.id ? "var(--c-ink3)" : "white", border: "none", borderRadius: 8, fontFamily: "var(--ff-body)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.12s" }}>
                {busy === t.id ? "记录中…" : "✓ 打卡"}
              </button>
            </div>
          ))}
        </div>
      )}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">添加打卡任务</div>
            <div className="field"><label>任务名称</label><input placeholder="例：体重记录" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="field"><label>图标</label><input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} /></div>
            <div className="field"><label>颜色</label><input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ height: 40 }} /></div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn-primary" onClick={addTask}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skills/Market Page ───────────────────────────────────────────────────────
function MarketPage({ user }: { user: User }) {
  const [tab, setTab] = useState<"skills" | "requests" | "mine">("skills");
  const [skills, setSkills] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [mySkills, setMySkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [sForm, setSForm] = useState({ name: "", category: "other", description: "", location: "", priceMin: "", priceMax: "" });
  const [rForm, setRForm] = useState({ title: "", description: "", location: "", urgency: "medium" as const });

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, m] = await Promise.all([
        (trpc as any).skills.list.query({ limit: 20, offset: 0 }),
        (trpc as any).helpRequests.list.query({ limit: 20, offset: 0 }),
        (trpc as any).skills.mySkills.query(),
      ]);
      setSkills(s); setRequests(r); setMySkills(m);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const publishSkill = async () => {
    if (!sForm.name) return;
    try { await (trpc as any).skills.create.mutate(sForm); load(); setShowPublish(false); } catch (e: any) { alert(e?.message || "发布失败"); }
  };
  const publishRequest = async () => {
    if (!rForm.title) return;
    try { await (trpc as any).helpRequests.create.mutate(rForm); load(); setShowRequest(false); } catch (e: any) { alert(e?.message || "发布失败"); }
  };

  const CATS: Record<string, string> = { education: "教育", childcare: "育儿", housekeeping: "家政", tech: "技术", other: "其他" };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="page-title">技能市场</div>
            <div className="page-subtitle">信任圈内发布/寻找技能服务</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-outline btn-sm" onClick={() => setShowPublish(true)}>+ 发布技能</button>
            <button className="btn-outline btn-sm" onClick={() => setShowRequest(true)}>+ 发布求助</button>
          </div>
        </div>
      </div>
      <div className="tab-bar">
        <button className={`tab-btn ${tab === "skills" ? "active" : ""}`} onClick={() => setTab("skills")}>技能列表</button>
        <button className={`tab-btn ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>求助列表</button>
        <button className={`tab-btn ${tab === "mine" ? "active" : ""}`} onClick={() => setTab("mine")}>我的发布</button>
      </div>
      {loading ? <Spinner /> : (
        <>
          {tab === "skills" && (
            skills.length === 0 ? <div style={{ padding: "48px 0", textAlign: "center", color: "var(--c-ink3)" }}>暂无技能发布</div> :
            <div className="card" style={{ padding: 0 }}>
              {skills.map((s, i) => (
                <div key={i} className="list-item">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="list-item-title">{s.name}</div>
                      <div className="list-item-meta">{CATS[s.category] || s.category} {s.location ? `· ${s.location}` : ""}</div>
                    </div>
                    {(s.priceMin || s.priceMax) && <span className="pill pill-amber">¥{s.priceMin}~{s.priceMax}</span>}
                  </div>
                  {s.description && <div className="list-item-desc">{s.description}</div>}
                </div>
              ))}
            </div>
          )}
          {tab === "requests" && (
            requests.length === 0 ? <div style={{ padding: "48px 0", textAlign: "center", color: "var(--c-ink3)" }}>暂无求助发布</div> :
            <div className="card" style={{ padding: 0 }}>
              {requests.map((r, i) => (
                <div key={i} className="list-item">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div className="list-item-title">{r.title}</div>
                    <span className={`pill ${r.urgency === "high" ? "pill-rose" : r.urgency === "medium" ? "pill-amber" : "pill-green"}`}>
                      {r.urgency === "high" ? "紧急" : r.urgency === "medium" ? "一般" : "不急"}
                    </span>
                  </div>
                  <div className="list-item-meta">{r.location}</div>
                  {r.description && <div className="list-item-desc">{r.description}</div>}
                </div>
              ))}
            </div>
          )}
          {tab === "mine" && (
            mySkills.length === 0 ? <div style={{ padding: "48px 0", textAlign: "center", color: "var(--c-ink3)" }}>还没有发布技能</div> :
            <div className="card" style={{ padding: 0 }}>
              {mySkills.map((s, i) => (
                <div key={i} className="list-item">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div className="list-item-title">{s.name}</div>
                    <span className={`pill ${s.status === "active" ? "pill-green" : "pill-amber"}`}>{s.status === "active" ? "上架" : "下架"}</span>
                  </div>
                  <div className="list-item-meta">{s.category} {s.location ? `· ${s.location}` : ""}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {showPublish && (
        <div className="modal-overlay" onClick={() => setShowPublish(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">发布技能</div>
            <div className="field"><label>技能名称</label><input placeholder="例：月嫂服务" value={sForm.name} onChange={e => setSForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="field"><label>类别</label>
              <select value={sForm.category} onChange={e => setSForm(p => ({ ...p, category: e.target.value }))} style={{ width: "100%", padding: "11px 14px", border: "1.5px solid var(--c-border2)", borderRadius: "var(--r)", fontFamily: "var(--ff-body)", fontSize: 15 }}>
                <option value="education">教育</option><option value="childcare">育儿</option>
                <option value="housekeeping">家政</option><option value="tech">技术</option><option value="other">其他</option>
              </select>
            </div>
            <div className="field"><label>描述</label><input placeholder="简要描述你的技能" value={sForm.description} onChange={e => setSForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="field"><label>服务地点</label><input placeholder="例：深圳南山" value={sForm.location} onChange={e => setSForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field"><label>最低价（元）</label><input type="number" value={sForm.priceMin} onChange={e => setSForm(p => ({ ...p, priceMin: e.target.value }))} /></div>
              <div className="field"><label>最高价（元）</label><input type="number" value={sForm.priceMax} onChange={e => setSForm(p => ({ ...p, priceMax: e.target.value }))} /></div>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowPublish(false)}>取消</button>
              <button className="btn-primary" onClick={publishSkill}>发布</button>
            </div>
          </div>
        </div>
      )}
      {showRequest && (
        <div className="modal-overlay" onClick={() => setShowRequest(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">发布求助</div>
            <div className="field"><label>求助标题</label><input placeholder="例：寻找有双胎经验的月嫂" value={rForm.title} onChange={e => setRForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="field"><label>描述</label><input placeholder="详细描述需求" value={rForm.description} onChange={e => setRForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="field"><label>地点</label><input placeholder="例：深圳南山" value={rForm.location} onChange={e => setRForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div className="field"><label>紧急程度</label>
              <select value={rForm.urgency} onChange={e => setRForm(p => ({ ...p, urgency: e.target.value as any }))} style={{ width: "100%", padding: "11px 14px", border: "1.5px solid var(--c-border2)", borderRadius: "var(--r)", fontFamily: "var(--ff-body)", fontSize: 15 }}>
                <option value="low">不急</option><option value="medium">一般</option><option value="high">紧急</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowRequest(false)}>取消</button>
              <button className="btn-primary" onClick={publishRequest}>发布</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
function ProfilePage({ user, family, onLogout, onSwitchFamily }: { user: User; family: Family; onLogout: () => void; onSwitchFamily: () => void }) {
  const [creditScore, setCreditScore] = useState<number | null>(null);

  useEffect(() => {
    (trpc as any).users.me.query().then(() => {}).catch(() => {});
  }, []);

  const color = getAvatarColor(user.openId);
  const initials = getInitials(user.name, user.email);

  return (
    <div className="fade-up">
      <div className="profile-header">
        <div className="profile-avatar-lg" style={{ background: color }}>{initials}</div>
        <div className="profile-name">{user.name || "用户"}</div>
        <div className="profile-email">{user.email}</div>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: 0 }}>
        <div className="profile-row" onClick={onSwitchFamily}>
          <span className="profile-row-icon">🏠</span>
          <span className="profile-row-label">当前家庭</span>
          <span className="profile-row-value">{family.name}</span>
          <span className="profile-row-arrow">›</span>
        </div>
        <div className="profile-row">
          <span className="profile-row-icon">🎖️</span>
          <span className="profile-row-label">家庭邀请码</span>
          <span className="profile-row-value" style={{ fontFamily: "monospace", letterSpacing: 1 }}>{family.inviteCode}</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: 0 }}>
        <div className="profile-row">
          <span className="profile-row-icon">🌟</span>
          <span className="profile-row-label">信用分</span>
          <span className="profile-row-value">100分</span>
          <span className="profile-row-arrow">›</span>
        </div>
        <div className="profile-row">
          <span className="profile-row-icon">🔗</span>
          <span className="profile-row-label">绑定微信/Google</span>
          <span className="new-badge">即将上线</span>
        </div>
        <div className="profile-row">
          <span className="profile-row-icon">👥</span>
          <span className="profile-row-label">人脉圈</span>
          <span className="new-badge">即将上线</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: 0 }}>
        <div className="profile-row">
          <span className="profile-row-icon">📖</span>
          <span className="profile-row-label">关于 Pinple</span>
          <span className="profile-row-value">v4.0</span>
          <span className="profile-row-arrow">›</span>
        </div>
        <a href="/api/oauth/callback?provider=google" style={{ textDecoration: "none", display: "block" }}>
          <div className="profile-row">
            <span className="profile-row-icon">G</span>
            <span className="profile-row-label">切换 Google 登录</span>
            <span className="profile-row-arrow">›</span>
          </div>
        </a>
      </div>

      <button className="btn-danger" onClick={onLogout}>退出登录</button>
      <div style={{ height: 32 }} />
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home", icon: "🏠", label: "首页" },
  { id: "children", icon: "👶", label: "宝宝" },
  { id: "manual", icon: "📖", label: "手册" },
  { id: "tasks", icon: "✅", label: "打卡" },
  { id: "market", icon: "🛍", label: "市场" },
  { id: "profile", icon: "👤", label: "我的" },
];

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [family, setFamily] = useState<Family | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [page, setPage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [bootElapsed, setBootElapsed] = useState(0);

  // Auth check
  useEffect(() => {
    (trpc as any).auth.me.query().then((u: User | null) => setUser(u)).catch(() => setUser(null));
  }, []);

  // Track elapsed time during boot so we can surface a friendlier message on slow cold starts.
  useEffect(() => {
    if (user !== undefined) return;
    const started = Date.now();
    const timer = setInterval(() => setBootElapsed(Date.now() - started), 500);
    return () => clearInterval(timer);
  }, [user]);

  // Load family data
  const loadFamilyData = useCallback(async (fam: Family) => {
    setLoadingData(true);
    try {
      const [kids, tks] = await Promise.all([
        (trpc as any).children.list.query({ familyId: fam.id }),
        (trpc as any).tasks.list.query({ familyId: fam.id }),
      ]);
      setChildren(kids);
      setTasks(tks);
    } catch {}
    setLoadingData(false);
  }, []);

  useEffect(() => { if (family) loadFamilyData(family); }, [family]);

  const handleLogout = async () => {
    await (trpc as any).auth.logout.mutate();
    setUser(null); setFamily(null);
  };

  // Loading state — shares the AURA look of the auth screen so the app feels cohesive.
  if (user === undefined) {
    const secs = Math.floor(bootElapsed / 1000);
    const statusText =
      secs < 4
        ? "正在连接服务"
        : secs < 10
        ? "正在同步会话状态"
        : secs < 20
        ? "首次启动中，正在准备数据库"
        : "仍在启动中，感谢你的耐心";
    return (
      <div className="aura-boot">
        <style>{CSS}</style>
        <div className="aura-boot-inner">
          <div className="aura-boot-badge">PINPLE · AURA SYSTEM</div>
          <div className="aura-boot-mark">pin<span>ple</span></div>
          <div className="aura-boot-bar" />
          <div className="aura-boot-status">
            {statusText}
            <span className="aura-boot-dots"><span /><span /><span /></span>
          </div>
        </div>
        <div className="aura-boot-footer">
          BOOT · {String(secs).padStart(2, "0")}s ELAPSED
        </div>
      </div>
    );
  }

  // Auth required
  if (!user) return <AuthScreen onAuth={u => { setUser(u); }} />;

  // Family required
  if (!family) return <FamilySelector user={user} onSelect={f => setFamily(f)} />;

  const renderPage = () => {
    if (loadingData && (page === "home" || page === "children" || page === "tasks")) return <Spinner />;
    switch (page) {
      case "home": return <DashboardPage family={family} user={user} children={children} tasks={tasks} />;
      case "children": return <ChildrenPage family={family} children={children} onRefresh={() => loadFamilyData(family)} />;
      case "manual": return <ManualPage children={children} />;
      case "tasks": return <TasksPage family={family} children={children} tasks={tasks} onRefresh={() => loadFamilyData(family)} />;
      case "market": return <MarketPage user={user} />;
      case "profile": return <ProfilePage user={user} family={family} onLogout={handleLogout} onSwitchFamily={() => setFamily(null)} />;
      default: return <DashboardPage family={family} user={user} children={children} tasks={tasks} />;
    }
  };

  const SidebarContent = () => (
    <>
      <div className="sidebar-logo">
        <div className="logo-mark">pin<span>ple</span></div>
        <div className="logo-sub">家庭管理 · 技能共享</div>
      </div>
      <div className="sidebar-family">
        <div className="family-pill" onClick={() => { setFamily(null); setSidebarOpen(false); }}>
          <div className="family-pill-name">{family.name}</div>
          <div className="family-pill-code">邀请码 {family.inviteCode}</div>
        </div>
      </div>
      <div className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-label">主导航</div>
          {NAV_ITEMS.map(item => (
            <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => { setPage(item.id); setSidebarOpen(false); }}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="sidebar-bottom">
        <div className="user-chip" onClick={() => { setPage("profile"); setSidebarOpen(false); }}>
          <div className="avatar" style={{ background: getAvatarColor(user.openId) }}>{getInitials(user.name, user.email)}</div>
          <div className="user-info">
            <div className="user-name">{user.name || "用户"}</div>
            <div className="user-email">{user.email || user.openId}</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="app-shell">
        {/* Desktop Sidebar */}
        <aside className="sidebar"><SidebarContent /></aside>

        {/* Main */}
        <div className="main-area">
          <header className="topbar">
            <button className="topbar-hamburger" onClick={() => setSidebarOpen(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div style={{ fontFamily: "var(--ff-display)", fontSize: 18, fontWeight: 700, color: "var(--c-ink)" }}>
              {NAV_ITEMS.find(n => n.id === page)?.icon} {NAV_ITEMS.find(n => n.id === page)?.label}
            </div>
            <div className="avatar" style={{ background: getAvatarColor(user.openId), cursor: "pointer" }} onClick={() => setPage("profile")}>
              {getInitials(user.name, user.email)}
            </div>
          </header>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div className="page-body">{renderPage()}</div>
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="mobile-nav">
          <div className="mobile-nav-items">
            {NAV_ITEMS.map(item => (
              <button key={item.id} className={`mobile-nav-btn ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
                <span className="mn-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile Sidebar Drawer */}
        <div className={`mobile-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
          <div className="mobile-drawer"><SidebarContent /></div>
        </div>
      </div>
    </>
  );
}
