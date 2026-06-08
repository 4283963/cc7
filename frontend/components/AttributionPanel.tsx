'use client'

import { AttributionResult, AttributionSegment } from '@/lib/api'
import {
  causeTypeLabel,
  formatTemperature,
  causeIcon,
  severityColor,
} from '@/lib/utils'
import dayjs from 'dayjs'

interface AttributionPanelProps {
  result: AttributionResult | null
  loading: boolean
  onClose: () => void
  onUpdateOrder: (anomalyId: number) => void
}

export default function AttributionPanel({
  result,
  loading,
  onClose,
  onUpdateOrder,
}: AttributionPanelProps) {
  if (!result && !loading) return null

  return (
    <div className="card-glass p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>🔬</span>
          温度异常链路归因
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4 status-pulse">🔍</div>
            <div className="text-gray-400">正在分析时序数据...</div>
            <div className="text-xs text-gray-500 mt-2">
              执行 ClickHouse 复杂时序聚合查询
            </div>
          </div>
        </div>
      ) : result ? (
        <>
          <div className="bg-dark-700/50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">集装箱</div>
                <div className="font-semibold text-white">{result.container_id}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">异常事件</div>
                <div className="font-semibold text-white">#{result.anomaly_id}</div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-3">
              <div className="text-xs text-gray-500 mb-2">主要原因</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{causeIcon(result.primary_cause)}</span>
                <div>
                  <div className="font-semibold text-orange-400">
                    {causeTypeLabel(result.primary_cause)}
                  </div>
                  <div className="text-xs text-gray-500">
                    主要发生海域: {result.primary_sea_area}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm font-medium text-gray-300 mb-3">
            分析区段 ({result.total_segments} 段)
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
            {result.segments.map((seg, idx) => (
              <SegmentCard key={idx} segment={seg} index={idx + 1} />
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <button
              onClick={() => onUpdateOrder(result.anomaly_id)}
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all"
            >
              📋 生成赔偿工单 / 更新工单状态
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

function SegmentCard({ segment, index }: { segment: AttributionSegment; index: number }) {
  const confidencePct = Math.round(segment.confidence * 100)

  return (
    <div className="bg-dark-700/30 rounded-lg p-3 border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-900/50 text-blue-400 text-xs flex items-center justify-center font-medium">
            {index}
          </span>
          <span className="text-sm font-medium text-white">{segment.sea_area}</span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            backgroundColor:
              segment.cause_type === 'compressor_failure'
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(249, 115, 22, 0.2)',
            color:
              segment.cause_type === 'compressor_failure'
                ? '#f87171'
                : '#fb923c',
          }}
        >
          {causeTypeLabel(segment.cause_type)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div>
          <span className="text-gray-500">平均温度:</span>{' '}
          <span className="text-white">{formatTemperature(segment.avg_temperature)}</span>
        </div>
        <div>
          <span className="text-gray-500">温升:</span>{' '}
          <span className={segment.temp_rise > 0 ? 'text-red-400' : 'text-green-400'}>
            {segment.temp_rise > 0 ? '+' : ''}
            {segment.temp_rise.toFixed(1)}°C
          </span>
        </div>
        <div>
          <span className="text-gray-500">光照强度:</span>{' '}
          <span className="text-yellow-400">{segment.avg_solar_intensity.toFixed(0)} W/m²</span>
        </div>
        <div>
          <span className="text-gray-500">压缩机关停比:</span>{' '}
          <span className={segment.compressor_off_ratio > 0.3 ? 'text-red-400' : 'text-green-400'}>
            {(segment.compressor_off_ratio * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        {dayjs(segment.time_start).format('HH:mm')} - {dayjs(segment.time_end).format('HH:mm')}
      </div>

      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
          style={{ width: `${confidencePct}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 mt-1 text-right">
        置信度 {confidencePct}%
      </div>
    </div>
  )
}
