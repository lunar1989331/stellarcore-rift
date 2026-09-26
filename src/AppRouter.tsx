import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import { BattleScreen } from './components/Battle/BattleScreen'
import { ChronicleRouter } from './pages/Chronicle/ChronicleRouter'
import { PrologueScene } from './pages/Chronicle/PrologueScene'
import { FactionSelect } from './pages/Chronicle/FactionSelect'
import { StarBridgeMap } from './pages/Chronicle/StarBridgeMap'
import { DomainDetail } from './pages/Chronicle/DomainDetail'
import { ChronicleTeamSelect } from './pages/Chronicle/ChronicleTeamSelect'
import { ChronicleEnding } from './pages/Chronicle/ChronicleEnding'

export function AppRouter() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/battle" element={<BattleScreen />} />
        {/* 永恆的聖域：渾沌限定・世界級 Boss（規格書 2-3：gameMode = eternal_sanctuary，陣營自動鎖定渾沌） */}
        <Route path="/sanctuary" element={<BattleScreen mode="eternal_sanctuary" />} />

        {/* Chronicle Mode（劇情模式）—— CHRONICLE_MODE_SPEC_v1.0 §13。入口一律走 /chronicle，
            由 ChronicleRouter 依存檔狀態決定實際導向哪一頁，其餘頁面不可被直接跳入取代它。 */}
        <Route path="/chronicle" element={<ChronicleRouter />} />
        <Route path="/chronicle/prologue" element={<PrologueScene />} />
        <Route path="/chronicle/faction" element={<FactionSelect />} />
        <Route path="/chronicle/map" element={<StarBridgeMap />} />
        <Route path="/chronicle/domain/:domainId" element={<DomainDetail />} />
        <Route path="/chronicle/battle/:battleId" element={<ChronicleTeamSelect />} />
        {/* 任務四：全線通關演出，只有打完終局域域主戰才會被導向這裡（見 ChronicleTeamSelect.tsx）。 */}
        <Route path="/chronicle/ending" element={<ChronicleEnding />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
