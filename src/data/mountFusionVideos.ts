// 坐騎合體登場動畫對應表（2026-10-03）：玩家按下坐騎合體按鈕、合體發動時，如果這隻坐騎有
// 影片就全螢幕播放一次，播完才結算合體效果（沿用 playCutIn 的「動畫結束後才結算」原則）。
// key 是坐騎 id（data/mounts.ts 的 Mount.id），結構比照 components/Battle/skillCutInVideos.ts；
// 沒列在這裡的坐騎＝沒有影片，呼叫端看到 null 就直接走原本的合體流程，不報錯。之後其餘坐騎
// 的影片補上同一張表即可。
//
// 影片放在 public/mount-fusion-animations/（跟技能 cut-in 的 skill-animations 分開管理，檔名用
// 坐騎 id，避免全形引號之類的字元在 GitHub Pages 網址編碼出問題）。路徑前綴用
// import.meta.env.BASE_URL，理由同 skillCutInVideos.ts：vite base 為 '/stellarcore-rift/'。
const VIDEO_BASE = `${import.meta.env.BASE_URL}mount-fusion-animations/`

export const MOUNT_FUSION_VIDEO_MAP: Record<string, string> = {
  // 艾克隆·蝕月（ekron）× 蝕月虛空獸「冥翼」→ 合體共鳴「冥月蝕界」
  mingyi: `${VIDEO_BASE}mingyi.mp4`,
}

export function getMountFusionVideo(mountId: string): string | null {
  return MOUNT_FUSION_VIDEO_MAP[mountId] ?? null
}
