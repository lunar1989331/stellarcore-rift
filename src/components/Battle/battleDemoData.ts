// 戰鬥畫面的固定資料：卡片格位型別、關卡/陣營旗幟的展示文字、以及餵給引擎的 3v3 名冊。
// 陣容／HP／SP／狀態不再是這裡的假資料——那些現在由 engine/battle.ts 的 runBattleSteps()
// 真正模擬出來，經 battleAdapter.ts 轉成下面這個 BattleUnitSlot 形狀給 UnitCard 用（見 CLAUDE.md
// Session 8）。前後排規則是引擎的 3v3（前 2 後 1），不是 Part A 示意圖畫的 5(2+3)——
// 陣列邏輯本身通用（BattleField 用 flex 置中排幾張都撐得住），只是這裡改填 3 個名冊。

import { getKnight } from '../../data/knights'
import type { Faction } from '../../data/types'
import type { StatusKey } from './battleTheme'

export interface BattleUnitSlot {
  knightId: string
  /** engine Combatant.uid——玩家反饋規格 v1.0 項目 B/C 需要精確指到「這一個」戰鬥單位
   * （knightId 只是騎士種類，一場戰鬥裡不會重複，但拿來當「選取目標」的 key 語意不對，
   * 換人代打／指定打擊目標都要送真正的 uid 給引擎）。 */
  uid: string
  /** 是否仍存活——項目 D 的 KO 演出、項目 B 的「可代打名單」判斷都需要明確的布林值，
   * 不能只靠 hpPct===0 反推（該欄位在陣亡時本來就會被 battleAdapter 直接歸零）。 */
  alive: boolean
  row: 'front' | 'back'
  /** 目前 HP 百分比（0–1） */
  hpPct: number
  /** 卡片上「★ 星核力：X」欄位，借來即時顯示目前 SP（見 battleAdapter.ts） */
  starCoreLevel: number
  /** SP 上限（engine Combatant.spCap，第三道路陣成立時會 +2）——橫式卡片的星核力改用圓點
   * 呈現，要知道上限才畫得出「已充能／未充能」的空圓點，只有目前值畫不出容量感。 */
  spCap: number
  statuses: StatusKey[]
  /** 坐騎是否仍合體存活（engine Combatant.mountAlive，真實狀態，不是可手動切換的示範開關） */
  isMounted?: boolean
}

export const LEVEL_NAME = '對戰模式'
export const LEVEL_NAME_EN = 'BATTLE MODE'

// 3v3 名冊（陣列順序＝前 2 後 1，見 engine/battle.ts makeCombatant 的 row 規則）。
// 沿用先前 demo 場景的角色選角：我方銀翼＋奧瑟里斯守前排、艾爾希亞守後排補治。
export const ALLY_IDS = ['silver-wing', 'osirath', 'elixia']

/**
 * 敵我識別 + 陣營對立規格書 v1.0 · 項目 A：敵方不再是固定「渾沌池」隨機抽，改成跟玩家隊伍
 * 對立的陣營——玩家選渾沌時，Session 20/21 的舊版 `normal` 池剛好也是渾沌，會出現主人
 * 2026-09-13 回報的「敵我雙方都是同一批人、視覺上分不出來」。
 *
 * 三個池就是三個陣營的完整名冊：guardian／chaos 各自排除該陣營留給玩家選的 BOSS/主角
 * （索倫·星滅保留作最終 BOSS，不進任何隨機池——這點跟 Session 20 的舊規則一致，沒有變動）；
 * independent 只放澤菲爾／艾索，銀翼·虛空是主角，不當成隨機出現的雜兵（Mina 原文的判斷，
 * 這裡直接採用，沒有另外的理由要覆蓋它）。
 */
export const ENEMY_POOL = {
  guardian: ['elixia', 'laros', 'aivia', 'selena', 'nautrus', 'frael', 'greln', 'sardin', 'osirath'],
  // Mina 給的清單裡 'ekron' 對不上 data/knights.ts 的實際 id（是 'eclron'）——跟 Session 20
  // 處理過的同一種typo，已比對修正。
  chaos: ['magnos', 'ignis', 'eclron', 'mordres', 'viel', 'holka', 'seres', 'gratos'],
  independent: ['zephyr', 'aiso'],
} as const

/**
 * 判斷玩家隊伍的主要陣營，決定要從哪個池抽對立的敵方陣容：
 * 隊伍全是獨立騎士 → 'independent'；否則守護/渾沌兩派誰的人數多就算誰的隊伍
 * （平手，例如 1 守護+1 渾沌+1 獨立，Mina 的原文用 `>=` 讓守護方在平手時勝出，這裡照抄——
 * 反正這只是拿來決定要抽哪個對立池，平手時抽渾沌或抽守護對玩法沒有本質影響）。
 */
export function getPlayerFaction(playerIds: readonly string[]): Faction {
  const knights = playerIds.map((id) => getKnight(id)).filter((k) => !!k)
  const guardianCount = knights.filter((k) => k.faction === 'guardian').length
  const chaosCount = knights.filter((k) => k.faction === 'chaos').length
  if (guardianCount === 0 && chaosCount === 0) return 'independent'
  return guardianCount >= chaosCount ? 'guardian' : 'chaos'
}

/**
 * 攻守回合切換節奏強化規格書（2026-09-19）追加指令：TurnPhaseBanner 的顏色/文字要依隊伍
 * 實際陣營組成決定，不是寫死「我方＝GUARDIAN、敵方＝CHAOS」。跟上面的 getPlayerFaction()
 * 是不同用途、故意不共用——那個函式是拿來決定「該從哪個池抽對立敵方」，平手時刻意讓守護方
 * 勝出（`guardianCount >= chaosCount`），且沒有「獨立騎士整隊過半」這個特判；這裡的規則是
 * 主人這次明確給的，兩者算法不一樣，硬共用只會讓其中一邊的行為跟指示對不上。
 *
 * orderedIds 必須是「玩家實際選角順序」（我方）或「該側名冊陣列順序」（敵方，沒有真正選角
 * 動作，用陣列順序本身當作「第一個」的替代品，理由跟主人說的「同上邏輯」一致）。
 *
 * 演算法：
 * 1. 獨立騎士數「嚴格多於」守護與渾沌兩者 → 'independent'（獨立騎士為主，銀白 STELLAR）。
 *    （只有 0 守護 0 渾沌全獨立，或獨立佔比最高時才會進這支，符合「以獨立為主」的字面意思。）
 * 2. 守護與渾沌人數相等（不論獨立騎士是 0 或跟他們也打平，例如 1 守護+1 渾沌+1 獨立這種
 *    三方均分的邊界情況）→ 用 orderedIds 裡第一個能查到資料的騎士，直接採用「他」的陣營
 *    （不特別排除獨立騎士——主人原文只說「以第一個選的騎士陣營為準」，沒有限定那個人一定要
 *    是守護或渾沌其中之一）。
 * 3. 其餘情況（獨立騎士未過半、守護渾沌人數不相等）→ 守護、渾沌兩者間人數較多的那個
 *    （獨立騎士不計入這個比較，見主人原文「獨立騎士計入混合隊伍時不計入守護或渾沌的數量」）。
 */
export function resolveTeamBannerFaction(orderedIds: readonly string[]): Faction {
  const knights = orderedIds.map((id) => getKnight(id)).filter((k): k is NonNullable<typeof k> => !!k)
  const guardianCount = knights.filter((k) => k.faction === 'guardian').length
  const chaosCount = knights.filter((k) => k.faction === 'chaos').length
  const independentCount = knights.filter((k) => k.faction === 'independent').length
  if (independentCount > guardianCount && independentCount > chaosCount) return 'independent'
  if (guardianCount === chaosCount) return knights[0]?.faction ?? 'independent'
  return guardianCount > chaosCount ? 'guardian' : 'chaos'
}

/** 依玩家陣營選對立的敵方池——守護對渾沌、渾沌對守護；純獨立隊沒有天生的對立陣營，
 * 預設對渾沌（Mina 原文的選擇，沒有特別理由要挑守護，兩邊對稱）。 */
function getEnemyPool(playerFaction: Faction): readonly string[] {
  switch (playerFaction) {
    case 'guardian':
      return ENEMY_POOL.chaos
    case 'chaos':
      return ENEMY_POOL.guardian
    case 'independent':
      return ENEMY_POOL.chaos
  }
}

/**
 * Fisher–Yates 洗牌（Session 20 已實裝，這裡沿用）。原本是
 * `[...arr].sort(() => Math.random() - 0.5)`——那個比較器不一致（同一組輸入比較兩次可能給
 * 不同答案），V8 的排序在這種情況下會產生嚴重偏斜的排列：實測 20 萬次抽樣，某些人被抽到
 * 第一位的機率差快 3 倍。改成真正均勻的洗牌。
 */
function shuffled<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * 產生敵方陣容：優先從跟玩家陣營對立的池抽（守護 vs 渾沌互抽對方），排除玩家自己隊伍裡
 * 已經選走的騎士；對立池扣掉玩家隊伍後人數不足 count 時，從獨立騎士池補位（也排除玩家隊伍
 * 跟已經抽到的人）。三段來源（對立池／獨立池）互斥，回傳值保證不重複、且不含玩家自己的隊員。
 *
 * ⚠️ 沒有實作 Mina 附錄第 4 步「仍不足時從任意剩餘池補位」：guardian／chaos 池各 8-9 人、
 * independent 只有 2 人，扣掉玩家隊伍最多 3 人，最壞情況（玩家湊了 3 個獨立騎士，把
 * independent 池唯二的兩位都佔滿）也還有 6-8 位對立池成員可抽，數學上到不了兩層都不夠、
 * 需要第三層任意池救援的情況——沒有這個分支不是漏做，是目前池子大小下用不到，真的湊不滿
 * 三層時（例如未來池子被縮編）加回來即可。
 */
export function generateEnemyIds(playerIds: readonly string[], count = 3): string[] {
  const playerFaction = getPlayerFaction(playerIds)
  const excluded = new Set(playerIds)
  const primary = shuffled(getEnemyPool(playerFaction).filter((id) => !excluded.has(id)))
  if (primary.length >= count) return primary.slice(0, count)

  const supplementPool = ENEMY_POOL.independent.filter((id) => !excluded.has(id) && !primary.includes(id))
  const supplement = shuffled(supplementPool)
  return [...primary, ...supplement].slice(0, count)
}

// UI 全面升級規格書 v1.0 · 項目 B：旗幟欄改成「陣營名＋口號→分隔線→場景資訊」的固定結構。
// 守護陣營的場景資訊就是這場戰鬥本身（星環聖殿），渾沌陣營則是獨立的陣營flavor文字
// （幽星辰墜落／我們仍將重見黎明），不是同一個場景名稱的重複——兩邊本來就沒有共用欄位，
// 拆成 sceneLabelEn（僅守護側顯示）／sceneName／sceneSubtitle 三個欄位，取代舊版
// subtitleEn/subtitleZh/footnote 那組語意含糊的欄位。
export const GUARDIAN_BANNER = {
  title: '守護陣營',
  lines: ['以星為誓', '守護一切光明'],
  sceneLabelEn: LEVEL_NAME_EN,
  sceneName: '廢墟平原',
  sceneSubtitle: '選擇你的陣營，決一勝負',
}

/** 永恆的聖域維持星環聖殿場景，旗幟文案沿用舊版。 */
export const GUARDIAN_BANNER_SANCTUARY = {
  ...GUARDIAN_BANNER,
  sceneLabelEn: 'STELLAR TEMPLE',
  sceneName: '星環聖殿',
  sceneSubtitle: '破碎中仍閃耀',
}

export const CHAOS_BANNER = {
  title: '混沌陣營',
  lines: ['盡是虛空流血', '世界能重生'],
  sceneName: '幽星辰墜落',
  sceneSubtitle: '我們仍將重見黎明',
}
