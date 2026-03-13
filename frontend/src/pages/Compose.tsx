import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Row, Col, Input, Button, Tag, Slider, Space, Typography, Card,
  List, message, Modal, Empty, Drawer, Popconfirm,
} from 'antd'
import { DeleteOutlined, CopyOutlined, SaveOutlined, ClearOutlined, BookOutlined } from '@ant-design/icons'
import { useComposeStore } from '../store/composeStore'
import {
  createComposition, fetchCompositions, deleteComposition,
  type CompositionTag, type Composition,
} from '../api/client'

const { Text, Title } = Typography

// 日期格式化
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function TagPanel({
  title,
  tags,
  onRemove,
  onWeightChange,
  color,
}: {
  title: string
  tags: CompositionTag[]
  onRemove: (id: number) => void
  onWeightChange: (id: number, w: number) => void
  color: string
}) {
  return (
    <Card
      title={<span style={{ color }}>{title}（{tags.length}）</span>}
      size="small"
      style={{ height: '100%' }}
      bodyStyle={{ padding: 8 }}
    >
      {tags.length === 0 ? (
        <Empty description="从搜索页面添加 tag" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={tags}
          renderItem={(tag) => (
            <List.Item
              style={{ padding: '6px 4px' }}
              actions={[
                <Button
                  key="del"
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onRemove(tag.id)}
                />,
              ]}
            >
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Space>
                  <Tag color={color} style={{ fontFamily: 'monospace', margin: 0 }}>
                    {tag.name}
                  </Tag>
                  {tag.name_zh && (
                    <Text type="secondary" style={{ fontSize: 11 }}>{tag.name_zh}</Text>
                  )}
                </Space>
                <div style={{ paddingRight: 40 }}>
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={tag.weight}
                    onChange={(v) => onWeightChange(tag.id, v)}
                    tooltip={{ formatter: (v) => `权重 ${v}` }}
                  />
                </div>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}

export default function ComposePage() {
  const {
    positive, negative,
    removeFromPositive, removeFromNegative,
    setWeight, clear, loadComposition,
    getPositivePrompt, getNegativePrompt,
  } = useComposeStore()

  const [saveName, setSaveName] = useState('')
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const qc = useQueryClient()

  const { data: compositions } = useQuery({
    queryKey: ['compositions'],
    queryFn: fetchCompositions,
    enabled: templatesOpen,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteComposition,
    onSuccess: () => {
      message.success('已删除')
      qc.invalidateQueries({ queryKey: ['compositions'] })
    },
  })

  const saveMutation = useMutation({
    mutationFn: createComposition,
    onSuccess: () => {
      message.success('已保存组合')
      setSaveModalOpen(false)
      setSaveName('')
      qc.invalidateQueries({ queryKey: ['compositions'] })
    },
  })

  const copyPositive = () => {
    navigator.clipboard.writeText(getPositivePrompt())
    message.success('正向关键词已复制')
  }

  const copyNegative = () => {
    navigator.clipboard.writeText(getNegativePrompt())
    message.success('负向关键词已复制')
  }

  const copyAll = () => {
    const text = `正向:\n${getPositivePrompt()}\n\n负向:\n${getNegativePrompt()}`
    navigator.clipboard.writeText(text)
    message.success('已复制全部')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 64px)' }}>
      {/* 操作栏 */}
      <Row gutter={8} align="middle">
        <Col>
          <Title level={5} style={{ margin: 0 }}>关键词组合编辑器</Title>
        </Col>
        <Col flex="auto" />
        <Col>
          <Space>
            <Button icon={<BookOutlined />} onClick={() => setTemplatesOpen(true)}>模板库</Button>
            <Button icon={<CopyOutlined />} onClick={copyAll}>复制全部</Button>
            <Button icon={<SaveOutlined />} type="primary" onClick={() => setSaveModalOpen(true)}>
              保存模板
            </Button>
            <Button icon={<ClearOutlined />} danger onClick={clear}>清空</Button>
          </Space>
        </Col>
      </Row>

      {/* 两列 Tag 面板 */}
      <Row gutter={16} style={{ flex: 1, overflow: 'hidden' }}>
        <Col span={12} style={{ height: '100%', overflow: 'auto' }}>
          <TagPanel
            title="正向关键词"
            tags={positive}
            onRemove={removeFromPositive}
            onWeightChange={(id, w) => setWeight('positive', id, w)}
            color="blue"
          />
        </Col>
        <Col span={12} style={{ height: '100%', overflow: 'auto' }}>
          <TagPanel
            title="负向关键词"
            tags={negative}
            onRemove={removeFromNegative}
            onWeightChange={(id, w) => setWeight('negative', id, w)}
            color="red"
          />
        </Col>
      </Row>

      {/* 预览输出 */}
      <Card size="small" title="输出预览">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Space style={{ marginBottom: 4 }}>
              <Text strong style={{ color: '#1677ff' }}>正向</Text>
              <Button size="small" icon={<CopyOutlined />} onClick={copyPositive}>复制</Button>
            </Space>
            <Input.TextArea
              value={getPositivePrompt()}
              readOnly
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
          <div>
            <Space style={{ marginBottom: 4 }}>
              <Text strong style={{ color: '#ff4d4f' }}>负向</Text>
              <Button size="small" icon={<CopyOutlined />} onClick={copyNegative}>复制</Button>
            </Space>
            <Input.TextArea
              value={getNegativePrompt()}
              readOnly
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
        </Space>
      </Card>

      {/* 保存模板弹窗 */}
      <Modal
        title="保存为模板"
        open={saveModalOpen}
        onOk={() => {
          if (!saveName.trim()) return message.warning('请输入模板名称')
          saveMutation.mutate({ name: saveName, positive_tags: positive, negative_tags: negative })
        }}
        onCancel={() => setSaveModalOpen(false)}
        confirmLoading={saveMutation.isPending}
      >
        <Input
          placeholder="模板名称"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          onPressEnter={() => {
            if (!saveName.trim()) return
            saveMutation.mutate({ name: saveName, positive_tags: positive, negative_tags: negative })
          }}
        />
      </Modal>

      {/* 模板库抽屉 */}
      <Drawer
        title="已保存模板"
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
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
                      <Text type="secondary" style={{ fontSize: 11 }}>{fmtDate(comp.created_at)}</Text>
                      <Button
                        size="small"
                        type="link"
                        style={{ padding: 0, height: 'auto' }}
                        onClick={() => {
                          const pos: CompositionTag[] = JSON.parse(comp.positive_tags)
                          const neg: CompositionTag[] = JSON.parse(comp.negative_tags)
                          loadComposition(pos, neg)
                          setTemplatesOpen(false)
                          message.success(`已加载：${comp.name}`)
                        }}
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
    </div>
  )
}
