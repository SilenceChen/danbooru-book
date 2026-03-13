# UI 现代化设计文档

**日期**: 2026-03-13
**状态**: 已批准

---

## 设计目标

将现有 Ant Design 默认样式界面改造为深色主题 + 现代化布局，提升 AI 绘图工具的使用体验。

---

## 视觉风格

| 属性 | 值 |
|------|-----|
| 主题 | 深色（Dark Mode） |
| 背景色 | `#0f0f0f`（页面）/ `#111117`（顶栏）/ `#18181b`（卡片/输入框） |
| 边框色 | `#27272a`（普通）/ `#1c1c21`（分割线） |
| 浮层背景色 | `#212126`（dropdown、tooltip 等 AntD 浮层） |
| 强调色 | `#7c3aed`（紫罗兰） |
| 强调色亮色 | `#a78bfa` |
| 负向色 | `#ef4444`（深）/ `#f87171`（亮） |
| 正文色 | `#e4e4e7`（主）/ `#a1a1aa`（次）/ `#52525b`（暗） |

---

## 技术方案

- **布局层**（顶栏、页面容器、左右分栏、Tag 卡片）：引入 **Tailwind CSS v4**（`@tailwindcss/vite`），用 utility class 重写
- **组件层**（Table、Drawer、Form、Select、Modal）：继续使用 **Ant Design 5**，通过 `ConfigProvider` 开启暗色模式并对齐主色

### Tailwind v4 安装

```bash
npm install @tailwindcss/vite
# Tailwind v4：@tailwindcss/vite 已内置 Tailwind，不需要单独安装 tailwindcss 包
```

`vite.config.ts` 新增插件：
```ts
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({ plugins: [react(), tailwindcss()] })
```

`src/index.css` 顶部（**v4 不使用 tailwind.config.ts**，配置通过 CSS 指令完成）：
```css
/* 不使用 @import "tailwindcss"，而是分开导入以跳过 preflight，避免与 AntD CSS reset 冲突 */
@import "tailwindcss/theme.css";
@import "tailwindcss/utilities.css";

/* 声明 content 扫描路径（v4 @source 指令） */
@source "../src/**/*.{ts,tsx}";
```

### AntD ConfigProvider 配置

```tsx
import { ConfigProvider, theme } from 'antd'

<ConfigProvider theme={{
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#7c3aed',
    colorBgContainer: '#18181b',
    colorBgElevated: '#212126',   // 浮层背景，区别于分割线 #1c1c21
    colorBorder: '#27272a',
    borderRadius: 7,
  }
}}>
```

---

## 页面结构变化

### 导航（顶部导航栏）

从左侧边栏改为**顶部导航栏**，仅保留两个入口：

| 页面 | 说明 |
|------|------|
| 工作台 | Tag 搜索 + 关键词组合（合并为一页） |
| 任务管理 | 爬取 & 翻译任务（保持独立） |

顶栏右侧放置（仅在工作台页面显示）：
- **清空** 按钮（危险色，次要）
- **模板库** 按钮（次要）
- **保存模板** 按钮（主要，紫色）

### 工作台页面布局

左右分栏，`grid-template-columns: 1fr 300px`，整体高度 `calc(100vh - 48px)`（减去顶栏高度）：

```
┌──────────────────────────────┬──────────────────┐
│  搜索栏 + 分类筛选（固定）    │  正向关键词面板   │
├──────────────────────────────│  （flex:1 可滚动）│
│  Tag 列表（flex:1 overflow    ├──────────────────┤
│  auto，AntD Table 无虚拟滚动）│  负向关键词面板   │
│                              │  （flex:1 可滚动）│
├──────────────────────────────┴──────────────────┤
│  分页（固定在底部）                               │
└──────────────────────────────────────────────────┘
```

左侧为 flex column：搜索栏固定 → 列表 `flex:1 overflow-auto` → 分页固定。不使用 `scroll={{ y: 'calc(...)' }}`，改为外层容器控制高度，Table 设 `scroll={{ y: '100%' }}`。

---

## 组件设计

### Tag 列表（左侧）

- 继续使用 AntD `Table`，通过 token 对齐背景色
- 表头文字：`text-[10px] uppercase tracking-widest text-[#3f3f46]`
- 图片缩略图：40×40，`rounded-[5px]`
- 操作列：Tailwind 自定义按钮，替换 AntD Button
  - **正向按钮**：`28×28px`，背景 `#7c3aed`，`rounded-[5px]`，文字 `+`，hover 背景 `#6d28d9`
  - **负向按钮**：`28×28px`，背景 `#18181b`，边框 `#3f1212`，文字 `−`，文字色 `#f87171`，hover 边框 `#ef4444`
- **编辑入口**：操作列保留第三个图标按钮（编辑图标），点击打开 AntD Drawer，功能不变

### 关键词面板（右侧）

正向、负向各自是一个独立 flex column，各自包含：

1. **面板头**（固定）：
   - 正向：圆点色 `#7c3aed`，标题色 `#a78bfa`，标题文字「正向」
   - 负向：圆点色 `#ef4444`，标题色 `#f87171`，标题文字「负向」
   - 右侧：tag 数量（`#52525b`）+ 复制按钮

2. **Tag 列表**（`flex:1 overflow-auto`，`padding: 10px 12px`，`gap: 6px`）

3. **输出预览**（固定在面板底部）：
   - 正向：`border-top: 1px solid #1c1c21`，背景 `#0d0d12`，内容框边框 `#27272a`
   - 负向：同上，内容框边框 `#3f1212`

### Tag 卡片

```
┌─ □ ── tagname  中文名 ───────────── × ─┐
└────────────────────────────────────────┘
```

| 状态 | 背景 | 边框 | 勾选框 |
|------|------|------|--------|
| 正向/未勾选 | `#18181b` | `#27272a` | 空框，边框 `#3f3f46` |
| 正向/已勾选 | `#1e1530` | `#7c3aed55` | 填充 `#7c3aed` + 白色对勾 |
| 负向/未勾选 | `#18181b` | `#3f1212` | 空框，边框 `#3f3f46` |
| 负向/已勾选 | `#200f0f` | `#ef444455` | 填充 `#ef4444` + 白色对勾 |

- 勾选框尺寸：`16×16px`，`rounded-[4px]`
- 删除按钮（`×`）：图标色 `#3f3f46`，hover `#a1a1aa`
- 已勾选时 tag 名自动显示为 `(tagname:1.3)`，字色正向用 `#c4b5fd`，负向用 `#fca5a5`

**高权重输出规则**：固定权重 `1.3`（AI 绘图常用强调值），无需手动调节。

---

## 数据层变更

### `CompositionTag` 类型（定义于 `api/client.ts`）

```ts
// 变更前
export interface CompositionTag { id: number; name: string; name_zh?: string | null; weight: number }

// 变更后
export interface CompositionTag { id: number; name: string; name_zh?: string | null; highWeight: boolean }
```

### `composeStore.ts` 变更

- `addToPositive` / `addToNegative`：初始化 `highWeight: false`
- 删除 `setWeight` action，新增 `toggleHighWeight(side, id)` action
- `getPositivePrompt` / `getNegativePrompt`：`highWeight ? \`(${name}:1.3)\` : name`

### 旧数据兼容

- Zustand persist key 从 `compose-store` 改为 `compose-store-v2`，旧数据自动丢弃，不做迁移（组合编辑器数据为临时工作区，丢失可接受）
- 后端 `createComposition` payload：`positive_tags` / `negative_tags` 仍为 JSON 字符串，但字段由 `weight` 改为 `highWeight`。后端只负责存储，不解析字段内容，因此**后端无需改动**，已保存的旧模板在加载时若字段缺失则 `highWeight` 默认为 `false`

---

## 文件变更范围

| 文件 | 变更类型 |
|------|---------|
| `package.json` | 新增 `@tailwindcss/vite` 依赖 |
| `vite.config.ts` | 新增 `tailwindcss()` 插件 |
| `src/index.css` | 新建，引入 Tailwind v4 分离导入（跳过 preflight） |
| `src/main.tsx` | 引入全局 CSS |
| `src/App.tsx` | 重写：顶部导航 + 两页路由（工作台 / 任务管理） |
| `src/api/client.ts` | `CompositionTag.weight` → `CompositionTag.highWeight` |
| `src/pages/Search.tsx` | 删除（逻辑迁移至 Workbench） |
| `src/pages/Compose.tsx` | 删除（逻辑迁移至 Workbench） |
| `src/pages/Workbench.tsx` | 新建：左右分栏工作台 |
| `src/pages/Tasks.tsx` | 样式更新（浅层暗色适配） |
| `src/store/composeStore.ts` | `setWeight` → `toggleHighWeight`，persist key → v2 |

---

## 不在本次范围内

- 后端 API 无需改动
- 编辑 Tag 的 Drawer 功能逻辑不变，仅视觉样式随主题更新
- 任务管理页面仅做浅层暗色适配，不改结构
