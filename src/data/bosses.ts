// 永恆的聖域（ETERNAL_SANCTUARY_SPEC_v1.0）——世界級 Boss 資料。
// 星核君主・永恆不是一般 3v3 名冊成員（不進 KNIGHTS／圖鑑／選角），只由 getKnight() 的 fallback
// 查得到，讓戰鬥畫面（BattleField／UnitCard 的 getKnight prop）跟引擎共用同一套查表。
//
// 平衡數字（本體 HP、招式倍率、冷卻）規格書沒有給，全部集中在這個檔案最上面的
// 「TUNING」區，跑過 AI 對打模擬後定案（見 CLAUDE.md Session 24），要調整只改這一區。
import type { Knight } from './types'
import type { Skill } from './skills'

// ── TUNING（Session 24 模擬定案）───────────────────────────────────────
/**
 * 規格書 3-1 寫 hp: 5（「一般騎士 HP × 5」的倍率）。但本體 def 999 讓每一擊只剩約 17%
 * （200/(200+999)），實際耐久遠高於帳面 HP——若用一般騎士 HP（5000~10000）× 5，
 * 300 場 AI 對打沒有一場打得完。基準值改用模擬校準（Session 24），本體帳面 HP = 基準 × 倍率。
 */
export const BOSS_BASE_HP = 1300
export const BOSS_HP_MULTIPLIER = 5
/** 星核王盾獨立 HP（規格書 3-1／4-2 建議值 3000）。 */
export const BOSS_SHIELD_HP = 3000
/** 本體 HP 降到這個比例以下觸發覺醒（規格書 4-3：50%）。 */
export const BOSS_AWAKEN_AT = 0.5
/** 聖域氣場壓制：第二階段起玩家全體承受傷害 +15%（規格書 4-5）。 */
export const BOSS_AURA_DAMAGE_TAKEN = 0.15
/** 廢墟重生・聖域版：復活血量比例／消耗聖域 HP 比例（規格書 4-5）。 */
export const BOSS_REVIVE_HP_PCT = 0.3
export const BOSS_REVIVE_REALM_COST_PCT = 0.5
/** 聖域 HP 池 = 本體最大 HP 的這個比例（規格書只給「消耗聖域 HP 50%」，沒定義聖域 HP，見 CLAUDE.md）。 */
export const BOSS_REALM_HP_RATIO = 0.4
/** 時代見證：玩家隊伍含銀翼時，Boss 技能威力 ×1.5。 */
export const BOSS_SILVERWING_POWER_MULT = 1.5
/** 該關卡回合上限（一般戰鬥 20；Boss 血量高、有兩個階段，放寬到 30）。 */
export const BOSS_MAX_TURNS = 30
const STRIKE_POWER = 0.9
const WRATH_POWER = 1.2
const STRIKE_TARGETS = 2

export const ETERNAL_ID = 'eternal'

export const ETERNAL_KNIGHT: Knight = {
  id: ETERNAL_ID,
  name: '星核君主・永恆',
  nameEn: 'Stellarcore Sovereign · Eternal',
  // 規格書寫 faction: "neutral"，但 Faction 型別只有守護／渾沌／獨立三種，多開一個值會牽動
  // 各處 Record<Faction, …>；用 independent 承接（銀白 STELLAR 旗幟色反而合適），
  // 引擎裡 mordres 的「對獨立陣營加傷」另外對 Boss 排除，見 engine/battle.ts computeDamage。
  faction: 'independent',
  attr: '星核君主・源核',
  coreAttr: 'fusion',
  image: 'Stellarcore Rift Temple Colossus.png',
  maxHp: BOSS_BASE_HP * BOSS_HP_MULTIPLIER,
  atk: 60,
  def: 999,
  spd: 30,
  starcore: 999,
  role: '世界級 Boss',
  rarity: 5,
}

/** 第二階段（合體後）視覺：規格書 8「Boss 合體視覺（第二階段）」。 */
export const ETERNAL_PHASE2_IMAGE = '星核君主與天穹聖駒.png'

/** 第二階段覺醒後的數值（規格書 3-3 表格；addStats 那份跟表格對不上，以表格為準，見 CLAUDE.md）。 */
export const ETERNAL_PHASE2_STATS = { atk: 110, spd: 80, sizeMult: 3 }

export interface BossConfig {
  knightId: string
  skills: Skill[]
  shieldHp: number
  awakenAt: number
  phase2: { atk: number; spd: number; sizeMult: number }
  auraDamageTaken: number
  reviveHpPct: number
  reviveRealmCostPct: number
  realmHpRatio: number
  silverWingPowerMult: number
  maxTurns: number
  /** 時代見證：消除玩家隊伍的陣營加傷共鳴（守護／渾沌）。 */
  nullifyFactionResonances: string[]
}

/** 引擎依 skill.id 特判的 Boss 招式 id（performBossSkill 用）。 */
export const BOSS_SKILL_IDS = {
  strike: 'eternal-strike',
  refuge: 'stellar-refuge',
  judgment: 'temple-judgment',
  wrath: 'stellar-wrath',
  chant: 'fusion-chant',
} as const

export const ETERNAL_SKILLS: Skill[] = [
  {
    id: BOSS_SKILL_IDS.strike,
    name: '聖殿裁擊',
    cost: 0,
    type: 'multiHit',
    power: STRIKE_POWER,
    hits: STRIKE_TARGETS,
    spreadTargets: true,
    effectSummary: '審判之刃連斬前排 2 次',
    tags: ['single'],
  },
  {
    id: BOSS_SKILL_IDS.refuge,
    name: '星核庇護',
    cost: 0,
    type: 'special',
    cooldown: 5,
    effectSummary: '自身回血 15%＋清除負面狀態',
    tags: ['heal', 'self'],
  },
  {
    id: BOSS_SKILL_IDS.judgment,
    name: '聖殿審判',
    cost: 0,
    type: 'debuff',
    cooldown: 4,
    effectSummary: '玩家全體攻擊 -40%・星核力 -50%（2 回合）',
    tags: ['aoe', 'debuff'],
  },
  {
    id: BOSS_SKILL_IDS.wrath,
    name: '星核君臨・天罰',
    cost: 0,
    type: 'aoe',
    power: WRATH_POWER,
    cooldown: 3,
    effectSummary: '全體極傷＋最高攻擊騎士 SP 清零',
    tags: ['aoe'],
  },
  {
    id: 'age-witness',
    name: '時代見證',
    cost: 0,
    type: 'passive',
    trigger: 'always',
    effectSummary: '消除陣營加傷；隊伍含銀翼則威力 +50%',
    tags: ['passive'],
  },
  {
    id: 'realm-aura',
    name: '聖域氣場',
    cost: 0,
    type: 'passive',
    trigger: 'always',
    effectSummary: '第二階段：玩家全體承受傷害 +15%',
    tags: ['passive'],
  },
  {
    id: 'ruin-rebirth',
    name: '廢墟重生・聖域版',
    cost: 0,
    type: 'passive',
    trigger: 'hpZero',
    effectSummary: '第二階段限一次：消耗聖域 HP 50%，以 30% HP 復活',
    tags: ['passive', 'heal'],
  },
]

export const ETERNAL_BOSS: BossConfig = {
  knightId: ETERNAL_ID,
  skills: ETERNAL_SKILLS,
  shieldHp: BOSS_SHIELD_HP,
  awakenAt: BOSS_AWAKEN_AT,
  phase2: ETERNAL_PHASE2_STATS,
  auraDamageTaken: BOSS_AURA_DAMAGE_TAKEN,
  reviveHpPct: BOSS_REVIVE_HP_PCT,
  reviveRealmCostPct: BOSS_REVIVE_REALM_COST_PCT,
  realmHpRatio: BOSS_REALM_HP_RATIO,
  silverWingPowerMult: BOSS_SILVERWING_POWER_MULT,
  maxTurns: BOSS_MAX_TURNS,
  nullifyFactionResonances: ['holy-guard', 'chaos-scorched'],
}

export const BOSS_KNIGHTS: Record<string, Knight> = { [ETERNAL_ID]: ETERNAL_KNIGHT }
export const BOSS_CONFIGS: Record<string, BossConfig> = { [ETERNAL_ID]: ETERNAL_BOSS }
