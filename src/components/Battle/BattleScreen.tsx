// 戰鬥畫面：UI 依 UI_SPEC_v1.0_for_ClaudeCode.md（Part A）實裝，資料與回合邏輯依
// 完整開發規格書 v1.0（Part B）接上 engine/battle.ts 的真實 3v3 回合制模擬——
// 不再是 battleDemoData.ts 的假陣容/假傷害數字。細節、判讀與跟 Part B 不完全一致
// 的地方見 CLAUDE.md Session 8。
//
// 運作方式：useInteractiveBattle() 包住 engine 的 runBattleSteps() generator；
// pump() 反覆呼叫 .advance() 往前跑——AI/敵方回合自動播完每一步的動畫再繼續，
// 直到輪到我方某單位真正需要玩家輸入（need-action）才停下來，把技能列換成那個人的
// 真實技能/SP/冷卻，等玩家點擊後用 submitAction() 把選擇餵回去繼續跑。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ETERNAL_BOSS, ETERNAL_ID } from '../../data/bosses'
import { getKnight } from '../../data/knights'
import { FRAGMENT_STELLAR_SOVEREIGNTY, grantStellarFragment, hasStellarFragment } from '../../data/relics'
import type { Skill } from '../../data/skills'
import type { BattleResult, BattleStepEvent, Combatant, PlayerActionRequest, PlayerChoice, Side } from '../../engine/battle'
import { ActionBar } from './ActionBar'
import { needsEnemyTarget, planAnimation, toBattleUnitSlot, type PlannedHit } from './battleAdapter'
import {
  ALLY_IDS,
  CHAOS_BANNER,
  GUARDIAN_BANNER,
  GUARDIAN_BANNER_SANCTUARY,
  LEVEL_NAME,
  LEVEL_NAME_EN,
  generateEnemyIds,
  resolveTeamBannerFaction,
} from './battleDemoData'
import { ATTR_COLORS } from './battleTheme'
import { BattleField } from './BattleField'
import { FactionBanner } from './FactionBanner'
import type { FloatingHit } from './FloatingNumber'
import { spawnHitParticles } from './hitParticles'
import { getSkillCutInVideo } from './skillCutInVideos'
import { SkillEffectOverlay } from './SkillEffectOverlay'
import { SanctuaryFxOverlay, type SanctuaryFx } from './SanctuaryFxOverlay'
import { TeamSelect } from './TeamSelect'
import { TurnPhaseBanner } from './TurnPhaseBanner'
import { cloneCombatant, useInteractiveBattle } from './useInteractiveBattle'
import { FirstStrikeIntro } from './FirstStrikeIntro'
import styles from './BattleScreen.module.css'
import { TopBar, type TurnPhase } from './TopBar'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const TRIGGER_LABEL: Record<string, string> = {
  always: '常駐',
  battleStart: '開場觸發',
  turnStart: '回合開始',
  turnEnd: '回合結束',
  hpBelow30: 'HP < 30%',
  hpBelow20: 'HP < 20%',
  allyDeath: '隊友陣亡時',
  hpZero: '瀕死時',
  onHit: '命中時',
  onDamageReceived: '受擊時',
  allyHpBelow30: '隊友 HP < 30%',
  enemyUsesSkill: '敵方出技能時',
}

/** 'eternal_sanctuary'＝永恆的聖域（渾沌限定・玩家 3v1 世界級 Boss），規格書 2-3 的 gameMode。 */
export type BattleMode = 'normal' | 'eternal_sanctuary'

/** 從一步事件裡挑出要播放的聖域全螢幕演出（依發生順序：破盾→合體→碎片復活）。 */
function sanctuaryFxOf(events: readonly { meta?: Record<string, unknown> }[]): SanctuaryFx[] {
  const out: SanctuaryFx[] = []
  for (const e of events) {
    if (e.meta?.shieldBreak) out.push('shieldBreak')
    else if (e.meta?.fusion) out.push('fusion')
    else if (e.meta?.fragment) out.push('fragment')
  }
  return out
}
const SANCTUARY_FX_MS: Record<SanctuaryFx, number> = { shieldBreak: 1300, fusion: 2600, fragment: 2000 }

export function BattleScreen({ mode = 'normal' }: { mode?: BattleMode }) {
  const isSanctuary = mode === 'eternal_sanctuary'
  // 問題②：開戰前先選陣容；team===null 代表還沒選完，畫面顯示 TeamSelect 而不是戰場
  // （見下方 return 前的 early return）。team 非 null 時才是玩家真正選定的 3v3 名冊。
  const [team, setTeam] = useState<string[] | null>(null)
  // 攻守回合切換節奏強化規格書（2026-09-19）追加指令：TurnPhaseBanner 陣營平手時要用
  // 「玩家選角時第一個選的騎士」——`team` 本身已經被 TeamSelect 依前/後排重新排過順序
  // （後排那位會被搬到陣列最後一格），不能拿來當「第一個選的」，所以另外存一份純選角
  // 順序（TeamSelect.onConfirm 的第二個參數），只給 resolveTeamBannerFaction() 用。
  const [teamPickOrder, setTeamPickOrder] = useState<string[] | null>(null)
  // 項目 E／敵我識別規格書項目 A：敵方陣容隨機化，且跟玩家隊伍陣營對立——lazy initializer
  // 只在第一次 mount 算一次（此時 team 還是 null，用預設的 ALLY_IDS 當作「玩家隊伍」算對立
  // 陣營），之後每次真正開戰（handleTeamConfirm）都會呼叫 generateEnemyIds() 重新抽一次並
  // 蓋掉這個 state，見下方。
  const [enemyIds, setEnemyIds] = useState<string[]>(() => (isSanctuary ? [ETERNAL_ID] : generateEnemyIds(ALLY_IDS, 3)))

  const { combatants, turn, ready, advance, restartWith } = useInteractiveBattle({
    allyIds: team ?? ALLY_IDS,
    enemyIds,
    boss: isSanctuary ? ETERNAL_BOSS : undefined,
    fragmentEquipped: hasStellarFragment(),
  })
  // 永恆的聖域專用狀態：全螢幕演出（破盾／合體／碎片復活）與通關獎勵。
  const [sanctuaryFx, setSanctuaryFx] = useState<SanctuaryFx | null>(null)
  const [fragmentReward, setFragmentReward] = useState<'new' | 'owned' | null>(null)

  const [displayed, setDisplayed] = useState<Combatant[]>([])
  const [pendingRequest, setPendingRequest] = useState<PlayerActionRequest | null>(null)
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null)
  // 問題①：點擊我方卡片可以「預覽」該騎士的技能列（底部行動列切換顯示），
  // 但只有真正輪到他行動（pendingRequest 指向他）時按鈕才會真的可以按——
  // 見下面 isPlayersTurn 的判斷，跟原本的規則完全不衝突，純粹多一個瀏覽用途。
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  // 項目 C：瞄準模式中的技能——非 null 時，敵方存活單位（依前後排規則過濾）會顯示準星，
  // 點擊即送出 {skillId, targetUid} 給引擎；引擎本來就會驗證目標合法性，見 battleAdapter.ts
  // needsEnemyTarget() 的判斷依據。
  const [targetingSkill, setTargetingSkill] = useState<Skill | null>(null)
  const [overlayName, setOverlayName] = useState<string | null>(null)
  const [showDarken, setShowDarken] = useState(false)
  const [showSlash, setShowSlash] = useState(false)
  const [slashVariant, setSlashVariant] = useState<'x' | 'burst'>('burst')
  // 問題⑤：戰場背景版本——預設用 星環聖殿.png，虛空裂切施放期間切成 星環聖殿：虛空裂切.png。
  const [sceneVariant, setSceneVariant] = useState<'default' | 'void-slash'>('default')
  const [hits, setHits] = useState<FloatingHit[]>([])
  // 攻守回合切換節奏強化規格書（2026-09-19）項目【3】：敵方行動前搖——輪到這個 uid 的敵方
  // 單位行動前，先讓它的卡片邊框閃爍兩次，再暫停一下才真的播放技能/攻擊動畫，讓玩家先看清楚
  // 「輪到哪個敵人了」。null＝目前沒有人在前搖，見 runPhaseTransition() 與 BattleField 的
  // telegraphUnitId prop。
  const [telegraphUnitId, setTelegraphUnitId] = useState<string | null>(null)
  // 攻守回合切換節奏強化規格書項目【2】：橫幅目前要不要顯示、顯示哪一種——由 runPhaseTransition()
  // （下面）在 pump() 的自動播放流程裡用 await sleep() 精準控制掛上/拿掉的時機，不是被動反映
  // pendingRequest 變化的 useEffect（那是舊版做法，見下面 phase 那段的說明）。宣告放在
  // runPhaseTransition 之前，避免它在閉包裡引用到還沒宣告的 setTurnBanner。
  const [turnBanner, setTurnBanner] = useState<TurnPhase | null>(null)
  // 項目 D：戰鬥結束（battle-end）時 useInteractiveBattle 的 result 會立刻設好，但玩家還沒
  // 看到最後一擊的 KO 演出——真正要顯示的結算橫幅改看這個延遲過的 state（見下面 pump() 的
  // battle-end 分支：先 sleep(800) 讓玩家看清楚戰場殘局，才把 revealedResult 設出去）。
  const [revealedResult, setRevealedResult] = useState<BattleResult | null>(null)
  const [busy, setBusy] = useState(true)
  const [runId, setRunId] = useState(0)
  // 先攻決定演出：開戰前 Math.random() < 0.5 抽出先攻方（我方 / 敵方），演出（FirstStrikeIntro）
  // 播完（introDone）才開始 pump()；結果同時傳給引擎的 firstSide，讓第 1 回合先攻方整隊先動。
  const [firstSide, setFirstSide] = useState<Side | null>(null)
  const [introDone, setIntroDone] = useState(false)
  const handleIntroDone = useCallback(() => setIntroDone(true), [])
  const hitIdRef = useRef(0)
  const pumpedRunIdRef = useRef(-1)
  // 招式動畫 cut-in 指令（2026-09-19）：目前正在全螢幕播放的招式動畫影片（見 BattleField 的
  // cutInVideoUrl prop），null＝沒有影片在播、維持原本場景背景。cutInResolveRef 暫存
  // playCutIn() 那個 Promise 的 resolve——影片自然播完（<video onEnded>）之後才呼叫，
  // playStep() 才會接著往下跑技能名稱/暗化/傷害數字那一段，見下面 playCutIn／handleCutInEnded。
  const [cutInVideoUrl, setCutInVideoUrl] = useState<string | null>(null)
  const cutInResolveRef = useRef<(() => void) | null>(null)

  const spawnHit = useCallback((planned: PlannedHit) => {
    const id = ++hitIdRef.current
    const hit: FloatingHit = { id, targetId: planned.targetId, kind: planned.kind, value: planned.value }
    setHits((prev) => [...prev, hit])
    window.setTimeout(() => setHits((prev) => prev.filter((h) => h.id !== id)), 1300)
  }, [])

  /**
   * 招式動畫 cut-in 指令（2026-09-19）：技能①②發動前，如果這位騎士這個技能位置有對應的
   * 影片（skillCutInVideos.ts 的 SKILL_VIDEO_MAP），淡入播放一次、播完淡回原本場景背景，
   * 這段時間 playStep() 的其餘流程（暗化／技能名稱／傷害數字）暫停等待，直到這個 Promise
   * resolve 才繼續——呼應規格書「影片播放期間戰鬥畫面其他元素維持正常顯示」：卡片／技能列
   * 完全不受影響，只有背景層在切換。沒有對應影片（getSkillCutInVideo 回傳 null）時立刻
   * resolve，維持原本畫面不變，等同 Phase C 舊版 stub 的行為。
   */
  const playCutIn = useCallback((knightId: string, skillIndex: 1 | 2): Promise<void> => {
    const videoUrl = getSkillCutInVideo(knightId, skillIndex)
    if (!videoUrl) return Promise.resolve()
    return new Promise<void>((resolve) => {
      cutInResolveRef.current = resolve
      setCutInVideoUrl(videoUrl)
    })
  }, [])

  /** <video onEnded>：影片自然播完（沒設 loop，只會觸發一次）。先把 state 清成 null 讓
   * BattleField 的 AnimatePresence 開始 0.3s 淡出，等這段淡出真正跑完（跟它的 CSS
   * transition duration 對齊）才 resolve playCutIn() 的 Promise——確保「淡回原本場景背景」
   * 這個視覺過程真的走完，才輪到後面的技能演出接手畫面。 */
  const handleCutInEnded = useCallback(() => {
    setCutInVideoUrl(null)
    window.setTimeout(() => {
      cutInResolveRef.current?.()
      cutInResolveRef.current = null
    }, 300)
  }, [])

  /** 永恆的聖域：依事件播放破盾／合體／碎片復活的全螢幕演出，播完才繼續下一步。 */
  const playSanctuaryFx = useCallback(async (events: readonly { meta?: Record<string, unknown> }[]) => {
    for (const fx of sanctuaryFxOf(events)) {
      setSanctuaryFx(fx)
      await sleep(SANCTUARY_FX_MS[fx])
      setSanctuaryFx(null)
      await sleep(350)
    }
  }, [])

  // 播完一步（一個單位的行動，或回合首尾的被動/DoT 結算）的動畫，對應 §11-1 全流程。
  const playStep = useCallback(
    async (step: Extract<BattleStepEvent, { kind: 'turn-start' | 'unit-acted' | 'turn-end' }>) => {
      const plan = planAnimation(step.events, step.combatants)
      if (!plan.skillName && plan.hits.length === 0) {
        setDisplayed(step.combatants.map(cloneCombatant))
        await playSanctuaryFx(step.events)
        return
      }
      if (plan.actorUid) setActiveUnitId(plan.actorUid)
      await sleep(200)
      if (plan.skillName) {
        // 招式動畫 cut-in（2026-09-19 指令）：只有真正的技能①②（不是普通攻擊／坐騎合體／
        // 被動）才呼叫，skillIndex 算法對齊 ActionBar 的 activeSkills[0]/[1]（見上面
        // playCutIn 註解）。【觸發規則】明講「只有玩家方騎士」才觸發——加上
        // cutInActor?.side==='ally' 這個判斷擋掉敵方；沒有這個判斷的話敵方用技能①②
        // 一樣會滿足 activeIdx===0/1，也會嘗試播放（目前敵方沒人有素材所以看不出差異，
        // 但邏輯上必須擋，之後敵方素材補上才不會搞錯規則）。
        // 這裡原本傳的是 plan.actorUid（combatant uid，例如 'ally-silver-wing-0'），
        // 但 SKILL_VIDEO_MAP 是拿騎士 id（'silver-wing'）當 key 查——playCutIn 舊版是
        // 永遠 resolve 的空函式所以這個參數傳錯從來沒有造成問題，這次接上真正的查表邏輯才
        // 順手修正，改傳 cutInActor.knight.id。
        const cutInActor = step.combatants.find((c) => c.uid === plan.actorUid)
        // 玩家的銀翼施放虛空裂切：只播影片，不疊暗化／技能名稱／X 裂縫／背景切換（主人 2026-09-21 指示）；
        // 傷害數字與 HP 動畫照常。敵方使用時維持原本完整演出。
        const videoOnly = plan.skillId === 'void-slash' && cutInActor?.side === 'ally' && cutInActor.knight.id === 'silver-wing'
        const activeIdx = cutInActor?.skills.filter((s) => s.id !== 'normal').findIndex((s) => s.id === plan.skillId)
        if (cutInActor?.side === 'ally' && (activeIdx === 0 || activeIdx === 1)) {
          await playCutIn(cutInActor.knight.id, (activeIdx + 1) as 1 | 2)
        }
        if (!videoOnly) setShowDarken(true)
        // 問題⑤：虛空裂切施放期間戰場背景切成技能版，技能演出結束（setShowDarken(false)）
        // 後恢復原圖——見 BattleField 的 sceneVariant prop。
        if (!videoOnly) {
          if (plan.skillId === 'void-slash') setSceneVariant('void-slash')
          await sleep(180)
          setOverlayName(plan.skillName)
          await sleep(260)
          setShowSlash(true)
          setSlashVariant(plan.slashVariant)
          await sleep(380)
          setShowSlash(false)
        }
      }
      for (const h of plan.hits) {
        // 項目 H：命中瞬間在目標卡片位置噴屬性粒子——DoT 結算沒有 sourceUid 查不到攻擊者
        // 屬性（見 battleAdapter.ts），attrElement 是 undefined 時就不噴，符合直覺
        // （持續傷害不是一次新的「命中」）。
        if (h.attrElement) {
          const targetEl = document.querySelector<HTMLElement>(`[data-combatant-uid="${h.targetId}"]`)
          if (targetEl) spawnHitParticles(targetEl, h.attrElement)
        }
        spawnHit(h)
        // Hit Stop：命中瞬間額外插入的 70ms 定格，疊加在原本的 240ms 節奏間隔「之前」，
        // 不是取代它——下面這行原本就有，兩者不衝突（Mina 的 E/G/H 實裝指令明講）。
        await sleep(70)
        await sleep(240)
      }
      await sleep(plan.skillName ? 420 : 160)
      setOverlayName(null)
      // §11-1 step7：數字飄完才讓 HP 條真的掉下去
      setDisplayed(step.combatants.map(cloneCombatant))
      if (plan.skillName) {
        setShowDarken(false)
        setSceneVariant('default')
        await sleep(220)
      }
      setActiveUnitId(null)
      await playSanctuaryFx(step.events)
    },
    [spawnHit, playCutIn, playSanctuaryFx],
  )

  // 攻守回合切換節奏強化規格書（2026-09-19）：把【1】靜止緩衝、【2】TurnPhaseBanner 過場、
  // 【3】敵方前搖串成一次 await 到底的序列，在 pump() 的自動播放迴圈裡、確定「接下來要行動
  // 的人」跟「剛行動完的人」分屬不同陣營時呼叫——確保緩衝／橫幅／敵方前搖都是先播完才繼續，
  // 不會跟下一步的攻擊動畫疊在一起。這正是主人回報「切換太快、缺乏前置演出」的根因：舊版
  // banner 只是被動反映 pendingRequest 是否為 null 的 useEffect，跟 pump() 的自動播放迴圈
  // 完全脫鉤，banner 彈出來的當下敵方攻擊動畫可能已經在同時播放。
  //
  // nextActorUid：只有 toSide==='enemy' 時才需要——用來讓「即將行動的那個敵人」卡片邊框
  // 閃爍（項目【3】）；toSide==='ally' 這個方向（敵方→玩家）不需要前搖，因為是玩家自己選
  // 動作，不用「猜下一個是誰」。
  const runPhaseTransition = useCallback(async (toSide: Side, nextActorUid?: string) => {
    // 【1】回合結束緩衝：行動結果（傷害數字／HP 條動畫）已經在呼叫端的 playStep() 裡完全
    // 播完，這裡只要單純靜止等待，讓玩家看清楚剛剛發生的事，再開始切換演出。
    await sleep(800)
    // 【2】TurnPhaseBanner：滑入 300ms → 停留 1200ms → 滑出 300ms，三段全部 await，確保
    // 橫幅真正走完整個過場才放行下一步。
    setTurnBanner(toSide === 'ally' ? 'player' : 'enemy')
    await sleep(300)
    await sleep(1200)
    setTurnBanner(null)
    await sleep(300)
    // 【3】敵方行動前搖：邊框閃爍兩次（UnitCard.module.css 的 CSS 動畫本身是 300ms ×2 次
    // ＝600ms）之後再停頓 400ms，才讓下面的迴圈繼續播放這個敵人的技能/攻擊動畫。
    if (toSide === 'enemy' && nextActorUid) {
      setTelegraphUnitId(nextActorUid)
      await sleep(600)
      setTelegraphUnitId(null)
      await sleep(400)
    }
  }, [])

  const pump = useCallback(
    async (choice?: PlayerChoice) => {
      setBusy(true)
      // 項目 C：一旦開始跑（不管是玩家剛送出選擇、還是battle開場的第一次自動 pump），就先把
      // pendingRequest 清掉——如果不清，這裡面接下來播放的一連串自動步驟（可能包含敵方回合）
      // 畫面上仍會讀到「上一個 need-action」的 pendingRequest，phase 會一直停在 'player' 不會
      // 跳到 'enemy'，直到整個 pump() 跑完才瞬間變化，玩家完全看不到「對方回合」的過程。
      // 清成 null 讓 phase 立刻反映「現在沒有在等玩家輸入」，跑完才視情況換回新的 need-action。
      setPendingRequest(null)
      // 追蹤「剛播完的那一步屬於哪一邊」，用來偵測陣營切換的瞬間——choice 有值代表這次
      // pump() 是玩家剛送出的動作，即將播放的第一步一定是玩家自己的行動（lastSide 先設成
      // 'ally'，不會在它前面多播一次過場橫幅）；choice 是 undefined 代表這是開戰時的第一次
      // 自動 pump（或戰鬥重來），還沒有「上一步」可比較，lastSide 留 undefined——這樣遇到的
      // 第一個真正有行動者的 step 只會記錄下它的陣營，不會誤觸發一次橫幅（開場不需要過場）。
      let lastSide: Side | undefined = choice ? 'ally' : undefined
      let step = advance(choice)
      while (step.kind !== 'need-action' && step.kind !== 'battle-end') {
        // `step` 用 const 另存一份（current）——`step` 本身是 let（迴圈裡會被 advance() 重新
        // 賦值），TypeScript 不會讓 let 變數在閉包（.find() 的 callback）裡維持窄化後的型別，
        // 直接用 step.actorUid 會被當成聯集型別（也包含沒有 actorUid 的 turn-start/turn-end）
        // 而報錯；改存進 const 之後，narrowing 在整個區塊（含閉包）都成立。
        const current = step
        const stepActorUid = current.kind === 'unit-acted' ? current.actorUid : undefined
        const stepSide = stepActorUid ? current.combatants.find((c) => c.uid === stepActorUid)?.side : undefined
        if (stepSide && lastSide && stepSide !== lastSide) {
          await runPhaseTransition(stepSide, stepSide === 'enemy' ? stepActorUid : undefined)
        }
        if (stepSide) lastSide = stepSide
        await playStep(current)
        step = advance()
      }
      if (step.kind === 'need-action') {
        // need-action 一定是在等我方某個單位輸入——如果上一個真正行動的是敵方，代表這是一次
        // 敵方→玩家的陣營切換，一樣要走過場（只是不需要【3】的敵方前搖，玩家自己選動作）。
        if (lastSide === 'enemy') {
          await runPhaseTransition('ally')
        }
        setPendingRequest(step.request)
        setActiveUnitId(step.request.actorUid)
      } else {
        // 項目 D：戰鬥結束——先讓玩家看 0.8 秒的戰場殘局（KO 灰階／震動已經在最後一擊的
        // playStep 裡演完了），再把 revealedResult 設出去彈出結算橫幅，不要一結束就立刻跳出來。
        await sleep(800)
        setPendingRequest(null)
        setActiveUnitId(null)
        // 永恆的聖域通關：發放星核君臨碎片（第一次通關才是「獲得」，之後顯示「已持有」）。
        if (isSanctuary && step.result.winner === 'ally') setFragmentReward(grantStellarFragment() ? 'new' : 'owned')
        setRevealedResult(step.result)
      }
      setBusy(false)
    },
    [advance, playStep, runPhaseTransition, isSanctuary],
  )

  // pumpedRunIdRef 擋掉 StrictMode 開發模式下 effect 的 mount→cleanup→mount 雙跑，
  // 同一個 runId 只會真正 pump() 一次；runId 换了（重新開始）才會再跑一次。
  // 多加 !team 擋住：team 還沒選定（TeamSelect 畫面）時不能開始跑戰鬥。
  useEffect(() => {
    if (!ready || !team || !introDone || pumpedRunIdRef.current === runId) return
    pumpedRunIdRef.current = runId
    // 敵方先攻：演出結束後多停 1 秒讓玩家看清楚局面，再開始跑敵方 AI 行動。
    if (firstSide === 'enemy') {
      void sleep(1000).then(() => pump())
    } else {
      pump()
    }
  }, [ready, team, runId, pump, introDone, firstSide])

  // 問題①：預設一律跟著「真正輪到誰行動」走；玩家點別張卡片預覽後，只要下一次真的
  // 換人行動（pendingRequest.actorUid 變了），就自動把預覽切回目前行動者，不會卡住。
  // 用 React 官方認可的「render 期間依 prop 變化調整 state」寫法（而不是 useEffect
  // 裡 setState）—— 少一個 render round-trip，也閃掉 oxlint 的 set-state-in-effect 警告
  // （跟 useInteractiveBattle.ts 惰性建立 generator 的理由一樣，見 CLAUDE.md Session 8）。
  const currentActorUid = pendingRequest?.actorUid
  const [trackedActorUid, setTrackedActorUid] = useState(currentActorUid)
  if (currentActorUid !== trackedActorUid) {
    setTrackedActorUid(currentActorUid)
    setSelectedUnitId(null)
    setTargetingSkill(null)
  }

  // 項目 C：Esc 隨時可以取消瞄準模式。
  useEffect(() => {
    if (!targetingSkill) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTargetingSkill(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [targetingSkill])

  // UI 改善規格書 v2.0 項目 C：引擎沒有真的「我方回合／對方回合」這種整體階段（每回合是
  // 逐一單位照速度值交錯行動），這裡用 pendingRequest 有無來近似——有 = 正在等玩家對某個
  // 我方單位下指令（我方回合），沒有 = pump() 正在自動播放 AI／敵方單位的行動（對方回合）。
  // 見 TopBar.tsx 開頭註解與 CLAUDE.md Session 16 的完整說明。
  // phase 只餵 TopBar／ActionBar 這些「目前是不是在等玩家輸入」的次要指示器——不再驅動
  // TurnPhaseBanner 本身。橫幅的掛上/拿掉時機改由 runPhaseTransition()（上面）在 pump() 的
  // 自動播放流程裡用 await sleep() 精準控制，不再是這裡被動比對 phase 變化的 useEffect
  // （舊版跟 pump() 的自動播放迴圈完全脫鉤，是「切換太快、缺乏前置演出」的根因）。turnBanner
  // 的 state 宣告移到上面（telegraphUnitId 旁邊），避免 runPhaseTransition 在閉包裡引用到
  // 還沒宣告的 setTurnBanner。
  const phase: TurnPhase = pendingRequest ? 'player' : 'enemy'

  // 攻守回合切換節奏強化規格書（2026-09-19）追加指令：TurnPhaseBanner 顏色/文字改依「這一側
  // 隊伍實際的陣營組成」決定（守護/渾沌/獨立多數決，見 battleDemoData.ts 的
  // resolveTeamBannerFaction() 完整規則）——我方用 teamPickOrder（玩家真正的選角順序，
  // team 本身已經被前/後排重排過，見上面 teamPickOrder 的宣告），敵方用 enemyIds（沒有
  // 「玩家選角」這回事，直接用名單的陣列順序當作平手時的「第一個」，跟主人說的「同上邏輯」
  // 一致）。team/enemyIds 還沒備妥時（TeamSelect 畫面）用預設值頂著，反正這時候戰場還沒
  // 顯示，這兩個值不會真的被用到。
  const allyBannerFaction = useMemo(
    () => resolveTeamBannerFaction(teamPickOrder ?? team ?? ALLY_IDS),
    [teamPickOrder, team],
  )
  const enemyBannerFaction = useMemo(() => resolveTeamBannerFaction(enemyIds), [enemyIds])

  const resetBattleUiState = useCallback(() => {
    setDisplayed([])
    setPendingRequest(null)
    setActiveUnitId(null)
    setSelectedUnitId(null)
    setTargetingSkill(null)
    setOverlayName(null)
    setShowDarken(false)
    setShowSlash(false)
    setSceneVariant('default')
    setHits([])
    setRevealedResult(null)
    setFragmentReward(null)
    setSanctuaryFx(null)
    setTurnBanner(null)
    setTelegraphUnitId(null)
    setCutInVideoUrl(null)
    cutInResolveRef.current = null
  }, [])

  // 兩個既有的「重新開始」入口（頂部列的齒輪旁按鈕、戰鬥結束橫幅的「再戰一場」）
  // 現在都回到 TeamSelect 重選陣容，而不是直接用同一組隊伍再打一場——封測時比較方便
  // 換不同組合測試（見 CLAUDE.md Session 13）。
  const handleRestart = useCallback(() => {
    resetBattleUiState()
    setTeam(null)
    setTeamPickOrder(null)
  }, [resetBattleUiState])

  const handleTeamConfirm = useCallback(
    (ids: string[], pickOrderIds: string[]) => {
      resetBattleUiState()
      // 項目 E-④／敵我識別規格書項目 A：每次真正開戰（含「重新開始」→ 重選陣容 → 這裡）
      // 都重新抽一次敵方陣容，且跟玩家這次選的陣營對立（守護 vs 渾沌互抽對方）——不留用
      // 上一場的組合。restartWith 的第二個參數本來就支援直接帶新的 enemyIds 重建 generator，
      // 不用另外等 state 更新完才讀到新值（跟 allyIds 用同一個 closure-safe 寫法，見
      // useInteractiveBattle.ts 的註解）。
      const newEnemyIds = isSanctuary ? [ETERNAL_ID] : generateEnemyIds(ids, 3)
      setEnemyIds(newEnemyIds)
      const fs: Side = Math.random() < 0.5 ? 'ally' : 'enemy'
      setFirstSide(fs)
      setIntroDone(false)
      restartWith(ids, newEnemyIds, fs, {
        boss: isSanctuary ? ETERNAL_BOSS : undefined,
        fragmentEquipped: hasStellarFragment(),
      })
      setTeam(ids)
      setTeamPickOrder(pickOrderIds)
      setRunId((n) => n + 1)
    },
    [resetBattleUiState, restartWith, isSanctuary],
  )

  // 項目 C：瞄準模式中點別張我方卡片沒有意義（不能臨陣換人選目標），直接當成「取消瞄準」；
  // 不在瞄準模式時維持原本的預覽切換行為。
  const handleSelectAlly = useCallback(
    (id: string) => {
      if (targetingSkill) {
        setTargetingSkill(null)
        return
      }
      setSelectedUnitId(id)
    },
    [targetingSkill],
  )

  const allies = displayed.filter((c) => c.side === 'ally')
  const enemies = displayed.filter((c) => c.side === 'enemy')
  const enemyFormation = enemies.map(toBattleUnitSlot)
  const allyFormation = allies.map(toBattleUnitSlot)

  // 問題①：selectedUnitId（點卡片選的）優先於「目前真正行動者」，讓玩家可以點別張卡片
  // 預覽技能列；是否真的能按下去由 isPlayersTurn 決定，跟這裡的顯示邏輯分開。
  // 注意：BattleField 的 onSelect 傳回的是 slot.knightId（騎士 id，如 'elixia'），
  // 不是 combatant.uid（如 'ally-elixia-2'）——一個人的隊伍裡騎士 id 本來就不重複，
  // 直接比 knight.id 就好，不用另外把 uid 傳一輪。
  const focused: Combatant | undefined =
    (selectedUnitId ? allies.find((c) => c.knight.id === selectedUnitId && c.alive) : undefined) ??
    (pendingRequest && combatants.find((c) => c.uid === pendingRequest.actorUid)) ??
    (activeUnitId ? allies.find((c) => c.uid === activeUnitId) : undefined) ??
    allies.find((c) => c.alive) ??
    allies[0]

  const accentColor = focused ? ATTR_COLORS[focused.knight.coreAttr] : '#4fa3ff'
  const activeSkills = focused ? focused.skills.filter((s) => s.id !== 'normal') : []
  const normalSkill = focused?.skills.find((s) => s.id === 'normal')
  const passiveSkill = focused?.passives[0]

  // 項目 B（換人代打，主人 2026-09-12 拍板）：輪到我方某人行動時，engine 的 need-action 請求
  // 會附上這回合還能代打的其他存活隊友名單（pendingRequest.swappable）——玩家點了預覽其中一位
  // 之後，isPlayersTurn 就不再只認 pendingRequest.actorUid 本人，讓那個人也真的按得下技能鍵。
  // 送出時要告訴引擎「這次算誰出手」（見下面 submitChoice 的 actAsUid）。
  const swappableUids = useMemo(
    () => new Set(pendingRequest?.swappable.map((s) => s.uid) ?? []),
    [pendingRequest],
  )
  const isPlayersTurn =
    !!pendingRequest && !!focused && (pendingRequest.actorUid === focused.uid || swappableUids.has(focused.uid))

  const submitChoice = useCallback(
    (skillId: string, targetUid?: string) => {
      if (!isPlayersTurn || !pendingRequest || !focused) return
      const actAsUid = focused.uid !== pendingRequest.actorUid ? focused.uid : undefined
      pump({ skillId, targetUid, actAsUid })
    },
    [isPlayersTurn, pendingRequest, focused, pump],
  )

  // 項目 C：需要指定目標的技能（單體攻擊／單體指向的 debuff…見 needsEnemyTarget）先進瞄準模式，
  // 等玩家點敵方卡片才真的送出；不需要選目標的維持原本「按下去就發動」。
  // 永恆的聖域：場上只有 Boss 一個敵人，選技能後不需要再點一次目標，直接指定它。
  const soleBossUid = isSanctuary ? enemies.find((c) => c.alive && c.boss)?.uid : undefined

  const handleCastSkill = useCallback(
    (skill: Skill) => {
      if (!isPlayersTurn) return
      if (needsEnemyTarget(skill)) {
        if (soleBossUid) submitChoice(skill.id, soleBossUid)
        else setTargetingSkill(skill)
        return
      }
      submitChoice(skill.id)
    },
    [isPlayersTurn, submitChoice, soleBossUid],
  )

  const handleNormalAttack = useCallback(() => {
    if (!isPlayersTurn || !normalSkill) return
    if (needsEnemyTarget(normalSkill)) {
      if (soleBossUid) submitChoice(normalSkill.id, soleBossUid)
      else setTargetingSkill(normalSkill)
      return
    }
    submitChoice(normalSkill.id)
  }, [isPlayersTurn, normalSkill, submitChoice, soleBossUid])

  const handleMountFuse = useCallback(() => {
    if (!isPlayersTurn) return
    submitChoice('mount-fuse')
  }, [isPlayersTurn, submitChoice])

  // 項目 C：瞄準模式中，敵方存活單位依前後排規則決定誰是合法目標（跟 engine pickTarget()
  // 同一套邏輯的簡化版——沒有另外判斷坐騎飛行/嘲諷，選到了引擎自己也會驗證，見
  // battleAdapter.ts needsEnemyTarget() 的說明）；點擊合法目標即送出並離開瞄準模式。
  const targetableEnemyUids = useMemo(() => {
    if (!targetingSkill) return undefined
    const aliveEnemies = enemies.filter((c) => c.alive)
    if (targetingSkill.piercing) return new Set(aliveEnemies.map((c) => c.uid))
    const front = aliveEnemies.filter((c) => c.row === 'front')
    return new Set((front.length ? front : aliveEnemies).map((c) => c.uid))
  }, [targetingSkill, enemies])

  const handleSelectEnemy = useCallback(
    (uid: string) => {
      if (!targetingSkill) return
      submitChoice(targetingSkill.id, uid)
      setTargetingSkill(null)
    },
    [targetingSkill, submitChoice],
  )

  // 問題②：team 還沒選定就顯示選陣容畫面，不進戰場（見上面 team state 與 pump 的 effect gate）。
  if (!team) {
    return (
      <TeamSelect
        onConfirm={handleTeamConfirm}
        lockedFaction={isSanctuary ? 'chaos' : undefined}
        heading={
          isSanctuary
            ? {
                title: '永恆的聖域・出戰陣容',
                subtitle: '渾沌陣營限定・世界級 Boss「星核君主・永恆」——選 3 位出戰（獨立騎士可自由加入），指定 1 位站後排',
              }
            : undefined
        }
      />
    )
  }

  return (
    <div className={styles.root}>
      {firstSide && !introDone && <FirstStrikeIntro key={runId} firstSide={firstSide} onDone={handleIntroDone} />}
      <div className={styles.topBarWrap}>
        <TopBar
          levelName={isSanctuary ? '永恆的聖域' : LEVEL_NAME}
          levelNameEn={isSanctuary ? 'ETERNAL SANCTUARY' : LEVEL_NAME_EN}
          turn={turn}
          phase={phase}
          onRestart={handleRestart}
        />
      </div>

      <div className={styles.stage}>
        <FactionBanner
          side="guardian"
          title={GUARDIAN_BANNER.title}
          lines={GUARDIAN_BANNER.lines}
          sceneLabelEn={(isSanctuary ? GUARDIAN_BANNER_SANCTUARY : GUARDIAN_BANNER).sceneLabelEn}
          sceneName={(isSanctuary ? GUARDIAN_BANNER_SANCTUARY : GUARDIAN_BANNER).sceneName}
          sceneSubtitle={(isSanctuary ? GUARDIAN_BANNER_SANCTUARY : GUARDIAN_BANNER).sceneSubtitle}
        />
        <FactionBanner
          side="chaos"
          title={CHAOS_BANNER.title}
          lines={CHAOS_BANNER.lines}
          sceneName={CHAOS_BANNER.sceneName}
          sceneSubtitle={CHAOS_BANNER.sceneSubtitle}
        />

        <BattleField
          enemyFormation={enemyFormation}
          allyFormation={allyFormation}
          getKnight={getKnight}
          currentUnitId={activeUnitId ?? ''}
          hits={hits}
          castingUnitId={activeUnitId}
          onSelectAlly={handleSelectAlly}
          onSelectEnemy={targetingSkill ? handleSelectEnemy : undefined}
          targetableEnemyUids={targetableEnemyUids}
          sceneVariant={sceneVariant}
          telegraphUnitId={telegraphUnitId}
          cutInVideoUrl={cutInVideoUrl}
          onCutInEnded={handleCutInEnded}
          sceneBase={isSanctuary ? 'temple' : 'ruins'}
          bossCombatant={isSanctuary ? enemies.find((c) => c.boss) : undefined}
        />

        <TurnPhaseBanner
          phase={turnBanner}
          style={turnBanner === 'player' ? allyBannerFaction : turnBanner === 'enemy' ? enemyBannerFaction : null}
        />

        <SkillEffectOverlay
          skillName={overlayName}
          showDarken={showDarken}
          showSlash={showSlash}
          slashVariant={slashVariant}
        />

        <SanctuaryFxOverlay fx={sanctuaryFx} />

        {/* 項目 D：用延遲過的 revealedResult（不是 hook 的 result）決定要不要顯示橫幅，
            讓玩家先看 0.8 秒的戰場殘局／KO 演出，見 pump() 的 battle-end 分支。 */}
        {revealedResult && (
          <div className={styles.resultBanner}>
            <div className={styles.resultTitle}>
              {revealedResult.winner === 'ally' ? '我方勝利' : revealedResult.winner === 'enemy' ? '敵方勝利' : '平手'}
            </div>
            <div className={styles.resultMeta}>
              {revealedResult.reason === 'wipe' ? '殲滅結束' : '回合上限判定'} · 共 {revealedResult.turns} 回合
            </div>
            {fragmentReward && (
              <div className={styles.resultReward} data-testid="fragment-reward">
                <div className={styles.rewardTitle}>
                  {fragmentReward === 'new' ? '獲得聖物：' : '已持有聖物：'}
                  {FRAGMENT_STELLAR_SOVEREIGNTY.name}
                </div>
                <div className={styles.rewardDesc}>{FRAGMENT_STELLAR_SOVEREIGNTY.description}</div>
              </div>
            )}
            <button type="button" className={styles.resultBtn} onClick={handleRestart}>
              ↻ 再戰一場
            </button>
          </div>
        )}
      </div>

      <div className={styles.actionBarWrap}>
        <ActionBar
          skill1={activeSkills[0]}
          skill2={activeSkills[1]}
          passiveSkill={passiveSkill}
          passiveTriggerLabel={passiveSkill ? (TRIGGER_LABEL[passiveSkill.trigger ?? ''] ?? '被動觸發') : '—'}
          cooldowns={focused?.cooldowns ?? {}}
          sp={focused?.sp ?? 0}
          maxSp={focused?.spCap ?? 5}
          isMounted={!!focused?.mountAlive}
          hasMount={!!focused?.mount}
          mountCharge={focused?.mountCharge ?? 0}
          mountFusedOnce={!!focused?.mountFusedOnce}
          mountLabel={focused?.mount?.name ?? '—'}
          busy={busy || !isPlayersTurn || !!revealedResult}
          enemyPhase={phase === 'enemy'}
          accentColor={accentColor}
          onCastSkill={handleCastSkill}
          onNormalAttack={handleNormalAttack}
          onFuse={handleMountFuse}
        />
      </div>
    </div>
  )
}

export default BattleScreen
