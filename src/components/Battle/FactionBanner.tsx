// 陣營旗幟欄（UI 全面升級規格書 v1.0 · 項目 B）：左守護（聖藍）／右渾沌（猩紅）。
// 徽章從 Session 7 的 SVG 線稿換成 Lisa 正式素材（視覺需求/徽章設計/），文字改成
// 「陣營名＋口號 → 分隔線 → 場景資訊（◆／◇）」的固定版式，守護側額外帶英文場景分類標籤。
import styles from './FactionBanner.module.css'
import guardianBadge from '../../assets/守護騎士陣營徽章.png'
import chaosBadge from '../../assets/渾沌騎士陣營徽章.png'

interface FactionBannerProps {
  side: 'guardian' | 'chaos'
  title: string
  lines: string[]
  /** 場景分類英文標籤（如 STELLAR TEMPLE）——渾沌側是獨立 flavor 文字、不是同一場景名稱的重複，不帶這個欄位。 */
  sceneLabelEn?: string
  sceneName: string
  sceneSubtitle: string
}

export function FactionBanner({ side, title, lines, sceneLabelEn, sceneName, sceneSubtitle }: FactionBannerProps) {
  const badge = side === 'guardian' ? guardianBadge : chaosBadge
  return (
    <div className={`${styles.banner} ${side === 'guardian' ? styles.guardian : styles.chaos}`}>
      <img src={badge} alt="" className={styles.badgeImg} />
      <div className={styles.title}>{title}</div>
      <div className={styles.lines}>
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <div className={styles.divider} />
      {sceneLabelEn && <div className={styles.sceneLabelEn}>{sceneLabelEn}</div>}
      <div className={styles.sceneName}>◆ {sceneName}</div>
      <div className={styles.sceneSubtitle}>◇ {sceneSubtitle}</div>
    </div>
  )
}

export default FactionBanner
