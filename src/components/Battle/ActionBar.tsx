// 底部行動列（UI 全面升級規格書 v1.0 · 項目 C／D）：技能①②③・普通攻擊・無道具佔位 ＋ 坐騎合體 ＋ 右下 SP 圓盤
import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import type { Skill } from '../../data/skills'
import styles from './ActionBar.module.css'

const SKILL_ICON: Record<string, string> = {
  attack: '⚔',
  aoe: '✷',
  buff: '◈',
  debuff: '◉',
  heal: '✚',
  special: '☄',
  multiHit: '⚡',
  passive: '🔒',
}

interface ActionBarProps {
  skill1?: Skill
  skill2?: Skill
  passiveSkill?: Skill
  /** 被動的觸發條件說明（如「HP<30% 觸發」），取代原本示範用的假冷卻數字——
   * 真引擎的被動是條件觸發，不是手動冷卻（見 CLAUDE.md Session 8）。 */
  passiveTriggerLabel: string
  cooldowns: Record<string, number>
  sp: number
  maxSp: number
  /** 坐騎是否目前合體存活（engine Combatant.mountAlive） */
  isMounted: boolean
  /** 這個騎士是否配有坐騎（knight.mount 有設定） */
  hasMount: boolean
  /** 合體充能量表 0~1（engine Combatant.mountCharge，見主人 2026-09-12 拍板：手動啟動設計） */
  mountCharge: number
  /** 是否已經合體「過」——用來跟「還在充能中」區分「合體後坐騎陣亡」 */
  mountFusedOnce: boolean
  mountLabel: string
  busy: boolean
  /** 項目 C-③：對方回合——整條技能列加暗化＋灰階遮罩（比個別按鈕 disabled 更明顯的視覺提示）。 */
  enemyPhase?: boolean
  accentColor: string
  onCastSkill: (skill: Skill) => void
  onNormalAttack: () => void
  onFuse: () => void
}

export function ActionBar({
  skill1,
  skill2,
  passiveSkill,
  passiveTriggerLabel,
  cooldowns,
  sp,
  maxSp,
  isMounted,
  hasMount,
  mountCharge,
  mountFusedOnce,
  mountLabel,
  busy,
  enemyPhase,
  accentColor,
  onCastSkill,
  onNormalAttack,
  onFuse,
}: ActionBarProps) {
  const mountReady = hasMount && !mountFusedOnce && mountCharge >= 1
  const mountDead = hasMount && mountFusedOnce && !isMounted
  const mountState = !hasMount
    ? styles.disabled
    : mountFusedOnce && isMounted
      ? styles.mountedLocked
      : mountDead
        ? styles.mountDead
        : mountReady
          ? styles.mountReady
          : styles.mountCharging
  const mountTitle = !hasMount
    ? '此騎士無坐騎'
    : mountFusedOnce && isMounted
      ? `已合體：${mountLabel}`
      : mountDead
        ? `坐騎「${mountLabel}」已陣亡`
        : mountReady
          ? `坐騎「${mountLabel}」充能完成，點擊合體！`
          : `坐騎「${mountLabel}」充能中 ${Math.round(mountCharge * 100)}%`
  return (
    <div className={`${styles.bar} ${enemyPhase ? styles.enemyPhase : ''}`}>
      <span className={styles.awakenLabel} aria-hidden="true">
        AWAKEN THE STARS
      </span>

      <div className={styles.buttons}>
        {[skill1, skill2].map((skill, i) => {
          if (!skill) return <div key={i} className={styles.slotEmpty} />
          const cooldown = cooldowns[skill.id] ?? 0
          const affordable = sp >= skill.cost
          const onCooldown = cooldown > 0
          const disabled = busy || !affordable || onCooldown
          return (
            <button
              key={skill.id}
              type="button"
              className={`${styles.skillBtn} ${disabled ? styles.disabled : ''} ${onCooldown ? styles.locked : ''}`}
              style={{ '--accent': accentColor } as CSSProperties}
              disabled={disabled}
              onClick={() => onCastSkill(skill)}
            >
              <span className={styles.iconCircle}>{onCooldown ? '🔒' : (SKILL_ICON[skill.type] ?? '✦')}</span>
              <div className={styles.info}>
                <span className={styles.name}>{skill.name}</span>
                <span className={styles.cost}>{onCooldown ? `冷卻中 ${cooldown}` : `${skill.cost} SP`}</span>
                {skill.effectSummary && <span className={styles.desc}>{skill.effectSummary}</span>}
              </div>
            </button>
          )
        })}

        <button type="button" className={`${styles.skillBtn} ${styles.locked}`} disabled>
          <span className={styles.iconCircle}>🔒</span>
          <div className={styles.info}>
            <span className={styles.name}>{passiveSkill?.name ?? '被動'}</span>
            <span className={styles.cost}>
              {passiveTriggerLabel} · LOCKED
            </span>
            {passiveSkill?.effectSummary && <span className={styles.desc}>{passiveSkill.effectSummary}</span>}
          </div>
        </button>

        <button
          type="button"
          className={`${styles.skillBtn} ${styles.normal} ${busy ? styles.disabled : ''}`}
          disabled={busy}
          onClick={onNormalAttack}
        >
          <span className={styles.iconCircle}>⚔</span>
          <div className={styles.info}>
            <span className={styles.name}>普通攻擊</span>
            <span className={styles.cost}>永遠可用</span>
            <span className={styles.descEn}>BASIC ATTACK</span>
          </div>
        </button>
      </div>

      {/* 問題③：坐騎合體從技能列的 5 欄格線裡拆出來，維持規格書原本「技能①②③・普通攻擊」
          4 欄一排＋坐騎合體獨立顯示在右側的設計（見 CLAUDE.md Session 13），不再跟技能按鈕
          擠同一排 grid。§7-1／§9-4：合體維持「充能→玩家手動啟動」設計（主人 2026-09-12 拍板，
          理由：保留策略決策空間、蓄勢待發的張力感、合體是主動必殺而非被動加成）。普攻/受傷/
          使用技能會累積 engine Combatant.mountCharge，滿 1.0 才能點擊；AI 單位滿了會自動觸發，
          因為它沒有按鈕可點。
          UI 全面升級規格書 v1.0 的示意圖在這一格畫的是「無道具」佔位（見下方 .noItemSlot），
          因為那份文件沒有考慮到這個已經跑了好幾個 session、經主人明確拍板的合體機制——這裡
          不刪除既有玩法，維持坐騎合體按鈕，另外把「無道具」佔位加在它旁邊，兩者並存。 */}
      <div className={styles.mountSlot}>
        <button
          type="button"
          className={`${styles.skillBtn} ${styles.mountBtn} ${mountState} ${busy || !mountReady ? styles.disabled : ''}`}
          style={{ '--charge': Math.min(1, mountCharge) } as CSSProperties}
          disabled={!mountReady || busy}
          onClick={onFuse}
          title={mountTitle}
        >
          {hasMount && !mountFusedOnce && mountCharge < 1 && (
            <span className={styles.mountChargeFill} aria-hidden="true" />
          )}
          <span className={styles.iconCircle}>🐴</span>
          <div className={styles.info}>
            <span className={styles.name}>{hasMount ? mountLabel : '無坐騎'}</span>
            <span className={styles.cost}>
              {!hasMount
                ? '—'
                : mountFusedOnce && isMounted
                  ? '已合體'
                  : mountDead
                    ? '已陣亡'
                    : `${Math.round(mountCharge * 100)}%`}
            </span>
          </div>
          {mountFusedOnce && isMounted && (
            <motion.span
              className={styles.mountReadyPulse}
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
        </button>
      </div>

      {/* 目前沒有道具系統，此格為 UI 全面升級規格書 v1.0 要求的視覺佔位，不可點擊。 */}
      <div className={styles.noItemSlot} aria-hidden="true">
        <span className={`${styles.iconCircle} ${styles.noItemIcon}`}>△</span>
        <div className={styles.info}>
          <span className={styles.name}>無道具</span>
          <span className={styles.descMuted}>—</span>
        </div>
      </div>

      <div className={styles.spDial}>
        <div className={styles.spDialRing}>
          <span className={styles.spDialLabel}>SP</span>
          <span className={styles.spDialValue}>
            {sp}/{maxSp}
          </span>
        </div>
        <div className={styles.spDialText}>
          <div className={styles.gameTitle}>星核裂紀 · STELLAR FRACTURE</div>
          <div className={styles.gameTagline}>「盡是辰墜落，我們仍將重見。」</div>
        </div>
      </div>
    </div>
  )
}

export default ActionBar
