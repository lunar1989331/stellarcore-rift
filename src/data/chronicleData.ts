// Chronicle Mode（劇情模式）資料層：域（Domain）與關卡節點（BattleNode）定義，
// 依《CHRONICLE_MODE_SPEC_v1.0》§6/§7/§11 與《HANDOFF_PHASE1B_2026-09-26.md》全量補完。
// Phase 1-A 只有序章＋守護/渾沌各一個域；這次補完兩條線全部域（各 6 域＋共用序章）。
//
// ⚠️ 判讀（供覆核）：
// 1. HANDOFF 附錄範例的敵方 id 用的是 `FULL_SPEC_v1_1_for_ClaudeCode.md` 那份英文 id
//    （如 'magnos-doomsfire'），這個專案 `data/knights.ts` 實際用短 id（如 'magnos'）——
//    跟 Session 20/23/27 遇到的落差同一種情況，這裡逐一手動轉換成短 id（詳見下方各域註解）。
// 2. HANDOFF 部分關卡只給 2 位敵方，這裡統一補到 3 位以符合 engine／TeamSelect 從 Session 1
//    就驗證過的「剛好 3 人」3v3 規模；補位一律從同一域已出現過的角色裡選，不憑空加新角色。
// 3. HANDOFF 的渾沌線第一個域在文件裡叫 'dooms-battlefield'（跟 chronicleDialogues.ts 的
//    DOMAIN_DIALOGUES key 一致），Phase 1-A 當時實作用的是 'doomsday-battlefield'——這次
//    改名對齊，兩份新資料的 key 才對得上（存檔裡舊的 completedBattles/unlockedDomains 字串
//    不受影響，因為改的是域 id 不是關卡 id，且目前仍是測試階段沒有正式玩家存檔要遷移）。
// 4. 序章域的 id 沿用 Phase 1-A 就定的 'prologue-bridge'（`useChronicleSave.ts` 的
//    `PROLOGUE_DOMAIN_ID` 常數、預設存檔的 `unlockedDomains` 初始值都在用這個字串），
//    但 chronicleDialogues.ts 裡對應的對白 key 是 Mina 取的 'neutral-bridge'——兩邊只是
//    key 名字不同、指的是同一個域，這裡用一行對照表接起來，不用改動既有的
//    `PROLOGUE_DOMAIN_ID`／存檔邏輯。
// 5. 移除 Phase 1-A 自創的 `Domain.quote`（域詳細頁的靜態一句話引言）——現在每個域都有
//    Mina 給的完整 prologueDialogue／epilogueDialogue 全螢幕演出，語意上已經涵蓋、甚至
//    超過原本 quote 想做的事，兩份資料同時維護容易對不上，直接讓 quote 走入歷史。
//    `DomainDetail.tsx` 也跟著移除了 quote box 的渲染。
// 6. 域內關卡解鎖／「域完成」的判定改成「這是不是這個域 battles 陣列的最後一個節點」，
//    不是原本 HANDOFF 字面寫的「type==='domain-boss' 才算」——序章域（prologue-bridge）的
//    兩場都是 tutorial 類型、沒有 domain-boss，如果照字面只認 domain-boss，序章永遠打不完
//    就無法解鎖下一個域。「最後一戰＝域完成」對其餘域（最後一戰恰好都是 domain-boss）結果
//    完全一樣，額外正確處理了序章這個特例。詳見 `ChronicleTeamSelect.tsx` 的判斷邏輯。
import { getKnight, KNIGHTS } from './knights'
import type { Faction } from './types'
import type { DialogueLine } from './chronicleDialogues'
import { DOMAIN_DIALOGUES } from './chronicleDialogues'

export type BattleNodeType = 'tutorial' | 'normal' | 'elite' | 'domain-boss'

export interface EliteRule {
  type: 'enemy-buffed'
  description: string
}

export interface BattleNode {
  id: string
  type: BattleNodeType
  label: string
  /** 敵方騎士 id 陣列（data/knights.ts 的短 id），固定 3 位，對應 engine 既有的 3v3 規模。 */
  enemyIds: readonly string[]
  /** 精英戰規則——Phase 1-B 接進引擎（見 ChronicleTeamSelect.tsx 的 eliteAtkMultiplier）。 */
  eliteRule?: EliteRule
}

export interface Domain {
  id: string
  name: string
  nameEn: string
  chapter: string
  /** 戰場背景——沿用 BattleField 既有的 sceneBase（Phase 1-B 新增 'throne' 對應星穹聖殿王座廳）。 */
  sceneBase: 'ruins' | 'temple' | 'throne'
  /** 地圖節點座標（百分比，StarBridgeMap 用絕對定位擺放）。 */
  position: { x: number; y: number }
  /** 陣營限定；undefined＝雙方共用（序章）。 */
  faction?: Faction
  isShared?: boolean
  battles: BattleNode[]
  unlocksAfter: string | null
  unlocksNext?: string
  /** 進域前的劇情對白，DomainDetail 首次進入時播放（見 §15-2 注意事項）。 */
  prologueDialogue?: DialogueLine[]
  /** 域主戰（該域最後一關）首次通關後的劇情對白，ChronicleTeamSelect 播放完才回地圖。 */
  epilogueDialogue?: DialogueLine[]
}

export const PROLOGUE_DOMAIN_ID = 'prologue-bridge'

export const DOMAINS: Domain[] = [
  // ═══════════════════════════ 序章（共用） ═══════════════════════════
  {
    id: PROLOGUE_DOMAIN_ID,
    name: '中立星橋',
    nameEn: 'Neutral Star Bridge',
    chapter: '序章',
    sceneBase: 'ruins',
    position: { x: 12, y: 50 },
    isShared: true,
    unlocksAfter: null,
    prologueDialogue: DOMAIN_DIALOGUES['neutral-bridge'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['neutral-bridge'].epilogue,
    battles: [
      { id: 'tutorial-1', type: 'tutorial', label: '序-1 初試身手', enemyIds: ['eclron', 'holka', 'seres'] },
      { id: 'tutorial-2', type: 'tutorial', label: '序-2 裂隙遊魂', enemyIds: ['mordres', 'gratos', 'viel'] },
    ],
  },

  // ═══════════════════════════ 守護線 ═══════════════════════════
  {
    id: 'gothic-temple',
    name: '哥德聖殿域',
    nameEn: 'Gothic Sanctum',
    chapter: '第一幕・Chapter 1',
    sceneBase: 'temple',
    position: { x: 25, y: 35 },
    faction: 'guardian',
    unlocksAfter: PROLOGUE_DOMAIN_ID,
    unlocksNext: 'desert-shrine',
    prologueDialogue: DOMAIN_DIALOGUES['gothic-temple'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['gothic-temple'].epilogue,
    battles: [
      { id: 'gt-1', type: 'normal', label: '1-1 聖殿前哨戰', enemyIds: ['ignis', 'eclron', 'holka'] },
      {
        id: 'gt-2',
        type: 'elite',
        label: '1-2 精英巡邏隊',
        enemyIds: ['magnos', 'holka', 'seres'],
        eliteRule: { type: 'enemy-buffed', description: '敵方攻擊力 +25%' },
      },
      { id: 'gt-boss', type: 'domain-boss', label: '1-3 域主：瑪格諾斯·終焰', enemyIds: ['magnos', 'viel', 'seres'] },
    ],
  },
  {
    // HANDOFF enemyComposition：mordres-blackiron／gratos-meteoriron／ignis-karmaflame
    // → mordres／gratos／ignis。ds-1／ds-2 原文各只給 2 位，補第 3 位時從本域 ds-boss
    // 既有的三人裡挑（ds-1 補 ignis、ds-2 補 gratos），不引入新角色。
    id: 'desert-shrine',
    name: '沙漠古神殿域',
    nameEn: 'Desert Shrine',
    chapter: '第一幕・Chapter 2',
    sceneBase: 'ruins',
    position: { x: 40, y: 25 },
    faction: 'guardian',
    unlocksAfter: 'gothic-temple',
    unlocksNext: 'sky-island',
    prologueDialogue: DOMAIN_DIALOGUES['desert-shrine'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['desert-shrine'].epilogue,
    battles: [
      { id: 'ds-1', type: 'normal', label: 'Ch.2-1 荒漠前哨', enemyIds: ['mordres', 'gratos', 'ignis'] },
      {
        id: 'ds-2',
        type: 'elite',
        label: 'Ch.2-2 精英奇襲',
        enemyIds: ['ignis', 'holka', 'gratos'],
        eliteRule: { type: 'enemy-buffed', description: '敵方攻擊力 +25%' },
      },
      { id: 'ds-boss', type: 'domain-boss', label: 'Ch.2-3 域主：莫德雷斯·黑鐵', enemyIds: ['mordres', 'gratos', 'ignis'] },
    ],
  },
  {
    // HANDOFF：viel-darkblight／seres-thunderprison／eclron-moonblight → viel／seres／eclron。
    // si-1／si-2 補位分別加 eclron、seres（都是 si-boss 既有的三人）。
    id: 'sky-island',
    name: '天空浮島域',
    nameEn: 'Sky Island',
    chapter: '第一幕・Chapter 3',
    sceneBase: 'ruins',
    position: { x: 55, y: 20 },
    faction: 'guardian',
    unlocksAfter: 'desert-shrine',
    unlocksNext: 'ruined-plain-guardian',
    prologueDialogue: DOMAIN_DIALOGUES['sky-island'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['sky-island'].epilogue,
    battles: [
      { id: 'si-1', type: 'normal', label: 'Ch.3-1 浮島邊境', enemyIds: ['viel', 'seres', 'eclron'] },
      {
        id: 'si-2',
        type: 'elite',
        label: 'Ch.3-2 空中追擊',
        enemyIds: ['eclron', 'holka', 'seres'],
        eliteRule: { type: 'enemy-buffed', description: '敵方攻擊力 +25%' },
      },
      { id: 'si-boss', type: 'domain-boss', label: 'Ch.3-3 域主：維艾爾·暗蝕', enemyIds: ['viel', 'eclron', 'seres'] },
    ],
  },
  {
    // HANDOFF：magnos-doomsfire／ignis-karmaflame／viel-darkblight／holka-blazewing／
    // gratos-meteoriron → magnos／ignis／viel／holka／gratos。rp-g-1 原文只給 2 位，
    // 補 holka（rp-g-boss 既有的第 3 人）。
    id: 'ruined-plain-guardian',
    name: '廢墟平原域',
    nameEn: 'Ruined Plain',
    chapter: '第二幕',
    sceneBase: 'ruins',
    position: { x: 65, y: 40 },
    // 注意：這裡不設 isShared——那個旗標的語意是「不分玩家選哪個陣營都顯示同一個域」
    // （序章 prologue-bridge 才是這種），跟這裡「守護渾沌各自有自己一份『廢墟平原域』」
    // 是不同情況；`domainsForFaction()` 靠 `faction` 欄位本身就能正確篩選，設了 isShared
    // 反而會讓這個域在對立陣營的地圖上也跑出來（真的踩到過這個 bug，見下方 rp-c 同款註解）。
    faction: 'guardian',
    unlocksAfter: 'sky-island',
    unlocksNext: 'stellar-temple-guardian',
    prologueDialogue: DOMAIN_DIALOGUES['ruined-plain-guardian'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['ruined-plain-guardian'].epilogue,
    battles: [
      { id: 'rp-g-1', type: 'normal', label: '廢墟-1 記憶碎片', enemyIds: ['magnos', 'ignis', 'holka'] },
      {
        id: 'rp-g-2',
        type: 'elite',
        label: '廢墟-2 渾沌伏兵',
        enemyIds: ['viel', 'holka', 'gratos'],
        eliteRule: { type: 'enemy-buffed', description: '敵方攻擊力 +25%' },
      },
      { id: 'rp-g-boss', type: 'domain-boss', label: '廢墟-Boss 瑪格諾斯·終焰', enemyIds: ['magnos', 'ignis', 'holka'] },
    ],
  },
  {
    // HANDOFF：holka-blazewing／seres-thunderprison／magnos-doomsfire／viel-darkblight／
    // gratos-meteoriron／ignis-karmaflame → holka／seres／magnos／viel／gratos／ignis。
    // st-g-1 原文只給 2 位，補 magnos（本域其他戰都有出現）。
    id: 'stellar-temple-guardian',
    name: '星環聖殿攻防域',
    nameEn: 'Stellar Temple Defense',
    chapter: '第三幕',
    sceneBase: 'temple',
    position: { x: 78, y: 30 },
    faction: 'guardian',
    unlocksAfter: 'ruined-plain-guardian',
    unlocksNext: 'final-domain-guardian',
    prologueDialogue: DOMAIN_DIALOGUES['stellar-temple-guardian'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['stellar-temple-guardian'].epilogue,
    battles: [
      { id: 'st-g-1', type: 'normal', label: '聖殿-1 前庭防守', enemyIds: ['holka', 'seres', 'magnos'] },
      {
        id: 'st-g-2',
        type: 'elite',
        label: '聖殿-2 中庭決戰',
        enemyIds: ['magnos', 'viel', 'gratos'],
        eliteRule: { type: 'enemy-buffed', description: '敵方攻擊力 +25%' },
      },
      { id: 'st-g-boss', type: 'domain-boss', label: '聖殿-Boss 索倫·星滅先鋒隊', enemyIds: ['magnos', 'ignis', 'seres'] },
    ],
  },
  {
    // HANDOFF：solren-starfall／magnos-doomsfire／ignis-karmaflame／viel-darkblight
    // → solren／magnos／ignis／viel。fd-g-1 原文只給 2 位，補 viel（fd-g-boss 既有）。
    id: 'final-domain-guardian',
    name: '星穹聖殿・終局',
    nameEn: 'Stellar Throne · Final',
    chapter: '第四幕・終局',
    sceneBase: 'throne',
    position: { x: 90, y: 50 },
    faction: 'guardian',
    unlocksAfter: 'stellar-temple-guardian',
    prologueDialogue: DOMAIN_DIALOGUES['final-domain-guardian'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['final-domain-guardian'].epilogue,
    battles: [
      { id: 'fd-g-1', type: 'normal', label: '終局-1 王座前廳', enemyIds: ['magnos', 'ignis', 'viel'] },
      { id: 'fd-g-boss', type: 'domain-boss', label: '終局-Boss 索倫·星滅', enemyIds: ['solren', 'magnos', 'viel'] },
    ],
  },

  // ═══════════════════════════ 渾沌線 ═══════════════════════════
  {
    // 判讀③：域 id 從 Phase 1-A 的 'doomsday-battlefield' 改名成 'dooms-battlefield'，
    // 對齊 HANDOFF／chronicleDialogues.ts 的 DOMAIN_DIALOGUES key。
    id: 'dooms-battlefield',
    name: '末日戰場域',
    nameEn: 'Doomsday Battlefield',
    chapter: '第一幕・Chapter 1',
    sceneBase: 'ruins',
    position: { x: 25, y: 65 },
    faction: 'chaos',
    unlocksAfter: PROLOGUE_DOMAIN_ID,
    unlocksNext: 'hell-fortress',
    prologueDialogue: DOMAIN_DIALOGUES['dooms-battlefield'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['dooms-battlefield'].epilogue,
    battles: [
      { id: 'db-1', type: 'normal', label: '1-1 荒原遭遇戰', enemyIds: ['elixia', 'frael', 'selena'] },
      {
        id: 'db-2',
        type: 'elite',
        label: '1-2 聖殿遠征隊',
        enemyIds: ['laros', 'aivia', 'nautrus'],
        eliteRule: { type: 'enemy-buffed', description: '敵方攻擊力 +25%' },
      },
      { id: 'db-boss', type: 'domain-boss', label: '1-3 域主：奧瑟里斯·星裁', enemyIds: ['osirath', 'elixia', 'greln'] },
    ],
  },
  {
    // HANDOFF：elixia-holyblade／frael-frostfang／laros-dawnfire／sardin-azurewall／
    // greln-moltenshield → elixia／frael／laros／sardin／greln。hf-1 補 sardin、
    // hf-2 補 greln（都是本域 hf-boss 既有三人）。
    id: 'hell-fortress',
    name: '地獄要塞域',
    nameEn: 'Hell Fortress',
    chapter: '第一幕・Chapter 2',
    sceneBase: 'ruins',
    position: { x: 40, y: 75 },
    faction: 'chaos',
    unlocksAfter: 'dooms-battlefield',
    unlocksNext: 'moonblight-waste',
    prologueDialogue: DOMAIN_DIALOGUES['hell-fortress'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['hell-fortress'].epilogue,
    battles: [
      { id: 'hf-1', type: 'normal', label: 'Ch.2-1 要塞外壁', enemyIds: ['elixia', 'frael', 'sardin'] },
      {
        id: 'hf-2',
        type: 'elite',
        label: 'Ch.2-2 聖光突破隊',
        enemyIds: ['laros', 'sardin', 'greln'],
        eliteRule: { type: 'enemy-buffed', description: '敵方攻擊力 +25%' },
      },
      { id: 'hf-boss', type: 'domain-boss', label: 'Ch.2-3 域主：拉奧斯·日輝', enemyIds: ['laros', 'elixia', 'greln'] },
    ],
  },
  {
    // HANDOFF：selena-moonstring／aivia-jadestorm／nautrus-deeptide
    // → selena／aivia／nautrus。mw-1 補 nautrus、mw-2 補 aivia（都是本域既有三人）。
    id: 'moonblight-waste',
    name: '蝕月荒原域',
    nameEn: 'Moonblight Waste',
    chapter: '第一幕・Chapter 3',
    sceneBase: 'ruins',
    position: { x: 55, y: 80 },
    faction: 'chaos',
    unlocksAfter: 'hell-fortress',
    unlocksNext: 'ruined-plain-chaos',
    prologueDialogue: DOMAIN_DIALOGUES['moonblight-waste'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['moonblight-waste'].epilogue,
    battles: [
      { id: 'mw-1', type: 'normal', label: 'Ch.3-1 月光陷阱', enemyIds: ['selena', 'aivia', 'nautrus'] },
      {
        id: 'mw-2',
        type: 'elite',
        label: 'Ch.3-2 月神廢墟',
        enemyIds: ['selena', 'nautrus', 'aivia'],
        eliteRule: { type: 'enemy-buffed', description: '敵方攻擊力 +25%' },
      },
      { id: 'mw-boss', type: 'domain-boss', label: 'Ch.3-3 域主：賽蓮娜·月弦', enemyIds: ['selena', 'aivia', 'nautrus'] },
    ],
  },
  {
    // HANDOFF：elixia-holyblade／frael-frostfang／osirath-stellarblade／greln-moltenshield／
    // sardin-azurewall → elixia／frael／osirath／greln／sardin。rp-c-1 補 osirath、
    // rp-c-2 補 sardin（都是本域 rp-c-boss 既有三人）。
    id: 'ruined-plain-chaos',
    name: '廢墟平原域',
    nameEn: 'Ruined Plain',
    chapter: '第二幕',
    sceneBase: 'ruins',
    position: { x: 65, y: 60 },
    // 同上（見 ruined-plain-guardian 的註解）：不設 isShared，靠 faction 欄位篩選就好。
    faction: 'chaos',
    unlocksAfter: 'moonblight-waste',
    unlocksNext: 'throne-assault',
    prologueDialogue: DOMAIN_DIALOGUES['ruined-plain-chaos'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['ruined-plain-chaos'].epilogue,
    battles: [
      { id: 'rp-c-1', type: 'normal', label: '廢墟-1 守護殘部', enemyIds: ['elixia', 'frael', 'osirath'] },
      {
        id: 'rp-c-2',
        type: 'elite',
        label: '廢墟-2 最後防線',
        enemyIds: ['osirath', 'greln', 'sardin'],
        eliteRule: { type: 'enemy-buffed', description: '敵方攻擊力 +25%' },
      },
      { id: 'rp-c-boss', type: 'domain-boss', label: '廢墟-Boss 奧瑟里斯·星裁', enemyIds: ['osirath', 'elixia', 'sardin'] },
    ],
  },
  {
    // HANDOFF：sardin-azurewall／greln-moltenshield／osirath-stellarblade／elixia-holyblade／
    // laros-dawnfire → sardin／greln／osirath／elixia／laros。ta-1 補 osirath（本域 boss 既有）。
    id: 'throne-assault',
    name: '星環聖殿侵攻域',
    nameEn: 'Stellar Temple Assault',
    chapter: '第三幕',
    sceneBase: 'temple',
    position: { x: 78, y: 70 },
    faction: 'chaos',
    unlocksAfter: 'ruined-plain-chaos',
    unlocksNext: 'final-domain-chaos',
    prologueDialogue: DOMAIN_DIALOGUES['throne-assault'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['throne-assault'].epilogue,
    battles: [
      { id: 'ta-1', type: 'normal', label: '侵攻-1 聖殿入口', enemyIds: ['sardin', 'greln', 'osirath'] },
      {
        id: 'ta-2',
        type: 'elite',
        label: '侵攻-2 聖殿核心',
        enemyIds: ['osirath', 'elixia', 'laros'],
        eliteRule: { type: 'enemy-buffed', description: '敵方攻擊力 +25%' },
      },
      { id: 'ta-boss', type: 'domain-boss', label: '侵攻-Boss 奧瑟里斯·星裁（最後防守）', enemyIds: ['osirath', 'sardin', 'greln'] },
    ],
  },
  {
    // HANDOFF：solren-starfall／magnos-doomsfire／ignis-karmaflame／elixia-holyblade／
    // laros-dawnfire → solren／magnos／ignis／elixia／laros。fd-c-1 補 magnos
    // （fd-c-boss 既有、渾沌線終局的戰場延續感）。
    id: 'final-domain-chaos',
    name: '星穹聖殿・終局',
    nameEn: 'Stellar Throne · Final',
    chapter: '第四幕・終局',
    sceneBase: 'throne',
    position: { x: 90, y: 50 },
    faction: 'chaos',
    unlocksAfter: 'throne-assault',
    prologueDialogue: DOMAIN_DIALOGUES['final-domain-chaos'].prologue,
    epilogueDialogue: DOMAIN_DIALOGUES['final-domain-chaos'].epilogue,
    battles: [
      { id: 'fd-c-1', type: 'normal', label: '終局-1 王座近衛', enemyIds: ['elixia', 'laros', 'magnos'] },
      { id: 'fd-c-boss', type: 'domain-boss', label: '終局-Boss 索倫·星滅（最終形態）', enemyIds: ['solren', 'magnos', 'ignis'] },
    ],
  },
]

export function getDomain(id: string): Domain | undefined {
  return DOMAINS.find((d) => d.id === id)
}

export function getBattleNode(domainId: string, battleId: string): BattleNode | undefined {
  return getDomain(domainId)?.battles.find((b) => b.id === battleId)
}

export function getDomainByBattleId(battleId: string): Domain | undefined {
  return DOMAINS.find((d) => d.battles.some((b) => b.id === battleId))
}

/** 玩家這輪陣營能看見的域：序章（共用）＋自己陣營的域。 */
export function domainsForFaction(faction: Faction): Domain[] {
  return DOMAINS.filter((d) => d.isShared || d.faction === faction)
}

/** 這場關卡是不是它所屬域「battles 陣列的最後一個」——用來判斷要不要解鎖下一個域、
 * 要不要在勝利後播放 epilogueDialogue（見上面判讀 6）。 */
export function isDomainFinalBattle(domain: Domain, battleId: string): boolean {
  return domain.battles[domain.battles.length - 1]?.id === battleId
}

/** 這個域的所有關卡是否都已通關——Phase 1-C 星橋地圖節點／路線視覺共用同一個判斷，
 * 不要各自重算一份（原本 `StarBridgeMap.tsx` 自己內嵌了一份幾乎一樣的邏輯）。 */
export function isDomainCompleted(domain: Domain, completedBattles: readonly string[]): boolean {
  return domain.battles.every((b) => completedBattles.includes(b.id))
}

/**
 * chronicleDialogues.ts 裡的 portrait 欄位用的是「長 id」（如 'argentwing-null'，
 * 從騎士 nameEn 轉小寫、把 '·' 換成 '-'），跟 `data/knights.ts` 實際的短 id 不是同一套。
 * 這裡動態建一份「長 id → 短 id」對照表（用 KNIGHTS 的 nameEn 反推，不用手動列 21 條），
 * 找不到就原樣當短 id 用——這樣兩種寫法（Mina 的長 id／Phase 1-A 既有的短 id）都吃得下，
 * 供 `pages/Chronicle/DialogueSequence.tsx` 解析立繪用。
 */
const LONG_ID_ALIASES: Record<string, string> = Object.fromEntries(
  KNIGHTS.map((k) => [k.nameEn.toLowerCase().replace(/·/g, '-'), k.id]),
)

export function resolveDialogueKnightId(id?: string): string | undefined {
  if (!id) return undefined
  const shortId = LONG_ID_ALIASES[id] ?? id
  return getKnight(shortId) ? shortId : undefined
}
