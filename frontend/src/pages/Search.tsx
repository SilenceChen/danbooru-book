import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Input, Select, Table, Tag, Button, Image, Space, Tooltip, Typography, Row, Col, message,
  Drawer, Form,
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { fetchTags, fetchCategories, updateTag, type Tag as TagType, type Category } from '../api/client'
import { useComposeStore } from '../store/composeStore'

const { Search } = Input
const { Text } = Typography

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [editTag, setEditTag] = useState<TagType | null>(null)
  const limit = 50
  const qc = useQueryClient()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const { data, isFetching } = useQuery({
    queryKey: ['tags', q, categoryId, page],
    queryFn: () => fetchTags({ q, category_id: categoryId, page, limit }),
    placeholderData: (prev) => prev,
  })

  const addToPositive = useComposeStore((s) => s.addToPositive)
  const addToNegative = useComposeStore((s) => s.addToNegative)

  const columns = [
    {
      title: '图片',
      dataIndex: 'representative_image_url',
      width: 64,
      render: (url: string | null) =>
        url ? (
          <Image src={url} width={48} height={48} style={{ objectFit: 'cover' }} preview={{ src: url }} />
        ) : (
          <div style={{ width: 48, height: 48, background: '#f5f5f5', borderRadius: 4 }} />
        ),
    },
    {
      title: 'Tag',
      dataIndex: 'name',
      render: (name: string, row: TagType) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontFamily: 'monospace' }}>{name}</Text>
          {row.name_zh && <Text type="secondary" style={{ fontSize: 12 }}>{row.name_zh}</Text>}
        </Space>
      ),
    },
    {
      title: '解释',
      dataIndex: 'description_zh',
      ellipsis: true,
      render: (desc: string | null) => desc ?? <Text type="secondary">—</Text>,
    },
    {
      title: '分类',
      dataIndex: 'categories',
      width: 180,
      render: (cats: TagType['categories']) => (
        <Space wrap size={4}>
          {cats.filter((c) => c.is_primary).map((c) => (
            <Tag color="blue" key={c.category_id}>{c.category_name}</Tag>
          ))}
          {cats.filter((c) => !c.is_primary).map((c) => (
            <Tag key={c.category_id}>{c.category_name}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'post_count',
      width: 100,
      render: (n: number) => n.toLocaleString(),
    },
    {
      title: '操作',
      width: 150,
      render: (_: unknown, row: TagType) => (
        <Space>
          <Tooltip title="加入正向">
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                addToPositive({ id: row.id, name: row.name, name_zh: row.name_zh })
                message.success(`已加入正向: ${row.name}`)
              }}
            >
              正
            </Button>
          </Tooltip>
          <Tooltip title="加入负向">
            <Button
              size="small"
              danger
              icon={<PlusOutlined />}
              onClick={() => {
                addToNegative({ id: row.id, name: row.name, name_zh: row.name_zh })
                message.success(`已加入负向: ${row.name}`)
              }}
            >
              负
            </Button>
          </Tooltip>
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} onClick={() => setEditTag(row)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Search
            placeholder="搜索 tag（英文/中文）"
            allowClear
            onSearch={(v) => { setQ(v); setPage(1) }}
            style={{ width: '100%' }}
          />
        </Col>
        <Col>
          <Select
            placeholder="按分类筛选"
            allowClear
            style={{ width: 160 }}
            options={categories?.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => { setCategoryId(v); setPage(1) }}
          />
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items ?? []}
        columns={columns}
        pagination={{
          current: page,
          pageSize: limit,
          total: data?.total ?? 0,
          showTotal: (t) => `共 ${t} 个 tag`,
          onChange: setPage,
          showSizeChanger: false,
        }}
        size="middle"
        scroll={{ y: 'calc(100vh - 220px)' }}
      />

      <EditTagDrawer
        tag={editTag}
        categories={categories ?? []}
        onClose={() => setEditTag(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['tags'] })
          setEditTag(null)
        }}
      />
    </div>
  )
}

function EditTagDrawer({
  tag,
  categories,
  onClose,
  onSaved,
}: {
  tag: TagType | null
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
      title={tag ? (
        <Space>
          <Text style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tag.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>编辑</Text>
        </Space>
      ) : '编辑'}
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
