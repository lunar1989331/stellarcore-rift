// 星核裂紀 · 技能資料
// Schema 依 Mina《MINA_ANSWERS.md》Q1（21 位騎士官方技能書）＋《MINA_ANSWERS_v2.md》覆核與 Q13/Q15 決策。
//
// 數值換算原則：
//   - 技能效果的 `value` 一律是小數倍率（0.35 = 35%），唯獨 dot / selfDot 例外（見下）。
//   - dot / selfDot 的 `value` 是 DOT_FORMULA 的技能係數：實際每回合傷害 =
//     floor(攻擊者atk × value × DAMAGE_SCALE/3)（Mina v2 Q15 + v3 Q19，取代 v1 Q9 的「maxHp 百分比」版本）。
//     細節與「為何用技能自己的 value 而不是 Mina 範例裡硬寫的 0.15」見 engine/battle.ts 的 DOT_FORMULA 註解。
//   - Mina 原文用詞與引擎既有效果字串不完全一致時，直接對應到引擎已支援的 type
//     （例：markTarget → markLowestHp、knockback → stunSoft、
//     fortify → defBoost+thorns、taunt.damageRedirect → taunt）。對應關係見各技能註解。
//   - 仍需要引擎沒有的系統（隱藏資訊、位移、量表公式）的效果維持 stub，見 engine/effects.ts。

// ── 型別 ──────────────────────────────────────────────

export type SkillType =
  | 'attack'
  | 'aoe'
  | 'buff'
  | 'debuff'
  | 'heal'
  | 'special'
  | 'multiHit'
  | 'passive'

/** 被動 / 觸發時機 */
export type PassiveTrigger =
  | 'always' // 開場即生效的常駐光環
  | 'battleStart'
  | 'turnStart'
  | 'turnEnd'
  | 'hpBelow30'
  | 'hpBelow20'
  | 'allyDeath'
  | 'hpZero'
  | 'onHit' // 施術者自己命中敵人時（目前僅 viel 虛空餘響使用）
  | 'onDamageReceived' // 受到攻擊時（Mina Q1 原文多寫作 onHit，語意為「被擊中」，見各技能註解）
  | 'allyHpBelow30' // 有隊友 HP < 30% 時（每次傷害結算後掃描；v3 ashdragon 燼炎）
  | 'enemyUsesSkill' // 敵方使用主動技（cost > 0）時（v3 moonstagg 蝕影）

/** UI 改善規格書 v2.0 項目 B：技能按鈕 hover 展開用的分類標籤，跟 SkillType 分開存在——
 * 一個技能常常橫跨好幾種語意（例如「全體＋持續傷害」），SkillType 只能選一個。 */
export type SkillTag = 'single' | 'aoe' | 'dot' | 'heal' | 'buff' | 'debuff' | 'passive' | 'self'

export type EffectTarget =
  | 'self'
  | 'enemy'
  | 'oneAlly'
  | 'oneEnemy'
  | 'allAllies'
  | 'allAliveAllies'
  | 'allEnemies'
  | 'all'
  | 'triggerUnit'
  | 'attacker'

/**
 * 效果物件。`type` 決定語意；其餘欄位依 type 而定。
 * 用 index signature 接住 Mina 技能書的所有臨時欄位，引擎按需讀取。
 */
export interface SkillEffect {
  type: string
  value?: number
  duration?: number
  target?: EffectTarget
  name?: string
  chance?: number
  [key: string]: unknown
}

export interface Skill {
  id: string
  name: string
  /** SP 消耗（0–5）；被動固定 0 */
  cost: number
  type: SkillType
  /** 傷害倍率（1.0 = 基準）。attack / aoe / multiHit 用 */
  power?: number
  /** 無視迴避 */
  mustHit?: boolean
  /** 無視前後排保護（可直接打後排；Mina Q3：後排原則上只受 AoE 影響，piercing 是例外） */
  piercing?: boolean
  /** 多段：命中次數 */
  hits?: number
  /** 多段：集中單一目標 */
  singleTarget?: boolean
  /** 多段：分散到不同目標 */
  spreadTargets?: boolean
  /** 指定目標範圍（例：'frontRow'） */
  target?: string
  /** 冷卻回合數（施放後 N 回合內不可再用） */
  cooldown?: number
  /** multiHit 附註（frost-joint-hunt：必定觸發某效果） */
  mustTrigger?: string
  /** 被動觸發時機 */
  trigger?: PassiveTrigger
  effect?: SkillEffect | SkillEffect[]
  /**
   * 坐騎合體疊加效果（Mina v3 判讀①：疊加而非替換，原技能底層保留）。
   * 由 engine/battle.ts 的 mergeMountSkills() 依 mounts.ts 的 upgradeOverlay 掛上，
   * 可能的欄位：powerMultiplier / dotName / dotUnhealable / addAoeHit / speedDebuffBoost /
   * dotMaxStacks / aoeExtend / followUpChance / mustHitFollowUp / addPoison / poisonPerTick /
   * lifeStealDoubled / reflectShieldBoost。
   */
  mountBonus?: Record<string, unknown>
  /** 坐騎合體後才顯示的強化名稱（例如「星冠王臨」）；合體前顯示原本的 name。由 mergeMountSkills 依 overlay.name 掛上。 */
  mountName?: string
  /** UI 改善規格書 v2.0 項目 B：技能按鈕 hover 展開的簡短效果說明（20 字以內）。 */
  effectSummary?: string
  /** 項目 B：hover 展開的分類標籤，決定色塊顏色（見 ActionBar 的 TAG_STYLE）。 */
  tags?: SkillTag[]
}

export type SkillBook = Record<string, Skill[]>

/** 把 effect 正規化成陣列 */
export function effectsOf(skill: Skill | undefined): SkillEffect[] {
  if (!skill?.effect) return []
  return Array.isArray(skill.effect) ? skill.effect : [skill.effect]
}

/** 必殺技定義（Q7）：消耗 3 SP 或以上的主動技能；被動（cost===0）不算。 */
export function isUltimate(skill: Skill): boolean {
  return skill.type !== 'passive' && skill.cost >= 3
}

// ── 官方技能書（Mina Q1，逐項導入）────────────────────

export const SKILLS: SkillBook = {
  // ═══════════════ 獨立騎士 ═══════════════

  'silver-wing': [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'void-slash',
      name: '虛空裂切',
      cost: 2,
      type: 'attack',
      power: 1.8,
      effect: { type: 'shield', value: 0.3, duration: 1, target: 'self' },
      effectSummary: '單體高傷・自身獲得30%護盾',
      tags: ['single', 'buff'],
    },
    {
      id: 'unknown-resonance',
      name: '頻率共鳴·無名',
      cost: 3,
      type: 'buff',
      effect: [
        { type: 'atkBoost', value: 0.5, duration: 3, target: 'self' },
        // Mina v2 Q15：selfDotPerTurn 明確給了 DOT_FORMULA(attacker) × 1.5，
        // DOT_FORMULA 內建係數是 0.15，所以這裡的技能係數 = 0.15 × 1.5 = 0.225。
        { type: 'selfDot', value: 0.225, duration: 3, target: 'self', name: '頻率反噬' },
      ],
      effectSummary: '自身3回合攻擊+50%・每回合反噬自身',
      tags: ['self', 'buff', 'dot'],
    },
    {
      id: 'starbridge-fade',
      name: '星橋消隱',
      cost: 0,
      type: 'passive',
      trigger: 'hpBelow30',
      effect: { type: 'evade', value: 1.0, duration: 1, maxTriggers: 2 },
      effectSummary: 'HP<30%自動迴避100%（限2次）',
      tags: ['passive'],
    },
  ],

  zephyr: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'arcane-seal',
      name: '秘典封印術',
      cost: 2,
      type: 'debuff',
      effect: [
        { type: 'cdExtend', value: 3, target: 'enemy' },
        { type: 'starcoreDown', value: 0.4, target: 'enemy' },
      ],
      effectSummary: '單體技能冷卻+3・星核力-40%',
      tags: ['single', 'debuff'],
    },
    {
      id: 'third-resonance',
      name: '遺忘術式·第三共鳴',
      cost: 3,
      type: 'buff',
      effect: {
        type: 'dualAttrBoost',
        value: 0.2,
        duration: 2,
        target: 'allAllies',
        bonusIfSilverWing: 2.0,
      },
      effectSummary: '全體雙屬強化・銀翼在場加倍',
      tags: ['buff', 'aoe'],
    },
    {
      id: 'forbidden-zone',
      name: '禁區結界',
      cost: 0,
      type: 'passive',
      // Mina 原文寫 trigger:'onHit'，但那只在澤菲爾親自命中敵人時才會觸發，
      // 與「禁區結界＝常駐防護罩」的設定不符 —— 沿用先前已驗證可用的 always（推定，待 Mina 覆核）。
      trigger: 'always',
      effect: { type: 'immuneFactionWeakness', target: 'allAllies' },
      effectSummary: '常駐・全體免疫屬性剋制劣勢',
      tags: ['passive'],
    },
  ],

  aiso: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'rune-analyze',
      name: '星核術式解析',
      cost: 2,
      type: 'special',
      // Q13：單機版 = 純資訊展示（UI 顯示敵方技能傾向），不影響 AI 行動
      effect: { type: 'expose', duration: 3, target: 'enemy', immuneChance: 0.25 },
      effectSummary: '單體・曝光技能傾向3回合',
      tags: ['single', 'debuff'],
    },
    {
      id: 'sigil-rewrite',
      name: '符文陣列·星域重寫',
      cost: 3,
      type: 'special',
      // Q13：影響敵方本回合起「固定數值」技能效果 ±30%（DoT / 技能傷害倍率 / buff·debuff 數值）
      effect: { type: 'randomize', scope: 'enemyFixedEffects', variance: 0.3, duration: 2, target: 'allEnemies' },
      effectSummary: '全體敵方技能數值隨機±30%',
      tags: ['aoe', 'debuff'],
    },
    {
      id: 'variable-detect',
      name: '變數偵測',
      cost: 0,
      type: 'passive',
      trigger: 'turnStart',
      effect: {
        type: 'markHighestThreat',
        atkBonus: 0.25,
        hitBonus: 0.2,
        excludeId: 'silver-wing',
      },
      effectSummary: '回合開始標記敵方最高攻擊者',
      tags: ['passive'],
    },
  ],

  // ═══════════════ 守護騎士陣營 ═══════════════

  osirath: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'stellarblade-fall',
      name: '星裁天降',
      cost: 3,
      type: 'attack',
      power: 2.5,
      mustHit: true,
      effectSummary: '單體極傷・必定命中',
      tags: ['single'],
    },
    {
      id: 'starcore-order',
      name: '源核號令',
      cost: 2,
      type: 'buff',
      effect: { type: 'teamAtkBoost', value: 0.35, duration: 2, target: 'allAllies' },
      effectSummary: '全體友方攻擊+35%（2回合）',
      tags: ['buff', 'aoe'],
    },
    {
      id: 'stellar-barrier',
      name: '星域屏障',
      cost: 0,
      type: 'passive',
      trigger: 'allyDeath',
      effect: { type: 'teamShield', value: 0.2, target: 'allAliveAllies', duration: 1 },
      effectSummary: '友方陣亡時全體獲得20%HP護盾',
      tags: ['passive'],
    },
  ],

  elixia: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'holy-purge',
      name: '聖裁光柱',
      cost: 2,
      type: 'attack',
      power: 1.5,
      // Mina：清除目標 1 個增益（非全部）
      effect: { type: 'dispel', target: 'enemy', count: 1 },
      effectSummary: '單體傷害・清除1個增益',
      tags: ['single', 'debuff'],
    },
    {
      id: 'stellar-mend',
      name: '星域聖癒',
      cost: 3,
      type: 'heal',
      effect: {
        type: 'teamHeal',
        value: 0.18,
        target: 'allAllies',
        bonus: { type: 'cleanse', remove: 'oneDebuff' },
      },
      effectSummary: '全體治癒18%HP・清除1個弱化',
      tags: ['heal', 'aoe'],
    },
    {
      id: 'holy-ward',
      name: '聖光庇護',
      cost: 0,
      type: 'passive',
      trigger: 'turnStart',
      effect: { type: 'shield', value: 0.08, duration: 1, target: 'self' },
      effectSummary: '回合開始獲得8%HP護盾',
      tags: ['passive'],
    },
  ],

  laros: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'corona-impact',
      name: '日冕衝擊',
      cost: 2,
      type: 'attack',
      power: 2.0,
      effect: { type: 'dot', value: 0.15, duration: 2, target: 'enemy', name: '灼燒' },
      effectSummary: '單體傷害・附加灼燒2回合',
      tags: ['single', 'dot'],
    },
    {
      id: 'ecliptic-blaze',
      name: '黃道烈焰陣',
      cost: 3,
      type: 'aoe',
      power: 1.2,
      effect: { type: 'dot', value: 0.12, duration: 3, target: 'allEnemies', name: '持續灼燒' },
      effectSummary: '全體傷害・附加持續灼燒3回合',
      tags: ['aoe', 'dot'],
    },
    {
      id: 'eternal-radiance',
      name: '永恆日輝',
      cost: 0,
      type: 'passive',
      trigger: 'turnEnd',
      effect: { type: 'selfHeal', value: 0.05, target: 'self' },
      effectSummary: '回合結束自癒5%HP',
      tags: ['passive'],
    },
  ],

  aivia: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'jade-gale',
      name: '翡翠旋風貫穿',
      cost: 2,
      type: 'aoe',
      power: 1.1,
      effect: { type: 'spdDown', value: 0.25, duration: 2, target: 'allEnemies' },
      effectSummary: '全體傷害・速度-25%（2回合）',
      tags: ['aoe', 'debuff'],
    },
    {
      id: 'life-gale',
      name: '生命嵐息',
      cost: 3,
      type: 'buff',
      effect: [
        { type: 'teamSpdBoost', value: 0.3, duration: 2, target: 'allAllies' },
        // Mina 註記「單體持續再生」但未給數值，比照 selfHeal 慣例取一個溫和值（推定，待 Mina 覆核）
        { type: 'regen', value: 0.05, duration: 2, target: 'oneAlly' },
      ],
      effectSummary: '全體速度+30%・單體隊友持續再生',
      tags: ['buff', 'heal', 'aoe'],
    },
    {
      id: 'star-bridge-sense',
      name: '星橋感知',
      cost: 0,
      type: 'passive',
      trigger: 'turnStart',
      effect: { type: 'spdBoost', value: 0.05, stackable: true, maxStacks: 5, target: 'self' },
      effectSummary: '每回合疊加速度+5%（上限5層）',
      tags: ['passive'],
    },
  ],

  selena: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'moon-arrow',
      name: '月弦星矢',
      cost: 2,
      type: 'attack',
      power: 2.0,
      effect: { type: 'defPierce', value: 0.25 },
      effectSummary: '單體傷害・無視25%防禦',
      tags: ['single'],
    },
    {
      id: 'moon-phase',
      name: '月相轉換',
      cost: 3,
      type: 'special',
      effect: {
        type: 'toggle',
        target: 'self',
        modes: [
          { name: '滿月模式', atkBoost: 0.4 },
          { name: '新月模式', stealth: true, duration: 2 },
        ],
      },
      effectSummary: '切換模式：攻擊+40%或隱身2回合',
      tags: ['self', 'buff'],
    },
    {
      id: 'moon-lock',
      name: '月光鎖定',
      cost: 0,
      type: 'passive',
      trigger: 'turnStart',
      // Mina：標記最低 HP 敵人 +15% 傷害（每回合重新標記）
      effect: { type: 'markLowestHp', value: 0.15 },
      effectSummary: '標記敵方最低血量者，受傷+15%',
      tags: ['passive'],
    },
  ],

  nautrus: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'deep-surge',
      name: '深海衝擊波',
      cost: 2,
      type: 'attack',
      power: 1.6,
      effect: { type: 'defDown', value: 0.15, duration: 2, target: 'enemy', name: '浸透' },
      effectSummary: '單體傷害・防禦-15%（2回合）',
      tags: ['single', 'debuff'],
    },
    {
      id: 'tide-wall',
      name: '遺城潮壁',
      cost: 3,
      type: 'buff',
      effect: { type: 'teamDmgReduce', value: 0.4, duration: 1, target: 'allAllies' },
      effectSummary: '全體受傷-40%（1回合）',
      tags: ['buff', 'aoe'],
    },
    {
      id: 'abyss-adapt',
      name: '深淵適應',
      cost: 0,
      type: 'passive',
      // Mina 原文 trigger:'onHit' → 語意為「被擊中時」，對應引擎的 onDamageReceived
      trigger: 'onDamageReceived',
      effect: { type: 'permDefBoost', value: 0.03, maxStack: 10, target: 'self' },
      effectSummary: '受擊永久疊加防禦+3%（上限10層）',
      tags: ['passive'],
    },
  ],

  frael: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'ice-fang',
      name: '冰牙裂擊',
      cost: 2,
      type: 'attack',
      power: 1.9,
      effect: { type: 'freeze', chance: 0.3, duration: 1, target: 'enemy' },
      effectSummary: '單體傷害・30%機率凍結1回合',
      tags: ['single', 'debuff'],
    },
    {
      id: 'wolf-pack',
      name: '冰狼群襲',
      cost: 3,
      type: 'multiHit',
      hits: 3,
      power: 1.3,
      spreadTargets: true,
      effect: { type: 'freeze', chance: 0.3, duration: 1 },
      effectSummary: '3段分散攻擊・各30%機率凍結',
      tags: ['aoe', 'debuff'],
    },
    {
      id: 'beast-blood',
      name: '獸血沸騰',
      cost: 0,
      type: 'passive',
      trigger: 'onDamageReceived',
      effect: { type: 'permAtkBoost', value: 0.08, maxStack: 10, target: 'self' },
      effectSummary: '受擊永久疊加攻擊+8%（上限10層）',
      tags: ['passive'],
    },
  ],

  greln: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'molten-smash',
      name: '熔金重錘',
      cost: 2,
      type: 'attack',
      power: 2.5,
      effect: { type: 'stun', chance: 0.5, duration: 1, target: 'enemy' },
      effectSummary: '單體重擊・50%機率暈眩1回合',
      tags: ['single', 'debuff'],
    },
    {
      id: 'molten-fortress',
      name: '熔金壁壘',
      cost: 3,
      type: 'buff',
      // fortify（defMultiplier 2.0 + reflect 0.30）→ defBoost +100% ＋ thorns 30%
      effect: [
        { type: 'defBoost', value: 1.0, duration: 1, target: 'self' },
        { type: 'thorns', value: 0.3, duration: 1, target: 'self' },
      ],
      effectSummary: '自身防禦+100%・反傷30%（1回合）',
      tags: ['self', 'buff'],
    },
    {
      id: 'earthbound',
      name: '大地根基',
      cost: 0,
      type: 'passive',
      trigger: 'always',
      // Q13：immuneDisplace → immuneToDisplace（免疫 stunSoft 與普通 stun，不擋 freeze/airborne/gravityBind/chill）
      effect: [
        { type: 'immuneToDisplace' },
        { type: 'burstDamageReduce', threshold: 0.3, reduction: 0.5 },
      ],
      effectSummary: '常駐・免疫擊飛，大額傷害減半',
      tags: ['passive'],
    },
  ],

  sardin: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'azure-barrier',
      name: '蒼壁絕對防禦',
      cost: 3,
      type: 'special',
      effect: {
        type: 'taunt',
        target: 'allAllies',
        selfDamageReduce: 0.6,
        duration: 1,
      },
      effectSummary: '嘲諷全體攻擊到自己・受傷-60%',
      tags: ['self', 'buff'],
    },
    {
      id: 'storm-charge',
      name: '暴風衝撞',
      cost: 2,
      type: 'attack',
      power: 1.8,
      // Q13：knockback → stunSoft（擊飛，跳過下回合；屬於位移類，會被 immuneToDisplace 擋下）
      effect: { type: 'stunSoft', duration: 1, target: 'enemy', name: '擊飛' },
      effectSummary: '單體傷害・擊飛使其跳過下回合',
      tags: ['single', 'debuff'],
    },
    {
      id: 'cathedral-storm',
      name: '教堂永恆暴風',
      cost: 0,
      type: 'passive',
      trigger: 'onDamageReceived',
      effect: { type: 'counterAttack', value: 0.2, target: 'attacker' },
      effectSummary: '受擊時反擊攻擊者20%傷害',
      tags: ['passive'],
    },
  ],

  // ═══════════════ 渾沌騎士陣營 ═══════════════

  solren: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'starfall-slash',
      name: '星滅斬',
      cost: 3,
      type: 'aoe',
      power: 1.6,
      effect: { type: 'dot', value: 0.08, duration: 3, target: 'allEnemies', name: '星核侵蝕' },
      effectSummary: '全體極傷・附加星核侵蝕DoT',
      tags: ['aoe', 'dot'],
    },
    {
      id: 'starcore-gravity',
      name: '源核引力',
      cost: 2,
      type: 'buff',
      effect: { type: 'stackAtkBoost', valuePerStack: 0.1, maxStacks: 7, target: 'self' },
      effectSummary: '自身每回合攻擊疊加+10%（上限+70%）',
      tags: ['self', 'buff'],
    },
    {
      id: 'eternal-throne',
      name: '王座永恆',
      cost: 0,
      type: 'passive',
      trigger: 'hpZero',
      effect: { type: 'revive', value: 0.5, maxTimes: 1, target: 'self' },
      effectSummary: 'HP歸零時自動復活一次（50%HP）',
      tags: ['passive'],
    },
  ],

  magnos: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'inferno-slash',
      name: '終焰血斬',
      cost: 2,
      type: 'attack',
      power: 2.3,
      effect: { type: 'lifeSteal', value: 0.08, target: 'enemy' },
      effectSummary: '單體重傷・吸血8%',
      tags: ['single'],
    },
    {
      id: 'blood-chain',
      name: '血鏈縛星',
      cost: 3,
      type: 'debuff',
      effect: [
        { type: 'spdDown', value: 0.4, duration: 2, target: 'allEnemies' },
        { type: 'lockSkillTypes', blocked: ['evade', 'teleport', 'stealth'], duration: 2, target: 'allEnemies' },
      ],
      effectSummary: '全體速度-40%・封鎖迴避/隱身類技能',
      tags: ['aoe', 'debuff'],
    },
    {
      id: 'doom-pact',
      name: '末日血契',
      cost: 0,
      type: 'passive',
      trigger: 'allyDeath',
      effect: { type: 'permAtkBoost', value: 0.12, maxStack: 8, target: 'self' },
      effectSummary: '隊友陣亡永久疊加攻擊+12%（上限8層）',
      tags: ['passive'],
    },
  ],

  ignis: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'hellfire-burst',
      name: '業火爆裂衝',
      cost: 2,
      type: 'attack',
      power: 2.1,
      effect: { type: 'selfDot', value: 0.05, duration: 1, target: 'self', name: '反噬' },
      effectSummary: '單體重傷・自身承受反噬',
      tags: ['single', 'self'],
    },
    {
      id: 'magma-eruption',
      name: '熔岩噴發',
      cost: 3,
      type: 'aoe',
      power: 1.3,
      effect: {
        type: 'dot',
        value: 0.1,
        duration: 3,
        target: 'allEnemies',
        name: '熔灼',
        stackable: true,
        maxStacks: 6,
      },
      effectSummary: '全體傷害・熔灼可疊加（上限6層）',
      tags: ['aoe', 'dot'],
    },
    {
      id: 'undying-flame',
      name: '業火不滅',
      cost: 0,
      type: 'passive',
      trigger: 'hpBelow30',
      effect: { type: 'berserk', spdMultiplier: 2.0, cooldownReset: true },
      effectSummary: 'HP<30%狂化：速度×2・重置冷卻',
      tags: ['passive'],
    },
  ],

  eclron: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'moonblight-slash',
      name: '蝕月長戟斬',
      cost: 2,
      type: 'attack',
      power: 1.6,
      effect: { type: 'curse', name: '月蝕詛咒', invertHeal: true, duration: 3, target: 'enemy' },
      effectSummary: '單體傷害・詛咒使治癒反噬3回合',
      tags: ['single', 'debuff'],
    },
    {
      id: 'nether-domain',
      name: '冥界侵蝕域',
      cost: 3,
      type: 'debuff',
      effect: { type: 'starcoreDown', value: 0.1, duration: 3, target: 'allEnemies' },
      effectSummary: '全體星核力-10%（3回合）',
      tags: ['aoe', 'debuff'],
    },
    {
      id: 'dark-moon-form',
      name: '暗月形態',
      cost: 0,
      type: 'passive',
      // Mina v2 判讀③：darkField 條件已定義（見 engine/battle.ts 的 isDarkField），
      // 每回合開始重新判定，成立才套用。
      trigger: 'turnStart',
      effect: {
        type: 'conditionalEvade',
        condition: 'darkField',
        evadeBoost: 0.25,
        bonusDmgVsDebuffed: 0.15,
        duration: 1,
      },
      effectSummary: '黑暗場地成立時：迴避+25%・對弱化目標傷害+15%',
      tags: ['passive'],
    },
  ],

  mordres: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'gravity-slash',
      name: '重力壓制斬',
      cost: 2,
      type: 'attack',
      power: 2.0,
      effect: { type: 'gravityBind', spdToZero: true, blockFlight: true, duration: 2, target: 'enemy' },
      effectSummary: '單體傷害・重力束縛，速度歸零並壓制飛行',
      tags: ['single', 'debuff'],
    },
    {
      id: 'conqueror-order',
      name: '征服者的秩序',
      cost: 3,
      type: 'buff',
      effect: { type: 'teamAtkDebuff', enemyValue: 0.25, allyDefBoost: 0.2, duration: 2 },
      effectSummary: '敵方攻擊-25%・我方防禦+20%（2回合）',
      tags: ['debuff', 'buff', 'aoe'],
    },
    {
      id: 'conqueror-aura',
      name: '征服者氣場',
      cost: 0,
      type: 'passive',
      trigger: 'turnStart',
      effect: { type: 'numericAdvantage', value: 0.15, condition: 'allyCountHigher', duration: 1 },
      effectSummary: '我方人數領先時，全體加成+15%',
      tags: ['passive'],
    },
  ],

  viel: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'void-combo',
      name: '虛空連斬',
      cost: 2,
      type: 'multiHit',
      hits: 5,
      power: 0.55,
      singleTarget: true,
      effect: { type: 'eachHitIndependent' },
      effectSummary: '單體5連擊，每擊獨立判定',
      tags: ['single'],
    },
    {
      id: 'eclipse-pierce',
      name: '蝕光穿行',
      cost: 3,
      type: 'attack',
      power: 1.8,
      mustHit: true,
      piercing: true,
      effectSummary: '單體高傷・必中且可穿透後排',
      tags: ['single'],
    },
    {
      id: 'void-echo',
      name: '虛空餘響',
      cost: 0,
      type: 'passive',
      trigger: 'onHit',
      effect: {
        type: 'stackMark',
        chance: 1.0,
        maxStack: 3,
        onMaxStack: { type: 'bonusAttack', power: 1.5 },
      },
      effectSummary: '命中疊加標記，滿3層觸發追擊',
      tags: ['passive'],
    },
  ],

  holka: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'blaze-dive',
      name: '爆炎翼衝',
      cost: 2,
      type: 'attack',
      power: 2.2,
      // Q13：與 blaze-resonance 共用同一顆量表，直接手動充能（不經過受傷換算）
      effect: { type: 'gaugeCharge', value: 0.2 },
      effectSummary: '單體重傷・為爆炎量表充能20%',
      tags: ['single'],
    },
    {
      id: 'core-overload',
      name: '星核過載',
      cost: 3,
      type: 'buff',
      effect: [
        { type: 'atkBoost', value: 2.0, duration: 1, target: 'self' },
        { type: 'skip', duration: 1, delay: 1, target: 'self', name: '過熱' },
      ],
      effectSummary: '自身攻擊+200%（1回合）・隨後過熱1回合',
      tags: ['self', 'buff'],
    },
    {
      id: 'blaze-resonance',
      name: '爆炎共鳴',
      cost: 0,
      type: 'passive',
      trigger: 'onDamageReceived',
      // Q13：gaugeValue = 累積承傷 / maxHp；chargeRate 0.10、滿 1.0 爆發 AoE power2.0、爆發後歸零
      effect: {
        type: 'chargeGauge',
        chargeRate: 0.1,
        triggerAt: 1.0,
        onTrigger: { type: 'aoe', power: 2.0 },
      },
      effectSummary: '受傷累積量表，滿量自動全體爆發',
      tags: ['passive'],
    },
  ],

  seres: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'thunder-cage',
      name: '雷獄電磁牢籠',
      cost: 2,
      type: 'debuff',
      // Mina 未指定 allowOnly；若不限制會讓 skillLock 形同無效，比照其餘鎖技效果預設只放行普攻（推定）
      effect: { type: 'skillLock', allowOnly: ['normal'], duration: 2, target: 'enemy' },
      effectSummary: '單體封鎖技能，只能普攻（2回合）',
      tags: ['single', 'debuff'],
    },
    {
      id: 'em-scan',
      name: '電磁感知網',
      cost: 3,
      type: 'debuff',
      effect: { type: 'exposeNextSkills', turns: 2, duration: 2, target: 'allEnemies' },
      effectSummary: '全體曝光接下來2回合的技能',
      tags: ['aoe', 'debuff'],
    },
    {
      id: 'global-sense',
      name: '雷電全域感知',
      cost: 0,
      type: 'passive',
      trigger: 'turnStart',
      effect: [
        { type: 'teamHitBoost', value: 0.15, target: 'allAllies' },
        { type: 'reduceEnemyEvade', value: 0.5, target: 'allEnemies' },
      ],
      effectSummary: '回合開始：全體命中+15%・敵方迴避-50%',
      tags: ['passive'],
    },
  ],

  gratos: [
    { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] },
    {
      id: 'meteoriron-crush',
      name: '隕鐵粉碎',
      cost: 2,
      type: 'attack',
      power: 2.0,
      effect: { type: 'permDefDown', value: 0.15, target: 'enemy', name: '裝甲破碎' },
      effectSummary: '單體傷害・永久破壞防禦-15%',
      tags: ['single', 'debuff'],
    },
    {
      id: 'ruin-devour',
      name: '廢墟吞噬',
      cost: 2,
      type: 'special',
      effect: [
        { type: 'selfHeal', value: 0.2, target: 'self' },
        { type: 'atkBoost', value: 0.25, duration: 3, target: 'self' },
      ],
      effectSummary: '自癒20%HP・攻擊+25%（3回合）',
      tags: ['self', 'heal', 'buff'],
    },
    {
      id: 'fortress-march',
      name: '要塞行軍',
      cost: 0,
      type: 'passive',
      trigger: 'onDamageReceived',
      effect: { type: 'nullifyChance', base: 0.4, boostedChance: 0.7, boostedThreshold: 0.4 },
      effectSummary: '受擊有機率無效化傷害（大傷害機率更高）',
      tags: ['passive'],
    },
  ],

  // ═══════════════ 坐騎單位（Q12：合體後併入騎士技能池，見 engine/battle.ts 的 mergeMountSkills）──

  bloodtusk: [
    {
      id: 'normal',
      name: '獠牙衝擊',
      cost: 0,
      type: 'attack',
      power: 1.3,
      // Q13：knockback → stunSoft（跳過下回合，屬位移類）
      effect: { type: 'stunSoft', duration: 1, target: 'enemy' },
      effectSummary: '單體傷害・擊飛使其跳過下回合',
      tags: ['single', 'debuff'],
    },
    {
      id: 'trample-charge',
      name: '踐踏衝鋒',
      cost: 2,
      type: 'aoe',
      power: 1.2,
      target: 'frontRow',
      effect: { type: 'spdDown', value: 0.3, duration: 2 },
      effectSummary: '前排全體傷害・速度-30%（2回合）',
      tags: ['aoe', 'debuff'],
    },
    {
      id: 'berserk-awaken',
      name: '暴走覺醒',
      cost: 3,
      type: 'buff',
      effect: [
        { type: 'spdMultiplier', value: 2.0, duration: 2, target: 'self' },
        { type: 'atkBoost', value: 0.6, duration: 2, target: 'self' },
        { type: 'skip', duration: 1, delay: 2, target: 'self', name: '過熱' },
      ],
      effectSummary: '自身速度×2・攻擊+60%（2回合）・隨後過熱',
      tags: ['self', 'buff'],
    },
    {
      id: 'battle-instinct',
      name: '戰場本能',
      cost: 0,
      type: 'passive',
      trigger: 'onDamageReceived',
      effect: {
        type: 'permSpdBoost',
        valuePerTrigger: 0.05,
        triggerEvery: 0.1,
        maxStack: 8,
        target: 'self',
      },
      effectSummary: '累積受傷達門檻疊加速度+5%（上限8層）',
      tags: ['passive'],
    },
  ],

  frostfang: [
    {
      id: 'normal',
      name: '冰爪獵殺',
      cost: 0,
      type: 'attack',
      power: 1.3,
      effect: { type: 'trackMark', blockStealth: true, blockSwap: true, duration: 3, target: 'enemy' },
      effectSummary: '單體傷害・標記目標，封鎖隱身/換位',
      tags: ['single', 'debuff'],
    },
    {
      id: 'frost-trample',
      name: '冰原踐踏',
      cost: 2,
      type: 'aoe',
      power: 1.1,
      target: 'frontRow',
      effect: { type: 'frostCrack', spdDown: 0.35, movementDot: 0.05, duration: 2 },
      effectSummary: '前排全體傷害・速度-35%＋持續傷害',
      tags: ['aoe', 'debuff', 'dot'],
    },
    {
      id: 'arctic-howl',
      name: '極北嚎吼',
      cost: 3,
      type: 'special',
      effect: [
        { type: 'teamSpdBoost', value: 0.2, duration: 2, target: 'allAllies' },
        { type: 'critBoost', value: 0.25, duration: 2, target: 'allAllies' },
        { type: 'chill', skipChance: 0.3, duration: 2, target: 'allEnemies', name: '寒顫' },
      ],
      effectSummary: '我方速度/暴擊提升・敵方30%機率寒顫跳過行動',
      tags: ['buff', 'debuff', 'aoe'],
    },
    {
      id: 'hunt-instinct',
      name: '星核獵本能',
      cost: 0,
      type: 'passive',
      trigger: 'always',
      effect: [
        { type: 'dmgBoostVsAttackerOfMount', mountId: 'frael', bonus: 0.4 },
        { type: 'priorityAction', condition: 'mountHpBelow30', mountId: 'frael', spdMultiplier: 2.0 },
      ],
      effectSummary: '常駐・對攻擊佛雷爾者傷害+40%',
      tags: ['passive'],
    },
  ],

  // ── v3 六隻坐騎：Mina 只給了坐騎自身的被動，沒有主動技（合體後只併入被動）──
  sunlion: [
    {
      id: 'sunmane-aura',
      name: '輝鬣光環',
      cost: 0,
      type: 'passive',
      trigger: 'turnStart',
      // sunnyField：敵方有 lava（magma）或 holy 屬性時才生效（v3 判讀②簡化版）
      effect: { type: 'teamAtkBoost', value: 0.05, condition: 'sunnyField', duration: 1, target: 'allAllies' },
      effectSummary: '敵方有熔岩/聖光屬性時，全體攻擊+5%',
      tags: ['passive'],
    },
  ],
  jadegryphon: [
    {
      id: 'wind-shield',
      name: '風盾',
      cost: 0,
      type: 'passive',
      trigger: 'always',
      effect: { type: 'evadeBoost', value: 0.08, duration: -1, target: 'self' },
      effectSummary: '常駐・自身迴避率+8%',
      tags: ['passive'],
    },
  ],
  ashdragon: [
    {
      id: 'rage-burst',
      name: '狂燄爆發',
      cost: 0,
      type: 'passive',
      trigger: 'allyHpBelow30',
      effect: { type: 'atkBoost', value: 0.2, duration: 2, target: 'self' },
      effectSummary: '隊友HP<30%時，自身攻擊+20%',
      tags: ['passive'],
    },
  ],
  moonstagg: [
    {
      id: 'counter-mark',
      name: '蝕影反標',
      cost: 0,
      type: 'passive',
      trigger: 'enemyUsesSkill',
      // 敵方使用主動技時自動標記該敵人，賽蓮娜對其傷害 +15%
      effect: { type: 'counterMark', value: 0.15, duration: 2 },
      effectSummary: '敵方出招時自動標記，受到傷害+15%',
      tags: ['passive'],
    },
  ],
  manticore: [
    {
      id: 'blood-fury',
      name: '血怒',
      cost: 0,
      type: 'passive',
      trigger: 'allyDeath',
      effect: { type: 'atkBoost', value: 0.15, stackable: true, maxStacks: 3, target: 'self' },
      effectSummary: '隊友陣亡疊加攻擊+15%（上限3層）',
      tags: ['passive'],
    },
  ],
  voidgryphon: [
    {
      id: 'void-aura',
      name: '虛空氣場',
      cost: 0,
      type: 'passive',
      trigger: 'always',
      // unanalyzable：澤菲爾 / 艾索的 expose 對銀翼無效
      effect: { type: 'voidAura', unanalyzable: true },
      effectSummary: '常駐・免疫敵方技能傾向解析',
      tags: ['passive'],
    },
  ],
}

// ── 合體升級技（resonance 觸發後替換原技；Q1-9 未涉及，維持原樣）──

export const UPGRADE_SKILLS: Record<string, Skill> = {
  'meteoriron-annihilation': {
    id: 'meteoriron-annihilation',
    name: '隕鐵滅軍衝',
    cost: 2,
    type: 'aoe',
    power: 2.2,
    target: 'allEnemies',
    effect: { type: 'permDefDown', value: 0.15, name: '裝甲破碎' },
    effectSummary: '全體重傷・永久破壞防禦-15%',
    tags: ['aoe', 'debuff'],
  },
  'frost-joint-hunt': {
    id: 'frost-joint-hunt',
    name: '冰牙合狩',
    cost: 2,
    type: 'multiHit',
    hits: 2,
    power: 1.7,
    singleTarget: true,
    mustTrigger: 'freeze',
    effectSummary: '單體2連擊・必定附加凍結',
    tags: ['single', 'debuff'],
  },
}

// ── 通用佔位技（roster 內沒有 SKILLS 條目的 id 才會用到；例如尚缺完整資料的 gratos 之外新增角色）──

export const BASIC_ATTACK: Skill = { id: 'normal', name: '普通攻擊', cost: 0, type: 'attack', power: 1.0, effectSummary: '單體物理攻擊', tags: ['single'] }

const HEAVY_STRIKE: Skill = {
  id: 'placeholder-heavy',
  name: '星核強擊',
  cost: 2,
  type: 'attack',
  power: 1.85,
  effectSummary: '單體高傷攻擊',
  tags: ['single'],
}
const NOVA_BURST: Skill = {
  id: 'placeholder-nova',
  name: '星環爆發',
  cost: 3,
  type: 'aoe',
  power: 1.4,
  effectSummary: '全體範圍傷害',
  tags: ['aoe'],
}

export function getProvisionalKit(): Skill[] {
  return [BASIC_ATTACK, HEAVY_STRIKE, NOVA_BURST]
}

/** 取得某單位的技能組：優先官方技能書，否則佔位技。 */
export function getSkillsFor(unitId: string): Skill[] {
  return SKILLS[unitId] ?? getProvisionalKit()
}

/** 這個單位是否已在官方技能書內 */
export function hasOfficialSkills(unitId: string): boolean {
  return unitId in SKILLS
}
