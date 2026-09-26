// 戰前隊伍選擇 + 戰鬥（§8/§9）：路由 /chronicle/battle/:battleId。
// 隊伍選擇畫面本身沿用 BattleScreen 內建的 TeamSelect 步驟（見 BattleScreen.tsx 的
// `!team` early return，跟永恆的聖域共用同一套機制），這裡只負責把 battleId 解析成
// 域＋關卡節點，組成 ChronicleBattleConfig 餵給 BattleScreen，並在勝利/失敗時
// 寫存檔、導頁——BattleScreen 本身不需要知道 Chronicle 的路由與存檔細節。
//
// Phase 1-B 新增：域內最後一戰（通常是 domain-boss，但序章的兩場教學戰都不是，見
// chronicleData.ts 判讀 6）首次獲勝後，先播 epilogueDialogue，播完才真正記錄通關／
// 解鎖下一域／回到星橋地圖；非最後一戰（或重新挑戰已通關過的最後一戰）直接回域詳細頁，
// 不重播結局（HANDOFF_PHASE1B §1／§5）。精英戰的 `eliteRule.type==='enemy-buffed'`
// 換算成 `eliteAtkMultiplier: 1.25` 交給 BattleScreen（見 useInteractiveBattle.ts）。
//
// Phase 1-C 任務四：打完「終局域」（`final-domain-guardian`／`final-domain-chaos`）的最後
// 一戰＝全線通關——播完 epilogue 後不是回地圖，是把存檔 phase 標記為 'completed' 並導向
// `/chronicle/ending`（見下面 finishVictory 的 isFinalBoss 分支）。
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BattleScreen } from '../../components/Battle/BattleScreen'
import { getBattleNode, getDomainByBattleId, isDomainFinalBattle } from '../../data/chronicleData'
import { loadChronicleSave, recordBattleVictory, updateChronicleSave } from '../../hooks/useChronicleSave'
import { DialogueSequence } from './DialogueSequence'

const ELITE_ATK_MULTIPLIER = 1.25
const FINAL_DOMAIN_IDS = ['final-domain-guardian', 'final-domain-chaos']

export function ChronicleTeamSelect() {
  const { battleId } = useParams<{ battleId: string }>()
  const navigate = useNavigate()
  const domain = battleId ? getDomainByBattleId(battleId) : undefined
  const battle = domain && battleId ? getBattleNode(domain.id, battleId) : undefined
  const save = loadChronicleSave()

  const [showEpilogue, setShowEpilogue] = useState(false)

  const isFinalBattle = !!(domain && battle && isDomainFinalBattle(domain, battle.id))
  const alreadyCompleted = !!(battle && save?.completedBattles.includes(battle.id))

  // Chronicle config 物件本來就每次 render 都重新建立（下面 `chronicle={{...}}`），
  // 這幾個 handler 沒有靠 useCallback 維持參照穩定的必要，寫成一般函式最直接。

  /** 真正記錄通關、視情況解鎖下一域、導頁——不管有沒有播 epilogue 都會走到這裡。 */
  const finishVictory = () => {
    if (!battle || !domain) return
    recordBattleVictory(battle.id, isFinalBattle ? domain.unlocksNext : undefined)
    // 任務四：終局域的最後一戰＝全線通關，不回地圖，改標記存檔完成並進結局演出。
    if (isFinalBattle && FINAL_DOMAIN_IDS.includes(domain.id)) {
      updateChronicleSave({ phase: 'completed' })
      navigate('/chronicle/ending')
      return
    }
    navigate(isFinalBattle ? '/chronicle/map' : `/chronicle/domain/${domain.id}`)
  }

  const handleVictory = () => {
    if (!battle || !domain) return
    // 只有「域內最後一戰」且「第一次通關」才播結局對白（重新挑戰、或普通/精英戰勝利
    // 都直接回域詳細頁，不重播、不誤觸發）。
    if (isFinalBattle && !alreadyCompleted && domain.epilogueDialogue?.length) {
      setShowEpilogue(true)
      return
    }
    finishVictory()
  }

  const handleDefeat = () => {
    if (!domain) return
    navigate(`/chronicle/domain/${domain.id}`)
  }

  if (!domain || !battle || !save?.playerFaction) {
    return (
      <div style={{ padding: 40, color: '#eef1f7' }}>
        <p>找不到這場戰鬥，或尚未選擇陣營。</p>
        <button type="button" onClick={() => navigate('/chronicle/map')}>
          ← 返回地圖
        </button>
      </div>
    )
  }

  if (showEpilogue && domain.epilogueDialogue) {
    return <DialogueSequence lines={domain.epilogueDialogue} onDone={finishVictory} />
  }

  return (
    <BattleScreen
      mode="chronicle"
      chronicle={{
        battleId: battle.id,
        domainName: `${domain.name}・${battle.label}`,
        playerFaction: save.playerFaction,
        enemyIds: [...battle.enemyIds],
        sceneBase: domain.sceneBase,
        eliteAtkMultiplier: battle.eliteRule?.type === 'enemy-buffed' ? ELITE_ATK_MULTIPLIER : undefined,
        onVictory: handleVictory,
        onDefeat: handleDefeat,
      }}
    />
  )
}

export default ChronicleTeamSelect
