'use client'

import { ContainerInfo } from '@/lib/api'
import { formatTemperature } from '@/lib/utils'

interface ContainerListProps {
  containers: ContainerInfo[]
  selectedContainer: string
  onSelectContainer: (containerId: string) => void
}

export default function ContainerList({
  containers,
  selectedContainer,
  onSelectContainer,
}: ContainerListProps) {
  return (
    <div className="card-glass p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">🚢 在途集装箱</h3>
        <span className="text-sm text-gray-400">{containers.length} 个</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
        {containers.map((container) => {
          const isSelected = selectedContainer === container.id
          const temp = container.current_position?.temperature
          const hasAnomaly = temp !== undefined && temp > -10

          return (
            <div
              key={container.id}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'bg-blue-900/30 border border-blue-500/50'
                  : 'bg-dark-700/50 border border-gray-700/50 hover:bg-dark-600/50'
              }`}
              onClick={() => onSelectContainer(container.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">{container.id}</span>
                {hasAnomaly && (
                  <span className="w-2 h-2 bg-red-500 rounded-full status-pulse"></span>
                )}
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {container.cargo} · {container.customer}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {container.origin} → {container.destination}
                </span>
                {temp !== undefined && (
                  <span
                    className={`font-mono font-medium ${
                      hasAnomaly ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatTemperature(temp)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
