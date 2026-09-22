// 被動型聖物（規格書 5：星核君臨碎片）。通關「永恆的聖域」取得，之後每場戰鬥自動裝備、
// 不需要任何按鈕；持有狀態存 localStorage（只是玩家個人進度，讀寫都包 try/catch，
// 私密視窗／被封鎖時退化成「沒有碎片」，不影響戰鬥本身）。
export const FRAGMENT_STELLAR_SOVEREIGNTY = {
  id: 'fragment_of_stellar_sovereignty',
  name: '星核君臨碎片',
  nameEn: 'Fragment of Stellar Sovereignty',
  type: 'passive_relic',
  perBattle: 1,
  description: '我方第一位騎士陣亡時，永恆投影降臨，使其以 50% HP 重新參戰（每場戰鬥限一次）。',
} as const

const STORAGE_KEY = 'stellarcore-rift.relic.fragment_of_stellar_sovereignty'

export function hasStellarFragment(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** 回傳這次是不是「第一次取得」（已經有了就 false，結算畫面據此決定顯示「獲得」或「已持有」）。 */
export function grantStellarFragment(): boolean {
  if (hasStellarFragment()) return false
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
    return true
  } catch {
    return false
  }
}
