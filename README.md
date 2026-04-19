# 拼朋友 PinpleNew

> **Slogan**：养孩子要拼，找工作要拼，活下来更要拼。

**拼朋友 (Pinple)** 是一款面向年轻家庭和个体从业者的社交 + 技能共享平台。本仓库基于上游 [foursummers/PINPLE](https://github.com/foursummers/PINPLE) 的后端数据层重新实现，前端使用全新的「暖色编辑风」单文件 React 方案（`client/src/App.tsx`）。

## 目录结构

```
PinpleNew/
├── client/              # 前端 (Vite + React 19)
│   ├── index.html       # 入口 HTML (title = 拼朋友 Pinple)
│   ├── public/          # 静态资源
│   └── src/
│       ├── App.tsx      # 全量前端 (自带 CSS-in-JS)
│       ├── main.tsx     # Vite 入口
│       └── index.css    # 全局最小 reset
├── server/              # 后端 (Express + tRPC, 来自上游)
│   ├── _core/           # OAuth / SDK / tRPC 初始化
│   ├── db.ts            # Drizzle 数据访问层
│   ├── routers.ts       # tRPC 路由总表
│   └── storage.ts       # 上传/下载代理
├── shared/              # 前后端共享常量/错误类型
├── drizzle/             # Drizzle schema + migrations
├── drizzle.config.ts
├── tsconfig.json
├── vite.config.ts
├── vercel.json
└── package.json
```

## 运行

1. 安装依赖

   ```bash
   npm install
   ```

2. （可选）配置 MySQL / OAuth 环境变量，参考下表。未配置时服务也能启动，但涉及数据库的 tRPC 调用会失败。

   | 变量 | 说明 |
   |------|------|
   | `DATABASE_URL` | MySQL 连接串 `mysql://user:pass@host:3306/db` |
   | `JWT_SECRET` | JWT / Cookie 签名密钥 |
   | `OAUTH_SERVER_URL` | Manus OAuth 服务地址（Google 登录用） |
   | `VITE_APP_ID` | 应用标识 |
   | `OWNER_OPEN_ID` | 管理员 OpenID |

3. 开发模式（Express 托管 Vite 中间件）

   ```bash
   npm run dev
   ```

   默认监听 `http://localhost:3000`。端口占用时会自动挑选下一个可用端口。

4. 生产构建

   ```bash
   npm run build
   npm start
   ```

5. 数据库迁移

   ```bash
   npm run db:push
   ```

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19 + Vite 7 + 原生 CSS |
| 数据层 | tRPC 11 + superjson |
| 后端 | Node + Express + tRPC |
| ORM | Drizzle + MySQL |
| 认证 | JWT + Cookie Session |

## 产品说明

详见 [`PRODUCT.md`](./PRODUCT.md) 与 [`INTEGRATION.md`](./INTEGRATION.md)。
