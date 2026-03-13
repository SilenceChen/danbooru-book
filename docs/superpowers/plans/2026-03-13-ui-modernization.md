# UI 现代化 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Danbooru Tag 管理系统从 Ant Design 默认样式改造为深色主题 + 现代化布局，整合 Search 和 Compose 页面为 Workbench 工作台。

**Architecture:** 布局层用 Tailwind CSS v4 utility classes，组件层（Table/Drawer/Form）继续用 AntD 5 + ConfigProvider 暗色主题。App.tsx 改为顶部导航栏 + 工作台/任务管理两页路由，新建 Workbench.tsx 合并原 Search.tsx 和 Compose.tsx 的功能。

**Tech Stack:** React 19, Ant Design 5, Tailwind CSS v4 (`@tailwindcss/vite`), Zustand 5, React Query 5, React Router 7

---

## Chunk 1: 依赖 & 基础配置

### Task 1: 安装 Tailwind CSS v4

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/index.css`

- [ ] **Step 1: 安装 @tailwindcss/vite**

```bash
cd /Users/mac-silence/Documents/claude-project/danbooru-book/frontend
npm install @tailwindcss/vite
```

Expected: 安装成功，package.json dependencies 新增 `@tailwindcss/vite`

- [ ] **Step 2: 更新 vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 3: 创建 src/index.css**

```css
/* Tailwind v4: 分开导入以跳过 preflight，避免与 AntD CSS reset 冲突 */
@import "tailwindcss/theme.css";
@import "tailwindcss/utilities.css";

/* 声明 content 扫描路径 */
@source "../src/**/*.{ts,tsx}";
```

- [ ] **Step 4: 更新 src/main.tsx — 引入 CSS 并配置 AntD ConfigProvider 暗色主题**

将 `src/main.tsx` 改写为：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#7c3aed',
            colorBgContainer: '#18181b',
            colorBgElevated: '#212126',
            colorBorder: '#27272a',
            borderRadius: 7,
          },
        }}
      >
        <App />
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Step 5: 验证 Tailwind 安装**

```bash
cd /Users/mac-silence/Documents/claude-project/danbooru-book/frontend
npm run build 2>&1 | head -30
```

Expected: build 成功，无 Tailwind 相关错误

- [ ] **Step 6: Commit**

```bash
cd /Users/mac-silence/Documents/claude-project/danbooru-book/frontend
git add package.json package-lock.json vite.config.ts src/index.css src/main.tsx
git commit -m "feat: add Tailwind CSS v4 + AntD dark theme ConfigProvider"
```

---

## Chunk 2: 数据层变更

### Task 2: 更新 CompositionTag 类型和 composeStore

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/store/composeStore.ts`

- [ ] **Step 1: 更新 client.ts 中的 CompositionTag 类型**

找到：
```ts
export interface CompositionTag { id: number; name: string; name_zh?: string | null; weight: number }
```

替换为：
```ts
export interface CompositionTag { id: number; name: string; name_zh?: string | null; highWeight: boolean }
```

- [ ] **Step 2: 重写 composeStore.ts**

完整替换 `src/store/composeStore.ts`：

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CompositionTag } from '../api/client'

interface ComposeState {
  positive: CompositionTag[]
  negative: CompositionTag[]
  addToPositive: (tag: CompositionTag) => void
  addToNegative: (tag: CompositionTag) => void
  removeFromPositive: (id: number) => void
  removeFromNegative: (id: number) => void
  toggleHighWeight: (side: 'positive' | 'negative', id: number) => void
  clearAll: () => void
  getPositivePrompt: () => string
  getNegativePrompt: () => string
}

export const useComposeStore = create<ComposeState>()(
  persist(
    (set, get) => ({
      positive: [],
      negative: [],

      addToPositive: (tag) =>
        set((s) => {
          if (s.positive.find((t) => t.id === tag.id)) return s
          return { positive: [...s.positive, { ...tag, highWeight: false }] }
        }),

      addToNegative: (tag) =>
        set((s) => {
          if (s.negative.find((t) => t.id === tag.id)) return s
          return { negative: [...s.negative, { ...tag, highWeight: false }] }
        }),

      removeFromPositive: (id) =>
        set((s) => ({ positive: s.positive.filter((t) => t.id !== id) })),

      removeFromNegative: (id) =>
        set((s) => ({ negative: s.negative.filter((t) => t.id !== id) })),

      toggleHighWeight: (side, id) =>
        set((s) => ({
          [side]: s[side].map((t) =>
            t.id === id ? { ...t, highWeight: !t.highWeight } : t
          ),
        })),

      clearAll: () => set({ positive: [], negative: [] }),

      getPositivePrompt: () =>
        get()
          .positive.map((t) => (t.highWeight ? `(${t.name}:1.3)` : t.name))
          .join(', '),

      getNegativePrompt: () =>
        get()
          .negative.map((t) => (t.highWeight ? `(${t.name}:1.3)` : t.name))
          .join(', '),
    }),
    { name: 'compose-store-v2' }
  )
)
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd /Users/mac-silence/Documents/claude-project/danbooru-book/frontend
npx tsc --noEmit 2>&1 | head -40
```

Expected: 此时会有报错（因为 Search.tsx / Compose.tsx 还使用旧类型），记录错误继续

- [ ] **Step 4: Commit**

```bash
git add src/api/client.ts src/store/composeStore.ts
git commit -m "feat: replace weight:number with highWeight:boolean in CompositionTag"
```

---

## Chunk 3: App.tsx 重写（顶部导航）

### Task 3: 重写 App.tsx 为顶部导航栏布局

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 重写 App.tsx**

```tsx
import { useState } from 'react'
import { Button, Modal } from 'antd'
import Workbench from './pages/Workbench'
import Tasks from './pages/Tasks'
import { useComposeStore } from './store/composeStore'

type Page = 'workbench' | 'tasks'

export default function App() {
  const [page, setPage] = useState<Page>('workbench')
  const { clearAll } = useComposeStore()

  // 模板库和保存模板功能通过 ref/event 委托给 Workbench
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)

  const handleClear = () => {
    Modal.confirm({
      title: '确认清空',
      content: '将清空正向和负向关键词，此操作不可撤销',
      okText: '清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: clearAll,
    })
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0f0f0f' }}>
      {/* 顶部导航栏 */}
      <header
        className="flex items-center px-4 shrink-0"
        style={{ height: 48, background: '#111117', borderBottom: '1px solid #1c1c21' }}
      >
        {/* Logo */}
        <span className="text-sm font-semibold mr-6" style={{ color: '#a78bfa' }}>
          Danbooru Book
        </span>

        {/* 导航链接 */}
        <nav className="flex gap-1 flex-1">
          {(['workbench', 'tasks'] as Page[]).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className="px-3 py-1 text-sm rounded-md transition-colors"
              style={{
                background: page === p ? '#18181b' : 'transparent',
                color: page === p ? '#e4e4e7' : '#71717a',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {p === 'workbench' ? '工作台' : '任务管理'}
            </button>
          ))}
        </nav>

        {/* 右侧操作按钮（仅工作台显示） */}
        {page === 'workbench' && (
          <div className="flex items-center gap-2">
            <Button
              size="small"
              danger
              type="text"
              onClick={handleClear}
            >
              清空
            </Button>
            <Button
              size="small"
              type="default"
              onClick={() => setTemplateLibraryOpen(true)}
            >
              模板库
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => setSaveTemplateOpen(true)}
            >
              保存模板
            </Button>
          </div>
        )}
      </header>

      {/* 页面内容 */}
      <main className="flex-1 overflow-hidden">
        {page === 'workbench' ? (
          <Workbench
            templateLibraryOpen={templateLibraryOpen}
            onTemplateLibraryClose={() => setTemplateLibraryOpen(false)}
            saveTemplateOpen={saveTemplateOpen}
            onSaveTemplateClose={() => setSaveTemplateOpen(false)}
          />
        ) : (
          <Tasks />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit（先提交，Workbench.tsx 尚未创建，TS 暂时报错）**

```bash
git add src/App.tsx
git commit -m "feat: replace sidebar with top navigation bar"
```

---

## Chunk 4: Workbench.tsx 新建（核心）

### Task 4: 创建 Workbench.tsx — 左侧 Tag 列表 + 右侧关键词面板

**Files:**
- Create: `frontend/src/pages/Workbench.tsx`

这是最大的单文件，包含：
- 左侧：搜索栏 + 分类筛选 + AntD Table + 分页（固定）
- 右侧：正向/负向面板，各含面板头、Tag 卡片列表、输出预览
- EditTagDrawer（从 Search.tsx 迁移）
- 模板库 Modal + 保存模板 Modal（从 Compose.tsx 迁移）

- [ ] **Step 1: 创建 src/pages/Workbench.tsx**

```tsx
import { useState, useMemo } from 'react'
import {
  Table, Input, Select, Drawer, Form, Button, Modal, message,
  Pagination, Tooltip,
} from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTags, fetchCategories, updateTag,
  fetchCompositions, createComposition, deleteComposition,
} from '../api/client'
import type { Tag, Category, CompositionTag } from '../api/client'
import { useComposeStore } from '../store/composeStore'

const PAGE_SIZE = 20

interface WorkbenchProps {
  templateLibraryOpen: boolean
  onTemplateLibraryClose: () => void
  saveTemplateOpen: boolean
  onSaveTemplateClose: () => void
}

// ── Tag 卡片 ──────────────────────────────────────────────────────────────────
interface TagCardProps {
  tag: CompositionTag
  side: 'positive' | 'negative'
  onRemove: (id: number) => void
  onToggleHighWeight: (side: 'positive' | 'negative', id: number) => void
}

function TagCard({ tag, side, onRemove, onToggleHighWeight }: TagCardProps) {
  const isPos = side === 'positive'
  const checkedBg = isPos ? '#1e1530' : '#200f0f'
  const checkedBorder = isPos ? '#7c3aed55' : '#ef444455'
  const uncheckedBorder = isPos ? '#27272a' : '#3f1212'
  const checkFill = isPos ? '#7c3aed' : '#ef4444'
  const tagColor = isPos ? '#c4b5fd' : '#fca5a5'

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm select-none"
      style={{
        background: tag.highWeight ? checkedBg : '#18181b',
        border: `1px solid ${tag.highWeight ? checkedBorder : uncheckedBorder}`,
        minHeight: 32,
      }}
    >
      {/* 勾选框 */}
      <button
        onClick={() => onToggleHighWeight(side, tag.id)}
        className="shrink-0 flex items-center justify-center rounded-[4px] transition-colors"
        style={{
          width: 16, height: 16,
          background: tag.highWeight ? checkFill : 'transparent',
          border: `1.5px solid ${tag.highWeight ? checkFill : '#3f3f46'}`,
        }}
      >
        {tag.highWeight && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Tag 名 */}
      <span
        className="flex-1 truncate text-xs"
        style={{ color: tag.highWeight ? tagColor : '#a1a1aa' }}
      >
        {tag.highWeight ? `(${tag.name}:1.3)` : tag.name}
        {tag.name_zh && (
          <span className="ml-1" style={{ color: '#52525b' }}>{tag.name_zh}</span>
        )}
      </span>

      {/* 删除按钮 */}
      <button
        onClick={() => onRemove(tag.id)}
        className="shrink-0 text-xs leading-none transition-colors"
        style={{ color: '#3f3f46', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#a1a1aa')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#3f3f46')}
      >
        ×
      </button>
    </div>
  )
}

// ── 关键词面板 ─────────────────────────────────────────────────────────────────
interface KeywordPanelProps {
  side: 'positive' | 'negative'
  tags: CompositionTag[]
  prompt: string
  onRemove: (id: number) => void
  onToggleHighWeight: (side: 'positive' | 'negative', id: number) => void
}

function KeywordPanel({ side, tags, prompt, onRemove, onToggleHighWeight }: KeywordPanelProps) {
  const isPos = side === 'positive'
  const accentColor = isPos ? '#7c3aed' : '#ef4444'
  const titleColor = isPos ? '#a78bfa' : '#f87171'
  const outputBorder = isPos ? '#27272a' : '#3f1212'

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prompt)
    message.success('已复制')
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {/* 面板头 */}
      <div
        className="flex items-center px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #1c1c21' }}
      >
        <span
          className="w-2 h-2 rounded-full mr-2 shrink-0"
          style={{ background: accentColor }}
        />
        <span className="text-xs font-medium flex-1" style={{ color: titleColor }}>
          {isPos ? '正向' : '负向'}
        </span>
        <span className="text-xs mr-2" style={{ color: '#52525b' }}>
          {tags.length}
        </span>
        <Tooltip title="复制">
          <button
            onClick={copyToClipboard}
            className="text-xs px-1.5 py-0.5 rounded transition-colors"
            style={{ color: '#52525b', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#a1a1aa')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#52525b')}
          >
            复制
          </button>
        </Tooltip>
      </div>

      {/* Tag 列表 */}
      <div
        className="flex-1 overflow-auto flex flex-col gap-1.5"
        style={{ padding: '10px 12px' }}
      >
        {tags.map((tag) => (
          <TagCard
            key={tag.id}
            tag={tag}
            side={side}
            onRemove={onRemove}
            onToggleHighWeight={onToggleHighWeight}
          />
        ))}
      </div>

      {/* 输出预览 */}
      <div
        className="shrink-0 p-2"
        style={{ borderTop: '1px solid #1c1c21', background: '#0d0d12' }}
      >
        <div
          className="text-xs p-2 rounded min-h-[40px] break-all"
          style={{
            color: '#71717a',
            border: `1px solid ${outputBorder}`,
            background: '#0f0f0f',
          }}
        >
          {prompt || <span style={{ color: '#3f3f46' }}>（空）</span>}
        </div>
      </div>
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function Workbench({
  templateLibraryOpen,
  onTemplateLibraryClose,
  saveTemplateOpen,
  onSaveTemplateClose,
}: WorkbenchProps) {
  const qc = useQueryClient()

  // 搜索 & 筛选状态
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [page, setPage] = useState(1)

  // 编辑 Drawer 状态
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [form] = Form.useForm()

  // 保存模板状态
  const [templateName, setTemplateName] = useState('')

  // Store
  const {
    positive, negative,
    addToPositive, addToNegative,
    removeFromPositive, removeFromNegative,
    toggleHighWeight,
    getPositivePrompt, getNegativePrompt,
  } = useComposeStore()

  // ── 查询 ───────────────────────────────────────────────────────────────────
  const { data: tagsData, isFetching } = useQuery({
    queryKey: ['tags', search, categoryId, page],
    queryFn: () => fetchTags({ search, category_id: categoryId, page, page_size: PAGE_SIZE }),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const { data: compositions } = useQuery({
    queryKey: ['compositions'],
    queryFn: fetchCompositions,
    enabled: templateLibraryOpen,
  })

  // ── 操作 ───────────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Tag> }) => updateTag(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      message.success('更新成功')
      setEditDrawerOpen(false)
    },
  })

  const saveMutation = useMutation({
    mutationFn: createComposition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compositions'] })
      message.success('模板已保存')
      onSaveTemplateClose()
      setTemplateName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteComposition,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compositions'] }),
  })

  const openEditDrawer = (tag: Tag) => {
    setEditingTag(tag)
    form.setFieldsValue({
      name_zh: tag.name_zh,
      description: tag.description,
      category_ids: tag.categories?.map((c: Category) => c.id) ?? [],
    })
    setEditDrawerOpen(true)
  }

  const handleSaveTag = () => {
    if (!editingTag) return
    form.validateFields().then((values) => {
      updateMutation.mutate({ id: editingTag.id, data: values })
    })
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim()) { message.warning('请输入模板名称'); return }
    saveMutation.mutate({
      name: templateName.trim(),
      positive_tags: JSON.stringify(positive),
      negative_tags: JSON.stringify(negative),
    })
  }

  const handleLoadTemplate = (comp: { positive_tags: string; negative_tags: string }) => {
    try {
      const pos: CompositionTag[] = JSON.parse(comp.positive_tags)
      const neg: CompositionTag[] = JSON.parse(comp.negative_tags)
      pos.forEach((t) => addToPositive({ ...t, highWeight: t.highWeight ?? false }))
      neg.forEach((t) => addToNegative({ ...t, highWeight: t.highWeight ?? false }))
      message.success('模板已加载')
      onTemplateLibraryClose()
    } catch {
      message.error('模板格式错误')
    }
  }

  // ── Table 列定义 ───────────────────────────────────────────────────────────
  const columns = [
    {
      title: <span style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#3f3f46' }}>图片</span>,
      dataIndex: 'preview_url',
      width: 60,
      render: (url: string) =>
        url ? (
          <img src={url} alt="" style={{ width: 40, height: 40, borderRadius: 5, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 5, background: '#27272a' }} />
        ),
    },
    {
      title: <span style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#3f3f46' }}>Tag</span>,
      dataIndex: 'name',
      render: (name: string, record: Tag) => (
        <div>
          <div className="text-sm" style={{ color: '#e4e4e7' }}>{name}</div>
          {record.name_zh && (
            <div className="text-xs" style={{ color: '#52525b' }}>{record.name_zh}</div>
          )}
        </div>
      ),
    },
    {
      title: <span style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#3f3f46' }}>使用数</span>,
      dataIndex: 'post_count',
      width: 80,
      render: (n: number) => <span style={{ color: '#71717a', fontSize: 12 }}>{n?.toLocaleString()}</span>,
    },
    {
      title: <span style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#3f3f46' }}>操作</span>,
      width: 110,
      render: (_: unknown, record: Tag) => (
        <div className="flex items-center gap-1">
          {/* 正向按钮 */}
          <button
            onClick={() => addToPositive({ id: record.id, name: record.name, name_zh: record.name_zh, highWeight: false })}
            className="flex items-center justify-center rounded-[5px] text-white font-bold transition-colors"
            style={{ width: 28, height: 28, background: '#7c3aed', border: 'none', cursor: 'pointer', fontSize: 16 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#6d28d9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#7c3aed')}
            title="添加到正向"
          >
            +
          </button>
          {/* 负向按钮 */}
          <button
            onClick={() => addToNegative({ id: record.id, name: record.name, name_zh: record.name_zh, highWeight: false })}
            className="flex items-center justify-center rounded-[5px] transition-colors"
            style={{
              width: 28, height: 28,
              background: '#18181b', border: '1px solid #3f1212',
              color: '#f87171', cursor: 'pointer', fontSize: 16, fontWeight: 'bold',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#3f1212')}
            title="添加到负向"
          >
            −
          </button>
          {/* 编辑按钮 */}
          <button
            onClick={() => openEditDrawer(record)}
            className="flex items-center justify-center rounded-[5px] transition-colors"
            style={{ width: 28, height: 28, background: 'transparent', border: '1px solid #27272a', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#52525b')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#27272a')}
            title="编辑"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="#71717a" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  const tags = tagsData?.items ?? []
  const total = tagsData?.total ?? 0

  return (
    <div
      className="flex"
      style={{ height: 'calc(100vh - 48px)', background: '#0f0f0f' }}
    >
      {/* ── 左侧：Tag 列表 ── */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0 }}>
        {/* 搜索栏 & 筛选 */}
        <div
          className="flex items-center gap-2 px-4 py-2 shrink-0"
          style={{ borderBottom: '1px solid #1c1c21' }}
        >
          <Input.Search
            placeholder="搜索 Tag..."
            allowClear
            size="small"
            style={{ maxWidth: 280 }}
            onSearch={(v) => { setSearch(v); setPage(1) }}
            onChange={(e) => { if (!e.target.value) { setSearch(''); setPage(1) } }}
          />
          <Select
            placeholder="全部分类"
            allowClear
            size="small"
            style={{ width: 140 }}
            options={categories?.map((c: Category) => ({ label: c.name, value: c.id }))}
            onChange={(v) => { setCategoryId(v); setPage(1) }}
          />
        </div>

        {/* Tag 表格 */}
        <div className="flex-1 overflow-auto">
          <Table
            dataSource={tags}
            columns={columns}
            rowKey="id"
            size="small"
            loading={isFetching}
            pagination={false}
            scroll={{ y: '100%' }}
          />
        </div>

        {/* 分页 */}
        <div
          className="flex justify-end px-4 py-2 shrink-0"
          style={{ borderTop: '1px solid #1c1c21' }}
        >
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            size="small"
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </div>

      {/* ── 右侧：关键词面板 ── */}
      <div
        className="flex flex-col shrink-0 overflow-hidden"
        style={{ width: 300, borderLeft: '1px solid #1c1c21' }}
      >
        <KeywordPanel
          side="positive"
          tags={positive}
          prompt={getPositivePrompt()}
          onRemove={removeFromPositive}
          onToggleHighWeight={toggleHighWeight}
        />
        <div style={{ height: 1, background: '#1c1c21', flexShrink: 0 }} />
        <KeywordPanel
          side="negative"
          tags={negative}
          prompt={getNegativePrompt()}
          onRemove={removeFromNegative}
          onToggleHighWeight={toggleHighWeight}
        />
      </div>

      {/* ── 编辑 Tag Drawer ── */}
      <Drawer
        title="编辑 Tag"
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        width={400}
        extra={
          <Button type="primary" loading={updateMutation.isPending} onClick={handleSaveTag}>
            保存
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item label="中文名" name="name_zh">
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item label="分类" name="category_ids">
            <Select
              mode="multiple"
              options={categories?.map((c: Category) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ── 模板库 Modal ── */}
      <Modal
        title="模板库"
        open={templateLibraryOpen}
        onCancel={onTemplateLibraryClose}
        footer={null}
        width={480}
      >
        {compositions?.length === 0 && (
          <div style={{ color: '#52525b', textAlign: 'center', padding: '20px 0' }}>暂无模板</div>
        )}
        {compositions?.map((comp: { id: number; name: string; positive_tags: string; negative_tags: string }) => (
          <div
            key={comp.id}
            className="flex items-center justify-between py-2"
            style={{ borderBottom: '1px solid #27272a' }}
          >
            <span style={{ color: '#e4e4e7' }}>{comp.name}</span>
            <div className="flex gap-2">
              <Button size="small" type="primary" onClick={() => handleLoadTemplate(comp)}>
                加载
              </Button>
              <Button
                size="small"
                danger
                onClick={() => deleteMutation.mutate(comp.id)}
              >
                删除
              </Button>
            </div>
          </div>
        ))}
      </Modal>

      {/* ── 保存模板 Modal ── */}
      <Modal
        title="保存模板"
        open={saveTemplateOpen}
        onCancel={onSaveTemplateClose}
        onOk={handleSaveTemplate}
        okText="保存"
        confirmLoading={saveMutation.isPending}
      >
        <Input
          placeholder="模板名称"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          onPressEnter={handleSaveTemplate}
        />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Workbench.tsx
git commit -m "feat: create Workbench.tsx with split-pane tag search + keyword panels"
```

---

## Chunk 5: 收尾 — Tasks.tsx 暗色适配 & 删除旧页面

### Task 5: 更新 Tasks.tsx 暗色适配

**Files:**
- Modify: `frontend/src/pages/Tasks.tsx`

- [ ] **Step 1: 给 Tasks.tsx 最外层容器加深色背景**

在 Tasks.tsx 的顶层 `div` 加上 `style={{ background: '#0f0f0f', minHeight: 'calc(100vh - 48px)', padding: '24px' }}`，移除原来的 AntD Layout 结构（如果有），替换为普通 div。

具体修改：找到 Tasks.tsx 根元素，改为：
```tsx
<div style={{ background: '#0f0f0f', minHeight: 'calc(100vh - 48px)', padding: '24px' }}>
  {/* 原有内容 */}
</div>
```

### Task 6: 删除旧页面文件

**Files:**
- Delete: `frontend/src/pages/Search.tsx`
- Delete: `frontend/src/pages/Compose.tsx`

- [ ] **Step 1: 删除文件**

```bash
cd /Users/mac-silence/Documents/claude-project/danbooru-book/frontend
rm src/pages/Search.tsx src/pages/Compose.tsx
```

### Task 7: 全量 TypeScript 检查 & 构建验证

- [ ] **Step 1: TypeScript 检查**

```bash
cd /Users/mac-silence/Documents/claude-project/danbooru-book/frontend
npx tsc --noEmit 2>&1
```

Expected: 无类型错误

- [ ] **Step 2: 构建验证**

```bash
npm run build 2>&1
```

Expected: build 成功

- [ ] **Step 3: 最终 Commit**

```bash
git add src/pages/Tasks.tsx
git rm src/pages/Search.tsx src/pages/Compose.tsx
git commit -m "feat: dark mode Tasks.tsx, remove old Search/Compose pages"
```

---

## API 接口说明

实现中用到的 `fetchTags` 参数格式，需确认 `client.ts` 中实际签名：

```ts
fetchTags({ search, category_id, page, page_size })
// 返回 { items: Tag[], total: number }
```

如果返回格式不同（例如直接返回数组），需在 Workbench.tsx 中相应调整 `tagsData?.items` 和 `tagsData?.total`。
