// Chronicle Mode 存檔系統（localStorage），依《CHRONICLE_MODE_SPEC_v1.0》§11-3/§11-4/§12。
// Phase 1-A：單一存檔、不加密、每次重要行動（選陣營／通關）後立即寫入；version 欄位
// 為未來格式升級預留（§12-2）。
import { useCallback, useState } from 'react'
import { PROLOGUE_DOMAIN_ID } from '../data/chronicleData'

export type ChroniclePhase = 'prologue' | 'faction-select' | 'in-progress' | 'completed'
export type PlayerFaction = 'guardian' | 'chaos'

export interface ChronicleSave {
  version: '1.0'
  playerFaction: PlayerFaction | null
  completedBattles: string[]
  unlockedDomains: string[]
  /** Phase 1-B：已經播過入域對白的域 id——DomainDetail 只在第一次進入時播 prologueDialogue，
   * 之後（例如打完普通戰回到域詳細頁、或重新整理）不會每次都重播一遍。 */
  seenDomainIntros: string[]
  currentDomainId: string | null
  phase: ChroniclePhase
  createdAt: number
  updatedAt: number
}

const SAVE_KEY = 'stellarcore-chronicle-save'

function defaultSave(): ChronicleSave {
  const now = Date.now()
  return {
    version: '1.0',
    playerFaction: null,
    completedBattles: [],
    unlockedDomains: [PROLOGUE_DOMAIN_ID],
    seenDomainIntros: [],
    currentDomainId: null,
    phase: 'prologue',
    createdAt: now,
    updatedAt: now,
  }
}

/** §12-2 版本遷移預留：目前只有 v1.0，沒有舊格式要轉換，先補上這一層讓之後好接。 */
function migrateSave(raw: unknown): ChronicleSave {
  if (!raw || typeof raw !== 'object') return defaultSave()
  const partial = raw as Partial<ChronicleSave>
  if (!partial.version) return { ...defaultSave(), ...partial, version: '1.0' }
  return { ...defaultSave(), ...partial }
}

export function loadChronicleSave(): ChronicleSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return migrateSave(JSON.parse(raw))
  } catch {
    return null
  }
}

function writeSave(save: ChronicleSave): ChronicleSave {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // localStorage 不可用（例如隱私模式）——Phase 1-A 不特別處理，讓遊玩繼續但不保存。
  }
  return save
}

export function createNewChronicleSave(): ChronicleSave {
  return writeSave(defaultSave())
}

export function updateChronicleSave(partial: Partial<ChronicleSave>): ChronicleSave {
  const current = loadChronicleSave() ?? defaultSave()
  return writeSave({ ...current, ...partial, updatedAt: Date.now() })
}

export function clearChronicleSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // 同上，忽略。
  }
}

/** 通關某場戰鬥：記錄 completedBattles；若是域主戰且指定了 unlocksNext，解鎖下一個域。 */
export function recordBattleVictory(battleId: string, unlocksNext?: string): ChronicleSave {
  const current = loadChronicleSave() ?? defaultSave()
  const completedBattles = current.completedBattles.includes(battleId)
    ? current.completedBattles
    : [...current.completedBattles, battleId]
  const unlockedDomains =
    unlocksNext && !current.unlockedDomains.includes(unlocksNext)
      ? [...current.unlockedDomains, unlocksNext]
      : current.unlockedDomains
  return updateChronicleSave({ completedBattles, unlockedDomains, phase: 'in-progress' })
}

/** 陣營選擇確認後呼叫——立即寫入，之後沒有任何返回重選的路徑（§15-2 注意事項 1）。 */
export function commitFaction(faction: PlayerFaction): ChronicleSave {
  return updateChronicleSave({ playerFaction: faction, phase: 'in-progress', currentDomainId: PROLOGUE_DOMAIN_ID })
}

/** 標記某個域的入域對白已經播過——DomainDetail 用來判斷這次進入要不要先播 prologueDialogue。 */
export function markDomainIntroSeen(domainId: string): ChronicleSave {
  const current = loadChronicleSave() ?? defaultSave()
  if (current.seenDomainIntros.includes(domainId)) return current
  return updateChronicleSave({ seenDomainIntros: [...current.seenDomainIntros, domainId] })
}

/** React hook：讀取一次存檔供元件使用；單一存檔、localStorage 是唯一真相來源，
 * 頁面切換靠路由本身重新掛載，不需要跨頁 context。 */
export function useChronicleSave() {
  const [save, setSave] = useState<ChronicleSave | null>(() => loadChronicleSave())
  const refresh = useCallback(() => setSave(loadChronicleSave()), [])
  return { save, refresh }
}
