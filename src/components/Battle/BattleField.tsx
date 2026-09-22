// 戰場層（§4 場景背景 + §6/§7 前後排陣列）
// UI 全面升級規格書 v1.0 項目 D：右側縱向 SP 槽（SpGaugeVertical）已移除——SP 顯示統一由
// ActionBar 右下角的新版 SP 圓盤負責，兩個同時存在會重複顯示同一個數值（主人 2026-09-13 回報）。
// 問題⑤：戰場背景改用 Lisa 的正式素材（星環聖殿.png／星環聖殿：虛空裂切.png），CSS 漸層
// 降為疊在照片上的暗化濾鏡＋色調（§4「全畫面鋪滿，帶輕微暗化濾鏡」），不再是唯一的背景層。
import { useEffect, useState } from 'react'
import type { Knight } from '../../data/types'
import type { Combatant } from '../../engine/battle'
import { resolveKnightImage } from '../../assets/knightImages'
import type { BattleUnitSlot } from './battleDemoData'
import type { FloatingHit } from './FloatingNumber'
import { BossPanel } from './BossPanel'
import { StarfieldParticles } from './StarfieldParticles'
import { UnitCard } from './UnitCard'
import styles from './BattleField.module.css'

const SCENE_TEMPLE_IMG = resolveKnightImage('星環聖殿.png')
const SCENE_RUINS_IMG = resolveKnightImage('廢墟平原.png')
const SCENE_VOID_SLASH_IMG = resolveKnightImage('星環聖殿：虛空裂切.png')

interface BattleFieldProps {
  enemyFormation: BattleUnitSlot[]
  allyFormation: BattleUnitSlot[]
  getKnight: (id: string) => Knight | undefined
  currentUnitId: string
  hits: FloatingHit[]
  castingUnitId: string | null
  onSelectAlly?: (id: string) => void
  /** 項目 C：瞄準模式中點擊敵方卡片指定目標，回傳 engine Combatant.uid（不是 knightId，
   * 目標要精確指到「這一個」單位才能餵給 PlayerChoice.targetUid）。 */
  onSelectEnemy?: (uid: string) => void
  /** 項目 C：目前瞄準模式合法的敵方目標 uid 集合；非空時敵方卡片顯示準星，我方陣列整個暗化。 */
  targetableEnemyUids?: Set<string>
  /** 問題⑤：預設戰場背景／虛空裂切施放中的技能版背景，兩張圖疊放用 CSS opacity 淡入淡出切換。 */
  sceneVariant?: 'default' | 'void-slash'
  /** 攻守節奏強化規格書項目【3】：這個 uid 的敵方卡片要播放「行動前搖」邊框閃爍——
   * null／不在這一列裡就沒有效果，見 UnitCard.tsx 的 isTelegraphing prop。 */
  telegraphUnitId?: string | null
  /** 招式動畫 cut-in 指令（2026-09-19）：目前要全螢幕播放的招式動畫影片路徑，null＝沒有
   * 影片在播、維持原本場景背景。見 BattleScreen.tsx 的 playCutIn()／skillCutInVideos.ts。 */
  cutInVideoUrl?: string | null
  /** 影片自然播完（不循環）時呼叫——BattleScreen 用這個時機點觸發淡回原場景背景的下一步。 */
  onCutInEnded?: () => void
  /** 永恆的聖域：世界級 Boss 單位（有值時敵方半場改畫 BossPanel，不畫一般 2+1 卡片列）。 */
  bossCombatant?: Combatant
  /** 預設戰場背景：一般對戰＝廢墟平原、永恆的聖域＝星環聖殿。 */
  sceneBase?: 'ruins' | 'temple'
}

/**
 * UI 改善規格書 v2.0 項目 A：拿掉 Session 13 的「前3後2共5格＋虛線空格」視覺形狀
 * （見 CLAUDE.md Session 13／15）——玩家實測截圖顯示那個固定 5 格版面在真正的 3v3
 * （前2後1）下反而讓卡片擁擠、垂直堆疊互相遮擋。這裡改成「陣列裡有幾個真人就畫幾張卡」，
 * 不再補空格：3v3 本來就只有 2 前 1 後，直接照這個實際數字水平排列就不會有格位比人多的問題。
 * 注意：前/後排的分配本身仍然是 engine 的 Combatant.row（Q3：前2後1，決定誰能被非穿透
 * 單體技打到），不是規格書 v2.0 附錄那張「3人隊全部塞前排」的通用格位表——那張表沒有
 * 考慮到這個遊戲後排是有實際遊戲機制意義的（後排安全、除非 AoE／piercing／飛行坐騎），
 * 硬套用會讓玩家看不出誰在後排、判斷不了誰暫時打不到，見 CLAUDE.md Session 16。
 */
function Row({
  slots,
  getKnight,
  currentUnitId,
  hits,
  castingUnitId,
  onSelect,
  targetableIds,
  dimAll,
  telegraphUnitId,
}: {
  slots: BattleUnitSlot[]
  getKnight: (id: string) => Knight | undefined
  currentUnitId: string
  hits: FloatingHit[]
  castingUnitId: string | null
  onSelect?: (slot: BattleUnitSlot) => void
  /** 項目 C：瞄準模式中，這一列裡哪些 uid 是合法目標（會顯示準星）。 */
  targetableIds?: Set<string>
  /** 項目 C：瞄準模式啟動中，這一整列不是合法目標的來源（例如我方陣列）要暗化。 */
  dimAll?: boolean
  /** 攻守節奏強化規格書項目【3】：這一列裡哪個 uid 要播放行動前搖的邊框閃爍。 */
  telegraphUnitId?: string | null
}) {
  return (
    <>
      {slots.map((slot) => {
        const knight = getKnight(slot.knightId)
        if (!knight) return null
        const targetable = targetableIds?.has(slot.uid) ?? false
        return (
          <UnitCard
            key={slot.knightId}
            knight={knight}
            slot={slot}
            // BattleScreen 的 activeUnitId 存的是 engine Combatant.uid（見那邊
            // `allies.find((c) => c.uid === activeUnitId)`），不是 knightId——這裡原本拿
            // slot.knightId（'magnos'）去比 uid（'ally-magnos-0'），兩種格式永遠比不中，
            // 金色脈動選中框跟「當前行動」標籤因此從來沒有真的出現過。跟 Session 15 修飄字
            // 傷害數字、Session 19 修命中粒子定位是同一類 knightId/uid 混用的坑。
            isCurrent={slot.uid === currentUnitId}
            isCasting={slot.uid === castingUnitId}
            isTelegraphing={!!telegraphUnitId && slot.uid === telegraphUnitId}
            // 問題①遺留的舊 bug：這裡本來拿 slot.knightId 比對 h.targetId，但 targetId 其實是
            // engine 的 Combatant.uid（格式 `${side}-${knightId}-${index}`，如 'ally-elixia-2'），
            // 兩者格式不同永遠比不中——飄字傷害數字實際上從來沒有真的顯示過。改用 slot.uid 才對得上
            // battleAdapter.ts 的 planAnimation()／PlannedHit.targetId（見 CLAUDE.md Session 15）。
            hits={hits.filter((h) => h.targetId === slot.uid)}
            onSelect={onSelect ? () => onSelect(slot) : undefined}
            targetable={targetable}
            dimmed={!!dimAll && !targetable}
          />
        )
      })}
    </>
  )
}

export function BattleField({
  enemyFormation,
  allyFormation,
  getKnight,
  currentUnitId,
  hits,
  castingUnitId,
  onSelectAlly,
  onSelectEnemy,
  targetableEnemyUids,
  sceneVariant = 'default',
  telegraphUnitId,
  cutInVideoUrl,
  onCutInEnded,
  bossCombatant,
  sceneBase = 'ruins',
}: BattleFieldProps) {
  const SCENE_DEFAULT_IMG = sceneBase === 'temple' ? SCENE_TEMPLE_IMG : SCENE_RUINS_IMG
  const targeting = !!targetableEnemyUids && targetableEnemyUids.size > 0

  // 招式動畫 cut-in（2026-09-19 指令）：原本用 framer-motion 的 AnimatePresence + motion.video
  // 做淡入/淡出，實測（見這次修改的除錯過程）它的 exit 動畫完全不可靠——影片正確播放、
  // engine/畫面其餘部分也正確往下走（BattleScreen.tsx 的 playCutIn Promise 有 resolve），
  // 但 AnimatePresence 判斷「exit 動畫播完」的內部機制對 <video> 這個標籤似乎沒有正確觸發，
  // 導致舊的 <video> 元素永遠卡在 opacity:0、留在 DOM 裡不會真的被移除（每次 cut-in 觸發
  // 都會多洩漏一個節點）。改用這個檔案裡「.sceneImage 淡入淡出」已經驗證好用的做法——
  // 純 CSS transition 控制 opacity，不依賴 framer 的 exit 生命週期。
  //
  // phase 三態：entering（剛掛載，opacity 還是 0，下一幀才翻成可見）／visible（淡入完成，
  // 影片播放中）／exiting（cutInVideoUrl 變成 null，opacity 已經歸零，300ms 後才真的把
  // 節點從 state 清掉）。「掛載」與「開始淡出」用跟 BattleScreen.tsx 的 trackedActorUid
  // 同一招「render 期間比對 prop 調整 state」寫法（React 官方認可、不用 useEffect），
  // 真正的非同步排程（下一幀翻可見、300ms 後移除）才留給 useEffect——這樣 effect 裡
  // 每個 setState 呼叫都包在 rAF／setTimeout 的回呼裡，不會觸發 oxlint 的
  // set-state-in-effect（「effect 一進來就同步呼叫 setState」那種寫法才會被抓，見
  // CLAUDE.md Session 8 對 trackedActorUid 的說明）。
  type CutInPhase = 'entering' | 'visible' | 'exiting'
  const [cutInState, setCutInState] = useState<{ url: string; phase: CutInPhase } | null>(null)
  if (cutInVideoUrl && cutInState?.url !== cutInVideoUrl) {
    setCutInState({ url: cutInVideoUrl, phase: 'entering' })
  } else if (!cutInVideoUrl && cutInState && cutInState.phase !== 'exiting') {
    setCutInState({ ...cutInState, phase: 'exiting' })
  }

  useEffect(() => {
    if (!cutInState) return
    if (cutInState.phase === 'entering') {
      const raf = requestAnimationFrame(() => {
        setCutInState((prev) =>
          prev && prev.url === cutInState.url && prev.phase === 'entering' ? { ...prev, phase: 'visible' } : prev,
        )
      })
      return () => cancelAnimationFrame(raf)
    }
    if (cutInState.phase === 'exiting') {
      const t = window.setTimeout(() => {
        setCutInState((prev) => (prev && prev.url === cutInState.url ? null : prev))
      }, 300)
      return () => window.clearTimeout(t)
    }
  }, [cutInState])

  // 項目 A：直接用 engine 實際分到前/後排的人數，不再補到固定 3／2 格（見上面 Row 的說明）。
  const enemyBack = enemyFormation.filter((s) => s.row === 'back')
  const enemyFront = enemyFormation.filter((s) => s.row === 'front')
  const allyFront = allyFormation.filter((s) => s.row === 'front')
  const allyBack = allyFormation.filter((s) => s.row === 'back')

  return (
    <div className={styles.field}>
      {/* 問題⑤：opacity 直接寫 inline style、不靠 .sceneImageActive 這個 class 疊加——
          CSS Modules 打包後兩個 class 在最終樣式表裡的實際先後順序跟原始檔案不一定一樣
          （踩過這個坑：swap 完 class 名稱明明對，opacity 卻整個相反），inline style
          優先權最高，不會有這種「規則順序被打包工具重排」的不確定性。 */}
      {SCENE_DEFAULT_IMG && (
        <div
          className={styles.sceneImage}
          style={{ backgroundImage: `url(${SCENE_DEFAULT_IMG})`, opacity: sceneVariant === 'default' ? 1 : 0 }}
          aria-hidden="true"
        />
      )}
      {SCENE_VOID_SLASH_IMG && (
        <div
          className={styles.sceneImage}
          style={{ backgroundImage: `url(${SCENE_VOID_SLASH_IMG})`, opacity: sceneVariant === 'void-slash' ? 1 : 0 }}
          aria-hidden="true"
        />
      )}
      {/* 招式動畫 cut-in（2026-09-19 指令）：疊在跟上面兩張靜態背景圖同一層（.cutInVideo
          也是 z-index:0）。opacity 淡入/淡出用 inline style + CSS transition（見上面
          cutInState 的說明，為什麼不用 framer-motion）；key={cutInState.url} 確保每次播放
          都是全新掛載的 <video>，天然從第 0 秒開始播、不循環（沒設 loop）；autoPlay 搭配
          muted 是瀏覽器允許程式化自動播放的必要條件（這批 cut-in 是純視覺演出，不含需要
          保留的對白/音效，靜音沒有內容損失）。 */}
      {cutInState && (
        <video
          key={cutInState.url}
          className={styles.cutInVideo}
          src={cutInState.url}
          autoPlay
          muted
          playsInline
          onEnded={onCutInEnded}
          style={{ opacity: cutInState.phase === 'visible' ? 1 : 0 }}
          aria-hidden="true"
        />
      )}
      <div
        className={`${styles.sceneBg} ${bossCombatant?.boss ? (bossCombatant.boss.phase === 2 ? styles.sanctuaryP2 : styles.sanctuaryP1) : ''}`}
        aria-hidden="true"
      >
        <div className={styles.ruinColumnsTop} />
        <div className={styles.ruinColumnsBottom} />
        <div className={styles.ringGlow} />
      </div>
      <StarfieldParticles />

      <div className={styles.formations}>
        {/* 項目 A 修正（2026-09-14）：敵我各自包一層 .side wrapper、各拿 .formations 一半高度
            （flex:1 1 0，兩邊相等）——原本 4 排＋分隔線全部是 .formations 的直接子元素，
            靠 justify-content:space-evenly 平均分配間距，但沒有任何東西保證「敵方兩排」跟
            「我方兩排」各自加起來的高度相等，敵方後排+前排的內容只要比我方多／大一點，
            整個敵方區塊就會把我方擠向技能列（主人回報的「上重下輕」）。包一層 wrapper、
            各自 flex:1，兩邊天生拿到相同高度，內部再用 space-evenly 分前後排。 */}
        <div className={`${styles.side} ${styles.enemySide} ${bossCombatant ? styles.bossSide : ''}`}>
          {bossCombatant && (
            <BossPanel
              boss={bossCombatant}
              hits={hits.filter((h) => h.targetId === bossCombatant.uid)}
              isCasting={bossCombatant.uid === castingUnitId}
              isTelegraphing={!!telegraphUnitId && bossCombatant.uid === telegraphUnitId}
              targetable={targetableEnemyUids?.has(bossCombatant.uid) ?? false}
              onSelect={
                onSelectEnemy && targetableEnemyUids?.has(bossCombatant.uid)
                  ? () => onSelectEnemy(bossCombatant.uid)
                  : undefined
              }
            />
          )}
          {/* 項目 A：空格處理——這一排實際上沒有人（後排目前恆為 1 人，這裡仍保留判斷式以防
              隊伍設定改變）就整排不畫，讓上下相鄰的前排多分到高度，不留虛線佔位框。 */}
          {!bossCombatant && enemyBack.length > 0 && (
            <div className={`${styles.row} ${styles.backRow}`}>
              <Row
                slots={enemyBack}
                getKnight={getKnight}
                currentUnitId={currentUnitId}
                hits={hits}
                castingUnitId={castingUnitId}
                onSelect={onSelectEnemy ? (slot) => onSelectEnemy(slot.uid) : undefined}
                targetableIds={targetableEnemyUids}
                telegraphUnitId={telegraphUnitId}
              />
            </div>
          )}
          {!bossCombatant && (
          <div className={`${styles.row} ${styles.frontRow}`}>
            <Row
              slots={enemyFront}
              getKnight={getKnight}
              currentUnitId={currentUnitId}
              hits={hits}
              castingUnitId={castingUnitId}
              onSelect={onSelectEnemy ? (slot) => onSelectEnemy(slot.uid) : undefined}
              targetableIds={targetableEnemyUids}
              telegraphUnitId={telegraphUnitId}
            />
          </div>
          )}
        </div>

        {/* 項目 A-④：敵我分隔線，戰場正中央一條細金線。 */}
        <div className={styles.divider} aria-hidden="true" />

        <div className={`${styles.side} ${styles.playerSide}`}>
          <div className={`${styles.row} ${styles.frontRow}`}>
            <Row
              slots={allyFront}
              getKnight={getKnight}
              currentUnitId={currentUnitId}
              hits={hits}
              castingUnitId={castingUnitId}
              onSelect={onSelectAlly ? (slot) => onSelectAlly(slot.knightId) : undefined}
              dimAll={targeting}
            />
          </div>
          {allyBack.length > 0 && (
            <div className={`${styles.row} ${styles.backRow}`}>
              <Row
                slots={allyBack}
                getKnight={getKnight}
                currentUnitId={currentUnitId}
                hits={hits}
                castingUnitId={castingUnitId}
                onSelect={onSelectAlly ? (slot) => onSelectAlly(slot.knightId) : undefined}
                dimAll={targeting}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BattleField
