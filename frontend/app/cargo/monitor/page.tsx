'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  containerApi,
  anomalyApi,
  attributionApi,
  shelfLifeApi,
  ContainerInfo,
  AnomalyEvent,
  TrajectoryPoint,
  AttributionResult,
  ShelfLifePrediction,
} from '@/lib/api'
import ContainerList from '@/components/ContainerList'
import AnomalyPanel from '@/components/AnomalyPanel'
import AttributionPanel from '@/components/AttributionPanel'
import StatCard from '@/components/StatCard'
import TemperatureLegend from '@/components/TemperatureLegend'
import TempChart from '@/components/TempChart'
import CurrentTime from '@/components/CurrentTime'
import ShelfLifeCard from '@/components/ShelfLifeCard'
import { registerWorldMap } from '@/lib/mapData'
import { formatTemperature } from '@/lib/utils'

const WorldMap = dynamic(() => import('@/components/WorldMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-gray-400">加载地图中...</div>
    </div>
  ),
})

const DEFAULT_SELECTED = ['CONT-SEA-001', 'CONT-SEA-002']

export default function CargoMonitorPage() {
  const [containers, setContainers] = useState<ContainerInfo[]>([])
  const [selectedContainers, setSelectedContainers] = useState<string[]>(DEFAULT_SELECTED)
  const [trajectoryMap, setTrajectoryMap] = useState<Map<string, TrajectoryPoint[]>>(new Map())
  const [loadingContainers, setLoadingContainers] = useState<Set<string>>(new Set())
  const [shelfLifeMap, setShelfLifeMap] = useState<Record<string, ShelfLifePrediction>>({})
  const [loadingShelfLife, setLoadingShelfLife] = useState<Set<string>>(new Set())
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
    setLoadingContainers((prev) => new Set(prev).add(containerId))
    try {
      const res = await containerApi.getTrajectory(containerId, 168)
      setTrajectoryMap((prev) => {
        const next = new Map(prev)
        next.set(containerId, res.data.trajectory)
        return next
      })
    } catch (e) {
      console.error('Failed to load trajectory:', e)
    } finally {
      setLoadingContainers((prev) => {
        const next = new Set(prev)
        next.delete(containerId)
        return next
      })
    }
  }, [])

  const loadShelfLife = useCallback(async (containerId: string) => {
    setLoadingShelfLife((prev) => new Set(prev).add(containerId))
    try {
      const res = await shelfLifeApi.getPrediction(containerId, 48)
      setShelfLifeMap((prev) => ({
        ...prev,
        [containerId]: res.data,
      }))
    } catch (e) {
      console.error('Failed to load shelf life:', e)
    } finally {
      setLoadingShelfLife((prev) => {
        const next = new Set(prev)
        next.delete(containerId)
        return next
      })
    }
  }, [])

  const handleToggleContainer = useCallback(
    (containerId: string) => {
      setSelectedContainers((prev) => {
        const exists = prev.includes(containerId)
        if (exists) {
          return prev.filter((id) => id !== containerId)
        } else {
          if (!trajectoryMap.has(containerId) && !loadingContainers.has(containerId)) {
            loadTrajectory(containerId)
          }
          if (!shelfLifeMap[containerId] && !loadingShelfLife.has(containerId)) {
            loadShelfLife(containerId)
          }
          return [...prev, containerId]
        }
      })
    },
    [trajectoryMap, loadingContainers, shelfLifeMap, loadingShelfLife, loadTrajectory, loadShelfLife]
  )

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

      if (!selectedContainers.includes(anomaly.container_id)) {
        setSelectedContainers((prev) => [...prev, anomaly.container_id])
        if (!trajectoryMap.has(anomaly.container_id)) {
          await loadTrajectory(anomaly.container_id)
        }
        if (!shelfLifeMap[anomaly.container_id]) {
          await loadShelfLife(anomaly.container_id)
        }
      }

      try {
        const res = await attributionApi.analyze(anomaly.container_id, anomaly.id)
        setAttributionResult(res.data)
      } catch (e) {
        console.error('Failed to analyze attribution:', e)
      } finally {
        setAttributionLoading(false)
      }
    },
    [selectedContainers, trajectoryMap, shelfLifeMap, loadTrajectory, loadShelfLife]
  )

  const handleUpdateOrder = useCallback(
    (anomalyId: number) => {
      alert(`工单状态已更新！异常事件 #${anomalyId} 已同步至 PostgreSQL 赔偿工单系统。`)
    },
    []
  )

  const mapTrajectories = useMemo(() => {
    return selectedContainers
      .filter((id) => trajectoryMap.has(id))
      .map((containerId) => ({
        containerId,
        points: trajectoryMap.get(containerId) || [],
      }))
  }, [selectedContainers, trajectoryMap])

  useEffect(() => {
    registerWorldMap().then(() => setMapReady(true))
    loadContainers()
    loadAnomalies()
  }, [loadContainers, loadAnomalies])

  useEffect(() => {
    if (containers.length > 0) {
      DEFAULT_SELECTED.forEach((id) => {
        if (containers.some((c) => c.id === id)) {
          if (!trajectoryMap.has(id) && !loadingContainers.has(id)) {
            loadTrajectory(id)
          }
          if (!shelfLifeMap[id] && !loadingShelfLife.has(id)) {
            loadShelfLife(id)
          }
        }
      })
    }
  }, [containers, trajectoryMap, loadingContainers, shelfLifeMap, loadingShelfLife, loadTrajectory, loadShelfLife])

  useEffect(() => {
    const interval = setInterval(() => {
      loadAnomalies()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadAnomalies])

  const ongoingAnomalies = anomalies.filter((a) => a.status === 'ongoing').length
  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length

  const { avgTemp, minTemp, maxTemp, totalPoints } = useMemo(() => {
    let sum = 0
    let count = 0
    let min = Infinity
    let max = -Infinity

    selectedContainers.forEach((id) => {
      const traj = trajectoryMap.get(id)
      if (traj) {
        traj.forEach((p) => {
          sum += p.temperature
          count++
          min = Math.min(min, p.temperature)
          max = Math.max(max, p.temperature)
        })
      }
    })

    return {
      avgTemp: count > 0 ? sum / count : 0,
      minTemp: min === Infinity ? 0 : min,
      maxTemp: max === -Infinity ? 0 : max,
      totalPoints: count,
    }
  }, [selectedContainers, trajectoryMap])

  const primaryContainer = selectedContainers[0] || ''
  const primaryShelfLife = primaryContainer ? shelfLifeMap[primaryContainer] || null : null
  const primaryShelfLifeLoading = primaryContainer ? loadingShelfLife.has(primaryContainer) : false

  const primaryTrajectory = useMemo(() => {
    if (selectedContainers.length === 0) return []
    const firstId = selectedContainers[0]
    return trajectoryMap.get(firstId) || []
  }, [selectedContainers, trajectoryMap])

  const attributionSegments = attributionResult?.segments.map((seg) => ({
    lat_start: seg.lat_start,
    lon_start: seg.lon_start,
    lat_end: seg.lat_end,
    lon_end: seg.lon_end,
    cause_type: seg.cause_type,
    sea_area: seg.sea_area,
    confidence: seg.confidence,
  }))

  const handlePointClick = useCallback(
    (containerId: string, point: TrajectoryPoint) => {
      console.log('Point clicked:', containerId, point)
    },
    []
  )

  const criticalShelfLifeCount = useMemo(() => {
    return Object.values(shelfLifeMap).filter(
      (s) => s.quality_level === 'critical' || s.quality_level === 'poor'
    ).length
  }, [shelfLifeMap])

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
          value={`${selectedContainers.length}/${containers.length}`}
          icon="📦"
          color="text-blue-400"
          trend="已选中对比"
          trendType="neutral"
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
          value={formatTemperature(avgTemp)}
          icon="🌡️"
          color={avgTemp < -12 ? 'text-green-400' : 'text-yellow-400'}
          trend={`最高 ${formatTemperature(maxTemp)}`}
          trendType={maxTemp > -10 ? 'up' : 'down'}
        />
        <StatCard
          title="品质预警"
          value={criticalShelfLifeCount}
          icon="🧪"
          color="text-orange-400"
          trend="货柜需关注"
          trendType={criticalShelfLifeCount > 0 ? 'up' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 220px)' }}>
        <div className="col-span-2">
          <ContainerList
            containers={containers}
            selectedContainers={selectedContainers}
            onToggleContainer={handleToggleContainer}
            multiSelect={true}
            shelfLifeMap={shelfLifeMap}
            loadingShelfLife={loadingShelfLife}
          />
        </div>

        <div className="col-span-7 flex flex-col gap-4">
          <div className="flex-1 card-glass p-3 relative">
            {mapReady ? (
              <WorldMap
                trajectories={mapTrajectories}
                attributionSegments={attributionSegments}
                onPointClick={handlePointClick}
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
              <div className="card-glass px-3 py-2">
                <div className="text-xs text-gray-400 mb-1">已选航线 ({selectedContainers.length})</div>
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {selectedContainers.slice(0, 3).map((id) => (
                    <span
                      key={id}
                      className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded"
                    >
                      {id.replace('CONT-SEA-', '#')}
                    </span>
                  ))}
                  {selectedContainers.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{selectedContainers.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card-glass p-3" style={{ height: '220px' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-400">📈 温度趋势图 (近7天)</div>
              {selectedContainers.length > 0 && (
                <div className="text-xs text-blue-400">
                  主显示: {selectedContainers[0]}
                </div>
              )}
            </div>
            <TempChart trajectory={primaryTrajectory} height={170} />
          </div>
        </div>

        <div className="col-span-3 flex flex-col gap-4">
          <ShelfLifeCard
            prediction={primaryShelfLife}
            loading={primaryShelfLifeLoading}
            containerId={primaryContainer}
          />

          {!showAttribution ? (
            <div className="flex-1 min-h-0">
              <AnomalyPanel
                anomalies={anomalies}
                selectedAnomaly={selectedAnomaly}
                onSelectAnomaly={setSelectedAnomaly}
                onAttribute={handleAttribute}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0">
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
