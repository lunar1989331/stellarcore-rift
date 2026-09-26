// 域詳細頁（§7）：顯示域的關卡節點列表，點擊節點進入戰前隊伍選擇。
// Phase 1-B：首次進入這個域時，先播完 prologueDialogue（§15-2「玩家點擊域節點、進入
// DomainDetail 頁面時，先播完對白再顯示關卡列表」）再顯示節點列表；之後（例如打完普通戰
// 回到這頁）不會重播（見 useChronicleSave.ts 的 seenDomainIntros）。原本 Phase 1-A 自己寫的
// 靜態 quote box 已移除——完整的入域對白已經涵蓋、甚至超過它想做的事，見 chronicleData.ts
// 判讀 5。
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getDomain, type BattleNode } from '../../data/chronicleData'
import { loadChronicleSave, markDomainIntroSeen } from '../../hooks/useChronicleSave'
import { DialogueSequence } from './DialogueSequence'
import styles from './DomainDetail.module.css'

const TYPE_ICON: Record<BattleNode['type'], string> = {
  tutorial: '📖',
  normal: '⚔️',
  elite: '💀',
  'domain-boss': '👑',
}

type NodeState = 'locked' | 'available' | 'completed'

/** 域內關卡依序解鎖：第一關永遠可進，之後每一關要等前一關通關才開放（§7-2 示意圖的順序）。 */
function nodeState(battles: BattleNode[], index: number, completed: string[]): NodeState {
  if (completed.includes(battles[index].id)) return 'completed'
  if (index === 0) return 'available'
  return completed.includes(battles[index - 1].id) ? 'available' : 'locked'
}

export function DomainDetail() {
  const { domainId } = useParams<{ domainId: string }>()
  const navigate = useNavigate()
  const domain = domainId ? getDomain(domainId) : undefined
  const save = loadChronicleSave()

  const hasIntro = !!domain?.prologueDialogue?.length
  const alreadySeenIntro = !!(domainId && save?.seenDomainIntros.includes(domainId))
  const [introDone, setIntroDone] = useState(!hasIntro || alreadySeenIntro)

  const handleIntroDone = useCallback(() => {
    if (domainId) markDomainIntroSeen(domainId)
    setIntroDone(true)
  }, [domainId])

  if (!domain) {
    return (
      <div className={styles.root}>
        <p>找不到這個域。</p>
        <Link to="/chronicle/map" className={styles.backLink}>
          ← 返回地圖
        </Link>
      </div>
    )
  }

  if (!introDone) {
    return <DialogueSequence lines={domain.prologueDialogue ?? []} onDone={handleIntroDone} />
  }

  const completed = save?.completedBattles ?? []
  const doneCount = domain.battles.filter((b) => completed.includes(b.id)).length

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <button type="button" className={styles.backLink} onClick={() => navigate('/chronicle/map')}>
          ← 返回地圖
        </button>
        <div className={styles.headerTitle}>
          {domain.name}・{domain.chapter}
        </div>
      </div>

      <div className={styles.nodeList}>
        {domain.battles.map((battle, i) => {
          const state = nodeState(domain.battles, i, completed)
          return (
            <div key={battle.id} className={`${styles.nodeRow} ${styles[state]}`}>
              <span className={styles.nodeIcon}>
                {state === 'completed' ? '✅' : state === 'locked' ? '🔒' : TYPE_ICON[battle.type]}
              </span>
              <span className={styles.nodeLabel}>{battle.label}</span>
              {battle.eliteRule && <span className={styles.nodeRule}>{battle.eliteRule.description}</span>}
              <button
                type="button"
                className={styles.nodeBtn}
                disabled={state === 'locked'}
                onClick={() => navigate(`/chronicle/battle/${battle.id}`)}
              >
                {state === 'completed' ? '重挑戰' : state === 'locked' ? '未解鎖' : '進入'}
              </button>
            </div>
          )
        })}
      </div>

      <div className={styles.progress}>
        域通關進度：{doneCount} / {domain.battles.length}
      </div>
    </div>
  )
}

export default DomainDetail
