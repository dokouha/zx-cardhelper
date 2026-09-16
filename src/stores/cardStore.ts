import { create } from 'zustand'
import type { ZxCard, CardFilter } from '@/types/card'
import { DEFAULT_FILTER } from '@/types/card'
import { db } from '@/db/database'

interface CardStoreState {
  // Search state
  filter: CardFilter
  results: ZxCard[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null

  // Card detail
  selectedCard: ZxCard | null

  // Filter options
  availablePacks: { prefix: string; count: number }[]
  availableRaces: string[]
  availableRarities: { rarity: string; count: number }[]
  dbLoaded: boolean

  // Actions
  setFilter: (filter: Partial<CardFilter>) => void
  resetFilter: () => void
  search: (page?: number) => Promise<void>
  selectCard: (card: ZxCard | null) => Promise<void>
  initDatabase: () => Promise<void>
  loadFilterOptions: () => void
}

export const useCardStore = create<CardStoreState>((set, get) => ({
  filter: { ...DEFAULT_FILTER },
  results: [],
  total: 0,
  page: 1,
  pageSize: 30,
  loading: false,
  error: null,
  selectedCard: null,
  availablePacks: [],
  availableRaces: [],
  availableRarities: [],
  dbLoaded: false,

  setFilter: (partial) => {
    set(state => ({
      filter: { ...state.filter, ...partial },
      page: 1, // Reset to page 1 on filter change
    }))
  },

  resetFilter: () => {
    set({ filter: { ...DEFAULT_FILTER }, page: 1 })
  },

  search: async (page?: number) => {
    const state = get()
    const targetPage = page ?? state.page

    set({ loading: true, error: null })
    try {
      const { cards, total } = db.searchCards(state.filter, targetPage, state.pageSize)
      set({ results: cards, total, page: targetPage, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  selectCard: async (card) => {
    set({ selectedCard: card })
  },

  initDatabase: async () => {
    if (get().dbLoaded) return

    set({ loading: true, error: null })
    try {
      await db.init()

      const cardCount = db.getCardCount()
      if (cardCount > 0) {
        get().loadFilterOptions()
        set({ dbLoaded: true, loading: false })
      } else {
        set({ loading: false, error: '数据库为空，请先导入卡牌数据' })
      }
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  loadFilterOptions: () => {
    try {
      const packs = db.getPackList()
      const races = db.getRaceList()
      const rarities = db.getRarityCounts()
      set({ availablePacks: packs, availableRaces: races, availableRarities: rarities })
    } catch {
      // Silently ignore filter option loading errors
    }
  },
}))
