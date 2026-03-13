import { useState } from 'react'
import {
  Table, Input, Select, Drawer, Form, Button, Modal, message,
  Pagination, Tooltip, Empty, List, Popconfirm, Space, Typography,
} from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTags, fetchCategories, updateTag,
  fetchCompositions, createComposition, deleteComposition,
} from '../api/client'
import type { Tag, Category, Composition, CompositionTag } from '../api/client'
import { useComposeStore } from '../store/composeStore'

const { Text } = Typography
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
      className="flex items-center gap-2 px-2 py-1.5 rounded-md select-none"
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
          cursor: 'pointer',
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
        {tags.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span style={{ color: '#3f3f46', fontSize: 12 }}>从左侧添加 tag</span>
          </div>
        )}
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

// ── 编辑 Tag Drawer ───────────────────────────────────────────────────────────
function EditTagDrawer({
  tag,
  categories,
  onClose,
  onSaved,
}: {
  tag: Tag | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form] = Form.useForm()

  const mutation = useMutation({
    mutationFn: (values: {
      name_zh: string
      description_zh: string
      category_ids: number[]
      primary_category_id: number | undefined
    }) => updateTag(tag!.id, values),
    onSuccess: () => { message.success('已保存'); onSaved() },
    onError: () => message.error('保存失败'),
  })

  return (
    <Drawer
      title={
        tag ? (
          <Space>
            <Text style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tag.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>编辑</Text>
          </Space>
        ) : '编辑'
      }
      open={!!tag}
      onClose={onClose}
      width={460}
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={mutation.isPending} onClick={() => form.submit()}>
            保存
          </Button>
        </Space>
      }
      destroyOnClose
    >
      {tag && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name_zh: tag.name_zh ?? '',
            description_zh: tag.description_zh ?? '',
            category_ids: tag.categories.map((c) => c.category_id),
            primary_category_id: tag.categories.find((c) => c.is_primary)?.category_id,
          }}
          onFinish={(v) => mutation.mutate(v)}
        >
          <Form.Item label="中文名" name="name_zh">
            <Input placeholder="2-8字简称" />
          </Form.Item>
          <Form.Item label="中文解释" name="description_zh">
            <Input.TextArea rows={3} placeholder="1-2句话说明用途" />
          </Form.Item>
          <Form.Item label="分类（可多选）" name="category_ids">
            <Select
              mode="multiple"
              placeholder="选择分类"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item label="主分类" name="primary_category_id" dependencies={['category_ids']}>
            {() => {
              const ids: number[] = form.getFieldValue('category_ids') ?? []
              return (
                <Select
                  allowClear
                  placeholder="选择主分类"
                  options={ids.map((id) => ({
                    value: id,
                    label: categories.find((c) => c.id === id)?.name ?? id,
                  }))}
                />
              )
            }}
          </Form.Item>
        </Form>
      )}
    </Drawer>
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

  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [templateName, setTemplateName] = useState('')

  const {
    positive, negative,
    addToPositive, addToNegative,
    removeFromPositive, removeFromNegative,
    toggleHighWeight,
    loadComposition,
    getPositivePrompt, getNegativePrompt,
  } = useComposeStore()

  // ── 查询 ───────────────────────────────────────────────────────────────────
  const { data: tagsData, isFetching } = useQuery({
    queryKey: ['tags', q, categoryId, page],
    queryFn: () => fetchTags({ q, category_id: categoryId, page, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
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
    onSuccess: () => {
      message.success('已删除')
      qc.invalidateQueries({ queryKey: ['compositions'] })
    },
  })

  const handleSaveTemplate = () => {
    if (!templateName.trim()) { message.warning('请输入模板名称'); return }
    saveMutation.mutate({ name: templateName.trim(), positive_tags: positive, negative_tags: negative })
  }

  const handleLoadTemplate = (comp: Composition) => {
    try {
      const pos: CompositionTag[] = JSON.parse(comp.positive_tags)
      const neg: CompositionTag[] = JSON.parse(comp.negative_tags)
      loadComposition(
        pos.map((t) => ({ ...t, highWeight: (t as CompositionTag & { highWeight?: boolean }).highWeight ?? false })),
        neg.map((t) => ({ ...t, highWeight: (t as CompositionTag & { highWeight?: boolean }).highWeight ?? false })),
      )
      message.success(`已加载：${comp.name}`)
      onTemplateLibraryClose()
    } catch {
      message.error('模板格式错误')
    }
  }

  // ── Table 列定义 ───────────────────────────────────────────────────────────
  const columns = [
    {
      title: <span style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#3f3f46' }}>图片</span>,
      dataIndex: 'representative_image_url',
      width: 60,
      render: (url: string | null) =>
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
          <div className="text-sm" style={{ color: '#e4e4e7', fontFamily: 'monospace' }}>{name}</div>
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
          <button
            onClick={() => addToPositive({ id: record.id, name: record.name, name_zh: record.name_zh })}
            className="flex items-center justify-center rounded-[5px] text-white font-bold transition-colors"
            style={{ width: 28, height: 28, background: '#7c3aed', border: 'none', cursor: 'pointer', fontSize: 16 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#6d28d9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#7c3aed')}
            title="添加到正向"
          >
            +
          </button>
          <button
            onClick={() => addToNegative({ id: record.id, name: record.name, name_zh: record.name_zh })}
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
          <button
            onClick={() => setEditingTag(record)}
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
      <div className="flex flex-col overflow-hidden" style={{ flex: 3, minWidth: 0 }}>
        {/* 搜索栏 & 筛选 */}
        <div
          className="flex items-center gap-2 px-4 py-2 shrink-0"
          style={{ borderBottom: '1px solid #1c1c21' }}
        >
          <Input.Search
            placeholder="搜索 tag（英文/中文）"
            allowClear
            size="small"
            style={{ maxWidth: 280 }}
            onSearch={(v) => { setQ(v); setPage(1) }}
            onChange={(e) => { if (!e.target.value) { setQ(''); setPage(1) } }}
          />
          <Select
            placeholder="按分类筛选"
            allowClear
            size="small"
            style={{ width: 150 }}
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
          className="flex justify-between items-center px-4 py-2 shrink-0"
          style={{ borderTop: '1px solid #1c1c21' }}
        >
          <span style={{ color: '#52525b', fontSize: 12 }}>共 {total} 个 tag</span>
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
        className="flex flex-col overflow-hidden"
        style={{ flex: 2, borderLeft: '1px solid #1c1c21' }}
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
      <EditTagDrawer
        tag={editingTag}
        categories={categories ?? []}
        onClose={() => setEditingTag(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['tags'] })
          setEditingTag(null)
        }}
      />

      {/* ── 模板库 Drawer ── */}
      <Drawer
        title="已保存模板"
        open={templateLibraryOpen}
        onClose={onTemplateLibraryClose}
        width={360}
      >
        {!compositions?.length ? (
          <Empty description="暂无保存的模板" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={compositions}
            renderItem={(comp: Composition) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="del"
                    title="删除此模板？"
                    onConfirm={() => deleteMutation.mutate(comp.id)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={comp.name}
                  description={
                    <Space direction="vertical" size={2}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(comp.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Button
                        size="small"
                        type="link"
                        style={{ padding: 0, height: 'auto' }}
                        onClick={() => handleLoadTemplate(comp)}
                      >
                        加载此模板
                      </Button>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>

      {/* ── 保存模板 Modal ── */}
      <Modal
        title="保存为模板"
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
