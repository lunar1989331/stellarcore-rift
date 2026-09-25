// 戰鬥畫面共用視覺常數
// 依 UI_SPEC_v1.0_for_ClaudeCode.md §0／§5-3／§11-2

import type { CoreAttr } from '../../data/types'

/** 六大星核屬性＋中性／融合型的代表色（屬性圖示列、技能按鈕光邊用） */
export const ATTR_COLORS: Record<CoreAttr, string> = {
  holy: '#ffe9a8',
  abyss: '#9b6bff',
  lava: '#ff6a3d',
  frost: '#7fe0ff',
  thunder: '#ffe14f',
  void: '#8a6bff',
  wind: '#7be0a8',
  ocean: '#4fb8ff',
  earth: '#c99a5a',
  fusion: '#e8ecf5',
}

export type StatusKey =
  | 'burn'
  | 'frost'
  | 'lock'
  | 'haste'
  | 'slow'
  | 'shield'
  | 'lifesteal'
  | 'corrode'

export const STATUS_ICON: Record<StatusKey, { icon: string; color: string; label: string }> = {
  burn: { icon: '🔥', color: '#ff7a45', label: '灼燒' },
  frost: { icon: '❄️', color: '#7fe0ff', label: '凍結' },
  lock: { icon: '🔒', color: '#9aa1b2', label: '技能封鎖' },
  haste: { icon: '⚡', color: '#ffe14f', label: '加速' },
  slow: { icon: '🐢', color: '#8fa4c9', label: '減速' },
  shield: { icon: '🛡️', color: '#ffd76a', label: '護盾' },
  lifesteal: { icon: '🩸', color: '#ff4f6d', label: '吸血' },
  corrode: { icon: '⭐↓', color: '#a874e8', label: '星核侵蝕' },
}

/** HP 條顏色（玩家反饋規格 v1.0 項目 A）：66% 以上翠綠 → 33–65% 琥珀黃 → 1–32% 危險紅。
 * 0% 由 UnitCard 的 KO 演出（項目 D）接手，這裡不用另外處理。 */
export function hpBarColor(pct: number): string {
  if (pct >= 0.66) return '#4ade80'
  if (pct >= 0.33) return '#facc15'
  return '#f87171'
}

export type FloatingKind = 'damage' | 'crit' | 'heal' | 'shield' | 'sp'

// 玩家反饋規格（2026-09-25 傷害數字顏色/格式修正）：damage／crit／heal／shield／sp 的實際
// 顏色與版面交給 CSS class 決定（見 FloatingNumber.module.css），這裡的 color／textShadow
// 欄位保留給 FloatingNumber.tsx 沒用到 class 分支時的備用讀取（目前五種 kind 都已經有各自
// 的 class，這兩欄實質上不再被讀取，留著只是不想為了拿掉兩個欄位再拆一個型別）；
// scale／direction 兩種仍然都在用（動畫幅度／方向）。
export const FLOATING_STYLE: Record<
  FloatingKind,
  { color: string; textShadow: string; scale: number; direction: 1 | -1 }
> = {
  damage: { color: '#FF4444', textShadow: 'none', scale: 1, direction: -1 },
  crit: {
    color: '#FFD700',
    textShadow: '0 0 8px #ffffff',
    scale: 1.3,
    direction: -1,
  },
  heal: { color: '#44FF88', textShadow: 'none', scale: 1, direction: -1 },
  shield: { color: '#88CCFF', textShadow: 'none', scale: 1, direction: -1 },
  sp: { color: '#AA66FF', textShadow: 'none', scale: 0.85, direction: 1 },
}

/**
 * 橫式卡片改版規格書 v1.0 · D-2：卡片第二行的「戰鬥類型」標籤。
 *
 * 規格書給了兩種做法（依數值自動判斷 / 在 knights.ts 為每位騎士新增 combatType 欄位手動指定），
 * 這裡採用自動判斷——21 位騎士的六維數值本來就都定好了（Session 1～3 平衡驗證過），不需要為了
 * 一個顯示用標籤再開一個要手動維護、跟數值可能對不上的欄位。
 *
 * ⚠️ 判讀：規格書的門檻（atk>=80／def>=80／spd>=85）彼此不互斥，例如索倫·星滅 atk98 def90
 * 同時符合攻擊型與防禦型。這裡依規格書表格由上到下的順序判定（攻擊→防禦→速度→均衡），
 * 也就是「攻擊優先」。如果 Mina 要的是別的優先序（例如取相對最突出的那一項），改這個函式即可。
 */
export type CombatType = 'attack' | 'defense' | 'speed' | 'balanced'

export const COMBAT_TYPE_LABEL: Record<CombatType, { icon: string; label: string }> = {
  attack: { icon: '⚔', label: '攻擊型' },
  defense: { icon: '🛡', label: '防禦型' },
  speed: { icon: '⚡', label: '速度型' },
  balanced: { icon: '★', label: '均衡型' },
}

export function combatTypeOf(knight: { atk: number; def: number; spd: number }): CombatType {
  if (knight.atk >= 80) return 'attack'
  if (knight.def >= 80) return 'defense'
  if (knight.spd >= 85) return 'speed'
  return 'balanced'
}
