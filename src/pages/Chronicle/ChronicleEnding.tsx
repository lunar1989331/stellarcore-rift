// 全線通關演出（§10／HANDOFF_PHASE1C 任務四）：打完終局域的域主戰、epilogue 對白播完後
// 顯示這頁。Phase 1 簡化：純文字版，沒有额外的過場動畫。文字依 `save.playerFaction` 顯示
// 守護/渾沌線各自的收尾句子。
import { useNavigate } from 'react-router-dom'
import { clearChronicleSave, loadChronicleSave, type PlayerFaction } from '../../hooks/useChronicleSave'
import styles from './ChronicleEnding.module.css'

const FACTION_LINE: Record<PlayerFaction, string> = {
  guardian: '星橋，在光芒中重生。',
  chaos: '星橋，在碎裂中完整。',
}

export function ChronicleEnding() {
  const navigate = useNavigate()
  const save = loadChronicleSave()
  const faction: PlayerFaction = save?.playerFaction ?? 'guardian'

  const handleReplay = () => {
    // §「再玩一次」行為：清除存檔 → 回到序章，跟主選單「重新開始」是同一個動作。
    clearChronicleSave()
    navigate('/chronicle/prologue')
  }

  return (
    <div className={styles.root}>
      <div className={styles.title}>✦ STELLARCORE RIFT ✦</div>
      <div className={styles.quote}>「群星為證，我等從不孤單。」</div>
      <div className={styles.quoteEn}>FOR A BRIGHTER TOMORROW.</div>
      <div className={styles.factionLine}>{FACTION_LINE[faction]}</div>
      <div className={styles.thanks}>感謝遊玩</div>
      <div className={styles.subtitle}>Chronicle Mode</div>
      <div className={styles.actions}>
        <button type="button" className={styles.primaryBtn} onClick={handleReplay}>
          再玩一次
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/')}>
          回主選單
        </button>
      </div>
    </div>
  )
}

export default ChronicleEnding
