import { Link, useLocation } from 'react-router-dom'
import { Search, Layers, Home } from 'lucide-react'

const tabs = [
  { path: '/', label: '首页', icon: Home },
  { path: '/cards', label: '卡牌', icon: Search },
  { path: '/decks', label: '牌组', icon: Layers },
]

export default function TabBar() {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t"
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {tabs.map(tab => {
        const Icon = tab.icon
        const active = isActive(tab.path)
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className="flex flex-col items-center gap-1 py-2 px-4 transition-colors"
            style={{
              color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            <Icon size={20} />
            <span className="text-xs">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
