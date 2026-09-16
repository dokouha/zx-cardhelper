// 游游亭 (yuyu-tei.jp) 卡牌价格查询服务
// 通过解析游游亭 Z/X 卡牌页面 HTML 提取实时价格
import { Capacitor } from '@capacitor/core'

export interface CardPrice {
  serial: string      // 卡牌编号，如 "IG13-037"
  priceJPY: number    // 日元价格（-1 表示无价格/缺货无价）
  inStock: boolean    // 是否有货
  nameJP: string      // 日文卡名（来自游游亭）
  updatedAt: number   // 查询时间戳
}

export interface PackPriceResult {
  serial: string
  priceJPY: number    // 主价格：同编号多个罕贵度中最低价（-1 表示无价格/缺货无价）
  inStock: boolean
  variants: PackPriceVariant[]  // 同编号全部罕贵度条目（含主价格对应条目）
}

/** 同编号单个罕贵度变体的价格条目 */
export interface PackPriceVariant {
  rarity: string    // 罕贵度（N/R/R+/RH/SR/SRH/NH/SEC/UR/IGR 等，'' 表示通常版/未标注）
  priceJPY: number
  inStock: boolean
  stockNote: string // 库存备注：'有货' / '缺货' / '限购N'
  nameJP: string    // 日文卡名（来自游游亭）
}

// 内存缓存：key = packPrefix(小写) -> { serial -> price }
const packCache = new Map<string, { data: Map<string, PackPriceResult>; fetchedAt: number }>()
// 单卡缓存：key = serial -> price
const cardCache = new Map<string, CardPrice>()

const CACHE_TTL = 10 * 60 * 1000 // 10分钟缓存

// 游游亭卡包列表页 URL（包前缀需小写，如 ig13、b01）
const PACK_LIST_URL = (pack: string) => `https://yuyu-tei.jp/sell/zx/s/${pack}`
// 游游亭单卡详情页 URL
const CARD_DETAIL_URL = (pack: string, cid: string) => `https://yuyu-tei.jp/sell/zx/card/${pack}/${cid}`

/** 将卡牌 packPrefix（如 "B01"）转为游游亭小写（如 "b01"） */
function normalizePackPrefix(packPrefix: string): string {
  return packPrefix.toLowerCase()
}

/** 从 serial 中提取包前缀（如 "IG13-037" → "ig13"） */
export function extractPackFromSerial(serial: string): string {
  const m = serial.match(/^([A-Za-z]+)-/)
  return m ? m[1].toLowerCase() : ''
}

/**
 * 执行 HTTP 请求，优先使用 CapacitorHttp（原生，可绕过 CORS），否则使用 fetch
 */
async function httpGet(url: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      // Capacitor 8 内置原生 HTTP 插件，绕过 WebView CORS
      const { CapacitorHttp } = await import('@capacitor/core')
      const res = await CapacitorHttp.get({ url, readTimeout: 15000, connectTimeout: 15000 })
      if (typeof res.data === 'string') return res.data
      return JSON.stringify(res.data)
    } catch (e) {
      console.warn('[price] CapacitorHttp failed, fallback to fetch:', e)
    }
  }
  const res = await fetch(url, { headers: { 'Accept': 'text/html' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

/** 从卡牌列表页 HTML 解析所有卡牌价格（serial → price）
 *  同一编号可能出现多个 block（不同罕贵度：N/NH、R/RH、SR/SRH 等），
 *  span 中编号相同，罕贵度仅体现在卡牌图片 alt 属性中（如 alt="IG09-028 RH 卡名"）。
 *  解析策略：全部保留为 variants，主价格取有货有价条目中的最低价。
 */
export function parsePackHtml(html: string, packPrefix: string): Map<string, PackPriceResult> {
  // 第一步：收集每个编号下的全部条目
  const groups = new Map<string, PackPriceVariant[]>()
  // 以 <div class="col-md"> 作为每张卡的分隔（允许 div 与 class 之间换行）
  const cardBlocks = html.split(/<div\s+class="col-md">/g)
  for (const block of cardBlocks) {
    // 编号：<span class="d-block border border-dark ...">IG13-037</span>（允许换行）
    const serialM = block.match(/<span\s+class="d-block border border-dark[^"]*"[^>]*>\s*([A-Za-z0-9\-]+)\s*<\/span>/)
    if (!serialM) continue
    const serial = serialM[1].trim()
    // 罕贵度来源：卡牌图片 alt（含编号；收藏星标按钮的 alt="Star" 不含编号，自动排除）
    const altList = [...block.matchAll(/alt="([^"]*)"/g)].map(m => m[1])
    const cardAlt = altList.find(a => a.includes(serial)) ?? ''
    // alt 格式："IG09-028 RH 戦乗機士..."，编号后第一个 ASCII 词即罕贵度（含 R+ 这种带加号的）
    const rarityM = cardAlt.match(new RegExp(escapeRegExp(serial) + '\\s+([A-Za-z+]+)\\s'))
    const rarity = rarityM ? rarityM[1] : ''
    const nameJP = rarity
      ? cardAlt.slice(cardAlt.indexOf(rarity) + rarity.length).trim()
      : cardAlt.includes(serial) ? cardAlt.slice(cardAlt.indexOf(serial) + serial.length).trim() : ''
    // 价格：<strong class="d-block text-end "> 1,800 円 </strong>（允许换行）
    const priceM = block.match(/<strong\s+class="d-block text-end[^"]*"[^>]*>\s*([\d,]+)\s*円\s*<\/strong>/)
    const priceJPY = priceM ? parseInt(priceM[1].replace(/,/g, ''), 10) : -1
    // 库存：<label>在庫 : ◯</label>（◯=有货，×=售罄）或「在庫 : 3 点」（N点=限购有货）
    const stockM = block.match(/在庫\s*:\s*([◯×○●]|(\d+)\s*点)/)
    let inStock = true
    let stockNote = ''
    if (stockM) {
      if (stockM[2] != null) {
        inStock = true
        stockNote = `限购${stockM[2]}`
      } else {
        inStock = stockM[1] !== '×'
        stockNote = stockM[1] === '×' ? '缺货' : '有货'
      }
    }
    const list = groups.get(serial) ?? []
    list.push({ rarity, priceJPY, inStock, stockNote, nameJP })
    groups.set(serial, list)
  }
  // 第二步：聚合为 Map（主价格 = 有价条目中最低价）
  const map = new Map<string, PackPriceResult>()
  for (const [serial, list] of groups) {
    const priced = list.filter(v => v.priceJPY >= 0)
    const main = priced.length > 0
      ? priced.reduce((a, b) => (b.priceJPY < a.priceJPY ? b : a))
      : list[0]
    map.set(serial, { serial, priceJPY: main.priceJPY, inStock: main.inStock, variants: list })
  }
  return map
}

/** 转义正则特殊字符（serial 中的 - 等无碍，但保险起见） */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 从单卡详情页 HTML 解析价格（用于回退） */
export function parseCardHtml(html: string): { priceJPY: number; inStock: boolean } {
  // 价格格式可能多样，尝试多种匹配
  let m = html.match(/<strong[^>]*>\s*([\d,]+)\s*円\s*<\/strong>/)
  // 备选：price 类标签
  if (!m) m = html.match(/class="[^"]*price[^"]*"[^>]*>[\s\S]{0,50}?([\d,]+)\s*円/)
  if (!m) return { priceJPY: -1, inStock: false }
  const priceJPY = parseInt(m[1].replace(/,/g, ''), 10)
  return { priceJPY, inStock: html.includes('在庫') && !/在庫\s*:\s*×/.test(html) }
}

/**
 * 获取整包价格表（缓存 10 分钟）
 * @param packPrefix 大写包前缀，如 "B01" / "IG13"
 */
export async function getPackPrices(packPrefix: string): Promise<Map<string, PackPriceResult>> {
  const pack = normalizePackPrefix(packPrefix)
  const cached = packCache.get(pack)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.data

  try {
    const html = await httpGet(PACK_LIST_URL(pack))
    const parsed = parsePackHtml(html, pack)
    packCache.set(pack, { data: parsed, fetchedAt: Date.now() })
    return parsed
  } catch (e) {
    // 网络失败时返回旧缓存（若有）
    if (cached) return cached.data
    throw e
  }
}

/**
 * 查询单卡价格
 * 优先用整包列表页（一次缓存整包），失败则尝试单卡详情页
 */
export async function getCardPrice(card: {
  serial: string
  packPrefix?: string
  // 游游亭卡牌 ID（可选，未提供时尝试用列表页按 serial 匹配）
}): Promise<CardPrice> {
  const cacheKey = card.serial
  const cached = cardCache.get(cacheKey)
  if (cached && Date.now() - cached.updatedAt < CACHE_TTL) return cached

  // 1) 尝试整包列表页（大多数情况可命中）
  const pack = card.packPrefix ? normalizePackPrefix(card.packPrefix) : extractPackFromSerial(card.serial)
  if (pack) {
    try {
      const prices = await getPackPrices(pack)
      const hit = prices.get(card.serial)
      if (hit) {
        const price: CardPrice = {
          serial: card.serial,
          priceJPY: hit.priceJPY,
          inStock: hit.inStock,
          nameJP: '',
          updatedAt: Date.now(),
        }
        cardCache.set(cacheKey, price)
        return price
      }
    } catch {
      // 列表页失败，继续尝试单卡页
    }
  }

  // 2) 回退：单卡详情页（需要知道游游亭内部 cid）
  // 没有 cid 时无法直接访问单卡页，返回无价格
  const price: CardPrice = {
    serial: card.serial,
    priceJPY: -1,
    inStock: false,
    nameJP: '',
    updatedAt: Date.now(),
  }
  cardCache.set(cacheKey, price)
  return price
}

/**
 * 查询同编号不同罕贵度变体的价格列表
 * 两种存储形式均支持：
 *  A) 同 serial 多 block（如 IG09：span 编号相同，alt 标注 R/RH/SR/SRH/N/NH 等）
 *  B) 独立编号条目（如 B01-001NH、B01-001SRH 作为 Map 中单独 key）
 * 返回去重后的全部罕贵度条目，按价格升序排列。
 */
export async function getCardPriceVariants(
  baseSerial: string,
  packPrefix: string
): Promise<PackPriceVariant[]> {
  const pack = normalizePackPrefix(packPrefix)
  const prices = await getPackPrices(pack)

  // 从 baseSerial 去掉尾部罕贵度后缀，得到纯基础编号
  // 如 "IG09-028RH" → "IG09-028"，"B01-001" → "B01-001"
  const baseM = baseSerial.match(/^(.*?\d)([A-Za-z+]+)$/)
  const pureBase = baseM ? baseM[1] : baseSerial
  const candidates = [baseSerial, pureBase]

  const result: PackPriceVariant[] = []

  // A) 同编号内嵌变体（新解析结构：variants 字段）
  for (const cand of candidates) {
    const entry = prices.get(cand)
    if (entry?.variants) {
      result.push(...entry.variants)
    }
  }

  // B) 独立编号变体（如 B01-001NH 作为单独 key 存在）
  for (const cand of candidates) {
    const prefixRe = new RegExp('^' + escapeRegExp(cand) + '([A-Za-z+]+)$')
    for (const [serial, p] of prices) {
      if (candidates.includes(serial)) continue
      const m = serial.match(prefixRe)
      if (m) {
        result.push({
          rarity: m[1],
          priceJPY: p.priceJPY,
          inStock: p.inStock,
          stockNote: '',
          nameJP: '',
        })
      }
    }
  }

  // 去重（同罕贵度只保留一个）+ 价格升序
  const seen = new Set<string>()
  const deduped = result.filter(v => {
    const key = v.rarity || '通常'
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  deduped.sort((a, b) => a.priceJPY - b.priceJPY)
  return deduped
}

/** 人民币换算：日元 × 汇率（3算/4算/5算） */
export function yenToCny(jpy: number, rate: 0.03 | 0.04 | 0.05): number {
  return Math.round(jpy * rate)
}

/** 格式化价格显示（千分位） */
export function formatJPY(jpy: number): string {
  if (jpy < 0) return '—'
  return jpy.toLocaleString('en-US')
}