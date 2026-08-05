"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { CategorySalesRow, RevenuePoint, StatusBreakdown, TopProductRow } from "@/lib/types"

const CHART_COLORS = ["#10b981", "#8b5cf6", "#f59e0b", "#0ea5e9", "#ec4899", "#22c55e", "#6366f1", "#f43f5e"]

function tooltipStyle() {
  return {
    contentStyle: {
      background: "hsl(240 25% 9%)",
      border: "1px solid hsl(240 20% 20%)",
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: "hsl(210 40% 90%)" },
  }
}

export function RevenueTrendChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 20% 15%)" />
          <XAxis dataKey="date" tick={{ fill: "hsl(217 15% 62%)", fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fill: "hsl(217 15% 62%)", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle()} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue (₹)"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#revFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TopProductsBar({ data }: { data: TopProductRow[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 7)} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 20% 15%)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "hsl(217 15% 62%)", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="product_name"
            width={120}
            tick={{ fill: "hsl(210 40% 85%)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip {...tooltipStyle()} />
          <Bar dataKey="revenue" name="Revenue (₹)" radius={[0, 6, 6, 0]}>
            {data.slice(0, 7).map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryDonut({ data }: { data: CategorySalesRow[] }) {
  const rows = data.slice(0, 6)
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="revenue"
            nameKey="category_name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            stroke="hsl(240 25% 7%)"
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle()} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StatusBar({ data }: { data: StatusBreakdown[] }) {
  const colors: Record<string, string> = {
    Pending: "#f59e0b",
    Shipped: "#0ea5e9",
    Delivered: "#10b981",
    Cancelled: "#f43f5e",
  }
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 20% 15%)" vertical={false} />
          <XAxis dataKey="status" tick={{ fill: "hsl(217 15% 62%)", fontSize: 12 }} tickLine={false} />
          <YAxis tick={{ fill: "hsl(217 15% 62%)", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle()} />
          <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.status} fill={colors[d.status] || "#6366f1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
