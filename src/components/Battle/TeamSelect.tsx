// 出戰陣容選擇畫面（封測問題②；UI 改善規格書 v2.0 項目 D 重構為「先選陣營再選角」兩步驟）：
// 開戰前從全員裡選 3 位、指定其中 1 位站後排，才進入 BattleScreen 真正的 3v3 對戰。
//
// 3v3 是 engine/battle.ts 從 Session 1 就定案、跑過上百場模擬驗證的隊伍規模（見 CLAUDE.md），
// 這裡不開放選超過 3 位——「前3後2共5格」的陣列形狀（問題④）是 BattleField 的純視覺呈現，
// 用不到的 2 格畫成預留空位，不代表可以塞進第 4、5 位真正上場的騎士。
//
// 項目 D 判讀（供覆核）：規格書附錄的驗證函式 isTeamValid() 寫「至少選 1 人才能開始戰鬥」，
// 這是通用選角流程的假設，跟本作 3v3 引擎「一定要剛好 3 人才跑得起來」（SP 池／共鳴陣／
// 前排全滅補位規則全部是圍繞 3 人設計）互相矛盾——維持「剛好 3 人」的既有硬性限制，不放寬
// 成「1~3 人皆可」，見 CLAUDE.md Session 16。
import { useMemo, useState, type CSSProperties } from 'react'
import { resolveKnightImage } from '../../assets/knightImages'
import { KNIGHTS_BY_FACTION } from '../../data/knights'
import { FACTION_COLORS, type Knight } from '../../data/types'
import styles from './TeamSelect.module.css'

const TEAM_SIZE = 3

type FactionChoice = 'guardian' | 'chaos'

const FACTION_COPY: Record<FactionChoice, { title: string; subtitle: string }> = {
  guardian: { title: '守護陣營', subtitle: '以星為誓・守護一切光明' },
  chaos: { title: '渾沌陣營', subtitle: '讓星辰流血・世界將重生' },
}

interface TeamSelectProps {
  /**
   * allyIds：前排在前、後排殿後的陣列（既有的 gameplay 順序，engine 用來分前後排）。
   * pickOrderIds：玩家實際點選的順序（不受前/後排指定影響）——攻守節奏強化規格書
   * （2026-09-19）的 TurnPhaseBanner 陣營平手判定要用「玩家選角時第一個選的騎士」，
   * 如果直接拿 allyIds[0]，被指定站後排的那個人會被搬到陣列最後一格，即使他其實是
   * 玩家第一個點的，也會被誤判成「不是第一個」——兩個陣列服務不同用途，故意分開給。
   */
  onConfirm: (allyIds: string[], pickOrderIds: string[]) => void
  /** 永恆的聖域：陣營由關卡鎖定（渾沌限定），直接進入該陣營名冊、不顯示陣營選擇與返回鈕。 */
  lockedFaction?: FactionChoice
  /** 覆寫畫面標題／副標（聖域關卡用）。 */
  heading?: { title: string; subtitle: string }
}

/** 項目 D 附錄驗證函式：陣營騎士最多擇一陣營、獨立騎士不佔配額、隊伍合計最多 3 人。
 * 這裡的 UI 結構本來就一次只顯示一個陣營的名冊（見下方 selectedFaction gate），實務上
 * 不可能點出跨陣營組合；保留這個檢查純粹是規格書明確要求的防呆，不靠它才能運作。 */
function isTeamValid(team: Knight[]): boolean {
  const factionKnights = team.filter((k) => k.faction !== 'independent')
  const factions = new Set(factionKnights.map((k) => k.faction))
  return factions.size <= 1 && team.length >= 1 && team.length <= TEAM_SIZE
}

/** 陣營徽章——跟戰鬥畫面 FactionBanner.tsx 的八芒星／紋章 SVG 共用同一套畫法，保持視覺一致。 */
function FactionBadge({ faction }: { faction: FactionChoice }) {
  return (
    <svg viewBox="0 0 40 40" className={styles.factionBadgeIcon} aria-hidden="true">
      {faction === 'guardian' ? (
        <polygon
          points="20,2 24,15 38,15 26,23 30,38 20,29 10,38 14,23 2,15 16,15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      ) : (
        <>
          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M20 6 L26 20 L20 34 L14 20 Z M6 20 L20 14 L34 20 L20 26 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </>
      )}
    </svg>
  )
}

export function TeamSelect({ onConfirm, lockedFaction, heading }: TeamSelectProps) {
  const [selectedFaction, setSelectedFaction] = useState<FactionChoice | null>(lockedFaction ?? null)
  const [selected, setSelected] = useState<string[]>([])
  const [backId, setBackId] = useState<string | null>(null)

  const knightsById = useMemo(() => {
    const map = new Map<string, Knight>()
    for (const faction of ['independent', 'guardian', 'chaos'] as const)
      for (const k of KNIGHTS_BY_FACTION[faction]) map.set(k.id, k)
    return map
  }, [])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (backId === id) setBackId(null)
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= TEAM_SIZE) return prev
      return [...prev, id]
    })
  }

  // 項目 D：返回陣營選擇時清空已選騎士，避免「先選了2位守護騎士→返回→改選渾沌陣營」
  // 殘留舊陣營的人選在隊伍裡（規格書明講的「避免混陣營殘留」）。
  const handleBackToFaction = () => {
    if (lockedFaction) return
    setSelectedFaction(null)
    setSelected([])
    setBackId(null)
  }

  const effectiveBackId = backId && selected.includes(backId) ? backId : (selected.length === TEAM_SIZE ? selected[TEAM_SIZE - 1] : null)
  const canConfirm =
    selected.length === TEAM_SIZE && isTeamValid(selected.map((id) => knightsById.get(id)).filter((k): k is Knight => !!k))

  const handleConfirm = () => {
    if (!canConfirm) return
    const front = selected.filter((id) => id !== effectiveBackId)
    const ordered = effectiveBackId ? [...front, effectiveBackId] : selected
    onConfirm(ordered, selected)
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.title}>{heading?.title ?? '出戰陣容選擇'}</h1>
        <p className={styles.subtitle}>
          {heading?.subtitle ?? `從騎士名冊中選 ${TEAM_SIZE} 位出戰，並指定 1 位站後排（3v3：前排 2 位＋後排 1 位）`}
        </p>
      </div>

      <div className={styles.preview}>
        {Array.from({ length: TEAM_SIZE }).map((_, i) => {
          const id = selected[i]
          const knight = id ? knightsById.get(id) : undefined
          const isBack = !!id && id === effectiveBackId
          return (
            <div key={i} className={`${styles.previewSlot} ${isBack ? styles.previewBack : ''}`}>
              {knight ? (
                <>
                  <img className={styles.previewImg} src={resolveKnightImage(knight.image) ?? ''} alt={knight.name} />
                  <div className={styles.previewName}>{knight.name}</div>
                  <div className={styles.previewRowLabel}>{isBack ? '後排' : '前排'}</div>
                  {selected.length === TEAM_SIZE && (
                    <button type="button" className={styles.swapBtn} onClick={() => setBackId(id)} disabled={isBack}>
                      {isBack ? '後排中' : '設為後排'}
                    </button>
                  )}
                </>
              ) : (
                <div className={styles.previewEmpty}>未選擇</div>
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.roster}>
        {/* 項目 D 步驟一：先選陣營。守護／渾沌擇一進入步驟二看該陣營名冊；獨立騎士不受這個
            步驟限制，不管有沒有選陣營都顯示在下面，隨時可以加進隊伍。 */}
        {selectedFaction === null ? (
          <div className={styles.factionChoice}>
            {(['guardian', 'chaos'] as const).map((faction) => (
              <button
                key={faction}
                type="button"
                className={`${styles.factionCard} ${styles[faction]}`}
                onClick={() => setSelectedFaction(faction)}
              >
                <FactionBadge faction={faction} />
                <span className={styles.factionCardTitle}>{FACTION_COPY[faction].title}</span>
                <span className={styles.factionCardSubtitle}>{FACTION_COPY[faction].subtitle}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.factionGroup}>
            <div className={styles.rosterStepHeader}>
              {!lockedFaction && (
                <button type="button" className={styles.backBtn} onClick={handleBackToFaction}>
                  ← 返回陣營選擇
                </button>
              )}
              <h2 className={styles.factionTitle} style={{ color: FACTION_COLORS[selectedFaction].primary }}>
                {FACTION_COPY[selectedFaction].title}騎士
              </h2>
              <span className={styles.countLabel}>
                已選：{selected.length} / {TEAM_SIZE}
              </span>
            </div>
            <div className={styles.grid}>
              {KNIGHTS_BY_FACTION[selectedFaction].map((knight) => {
                const pickIndex = selected.indexOf(knight.id)
                const isSelected = pickIndex !== -1
                const disabled = !isSelected && selected.length >= TEAM_SIZE
                return (
                  <button
                    key={knight.id}
                    type="button"
                    className={`${styles.pickCard} ${isSelected ? styles.picked : ''} ${disabled ? styles.pickDisabled : ''}`}
                    style={{ '--faction-color': FACTION_COLORS[knight.faction].primary } as CSSProperties}
                    onClick={() => toggleSelect(knight.id)}
                    disabled={disabled}
                    title={knight.name}
                  >
                    <img className={styles.pickImg} src={resolveKnightImage(knight.image) ?? ''} alt={knight.name} loading="lazy" />
                    <span className={styles.pickName}>{knight.name}</span>
                    {isSelected && <span className={styles.pickBadge}>{pickIndex + 1}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className={styles.factionGroup}>
          <p className={styles.independentLabel}>獨立騎士・不受陣營限制</p>
          <div className={styles.grid}>
            {KNIGHTS_BY_FACTION.independent.map((knight) => {
              const pickIndex = selected.indexOf(knight.id)
              const isSelected = pickIndex !== -1
              const disabled = !isSelected && selected.length >= TEAM_SIZE
              return (
                <button
                  key={knight.id}
                  type="button"
                  className={`${styles.pickCard} ${isSelected ? styles.picked : ''} ${disabled ? styles.pickDisabled : ''}`}
                  style={{ '--faction-color': FACTION_COLORS.independent.primary } as CSSProperties}
                  onClick={() => toggleSelect(knight.id)}
                  disabled={disabled}
                  title={knight.name}
                >
                  <img className={styles.pickImg} src={resolveKnightImage(knight.image) ?? ''} alt={knight.name} loading="lazy" />
                  <span className={styles.pickName}>{knight.name}</span>
                  {isSelected && <span className={styles.pickBadge}>{pickIndex + 1}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.countLabel}>
          已選擇 {selected.length} / {TEAM_SIZE}
        </span>
        <button type="button" className={styles.confirmBtn} disabled={!canConfirm} onClick={handleConfirm}>
          開始戰鬥
        </button>
      </div>
    </div>
  )
}

export default TeamSelect
