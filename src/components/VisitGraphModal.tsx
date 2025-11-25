import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { getDailyVisitsArray } from '../utils/storage'
import './VisitGraphModal.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface VisitGraphModalProps {
  isOpen: boolean
  onClose: () => void
}

function VisitGraphModal({ isOpen, onClose }: VisitGraphModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const dailyData = getDailyVisitsArray(30) // 최근 30일

  const chartData = {
    labels: dailyData.map(item => {
      const date = new Date(item.date)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }),
    datasets: [
      {
        label: '일별 방문수',
        data: dailyData.map(item => item.count),
        borderColor: '#000000',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#000000',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          font: {
            family: '"IBM Plex Sans KR", sans-serif',
            size: 12,
          },
          color: '#000000',
        },
      },
      title: {
        display: true,
        text: '일별 방문수 통계 (최근 30일)',
        font: {
          family: '"IBM Plex Sans KR", sans-serif',
          size: 16,
          weight: 'bold' as const,
        },
        color: '#000000',
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#000000',
        bodyColor: '#000000',
        borderColor: '#000000',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `방문수: ${context.parsed.y}회`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#e5e5e5',
        },
        ticks: {
          color: '#666666',
          font: {
            family: '"IBM Plex Sans KR", sans-serif',
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#e5e5e5',
        },
        ticks: {
          color: '#666666',
          font: {
            family: '"IBM Plex Sans KR", sans-serif',
            size: 11,
          },
          stepSize: 1,
        },
      },
    },
  }

  const totalVisits = dailyData.reduce((sum, item) => sum + item.count, 0)
  const averageVisits = dailyData.length > 0 ? Math.round(totalVisits / dailyData.length) : 0
  const maxVisits = dailyData.length > 0 ? Math.max(...dailyData.map(item => item.count)) : 0

  return (
    <div className="visit-graph-modal-overlay">
      <div className="visit-graph-modal" ref={modalRef}>
        <div className="visit-graph-modal-header">
          <h2>일별 방문수 통계</h2>
          <button
            onClick={onClose}
            className="visit-graph-modal-close"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="visit-graph-stats">
          <div className="visit-stat-item">
            <span className="visit-stat-label">총 방문수</span>
            <span className="visit-stat-value">{totalVisits.toLocaleString()}</span>
          </div>
          <div className="visit-stat-item">
            <span className="visit-stat-label">평균 일일 방문수</span>
            <span className="visit-stat-value">{averageVisits.toLocaleString()}</span>
          </div>
          <div className="visit-stat-item">
            <span className="visit-stat-label">최대 일일 방문수</span>
            <span className="visit-stat-value">{maxVisits.toLocaleString()}</span>
          </div>
        </div>

        <div className="visit-graph-container">
          <Line data={chartData} options={chartOptions} />
        </div>

        <div className="visit-graph-modal-footer">
          <button onClick={onClose} className="visit-graph-modal-button">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default VisitGraphModal

