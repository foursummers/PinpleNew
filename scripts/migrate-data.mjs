#!/usr/bin/env node

/**
 * Pinple v4.0 数据迁移脚本
 *
 * 阶段一：在现有 Aiven 数据库上做 "结构补齐 + 字段初始化"
 *   - 不做跨库迁移
 *   - 历史 Manus Google 账户按 openId 识别，保留身份
 *
 * 支持动作：
 *   node scripts/migrate-data.mjs --action=backup   // 备份所有业务表到 .manus-logs/backup_YYYY-MM-DD.json
 *   node scripts/migrate-data.mjs --action=migrate  // 初始化 v4 字段默认值 (bio/location/skillTags/creditScore/reportedCount)
 *   node scripts/migrate-data.mjs --action=verify   // 统计各表行数 + 孤立数据检查 + 生成报告
 *   node scripts/migrate-data.mjs --action=all      // backup → migrate → verify
 *
 * 环境变量：
 *   DATABASE_URL: mysql://user:pass@host:port/db?sslaccept=strict
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, "../.manus-logs");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, "migration.log");

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  try {
    fs.appendFileSync(logFile, logMessage + "\n");
  } catch {}
}

// ─── DB 连接 ──────────────────────────────────────────────────────────────────
// 复用与 server/db.ts 相同的 URL → 连接参数解析逻辑，确保 Aiven SSL 正常
function buildDbConfig(rawUrl) {
  const url = new URL(rawUrl);
  const host = url.hostname;
  const port = url.port ? Number(url.port) : 3306;
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = url.pathname.replace(/^\//, "") || undefined;

  const searchParams = url.searchParams;
  const sslParam = (
    searchParams.get("ssl-mode") ||
    searchParams.get("sslmode") ||
    searchParams.get("sslaccept") ||
    searchParams.get("ssl")
  )?.toUpperCase();

  let ssl = undefined;
  if (sslParam) {
    if (sslParam === "DISABLED" || sslParam === "FALSE") {
      ssl = undefined;
    } else {
      // Aiven 等托管服务推荐启用 TLS；minVersion 走默认即可
      ssl = { rejectUnauthorized: false };
    }
  } else if (host.endsWith(".aivencloud.com") || host.endsWith(".planetscale.com")) {
    // 托管 MySQL 默认强制 TLS
    ssl = { rejectUnauthorized: false };
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl,
    connectTimeout: 15_000,
    multipleStatements: false,
  };
}

async function getConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL 环境变量未设置");
  }
  return mysql.createConnection(buildDbConfig(dbUrl));
}

// ─── 备份 ────────────────────────────────────────────────────────────────────
const BUSINESS_TABLES = [
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
  "reviews",
];

async function tableExists(conn, tableName) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName],
  );
  return rows[0].c > 0;
}

async function backupData() {
  log("开始备份数据...");

  const conn = await getConnection();
  try {
    const backupData = {};
    let totalRows = 0;

    for (const table of BUSINESS_TABLES) {
      if (!(await tableExists(conn, table))) {
        log(`  · 跳过 ${table}（表不存在）`);
        continue;
      }
      const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
      backupData[table] = rows;
      totalRows += rows.length;
      log(`  ✓ ${table}: ${rows.length} 条`);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(logsDir, `backup_${stamp}.json`);
    fs.writeFileSync(
      backupFile,
      JSON.stringify(
        {
          backupAt: new Date().toISOString(),
          totalRows,
          tables: Object.fromEntries(
            Object.entries(backupData).map(([k, v]) => [k, v.length]),
          ),
          data: backupData,
        },
        null,
        2,
      ),
    );
    log(`备份文件已保存: ${backupFile} (共 ${totalRows} 行)`);
    return { backupFile, totalRows };
  } finally {
    await conn.end();
  }
}

// ─── 迁移（只初始化已存在的 v4 字段默认值） ───────────────────────────────────
async function migrateData() {
  log("开始数据迁移...");

  const conn = await getConnection();
  try {
    const results = {};

    // 1) users: 初始化 v4 扩展字段的默认值
    //    只处理当前 schema 已有的列：bio / location / skillTags / creditScore / reportedCount
    log("[users] 初始化 v4 扩展字段默认值...");
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
    log(`  ✓ users 更新影响 ${userUpdate.affectedRows} 行`);
    results.usersUpdated = userUpdate.affectedRows;

    // 2) family_members: 默认 role = 'observer' 已经由 schema 处理；
    //    保证历史数据若存在 NULL relation/remark 留空即可
    if (await tableExists(conn, "family_members")) {
      const [fmCount] = await conn.query("SELECT COUNT(*) AS c FROM `family_members`");
      results.familyMembers = fmCount[0].c;
    }

    // 3) children: 补 notes NULL → ''（可选）
    if (await tableExists(conn, "children")) {
      const [chCount] = await conn.query("SELECT COUNT(*) AS c FROM `children`");
      results.children = chCount[0].c;
    }

    // 4) connections: 补 category NULL → 'life'，hasUpdate NULL → false
    if (await tableExists(conn, "connections")) {
      const [connUpdate] = await conn.query(`
        UPDATE \`connections\` SET
          \`category\`  = COALESCE(\`category\`, 'life'),
          \`hasUpdate\` = COALESCE(\`hasUpdate\`, 0)
        WHERE \`category\` IS NULL OR \`hasUpdate\` IS NULL
      `);
      log(`  ✓ connections 更新影响 ${connUpdate.affectedRows} 行`);
      results.connectionsUpdated = connUpdate.affectedRows;
    }

    log("✓ 数据迁移完成");
    return results;
  } finally {
    await conn.end();
  }
}

// ─── 验证 ────────────────────────────────────────────────────────────────────
async function verifyData() {
  log("开始数据验证...");

  const conn = await getConnection();
  try {
    const report = {
      verifiedAt: new Date().toISOString(),
      counts: {},
      orphans: {},
      v4FieldHealth: {},
    };

    // 1) 表行数
    for (const table of BUSINESS_TABLES) {
      if (!(await tableExists(conn, table))) {
        report.counts[table] = null;
        continue;
      }
      const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
      report.counts[table] = rows[0].c;
      log(`  · ${table}: ${rows[0].c}`);
    }

    // 2) 孤立数据检查
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
      `,
    };

    for (const [key, sqlText] of Object.entries(orphanQueries)) {
      try {
        const [rows] = await conn.query(sqlText);
        report.orphans[key] = rows[0].c;
        if (rows[0].c > 0) {
          log(`  ⚠️ ${key}: ${rows[0].c}`);
        }
      } catch (err) {
        report.orphans[key] = `error: ${err.message}`;
      }
    }

    // 3) v4 字段健康度（users 表关键字段 NULL 数）
    const healthQueries = {
      usersMissingBio: `SELECT COUNT(*) AS c FROM \`users\` WHERE \`bio\` IS NULL`,
      usersMissingSkillTags: `SELECT COUNT(*) AS c FROM \`users\` WHERE \`skillTags\` IS NULL`,
      usersMissingCreditScore: `SELECT COUNT(*) AS c FROM \`users\` WHERE \`creditScore\` IS NULL`,
      usersMissingReportedCount: `SELECT COUNT(*) AS c FROM \`users\` WHERE \`reportedCount\` IS NULL`,
    };
    for (const [key, sqlText] of Object.entries(healthQueries)) {
      try {
        const [rows] = await conn.query(sqlText);
        report.v4FieldHealth[key] = rows[0].c;
      } catch (err) {
        report.v4FieldHealth[key] = `error: ${err.message}`;
      }
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportFile = path.join(logsDir, `verify_${stamp}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    log(`验证报告已保存: ${reportFile}`);

    return report;
  } finally {
    await conn.end();
  }
}

// ─── 入口 ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const action = args.find((arg) => arg.startsWith("--action="))?.split("=")[1] || "verify";

  try {
    log(`========== Pinple v4.0 数据迁移脚本 ==========`);
    log(`操作: ${action}`);

    switch (action) {
      case "backup":
        await backupData();
        break;
      case "migrate":
        await migrateData();
        break;
      case "verify":
        await verifyData();
        break;
      case "all":
        await backupData();
        await migrateData();
        await verifyData();
        break;
      default:
        log(`未知操作: ${action}`);
        process.exit(1);
    }

    log(`========== 操作完成 ==========`);
  } catch (error) {
    log(`❌ 错误: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 允许被 import 或直接执行
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("migrate-data.mjs")) {
  main();
}

export { backupData, migrateData, verifyData, buildDbConfig };
