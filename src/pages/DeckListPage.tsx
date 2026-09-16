import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDeckStore } from '@/stores/deckStore'
import { db } from '@/db/database'
import type { DeckEntry, DeckSetup, Deck } from '@/types/card'
import { Plus, Trash2, ChevronRight, Pencil, Upload, X } from 'lucide-react'

export default function DeckListPage() {
  const decks = useDeckStore(s => s.decks)
  const loadDecks = useDeckStore(s => s.loadDecks)
  const createDeck = useDeckStore(s => s.createDeck)
  const deleteDeck = useDeckStore(s => s.deleteDeck)
  const validateDeck = useDeckStore(s => s.validateDeck)
  const navigate = useNavigate()

  // 新建牌组：'choice' = 选择方式, 'manual' = 手动新建, 'import' = 导入代码, null = 关闭
  const [createMode, setCreateMode] = useState<'choice' | 'manual' | 'import' | null>(null)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [importCode, setImportCode] = useState('')
  const [importName, setImportName] = useState('')

  useEffect(() => {
    loadDecks()
  }, [loadDecks])

  const handleCreate = () => {
    if (!newName.trim()) return
    const deck = createDeck(newName.trim(), newDesc.trim())
    setNewName('')
    setNewDesc('')
    setCreateMode(null)
    navigate(`/decks/${deck.id}`)
  }

  // 解析卡组代码（JSON 或文本格式），返回 DeckEntry[] 和 DeckSetup
  const parseDeckCode = useCallback((code: string): { main: DeckEntry[]; extra: DeckEntry[]; other: DeckEntry[]; setup: DeckSetup } | null => {
    const trimmed = code.trim()
    if (!trimmed) return null
    const emptySetup: DeckSetup = { startCards: [], gateCards: [], startResources: [] }

    if (trimmed.startsWith('{')) {
      // JSON 格式
      try {
        const data = JSON.parse(trimmed)
        const setup: DeckSetup = (data.setup && typeof data.setup === 'object')
          ? {
              startCards: Array.isArray(data.setup.startCards) ? data.setup.startCards : [],
              gateCards: Array.isArray(data.setup.gateCards) ? data.setup.gateCards : [],
              startResources: Array.isArray(data.setup.startResources) ? data.setup.startResources : [],
            }
          : { ...emptySetup }
        return {
          main: Array.isArray(data.main) ? data.main : [],
          extra: Array.isArray(data.extra) ? data.extra : [],
          other: Array.isArray(data.other) ? data.other : [],
          setup,
        }
      } catch { return null }
    }

    // 文本格式：按【区域】标题分段解析
    const lines = trimmed.split('\n')
    let currentZone: 'main' | 'extra' | 'other' | 'startCard' | 'gateCard' | 'startResource' | null = null
    const serialRe = /^([A-Za-z]+\d+-\d+[A-Za-z]*)/
    const main: DeckEntry[] = []
    const extra: DeckEntry[] = []
    const other: DeckEntry[] = []
    const setup: DeckSetup = { ...emptySetup }

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      if (line.startsWith('【')) {
        if (line.includes('主牌组')) currentZone = 'main'
        else if (line.includes('额外卡组')) currentZone = 'extra'
        else if (line.includes('其他区域')) currentZone = 'other'
        else if (line.includes('起始卡')) currentZone = 'startCard'
        else if (line.includes('门扉卡')) currentZone = 'gateCard'
        else if (line.includes('起始资源')) currentZone = 'startResource'
        else currentZone = null
        continue
      }
      const m = line.match(serialRe)
      if (m && currentZone) {
        const serial = m[1]
        const countMatch = line.match(/x\s*(\d+)\s*$/i)
        const count = countMatch ? parseInt(countMatch[1]) : 1
        if (currentZone === 'main') main.push({ serial, count })
        else if (currentZone === 'extra') extra.push({ serial, count })
        else if (currentZone === 'other') other.push({ serial, count })
        else if (currentZone === 'startCard' && !setup.startCards.includes(serial)) setup.startCards.push(serial)
        else if (currentZone === 'gateCard' && !setup.gateCards.includes(serial)) setup.gateCards.push(serial)
        else if (currentZone === 'startResource' && !setup.startResources.includes(serial)) setup.startResources.push(serial)
      }
    }
    return { main, extra, other, setup }
  }, [])

  // 从代码导入并创建新牌组
  const handleImportCreate = () => {
    const name = importName.trim() || '导入的牌组'
    const parsed = parseDeckCode(importCode)
    if (!parsed) {
      alert('卡组代码格式错误，请检查后重试')
      return
    }
    const deck = createDeck(name, '')
    const updatedDeck: Deck = {
      ...deck,
      mainDeck: parsed.main,
      extraDeck: parsed.extra,
      otherDeck: parsed.other,
      setup: parsed.setup,
    }
    useDeckStore.getState().saveDeck(updatedDeck)
    setImportCode('')
    setImportName('')
    setCreateMode(null)
    navigate(`/decks/${updatedDeck.id}`)
  }

  const handleDelete = (deckId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('确定删除该牌组？')) {
      deleteDeck(deckId)
    }
  }


  return (
    <div className="animate-fade-in px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          我的牌组
        </h2>
        <button
          onClick={() => setCreateMode('choice')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
          style={{ background: 'var(--color-accent)', color: 'white' }}
        >
          <Plus size={14} />
          新建
        </button>
      </div>

      {/* 新建方式选择弹窗 */}
      {createMode === 'choice' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(8,6,20,0.85)' }}
          onClick={() => setCreateMode(null)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-4 pt-5 pb-2 text-center">
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                新建牌组
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                选择创建方式
              </p>
            </div>
            <div className="p-4 space-y-2.5">
              <button
                onClick={() => setCreateMode('manual')}
                className="w-full text-left rounded-xl p-3.5 transition-opacity active:opacity-70"
                style={{ background: 'rgba(35,137,217,0.12)', border: '1px solid var(--color-accent)' }}>
                <div className="flex items-center gap-2">
                  <Pencil size={18} style={{ color: 'var(--color-accent)' }} />
                  <span className="font-bold text-sm" style={{ color: 'var(--color-accent)' }}>手动新建牌组</span>
                </div>
                <p className="text-xs mt-1 ml-7" style={{ color: 'var(--color-text-secondary)' }}>
                  从零开始构筑卡组
                </p>
              </button>
              <button
                onClick={() => setCreateMode('import')}
                className="w-full text-left rounded-xl p-3.5 transition-opacity active:opacity-70"
                style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <Upload size={18} style={{ color: 'var(--color-text-primary)' }} />
                  <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>导入卡组代码</span>
                </div>
                <p className="text-xs mt-1 ml-7" style={{ color: 'var(--color-text-secondary)' }}>
                  粘贴代码自动生成卡组
                </p>
              </button>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setCreateMode(null)}
                className="w-full py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)' }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手动新建表单 */}
      {createMode === 'manual' && (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-accent)',
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="牌组名称"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              background: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            autoFocus
          />
          <input
            type="text"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="描述（可选）"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              background: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              创建
            </button>
            <button
              onClick={() => { setCreateMode(null); setNewName(''); setNewDesc('') }}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{
                background: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 导入卡组代码表单 */}
      {createMode === 'import' && (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-accent)',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              导入卡组代码
            </h3>
            <button onClick={() => { setCreateMode(null); setImportCode(''); setImportName('') }}
              style={{ color: 'var(--color-text-secondary)' }}>
              <X size={16} />
            </button>
          </div>
          <input
            type="text"
            value={importName}
            onChange={e => setImportName(e.target.value)}
            placeholder="牌组名称（可选，默认为导入的牌组）"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              background: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <textarea
            value={importCode}
            onChange={e => setImportCode(e.target.value)}
            placeholder="粘贴卡组代码（支持JSON或文本格式）..."
            className="w-full h-32 p-2 rounded-lg border text-xs resize-none outline-none"
            style={{
              background: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleImportCreate}
              disabled={!importCode.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              导入并创建
            </button>
            <button
              onClick={() => { setCreateMode(null); setImportCode(''); setImportName('') }}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{
                background: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Deck List */}
      {decks.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">&#9876;</div>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            还没有牌组，点击上方"新建"开始构筑
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {decks.map(deck => {
            const mainCount = deck.mainDeck.reduce((s, e) => s + e.count, 0)
            const extraCount = deck.extraDeck.reduce((s, e) => s + e.count, 0)
            return (
              <Link
                key={deck.id}
                to={`/decks/${deck.id}`}
                className="flex items-center justify-between p-3 rounded-xl border card-hover"
                style={{
                  background: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-sm truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {deck.name}
                  </h3>
                  {deck.description && (
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {deck.description}
                    </p>
                  )}
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    主牌组 {mainCount}/50 | 额外卡组 {extraCount}/16
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(deck.id, e)}
                    className="p-1.5 rounded-lg"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight
                    size={16}
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Deck Rules Info */}
      <div
        className="rounded-xl border p-4 space-y-2"
        style={{
          background: 'var(--color-bg-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          牌组构筑规则
        </h3>
        <div
          className="text-xs space-y-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <p>主牌组恰好 50 张</p>
          <p>同名卡最多 4 张</p>
          <p>点燃卡至少 20 张</p>
          <p>额外卡组最多 16 张</p>
          <p>生命恢复卡最多 4 张</p>
          <p>虚空使者卡最多 4 张</p>
          <p>超限驱动卡最多 4 张</p>
        </div>
      </div>

      <div className="h-20" />
    </div>
  )
}
