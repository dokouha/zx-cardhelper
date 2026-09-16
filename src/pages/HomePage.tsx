import { useCardStore } from '@/stores/cardStore'
import { Link } from 'react-router-dom'
import { Search, Layers } from 'lucide-react'
import { db } from '@/db/database'
import { useState, useEffect } from 'react'
import { PHRASE_REPLACEMENTS } from '@/data/terminology'

export default function HomePage() {
  const dbLoaded = useCardStore(s => s.dbLoaded)
  const [cardCount, setCardCount] = useState(0)

  useEffect(() => {
    if (dbLoaded) {
      setCardCount(db.getCardCount())
    }
  }, [dbLoaded])

  const features = [
    {
      icon: Search,
      title: '卡牌查询',
      desc: '搜索全部卡牌信息，支持多维度筛选',
      path: '/cards',
      color: 'var(--color-zx-blue)',
    },
    {
      icon: Layers,
      title: '牌组构筑',
      desc: '构建合规牌组，自动验证规则',
      path: '/decks',
      color: 'var(--color-zx-green)',
    },
  ]

  return (
    <div className="animate-fade-in px-4 py-6 space-y-6">
      {/* Hero */}
      <div className="text-center space-y-2">
        <div className="text-6xl mb-2">&#9876;</div>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Z/X 卡牌助手
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }} className="text-sm">
          查卡 · 组卡
        </p>
        {dbLoaded && cardCount > 0 && (
          <p style={{ color: 'var(--color-accent)' }} className="text-xs">
            已收录 {cardCount.toLocaleString()} 张卡牌
          </p>
        )}
      </div>

      {/* Feature Cards */}
      <div className="grid gap-4">
        {features.map(feat => {
          const Icon = feat.icon
          return (
            <Link
              key={feat.path}
              to={feat.path}
              className="card-hover flex items-center gap-4 p-4 rounded-xl border"
              style={{
                background: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="flex items-center justify-center w-12 h-12 rounded-lg"
                style={{ background: feat.color + '22', color: feat.color }}
              >
                <Icon size={24} />
              </div>
              <div>
                <h3
                  className="font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {feat.title}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {feat.desc}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Info */}
      <div
        className="rounded-xl border p-4 space-y-2"
        style={{
          background: 'var(--color-bg-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h3
          className="font-semibold text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        >
          术语更正说明
        </h3>
        <div
          className="text-xs space-y-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {Object.entries(PHRASE_REPLACEMENTS).map(([wrong, correct]) => (
            <p key={wrong}>{wrong} → <span style={{ color: 'var(--color-accent)' }}>{correct}</span></p>
          ))}
        </div>
      </div>
    </div>
  )
}
