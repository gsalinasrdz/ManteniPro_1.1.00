"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from "recharts";

export type GastosDataPoint = {
  mes: string;
  [sucursal: string]: number | string;
};

interface GastosChartProps {
  data: GastosDataPoint[];
  sucursales: { id: string; nombre: string }[];
}

const PALETTE = [
  "#185FA5", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899",
];

function fmtMonto(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return `$${v}`;
}

export function GastosChart({ data, sucursales }: GastosChartProps) {
  if (data.every((d) => sucursales.every((s) => !d[s.nombre]))) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-text-tertiary">
        Sin datos de gasto para los últimos 6 meses
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,.07)" />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 10, fill: "#888" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#888" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmtMonto}
          width={42}
        />
        <Tooltip
          formatter={(value) => [
            `$${Number(value).toLocaleString("es-MX", { minimumFractionDigits: 0 })}`,
          ]}
          contentStyle={{ fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 8 }}
        />
        {sucursales.map((s, i) => (
          <Bar
            key={s.id}
            dataKey={s.nombre}
            fill={PALETTE[i % PALETTE.length]}
            radius={[3, 3, 0, 0]}
            maxBarSize={20}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
