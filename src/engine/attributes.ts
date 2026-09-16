// 六大星核屬性相剋
// Mina《MINA_ANSWERS.md》Q2 修正版：
//   聖光 → 冥界 → 冰霜 → 雷霆 → 熔岩 → 虛空 → 聖光（循環，剋制方 +35%，被剋方 -20%）
//   風／海洋／大地：中性，無弱點無特攻，multiplier 恆 1.0
//   融合型：無屬性弱點，不觸發相剋，multiplier 恆 1.0
// （取代 CLAUDE.md 舊版「聖光→冥界→熔岩→冰霜→雷霆→虛空」鏈順序，且新增「弱點 -20%」層級）
//
// 源核碎片持有者（奧瑟里斯 / 索倫，皆為 fusion）：不計入相剋計算（本來就是 fusion，恆 1.0）；
// 其「每持有 1 塊源核碎片，星核技能威力 +5%」的加成已直接算入 Q1 技能書的 power 數值中，
// 不另外建立加成系統（Mina 原文：「已包含在技能設計中」）。

import type { CoreAttr } from '../data/types'

/** 相剋循環：key 剋 value（造成 +35% 傷害，value 對 key 則 -20%） */
const COUNTER_CHAIN: Record<Exclude<CoreAttr, 'wind' | 'ocean' | 'earth' | 'fusion'>, Exclude<CoreAttr, 'wind' | 'ocean' | 'earth' | 'fusion'>> = {
  holy: 'abyss',
  abyss: 'frost',
  frost: 'thunder',
  thunder: 'lava',
  lava: 'void',
  void: 'holy',
}

const NEUTRAL: ReadonlySet<CoreAttr> = new Set(['wind', 'ocean', 'earth', 'fusion'])

export const ADVANTAGE_MULTIPLIER = 1.35
export const DISADVANTAGE_MULTIPLIER = 0.8
/** 中性 / 融合型對戰：無特攻無弱點 */
export const NEUTRAL_MULTIPLIER = 1.0

/**
 * 取得攻擊方對防守方的屬性傷害倍率。
 * - 任一方為中性屬性（wind/ocean/earth）或融合型：固定 1.0
 * - 攻方剋防守方：1.35
 * - 攻方被防守方剋（即防守方剋攻方）：0.8
 * - 其餘：1.0
 */
export function getAttrMultiplier(attacker: CoreAttr, defender: CoreAttr): number {
  if (NEUTRAL.has(attacker) || NEUTRAL.has(defender)) return NEUTRAL_MULTIPLIER
  const a = attacker as Exclude<CoreAttr, 'wind' | 'ocean' | 'earth' | 'fusion'>
  const d = defender as Exclude<CoreAttr, 'wind' | 'ocean' | 'earth' | 'fusion'>
  if (COUNTER_CHAIN[a] === d) return ADVANTAGE_MULTIPLIER
  if (COUNTER_CHAIN[d] === a) return DISADVANTAGE_MULTIPLIER
  return NEUTRAL_MULTIPLIER
}

export function counters(attacker: CoreAttr, defender: CoreAttr): boolean {
  if (NEUTRAL.has(attacker) || NEUTRAL.has(defender)) return false
  return COUNTER_CHAIN[attacker as Exclude<CoreAttr, 'wind' | 'ocean' | 'earth' | 'fusion'>] === defender
}

export const CORE_ATTR_CYCLE: readonly Exclude<CoreAttr, 'wind' | 'ocean' | 'earth' | 'fusion'>[] = [
  'holy',
  'abyss',
  'frost',
  'thunder',
  'lava',
  'void',
]
