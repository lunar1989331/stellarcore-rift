import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { resolveKnightImage } from '../../assets/knightImages'
import { CORE_ATTR_LABELS, FACTION_COLORS, type Knight } from '../../data/types'
import styles from './KnightCard.module.css'

export interface KnightCardProps {
  knight: Knight
  /** 目前 HP；省略時顯示滿血 */
  currentHp?: number
  /** 目前星核點數（0–maxSp）；省略時全空 */
  currentSp?: number
  maxSp?: number
  onClick?: (knight: Knight) => void
}

export function KnightCard({
  knight,
  currentHp,
  currentSp = 0,
  maxSp = 5,
  onClick,
}: KnightCardProps) {
  const faction = FACTION_COLORS[knight.faction]
  const hp = currentHp ?? knight.maxHp
  const hpPct = Math.max(0, Math.min(1, hp / knight.maxHp)) * 100
  const imageUrl = resolveKnightImage(knight.image)

  const cssVars = {
    '--faction-color': faction.primary,
    '--faction-glow': faction.glow,
  } as CSSProperties

  return (
    <motion.div
      className={styles.card}
      style={cssVars}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      onClick={onClick ? () => onClick(knight) : undefined}
      role={onClick ? 'button' : undefined}
    >
      <div className={styles.imageWrap}>
        {imageUrl ? (
          <img className={styles.image} src={imageUrl} alt={knight.name} loading="lazy" />
        ) : (
          <div className={styles.missing}>（缺少插圖：{knight.image}）</div>
        )}

        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.factionBadge}`}>{faction.label}</span>
          <span className={styles.badge}>{CORE_ATTR_LABELS[knight.coreAttr]}</span>
        </div>

        <div className={styles.rarity}>{'★'.repeat(knight.rarity)}</div>

        <div className={styles.nameBlock}>
          <h3 className={styles.name}>{knight.name}</h3>
          <p className={styles.nameEn}>{knight.nameEn}</p>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.role}>{knight.role}</div>

        <div className={styles.barRow}>
          <span className={styles.barLabel}>HP</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${hpPct}%` }} />
          </div>
          <span className={styles.barValue}>
            {Math.round(hp)} / {knight.maxHp}
          </span>
        </div>

        <div className={styles.spRow}>
          <span className={styles.barLabel}>SP</span>
          <div className={styles.spPips}>
            {Array.from({ length: maxSp }, (_, i) => (
              <span
                key={i}
                className={`${styles.pip} ${i < currentSp ? styles.pipFilled : ''}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>攻擊</span>
            <span className={styles.statValue}>{knight.atk}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>防禦</span>
            <span className={styles.statValue}>{knight.def}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>速度</span>
            <span className={styles.statValue}>{knight.spd}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>星核力</span>
            <span className={styles.statValue}>{knight.starcore}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>屬性</span>
            <span className={styles.statValue}>{CORE_ATTR_LABELS[knight.coreAttr]}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>稀有</span>
            <span className={styles.statValue}>{knight.rarity}★</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default KnightCard
