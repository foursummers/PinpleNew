# Pinple 前端集成指南

## 1. 替换入口文件

将 `App.tsx` 放到 `client/src/` 目录，修改 `client/src/main.tsx`：

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

## 2. 安装依赖

```bash
npm install @trpc/client superjson
```

## 3. 修改 vite.config 或 index.html

确保 `client/index.html` 中 viewport 设置正确：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<title>Pinple 拼朋友</title>
```

## 4. tRPC 类型（可选）

顶部替换 tRPC 初始化为类型安全版：

```tsx
import type { AppRouter } from "../../server/routers";
const trpc = createTRPCProxyClient<AppRouter>({ ... });
```

## 5. 已实现功能

- 邮箱注册/登录 + Google OAuth 入口
- 家庭创建/加入（邀请码）、多家庭切换
- 孩子档案（双胎、IVF孕周计算、预产期倒计时）
- 孕育手册（时间线/清单/应急/联系/团队 5个标签）
- 日常打卡任务系统
- 技能市场（发布技能/求助）
- 响应式 PC+Mobile 布局

## 6. 设计亮点

主色 #4A7C5F（森林绿）+ 暖金 + 玫瑰红
字体：Noto Serif SC（标题）+ DM Sans（正文）
PC：左侧240px固定导航栏 | Mobile：底部tab栏+抽屉菜单
无外部UI库，纯CSS-in-JS，约1500行
