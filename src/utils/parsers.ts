import type { CardColor, CardType, CardIcon, Rarity } from '@/types/card'

// ============ Color mappings from website data ============
const COLOR_JP_MAP: Record<string, CardColor> = {
  '赤': 'red',
  '青': 'blue',
  '白': 'white',
  '黒': 'black',
  '緑': 'green',
  '無': 'colorless',
}

const COLOR_EN_MAP: Record<string, CardColor> = {
  'Red': 'red',
  'Blue': 'blue',
  'White': 'white',
  'Black': 'black',
  'Green': 'green',
  'Colorless': 'colorless',
}

export function parseColor(raw: string | string[]): CardColor[] {
  if (!raw) return ['colorless']
  if (typeof raw === 'string') {
    const color = COLOR_JP_MAP[raw] ?? COLOR_EN_MAP[raw] ?? 'colorless'
    return [color]
  }
  return raw.map(c => COLOR_JP_MAP[c] ?? COLOR_EN_MAP[c] ?? 'colorless')
}

// ============ Type mappings from website data ============
const TYPE_MAP: Record<string, CardType> = {
  'Z/X': 'Z/X',
  'Event': 'Event',
  'Ascension': 'Ascension',
  'Player': 'Player',
  'Z/X Extra': 'Z/X Extra',
  'Z/X Over Boost': 'Z/X Over Boost',
  'Shift': 'Shift',
  'Event Extra': 'Event Extra',
  'Player Extra': 'Player Extra',
  'Ascension Extra': 'Ascension Extra',
  'Link': 'Link',
  'Token': 'Token',
  // 中文类型名（数据源中出现的）
  '事件': 'Event',
  '升格': 'Ascension',
  '玩家': 'Player',
  'Z/X EX': 'Z/X Extra',
  '剑临': 'Shift',
  '事件EX': 'Event Extra',
  '升格EX': 'Ascension Extra',
  '标记': 'Token',
}

// Japanese type names that might appear in data
const TYPE_JP_MAP: Record<string, CardType> = {
  'ゼクス': 'Z/X',
  'イベント': 'Event',
  'アセンション': 'Ascension',
  'プレイヤー': 'Player',
  'ゼクス エクストラ': 'Z/X Extra',
  'ゼクス オーバーブースト': 'Z/X Over Boost',
  'シフト': 'Shift',
  'イベント エクストラ': 'Event Extra',
  'プレイヤー エクストラ': 'Player Extra',
  'アセンション エクストラ': 'Ascension Extra',
}

export function parseType(raw: string): CardType {
  return TYPE_MAP[raw] ?? TYPE_JP_MAP[raw] ?? 'Z/X'
}

// ============ Icon/Marker mappings ============
const ICON_MAP: Record<string, CardIcon> = {
  '起始卡': 'starting',
  '起始资源': 'starting_resource',
  '门扉卡': 'door',
  '虚空使者': 'void_bringer',
  '生命恢复': 'life_recovery',
  '射程': 'range',
  '绝界': 'isolated',
  '超限驱动': 'overdrive',
  'IGOB': 'igob',
  '破天降临': 'break',
  '进化原力': 'evol_seed',
  '零点优化': 'zero_optima',
  '点燃': 'ignition',
  '觉醒条件': 'awakening',
  '降临条件': 'descent',
  // Japanese variants
  'イグニッション': 'ignition',
  'ライフリカバリー': 'life_recovery',
  'ヴォイドブリンガー': 'void_bringer',
  'オーバードライブ': 'overdrive',
  'ブレイク': 'break',
  'シフト': 'range', // Note: シフト in icon context means Shift icon, but here mapped to range for website compatibility
  'レンジ': 'range',
  'イゾレート': 'isolated',
  'エボルシード': 'evol_seed',
  'ゼロオプティマ': 'zero_optima',
  'ディセンド': 'descent',
  'ウェイク': 'awakening',
}

export function parseIcons(raw: string | string[]): CardIcon[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    const icon = ICON_MAP[raw]
    return icon ? [icon] : []
  }
  return raw.map(i => ICON_MAP[i]).filter((i): i is CardIcon => i != null)
}

// ============ Rarity parser ============
const RARITY_MAP: Record<string, Rarity> = {
  'C': 'C',
  'U': 'U',
  'R': 'R',
  'SR': 'SR',
  'XR': 'XR',
  'RR': 'RR',
  'PR': 'PR',
  'CC': 'CC',
  'CU': 'CU',
  'CR': 'CR',
  'CSR': 'CSR',
  'CXR': 'CXR',
  'P': 'P',
  'S': 'S',
  'H': 'H',
}

export function parseRarity(raw: string): Rarity {
  return RARITY_MAP[raw] ?? 'C'
}

// ============ Image URL builder ============
export function getCardImageUrl(packPrefix: string, serial: string): string {
  // CDN pattern from website analysis
  return `http://zximg-cdn.yimieji.com/card/${packPrefix}/${serial}.png`
}
