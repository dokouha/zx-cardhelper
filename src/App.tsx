import { createBrowserRouter, createHashRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useCardStore } from '@/stores/cardStore'
import Navbar from '@/components/layout/Navbar'
import TabBar from '@/components/layout/TabBar'
import UpdateNotification from '@/components/layout/UpdateNotification'
import AutoUpdateNotice from '@/components/layout/AutoUpdateNotice'
import HomePage from '@/pages/HomePage'
import CardSearchPage from '@/pages/CardSearchPage'
import CardDetailPage from '@/pages/CardDetailPage'
import DeckListPage from '@/pages/DeckListPage'
import DeckBuilderPage from '@/pages/DeckBuilderPage'

// Electron 环境使用 HashRouter（file:// 协议不支持 History API）
const isElectron = typeof window !== 'undefined' && (window as any).electronAPi?.platform === 'electron'
const router = isElectron
  ? createHashRouter([
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/cards', element: <CardSearchPage /> },
          { path: '/cards/:serial', element: <CardDetailPage /> },
          { path: '/decks', element: <DeckListPage /> },
          { path: '/decks/:deckId', element: <DeckBuilderPage /> },
        ],
      },
    ])
  : createBrowserRouter([
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/cards', element: <CardSearchPage /> },
          { path: '/cards/:serial', element: <CardDetailPage /> },
          { path: '/decks', element: <DeckListPage /> },
          { path: '/decks/:deckId', element: <DeckBuilderPage /> },
        ],
      },
    ])

function AppLayout() {
  const location = useLocation()
  const initDatabase = useCardStore(s => s.initDatabase)
  const dbLoaded = useCardStore(s => s.dbLoaded)
  const loading = useCardStore(s => s.loading)
  const error = useCardStore(s => s.error)

  useEffect(() => {
    initDatabase()
  }, [initDatabase])

  // Bug3-fix: 全局图片加载失败回退 — HTTP↔HTTPS协议切换
  useEffect(() => {
    const handleImgError = (e: Event) => {
      const img = e.target as HTMLImageElement
      if (!img || !img.src || img.dataset.retried) return
      // 只处理CDN图片
      if (!img.src.includes('zximg-cdn.yimieji.com')) return
      img.dataset.retried = '1'
      if (img.src.startsWith('http://')) {
        img.src = img.src.replace('http://', 'https://')
      } else if (img.src.startsWith('https://')) {
        img.src = img.src.replace('https://', 'http://')
      }
    }
    document.addEventListener('error', handleImgError, true)
    return () => document.removeEventListener('error', handleImgError, true)
  }, [])

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      <Navbar />
      <main className="flex-1 pb-safe overflow-y-auto">
        {!dbLoaded && loading ? (
          <div className="flex items-center justify-center h-full min-h-[60vh]">
            <div className="text-center">
              <div className="animate-pulse-custom text-5xl mb-4">&#9876;</div>
              <p style={{ color: 'var(--color-text-secondary)' }}>加载卡牌数据库中...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full min-h-[60vh]">
            <div className="text-center">
              <div className="text-5xl mb-4">&#9876;</div>
              <p style={{ color: 'var(--color-danger)' }}>加载失败: {error}</p>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <TabBar />
      <UpdateNotification />
      <AutoUpdateNotice />
    </div>
  )
}

export default function App() {
  return <RouterProvider router={router} />
}
