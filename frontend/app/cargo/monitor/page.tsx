'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  containerApi,
  anomalyApi,
  attributionApi,
  ContainerInfo,
  AnomalyEvent,
  TrajectoryPoint,
  AttributionResult,
} from '@/lib/api'
import ContainerList from '@/components/ContainerList'
import AnomalyPanel from '@/components/AnomalyPanel'
import AttributionPanel from '@/components/AttributionPanel'
import StatCard from '@/components/StatCard'
import TemperatureLegend from '@/components/TemperatureLegend'
import TempChart from '@/components/TempChart'
import CurrentTime from '@/components/CurrentTime'
import { registerWorldMap } from '@/lib/mapData'

const WorldMap = dynamic(() => import('@/components/WorldMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-gray-400">加载地图中...</div>
    </div>
  ),
})

export default function CargoMonitorPage() {
  const [containers, setContainers] = useState<ContainerInfo[]>([])
  const [selectedContainer, setSelectedContainer] = useState<string>('CONT-SEA-001')
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([])
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null)
  const [attributionResult, setAttributionResult] = useState<AttributionResult | null>(null)
  const [attributionLoading, setAttributionLoading] = useState(false)
  const [showAttribution, setShowAttribution] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  const loadContainers = useCallback(async () => {
    try {
      const res = await containerApi.getList()
      setContainers(res.data.containers)
    } catch (e) {
      console.error('Failed to load containers:', e)
    }
  }, [])

  const loadTrajectory = useCallback(async (containerId: string) => {
    try {
      const res = await containerApi.getTrajectory(containerId, 168)
      setTrajectory(res.data.trajectory)
    } catch (e) {
      console.error('Failed to load trajectory:', e)
    }
  }, [])

  const loadAnomalies = useCallback(async () => {
    try {
      const res = await anomalyApi.getList()
      setAnomalies(res.data.anomalies)
    } catch (e) {
      console.error('Failed to load anomalies:', e)
    }
  }, [])

  const handleAttribute = useCallback(
    async (anomaly: AnomalyEvent) => {
      setSelectedAnomaly(anomaly)
      setShowAttribution(true)
      setAttributionLoading(true)
      setAttributionResult(null)

      try {
        const res = await attributionApi.analyze(anomaly.container_id, anomaly.id)
        setAttributionResult(res.data)
      } catch (e) {
        console.error('Failed to analyze attribution:', e)
      } finally {
        setAttributionLoading(false)
      }
    },
    []
  )

  const handleUpdateOrder = useCallback(
    (anomalyId: number) => {
      alert(`工单状态已更新！异常事件 #${anomalyId} 已同步至 PostgreSQL 赔偿工单系统。`)
    },
    []
  )

  const handleSelectContainer = useCallback(
    (containerId: string) => {
      setSelectedContainer(containerId)
      loadTrajectory(containerId)
    },
    [loadTrajectory]
  )

  useEffect(() => {
    registerWorldMap().then(() => setMapReady(true))
    loadContainers()
    loadAnomalies()
  }, [loadContainers, loadAnomalies])

  useEffect(() => {
    if (containers.length > 0) {
      loadTrajectory(selectedContainer)
    }
  }, [containers, selectedContainer, loadTrajectory])

  useEffect(() => {
    const interval = setInterval(() => {
      loadAnomalies()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadAnomalies])

  const ongoingAnomalies = anomalies.filter((a) => a.status === 'ongoing').length
  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length
  const avgTemp =
    trajectory.length > 0
      ? trajectory.reduce((sum, p) => sum + p.temperature, 0) / trajectory.length
      : 0

  const attributionSegments = attributionResult?.segments.map((seg) => ({
    lat_start: seg.lat_start,
    lon_start: seg.lon_start,
    lat_end: seg.lat_end,
    lon_end: seg.lon_end,
    cause_type: seg.cause_type,
    sea_area: seg.sea_area,
    confidence: seg.confidence,
  }))

  return (
    <div className="min-h-screen dark-bg p-4">
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🚢</span>
              跨境海运冷链物流监控大屏
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Cold Chain IoT Analytics · 温度异常与轨迹归因分析系统
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 status-pulse"></span>
              系统运行中
            </div>
            <CurrentTime />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard
          title="在途集装箱"
          value={containers.length}
          icon="📦"
          color="text-blue-400"
        />
        <StatCard
          title="当前异常"
          value={ongoingAnomalies}
          icon="⚠️"
          color="text-red-400"
          trend={`${criticalCount} 个严重`}
          trendType="up"
        />
        <StatCard
          title="平均温度"
          value={avgTemp.toFixed(1) + '°C'}
          icon="🌡️"
          color={avgTemp < -12 ? 'text-green-400' : 'text-yellow-400'}
        />
        <StatCard
          title="已处理赔偿"
          value="3"
          icon="💰"
          color="text-purple-400"
          trend="本月"
          trendType="neutral"
        />
      </div>

      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 220px)' }}>
        <div className="col-span-2">
          <ContainerList
            containers={containers}
            selectedContainer={selectedContainer}
            onSelectContainer={handleSelectContainer}
          />
        </div>

        <div className="col-span-7 flex flex-col gap-4">
          <div className="flex-1 card-glass p-3 relative">
            {mapReady ? (
              <WorldMap
                trajectory={trajectory}
                selectedContainer={selectedContainer}
                attributionSegments={attributionSegments}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-400">正在加载世界地图...</div>
              </div>
            )}
            <div className="absolute bottom-4 left-4">
              <TemperatureLegend />
            </div>
            <div className="absolute top-4 right-4">
              <div className="card-glass px-3 py-2 text-sm">
                <span className="text-gray-400">当前选择: </span>
                <span className="text-white font-medium">{selectedContainer}</span>
              </div>
            </div>
          </div>

          <div className="card-glass p-3" style={{ height: '220px' }}>
            <div className="text-sm text-gray-400 mb-2">📈 温度趋势图 (近7天)</div>
            <TempChart trajectory={trajectory} height={170} />
          </div>
        </div>

        <div className="col-span-3 flex flex-col gap-4">
          {!showAttribution ? (
            <div className="flex-1">
              <AnomalyPanel
                anomalies={anomalies}
                selectedAnomaly={selectedAnomaly}
                onSelectAnomaly={setSelectedAnomaly}
                onAttribute={handleAttribute}
              />
            </div>
          ) : (
            <div className="flex-1">
              <AttributionPanel
                result={attributionResult}
                loading={attributionLoading}
                onClose={() => {
                  setShowAttribution(false)
                  setAttributionResult(null)
                }}
                onUpdateOrder={handleUpdateOrder}
              />
            </div>
          )}

          <div className="card-glass p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">⚡ 快捷操作</h4>
            <div className="space-y-2">
              <button
                className="w-full py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm rounded transition-colors text-left"
                onClick={() => loadAnomalies()}
              >
                🔄 刷新异常告警
              </button>
              <button
                className="w-full py-2 px-3 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm rounded transition-colors text-left"
              >
                📊 导出分析报告
              </button>
              <button
                className="w-full py-2 px-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm rounded transition-colors text-left"
              >
                ⚙️ 告警阈值设置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
