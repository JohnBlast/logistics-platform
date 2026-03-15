import type { ChartInstruction, ChartType } from '../../lib/discovery/types'

const CHART_TYPES: { type: ChartType; label: string; title: string }[] = [
  { type: 'bar', label: 'Bar', title: 'Bar chart' },
  { type: 'line', label: 'Line', title: 'Line chart' },
  { type: 'area', label: 'Area', title: 'Area chart' },
  { type: 'pie', label: 'Pie', title: 'Pie chart' },
  { type: 'composed', label: 'Composed', title: 'Composed (bar + line)' },
]

const CHART_TYPES_WITH_GRID = ['bar', 'line', 'area', 'scatter', 'composed'] as const
const CHART_TYPES_WITH_DATA_LABELS = ['bar', 'line', 'area', 'composed'] as const

function supportsGrid(chartType: ChartType): boolean {
  return CHART_TYPES_WITH_GRID.includes(chartType as (typeof CHART_TYPES_WITH_GRID)[number])
}

function supportsDataLabels(chartType: ChartType): boolean {
  return CHART_TYPES_WITH_DATA_LABELS.includes(chartType as (typeof CHART_TYPES_WITH_DATA_LABELS)[number])
}

interface ChartToolbarProps {
  chartInstruction: ChartInstruction
  onChartInstructionChange: (next: ChartInstruction) => void
}

export function ChartToolbar({ chartInstruction, onChartInstructionChange }: ChartToolbarProps) {
  const update = (patch: Partial<ChartInstruction>) => {
    onChartInstructionChange({ ...chartInstruction, ...patch })
  }

  const canUseGrid = supportsGrid(chartInstruction.chartType)
  const canUseDataLabels = supportsDataLabels(chartInstruction.chartType)

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-black/6 bg-black/[0.02]">
      <span className="text-xs font-medium text-[rgba(0,0,0,0.6)] mr-1">Chart type:</span>
      {CHART_TYPES.map(({ type, label, title }) => (
        <button
          key={type}
          type="button"
          title={title}
          onClick={() => update({ chartType: type })}
          className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
            chartInstruction.chartType === type
              ? 'bg-primary text-white'
              : 'bg-white border border-black/12 text-[rgba(0,0,0,0.87)] hover:bg-black/4'
          }`}
        >
          {label}
        </button>
      ))}
      <span className="w-px h-5 bg-black/12 mx-1" aria-hidden />
      <label className="flex items-center gap-1.5 text-xs text-[rgba(0,0,0,0.87)] cursor-pointer">
        <input
          type="checkbox"
          checked={chartInstruction.showLegend !== false}
          onChange={(e) => update({ showLegend: e.target.checked })}
          className="rounded border-black/20"
        />
        Legend
      </label>
      <label
        className={`flex items-center gap-1.5 text-xs cursor-pointer ${canUseGrid ? 'text-[rgba(0,0,0,0.87)]' : 'text-[rgba(0,0,0,0.38)]'}`}
        title={!canUseGrid ? 'Grid is not available for this chart type' : undefined}
      >
        <input
          type="checkbox"
          checked={chartInstruction.showGrid !== false}
          onChange={(e) => update({ showGrid: e.target.checked })}
          disabled={!canUseGrid}
          className="rounded border-black/20"
        />
        Grid
      </label>
      {(chartInstruction.chartType === 'bar' || chartInstruction.chartType === 'area' || chartInstruction.chartType === 'composed') && (
        <label className="flex items-center gap-1.5 text-xs text-[rgba(0,0,0,0.87)] cursor-pointer">
          <input
            type="checkbox"
            checked={chartInstruction.stacked === true}
            onChange={(e) => update({ stacked: e.target.checked })}
            className="rounded border-black/20"
          />
          Stacked
        </label>
      )}
      {canUseDataLabels && (
        <label className="flex items-center gap-1.5 text-xs text-[rgba(0,0,0,0.87)] cursor-pointer">
          <input
            type="checkbox"
            checked={chartInstruction.showDataLabels !== false}
            onChange={(e) => update({ showDataLabels: e.target.checked })}
            className="rounded border-black/20"
          />
          Data labels
        </label>
      )}
    </div>
  )
}
