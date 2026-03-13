import { useState } from 'react'
import { Button, Modal } from 'antd'
import Workbench from './pages/Workbench'
import TasksPage from './pages/Tasks'
import { useComposeStore } from './store/composeStore'

type Page = 'workbench' | 'tasks'

export default function App() {
  const [page, setPage] = useState<Page>('workbench')
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const { clearAll } = useComposeStore()

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
        <span className="text-sm font-semibold mr-6" style={{ color: '#a78bfa' }}>
          Danbooru Book
        </span>

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

        {page === 'workbench' && (
          <div className="flex items-center gap-2">
            <Button size="small" danger type="text" onClick={handleClear}>
              清空
            </Button>
            <Button size="small" type="default" onClick={() => setTemplateLibraryOpen(true)}>
              模板库
            </Button>
            <Button size="small" type="primary" onClick={() => setSaveTemplateOpen(true)}>
              保存模板
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden">
        {page === 'workbench' ? (
          <Workbench
            templateLibraryOpen={templateLibraryOpen}
            onTemplateLibraryClose={() => setTemplateLibraryOpen(false)}
            saveTemplateOpen={saveTemplateOpen}
            onSaveTemplateClose={() => setSaveTemplateOpen(false)}
          />
        ) : (
          <TasksPage />
        )}
      </main>
    </div>
  )
}
