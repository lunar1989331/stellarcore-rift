// 星空粒子背景層（§4 場景特色：星光從裂縫滲透）
// 用 particles.js（技術選型 §15）畫細小星點與偶爾飄過的星塵，疊在戰場背景之上、卡片之下。
//
// particles.js 內部用 `arguments.callee` 做深拷貝（一個很舊的寫法），在 ESM 的隱式 strict mode
// 下會直接丟 TypeError（'caller'/'callee' 在嚴格模式禁止存取）。Vite 用 `import 'particles.js'`
// 會把它當模組打包成 strict 程式碼，因此改成把套件檔案原封不動複製到 public/particles.js，
// 用傳統 <script> 標籤載入（非模組、sloppy mode），繞開這個已知的相容性問題。
import { useEffect, useRef, useState } from 'react'
import styles from './StarfieldParticles.module.css'

declare global {
  interface Window {
    particlesJS?: (tagId: string, params: Record<string, unknown>) => void
    pJSDom?: Array<{ pJS?: { canvas?: { el?: HTMLCanvasElement } } }>
  }
}

// 順手修掉一個既有 bug（2026-09-19 排查招式動畫影片路徑時發現）：這個專案的 vite.config.ts
// 設定 base:'/stellarcore-rift/'，寫死 '/particles.js' 不會被 Vite 轉換，瀏覽器會拿它當
// 網站真正的根路徑去要，跟 base 前綴無關，一直是 404（開著的 dev server 從很早的 session
// 就開始默默吃這個錯誤，沒有人注意到——星空粒子背景本來就是裝飾性效果，載入失敗不影響
// 戰鬥功能，才會一直沒被發現）。改用 import.meta.env.BASE_URL 前綴，兩種環境都會正確解析
// 成 /stellarcore-rift/particles.js。
const SCRIPT_SRC = `${import.meta.env.BASE_URL}particles.js`
let scriptLoadPromise: Promise<void> | null = null

function loadParticlesScript(): Promise<void> {
  if (window.particlesJS) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('particles.js failed to load')))
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('particles.js failed to load'))
    document.body.appendChild(script)
  })

  return scriptLoadPromise
}

const CONFIG = {
  particles: {
    number: { value: 90, density: { enable: true, value_area: 900 } },
    color: { value: ['#ffffff', '#cfe0ff', '#ffe9a8'] },
    shape: { type: 'circle' },
    opacity: {
      value: 0.6,
      random: true,
      anim: { enable: true, speed: 0.4, opacity_min: 0.05, sync: false },
    },
    size: { value: 2, random: true },
    line_linked: { enable: false },
    move: {
      enable: true,
      speed: 0.25,
      direction: 'top',
      random: true,
      straight: false,
      out_mode: 'out',
    },
  },
  interactivity: {
    detect_on: 'canvas',
    events: { onhover: { enable: false }, onclick: { enable: false }, resize: true },
  },
  retina_detect: true,
}

interface StarfieldParticlesProps {
  id?: string
}

export function StarfieldParticles({ id = 'battle-starfield' }: StarfieldParticlesProps) {
  const [ready, setReady] = useState(!!window.particlesJS)
  const initedFor = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadParticlesScript()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        // 素材/CDN 問題時靜默跳過星空層，不影響戰鬥畫面其餘部分
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || !window.particlesJS || initedFor.current === id) return
    window.particlesJS(id, CONFIG)
    initedFor.current = id

    return () => {
      if (!window.pJSDom) return
      window.pJSDom = window.pJSDom.filter((dom) => {
        const belongsToThisLayer = dom.pJS?.canvas?.el?.parentElement?.id === id
        if (belongsToThisLayer) dom.pJS?.canvas?.el?.remove()
        return !belongsToThisLayer
      })
      initedFor.current = null
    }
  }, [ready, id])

  return <div id={id} className={styles.layer} aria-hidden="true" />
}

export default StarfieldParticles
