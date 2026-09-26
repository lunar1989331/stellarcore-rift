// 引擎接線規格 Part B §21/§24：把 engine/battle.ts 的 runBattleSteps() generator
// 包成一個薄薄的 React hook——只負責「擁有 generator 實例、把每次 .next() 的快照塞進
// state 讓畫面重繪」，實際的動畫節奏／逐步播放邏輯留在 BattleScreen（跟原本 demo 版的
// runCastSequence 是同一顆大腦，只是現在餵給它的是真事件而不是假資料）。
import { useCallback, useRef, useState } from 'react'
import type { BossConfig } from '../../data/bosses'
import { getKnight } from '../../data/knights'
import {
  runBattleSteps,
  type Side,
  type BattleResult,
  type BattleStepEvent,
  type Combatant,
  type PlayerChoice,
} from '../../engine/battle'

export interface InteractiveBattleOptions {
  allyIds: string[]
  enemyIds: string[]
  rng?: () => number
  /** 永恆的聖域：啟用世界級 Boss 規則（護盾／覺醒／專屬招式），見 engine/battle.ts。 */
  boss?: BossConfig
  /** 星核君臨碎片是否裝備（我方第一位陣亡騎士 50% HP 復活）。 */
  fragmentEquipped?: boolean
  /** Chronicle Mode 精英戰規則（HANDOFF_PHASE1B §3）：敵方攻擊力乘數，例如 1.25＝+25%。
   * 在這裡（不是 engine/battle.ts）套用——直接調整餵給引擎的 Knight 副本的 atk 欄位，
   * 不動 BattleConfig／makeCombatant，引擎完全不用知道「精英戰」這個 Chronicle Mode 專屬概念。 */
  enemyAtkMultiplier?: number
}

/** 每場戰鬥開始時才確定的額外引擎設定（restartWith 用，不依賴 hook 的 closure 值）。 */
export interface BattleExtras {
  boss?: BossConfig
  fragmentEquipped?: boolean
  enemyAtkMultiplier?: number
}

/**
 * 引擎每次 yield 給的 combatants 是引擎自己「活的」那批物件——之後每一次 .next() 都會原地改寫
 * hp／alive／statuses。畫面要顯示的東西（尤其 BattleScreen 的 displayed）一定要存這份深拷貝，
 * 不能直接存引擎給的參照，否則引擎往前跑一步、動畫都還沒播，畫面上的 HP／KO 就已經跟著變了。
 */
export function cloneCombatant(c: Combatant): Combatant {
  return {
    ...c,
    statuses: c.statuses.map((s) => ({ ...s })),
    cooldowns: { ...c.cooldowns },
    permTriggers: { ...c.permTriggers },
    voidMarks: { ...c.voidMarks },
    passiveUses: { ...c.passiveUses },
    boss: c.boss ? { ...c.boss } : undefined,
  }
}

type BattleGenerator = Generator<BattleStepEvent, BattleResult, PlayerChoice | void>

// 呼叫 generator function 本身不會執行內容（要等第一次 .next()），所以在 render 期間
// 直接建立是安全的（沒有真正的副作用），不需要包一層 useEffect 才能「初始化」。
function createGenerator(
  allyIds: string[],
  enemyIds: string[],
  rng: (() => number) | undefined,
  firstSide?: Side,
  extras: BattleExtras = {},
): BattleGenerator {
  const allies = allyIds.map(getKnight).filter((k) => !!k)
  let enemies = enemyIds.map(getKnight).filter((k) => !!k)
  // 精英戰 enemy-buffed：複製一份修改過 atk 的 Knight，不能直接改 getKnight() 拿到的物件——
  // 那是 KNIGHTS_BY_ID 共用的參照，直接改會連圖鑑頁、其他戰鬥模式的數值一起變。
  if (extras.enemyAtkMultiplier && extras.enemyAtkMultiplier !== 1) {
    const multiplier = extras.enemyAtkMultiplier
    enemies = enemies.map((k) => ({ ...k, atk: Math.round(k.atk * multiplier) }))
  }
  return runBattleSteps({
    allies,
    enemies,
    rng,
    firstSide,
    boss: extras.boss,
    fragmentEquipped: extras.fragmentEquipped,
    isPlayerControlled: (c) => c.side === 'ally',
  })
}

export function useInteractiveBattle({
  allyIds,
  enemyIds,
  rng,
  boss,
  fragmentEquipped,
  enemyAtkMultiplier,
}: InteractiveBattleOptions) {
  const genRef = useRef<BattleGenerator | null>(null)
  if (!genRef.current)
    genRef.current = createGenerator(allyIds, enemyIds, rng, undefined, { boss, fragmentEquipped, enemyAtkMultiplier })

  const [combatants, setCombatants] = useState<Combatant[]>([])
  const [turn, setTurn] = useState(0)
  const [result, setResult] = useState<BattleResult | null>(null)

  // 注意：allyIds/enemyIds/rng 必須是穩定參照（模組層常數，不要在呼叫端每次 render
  // 產生新陣列字面量），否則這裡會被誤判成需要重建。
  const restart = useCallback(() => {
    genRef.current = createGenerator(allyIds, enemyIds, rng, undefined, { boss, fragmentEquipped, enemyAtkMultiplier })
    setResult(null)
    setTurn(0)
    setCombatants([])
  }, [allyIds, enemyIds, rng, boss, fragmentEquipped, enemyAtkMultiplier])

  /**
   * 隊伍選擇畫面（問題②）用：直接帶新的 allyIds 重建 generator，不依賴 hook 參數 allyIds
   * 這個 closure 值——呼叫端（BattleScreen）如果剛用 setState 換了隊伍，同一個事件處理器裡
   * 呼叫 restart() 會抓到「這次 render 之前」的舊 allyIds（React state 更新非同步），
   * restartWith() 直接把新名單傳進來就不會有這個 stale closure 問題。
   */
  const restartWith = useCallback(
    (newAllyIds: string[], newEnemyIds?: string[], firstSide?: Side, extras?: BattleExtras) => {
      genRef.current = createGenerator(
        newAllyIds,
        newEnemyIds ?? enemyIds,
        rng,
        firstSide,
        extras ?? { boss, fragmentEquipped, enemyAtkMultiplier },
      )
      setResult(null)
      setTurn(0)
      setCombatants([])
    },
    [enemyIds, rng, boss, fragmentEquipped, enemyAtkMultiplier],
  )

  /** 跑 generator 一步；回傳這一步 yield 的內容，或（done）回傳最終 BattleResult。 */
  const advance = useCallback((choice?: PlayerChoice): BattleStepEvent | { kind: 'battle-end'; result: BattleResult } => {
    const gen = genRef.current
    if (!gen) return { kind: 'battle-end', result: { winner: 'draw', turns: 0, reason: 'wipe', allyHpPct: 0, enemyHpPct: 0, events: [], effectHits: {} } }
    const r = gen.next(choice ?? undefined)
    if (r.done) {
      setResult(r.value)
      return { kind: 'battle-end', result: r.value }
    }
    setCombatants(r.value.combatants.map(cloneCombatant))
    if ('turn' in r.value) setTurn(r.value.turn)
    return r.value
  }, [])

  return { combatants, turn, result, ready: true, advance, restart, restartWith }
}

export type UseInteractiveBattleReturn = ReturnType<typeof useInteractiveBattle>
