import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  LabelList,
} from 'recharts'
import type { ChartInstruction, ChartSeries } from '../../lib/discovery/types'
import type { QueryResult } from '../../lib/discovery/queryEngine'
import { formatMonthName, formatPercent, formatCurrency } from '../../lib/discovery/formatters'

const DEFAULT_COLORS = [
  '#1976d2',
  '#2e7d32',
  '#ed6c02',
  '#9c27b0',
  '#0288d1',
  '#388e3c',
  '#d32f2f',
  '#7b1fa2',
]

function formatTooltipValue(value: unknown, dataKey: string): string {
  if (value == null) return ''
  const key = String(dataKey).toLowerCase()
  if (key.includes('revenue') || key.includes('price') || key.includes('amount')) {
    const n = Number(value)
    return Number.isNaN(n) ? String(value) : formatCurrency(n)
  }
  if (key.includes('percent') || key.includes('pct') || key.includes('rate')) {
    const n = Number(value)
    return Number.isNaN(n) ? String(value) : formatPercent(n)
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(value)) {
    return formatMonthName(value.slice(0, 7))
  }
  const n = Number(value)
  if (!Number.isNaN(n) && Number.isInteger(n)) return String(n)
  if (!Number.isNaN(n)) return n.toLocaleString('en-GB', { maximumFractionDigits: 2 })
  return String(value)
}

interface ChartTooltipProps {
  active?: boolean
  payload?: { name: string; value: unknown; dataKey: string; color: string }[]
  label?: string
  xAxisKey?: string
  formatX?: (v: unknown) => string
}

function ChartTooltip({ active, payload, label, xAxisKey, formatX }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const displayLabel = xAxisKey && label != null ? formatX?.(label) ?? String(label) : label
  return (
    <div className="rounded-lg border border-black/12 bg-white px-3 py-2 shadow-md text-sm">
      {displayLabel != null && (
        <p className="font-medium text-[rgba(0,0,0,0.87)] mb-1">{displayLabel}</p>
      )}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={p.dataKey} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-[rgba(0,0,0,0.6)]">{p.name || p.dataKey}:</span>
            <span className="font-medium text-[rgba(0,0,0,0.87)]">
              {formatTooltipValue(p.value, p.dataKey)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function getSeriesColor(series: ChartSeries, index: number): string {
  if (series.color) return series.color
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

interface OutputChartProps {
  queryResult: QueryResult
  chartInstruction: ChartInstruction
  /** Optional ref or ref callback for the chart container (e.g. for PNG/JPG export) */
  containerRef?: React.Ref<HTMLDivElement | null>
}

export function OutputChart({ queryResult, chartInstruction, containerRef }: OutputChartProps) {
  const { rows } = queryResult
  const {
    chartType,
    title,
    xAxis,
    yAxis,
    series,
    showTooltip = true,
    showDataLabels = true,
    stacked = false,
  } = chartInstruction

  const data = useMemo(() => rows as Record<string, unknown>[], [rows])
  const xKey = xAxis?.dataKey ?? (data[0] && typeof data[0] === 'object' ? Object.keys(data[0] as object).find((k) => k !== 'payload') : undefined) ?? 'name'

  /** Resolve series dataKey to an actual key in data (handles LLM returning "Weekly Revenue" when data has "revenue") */
  const resolveDataKey = useMemo(() => {
    const keys = data[0] && typeof data[0] === 'object' ? Object.keys(data[0] as object) : []
    return (dataKey: string): string => {
      if (keys.includes(dataKey)) return dataKey
      const normalized = dataKey.toLowerCase().replace(/\s+/g, '_')
      let found = keys.find((k) => k.toLowerCase().replace(/\s+/g, '_') === normalized)
      if (found) return found
      const lastWord = dataKey.split(/\s+/).pop()?.toLowerCase()
      if (lastWord) found = keys.find((k) => k.toLowerCase() === lastWord)
      if (found) return found
      const firstNumeric = keys.find((k) => k !== xKey && typeof (data[0] as Record<string, unknown>)?.[k] === 'number')
      return firstNumeric ?? dataKey
    }
  }, [data, xKey])

  const formatX = (v: unknown) => {
    const s = String(v ?? '')
    if (/^\d{4}-W\d{2}$/.test(s)) return s
    if (/^\d{4}-\d{2}(-\d{2})?$/.test(s)) return formatMonthName(s.slice(0, 7))
    return s
  }

  if (!data.length) {
    return (
      <div className="rounded-lg border border-black/10 overflow-hidden p-6 text-center text-[rgba(0,0,0,0.6)] text-sm">
        No data to display
      </div>
    )
  }

  const commonProps = useMemo(() => {
    const bottomMargin = xAxis?.label ? 44 : 8
    const base = { margin: { top: 16, right: 16, left: 8, bottom: bottomMargin } as const }
    if (chartType === 'line' || chartType === 'area') {
      const sorted = [...data].sort((a, b) => {
        const ax = a[xKey]
        const bx = b[xKey]
        if (ax == null && bx == null) return 0
        if (ax == null) return 1
        if (bx == null) return -1
        return String(ax).localeCompare(String(bx), undefined, { numeric: true })
      })
      return { ...base, data: sorted }
    }
    return { ...base, data }
  }, [data, chartType, xKey, xAxis?.label])

  const showLegendActual = chartInstruction.showLegend !== false
  const showGridActual = chartInstruction.showGrid !== false

  const renderCartesian = (children: React.ReactNode) => (
    <>
      {showGridActual && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />}
      <XAxis
        dataKey={xKey}
        tick={{ fontSize: 12 }}
        tickFormatter={(v) => formatX(v)}
        label={xAxis?.label ? { value: xAxis.label, position: 'insideBottom', offset: 12 } : undefined}
      />
      <YAxis
        tick={{ fontSize: 12 }}
        label={yAxis?.label ? { value: yAxis.label, angle: -90, position: 'insideLeft' } : undefined}
      />
      {showTooltip && (
        <Tooltip
          content={
            <ChartTooltip
              xAxisKey={xKey}
              formatX={formatX}
            />
          }
        />
      )}
      {children}
      {showLegendActual && <Legend wrapperStyle={{ fontSize: 12 }} />}
    </>
  )

  const renderChart = () => {
    switch (chartType) {
      case 'bar': {
        return (
          <BarChart key={`bar-${showLegendActual}-${showGridActual}`} {...commonProps}>
            {renderCartesian(
              series.map((s, i) => {
                const resolvedKey = resolveDataKey(s.dataKey)
                return (
                  <Bar
                    key={resolvedKey}
                    dataKey={resolvedKey}
                    name={s.name ?? s.dataKey}
                    fill={getSeriesColor(s, i)}
                    stackId={stacked ? 'stack1' : undefined}
                    isAnimationActive={true}
                  >
                    {showDataLabels && (
                      <LabelList
                        dataKey={resolvedKey}
                        position="top"
                        formatter={(value: unknown) => formatTooltipValue(value, resolvedKey)}
                        style={{ fontSize: 11 }}
                      />
                    )}
                  </Bar>
                )
              })
            )}
          </BarChart>
        )
      }
      case 'line': {
        return (
          <LineChart key={`line-${showLegendActual}-${showGridActual}`} {...commonProps}>
            {renderCartesian(
              series.map((s, i) => {
                const resolvedKey = resolveDataKey(s.dataKey)
                return (
                  <Line
                    key={resolvedKey}
                    type="monotone"
                    dataKey={resolvedKey}
                    name={s.name ?? s.dataKey}
                    stroke={getSeriesColor(s, i)}
                    strokeWidth={2}
                    strokeOpacity={1}
                    connectNulls={true}
                    dot={{ r: 4 }}
                    isAnimationActive={false}
                  >
                    {showDataLabels && (
                      <LabelList
                        dataKey={resolvedKey}
                        position="top"
                        formatter={(value: unknown) => formatTooltipValue(value, resolvedKey)}
                        style={{ fontSize: 11 }}
                      />
                    )}
                  </Line>
                )
              })
            )}
            {data.length > 8 && <Brush dataKey={xKey} height={24} tickFormatter={(v) => formatX(v)} />}
          </LineChart>
        )
      }
      case 'area': {
        return (
          <AreaChart key={`area-${showLegendActual}-${showGridActual}`} {...commonProps}>
            {renderCartesian(
              series.map((s, i) => {
                const resolvedKey = resolveDataKey(s.dataKey)
                return (
                  <Area
                    key={resolvedKey}
                    type="monotone"
                    dataKey={resolvedKey}
                    name={s.name ?? s.dataKey}
                    fill={getSeriesColor(s, i)}
                    stroke={getSeriesColor(s, i)}
                    stackId={stacked ? 'stack1' : undefined}
                    isAnimationActive={true}
                  >
                    {showDataLabels && (
                      <LabelList
                        dataKey={resolvedKey}
                        position="top"
                        formatter={(value: unknown) => formatTooltipValue(value, resolvedKey)}
                        style={{ fontSize: 11 }}
                      />
                    )}
                  </Area>
                )
              })
            )}
            {data.length > 8 && <Brush dataKey={xKey} height={24} tickFormatter={(v) => formatX(v)} />}
          </AreaChart>
        )
      }
      case 'pie': {
        const nameKey = xKey
        const valueKey = series[0] ? resolveDataKey(series[0].dataKey) : (Object.keys(data[0] as object).filter((k) => k !== nameKey)[0] ?? 'value')
        const pieData = data.map((row) => ({
          name: formatX(row[nameKey]),
          value: Number(row[valueKey]) || 0,
        }))
        return (
          <PieChart {...commonProps}>
            {showTooltip && (
              <Tooltip
                formatter={(value: unknown) => formatTooltipValue(value, valueKey)}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-black/12 bg-white px-3 py-2 shadow-md text-sm">
                      <p className="font-medium text-[rgba(0,0,0,0.87)]">{payload[0].name}</p>
                      <p className="text-[rgba(0,0,0,0.6)]">
                        {formatTooltipValue(payload[0].value, valueKey)}
                      </p>
                    </div>
                  ) : null
                }
              />
            )}
            {showLegendActual && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="80%"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              isAnimationActive={true}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        )
      }
      case 'scatter': {
        const xDataKey = xAxis?.dataKey ?? series[0]?.dataKey
        const yDataKey = series[1]?.dataKey ?? series[0]?.dataKey
        const scatterData = data.map((row) => ({
          x: Number(row[xDataKey]) || 0,
          y: Number(row[yDataKey]) || 0,
          name: formatX(row[xKey]),
        }))
        return (
          <ScatterChart {...commonProps}>
            {showGridActual && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />}
            <XAxis dataKey="x" name={xAxis?.label ?? xDataKey} tick={{ fontSize: 12 }} />
            <YAxis dataKey="y" name={yAxis?.label ?? yDataKey} tick={{ fontSize: 12 }} />
            {showTooltip && (
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-black/12 bg-white px-3 py-2 shadow-md text-sm">
                      <p className="font-medium text-[rgba(0,0,0,0.87)]">{payload[0].payload.name}</p>
                      <p className="text-[rgba(0,0,0,0.6)]">
                        {xDataKey}: {formatTooltipValue(payload[0].payload.x, xDataKey)}, {yDataKey}: {formatTooltipValue(payload[0].payload.y, yDataKey)}
                      </p>
                    </div>
                  ) : null
                }
              />
            )}
            {showLegendActual && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <Scatter data={scatterData} fill={DEFAULT_COLORS[0]} name={series[0]?.name ?? yDataKey} />
          </ScatterChart>
        )
      }
      case 'radar': {
        const keys = series.map((s) => resolveDataKey(s.dataKey))
        const radarData = data.map((row) => {
          const out: Record<string, unknown> = { subject: formatX(row[xKey]) }
          keys.forEach((k) => { out[k] = row[k] })
          return out
        })
        return (
          <RadarChart data={radarData} margin={commonProps.margin}>
            <PolarGrid stroke="rgba(0,0,0,0.1)" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fontSize: 11 }} />
            {showTooltip && (
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-black/12 bg-white px-3 py-2 shadow-md text-sm">
                      <p className="font-medium text-[rgba(0,0,0,0.87)]">{payload[0].payload.subject}</p>
                      {payload.map((p, idx) => (
                        <p key={typeof p.dataKey === 'string' ? p.dataKey : idx} className="text-[rgba(0,0,0,0.6)]">
                          {p.name}: {formatTooltipValue(p.value, typeof p.dataKey === 'string' ? p.dataKey : 'value')}
                        </p>
                      ))}
                    </div>
                  ) : null
                }
              />
            )}
            {showLegendActual && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s, i) => {
              const resolvedKey = resolveDataKey(s.dataKey)
              return (
                <Radar
                  key={resolvedKey}
                  dataKey={resolvedKey}
                  name={s.name ?? s.dataKey}
                  stroke={getSeriesColor(s, i)}
                  fill={getSeriesColor(s, i)}
                  fillOpacity={0.3}
                  isAnimationActive={true}
                />
              )
            })}
          </RadarChart>
        )
      }
      case 'composed': {
        const labelList = (resolvedKey: string) =>
          showDataLabels ? (
            <LabelList
              dataKey={resolvedKey}
              position="top"
              formatter={(value: unknown) => formatTooltipValue(value, resolvedKey)}
              style={{ fontSize: 11 }}
            />
          ) : null
        return (
          <ComposedChart key={`composed-${showLegendActual}-${showGridActual}`} {...commonProps}>
            {renderCartesian(
              series.map((s, i) => {
                const resolvedKey = resolveDataKey(s.dataKey)
                const color = getSeriesColor(s, i)
                const type = s.type ?? 'bar'
                if (type === 'line') {
                  return (
                    <Line
                      key={resolvedKey}
                      type="monotone"
                      dataKey={resolvedKey}
                      name={s.name ?? s.dataKey}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      isAnimationActive={true}
                    >
                      {labelList(resolvedKey)}
                    </Line>
                  )
                }
                if (type === 'area') {
                  return (
                    <Area
                      key={resolvedKey}
                      type="monotone"
                      dataKey={resolvedKey}
                      name={s.name ?? s.dataKey}
                      fill={color}
                      stroke={color}
                      stackId={s.stackId ?? (stacked ? 'stack1' : undefined)}
                      isAnimationActive={true}
                    >
                      {labelList(resolvedKey)}
                    </Area>
                  )
                }
                return (
                  <Bar
                    key={resolvedKey}
                    dataKey={resolvedKey}
                    name={s.name ?? s.dataKey}
                    fill={color}
                    stackId={s.stackId ?? (stacked ? 'stack1' : undefined)}
                    isAnimationActive={true}
                  >
                    {labelList(resolvedKey)}
                  </Bar>
                )
              })
            )}
          </ComposedChart>
        )
      }
      default:
        return (
          <BarChart key={`default-${showLegendActual}-${showGridActual}`} {...commonProps}>
            {renderCartesian(
              series.map((s, i) => {
                const resolvedKey = resolveDataKey(s.dataKey)
                return (
                  <Bar
                    key={resolvedKey}
                    dataKey={resolvedKey}
                    name={s.name ?? s.dataKey}
                    fill={getSeriesColor(s, i)}
                    isAnimationActive={true}
                  />
                )
              })
            )}
          </BarChart>
        )
    }
  }

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>} className="rounded-lg border border-black/10 overflow-hidden bg-white">
      {title && (
        <h3 className="px-4 py-2 text-sm font-medium text-[rgba(0,0,0,0.87)] border-b border-black/6">
          {title}
        </h3>
      )}
      <div className="p-4" style={{ minHeight: 360 }}>
        <ResponsiveContainer key={`${chartType}-${showLegendActual}-${showGridActual}`} width="100%" height={360}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
