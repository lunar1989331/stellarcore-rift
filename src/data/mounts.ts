// 星核裂紀 · 坐騎資料
// Mina《MINA_ANSWERS_v2.md》Q12：坐騎是「附掛在騎士身上的強化模組」，
// 不是第 4 位隊員、不佔隊伍名額、不獨立行動、不獨立佔 SP／回合。
// Mina《MINA_ANSWERS_v3.md》Q16：補齊另外 6 隻坐騎的完整數值與技能書。
// 只有 knight.mount 指到、且這裡 hasFullData===true 的坐騎才會在 battle.ts 實際生效（見 engine/battle.ts）。
//
// 坐騎自己的被動放在 data/skills.ts 的 SKILLS[mount.id]（合體時併入騎士的被動清單）。

import type { CoreAttr } from './types'

/** Q12：坐騎 HP = 騎士 maxHp × 此比例（全域固定值） */
export const MOUNT_HP_RATIO = 0.4

/**
 * v3 判讀①：合體升級採「疊加」——原技能底層保留，換名字、掛上 additionalEffect。
 * 引擎讀取 Skill.mountBonus，見 engine/battle.ts。
 */
export interface MountUpgradeOverlay {
  targetSkillId: string
  name: string
  additionalEffect: Record<string, unknown>
}

export interface MountFusion {
  /** 坐騎 HP 佔騎士 maxHp 的比例（固定引用 MOUNT_HP_RATIO） */
  hpRatio: number
  /** 合體攻擊加成：騎士基礎攻擊 × 此比例 */
  atkBonusRatio?: number
  /** 合體速度加成：固定值 */
  spdBonusFlat?: number
  /** 合體速度加成：騎士基礎速度 × 此比例 */
  spdBonusRatio?: number
  /** 吸血率額外加成（加法，0.04 = +4 個百分點） */
  lifeStealBonus?: number
  /** stackable dot 疊層上限 +N */
  dotStackBonus?: number
  /** 月光鎖定（markLowestHp）的標記加傷 +N（加法） */
  moonLockBonus?: number
  /** 星橋消隱（hpBelow30 迴避）觸發次數上限 +N */
  starbridgeFadeExtraCharges?: number
  /** 第三道路陣啟動時 SP 上限再 +N */
  thirdPathSpMaxBonus?: number
  /** 合體共鳴（整技替換）：把騎士某技能整個換成 UPGRADE_SKILLS 裡對應的升級技（bloodtusk / frostfang 舊格式） */
  upgradeSkill?: { from: string; to: string }
  /** 合體共鳴（疊加）：v3 六隻坐騎的格式 */
  upgradeOverlay?: MountUpgradeOverlay
  /** 飛行型坐騎：騎士的非穿透單體技也能指定敵方後排、免疫地面位移（stun / stunSoft） */
  flying?: boolean
  /** 裂翼專屬：免疫莫德雷斯的 suppressFlight */
  immuneToSuppressFlight?: boolean
}

export interface Mount {
  id: string
  name: string
  nameEn: string
  /** 歸屬騎士 id（knights.ts 的 mount 欄位也要指回來） */
  owner: string
  coreAttr: CoreAttr
  rarity: 1 | 2 | 3 | 4 | 5
  /** 坐騎自身四維（圖鑑用；坐騎不獨立行動，不進傷害公式） */
  stats?: { atk: number; def: number; spd: number; starcore: number }
  /** 插圖檔名 */
  image?: string
  motto?: string
  /** 是否有完整數值可以真正接進戰鬥引擎 */
  hasFullData: boolean
  fusion?: MountFusion
}

export const MOUNTS: readonly Mount[] = [
  {
    id: 'bloodtusk',
    name: '戰爭巨豬·血牙',
    nameEn: 'War-Boar·Bloodtusk',
    owner: 'gratos',
    coreAttr: 'earth',
    rarity: 4,
    image: '狂戰士騎士_戰爭巨豬人體藝術設計.png',
    motto: 'Rage Bears You Further · Nothing Stands',
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.3,
      upgradeSkill: { from: 'trample-charge', to: 'meteoriron-annihilation' },
    },
  },
  {
    id: 'frostfang',
    name: '霜狼·凜牙',
    nameEn: 'Frost Wolf·Rimfang',
    owner: 'frael',
    coreAttr: 'frost',
    rarity: 4,
    image: '霜狼騎士_冰封戰鎧概念圖.png',
    motto: 'Cold Drives Us Further · Winter Obeys',
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      // Mina v2 原文的 passiveShare 是「把 beast-blood 分享給坐騎」，在「坐騎不獨立行動」的新規則下
      // 沒有對應語意，改成一個溫和的固定攻擊加成（推定，待 Mina 覆核）
      atkBonusRatio: 0.15,
      upgradeSkill: { from: 'wolf-pack', to: 'frost-joint-hunt' },
    },
  },

  // ── v3 Q16：六隻坐騎（Mina 原文 owner 用 laos / aevia / argentwing，對應本專案 laros / aivia / silver-wing；
  //    coreAttr 的 magma / nether 對應 lava / abyss）──
  {
    id: 'sunlion',
    name: '太陽獅子「輝鬣」',
    nameEn: 'Sunmane',
    owner: 'laros',
    coreAttr: 'holy',
    rarity: 4,
    stats: { atk: 82, def: 75, spd: 80, starcore: 72 },
    image: '太陽獅子_聖騎士的沙漠坐騎.png',
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      upgradeOverlay: {
        targetSkillId: 'corona-impact',
        name: '太陽神裁',
        additionalEffect: { powerMultiplier: 1.5, dotName: '神聖灼燒', dotUnhealable: true },
      },
    },
  },
  {
    id: 'jadegryphon',
    name: '翡翠鹿鷲「嵐翼」',
    nameEn: 'Jadegale',
    owner: 'aivia',
    coreAttr: 'wind',
    rarity: 5,
    stats: { atk: 75, def: 58, spd: 99, starcore: 65 },
    image: '翡翠風暴鹿鷲概念設計海報.png',
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      spdBonusFlat: 15,
      flying: true,
      upgradeOverlay: {
        targetSkillId: 'jade-gale',
        name: '翠嵐天翔',
        additionalEffect: { addAoeHit: true, speedDebuffBoost: 0.1 },
      },
    },
  },
  {
    id: 'ashdragon',
    name: '灰燼巨龍「燼炎」',
    nameEn: 'Ashblaze',
    owner: 'ignis',
    coreAttr: 'lava',
    rarity: 5,
    stats: { atk: 92, def: 60, spd: 86, starcore: 68 },
    image: '餘燼熔爐_焰騎與灰燼巨龍.png',
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.12,
      dotStackBonus: 1,
      flying: true,
      upgradeOverlay: {
        targetSkillId: 'magma-eruption',
        name: '業火焚天',
        additionalEffect: { dotMaxStacks: 6, aoeExtend: true },
      },
    },
  },
  {
    id: 'moonstagg',
    name: '月弦星鹿「蝕影」',
    nameEn: 'Eclipsestag',
    owner: 'selena',
    coreAttr: 'holy',
    rarity: 4,
    stats: { atk: 78, def: 55, spd: 94, starcore: 70 },
    image: '月弦星鹿_月弓騎士坐騎概念誌.png',
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      spdBonusRatio: 0.1,
      moonLockBonus: 0.4,
      upgradeOverlay: {
        targetSkillId: 'moon-arrow',
        name: '月輪獵殺',
        additionalEffect: { followUpChance: 0.8, followUpPower: 0.8, mustHitFollowUp: true },
      },
    },
  },
  {
    id: 'manticore',
    name: '深淵曼提柯「血怒」',
    nameEn: 'Bloodrage',
    owner: 'magnos',
    coreAttr: 'abyss',
    rarity: 5,
    stats: { atk: 90, def: 65, spd: 88, starcore: 75 },
    image: '深淵曼提柯_惡魔騎士之怒.png',
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      lifeStealBonus: 0.04,
      flying: true,
      upgradeOverlay: {
        targetSkillId: 'inferno-slash',
        name: '終焰深淵',
        additionalEffect: { addPoison: true, poisonPerTick: 0.03, poisonDuration: 3, lifeStealDoubled: true },
      },
    },
  },
  {
    id: 'voidgryphon',
    name: '虛空獅鷲「裂翼」',
    nameEn: 'Voidwing',
    owner: 'silver-wing',
    coreAttr: 'fusion',
    rarity: 5,
    stats: { atk: 80, def: 62, spd: 95, starcore: 88 },
    image: '白銀騎士與虛空獅鷲.png',
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.08,
      starbridgeFadeExtraCharges: 3,
      thirdPathSpMaxBonus: 2,
      flying: true,
      immuneToSuppressFlight: true,
      upgradeOverlay: {
        targetSkillId: 'void-slash',
        name: '虛空雙翼',
        additionalEffect: { powerMultiplier: 2.0, reflectShieldBoost: 0.2 },
      },
    },
  },
]

export const MOUNTS_BY_ID: Record<string, Mount> = Object.fromEntries(MOUNTS.map((m) => [m.id, m]))

/** 取得一隻「已可上場生效」的坐騎；資料不全或 id 不存在都回傳 undefined。 */
export function getFusedMount(id: string | undefined): Mount | undefined {
  if (!id) return undefined
  const m = MOUNTS_BY_ID[id]
  return m?.hasFullData ? m : undefined
}
