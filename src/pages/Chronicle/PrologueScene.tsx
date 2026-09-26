// 序章劇情演出（§4）：共同段對話，播完自動跳轉陣營選擇。Phase 1-A 簡化：不做跳過按鈕。
// Phase 1-B：改用 Mina 提供的正式對白來源（chronicleDialogues.ts 的 prologueDialogues，
// 內容跟 Phase 1-A 手打的骨架逐字相同，只是 portrait 換成她慣用的長 id），並改用共用的
// <DialogueSequence> 渲染，不再自己內嵌一份重複的對話框邏輯。
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import bridgeBg from '../../assets/中立星橋.png'
import { prologueDialogues } from '../../data/chronicleDialogues'
import { updateChronicleSave } from '../../hooks/useChronicleSave'
import { DialogueSequence } from './DialogueSequence'

export function PrologueScene() {
  const navigate = useNavigate()

  const handleDone = useCallback(() => {
    updateChronicleSave({ phase: 'faction-select' })
    navigate('/chronicle/faction')
  }, [navigate])

  return <DialogueSequence lines={prologueDialogues} background={bridgeBg} onDone={handleDone} />
}

export default PrologueScene
