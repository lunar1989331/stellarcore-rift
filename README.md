# 星核裂紀 · Stellarcore Rift

戰略集換式卡牌 RPG（Phase B 骨架）。設計：Mina（Claude.ai）／執行：Claude Code。
專案總說明 + 問題清單見上層 `../CLAUDE.md`。

## 開發

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b + vite build
npm run lint     # oxlint
```

## 結構

```
src/
├── assets/
│   ├── *.png                 20 張騎士插圖（中文檔名；2 張坐騎圖尚缺，見 CLAUDE.md Q12）
│   └── knightImages.ts       import.meta.glob 檔名→URL 解析
├── data/
│   ├── types.ts              Knight / Faction / CoreAttr 型別、陣營色
│   ├── knights.ts            20 位騎士（maxHp 已 ×10，見 Q8/Q15；coreAttr 暫定，見 Q2）
│   ├── mounts.ts             2 坐騎資料 + 合體共鳴定義（尚未接進戰鬥，見 Q12）
│   ├── skills.ts             Mina v2.0 技能書：21 騎士 + 2 坐騎，逐字錄入
│   └── story.ts              ⏳ 型別 + 第一章佔位（等 Mina，Q4）
├── engine/
│   ├── attributes.ts         六屬相剋 +35% / 融合型 +10%
│   ├── resonance.ts          9 共鳴陣（含 2 坐騎合體）+ 遞減制 [1,.75,.5,.25]
│   ├── status.ts             15 種狀態（護盾/攻防速修正/迴避/DoT/skip/反傷/標記/詛咒/技能鎖…）
│   ├── effects.ts            stub 登記表 + 推定實作說明
│   └── battle.ts             3v3 引擎：SP 池、冷卻、11 觸發時機、~35 效果、傷害管線
├── components/
│   ├── KnightCard/            騎士卡牌（插圖/陣營色/HP 條/SP 點/六維，圖鑑頁用）
│   └── Battle/                戰鬥畫面 UI（依 UI_SPEC_v1.0_for_ClaudeCode.md 實裝，見下）
├── AppRouter.tsx              react-router：`/` 圖鑑頁、`/battle` 戰鬥畫面
└── App.tsx                    騎士圖鑑 + 戰鬥引擎 Demo（含「決勝模式」）
```

## 戰鬥畫面 UI（`/battle`）

`src/components/Battle/` 是**真正接上 `engine/battle.ts` 的互動戰鬥畫面**（Session 8 起）：
- `engine/battle.ts` 的 `runBattleSteps()` 是一個 generator 版的 `simulateBattle()`——同一套傷害/效果/
  被動/共鳴/坐騎邏輯，只是在「輪到玩家操控的單位行動」時會 yield 並暫停，等 UI 把選的技能餵回去才繼續。
  `simulateBattle()` 本身沒變（把這個 generator drain 到底的薄包裝），舊的呼叫端（見下方「戰鬥引擎用法」）
  完全不用改。
- `useInteractiveBattle.ts` 包這個 generator 成 React hook；`battleAdapter.ts` 把真 `Combatant`／
  `BattleEvent` 轉成 UI 元件吃的形狀；`BattleScreen.tsx` 驅動一步步播放（敵方回合自動播完整套演出才繼續，
  輪到我方單位就停下來換成那個人的真技能/真SP/真冷卻）。
- 陣容是真 3v3（不是 Part A 示意圖畫的 5(2+3)——引擎的隊伍規模/共鳴陣/平衡數字都是圍繞 3v3 設計的，
  詳見 `../CLAUDE.md` Session 8「跟 Part B 不同的地方」）。
- 點技能／普攻會跑規格書 §11 描述的完整演出（暗化→技能名稱→特效→浮動傷害數字→HP 動態扣血），
  但傷害/回血數字現在是真引擎算出來的，不是寫死的示範值。
- 立繪沿用專案既有插圖，場景背景／技能圖示等正式美術尚未提供，暫以 CSS 漸層與 emoji 佔位
  （`BattleField.module.css` 的 `.sceneBg`、`battleTheme.ts` 的 `STATUS_ICON`）。
- 坐騎合體、選攻擊目標等跟《完整開發規格書 v1.0》Part B 的 pseudocode 不完全一致的地方（沿用既有真引擎，
  沒有照抄 Part B），以及還沒做的「點卡片選目標」，都記在 `../CLAUDE.md` Session 8。

星空粒子層用 `particles.js`；因為該套件內部用 `arguments.callee`，被 Vite 當 ES 模組打包會在
strict mode 下直接崩潰，所以改成把套件複製到 `public/particles.js`、用傳統 `<script>` 標籤載入
（見 `StarfieldParticles.tsx` 註解）。

## 戰鬥引擎用法

```ts
import { simulateBattle } from './engine/battle'
import { getKnight } from './data/knights'

const result = simulateBattle({
  allies: ['osirath', 'elixia', 'greln'].map(getKnight).filter(Boolean),
  enemies: ['solren', 'magnos', 'viel'].map(getKnight).filter(Boolean),
  rng: Math.random,      // 注入種子 RNG → 可重現
  damageScale: 30,       // 省略 = 常數 3.0（設計書 Q8）。見 CLAUDE.md Q15
})
// result.winner / turns / reason / events[] / effectHits{}
```

技能組自動由 `getSkillsFor(id)` 解析（全 21 騎士 + 2 坐騎皆有正式技能）。
`result.effectHits` 是每個效果 type 的實際觸發次數 —— 模擬統計用。

## 效果實作狀態

`engine/effects.ts`：
- `STUBBED_EFFECTS` — 需要引擎沒有的系統，跑到時 no-op（expose / 位移 / chargeGauge …）
- `INTERPRETED_EFFECTS` — 有實作但語意是推定的（immuneFactionWeakness / toggle / gravityBind …）

53 / 69 個 v2.0 效果會在模擬中實際觸發。未觸發的 16 個：9 個坐騎專屬（坐騎未上場）、
5 個引擎 stub、2 個掛在未定義的 `darkScenario` 觸發上。細節見 `../CLAUDE.md` Q11–Q15。

## 待辦

- **Q15：DAMAGE_SCALE / HP 平衡**（現況 200 場全打到回合上限，等 Mina 拍板）
- Q11：gratos 騎士資料｜Q12：坐騎上場 + 合體機制｜Q13：darkScenario 等新系統
- Playwright 測試、react-router 頁面拆分、BattleField/SkillPanel/WorldMap、Howler 音效、GitHub PR
