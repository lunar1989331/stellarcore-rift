// 浮動數字顏色/格式修正（2026-09-25）：damage 紅・crit 金（兩行：大字負數 + CRITICAL!!）・
// heal 綠・shield 淡藍（無符號）・sp 紫（無符號）。每種 kind 的顏色與版面固定用各自的 CSS
// class 決定（不再讀 FLOATING_STYLE.color/textShadow），符號（+/-/無）由這裡的 JS 決定。
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
  const isCrit = hit.kind === 'crit'
  const rise = 46 * style.direction
  const value = Math.abs(hit.value)

  const content = (() => {
    switch (hit.kind) {
      case 'crit':
        // 暴擊：兩行版面——上：大字負數（金）；下：CRITICAL!!（金，約 70% 大小，白色 text-shadow）
        return (
          <span className={styles.critWrap}>
            <span className={styles.valueCrit}>-{value}</span>
            <span className={styles.critLabel}>CRITICAL!!</span>
          </span>
        )
      case 'damage':
        return <span className={styles.value}>-{value}</span>
      case 'heal':
        return <span className={styles.valueHeal}>+{value}</span>
      case 'shield':
        return <span className={styles.valueShield}>{value}</span>
      case 'sp':
        return <span className={styles.valueSp}>{value}</span>
    }
  })()

  return (
    <motion.div
      className={styles.number}
      initial={{ opacity: 0, y: 0, scale: 0.7 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, -rise * 0.4, -rise, -rise * 1.15],
        scale: style.scale,
        x: isCrit ? [0, -5, 5, -4, 4, 0] : 0,
      }}
      transition={{ duration: 1.1, times: [0, 0.15, 0.75, 1], ease: 'easeOut' }}
    >
      {content}
    </motion.div>
  )
}

export default FloatingNumber
