// 星核裂紀 · 21 位騎士完整資料
// Mina《MINA_ANSWERS.md》：
//   Q2 — coreAttr 已由 Mina 正式裁定（取代舊版「推定」註記）
//   Q8 — HP = def × 100（取代舊版「原始數值 ×10」）
// Mina《MINA_ANSWERS_v2.md》：
//   Q11 — 補齊格拉托斯·隕鐵完整資料（渾沌第 9 位）
//   Q12 — frael / gratos 的 mount 欄位指到 mounts.ts 的坐騎

import type { Knight } from './types'

export const KNIGHTS: readonly Knight[] = [
  // ── 獨立騎士（3位）─────────────────────────────
  {
    id: 'silver-wing',
    name: '銀翼·虛空',
    nameEn: 'Argentwing·Null',
    faction: 'independent',
    attr: '融合型·未知',
    coreAttr: 'fusion',
    image: '紫月下的虛空騎士.png', // ASSET_MAP v1.1 校正（原為 Celestial Mecha Knight Among Ruins.png，該圖已改給艾索）
    maxHp: 5500, // def 55 × 100
    atk: 78,
    def: 55,
    spd: 92,
    starcore: 85,
    role: '主角',
    rarity: 5,
    mount: 'voidgryphon', // v3：虛空獅鷲「裂翼」
  },
  {
    id: 'zephyr',
    name: '澤菲爾·秘典',
    nameEn: 'Zephyr·Arcanescroll',
    faction: 'independent',
    attr: '融合型·魔法系',
    coreAttr: 'fusion',
    image: '星穹神殿的機械法師.png', // ASSET_MAP v1.1 校正（原為 紫金魔鎧的星環聖殿.png，該圖已無對應騎士）
    maxHp: 7000, // def 70 × 100
    atk: 65,
    def: 70,
    spd: 72,
    starcore: 98,
    role: '秘典守護者',
    rarity: 5,
  },
  {
    id: 'aiso',
    name: '艾索·星紋',
    nameEn: 'Aiso·Starscript',
    faction: 'independent',
    attr: '融合型·術式系',
    coreAttr: 'fusion',
    image: 'Celestial Mecha Knight Among Ruins.png', // ASSET_MAP v1.1 校正（原為 星穹神殿的機械法師.png，該圖已改給澤菲爾）
    maxHp: 6500, // def 65 × 100
    atk: 60,
    def: 65,
    spd: 78,
    starcore: 96,
    role: '解析者',
    rarity: 5,
  },

  // ── 守護騎士陣營（9位）────────────────────────
  {
    id: 'osirath',
    name: '奧瑟里斯·星裁',
    nameEn: 'Osirath·Stellarblade',
    faction: 'guardian',
    attr: '融合型·源核碎片',
    coreAttr: 'fusion',
    image: '星環聖殿的天界騎士.png', // ASSET_MAP v1.1 校正（原為 星環聖殿的機甲王者.png；正確檔案實際存放於「坐騎篇」資料夾，已複製進 assets）
    maxHp: 8000, // def 80 × 100（Mina Q8 原文範例）
    atk: 88,
    def: 80,
    spd: 68,
    starcore: 95,
    role: '守護主將',
    rarity: 5,
  },
  {
    id: 'elixia',
    name: '艾爾希亞·聖裁',
    nameEn: 'Elixia·Holyblade',
    faction: 'guardian',
    attr: '聖光共鳴型',
    coreAttr: 'holy',
    image: '聖光哥德巨鎧守護者.png',
    maxHp: 7200, // def 72 × 100
    atk: 62,
    def: 72,
    spd: 70,
    starcore: 90,
    role: '治癒全能',
    rarity: 5,
  },
  {
    id: 'laros',
    name: '拉奧斯·日輝',
    nameEn: 'Laros·Dawnfire',
    faction: 'guardian',
    attr: '太陽共鳴型',
    coreAttr: 'holy', // Q2：太陽 = 聖光子屬性
    image: '黃金太陽守護者立於沙漠神殿.png',
    maxHp: 8800, // def 88 × 100
    atk: 85,
    def: 88,
    spd: 52,
    starcore: 82,
    role: '攻防古老',
    rarity: 5,
    mount: 'sunlion', // v3：太陽獅子「輝鬣」
  },
  {
    id: 'aivia',
    name: '艾薇亞·翠嵐',
    nameEn: 'Aivia·Jadestorm',
    faction: 'guardian',
    attr: '風·生命共鳴型',
    coreAttr: 'wind', // Q2：中性，無弱點無特攻
    image: '翡翠風暴中的天穹守衛.png',
    maxHp: 6000, // def 60 × 100
    atk: 72,
    def: 60,
    spd: 96,
    starcore: 75,
    role: '速控',
    rarity: 5,
    mount: 'jadegryphon', // v3：翡翠鹿鷲「嵐翼」（飛行型）
  },
  {
    id: 'selena',
    name: '賽蓮娜·月弦',
    nameEn: 'Selena·Moonstring',
    faction: 'guardian',
    attr: '月光共鳴型',
    coreAttr: 'holy', // Q2：與艾克隆（冥界）形成月光對鏡
    image: '天界月光射手騎士.png',
    maxHp: 4800, // def 48 × 100
    atk: 82,
    def: 48,
    spd: 84,
    starcore: 80,
    role: '狙擊月相',
    rarity: 5,
    mount: 'moonstagg', // v3：月弦星鹿「蝕影」
  },
  {
    id: 'nautrus',
    name: '納特魯斯·深潮',
    nameEn: 'Nautrus·Deeptide',
    faction: 'guardian',
    attr: '海洋共鳴型',
    coreAttr: 'ocean', // Q2：中性
    image: '深海遺城的三叉戟守護者.png',
    maxHp: 9200, // def 92 × 100
    atk: 70,
    def: 92,
    spd: 58,
    starcore: 76,
    role: '深海防守',
    rarity: 5,
  },
  {
    id: 'frael',
    name: '佛雷爾·冰牙',
    nameEn: 'Frael·Frostfang',
    faction: 'guardian',
    attr: '冰·獸性共鳴型',
    coreAttr: 'frost',
    image: '冰霜狼騎士鎮守雪堡.png',
    maxHp: 7500, // def 75 × 100
    atk: 80,
    def: 75,
    spd: 74,
    starcore: 68,
    role: '越戰越勇',
    rarity: 5,
    mount: 'frostfang', // Q12：佛雷爾 + 霜狼·凜牙
  },
  {
    id: 'greln',
    name: '葛倫·熔盾',
    nameEn: 'Greln·Moltenshield',
    faction: 'guardian',
    attr: '大地共鳴型',
    coreAttr: 'earth', // Q2：中性
    image: '熔金裂隙中的巨型戰鎧守護者.png',
    maxHp: 9900, // def 99 × 100（Mina Q8 原文範例：全場最高）
    atk: 78,
    def: 99,
    spd: 38,
    starcore: 65,
    role: '鐵壁反傷',
    rarity: 5,
  },
  {
    id: 'sardin',
    name: '薩爾汀·蒼壁',
    nameEn: 'Sardin·Azurewall',
    faction: 'guardian',
    attr: '風·鋼鐵共鳴型',
    coreAttr: 'wind', // Q2：中性
    image: 'Stormbound Cathedral Mecha Guardian.png',
    maxHp: 9500, // def 95 × 100
    atk: 65,
    def: 95,
    spd: 45,
    starcore: 72,
    role: '傷害轉移盾',
    rarity: 5,
  },

  // ── 渾沌騎士陣營（9位；含格拉托斯，資料仍缺 — 見 CLAUDE.md Q11）────
  {
    id: 'solren',
    name: '索倫·星滅',
    nameEn: 'Solren·Starfall',
    faction: 'chaos',
    attr: '吞噬型·源核碎片',
    coreAttr: 'void', // Q2：BOSS，源核碎片持有者
    image: '星穹聖殿中的鎧甲天王.png',
    maxHp: 9000, // def 90 × 100
    atk: 98,
    def: 90,
    spd: 75,
    starcore: 99,
    role: '大反派·最終BOSS',
    rarity: 5,
  },
  {
    id: 'magnos',
    name: '瑪格諾斯·終焰',
    nameEn: 'Magnos·Doomsfire',
    faction: 'chaos',
    attr: '血焰吞噬型',
    coreAttr: 'lava',
    image: '末日猩紅惡魔騎士.png',
    maxHp: 7200, // def 72 × 100
    atk: 95,
    def: 72,
    spd: 70,
    starcore: 88,
    role: '渾沌副帥',
    rarity: 5,
    mount: 'manticore', // v3：深淵曼提柯「血怒」（飛行型）
  },
  {
    id: 'ignis',
    name: '伊格尼斯·業火',
    nameEn: 'Ignis·Karmaflame',
    faction: 'chaos',
    attr: '熔岩吞噬型',
    coreAttr: 'lava',
    image: '地獄要塞火焰騎士.png',
    maxHp: 5500, // def 55 × 100
    atk: 92,
    def: 55,
    spd: 82,
    starcore: 78,
    role: '純破壞',
    rarity: 5,
    mount: 'ashdragon', // v3：灰燼巨龍「燼炎」（飛行型）
  },
  {
    id: 'eclron',
    name: '艾克隆·蝕月',
    nameEn: 'Eclron·Moonblight',
    faction: 'chaos',
    attr: '冥界吞噬型',
    coreAttr: 'abyss',
    image: '暗夜蝕月中的冥界騎士.png',
    maxHp: 6200, // def 62 × 100
    atk: 78,
    def: 62,
    spd: 88,
    starcore: 86,
    role: '詛咒對鏡',
    rarity: 5,
  },
  {
    id: 'mordres',
    name: '莫德雷斯·黑鐵',
    nameEn: 'Mordres·Blackiron',
    faction: 'chaos',
    attr: '重力吞噬型',
    coreAttr: 'earth', // Q2：重力 = 大地子屬性，中性
    image: '黑鎧巨騎降臨城堡鎮.png',
    maxHp: 8400, // def 84 × 100
    atk: 86,
    def: 84,
    spd: 60,
    starcore: 80,
    role: '戰略控場',
    rarity: 5,
  },
  {
    id: 'viel',
    name: '維艾爾·暗蝕',
    nameEn: 'Viel·Darkblight',
    faction: 'chaos',
    attr: '虛空吞噬型',
    coreAttr: 'void',
    image: '紫焰蝕月下的黑騎躍襲.png', // ASSET_MAP v1.1 校正（原為 Eclipse Knight Amid Gothic Ruins.png；正確檔案實際存放於「坐騎篇」資料夾，已複製進 assets）
    maxHp: 5000, // def 50 × 100（Mina Q8 原文範例：全場最低）
    atk: 84,
    def: 50,
    spd: 98,
    starcore: 82,
    role: '多段速攻',
    rarity: 5,
  },
  {
    id: 'holka',
    name: '霍爾卡·烈翼',
    nameEn: 'Holka·Blazewing',
    faction: 'chaos',
    attr: '爆炎吞噬型',
    coreAttr: 'void', // Q2：爆炎 = 虛空子屬性
    image: '紅焰翼環機甲騎士.png',
    maxHp: 4800, // def 48 × 100
    atk: 94,
    def: 48,
    spd: 76,
    starcore: 90,
    role: '過載爆發',
    rarity: 5,
  },
  {
    id: 'seres',
    name: '塞雷斯·雷獄',
    nameEn: 'Seres·Thunderprison',
    faction: 'chaos',
    attr: '雷霆吞噬型',
    coreAttr: 'thunder',
    image: '雷霆巨鎧騎士降臨廢墟.png',
    maxHp: 6800, // def 68 × 100
    atk: 75,
    def: 68,
    spd: 80,
    starcore: 93,
    role: '情報控制',
    rarity: 5,
  },
  {
    id: 'gratos',
    name: '格拉托斯·隕鐵',
    nameEn: 'Gratos·Meteoriron',
    faction: 'chaos',
    attr: '大地·熔岩融合子屬性',
    // Q11（v2 覆核）：主屬性歸 earth，取代 MINA_ANSWERS.md Q2 原先給的 fusion。
    coreAttr: 'earth',
    image: '猩紅隕環下的鋼鐵魔騎.png',
    maxHp: 8800, // def 88 × 100
    atk: 90,
    def: 88,
    spd: 42, // 全場第二慢（僅次於葛倫 38）
    starcore: 74,
    role: '要塞先鋒',
    rarity: 5,
    mount: 'bloodtusk', // Q12：格拉托斯 + 戰爭巨豬·血牙
  },
] as const

export const KNIGHTS_BY_ID: Record<string, Knight> = Object.fromEntries(
  KNIGHTS.map((k) => [k.id, k]),
)

export function getKnight(id: string): Knight | undefined {
  return KNIGHTS_BY_ID[id]
}

export const KNIGHTS_BY_FACTION = {
  guardian: KNIGHTS.filter((k) => k.faction === 'guardian'),
  chaos: KNIGHTS.filter((k) => k.faction === 'chaos'),
  independent: KNIGHTS.filter((k) => k.faction === 'independent'),
}
