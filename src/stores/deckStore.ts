import { create } from 'zustand'
import type { Deck, DeckEntry, DeckValidationResult, ZxCard, DeckSetup } from '@/types/card'
import { DECK_RULES, getDeckZone, EMPTY_DECK_SETUP, getDeckLimit, isBannedCard, isLimitedCard, CHUANSHUO_LIMIT } from '@/types/card'
import { db } from '@/db/database'

export type DeckTab = 'main' | 'extra' | 'other' | 'preview' | 'search' | 'tools'

// Helper: detect icon from card data (icons field + type fallback)
function hasLifeRecovery(card: ZxCard): boolean {
  return card.icons.includes('life_recovery')
}
function hasVoidBringer(card: ZxCard): boolean {
  return card.icons.includes('void_bringer')
}
function hasOverdrive(card: ZxCard): boolean {
  return card.icons.includes('overdrive') || card.type === 'Z/X Over Boost'
}

const DECKS_STORAGE_KEY = 'zx-app-decks'

interface DeckStoreState {
  // Deck list
  decks: Deck[]
  loading: boolean
  error: string | null

  // Current editing deck
  currentDeck: Deck | null
  currentValidation: DeckValidationResult | null

  // UI state: current active tab in deck builder (persisted across page navigation)
  deckBuilderTab: DeckTab

  // Actions
  loadDecks: () => void
  createDeck: (name: string, description?: string) => Deck
  saveDeck: (deck: Deck) => void
  deleteDeck: (deckId: string) => void
  setCurrentDeck: (deck: Deck | null) => void

  // Card operations (manual zone)
  addCardToMain: (serial: string) => void
  removeCardFromMain: (serial: string) => void
  addCardToExtra: (serial: string) => void
  removeCardFromExtra: (serial: string) => void
  addCardToOther: (serial: string) => void
  removeCardFromOther: (serial: string) => void

  // Auto-routing: automatically add card to correct zone
  addCardAuto: (serial: string) => void

  // 替换卡牌为其他罕贵版本的同名卡（同步更新 setup 标记）
  replaceCard: (serial: string, newSerial: string) => void

  // 游戏准备卡标记（起始卡/门扉卡/起始资源）
  toggleSetupMark: (serial: string, role: 'startCard' | 'gateCard' | 'startResource') => void

  // UI: set active tab in deck builder
  setDeckBuilderTab: (tab: DeckTab) => void

  // Validation
  validateDeck: (deck?: Deck) => DeckValidationResult
}

function generateId(): string {
  return `deck_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function createEmptyDeck(name: string, description = ''): Deck {
  return {
    id: generateId(),
    name,
    description,
    mainDeck: [],
    extraDeck: [],
    otherDeck: [],
    setup: { ...EMPTY_DECK_SETUP },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// Ensure old decks have otherDeck and setup (backward compatibility)
function migrateDeck(deck: Deck): Deck {
  let migrated = deck
  if (!migrated.otherDeck) {
    migrated = { ...migrated, otherDeck: [] }
  }
  if (!migrated.setup) {
    migrated = { ...migrated, setup: { ...EMPTY_DECK_SETUP } }
  }
  return migrated
}

function loadDecksFromStorage(): Deck[] {
  try {
    const raw = localStorage.getItem(DECKS_STORAGE_KEY)
    if (!raw) return []
    const decks = JSON.parse(raw) as Deck[]
    return decks.map(migrateDeck)
  } catch {
    return []
  }
}

function saveDecksToStorage(decks: Deck[]): void {
  try {
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks))
  } catch (err) {
    console.error('[DeckStore] Failed to save decks to localStorage:', err)
  }
}

// Helper: add card to a specific zone
function addCardToZone(deck: Deck, zone: 'mainDeck' | 'extraDeck' | 'otherDeck', serial: string) {
  const entries = deck[zone]
  const existing = entries.find(e => e.serial === serial)
  if (existing) {
    existing.count += 1
  } else {
    entries.push({ serial, count: 1 })
  }
}

function removeCardFromZone(deck: Deck, zone: 'mainDeck' | 'extraDeck' | 'otherDeck', serial: string) {
  const entries = deck[zone]
  const existing = entries.find(e => e.serial === serial)
  if (existing) {
    existing.count -= 1
    if (existing.count <= 0) {
      deck[zone] = entries.filter(e => e.serial !== serial)
    }
  }
}

export const useDeckStore = create<DeckStoreState>((set, get) => ({
  decks: [],
  loading: false,
  error: null,
  currentDeck: null,
  currentValidation: null,
  deckBuilderTab: 'main',

  loadDecks: () => {
    try {
      const decks = loadDecksFromStorage()
      set({ decks })
    } catch (err) {
      set({ error: String(err) })
    }
  },

  createDeck: (name, description) => {
    const deck = createEmptyDeck(name, description)
    const newDecks = [...get().decks, deck]
    saveDecksToStorage(newDecks)
    set({ decks: newDecks })
    return deck
  },

  saveDeck: (deck) => {
    const updatedDeck = { ...deck, updatedAt: Date.now() }
    const newDecks = get().decks.map(d => d.id === updatedDeck.id ? updatedDeck : d)
    saveDecksToStorage(newDecks)
    set({
      decks: newDecks,
      currentDeck: get().currentDeck?.id === updatedDeck.id ? updatedDeck : get().currentDeck,
    })
  },

  deleteDeck: (deckId) => {
    const newDecks = get().decks.filter(d => d.id !== deckId)
    saveDecksToStorage(newDecks)
    set({
      decks: newDecks,
      currentDeck: get().currentDeck?.id === deckId ? null : get().currentDeck,
    })
  },

  setCurrentDeck: (deck) => {
    const migrated = deck ? migrateDeck(deck) : null
    const validation = migrated ? get().validateDeck(migrated) : null
    set({ currentDeck: migrated, currentValidation: validation })
  },

  addCardToMain: (serial) => {
    const deck = get().currentDeck
    if (!deck) return
    addCardToZone(deck, 'mainDeck', serial)
    const validation = get().validateDeck(deck)
    get().saveDeck(deck)
    set({ currentDeck: { ...deck }, currentValidation: validation })
  },

  removeCardFromMain: (serial) => {
    const deck = get().currentDeck
    if (!deck) return
    removeCardFromZone(deck, 'mainDeck', serial)
    const validation = get().validateDeck(deck)
    get().saveDeck(deck)
    set({ currentDeck: { ...deck }, currentValidation: validation })
  },

  addCardToExtra: (serial) => {
    const deck = get().currentDeck
    if (!deck) return
    addCardToZone(deck, 'extraDeck', serial)
    const validation = get().validateDeck(deck)
    get().saveDeck(deck)
    set({ currentDeck: { ...deck }, currentValidation: validation })
  },

  removeCardFromExtra: (serial) => {
    const deck = get().currentDeck
    if (!deck) return
    removeCardFromZone(deck, 'extraDeck', serial)
    const validation = get().validateDeck(deck)
    get().saveDeck(deck)
    set({ currentDeck: { ...deck }, currentValidation: validation })
  },

  addCardToOther: (serial) => {
    const deck = get().currentDeck
    if (!deck) return
    addCardToZone(deck, 'otherDeck', serial)
    const validation = get().validateDeck(deck)
    get().saveDeck(deck)
    set({ currentDeck: { ...deck }, currentValidation: validation })
  },

  removeCardFromOther: (serial) => {
    const deck = get().currentDeck
    if (!deck) return
    removeCardFromZone(deck, 'otherDeck', serial)
    const validation = get().validateDeck(deck)
    get().saveDeck(deck)
    set({ currentDeck: { ...deck }, currentValidation: validation })
  },

  addCardAuto: (serial) => {
    const deck = get().currentDeck
    if (!deck) return
    const card = db.getCardBySerial(serial)
    if (!card) return
    const zone = getDeckZone(card.type)
    const zoneKey = zone === 'main' ? 'mainDeck' : zone === 'extra' ? 'extraDeck' : 'otherDeck'
    addCardToZone(deck, zoneKey, serial)
    const validation = get().validateDeck(deck)
    get().saveDeck(deck)
    set({ currentDeck: { ...deck }, currentValidation: validation })
  },

  // 切换游戏准备卡标记（起始卡/门扉卡/起始资源）
  toggleSetupMark: (serial, role) => {
    const deck = get().currentDeck
    if (!deck) return
    const setup = deck.setup ?? { ...EMPTY_DECK_SETUP }
    const arr = role === 'startCard' ? setup.startCards : role === 'gateCard' ? setup.gateCards : setup.startResources
    const idx = arr.indexOf(serial)
    if (idx >= 0) {
      arr.splice(idx, 1)
    } else {
      arr.push(serial)
    }
    const newSetup: DeckSetup = {
      startCards: role === 'startCard' ? [...arr] : [...setup.startCards],
      gateCards: role === 'gateCard' ? [...arr] : [...setup.gateCards],
      startResources: role === 'startResource' ? [...arr] : [...setup.startResources],
    }
    const updatedDeck = { ...deck, setup: newSetup, updatedAt: Date.now() }
    get().saveDeck(updatedDeck)
    set({ currentDeck: { ...updatedDeck }, currentValidation: get().validateDeck(updatedDeck) })
  },

// 替换卡牌为其他罕贵版本的同名卡（同步更新 setup 标记）
  replaceCard: (serial, newSerial) => {
    const deck = get().currentDeck
    if (!deck || serial === newSerial) return

    // 每个区域分别替换：旧卡的 count 合并到新卡上（若新卡已存在），或直接替换
    const replaceInZone = (entries: DeckEntry[]): DeckEntry[] => {
      const oldEntry = entries.find(e => e.serial === serial)
      if (!oldEntry) return entries
      const newEntry = entries.find(e => e.serial === newSerial)
      if (newEntry) {
        // 合并：删除旧卡条目，把数量累加到新卡
        return entries
          .filter(e => e.serial !== serial && e.serial !== newSerial)
          .concat({ serial: newSerial, count: newEntry.count + oldEntry.count })
      }
      // 直接替换 serial
      return entries.map(e => e.serial === serial ? { ...e, serial: newSerial } : e)
    }

    const newMain = replaceInZone(deck.mainDeck)
    const newExtra = replaceInZone(deck.extraDeck)
    const newOther = replaceInZone(deck.otherDeck)

    // 检查是否真的发生了替换（旧 serial 已不存在于任何区域）
    const stillExists = newMain.some(e => e.serial === serial)
      || newExtra.some(e => e.serial === serial)
      || newOther.some(e => e.serial === serial)
    if (stillExists) return

    const newDeck = { ...deck, mainDeck: newMain, extraDeck: newExtra, otherDeck: newOther }

    // 同步替换 setup 标记中的 serial（起始卡/门扉卡/起始资源）
    const setup = newDeck.setup ?? { ...EMPTY_DECK_SETUP }
    const replaceInArr = (arr: string[]) => arr.map(s => s === serial ? newSerial : s)
    const newSetup: DeckSetup = {
      startCards: replaceInArr(setup.startCards),
      gateCards: replaceInArr(setup.gateCards),
      startResources: replaceInArr(setup.startResources),
    }
    const updatedDeck = { ...newDeck, setup: newSetup, updatedAt: Date.now() }
    const validation = get().validateDeck(updatedDeck)
    get().saveDeck(updatedDeck)
    set({ currentDeck: { ...updatedDeck }, currentValidation: validation })
  },

  validateDeck: (deckArg) => {
    const deck = migrateDeck(deckArg!)
    const errors: string[] = []
    const warnings: string[] = []

    // Count deck cards
    const mainDeckCount = deck.mainDeck.reduce((sum, e) => sum + e.count, 0)
    const extraDeckCount = deck.extraDeck.reduce((sum, e) => sum + e.count, 0)
    const otherDeckCount = deck.otherDeck.reduce((sum, e) => sum + e.count, 0)

    // Main deck must be exactly 50
    if (mainDeckCount !== DECK_RULES.MAIN_DECK_EXACT) {
      errors.push(`主牌组必须有${DECK_RULES.MAIN_DECK_EXACT}张卡，当前${mainDeckCount}张`)
    }

    // Extra deck max 16
    if (extraDeckCount > DECK_RULES.EXTRA_DECK_MAX) {
      errors.push(`额外卡组最多${DECK_RULES.EXTRA_DECK_MAX}张卡，当前${extraDeckCount}张`)
    }

    // Other deck max (total)
    if (otherDeckCount > DECK_RULES.OTHER_DECK_MAX) {
      errors.push(`其他区域最多${DECK_RULES.OTHER_DECK_MAX}张卡，当前${otherDeckCount}张`)
    }

    // Link cards within other deck: max 10
    const linkDeckCount = deck.otherDeck.reduce((sum, e) => {
      const card = db.getCardBySerial(e.serial)
      return sum + (card?.type === 'Link' ? e.count : 0)
    }, 0)
    if (linkDeckCount > DECK_RULES.LINK_DECK_MAX) {
      errors.push(`链结卡最多${DECK_RULES.LINK_DECK_MAX}张，当前${linkDeckCount}张`)
    }

    // Same-name limit across all zones (default 4, some cards allow more)
    const nameCounts: Record<string, number> = {}
    const nameToCard: Record<string, ZxCard | undefined> = {}
    for (const entry of [...deck.mainDeck, ...deck.extraDeck, ...deck.otherDeck]) {
      const card = db.getCardBySerial(entry.serial)
      const name = card?.chineseName ?? card?.japaneseName ?? entry.serial
      nameCounts[name] = (nameCounts[name] ?? 0) + entry.count
      if (!nameToCard[name] && card) nameToCard[name] = card
    }
    for (const [name, count] of Object.entries(nameCounts)) {
      const card = nameToCard[name]
      const maxCopies = card ? (getDeckLimit(card) ?? DECK_RULES.SAME_CARD_MAX) : DECK_RULES.SAME_CARD_MAX
      if (count > maxCopies) {
        errors.push(`"${name}"超过${maxCopies}张同名上限，当前${count}张`)
      }
    }

    // 封神指定 = 禁卡（不得出现在任何区域）；传说指定 = 每张限 1 张
    const bannedSerials = new Set<string>()
    const limitedCounts: Record<string, { count: number; name: string }> = {}
    for (const entry of [...deck.mainDeck, ...deck.extraDeck, ...deck.otherDeck]) {
      const card = db.getCardBySerial(entry.serial)
      if (!card) continue
      if (isBannedCard(card)) bannedSerials.add(entry.serial)
      if (isLimitedCard(card)) {
        const key = card.chineseName || card.japaneseName || entry.serial
        if (!limitedCounts[key]) limitedCounts[key] = { count: 0, name: key }
        limitedCounts[key].count += entry.count
      }
    }
    for (const serial of bannedSerials) {
      const card = db.getCardBySerial(serial)
      errors.push(`"${card?.chineseName ?? serial}"为封神指定（禁卡），不能放入卡组`)
    }
    for (const { count, name } of Object.values(limitedCounts)) {
      if (count > CHUANSHUO_LIMIT) {
        errors.push(`"${name}"为传说指定，每卡组最多${CHUANSHUO_LIMIT}张，当前${count}张`)
      }
    }

    // Icon-specific counts (main deck only)
    // 点燃卡判断逻辑：
    // - 只有有 ignition 图标的卡才是点燃卡
    // - 其他所有卡都是非点燃
    let ignitionCount = 0
    let nonIgnitionCount = 0
    let lifeRecoveryCount = 0
    let voidBringerCount = 0
    let overdriveCount = 0
    const colorDistribution: Record<string, number> = {}

    for (const entry of deck.mainDeck) {
      const card = db.getCardBySerial(entry.serial)
      if (!card) continue

      colorDistribution[card.color] = (colorDistribution[card.color] ?? 0) + entry.count

      if (hasLifeRecovery(card)) lifeRecoveryCount += entry.count
      if (hasVoidBringer(card)) voidBringerCount += entry.count
      if (hasOverdrive(card)) overdriveCount += entry.count

      if (card.icons.includes('ignition')) {
        ignitionCount += entry.count
      } else {
        nonIgnitionCount += entry.count
      }
    }

    // Also count colors from extra and other decks
    for (const entry of [...deck.extraDeck, ...deck.otherDeck]) {
      const card = db.getCardBySerial(entry.serial)
      if (card) {
        colorDistribution[card.color] = (colorDistribution[card.color] ?? 0) + entry.count
      }
    }

    // 点燃卡下限为硬性规则
    if (ignitionCount < DECK_RULES.IGNITION_MIN) {
      errors.push(`主牌组至少需要${DECK_RULES.IGNITION_MIN}张点燃卡，当前${ignitionCount}张`)
    }

    if (lifeRecoveryCount > DECK_RULES.LIFE_RECOVERY_MAX) {
      errors.push(`生命恢复卡最多${DECK_RULES.LIFE_RECOVERY_MAX}张，当前${lifeRecoveryCount}张`)
    }

    if (voidBringerCount > DECK_RULES.VOID_BRINGER_MAX) {
      errors.push(`虚空使者卡最多${DECK_RULES.VOID_BRINGER_MAX}张，当前${voidBringerCount}张`)
    }

    if (overdriveCount > DECK_RULES.OVERDRIVE_MAX) {
      errors.push(`超限驱动卡最多${DECK_RULES.OVERDRIVE_MAX}张，当前${overdriveCount}张`)
    }

    // Warnings
    if (extraDeckCount === 0) {
      warnings.push('额外卡组为空')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        mainDeckCount,
        extraDeckCount,
        otherDeckCount,
        ignitionCount,
        nonIgnitionCount,
        lifeRecoveryCount,
        voidBringerCount,
        overdriveCount,
        colorDistribution: colorDistribution as any,
      },
    }
  },

  setDeckBuilderTab: (tab) => set({ deckBuilderTab: tab }),
}))
