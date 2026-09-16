import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import { BattleScreen } from './components/Battle/BattleScreen'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/battle" element={<BattleScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
