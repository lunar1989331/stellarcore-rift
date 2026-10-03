// 坐騎合體後的「騎乘版」立繪對應表：戰鬥畫面的騎士卡片（UnitCard）在 isMounted 時淡入換圖，
// 戰鬥結束／重新開戰（isMounted 回到 false）自然恢復原圖。圖鑑與選角畫面不讀這張表，維持單人立繪。
// key 是騎士 id（data/knights.ts 的 Knight.id）；沒登錄的騎士一律維持原立繪、不報錯。
// 圖檔放在 public/mounted-portraits/（WebP），路徑用 BASE_URL 組合，理由同 mountFusionVideos.ts。
// objectPosition：橫式卡片只露出直式圖的一小塊，這個值決定裁切焦點（頭盔＋光環＋上半身）。
const BASE = `${import.meta.env.BASE_URL}mounted-portraits/`

export interface MountedPortrait {
  src: string
  objectPosition: string
  /** 以 objectPosition 為原點的放大倍率，讓橫式小立繪框裡騎士本人（頭盔＋光環）夠大、不被坐騎搶走畫面。 */
  scale?: number
}

export const MOUNTED_PORTRAITS: Record<string, MountedPortrait> = {
  // 艾克隆·蝕月 騎乘 冥翼
  eclron: { src: `${BASE}ekron.webp`, objectPosition: '50% 20%', scale: 1.9 },
}

export function getMountedPortrait(knightId: string): MountedPortrait | null {
  return MOUNTED_PORTRAITS[knightId] ?? null
}
