// 頂部資訊列（UI 全面升級規格書 v1.0 · 項目 A）：左關卡名稱＋英文副標・中菱形回合框＋行動指示器・右三按鈕
import { Link } from 'react-router-dom'
import styles from './TopBar.module.css'

/** UI 改善規格書 v2.0 項目 C-②：頂部「回合方指示器」——引擎沒有真的分「我方/對方回合」
 * 這種整體階段（每回合是逐一單位照速度值交錯行動，見 engine/battle.ts），這裡用
 * BattleScreen 現有的 pendingRequest 有無來近似：有 = 正在等玩家對某個我方單位下指令
 * （我方行動中），沒有 = pump() 正在自動播放 AI／敵方單位的行動（對方行動中）。規格書
 * 原本還有第三種「結算中」，但那段時間其實也是 playStep 在播動畫、跟「對方行動中」在
 * 我們的架構下沒有可靠的界線可分，這裡簡化成兩態，見 CLAUDE.md Session 16。 */
export type TurnPhase = 'player' | 'enemy'

const PHASE_LABEL: Record<TurnPhase, { icon: string; text: string }> = {
  player: { icon: '🔵', text: '我方行動中' },
  enemy: { icon: '🔴', text: '對方行動中' },
}

interface TopBarProps {
  levelName: string
  /** 關卡英文副標（如 STELLAR TEMPLE），顯示在關卡名稱正下方。 */
  levelNameEn?: string
  turn: number
  phase: TurnPhase
  onRestart: () => void
}

export function TopBar({ levelName, levelNameEn, turn, phase, onRestart }: TopBarProps) {
  const p = PHASE_LABEL[phase]
  return (
    <div className={styles.bar}>
      <span className={styles.astralLabel}>ASTRAL BATTLE SYSTEM</span>

      <div className={styles.side}>
        <svg className={styles.starBadge} viewBox="0 0 40 40" aria-hidden="true">
          <polygon
            points="20,2 24,15 38,15 26,23 30,38 20,29 10,38 14,23 2,15 16,15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
        <div className={styles.levelText}>
          <span className={styles.levelName}>關卡名稱：{levelName}</span>
          {levelNameEn && <span className={styles.levelNameEn}>{levelNameEn}</span>}
        </div>
      </div>

      <div className={styles.center}>
        {/* 金色菱形外框：框線本體是 .turnFrame 的 border，左右兩顆 ◆ 用絕對定位壓在框線上
            （translate ±50%），做出規格書畫的 ◆────◆ 效果。 */}
        <div className={styles.turnFrame}>
          <span className={styles.diamondTick} data-pos="left" aria-hidden="true">
            ◆
          </span>
          <div className={styles.turnText}>
            <span className={styles.turnMain}>回合數：第 {turn} 回合</span>
            <span className={styles.turnEn}>BATTLE ROUND</span>
          </div>
          <span className={styles.diamondTick} data-pos="right" aria-hidden="true">
            ◆
          </span>
        </div>
        <div className={`${styles.phaseTag} ${phase === 'player' ? styles.phasePlayer : styles.phaseEnemy}`}>
          {p.icon} {p.text}
        </div>
      </div>

      <div className={`${styles.side} ${styles.right}`}>
        <Link to="/" className={styles.hudBtn} title="返回騎士圖鑑">
          ← 回籠
        </Link>
        <button type="button" className={styles.hudBtn} onClick={onRestart} title="重新開始這場戰鬥">
          ↺ 重新開始
        </button>
        <button type="button" className={`${styles.hudBtn} ${styles.iconOnly}`} title="設定">
          ⚙
        </button>
      </div>
    </div>
  )
}

export default TopBar
