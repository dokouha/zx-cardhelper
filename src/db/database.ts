import type { ZxCard, CardFilter, CardColor, CardType, Rarity, CardIcon, SortOption } from '@/types/card'
import { parseType } from '@/utils/parsers'
import { applyCorrections } from '@/data/terminology'

// ============ Compact JSON data format ============
// Optional fields may be omitted when empty to reduce file size
interface CompactCard {
  id: number
  s: string         // serial (required)
  pp: string        // pack_prefix (required)
  c: CardColor      // color (required)
  cn: string        // chinese_name (required)
  r: Rarity         // rarity (required)
  t: CardType       // type (required)
  race: string      // race (required)
  cost: number      // cost (required)
  pw: number        // power (required)
  img: string       // image_url (required)
  // Optional fields (may be omitted when empty):
  cid?: string      // card_id
  cs?: CardColor[]  // colors (only if multi-color)
  jn?: string       // japanese_name
  ic?: CardIcon[]   // icons
  ef?: string       // effect
  ft?: string       // flavor_text
  il?: string       // illustrator
  pn?: string       // popular_name
  sh?: number       // shield
  v?: number        // version
  rc?: string[]     // related_cards
  tg?: string[]     // tags（封神指定/传说指定等）
}

interface CompactPack {
  p: string    // prefix
  n: string    // name
  d: string    // release_date
  cnt: number  // card_count
}

// ============ In-Memory Database Manager ============
class DatabaseManager {
  private cards: ZxCard[] = []
  private cardsBySerial: Map<string, ZxCard> = new Map()
  private packs: CompactPack[] = []
  private packReleaseDate: Map<string, string> = new Map() // prefix -> release_date
  private loaded = false

  async init(): Promise<void> {
    if (this.loaded) return

    console.log('[DB] Loading card data...')
    try {
      const response = await fetch('./cards.json')
      if (!response.ok) throw new Error(`Failed to fetch cards.json: ${response.status}`)
      
      console.log('[DB] cards.json fetched, parsing...')
      const data: { cards: CompactCard[]; packs: CompactPack[] } = await response.json()
      
      console.log(`[DB] Parsed ${data.cards.length} cards, ${data.packs.length} packs`)
      this.cards = data.cards.map(c => this.compactToCard(c))
      this.cardsBySerial = new Map(this.cards.map(c => [c.serial, c]))
      this.packs = data.packs
      this.packReleaseDate = new Map(data.packs.map(p => [p.p, p.d]))
      this.loaded = true
      console.log('[DB] Database loaded successfully!')
    } catch (err) {
      console.error('[DB] Failed to load card data:', err)
      throw err
    }
  }

  getCardCount(): number {
    return this.cards.length
  }

  /** 获取全部卡牌的精简数据（供脚本批量注册使用） */
  getAllCardsData(): { serial: string; effect: string; type: string; name: string }[] {
    return this.cards.map(c => ({
      serial: c.serial,
      effect: c.effect ?? '',
      type: c.type ?? '',
      name: c.chineseName || c.japaneseName || '',
    }))
  }

  searchCards(filter: CardFilter, page = 1, pageSize = 30): { cards: ZxCard[]; total: number } {
    let filtered = this.cards

    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase()
      filtered = filtered.filter(c =>
        c.chineseName.toLowerCase().includes(kw) ||
        c.japaneseName.toLowerCase().includes(kw) ||
        c.popularName.toLowerCase().includes(kw) ||
        c.serial.toLowerCase().includes(kw)
      )
    }

    if (filter.color) {
      filtered = filtered.filter(c => c.color === filter.color || c.colors.includes(filter.color!))
    }

    // 仅多色卡：colors 数组长度 > 1
    if (filter.multiColorOnly) {
      filtered = filtered.filter(c => c.colors.length > 1)
    }

    if (filter.types.length > 0) {
      filtered = filtered.filter(c => filter.types.includes(c.type))
    }

    if (filter.race) {
      filtered = filtered.filter(c => c.race.includes(filter.race!))
    }

    if (filter.rarity) {
      filtered = filtered.filter(c => c.rarity === filter.rarity)
    }

    if (filter.costMin != null) {
      filtered = filtered.filter(c => c.cost >= filter.costMin!)
    }

    if (filter.costMax != null) {
      filtered = filtered.filter(c => c.cost <= filter.costMax!)
    }

    if (filter.powerMin != null) {
      filtered = filtered.filter(c => c.power >= filter.powerMin!)
    }

    if (filter.powerMax != null) {
      filtered = filtered.filter(c => c.power <= filter.powerMax!)
    }

    if (filter.pack) {
      filtered = filtered.filter(c => c.packPrefix === filter.pack)
    }

    if (filter.icons.length > 0) {
      filtered = filtered.filter(c =>
        filter.icons.every(icon => c.icons.includes(icon))
      )
    }

    const total = filtered.length

    // Sort
    const sort = filter.sort ?? 'serial'
    filtered = this.sortCards(filtered, sort)

    // Merge duplicate cards: same name + same effect + same rarity → keep first, collect alt serials
    const seen = new Map<string, ZxCard>()
    const merged: ZxCard[] = []
    for (const card of filtered) {
      const key = `${card.chineseName}|||${card.effect}|||${card.rarity}`
      const existing = seen.get(key)
      if (existing) {
        // Merge: add alt serial to the first card
        if (!existing.altSerials) existing.altSerials = []
        existing.altSerials.push(card.serial)
      } else {
        seen.set(key, card)
        merged.push(card)
      }
    }

    const offset = (page - 1) * pageSize
    const paged = merged.slice(offset, offset + pageSize)

    return { cards: paged, total: merged.length }
  }

  private sortCards(cards: ZxCard[], sort: SortOption): ZxCard[] {
    const sorted = [...cards]
    switch (sort) {
      case 'newest':
        return sorted.sort((a, b) => {
          const da = this.packReleaseDate.get(a.packPrefix) || ''
          const db = this.packReleaseDate.get(b.packPrefix) || ''
          // Descending by release date, then descending by serial within same pack
          if (da !== db) return db.localeCompare(da)
          return b.serial.localeCompare(a.serial)
        })
      case 'cost-asc':
        return sorted.sort((a, b) => a.cost - b.cost || a.serial.localeCompare(b.serial))
      case 'cost-desc':
        return sorted.sort((a, b) => b.cost - a.cost || a.serial.localeCompare(b.serial))
      case 'power-asc':
        return sorted.sort((a, b) => a.power - b.power || a.serial.localeCompare(b.serial))
      case 'power-desc':
        return sorted.sort((a, b) => b.power - a.power || a.serial.localeCompare(b.serial))
      case 'name':
        return sorted.sort((a, b) =>
          (a.chineseName || a.japaneseName).localeCompare(b.chineseName || b.japaneseName, 'zh'))
      case 'serial':
      default:
        return sorted.sort((a, b) => a.serial.localeCompare(b.serial))
    }
  }

  getCardBySerial(serial: string): ZxCard | null {
    return this.cardsBySerial.get(serial) ?? null
  }

  // BUG#14: 按卡名和类型查找卡牌（用于衍生物查找）
  getCardByName(name: string, type?: string): ZxCard | null {
    for (const card of this.cards) {
      if (type && card.type !== type) continue
      if (card.chineseName === name || card.japaneseName === name) {
        return card
      }
    }
    // 模糊匹配 fallback
    for (const card of this.cards) {
      if (type && card.type !== type) continue
      if (card.chineseName.includes(name) || name.includes(card.chineseName)) {
        return card
      }
    }
    return null
  }

  // 查找同一张卡的其他罕贵/版本（同名卡）
  // 用于组卡界面"替换为其他罕贵版本的同名卡"功能
  getSameNameVariants(card: ZxCard): ZxCard[] {
    const name = card.chineseName || card.japaneseName
    if (!name) return []
    const variants: ZxCard[] = []
    const seenSerials = new Set<string>()
    for (const c of this.cards) {
      if (c.id === card.id) continue // 排除自己
      if (seenSerials.has(c.serial)) continue
      // 同名匹配：中文名或日文名相同
      const cName = c.chineseName || c.japaneseName
      if (cName === name) {
        seenSerials.add(c.serial)
        variants.push(c)
      }
    }
    return variants
  }

  getPackList(): { prefix: string; count: number }[] {
    const packCount = new Map<string, number>()
    for (const card of this.cards) {
      packCount.set(card.packPrefix, (packCount.get(card.packPrefix) ?? 0) + 1)
    }
    return Array.from(packCount.entries())
      .map(([prefix, count]) => ({ prefix, count }))
      .sort((a, b) => a.prefix.localeCompare(b.prefix))
  }

  getRarityList(): string[] {
    const rarities = new Set<string>()
    for (const card of this.cards) {
      if (card.rarity) rarities.add(card.rarity)
    }
    return Array.from(rarities).sort((a, b) => {
      // Sort by count descending, then alphabetically
      return a.localeCompare(b)
    })
  }

  getRarityCounts(): { rarity: string; count: number }[] {
    const counts = new Map<string, number>()
    for (const card of this.cards) {
      counts.set(card.rarity, (counts.get(card.rarity) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([rarity, count]) => ({ rarity, count }))
      .sort((a, b) => b.count - a.count)
  }

  getRaceList(): string[] {
    const races = new Set<string>()
    for (const card of this.cards) {
      if (card.race) races.add(card.race)
    }
    return Array.from(races).sort()
  }

  private compactToCard(c: any): ZxCard {
    return {
      id: c.id,
      cardId: c.cid ?? '',
      packPrefix: c.pp,
      serial: c.s,
      color: c.c,
      colors: c.cs ?? [c.c],
      japaneseName: c.jn ?? '',
      chineseName: c.cn,
      rarity: c.r,
      type: parseType(c.t ?? ''),
      race: c.race ?? '',
      cost: c.cost ?? -1,
      power: c.pw ?? -1,
      shield: (() => {
        if (c.sh != null && c.sh !== -1) return c.sh
        // 升格卡的护盾值在效果文本中，格式为 "护盾：N"
        if (c.t === 'Ascension' || c.t === 'Ascension Extra') {
          const m = (c.ef || '').match(/护盾[：:](\d+)/)
          if (m) return parseInt(m[1], 10)
        }
        return -1
      })(),
      icons: c.ic ?? [],
      effect: applyCorrections(c.ef ?? ''),
      flavorText: applyCorrections(c.ft ?? ''),
      illustrator: c.il ?? '',
      popularName: applyCorrections(c.pn ?? ''),
      version: c.v ?? 1,
      relatedCards: c.rc ?? [],
      tags: c.tg ?? [],
      imageUrl: c.img ?? '',
    }
  }
}

// Singleton instance
export const db = new DatabaseManager()
