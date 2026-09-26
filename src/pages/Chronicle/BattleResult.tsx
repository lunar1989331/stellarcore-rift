// 戰鬥結果（§10）：Chronicle Mode 專用的結算按鈕組——BattleScreen 既有的 resultBanner
// （標題／回合數／勝負文字）完全沿用，只有按鈕列在 chronicle 模式下換成這裡的版本：
// 勝利→「繼續」交回 Chronicle 流程（記錄通關、解鎖下一域）；失敗→「調整隊伍重試」或
// 「回到地圖」（§10-2）。不是獨立路由，是嵌進 BattleScreen 結算橫幅裡的一個小元件，見
// BattleScreen.tsx 的 revealedResult 區塊。
//
// Q24 回覆（Mina，2026-09-26）：域主戰有難度門檻是刻意設計，但失敗後要有順暢的「調整隊伍
// 再試」管道，不是單純重試同一隊。`onRetry` 這裡沿用 Phase 1-B 就有的 `handleRestart`
// （BattleScreen.tsx）——它把 `team` reset 成 null，讓 BattleScreen 重新顯示 TeamSelect
// 畫面（同一個 battleId／chronicle config 不變），玩家可以在這裡重新選角，效果等同 Mina
// pseudocode 寫的「navigate 回 ChronicleTeamSelect」，只是用同一個掛載的元件內部狀態重置
// 達成，不需要真的觸發一次路由跳轉——這次只改按鈕文字，行為本來就對。
import type { BattleResult as EngineBattleResult } from '../../engine/battle'
import styles from '../../components/Battle/BattleScreen.module.css'

interface ChronicleResultActionsProps {
  result: EngineBattleResult
  onRetry: () => void
  onContinue: () => void
  onBackToMap: () => void
}

export function ChronicleResultActions({ result, onRetry, onContinue, onBackToMap }: ChronicleResultActionsProps) {
  if (result.winner === 'ally') {
    return (
      <button type="button" className={styles.resultBtn} onClick={onContinue}>
        ▶ 繼續
      </button>
    )
  }
  return (
    <div className={styles.resultActions}>
      <button type="button" className={styles.resultBtn} onClick={onRetry}>
        ↻ 調整隊伍重試
      </button>
      <button type="button" className={styles.resultBtnSecondary} onClick={onBackToMap}>
        ← 回到地圖
      </button>
    </div>
  )
}

export default ChronicleResultActions
