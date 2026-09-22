// 永恆的聖域專用全螢幕演出：星核王盾粉碎／永恆與聖域合體／星核君臨碎片（永恆投影降臨）。
// 由 BattleScreen.playStep 依事件 meta（shieldBreak／fusion／fragment）決定播哪一種，
// 播放時間由呼叫端 await sleep() 控制，這裡只負責「有 fx 就顯示、沒有就不畫」。
import { AnimatePresence, motion } from 'framer-motion'
import { resolveKnightImage } from '../../assets/knightImages'
import { ETERNAL_PHASE2_IMAGE } from '../../data/bosses'
import styles from './SanctuaryFxOverlay.module.css'

export type SanctuaryFx = 'shieldBreak' | 'fusion' | 'fragment'

const COPY: Record<SanctuaryFx, { title: string; sub: string }> = {
  shieldBreak: { title: '星核王盾粉碎', sub: 'STELLAR SHIELD SHATTERED' },
  fusion: { title: '天穹聖駒・聖域 合體', sub: 'ETERNAL × HOLY REALM' },
  fragment: { title: '星核君臨——', sub: 'ETERNAL PROJECTION' },
}

export function SanctuaryFxOverlay({ fx }: { fx: SanctuaryFx | null }) {
  const image = fx === 'fusion' ? resolveKnightImage(ETERNAL_PHASE2_IMAGE) : undefined
  return (
    <AnimatePresence>
      {fx && (
        <motion.div
          key={fx}
          className={`${styles.overlay} ${styles[fx]}`}
          data-fx={fx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {image && <img className={styles.art} src={image} alt="" />}
          <div className={styles.shards} aria-hidden="true" />
          <motion.div
            className={styles.text}
            initial={{ scale: 0.8, letterSpacing: '0.4em' }}
            animate={{ scale: 1, letterSpacing: '0.12em' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className={styles.title}>{COPY[fx].title}</div>
            <div className={styles.sub}>{COPY[fx].sub}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SanctuaryFxOverlay
