'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import * as echarts from 'echarts'
import { TrajectoryPoint } from '@/lib/api'
import { tempToColor } from '@/lib/utils'

interface ContainerTrajectory {
  containerId: string
  points: TrajectoryPoint[]
  color?: string
}

interface WorldMapProps {
  trajectories: ContainerTrajectory[]
  attributionSegments?: Array<{
    lat_start: number
    lon_start: number
    lat_end: number
    lon_end: number
    cause_type: string
    sea_area: string
    confidence: number
  }>
  onPointClick?: (containerId: string, point: TrajectoryPoint) => void
}

const CONTAINER_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
]

export default function WorldMap({
  trajectories,
  attributionSegments = [],
  onPointClick,
}: WorldMapProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const pointDataRef = useRef<
    Map<
      string,
      Map<
        string,
        { containerId: string; point: TrajectoryPoint }
      >
    >
  >(new Map())

  const getContainerColor = useCallback((index: number) => {
    return CONTAINER_COLORS[index % CONTAINER_COLORS.length]
  }, [])

  const handleClick = useCallback(
    (params: any) => {
      if (!onPointClick) return

      if (params.seriesType === 'scatter' && params.data) {
        const seriesName = params.seriesName
        const data = params.data
        const containerId = data.containerId || seriesName

        const point: TrajectoryPoint = {
          timestamp: data.timestamp,
          latitude: data.value[1],
          longitude: data.value[0],
          temperature: data.value[2],
          humidity: data.humidity || 0,
        }

        onPointClick(containerId, point)
      }
    },
    [onPointClick]
  )

  useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark')

      chartInstance.current.on('click', handleClick)

      const handleResize = () => {
        chartInstance.current?.resize()
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        chartInstance.current?.off('click', handleClick)
        chartInstance.current?.dispose()
        chartInstance.current = null
      }
    }
  }, [handleClick])

  const chartOption = useMemo(() => {
    pointDataRef.current.clear()

    const series: echarts.SeriesOption[] = []

    trajectories.forEach((traj, trajIndex) => {
      const { containerId, points } = traj
      const baseColor = traj.color || getContainerColor(trajIndex)

      const pointMap = new Map<string, { containerId: string; point: TrajectoryPoint }>()

      if (points.length >= 2) {
        const lineData: any[] = []

        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i]
          const p2 = points[i + 1]
          const midTemp = (p1.temperature + p2.temperature) / 2
          const lineColor = tempToColor(midTemp)

          lineData.push({
            coords: [
              [p1.longitude, p1.latitude],
              [p2.longitude, p2.latitude],
            ],
            fromName: containerId,
            toName: containerId,
            lineStyle: {
              color: lineColor,
              width: 2.5,
              opacity: 0.85,
            },
          })
        }

        series.push({
          name: `${containerId}-航线`,
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 2 + trajIndex * 2,
          effect: {
            show: true,
            period: 6 + trajIndex * 2,
            trailLength: 0.1,
            symbol: 'arrow',
            symbolSize: 6,
            color: baseColor,
          },
          lineStyle: {
            width: 2,
            opacity: 0.5,
            curveness: 0.05,
          },
          data: lineData,
          silent: true,
        })

        const scatterData: any[] = []
        const sampleRate = Math.max(1, Math.floor(points.length / 40))

        for (let i = 0; i < points.length; i += sampleRate) {
          const p = points[i]
          const key = `${p.longitude.toFixed(4)}_${p.latitude.toFixed(4)}`

          pointMap.set(key, { containerId, point: p })

          scatterData.push({
            name: containerId,
            value: [p.longitude, p.latitude, p.temperature],
            itemStyle: {
              color: tempToColor(p.temperature),
              borderColor: baseColor,
              borderWidth: 1.5,
            },
            containerId: containerId,
            timestamp: p.timestamp,
            temp: p.temperature,
            humidity: p.humidity,
          })
        }

        const endPoint = points[points.length - 1]
        scatterData.push({
          name: containerId,
          value: [endPoint.longitude, endPoint.latitude, endPoint.temperature],
          itemStyle: {
            color: baseColor,
            borderColor: '#fff',
            borderWidth: 2,
          },
          symbolSize: 14,
          containerId: containerId,
          timestamp: endPoint.timestamp,
          temp: endPoint.temperature,
          humidity: endPoint.humidity,
          isEndPoint: true,
        })

        series.push({
          name: `${containerId}-采样点`,
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 3 + trajIndex * 2,
          symbolSize: (data: any) => {
            return data.isEndPoint ? 14 : 7
          },
          data: scatterData,
          label: {
            show: true,
            formatter: (params: any) => {
              if (params.data.isEndPoint) {
                return `{name|${params.data.containerId}}`
              }
              return ''
            },
            position: 'right',
            rich: {
              name: {
                color: '#fff',
                fontSize: 10,
                fontWeight: 'bold',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: [2, 6],
                borderRadius: 3,
              },
            },
          },
          emphasis: {
            scale: 1.5,
          },
        })

        pointDataRef.current.set(containerId, pointMap)
      }
    })

    const attrLines: any[] = []
    attributionSegments.forEach((seg) => {
      let color = '#f59e0b'
      if (seg.cause_type === 'compressor_failure') {
        color = '#ef4444'
      } else if (seg.cause_type === 'high_solar_radiation') {
        color = '#f97316'
      }

      attrLines.push({
        coords: [
          [seg.lon_start, seg.lat_start],
          [seg.lon_end, seg.lat_end],
        ],
        lineStyle: {
          color: color,
          width: 5,
          opacity: seg.confidence * 0.8,
          type: 'solid',
        },
        emphasis: {
          lineStyle: {
            width: 7,
          },
        },
        name: `${seg.sea_area} - ${seg.cause_type}`,
      })
    })

    if (attrLines.length > 0) {
      series.push({
        name: '归因区段',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 100,
        data: attrLines,
        silent: false,
      })
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        borderColor: '#374151',
        textStyle: {
          color: '#e5e7eb',
        },
        formatter: (params: any) => {
          if (params.seriesType === 'scatter' && params.data) {
            const data = params.data
            const tempColor = data.itemStyle?.color || '#fff'
            return `
              <div style="padding: 4px; min-width: 160px;">
                <div style="font-weight: 600; margin-bottom: 6px; color: ${data.containerId ? '#60a5fa' : '#fff'}">
                  📍 ${data.containerId || '位置信息'}
                </div>
                <div style="margin: 4px 0;">
                  温度: <span style="color: ${tempColor}; font-weight: 600;">
                    ${data.value[2] > 0 ? '+' : ''}${data.value[2].toFixed(1)}°C
                  </span>
                </div>
                <div style="margin: 4px 0;">湿度: ${data.humidity?.toFixed(1)}%</div>
                <div style="margin: 4px 0;">经度: ${data.value[0].toFixed(4)}</div>
                <div style="margin: 4px 0;">纬度: ${data.value[1].toFixed(4)}</div>
                <div style="margin-top: 6px; color: #9ca3af; font-size: 11px; border-top: 1px solid #374151; padding-top: 6px;">
                  ${data.timestamp || ''}
                </div>
              </div>
            `
          }
          if (params.seriesType === 'lines' && params.seriesName === '归因区段') {
            return `<div style="padding: 4px; font-weight: 600;">${params.name}</div>`
          }
          return ''
        },
      },
      geo: {
        map: 'world',
        roam: true,
        zoom: 1.2,
        center: [120, 20],
        label: {
          show: false,
        },
        itemStyle: {
          areaColor: '#1e293b',
          borderColor: '#334155',
          borderWidth: 0.5,
        },
        emphasis: {
          itemStyle: {
            areaColor: '#334155',
          },
          label: {
            show: false,
          },
        },
      },
      series: series,
    }

    return option
  }, [trajectories, attributionSegments, getContainerColor])

  useEffect(() => {
    if (!chartInstance.current) return

    try {
      chartInstance.current.setOption(chartOption, {
        notMerge: true,
        lazyUpdate: false,
      })
    } catch (e) {
      console.error('ECharts setOption error:', e)
    }
  }, [chartOption])

  return (
    <div
      ref={chartRef}
      className="w-full h-full"
      style={{ minHeight: '500px' }}
    />
  )
}
