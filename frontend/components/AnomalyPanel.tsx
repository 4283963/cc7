'use client'

import { AnomalyEvent } from '@/lib/api'
import { severityColor, severityLabel, statusLabel, formatTemperature } from '@/lib/utils'
import dayjs from 'dayjs'

interface AnomalyPanelProps {
  anomalies: AnomalyEvent[]
  selectedAnomaly: AnomalyEvent | null
  onSelectAnomaly: (anomaly: AnomalyEvent) => void
  onAttribute: (anomaly: AnomalyEvent) => void
}

export default function AnomalyPanel({
  anomalies,
  selectedAnomaly,
  onSelectAnomaly,
  onAttribute,
}: AnomalyPanelProps) {
  return (
    <div className="card-glass p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full status-pulse"></span>
          温度异常告警
        </h3>
        <span className="text-sm text-gray-400">{anomalies.length} 条</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3">
        {anomalies.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-3xl mb-2">✅</div>
            <div>暂无异常告警</div>
          </div>
        ) : (
          anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedAnomaly?.id === anomaly.id
                  ? 'bg-blue-900/30 border border-blue-500/50'
                  : 'bg-dark-700/50 border border-gray-700/50 hover:bg-dark-600/50'
              }`}
              onClick={() => onSelectAnomaly(anomaly)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-white">{anomaly.container_id}</div>
                  <div className="text-xs text-gray-400">{anomaly.cargo || '冷链货物'}</div>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${severityColor(anomaly.severity)}20`,
                    color: severityColor(anomaly.severity),
                  }}
                >
                  {severityLabel(anomaly.severity)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-gray-500">最高温度:</span>{' '}
                  <span className="text-red-400 font-medium">
                    {formatTemperature(anomaly.max_temperature)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">状态:</span>{' '}
                  <span
                    className={
                      anomaly.status === 'ongoing'
                        ? 'text-orange-400'
                        : 'text-green-400'
                    }
                  >
                    {statusLabel(anomaly.status)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-3">
                <div>开始: {dayjs(anomaly.start_time).format('MM-DD HH:mm')}</div>
                {anomaly.end_time && (
                  <div>结束: {dayjs(anomaly.end_time).format('MM-DD HH:mm')}</div>
                )}
              </div>

              <button
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onAttribute(anomaly)
                }}
              >
                🔍 链路归因
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
