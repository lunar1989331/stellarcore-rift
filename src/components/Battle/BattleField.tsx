// 戰場層——battle-hud-v2 樣板完整整合：對齊 index.html 的
// <section class="battle-stage"><div class="stage-content">
//   team-heading(敵) → enemy-line → stage-middle → ally-line → team-heading(我)
// </div></section> 版面順序與資訊層級。
//
// 舊版佔滿戰場左右兩成寬度的側邊旗幟欄（FactionBanner 全高側欄）拿掉了，改用樣板的
// 窄橫幅 team-heading（見 FactionBanner.tsx 這次的改版）——騰出空間給卡片排，卡片才能
// 像樣板一樣置中、有呼吸空間。
//
// 前／後排是這個遊戲的真實規則（非穿透單體技只能打前排、後排全滅才補位，見
// engine/battle.ts Q3），樣板的示範資料沒有這個機制、三張卡永遠同一排——
// 2026-09-27 桌機空間規格書：四排（敵後/敵前/我前/我後各自一排）在 1440×900／
// 1920×1080 的正常瀏覽器可視高度下放不下技能列與執行按鈕，逼玩家一直上下捲動。
// 改回樣板原本的「敵我各一排、三張橫向並排」，前/後排關係改用三個線索保留（不再
// 用兩個獨立的物理排）：
//   1. 位置——combatants 建立順序本來就是前排在先、後排殿後（見 engine
//      makeCombatant），同一排內後排卡片自然排在最後一格，不用額外排序。
//   2. UnitCard 卡片本身的「前衛／後衛」標籤（見 UnitCard.tsx 的 roleLabel）。
//   3. 瞄準模式的目標提示——只有真正合法的目標（前排，或技能可穿透時的全員）會顯示
//      準星；不合法的後排（連同已陣亡的）會顯示暗化，見下面 Row 呼叫多加的
//      dimAll={targeting} 那行。
import { useEffect, useState } from 'react'
import type { Faction, Knight } from '../../data/types'
import type { Combatant } from '../../engine/battle'
import { resolveKnightImage } from '../../assets/knightImages'
import type { BattleUnitSlot } from './battleDemoData'
import type { FloatingHit } from './FloatingNumber'
import { BossPanel } from './BossPanel'
import { FactionBanner } from './FactionBanner'
import { StarfieldParticles } from './StarfieldParticles'
import { UnitCard } from './UnitCard'
import styles from './BattleField.module.css'

const SCENE_TEMPLE_IMG = resolveKnightImage('星環聖殿.png')
const SCENE_RUINS_IMG = resolveKnightImage('廢墟平原.png')
const SCENE_VOID_SLASH_IMG = resolveKnightImage('星環聖殿：虛空裂切.png')
// Chronicle Mode Phase 1-B：終局域（星穹聖殿・終局）專屬背景，供 sceneBase='throne' 使用。
const SCENE_THRONE_IMG = resolveKnightImage('星穹聖殿王座廳.png')

interface BattleFieldProps {
  enemyFormation: BattleUnitSlot[]
  allyFormation: BattleUnitSlot[]
  /** 這一側隊伍實際的陣營組成（守護/渾沌/獨立多數決，見 battleDemoData.ts
   * resolveTeamBannerFaction()）——用來決定 team-heading 的徽章／隊名。 */
  enemyFaction: Faction
  allyFaction: Faction
  getKnight: (id: string) => Knight | undefined
  currentUnitId: string
  hits: FloatingHit[]
  castingUnitId: string | null
  onSelectAlly?: (id: string) => void
  /** 項目 C：瞄準模式中點擊敵方卡片指定目標，回傳 engine Combatant.uid。 */
  onSelectEnemy?: (uid: string) => void
  /** 項目 C：目前瞄準模式合法的敵方目標 uid 集合；非空時敵方卡片顯示準星，我方陣列整個暗化。 */
  targetableEnemyUids?: Set<string>
  /** 玩家已經鎖定、等待按「執行指令」確認的目標（對齊樣板 execute 前的 .targeted 狀態）。 */
  lockedTargetUid?: string
  /** 問題⑤：預設戰場背景／虛空裂切施放中的技能版背景，兩張圖疊放用 CSS opacity 淡入淡出切換。 */
  sceneVariant?: 'default' | 'void-slash'
  /** 攻守節奏強化規格書項目【3】：這個 uid 的敵方卡片要播放「行動前搖」邊框閃爍。 */
  telegraphUnitId?: string | null
  /** 招式動畫 cut-in 指令：目前要全螢幕播放的招式動畫影片路徑，null＝沒有影片在播。 */
  cutInVideoUrl?: string | null
  onCutInEnded?: () => void
  /** 永恆的聖域：世界級 Boss 單位（有值時敵方半場改畫 BossPanel）。 */
  bossCombatant?: Combatant
  /** 預設戰場背景：一般對戰＝廢墟平原（維持不變，樣板的星環聖殿只是它自己的展示背景，
   * 不覆蓋一般對戰）、永恆的聖域＝星環聖殿、Chronicle Mode 終局域＝星穹聖殿王座廳。 */
  sceneBase?: 'ruins' | 'temple' | 'throne'
}

function Row({
  slots,
  indexOf,
  getKnight,
  currentUnitId,
  hits,
  castingUnitId,
  onSelect,
  targetableIds,
  lockedTargetUid,
  dimAll,
  telegraphUnitId,
}: {
  slots: BattleUnitSlot[]
  indexOf: Map<string, number>
  getKnight: (id: string) => Knight | undefined
  currentUnitId: string
  hits: FloatingHit[]
  castingUnitId: string | null
  onSelect?: (slot: BattleUnitSlot) => void
  targetableIds?: Set<string>
  lockedTargetUid?: string
  dimAll?: boolean
  telegraphUnitId?: string | null
}) {
  return (
    <div className={styles.row}>
      {slots.map((slot) => {
        const knight = getKnight(slot.knightId)
        if (!knight) return null
        const targetable = targetableIds?.has(slot.uid) ?? false
        return (
          <UnitCard
            key={slot.knightId}
            knight={knight}
            slot={slot}
            index={indexOf.get(slot.uid) ?? 1}
            isCurrent={slot.uid === currentUnitId}
            isCasting={slot.uid === castingUnitId}
            isTelegraphing={!!telegraphUnitId && slot.uid === telegraphUnitId}
            hits={hits.filter((h) => h.targetId === slot.uid)}
            onSelect={onSelect ? () => onSelect(slot) : undefined}
            targetable={targetable}
            targeted={slot.uid === lockedTargetUid}
            dimmed={!!dimAll && !targetable}
          />
        )
      })}
    </div>
  )
}

export function BattleField({
  enemyFormation,
  allyFormation,
  enemyFaction,
  allyFaction,
  getKnight,
  currentUnitId,
  hits,
  castingUnitId,
  onSelectAlly,
  onSelectEnemy,
  targetableEnemyUids,
  lockedTargetUid,
  sceneVariant = 'default',
  telegraphUnitId,
  cutInVideoUrl,
  onCutInEnded,
  bossCombatant,
  sceneBase = 'ruins',
}: BattleFieldProps) {
  const SCENE_DEFAULT_IMG =
    sceneBase === 'temple' ? SCENE_TEMPLE_IMG : sceneBase === 'throne' ? SCENE_THRONE_IMG : SCENE_RUINS_IMG
  const targeting = !!targetableEnemyUids && targetableEnemyUids.size > 0

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

  // 樣板的 .unit-index（01/02/03）用「這一側原始陣容順序」編號——
  // enemyFormation/allyFormation 本來就保留 engine 建立 Combatant 時的順序（前排在先、
  // 後排殿後），直接照這個順序編號即可。
  const enemyIndex = new Map(enemyFormation.map((s, i) => [s.uid, i + 1]))
  const allyIndex = new Map(allyFormation.map((s, i) => [s.uid, i + 1]))

  return (
    <div className={styles.field}>
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
      {/* 對齊樣板 .stage-shade/.stage-vignette：暗化＋兩側漸暗的濾鏡疊在背景照片上，
          不是背景本身——一般對戰維持「廢墟平原.png」不變。 */}
      <div
        className={`${styles.stageShade} ${bossCombatant?.boss ? (bossCombatant.boss.phase === 2 ? styles.sanctuaryP2 : styles.sanctuaryP1) : ''}`}
        aria-hidden="true"
      />
      <div className={styles.stageVignette} aria-hidden="true" />
      <StarfieldParticles />

      <div className={styles.stageContent}>
        <FactionBanner
          faction={enemyFaction}
          aliveCount={enemyFormation.filter((s) => s.alive).length}
          totalCount={enemyFormation.length}
        />

        <div className={`${styles.enemyArea} ${bossCombatant ? styles.bossArea : ''}`}>
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
          {!bossCombatant && (
            <Row
              slots={enemyFormation}
              indexOf={enemyIndex}
              getKnight={getKnight}
              currentUnitId={currentUnitId}
              hits={hits}
              castingUnitId={castingUnitId}
              onSelect={onSelectEnemy ? (slot) => onSelectEnemy(slot.uid) : undefined}
              targetableIds={targetableEnemyUids}
              lockedTargetUid={lockedTargetUid}
              // 項目 C：瞄準模式中，這一排裡不合法的目標（後排、或已陣亡）要暗化，
              // 跟合法目標（前排，顯示準星）拉開視覺對比——這是拿掉物理前/後排之後，
              // 補回「後排受保護」規則可見性的第三個線索（另外兩個是位置與 role 標籤，
              // 見檔頭註解）。targeting 只在有合法目標存在時才是 true，非目標時
              // dimAll=false 不影響平常顯示。
              dimAll={targeting}
              telegraphUnitId={telegraphUnitId}
            />
          )}
        </div>

        {/* 對齊樣板 .stage-middle：兩條裝飾線 + 中央印記。 */}
        <div className={styles.stageMiddle} aria-hidden="true">
          <span className={styles.decorLine} />
          <div className={styles.stageSeal}>
            <span>✧</span>
          </div>
          <span className={`${styles.decorLine} ${styles.decorLineFlip}`} />
        </div>

        <div className={styles.allyArea}>
          <Row
            slots={allyFormation}
            indexOf={allyIndex}
            getKnight={getKnight}
            currentUnitId={currentUnitId}
            hits={hits}
            castingUnitId={castingUnitId}
            onSelect={onSelectAlly ? (slot) => onSelectAlly(slot.knightId) : undefined}
            // 瞄準模式中，我方全體都不是合法目標（targetableIds 只給敵方算），
            // 所以這裡整排都暗化，突顯玩家該去點敵方卡片，跟 Session 15 起的既有行為一致。
            dimAll={targeting}
          />
        </div>

        <FactionBanner
          faction={allyFaction}
          aliveCount={allyFormation.filter((s) => s.alive).length}
          totalCount={allyFormation.length}
        />
      </div>
    </div>
  )
}

export default BattleField
