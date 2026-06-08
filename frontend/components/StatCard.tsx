'use client'

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  trend?: string
  trendType?: 'up' | 'down' | 'neutral'
  color?: string
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendType = 'neutral',
  color = 'text-blue-400',
}: StatCardProps) {
  const trendColors = {
    up: 'text-red-400',
    down: 'text-green-400',
    neutral: 'text-gray-400',
  }

  return (
    <div className="card-glass p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400 mb-1">{title}</div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          {trend && (
            <div className={`text-xs mt-1 ${trendColors[trendType]}`}>
              {trendType === 'up' ? '↑' : trendType === 'down' ? '↓' : '→'} {trend}
            </div>
          )}
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
    </div>
  )
}
