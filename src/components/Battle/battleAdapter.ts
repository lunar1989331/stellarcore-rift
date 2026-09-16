// 真引擎資料 → 戰鬥畫面 UI 的轉接層。
// UnitCard／ActionBar／SkillEffectOverlay 這些元件本身不變，只是現在餵給它們的
// BattleUnitSlot／浮動數字，來源從 battleDemoData.ts 的假陣列換成 engine/battle.ts
// 真正跑出來的 Combatant／BattleEvent。
import { effectsOf, type Skill } from '../../data/skills'
import type { CoreAttr } from '../../data/types'
import type { BattleEvent, Combatant } from '../../engine/battle'
import type { BattleUnitSlot } from './battleDemoData'
import type { FloatingKind, StatusKey } from './battleTheme'
import type { HitElement } from './hitParticles'

/**
 * 項目 H：攻擊者星核屬性 → 命中粒子特效的分類。遊戲的六大屬性（holy/lava/frost/thunder/
 * abyss/void）跟 Mina 給的粒子設定檔名字不是逐字對應（她用視覺化的英文詞彙如 molten/ice/
 * radiant/eclipse），這裡手動對應；中性/融合系（wind／ocean／earth／fusion，Mina Q2 加的
 * 三個中性屬性 + 融合型）沒有對應到六大屬性循環相剋，粒子上歸類成 neutral。
 */
const ATTR_TO_HIT_ELEMENT: Record<CoreAttr, HitElement> = {
  holy: 'radiant',
  lava: 'molten',
  frost: 'ice',
  thunder: 'thunder',
  abyss: 'eclipse',
  void: 'void',
  wind: 'neutral',
  ocean: 'neutral',
  earth: 'neutral',
  fusion: 'neutral',
}

/**
 * 狀態 → §5-3 八種圖示的對應。引擎的狀態種類（15 種）比示意圖規格的圖示多，
 * 沒有直接對應的（evade／critBoost／empower／exposed／randomized／invincible／
 * atkBoost／defBoost／thorns／focusMark）先不顯示圖示——不影響數值運作，只是卡片上看不到。
 */
function statusIcons(c: Combatant): StatusKey[] {
  const keys = new Set<StatusKey>()
  for (const s of c.statuses) {
    if (s.turnsLeft <= 0) continue
    switch (s.kind) {
      case 'dot':
        keys.add('burn')
        break
      case 'skip':
        keys.add('frost')
        break
      case 'skillLock':
        keys.add('lock')
        break
      case 'spdBoost':
        keys.add(s.value >= 0 ? 'haste' : 'slow')
        break
      case 'shield':
        keys.add('shield')
        break
      case 'curse':
        keys.add('corrode')
        break
      case 'starcoreBoost':
        if (s.value < 0) keys.add('corrode')
        break
      default:
        break
    }
  }
  return [...keys]
}

/**
 * §5-1「★ 星核力：X」欄位借來即時顯示目前 SP（0–maxSp）——比放 Knight.starcore 的原始數值
 * （60–99，卡片上放不下也沒什麼互動意義）或憑空編數字更貼近「這張卡現在能做什麼」。
 */
export function toBattleUnitSlot(c: Combatant): BattleUnitSlot {
  return {
    knightId: c.knight.id,
    uid: c.uid,
    alive: c.alive,
    row: c.row,
    hpPct: c.alive ? Math.max(0, c.hp / c.maxHp) : 0,
    starCoreLevel: c.sp,
    spCap: c.spCap,
    statuses: statusIcons(c),
    isMounted: c.mountAlive,
  }
}

/**
 * 玩家反饋規格 v1.0 項目 C（指定打擊目標）：這個技能是不是「單體技能」，需要玩家先點敵方
 * 卡片指定目標才能發動——引擎（need-action 的 PlayerChoice.targetUid）早就支援指定目標並會
 * 自動驗證合法性（不合法就退回 pickTarget 自動選，見 engine/battle.ts），這裡純粹是 UI 判斷
 * 「要不要先跳出瞄準模式」，沒有另外加引擎邏輯。
 *
 * 判斷依據：
 * - aoe／passive：一律不用選，直接發動（全體技能／被動不能手動觸發）。
 * - attack：一定是打單一敵方目標（含普通攻擊）。
 * - multiHit：只有 singleTarget（集中打同一人）才需要選；分散打不同目標的每一擊都是引擎自己
 *   pickTarget 隨機選，玩家選了也用不上。
 * - buff／debuff／heal／special：看 skill.effect（可能是陣列）裡有沒有 target 是 'enemy'／
 *   'oneEnemy' 的——這類效果套用時是拿「玩家選的那個」當目標（resolveTargets 的 primary），
 *   沒選就會落空打不到人；其餘（self／allAllies／oneAlly 這種引擎自動挑最低血隊友…）
 *   不需要玩家選，選了引擎也不會用。
 */
export function needsEnemyTarget(skill: Skill): boolean {
  if (skill.type === 'aoe' || skill.type === 'passive') return false
  if (skill.type === 'attack') return true
  if (skill.type === 'multiHit') return !!skill.singleTarget
  return effectsOf(skill).some((e) => e.target === 'enemy' || e.target === 'oneEnemy')
}

export interface PlannedHit {
  targetId: string
  kind: FloatingKind
  value: number
  /** 項目 H：這一擊要噴什麼顏色的命中粒子——沒有值（例如 DoT 結算，事件本來就沒有
   * sourceUid 可以查是誰打的）就不噴粒子，見 BattleScreen.tsx 的呼叫端判斷。 */
  attrElement?: HitElement
}

export interface AnimationPlan {
  actorUid?: string
  /** 問題⑤：戰場背景要不要切成技能版（目前只有虛空裂切有專屬背景），需要知道原始 skillId
   * 而不只是顯示用的 skillName——mount-fuse 之類的合成 id 不會混進來，直接讀 BattleEvent.meta。 */
  skillId?: string
  skillName: string
  slashVariant: 'x' | 'burst'
  hits: PlannedHit[]
}

/** 把一步（一個單位的行動，或回合首尾的被動/DoT 結算）的 BattleEvent[] 轉成播放用的計畫。 */
export function planAnimation(events: BattleEvent[], combatants: readonly Combatant[]): AnimationPlan {
  const byUid = (uid?: string) => combatants.find((c) => c.uid === uid)
  const actionEvt = events.find((e) => e.type === 'action')
  const skipEvt = events.find((e) => e.type === 'skip')

  let skillName = ''
  let slashVariant: 'x' | 'burst' = 'burst'
  const actorUid = actionEvt?.sourceUid ?? skipEvt?.sourceUid
  const skillId = actionEvt?.meta?.skillId as string | undefined

  if (actionEvt) {
    const actor = byUid(actionEvt.sourceUid)
    if (skillId === 'mount-fuse') {
      skillName = `坐騎合體・${actor?.mount?.name ?? ''}`
    } else {
      const skill = actor?.skills.find((s) => s.id === skillId) ?? actor?.passives.find((s) => s.id === skillId)
      skillName = skill?.name ?? actionEvt.message
    }
    // 虛空裂切專用的 X 形特效（§11-1 step4）；其餘技能用通用光爆特效。
    slashVariant = skillId === 'void-slash' ? 'x' : 'burst'
  } else if (skipEvt) {
    skillName = '無法行動'
  }

  const critTargets = new Set(events.filter((e) => e.type === 'crit').map((e) => e.targetUid))
  const hits: PlannedHit[] = []
  for (const e of events) {
    if (!e.targetUid || !e.amount || e.amount <= 0) continue
    if (e.type === 'damage' || e.type === 'dot' || e.type === 'counter') {
      // DoT 結算的 log 沒有 sourceUid（回合尾統一結算，不是某個攻擊者當下打的），
      // 查不到攻擊者屬性就不給 attrElement——BattleScreen 那邊看到 undefined 就不噴粒子，
      // 也符合直覺：持續傷害每回合自動扣血，不是一次新的「命中」動作。
      const attacker = e.sourceUid ? byUid(e.sourceUid) : undefined
      hits.push({
        targetId: e.targetUid,
        kind: critTargets.has(e.targetUid) ? 'crit' : 'damage',
        value: e.amount,
        attrElement: attacker ? ATTR_TO_HIT_ELEMENT[attacker.knight.coreAttr] : undefined,
      })
    } else if (e.type === 'heal' || e.type === 'revive') {
      hits.push({ targetId: e.targetUid, kind: 'heal', value: e.amount })
    }
  }

  return { actorUid, skillId, skillName, slashVariant, hits }
}
