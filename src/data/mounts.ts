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
  /** 合體後的技能新名稱；同一隻坐騎有多個 overlay 時，只有第一個需要改名 */
  name?: string
  /**
   * additionalEffect 支援的通用鍵（engine/battle.ts 讀取）：
   *   powerMultiplier  傷害倍率（直接相乘）
   *   effectOverrides  { [效果 type]: { 欄位: 新值 } }——合體時覆寫這個技能自帶效果的欄位（例如 teamDmgReduce.value）
   *   extraEffects     合體時額外追加的效果清單（SkillEffect[]），技能結算完畢後套用
   * 其餘鍵是既有 8 隻坐騎各自的專屬鍵（addAoeHit / followUpChance / addPoison …）。
   */
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
  /** 合體共鳴（疊加）：同時強化多個技能時用這個（第 2 個起的 overlay 不改名） */
  upgradeOverlays?: MountUpgradeOverlay[]
  /** 合體後施術者的治癒量加成（加法，0.3 = 治癒量 +30%） */
  healBonus?: number
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
  /** 稱號（規格書的 nameTitle，例如「聖冠」） */
  nameTitle?: string
  /** 合體共鳴（規格書 fusionResonance）：名稱＋效果說明。新坐騎目前只存文字供顯示，效果本身尚未接進引擎。 */
  fusionResonance?: { name: string; effect: string }
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
    stats: { atk: 88, def: 70, spd: 78, starcore: 60 },
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
    stats: { atk: 85, def: 65, spd: 90, starcore: 62 },
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

  // ── 坐騎合體系統規格書 v1.0：補齊其餘 13 位騎士的坐騎（id 沿用規格書；coreAttr／rarity 規格書沒給，
  //    沿用騎士本人的 coreAttr、rarity 5）。fusion 目前只有 HP、攻擊加成（統一 0.1，暫定值，待 Mina 覆核）與
  //    飛行旗標；fusionResonance 的特殊效果只存文字，尚未接進引擎。 ──
  {
    id: 'senguan',
    name: '星冠聖駒「聖冠」',
    nameEn: 'Crownsteed',
    nameTitle: '聖冠',
    owner: 'osirath',
    coreAttr: 'fusion',
    rarity: 5,
    stats: { atk: 85, def: 90, spd: 65, starcore: 88 },
    image: '星環聖殿的天界騎士.png',
    fusionResonance: { name: '星冠王臨', effect: '星裁天降必定命中+傷害×1.3，全體友方獲得15%HP護盾' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      upgradeOverlay: {
        targetSkillId: 'stellarblade-fall',
        name: '星冠王臨',
        // 星裁天降本來就是必中；傷害 ×1.3，並讓全體友方獲得 15% 護盾
        additionalEffect: {
          powerMultiplier: 1.3,
          extraEffects: [{ type: 'teamShield', value: 0.15, duration: 1, target: 'allAllies' }],
        },
      },
    },
  },
  {
    id: 'shenghuan',
    name: '熾光聖鹿「聖環」',
    nameEn: 'Halostag',
    nameTitle: '聖環',
    owner: 'elixia',
    coreAttr: 'holy',
    rarity: 5,
    stats: { atk: 60, def: 75, spd: 72, starcore: 85 },
    image: '熾天使光環機械聖鹿設定集.png',
    fusionResonance: { name: '聖環天癒', effect: '聖裁光柱同時對全體友方回血12%，治癒量+30%' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      healBonus: 0.3,
      upgradeOverlay: {
        targetSkillId: 'holy-purge',
        name: '聖環天癒',
        additionalEffect: {
          extraEffects: [{ type: 'teamHeal', value: 0.12, target: 'allAllies' }],
        },
      },
    },
  },
  {
    id: 'chaoyuan',
    name: '深潮利維坦「潮淵」',
    nameEn: 'Deeptide Leviathan',
    nameTitle: '潮淵',
    owner: 'nautrus',
    coreAttr: 'ocean',
    rarity: 5,
    stats: { atk: 65, def: 95, spd: 55, starcore: 70 },
    image: '深海潮汐巨獸概念圖.png',
    fusionResonance: { name: '深淵潮壁', effect: '遺城潮壁效果提升至全體承傷-55%，並對攻擊者反彈15%傷害' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      upgradeOverlay: {
        targetSkillId: 'tide-wall',
        name: '深淵潮壁',
        additionalEffect: {
          effectOverrides: { teamDmgReduce: { value: 0.55 } },
          extraEffects: [{ type: 'thorns', value: 0.15, duration: 1, target: 'allAllies' }],
        },
      },
    },
  },
  {
    id: 'tiebi',
    name: '熔堡巨蠻牛「鐵壁」',
    nameEn: 'Moltenbulwark',
    nameTitle: '鐵壁',
    owner: 'greln',
    coreAttr: 'earth',
    rarity: 5,
    stats: { atk: 70, def: 99, spd: 30, starcore: 58 },
    image: '熔鑄堡壘_戰爭巨蠻牛.png',
    fusionResonance: { name: '熔岩要塞', effect: '熔金壁壘防禦效果提升至250%+反傷提升至45%，震暈機率+20%' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      upgradeOverlays: [
        {
          targetSkillId: 'molten-fortress',
          name: '熔岩要塞',
          // 原 defBoost +100%（×2.0）→ 提升至 250%（×2.5）＝ value 1.5；反傷 30% → 45%
          additionalEffect: { effectOverrides: { defBoost: { value: 1.5 }, thorns: { value: 0.45 } } },
        },
        {
          // 震暈機率 +20%：熔金重錘 50% → 70%
          targetSkillId: 'molten-smash',
          additionalEffect: { effectOverrides: { stun: { chance: 0.7 } } },
        },
      ],
    },
  },
  {
    id: 'xingyi',
    name: '天穹星駒「星翼」',
    nameEn: 'Skyvault Steed',
    nameTitle: '星翼',
    owner: 'sardin',
    coreAttr: 'wind',
    rarity: 5,
    stats: { atk: 60, def: 92, spd: 68, starcore: 75 },
    image: '星核裂紀_天穹星駒設計圖.png',
    fusionResonance: { name: '蒼穹永盾', effect: '蒼壁絕對防禦期間反傷提升至35%，暴風衝撞追加全體友方防禦+20%' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      upgradeOverlays: [
        {
          targetSkillId: 'azure-barrier',
          name: '蒼穹永盾',
          additionalEffect: { extraEffects: [{ type: 'thorns', value: 0.35, duration: 1, target: 'self' }] },
        },
        {
          targetSkillId: 'storm-charge',
          additionalEffect: { extraEffects: [{ type: 'defBoost', value: 0.2, duration: 2, target: 'allAllies' }] },
        },
      ],
    },
  },
  {
    id: 'canglong',
    name: '蒼穹星滅龍「終焰龍」',
    nameEn: 'Starfall Dragon',
    nameTitle: '終焰龍',
    owner: 'solren',
    coreAttr: 'void',
    rarity: 5,
    stats: { atk: 95, def: 85, spd: 72, starcore: 95 },
    image: '星環末日的蒼穹龍騎王.png',
    fusionResonance: { name: '星滅龍煌', effect: '星滅斬光柱數量增加至九道，星核侵蝕持續回合+2，王座永恆復活HP提升至65%' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      upgradeOverlays: [
        {
          // 星核侵蝕持續 3 → 5 回合（+2）。「光柱增加至九道」換算成星滅斬結算後追加 2 次隨機打擊（倍率 0.3）。
          targetSkillId: 'starfall-slash',
          name: '星滅龍煌',
          additionalEffect: {
            effectOverrides: { dot: { duration: 5 } },
            extraEffects: [{ type: 'randomStrike', hits: 2, power: 0.3 }],
          },
        },
        {
          // 王座永恆復活 HP 50% → 65%
          targetSkillId: 'eternal-throne',
          additionalEffect: { effectOverrides: { revive: { value: 0.65 } } },
        },
      ],
    },
  },
  {
    id: 'mingyi',
    name: '蝕月虛空獸「冥翼」',
    nameEn: 'Eclipse Voidbeast',
    nameTitle: '冥翼',
    owner: 'eclron',
    coreAttr: 'abyss',
    rarity: 5,
    stats: { atk: 80, def: 60, spd: 90, starcore: 82 },
    image: '紫焰蝕月下的黑騎躍襲.png',
    fusionResonance: { name: '冥月蝕界', effect: '冥界侵蝕域效果提升至-15%，月蝕詛咒持續回合+2' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      flying: true,
      upgradeOverlays: [
        // 冥界侵蝕域：全體星核力 -10% → -15%
        { targetSkillId: 'nether-domain', name: '冥月蝕界', additionalEffect: { effectOverrides: { starcoreDown: { value: 0.15 } } } },
        // 月蝕詛咒持續 3 → 5 回合
        { targetSkillId: 'moonblight-slash', additionalEffect: { effectOverrides: { curse: { duration: 5 } } } },
      ],
    },
  },
  {
    id: 'tieshi',
    name: '黑曜堡壘戰馬「鐵誓」',
    nameEn: 'Obsidian Warhorse',
    nameTitle: '鐵誓',
    owner: 'mordres',
    coreAttr: 'earth',
    rarity: 5,
    stats: { atk: 75, def: 90, spd: 58, starcore: 72 },
    image: '黑曜堡壘戰馬概念設計圖.png',
    fusionResonance: { name: '征服者鐵騎', effect: '重力壓制斬傷害×1.3，征服者的秩序效果期間+1回合' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      upgradeOverlays: [
        // 重力壓制斬傷害 ×1.3
        { targetSkillId: 'gravity-slash', name: '征服者鐵騎', additionalEffect: { powerMultiplier: 1.3 } },
        // 征服者的秩序持續 2 → 3 回合
        { targetSkillId: 'conqueror-order', additionalEffect: { effectOverrides: { teamAtkDebuff: { duration: 3 } } } },
      ],
    },
  },
  {
    id: 'anshi',
    name: '虛空月獸「暗蝕」',
    nameEn: 'Voidmoon Beast',
    nameTitle: '暗蝕',
    owner: 'viel',
    coreAttr: 'void',
    rarity: 5,
    stats: { atk: 85, def: 48, spd: 96, starcore: 78 },
    image: '紫月下的虛空騎士.png',
    fusionResonance: { name: '虛空暗蝕', effect: '虛空連斬段數增加至7連擊，虛空餘響觸發層數降低至2層' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      upgradeOverlays: [
        // 虛空連斬 5 → 7 連擊（不改技能名稱：主人 2026-09-21 指示合體後仍顯示「虛空連斬」）
        { targetSkillId: 'void-combo', additionalEffect: { hits: 7 } },
        // 虛空餘響觸發層數 3 → 2
        { targetSkillId: 'void-echo', additionalEffect: { effectOverrides: { stackMark: { maxStack: 2 } } } },
      ],
    },
  },
  {
    id: 'lietian',
    name: '烈焰矛翼龍「裂天」',
    nameEn: 'Blazelance Drake',
    nameTitle: '裂天',
    owner: 'holka',
    coreAttr: 'void',
    rarity: 5,
    stats: { atk: 90, def: 45, spd: 85, starcore: 80 },
    image: '混沌紅焰之翼_機械龍騎概念圖.png',
    fusionResonance: { name: '爆炎裂天', effect: '爆炎翼衝過載值提升至+30%，星核過載攻擊倍率提升至400%' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      flying: true,
      upgradeOverlays: [
        // 爆炎翼衝為過載量表充能 +20% → +30%
        { targetSkillId: 'blaze-dive', name: '爆炎裂天', additionalEffect: { effectOverrides: { gaugeCharge: { value: 0.3 } } } },
        // 星核過載攻擊 +200% → +400%
        { targetSkillId: 'core-overload', additionalEffect: { effectOverrides: { atkBoost: { value: 4.0 } } } },
      ],
    },
  },
  {
    id: 'dianlie',
    name: '弧雷獅鷲「電鬣」',
    nameEn: 'Arcthunder Gryphon',
    nameTitle: '電鬣',
    owner: 'seres',
    coreAttr: 'thunder',
    rarity: 5,
    stats: { atk: 78, def: 65, spd: 88, starcore: 88 },
    image: '弧雷風暴_雷霆獅鷲設計圖.png',
    fusionResonance: { name: '雷獄天羅', effect: '雷獄電磁牢籠範圍擴大至全體敵方，電磁感知網提前曝光回合+1' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      flying: true,
      upgradeOverlays: [
        // 雷獄電磁牢籠：單體 → 全體敵方
        { targetSkillId: 'thunder-cage', name: '雷獄天羅', additionalEffect: { effectOverrides: { skillLock: { target: 'allEnemies' } } } },
        // 電磁感知網曝光回合 2 → 3
        { targetSkillId: 'em-scan', additionalEffect: { effectOverrides: { exposeNextSkills: { turns: 3, duration: 3 } } } },
      ],
    },
  },
  {
    id: 'dianyu',
    name: '奧秘獅身翼獸「典獄」',
    nameEn: 'Arcane Sphinx',
    nameTitle: '典獄',
    owner: 'zephyr',
    coreAttr: 'fusion',
    rarity: 5,
    stats: { atk: 68, def: 72, spd: 80, starcore: 90 },
    image: '紫金星穹_奧秘獅身翼獸譜.png',
    fusionResonance: { name: '秘典天獄', effect: '秘典封印術冷卻+效果延長至+4回合，有銀翼在場時遺忘術式效果再翻倍' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      flying: true,
      upgradeOverlays: [
        {
          // 秘典封印術：冷卻延長 +3 → +4 回合、星核力削弱持續 → 4 回合
          targetSkillId: 'arcane-seal',
          name: '秘典天獄',
          additionalEffect: { effectOverrides: { cdExtend: { value: 4 }, starcoreDown: { duration: 4 } } },
        },
        {
          // 遺忘術式·第三共鳴：有銀翼在場時加成倍率 2.0 → 4.0（「再翻倍」）
          targetSkillId: 'third-resonance',
          additionalEffect: { effectOverrides: { dualAttrBoost: { bonusIfSilverWing: 4.0 } } },
        },
      ],
    },
  },
  {
    id: 'dianyuan',
    name: '星界秘典龍「典淵」',
    nameEn: 'Astral Tome Dragon',
    nameTitle: '典淵',
    owner: 'aiso',
    coreAttr: 'fusion',
    rarity: 5,
    stats: { atk: 65, def: 68, spd: 82, starcore: 92 },
    image: '星界秘典龍_天穹坐騎.png',
    fusionResonance: { name: '星域解析', effect: '星核術式解析曝光回合延長至5回合，符文陣列浮動範圍擴大至±45%' },
    hasFullData: true,
    fusion: {
      hpRatio: MOUNT_HP_RATIO,
      atkBonusRatio: 0.1,
      flying: true,
      upgradeOverlays: [
        // 星核術式解析：曝光 3 → 5 回合
        { targetSkillId: 'rune-analyze', name: '星域解析', additionalEffect: { effectOverrides: { expose: { duration: 5 } } } },
        // 符文陣列·星域重寫：浮動範圍 ±30% → ±45%
        { targetSkillId: 'sigil-rewrite', additionalEffect: { effectOverrides: { randomize: { variance: 0.45 } } } },
      ],
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

/** 飛行型坐騎 id：合體後可攻擊敵方後排、免疫地面位移（stun / stunSoft）。由 fusion.flying 推導。 */
export const FLYING_MOUNTS: readonly string[] = MOUNTS.filter((m) => m.fusion?.flying).map((m) => m.id)
