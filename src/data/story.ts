// 星核裂紀 · 劇情章節資料
// Mina《MINA_ANSWERS.md》Q4：完整交付 14 章 + 2 支線 + 3 結局。
// 取代舊版佔位資料／Chapter 型別（舊型別只有第一章佔位，未被其他檔案引用，安全整檔替換）。

export interface StoryChoice {
  id: string
  text: string
  outcome: string
}

export interface StoryChapter {
  id: string
  title: string
  /** 幕次；序章 = 0，支線 = -1（依 unlocks 決定何時開放，不計入幕序） */
  act: number
  chapter: number
  location: string
  summary: string
  choices?: StoryChoice[]
  /** 解鎖的支線或角色 */
  unlocks?: string[]
}

export const STORY_DATA: StoryChapter[] = [
  // ── 序章 ──
  {
    id: 'prologue',
    title: '廢墟中的銀光',
    act: 0,
    chapter: 0,
    location: '廢墟平原',
    summary:
      '銀翼·虛空從廢墟中醒來，身旁是裂翼。他不知道自己是誰，也不知道那隻獅鷲從哪裡來。遠處的星環聖殿傳來衝突的光芒——兩大陣營的戰爭已經開始了。',
  },

  // ── 第一幕：陌生的世界 ──
  {
    id: 'act1-ch1',
    title: '星橋的初遇',
    act: 1,
    chapter: 1,
    location: '中立星橋',
    summary:
      '銀翼在星橋遭遇守護陣營的巡邏隊。奧瑟里斯感應到銀翼身上那個不屬於任何陣營的星核頻率，沉默地讓他通過——但沒有解釋原因。',
    choices: [
      { id: 'c1a', text: '追問奧瑟里斯為什麼放行', outcome: '奧瑟里斯信任感+，後期提前開啟支線「星裁的疑惑」' },
      { id: 'c1b', text: '不問，直接離開', outcome: '銀翼維持獨立路線，第三幕選擇更自由' },
    ],
  },
  {
    id: 'act1-ch2',
    title: '星核的氣息',
    act: 1,
    chapter: 2,
    location: '月光神殿廢墟',
    summary:
      '賽蓮娜·月弦發現銀翼持有某種與源核碎片相似的頻率，她用月弦弓試射一箭——不是攻擊，而是測試。銀翼的星橋消隱本能觸發了。',
  },
  {
    id: 'act1-ch3',
    title: '廢墟的訪客',
    act: 1,
    chapter: 3,
    location: '廢墟平原',
    summary:
      '澤菲爾·秘典出現，帶來關於「第三條路」的片段資訊。他告訴銀翼：源核碎裂之前，還有一種騎士既非共鳴也非吞噬——星核聖殿秩序的騎士。',
    unlocks: ['side-zephyr'],
  },
  {
    id: 'act1-ch4',
    title: '要塞的試煉',
    act: 1,
    chapter: 4,
    location: '熔金裂隙',
    summary:
      '渾沌陣營的格拉托斯·隕鐵攔截銀翼，不為陣營任務，只是純粹的戰意。銀翼在以一敵一的戰鬥中第一次感受到源核頻率的共鳴。',
  },

  // ── 第二幕：兩個真相 ──
  {
    id: 'act2-ch1',
    title: '星環聖殿的審問',
    act: 2,
    chapter: 1,
    location: '星環聖殿',
    summary:
      '銀翼被帶入星環聖殿。守護陣營的騎士們意見分歧：艾爾希亞相信他；佛雷爾不信任他。奧瑟里斯只說：「讓他自己說話。」',
    choices: [
      { id: 'c2a', text: '主動展示星核頻率', outcome: '守護陣營信任+大幅提升，但也引起索倫的注意' },
      { id: 'c2b', text: '保持沉默', outcome: '奧瑟里斯私下展開調查，支線「源核的記憶」提前觸發' },
    ],
  },
  {
    id: 'act2-ch2',
    title: '索倫的邀請',
    act: 2,
    chapter: 2,
    location: '星穹聖殿（遠端對話）',
    summary:
      '索倫·星滅第一次開口說話——不是命令，而是邀請。他告訴銀翼：「你不屬於他們。你屬於完整的源核。」銀翼看到索倫眼中不是野心，而是某種深刻的疲倦。',
    choices: [
      { id: 'c3a', text: '拒絕：我自己決定我屬於哪裡', outcome: '索倫路線關閉，最終幕觸發直接對抗' },
      { id: 'c3b', text: '沉默：我需要思考', outcome: '保留第三幕多個選擇分歧' },
    ],
  },
  {
    id: 'act2-ch3',
    title: '永恆的記憶',
    act: 2,
    chapter: 3,
    location: '星核聖殿廢墟',
    summary:
      '星核君主「永恆」甦醒。他認出銀翼：「你是最後的試驗體。源核碎裂前，星核聖殿秩序將頻率封存在一個容器裡——就是你。」',
    unlocks: ['unit-eternal'],
  },
  {
    id: 'act2-ch4',
    title: '裂縫之戰',
    act: 2,
    chapter: 4,
    location: '中立星橋（決戰）',
    summary: '兩大陣營在星橋爆發全面衝突。銀翼被迫選邊，或者——走第三條路。',
    choices: [
      { id: 'c4a', text: '守護陣營', outcome: '守護路線開啟' },
      { id: 'c4b', text: '渾沌陣營', outcome: '渾沌路線開啟' },
      { id: 'c4c', text: '守護星橋本身，不屬於任何一方', outcome: '第三道路結局觸發條件達成' },
    ],
  },

  // ── 第三幕：星核的選擇 ──
  {
    id: 'act3-ch1',
    title: '最後的騎士',
    act: 3,
    chapter: 1,
    location: '依第二幕選擇而異',
    summary:
      '（守護路線）奧瑟里斯與銀翼並肩迎戰索倫的最終攻勢。守護路線中，奧瑟里斯第一次動搖了「秩序=真理」的信念。',
  },
  {
    id: 'act3-ch2',
    title: '吞噬的終點',
    act: 3,
    chapter: 2,
    location: '星穹聖殿王座廳',
    summary: '索倫持有的七塊碎片開始失控——他沒有足夠的時間了。「我等了兩百年，不是為了戰爭，是為了終結。」',
  },
  {
    id: 'act3-ch3',
    title: '源核的答案',
    act: 3,
    chapter: 3,
    location: '源核碎裂的空間（最終場景）',
    summary: '銀翼面對所有碎片聚合的那一刻。他的選擇決定了宇宙的走向。',
    choices: [
      { id: 'end-a', text: '讓源核重新合一（索倫的方式）', outcome: '終結結局：世界重生但代價巨大' },
      { id: 'end-b', text: '讓碎片各自回到持有者手中，維持現狀', outcome: '守護結局：秩序延續，索倫長眠' },
      { id: 'end-c', text: '創造第三種可能——讓頻率共鳴而不融合', outcome: '銀翼結局：全新的星核形態誕生' },
    ],
  },

  // ── 支線 ──（unlocks 決定何時開放）
  {
    id: 'side-zephyr',
    title: '支線：秘典的代價',
    act: -1,
    chapter: -1,
    location: '星環聖殿魔法陣',
    summary: '澤菲爾知道所有關於源核的秘密，但知識本身正在蠶食他的存在。他請銀翼幫他完成最後一份秘典紀錄。',
  },
  {
    id: 'side-eternal',
    title: '支線：時代的見證',
    act: -1,
    chapter: -1,
    location: '星核聖殿廢墟',
    summary:
      '永恆告訴銀翼兩百年前的真相：源核是如何碎裂的，以及那個他從未被告知的事——原始的守護騎士和渾沌騎士，其實來自同一個陣營。',
    unlocks: ['unit-eternal'],
  },
]

export const STORY_DATA_BY_ID: Record<string, StoryChapter> = Object.fromEntries(
  STORY_DATA.map((c) => [c.id, c]),
)

/** 依 act（序章 0 / 支線 -1 排最後）與 chapter 排序後的主線＋支線章節 */
export function getOrderedStory(): StoryChapter[] {
  return [...STORY_DATA].sort((a, b) => {
    const actA = a.act < 0 ? Infinity : a.act
    const actB = b.act < 0 ? Infinity : b.act
    return actA - actB || a.chapter - b.chapter
  })
}
