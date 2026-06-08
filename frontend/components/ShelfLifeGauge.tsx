'use client'

import { ShelfLifePrediction } from '@/lib/api'

interface ShelfLifeGaugeProps {
  prediction: ShelfLifePrediction | null
  loading?: boolean
  size?: number
}

const qualityConfig = {
  excellent: {
    label: '优秀',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  good: {
    label: '良好',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.15)',
  },
  fair: {
    label: '一般',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.15)',
  },
  poor: {
    label: '较差',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
  },
  critical: {
    label: '严重',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
  },
}

export default function ShelfLifeGauge({
  prediction,
  loading = false,
  size = 180,
}: ShelfLifeGaugeProps) {
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  if (loading || !prediction) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="text-3xl status-pulse">⏳</div>
        <div className="text-sm text-gray-500 mt-2">预测中...</div>
      </div>
    )
  }

  const remainingRatio = prediction.remaining_ratio
  const spoiledRatio = prediction.spoiled_ratio
  const quality = qualityConfig[prediction.quality_level] || qualityConfig.fair
  const remainingHours = prediction.remaining_shelf_life_hours
  const remainingDays = Math.floor(remainingHours / 24)
  const remainingHoursOfDay = Math.floor(remainingHours % 24)

  const dashOffset = circumference * spoiledRatio

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={quality.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference - dashOffset} ${dashOffset}`}
            strokeDashoffset={-dashOffset}
            style={{
              filter: `drop-shadow(0 0 6px ${quality.color}60)`,
              transition: 'stroke-dasharray 0.8s ease-out, stroke 0.3s',
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xs text-gray-500 mb-1">剩余保质期</div>
          <div
            className="text-3xl font-bold"
            style={{ color: quality.color }}
          >
            {remainingDays}d
          </div>
          <div className="text-sm text-gray-400">
            {remainingHoursOfDay}h · {(remainingRatio * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div
        className="mt-3 px-3 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: quality.bgColor,
          color: quality.color,
        }}
      >
        品质等级: {quality.label}
      </div>
    </div>
  )
}
