// 星核裂紀 · 回合制戰鬥引擎
// 依 Mina《MINA_ANSWERS.md》Q1–Q9 ＋《MINA_ANSWERS_v2.md》Q11–Q15 全量導入：
//
//   - 3v3，速度排序行動；前排 1-2 人 + 後排 1 人，前排全滅後排自動補位（Q3）
//   - 非穿透單體技只能打敵方前排；後排只受 AoE / piercing 影響（Q3）
//   - 傷害公式：base × [200/(200+有效防禦)] × 屬性倍率 × (0.85~1.15 隨機) × focusMark（Q3）
//   - 屬性倍率：剋制 +35%、被剋 -20%、中性（風/海洋/大地）與融合型恆 1.0（Q2）
//   - SP：每人一池，每回合 +1，上限 5，普攻不額外回 SP（Q3 決策：per-unit）
//   - 20 回合上限，超過依剩餘 HP% 判勝
//   - 共鳴陣：遞減制 [1.0, 0.75, 0.50, 0.25]
//   - 必殺技定義：cost >= 3 的主動技（Q7，見 data/skills.ts 的 isUltimate），
//     傷害隨施術者星核力浮動（Q14 ultimateDmgBonus）
//   - HP = def × 100；DAMAGE_SCALE = 30（Q8 → v2 Q15 方案 a 從 3.0 調整）
//   - dot / selfDot 的 value 是 DOT_FORMULA 技能係數（攻擊者 atk 為底，v2 Q15，取代 v1 Q9 的 %maxHp 版本）
//   - 治癒（selfHeal / teamHeal / regen）隨施術者星核力浮動（Q14 healBonus）
//   - 坐騎（Q12）：附掛在單一騎士身上的強化模組，不佔隊伍名額、不獨立行動，
//     見 mergeMountSkills() —— 合體後把坐騎主動技併入騎士技能池、被動技併入騎士被動，
//     合體共鳴直接把對應技能換成 UPGRADE_SKILLS 的升級技
//   - 冷卻系統：skill.cooldown
//
// ⚠️ 部分效果仍為 stub / Claude Code 推定實作 —— 見 engine/effects.ts。

import type { Knight, RowPosition } from '../data/types'
import {
  BASIC_ATTACK,
  effectsOf,
  getSkillsFor,
  isUltimate,
  SKILLS,
  UPGRADE_SKILLS,
  type Skill,
  type SkillEffect,
} from '../data/skills'
import { getFusedMount, MOUNT_HP_RATIO, type Mount } from '../data/mounts'
import { getAttrMultiplier } from './attributes'
import { isStub, noteStub } from './effects'
import {
  allowedSkill,
  applyStatus,
  focusMarkBonus,
  hasAnyDebuff,
  hasCurse,
  hasInvincible,
  isSkipped,
  randomizeVariance,
  stripBuffs,
  stripOneBuff,
  stripOneDebuff,
  takeEmpower,
  tickStatuses,
  totalAtkBoost,
  totalCritBoost,
  totalDefBoost,
  totalEvade,
  totalShield,
  totalSpdBoost,
  totalStarcoreBoost,
  totalThorns,
  unhealableDotPerTick,
  type ActiveStatus,
} from './status'
import {
  getActiveResonances,
  mergeResonanceEffects,
  resonanceDecayFactor,
  type ActiveResonance,
  type ResonanceEffects,
} from './resonance'

export type Side = 'ally' | 'enemy'

export interface Combatant {
  uid: string
  knight: Knight
  side: Side
  row: RowPosition
  hp: number
  maxHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  baseStarcore: number
  skills: Skill[]
  passives: Skill[]
  sp: number
  spCap: number
  spRegen: number
  alive: boolean
  statuses: ActiveStatus[]
  cooldowns: Record<string, number>
  /** stackAtkBoost 目前層數（solren 源核引力） */
  stacks: number
  stackValuePerStack: number
  /** 永久修正（fraction，可負） */
  permAtk: number
  permDef: number
  permSpd: number
  /** 各 permXXX 觸發次數（maxStack 用），key = passive id */
  permTriggers: Record<string, number>
  /** 累積受創 / maxHp（triggerEvery 用） */
  cumDmgFrac: number
  /** viel 虛空餘響：對各目標的標記層數 */
  voidMarks: Record<string, number>
  /** 對獨立陣營額外傷害（mordres） */
  dmgVsIndependent: number
  burstReduce?: { threshold: number; reduction: number }
  nullify?: { base: number; boosted: number; threshold: number }
  enraged: boolean
  passiveUses: Record<string, number>
  ultimateShield: number
  /** 對已有負面狀態目標的加傷（aekron 暗月形態，Q13 判讀③） */
  dmgVsDebuffed: number
  /** 是否免疫位移類效果（stunSoft / stun，不擋 freeze/airborne/gravityBind/chill）（Q13） */
  immuneToDisplace: boolean
  /** 過載量表 0.0~1.0+（holka 爆炎共鳴，Q13） */
  overloadGauge: number
  // ── 坐騎（Q12：附掛模組，不佔隊伍名額、不獨立行動）──
  mount?: Mount
  mountHp: number
  mountMaxHp: number
  mountAlive: boolean
  /**
   * 合體充能量表 0~1（主人 2026-09-12 拍板：坐騎合體維持「充能滿→玩家手動啟動」設計，
   * 不要自動在開戰即生效——見 UI_SPEC §7-1／§9-4）。普攻 +0.15、受傷 +0.08、使用其餘技能 +0.20
   * （主人 2026-09-12 Session 11 調高，原本 0.10/0.05/0.15 太保守，一般戰鬥長度內很少充滿），
   * 滿 1.0 後才允許 performMountFuse()。玩家單位由 ActionBar 的坐騎合體按鈕手動觸發；
   * AI 單位（沒有按鈕可點）charge 滿了就自動合體，等同於玩家一定會按。
   */
  mountCharge: number
  /** 是否已經觸發過一次合體——用來跟「還在充能中」區分「合體後坐騎被 AoE 打死」（兩者 mountAlive 都是 false）。 */
  mountFusedOnce: boolean
  /** 合體攻擊加成（passiveShare.atkBonus 具體化） */
  mountAtkBonus: number
  /** 合體速度加成（固定值；v3 jadegryphon spdBonusFlat / moonstagg spdBonusRatio） */
  mountSpdBonus: number
  /** 吸血率額外加成（v3 manticore） */
  mountLifeStealBonus: number
  /** stackable dot 疊層上限 +N（v3 ashdragon） */
  mountDotStackBonus: number
  /** 月光鎖定標記加傷 +N（v3 moonstagg） */
  mountMarkBonus: number
  /** 星橋消隱觸發次數上限 +N（v3 voidgryphon） */
  mountFadeExtra: number
  /** 飛行型坐騎：騎士的非穿透單體技可指定敵方後排、免疫地面位移（Q12 / v3） */
  isFlyingMount: boolean
  /** 裂翼專屬：免疫 suppressFlight */
  immuneToSuppressFlight: boolean
  /** 裂翼 voidAura：expose 無法解析 */
  unanalyzable: boolean
}

export interface TeamState {
  side: Side
  resonances: ActiveResonance[]
  effects: ResonanceEffects
  /** 禁區結界：我方不吃屬性剋制的 +35% */
  immuneAttrWeakness: boolean
  /** 我方迴避被敵方 seres 壓制的比例 */
  evadeSuppressedBy: number
  /** 敵方 blockFlight 生效到第幾回合（含）：期間我方飛行坐騎失去可打後排特權（Q13） */
  flightSuppressedUntilTurn: number
}

export type BattleEventType =
  | 'battle-start'
  | 'turn-start'
  | 'action'
  | 'damage'
  | 'heal'
  | 'ko'
  | 'resonance'
  | 'buff'
  | 'debuff'
  | 'evade'
  | 'dot'
  | 'skip'
  | 'passive'
  | 'revive'
  | 'crit'
  | 'counter'
  | 'stub'
  | 'battle-end'

export interface BattleEvent {
  type: BattleEventType
  turn: number
  message: string
  sourceUid?: string
  targetUid?: string
  amount?: number
  meta?: Record<string, unknown>
}

export interface BattleResult {
  winner: Side | 'draw'
  turns: number
  reason: 'wipe' | 'turn-limit'
  allyHpPct: number
  enemyHpPct: number
  events: BattleEvent[]
  /** 每個效果 type 實際觸發次數（模擬統計用） */
  effectHits: Record<string, number>
}

export type RNG = () => number

export type SpMode = 'unit' | 'team'

export interface BattleConfig {
  allies: readonly Knight[]
  enemies: readonly Knight[]
  skillKits?: Record<string, Skill[]>
  rng?: RNG
  maxTurns?: number
  allowStoryResonance?: boolean
  spMode?: SpMode
  /** 覆寫 DAMAGE_SCALE（測試 / 平衡用）。省略時用常數 3.0。 */
  damageScale?: number
  /**
   * 互動模式（引擎接線規格 Part B §21/§24）：回傳 true 的單位輪到行動時，
   * runBattleSteps() 會 yield 一個 'need-action' 請求並暫停，等待呼叫端用
   * gen.next(playerChoice) 餵回玩家選的技能；其餘單位仍照 chooseAction() 的既有 AI 邏輯全自動。
   * 省略（或用 simulateBattle()）= 沒有任何單位是玩家操控，行為與原本的全自動模擬完全一致。
   */
  isPlayerControlled?: (c: Combatant) => boolean
}

/** 引擎接線規格 §24：玩家操控單位輪到行動時，need-action 請求裡附的「目前可用技能」 */
export interface PlayerActionRequest {
  actorUid: string
  turn: number
  usableSkillIds: string[]
  /** 坐騎充能是否已滿、現在可以手動觸發合體（見 Combatant.mountCharge） */
  canFuse: boolean
  /**
   * 玩家反饋規格 v1.0 項目 B（換人代打，主人 2026-09-12 拍板）：本回合這個行動格位還能換成
   * 哪些「我方存活、尚未行動」的其他單位代打，連同各自當下可用技能／坐騎合體資格一併附上——
   * 這樣 UI 端切換命令對象（點別張卡片）不用再多一輪 generator 往返，本地直接查表就有正確的
   * 技能/SP/冷卻可以顯示。規則：選了代打，actorUid 這個人這回合就跳過（視為已行動，不補行動格）；
   * 下一回合 order 重新照速度排序，跟這回合的代打無關。
   */
  swappable: { uid: string; usableSkillIds: string[]; canFuse: boolean }[]
}

/**
 * 玩家對 need-action 的回覆；null／未選到可用技能 = 交給 AI（chooseAction）代打這一步。
 * skillId 為固定字串 'mount-fuse' 時代表「這回合改按坐騎合體」，不對應 skills.ts 裡的任何技能 id。
 * actAsUid：項目 B 換人代打——指定這回合真正出手的是 request.swappable 裡的哪一位（而不是
 * request.actorUid 本人）；省略或指到不合法的對象 = 維持原本輪到的 actorUid。
 */
export type PlayerChoice = { skillId: string; targetUid?: string; actAsUid?: string } | null

interface StepBase {
  /** 目前存活/陣亡狀態的完整快照（同一參照；下一次 gen.next() 前讀取即可，之後可能被引擎繼續變動） */
  combatants: readonly Combatant[]
}

/** runBattleSteps() 每次 yield 的內容——引擎接線規格 §24 BattleEvent 的單機版對應 */
export type BattleStepEvent =
  | (StepBase & { kind: 'need-action'; request: PlayerActionRequest })
  | (StepBase & { kind: 'turn-start'; turn: number; events: BattleEvent[] })
  | (StepBase & { kind: 'unit-acted'; actorUid: string; events: BattleEvent[] })
  | (StepBase & { kind: 'turn-end'; turn: number; events: BattleEvent[] })

const DEFAULT_MAX_TURNS = 20
const SP_HARD_CAP = 5
// Mina v2 Q15（方案 a）：HP 維持 def×100 的比例關係，DAMAGE_SCALE 從 3.0 拉到 30，
// 讓對戰能在合理回合數內分出殲滅勝負、低血被動也能真的觸發。
// 主人 2026-09-12 Session 12：30 讓戰鬥平均 5 回合就結束，比坐騎充能最快也要 6 回合還短，
// 合體永遠來不及觸發——目標拉長到 8-10 回合，用 300 場模擬搜尋後選定 19（見 CLAUDE.md Session 12）。
export const DAMAGE_SCALE = 19
const CRIT_MULT = 1.5

/**
 * Q15/Q19：DoT 每回合傷害 = floor(攻擊者 atk × 技能係數 × DAMAGE_SCALE/3)。
 * （Q19：DAMAGE_SCALE=30 下原本的 /10 讓 DoT 淪為雞肋，Mina 已確認改成 /3，約 ×3.3 倍。）
 * Mina 的範例（伊格尼斯 atk92 用係數 0.15）沒有對上她自己 Q1 給熔灼的係數 0.10 ——
 * 這裡採用「技能自己的係數」而不是把 0.15 當全域常數，理由：(1) 保留 Q1 官方資料裡
 * 刻意做出的每個技能傷害差異（0.08~0.15），(2) 公式結構本身（atk-based、DAMAGE_SCALE 縮放）
 * 完全比照 Mina 的寫法。銀翼「頻率反噬」則照 Mina 明寫的 DOT_FORMULA(attacker)*1.5，
 * 直接把係數設成 0.15×1.5=0.225（見 data/skills.ts）。
 */
function dotTick(attacker: Combatant, coefficient: number, dmgScale: number): number {
  return Math.max(1, Math.floor(attacker.baseAtk * coefficient * (dmgScale / 3)))
}

/** Q14：星核力目前的效應範圍（僅這兩處） */
function ultimateDmgBonus(starcore: number): number {
  return 1 + (starcore - 60) / 200
}
function healBonus(starcore: number): number {
  return 1 + (starcore - 60) / 300
}

function buildTeam(
  side: Side,
  knights: readonly Knight[],
  allowStory: boolean,
): { team: TeamState; effects: ResonanceEffects } {
  const resonances = getActiveResonances(knights, allowStory)
  const effects = mergeResonanceEffects(resonances)
  return {
    team: {
      side,
      resonances,
      effects,
      immuneAttrWeakness: false,
      evadeSuppressedBy: 0,
      flightSuppressedUntilTurn: 0,
    },
    effects,
  }
}

/**
 * Q12：坐騎不是第 4 位隊員，而是把牠自己的主動技併入騎士的可選技能池（施術者仍是騎士本人，
 * 不消耗坐騎自己的回合 / SP），被動技也一併併入。合體共鳴 upgradeSkill 命中時，直接把該技能
 * 換成 UPGRADE_SKILLS 裡的完整升級技；其餘併入技能 id 加上 mount id 前綴避免跟騎士本身或
 * skillLock(allowOnly:['normal']) 之類的判定衝突。
 */
function mergeMountSkills(knight: Knight, riderSkills: Skill[]): { skills: Skill[]; mount?: Mount } {
  const mount = getFusedMount(knight.mount)
  if (!mount) return { skills: riderSkills }
  // 坐騎技能書直接查 SKILLS（不能走 getSkillsFor 的佔位技 fallback）
  const mountKit = SKILLS[mount.id] ?? []
  const upgrade = mount.fusion?.upgradeSkill
  const overlay = mount.fusion?.upgradeOverlay
  // v3 判讀①：疊加而非替換 —— 原技能底層保留，換名字、掛上 mountBonus
  const rider = riderSkills.map((s) =>
    overlay && s.id === overlay.targetSkillId ? { ...s, name: overlay.name, mountBonus: overlay.additionalEffect } : s,
  )
  const merged = mountKit.map((s) => {
    if (upgrade && s.id === upgrade.from) return UPGRADE_SKILLS[upgrade.to] ?? s
    return { ...s, id: `${mount.id}-${s.id}` }
  })
  return { skills: [...rider, ...merged], mount }
}

function makeCombatant(
  knight: Knight,
  side: Side,
  index: number,
  effects: ResonanceEffects,
  allSkills: Skill[],
  resonanceIds: readonly string[] = [],
): Combatant {
  const maxHp = Math.round(knight.maxHp * (effects.hpMult ?? 1))
  const { skills: fullSkills, mount } = mergeMountSkills(knight, allSkills)
  const fusion = mount?.fusion
  const thirdPathBonus = resonanceIds.includes('third-path') ? (fusion?.thirdPathSpMaxBonus ?? 0) : 0
  const passives = fullSkills.filter((s) => s.type === 'passive')
  const active = fullSkills.filter((s) => s.type !== 'passive')
  const stackSkill = active.find((s) =>
    effectsOf(s).some((e) => e.type === 'stackAtkBoost'),
  )
  const stackEff = stackSkill && effectsOf(stackSkill).find((e) => e.type === 'stackAtkBoost')
  const mountMaxHp = mount ? Math.round(maxHp * (mount.fusion?.hpRatio ?? MOUNT_HP_RATIO)) : 0
  return {
    uid: `${side}-${knight.id}-${index}`,
    knight,
    side,
    // Q3：隊伍結構前排 1-2 人 + 後排 1 人 → 3 人隊預設前 2 後 1
    row: index < 2 ? 'front' : 'back',
    hp: maxHp,
    maxHp,
    baseAtk: knight.atk,
    baseDef: knight.def,
    baseSpd: knight.spd,
    baseStarcore: knight.starcore,
    skills: active.length ? active : [BASIC_ATTACK],
    passives,
    sp: 0,
    spCap: Math.max(1, SP_HARD_CAP + (effects.spCapDelta ?? 0) + thirdPathBonus),
    spRegen: Math.max(0, 1 + (effects.spRegenDelta ?? 0)),
    alive: true,
    statuses: [],
    cooldowns: {},
    stacks: 0,
    stackValuePerStack: typeof stackEff?.valuePerStack === 'number' ? stackEff.valuePerStack : 0,
    permAtk: 0,
    permDef: 0,
    permSpd: 0,
    permTriggers: {},
    cumDmgFrac: 0,
    voidMarks: {},
    dmgVsIndependent: 0,
    enraged: false,
    passiveUses: {},
    ultimateShield: effects.immuneUltimateOnce ? 1 : 0,
    dmgVsDebuffed: 0,
    immuneToDisplace: false,
    overloadGauge: 0,
    mount,
    mountHp: mountMaxHp,
    mountMaxHp,
    // 手動合體設計：開戰時坐騎「待命」但尚未合體，mountAlive 要等 mountCharge 滿了、
    // performMountFuse() 真的觸發過才會變 true（取代舊版 !!mount 開戰即生效）。
    mountAlive: false,
    mountCharge: 0,
    mountFusedOnce: false,
    mountAtkBonus: fusion?.atkBonusRatio ? knight.atk * fusion.atkBonusRatio : 0,
    mountSpdBonus: (fusion?.spdBonusFlat ?? 0) + (fusion?.spdBonusRatio ? knight.spd * fusion.spdBonusRatio : 0),
    mountLifeStealBonus: fusion?.lifeStealBonus ?? 0,
    mountDotStackBonus: fusion?.dotStackBonus ?? 0,
    mountMarkBonus: fusion?.moonLockBonus ?? 0,
    mountFadeExtra: fusion?.starbridgeFadeExtraCharges ?? 0,
    isFlyingMount: fusion?.flying === true,
    immuneToSuppressFlight: fusion?.immuneToSuppressFlight === true,
    unanalyzable: false,
  }
}

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback)
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/** UI_SPEC §7-1 充能規則（Session 11 調高版）：普攻 +15%、受傷 +8%、使用技能 +20%。已合體或沒有坐騎的單位不再累積。 */
function gainMountCharge(c: Combatant, amount: number) {
  if (!c.mount || c.mountAlive) return
  c.mountCharge = clamp01(c.mountCharge + amount)
}

/**
 * 引擎接線規格 §21 processTurn 的單機 generator 版：跟 simulateBattle() 完全共用同一套
 * 傷害/效果/被動/共鳴/坐騎邏輯（closure 直接沿用，沒有另外複製一份），差別只在於
 * config.isPlayerControlled 認定的單位輪到行動時會 yield 'need-action' 並暫停等待輸入。
 * simulateBattle() 就是把這個 generator 用「不停 .next()、沒有玩家操控」的方式跑到底的薄包裝。
 */
export function* runBattleSteps(
  config: BattleConfig,
): Generator<BattleStepEvent, BattleResult, PlayerChoice | void> {
  const isPlayerControlled = config.isPlayerControlled ?? (() => false)
  const rng: RNG = config.rng ?? Math.random
  const maxTurns = config.maxTurns ?? DEFAULT_MAX_TURNS
  const spMode: SpMode = config.spMode ?? 'unit'
  const dmgScale = config.damageScale ?? DAMAGE_SCALE
  const events: BattleEvent[] = []
  const effectHits: Record<string, number> = {}
  const log = (e: BattleEvent) => events.push(e)
  const bump = (type: string) => {
    effectHits[type] = (effectHits[type] ?? 0) + 1
  }

  const allyBuild = buildTeam('ally', config.allies, config.allowStoryResonance ?? false)
  const enemyBuild = buildTeam('enemy', config.enemies, config.allowStoryResonance ?? false)
  const teams: Record<Side, TeamState> = { ally: allyBuild.team, enemy: enemyBuild.team }

  const kitFor = (k: Knight) => config.skillKits?.[k.id] ?? getSkillsFor(k.id)
  const resIds = (t: TeamState) => t.resonances.map((r) => r.resonance.id)
  const combatants: Combatant[] = [
    ...config.allies.map((k, i) => makeCombatant(k, 'ally', i, allyBuild.effects, kitFor(k), resIds(allyBuild.team))),
    ...config.enemies.map((k, i) => makeCombatant(k, 'enemy', i, enemyBuild.effects, kitFor(k), resIds(enemyBuild.team))),
  ]

  const other = (s: Side): Side => (s === 'ally' ? 'enemy' : 'ally')
  const living = (s: Side) => combatants.filter((c) => c.side === s && c.alive)
  const enemiesOf = (c: Combatant) => living(other(c.side))
  const alliesOf = (c: Combatant) => living(c.side)
  const sideWiped = (s: Side) => combatants.filter((c) => c.side === s).every((c) => !c.alive)
  const byUid = (uid: string) => combatants.find((c) => c.uid === uid)

  let turn = 0

  // ── 有效數值（含永久修正 / 狀態 / 疊層 / 共鳴遞減）──
  const resMult = (team: TeamState, key: 'atkMult' | 'spdMult' | 'starcoreMult') => {
    const m = team.effects[key] ?? 1
    return 1 + (m - 1) * resonanceDecayFactor(turn)
  }
  const resDefIgnore = (team: TeamState) =>
    clamp01((team.effects.defIgnore ?? 0) * resonanceDecayFactor(turn))

  const effAtk = (c: Combatant) =>
    (c.baseAtk + (c.mountAlive ? c.mountAtkBonus : 0)) *
    (1 + c.permAtk + totalAtkBoost(c.statuses) + c.stacks * c.stackValuePerStack) *
    resMult(teams[c.side], 'atkMult')
  const effDef = (c: Combatant) => Math.max(1, c.baseDef * (1 + c.permDef + totalDefBoost(c.statuses)))
  const effSpd = (c: Combatant) =>
    Math.max(
      1,
      (c.baseSpd + (c.mountAlive ? c.mountSpdBonus : 0)) *
        (1 + c.permSpd + totalSpdBoost(c.statuses)) *
        resMult(teams[c.side], 'spdMult'),
    )
  /** 飛行坐騎目前是否可用（合體存活、且未被 suppressFlight 壓制或本身免疫） */
  const canFly = (c: Combatant) =>
    c.isFlyingMount &&
    c.mountAlive &&
    (c.immuneToSuppressFlight || teams[c.side].flightSuppressedUntilTurn < turn)
  /** v3 判讀②：sunnyField = 敵方有 magma(lava) / holy 屬性 */
  const isSunnyField = (actor: Combatant) =>
    enemiesOf(actor).some((c) => c.knight.coreAttr === 'lava' || c.knight.coreAttr === 'holy')
  // Q14：星核力（starcore）影響必殺技傷害倍率與治癒量，見 ultimateDmgBonus / healBonus；
  // starcoreDown 現在會實際削弱這兩者。
  const effStarcore = (c: Combatant) => c.baseStarcore * (1 + totalStarcoreBoost(c.statuses))

  /** Q13 判讀③：darkField 條件（任一成立）—— 10 回合後 / 我方有人陣亡 / 敵方有聖光或融合型 */
  function isDarkField(actor: Combatant): boolean {
    return (
      turn >= 10 ||
      combatants.some((c) => c.side === actor.side && !c.alive) ||
      enemiesOf(actor).some((c) => c.knight.coreAttr === 'holy' || c.knight.coreAttr === 'fusion')
    )
  }

  // ── 目標選擇 ──
  function activeTaunter(side: Side): Combatant | undefined {
    return living(side).find((c) => c.statuses.some((s) => s.kind === 'shield' && s.label === '蒼壁絕對防禦'))
  }
  /**
   * Q3 前後排規則：非穿透的單體技只能打敵方前排；後排只受 AoE / piercing 技能影響。
   * 前排全滅時由 promoteRows() 立刻把後排補上前排，因此這裡不需要「前排空了退而求其次打全體」的例外。
   */
  function pickTarget(attacker: Combatant, piercing = false): Combatant | undefined {
    const foes = enemiesOf(attacker)
    if (!foes.length) return undefined
    const taunter = activeTaunter(attacker.side === 'ally' ? 'enemy' : 'ally')
    if (taunter && !piercing) return taunter
    const front = foes.filter((c) => c.row === 'front')
    // 飛行坐騎（Q12 / v3）：騎士可指定後排，除非被 suppressFlight 壓制
    const pool = piercing || canFly(attacker) || !front.length ? foes : front
    return pool[Math.floor(rng() * pool.length)]
  }

  /** 前排全滅後排自動補位（Q3 frontRowWipeout: backRowMoveUp） */
  function promoteRows(side: Side) {
    const alive = living(side)
    if (alive.length && !alive.some((c) => c.row === 'front')) {
      for (const c of alive) c.row = 'front'
    }
  }

  function resolveTargets(
    e: SkillEffect,
    actor: Combatant,
    primary: Combatant | undefined,
    trigUnit?: Combatant,
  ): Combatant[] {
    switch (e.target) {
      case 'self':
        return [actor]
      case 'allAllies':
      case 'allAliveAllies':
        return alliesOf(actor)
      case 'allEnemies':
        return enemiesOf(actor)
      case 'oneAlly':
        return [
          [...alliesOf(actor)].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? actor,
        ]
      case 'all':
        return combatants.filter((c) => c.alive)
      case 'triggerUnit':
        return trigUnit ? [trigUnit] : []
      case 'attacker':
        return primary ? [primary] : []
      case 'enemy':
      case 'oneEnemy':
        return primary ? [primary] : []
      default:
        return primary ? [primary] : [actor]
    }
  }

  // ── 傷害管線 ──
  function computeDamage(src: Combatant, tgt: Combatant, skill: Skill, opts: { ignoreShield?: boolean }): number {
    let attrMult = getAttrMultiplier(src.knight.coreAttr, tgt.knight.coreAttr)
    if (teams[tgt.side].immuneAttrWeakness) attrMult = Math.min(attrMult, 1.0)

    let defIgnore = resDefIgnore(teams[src.side])
    for (const e of effectsOf(skill))
      if (e.type === 'defPierce') {
        defIgnore = clamp01(defIgnore + num(e.value))
        bump('defPierce')
      }
    if (skill.piercing) defIgnore = clamp01(defIgnore + 0.2)

    // Q3：防禦上限係數 200（defReduction = 1 - def/(def+200) = 200/(200+def)）
    const mitigation = 200 / (200 + effDef(tgt) * (1 - defIgnore))
    // v3 判讀①：坐騎疊加 powerMultiplier —— 照 Mina 註解語意（×1.5 / 翻倍）直接相乘，
    // 不用她 pseudocode 的 (1 + x)（那會變 ×2.5 / ×3，與註解矛盾，見 CLAUDE.md）
    const mountPower = src.mountAlive ? num(skill.mountBonus?.powerMultiplier, 1) : 1
    const base = effAtk(src) * num(skill.power, 1) * mountPower * dmgScale
    // Q3：後排只受 AoE / piercing 影響，非穿透單體技從一開始就選不到後排目標（見 pickTarget），
    // 故這裡不再需要額外的後排傷害折減。
    const variance = 0.85 + rng() * 0.3 // Q3：±15%

    let mark = 1 + focusMarkBonus(tgt.statuses, src.uid)
    if (src.dmgVsIndependent && tgt.knight.faction === 'independent') mark += src.dmgVsIndependent
    if (src.dmgVsDebuffed && hasAnyDebuff(tgt.statuses)) mark += src.dmgVsDebuffed

    let dmg = base * mitigation * attrMult * variance * mark

    // Q13：aiso 符文陣列·星域重寫——被 randomize 的一方，技能傷害額外 ±variance 浮動
    const rv = randomizeVariance(src.statuses)
    if (rv > 0) dmg *= 1 + (rng() * 2 - 1) * rv

    // Q14：必殺技（cost>=3 主動技）傷害隨施術者星核力浮動
    if (isUltimate(skill)) dmg *= ultimateDmgBonus(effStarcore(src))

    // 暴擊
    const crit = totalCritBoost(src.statuses)
    if (crit > 0 && rng() < crit) {
      dmg *= CRIT_MULT
      log({ type: 'crit', turn, sourceUid: src.uid, targetUid: tgt.uid, message: `　暴擊！` })
      bump('critBoost')
    }

    // 減傷
    if (hasInvincible(tgt.statuses)) return 0
    dmg *= 1 - totalShield(tgt.statuses)
    if (tgt.burstReduce && dmg >= tgt.burstReduce.threshold * tgt.maxHp) {
      dmg *= 1 - tgt.burstReduce.reduction
      bump('burstDamageReduce')
    }
    void opts
    return Math.max(1, Math.round(dmg))
  }

  /** 坐騎合體：充能滿了才能觸發，觸發後才套用合體加成、坐騎才真正「上場」（見 Combatant.mountCharge）。 */
  function performMountFuse(actor: Combatant) {
    actor.mountAlive = true
    actor.mountFusedOnce = true
    actor.mountHp = actor.mountMaxHp
    log({
      type: 'action',
      turn,
      sourceUid: actor.uid,
      message: `★ ${actor.knight.name} 與坐騎「${actor.mount?.name}」完成合體！`,
      meta: { skillId: 'mount-fuse' },
    })
  }

  function onDamageReceived(tgt: Combatant, dmg: number, attacker?: Combatant) {
    tgt.cumDmgFrac += dmg / tgt.maxHp
    if (dmg > 0) gainMountCharge(tgt, 0.08)
    for (const p of tgt.passives) {
      if (p.trigger !== 'onDamageReceived') continue
      for (const e of effectsOf(p)) {
        if (e.type === 'permDefBoost') {
          const max = num(e.maxStack, 99)
          if ((tgt.permTriggers[p.id] ?? 0) < max) {
            tgt.permTriggers[p.id] = (tgt.permTriggers[p.id] ?? 0) + 1
            tgt.permDef += num(e.value)
            bump('permDefBoost')
          }
        } else if (e.type === 'permAtkBoost' || e.type === 'permSpdBoost') {
          const max = num(e.maxStack, 99)
          if (e.triggerEvery != null) {
            // 舊式：累積受創達 maxHp 的 triggerEvery 比例才 +1 層
            const per = num(e.triggerEvery, 0.1)
            const should = Math.floor(tgt.cumDmgFrac / per)
            while ((tgt.permTriggers[p.id] ?? 0) < Math.min(should, max)) {
              tgt.permTriggers[p.id] = (tgt.permTriggers[p.id] ?? 0) + 1
              if (e.type === 'permAtkBoost') tgt.permAtk += num(e.valuePerTrigger)
              else tgt.permSpd += num(e.valuePerTrigger)
              bump(e.type)
            }
          } else if ((tgt.permTriggers[p.id] ?? 0) < max) {
            // Q1 官方數值：每次受擊 +1 層（frael 獸血沸騰 / nautrus 深淵適應）
            tgt.permTriggers[p.id] = (tgt.permTriggers[p.id] ?? 0) + 1
            const v = num(e.value ?? e.valuePerTrigger)
            if (e.type === 'permAtkBoost') tgt.permAtk += v
            else tgt.permSpd += v
            bump(e.type)
          }
        } else if (e.type === 'chargeGauge') {
          // Q13：gaugeValue = 累積承傷 / maxHp；chargeRate 每次受擊套用一次
          tgt.overloadGauge += (dmg / tgt.maxHp) * num(e.chargeRate, 0.1)
          checkGaugeFull(tgt)
        } else if (e.type === 'counterAttack' && attacker && attacker.alive) {
          const reflect = Math.max(1, Math.round(dmg * num(e.value)))
          attacker.hp -= reflect
          log({
            type: 'counter',
            turn,
            sourceUid: tgt.uid,
            targetUid: attacker.uid,
            amount: reflect,
            message: `　${tgt.knight.name}「${p.name}」反傷 ${reflect}`,
          })
          bump('counterAttack')
          checkDeath(attacker)
        }
        // nullifyChance（gratos 要塞行軍）：語意是「整場持續的防禦特性」，見下方
        // applyEffect 的 'nullifyChance' case；battleStart 時透過 always/battleStart pass 尚未涵蓋
        // onDamageReceived 觸發時機，實務上等 gratos 補完整數值上場（見 CLAUDE.md Q11）再檢視是否需要
        // 額外的初始化路徑。
      }
    }
    // thorns 狀態（greln 熔金壁壘）
    const thorns = totalThorns(tgt.statuses)
    if (thorns > 0 && attacker && attacker.alive) {
      const reflect = Math.max(1, Math.round(dmg * thorns))
      attacker.hp -= reflect
      log({ type: 'counter', turn, sourceUid: tgt.uid, targetUid: attacker.uid, amount: reflect, message: `　荊棘反傷 ${reflect}` })
      bump('thorns')
      checkDeath(attacker)
    }
    if (tgt.alive && tgt.hp / tgt.maxHp < 0.3) firePassiveTrigger(tgt, 'hpBelow30')
    if (tgt.alive && tgt.hp / tgt.maxHp < 0.2) firePassiveTrigger(tgt, 'hpBelow20')
    fireAllyHpBelow30(tgt.side)
  }

  /** v3 判讀②：allyHpBelow30 — 每次傷害結算後掃描該側隊友，有「其他隊友」HP<30% 就發動（每回合最多一次） */
  function fireAllyHpBelow30(side: Side) {
    for (const c of living(side)) {
      for (const p of c.passives) {
        if (p.trigger !== 'allyHpBelow30') continue
        const key = `${p.id}@turn`
        if (c.passiveUses[key] === turn) continue
        const wounded = living(side).some((a) => a !== c && a.hp / a.maxHp < 0.3)
        if (!wounded) continue
        c.passiveUses[key] = turn
        applyEffects(p, c, undefined, c)
        log({ type: 'passive', turn, sourceUid: c.uid, message: `【被動】${c.knight.name}「${p.name}」— 隊友瀕死，發動` })
      }
    }
  }

  /**
   * 通用低血 / 一次性被動觸發器：hpBelow30（銀翼星橋消隱）、hpBelow20（ignis 業火不滅）。
   * 觸發次數上限讀取 effect 的 maxTriggers / maxTimes（省略 = 只觸發一次），
   * 用 passiveUses[id] 計數，符合 Q9「不重置、不溢出」。
   */
  function firePassiveTrigger(c: Combatant, trigger: 'hpBelow30' | 'hpBelow20') {
    if (!c.alive) return
    for (const p of c.passives) {
      if (p.trigger !== trigger) continue
      const e0 = effectsOf(p)[0] ?? {}
      // v3 voidgryphon：星橋消隱觸發次數上限 +starbridgeFadeExtraCharges
      const max = num(e0.maxTriggers ?? e0.maxTimes, 1) + (p.id === 'starbridge-fade' && c.mountAlive ? c.mountFadeExtra : 0)
      if ((c.passiveUses[p.id] ?? 0) >= max) continue
      c.passiveUses[p.id] = (c.passiveUses[p.id] ?? 0) + 1
      applyEffects(p, c, undefined, c)
      log({ type: 'passive', turn, sourceUid: c.uid, message: `【被動】${c.knight.name} HP<${trigger === 'hpBelow30' ? 30 : 20}%，「${p.name}」發動` })
    }
  }

  /** Q13：holka 爆炎共鳴／爆炎翼衝共用的過載量表，滿了就對敵方全體爆發一次 AoE 並歸零。 */
  function checkGaugeFull(actor: Combatant) {
    if (!actor.alive) return
    const p = actor.passives.find((pp) => effectsOf(pp).some((e) => e.type === 'chargeGauge'))
    const e = p && effectsOf(p).find((ee) => ee.type === 'chargeGauge')
    if (!p || !e) return
    if (actor.overloadGauge < num(e.triggerAt, 1.0)) return
    actor.overloadGauge = 0
    const onTrigger = (e.onTrigger as SkillEffect | undefined) ?? { type: 'aoe', power: 2.0 }
    const power = num(onTrigger.power, 2.0)
    log({ type: 'passive', turn, sourceUid: actor.uid, message: `【被動】${actor.knight.name}「${p.name}」量表爆滿 — 過載爆發！` })
    for (const t of enemiesOf(actor)) {
      if (!t.alive) continue
      const dmg = computeDamage(actor, t, { ...BASIC_ATTACK, power, type: 'aoe' }, {})
      t.hp -= dmg
      log({ type: 'damage', turn, sourceUid: actor.uid, targetUid: t.uid, amount: dmg, message: `　過載爆發！${t.knight.name} 受到 ${dmg} 傷害` })
      onDamageReceived(t, dmg, actor)
      checkDeath(t)
    }
    bump('chargeGaugeTrigger')
  }

  function checkDeath(c: Combatant) {
    if (c.hp > 0 || !c.alive) return
    c.hp = 0
    // 王座永恆
    const revive = c.passives.find((p) => p.trigger === 'hpZero')
    if (revive) {
      const e = effectsOf(revive)[0]
      const used = c.passiveUses[revive.id] ?? 0
      if (used < num(e.maxTimes, 1)) {
        c.passiveUses[revive.id] = used + 1
        c.hp = Math.max(1, Math.round(c.maxHp * num(e.value, 0.5)))
        log({ type: 'revive', turn, targetUid: c.uid, amount: c.hp, message: `【被動】${c.knight.name}「${revive.name}」以 ${c.hp} HP 復活！` })
        bump('revive')
        return
      }
    }
    c.alive = false
    log({ type: 'ko', turn, targetUid: c.uid, message: `${c.knight.name} 被擊墜！` })
    promoteRows(c.side)
    // allyDeath 被動：星域屏障（osirath teamShield）／末日血契（magnos permAtkBoost 疊層）
    for (const ally of alliesOf(c)) {
      for (const p of ally.passives) {
        if (p.trigger !== 'allyDeath') continue
        for (const e of effectsOf(p)) {
          if (e.type === 'teamShield') {
            for (const a of alliesOf(c))
              applyStatus(a.statuses, { kind: 'shield', value: num(e.value, 0.2), turnsLeft: num(e.duration, 1), label: p.name, appliedTurn: turn })
            log({ type: 'passive', turn, sourceUid: ally.uid, message: `【被動】${ally.knight.name}「${p.name}」— 全隊 ${Math.round(num(e.value) * 100)}% 減傷` })
            bump('teamShield')
          } else if (e.type === 'atkBoost' || e.type === 'permAtkBoost') {
            const max = num(e.maxStacks ?? e.maxStack, 99)
            const used = ally.permTriggers[p.id] ?? 0
            if (used < max) {
              ally.permTriggers[p.id] = used + 1
              ally.permAtk += num(e.value, 0.12)
              log({ type: 'passive', turn, sourceUid: ally.uid, message: `【被動】${ally.knight.name}「${p.name}」— 攻擊永久 +${Math.round(num(e.value) * 100)}%（第 ${used + 1} 層）` })
              bump(e.type)
            }
          }
        }
      }
    }
  }

  function healUnit(tgt: Combatant, rawAmount: number, srcName: string, label: string) {
    if (!tgt.alive) return
    if (hasCurse(tgt.statuses)) {
      const dmg = Math.max(1, Math.round(rawAmount))
      tgt.hp -= dmg
      log({ type: 'dot', turn, targetUid: tgt.uid, amount: dmg, message: `　詛咒！${tgt.knight.name} 的治療反轉為 ${dmg} 傷害` })
      bump('curse')
      checkDeath(tgt)
      return
    }
    // v3 判讀③ dotUnhealable：神聖灼燒這類 DoT 的每回合量會直接吃掉治癒量
    const burn = unhealableDotPerTick(tgt.statuses)
    const net = Math.max(0, Math.round(rawAmount - burn))
    if (burn > 0 && net === 0) {
      log({ type: 'heal', turn, targetUid: tgt.uid, amount: 0, message: `${srcName}「${label}」的治癒被 ${tgt.knight.name} 身上的神聖灼燒抵銷` })
      return
    }
    const healed = Math.min(tgt.maxHp - tgt.hp, net)
    tgt.hp += healed
    log({ type: 'heal', turn, targetUid: tgt.uid, amount: healed, message: `${srcName}「${label}」為 ${tgt.knight.name} 恢復 ${healed}` })
  }

  // ── 效果套用 ──
  function applyEffects(skill: Skill, actor: Combatant, primary: Combatant | undefined, trigUnit?: Combatant) {
    for (const e of effectsOf(skill)) applyEffect(e, skill, actor, primary, trigUnit)
  }

  function applyEffect(
    e: SkillEffect,
    skill: Skill,
    actor: Combatant,
    primary: Combatant | undefined,
    trigUnit?: Combatant,
  ) {
    if (isStub(e.type)) {
      noteStub(e.type)
      log({ type: 'stub', turn, sourceUid: actor.uid, message: `（${skill.name}：「${e.type}」尚未實作）` })
      return
    }
    // v3 判讀②：條件旗標（sunnyField / darkField）不成立就整個效果跳過
    if (e.condition === 'sunnyField' && !isSunnyField(actor)) return
    if (e.condition === 'darkField' && !isDarkField(actor)) return
    const targets = resolveTargets(e, actor, primary, trigUnit)
    // duration: -1 = 永久（Mina 慣例）
    const dur = e.duration === -1 ? Infinity : num(e.duration, 1)
    const mb = ((actor.mountAlive ? skill.mountBonus : undefined) ?? {}) as Record<string, unknown>

    switch (e.type) {
      case 'shield':
      case 'teamShield':
      case 'teamDmgReduce': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'shield', value: num(e.value), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'invincible': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'invincible', value: 1, turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'atkBoost':
      case 'teamAtkBoost': {
        if (e.stackable) {
          const max = num(e.maxStacks, 99)
          for (const t of targets) {
            const used = t.permTriggers[skill.id] ?? 0
            if (used < max) {
              t.permTriggers[skill.id] = used + 1
              t.permAtk += num(e.value)
            }
          }
        } else {
          for (const t of targets)
            applyStatus(t.statuses, { kind: 'atkBoost', value: num(e.value), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        }
        bump(e.type)
        break
      }
      case 'atkDown': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'atkBoost', value: -num(e.value), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'defBoost': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'defBoost', value: num(e.value), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'defDown': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'defBoost', value: -num(e.value), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'permDefDown': {
        for (const t of targets) t.permDef -= num(e.value)
        bump(e.type)
        break
      }
      case 'spdBoost':
      case 'teamSpdBoost': {
        if (e.stackable) {
          // aivia 星橋感知：每回合 +1 層，達 maxStacks 停止累積、不重置（Q9）
          const max = num(e.maxStacks, 99)
          for (const t of targets) {
            const used = t.permTriggers[skill.id] ?? 0
            if (used < max) {
              t.permTriggers[skill.id] = used + 1
              t.permSpd += num(e.value)
            }
          }
        } else {
          for (const t of targets)
            applyStatus(t.statuses, { kind: 'spdBoost', value: num(e.value), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        }
        bump(e.type)
        break
      }
      case 'spdDown':
      case 'frostCrack': {
        // v3 jadegryphon 翠嵐天翔：speedDebuffBoost 讓減速再深一層
        const v = (e.type === 'frostCrack' ? num(e.spdDown, 0.3) : num(e.value)) + num(mb.speedDebuffBoost)
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'spdBoost', value: -v, turnsLeft: num(e.duration, 2), label: skill.name, appliedTurn: turn })
        if (e.type === 'frostCrack' && e.movementDot != null) {
          for (const t of targets)
            applyStatus(t.statuses, { kind: 'dot', value: dotTick(actor, num(e.movementDot), dmgScale), turnsLeft: num(e.duration, 2), label: `${skill.name}·移動灼傷`, appliedTurn: turn, sourceUid: actor.uid })
        }
        bump(e.type)
        break
      }
      case 'spdMultiplier': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'spdBoost', value: num(e.value, 2) - 1, turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'starcoreDown': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'starcoreBoost', value: -num(e.value), turnsLeft: num(e.duration, 2), label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'dot':
      case 'selfDot': {
        // Q15：dot 的 value 是 DOT_FORMULA 技能係數，套用時依施術者 atk 換算成當下固定傷害。
        for (const t of targets) {
          // v3 sunlion 太陽神裁：dotName 換名、dotUnhealable 治癒無法減免
          const label = (mb.dotName as string | undefined) ?? (e.name as string) ?? skill.name
          const unhealable = mb.dotUnhealable === true
          const perTick = dotTick(actor, num(e.value), dmgScale)
          const dur3 = num(e.duration, 3)
          if (e.stackable) {
            // ignis 熔岩噴發：每次命中 +1 層，達 maxStacks 停止累積、不重置（Q9）
            // v3 ashdragon：upgradeOverlay.dotMaxStacks 覆寫上限，否則 passiveShare.dotStackBonus 加上去
            const max = mb.dotMaxStacks != null ? num(mb.dotMaxStacks) : num(e.maxStacks, 99) + actor.mountDotStackBonus
            const existing = t.statuses.find((s) => s.kind === 'dot' && s.label === label)
            if (existing) {
              const stacks = Math.min(max, (existing.stackCount ?? 1) + 1)
              existing.stackCount = stacks
              existing.value = perTick * stacks
              existing.turnsLeft = Math.max(existing.turnsLeft, dur3)
              existing.appliedTurn = turn
            } else {
              applyStatus(t.statuses, { kind: 'dot', value: perTick, turnsLeft: dur3, label, appliedTurn: turn, sourceUid: actor.uid, stackCount: 1, unhealable })
            }
          } else {
            applyStatus(t.statuses, { kind: 'dot', value: perTick, turnsLeft: dur3, label, appliedTurn: turn, sourceUid: actor.uid, unhealable })
          }
        }
        bump(e.type)
        break
      }
      case 'regen': {
        // Q9：value 是目標 maxHp 的百分比；Q14：治癒效果隨施術者星核力浮動
        const hb = healBonus(effStarcore(actor))
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'regen', value: t.maxHp * num(e.value) * hb, turnsLeft: num(e.duration, 2), label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'evade':
      case 'evadeBoost': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'evade', value: num(e.value), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'freeze':
      case 'stun':
      case 'stunSoft':
      case 'airborne':
      case 'gravityBind':
      case 'chill': {
        // Q13：stun / stunSoft 屬於「位移」類，會被 immuneToDisplace 擋下；
        // freeze / airborne / gravityBind / chill 不算位移，immuneToDisplace 擋不住。
        const displacement = e.type === 'stun' || e.type === 'stunSoft'
        const chance = e.type === 'stun' ? num(e.chance, 1) : e.type === 'chill' ? undefined : num(e.chance, 1)
        for (const t of targets) {
          if (e.type === 'stun' && rng() >= num(e.chance, 1)) continue
          // 大地根基，或飛行坐騎的 immuneToGroundKnockback（v3）
          if (displacement && (t.immuneToDisplace || (t.isFlyingMount && t.mountAlive))) {
            log({ type: 'debuff', turn, sourceUid: actor.uid, targetUid: t.uid, message: `　${t.knight.name} 免疫位移（${t.immuneToDisplace ? '大地根基' : '飛行坐騎'}）` })
            continue
          }
          applyStatus(t.statuses, {
            kind: 'skip',
            value: 1,
            turnsLeft: e.type === 'chill' ? num(e.duration, 2) : num(e.duration, 1),
            label: skill.name,
            appliedTurn: turn,
            chance: e.type === 'chill' ? num(e.skipChance, 0.3) : chance,
            displacement,
          })
        }
        // Q13：莫德雷斯重力壓制斬 blockFlight — 壓制敵方飛行坐騎的可打後排特權
        if (e.type === 'gravityBind' && e.blockFlight === true) {
          const foeSide = actor.side === 'ally' ? 'enemy' : 'ally'
          const until = turn + num(e.duration, 2)
          teams[foeSide].flightSuppressedUntilTurn = Math.max(teams[foeSide].flightSuppressedUntilTurn, until)
          const flyers = living(foeSide).filter((c) => c.isFlyingMount && c.mountAlive)
          for (const f of flyers)
            log({
              type: 'debuff', turn, sourceUid: actor.uid, targetUid: f.uid,
              message: f.immuneToSuppressFlight
                ? `　${f.knight.name} 的「${f.mount?.name}」是虛空本質，免疫飛行壓制`
                : `　${f.knight.name} 的「${f.mount?.name}」被壓制，至第 ${until} 回合前無法指定後排`,
            })
          bump('suppressFlight')
        }
        bump(e.type)
        break
      }
      case 'skip': {
        for (const t of targets)
          applyStatus(t.statuses, {
            kind: 'skip',
            value: 1,
            turnsLeft: dur,
            delay: num(e.delay, 0),
            label: (e.name as string) ?? skill.name,
            appliedTurn: turn,
          })
        bump(e.type)
        break
      }
      case 'thorns': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'thorns', value: num(e.value), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'critBoost': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'critBoost', value: num(e.value), turnsLeft: num(e.duration, 2), label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'curse': {
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'curse', value: 1, turnsLeft: num(e.duration, 3), label: (e.name as string) ?? skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'skillLock':
      case 'lockSkillTypes': {
        for (const t of targets)
          applyStatus(t.statuses, {
            kind: 'skillLock',
            value: 1,
            turnsLeft: dur,
            label: skill.name,
            appliedTurn: turn,
            allowOnly: e.allowOnly as string[] | undefined,
            blocked: e.blocked as string[] | undefined,
          })
        bump(e.type)
        break
      }
      case 'stackAtkBoost': {
        const max = num(e.maxStacks, 7)
        if (actor.stacks < max) actor.stacks += 1
        bump(e.type)
        break
      }
      case 'selfHeal':
      case 'teamHeal': {
        // Q14：治癒量隨施術者星核力浮動
        const hb = healBonus(effStarcore(actor))
        for (const t of targets) healUnit(t, t.maxHp * num(e.value) * hb, actor.knight.name, skill.name)
        if (e.bonus && (e.bonus as SkillEffect).type === 'cleanse')
          for (const t of targets) stripOneDebuff(t.statuses)
        bump(e.type)
        break
      }
      case 'dispel': {
        // Q9 / elixia 聖裁光柱：count===1 只清除 1 個增益，否則清除全部
        for (const t of targets) {
          const n = e.count === 1 ? (stripOneBuff(t.statuses) ? 1 : 0) : stripBuffs(t.statuses)
          if (n) log({ type: 'debuff', turn, sourceUid: actor.uid, targetUid: t.uid, message: `　${t.knight.name} 被驅散 ${n} 個增益` })
        }
        bump(e.type)
        break
      }
      case 'taunt': {
        applyStatus(actor.statuses, { kind: 'shield', value: num(e.selfDamageReduce, 0.6), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'revive':
        actor.passiveUses[skill.id] ??= 0
        break
      case 'lifeSteal':
        break // 在命中處理
      case 'defPierce':
      case 'eachHitIndependent':
      case 'trackMark':
        bump(e.type)
        break
      case 'immuneToDisplace': {
        actor.immuneToDisplace = true
        bump(e.type)
        break
      }
      case 'conditionalEvade': {
        // Q13 判讀③：aekron 暗月形態，darkField 成立才套用（每回合重判）
        if (e.condition === 'darkField' && !isDarkField(actor)) break
        applyStatus(actor.statuses, { kind: 'evade', value: num(e.evadeBoost, 0.25), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        actor.dmgVsDebuffed = num(e.bonusDmgVsDebuffed, 0.15)
        bump(e.type)
        break
      }
      case 'gaugeCharge': {
        // holka 爆炎翼衝：直接手動充能同一顆過載量表
        actor.overloadGauge += num(e.value, 0.1)
        checkGaugeFull(actor)
        bump(e.type)
        break
      }
      case 'expose':
      case 'exposeNextSkills': {
        // Q13：單機版純資訊展示，不影響 AI 行動，只留一個可見的「已曝光」標記
        // v3 判讀③：unanalyzable（裂翼 voidAura）的目標無法被解析
        for (const t of targets) {
          if (t.unanalyzable) {
            log({ type: 'debuff', turn, sourceUid: actor.uid, targetUid: t.uid, message: `　${t.knight.name} 的虛空氣場無法被「${skill.name}」解析` })
            continue
          }
          applyStatus(t.statuses, { kind: 'exposed', value: 1, turnsLeft: num(e.duration ?? e.turns, 2), label: skill.name, appliedTurn: turn })
        }
        log({ type: 'debuff', turn, sourceUid: actor.uid, message: `　「${skill.name}」曝光敵方情報` })
        bump(e.type)
        break
      }
      case 'voidAura': {
        actor.unanalyzable = e.unanalyzable !== false
        bump(e.type)
        break
      }
      case 'counterMark': {
        // v3 moonstagg 蝕影反標：敵方使用主動技時標記該敵人（primary = 出手的敵人）
        if (!primary) break
        applyStatus(primary.statuses, { kind: 'focusMark', value: num(e.value ?? e.markDmgBoost, 0.15), turnsLeft: dur, label: skill.name, appliedTurn: turn, sourceUid: actor.uid })
        log({ type: 'passive', turn, sourceUid: actor.uid, targetUid: primary.uid, message: `【被動】${actor.knight.name}「${skill.name}」標記 ${primary.knight.name}（傷害 +${Math.round(num(e.value ?? e.markDmgBoost, 0.15) * 100)}%）` })
        bump(e.type)
        break
      }
      case 'randomize': {
        // Q13：影響敵方本回合起「固定數值」效果 ±variance（DoT / 技能傷害倍率 / buff·debuff 數值）
        for (const t of targets)
          applyStatus(t.statuses, { kind: 'randomized', value: 1, variance: num(e.variance, 0.3), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'immuneFactionWeakness': {
        teams[actor.side].immuneAttrWeakness = true
        bump(e.type)
        break
      }
      case 'dualAttrBoost': {
        let v = num(e.value, 0.2)
        if (alliesOf(actor).some((c) => c.knight.id === 'silver-wing')) v *= num(e.bonusIfSilverWing, 2)
        for (const t of alliesOf(actor))
          applyStatus(t.statuses, { kind: 'atkBoost', value: v, turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'toggle': {
        // 推定：進入 modes[0]（滿月模式）
        const modes = (e.modes as Array<Record<string, unknown>>) ?? []
        const m0 = modes[0] ?? {}
        if (typeof m0.atkBoost === 'number')
          applyStatus(actor.statuses, { kind: 'atkBoost', value: m0.atkBoost, turnsLeft: 2, label: `${skill.name}·${String(m0.name ?? '')}`, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'burstDamageReduce': {
        actor.burstReduce = { threshold: num(e.threshold, 0.3), reduction: num(e.reduction, 0.5) }
        bump(e.type)
        break
      }
      case 'nullifyChance': {
        actor.nullify = { base: num(e.base, 0.4), boosted: num(e.boostedChance, 0.7), threshold: num(e.boostedThreshold, 0.4) }
        bump(e.type)
        break
      }
      case 'permDefBoost':
      case 'permAtkBoost':
      case 'permSpdBoost':
        break // onDamageReceived / allyDeath 內處理
      case 'cdExtend': {
        for (const t of targets) for (const k of Object.keys(t.cooldowns)) t.cooldowns[k] += num(e.value, 3)
        bump(e.type)
        break
      }
      case 'markHighestThreat':
      case 'markFastestEnemy':
      case 'markLowestHp':
      case 'lockTarget': {
        const excludeId = (e.excludeId ?? e.exception) as string | undefined
        const foes = enemiesOf(actor).filter((c) => c.knight.id !== excludeId)
        if (!foes.length) break
        const pickFn =
          e.type === 'markFastestEnemy'
            ? (a: Combatant, b: Combatant) => effSpd(b) - effSpd(a)
            : e.type === 'markLowestHp'
              ? (a: Combatant, b: Combatant) => a.hp / a.maxHp - b.hp / b.maxHp
              : (a: Combatant, b: Combatant) => effAtk(b) - effAtk(a)
        const mark = [...foes].sort(pickFn)[0]
        // v3 moonstagg：月光鎖定的標記加傷 +moonLockBonus（加法，0.15 → 0.55）
        const bonus = num(e.dmgBonus ?? e.atkBonus ?? e.value, 0.15) + (e.type === 'markLowestHp' && actor.mountAlive ? actor.mountMarkBonus : 0)
        applyStatus(mark.statuses, { kind: 'focusMark', value: bonus, turnsLeft: Infinity, label: skill.name, appliedTurn: turn, sourceUid: actor.uid })
        log({ type: 'passive', turn, sourceUid: actor.uid, targetUid: mark.uid, message: `【被動】${actor.knight.name}「${skill.name}」標記 ${mark.knight.name}（傷害 +${Math.round(bonus * 100)}%）` })
        bump(e.type)
        break
      }
      case 'numericAdvantage': {
        // mordres 征服者氣場：我方存活數 > 敵方存活數時，自身攻擊 +value
        if (alliesOf(actor).length > enemiesOf(actor).length) {
          applyStatus(actor.statuses, { kind: 'atkBoost', value: num(e.value, 0.15), turnsLeft: dur, label: skill.name, appliedTurn: turn })
          bump(e.type)
        }
        break
      }
      case 'teamAtkDebuff': {
        // mordres 征服者的秩序：敵方全體攻擊 -enemyValue，我方全體防禦 +allyDefBoost
        for (const t of enemiesOf(actor))
          applyStatus(t.statuses, { kind: 'atkBoost', value: -num(e.enemyValue, 0.25), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        for (const t of alliesOf(actor))
          applyStatus(t.statuses, { kind: 'defBoost', value: num(e.allyDefBoost, 0.2), turnsLeft: dur, label: skill.name, appliedTurn: turn })
        bump(e.type)
        break
      }
      case 'berserk': {
        // ignis 業火不滅：HP<30% 時攻速 ×spdMultiplier、冷卻重置，只觸發一次
        if (!actor.enraged) {
          actor.enraged = true
          actor.cooldowns = {}
          applyStatus(actor.statuses, { kind: 'spdBoost', value: num(e.spdMultiplier, 2) - 1, turnsLeft: Infinity, label: skill.name, appliedTurn: turn })
          bump(e.type)
        }
        break
      }
      case 'dmgBoostVsIndependent': {
        actor.dmgVsIndependent = num(e.value, 0.2)
        bump(e.type)
        break
      }
      case 'reduceEnemyEvade': {
        teams[actor.side === 'ally' ? 'enemy' : 'ally'].evadeSuppressedBy = Math.max(
          teams[actor.side === 'ally' ? 'enemy' : 'ally'].evadeSuppressedBy,
          num(e.value, 0.5),
        )
        bump(e.type)
        break
      }
      case 'teamHitBoost':
      case 'dmgBoostVsDebuffed':
        bump(e.type)
        break
      case 'nextTurnMustHit': {
        applyStatus(actor.statuses, {
          kind: 'empower',
          value: 1,
          turnsLeft: 2,
          label: skill.name,
          appliedTurn: turn,
          mustHit: true,
          ignoreShield: e.ignoreShield === true,
        })
        bump(e.type)
        break
      }
      default:
        noteStub(e.type)
        log({ type: 'stub', turn, sourceUid: actor.uid, message: `（${skill.name}：未知效果「${e.type}」）` })
    }
  }

  // ── 一次攻擊（含多段 / 迴避 / lifeSteal / onHit）──
  function performAttack(actor: Combatant, skill: Skill, forcedTarget?: Combatant) {
    const empower = takeEmpower(actor.statuses)
    const mustHit = skill.mustHit === true || empower?.mustHit === true
    const ignoreShield = empower?.ignoreShield === true
    const mb = (actor.mountAlive ? skill.mountBonus : undefined) ?? {}

    const hitCount = skill.type === 'multiHit' ? Math.max(1, num(skill.hits, 1)) : 1
    const lifeStealEff = effectsOf(skill).find((e) => e.type === 'lifeSteal')
    if (effectsOf(skill).some((e) => e.type === 'eachHitIndependent')) bump('eachHitIndependent')

    const primary = forcedTarget ?? pickTarget(actor, skill.piercing)
    if (!primary && skill.type !== 'aoe') return

    let aoeTargets: Combatant[] = []
    if (skill.type === 'aoe') {
      aoeTargets = enemiesOf(actor)
      if (skill.target === 'frontRow') {
        const fr = aoeTargets.filter((c) => c.row === 'front')
        if (fr.length) aoeTargets = fr
      }
    }

    log({
      type: 'action',
      turn,
      sourceUid: actor.uid,
      message: `${actor.knight.name} 使用「${skill.name}」${skill.cost ? `（-${skill.cost} SP）` : ''}${mustHit ? '［必中］' : ''}`,
      meta: { skillId: skill.id },
    })

    const strike = (tgt: Combatant, power: number, isBonus = false, forceHit = false) => {
      if (!tgt.alive) return
      const suppress = teams[tgt.side].evadeSuppressedBy
      if (!mustHit && !forceHit) {
        const ev = totalEvade(tgt.statuses, suppress)
        if (ev > 0 && rng() < ev) {
          log({ type: 'evade', turn, sourceUid: actor.uid, targetUid: tgt.uid, message: `→ ${tgt.knight.name} 迴避！` })
          bump('evade')
          return
        }
      }
      if (tgt.ultimateShield > 0 && isUltimate(skill) && !isBonus) {
        tgt.ultimateShield--
        log({ type: 'damage', turn, sourceUid: actor.uid, targetUid: tgt.uid, amount: 0, message: `→ ${tgt.knight.name}「禁區守護」抵銷必殺！` })
        bump('immuneUltimate')
        return
      }
      // gratos 要塞行軍 nullify
      if (tgt.nullify) {
        const rawEst = effAtk(actor) * power * dmgScale * (100 / (100 + effDef(tgt)))
        const ch = rawEst >= tgt.nullify.threshold * tgt.maxHp ? tgt.nullify.boosted : tgt.nullify.base
        if (rng() < ch) {
          log({ type: 'damage', turn, sourceUid: actor.uid, targetUid: tgt.uid, amount: 0, message: `→ ${tgt.knight.name}「要塞行軍」無效化了攻擊！` })
          bump('nullifyChance')
          return
        }
      }
      const dmg = computeDamage(actor, tgt, { ...skill, power }, { ignoreShield })
      tgt.hp -= dmg
      log({
        type: 'damage',
        turn,
        sourceUid: actor.uid,
        targetUid: tgt.uid,
        amount: dmg,
        message: `→ ${tgt.knight.name} 受到 ${dmg}${isBonus ? '（追擊）' : ''} 傷害（HP ${Math.max(0, tgt.hp)}/${tgt.maxHp}）${
          tgt.row === 'back' && skill.type !== 'aoe' && !skill.piercing && canFly(actor) ? '［飛行·後排］' : ''
        }`,
      })
      if (lifeStealEff) {
        // v3 manticore：吸血率 +lifeStealBonus（加法）、終焰深淵 lifeStealDoubled 翻倍
        const rate = (num(lifeStealEff.value, 0.08) + (actor.mountAlive ? actor.mountLifeStealBonus : 0)) * (mb.lifeStealDoubled ? 2 : 1)
        const heal = Math.round(dmg * rate)
        if (heal > 0) {
          actor.hp = Math.min(actor.maxHp, actor.hp + heal)
          bump('lifeSteal')
        }
      }
      // Q12：坐騎有獨立 HP，AoE 會附帶打到（單體技不會）；歸零就失去合體攻擊加成
      if (skill.type === 'aoe' && tgt.mountAlive) {
        tgt.mountHp -= dmg
        if (tgt.mountHp <= 0) {
          tgt.mountHp = 0
          tgt.mountAlive = false
          log({ type: 'ko', turn, targetUid: tgt.uid, message: `　${tgt.knight.name} 的坐騎「${tgt.mount?.name}」倒下，失去合體加成` })
        }
      }
      onDamageReceived(tgt, dmg, actor)
      checkDeath(tgt)

      // viel 虛空餘響（onHit）
      if (!isBonus) fireOnHit(actor, tgt)
    }

    if (skill.type === 'aoe') {
      for (const t of aoeTargets) strike(t, num(skill.power, 1))
      // v3 jadegryphon 翠嵐天翔：額外再打一次後排
      if (mb.addAoeHit) {
        const backers = aoeTargets.filter((t) => t.alive && t.row === 'back')
        if (backers.length) log({ type: 'action', turn, sourceUid: actor.uid, message: `　嵐翼掠過後排，再度貫穿！` })
        for (const t of backers) strike(t, num(skill.power, 1), true)
      }
    } else if (skill.type === 'multiHit') {
      for (let h = 0; h < hitCount; h++) {
        const t = skill.singleTarget ? primary : pickTarget(actor, skill.piercing)
        if (t && t.alive) strike(t, num(skill.power, 1))
      }
    } else {
      if (primary) {
        strike(primary, num(skill.power, 1))
        // v3 moonstagg 月輪獵殺：followUpChance 觸發「協同突刺」追擊（followUpPower，必中）
        if (primary.alive && mb.followUpChance != null && rng() < num(mb.followUpChance)) {
          log({ type: 'action', turn, sourceUid: actor.uid, message: `　蝕影協同突刺！` })
          strike(primary, num(mb.followUpPower, 0.8), true, mb.mustHitFollowUp === true)
        }
      }
    }

    // v3 manticore 終焰深淵：附加「腐毒」（每回合蝕去 poisonPerTick × maxHp，不可清除）
    if (mb.addPoison && primary?.alive) {
      applyStatus(primary.statuses, {
        kind: 'dot',
        value: Math.max(1, Math.round(primary.maxHp * num(mb.poisonPerTick, 0.03))),
        turnsLeft: num(mb.poisonDuration, 3),
        label: '腐毒',
        appliedTurn: turn,
        sourceUid: actor.uid,
        uncleansable: true,
      })
      bump('addPoison')
    }

    // 命中後才附加的效果（dot / freeze / defDown / curse / selfDot …）
    // aoe 對全體 postTargets；單體對 primary。target:'self' 的效果（selfDot / 反噬）套在施術者身上。
    const postTargets = skill.type === 'aoe' ? aoeTargets : primary ? [primary] : []
    const POST_KINDS = [
      'dot', 'selfDot', 'freeze', 'stun', 'stunSoft', 'airborne', 'chill', 'gravityBind',
      'defDown', 'permDefDown', 'curse', 'spdDown', 'starcoreDown', 'frostCrack', 'dispel',
    ]
    for (const e of effectsOf(skill)) {
      if (!POST_KINDS.includes(e.type)) continue
      if (e.target === 'self') {
        applyEffect(e, skill, actor, actor)
      } else {
        for (const t of postTargets.filter((x) => x.alive)) applyEffect({ ...e, target: 'enemy' }, skill, actor, t)
      }
    }

    // 自帶 self 護盾（虛空裂切）
    for (const e of effectsOf(skill)) {
      if (e.type === 'shield' && (e.target === 'self' || !e.target)) {
        // v3 voidgryphon 虛空雙翼：reflectShieldBoost 讓護盾吸收率 +20%（0.3 → 0.5）
        applyStatus(actor.statuses, { kind: 'shield', value: num(e.value) + num(mb.reflectShieldBoost), turnsLeft: num(e.duration, 1), label: skill.name, appliedTurn: turn })
        bump('shield')
      }
      if (e.type === 'overloadChance' && rng() < num(e.chance, 0.2)) {
        const oe = e.overloadEffect as SkillEffect | undefined
        const p = num(oe?.power, 0.8)
        for (const t of enemiesOf(actor)) strike(t, p, true)
        log({ type: 'action', turn, sourceUid: actor.uid, message: `　過載！追加範圍打擊` })
        bump('overloadChance')
      }
    }
  }

  function fireOnHit(actor: Combatant, tgt: Combatant) {
    for (const p of actor.passives) {
      if (p.trigger !== 'onHit') continue
      for (const e of effectsOf(p)) {
        if (e.type !== 'stackMark') continue
        if (rng() >= num(e.chance, 0.35)) continue
        actor.voidMarks[tgt.uid] = (actor.voidMarks[tgt.uid] ?? 0) + 1
        bump('stackMark')
        if (actor.voidMarks[tgt.uid] >= num(e.maxStack, 3)) {
          actor.voidMarks[tgt.uid] = 0
          const oma = e.onMaxStack as SkillEffect | undefined
          const dmg = computeDamage(actor, tgt, { ...BASIC_ATTACK, power: num(oma?.power, 1.5) }, {})
          tgt.hp -= dmg
          log({ type: 'damage', turn, sourceUid: actor.uid, targetUid: tgt.uid, amount: dmg, message: `　虛空餘響爆發！${tgt.knight.name} 受到 ${dmg} 追擊` })
          bump('bonusAttack')
          checkDeath(tgt)
        }
      }
    }
  }

  // ── AI ──
  function chooseAction(actor: Combatant): { skill: Skill; target?: Combatant } | undefined {
    const usable = actor.skills.filter(
      (s) => s.cost <= actor.sp && (actor.cooldowns[s.id] ?? 0) === 0 && allowedSkill(actor.statuses, s.id),
    )
    if (!usable.length) return undefined
    const target = pickTarget(actor)

    // 治癒
    const heal = usable.find((s) => s.type === 'heal')
    if (heal && alliesOf(actor).some((c) => c.hp / c.maxHp < 0.5)) return { skill: heal, target }

    // buff / special / debuff（避免整場只輔助）。同時可用時挑「還有意義且最貴」的一個 —
    // 招牌技通常 cost 較高，之前用 find() 會被前面的便宜輔助技蓋掉。
    const supports = usable
      .filter((s) => {
        if (s.type === 'attack' || s.type === 'aoe' || s.type === 'multiHit') return false
        const es = effectsOf(s)
        if (es.some((e) => e.type === 'stackAtkBoost')) {
          const max = num(es.find((e) => e.type === 'stackAtkBoost')!.maxStacks, 7)
          return actor.stacks < max
        }
        if (es.some((e) => e.type === 'atkBoost' || e.type === 'dualAttrBoost' || e.type === 'teamAtkBoost'))
          return !actor.statuses.some((st) => st.kind === 'atkBoost' && st.label === s.name)
        return true
      })
      .sort((a, b) => b.cost - a.cost)
    if (supports.length && rng() < 0.45) return { skill: supports[0], target }

    if (!target) return undefined

    // 敵方有增益時，優先用帶驅散的攻擊技（elixia 聖裁光柱）
    const dispelAtk = usable.find(
      (s) => (s.type === 'attack' || s.type === 'aoe') && effectsOf(s).some((e) => e.type === 'dispel'),
    )
    if (dispelAtk) {
      const buffed = (c: Combatant) =>
        c.statuses.some(
          (st) =>
            st.kind === 'invincible' ||
            st.kind === 'thorns' ||
            st.kind === 'critBoost' ||
            st.kind === 'empower' ||
            (st.value > 0 && (st.kind === 'atkBoost' || st.kind === 'defBoost' || st.kind === 'shield' || st.kind === 'evade')),
        )
      const buffedFoe = enemiesOf(actor).find(buffed)
      if (buffedFoe && rng() < 0.7) return { skill: dispelAtk, target: buffedFoe }
    }

    const attacks = usable
      .filter((s) => s.type === 'attack' || s.type === 'aoe' || s.type === 'multiHit')
      .sort((a, b) => {
        // 坐騎 powerMultiplier 也算進 AI 權重，否則升級版單體技（太陽神裁 ×1.5）永遠輸給 AoE
        const w = (s: Skill) =>
          num(s.power, 1) *
          (actor.mountAlive ? num(s.mountBonus?.powerMultiplier, 1) : 1) *
          (s.type === 'aoe' ? 2.2 : s.type === 'multiHit' ? num(s.hits, 1) * 0.9 : 1)
        return w(b) - w(a)
      })

    const maxCost = Math.max(...actor.skills.map((s) => s.cost))
    if (maxCost > actor.sp && actor.sp < actor.spCap) {
      const free = attacks.find((s) => s.cost === 0)
      if (free) return { skill: free, target }
    }
    return { skill: attacks[0] ?? BASIC_ATTACK, target }
  }

  // ── 開場：always / battleStart 被動 ──
  log({ type: 'battle-start', turn: 0, message: '戰鬥開始（3v3）' })
  for (const s of ['ally', 'enemy'] as const)
    for (const ar of teams[s].resonances)
      log({ type: 'resonance', turn: 0, message: `${s === 'ally' ? '我方' : '敵方'}共鳴陣：${ar.resonance.name} — ${ar.resonance.description}`, meta: { side: s, id: ar.resonance.id } })

  for (const c of combatants) {
    for (const p of c.passives) {
      if (p.trigger === 'always' || p.trigger === 'battleStart') applyEffects(p, c, undefined, c)
      // nullifyChance（gratos 要塞行軍）語意上是「整場持續的防禦特性」，即使掛在
      // onDamageReceived 觸發上也在開場就先設定好，之後每次受擊直接讀 c.nullify。
      else if (p.trigger === 'onDamageReceived' && effectsOf(p).some((e) => e.type === 'nullifyChance'))
        applyEffects(p, c, undefined, c)
    }
  }

  const hpPct = (s: Side) => {
    const g = combatants.filter((c) => c.side === s)
    const cur = g.reduce((a, c) => a + Math.max(0, c.hp), 0)
    const mx = g.reduce((a, c) => a + c.maxHp, 0)
    return mx === 0 ? 0 : cur / mx
  }

  let reason: BattleResult['reason'] = 'turn-limit'

  while (turn < maxTurns) {
    turn++
    const turnStartBegin = events.length
    log({ type: 'turn-start', turn, message: `── 第 ${turn} 回合 ──` })

    for (const c of combatants) {
      if (!c.alive) continue
      c.sp = Math.min(c.spCap, c.sp + c.spRegen)
      for (const k of Object.keys(c.cooldowns)) if (c.cooldowns[k] > 0) c.cooldowns[k]--
      for (const p of c.passives) {
        if (p.trigger !== 'turnStart') continue
        applyEffects(p, c, undefined, c)
      }
    }
    void spMode
    yield { kind: 'turn-start', turn, events: events.slice(turnStartBegin), combatants }

    const order = combatants.filter((c) => c.alive).sort((a, b) => effSpd(b) - effSpd(a) || (rng() < 0.5 ? -1 : 1))
    // 項目 B 換人代打（主人 2026-09-12 拍板）：本回合已經行動過的人——包含被叫去代打、提前
    // 用掉這回合機會的替補——輪到自己原本的速度排序位置時整個跳過，不會再行動第二次；
    // 「不補行動格」＝代打掉的那個原始 actor 這回合就是沒出手，不會有另一個格位補給它。
    // 下一回合重新計算 order，跟這回合誰代打了誰完全無關。
    const actedThisRound = new Set<string>()
    const usableSkillsOf = (c: Combatant) =>
      c.skills.filter((s) => s.cost <= c.sp && (c.cooldowns[s.id] ?? 0) === 0 && allowedSkill(c.statuses, s.id))
    const canFuseOf = (c: Combatant) => !!c.mount && !c.mountAlive && c.mountCharge >= 1

    for (const actor of order) {
      if (!actor.alive) continue
      if (actedThisRound.has(actor.uid)) continue
      if (sideWiped('ally') || sideWiped('enemy')) break
      const stepBegin = events.length
      if (isSkipped(actor.statuses, rng)) {
        log({ type: 'skip', turn, sourceUid: actor.uid, message: `${actor.knight.name} 無法行動` })
        yield { kind: 'unit-acted', actorUid: actor.uid, events: events.slice(stepBegin), combatants }
        continue
      }

      // 坐騎合體：充能滿了才「可以」合體，實際觸發仍是一次主動行動（佔用這個單位的整個回合，
      // 不是免費疊加的被動加成）——玩家單位由 ActionBar 的按鈕手動決定要不要按；
      // AI 沒有按鈕可點，charge 滿了視同一定會按（見 Combatant.mountCharge 註解）。
      const canFuseNow = canFuseOf(actor)

      let action: { skill: Skill; target?: Combatant } | undefined
      let fused = false
      // realActor：這一步真正出手的人。預設就是輪到的 actor；項目 B 換人代打時改成 swappable
      // 裡玩家挑的那一位——下面 cost 扣除／冷卻／坐騎充能／攻擊/效果全部要用 realActor，不能再用 actor。
      let realActor = actor
      if (isPlayerControlled(actor)) {
        const usable = usableSkillsOf(actor)
        const substitutes = combatants.filter(
          (c) => c.alive && c.uid !== actor.uid && isPlayerControlled(c) && !actedThisRound.has(c.uid),
        )
        const swappable = substitutes.map((c) => ({
          uid: c.uid,
          usableSkillIds: usableSkillsOf(c).map((s) => s.id),
          canFuse: canFuseOf(c),
        }))
        const anyoneCanAct =
          usable.length > 0 || canFuseNow || swappable.some((s) => s.usableSkillIds.length > 0 || s.canFuse)
        if (!anyoneCanAct) {
          action = undefined
        } else {
          const choice = yield {
            kind: 'need-action',
            request: { actorUid: actor.uid, turn, usableSkillIds: usable.map((s) => s.id), canFuse: canFuseNow, swappable },
            combatants,
          }

          if (choice?.actAsUid && choice.actAsUid !== actor.uid) {
            const sub = combatants.find((c) => c.uid === choice.actAsUid)
            if (sub && sub.alive && isPlayerControlled(sub) && !actedThisRound.has(sub.uid)) {
              realActor = sub
              actedThisRound.add(sub.uid)
            }
          }
          const realUsable = realActor === actor ? usable : usableSkillsOf(realActor)
          const realCanFuseNow = realActor === actor ? canFuseNow : canFuseOf(realActor)

          if (choice?.skillId === 'mount-fuse' && realCanFuseNow) {
            performMountFuse(realActor)
            fused = true
          } else if (choice?.skillId) {
            const chosenSkill = realUsable.find((s) => s.id === choice.skillId)
            let chosenTarget = choice.targetUid ? byUid(choice.targetUid) : undefined
            // 引擎自己驗證目標合法性（前後排／存活／陣營），玩家亂指也不會破壞規則 —— 不合法就交回 pickTarget 自動選。
            if (
              chosenTarget &&
              (!chosenTarget.alive ||
                chosenTarget.side === realActor.side ||
                (chosenTarget.row === 'back' &&
                  chosenSkill?.type !== 'aoe' &&
                  !chosenSkill?.piercing &&
                  !canFly(realActor)))
            ) {
              chosenTarget = undefined
            }
            action = chosenSkill ? { skill: chosenSkill, target: chosenTarget } : chooseAction(realActor)
          } else {
            action = chooseAction(realActor)
          }
        }
      } else if (canFuseNow) {
        performMountFuse(actor)
        fused = true
      } else {
        action = chooseAction(actor)
      }

      if (fused) {
        yield { kind: 'unit-acted', actorUid: realActor.uid, events: events.slice(stepBegin), combatants }
        continue
      }

      if (!action) continue
      const { skill, target } = action
      if (skill.cost > realActor.sp) continue
      realActor.sp -= skill.cost
      if (skill.cooldown) realActor.cooldowns[skill.id] = skill.cooldown
      gainMountCharge(realActor, skill.id === 'normal' ? 0.15 : 0.2)

      if (skill.type === 'attack' || skill.type === 'aoe' || skill.type === 'multiHit') {
        performAttack(realActor, skill, target)
      } else {
        applyEffects(skill, realActor, target)
        log({ type: skill.type === 'buff' ? 'buff' : 'debuff', turn, sourceUid: realActor.uid, message: `${realActor.knight.name} 使用「${skill.name}」${skill.cost ? `（-${skill.cost} SP）` : ''}` })
      }

      // v3 判讀②：enemyUsesSkill — 敵方使用主動技（cost > 0）時，對方陣營的對應被動發動（moonstagg 蝕影反標）
      if (skill.cost > 0 && realActor.alive) {
        for (const foe of enemiesOf(realActor))
          for (const p of foe.passives) if (p.trigger === 'enemyUsesSkill') applyEffects(p, foe, realActor)
      }

      yield { kind: 'unit-acted', actorUid: realActor.uid, events: events.slice(stepBegin), combatants }
    }

    const turnEndBegin = events.length

    // turnEnd 被動（laros 永恆日輝：每回合末回血）
    for (const c of combatants) {
      if (!c.alive) continue
      for (const p of c.passives) {
        if (p.trigger !== 'turnEnd') continue
        applyEffects(p, c, undefined, c)
      }
    }

    for (const c of combatants) {
      if (!c.alive) continue
      const { dotDamage, regenHeal, labels } = tickStatuses(c.statuses, turn)
      if (regenHeal > 0) healUnit(c, regenHeal, c.knight.name, '再生')
      if (dotDamage > 0) {
        c.hp -= dotDamage
        log({ type: 'dot', turn, targetUid: c.uid, amount: dotDamage, message: `${c.knight.name} 受到「${labels.join('、')}」${dotDamage} 持續傷害（HP ${Math.max(0, c.hp)}/${c.maxHp}）` })
        onDamageReceived(c, dotDamage)
        checkDeath(c)
      }
    }

    yield { kind: 'turn-end', turn, events: events.slice(turnEndBegin), combatants }

    if (sideWiped('ally') || sideWiped('enemy')) {
      reason = 'wipe'
      break
    }
  }

  const allyPct = hpPct('ally')
  const enemyPct = hpPct('enemy')
  let winner: BattleResult['winner']
  if (sideWiped('enemy') && !sideWiped('ally')) winner = 'ally'
  else if (sideWiped('ally') && !sideWiped('enemy')) winner = 'enemy'
  else if (allyPct > enemyPct) winner = 'ally'
  else if (enemyPct > allyPct) winner = 'enemy'
  else winner = 'draw'

  log({
    type: 'battle-end',
    turn,
    message:
      reason === 'wipe'
        ? `戰鬥結束：${winner === 'ally' ? '我方勝利' : winner === 'enemy' ? '敵方勝利' : '平手'}`
        : `達 ${turn} 回合上限，HP% 判定：我方 ${(allyPct * 100).toFixed(1)}% vs 敵方 ${(enemyPct * 100).toFixed(1)}%`,
  })

  return { winner, turns: turn, reason, allyHpPct: allyPct, enemyHpPct: enemyPct, events, effectHits }
}

/**
 * 全自動跑到底的原始介面（沒有任何單位是玩家操控）——內部就是把 runBattleSteps() 的
 * generator 用 while(!done) 全部 drain 掉，行為、輸出跟重構前逐字相同。
 */
export function simulateBattle(config: BattleConfig): BattleResult {
  const gen = runBattleSteps(config)
  let r = gen.next()
  while (!r.done) r = gen.next()
  return r.value
}
