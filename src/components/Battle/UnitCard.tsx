// 騎士卡片——battle-hud-v2 樣板完整整合：對齊 index.html 的 <button class="unit">
// 結構（39% 立繪 + 61% 資訊：role/index → name/en → HP gauge →（我方）SP 文字），
// clip-path 斜切角、--accent 依「我方=藍（獨立=銀）／敵方=紅」決定（樣板的
// `.enemy{--accent:var(--red)}.ally{--accent:var(--blue)}.ally.independent{--accent:var(--silver)}`）。
// 這個單一規則同時取代了舊版「陣營色邊框 + 另一條敵我識別色條」兩層機制（見 CLAUDE.md
// Session 15/22/23）——樣板的邊框本來就是依「這是我方還是敵方」上色，天生不會有「雙方剛好
// 同陣營、邊框顏色分不出誰是誰」的問題，不需要再疊一條額外色條。
//
// 樣板沒有的東西（前/後排保護規則、狀態效果、坐騎合體、瞄準模式）是這個遊戲的真實機制，
// 樣板本身沒有對應設計時，維持功能、找最不搶版面的方式呈現（見各區塊註解），不因為樣板沒畫
// 就砍掉——這是主人這次的明確指示（「若版型和既有功能衝突，請調整 HUD 來容納功能」）。
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { resolveKnightImage } from '../../assets/knightImages'
import { getFusedMount } from '../../data/mounts'
import { FACTION_COLORS, type Knight } from '../../data/types'
import type { BattleUnitSlot } from './battleDemoData'
import { STATUS_ICON, hpBarColor } from './battleTheme'
import { FloatingNumber, type FloatingHit } from './FloatingNumber'
import styles from './UnitCard.module.css'

interface UnitCardProps {
  knight: Knight
  slot: BattleUnitSlot
  /** 這張卡在自己這一側（我方/敵方）陣容裡的序號（1-based），對應樣板的 .unit-index。 */
  index: number
  isCurrent: boolean
  isCasting?: boolean
  /** 攻守節奏強化規格書（2026-09-19）項目【3】：敵方行動前搖——邊框閃爍兩次，讓玩家在
   * 攻擊動畫真正開始前先看清楚「輪到哪個敵人了」。見 UnitCard.module.css 的 .telegraph。 */
  isTelegraphing?: boolean
  hits?: FloatingHit[]
  onSelect?: () => void
  /** 玩家反饋規格 v1.0 項目 C：瞄準模式中，這張卡是不是合法目標（會顯示準星、可點擊指定）。 */
  targetable?: boolean
  /** 這張卡是不是玩家已經鎖定、還沒按執行的目標（對齊樣板 .targeted 的金框樣式）。 */
  targeted?: boolean
  /** 項目 C：瞄準模式啟動中——不是目標的卡片要稍微暗化，突顯真正能選的對象。 */
  dimmed?: boolean
}

export function UnitCard({
  knight,
  slot,
  index,
  isCurrent,
  isCasting,
  isTelegraphing,
  hits,
  onSelect,
  targetable,
  targeted,
  dimmed,
}: UnitCardProps) {
  const isPlayerUnit = slot.uid.startsWith('ally-')
  const accent = !isPlayerUnit ? 'var(--red)' : knight.faction === 'independent' ? 'var(--silver)' : 'var(--blue)'
  const portraitUrl = resolveKnightImage(knight.image)
  const mount = slot.isMounted ? getFusedMount(knight.mount) : undefined
  const mountPortraitUrl = mount?.image ? resolveKnightImage(mount.image) : undefined

  const cssVars = { '--accent': accent } as CSSProperties

  // 項目 D：陣亡瞬間（alive: true→false）短暫加一個震動 class，320ms 後自動拿掉。
  const wasAliveRef = useRef(slot.alive)
  const [justKoed, setJustKoed] = useState(false)
  useEffect(() => {
    const wasAlive = wasAliveRef.current
    wasAliveRef.current = slot.alive
    if (wasAlive && !slot.alive) {
      setJustKoed(true)
      const t = window.setTimeout(() => setJustKoed(false), 320)
      return () => window.clearTimeout(t)
    }
  }, [slot.alive])

  const currentHp = Math.round(slot.hpPct * knight.maxHp)
  // 樣板角色欄（.unit-role）：我方顯示「前衛/後衛 · 陣營」，敵方只顯示前衛/後衛——
  // 敵方的陣營已經由 FactionBanner（team-heading）統一標示在整排卡片上方，這裡不重複。
  const rowLabel = slot.row === 'back' ? '後衛' : '前衛'
  const roleLabel = isPlayerUnit ? `${rowLabel} · ${FACTION_COLORS[knight.faction].label}` : rowLabel

  return (
    <motion.div
      className={[
        styles.unit,
        isPlayerUnit ? styles.ally : styles.enemy,
        isPlayerUnit && knight.faction === 'independent' ? styles.independent : '',
        slot.isMounted ? styles.mounted : '',
        isCurrent || targeted ? styles.selected : '',
        isTelegraphing ? styles.telegraph : '',
        targetable ? styles.targetable : '',
        !slot.alive ? styles.ko : '',
      ].join(' ')}
      style={cssVars}
      initial={false}
      animate={{ filter: `brightness(${dimmed ? 0.55 : 1})` }}
      whileHover={onSelect && slot.alive ? { y: -3 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      onClick={slot.alive ? onSelect : undefined}
      role={onSelect && slot.alive ? 'button' : undefined}
      title={`${knight.name} · HP ${currentHp} / ${knight.maxHp}`}
      // 項目 H：命中粒子特效用這個屬性定位目標卡片。
      data-combatant-uid={slot.uid}
    >
      <div
        className={`${styles.shakeInner} ${!slot.alive ? styles.deadInner : ''}`}
        style={justKoed ? { animation: 'unitCardShake 0.3s ease' } : undefined}
      >
        {slot.isMounted && (
          <div className={styles.mountRing} aria-hidden="true">
            <span />
          </div>
        )}

        <div className={styles.artWrap}>
          {slot.isMounted && mountPortraitUrl && (
            <img className={styles.mountGhost} src={mountPortraitUrl} alt="" aria-hidden="true" />
          )}
          {portraitUrl ? (
            <img className={styles.art} src={portraitUrl} alt={knight.name} loading="lazy" />
          ) : (
            <div className={styles.artFallback}>{knight.name.slice(0, 1)}</div>
          )}
          {/* 狀態效果圖示：樣板沒有這個系統，維持功能但收在立繪角落，不佔用資訊欄版面。 */}
          {slot.statuses.length > 0 && (
            <div className={styles.statusRow}>
              {slot.statuses.map((s) => (
                <span
                  key={s}
                  className={styles.statusIcon}
                  style={{ color: STATUS_ICON[s].color }}
                  title={STATUS_ICON[s].label}
                >
                  {STATUS_ICON[s].icon}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <div className={styles.top}>
            <span className={styles.role}>{roleLabel}</span>
            <span className={styles.index}>{String(index).padStart(2, '0')}</span>
          </div>
          <div>
            <strong className={styles.name}>{knight.name}</strong>
            <small className={styles.nameEn}>{knight.nameEn}</small>
          </div>
          <div className={styles.gauges}>
            <div>
              <div className={styles.gaugeHead}>
                <span>HP</span>
                <b>
                  {currentHp.toLocaleString()} / {knight.maxHp.toLocaleString()}
                </b>
              </div>
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={{ width: `${slot.hpPct * 100}%`, background: hpBarColor(slot.hpPct) }}
                />
              </div>
            </div>
            {/* 我方卡片才顯示 SP——對齊樣板的 sp-inline「STARCORE X / 5 SP」，
                Y 軸用真實 spCap（第三道路陣成立時會變 6，不是寫死的 5）。 */}
            {isPlayerUnit && (
              <span className={styles.spInline}>
                STARCORE{' '}
                <b>
                  {slot.starCoreLevel} / {slot.spCap} SP
                </b>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 項目 C：瞄準模式中，合法目標顯示準星；已鎖定的目標改用上面的 .selected 金框樣式
          （targeted prop），不再重複顯示準星。 */}
      {targetable && !targeted && (
        <div className={styles.reticle} aria-hidden="true">
          <span className={styles.reticleMark}>⊕</span>
        </div>
      )}

      {isCurrent && <div className={styles.currentTag}>當前行動</div>}
      {(isCurrent || isCasting) && <div className={styles.castingGlow} aria-hidden="true" />}

      <div className={styles.floatingLayer}>
        <AnimatePresence>
          {(hits ?? []).map((h) => (
            <FloatingNumber key={h.id} hit={h} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default UnitCard
