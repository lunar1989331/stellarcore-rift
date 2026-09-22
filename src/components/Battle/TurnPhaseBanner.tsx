// UI 改善規格書 v2.0 項目 C-①，攻守節奏強化規格書（2026-09-19）全面重寫，
// 追加指令（同日）：橫幅顏色/文字改依「這一側隊伍實際的陣營組成」決定——
// 回合切換橫幅——滑入(300ms)→停留(1200ms)→滑出(300ms)的過場，後方疊一層全畫面暗化
// （alpha 0.3，跟橫幅同步淡入淡出）。
//
// 顏色/文字不再是「我方固定藍金、敵方固定深紅」——BattleScreen.tsx 用
// battleDemoData.ts 的 resolveTeamBannerFaction() 依這一側隊伍的實際陣營組成（守護/
// 渾沌/獨立多數決，細節見那個函式的註解）算出 `style: Faction`，這個元件純粹依 style
// 選文字/配色，不知道、也不需要知道「這是我方還是敵方」。
//
// 過場的實際節奏（800ms 靜止緩衝＋這個元件的 1800ms 滑入/停留/滑出，之後如果換敵方行動
// 還有邊框閃爍＋前搖停頓）由 BattleScreen.tsx 的 runPhaseTransition() 用 await sleep()
// 顯式控制，不再是這裡自己跑一個獨立的 setTimeout——舊版用 useEffect 比對 phase 變化，
// 200ms 淡入後配一個固定 1300ms 的 setTimeout 淡出，跟 pump() 的自動播放迴圈完全脫鉤：
// banner 彈出來的當下，敵方的攻擊動畫可能已經在同時播放，玩家會覺得「切換太快、缺乏前置
// 演出」。現在 phase 改成外部（BattleScreen）用 setTurnBanner() 精準控制何時掛上/拿掉，
// 這個元件只負責「掛上/拿掉那一刻」的視覺過場動畫本身。
import { AnimatePresence, motion } from 'framer-motion'
import type { Faction } from '../../data/types'
import type { TurnPhase } from './TopBar'
import styles from './TurnPhaseBanner.module.css'

interface TurnPhaseBannerProps {
  /** null＝目前沒有橫幅要顯示。由 BattleScreen 的 runPhaseTransition() 精準控制掛上/拿掉的時機。
   * 只用來當 AnimatePresence 的 key（確保每次換邊都是一次全新的滑入/滑出，即使兩側風格剛好一樣）。 */
  phase: TurnPhase | null
  /** 這次橫幅要用哪個陣營的風格（守護/渾沌/獨立）——由 BattleScreen 依這一側隊伍的實際陣營
   * 組成算出（resolveTeamBannerFaction()），不是寫死跟著 phase 走。phase 非 null 時必定有值。 */
  style: Faction | null
}

const STYLE_TEXT: Record<Faction, string> = {
  guardian: 'GUARDIAN PHASE',
  chaos: 'CHAOS PHASE',
  independent: 'STELLAR PHASE',
}

const STYLE_SUB: Record<Faction, string> = {
  guardian: '◈ 守護陣營回合 ◈',
  chaos: '◈ 渾沌陣營回合 ◈',
  independent: '◈ 獨立騎士回合 ◈',
}

export function TurnPhaseBanner({ phase, style }: TurnPhaseBannerProps) {
  return (
    <>
      {/* 全畫面暗化，跟橫幅用同一個 phase 值掛上/拿掉——兩個 AnimatePresence 各自獨立，
          但由同一個 prop 在同一次 render 觸發，時間軸天然同步，不用額外協調。 */}
      <AnimatePresence>
        {phase && (
          <motion.div
            key={phase}
            className={styles.darken}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3, transition: { duration: 0.3, ease: 'easeOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className={styles.layer} aria-hidden="true">
        <AnimatePresence>
          {phase && style && (
            <motion.div
              key={phase}
              className={`${styles.banner} ${styles[style]}`}
              // 「從畫面中央滑入、向右展開」：scaleX 0→1、transform-origin 設在橫幅自己的
              // 水平中點，視覺上是一個由中心向兩側展開的 wipe——比起真的做成「只佔右半邊
              // 螢幕、從中線長到最右邊」的不對稱版面（那樣橫幅最終會變成只蓋住半個畫面，
              // 跟原本橫貫全螢幕的可讀性設計衝突），置中展開是視覺上最接近「從中央出現」
              // 又不犧牲橫幅可讀性的做法。
              style={{ transformOrigin: 'center center' }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
              exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }}
            >
              <span className={styles.bannerMain}>{STYLE_TEXT[style]}</span>
              <span className={styles.bannerSub}>{STYLE_SUB[style]}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export default TurnPhaseBanner
