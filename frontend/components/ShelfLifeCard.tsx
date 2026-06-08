'use client'

import { ShelfLifePrediction } from '@/lib/api'
import ShelfLifeGauge from './ShelfLifeGauge'

interface ShelfLifeCardProps {
  prediction: ShelfLifePrediction | null
  loading?: boolean
  containerId?: string
}

export default function ShelfLifeCard({
  prediction,
  loading = false,
  containerId,
}: ShelfLifeCardProps) {
  if (!prediction && !loading) return null

  return (
    <div className="card-glass p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <span>🧪</span>
          保质期预测
        </h3>
        {containerId && (
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            {containerId}
          </span>
        )}
      </div>

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <ShelfLifeGauge prediction={prediction} loading={loading} size={140} />
        </div>

        <div className="flex-1 space-y-2 pt-1">
          {prediction && !loading ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <StatItem
                  label="货物类型"
                  value={prediction.product}
                  icon="📦"
                />
                <StatItem
                  label="基准保质期"
                  value={`${(prediction.base_shelf_life_hours / 24).toFixed(0)}天`}
                  icon="📅"
                />
                <StatItem
                  label="等效老化"
                  value={`${prediction.total_equivalent_aging_hours.toFixed(1)}h`}
                  icon="⏱️"
                  highlight={prediction.total_equivalent_aging_hours > 100}
                />
                <StatItem
                  label="实际耗时"
                  value={`${prediction.total_actual_hours.toFixed(1)}h`}
                  icon="⌛"
                />
              </div>

              <div className="border-t border-gray-700 pt-2 mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">最高降解速率</span>
                  <span className="text-orange-400 font-medium">
                    ×{prediction.max_degradation_rate.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Q10 系数</span>
                  <span className="text-gray-300">{prediction.q10_factor}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">参考温度</span>
                  <span className="text-gray-300">{prediction.reference_temp_c}°C</span>
                </div>
              </div>

              {prediction.predicted_remaining_hours_at_current_rate !== null && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 mt-2">
                  <div className="text-xs text-blue-300">
                    📊 按当前速率预测
                  </div>
                  <div className="text-sm text-blue-200 font-medium mt-0.5">
                    还能保鲜约{' '}
                    {(prediction.predicted_remaining_hours_at_current_rate / 24).toFixed(1)} 天
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-sm">加载中...</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-500 mb-2">
          💡 基于 Arrhenius 方程 + Q10 模型的生物化学降解经验公式
        </div>
      </div>
    </div>
  )
}

function StatItem({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string
  value: string
  icon: string
  highlight?: boolean
}) {
  return (
    <div className="bg-dark-700/50 rounded-lg p-2">
      <div className="text-[10px] text-gray-500 flex items-center gap-1">
        <span>{icon}</span>
        {label}
      </div>
      <div
        className={`text-sm font-semibold mt-0.5 ${
          highlight ? 'text-orange-400' : 'text-white'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
