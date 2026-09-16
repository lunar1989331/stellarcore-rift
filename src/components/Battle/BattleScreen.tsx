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
import { getKnight } from '../../data/knights'
import type { Skill } from '../../data/skills'
import type { BattleResult, BattleStepEvent, Combatant, PlayerActionRequest, PlayerChoice } from '../../engine/battle'
import { ActionBar } from './ActionBar'
import { needsEnemyTarget, planAnimation, toBattleUnitSlot, type PlannedHit } from './battleAdapter'
import { ALLY_IDS, CHAOS_BANNER, GUARDIAN_BANNER, LEVEL_NAME, LEVEL_NAME_EN, generateEnemyIds } from './battleDemoData'
import { ATTR_COLORS } from './battleTheme'
import { BattleField } from './BattleField'
import { FactionBanner } from './FactionBanner'
import type { FloatingHit } from './FloatingNumber'
import { spawnHitParticles } from './hitParticles'
import { SkillEffectOverlay } from './SkillEffectOverlay'
import { TeamSelect } from './TeamSelect'
import { TurnPhaseBanner } from './TurnPhaseBanner'
import { useInteractiveBattle } from './useInteractiveBattle'
import styles from './BattleScreen.module.css'
import { TopBar, type TurnPhase } from './TopBar'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Phase C 預留接口（項目 I，PLAYER_FEEDBACK_SPEC_v1.0——本次明確不實裝，Mina 只要求 stub）：
 * 技能①②發動前播放的專屬 cut-in 動畫（WebM／Sprite Sheet）。skillIndex 對應 ActionBar 顯示的
 * 技能①／②，算法跟 ActionBar.tsx 的 `activeSkills[0]/[1]`（actor.skills 扣掉 normal 之後的
 * 第 1、2 個）一致，呼叫端見下面 playStep()。目前沒有素材，永遠立刻 resolve，不阻塞流程。
 */
async function playCutIn(_knightId: string, _skillIndex: 1 | 2): Promise<void> {
  // TODO Phase C：檢查該騎士有沒有 cut-in 素材，有的話用 Overlay 播放並等待播完。
  return Promise.resolve()
}

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

export function BattleScreen() {
  // 問題②：開戰前先選陣容；team===null 代表還沒選完，畫面顯示 TeamSelect 而不是戰場
  // （見下方 return 前的 early return）。team 非 null 時才是玩家真正選定的 3v3 名冊。
  const [team, setTeam] = useState<string[] | null>(null)
  // 項目 E／敵我識別規格書項目 A：敵方陣容隨機化，且跟玩家隊伍陣營對立——lazy initializer
  // 只在第一次 mount 算一次（此時 team 還是 null，用預設的 ALLY_IDS 當作「玩家隊伍」算對立
  // 陣營），之後每次真正開戰（handleTeamConfirm）都會呼叫 generateEnemyIds() 重新抽一次並
  // 蓋掉這個 state，見下方。
  const [enemyIds, setEnemyIds] = useState<string[]>(() => generateEnemyIds(ALLY_IDS, 3))

  const { combatants, turn, ready, advance, restartWith } = useInteractiveBattle({
    allyIds: team ?? ALLY_IDS,
    enemyIds,
  })

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
  // 項目 D：戰鬥結束（battle-end）時 useInteractiveBattle 的 result 會立刻設好，但玩家還沒
  // 看到最後一擊的 KO 演出——真正要顯示的結算橫幅改看這個延遲過的 state（見下面 pump() 的
  // battle-end 分支：先 sleep(800) 讓玩家看清楚戰場殘局，才把 revealedResult 設出去）。
  const [revealedResult, setRevealedResult] = useState<BattleResult | null>(null)
  const [busy, setBusy] = useState(true)
  const [runId, setRunId] = useState(0)
  const hitIdRef = useRef(0)
  const pumpedRunIdRef = useRef(-1)

  const spawnHit = useCallback((planned: PlannedHit) => {
    const id = ++hitIdRef.current
    const hit: FloatingHit = { id, targetId: planned.targetId, kind: planned.kind, value: planned.value }
    setHits((prev) => [...prev, hit])
    window.setTimeout(() => setHits((prev) => prev.filter((h) => h.id !== id)), 1300)
  }, [])

  // 播完一步（一個單位的行動，或回合首尾的被動/DoT 結算）的動畫，對應 §11-1 全流程。
  const playStep = useCallback(
    async (step: Extract<BattleStepEvent, { kind: 'turn-start' | 'unit-acted' | 'turn-end' }>) => {
      const plan = planAnimation(step.events, step.combatants)
      if (!plan.skillName && plan.hits.length === 0) {
        setDisplayed(step.combatants as Combatant[])
        return
      }
      if (plan.actorUid) setActiveUnitId(plan.actorUid)
      await sleep(200)
      if (plan.skillName) {
        // 項目 I 預留接口：只有真正的技能①②（不是普通攻擊／坐騎合體／被動）才呼叫，
        // skillIndex 算法對齊 ActionBar 的 activeSkills[0]/[1]（見上面 playCutIn 註解）。
        const cutInActor = step.combatants.find((c) => c.uid === plan.actorUid)
        const activeIdx = cutInActor?.skills.filter((s) => s.id !== 'normal').findIndex((s) => s.id === plan.skillId)
        if (plan.actorUid && (activeIdx === 0 || activeIdx === 1)) {
          await playCutIn(plan.actorUid, (activeIdx + 1) as 1 | 2)
        }
        setShowDarken(true)
        // 問題⑤：虛空裂切施放期間戰場背景切成技能版，技能演出結束（setShowDarken(false)）
        // 後恢復原圖——見 BattleField 的 sceneVariant prop。
        if (plan.skillId === 'void-slash') setSceneVariant('void-slash')
        await sleep(180)
        setOverlayName(plan.skillName)
        await sleep(260)
        setShowSlash(true)
        setSlashVariant(plan.slashVariant)
        await sleep(380)
        setShowSlash(false)
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
      setDisplayed(step.combatants as Combatant[])
      if (plan.skillName) {
        setShowDarken(false)
        setSceneVariant('default')
        await sleep(220)
      }
      setActiveUnitId(null)
    },
    [spawnHit],
  )

  const pump = useCallback(
    async (choice?: PlayerChoice) => {
      setBusy(true)
      // 項目 C：一旦開始跑（不管是玩家剛送出選擇、還是battle開場的第一次自動 pump），就先把
      // pendingRequest 清掉——如果不清，這裡面接下來播放的一連串自動步驟（可能包含敵方回合）
      // 畫面上仍會讀到「上一個 need-action」的 pendingRequest，phase 會一直停在 'player' 不會
      // 跳到 'enemy'，直到整個 pump() 跑完才瞬間變化，玩家完全看不到「對方回合」的過程。
      // 清成 null 讓 phase 立刻反映「現在沒有在等玩家輸入」，跑完才視情況換回新的 need-action。
      setPendingRequest(null)
      let step = advance(choice)
      while (step.kind !== 'need-action' && step.kind !== 'battle-end') {
        await playStep(step)
        step = advance()
      }
      if (step.kind === 'need-action') {
        setPendingRequest(step.request)
        setActiveUnitId(step.request.actorUid)
      } else {
        // 項目 D：戰鬥結束——先讓玩家看 0.8 秒的戰場殘局（KO 灰階／震動已經在最後一擊的
        // playStep 裡演完了），再把 revealedResult 設出去彈出結算橫幅，不要一結束就立刻跳出來。
        await sleep(800)
        setPendingRequest(null)
        setActiveUnitId(null)
        setRevealedResult(step.result)
      }
      setBusy(false)
    },
    [advance, playStep],
  )

  // pumpedRunIdRef 擋掉 StrictMode 開發模式下 effect 的 mount→cleanup→mount 雙跑，
  // 同一個 runId 只會真正 pump() 一次；runId 换了（重新開始）才會再跑一次。
  // 多加 !team 擋住：team 還沒選定（TeamSelect 畫面）時不能開始跑戰鬥。
  useEffect(() => {
    if (!ready || !team || pumpedRunIdRef.current === runId) return
    pumpedRunIdRef.current = runId
    pump()
  }, [ready, team, runId, pump])

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
  const phase: TurnPhase = pendingRequest ? 'player' : 'enemy'
  const [turnBanner, setTurnBanner] = useState<TurnPhase | null>(null)
  const prevPhaseRef = useRef(phase)
  useEffect(() => {
    if (!team) return // 還沒開戰（TeamSelect 畫面）不用彈橫幅
    if (prevPhaseRef.current === phase) return
    prevPhaseRef.current = phase
    setTurnBanner(phase)
    const t = window.setTimeout(() => setTurnBanner(null), 1300)
    return () => window.clearTimeout(t)
  }, [phase, team])

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
    setTurnBanner(null)
    prevPhaseRef.current = 'enemy'
  }, [])

  // 兩個既有的「重新開始」入口（頂部列的齒輪旁按鈕、戰鬥結束橫幅的「再戰一場」）
  // 現在都回到 TeamSelect 重選陣容，而不是直接用同一組隊伍再打一場——封測時比較方便
  // 換不同組合測試（見 CLAUDE.md Session 13）。
  const handleRestart = useCallback(() => {
    resetBattleUiState()
    setTeam(null)
  }, [resetBattleUiState])

  const handleTeamConfirm = useCallback(
    (ids: string[]) => {
      resetBattleUiState()
      // 項目 E-④／敵我識別規格書項目 A：每次真正開戰（含「重新開始」→ 重選陣容 → 這裡）
      // 都重新抽一次敵方陣容，且跟玩家這次選的陣營對立（守護 vs 渾沌互抽對方）——不留用
      // 上一場的組合。restartWith 的第二個參數本來就支援直接帶新的 enemyIds 重建 generator，
      // 不用另外等 state 更新完才讀到新值（跟 allyIds 用同一個 closure-safe 寫法，見
      // useInteractiveBattle.ts 的註解）。
      const newEnemyIds = generateEnemyIds(ids, 3)
      setEnemyIds(newEnemyIds)
      restartWith(ids, newEnemyIds)
      setTeam(ids)
      setRunId((n) => n + 1)
    },
    [resetBattleUiState, restartWith],
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
  const handleCastSkill = useCallback(
    (skill: Skill) => {
      if (!isPlayersTurn) return
      if (needsEnemyTarget(skill)) {
        setTargetingSkill(skill)
        return
      }
      submitChoice(skill.id)
    },
    [isPlayersTurn, submitChoice],
  )

  const handleNormalAttack = useCallback(() => {
    if (!isPlayersTurn || !normalSkill) return
    if (needsEnemyTarget(normalSkill)) {
      setTargetingSkill(normalSkill)
      return
    }
    submitChoice(normalSkill.id)
  }, [isPlayersTurn, normalSkill, submitChoice])

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
    return <TeamSelect onConfirm={handleTeamConfirm} />
  }

  return (
    <div className={styles.root}>
      <div className={styles.topBarWrap}>
        <TopBar levelName={LEVEL_NAME} levelNameEn={LEVEL_NAME_EN} turn={turn} phase={phase} onRestart={handleRestart} />
      </div>

      <div className={styles.stage}>
        <FactionBanner
          side="guardian"
          title={GUARDIAN_BANNER.title}
          lines={GUARDIAN_BANNER.lines}
          sceneLabelEn={GUARDIAN_BANNER.sceneLabelEn}
          sceneName={GUARDIAN_BANNER.sceneName}
          sceneSubtitle={GUARDIAN_BANNER.sceneSubtitle}
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
        />

        <TurnPhaseBanner phase={turnBanner} />

        <SkillEffectOverlay
          skillName={overlayName}
          showDarken={showDarken}
          showSlash={showSlash}
          slashVariant={slashVariant}
        />

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
