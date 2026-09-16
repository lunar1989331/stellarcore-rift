// 狀態效果模型 + 純計算輔助函式
// battle.ts 負責產生 / 消耗這些狀態；本檔只做資料結構與加總。

export type StatusKind =
  | 'shield' // 減傷比例（含 teamShield / teamDmgReduce）
  | 'invincible' // 完全免傷
  | 'atkBoost' // 攻擊 ±（負值 = atkDown）
  | 'defBoost' // 防禦 ±（負值 = defDown）
  | 'spdBoost' // 速度 ±（負值 = spdDown）
  | 'starcoreBoost' // 星核 ±（通常負 = starcoreDown）
  | 'evade' // 迴避率
  | 'dot' // 每回合固定傷害
  | 'regen' // 每回合固定治癒
  | 'skip' // 無法行動（freeze / stun / airborne / chill / gravityBind / 過熱）
  | 'thorns' // 反傷比例
  | 'focusMark' // 被標記：來自 sourceUid 的傷害 +value
  | 'curse' // 詛咒：治療反轉為傷害
  | 'skillLock' // 技能限制
  | 'critBoost' // 暴擊率 +
  | 'empower' // 下次攻擊強化（viel 蝕光穿行）
  | 'exposed' // 曝光（aiso 星核術式解析 / seres 電磁感知網）：純資訊展示，不影響數值（Q13）
  | 'randomized' // 固定數值效果 ±variance（aiso 符文陣列·星域重寫，Q13）

export interface ActiveStatus {
  kind: StatusKind
  value: number
  /** 剩餘回合；Infinity = 戰鬥結束前持續 */
  turnsLeft: number
  label: string
  /** 掛上的回合（結算時跳過「本回合才掛上」的狀態，見 tickStatuses） */
  appliedTurn: number
  /** 延遲生效回合數（holka 過載 / war-boar 過熱） */
  delay?: number
  /** 施加者 uid（focusMark / dot 記錄用） */
  sourceUid?: string
  /** skip 為機率型時的每回合觸發率（chill） */
  chance?: number
  /** skillLock：只能用這些 id */
  allowOnly?: string[]
  /** skillLock：不能使用這些效果類型 */
  blocked?: string[]
  /** empower：本次強化的旗標 */
  mustHit?: boolean
  ignoreShield?: boolean
  /** dot 疊層次數（stackable dot，例：ignis 熔岩噴發） */
  stackCount?: number
  /**
   * 這個 skip 是不是「位移／擊退」造成的（stunSoft / stun），
   * 用來判斷 immuneToDisplace 要不要擋下它（Q13：只擋位移類，不擋 freeze/airborne/gravityBind/chill）。
   */
  displacement?: boolean
  /** randomized：±variance 的隨機浮動幅度 */
  variance?: number
  /** dot：治癒無法減免（v3 sunlion 神聖灼燒）—— healUnit 會扣掉這類 DoT 的每回合量 */
  unhealable?: boolean
  /** 清除類效果（cleanse）跳過此狀態（v3 manticore 腐毒） */
  uncleansable?: boolean
}

const isActive = (s: ActiveStatus) => (s.delay ?? 0) <= 0

/** 護盾 / 減傷：遞減疊加 1 − Π(1 − 各層) */
export function totalShield(statuses: readonly ActiveStatus[]): number {
  let remaining = 1
  for (const s of statuses) if (s.kind === 'shield' && isActive(s)) remaining *= 1 - s.value
  return 1 - remaining
}

export function hasInvincible(statuses: readonly ActiveStatus[]): boolean {
  return statuses.some((s) => s.kind === 'invincible' && isActive(s))
}

/** 迴避率取最高一層，再乘上壓制係數（seres reduceEnemyEvade） */
export function totalEvade(statuses: readonly ActiveStatus[], suppress = 0): number {
  let best = 0
  for (const s of statuses) if (s.kind === 'evade' && isActive(s) && s.value > best) best = s.value
  return Math.max(0, Math.min(1, best * (1 - suppress)))
}

/** 攻擊加成：線性相加（可為負） */
export function totalAtkBoost(statuses: readonly ActiveStatus[]): number {
  let sum = 0
  for (const s of statuses) if (s.kind === 'atkBoost' && isActive(s)) sum += s.value
  return sum
}

export function totalDefBoost(statuses: readonly ActiveStatus[]): number {
  let sum = 0
  for (const s of statuses) if (s.kind === 'defBoost' && isActive(s)) sum += s.value
  return sum
}

export function totalSpdBoost(statuses: readonly ActiveStatus[]): number {
  let sum = 0
  for (const s of statuses) if (s.kind === 'spdBoost' && isActive(s)) sum += s.value
  return sum
}

export function totalStarcoreBoost(statuses: readonly ActiveStatus[]): number {
  let sum = 0
  for (const s of statuses) if (s.kind === 'starcoreBoost' && isActive(s)) sum += s.value
  return sum
}

export function totalThorns(statuses: readonly ActiveStatus[]): number {
  let sum = 0
  for (const s of statuses) if (s.kind === 'thorns' && isActive(s)) sum += s.value
  return sum
}

export function totalCritBoost(statuses: readonly ActiveStatus[]): number {
  let sum = 0
  for (const s of statuses) if (s.kind === 'critBoost' && isActive(s)) sum += s.value
  return sum
}

/** 來自特定攻擊者 uid 的 focusMark 加成總和（sourceUid 未設 = 任意攻擊者皆吃） */
export function focusMarkBonus(statuses: readonly ActiveStatus[], attackerUid: string): number {
  let sum = 0
  for (const s of statuses) {
    if (s.kind !== 'focusMark' || !isActive(s)) continue
    if (!s.sourceUid || s.sourceUid === attackerUid) sum += s.value
  }
  return sum
}

export function isSkipped(statuses: readonly ActiveStatus[], roll: () => number): boolean {
  for (const s of statuses) {
    if (s.kind !== 'skip' || !isActive(s)) continue
    if (s.chance == null || roll() < s.chance) return true
  }
  return false
}

export function hasCurse(statuses: readonly ActiveStatus[]): boolean {
  return statuses.some((s) => s.kind === 'curse' && isActive(s))
}

/** 是否有任一負面狀態（aekron 暗月形態 dmgBoostVsDebuffed 判定用） */
export function hasAnyDebuff(statuses: readonly ActiveStatus[]): boolean {
  return statuses.some(
    (s) =>
      isActive(s) &&
      (s.kind === 'dot' ||
        s.kind === 'skip' ||
        s.kind === 'curse' ||
        s.kind === 'skillLock' ||
        ((s.kind === 'atkBoost' || s.kind === 'defBoost' || s.kind === 'spdBoost' || s.kind === 'starcoreBoost') &&
          s.value < 0)),
  )
}

/** randomized：取最大的浮動幅度（未套用則 0） */
export function randomizeVariance(statuses: readonly ActiveStatus[]): number {
  let best = 0
  for (const s of statuses) if (s.kind === 'randomized' && isActive(s) && (s.variance ?? 0) > best) best = s.variance ?? 0
  return best
}

/** 依 skillLock 過濾可用的技能 id */
export function allowedSkill(statuses: readonly ActiveStatus[], skillId: string): boolean {
  for (const s of statuses) {
    if (s.kind !== 'skillLock' || !isActive(s)) continue
    if (s.allowOnly && !s.allowOnly.includes(skillId)) return false
  }
  return true
}

/** 是否有封鎖某效果類型（magnos 血鏈：封 evade / stealth） */
export function effectBlocked(statuses: readonly ActiveStatus[], effectType: string): boolean {
  return statuses.some(
    (s) => s.kind === 'skillLock' && isActive(s) && (s.blocked?.includes(effectType) ?? false),
  )
}

export function takeEmpower(statuses: ActiveStatus[]): ActiveStatus | undefined {
  const idx = statuses.findIndex((s) => s.kind === 'empower' && isActive(s))
  if (idx < 0) return undefined
  const [e] = statuses.splice(idx, 1)
  return e
}

/**
 * 同 kind 同 label 的狀態「刷新」而非疊加（取較強、較久）。
 * 例外：dot 允許同時存在多條不同 label。
 */
export function applyStatus(list: ActiveStatus[], incoming: ActiveStatus): void {
  const existing = list.find((s) => s.kind === incoming.kind && s.label === incoming.label)
  if (existing) {
    existing.value = Math.abs(incoming.value) > Math.abs(existing.value) ? incoming.value : existing.value
    existing.turnsLeft = Math.max(existing.turnsLeft, incoming.turnsLeft)
    existing.appliedTurn = incoming.appliedTurn
    existing.delay = incoming.delay
    if (incoming.sourceUid) existing.sourceUid = incoming.sourceUid
    return
  }
  list.push({ ...incoming })
}

/** 移除所有增益（dispel）：正值的 atk/def/spd/shield/evade/critBoost/invincible/empower */
export function stripBuffs(list: ActiveStatus[]): number {
  const before = list.length
  const isBuff = (s: ActiveStatus) =>
    s.kind === 'invincible' ||
    s.kind === 'empower' ||
    s.kind === 'thorns' ||
    s.kind === 'critBoost' ||
    ((s.kind === 'atkBoost' || s.kind === 'defBoost' || s.kind === 'spdBoost') && s.value > 0) ||
    (s.kind === 'shield' && s.value > 0) ||
    (s.kind === 'evade' && s.value > 0)
  for (let i = list.length - 1; i >= 0; i--) if (isBuff(list[i])) list.splice(i, 1)
  return before - list.length
}

/** 移除一個增益（Q9：elixia 聖裁光柱「清除目標 1 個增益」） */
export function stripOneBuff(list: ActiveStatus[]): boolean {
  const isBuff = (s: ActiveStatus) =>
    s.kind === 'invincible' ||
    s.kind === 'empower' ||
    s.kind === 'thorns' ||
    s.kind === 'critBoost' ||
    ((s.kind === 'atkBoost' || s.kind === 'defBoost' || s.kind === 'spdBoost') && s.value > 0) ||
    (s.kind === 'shield' && s.value > 0) ||
    (s.kind === 'evade' && s.value > 0)
  const idx = list.findIndex(isBuff)
  if (idx < 0) return false
  list.splice(idx, 1)
  return true
}

/** 移除一個減益（cleanse oneDebuff） */
export function stripOneDebuff(list: ActiveStatus[]): boolean {
  const isDebuff = (s: ActiveStatus) =>
    !s.uncleansable &&
    (s.kind === 'dot' ||
    s.kind === 'skip' ||
    s.kind === 'curse' ||
    s.kind === 'skillLock' ||
    s.kind === 'focusMark' ||
    ((s.kind === 'atkBoost' || s.kind === 'defBoost' || s.kind === 'spdBoost' || s.kind === 'starcoreBoost') &&
      s.value < 0))
  const idx = list.findIndex(isDebuff)
  if (idx < 0) return false
  list.splice(idx, 1)
  return true
}

/** 治癒無法減免的 DoT 每回合總量（v3 sunlion 神聖灼燒） */
export function unhealableDotPerTick(statuses: readonly ActiveStatus[]): number {
  let sum = 0
  for (const s of statuses) if (s.kind === 'dot' && s.unhealable && isActive(s)) sum += s.value
  return sum
}

/**
 * 回合結束結算：回傳本回合 DoT 淨傷害（已扣 regen）與標籤。
 * 跳過本回合才掛上的狀態，讓 duration:N 實際涵蓋「之後的 N 回合」。
 */
export function tickStatuses(
  list: ActiveStatus[],
  currentTurn: number,
): { dotDamage: number; regenHeal: number; labels: string[] } {
  let dotDamage = 0
  let regenHeal = 0
  const labels: string[] = []
  for (const s of list) {
    if (s.appliedTurn === currentTurn || (s.delay ?? 0) > 0) continue
    if (s.kind === 'dot') {
      dotDamage += s.value
      labels.push(s.label)
    } else if (s.kind === 'regen') {
      regenHeal += s.value
    }
  }
  for (const s of list) {
    if (s.appliedTurn === currentTurn) continue
    if ((s.delay ?? 0) > 0) {
      s.delay = (s.delay ?? 0) - 1
      continue
    }
    if (s.turnsLeft !== Infinity) s.turnsLeft -= 1
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].turnsLeft <= 0) list.splice(i, 1)
  return { dotDamage, regenHeal, labels }
}
