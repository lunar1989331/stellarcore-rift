// 效果實作狀態登記表
// battle.ts 的 applyEffect() 會查這裡，決定「照做」還是「印一次警告後跳過」。
// Mina《MINA_ANSWERS_v2.md》Q13 把大部分原本待定的效果都給了具體答案，已從 stub 移出、
// 實作在 engine/battle.ts；這裡只留下真正還需要引擎沒有的系統（隱藏資訊博弈 AI、位移座標、
// 坐騎主動連動）的項目。

/**
 * 尚未實作的效果類型 —— 需要引擎目前沒有的概念，跑到時當 no-op，只在 DEV 印一次警告。
 */
export const STUBBED_EFFECTS: Record<string, string> = {
  // Q13：blockFlight 目前沒有任何飛行坐騎已上場（見 data/mounts.ts 待補的 6 隻），
  // 對應的 suppressFlight 機制已寫好但無從觀察效果，先不當 stub（不會被跑到）。
  priorityAction: '坐騎「優先行動」連動：mounts.ts 目前的坐騎不獨立行動，沒有對應語意（見 CLAUDE.md Q16）',
  dmgBoostVsAttackerOfMount: '坐騎連動：同上，見 CLAUDE.md Q16',
  eachHitIndependent: '已是 multiHit 預設行為（逐段判定迴避），標記用，不需要額外處理',
  trackMark: '標記已套用，但 blockStealth / blockSwap 沒有對應的潛行 / 換位系統',
}

/**
 * 有實作、但語意是 Claude Code 推定的效果 —— 一併列出讓 Mina 覆核。
 */
export const INTERPRETED_EFFECTS: Record<string, string> = {
  immuneFactionWeakness: '解讀為：我方受到的屬性剋制倍率上限 = 1.0（不吃 +35%）',
  dualAttrBoost: '解讀為：全隊 atkBoost value；隊上有銀翼時 value ×bonusIfSilverWing',
  toggle: '解讀為：固定進入 modes[0]（滿月模式 atkBoost）',
  gravityBind: '解讀為：spdToZero → 目標無法行動（等同 skip，非位移類，不受 immuneToDisplace 影響）',
  lockSkillTypes: '解讀為：期間壓制目標的 evade 狀態',
  cdExtend: '解讀為：目標當前所有冷卻 +value 回合',
  markHighestThreat: '解讀為：標記敵方 atk 最高者（可用 excludeId 排除特定 id），施術者對其傷害 +atkBonus',
  markLowestHp: '解讀為：標記敵方 HP% 最低者，施術者對其傷害 +value（selena 月光鎖定）',
  numericAdvantage: '解讀為：我方存活數 > 敵方存活數時，自身攻擊 +value（mordres 征服者氣場）',
  teamAtkDebuff: '解讀為：敵方全體攻擊 -enemyValue，我方全體防禦 +allyDefBoost（mordres 征服者的秩序）',
  berserk: '解讀為：HP 低於門檻時攻速 ×spdMultiplier、冷卻重置，僅觸發一次（ignis 業火不滅）',
  critBoost: '簡易暴擊：命中時 roll，暴擊 ×1.5',
  expose: 'Q13 裁定：單機版純資訊展示，只掛一個「已曝光」cosmetic 狀態，不影響 AI 行動',
  exposeNextSkills: '同上',
  randomize: 'Q13 裁定：套用 randomized 狀態，讓 src 之後的技能傷害／DoT 額外 ±variance 浮動',
  chargeGauge: 'Q13 裁定：gaugeValue = 累積承傷/maxHp，chargeRate 每次受擊 +=，滿 triggerAt 觸發 onTrigger 並歸零',
  gaugeCharge: 'holka 爆炎翼衝：與 chargeGauge 共用同一顆量表，直接手動充能',
  stunSoft: 'Q13 裁定：knockback → 跳過下一回合（等同 skip），屬「位移」類會被 immuneToDisplace 擋下',
  immuneToDisplace: 'Q13 裁定：擋下 stun / stunSoft，不擋 freeze / airborne / gravityBind / chill',
  suppressFlight: 'Q13 裁定：blockFlight 壓制敵方飛行坐騎的可打後排特權（目前無飛行坐騎已上場，暫時觀察不到效果）',
  conditionalEvade: 'Q13 判讀③：aekron 暗月形態，darkField 條件成立才套用（見 battle.ts 的 isDarkField）',
}

const warned = new Set<string>()

export function noteStub(effectType: string): void {
  if (!import.meta.env?.DEV) return
  if (warned.has(effectType)) return
  warned.add(effectType)
  const reason = STUBBED_EFFECTS[effectType] ?? '未知'
  console.warn(`[effects] "${effectType}" 尚未實作（${reason}）— 當 no-op`)
}

export function isStub(effectType: string): boolean {
  return effectType in STUBBED_EFFECTS
}
