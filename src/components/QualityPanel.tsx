import { QualityReport } from '../utils/qualityRules'
import './QualityPanel.css'

interface QualityPanelProps {
  report: QualityReport | null
  onAddExperiment: () => void
}

function QualityPanel({ report, onAddExperiment }: QualityPanelProps) {
  if (!report) return null

  const severityColor = report.score >= 80 ? '#1f8b4c' : report.score >= 60 ? '#d57c1d' : '#c62828'

  return (
    <div className="quality-panel">
      <div className="quality-panel__header">
        <div>
          <p className="quality-panel__label">품질 점수</p>
          <div className="quality-panel__score" style={{ color: severityColor }}>
            {report.score} / 100
          </div>
        </div>
        <button className="quality-panel__button" onClick={onAddExperiment}>
          실험에 추가
        </button>
      </div>

      {report.issues.length > 0 && (
        <div className="quality-panel__section">
          <h4>이슈</h4>
          <ul>
            {report.issues.map((issue, index) => (
              <li key={index} className={`issue-${issue.severity}`}>
                <strong>[{issue.severity.toUpperCase()}]</strong> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.recommendations.length > 0 && (
        <div className="quality-panel__section">
          <h4>개선 제안</h4>
          <ul>
            {report.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {report.guidelineHints.length > 0 && (
        <div className="quality-panel__section hints">
          <h4>가이드라인 힌트</h4>
          <ul>
            {report.guidelineHints.map((hint, index) => (
              <li key={index}>{hint}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default QualityPanel

