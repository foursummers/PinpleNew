#!/usr/bin/env node

import mysql from "mysql2/promise";
import { nanoid } from "nanoid";

function buildDbConfig(rawUrl) {
  const url = new URL(rawUrl);
  const host = url.hostname;
  const sslMode = (url.searchParams.get("ssl-mode") || url.searchParams.get("sslmode") || url.searchParams.get("sslaccept") || url.searchParams.get("ssl") || "").toUpperCase();
  const ssl = sslMode && sslMode !== "DISABLED" && sslMode !== "FALSE"
    ? { rejectUnauthorized: false }
    : !sslMode && (host.endsWith(".aivencloud.com") || host.endsWith(".planetscale.com"))
      ? { rejectUnauthorized: false }
      : undefined;
  return {
    host,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || undefined,
    ssl,
    connectTimeout: 15_000,
  };
}

async function upsertUser(conn, user) {
  const [rows] = await conn.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [user.email]);
  if (rows[0]) return rows[0].id;
  const [result] = await conn.execute(
    "INSERT INTO users (openId, name, email, bio, location, creditScore, birthDate) VALUES (?, ?, ?, ?, ?, 100, ?)",
    [user.openId, user.name, user.email, user.bio, "北京", user.birthDate],
  );
  return result.insertId;
}

async function ensure(conn, sql, params, existsSql, existsParams) {
  const [rows] = await conn.execute(existsSql, existsParams);
  if (rows[0]) return rows[0].id;
  const [result] = await conn.execute(sql, params);
  return result.insertId;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 环境变量未设置");
  const conn = await mysql.createConnection(buildDbConfig(process.env.DATABASE_URL));
  try {
    const erin = await upsertUser(conn, { openId: "seed_erin", name: "Erin", email: "foursummerxy@gmail.com", bio: "龙凤胎妈妈，记录成长的每一步", birthDate: "1993-06-15 00:00:00" });
    const dam = await upsertUser(conn, { openId: "seed_dam", name: "Dam", email: "dam@example.com", bio: "龙凤胎爸爸", birthDate: "1991-09-08 00:00:00" });
    const nanny1 = await upsertUser(conn, { openId: "seed_nanny1", name: "月嫂李姐", email: "nanny1@example.com", bio: "专业月嫂，有 5 年经验", birthDate: "1988-03-12 00:00:00" });
    const nanny2 = await upsertUser(conn, { openId: "seed_nanny2", name: "月嫂王姐", email: "nanny2@example.com", bio: "专业月嫂，有 7 年经验", birthDate: "1985-11-03 00:00:00" });
    const grandma = await upsertUser(conn, { openId: "seed_grandma", name: "外婆", email: "grandma@example.com", bio: "照顾孙子孙女", birthDate: "1964-05-20 00:00:00" });
    const mengmeng = await upsertUser(conn, { openId: "seed_mengmeng", name: "萌萌", email: "mengmeng@example.com", bio: "单身，寻找合适的另一半", birthDate: "1995-06-15 00:00:00" });
    const shasha = await upsertUser(conn, { openId: "seed_shasha", name: "莎莎", email: "shasha@example.com", bio: "热心肠，喜欢介绍朋友", birthDate: "1994-10-02 00:00:00" });

    const familyId = await ensure(conn,
      "INSERT INTO families (name, description, createdBy, inviteCode) VALUES (?, ?, ?, ?)",
      ["Erin 家", "龙凤胎家庭，记录成长的每一步", erin, nanoid(8).toUpperCase()],
      "SELECT id FROM families WHERE createdBy = ? LIMIT 1",
      [erin],
    );

    for (const [userId, role, nickname] of [[erin, "admin", "Erin"], [dam, "admin", "Dam"], [nanny1, "collaborator", "月嫂李姐"], [nanny2, "collaborator", "月嫂王姐"], [grandma, "collaborator", "外婆"]]) {
      await ensure(conn, "INSERT INTO family_members (familyId, userId, role, nickname) VALUES (?, ?, ?, ?)", [familyId, userId, role, nickname], "SELECT id FROM family_members WHERE familyId = ? AND userId = ? LIMIT 1", [familyId, userId]);
    }

    const kongkong = await ensure(conn, "INSERT INTO children (familyId, nickname, fullName, gender, birthDate, isMultiple, childOneName, childTwoName, childOneGender, childTwoGender) VALUES (?, '空空', '空空', 'boy', '2026-02-22 00:00:00', 1, '空空', '多多', 'boy', 'girl')", [familyId], "SELECT id FROM children WHERE familyId = ? AND nickname = '空空' LIMIT 1", [familyId]);
    const duoduo = await ensure(conn, "INSERT INTO children (familyId, nickname, fullName, gender, birthDate, isMultiple, childOneName, childTwoName, childOneGender, childTwoGender) VALUES (?, '多多', '多多', 'girl', '2026-02-22 00:00:00', 1, '空空', '多多', 'boy', 'girl')", [familyId], "SELECT id FROM children WHERE familyId = ? AND nickname = '多多' LIMIT 1", [familyId]);

    await ensure(conn, "INSERT INTO connections (requesterId, receiverId, status, category) VALUES (?, ?, 'accepted', 'life')", [erin, mengmeng], "SELECT id FROM connections WHERE requesterId = ? AND receiverId = ? LIMIT 1", [erin, mengmeng]);
    await ensure(conn, "INSERT INTO connections (requesterId, receiverId, status, category) VALUES (?, ?, 'accepted', 'life')", [erin, shasha], "SELECT id FROM connections WHERE requesterId = ? AND receiverId = ? LIMIT 1", [erin, shasha]);
    await ensure(conn, "INSERT INTO recommendations (userId, recommenderId, targetUserId, context) VALUES (?, ?, ?, ?)", [nanny1, shasha, erin, "莎莎介绍的靠谱月嫂"], "SELECT id FROM recommendations WHERE userId = ? AND recommenderId = ? AND targetUserId = ? LIMIT 1", [nanny1, shasha, erin]);

    for (const task of [["给宝宝洗澡", kongkong, "bath", nanny1], ["准备辅食", duoduo, "feeding", nanny2], ["陪读", null, "play", grandma]]) {
      await ensure(conn, "INSERT INTO routine_tasks (familyId, childId, title, description, category, assignedTo, createdBy, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, 1)", [familyId, task[1], task[0], task[0], task[2], task[3], erin], "SELECT id FROM routine_tasks WHERE familyId = ? AND title = ? LIMIT 1", [familyId, task[0]]);
    }

    console.log("Seed completed", { familyId, erin, dam, kongkong, duoduo, mengmeng, shasha });
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
