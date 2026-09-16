// UI 改善規格書 v2.0 項目 C-①：回合切換過場橫幅——「我方回合」／「對方回合」淡入停留淡出。
import { AnimatePresence, motion } from 'framer-motion'
import type { TurnPhase } from './TopBar'
import styles from './TurnPhaseBanner.module.css'

interface TurnPhaseBannerProps {
  /** null＝目前沒有橫幅要顯示（見 BattleScreen 的觸發時機：只在 phase 真的切換那一刻短暫顯示）。 */
  phase: TurnPhase | null
}

const PHASE_TEXT: Record<TurnPhase, string> = {
  player: '◈ 我方回合 ◈',
  enemy: '◈ 對方回合 ◈',
}

export function TurnPhaseBanner({ phase }: TurnPhaseBannerProps) {
  return (
    <div className={styles.layer} aria-hidden="true">
      <AnimatePresence>
        {phase && (
          <motion.div
            key={phase}
            className={`${styles.banner} ${phase === 'player' ? styles.player : styles.enemy}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            {PHASE_TEXT[phase]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TurnPhaseBanner
