'use client'

import { ContainerInfo, ShelfLifePrediction } from '@/lib/api'
import { formatTemperature } from '@/lib/utils'

interface ContainerListProps {
  containers: ContainerInfo[]
  selectedContainers: string[]
  onToggleContainer: (containerId: string) => void
  multiSelect?: boolean
  shelfLifeMap?: Record<string, ShelfLifePrediction | undefined>
  loadingShelfLife?: Set<string>
}

const qualityColors: Record<string, string> = {
  excellent: 'text-emerald-400',
  good: 'text-green-400',
  fair: 'text-yellow-400',
  poor: 'text-orange-400',
  critical: 'text-red-400',
}

const qualityLabels: Record<string, string> = {
  excellent: '优',
  good: '良',
  fair: '中',
  poor: '差',
  critical: '危',
}

export default function ContainerList({
  containers,
  selectedContainers,
  onToggleContainer,
  multiSelect = true,
  shelfLifeMap,
  loadingShelfLife,
}: ContainerListProps) {
  const containerList = containers || []
  const selectedList = selectedContainers || []

  return (
    <div className="card-glass p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">🚢 在途集装箱</h3>
        <span className="text-sm text-gray-400">
          已选 {selectedList.length}/{containerList.length}
        </span>
      </div>

      {multiSelect && (
        <div className="mb-3 text-xs text-gray-500">
          💡 点击勾选多艘货轮进行航线对比
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
        {containerList.map((container) => {
          const isSelected = selectedList.includes(container.id)
          const temp = container.current_position?.temperature
          const hasAnomaly = temp !== undefined && temp > -10
          const shelfLife = shelfLifeMap?.[container.id]
          const isLoadingShelfLife = loadingShelfLife?.has(container.id)

          return (
            <div
              key={container.id}
              className={`p-3 rounded-lg cursor-pointer transition-all relative ${
                isSelected
                  ? 'bg-blue-900/40 border border-blue-500/60'
                  : 'bg-dark-700/50 border border-gray-700/50 hover:bg-dark-600/50'
              }`}
              onClick={() => onToggleContainer(container.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white truncate">
                      {container.id}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {hasAnomaly && (
                        <span className="w-2 h-2 bg-red-500 rounded-full status-pulse"></span>
                      )}
                      {shelfLife && !isLoadingShelfLife && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            qualityColors[shelfLife.quality_level] || 'text-gray-400'
                          } bg-opacity-20`}
                          style={{
                            backgroundColor: shelfLife.quality_level === 'critical'
                              ? 'rgba(239,68,68,0.2)'
                              : shelfLife.quality_level === 'poor'
                              ? 'rgba(249,115,22,0.2)'
                              : shelfLife.quality_level === 'fair'
                              ? 'rgba(251,191,36,0.2)'
                              : 'rgba(16,185,129,0.2)',
                          }}
                        >
                          {qualityLabels[shelfLife.quality_level] || '?'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mb-2 truncate">
                    {container.cargo} · {container.customer}
                  </div>

                  {shelfLife && !isLoadingShelfLife ? (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-gray-500">🧪 剩余保质期</span>
                        <span
                          className={`font-medium ${
                            qualityColors[shelfLife.quality_level] || 'text-gray-400'
                          }`}
                        >
                          {(shelfLife.remaining_shelf_life_hours / 24).toFixed(1)}天
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, shelfLife.remaining_ratio * 100)}%`,
                            backgroundColor:
                              shelfLife.quality_level === 'critical'
                                ? '#ef4444'
                                : shelfLife.quality_level === 'poor'
                                ? '#f97316'
                                : shelfLife.quality_level === 'fair'
                                ? '#fbbf24'
                                : '#10b981',
                          }}
                        ></div>
                      </div>
                    </div>
                  ) : isLoadingShelfLife ? (
                    <div className="mb-2 h-6 flex items-center">
                      <div className="text-[10px] text-gray-500 status-pulse">
                        ⏳ 预测中...
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 truncate">
                      {container.origin} → {container.destination}
                    </span>
                    {temp !== undefined && (
                      <span
                        className={`font-mono font-medium flex-shrink-0 ml-2 ${
                          hasAnomaly ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {formatTemperature(temp)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
