"use client"

import { useState, useEffect, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface ProviderData {
  emisor_nombre: string
  count: number
  sum: number
}

export default function TopProviders({ data, refreshKey }: { data?: ProviderData[]; refreshKey?: number }) {
  const [remoteData, setRemoteData] = useState<ProviderData[]>([])
  const [loading, setLoading] = useState(!data)

  useEffect(() => {
    if (data) return
    setLoading(true)
    fetch("/api/facturas/stats")
      .then((res) => res.json())
      .then((stats) => setRemoteData(stats.topEmisores || []))
      .finally(() => setLoading(false))
  }, [data, refreshKey])

  const chartData = useMemo(() => {
    const source = data || remoteData
    return source.map((d) => ({
      name: d.emisor_nombre.length > 20 ? d.emisor_nombre.substring(0, 20) + "..." : d.emisor_nombre,
      facturas: d.count,
      total: d.sum,
    }))
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
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#a1a1aa" width={150} />
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
        <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
