// battle-hud-v2 樣板整合：對齊 index.html 的 <div class="team-heading">
// （陣營徽章 + 隊伍名 + 存活數），取代舊版佔滿整個戰場高度的側邊旗幟欄
// （UI 全面升級規格書 v1.0 · 項目 B，見 CLAUDE.md Session 20）——樣板的資訊層級裡，
// 陣營資訊只是「這一排卡片上方/下方的一小條標頭」，不是佔用戰場左右兩成寬度的常駐面板；
// 拿掉側邊欄能讓卡片排真正拿到樣板那種置中、寬敞的版面。
//
// 舊版旗幟欄的「以星為誓・守護一切光明」之類陣營口號、「廢墟平原・選擇你的陣營，決一勝負」
// 場景說明文字，樣板沒有對應欄位——場景說明本來就跟現在固定使用「廢墟平原」背景重複，
// 口號則收進這個元件的 title tooltip（滑鼠停留可見），沒有整個捨棄內容，只是不再佔用主版面。
import type { CSSProperties } from 'react'
import type { Faction } from '../../data/types'
import { FACTION_COLORS } from '../../data/types'
import styles from './FactionBanner.module.css'
import guardianBadge from '../../assets/守護騎士陣營徽章.png'
import chaosBadge from '../../assets/渾沌騎士陣營徽章.png'

const FACTION_EN: Record<Faction, string> = {
  guardian: 'GUARDIAN FORCES',
  chaos: 'CHAOS LEGION',
  independent: 'INDEPENDENT KNIGHTS',
}

interface FactionBannerProps {
  /** 這一側隊伍實際的陣營組成（守護/渾沌/獨立多數決，見 battleDemoData.ts
   * resolveTeamBannerFaction()）——不是寫死「敵方一定是 chaos」。 */
  faction: Faction
  aliveCount: number
  totalCount: number
  /** 口號／陣營宣言，收進 title tooltip（見上方檔頭註解）。 */
  tagline?: string
}

export function FactionBanner({ faction, aliveCount, totalCount, tagline }: FactionBannerProps) {
  const label = FACTION_COLORS[faction].label
  const badge = faction === 'chaos' ? chaosBadge : faction === 'guardian' ? guardianBadge : undefined
  return (
    <div
      className={`${styles.heading} ${styles[faction]}`}
      style={{ '--accent': FACTION_COLORS[faction].primary } as CSSProperties}
      title={tagline}
    >
      <div className={styles.identity}>
        {badge ? (
          <img src={badge} alt="" className={styles.badgeImg} />
        ) : (
          <span className={styles.badgeFallback} aria-hidden="true">
            ✦
          </span>
        )}
        <span className={styles.name}>
          {label}
          <small>{FACTION_EN[faction]}</small>
        </span>
      </div>
      <span className={styles.count}>
        {aliveCount} / {totalCount}
      </span>
    </div>
  )
}

export default FactionBanner
