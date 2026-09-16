// Z/X Card Game - Core Type Definitions
// Based on zxcard.yimieji.com data structure + game rules

// ============ Card Colors ============
export type CardColor =
  | 'red'
  | 'blue'
  | 'white'
  | 'black'
  | 'green'
  | 'colorless'

export const COLOR_MAP: Record<string, CardColor> = {
  '红': 'red',
  '蓝': 'blue',
  '白': 'white',
  '黑': 'black',
  '绿': 'green',
  '无': 'colorless',
}

export const COLOR_LABELS: Record<CardColor, string> = {
  red: '赤',
  blue: '青',
  white: '白',
  black: '黒',
  green: '緑',
  colorless: '無',
}

export const COLOR_HEX: Record<CardColor, string> = {
  red: '#E74C3C',
  blue: '#3498DB',
  white: '#ECF0F1',
  black: '#2C3E50',
  green: '#27AE60',
  colorless: '#95A5A6',
}

// ============ Card Types ============
export type CardType =
  | 'Z/X'           // Z/X卡
  | 'Event'         // 事件卡
  | 'Ascension'     // 升格卡
  | 'Player'        // 玩家卡
  | 'Z/X Extra'     // Z/X额外
  | 'Z/X Over Boost' // 超限助燃
  | 'Shift'         // 剑临
  | 'Event Extra'   // 事件额外
  | 'Player Extra'  // 玩家额外
  | 'Ascension Extra' // 升格额外
  | 'Link'          // 链结
  | 'Token'         // 标记

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  'Z/X': 'Z/X',
  'Event': '事件',
  'Ascension': '升格',
  'Player': '玩家',
  'Z/X Extra': 'Z/X额外',
  'Z/X Over Boost': '超限助燃',
  'Shift': '剑临',
  'Event Extra': '事件额外',
  'Player Extra': '玩家额外',
  'Ascension Extra': '升格额外',
  'Link': '链结',
  'Token': '标记',
}

// 判断卡牌类型是否为 Z/X 系（含 Z/X、Z/X Extra、Z/X Over Boost）
export function isZxType(type: CardType): boolean {
  return type === 'Z/X' || type === 'Z/X Extra' || type === 'Z/X Over Boost'
}

// 获取卡牌类型显示标签（门扉卡特殊处理）
// Event/Event Extra 类型且含 door 图标的卡显示为"门扉卡"
// Z/X 和 Ascension 类型的门扉卡保持原类型显示（它们需正常登场）
export function getCardTypeLabel(card: { type: CardType; icons?: CardIcon[] }): string {
  if (card.icons && card.icons.includes('door') && (card.type === 'Event' || card.type === 'Event Extra')) {
    return '门扉卡'
  }
  return CARD_TYPE_LABELS[card.type]
}

// Type sort order for deck sorting (ZX first, Event second, Ascension third, etc.)
export const TYPE_SORT_ORDER: Record<CardType, number> = {
  'Z/X': 0,
  'Event': 1,
  'Ascension': 2,
  'Player': 3,
  'Z/X Extra': 4,
  'Z/X Over Boost': 5,
  'Shift': 6,
  'Event Extra': 7,
  'Player Extra': 8,
  'Ascension Extra': 9,
  'Link': 10,
  'Token': 11,
}

// Types that are "额外" (Extra type cards) - for filter grouping
export const EXTRA_TYPE_CARDS: CardType[] = [
  'Z/X Extra', 'Event Extra', 'Player Extra', 'Ascension Extra',
]

// Types that belong in the 额外卡组 (Extra Deck zone) - for deck building
// 额外卡组类型 + 超限驱动 + 剑临 都放入额外卡组
// 注意：Player Extra 归入玩家卡(otherDeck)而非额外卡组
export const EXTRA_DECK_TYPES: CardType[] = [
  'Z/X Extra', 'Z/X Over Boost', 'Shift',
  'Event Extra', 'Ascension Extra',
]

// Types that belong in the 其他区域 (Player/Link cards)
// Player Extra 归入玩家卡区域
export const OTHER_DECK_TYPES: CardType[] = ['Player', 'Player Extra', 'Link', 'Token']

// BUG1-fix: 判断卡牌类型是否为玩家卡（Player 或 Player Extra）
// Player Extra（大危机卡）在玩家方阵上时应与 Player 同等对待
export function isPlayerType(type: CardType): boolean {
  return type === 'Player' || type === 'Player Extra'
}

// Determine which deck zone a card type belongs to
export function getDeckZone(type: CardType): 'main' | 'extra' | 'other' {
  if (OTHER_DECK_TYPES.includes(type)) return 'other'
  if (EXTRA_DECK_TYPES.includes(type)) return 'extra'
  return 'main'
}

// ============ Card Icons/Markers ============
export type CardIcon =
  | 'starting'      // 起始卡
  | 'starting_resource' // 起始资源
  | 'door'          // 门扉卡
  | 'void_bringer'  // 虚空使者
  | 'life_recovery' // 生命恢复
  | 'range'         // 射程
  | 'isolated'      // 绝界
  | 'overdrive'     // 超限驱动
  | 'igob'          // IGOB
  | 'break'         // 破天降临
  | 'evol_seed'     // 进化原力
  | 'zero_optima'   // 零点优化
  | 'ignition'      // 点燃
  | 'awakening'     // 觉醒条件
  | 'descent'       // 降临条件
  | 'creation'      // 创成
  | 'extension'     // 延伸驱动

export const ICON_LABELS: Record<CardIcon, string> = {
  starting: '起始卡',
  starting_resource: '起始资源',
  door: '门扉卡',
  void_bringer: '虚空使者',
  life_recovery: '生命恢复',
  range: '射程',
  isolated: '绝界',
  overdrive: '超限驱动',
  igob: 'IGOB',
  break: '破天降临',
  evol_seed: '进化原力',
  zero_optima: '零点优化',
  ignition: '点燃',
  awakening: '觉醒条件',
  descent: '降临条件',
  creation: '创成',
  extension: '延伸驱动',
}

// ============ Rarity ============
// DB has 40+ rarity values; use string for flexibility
export type Rarity = string

// ============ Card Race ============
export type CardRace = string // Many races in Z/X, use string for flexibility

// ============ Card Data Model ============
export interface ZxCard {
  id: number           // Auto-increment primary key
  cardId: string       // Original card_id from website
  packPrefix: string   // e.g. "B01", "E01"
  serial: string       // e.g. "B01-001"
  color: CardColor     // Primary color
  colors: CardColor[]  // All colors (multi-color cards)
  japaneseName: string  // Japanese name
  chineseName: string   // Chinese name (simplified)
  rarity: Rarity
  type: CardType
  race: CardRace       // Race/species
  cost: number         // Play cost
  power: number        // Power value (-1 if N/A)
  shield: number       // Shield value (-1 if N/A)
  icons: CardIcon[]    // Card icons/markers
  effect: string       // Ability/effect text
  flavorText: string   // Flavor text
  illustrator: string  // Illustrator name
  popularName: string  // Nickname
  version: number      // Card version count
  relatedCards: string[] // Related card serials
  tags: string[]       // 站点标签（封神指定/传说指定等）
  imageUrl: string     // Card image URL
  altSerials?: string[] // Other serials of the same card (merged duplicates)
}

// ============ Deck Building Types ============
export interface DeckEntry {
  serial: string       // Card serial (e.g. "B01-001")
  count: number        // Number of copies
  card?: ZxCard        // Resolved card data (lazy loaded)
}

// 游戏准备卡标记（起始卡/门扉卡/起始资源）
// 在牌组组建时标记，对战开始时读取：1张直接置入，多张提供选择
export interface DeckSetup {
  startCards: string[]      // 起始卡候选 serial（具有 starting 图标）
  gateCards: string[]       // 门扉卡候选 serial（具有 door 图标）
  startResources: string[]  // 起始资源候选 serial（具有 starting_resource 图标）
}

export const EMPTY_DECK_SETUP: DeckSetup = {
  startCards: [],
  gateCards: [],
  startResources: [],
}

export interface Deck {
  id: string
  name: string
  description: string
  mainDeck: DeckEntry[]   // Main deck cards
  extraDeck: DeckEntry[]  // Extra deck cards (Z/X Extra, Z/X Over Boost, Shift, etc.)
  otherDeck: DeckEntry[]  // Other zone cards (Player, Link, Token)
  setup?: DeckSetup       // 游戏准备卡标记（起始卡/门扉卡/起始资源）
  createdAt: number
  updatedAt: number
}

// Deck validation rules
export const DECK_RULES = {
  MAIN_DECK_MIN: 50,
  MAIN_DECK_EXACT: 50,   // Must be exactly 50
  EXTRA_DECK_MAX: 16,
  OTHER_DECK_MAX: 10,    // Other zone (Player/Link cards)
  LINK_DECK_MAX: 10,     // Link cards limit within other zone
  SAME_CARD_MAX: 4,      // Max 4 copies of same name
  IGNITION_MIN: 20,      // Min 20 点燃 cards in main deck
  LIFE_RECOVERY_MAX: 4,  // Max 4 生命恢复 cards
  VOID_BRINGER_MAX: 4,   // Max 4 虚空使者 cards
  OVERDRIVE_MAX: 4,      // Max 4 超限驱动 cards
} as const

// 解析卡牌效果中的构筑张数限制
// 返回 null 表示无特殊限制（使用默认4张），数字表示最大可投入张数
export function getDeckLimit(card: ZxCard): number | null {
  const effect = card.effect
  if (!effect) return null

  // 模式1: "在卡组中加入最多N张" / "卡组中加入最多N张" / "神域区加入最多N张"
  // 覆盖: "这张卡可以在卡组中加入最多30张"、"同名卡可以在卡组中加入最多20张"
  //       "与原本卡名《同名》的卡...在卡组中加入最多N张"、"合计...在卡组中加入最多N张"
  //       "构筑你的神域区之际，这张卡可以在神域区加入最多16张"
  let m = effect.match(/(?:卡组|神域区)[^。]*?加入最多(\d+)张/)
  if (m) return parseInt(m[1])

  // 模式2: "只能在卡组中加入最多N张"
  m = effect.match(/只能在卡组中加入最多(\d+)张/)
  if (m) return parseInt(m[1])

  return null
}

// ============ 卡牌标签（官方赛事限制） ============
// 封神指定 = 禁止放入卡组（禁卡）
// 传说指定 = 每卡组合计限 1 张
export const TAG_FENGSHEN = '封神指定'
export const TAG_CHUANSHUO = '传说指定'
export const CHUANSHUO_LIMIT = 1

// 卡牌是否为封神指定（禁止入组）
export function isBannedCard(card: ZxCard): boolean {
  return card.tags?.includes(TAG_FENGSHEN) ?? false
}

// 卡牌是否为传说指定（限 1 张）
export function isLimitedCard(card: ZxCard): boolean {
  return card.tags?.includes(TAG_CHUANSHUO) ?? false
}

// ============ Deck Validation Result ============
export interface DeckValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    mainDeckCount: number
    extraDeckCount: number
    otherDeckCount: number
    ignitionCount: number
    nonIgnitionCount: number
    lifeRecoveryCount: number
    voidBringerCount: number
    overdriveCount: number
    colorDistribution: Record<CardColor, number>
  }
}

// ============ Search/Filter Types ============
export type SortOption =
  | 'newest'      // 最新卡包 (default)
  | 'serial'      // 按编号
  | 'cost-asc'    // 费用升序
  | 'cost-desc'   // 费用降序
  | 'power-asc'   // 力量升序
  | 'power-desc'  // 力量降序
  | 'name'        // 按名称

export const SORT_LABELS: Record<SortOption, string> = {
  newest: '最新',
  serial: '编号',
  'cost-asc': '费用 ↑',
  'cost-desc': '费用 ↓',
  'power-asc': '力量 ↑',
  'power-desc': '力量 ↓',
  name: '名称',
}

export interface CardFilter {
  keyword: string
  color: CardColor | null
  multiColorOnly: boolean          // 仅显示多色卡
  types: CardType[]      // Empty array = all types
  race: string | null
  rarity: Rarity | null
  costMin: number | null
  costMax: number | null
  powerMin: number | null
  powerMax: number | null
  icons: CardIcon[]
  pack: string | null
  sort: SortOption
}

export const DEFAULT_FILTER: CardFilter = {
  keyword: '',
  color: null,
  multiColorOnly: false,
  types: [],
  race: null,
  rarity: null,
  costMin: null,
  costMax: null,
  powerMin: null,
  powerMax: null,
  icons: [],
  pack: null,
  sort: 'newest',
}

// ============ Game Zone Types ============
export type GameZone =
  | 'square'      // 方格 (3x3)
  | 'deck'        // 牌组
  | 'trash'       // 废弃区
  | 'charge'      // 充能区
  | 'life'        // 生命区
  | 'resource'    // 资源区
  | 'hand'        // 手牌
  | 'temporary'   // 临时区
  | 'remove'      // 除外区
  | 'force'       // 原力区
  | 'dunamis'     // 杜纳米斯 (额外卡组)

// ============ Battle Phase Types ============
export type TurnPhase =
  | 'reboot'      // 重置阶段
  | 'draw'        // 抽牌阶段
  | 'resource'    // 资源阶段
  | 'ignition'    // 点燃阶段
  | 'main'        // 主阶段
  | 'end'         // 结束阶段

export const PHASE_LABELS: Record<TurnPhase, string> = {
  reboot: '重启阶段',
  draw: '抽牌阶段',
  resource: '资源阶段',
  ignition: '点燃阶段',
  main: '主阶段',
  end: '结束阶段',
}

// ============ Square Position ============
export interface SquarePosition {
  row: 0 | 1 | 2   // 3 rows
  col: 0 | 1 | 2   // 3 columns
}

// Player index on square
export type PlayerSide = 'player1' | 'player2' | 'neutral'

export interface SquareState {
  position: SquarePosition
  card: ZxCard | null
  isRebooted: boolean   // 是否重置状态
  damage: number         // 累计伤害
  owner: PlayerSide
}
