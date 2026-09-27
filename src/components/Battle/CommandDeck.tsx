// 底部指令區——battle-hud-v2 樣板完整整合：對齊 index.html 的
// <section class="command-deck"> 三欄版面（pilot-panel｜skills-panel｜action-panel）。
//
// 互動流程改成樣板的「選技能→（需要目標的話）選目標→按執行指令」三段式確認流程，
// 取代舊版「點技能／點敵方卡片就直接發動」的即時流程——這是樣板 script.js 的核心互動
// 設計（chooseSkill 只是標記選取、chooseUnit 只是記 targetId，execute() 才真的套用），
// 這裡逐字對齊，只是把 script.js 的展示用假傷害換成真正呼叫 engine 的 onExecute。
import type { CSSProperties } from 'react'
import type { Skill } from '../../data/skills'
import styles from './CommandDeck.module.css'

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

/** 坐騎合體不是 data/skills.ts 裡的技能，用這個固定字串跟真正的 skill.id 區分。 */
export const MOUNT_FUSE_ID = 'mount-fuse'

interface CommandDeckProps {
  pilotName: string
  pilotNameEn: string
  pilotRoleLabel: string
  pilotPortraitUrl?: string
  skill1?: Skill
  skill2?: Skill
  normalSkill?: Skill
  passiveSkill?: Skill
  passiveTriggerLabel: string
  cooldowns: Record<string, number>
  sp: number
  maxSp: number
  isMounted: boolean
  hasMount: boolean
  mountCharge: number
  mountFusedOnce: boolean
  mountLabel: string
  /** 目前面板上「已選但還沒執行」的技能 id，或坐騎合體的 MOUNT_FUSE_ID；undefined＝還沒選。 */
  pendingId?: string
  /** 已選技能是否需要玩家再指定敵方目標（needsEnemyTarget()，由呼叫端算好傳進來，
   * 坐騎合體不需要，一律 false）。 */
  pendingNeedsTarget: boolean
  /** 已鎖定目標的名字（還沒鎖定則 undefined）——只用來顯示文字，鎖定/驗證都在呼叫端。 */
  lockedTargetName?: string
  busy: boolean
  /** 對方回合——整個指令區加暗化＋灰階遮罩。 */
  enemyPhase?: boolean
  accentColor: string
  onSelectSkill: (skill: Skill) => void
  onSelectMountFuse: () => void
  onExecute: () => void
}

export function CommandDeck({
  pilotName,
  pilotNameEn,
  pilotRoleLabel,
  pilotPortraitUrl,
  skill1,
  skill2,
  normalSkill,
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
  pendingId,
  pendingNeedsTarget,
  lockedTargetName,
  busy,
  enemyPhase,
  accentColor,
  onSelectSkill,
  onSelectMountFuse,
  onExecute,
}: CommandDeckProps) {
  const mountReady = hasMount && !mountFusedOnce && mountCharge >= 1
  const mountDead = hasMount && mountFusedOnce && !isMounted

  const pendingSkill = [skill1, skill2, normalSkill].find((s) => s?.id === pendingId)
  const isMountFusePending = pendingId === MOUNT_FUSE_ID
  const hasSelection = !!pendingSkill || isMountFusePending
  const readyToExecute = hasSelection && (isMountFusePending || !pendingNeedsTarget || !!lockedTargetName)

  const selectedName = isMountFusePending ? `坐騎合體・${mountLabel}` : pendingSkill?.name ?? '尚未選擇'
  const pilotNote = !hasSelection
    ? '選擇技能，再視需要指定敵方目標。'
    : isMountFusePending
      ? '坐騎合體視為本回合的完整行動，按下方執行指令確認。'
      : pendingNeedsTarget
        ? '選擇技能，再指定敵方目標。'
        : pendingSkill?.type === 'aoe'
          ? '全體技能會影響所有存活敵人。'
          : '此招式作用於目前騎士或我方全體。'
  const actionHint = !hasSelection
    ? '點選上方技能開始行動'
    : isMountFusePending
      ? '作用對象：自己'
      : pendingNeedsTarget
        ? lockedTargetName
          ? `已鎖定：${lockedTargetName}`
          : '點選上方敵方卡片指定目標'
        : pendingSkill?.type === 'aoe'
          ? '作用對象：敵方全體'
          : '作用對象：自己 / 我方全體'
  const executeLabel = !hasSelection ? '選擇技能' : readyToExecute ? '執行指令 ➜' : '選擇目標 ➜'

  const skillButton = (skill: Skill | undefined, key: string) => {
    if (!skill) return <div key={key} className={styles.slotEmpty} />
    const cooldown = cooldowns[skill.id] ?? 0
    const affordable = sp >= skill.cost
    const onCooldown = cooldown > 0
    const disabled = busy || !affordable || onCooldown
    return (
      <button
        key={skill.id}
        type="button"
        className={`${styles.skillBtn} ${skill.id === pendingId ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
        style={{ '--accent': accentColor } as CSSProperties}
        disabled={disabled}
        aria-pressed={skill.id === pendingId}
        onClick={() => onSelectSkill(skill)}
      >
        <span className={styles.iconCircle}>{onCooldown ? '🔒' : (SKILL_ICON[skill.type] ?? '✦')}</span>
        <span className={styles.skillText}>
          <strong>{skill.name}</strong>
          <small>{skill.effectSummary ?? (onCooldown ? `冷卻中 ${cooldown} 回合` : '')}</small>
        </span>
        <b className={styles.skillCost}>{onCooldown ? `CD ${cooldown}` : `${skill.cost} SP`}</b>
      </button>
    )
  }

  return (
    <div className={`${styles.deck} ${enemyPhase ? styles.enemyPhase : ''}`}>
      {/* 對齊樣板 pilot-panel：ACTIVE UNIT 面板。 */}
      <div className={styles.pilotPanel}>
        <div className={styles.panelKicker}>
          <span>ACTIVE UNIT</span>
          <span className={styles.pulseDot} aria-hidden="true" />
        </div>
        <div className={styles.pilotMain} style={{ '--accent': accentColor } as CSSProperties}>
          {pilotPortraitUrl ? (
            <img className={styles.pilotPortrait} src={pilotPortraitUrl} alt="" />
          ) : (
            <div className={styles.pilotPortraitFallback}>{pilotName.slice(0, 1)}</div>
          )}
          <div>
            <span className={styles.pilotTitle}>{pilotRoleLabel}</span>
            <h1 className={styles.pilotName}>{pilotName}</h1>
            <span className={styles.pilotSub}>{pilotNameEn}</span>
          </div>
        </div>
        <div className={styles.pilotNote}>{pilotNote}</div>
      </div>

      {/* 對齊樣板 skills-panel：技能①②・普通攻擊・被動＋坐騎合體（樣板沒有坐騎概念，
          用同一個 2 欄格線多排一顆按鈕容納這個真實遊戲機制，見 CLAUDE.md 這次的整合說明）。 */}
      <div className={styles.skillsPanel}>
        <div className={styles.panelKicker}>
          <span>BATTLE COMMAND</span>
          <span>選擇技能</span>
        </div>
        <div className={styles.skillList}>
          {skillButton(skill1, 'skill1')}
          {skillButton(skill2, 'skill2')}
          {skillButton(normalSkill, 'normal')}
          <button type="button" className={`${styles.skillBtn} ${styles.locked}`} disabled>
            <span className={styles.iconCircle}>🔒</span>
            <span className={styles.skillText}>
              <strong>{passiveSkill?.name ?? '被動'}</strong>
              <small>{passiveSkill?.effectSummary ?? passiveTriggerLabel}</small>
            </span>
            <b className={styles.skillCost}>LOCKED</b>
          </button>
          {hasMount && (
            <button
              type="button"
              className={`${styles.skillBtn} ${styles.mountBtn} ${MOUNT_FUSE_ID === pendingId ? styles.active : ''} ${busy || !mountReady ? styles.disabled : ''}`}
              style={{ '--charge': Math.min(1, mountCharge) } as CSSProperties}
              disabled={!mountReady || busy}
              onClick={onSelectMountFuse}
              title={
                mountFusedOnce && isMounted
                  ? `已合體：${mountLabel}`
                  : mountDead
                    ? `坐騎「${mountLabel}」已陣亡`
                    : mountReady
                      ? `坐騎「${mountLabel}」充能完成，點擊選擇合體！`
                      : `坐騎「${mountLabel}」充能中 ${Math.round(mountCharge * 100)}%`
              }
            >
              {!mountFusedOnce && mountCharge < 1 && <span className={styles.mountChargeFill} aria-hidden="true" />}
              <span className={styles.iconCircle}>🐴</span>
              <span className={styles.skillText}>
                <strong>{mountLabel}</strong>
                <small>
                  {mountFusedOnce && isMounted ? '已合體' : mountDead ? '已陣亡' : '坐騎合體・本回合完整行動'}
                </small>
              </span>
              <b className={styles.skillCost}>
                {mountFusedOnce && isMounted ? '—' : mountDead ? '—' : `${Math.round(mountCharge * 100)}%`}
              </b>
            </button>
          )}
        </div>
      </div>

      {/* 對齊樣板 action-panel：當前指令＋執行按鈕＋星核能量（SP）條。 */}
      <div className={styles.actionPanel}>
        <div className={styles.panelKicker}>
          <span>TARGET &amp; EXECUTE</span>
        </div>
        <div className={styles.selectedAction}>
          <small>當前指令</small>
          <strong>{selectedName}</strong>
          <span>{actionHint}</span>
        </div>
        <button
          type="button"
          className={styles.execute}
          disabled={!readyToExecute || busy}
          onClick={onExecute}
        >
          {executeLabel}
        </button>
        <div className={styles.spMeter}>
          <div className={styles.spHeading}>
            <span>
              星核能量 <small>SP</small>
            </span>
            <b>
              {sp} / {maxSp}
            </b>
          </div>
          <div className={styles.spCells}>
            {Array.from({ length: maxSp }, (_, i) => (
              <i key={i} className={i < sp ? styles.filled : ''} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommandDeck
