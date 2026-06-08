'use client'

import { ContainerInfo } from '@/lib/api'
import { formatTemperature } from '@/lib/utils'

interface ContainerListProps {
  containers: ContainerInfo[]
  selectedContainers: string[]
  onToggleContainer: (containerId: string) => void
  multiSelect?: boolean
}

export default function ContainerList({
  containers,
  selectedContainers,
  onToggleContainer,
  multiSelect = true,
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
                    {hasAnomaly && (
                      <span className="w-2 h-2 bg-red-500 rounded-full status-pulse flex-shrink-0 ml-2"></span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mb-2 truncate">
                    {container.cargo} · {container.customer}
                  </div>
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
