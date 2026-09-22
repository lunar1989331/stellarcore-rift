import { useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'
import { KnightCard } from './components/KnightCard'
import { KNIGHTS_BY_FACTION, getKnight } from './data/knights'
import { FACTION_COLORS, type Faction } from './data/types'
import { simulateBattle, type BattleResult } from './engine/battle'

const FACTION_ORDER: Faction[] = ['independent', 'guardian', 'chaos']

// Demo 對戰預設組合（Mina v3 指定：要有一場飛行坐騎 vs 莫德雷斯、一場銀翼+裂翼 vs 莫德雷斯）
const DEMO_PRESETS = [
  { id: 'mounts', label: '坐騎合體：frael+凜牙 vs gratos+血牙', allies: ['osirath', 'elixia', 'frael'], enemies: ['solren', 'magnos', 'gratos'] },
  { id: 'fly-vs-mordres', label: '飛行 vs 壓制：aivia+嵐翼、ignis 對面 vs mordres', allies: ['aivia', 'laros', 'selena'], enemies: ['mordres', 'ignis', 'seres'] },
  { id: 'void-vs-mordres', label: '裂翼免疫壓制：銀翼+裂翼 vs mordres', allies: ['silver-wing', 'zephyr', 'aiso'], enemies: ['mordres', 'magnos', 'eclron'] },
  { id: 'dark', label: '暗月／過載：vs eclron+holka+seres', allies: ['osirath', 'elixia', 'aiso'], enemies: ['eclron', 'holka', 'seres'] },
]

const nameOf = (id: string) => getKnight(id)?.name ?? id

function App() {
  const [result, setResult] = useState<BattleResult | null>(null)
  const [presetId, setPresetId] = useState(DEMO_PRESETS[0].id)
  // Mina v2 Q15：DAMAGE_SCALE 30 現在是預設值。這個勾選改成拿「舊版 3.0 消耗戰」做對照。
  const [legacyScale, setLegacyScale] = useState(false)

  const preset = DEMO_PRESETS.find((p) => p.id === presetId) ?? DEMO_PRESETS[0]

  const runDemo = () => {
    const allies = preset.allies.map(getKnight).filter((k) => !!k)
    const enemies = preset.enemies.map(getKnight).filter((k) => !!k)
    setResult(simulateBattle({ allies, enemies, damageScale: legacyScale ? 3.0 : undefined }))
  }

  return (
    <div className="app">
      <header className="appHeader">
        <h1>星核裂紀 · Stellarcore Rift</h1>
        <p className="tagline">戰略集換式卡牌 RPG · Phase B 骨架</p>
        <div className="battleLinks">
          <Link to="/battle" className="battleLink">
            ⚔ 一般對戰模式
          </Link>
          {/* 規格書 2-2／2-3：深紫色系，點擊後直接鎖定渾沌陣營進入 Boss 關卡 */}
          <Link to="/sanctuary" className="sanctuaryLink">
            <span className="sanctuaryLinkTitle">🌌 永恆的聖域</span>
            <span className="sanctuaryLinkSub">渾沌限定・世界級Boss</span>
          </Link>
        </div>
      </header>

      <section className="demoPanel">
        <div className="demoHeader">
          <h2>戰鬥引擎 Demo（3v3）</h2>
          <button type="button" className="runBtn" onClick={runDemo}>
            執行對戰模擬
          </button>
        </div>
        <p className="demoMeta">
          <label className="legend">
            對戰組合：{' '}
            <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              {DEMO_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <br />
          我方：{preset.allies.map(nameOf).join('、')}
          <br />
          敵方：{preset.enemies.map(nameOf).join('、')}
          <br />
          <label className="legend">
            <input
              type="checkbox"
              checked={legacyScale}
              onChange={(e) => setLegacyScale(e.target.checked)}
            />{' '}
            舊版消耗戰模式（DAMAGE_SCALE 3.0，對照組 —— 見 CLAUDE.md Q15）
          </label>
        </p>
        {result && (
          <div className="battleLog">
            <div className="battleVerdict">
              結果：
              {result.winner === 'ally'
                ? '我方勝利'
                : result.winner === 'enemy'
                  ? '敵方勝利'
                  : '平手'}
              （{result.turns} 回合 · {result.reason === 'wipe' ? '殲滅' : 'HP 判定'}）
            </div>
            <ol>
              {result.events.map((e, i) => (
                <li key={i} data-type={e.type}>
                  {e.message}
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {FACTION_ORDER.map((faction) => (
        <section key={faction} className="rosterSection">
          <h2 style={{ color: FACTION_COLORS[faction].primary }}>
            {FACTION_COLORS[faction].label}
            <span className="count">{KNIGHTS_BY_FACTION[faction].length} 位</span>
          </h2>
          <div className="rosterGrid">
            {KNIGHTS_BY_FACTION[faction].map((knight) => (
              <KnightCard key={knight.id} knight={knight} currentSp={3} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default App
