import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Layout } from 'antd'
import { SearchOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons'
import SearchPage from './pages/Search'
import ComposePage from './pages/Compose'
import TasksPage from './pages/Tasks'

const { Content, Sider } = Layout

const navItems = [
  { key: '/', label: 'Tag 搜索', icon: <SearchOutlined /> },
  { key: '/compose', label: '关键词组合', icon: <EditOutlined /> },
  { key: '/tasks', label: '任务管理', icon: <SettingOutlined /> },
]

export default function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider width={180} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: '16px', fontWeight: 700, fontSize: 16, borderBottom: '1px solid #f0f0f0' }}>
            Tag Book
          </div>
          <Routes>
            <Route
              path="*"
              element={
                <NavMenu />
              }
            />
          </Routes>
        </Sider>
        <Layout>
          <Content style={{ padding: 24, background: '#fff' }}>
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/compose" element={<ComposePage />} />
              <Route path="/tasks" element={<TasksPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  )
}

function NavMenu() {
  return (
    <nav style={{ padding: '8px 0' }}>
      {navItems.map((item) => (
        <NavLink
          key={item.key}
          to={item.key}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            color: isActive ? '#1677ff' : '#333',
            background: isActive ? '#e6f4ff' : 'transparent',
            textDecoration: 'none',
            fontWeight: isActive ? 600 : 400,
          })}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
