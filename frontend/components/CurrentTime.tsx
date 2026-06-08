'use client'

import { useState, useEffect } from 'react'

export default function CurrentTime() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleString('zh-CN'))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return <span className="text-sm text-gray-500">{time}</span>
}
