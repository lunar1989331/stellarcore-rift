// 騎士插圖解析器
// 用 Vite 的 import.meta.glob 把 /assets 下所有 PNG 收集成「檔名 -> URL」對照表。
// knights.ts 內的 image 欄位維持中文原始檔名（見 CLAUDE.md 原則），
// 由這裡負責轉成打包後的實際 URL。

const modules = import.meta.glob<string>('./*.png', {
  eager: true,
  import: 'default',
  query: '?url',
})

const byFileName: Record<string, string> = {}
for (const path in modules) {
  const fileName = path.replace(/^\.\//, '')
  byFileName[fileName] = modules[path]
}

/** 依中文檔名取得插圖 URL；找不到時回傳 undefined 並在 console 警告。 */
export function resolveKnightImage(fileName: string): string | undefined {
  const url = byFileName[fileName]
  if (!url && import.meta.env.DEV) {
    console.warn(`[knightImages] 找不到插圖檔案：${fileName}`)
  }
  return url
}

export const knightImageFileNames = Object.keys(byFileName)
