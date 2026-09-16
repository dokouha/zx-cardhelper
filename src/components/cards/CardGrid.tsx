import { Link } from 'react-router-dom'
import type { ZxCard } from '@/types/card'
import { COLOR_HEX, COLOR_LABELS, CARD_TYPE_LABELS, getCardTypeLabel } from '@/types/card'
import { useState } from 'react'

interface CardGridProps {
  cards: ZxCard[]
}

export default function CardGrid({ cards }: CardGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {cards.map(card => {
        const isMulti = card.colors.length > 1
        // 多色卡：使用多色渐变背景；单色卡：纯色背景
        const bgColor = isMulti
          ? `linear-gradient(135deg, ${card.colors.map(c => COLOR_HEX[c] + '18').join(', ')})`
          : COLOR_HEX[card.color] + '11'
        // 多色卡：类型标签使用多色渐变
        const badgeBg = isMulti
          ? `linear-gradient(135deg, ${card.colors.map(c => COLOR_HEX[c] + '44').join(', ')})`
          : COLOR_HEX[card.color] + '33'
        const badgeColor = isMulti ? '#fff' : COLOR_HEX[card.color]

        return (
        <Link
          key={card.serial}
          to={`/cards/${card.serial}`}
          className="card-hover rounded-xl border overflow-hidden"
          style={{
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Card Image */}
          <div
            className="aspect-[3/4] flex items-center justify-center overflow-hidden relative"
            style={{ background: bgColor }}
          >
            <CardImage card={card} size="small" />
            {/* 多色指示器 */}
            {isMulti && (
              <div className="absolute top-1 right-1 flex gap-0.5">
                {card.colors.map(c => (
                  <div key={c} className="w-2 h-2 rounded-full border border-white/50"
                    style={{ background: COLOR_HEX[c] }}
                    title={COLOR_LABELS[c]} />
                ))}
              </div>
            )}
          </div>

          {/* Card Info */}
          <div className="p-2 space-y-1">
            {/* Name */}
            <h3
              className="text-xs font-semibold truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {card.chineseName || card.japaneseName}
            </h3>

            {/* Serial + Type */}
            <div className="flex items-center justify-between">
              <span
                className="text-[10px]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {card.serial}
                {card.altSerials && card.altSerials.length > 0 && (
                  <span style={{ color: 'var(--color-accent)', marginLeft: 2 }}>
                    +{card.altSerials.length}
                  </span>
                )}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: badgeBg,
                  color: badgeColor,
                }}
              >
                {getCardTypeLabel(card)}
              </span>
            </div>

            {/* Cost + Power */}
            <div
              className="flex items-center gap-2 text-[10px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {card.cost >= 0 && <span>费用:{card.cost}</span>}
              {card.power >= 0 && <span>力量:{card.power}</span>}
            </div>
          </div>
        </Link>
        )
      })}
    </div>
  )
}

// ============ Card Image Component ============
interface CardImageProps {
  card: ZxCard
  size?: 'small' | 'medium' | 'large'
}

export function CardImage({ card, size = 'medium' }: CardImageProps) {
  const sizeMap = {
    small: { width: 120, height: 168 },
    medium: { width: 200, height: 280 },
    large: { width: 300, height: 420 },
  }

  const dimensions = sizeMap[size]
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return (
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, textAlign: 'center', padding: 8 }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>&#9876;</div>
        <div>{card.chineseName || card.japaneseName || card.serial}</div>
      </div>
    )
  }

  return (
    <img
      src={card.imageUrl}
      alt={card.chineseName || card.japaneseName}
      width={dimensions.width}
      height={dimensions.height}
      className="object-contain"
      loading="lazy"
      onError={() => setImgError(true)}
    />
  )
}
