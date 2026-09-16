import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useCardStore } from '@/stores/cardStore'
import { useDeckStore } from '@/stores/deckStore'
import { COLOR_HEX, COLOR_LABELS, CARD_TYPE_LABELS, ICON_LABELS, getDeckZone, getCardTypeLabel } from '@/types/card'
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, RefreshCw, ExternalLink, Copy } from 'lucide-react'
import { db } from '@/db/database'
import { getCardPrice, getCardPriceVariants, formatJPY, yenToCny, type CardPrice, type PackPriceVariant } from '@/services/priceService'

export default function CardDetailPage() {
  const { serial } = useParams<{ serial: string }>()
  const navigate = useNavigate()
  const selectedCard = useCardStore(s => s.selectedCard)
  const selectCard = useCardStore(s => s.selectCard)
  const currentDeck = useDeckStore(s => s.currentDeck)

  // Swipe handling (Bug 8)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // 右侧边缘返回手势指示器
  const [showBackIndicator, setShowBackIndicator] = useState(false)
  const [swipeProgress, setSwipeProgress] = useState(0)
  const [copiedName, setCopiedName] = useState(false)
  const [copiedJpName, setCopiedJpName] = useState(false)

  useEffect(() => {
    if (serial) {
      const card = db.getCardBySerial(serial)
      selectCard(card)
    }
    return () => { selectCard(null) }
  }, [serial, selectCard])

  // Get adjacent cards for swipe navigation
  const getAdjacentSerials = useCallback((currentSerial: string): { prev: string | null; next: string | null } => {
    const results = useCardStore.getState().results
    if (!results || results.length === 0) return { prev: null, next: null }
    const idx = results.findIndex(c => c.serial === currentSerial)
    if (idx === -1) return { prev: null, next: null }
    return {
      prev: idx > 0 ? results[idx - 1].serial : null,
      next: idx < results.length - 1 ? results[idx + 1].serial : null,
    }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    // 触摸开始时隐藏指示器
    setShowBackIndicator(false)
    setSwipeProgress(0)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current
    // 仅处理水平方向的右滑
    if (deltaX > 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
      const progress = Math.min(1, deltaX / 100)
      setSwipeProgress(progress)
      // 滑动超过一定距离时显示返回指示器
      if (deltaX > 20) {
        setShowBackIndicator(true)
      }
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // 隐藏指示器
    setShowBackIndicator(false)
    setSwipeProgress(0)

    // Only handle horizontal swipes (more horizontal than vertical, and significant distance)
    if (absX < 60 || absY > absX) return

    if (!serial) return

    if (deltaX > 0) {
      // Swipe right → go back to search page
      navigate(-1)
    } else {
      // Swipe left → go to next card
      const { next } = getAdjacentSerials(serial)
      if (next) {
        navigate(`/cards/${next}`)
      }
    }
  }, [serial, navigate, getAdjacentSerials])

  // ============ 游游亭价格查询 ============
  const [price, setPrice] = useState<CardPrice | null>(null)
  const [priceVariants, setPriceVariants] = useState<PackPriceVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<PackPriceVariant | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState('')

  const loadPrice = useCallback(async (cardSerial: string, cardPackPrefix: string) => {
    setPriceLoading(true)
    setPriceError('')
    setPriceVariants([])
    setSelectedVariant(null)
    try {
      const [p, variants] = await Promise.all([
        getCardPrice({ serial: cardSerial, packPrefix: cardPackPrefix }),
        getCardPriceVariants(cardSerial, cardPackPrefix),
      ])
      setPrice(p)
      setPriceVariants(variants)
      // 默认选中最低价（与 getCardPrice 返回的主价格一致）
      if (variants.length > 0) {
        const main = variants.find(v => v.priceJPY === p.priceJPY) ?? variants[0]
        setSelectedVariant(main)
      }
    } catch {
      setPriceError('价格查询失败，请检查网络')
    } finally {
      setPriceLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedCard) {
      setPrice(null)
      loadPrice(selectedCard.serial, selectedCard.packPrefix)
    }
  }, [selectedCard, loadPrice])

  // 当前展示价格：选中罕贵度优先，否则回退到主价格
  const displayPriceJPY = selectedVariant?.priceJPY ?? price?.priceJPY ?? -1
  const displayInStock = selectedVariant?.inStock ?? price?.inStock ?? false

  if (!selectedCard) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p style={{ color: 'var(--color-text-secondary)' }}>未找到该卡牌</p>
      </div>
    )
  }

  const card = selectedCard
  const isZx = card.type === 'Z/X' || card.type === 'Z/X Extra' || card.type === 'Z/X Over Boost'
  const deckZone = getDeckZone(card.type)
  const { prev, next } = getAdjacentSerials(card.serial)

  const handleAddToDeck = () => {
    if (!currentDeck) {
      navigate('/decks')
      return
    }
    useDeckStore.getState().addCardAuto(card.serial)
  }

  return (
    <div
      ref={containerRef}
      className="animate-fade-in px-4 py-4 space-y-4 relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ userSelect: 'none', touchAction: 'pan-y' }}
    >
      {/* 右滑返回指示器 */}
      {showBackIndicator && (
        <div
          className="fixed top-1/2 right-4 z-50 flex items-center justify-center rounded-full transition-opacity"
          style={{
            width: '48px',
            height: '48px',
            background: 'var(--color-accent)',
            opacity: 0.4 + swipeProgress * 0.6,
            transform: `translateY(-50%) scale(${0.8 + swipeProgress * 0.3})`,
          }}
        >
          <ArrowLeft size={24} color="white" />
        </div>
      )}
      {/* Navigation bar with prev/next arrows (Bug 8) */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-accent)' }}
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="flex items-center gap-3">
          <Link
            to={prev ? `/cards/${prev}` : '#'}
            className={`p-1.5 rounded-lg ${prev ? '' : 'opacity-30 pointer-events-none'}`}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ChevronLeft size={20} />
          </Link>
          <Link
            to={next ? `/cards/${next}` : '#'}
            className={`p-1.5 rounded-lg ${next ? '' : 'opacity-30 pointer-events-none'}`}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ChevronRight size={20} />
          </Link>
        </div>
      </div>

      {/* Swipe hint */}
      {(prev || next) && (
        <p className="text-center text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
          右滑返回 | 左滑下一张
        </p>
      )}

      {/* Card Image */}
      <div className="flex justify-center">
        <div
          className="rounded-xl overflow-hidden border"
          style={{
            borderColor: 'var(--color-border)',
            boxShadow: `0 0 30px ${COLOR_HEX[card.color]}22`,
          }}
        >
          <img
            src={card.imageUrl}
            alt={card.chineseName || card.japaneseName}
            className="max-w-[260px]"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      </div>

      {/* Card Name */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {card.chineseName || card.japaneseName}
          </h2>
          <button
            onClick={() => {
              const name = card.chineseName || card.japaneseName || ''
              if (navigator.clipboard) {
                navigator.clipboard.writeText(name).then(() => {
                  setCopiedName(true)
                  setTimeout(() => setCopiedName(false), 2000)
                }).catch(() => {})
              }
            }}
            className="p-1 rounded transition-opacity"
            style={{ color: copiedName ? 'var(--color-success)' : 'var(--color-text-secondary)' }}
            title="复制卡牌名称"
          >
            <Copy size={14} />
          </button>
        </div>
        {copiedName && (
          <p className="text-[10px]" style={{ color: 'var(--color-success)' }}>已复制</p>
        )}
        {card.popularName && (
          <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
            {card.popularName}
          </p>
        )}
        {card.chineseName && card.japaneseName && card.chineseName !== card.japaneseName && (
          <div className="flex items-center justify-center gap-1">
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {card.japaneseName}
            </p>
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(card.japaneseName).then(() => {
                    setCopiedJpName(true)
                    setTimeout(() => setCopiedJpName(false), 2000)
                  }).catch(() => {})
                }
              }}
              className="p-0.5 rounded transition-opacity"
              style={{ color: copiedJpName ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}
              title="复制日文名称"
            >
              <Copy size={11} />
            </button>
          </div>
        )}
        {copiedJpName && (
          <p className="text-[10px]" style={{ color: 'var(--color-success)' }}>已复制日文名</p>
        )}
      </div>

      {/* Card Stats */}
      <div
        className="rounded-xl border p-4 grid grid-cols-2 gap-3"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <StatRow label="编号" value={card.serial} />
        <ColorStatRow colors={card.colors} />
        <StatRow label="类型" value={getCardTypeLabel(card)} />
        <StatRow label="稀有度" value={card.rarity} />
        {card.cost >= 0 && <StatRow label="费用" value={String(card.cost)} />}
        {isZx && card.power >= 0 && <StatRow label="力量" value={String(card.power)} />}
        {isZx && card.shield >= 0 && <StatRow label="护盾" value={String(card.shield)} />}
        <StatRow label="种族" value={card.race} />
        <StatRow label="画师" value={card.illustrator} />
        {card.icons.length > 0 && (
          <div className="col-span-2">
            <StatRow label="标记" value={card.icons.map(i => ICON_LABELS[i]).join(' · ')} />
          </div>
        )}
        {card.tags && card.tags.length > 0 && (
          <div className="col-span-2">
            <StatRow label="指定" value={card.tags.join(' · ')} />
          </div>
        )}
      </div>

      {/* 游游亭实时价格 */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              游游亭价格
            </span>
            {price && price.inStock && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(39,174,96,0.15)', color: 'var(--color-success)' }}
              >
                有货
              </span>
            )}
            {price && !price.inStock && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(231,76,60,0.15)', color: 'var(--color-danger)' }}
              >
                缺货
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPrice(card.serial, card.packPrefix)}
              disabled={priceLoading}
              className="p-1 rounded disabled:opacity-40"
              style={{ color: 'var(--color-text-secondary)' }}
              title="刷新价格"
            >
              <RefreshCw size={14} className={priceLoading ? 'animate-spin' : ''} />
            </button>
            <a
              href={`https://yuyu-tei.jp/sell/zx/s/${card.packPrefix.toLowerCase()}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-0.5 text-[11px]"
              style={{ color: 'var(--color-accent)' }}
            >
              游游亭
              <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {priceLoading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <RefreshCw size={14} className="animate-spin" />
            正在查询价格...
          </div>
        ) : priceError ? (
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{priceError}</p>
            <button
              onClick={() => loadPrice(card.serial, card.packPrefix)}
              className="text-xs px-2 py-1 rounded border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
            >
              重试
            </button>
          </div>
        ) : price && price.priceJPY >= 0 ? (
          <div className="space-y-2">
            {/* 罕贵度切换按钮 */}
            {priceVariants.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {priceVariants.map(v => {
                  const label = v.rarity || '通常'
                  const isActive = selectedVariant?.rarity === v.rarity && selectedVariant?.priceJPY === v.priceJPY
                  return (
                    <button
                      key={label}
                      onClick={() => setSelectedVariant(v)}
                      className="text-[11px] px-2 py-1 rounded-full border transition-colors"
                      style={{
                        borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                        background: isActive ? 'var(--color-accent)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--color-text-secondary)',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {label}
                      {!v.inStock && (
                        <span className="ml-1 text-[9px]" style={{ color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--color-danger)' }}>缺</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold" style={{ color: displayInStock ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                ¥{formatJPY(displayPriceJPY)}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                日元
              </span>
              {selectedVariant?.stockNote && (
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                  {selectedVariant.stockNote}
                </span>
              )}
              {!displayInStock && !selectedVariant?.stockNote && (
                <span className="text-[10px]" style={{ color: 'var(--color-danger)' }}>缺货</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {([0.03, 0.04, 0.05] as const).map(rate => (
                <div
                  key={rate}
                  className="flex-1 min-w-[64px] rounded-lg border px-2 py-1.5 text-center"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
                >
                  <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {rate * 100}算
                  </p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    ¥{yenToCny(displayPriceJPY, rate).toLocaleString('en-US')}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              数据来自游游亭 {new Date(price.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 查询
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            暂未查询到该卡价格
          </p>
        )}
      </div>

      {/* Effect Text */}
      {card.effect && (
        <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            效果文本
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
            {card.effect}
          </p>
        </div>
      )}

      {/* Flavor Text */}
      {card.flavorText && (
        <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            "{card.flavorText}"
          </p>
        </div>
      )}

      {/* Add to Deck Button */}
      {currentDeck && (
        <button
          onClick={handleAddToDeck}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: 'white' }}
        >
          <Plus size={16} />
          {deckZone === 'main' ? '加入主牌组' : deckZone === 'extra' ? '加入额外卡组' : '加入其他区域'}
        </button>
      )}

      {/* Related Cards */}
      {card.relatedCards.length > 0 && (
        <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            关联卡牌
          </h3>
          <div className="flex gap-2 flex-wrap">
            {card.relatedCards.map(s => (
              <Link
                key={s}
                to={`/cards/${s}`}
                className="px-2 py-1 rounded text-xs border"
                style={{ background: 'var(--color-bg-hover)', borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom spacing for TabBar */}
      <div className="h-20" />
    </div>
  )
}

function StatRow({
  label,
  value,
  colorDot,
}: {
  label: string
  value: string
  colorDot?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium w-12" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {colorDot && (
          <div
            className="w-3 h-3 rounded-full border"
            style={{ background: colorDot, borderColor: 'var(--color-border)' }}
          />
        )}
        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {value}
        </span>
      </div>
    </div>
  )
}

function ColorStatRow({ colors }: { colors: import('@/types/card').CardColor[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium w-12" style={{ color: 'var(--color-text-secondary)' }}>
        颜色
      </span>
      <div className="flex items-center gap-1.5">
        {colors.map((c, i) => (
          <div key={c} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full border"
              style={{ background: COLOR_HEX[c], borderColor: 'var(--color-border)' }}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {COLOR_LABELS[c]}
            </span>
            {i < colors.length - 1 && (
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>/</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
