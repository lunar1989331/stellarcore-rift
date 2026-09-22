// 先攻決定演出：戰鬥開始前，用源核碎片抽出哪一方先攻。
// 流程（規格）：碎片淡入 0.3s → 高速旋轉 1.5s → 停下換成結果陣營的碎片圖＋字幕 → 停留 1.5s →
// 淡出 → onDone。整個過程蓋一層全螢幕遮罩鎖住操作（pointer-events 由遮罩本身吃掉）。
// 先攻結果由呼叫端（BattleScreen）用 Math.random() < 0.5 決定後傳進來，這裡只負責演出。
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import neutralShard from '../../assets/源核碎片視覺.png'
import guardianShard from '../../assets/守護陣營源核碎片.png'
import chaosShard from '../../assets/渾沌陣營源核碎片.png'
import type { Side } from '../../engine/battle'
import styles from './FirstStrikeIntro.module.css'

interface Props {
  firstSide: Side
  onDone: () => void
}

type Phase = 'spin' | 'reveal' | 'out'

export function FirstStrikeIntro({ firstSide, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('spin')

  useEffect(() => {
    // 0.3s 淡入 + 1.5s 旋轉，合計 1.8s 後揭曉；揭曉後停留 1.5s 再淡出（0.4s）。
    const t1 = window.setTimeout(() => setPhase('reveal'), 1800)
    const t2 = window.setTimeout(() => setPhase('out'), 1800 + 1500)
    const t3 = window.setTimeout(onDone, 1800 + 1500 + 400)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [onDone])

  const isAlly = firstSide === 'ally'
  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'out' ? 0 : 1 }}
      transition={{ duration: phase === 'out' ? 0.4 : 0.3 }}
      role="presentation"
    >
      <div className={styles.center}>
        <AnimatePresence mode="wait">
          {phase === 'spin' ? (
            <motion.img
              key="spin"
              className={styles.shard}
              src={neutralShard}
              alt=""
              initial={{ rotate: 0, scale: 0.85 }}
              // 三圈半（1260°）在 1.5s 內轉完，ease-out 收尾像被「抽」出結果。
              animate={{ rotate: 1260, scale: 1 }}
              transition={{ duration: 1.5, ease: [0.2, 0.7, 0.3, 1] }}
            />
          ) : (
            <motion.img
              key="result"
              className={styles.shard}
              src={isAlly ? guardianShard : chaosShard}
              alt=""
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            />
          )}
        </AnimatePresence>
        <motion.div
          className={`${styles.caption} ${isAlly ? styles.guardian : styles.chaos}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: phase === 'spin' ? 0 : 1, y: phase === 'spin' ? 8 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isAlly ? '守護騎士先攻！' : '渾沌騎士先攻！'}
        </motion.div>
      </div>
    </motion.div>
  )
}
