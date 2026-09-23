import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDeckStore, type DeckTab } from '@/stores/deckStore'
import { db } from '@/db/database'
import { COLOR_HEX, COLOR_LABELS, CARD_TYPE_LABELS, DECK_RULES, DEFAULT_FILTER, getDeckZone, TYPE_SORT_ORDER, getCardTypeLabel, getDeckLimit, isBannedCard, isLimitedCard, CHUANSHUO_LIMIT } from '@/types/card'
import type { ZxCard, DeckEntry, DeckValidationResult, Deck, DeckSetup, CardFilter } from '@/types/card'
import { ArrowLeft, Plus, Minus, Search, AlertCircle, CheckCircle, Info, Download, Upload, Image as ImageIcon, GripVertical, ChevronUp, ChevronDown, X, ArrowUpDown, Pencil, RefreshCw, SlidersHorizontal, Printer } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { getPackPrices, formatJPY, yenToCny, type PackPriceResult, type PackPriceVariant } from '@/services/priceService'
import DeckSearchFilterPanel from '@/components/deck/DeckSearchFilterPanel'
import DeckPrintView from '@/components/deck/DeckPrintView'

export default function DeckBuilderPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const currentDeck = useDeckStore(s => s.currentDeck)
  const currentValidation = useDeckStore(s => s.currentValidation)
  const setCurrentDeck = useDeckStore(s => s.setCurrentDeck)
  const addCardToMain = useDeckStore(s => s.addCardToMain)
  const removeCardFromMain = useDeckStore(s => s.removeCardFromMain)
  const addCardToExtra = useDeckStore(s => s.addCardToExtra)
  const removeCardFromExtra = useDeckStore(s => s.removeCardFromExtra)
  const addCardToOther = useDeckStore(s => s.addCardToOther)
  const removeCardFromOther = useDeckStore(s => s.removeCardFromOther)
  const addCardAuto = useDeckStore(s => s.addCardAuto)
  const loadDecks = useDeckStore(s => s.loadDecks)
  const saveDeck = useDeckStore(s => s.saveDeck)
  const toggleSetupMark = useDeckStore(s => s.toggleSetupMark)
  const replaceDeckCard = useDeckStore(s => s.replaceCard)

  // Helper: show validation error toast after card add
  const showValidationErrors = () => {
    const validation = useDeckStore.getState().currentValidation
    if (validation && !validation.valid && validation.errors.length > 0) {
      setTimeout(() => showToast(`\u26a0 ${validation.errors[0]}`), 300)
    }
  }

  const activeTab = useDeckStore(s => s.deckBuilderTab)
  const setActiveTab = useDeckStore(s => s.setDeckBuilderTab)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchFilter, setSearchFilter] = useState<CardFilter>({ ...DEFAULT_FILTER })
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [searchResults, setSearchResults] = useState<ZxCard[]>([])
  const [importText, setImportText] = useState('')
  const [exportText, setExportText] = useState('')
  const [toast, setToast] = useState('')
  const [exportedImageUrl, setExportedImageUrl] = useState('')
  const [searchTotal, setSearchTotal] = useState(0)
  const [deckSorted, setDeckSorted] = useState(false)
  const [exportedBlobUrl, setExportedBlobUrl] = useState('')
  const [exportedBase64, setExportedBase64] = useState('')
  const [showDeckEdit, setShowDeckEdit] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  // 替换卡牌弹窗状态：目标卡牌（当前条目）+ 是否显示
  const [replaceTarget, setReplaceTarget] = useState<ZxCard | null>(null)
  // 游游亭价格：serial -> 价格
  const [deckPrices, setDeckPrices] = useState<Map<string, PackPriceResult>>(new Map())
  // 组牌罕贵度覆盖：serial -> 选中的罕贵度（用于按非默认罕贵度计算造价）
  const [deckRarityOverride, setDeckRarityOverride] = useState<Map<string, string>>(new Map())
  const [pricesLoading, setPricesLoading] = useState(false)
  const [pricesError, setPricesError] = useState('')
  const loadedPacksRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    loadDecks()
    const decks = useDeckStore.getState().decks
    const deck = decks.find(d => d.id === deckId)
    if (deck) {
      setCurrentDeck(deck)
    } else {
      navigate('/decks')
    }
    return () => setCurrentDeck(null)
  }, [deckId, loadDecks, setCurrentDeck, navigate])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // 打开牌组编辑
  const handleOpenDeckEdit = () => {
    if (!currentDeck) return
    setEditName(currentDeck.name)
    setEditDescription(currentDeck.description || '')
    setShowDeckEdit(true)
  }

  // 保存牌组编辑
  const handleSaveDeckEdit = () => {
    if (!currentDeck) return
    const trimmedName = editName.trim()
    if (!trimmedName) {
      showToast('牌组名称不能为空')
      return
    }
    const updatedDeck = { ...currentDeck, name: trimmedName, description: editDescription.trim() }
    saveDeck(updatedDeck)
    setCurrentDeck(updatedDeck)
    setShowDeckEdit(false)
    showToast('牌组信息已保存')
  }

  const handleSearch = () => {
    // 多方式查询：合并关键词 + 筛选面板条件；关键词为空但筛选条件不为空时也可搜索
    const filter: CardFilter = { ...searchFilter, keyword: searchKeyword }
    const hasCondition = searchKeyword.trim() !== '' || filter.color !== null
      || filter.multiColorOnly || filter.types.length > 0 || filter.race
      || filter.rarity || filter.costMin != null || filter.costMax != null
      || filter.powerMin != null || filter.powerMax != null
      || filter.icons.length > 0 || filter.pack
    if (!hasCondition) {
      setSearchResults([])
      setSearchTotal(0)
      return
    }
    const { cards, total } = db.searchCards(filter, 1, 200)
    setSearchResults(cards)
    setSearchTotal(total)
  }

  const resolveEntries = (entries: DeckEntry[]): (DeckEntry & { card: ZxCard })[] => {
    return entries
      .map(e => {
        const card = db.getCardBySerial(e.serial)
        return card ? { ...e, card } : null
      })
      .filter((e): e is DeckEntry & { card: ZxCard } => e != null)
  }

  // ============ 游游亭价格批量加载 ============
  const loadDeckPrices = useCallback(async () => {
    if (!currentDeck) return
    // 收集所有卡牌所在卡包（去重）
    const allCards = [...currentDeck.mainDeck, ...currentDeck.extraDeck, ...currentDeck.otherDeck]
      .map(e => db.getCardBySerial(e.serial))
      .filter((c): c is ZxCard => c != null)
    const packs = new Set(allCards.map(c => c.packPrefix))
    const newPacks = [...packs].filter(p => !loadedPacksRef.current.has(p))
    if (newPacks.length === 0) return

    setPricesLoading(true)
    setPricesError('')
    try {
      // 逐包加载（避免并发请求过多），每包缓存10分钟
      for (const pack of newPacks) {
        const prices = await getPackPrices(pack)
        setDeckPrices(prev => {
          const next = new Map(prev)
          for (const [serial, price] of prices) next.set(serial, price)
          return next
        })
        loadedPacksRef.current.add(pack)
      }
    } catch (e) {
      setPricesError('部分价格加载失败，请检查网络')
    } finally {
      setPricesLoading(false)
    }
  }, [currentDeck])

  // 卡组变化时自动加载价格
  useEffect(() => {
    if (currentDeck) {
      loadDeckPrices()
    }
  }, [currentDeck, loadDeckPrices])

  /** 获取单卡价格（从已加载的 map 中，考虑罕贵度覆盖） */
  const getPriceOf = useCallback((serial: string): PackPriceResult | undefined => {
    const base = deckPrices.get(serial)
    if (!base) return undefined
    const override = deckRarityOverride.get(serial)
    if (override && base.variants) {
      const v = base.variants.find(x => (x.rarity || '通常') === override)
      if (v) return { serial, priceJPY: v.priceJPY, inStock: v.inStock, variants: base.variants }
    }
    return base
  }, [deckPrices, deckRarityOverride])

  /** 设置单卡罕贵度覆盖 */
  const setRarityOverride = useCallback((serial: string, rarity: string) => {
    setDeckRarityOverride(prev => {
      const next = new Map(prev)
      // 如果选的是默认（最低价），清除覆盖
      const base = deckPrices.get(serial)
      const defaultRarity = base?.variants?.find(v => v.priceJPY === base.priceJPY)?.rarity || '通常'
      if (rarity === defaultRarity) {
        next.delete(serial)
      } else {
        next.set(serial, rarity)
      }
      return next
    })
  }, [deckPrices])

  /** 计算卡组总造价（日元，考虑罕贵度覆盖） */
  const calcDeckTotalJPY = useCallback((entries: (DeckEntry & { card: ZxCard })[]): number => {
    let total = 0
    for (const e of entries) {
      const p = getPriceOf(e.serial)
      if (p && p.priceJPY >= 0) total += p.priceJPY * e.count
    }
    return total
  }, [getPriceOf])

  // Sort deck entries: cost desc, type ZX>Event>Ascension>Player>Extra
  const sortEntries = useCallback((entries: (DeckEntry & { card: ZxCard })[], sorted: boolean) => {
    if (!sorted) return entries
    const sortedArr = [...entries]
    sortedArr.sort((a, b) => {
      const costDiff = b.card.cost - a.card.cost // cost descending
      if (costDiff !== 0) return costDiff
      const typeDiff = (TYPE_SORT_ORDER[a.card.type] ?? 99) - (TYPE_SORT_ORDER[b.card.type] ?? 99)
      if (typeDiff !== 0) return typeDiff
      return a.serial.localeCompare(b.serial)
    })
    return sortedArr
  }, [])

  const mainEntriesRaw = useMemo(() => currentDeck ? resolveEntries(currentDeck.mainDeck) : [], [currentDeck])
  const extraEntriesRaw = useMemo(() => currentDeck ? resolveEntries(currentDeck.extraDeck) : [], [currentDeck])
  const otherEntriesRaw = useMemo(() => currentDeck ? resolveEntries(currentDeck.otherDeck) : [], [currentDeck])

  const mainEntries = useMemo(() => sortEntries(mainEntriesRaw, deckSorted), [mainEntriesRaw, deckSorted, sortEntries])
  const extraEntries = useMemo(() => sortEntries(extraEntriesRaw, deckSorted), [extraEntriesRaw, deckSorted, sortEntries])
  const otherEntries = useMemo(() => sortEntries(otherEntriesRaw, deckSorted), [otherEntriesRaw, deckSorted, sortEntries])

  // Check if a card can be added (respects limits)
  const canAddCard = useCallback((serial: string, zone: 'mainDeck' | 'extraDeck' | 'otherDeck') => {
    if (!currentDeck) return false
    const card = db.getCardBySerial(serial)
    if (!card) return false

    // 封神指定 = 禁卡，不能加入卡组
    if (isBannedCard(card)) return false

    // 传说指定 = 每卡组合计限 1 张
    if (isLimitedCard(card)) {
      const cardName = card.chineseName || card.japaneseName
      let limitedCount = 0
      for (const entry of [...currentDeck.mainDeck, ...currentDeck.extraDeck, ...currentDeck.otherDeck]) {
        const c = db.getCardBySerial(entry.serial)
        const name = c?.chineseName || c?.japaneseName
        if (name === cardName) limitedCount += entry.count
      }
      if (limitedCount >= CHUANSHUO_LIMIT) return false
    }

    // Same-name limit: 4 copies across all zones
    const cardName = card.chineseName || card.japaneseName
    let nameCount = 0
    for (const entry of [...currentDeck.mainDeck, ...currentDeck.extraDeck, ...currentDeck.otherDeck]) {
      const c = db.getCardBySerial(entry.serial)
      const name = c?.chineseName || c?.japaneseName
      if (name === cardName) nameCount += entry.count
    }
    // Same-name limit: default 4, but some cards allow more (e.g. 20/30)
    const maxCopies = getDeckLimit(card) ?? DECK_RULES.SAME_CARD_MAX
    if (nameCount >= maxCopies) return false

    // Zone limits
    const zoneTotal = currentDeck[zone].reduce((s, e) => s + e.count, 0)
    if (zone === 'mainDeck' && zoneTotal >= DECK_RULES.MAIN_DECK_EXACT) return false
    if (zone === 'extraDeck' && zoneTotal >= DECK_RULES.EXTRA_DECK_MAX) return false
    if (zone === 'otherDeck' && zoneTotal >= DECK_RULES.OTHER_DECK_MAX) return false

    // Link cards limit within other deck
    if (zone === 'otherDeck' && card.type === 'Link') {
      const linkCount = currentDeck.otherDeck.reduce((s, e) => {
        const c = db.getCardBySerial(e.serial)
        return s + (c?.type === 'Link' ? e.count : 0)
      }, 0)
      if (linkCount >= DECK_RULES.LINK_DECK_MAX) return false
    }

    return true
  }, [currentDeck])

  // Drag-and-drop reorder handlers (Bug 6)
  const handleDragStart = useCallback((e: React.DragEvent, zone: 'mainDeck' | 'extraDeck' | 'otherDeck', index: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ zone, index }))
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, zone: 'mainDeck' | 'extraDeck' | 'otherDeck', dropIndex: number) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')
    if (!data || !currentDeck) return
    try {
      const { zone: fromZone, index: dragIndex } = JSON.parse(data)
      if (fromZone !== zone) return // Only reorder within same zone
      const deck = { ...currentDeck }
      const entries = [...deck[zone]]
      const [moved] = entries.splice(dragIndex, 1)
      entries.splice(dropIndex, 0, moved)
      deck[zone] = entries
      saveDeck(deck)
      setCurrentDeck(deck)
    } catch { /* ignore */ }
  }, [currentDeck, saveDeck, setCurrentDeck])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // Touch-friendly card reorder (Bug 4: up/down buttons for mobile)
  const handleMoveCard = useCallback((zone: 'mainDeck' | 'extraDeck' | 'otherDeck', index: number, direction: 'up' | 'down') => {
    if (!currentDeck) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0) return
    const deck = { ...currentDeck }
    const entries = [...deck[zone]]
    if (targetIndex >= entries.length) return
    ;[entries[index], entries[targetIndex]] = [entries[targetIndex], entries[index]]
    deck[zone] = entries
    saveDeck(deck)
    setCurrentDeck(deck)
  }, [currentDeck, saveDeck, setCurrentDeck])

  // 打开替换弹窗：获取该卡的所有同名罕贵版本
  const handleOpenReplace = useCallback((card: ZxCard) => {
    setReplaceTarget(card)
  }, [])

  // 执行替换：将旧 serial 替换为新 serial（含 setup 标记同步）
  const handleDoReplace = useCallback((newSerial: string) => {
    if (!replaceTarget) return
    replaceDeckCard(replaceTarget.serial, newSerial)
    setReplaceTarget(null)
    const validation = useDeckStore.getState().currentValidation
    if (validation && !validation.valid && validation.errors.length > 0) {
      setTimeout(() => showToast(`\u26a0 ${validation.errors[0]}`), 300)
    } else {
      setTimeout(() => showToast('已替换为其他罕贵版本'), 300)
    }
  }, [replaceTarget, replaceDeckCard])

  // 生成人类可读的文本格式卡组代码（方便粘贴分享）
  const generateDeckText = useCallback((): string => {
    if (!currentDeck) return ''
    const lines: string[] = []
    lines.push(`# ${currentDeck.name}`)
    if (currentDeck.description) lines.push(`# ${currentDeck.description}`)
    lines.push('')

    const setup = currentDeck.setup ?? { startCards: [], gateCards: [], startResources: [] }

    // 辅助：将 serial 列表转为 "编号 x数量" 文本行
    const formatZone = (label: string, entries: DeckEntry[]): string[] => {
      if (entries.length === 0) return []
      const out: string[] = [`【${label}】(${entries.reduce((s, e) => s + e.count, 0)}张)`]
      for (const e of entries) {
        const card = db.getCardBySerial(e.serial)
        const name = card?.chineseName || card?.japaneseName || e.serial
        out.push(`${e.serial} ${name} x${e.count}`)
      }
      return out
    }

    // setup 标记
    const formatSetup = (label: string, serials: string[]): string[] => {
      if (serials.length === 0) return []
      const out: string[] = [`【${label}】`]
      for (const s of serials) {
        const card = db.getCardBySerial(s)
        const name = card?.chineseName || card?.japaneseName || s
        out.push(`${s} ${name}`)
      }
      return out
    }

    lines.push(...formatZone('主牌组', currentDeck.mainDeck))
    lines.push('')
    lines.push(...formatZone('额外卡组', currentDeck.extraDeck))
    lines.push('')
    lines.push(...formatZone('其他区域', currentDeck.otherDeck))

    const setupLines = [
      ...formatSetup('起始卡', setup.startCards),
      ...formatSetup('门扉卡', setup.gateCards),
      ...formatSetup('起始资源', setup.startResources),
    ]
    if (setupLines.length > 0) {
      lines.push('')
      lines.push(...setupLines)
    }

    return lines.join('\n')
  }, [currentDeck])

  // 导出文本格式至剪贴板
  const handleExportText = useCallback(() => {
    const text = generateDeckText()
    if (!text) return
    setExportText(text)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => showToast('文本卡组代码已复制到剪贴板'),
        () => showToast('已生成文本代码，请手动复制')
      )
    } else {
      showToast('已生成文本代码，请手动复制')
    }
  }, [generateDeckText])

  // Deck export: generate deck code (Bug 7)
  const handleExportDeck = () => {
    if (!currentDeck) return
    const exportData = {
      name: currentDeck.name,
      description: currentDeck.description,
      main: currentDeck.mainDeck,
      extra: currentDeck.extraDeck,
      other: currentDeck.otherDeck,
      setup: currentDeck.setup ?? { startCards: [], gateCards: [], startResources: [] },
    }
    const text = JSON.stringify(exportData)
    setExportText(text)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => showToast('卡组代码已复制到剪贴板'),
        () => showToast('卡组代码已生成，请手动复制')
      )
    } else {
      showToast('卡组代码已生成，请手动复制')
    }
  }

  // Deck import: parse JSON or text format (Bug 7 - with template format description)
  const handleImportDeck = () => {
    if (!importText.trim()) {
      showToast('请粘贴卡组代码')
      return
    }
    if (!currentDeck) {
      showToast('请先选择一个卡组')
      return
    }
    try {
      let mainDeck: DeckEntry[] = []
      let extraDeck: DeckEntry[] = []
      let otherDeck: DeckEntry[] = []
      let setup: DeckSetup = { startCards: [], gateCards: [], startResources: [] }

      const trimmed = importText.trim()

      if (trimmed.startsWith('{')) {
        // JSON 格式
        const data = JSON.parse(trimmed)
        mainDeck = Array.isArray(data.main) ? data.main : []
        extraDeck = Array.isArray(data.extra) ? data.extra : []
        otherDeck = Array.isArray(data.other) ? data.other : []
        if (data.setup && typeof data.setup === 'object') {
          setup = {
            startCards: Array.isArray(data.setup.startCards) ? data.setup.startCards : [],
            gateCards: Array.isArray(data.setup.gateCards) ? data.setup.gateCards : [],
            startResources: Array.isArray(data.setup.startResources) ? data.setup.startResources : [],
          }
        }
      } else {
        // 文本格式：按【区域】标题分段解析
        const lines = trimmed.split('\n')
        let currentZone: 'main' | 'extra' | 'other' | 'startCard' | 'gateCard' | 'startResource' | null = null
        // serial 正则：匹配 字母数字+连字符+数字 格式的卡牌编号（如 B01-001、IG10-032、PR14-006）
        const serialRe = /^([A-Za-z]+\d+-\d+[A-Za-z]*)/

        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line) continue
          // 注释行（# 开头）
          if (line.startsWith('#')) continue
          // 区域标题
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
          // 解析卡牌行：格式 "编号 名称 x数量" 或 "编号 名称" 或仅 "编号"
          const m = line.match(serialRe)
          if (m && currentZone) {
            const serial = m[1]
            // 提取数量：末尾 xN 或 x N
            const countMatch = line.match(/x\s*(\d+)\s*$/i)
            const count = countMatch ? parseInt(countMatch[1]) : 1

            if (currentZone === 'main') {
              mainDeck.push({ serial, count })
            } else if (currentZone === 'extra') {
              extraDeck.push({ serial, count })
            } else if (currentZone === 'other') {
              otherDeck.push({ serial, count })
            } else if (currentZone === 'startCard') {
              if (!setup.startCards.includes(serial)) setup.startCards.push(serial)
            } else if (currentZone === 'gateCard') {
              if (!setup.gateCards.includes(serial)) setup.gateCards.push(serial)
            } else if (currentZone === 'startResource') {
              if (!setup.startResources.includes(serial)) setup.startResources.push(serial)
            }
          }
        }
      }

      const updatedDeck: Deck = {
        ...currentDeck,
        mainDeck,
        extraDeck,
        otherDeck,
        setup,
      }
      saveDeck(updatedDeck)
      setCurrentDeck(updatedDeck)
      setImportText('')
      showToast('卡组导入成功')
      setActiveTab('main')
    } catch {
      showToast('卡组代码格式错误，请检查格式')
    }
  }

  // Deck image export: vertical card share image (ref format: white bg, 6 cards per row, zone headers, card thumbnails + count)
  const handleExportImage = async () => {
    if (!currentDeck) return
    showToast('正在生成卡组图片...')

    const zones = [
      { key: 'mainDeck' as const, label: '主牌组', entries: mainEntries },
      { key: 'extraDeck' as const, label: '额外卡组', entries: extraEntries },
      { key: 'otherDeck' as const, label: '其他区域', entries: otherEntries },
    ]

    // Build zone data with resolved cards, merging duplicates
    // 主牌组分为点燃/非点燃两组，与预览页一致
    type CardGroup = { serial: string; card: ZxCard; count: number }
    type ZoneSection = { label: string; count: number; groups: CardGroup[] }
    type ZoneData = { label: string; count: number; sections: ZoneSection[] }
    const zoneData: ZoneData[] = []
    for (const zone of zones) {
      const resolved = resolveEntries(zone.entries)
      const groupMap = new Map<string, CardGroup>()
      let totalCount = 0
      for (const e of resolved) {
        totalCount += e.count
        const existing = groupMap.get(e.serial)
        if (existing) {
          existing.count += e.count
        } else {
          groupMap.set(e.serial, { serial: e.serial, card: e.card, count: e.count })
        }
      }
      if (groupMap.size > 0) {
        if (zone.key === 'mainDeck') {
          // 主牌组分为点燃和非点燃两组
          const ignitionGroups: CardGroup[] = []
          const nonIgnitionGroups: CardGroup[] = []
          for (const g of groupMap.values()) {
            if (g.card.icons.includes('ignition')) {
              ignitionGroups.push(g)
            } else {
              nonIgnitionGroups.push(g)
            }
          }
          const sections: ZoneSection[] = []
          const igCount = ignitionGroups.reduce((s, g) => s + g.count, 0)
          const nonIgCount = nonIgnitionGroups.reduce((s, g) => s + g.count, 0)
          if (ignitionGroups.length > 0) {
            sections.push({ label: '点燃', count: igCount, groups: ignitionGroups })
          }
          if (nonIgnitionGroups.length > 0) {
            sections.push({ label: '非点燃', count: nonIgCount, groups: nonIgnitionGroups })
          }
          zoneData.push({ label: zone.label, count: totalCount, sections })
        } else {
          zoneData.push({
            label: zone.label,
            count: totalCount,
            sections: [{ label: '', count: totalCount, groups: [...groupMap.values()] }],
          })
        }
      }
    }

    const COLS = 6
    const CARD_W = 120
    const CARD_H = 168
    const GAP = 8
    const PADDING = 30
    const HEADER_H = 40
    const CARD_ROW_H = CARD_H + 24 // card + count label
    const TITLE_H = 80

    // Preload all card images
    const allGroups = zoneData.flatMap(z => z.sections.flatMap(s => s.groups))
    const imgMap = new Map<string, HTMLImageElement>()
    let loaded = 0
    const totalImgs = allGroups.length

    await new Promise<void>((resolveAll) => {
      if (totalImgs === 0) { resolveAll(); return }
      for (const g of allGroups) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = img.onerror = () => {
          imgMap.set(g.serial, img)
          loaded++
          if (loaded === totalImgs) resolveAll()
        }
        img.src = g.card.imageUrl
      }
      // Timeout after 15s
      setTimeout(resolveAll, 15000)
    })

    // Calculate canvas size
    const W = PADDING * 2 + COLS * CARD_W + (COLS - 1) * GAP
    let totalH = PADDING + TITLE_H

    for (const zone of zoneData) {
      totalH += HEADER_H
      for (const section of zone.sections) {
        if (section.label) totalH += 24  // 子标题行
        const rows = Math.ceil(section.groups.length / COLS)
        totalH += rows * CARD_ROW_H + 12
      }
      totalH += 8
    }
    totalH += PADDING

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = totalH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, totalH)

    // Title
    ctx.fillStyle = '#222222'
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText(currentDeck.name || '未命名卡组', PADDING, PADDING + 30)

    // Subtitle with counts
    const countParts = zoneData.map(z => `${z.label} ${z.count}`)
    ctx.font = '14px sans-serif'
    ctx.fillStyle = '#666666'
    ctx.fillText(countParts.join('  |  '), PADDING, PADDING + 55)

    let y = PADDING + TITLE_H

    // Draw each zone
    for (const zone of zoneData) {
      // Zone header bar
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(PADDING, y, W - PADDING * 2, HEADER_H - 4)
      ctx.fillStyle = '#333333'
      ctx.font = 'bold 16px sans-serif'
      ctx.fillText(`${zone.label} (${zone.count})`, PADDING + 12, y + 26)
      y += HEADER_H

      // Draw each section within the zone
      for (const section of zone.sections) {
        // Sub-header (only for named sections like 点燃/非点燃)
        if (section.label) {
          ctx.fillStyle = '#666666'
          ctx.font = 'bold 13px sans-serif'
          ctx.fillText(`${section.label} (${section.count})`, PADDING + 8, y + 16)
          y += 24
        }

        // Cards grid
        for (let i = 0; i < section.groups.length; i++) {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const x = PADDING + col * (CARD_W + GAP)
          const cardY = y + row * CARD_ROW_H

          const group = section.groups[i]
          const img = imgMap.get(group.serial)

          // Draw card image or placeholder
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, x, cardY, CARD_W, CARD_H)
          } else {
            ctx.fillStyle = '#e8e8e8'
            ctx.fillRect(x, cardY, CARD_W, CARD_H)
            ctx.fillStyle = '#999'
            ctx.font = '10px sans-serif'
            const shortName = (group.card.chineseName || group.card.japaneseName || '').slice(0, 8)
            ctx.fillText(shortName, x + 4, cardY + CARD_H / 2)
          }

          // Card border
          ctx.strokeStyle = '#cccccc'
          ctx.lineWidth = 1
          ctx.strokeRect(x, cardY, CARD_W, CARD_H)

          // Count label below card
          ctx.fillStyle = '#333333'
          ctx.font = 'bold 13px sans-serif'
          const countText = `x${group.count}`
          const tw = ctx.measureText(countText).width
          ctx.fillText(countText, x + (CARD_W - tw) / 2, cardY + CARD_H + 16)
        }

        const rows = Math.ceil(section.groups.length / COLS)
        y += rows * CARD_ROW_H + 12
      }
      y += 8
    }

    // Bottom credit line
    ctx.fillStyle = '#bbbbbb'
    ctx.font = '11px sans-serif'
    ctx.fillText('Z/X Card Helper', PADDING, totalH - 10)

    // Convert canvas to data URL for preview + base64 for Filesystem
    const dataUrl = canvas.toDataURL('image/png')
    const base64Data = dataUrl.split(',')[1] // Remove "data:image/png;base64," prefix
    setExportedBase64(base64Data)
    setExportedImageUrl(dataUrl)
    showToast('图片已生成，点击下载按钮保存')
  }

  if (!currentDeck) return null

  const tabs: { key: DeckTab; label: string }[] = [
    { key: 'main', label: `主牌组 (${mainEntries.reduce((s, e) => s + e.count, 0)}/${DECK_RULES.MAIN_DECK_EXACT})` },
    { key: 'extra', label: `额外卡组 (${extraEntries.reduce((s, e) => s + e.count, 0)}/${DECK_RULES.EXTRA_DECK_MAX})` },
    { key: 'other', label: `其他 (${otherEntries.reduce((s, e) => s + e.count, 0)})` },
    { key: 'preview', label: '预览' },
    { key: 'search', label: '添加卡牌' },
    { key: 'tools', label: '导入/导出' },
  ]

  return (
    <div className="animate-fade-in flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/decks')} style={{ color: 'var(--color-accent)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-base font-semibold flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
          {currentDeck.name}
        </h2>
        <button
          onClick={handleOpenDeckEdit}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--color-text-secondary)' }}
          title="编辑牌组信息"
        >
          <Pencil size={16} />
        </button>
        <DeckValidationBadge validation={currentValidation} />
      </div>

      {/* Deck Edit Modal */}
      {showDeckEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowDeckEdit(false)}
        >
          <div
            className="rounded-xl border p-4 w-[90%] max-w-sm space-y-3"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                编辑牌组信息
              </h3>
              <button onClick={() => setShowDeckEdit(false)} style={{ color: 'var(--color-text-secondary)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                牌组名称
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={30}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{
                  background: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="输入牌组名称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                描述（可选）
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                style={{
                  background: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="输入牌组描述..."
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeckEdit(false)}
                className="flex-1 py-2 rounded-lg text-sm border"
                style={{
                  background: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveDeckEdit}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: 'var(--color-accent)',
                  color: 'white',
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF 打印视图 */}
      {showPrintView && currentDeck && (
        <DeckPrintView
          entries={{
            mainDeck: currentDeck.mainDeck,
            extraDeck: currentDeck.extraDeck,
            otherDeck: currentDeck.otherDeck,
          }}
          deckName={currentDeck.name}
          onClose={() => setShowPrintView(false)}
        />
      )}

      {/* Tab Bar */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap px-2"
            style={{
              borderColor: activeTab === tab.key ? 'var(--color-accent)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              background: 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-20">
        {/* Deck Sort Controls */}
        {(activeTab === 'main' || activeTab === 'extra' || activeTab === 'other' || activeTab === 'preview') && (
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setDeckSorted(!deckSorted)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs border"
              style={{
                background: deckSorted ? 'var(--color-accent)' : 'var(--color-bg-card)',
                borderColor: deckSorted ? 'var(--color-accent)' : 'var(--color-border)',
                color: deckSorted ? 'white' : 'var(--color-text-primary)',
              }}
            >
              <ArrowUpDown size={12} /> 一键排序
            </button>
            {deckSorted && (
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>费用降序 / Z/X{'>'}事件{'>'}升格{'>'}玩家{'>'}额外</span>
            )}
          </div>
        )}

        {activeTab === 'main' && (
          <DeckEntryList
            entries={mainEntries}
            zone="mainDeck"
            onAdd={(serial) => { addCardToMain(serial); showValidationErrors() }}
            onRemove={removeCardFromMain}
            canAdd={canAddCard}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onMoveUp={(i) => handleMoveCard('mainDeck', i, 'up')}
            onMoveDown={(i) => handleMoveCard('mainDeck', i, 'down')}
            setup={currentDeck?.setup}
            onToggleSetup={toggleSetupMark}
            priceOf={getPriceOf}
            onSetRarity={setRarityOverride}
            getRarityOf={(serial) => deckRarityOverride.get(serial) || ''}
            onReplace={handleOpenReplace}
            getVariants={(card) => db.getSameNameVariants(card)}
          />
        )}
        {activeTab === 'extra' && (
          <DeckEntryList
            entries={extraEntries}
            zone="extraDeck"
            onAdd={(serial) => { addCardToExtra(serial); showValidationErrors() }}
            onRemove={removeCardFromExtra}
            canAdd={canAddCard}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onMoveUp={(i) => handleMoveCard('extraDeck', i, 'up')}
            onMoveDown={(i) => handleMoveCard('extraDeck', i, 'down')}
            priceOf={getPriceOf}
            onSetRarity={setRarityOverride}
            getRarityOf={(serial) => deckRarityOverride.get(serial) || ''}
            onReplace={handleOpenReplace}
            getVariants={(card) => db.getSameNameVariants(card)}
          />
        )}
        {activeTab === 'other' && (
          <DeckEntryList
            entries={otherEntries}
            zone="otherDeck"
            onAdd={(serial) => { addCardToOther(serial); showValidationErrors() }}
            onRemove={removeCardFromOther}
            canAdd={canAddCard}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onMoveUp={(i) => handleMoveCard('otherDeck', i, 'up')}
            onMoveDown={(i) => handleMoveCard('otherDeck', i, 'down')}
            priceOf={getPriceOf}
            onSetRarity={setRarityOverride}
            getRarityOf={(serial) => deckRarityOverride.get(serial) || ''}
            onReplace={handleOpenReplace}
            getVariants={(card) => db.getSameNameVariants(card)}
          />
        )}
        {activeTab === 'preview' && (
          <DeckPreview
            mainEntries={mainEntries}
            extraEntries={extraEntries}
            otherEntries={otherEntries}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            priceOf={getPriceOf}
            pricesLoading={pricesLoading}
            onRefresh={loadDeckPrices}
            pricesError={pricesError}
          />
        )}
        {activeTab === 'search' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="搜索卡牌，点击+自动添加到对应区域..."
                className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                style={{
                  background: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                onClick={() => setShowFilterPanel(v => !v)}
                className="px-4 py-2 rounded-lg text-sm border flex items-center"
                title="多方式筛选"
                style={{
                  background: 'var(--color-bg-card)',
                  borderColor: showFilterPanel ? 'var(--color-accent)' : 'var(--color-border)',
                  color: showFilterPanel ? 'var(--color-accent)' : 'var(--color-text-primary)',
                }}
              >
                <SlidersHorizontal size={16} />
              </button>
              <button
                onClick={handleSearch}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                <Search size={16} />
              </button>
            </div>

            {showFilterPanel && (
              <DeckSearchFilterPanel
                filter={searchFilter}
                onChange={setSearchFilter}
                onReset={() => setSearchFilter({ ...DEFAULT_FILTER })}
              />
            )}

            {searchTotal > 0 && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                找到 {searchTotal} 张卡牌{searchTotal > 200 ? '，显示前200张' : ''}
              </p>
            )}

            {searchResults.map(card => {
              const zone = getDeckZone(card.type)
              const zoneLabel = zone === 'main' ? '主' : zone === 'extra' ? '额' : '其他'
              const zoneKey = zone === 'main' ? 'mainDeck' : zone === 'extra' ? 'extraDeck' : 'otherDeck'
              const canAddThis = canAddCard(card.serial, zoneKey)
              const handleAdd = () => {
                if (!canAddThis) return
                addCardAuto(card.serial)
                const cardName = card.chineseName || card.japaneseName
                showToast(`已添加 ${cardName} 到${zone === 'main' ? '主牌组' : zone === 'extra' ? '额外卡组' : '其他区域'}`)
              }
              return (
                <div
                  key={card.serial}
                  className="flex items-center gap-2 p-2 rounded-lg border"
                  style={{
                    background: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  {/* Small image preview */}
                  <img
                    src={card.imageUrl}
                    alt=""
                    className="w-8 h-11 rounded object-cover flex-shrink-0"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.visibility = 'hidden'
                    }}
                  />
                  <div
                    className="w-1.5 h-8 rounded-sm flex-shrink-0"
                    style={{ background: card.colors && card.colors.length > 1
                      ? `linear-gradient(180deg, ${card.colors.map(col => COLOR_HEX[col]).join(', ')})`
                      : COLOR_HEX[card.color] }}
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/cards/${card.serial}`}
                      className="text-sm font-medium truncate block"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {card.chineseName || card.japaneseName}
                      {card.tags && card.tags.length > 0 && (
                        <span className="ml-1 text-xs px-1 rounded" style={{ background: card.tags.includes('封神指定') ? '#e74c3c' : '#f39c12', color: 'white' }}>
                          {card.tags.join('/')}
                        </span>
                      )}
                    </Link>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {card.serial} | {getCardTypeLabel(card)} | {card.rarity} | 费用:{card.cost >= 0 ? card.cost : '-'}
                    </p>
                  </div>
                  <button
                    onClick={handleAdd}
                    disabled={!canAddThis}
                    title={!canAddThis && card.tags?.includes('封神指定') ? '封神指定（禁卡）不能加入卡组'
                      : !canAddThis && card.tags?.includes('传说指定') ? '传说指定每卡组限1张'
                      : undefined}
                    className="px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-40"
                    style={{ background: canAddThis ? 'var(--color-accent)' : 'var(--color-bg-hover)', color: canAddThis ? 'white' : 'var(--color-text-secondary)' }}
                  >
                    <Plus size={12} />
                    {zoneLabel}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-4">
            {/* Export */}
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <Download size={16} style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  导出卡组
                </h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleExportDeck}
                  className="flex-1 min-w-[100px] py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  复制JSON代码
                </button>
                <button
                  onClick={handleExportText}
                  className="flex-1 min-w-[100px] py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  复制文本代码
                </button>
                <button
                  onClick={handleExportImage}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm border"
                  style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                >
                  <ImageIcon size={14} />
                  导出图片
                </button>
                <button
                  onClick={() => setShowPrintView(true)}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm border"
                  style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                >
                  <Printer size={14} />
                  打印PDF
                </button>
              </div>
              {exportText && (
                <textarea
                  readOnly
                  value={exportText}
                  className="w-full h-24 p-2 rounded border text-xs resize-none"
                  style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onClick={e => (e.target as HTMLTextAreaElement).select()}
                />
              )}
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                生成图片后点击下载按钮保存
              </p>
            </div>

            {/* Import */}
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <Upload size={16} style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  导入卡组
                </h3>
              </div>
              <div
                className="rounded-lg border p-3 text-xs space-y-1"
                style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>支持两种格式：</p>
                <p style={{ color: 'var(--color-accent)' }}>JSON 格式：</p>
                <pre className="whitespace-pre-wrap" style={{ fontFamily: 'monospace' }}>
{`{
  "main": [{"serial":"B01-001","count":4}],
  "extra": [{"serial":"B01-100","count":2}],
  "setup": { "startCards": ["B01-001"] }
}`}
                </pre>
                <p style={{ color: 'var(--color-accent)' }}>文本格式：</p>
                <pre className="whitespace-pre-wrap" style={{ fontFamily: 'monospace' }}>
{`【主牌组】(50张)
B01-001 卡名 x4
【额外卡组】(16张)
B01-100 卡名 x2
【起始卡】
B01-001 卡名`}
                </pre>
                <p>粘贴后自动识别格式，serial = 卡牌编号，count = 张数</p>
              </div>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="粘贴卡组代码..."
                className="w-full h-24 p-2 rounded border text-xs resize-none outline-none"
                style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
              <button
                onClick={handleImportDeck}
                className="w-full py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                导入卡组
              </button>
            </div>
          </div>
        )}

        {/* Validation Details - show on ALL tabs when there are errors */}
        {currentValidation && !currentValidation.valid && (
          <div
            className="mt-3 rounded-xl border p-3 space-y-1"
            style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'var(--color-danger)' }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
                卡组存在问题
              </span>
            </div>
            {currentValidation.errors.map((err, i) => (
              <p key={i} className="text-xs" style={{ color: 'var(--color-danger)' }}>{err}</p>
            ))}
          </div>
        )}

        {/* Full Validation Details - only on main tab */}
        {currentValidation && (activeTab === 'main') && (
          <ValidationDetails validation={currentValidation} />
        )}
      </div>

      {/* Export Image Modal - with download button for mobile */}
      {exportedImageUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
          onClick={() => {
            setExportedImageUrl('')
            setExportedBase64('')
          }}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 z-10"
            onClick={() => {
              setExportedImageUrl('')
              setExportedBase64('')
            }}
          >
            <X size={24} />
          </button>
          <img
            src={exportedImageUrl}
            alt="卡组图片"
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <div className="flex gap-3 mt-4" onClick={e => e.stopPropagation()}>
            <button
              onClick={async () => {
                const fileName = `deck-${currentDeck?.name || 'export'}.png`
                try {
                  if (Capacitor.isNativePlatform()) {
                    // Native: use Capacitor Filesystem to write to device
                    const result = await Filesystem.writeFile({
                      path: fileName,
                      data: exportedBase64,
                      directory: Directory.Documents,
                    })
                    showToast(`图片已保存到: ${result.uri}`)
                  } else {
                    // Web: use blob download
                    const res = await fetch(exportedImageUrl)
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = fileName
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    showToast('图片已保存')
                  }
                } catch (err) {
                  showToast('保存失败: ' + String(err).slice(0, 50))
                }
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              <Download size={14} className="inline mr-1" />
              下载图片
            </button>
          </div>
        </div>
      )}

      {/* Replace Card Modal - 替换为其他罕贵版本的同名卡 */}
      {replaceTarget && (
        <ReplaceCardModal
          card={replaceTarget}
          variants={db.getSameNameVariants(replaceTarget)}
          onSelect={(newSerial) => handleDoReplace(newSerial)}
          onClose={() => setReplaceTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-50"
          style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

// ============ Sub-components ============

// 替换卡牌弹窗：横向滚动展示同名不同罕贵版本，点击即替换
function ReplaceCardModal({
  card,
  variants,
  onSelect,
  onClose,
}: {
  card: ZxCard
  variants: ZxCard[]
  onSelect: (newSerial: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl border p-4 w-[92%] max-w-lg"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
            <Pencil size={14} />
            替换为其他罕贵版本
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-danger)', color: '#fff' }}
            title="关闭"
          >
            <X size={14} />
          </button>
        </div>

        {/* 当前卡牌信息 */}
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          当前：{card.chineseName || card.japaneseName}（{card.serial} · {card.rarity}）
        </p>

        {variants.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--color-text-secondary)' }}>
            没有找到其他罕贵版本的同名卡
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {variants.map(v => (
              <button
                key={v.serial}
                onClick={() => onSelect(v.serial)}
                className="flex-shrink-0 w-28 rounded-lg border p-2 flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                style={{
                  background: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                }}
                title={`替换为 ${v.serial}`}
              >
                <img
                  src={v.imageUrl}
                  alt={v.serial}
                  className="w-20 h-auto rounded object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.visibility = 'hidden'
                  }}
                />
                <span className="text-[10px] font-medium truncate w-full text-center" style={{ color: 'var(--color-text-primary)' }}>
                  {v.serial}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}>
                  {v.rarity}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DeckEntryList({
  entries,
  zone,
  onAdd,
  onRemove,
  canAdd,
  onDragStart,
  onDrop,
  onDragOver,
  onMoveUp,
  onMoveDown,
  setup,
  onToggleSetup,
  priceOf,
  onSetRarity,
  getRarityOf,
  onReplace,
  getVariants,
}: {
  entries: (DeckEntry & { card: ZxCard })[]
  zone: 'mainDeck' | 'extraDeck' | 'otherDeck'
  onAdd: (serial: string) => void
  onRemove: (serial: string) => void
  canAdd: (serial: string, zone: 'mainDeck' | 'extraDeck' | 'otherDeck') => boolean
  onDragStart: (e: React.DragEvent, zone: 'mainDeck' | 'extraDeck' | 'otherDeck', index: number) => void
  onDrop: (e: React.DragEvent, zone: 'mainDeck' | 'extraDeck' | 'otherDeck', index: number) => void
  onDragOver: (e: React.DragEvent) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  setup?: DeckSetup
  onToggleSetup?: (serial: string, role: 'startCard' | 'gateCard' | 'startResource') => void
  priceOf?: (serial: string) => PackPriceResult | undefined
  onSetRarity?: (serial: string, rarity: string) => void
  getRarityOf?: (serial: string) => string
  onReplace?: (card: ZxCard) => void
  getVariants?: (card: ZxCard) => ZxCard[]
}) {
  // 预计算每张卡是否有可替换的同名罕贵版本（serial → variants 数量）
  // 避免渲染时每行重复遍历全量卡库
  const variantsCount = useMemo(() => {
    if (!getVariants) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const e of entries) {
      if (map.has(e.serial)) continue
      map.set(e.serial, getVariants(e.card).length)
    }
    return map
  }, [entries, getVariants])
  // 游戏准备卡角色映射：图标 → (role, 标签)
  const setupRoles: { icon: 'starting' | 'door' | 'starting_resource'; role: 'startCard' | 'gateCard' | 'startResource'; label: string }[] = [
    { icon: 'starting', role: 'startCard', label: '起始卡' },
    { icon: 'door', role: 'gateCard', label: '门扉卡' },
    { icon: 'starting_resource', role: 'startResource', label: '起始资源' },
  ]
  const isMarked = (serial: string, role: 'startCard' | 'gateCard' | 'startResource'): boolean => {
    if (!setup) return false
    const arr = role === 'startCard' ? setup.startCards : role === 'gateCard' ? setup.gateCards : setup.startResources
    return arr.includes(serial)
  }
  if (entries.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
        <p>暂无卡牌</p>
        <p className="text-xs mt-1">切换到"添加卡牌"标签搜索添加</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry, index) => {
        const eligibleRoles = zone === 'mainDeck' ? setupRoles.filter(r => entry.card.icons.includes(r.icon)) : []
        return (
        <div
          key={entry.serial}
          className="flex items-center gap-2 p-2 rounded-lg border"
          draggable
          onDragStart={e => onDragStart(e, zone, index)}
          onDrop={e => onDrop(e, zone, index)}
          onDragOver={onDragOver}
          style={{
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
            cursor: 'grab',
          }}
        >
          {/* Drag handle (Bug 6) */}
          <GripVertical size={14} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />

          {/* Card image + replace button (左上角替换按钮) */}
          <div className="relative flex-shrink-0">
            <img
              src={entry.card.imageUrl}
              alt=""
              className="w-7 h-10 rounded object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.visibility = 'hidden'
              }}
            />
            {onReplace && getVariants && (() => {
              const vCount = variantsCount.get(entry.serial) ?? 0
              if (vCount === 0) return null
              return (
                <button
                  onClick={(e) => { e.stopPropagation(); onReplace(entry.card) }}
                  className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow z-10"
                  style={{
                    background: 'var(--color-accent)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.6)',
                  }}
                  title={`替换为其他罕贵版本的同名卡（${vCount}个版本）`}
                >
                  <Pencil size={10} />
                </button>
              )
            })()}
          </div>

          <div
            className="w-1.5 h-8 rounded-sm flex-shrink-0"
            style={{ background: COLOR_HEX[entry.card.color] }}
          />
          <div className="flex-1 min-w-0">
            <Link
              to={`/cards/${entry.serial}`}
              className="text-sm font-medium truncate block"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {entry.card.chineseName || entry.card.japaneseName}
            </Link>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {entry.serial} | {getCardTypeLabel(entry.card)} | {entry.card.rarity} | x{entry.count}
            </p>
            {/* 游游亭单卡价格 + 罕贵度切换 */}
            {priceOf && (() => {
              const p = priceOf(entry.serial)
              if (!p) return null
              const variants = p.variants ?? []
              const currentRarity = getRarityOf?.(entry.serial) || variants.find(v => v.priceJPY === p.priceJPY)?.rarity || '通常'
              const hasVariants = variants.length > 1
              return (
                <div className="mt-0.5 space-y-1">
                  <p className="text-xs" style={{ color: 'var(--color-accent)' }}>
                    {p.priceJPY >= 0 ? `¥${formatJPY(p.priceJPY)}` : '无价格'}
                    {p.priceJPY >= 0 && (
                      <span className="ml-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        3算 ¥{yenToCny(p.priceJPY, 0.03).toLocaleString('en-US')}
                      </span>
                    )}
                  </p>
                  {hasVariants && onSetRarity && (
                    <div className="flex flex-wrap gap-1">
                      {variants.map(v => {
                        const label = v.rarity || '通常'
                        const isActive = currentRarity === label
                        return (
                          <button
                            key={label}
                            onClick={() => onSetRarity(entry.serial, label)}
                            className="text-[9px] px-1.5 py-0.5 rounded-full border transition-colors"
                            style={{
                              borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                              background: isActive ? 'var(--color-accent)' : 'transparent',
                              color: isActive ? '#fff' : 'var(--color-text-secondary)',
                              fontWeight: isActive ? 600 : 400,
                            }}
                          >
                            {label}{!v.inStock && ' 缺'}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
            {/* 游戏准备卡标记（仅主牌组且有对应图标） */}
            {eligibleRoles.length > 0 && onToggleSetup && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {eligibleRoles.map(r => {
                  const marked = isMarked(entry.serial, r.role)
                  return (
                    <button
                      key={r.role}
                      onClick={() => onToggleSetup(entry.serial, r.role)}
                      className="text-[10px] px-1.5 py-0.5 rounded-full border transition-colors"
                      style={{
                        background: marked ? 'var(--color-primary)' : 'transparent',
                        color: marked ? '#fff' : 'var(--color-text-secondary)',
                        borderColor: marked ? 'var(--color-primary)' : 'var(--color-border)',
                      }}
                      title={marked ? `已标记为${r.label}，点击取消` : `标记为${r.label}`}
                    >
                      {marked ? '✓ ' : ''}{r.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onRemove(entry.serial)}
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ background: 'var(--color-bg-hover)', color: 'var(--color-danger)' }}
            >
              <Minus size={12} />
            </button>
            <span className="text-sm w-5 text-center" style={{ color: 'var(--color-text-primary)' }}>
              {entry.count}
            </span>
            <button
              onClick={() => canAdd(entry.serial, zone) && onAdd(entry.serial)}
              disabled={!canAdd(entry.serial, zone)}
              className="w-6 h-6 rounded flex items-center justify-center disabled:opacity-30"
              style={{ background: 'var(--color-bg-hover)', color: canAdd(entry.serial, zone) ? 'var(--color-success)' : 'var(--color-text-secondary)' }}
            >
              <Plus size={12} />
            </button>
          </div>
          {/* Reorder buttons (Bug 4: touch-friendly up/down) */}
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30"
              style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}
            >
              <ChevronUp size={10} />
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === entries.length - 1}
              className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30"
              style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}
            >
              <ChevronDown size={10} />
            </button>
          </div>
        </div>
        )
      })}
    </div>
  )
}

function DeckPreview({
  mainEntries,
  extraEntries,
  otherEntries,
  onDragStart,
  onDrop,
  onDragOver,
  priceOf,
  pricesLoading,
  onRefresh,
  pricesError,
}: {
  mainEntries: (DeckEntry & { card: ZxCard })[]
  extraEntries: (DeckEntry & { card: ZxCard })[]
  otherEntries: (DeckEntry & { card: ZxCard })[]
  onDragStart: (e: React.DragEvent, zone: 'mainDeck' | 'extraDeck' | 'otherDeck', index: number) => void
  onDrop: (e: React.DragEvent, zone: 'mainDeck' | 'extraDeck' | 'otherDeck', index: number) => void
  onDragOver: (e: React.DragEvent) => void
  priceOf?: (serial: string) => PackPriceResult | undefined
  pricesLoading?: boolean
  onRefresh?: () => void
  pricesError?: string
}) {
  const navigate = useNavigate()
  const dragGuard = useRef(false)

  // 计算卡组总造价（所有区域）
  const totalJPY = useMemo(() => {
    const all = [...mainEntries, ...extraEntries, ...otherEntries]
    let total = 0
    let found = 0
    for (const e of all) {
      const p = priceOf?.(e.serial)
      if (p && p.priceJPY >= 0) {
        total += p.priceJPY * e.count
        found++
      }
    }
    return { total, found, all: all.length }
  }, [mainEntries, extraEntries, otherEntries, priceOf])

  const renderPriceSummary = () => (
    <div
      className="rounded-xl border p-3 mb-4 space-y-2"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            卡组造价
          </span>
          {pricesLoading && (
            <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
          )}
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
        >
          <RefreshCw size={10} className={pricesLoading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>
      {totalJPY.total > 0 ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              ¥{formatJPY(totalJPY.total)}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>日元</span>
          </div>
          <div className="flex gap-2">
            {([0.03, 0.04, 0.05] as const).map(rate => (
              <div
                key={rate}
                className="flex-1 rounded-lg border px-2 py-1 text-center"
                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
              >
                <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {rate * 100}算
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  ¥{yenToCny(totalJPY.total, rate).toLocaleString('en-US')}
                </p>
              </div>
            ))}
          </div>
          {totalJPY.found < totalJPY.all && (
            <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              已查询到 {totalJPY.found}/{totalJPY.all} 张卡的价格
            </p>
          )}
          <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
            数据来自游游亭，仅供参考
          </p>
        </>
      ) : pricesLoading ? (
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>正在查询价格...</p>
      ) : pricesError ? (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{pricesError}</p>
      ) : (
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>暂无价格数据</p>
      )}
    </div>
  )
  const renderCardGrid = (entries: (DeckEntry & { card: ZxCard })[], zone: 'mainDeck' | 'extraDeck' | 'otherDeck') => (
    <div className="grid grid-cols-6 gap-1.5">
      {entries.map((entry, index) => (
        <div
          key={entry.serial}
          className="relative cursor-pointer active:scale-95 transition-transform"
          draggable
          onDragStart={e => { dragGuard.current = true; onDragStart(e, zone, index) }}
          onDragEnd={() => { setTimeout(() => { dragGuard.current = false }, 50) }}
          onDrop={e => onDrop(e, zone, index)}
          onDragOver={onDragOver}
          onClick={() => { if (dragGuard.current) return; navigate(`/cards/${entry.serial}`) }}
        >
          <img
            src={entry.card.imageUrl}
            alt={entry.card.chineseName || entry.card.japaneseName || ''}
            className="w-full aspect-[5/7] rounded object-cover"
            style={entry.card.colors && entry.card.colors.length > 1
              ? { border: '2px solid', borderImage: `linear-gradient(135deg, ${entry.card.colors.map(col => COLOR_HEX[col]).join(', ')}) 1`, borderImageSlice: 1 }
              : { border: `2px solid ${COLOR_HEX[entry.card.color] || '#555'}` }}
            loading="lazy"
            onError={(e) => {
              const img = e.target as HTMLImageElement
              img.style.background = 'var(--color-bg-card)'
            }}
          />
          {entry.count > 1 && (
            <span
              className="absolute bottom-0 right-0 px-1 text-xs font-bold rounded-tl rounded-br"
              style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
            >
              x{entry.count}
            </span>
          )}
        </div>
      ))}
    </div>
  )

  const renderZone = (label: string, zone: 'mainDeck' | 'extraDeck' | 'otherDeck', entries: (DeckEntry & { card: ZxCard })[]) => {
    if (entries.length === 0) return null
    return (
      <div className="mb-4">
        <div
          className="px-3 py-1.5 rounded-lg mb-2 text-sm font-medium"
          style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}
        >
          {label} ({entries.reduce((s, e) => s + e.count, 0)})
        </div>
        {renderCardGrid(entries, zone)}
      </div>
    )
  }

  // For main deck: split into ignition and non-ignition
  const renderMainDeckWithIgnition = () => {
    if (mainEntries.length === 0) return null
    const ignitionEntries: (DeckEntry & { card: ZxCard })[] = []
    const nonIgnitionEntries: (DeckEntry & { card: ZxCard })[] = []

    for (const entry of mainEntries) {
      // 只有有 ignition 图标的卡才是点燃卡
      const isIgnitionCard = entry.card.icons.includes('ignition')

      if (isIgnitionCard) {
        ignitionEntries.push(entry)
      } else {
        nonIgnitionEntries.push(entry)
      }
    }

    return (
      <div className="mb-4">
        <div
          className="px-3 py-1.5 rounded-lg mb-2 text-sm font-medium"
          style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}
        >
          主牌组 ({mainEntries.reduce((s, e) => s + e.count, 0)})
        </div>
        {ignitionEntries.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: 'var(--color-accent)' }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                点燃 ({ignitionEntries.reduce((s, e) => s + e.count, 0)})
              </span>
            </div>
            {renderCardGrid(ignitionEntries, 'mainDeck')}
          </div>
        )}
        {nonIgnitionEntries.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: 'var(--color-text-secondary)' }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                非点燃 ({nonIgnitionEntries.reduce((s, e) => s + e.count, 0)})
              </span>
            </div>
            {renderCardGrid(nonIgnitionEntries, 'mainDeck')}
          </div>
        )}
      </div>
    )
  }

  if (mainEntries.length === 0 && extraEntries.length === 0 && otherEntries.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
        <p>卡组为空</p>
        <p className="text-xs mt-1">请先添加卡牌后再预览</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {renderPriceSummary()}
      {renderMainDeckWithIgnition()}
      {renderZone('额外卡组', 'extraDeck', extraEntries)}
      {renderZone('其他区域', 'otherDeck', otherEntries)}
    </div>
  )
}

function DeckValidationBadge({ validation }: { validation: DeckValidationResult | null }) {
  if (!validation) return null
  return (
    <div className="flex items-center gap-1">
      {validation.valid ? (
        <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
      ) : (
        <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />
      )}
    </div>
  )
}

function ValidationDetails({ validation }: { validation: DeckValidationResult }) {
  const stats = validation.stats
  const totalCards = Object.values(stats.colorDistribution).reduce((s, v) => s + v, 0)

  return (
    <div
      className="mt-4 rounded-xl border p-3 space-y-3"
      style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center gap-2">
        <Info size={14} style={{ color: 'var(--color-accent)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          牌组验证
        </span>
      </div>
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((err, i) => (
            <p key={i} className="text-xs" style={{ color: 'var(--color-danger)' }}>{err}</p>
          ))}
        </div>
      )}
      {validation.warnings.length > 0 && (
        <div className="space-y-1">
          {validation.warnings.map((w, i) => (
            <p key={i} className="text-xs" style={{ color: 'var(--color-warning)' }}>{w}</p>
          ))}
        </div>
      )}

      {/* Color Distribution Bar */}
      {totalCards > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>颜色配比</p>
          {/* Bar */}
          <div className="flex rounded-full overflow-hidden h-4">
            {Object.entries(stats.colorDistribution).map(([color, count]) => {
              const pct = (count / totalCards) * 100
              if (pct < 0.5) return null
              return (
                <div
                  key={color}
                  className="flex items-center justify-center text-[10px] font-bold"
                  style={{
                    width: `${pct}%`,
                    background: COLOR_HEX[color as keyof typeof COLOR_HEX] || '#888',
                    color: color === 'white' ? '#333' : '#fff',
                    minWidth: count > 0 ? '8px' : '0',
                  }}
                  title={`${COLOR_LABELS[color as keyof typeof COLOR_LABELS] || color}: ${count}张 (${pct.toFixed(1)}%)`}
                >
                  {pct >= 8 ? `${pct.toFixed(0)}%` : ''}
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(stats.colorDistribution).map(([color, count]) => {
              const pct = ((count / totalCards) * 100).toFixed(1)
              return (
                <div key={color} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: COLOR_HEX[color as keyof typeof COLOR_HEX] || '#888' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {COLOR_LABELS[color as keyof typeof COLOR_LABELS] || color} {count}张 ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats summary */}
      <div className="text-xs space-y-0.5" style={{ color: 'var(--color-text-secondary)' }}>
        <p>点燃卡: {stats.ignitionCount} / 非点燃: {stats.nonIgnitionCount}</p>
        <p>生命恢复: {stats.lifeRecoveryCount}/{DECK_RULES.LIFE_RECOVERY_MAX} | 虚空使者: {stats.voidBringerCount}/{DECK_RULES.VOID_BRINGER_MAX} | 超限驱动: {stats.overdriveCount}/{DECK_RULES.OVERDRIVE_MAX}</p>
      </div>
    </div>
  )
}
