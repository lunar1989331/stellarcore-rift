// 戰場層（§4 場景背景 + §6/§7 前後排陣列）
// UI 全面升級規格書 v1.0 項目 D：右側縱向 SP 槽（SpGaugeVertical）已移除——SP 顯示統一由
// ActionBar 右下角的新版 SP 圓盤負責，兩個同時存在會重複顯示同一個數值（主人 2026-09-13 回報）。
// 問題⑤：戰場背景改用 Lisa 的正式素材（星環聖殿.png／星環聖殿：虛空裂切.png），CSS 漸層
// 降為疊在照片上的暗化濾鏡＋色調（§4「全畫面鋪滿，帶輕微暗化濾鏡」），不再是唯一的背景層。
import type { Knight } from '../../data/types'
import { resolveKnightImage } from '../../assets/knightImages'
import type { BattleUnitSlot } from './battleDemoData'
import type { FloatingHit } from './FloatingNumber'
import { StarfieldParticles } from './StarfieldParticles'
import { UnitCard } from './UnitCard'
import styles from './BattleField.module.css'

const SCENE_DEFAULT_IMG = resolveKnightImage('星環聖殿.png')
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
}: BattleFieldProps) {
  const targeting = !!targetableEnemyUids && targetableEnemyUids.size > 0
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
      <div className={styles.sceneBg} aria-hidden="true">
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
        <div className={`${styles.side} ${styles.enemySide}`}>
          {/* 項目 A：空格處理——這一排實際上沒有人（後排目前恆為 1 人，這裡仍保留判斷式以防
              隊伍設定改變）就整排不畫，讓上下相鄰的前排多分到高度，不留虛線佔位框。 */}
          {enemyBack.length > 0 && (
            <div className={`${styles.row} ${styles.backRow}`}>
              <Row
                slots={enemyBack}
                getKnight={getKnight}
                currentUnitId={currentUnitId}
                hits={hits}
                castingUnitId={castingUnitId}
                onSelect={onSelectEnemy ? (slot) => onSelectEnemy(slot.uid) : undefined}
                targetableIds={targetableEnemyUids}
              />
            </div>
          )}
          <div className={`${styles.row} ${styles.frontRow}`}>
            <Row
              slots={enemyFront}
              getKnight={getKnight}
              currentUnitId={currentUnitId}
              hits={hits}
              castingUnitId={castingUnitId}
              onSelect={onSelectEnemy ? (slot) => onSelectEnemy(slot.uid) : undefined}
              targetableIds={targetableEnemyUids}
            />
          </div>
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
