// 世界級 Boss（永恆）的戰場面板：取代一般 2+1 的敵方卡片列，顯示大立繪＋
// 星核王盾條（藍紫，疊在 HP 條上方）＋本體 HP 條＋階段標籤。第二階段體型 ×3
// （ETERNAL_PHASE2_STATS.sizeMult）：面板從半場的 62% 高度撐滿整個半場，立繪跟著放大。
import { AnimatePresence } from 'framer-motion'
import { resolveKnightImage } from '../../assets/knightImages'
import { ETERNAL_PHASE2_IMAGE } from '../../data/bosses'
import type { Combatant } from '../../engine/battle'
import { hpBarColor } from './battleTheme'
import { FloatingNumber, type FloatingHit } from './FloatingNumber'
import styles from './BossPanel.module.css'

interface BossPanelProps {
  boss: Combatant
  hits: FloatingHit[]
  isCasting: boolean
  isTelegraphing: boolean
  targetable: boolean
  onSelect?: () => void
}

export function BossPanel({ boss, hits, isCasting, isTelegraphing, targetable, onSelect }: BossPanelProps) {
  const rt = boss.boss
  if (!rt) return null
  const phase2 = rt.phase === 2
  const hpPct = boss.alive ? Math.max(0, boss.hp / boss.maxHp) : 0
  const shieldPct = rt.shieldMax > 0 ? Math.max(0, rt.shieldHp / rt.shieldMax) : 0
  const image = resolveKnightImage(phase2 ? ETERNAL_PHASE2_IMAGE : boss.knight.image)
  const cls = [
    styles.panel,
    phase2 ? styles.phase2 : styles.phase1,
    isCasting ? styles.casting : '',
    isTelegraphing ? styles.telegraph : '',
    rt.chanting ? styles.chanting : '',
    targetable ? styles.targetable : '',
    !boss.alive ? styles.dead : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      data-combatant-uid={boss.uid}
      data-boss-phase={rt.phase}
      role={onSelect ? 'button' : undefined}
      onClick={onSelect}
    >
      <div className={styles.art}>
        {image && <img className={styles.artImg} src={image} alt={boss.knight.name} />}
        <div className={styles.artFade} />
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{boss.knight.name}</span>
          <span className={styles.phaseTag}>{phase2 ? '第二階段・聖域覺醒' : '第一階段'}</span>
        </div>
        <div className={styles.nameEn}>{phase2 ? 'Eternal × Holy Realm' : boss.knight.nameEn}</div>

        {/* 星核王盾：護盾條在 HP 條上方；盾破之後整條淡出（第一階段一次性，不再生）。 */}
        <div className={`${styles.barRow} ${rt.shieldActive ? '' : styles.barGone}`}>
          <span className={styles.barLabel}>星核王盾</span>
          <div className={styles.shieldTrack}>
            <div className={styles.shieldFill} style={{ width: `${shieldPct * 100}%` }} />
          </div>
          <span className={styles.barNum}>
            {rt.shieldHp}/{rt.shieldMax}
          </span>
        </div>

        <div className={styles.barRow}>
          <span className={styles.barLabel}>HP</span>
          <div className={styles.hpTrack}>
            <div className={styles.hpFill} style={{ width: `${hpPct * 100}%`, background: hpBarColor(hpPct) }} />
            {/* 50% 覺醒門檻刻度（第一階段才顯示）。 */}
            {!phase2 && <div className={styles.awakenTick} />}
          </div>
          <span className={styles.barNum}>
            {Math.max(0, boss.hp)}/{boss.maxHp}
          </span>
        </div>

        {rt.chanting && <div className={styles.chantHint}>◈ 星核共鳴中……永恆正在與聖域合體</div>}
        {phase2 && (
          <div className={styles.realmRow}>
            聖域 HP {rt.realmHp}/{rt.realmMaxHp}
            {rt.reviveUsed ? '　廢墟重生：已使用' : '　廢墟重生：待命'}
          </div>
        )}
      </div>

      {targetable && (
        <div className={styles.reticle} aria-hidden="true">
          <span className={styles.reticleMark}>⊕</span>
          <span className={styles.reticleHint}>點擊以選擇目標</span>
        </div>
      )}
      {!boss.alive && (
        <div className={styles.koOverlay} aria-hidden="true">
          <span className={styles.koLabel}>KO</span>
        </div>
      )}
      <div className={styles.floatingLayer}>
        <AnimatePresence>
          {hits.map((h) => (
            <FloatingNumber key={h.id} hit={h} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default BossPanel
