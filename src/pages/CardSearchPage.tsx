import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCardStore } from '@/stores/cardStore'
import CardFilterPanel from '@/components/cards/CardFilterPanel'
import CardGrid from '@/components/cards/CardGrid'
import type { CardColor, SortOption } from '@/types/card'
import { SORT_LABELS } from '@/types/card'

const COLOR_OPTIONS: { value: CardColor | null; label: string; css: string }[] = [
  { value: null, label: '全部', css: '' },
  { value: 'red', label: '赤', css: 'var(--color-zx-red)' },
  { value: 'blue', label: '青', css: 'var(--color-zx-blue)' },
  { value: 'white', label: '白', css: 'var(--color-zx-white)' },
  { value: 'black', label: '黒', css: 'var(--color-zx-black)' },
  { value: 'green', label: '緑', css: 'var(--color-zx-green)' },
  { value: 'colorless', label: '無', css: 'var(--color-zx-colorless)' },
]

// 多色卡特殊选项（与单色互斥，单独渲染）
const MULTI_COLOR_LABEL = '多色'

// 模块级变量：保存滚动位置，用于从详情页返回时恢复
let savedScrollPosition = 0

export default function CardSearchPage() {
  const navigate = useNavigate()
  const filter = useCardStore(s => s.filter)
  const results = useCardStore(s => s.results)
  const total = useCardStore(s => s.total)
  const page = useCardStore(s => s.page)
  const pageSize = useCardStore(s => s.pageSize)
  const loading = useCardStore(s => s.loading)
  const setFilter = useCardStore(s => s.setFilter)
  const search = useCardStore(s => s.search)
  const dbLoaded = useCardStore(s => s.dbLoaded)

  const [showFilter, setShowFilter] = useState(false)
  const [searchInput, setSearchInput] = useState(filter.keyword)

  // 滚动容器 ref — 用于保存/恢复滚动位置
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 右滑返回首页
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
      navigate('/')
    }
  }, [navigate])

  useEffect(() => {
    if (!dbLoaded) return
    // 首次加载（无缓存结果）才执行搜索；从详情页返回时 results 仍在 store 中，直接恢复滚动位置
    if (useCardStore.getState().results.length === 0) {
      search(1)
    } else if (savedScrollPosition > 0) {
      // 多帧延迟恢复，确保 DOM 渲染完成
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = savedScrollPosition
          }
          const main = document.querySelector('main')
          if (main) {
            main.scrollTop = savedScrollPosition
          }
          savedScrollPosition = 0
        })
      })
    }
  }, [dbLoaded])

  // 实时监听滚动并保存位置 —— 解决组件卸载时 main.scrollTop 已被重置为 0 的问题
  useEffect(() => {
    const handleScroll = () => {
      let pos = 0
      if (scrollContainerRef.current) {
        pos = Math.max(pos, scrollContainerRef.current.scrollTop)
      }
      const main = document.querySelector('main')
      if (main) {
        pos = Math.max(pos, main.scrollTop)
      }
      // pos 为 0 时不覆盖（DOM 变更导致的重置不应保存）
      if (pos > 0) {
        savedScrollPosition = pos
      }
    }
    const main = document.querySelector('main')
    main?.addEventListener('scroll', handleScroll, { passive: true })
    scrollContainerRef.current?.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      main?.removeEventListener('scroll', handleScroll)
      scrollContainerRef.current?.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleSearch = useCallback(() => {
    setFilter({ keyword: searchInput })
    search(1)
  }, [searchInput, setFilter, search])

  const handleColorFilter = useCallback((color: CardColor | null) => {
    setFilter({ color, multiColorOnly: false })
    search(1)
  }, [setFilter, search])

  const handleMultiColorFilter = useCallback(() => {
    // 切换多色筛选：如果已经是多色模式则取消，否则开启
    const next = !filter.multiColorOnly
    setFilter({ multiColorOnly: next, color: next ? null : filter.color })
    search(1)
  }, [filter.multiColorOnly, filter.color, setFilter, search])

  const handleSort = useCallback((sort: SortOption) => {
    setFilter({ sort })
    search(1)
  }, [setFilter, search])

  const handlePageChange = useCallback((newPage: number) => {
    search(newPage)
  }, [search])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div
      className="animate-fade-in flex flex-col h-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Search Bar */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索卡牌名称、编号..."
            className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: 'var(--color-accent)',
              color: 'white',
            }}
          >
            搜索
          </button>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="px-3 py-2 rounded-lg border text-sm"
            style={{
              background: showFilter ? 'var(--color-accent)' : 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
              color: showFilter ? 'white' : 'var(--color-text-secondary)',
            }}
          >
            筛选
          </button>
        </div>

        {/* Color Quick Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {COLOR_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => handleColorFilter(opt.value)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs border transition-colors"
              style={{
                background: filter.color === opt.value && !filter.multiColorOnly
                  ? (opt.css || 'var(--color-accent)')
                  : 'var(--color-bg-card)',
                borderColor: filter.color === opt.value && !filter.multiColorOnly
                  ? (opt.css || 'var(--color-accent)')
                  : 'var(--color-border)',
                color: filter.color === opt.value && !filter.multiColorOnly
                  ? 'white'
                  : (opt.css || 'var(--color-text-secondary)'),
              }}
            >
              {opt.label}
            </button>
          ))}
          {/* 多色卡筛选按钮 */}
          <button
            onClick={handleMultiColorFilter}
            className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs border transition-colors"
            style={{
              background: filter.multiColorOnly
                ? 'linear-gradient(135deg, #E74C3C, #3498DB, #27AE60)'
                : 'var(--color-bg-card)',
              borderColor: filter.multiColorOnly
                ? 'transparent'
                : 'var(--color-border)',
              color: filter.multiColorOnly
                ? 'white'
                : 'var(--color-text-secondary)',
            }}
          >
            {MULTI_COLOR_LABEL}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilter && <CardFilterPanel />}

      {/* Results */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pb-20">
        {/* Stats bar */}
        <div
          className="flex items-center justify-between py-2 text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span>共 {total} 张卡牌</span>
          <div className="flex items-center gap-2">
            <select
              value={filter.sort}
              onChange={e => handleSort(e.target.value as SortOption)}
              className="px-2 py-1 rounded border text-xs outline-none"
              style={{
                background: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {totalPages > 1 && (
              <span>第 {page}/{totalPages} 页</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse-custom text-3xl">&#9876;</div>
          </div>
        ) : results.length > 0 ? (
          <>
            <CardGrid cards={results} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <button
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded border text-xs disabled:opacity-30"
                  style={{
                    background: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  上一页
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const p = start + i
                  if (p > totalPages) return null
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className="w-8 h-8 rounded text-xs"
                      style={{
                        background: p === page ? 'var(--color-accent)' : 'var(--color-bg-card)',
                        color: p === page ? 'white' : 'var(--color-text-primary)',
                      }}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded border text-xs disabled:opacity-30"
                  style={{
                    background: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
            <p>未找到匹配的卡牌</p>
          </div>
        )}
      </div>
    </div>
  )
}
