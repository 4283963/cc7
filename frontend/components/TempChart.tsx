'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { TrajectoryPoint } from '@/lib/api'
import { tempToColor } from '@/lib/utils'

interface TempChartProps {
  trajectory: TrajectoryPoint[]
  height?: number
}

export default function TempChart({ trajectory, height = 200 }: TempChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark')
      const handleResize = () => chartInstance.current?.resize()
      window.addEventListener('resize', handleResize)
      return () => {
        window.removeEventListener('resize', handleResize)
        chartInstance.current?.dispose()
        chartInstance.current = null
      }
    }

    const times = trajectory.map((p) => p.timestamp)
    const temps = trajectory.map((p) => p.temperature)

    const data = times.map((t, i) => {
      const temp = temps[i]
      return {
        value: [t, temp],
        itemStyle: {
          color: tempToColor(temp),
        },
      }
    })

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        left: 50,
        right: 20,
        top: 30,
        bottom: 30,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        borderColor: '#374151',
        textStyle: { color: '#e5e7eb' },
        formatter: (params: any) => {
          if (params && params.length > 0) {
            const p = params[0]
            const temp = p.value[1]
            return `
              <div style="padding: 4px;">
                <div>${p.axisValueLabel}</div>
                <div style="margin-top: 4px;">
                  温度: <span style="color: ${tempToColor(temp)}; font-weight: 600;">
                    ${temp > 0 ? '+' : ''}${temp.toFixed(1)}°C
                  </span>
                </div>
              </div>
            `
          }
          return ''
        },
      },
      xAxis: {
        type: 'category',
        data: times,
        axisLine: { lineStyle: { color: '#374151' } },
        axisLabel: {
          color: '#9ca3af',
          fontSize: 10,
          formatter: (value: string) => {
            const date = new Date(value)
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`
          },
          interval: Math.floor(times.length / 6),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '温度 °C',
        nameTextStyle: { color: '#9ca3af', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1f2937' } },
      },
      series: [
        {
          name: '温度',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          data: data,
          lineStyle: {
            width: 2,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#10b981' },
              { offset: 0.4, color: '#fbbf24' },
              { offset: 0.7, color: '#f97316' },
              { offset: 1, color: '#ef4444' },
            ]),
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
              { offset: 0.5, color: 'rgba(251, 191, 36, 0.15)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.1)' },
            ]),
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
            data: [{ yAxis: -10, label: { formatter: '警戒线 -10°C', color: '#ef4444' } }],
          },
        },
      ],
    }

    chartInstance.current.setOption(option, true)
  }, [trajectory])

  return <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
}
