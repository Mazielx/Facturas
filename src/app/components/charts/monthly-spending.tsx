"use client"

import { useState, useEffect, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface MonthlyData {
  mes: string
  count: number
  sum: number
}

export default function MonthlySpending({ data, refreshKey }: { data?: MonthlyData[]; refreshKey?: number }) {
  const [remoteData, setRemoteData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(!data)

  useEffect(() => {
    if (data) return
    setLoading(true)
    fetch("/api/facturas/stats")
      .then((res) => res.json())
      .then((stats) => setRemoteData(stats.porMes || []))
      .finally(() => setLoading(false))
  }, [data, refreshKey])

  const chartData = useMemo(() => {
    const source = data || remoteData
    return source
      .slice()
      .reverse()
      .map((d) => ({ name: d.mes, facturas: d.count, total: d.sum }))
  }, [data, remoteData])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-zinc-400">Cargando...</div>
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        Sin datos disponibles
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
        <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "none",
            borderRadius: "8px",
            color: "#fafafa",
          }}
          formatter={(value) => [
            new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value)),
            "Total",
          ]}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
