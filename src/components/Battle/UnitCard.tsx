// 騎士卡片——橫式卡片改版規格書 v1.0：左立繪（40%）＋右資訊（60%），寬高比 5:2。
// 改版動機：直式卡片（3:4）寬度只有 56px，名稱「伊格尼斯·業火」這類 7 字名字一定會被 ellipsis
// 截斷，而卡片又不能加寬（立繪 aspect-ratio 3/4 會讓高度跟著長，撞到 Session 18 的半場高度預算）。
// 橫式之後資訊區有完整寬度可用，名稱截斷問題自然消失（見 CLAUDE.md Session 21 ④）。
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { resolveKnightImage } from '../../assets/knightImages'
import { getFusedMount } from '../../data/mounts'
import { FACTION_COLORS, type Knight } from '../../data/types'
import type { BattleUnitSlot } from './battleDemoData'
import { ATTR_COLORS, COMBAT_TYPE_LABEL, STATUS_ICON, combatTypeOf, hpBarColor } from './battleTheme'
import { FloatingNumber, type FloatingHit } from './FloatingNumber'
import styles from './UnitCard.module.css'

interface UnitCardProps {
  knight: Knight
  slot: BattleUnitSlot
  isCurrent: boolean
  isCasting?: boolean
  hits?: FloatingHit[]
  onSelect?: () => void
  /** 玩家反饋規格 v1.0 項目 C：瞄準模式中，這張卡是不是合法目標（會顯示準星、可點擊指定）。 */
  targetable?: boolean
  /** 項目 C：瞄準模式啟動中——不是目標的卡片要稍微暗化，突顯真正能選的對象。 */
  dimmed?: boolean
}

/** D-2：資訊區右側的陣營星紋羅盤。顏色跟著卡片的 --faction-color 走（currentColor）。 */
function FactionCompass() {
  return (
    <svg className={styles.compass} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <path
        d="M20 1 L23 17 L39 20 L23 23 L20 39 L17 23 L1 20 L17 17 Z"
        fill="currentColor"
        opacity="0.85"
      />
      <path d="M20 7 L21.6 18.4 L33 20 L21.6 21.6 L20 33 L18.4 21.6 L7 20 L18.4 18.4 Z" fill="currentColor" />
    </svg>
  )
}

export function UnitCard({ knight, slot, isCurrent, isCasting, hits, onSelect, targetable, dimmed }: UnitCardProps) {
  // 敵我識別規格書 v1.0 · 項目 B：卡片左側的固定藍/紅識別條，用來在「玩家選渾沌時，敵我
  // 雙方邊框都是深紅、六張卡分不出誰是誰」的情境下提供一個不受陣營色影響的第二識別管道。
  // 判斷依據是 engine Combatant.uid 的 `${side}-${knightId}-${index}` 格式（side 型別只有
  // 'ally' | 'enemy' 兩種，見 engine/battle.ts makeCombatant()）——這個格式在整個戰鬥畫面
  // 早就是既定契約（Session 15 修飄字數字、Session 19 命中粒子定位、Session 22 選中框都是
  // 靠這個字首分流），這裡沿用同一個判斷式，不另外加一個要從 BattleField 逐層往下傳的
  // isPlayerUnit prop——那個 prop 帶的資訊 uid 裡already有，重複一份反而多一個「兩者可能
  // 對不上」的來源。
  const isPlayerUnit = slot.uid.startsWith('ally-')
  const faction = FACTION_COLORS[knight.faction]
  const attrColor = ATTR_COLORS[knight.coreAttr]
  const portraitUrl = resolveKnightImage(knight.image)
  const mount = slot.isMounted ? getFusedMount(knight.mount) : undefined
  const mountPortraitUrl = mount?.image ? resolveKnightImage(mount.image) : undefined

  // §5-2：獨立騎士邊框應為銀白，與圖鑑頁共用的 FACTION_COLORS（金色）不同，這裡局部覆寫。
  const borderColor = knight.faction === 'independent' ? '#e7ecf7' : faction.primary
  const borderGlow = knight.faction === 'independent' ? 'rgba(231, 236, 247, 0.55)' : faction.glow

  const cssVars = {
    '--faction-color': borderColor,
    '--faction-glow': borderGlow,
    '--attr-color': attrColor,
  } as CSSProperties

  // 項目 D：陣亡瞬間（alive: true→false）短暫加一個震動 class，320ms 後自動拿掉——只在
  // 「真的剛死」那一刻觸發一次，不會因為 KO 狀態持續存在而每次 re-render 都重播震動。
  const wasAliveRef = useRef(slot.alive)
  const [justKoed, setJustKoed] = useState(false)
  useEffect(() => {
    const wasAlive = wasAliveRef.current
    wasAliveRef.current = slot.alive
    if (wasAlive && !slot.alive) {
      setJustKoed(true)
      const t = window.setTimeout(() => setJustKoed(false), 320)
      return () => window.clearTimeout(t)
    }
  }, [slot.alive])

  // 橫式卡片資訊區夠寬，HP 一律顯示完整「目前/上限」數字，不再需要後排降級成百分比
  // （那是直式窄卡片的補救措施，見 CLAUDE.md Session 15 項目 A）。
  const currentHp = Math.round(slot.hpPct * knight.maxHp)
  const combat = COMBAT_TYPE_LABEL[combatTypeOf(knight)]

  return (
    <motion.div
      className={[
        styles.card,
        styles[slot.row],
        isPlayerUnit ? styles.playerUnit : styles.enemyUnit,
        slot.isMounted ? styles.mounted : '',
        isCurrent ? styles.current : '',
        targetable ? styles.targetable : '',
        dimmed ? styles.dimmed : '',
      ].join(' ')}
      style={cssVars}
      initial={false}
      /* 陣亡的灰階／半透明刻意「不」放在這個 animate 裡，只留位移／縮放／瞄準暗化——
       * 實測（2026-09-13）framer-motion 在 alive:true→false 時不會把 filter 更新成
       * grayscale(100%)：React 這邊確實已經用 alive:false 重新 render（KO 遮罩有出現、
       * props 也確認是 false），但 inline style 仍停在 grayscale(0%) opacity:1，陣亡卡片
       * 因此完全沒有變灰。dimmed 的 brightness 走同一條路卻正常，所以不是 filter 本身
       * 不能動畫。改成由 .deadInner 這個 CSS class 直接作用在內層 wrapper 上（framer 只寫
       * 外層 motion.div 的 inline style，兩者不同元素就不會互相覆蓋），不再依賴 framer
       * 在這個狀態轉換上的行為。
       * 附帶修好一個舊問題：framer 原本每次都寫 inline `opacity: 1`，把 .back 的
       * opacity:0.92（後排景深）整個蓋掉、從來沒生效過；opacity 不再由 framer 控制之後
       * 那條規則才真的會作用。 */
      animate={{
        scale: slot.isMounted ? 1.06 : 1,
        y: slot.alive ? 0 : 6,
        filter: `brightness(${dimmed ? 0.6 : 1})`,
      }}
      whileHover={onSelect && slot.alive ? { y: -4 } : undefined}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      onClick={slot.alive ? onSelect : undefined}
      role={onSelect && slot.alive ? 'button' : undefined}
      title={`${knight.name} · HP ${currentHp} / ${knight.maxHp}`}
      // 項目 H：命中粒子特效用這個屬性定位目標卡片（見 hitParticles.ts 的呼叫端，
      // BattleScreen.tsx）。故意用 combatant uid 不是 Mina 原文寫的 knight.id——
      // 同一個 knightId 在敵我雙方同時存在時 querySelector 只會抓到 DOM 裡第一個符合的
      // 節點，粒子會噴到錯的那張卡片上（Session 15 的飄字數字踩過同一個坑）。
      data-combatant-uid={slot.uid}
    >
      <div
        className={`${styles.shakeInner} ${!slot.alive ? styles.deadInner : ''}`}
        // 項目 D：陣亡瞬間的短暫震動，直接寫 inline style 觸發 CSS animation（不透過 framer-motion，
        // 避免跟外層 motion.div 自己控制的 transform（y／scale）互搶同一個 CSS property）。
        style={justKoed ? { animation: 'unitCardShake 0.3s ease' } : undefined}
      >
        {slot.isMounted && (
          <div className={styles.mountRing} aria-hidden="true">
            <span />
          </div>
        )}

        {/* C：左側立繪區（40% 寬、撐滿卡片高度、右緣漸層融入資訊區底色） */}
        <div className={styles.portraitWrap}>
          {slot.isMounted && mountPortraitUrl && (
            <img className={styles.mountGhost} src={mountPortraitUrl} alt="" aria-hidden="true" />
          )}

          {portraitUrl ? (
            <img className={styles.portrait} src={portraitUrl} alt={knight.name} loading="lazy" />
          ) : (
            <div className={styles.portraitFallback}>{knight.name.slice(0, 1)}</div>
          )}

          <div className={styles.portraitShade} />

          {slot.statuses.length > 0 && (
            <div className={styles.statusRow}>
              {slot.statuses.map((s) => (
                <span
                  key={s}
                  className={styles.statusIcon}
                  style={{ color: STATUS_ICON[s].color }}
                  title={STATUS_ICON[s].label}
                >
                  {STATUS_ICON[s].icon}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* D：右側資訊區 */}
        <div className={styles.info}>
          <div className={styles.name}>{knight.name}</div>

          <div className={styles.typeRow}>
            <span className={styles.typeBadge}>
              <span className={styles.typeIcon}>{combat.icon}</span>
              {combat.label}
            </span>
            <FactionCompass />
          </div>

          {/* D-3：星核力圓點——已充能的用屬性色實心點，未充能的用暗色空點表示還有多少容量。 */}
          <div className={styles.stellarRow}>
            <span className={styles.starGold}>★</span>
            <span className={styles.stellarLabel}>星核力：</span>
            <span className={styles.stellarDots}>
              {Array.from({ length: slot.spCap }, (_, i) => (
                <span
                  key={i}
                  className={`${styles.stellarDot} ${i < slot.starCoreLevel ? styles.stellarDotOn : ''}`}
                  style={i < slot.starCoreLevel ? { background: attrColor } : undefined}
                />
              ))}
            </span>
          </div>

          {/* D-4：HP 列——示意圖是「HP ▬▬▬▬ 10000/10000」同一行（規格書 CSS 寫的是上下兩行，
              文件明訂示意圖優先，這裡照示意圖做，也跟既有版面一致）。 */}
          <div className={styles.hpRow}>
            <span className={styles.hpLabel}>HP</span>
            <div className={styles.hpTrack}>
              <div
                className={styles.hpFill}
                style={{ width: `${slot.hpPct * 100}%`, background: hpBarColor(slot.hpPct) }}
              />
            </div>
            <span className={styles.hpNumbers}>
              {currentHp} / {knight.maxHp}
            </span>
          </div>
        </div>

        {/* E：前衛／後衛標籤（卡片右上角） */}
        <div className={`${styles.rowBadge} ${slot.row === 'back' ? styles.rowBadgeBack : styles.rowBadgeFront}`}>
          {slot.row === 'back' ? '後衛' : '前衛'}
        </div>

        {(isCurrent || isCasting) && (
          <motion.div
            className={styles.currentGlowFrame}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <span className={styles.corner} data-pos="tl" />
            <span className={styles.corner} data-pos="tr" />
            <span className={styles.corner} data-pos="bl" />
            <span className={styles.corner} data-pos="br" />
          </motion.div>
        )}

        {/* 項目 C：瞄準模式中，合法目標顯示準星＋提示文字；點擊沿用既有的 onSelect。 */}
        {targetable && (
          <div className={styles.targetReticle} aria-hidden="true">
            <span className={styles.reticleMark}>⊕</span>
            <span className={styles.reticleHint}>點擊以選擇目標</span>
          </div>
        )}

        {isCurrent && <div className={styles.currentTag}>當前行動</div>}
      </div>

      {/* F：陣亡遮罩——半透明黑底＋「KO」紅字，覆蓋整張卡片。刻意放在 .shakeInner 外面
          （跟它平行、而不是包在裡面）：灰階是加在 .shakeInner 上的，遮罩若在裡面，連「KO」
          這兩個紅字也會一起被灰掉，反而看不出是陣亡標記。 */}
      {!slot.alive && (
        <div className={styles.koOverlay} aria-hidden="true">
          <span className={styles.koLabel}>KO</span>
        </div>
      )}

      <div className={styles.floatingLayer}>
        <AnimatePresence>
          {(hits ?? []).map((h) => (
            <FloatingNumber key={h.id} hit={h} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default UnitCard
