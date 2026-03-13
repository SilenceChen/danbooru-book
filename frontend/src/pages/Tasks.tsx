import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Card, Button, Progress, Space, Typography, Row, Col, Alert, Divider,
} from 'antd'
import { SyncOutlined, TranslationOutlined } from '@ant-design/icons'
import { fetchTaskStatus, triggerCrawl, triggerTranslate } from '../api/client'

const { Text, Title } = Typography

const STATUS_COLOR: Record<string, string> = {
  idle: 'default',
  pending: 'processing',
  running: 'active',
  done: 'success',
  error: 'exception',
}

export default function TasksPage() {
  const { data, refetch } = useQuery({
    queryKey: ['taskStatus'],
    queryFn: fetchTaskStatus,
    refetchInterval: (query) => {
      const d = query.state.data
      if (!d) return 3000
      const anyRunning = d.crawl.status === 'running' || d.translate.status === 'running'
      return anyRunning ? 2000 : 5000
    },
  })

  const crawlMutation = useMutation({
    mutationFn: (full: boolean) => triggerCrawl(full),
    onSuccess: () => refetch(),
  })

  const translateMutation = useMutation({
    mutationFn: (limit: number) => triggerTranslate(limit),
    onSuccess: () => refetch(),
  })

  const crawl = data?.crawl
  const translate = data?.translate

  return (
    <div>
      <Title level={4}>任务管理</Title>

      <Row gutter={16}>
        {/* 爬取任务 */}
        <Col span={12}>
          <Card title={<><SyncOutlined /> 爬取任务</>} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Button
                  type="primary"
                  loading={crawlMutation.isPending || crawl?.status === 'running'}
                  onClick={() => crawlMutation.mutate(false)}
                >
                  增量爬取（前5页）
                </Button>
                <Button
                  loading={crawlMutation.isPending || crawl?.status === 'running'}
                  onClick={() => crawlMutation.mutate(true)}
                >
                  全量爬取
                </Button>
              </Space>
              {crawl && (
                <>
                  <Progress
                    percent={crawl.total > 0 ? Math.round((crawl.progress / crawl.total) * 100) : 0}
                    status={STATUS_COLOR[crawl.status] as 'active' | 'success' | 'exception' | 'normal'}
                  />
                  <Text type="secondary">{crawl.message || `状态: ${crawl.status}`}</Text>
                  {crawl.total > 0 && (
                    <Text>{crawl.progress} / {crawl.total}</Text>
                  )}
                </>
              )}
            </Space>
          </Card>
        </Col>

        {/* 翻译任务 */}
        <Col span={12}>
          <Card title={<><TranslationOutlined /> 翻译任务</>} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Button
                  type="primary"
                  loading={translateMutation.isPending || translate?.status === 'running'}
                  onClick={() => translateMutation.mutate(500)}
                >
                  翻译500个
                </Button>
                <Button
                  loading={translateMutation.isPending || translate?.status === 'running'}
                  onClick={() => translateMutation.mutate(5000)}
                >
                  翻译5000个
                </Button>
              </Space>
              {translate && (
                <>
                  <Progress
                    percent={translate.total > 0 ? Math.round((translate.progress / translate.total) * 100) : 0}
                    status={STATUS_COLOR[translate.status] as 'active' | 'success' | 'exception' | 'normal'}
                  />
                  <Text type="secondary">{translate.message || `状态: ${translate.status}`}</Text>
                  {translate.total > 0 && (
                    <Text>{translate.progress} / {translate.total}</Text>
                  )}
                </>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider />
      <Alert
        type="info"
        showIcon
        message="使用说明"
        description={
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>首次使用：先触发「全量爬取」获取所有 tag 数据</li>
            <li>之后每天自动执行「增量爬取」更新高频 tag</li>
            <li>爬取完成后触发「翻译」，Gemini 会批量翻译并自动分类</li>
            <li>翻译可多次执行，每次处理未翻译的 tag</li>
          </ul>
        }
      />
    </div>
  )
}
