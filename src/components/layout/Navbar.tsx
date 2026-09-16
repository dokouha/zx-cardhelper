import { useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()

  const getTitle = () => {
    const path = location.pathname
    if (path === '/') return 'Z/X 卡牌助手'
    if (path.startsWith('/cards/')) return '卡牌详情'
    if (path === '/cards') return '卡牌查询'
    if (path.startsWith('/decks/')) return '牌组构筑'
    if (path === '/decks') return '我的牌组'
    if (path === '/battle') return '线上对战'
    return 'Z/X 卡牌助手'
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-center px-4 h-12 border-b"
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      <h1
        className="text-base font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {getTitle()}
      </h1>
    </header>
  )
}
