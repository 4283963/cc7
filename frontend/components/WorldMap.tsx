'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { TrajectoryPoint } from '@/lib/api'
import { tempToColor } from '@/lib/utils'

interface WorldMapProps {
  trajectory: TrajectoryPoint[]
  selectedContainer: string
  attributionSegments?: Array<{
    lat_start: number
    lon_start: number
    lat_end: number
    lon_end: number
    cause_type: string
    sea_area: string
    confidence: number
  }>
  onPointClick?: (point: TrajectoryPoint) => void
}

export default function WorldMap({
  trajectory,
  selectedContainer,
  attributionSegments = [],
  onPointClick,
}: WorldMapProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark')

      const handleResize = () => {
        chartInstance.current?.resize()
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        chartInstance.current?.dispose()
        chartInstance.current = null
      }
    }

    const lineData: any[] = []
    const scatterData: any[] = []
    const trailCoords: number[][] = []

    if (trajectory.length > 0) {
      for (let i = 0; i < trajectory.length - 1; i++) {
        const p1 = trajectory[i]
        const p2 = trajectory[i + 1]
        const midTemp = (p1.temperature + p2.temperature) / 2
        const color = tempToColor(midTemp)

        lineData.push({
          coords: [
            [p1.longitude, p1.latitude],
            [p2.longitude, p2.latitude],
          ],
          lineStyle: {
            color: color,
            width: 2.5,
            opacity: 0.9,
          },
        })

        trailCoords.push([p1.longitude, p1.latitude])
      }

      const lastPoint = trajectory[trajectory.length - 1]
      trailCoords.push([lastPoint.longitude, lastPoint.latitude])

      const sampleRate = Math.max(1, Math.floor(trajectory.length / 50))
      for (let i = 0; i < trajectory.length; i += sampleRate) {
        const p = trajectory[i]
        scatterData.push({
          value: [p.longitude, p.latitude, p.temperature],
          itemStyle: {
            color: tempToColor(p.temperature),
          },
          timestamp: p.timestamp,
          temp: p.temperature,
          humidity: p.humidity,
        })
      }
    }

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
          if (params.seriesType === 'scatter') {
            const data = params.data
            return `
              <div style="padding: 4px;">
                <div style="font-weight: 600; margin-bottom: 6px;">📍 位置信息</div>
                <div>温度: <span style="color: ${data.itemStyle?.color || '#fff'}; font-weight: 600;">${data.value[2] > 0 ? '+' : ''}${data.value[2].toFixed(1)}°C</span></div>
                <div>湿度: ${data.humidity?.toFixed(1)}%</div>
                <div>经度: ${data.value[0].toFixed(4)}</div>
                <div>纬度: ${data.value[1].toFixed(4)}</div>
                <div style="margin-top: 4px; color: #9ca3af; font-size: 12px;">${data.timestamp}</div>
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
      series: [
        {
          name: '航线轨迹',
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 2,
          effect: {
            show: true,
            period: 6,
            trailLength: 0.1,
            symbol: 'arrow',
            symbolSize: 6,
            color: '#60a5fa',
          },
          lineStyle: {
            width: 2,
            opacity: 0.6,
            curveness: 0.1,
          },
          data: lineData,
        },
        {
          name: '温度采样点',
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 3,
          symbolSize: 8,
          data: scatterData,
        },
        {
          name: '归因区段',
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 4,
          data: attrLines,
          silent: false,
        },
      ],
    }

    chartInstance.current.setOption(option, true)

    const handleClick = (params: any) => {
      if (params.seriesType === 'scatter' && onPointClick) {
        const point = trajectory.find(
          (p) =>
            Math.abs(p.longitude - params.data.value[0]) < 0.001 &&
            Math.abs(p.latitude - params.data.value[1]) < 0.001
        )
        if (point) {
          onPointClick(point)
        }
      }
    }

    chartInstance.current.on('click', handleClick)

    return () => {
      chartInstance.current?.off('click', handleClick)
    }
  }, [trajectory, selectedContainer, attributionSegments, onPointClick])

  return (
    <div
      ref={chartRef}
      className="w-full h-full"
      style={{ minHeight: '500px' }}
    />
  )
}
