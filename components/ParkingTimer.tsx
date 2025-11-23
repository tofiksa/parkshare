"use client"

import { useEffect, useState } from "react"

interface ParkingTimerProps {
  startTime: Date
  pricePerMinute: number
}

export default function ParkingTimer({ startTime, pricePerMinute }: ParkingTimerProps) {
  const [duration, setDuration] = useState(0)
  const [estimatedPrice, setEstimatedPrice] = useState(0)

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const diff = now.getTime() - startTime.getTime()
      const minutes = Math.ceil(diff / (1000 * 60))
      setDuration(minutes)
      
      // Beregn estimert pris
      const price = Math.round((pricePerMinute * minutes) * 100) / 100
      setEstimatedPrice(price)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [startTime, pricePerMinute])

  const hours = Math.floor(duration / 60)
  const minutes = duration % 60
  const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000) % 60

  return (
    <div className="text-center">
      <div className="mb-4">
        <div className="text-6xl font-bold text-purple-600 mb-2">
          {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <p className="text-sm text-gray-600">Varighet</p>
      </div>
      <div className="bg-purple-50 rounded-lg p-4">
        <p className="text-sm text-gray-700 mb-1">Estimert pris</p>
        <p className="text-3xl font-bold text-purple-600">
          {estimatedPrice.toFixed(2)} NOK
        </p>
      </div>
    </div>
  )
}

