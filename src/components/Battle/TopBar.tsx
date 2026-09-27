// 頂部資訊列——battle-hud-v2 樣板整合：對齊 index.html 的 <header class="topbar">
// 結構（brand｜chapter｜round｜top-actions），色票／間距沿用樣板 styles.css。
import { Link } from 'react-router-dom'
import styles from './TopBar.module.css'

/** UI 改善規格書 v2.0 項目 C-②：頂部「回合方指示器」——引擎沒有真的分「我方/對方回合」
 * 這種整體階段（每回合是逐一單位照速度值交錯行動，見 engine/battle.ts），這裡用
 * BattleScreen 現有的 pendingRequest 有無來近似：有 = 正在等玩家對某個我方單位下指令
 * （我方行動中），沒有 = pump() 正在自動播放 AI／敵方單位的行動（對方行動中）。 */
export type TurnPhase = 'player' | 'enemy'

const PHASE_LABEL: Record<TurnPhase, string> = {
  player: '我方行動',
  enemy: '對方行動',
}

interface TopBarProps {
  levelName: string
  /** 關卡英文副標（如 STELLAR TEMPLE），對應樣板 .chapter 上排的分類字樣。 */
  levelNameEn?: string
  turn: number
  /** 回合上限（一般戰鬥 20／永恆的聖域 30，見 engine/battle.ts DEFAULT_MAX_TURNS）。 */
  maxTurn: number
  phase: TurnPhase
  onRestart: () => void
}

export function TopBar({ levelName, levelNameEn, turn, maxTurn, phase, onRestart }: TopBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          ✦
        </span>
        <div>
          <strong>星核裂紀</strong>
          <small>STELLARCORE RIFT</small>
        </div>
      </div>

      <div className={styles.chapter}>
        {levelNameEn && <span>{levelNameEn}</span>}
        <strong>{levelName}</strong>
      </div>

      <div className={styles.round}>
        <span className={`${styles.roundPip} ${phase === 'enemy' ? styles.roundPipEnemy : ''}`} aria-hidden="true" />
        <span>{PHASE_LABEL[phase]}</span>
        <b>
          {String(turn).padStart(2, '0')} <em>/ {maxTurn}</em>
        </b>
      </div>

      <div className={styles.topActions}>
        <Link to="/" className={styles.textButton} title="返回騎士圖鑑">
          ← <span>回籠</span>
        </Link>
        <button type="button" className={styles.textButton} onClick={onRestart} title="重新開始這場戰鬥">
          ↺ <span>重新開始</span>
        </button>
        <button type="button" className={styles.iconButton} title="設定" aria-label="設定">
          ⚙
        </button>
      </div>
    </header>
  )
}

export default TopBar
