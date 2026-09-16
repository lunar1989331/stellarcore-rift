// 技能特效層（§11）：全畫面暗化 → 技能名稱大字 → 裂縫／爆發特效
import { AnimatePresence, motion } from 'framer-motion'
import styles from './SkillEffectOverlay.module.css'

interface SkillEffectOverlayProps {
  skillName: string | null
  showDarken: boolean
  showSlash: boolean
  slashVariant: 'x' | 'burst'
}

export function SkillEffectOverlay({
  skillName,
  showDarken,
  showSlash,
  slashVariant,
}: SkillEffectOverlayProps) {
  return (
    <div className={styles.layer} aria-hidden="true">
      <div className={`${styles.darken} ${showDarken ? styles.darkenOn : ''}`} />

      <AnimatePresence>
        {skillName && (
          <motion.div
            key={skillName}
            className={styles.nameWrap}
            initial={{ opacity: 0, y: -14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 1.05 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <span className={styles.nameText}>{skillName}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSlash && slashVariant === 'x' && (
          <motion.svg
            key="x-slash"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={styles.slashSvg}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, times: [0, 0.2, 0.7, 1] }}
          >
            <motion.line
              x1="8"
              y1="8"
              x2="92"
              y2="92"
              className={styles.slashLine}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
            <motion.line
              x1="92"
              y1="8"
              x2="8"
              y2="92"
              className={styles.slashLine}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
            />
          </motion.svg>
        )}

        {showSlash && slashVariant === 'burst' && (
          <motion.div
            key="burst"
            className={styles.burst}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 1, 0], scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default SkillEffectOverlay
