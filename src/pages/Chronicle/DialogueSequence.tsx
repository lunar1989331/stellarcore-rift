// 共用對話框演出元件：Phase 1-A 的 PrologueScene 原本自己內嵌一份幾乎一樣的渲染邏輯，
// Phase 1-B 需要在 DomainDetail（入域前）與 ChronicleTeamSelect（域主戰通關後）各再用一次，
// 這裡抽出來共用，PrologueScene 也改用這個元件（見它自己的檔案，行為不變、只是不重複程式碼）。
import { useCallback, useState } from 'react'
import { resolveKnightImage } from '../../assets/knightImages'
import type { DialogueLine } from '../../data/chronicleDialogues'
import { getKnight } from '../../data/knights'
import { resolveDialogueKnightId } from '../../data/chronicleData'
import styles from './DialogueSequence.module.css'

interface DialogueSequenceProps {
  lines: readonly DialogueLine[]
  onDone: () => void
  /** 全螢幕背景圖 URL；省略則用純黑底（純對白場景，例如兩人對峙特寫）。 */
  background?: string
}

export function DialogueSequence({ lines, onDone, background }: DialogueSequenceProps) {
  const [index, setIndex] = useState(0)
  const line = lines[index]
  const isLast = index === lines.length - 1

  const advance = useCallback(() => {
    if (!isLast) {
      setIndex((i) => i + 1)
      return
    }
    onDone()
  }, [isLast, onDone])

  if (!line) return null

  const knightId = resolveDialogueKnightId(line.portrait)
  const portraitFile = knightId ? getKnight(knightId)?.image : undefined
  const portraitUrl = portraitFile ? resolveKnightImage(portraitFile) : undefined
  const side = line.portraitSide ?? 'left'

  return (
    <div
      className={styles.root}
      style={background ? { backgroundImage: `url(${background})` } : undefined}
      onClick={advance}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') advance()
      }}
    >
      <div className={styles.overlay} aria-hidden="true" />
      <div className={`${styles.dialogueRow} ${side === 'right' ? styles.reversed : ''}`}>
        {portraitUrl && <img className={styles.portrait} src={portraitUrl} alt={line.speaker} />}
        <div className={styles.box}>
          <div className={styles.speaker} style={{ color: line.speakerColor }}>
            {line.speaker}
          </div>
          <div className={styles.text}>{line.text}</div>
          <div className={styles.hint}>
            ▶ 點擊繼續（{index + 1}/{lines.length}）
          </div>
        </div>
      </div>
    </div>
  )
}

export default DialogueSequence
