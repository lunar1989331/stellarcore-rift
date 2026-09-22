// 招式動畫 cut-in 影片對應表（Phase C 指令實裝，2026-09-19）：技能①／②發動時，如果這位
// 騎士的這個技能位置有對應的影片，戰鬥背景會淡出切換成影片全螢幕播放一次（不循環），播完
// 淡回原本靜態場景背景。呼叫端見 BattleScreen.tsx 的 playCutIn()。
//
// 這裡就是主人指令裡說的「skillVideoMap」——21 位騎士全部列出（沿用 data/knights.ts 的
// id），尚無影片的一律 null，之後補新素材只要照同樣格式把對應欄位從 null 改成路徑字串即可，
// 不用動任何播放邏輯。目前 21 位騎士（不含世界級特殊單位「永恆」，見 data/bosses.ts，不在一般
// 3v3 名冊、也不用這份對照表）的技能①全部有素材（2026-09-22 補齊索倫／艾克隆／莫德雷斯／格拉
// 托斯最後 4 位；澤菲爾／艾索為重製版，直接覆蓋同檔名的舊素材），技能②全部是 null；保留 skill2
// 欄位是因為觸發規則本身（技能①「或」技能②都可能觸發）沒有限定只能是技能①，純粹是這批素材
// 目前只涵蓋技能①。
//
// 路徑前綴用 import.meta.env.BASE_URL 而不是寫死 '/skill-animations/'——這個專案的
// vite.config.ts 設定 base:'/stellarcore-rift/'，純字面 '/xxx' 路徑不會被 Vite 轉換，
// 會在瀏覽器解析成網站真正的根目錄（跟 base 前綴無關），直接打到 /skill-animations/xxx.mp4
// 只會 404（StarfieldParticles.tsx 的 SCRIPT_SRC 就是踩了同一個坑，這次順手一起修掉，見那個
// 檔案的修改）。import.meta.env.BASE_URL 由 Vite 在建置/開發時依 base 設定自動代換，
// 兩種環境都會正確解析成 /stellarcore-rift/skill-animations/xxx.mp4。
const VIDEO_BASE = `${import.meta.env.BASE_URL}skill-animations/`

export interface KnightCutInVideos {
  skill1: string | null
  skill2: string | null
}

export const SKILL_VIDEO_MAP: Record<string, KnightCutInVideos> = {
  // ── 獨立騎士 ─────────────────────────────
  'silver-wing': { skill1: `${VIDEO_BASE}虛空裂切.mp4`, skill2: null },
  zephyr: { skill1: `${VIDEO_BASE}秘典封印術.mp4`, skill2: null },
  aiso: { skill1: `${VIDEO_BASE}星核術式解析.mp4`, skill2: null },
  // ── 守護騎士陣營 ─────────────────────────
  osirath: { skill1: `${VIDEO_BASE}星裁天降.mp4`, skill2: null },
  elixia: { skill1: `${VIDEO_BASE}聖裁光柱.mp4`, skill2: null },
  laros: { skill1: `${VIDEO_BASE}日冕衝擊.mp4`, skill2: null },
  aivia: { skill1: `${VIDEO_BASE}翡翠旋風貫穿.mp4`, skill2: null },
  selena: { skill1: `${VIDEO_BASE}月弦星矢.mp4`, skill2: null },
  nautrus: { skill1: `${VIDEO_BASE}深海衝擊波.mp4`, skill2: null },
  frael: { skill1: `${VIDEO_BASE}冰牙裂擊.mp4`, skill2: null },
  greln: { skill1: `${VIDEO_BASE}熔金重錘.mp4`, skill2: null },
  sardin: { skill1: `${VIDEO_BASE}蒼壁絕對防禦.mp4`, skill2: null },
  // ── 渾沌騎士陣營 ─────────────────────────
  solren: { skill1: `${VIDEO_BASE}星滅斬.mp4`, skill2: null },
  magnos: { skill1: `${VIDEO_BASE}終焰血斬.mp4`, skill2: null },
  ignis: { skill1: `${VIDEO_BASE}業火爆裂衝.mp4`, skill2: null },
  eclron: { skill1: `${VIDEO_BASE}蝕月長戟斬.mp4`, skill2: null },
  mordres: { skill1: `${VIDEO_BASE}重力壓制斬.mp4`, skill2: null },
  viel: { skill1: `${VIDEO_BASE}虛空連斬.mp4`, skill2: null },
  holka: { skill1: `${VIDEO_BASE}爆炎翼衝.mp4`, skill2: null },
  seres: { skill1: `${VIDEO_BASE}雷獄電磁牢籠.mp4`, skill2: null },
  gratos: { skill1: `${VIDEO_BASE}隕鐵粉碎.mp4`, skill2: null },
}

/** 找不到這位騎士、或這個技能位置沒有素材，一律回傳 null——呼叫端看到 null 就跳過
 * cut-in、維持原本畫面不變（見主人規格「沒有對應影片的騎士/技能維持原本畫面不變」）。 */
export function getSkillCutInVideo(knightId: string, skillIndex: 1 | 2): string | null {
  const entry = SKILL_VIDEO_MAP[knightId]
  if (!entry) return null
  return skillIndex === 1 ? entry.skill1 : entry.skill2
}
