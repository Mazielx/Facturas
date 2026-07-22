"use client"

import { useState, useEffect, useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface StatusData {
  estado: string
  count: number
  sum: number
}

const COLORS: Record<string, string> = {
  pagada: "#22c55e",
  pendiente: "#f59e0b",
  cancelada: "#ef4444",
}

export default function StatusDistribution({ data, refreshKey }: { data?: StatusData[]; refreshKey?: number }) {
  const [remoteData, setRemoteData] = useState<StatusData[]>([])
  const [loading, setLoading] = useState(!data)

  useEffect(() => {
    if (data) return
    setLoading(true)
    fetch("/api/facturas/stats")
      .then((res) => res.json())
      .then((stats) => setRemoteData(stats.porEstado || []))
      .finally(() => setLoading(false))
  }, [data, refreshKey])

  const chartData = useMemo(() => {
    const source = data || remoteData
    return source.map((d) => ({ name: d.estado, value: d.count, total: d.sum }))
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
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={4}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={COLORS[entry.name] || "#71717a"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "none",
            borderRadius: "8px",
            color: "#fafafa",
          }}
          formatter={(value, name) => [`${value} facturas`, name]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
