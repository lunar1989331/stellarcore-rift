// 星核裂紀 · 核心型別定義
// 對應 CLAUDE.md「20 位騎士完整資料」與 Mina 技能設計書 v2.0。

/** 陣營 */
export type Faction = 'guardian' | 'chaos' | 'independent'

/**
 * 六大星核屬性（相剋循環）＋ 三個中性屬性 ＋ 融合型。
 * 相剋鏈與加成數值見 Mina《MINA_ANSWERS.md》Q2（修正版，取代 CLAUDE.md 舊版鏈順序）。
 */
export type CoreAttr =
  | 'holy' // 聖光
  | 'abyss' // 冥界（nether）
  | 'lava' // 熔岩（magma）
  | 'frost' // 冰霜
  | 'thunder' // 雷霆
  | 'void' // 虛空
  | 'wind' // 風（中性：無弱點無特攻，multiplier 恆 1.0）
  | 'ocean' // 海洋（中性）
  | 'earth' // 大地（中性）
  | 'fusion' // 融合型（無屬性弱點，不觸發相剋，multiplier 恆 1.0）

/** 前排 / 後排 */
export type RowPosition = 'front' | 'back'

export interface Knight {
  id: string
  /** 中文名 */
  name: string
  /** 英文名 */
  nameEn: string
  faction: Faction
  /** 設定書原文的屬性描述（flavor），例：'風·生命共鳴型' */
  attr: string
  /**
   * 戰鬥用的核心屬性。設定書只給了 flavor 描述，
   * 這裡是 Claude Code 依描述推定的對應值 —— 待 Mina 確認（見 CLAUDE.md 問題清單 Q2）。
   */
  coreAttr: CoreAttr
  /** 插圖檔名（中文），由 assets/knightImages.ts 解析成 URL */
  image: string
  /** 最大 HP（設計書 v2.0：全部 ×10） */
  maxHp: number
  atk: number
  def: number
  spd: number
  starcore: number
  /** 角色定位（flavor） */
  role: string
  rarity: 1 | 2 | 3 | 4 | 5
  /** 是否為坐騎單位（mounts.ts 的單位設此為 true） */
  isMountUnit?: boolean
  /** 若為坐騎：騎乘者的騎士 id */
  mountedBy?: string
  /**
   * 坐騎 id（對應 data/mounts.ts 的 MOUNTS）。Q12：坐騎是「附掛在騎士身上的強化模組」，
   * 不佔隊伍名額、不獨立行動 —— 只有這裡指到、且 mounts.ts 有完整資料的坐騎才會實際生效。
   */
  mount?: string
}

/** 陣營顯示色（KnightCard 用） */
export const FACTION_COLORS: Record<Faction, { primary: string; glow: string; label: string }> = {
  guardian: { primary: '#4fa3ff', glow: 'rgba(79, 163, 255, 0.55)', label: '守護騎士' },
  chaos: { primary: '#ff4f6d', glow: 'rgba(255, 79, 109, 0.55)', label: '渾沌騎士' },
  independent: { primary: '#c9a94f', glow: 'rgba(201, 169, 79, 0.55)', label: '獨立騎士' },
}

/** 屬性顯示名 */
export const CORE_ATTR_LABELS: Record<CoreAttr, string> = {
  holy: '聖光',
  abyss: '冥界',
  lava: '熔岩',
  frost: '冰霜',
  thunder: '雷霆',
  void: '虛空',
  wind: '風',
  ocean: '海洋',
  earth: '大地',
  fusion: '融合型',
}
