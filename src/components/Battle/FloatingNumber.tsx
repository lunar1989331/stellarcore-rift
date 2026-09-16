// 浮動數字（§11-2）：傷害白・爆擊金＋CRIT 標籤・回血綠・消耗紫（向下）・護盾吸收淡藍
// 項目 G（PLAYER_FEEDBACK_SPEC_v1.0，E/G/H 實裝指令 v1 2026-09-13）：原本 crit 是一整串
// 「CRITICAL!! -N」文字，改成「數字本體放大＋獨立 CRIT 標籤 chip」的結構，普通傷害也拆成
// 同一種「數值 span」外殼（沒有 chip），視覺上更乾淨。
import { motion } from 'framer-motion'
import { FLOATING_STYLE, type FloatingKind } from './battleTheme'
import styles from './FloatingNumber.module.css'

export interface FloatingHit {
  id: number
  targetId: string
  kind: FloatingKind
  value: number
}

interface FloatingNumberProps {
  hit: FloatingHit
}

export function FloatingNumber({ hit }: FloatingNumberProps) {
  const style = FLOATING_STYLE[hit.kind]
  const isDamageLike = hit.kind === 'damage' || hit.kind === 'crit'
  const rise = 46 * style.direction

  return (
    <motion.div
      className={styles.number}
      initial={{ opacity: 0, y: 0, scale: 0.7 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, -rise * 0.4, -rise, -rise * 1.15],
        scale: style.scale,
        x: hit.kind === 'crit' ? [0, -5, 5, -4, 4, 0] : 0,
      }}
      transition={{ duration: 1.1, times: [0, 0.15, 0.75, 1], ease: 'easeOut' }}
    >
      {isDamageLike ? (
        // 傷害／爆擊：獨立的數值＋（爆擊才有的）CRIT 標籤，顏色/字級交給 CSS class
        // 決定（.value 白／.valueCrit 金），不再用 battleTheme 的 FLOATING_STYLE.color
        // ——那份顏色表現在只給 heal/cost/shield 這三種還在用單一字串的樣式用。
        <span className={hit.kind === 'crit' ? styles.valueCrit : styles.value}>
          {Math.abs(hit.value)}
          {hit.kind === 'crit' && <span className={styles.critTag}>CRIT</span>}
        </span>
      ) : (
        <span style={{ color: style.color, textShadow: style.textShadow }}>
          {hit.kind === 'heal'
            ? `+${hit.value}`
            : hit.kind === 'cost'
              ? `-${hit.value}`
              : `${hit.value} 吸收`}
        </span>
      )}
    </motion.div>
  )
}

export default FloatingNumber
