// 星橋地圖（§6）：Chronicle Mode 的主場景，玩家大部分時間在此。
// Phase 1-C（HANDOFF_PHASE1C 任務一/二）：節點三態視覺強化＋星橋路線 SVG 連線，
// 純視覺疊加，沒有動任何 Phase 1-A/1-B 已經驗證過的解鎖/導航邏輯。
import { Link, useNavigate } from 'react-router-dom'
import worldMapBg from '../../assets/星核裂紀：星橋諸域圖.png'
import { domainsForFaction, getDomain, isDomainCompleted, type Domain } from '../../data/chronicleData'
import { loadChronicleSave, type ChronicleSave } from '../../hooks/useChronicleSave'
import styles from './StarBridgeMap.module.css'

type NodeState = 'locked' | 'available' | 'completed'

function domainState(domain: Domain, save: ChronicleSave | null): NodeState {
  if (!save) return domain.unlocksAfter === null ? 'available' : 'locked'
  if (isDomainCompleted(domain, save.completedBattles)) return 'completed'
  if (save.unlockedDomains.includes(domain.id)) return 'available'
  return 'locked'
}

const NODE_ICON: Record<NodeState, string> = { locked: '🔒', available: '⚡', completed: '✅' }

/**
 * 任務二：星橋路線視覺——每一條連線對應「domain.unlocksAfter → domain」這條關係，
 * 狀態判斷完全照 HANDOFF 給的 `getLinkState()` 邏輯：起點域已全部通關 → 金色實線；
 * 否則終點域已解鎖（可進入） → 銀色流動虛線；否則 → 灰色虛線（都還沒走到這裡）。
 */
type LinkState = 'locked' | 'available' | 'completed'

interface BridgeLink {
  key: string
  from: Domain
  to: Domain
  state: LinkState
}

function buildLinks(domains: readonly Domain[], save: ChronicleSave | null): BridgeLink[] {
  const links: BridgeLink[] = []
  for (const to of domains) {
    if (!to.unlocksAfter) continue
    const from = domains.find((d) => d.id === to.unlocksAfter) ?? getDomain(to.unlocksAfter)
    if (!from) continue
    const fromCompleted = !!save && isDomainCompleted(from, save.completedBattles)
    const toAvailable = !!save?.unlockedDomains.includes(to.id)
    const state: LinkState = fromCompleted ? 'completed' : toAvailable ? 'available' : 'locked'
    links.push({ key: `${from.id}->${to.id}`, from, to, state })
  }
  return links
}

const LINK_STYLE: Record<LinkState, { stroke: string; dash: string; opacity: number }> = {
  locked: { stroke: '#444444', dash: '6,6', opacity: 0.4 },
  available: { stroke: '#c0c0c0', dash: '8,4', opacity: 0.8 },
  completed: { stroke: '#ffd700', dash: 'none', opacity: 0.9 },
}

/** 節點座標（百分比）換算成 SVG viewBox 0–1000 的座標系——沿用 Mina 給的 dash 數值
 * （6,6／8,4／stroke-dashoffset -24）不用另外換算比例，viewBox 越大、座標系越貼近她
 * 原本假設的「真實像素 SVG」。 */
function toViewBoxCoord(pct: number): number {
  return pct * 10
}

export function StarBridgeMap() {
  const navigate = useNavigate()
  const save = loadChronicleSave()
  const faction = save?.playerFaction ?? 'guardian'
  const domains = domainsForFaction(faction)
  const links = buildLinks(domains, save)

  const handleSelect = (domain: Domain, state: NodeState) => {
    if (state === 'locked') return
    navigate(`/chronicle/domain/${domain.id}`)
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>
          ← 返回主選單
        </Link>
        <div className={styles.headerTitle}>Chronicle Mode</div>
        <div className={styles.saveStatus}>💾 已保存</div>
      </div>

      <div className={styles.mapArea} style={{ backgroundImage: `url(${worldMapBg})` }}>
        <svg className={styles.linkLayer} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
          {links.map((link) => {
            const style = LINK_STYLE[link.state]
            return (
              <line
                key={link.key}
                x1={toViewBoxCoord(link.from.position.x)}
                y1={toViewBoxCoord(link.from.position.y)}
                x2={toViewBoxCoord(link.to.position.x)}
                y2={toViewBoxCoord(link.to.position.y)}
                stroke={style.stroke}
                strokeWidth={4}
                strokeDasharray={style.dash}
                strokeOpacity={style.opacity}
                className={link.state === 'available' ? styles.linkFlow : undefined}
              />
            )
          })}
        </svg>

        {domains.map((domain) => {
          const state = domainState(domain, save)
          return (
            <button
              key={domain.id}
              type="button"
              className={`${styles.node} ${styles[state]}`}
              style={{ left: `${domain.position.x}%`, top: `${domain.position.y}%` }}
              onClick={() => handleSelect(domain, state)}
              disabled={state === 'locked'}
            >
              <span className={styles.nodeIcon}>{NODE_ICON[state]}</span>
              <span className={styles.nodeName}>{domain.name}</span>
              <span className={styles.nodeChapter}>{domain.chapter}</span>
            </button>
          )
        })}
      </div>

      <div className={styles.legend}>
        <span>✅ 已通關</span>
        <span>⚡ 可進入</span>
        <span>🔒 未解鎖</span>
      </div>
    </div>
  )
}

export default StarBridgeMap
