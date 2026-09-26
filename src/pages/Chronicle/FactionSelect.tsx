// 陣營選擇（§5）：序章結束後出現，決定整個遊玩體驗的走向。選擇後立即寫入存檔，
// 不留任何可返回重選的路徑（HANDOFF 注意事項 2／§15-2）。
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import chaosBadge from '../../assets/渾沌騎士陣營徽章.png'
import guardianBadge from '../../assets/守護騎士陣營徽章.png'
import { commitFaction, type PlayerFaction } from '../../hooks/useChronicleSave'
import styles from './FactionSelect.module.css'

const COPY: Record<PlayerFaction, { factionLabel: string; shortLabel: string; title: string; nameEn: string; quote: string; badge: string }> = {
  guardian: {
    factionLabel: '守護陣營',
    shortLabel: '守護',
    title: '守護騎士',
    nameEn: 'Guardian Order',
    quote: '「以星為誓，守護一切光明」',
    badge: guardianBadge,
  },
  chaos: {
    factionLabel: '渾沌陣營',
    shortLabel: '渾沌',
    title: '渾沌騎士',
    nameEn: 'Chaos Legion',
    quote: '「讓星辰流血，世界將重生」',
    badge: chaosBadge,
  },
}

export function FactionSelect() {
  const navigate = useNavigate()
  const [pending, setPending] = useState<PlayerFaction | null>(null)

  const handleConfirm = useCallback(() => {
    if (!pending) return
    commitFaction(pending)
    navigate('/chronicle/map')
  }, [pending, navigate])

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>✦ 選擇你的道路 ✦</h1>
      <p className={styles.tagline}>「群星為證，我等從不孤單。」</p>

      <div className={styles.cards}>
        {(['guardian', 'chaos'] as const).map((faction) => (
          <div key={faction} className={`${styles.card} ${styles[faction]}`}>
            <img className={styles.badge} src={COPY[faction].badge} alt="" />
            <div className={styles.cardTitle}>{COPY[faction].title}</div>
            <div className={styles.cardTitleEn}>{COPY[faction].nameEn}</div>
            <div className={styles.cardQuote}>{COPY[faction].quote}</div>
            <button type="button" className={styles.chooseBtn} onClick={() => setPending(faction)}>
              選擇{COPY[faction].shortLabel}
            </button>
          </div>
        ))}
      </div>

      <p className={styles.warning}>⚠ 選擇後將無法更改</p>

      {pending && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmTitle}>加入{COPY[pending].factionLabel}</div>
            <p className={styles.confirmMessage}>
              「{COPY[pending].factionLabel}」——一旦選擇，星橋將為你指引專屬的路途。此決定無法撤回。
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setPending(null)}>
                再想想
              </button>
              <button type="button" className={styles.confirmBtn} onClick={handleConfirm}>
                誓言立下
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FactionSelect
