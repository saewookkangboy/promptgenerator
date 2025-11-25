import { useState } from 'react'
import { saveExperiment } from '../utils/experiments'
import { showNotification } from '../utils/notifications'
import './ExperimentModal.css'

interface ExperimentModalProps {
  isOpen: boolean
  onClose: () => void
  promptPreview: string
  qualityScore: number
  goal?: string
}

function ExperimentModal({ isOpen, onClose, promptPreview, qualityScore, goal }: ExperimentModalProps) {
  const [variantLabel, setVariantLabel] = useState('A')
  const [trafficSplit, setTrafficSplit] = useState(50)
  const [targetMetric, setTargetMetric] = useState<'ctr' | 'conversion' | 'dwellTime' | 'feedbackScore'>('ctr')

  if (!isOpen) return null

  const handleSave = () => {
    saveExperiment({
      variantLabel,
      promptPreview,
      qualityScore,
      goal,
      trafficSplit,
      targetMetric,
      metadata: {},
    })
    showNotification('실험이 저장되었습니다.', 'success')
    onClose()
  }

  return (
    <div className="experiment-modal__backdrop" onClick={onClose}>
      <div className="experiment-modal" onClick={(e) => e.stopPropagation()}>
        <h3>실험에 추가</h3>
        <div className="form-group">
          <label>Variant 라벨</label>
          <input value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} />
        </div>
        <div className="form-group">
          <label>트래픽 배분 (%)</label>
          <input
            type="number"
            min={5}
            max={100}
            value={trafficSplit}
            onChange={(e) => setTrafficSplit(Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>타겟 KPI</label>
          <select value={targetMetric} onChange={(e) => setTargetMetric(e.target.value as any)}>
            <option value="ctr">CTR</option>
            <option value="conversion">전환율</option>
            <option value="dwellTime">체류시간</option>
            <option value="feedbackScore">피드백 점수</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>
            취소
          </button>
          <button onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  )
}

export default ExperimentModal

