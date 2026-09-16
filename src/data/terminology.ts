// Z/X Terminology Mapping
// Corrected Chinese translations based on user specifications
// MUST be used consistently throughout the app

export const TERMINOLOGY: Record<string, string> = {
  // Core mechanics - CORRECTED terms (user-mandated)
  Ascension: '升格',          // NOT 升华
  'Life Recovery': '生命恢复',  // NOT 生命回复 or other variants
  'Void Bringer': '虚空使者',  // NOT 虚空带来者 or other variants
  Shift: '剑',                // NOT 转换 or other variants
  Ignition: '点燃',           // NOT 点火 or other variants
  Overdrive: '超限驱动',       // NOT 过载 or other variants

  // Card types
  'Z/X': 'Z/X',
  Event: '事件',
  Player: '玩家',

  // Card type extensions
  'Z/X Extra': 'Z/X延伸驱动',
  'Z/X Over Boost': '超限助燃',
  'Event Extra': '事件延伸驱动',
  'Player Extra': '玩家延伸驱动',
  'Ascension Extra': '升格延伸驱动',

  // Game zones
  Square: '方格',
  Deck: '牌组',
  Trash: '废弃区',
  Charge: '充能区',
  Life: '生命区',
  Resource: '资源区',
  Hand: '手牌',
  Temporary: '临时区',
  Remove: '除外区',
  Force: '原力区',
  Dunamis: '杜纳米斯',

  // Turn phases
  'Reboot Phase': '重置阶段',
  'Draw Phase': '抽牌阶段',
  'Resource Phase': '资源阶段',
  'Ignition Phase': '点燃阶段',
  'Main Phase': '主阶段',
  'End Phase': '结束阶段',

  // Combat
  'Battle Declaration': '战斗宣言',
  'Battle Event': '战斗事件',
  'Battle Damage': '战斗伤害',
  'Battle End': '战斗结束',
  Attack: '攻击',
  Power: '力量',
  Shield: '护盾',

  // Card icons/markers
  'Starting Card': '起始卡',
  'Starting Resource': '起始资源',
  'Door Card': '门扉卡',
  Range: '射程',
  Isolated: '绝界',
  IGOB: 'IGOB',
  Break: '破天降临',
  'Evol Seed': '进化原力',
  'Zero Optima': '零点优化',
  Awakening: '觉醒条件',
  Descent: '降临条件',
  Unison: '共鸣',

  // Ability types
  'Startup Ability': '启动能力',
  'Auto Ability': '自动能力',
  'Constant Ability': '常在能力',
  'Special Ability': '特殊能力',

  // Colors
  Red: '赤',
  Blue: '青',
  White: '白',
  Black: '黒',
  Green: '緑',
  Colorless: '無',

  // Other game terms
  Cost: '费用',
  Play: '出场',
  Reboot: '重置',
  Destroy: '破坏',
  'Rule Effect': '规则效果',
  Priority: '优先权',
  'Reload Effect': '重装效果',
  Crisis: '危机',
  Defeat: '败北',
}

// Reverse mapping: Chinese → English (for parsing)
export const TERMINOLOGY_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(TERMINOLOGY).map(([en, zh]) => [zh, en])
)

/**
 * Translate a term using the corrected terminology
 */
export function t(english: string): string {
  return TERMINOLOGY[english] ?? english
}

/**
 * Common phrases that need full replacement (not word-by-word)
 */
export const PHRASE_REPLACEMENTS: Record<string, string> = {
  '升华': '升格',
  '生命回复': '生命恢复',
  '虚空带来者': '虚空使者',
  '点火': '点燃',
  '过载': '超限驱动',
}

/**
 * Apply terminology corrections to a string (e.g., scraped card text)
 */
export function applyCorrections(text: string): string {
  let result = text
  for (const [wrong, correct] of Object.entries(PHRASE_REPLACEMENTS)) {
    result = result.replaceAll(wrong, correct)
  }
  return result
}
