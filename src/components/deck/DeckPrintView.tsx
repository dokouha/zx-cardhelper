import { useEffect, useState, useRef } from 'react'
import { jsPDF } from 'jspdf'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
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
  deckName,
  onClose,
}: {
  entries: { mainDeck: DeckEntry[]; extraDeck: DeckEntry[]; otherDeck: DeckEntry[] }
  deckName?: string
  onClose: () => void
}) {
  const [cards, setCards] = useState<PrintCard[]>([])
  const [loading, setLoading] = useState(true)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
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

  /**
   * 预加载卡牌图片为 base64 JPEG data URL
   * 返回 Map<serial, dataUrl>，加载失败的卡返回空字符串
   */
  const preloadImages = async (cardList: PrintCard[]): Promise<Map<string, string>> => {
    const uniqueCards = new Map<string, string>() // serial -> imageUrl
    for (const c of cardList) {
      if (!uniqueCards.has(c.serial)) {
        uniqueCards.set(c.serial, c.imageUrl)
      }
    }

    const result = new Map<string, string>()
    const serials = [...uniqueCards.keys()]
    let loaded = 0
    const total = serials.length

    await new Promise<void>((resolveAll) => {
      if (total === 0) { resolveAll(); return }
      for (const serial of serials) {
        const url = uniqueCards.get(serial)!
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0)
              result.set(serial, canvas.toDataURL('image/jpeg', 0.85))
            }
          } catch {
            // CORS or canvas taint, skip
          }
          loaded++
          if (loaded === total) resolveAll()
        }
        img.onerror = () => {
          loaded++
          if (loaded === total) resolveAll()
        }
        img.src = url
      }
      // Timeout 30s
      setTimeout(() => resolveAll(), 30000)
    })

    return result
  }

  /**
   * 生成 PDF 文件，返回 jsPDF 实例
   */
  const generatePDF = async (): Promise<jsPDF> => {
    setExportProgress('正在加载卡牌图片...')
    const imgMap = await preloadImages(expandedCards)

    setExportProgress('正在生成 PDF...')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      if (pageIdx > 0) pdf.addPage()

      const pageCards = pages[pageIdx]
      for (let i = 0; i < pageCards.length; i++) {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const x = MARGIN + col * (CARD_W + GAP)
        const y = MARGIN + row * (CARD_H + GAP)
        const card = pageCards[i]

        // 画卡牌边框（浅灰色）
        pdf.setDrawColor(204, 204, 204)
        pdf.setLineWidth(0.2)
        pdf.rect(x, y, CARD_W, CARD_H)

        // 添加图片
        const imgData = imgMap.get(card.serial)
        if (imgData) {
          try {
            pdf.addImage(imgData, 'JPEG', x, y, CARD_W, CARD_H)
          } catch {
            // 图片添加失败，画占位
            pdf.setFillColor(245, 245, 245)
            pdf.rect(x, y, CARD_W, CARD_H, 'F')
            pdf.setTextColor(102, 102, 102)
            pdf.setFontSize(8)
            pdf.text(card.serial, x + CARD_W / 2, y + CARD_H / 2, { align: 'center' })
          }
        } else {
          // 无图片，画占位
          pdf.setFillColor(245, 245, 245)
          pdf.rect(x, y, CARD_W, CARD_H, 'F')
          pdf.setTextColor(102, 102, 102)
          pdf.setFontSize(8)
          const shortName = card.name.length > 12 ? card.name.slice(0, 12) + '...' : card.name
          pdf.text(card.serial, x + CARD_W / 2, y + CARD_H / 2 - 3, { align: 'center' })
          pdf.text(shortName, x + CARD_W / 2, y + CARD_H / 2 + 4, { align: 'center' })
        }

        // 裁切线（左边和上边，非第一列/行的卡）
        if (col > 0) {
          pdf.setDrawColor(153, 153, 153)
          pdf.setLineWidth(0.1)
          pdf.setLineDashPattern([1, 1], 0)
          pdf.line(x - GAP / 2, y, x - GAP / 2, y + CARD_H)
          pdf.setLineDashPattern([], 0)
        }
        if (row > 0) {
          pdf.setDrawColor(153, 153, 153)
          pdf.setLineWidth(0.1)
          pdf.setLineDashPattern([1, 1], 0)
          pdf.line(x, y - GAP / 2, x + CARD_W, y - GAP / 2)
          pdf.setLineDashPattern([], 0)
        }
      }
    }

    setExportProgress('')
    return pdf
  }

  /**
   * 导出 PDF：下载或保存到设备
   */
  const handleExportPDF = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const pdf = await generatePDF()
      const fileName = `${deckName || 'deck'}-print.pdf`

      if (Capacitor.isNativePlatform()) {
        // Android/iOS: 保存到 Documents 目录
        const pdfBase64 = pdf.output('datauristring').split(',')[1]
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Documents,
        })
        // 验证写入成功后提示
        setExportProgress(`PDF 已保存到: ${result.uri}`)
        setTimeout(() => setExportProgress(''), 3000)
      } else {
        // Web/Electron: 直接下载
        pdf.save(fileName)
      }
    } catch (err) {
      setExportProgress('导出失败: ' + String(err).slice(0, 80))
      setTimeout(() => setExportProgress(''), 3000)
    } finally {
      setExporting(false)
    }
  }

  /**
   * 分享 PDF：通过系统分享面板发送到 QQ/微信等
   */
  const handleSharePDF = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const pdf = await generatePDF()
      const fileName = `${deckName || 'deck'}-print.pdf`

      if (Capacitor.isNativePlatform()) {
        // Android/iOS: 保存到临时目录后分享
        const pdfBase64 = pdf.output('datauristring').split(',')[1]
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        })

        await Share.share({
          title: `${deckName || '卡组'} PDF`,
          text: `${deckName || '卡组'} 牌组打印 PDF`,
          url: result.uri,
          dialogTitle: '分享 PDF',
        })
      } else {
        // Web: 下载后提示手动分享
        pdf.save(fileName)
        setExportProgress('PDF 已下载，请手动分享文件')
        setTimeout(() => setExportProgress(''), 3000)
      }
    } catch (err) {
      setExportProgress('分享失败: ' + String(err).slice(0, 80))
      setTimeout(() => setExportProgress(''), 3000)
    } finally {
      setExporting(false)
    }
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
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              {exporting ? (exportProgress || '处理中...') : '导出 PDF'}
            </button>
            <button
              onClick={handleSharePDF}
              disabled={exporting}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--color-success, #22c55e)', color: 'white' }}
            >
              分享
            </button>
            <button
              onClick={handlePrint}
              disabled={exporting}
              className="px-4 py-2 rounded-lg text-sm border disabled:opacity-50"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              打印
            </button>
            <button
              onClick={onClose}
              disabled={exporting}
              className="px-4 py-2 rounded-lg text-sm border disabled:opacity-50"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              关闭
            </button>
          </div>
        </div>

        {/* Export progress bar */}
        {exporting && exportProgress && (
          <div
            className="px-4 py-2 text-xs text-center print:hidden"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-accent)' }}
          >
            {exportProgress}
          </div>
        )}

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
