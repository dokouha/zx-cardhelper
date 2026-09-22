import { useEffect, useState, useRef } from 'react'
import type { ZxCard, DeckEntry } from '@/types/card'
import { db } from '@/db/database'

// Z/X 卡牌标准尺寸：63mm x 88mm
// A4 纸张：210mm x 297mm
// 每页 3 列 x 3 行 = 9 张卡，边距 5mm
const CARD_W = 63
const CARD_H = 88
const MARGIN = 5
const GAP = 1
const COLS = 3
const ROWS = 3
const PER_PAGE = COLS * ROWS

interface PrintCard {
  serial: string
  name: string
  imageUrl: string
  count: number
}

export default function DeckPrintView({
  entries,
  onClose,
}: {
  entries: { mainDeck: DeckEntry[]; extraDeck: DeckEntry[]; otherDeck: DeckEntry[] }
  onClose: () => void
}) {
  const [cards, setCards] = useState<PrintCard[]>([])
  const [loading, setLoading] = useState(true)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadCards = async () => {
      const allEntries = [
        ...entries.mainDeck,
        ...entries.extraDeck,
        ...entries.otherDeck,
      ]
      const result: PrintCard[] = []
      for (const entry of allEntries) {
        const card = db.getCardBySerial(entry.serial)
        if (!card) continue
        result.push({
          serial: card.serial,
          name: card.chineseName || card.japaneseName || card.serial,
          imageUrl: card.imageUrl || `http://zximg-cdn.yimieji.com/card/${card.packPrefix}/${card.serial}.png`,
          count: entry.count,
        })
      }
      setCards(result)
      setLoading(false)
    }
    loadCards()
  }, [entries])

  // 展开卡牌列表：每张卡按 count 重复
  const expandedCards: PrintCard[] = []
  for (const c of cards) {
    for (let i = 0; i < c.count; i++) {
      expandedCards.push(c)
    }
  }

  // 分页
  const pages: PrintCard[][] = []
  for (let i = 0; i < expandedCards.length; i += PER_PAGE) {
    pages.push(expandedCards.slice(i, i + PER_PAGE))
  }

  const handlePrint = () => {
    window.print()
  }

  const handleImageError = (serial: string) => {
    setImageErrors(prev => new Set(prev).add(serial))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <p style={{ color: 'white' }}>加载卡牌数据...</p>
      </div>
    )
  }

  return (
    <>
      {/* Screen view: toolbar + preview */}
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--color-bg-primary)' }}>
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b print:hidden"
          style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              PDF 打印预览
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              共 {expandedCards.length} 张卡，{pages.length} 页（每页 {PER_PAGE} 张）
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              打印 / 保存PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              关闭
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-y-auto p-4 print:overflow-visible print:p-0">
          <div ref={printRef} className="mx-auto" style={{ maxWidth: '210mm' }}>
            {pages.map((pageCards, pageIdx) => (
              <div
                key={pageIdx}
                className="print-page mb-4 print:mb-0"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  background: 'white',
                  padding: `${MARGIN}mm`,
                  boxSizing: 'border-box',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${COLS}, ${CARD_W}mm)`,
                  gridTemplateRows: `repeat(${ROWS}, ${CARD_H}mm)`,
                  gap: `${GAP}mm`,
                  position: 'relative',
                }}
              >
                {pageCards.map((card, idx) => (
                  <div
                    key={`${pageIdx}-${idx}`}
                    className="card-slot"
                    style={{
                      width: `${CARD_W}mm`,
                      height: `${CARD_H}mm`,
                      position: 'relative',
                      overflow: 'hidden',
                      border: '0.5px solid #ccc',
                    }}
                  >
                    {imageErrors.has(card.serial) ? (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f5f5f5',
                          fontSize: '10px',
                          color: '#666',
                          padding: '4px',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{card.serial}</span>
                        <span style={{ marginTop: '4px' }}>{card.name}</span>
                      </div>
                    ) : (
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        crossOrigin="anonymous"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => handleImageError(card.serial)}
                      />
                    )}
                    {/* 裁切线 */}
                    {idx % COLS !== 0 && (
                      <div
                        className="cut-mark"
                        style={{
                          position: 'absolute',
                          left: `-${GAP / 2}mm`,
                          top: 0,
                          width: `${GAP}mm`,
                          height: '100%',
                          borderLeft: '0.5px dashed #999',
                        }}
                      />
                    )}
                  </div>
                ))}
                {/* 页码（屏幕预览用） */}
                <div
                  className="print:hidden"
                  style={{
                    position: 'absolute',
                    bottom: '2mm',
                    right: '5mm',
                    fontSize: '10px',
                    color: '#999',
                  }}
                >
                  第 {pageIdx + 1} 页
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body * { visibility: hidden; }
          .print-page, .print-page * { visibility: visible; }
          .print-page {
            page-break-after: always;
            break-after: page;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}