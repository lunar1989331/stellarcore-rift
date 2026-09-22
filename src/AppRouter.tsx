import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import { BattleScreen } from './components/Battle/BattleScreen'

export function AppRouter() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/battle" element={<BattleScreen />} />
        {/* 永恆的聖域：渾沌限定・世界級 Boss（規格書 2-3：gameMode = eternal_sanctuary，陣營自動鎖定渾沌） */}
        <Route path="/sanctuary" element={<BattleScreen mode="eternal_sanctuary" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
