// 底部戰報列（battle-hud-v2 視覺樣板整合）：對齊樣板 `#feedText` + `#turnOrder` + 戰報 ▾ 抽屜。
// 純展示層——文字內容完全來自 engine/battle.ts 的 BattleEvent.message（真實戰鬥紀錄），
// 不是憑空編的假戰報；行動序列則是 engine 這一回合真正算出來的 order（見 battle.ts 的
// 'turn-start' step 新增的 order 欄位），不是猜測或隨機排的。
import { useState } from 'react'
import { resolveKnightImage } from '../../assets/knightImages'
import type { Knight } from '../../data/types'
import type { Combatant } from '../../engine/battle'
import styles from './BattleFeed.module.css'

export interface FeedEntry {
  id: number
  turn: number
  message: string
}

interface BattleFeedProps {
  entries: FeedEntry[]
  turnOrderUids: string[]
  combatants: Combatant[]
  activeUnitId: string | null
  getKnight: (id: string) => Knight | undefined
}

export function BattleFeed({ entries, turnOrderUids, combatants, activeUnitId, getKnight }: BattleFeedProps) {
  const [open, setOpen] = useState(false)
  const latest = entries.length > 0 ? entries[entries.length - 1].message : '星核訊號已連線。請選擇技能與目標。'
  const orderCombatants = turnOrderUids
    .map((uid) => combatants.find((c) => c.uid === uid))
    .filter((c): c is Combatant => !!c)

  return (
    <div className={styles.strip}>
      {orderCombatants.length > 0 && (
        <div className={styles.turnOrder}>
          <span className={styles.turnOrderLabel}>行動序列</span>
          <div className={styles.turnOrderList}>
            {orderCombatants.map((c) => {
              const knight = getKnight(c.knight.id)
              const portrait = knight ? resolveKnightImage(knight.image) : undefined
              return (
                <span
                  key={c.uid}
                  className={[
                    styles.turnOrderThumb,
                    c.side === 'enemy' ? styles.hostile : '',
                    c.uid === activeUnitId ? styles.active : '',
                    !c.alive ? styles.fallen : '',
                  ].join(' ')}
                  title={c.knight.name}
                >
                  {portrait ? <img src={portrait} alt="" /> : <span className={styles.thumbFallback}>{c.knight.name.slice(0, 1)}</span>}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className={styles.feed} role="status" aria-live="polite">
        <span className={styles.feedLabel}>戰況</span>
        <p className={styles.feedText}>{latest}</p>
      </div>

      <button
        type="button"
        className={styles.logButton}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        戰報 {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <h2>戰鬥紀錄</h2>
            <button type="button" className={styles.drawerClose} onClick={() => setOpen(false)} aria-label="關閉戰報">
              ×
            </button>
          </div>
          <ol className={styles.drawerList}>
            {[...entries].reverse().map((e) => (
              <li key={e.id}>
                <span className={styles.drawerTurn}>T{e.turn}</span> {e.message}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default BattleFeed
