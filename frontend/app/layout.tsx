import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '冷链物流监控大屏 | Cold Chain Monitor',
  description: '跨境海运冷链物流集装箱温度异常与轨迹归因分析系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
