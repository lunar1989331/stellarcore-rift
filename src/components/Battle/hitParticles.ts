// 項目 H（PLAYER_FEEDBACK_SPEC_v1.0 / E-G-H 實裝指令 v1，2026-09-13）：屬性粒子特效。
// Mina 指定純 CSS + JS、不引入外部動畫庫——直接用 document.createElement + Web Animations
// API（.animate()）在 document.body 底下生出用完即丟的 DOM 節點，完全繞開 React（不會跟
// React 的虛擬 DOM 打架，因為節點的生滅都在 React 管的樹狀結構外面）。
//
// 命名判讀：Mina 原文把這個型別叫 `Element`，跟 DOM 內建的 `Element`（HTMLElement 的父型別，
// 這個檔案自己就要用到）撞名，會讓 TypeScript 分不清是哪一個——改名 `HitElement` 避開，
// 純粹是型別命名問題，行為完全比照原文。
export type HitElement = 'molten' | 'ice' | 'thunder' | 'radiant' | 'eclipse' | 'void' | 'neutral'

interface ParticleConfig {
  count: number
  colors: string[]
  duration: number // ms
  shape: 'circle' | 'line' | 'cross' | 'hex'
}

const PARTICLE_CONFIG: Record<HitElement, ParticleConfig> = {
  molten: { count: 10, colors: ['#f97316', '#dc2626'], duration: 600, shape: 'circle' },
  ice: { count: 12, colors: ['#7dd3fc', '#e0f2fe'], duration: 800, shape: 'hex' },
  thunder: { count: 7, colors: ['#a78bfa', '#fde047'], duration: 400, shape: 'line' },
  radiant: { count: 7, colors: ['#fde047', '#ffffff'], duration: 700, shape: 'cross' },
  eclipse: { count: 9, colors: ['#6b21a8', '#1e1b4b'], duration: 900, shape: 'circle' },
  void: { count: 5, colors: ['#e2e8f0', '#94a3b8'], duration: 500, shape: 'line' },
  neutral: { count: 4, colors: ['#d1d5db', '#9ca3af'], duration: 300, shape: 'circle' },
}

/**
 * 在目標元素位置播放命中粒子。
 * @param targetEl - 目標騎士卡片的 DOM element
 * @param element  - 攻擊者的屬性（見 battleAdapter.ts 的 mapAttrToHitElement()）
 */
export function spawnHitParticles(targetEl: HTMLElement, element: HitElement): void {
  const config = PARTICLE_CONFIG[element]
  const rect = targetEl.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  for (let i = 0; i < config.count; i++) {
    const el = document.createElement('div')
    el.className = `hit-particle hit-particle--${config.shape}`

    const angle = (Math.PI * 2 * i) / config.count + Math.random() * 0.5
    const dist = 30 + Math.random() * 40
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist
    const color = config.colors[Math.floor(Math.random() * config.colors.length)]
    const size = 4 + Math.random() * 5

    el.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${config.shape === 'circle' || config.shape === 'hex' ? '50%' : '1px'};
      pointer-events: none;
      z-index: 9999;
    `

    document.body.appendChild(el)
    el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 },
      ],
      { duration: config.duration, easing: 'ease-out', fill: 'forwards' },
    ).onfinish = () => el.remove()
  }
}
