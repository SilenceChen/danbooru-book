import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>
)
