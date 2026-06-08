export const tempToColor = (temp: number): string => {
  if (temp <= -18) return '#10b981'
  if (temp <= -15) return '#34d399'
  if (temp <= -12) return '#fbbf24'
  if (temp <= -8) return '#f97316'
  if (temp <= -3) return '#ef4444'
  return '#dc2626'
}

export const tempToColorAlpha = (temp: number, alpha = 0.8): string => {
  const color = tempToColor(temp)
  return color + Math.round(alpha * 255).toString(16).padStart(2, '0')
}

export const severityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return '#dc2626'
    case 'high':
      return '#f97316'
    case 'medium':
      return '#fbbf24'
    case 'low':
      return '#3b82f6'
    default:
      return '#6b7280'
  }
}

export const severityLabel = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return '严重'
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    default:
      return '未知'
  }
}

export const statusLabel = (status: string): string => {
  switch (status) {
    case 'ongoing':
      return '进行中'
    case 'resolved':
      return '已解决'
    case 'pending':
      return '待处理'
    case 'processing':
      return '处理中'
    case 'approved':
      return '已通过'
    case 'rejected':
      return '已拒绝'
    default:
      return status
  }
}

export const causeTypeLabel = (cause: string): string => {
  switch (cause) {
    case 'compressor_failure':
      return '制冷机故障'
    case 'high_solar_radiation':
      return '强光照照射'
    case 'combined':
      return '综合因素'
    case 'normal':
      return '正常'
    case 'other':
      return '其他原因'
    default:
      return cause
  }
}

export const formatTemperature = (temp: number): string => {
  return `${temp > 0 ? '+' : ''}${temp.toFixed(1)}°C`
}

export const causeIcon = (cause: string): string => {
  switch (cause) {
    case 'compressor_failure':
      return '⚙️'
    case 'high_solar_radiation':
      return '☀️'
    case 'combined':
      return '🔀'
    default:
      return '❓'
  }
}
