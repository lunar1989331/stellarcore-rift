// Chronicle Mode 入口（§3-3／HANDOFF 注意事項 1）：所有進入 Chronicle Mode 的路徑都先經過
// 這裡判斷存檔狀態，不能有任何地方直接跳 /chronicle/map。有存檔時先問「繼續／重新開始」，
// 問完才依 save.phase 導向對應頁面。
//
// Phase 1-C（HANDOFF_PHASE1C 任務三）：補上陣營副標＋「重新開始」二次確認（防止誤觸，一鍵
// 清除存檔太危險）。
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { clearChronicleSave, createNewChronicleSave, loadChronicleSave, type ChronicleSave } from '../../hooks/useChronicleSave'
import styles from './ChronicleRouter.module.css'

const FACTION_LABEL: Record<'guardian' | 'chaos', string> = {
  guardian: '守護騎士',
  chaos: '渾沌騎士',
}

export function ChronicleRouter() {
  const [existed] = useState(() => loadChronicleSave() !== null)
  const [decided, setDecided] = useState(!existed)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [save, setSave] = useState<ChronicleSave>(() => loadChronicleSave() ?? createNewChronicleSave())

  const handleReset = () => {
    clearChronicleSave()
    setSave(createNewChronicleSave())
    setConfirmingReset(false)
    setDecided(true)
  }

  if (!decided) {
    // 二次確認畫面——「重新開始」點了之後不會立刻清存檔，先問一次「確定嗎」。
    if (confirmingReset) {
      return (
        <div className={styles.root}>
          <div className={styles.dialog}>
            <div className={styles.title}>確定重新開始？</div>
            <p className={styles.message}>確定要清除目前的旅程記錄嗎？此操作無法復原。</p>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setConfirmingReset(false)}>
                取消
              </button>
              <button type="button" className={styles.dangerBtn} onClick={handleReset}>
                確定重新開始
              </button>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className={styles.root}>
        <div className={styles.dialog}>
          <div className={styles.title}>✦ 星核記憶存在 ✦</div>
          {save.playerFaction && <p className={styles.subtitle}>陣營：{FACTION_LABEL[save.playerFaction]}</p>}
          <div className={styles.optionList}>
            <button type="button" className={styles.optionBtn} onClick={() => setDecided(true)}>
              <span className={styles.optionLabel}>▶ 繼續旅程</span>
              <span className={styles.optionDesc}>從上次離開的地方繼續</span>
            </button>
            <button
              type="button"
              className={`${styles.optionBtn} ${styles.optionDanger}`}
              onClick={() => setConfirmingReset(true)}
            >
              <span className={styles.optionLabel}>↺ 重新開始</span>
              <span className={styles.optionDesc}>清除存檔，從序章重新出發</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  switch (save.phase) {
    case 'prologue':
      return <Navigate to="/chronicle/prologue" replace />
    case 'faction-select':
      return <Navigate to="/chronicle/faction" replace />
    case 'in-progress':
    case 'completed':
    default:
      return <Navigate to="/chronicle/map" replace />
  }
}

export default ChronicleRouter
