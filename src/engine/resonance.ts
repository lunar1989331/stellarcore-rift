// 陣容共鳴陣
// CLAUDE.md「陣容共鳴陣」＋ Mina v2.0：加入遞減制 decaySchedule。

import type { Faction, Knight } from '../data/types'

export interface ResonanceEffects {
  hpMult?: number
  healMult?: number
  atkMult?: number
  spdMult?: number
  starcoreMult?: number
  defIgnore?: number
  spCapDelta?: number
  spRegenDelta?: number
  firstStrikeBonus?: number
  immuneUltimateOnce?: boolean
  freezeMeltExplosion?: boolean
  storyOnly?: boolean
}

export interface Resonance {
  id: string
  name: string
  description: string
  matches: (team: readonly Knight[]) => boolean
  effects: ResonanceEffects
}

const has = (team: readonly Knight[], id: string) => team.some((k) => k.id === id)
const countFaction = (team: readonly Knight[], f: Faction) =>
  team.filter((k) => k.faction === f).length

/**
 * v2.0 共鳴陣遞減制：第 1 回合全效，第 2 回 75%，第 3 回 50%，第 4 回起 25% 維持。
 * battle.ts 用 resonanceDecayFactor(turn) 乘在「倍率的加成部分」上：
 *   effectiveMult = 1 + (mult - 1) × factor
 */
export const RESONANCE_DECAY: readonly number[] = [1.0, 0.75, 0.5, 0.25]

export function resonanceDecayFactor(turn: number): number {
  const idx = Math.min(Math.max(turn - 1, 0), RESONANCE_DECAY.length - 1)
  return RESONANCE_DECAY[idx]
}

export const RESONANCES: readonly Resonance[] = [
  {
    id: 'holy-guard',
    name: '聖光守護陣',
    description: '3 名守護騎士：HP +20%、治癒 +30%',
    matches: (team) => countFaction(team, 'guardian') >= 3,
    effects: { hpMult: 1.2, healMult: 1.3 },
  },
  {
    id: 'chaos-scorched',
    name: '混沌焦土陣',
    description: '3 名渾沌騎士：攻 +20%、無視防禦 15%',
    matches: (team) => countFaction(team, 'chaos') >= 3,
    effects: { atkMult: 1.2, defIgnore: 0.15 },
  },
  {
    id: 'third-path',
    name: '第三道路陣',
    description: '銀翼 + 澤菲爾 + 艾索：星核力 +25%、SP 上限 +1',
    matches: (team) => has(team, 'silver-wing') && has(team, 'zephyr') && has(team, 'aiso'),
    effects: { starcoreMult: 1.25, spCapDelta: 1 },
  },
  {
    id: 'moon-mirror',
    name: '月光對鏡陣',
    description: '賽蓮娜 + 艾克隆：速 +20%、先手 +40%',
    matches: (team) => has(team, 'selena') && has(team, 'eclron'),
    effects: { spdMult: 1.2, firstStrikeBonus: 0.4 },
  },
  {
    id: 'core-hunter',
    name: '源核獵人陣',
    description: '奧瑟里斯 + 索倫：攻 +30%、SP −1（劇情限定）',
    matches: (team) => has(team, 'osirath') && has(team, 'solren'),
    effects: { atkMult: 1.3, spRegenDelta: -1, storyOnly: true },
  },
  {
    id: 'ice-fire-fission',
    name: '冰火裂變陣',
    description: '佛雷爾 + 伊格尼斯：攻 +15%、凍融爆炸',
    matches: (team) => has(team, 'frael') && has(team, 'ignis'),
    effects: { atkMult: 1.15, freezeMeltExplosion: true },
  },
  {
    id: 'forbidden-guard',
    name: '禁區守護陣',
    description: '澤菲爾 + 銀翼：免疫一次必殺',
    matches: (team) => has(team, 'zephyr') && has(team, 'silver-wing'),
    effects: { immuneUltimateOnce: true },
  },
  // ⚠️ 坐騎合體（葛拉托斯+血牙／佛雷爾+凜牙）不再放在這裡：Mina v2 Q12 把坐騎定義成
  // 「附掛在單一騎士身上的強化模組」，跟其他隊友是誰無關，不是隊伍共鳴陣。
  // 實際的坐騎加成（攻擊加成 / 技能升級 / HP）已經在 engine/battle.ts 的
  // mergeMountSkills() + makeCombatant() 依 knight.mount 直接套用，不透過這裡的 matches()。
]

export interface ActiveResonance {
  resonance: Resonance
  effects: ResonanceEffects
}

export function getActiveResonances(
  team: readonly Knight[],
  allowStoryOnly = false,
): ActiveResonance[] {
  return RESONANCES.filter((r) => r.matches(team))
    .filter((r) => allowStoryOnly || !r.effects.storyOnly)
    .map((r) => ({ resonance: r, effects: r.effects }))
}

export function mergeResonanceEffects(active: readonly ActiveResonance[]): ResonanceEffects {
  const out: ResonanceEffects = {}
  const mul = (a: number | undefined, b: number | undefined) => (a ?? 1) * (b ?? 1)
  const add = (a: number | undefined, b: number | undefined) => (a ?? 0) + (b ?? 0)
  for (const { effects: e } of active) {
    out.hpMult = mul(out.hpMult, e.hpMult)
    out.healMult = mul(out.healMult, e.healMult)
    out.atkMult = mul(out.atkMult, e.atkMult)
    out.spdMult = mul(out.spdMult, e.spdMult)
    out.starcoreMult = mul(out.starcoreMult, e.starcoreMult)
    out.defIgnore = add(out.defIgnore, e.defIgnore)
    out.spCapDelta = add(out.spCapDelta, e.spCapDelta)
    out.spRegenDelta = add(out.spRegenDelta, e.spRegenDelta)
    out.firstStrikeBonus = add(out.firstStrikeBonus, e.firstStrikeBonus)
    out.immuneUltimateOnce = out.immuneUltimateOnce || e.immuneUltimateOnce
    out.freezeMeltExplosion = out.freezeMeltExplosion || e.freezeMeltExplosion
  }
  return out
}
