"use client"

import { useState, useEffect } from "react"
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

export default function StatusDistribution({ data }: { data?: StatusData[] }) {
  const [chartData, setChartData] = useState<Array<{ name: string; value: number; total: number }>>([])
  const [loading, setLoading] = useState(!data)

  useEffect(() => {
    if (data) {
      setChartData(data.map((d) => ({ name: d.estado, value: d.count, total: d.sum })))
      return
    }

    fetch("/api/facturas/stats")
      .then((res) => res.json())
      .then((stats) => {
        setChartData((stats.porEstado || []).map((d: StatusData) => ({ name: d.estado, value: d.count, total: d.sum })))
      })
      .finally(() => setLoading(false))
  }, [data])

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
