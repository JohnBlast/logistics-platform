/** Column format for display */
export type ColumnFormat = 'month_name' | 'percent' | 'currency'

/** Table filter - operator key per C-5 */
export interface TableFilter {
  field: string
  operator: 'include' | 'exclude' | 'eq' | 'ne' | 'contains' | 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'top' | 'bottom'
  value?: string | number | (string | number)[]
  topBottomN?: number
}

/** Aggregation spec */
export interface AggregationSpec {
  op: 'count' | 'count_match' | 'sum' | 'avg' | 'mode' | 'win_rate' | 'ratio'
  field?: string
  alias: string
  matchValue?: string
  fieldA?: string
  fieldB?: string
}

/** Column definition */
export interface ColumnDef {
  id: string
  header: string
  format?: ColumnFormat
}

/** Table instruction - full schema from PRD §11 */
export interface TableInstruction {
  dataSource: 'loads' | 'quotes' | 'loads_and_quotes'
  columns: ColumnDef[]
  /** Filters ANDed together. Use orFilters for (A and B) OR (C and D) patterns like "between X and Y". */
  filters?: TableFilter[]
  /** Each inner array is ANDed; results from each are ORed. For "between London and Birmingham": [[{collection_city:London,delivery_city:Birmingham},{collection_city:Birmingham,delivery_city:London}]]. */
  orFilters?: TableFilter[][]
  groupBy?: string[]
  groupByFormats?: Record<string, 'day' | 'week' | 'month' | 'year'>
  aggregations?: AggregationSpec[]
  sort?: { field: string; dir: 'asc' | 'desc' }[]
  limit?: number
  pctChange?: { field: string; alias: string }
}

/** Chart type for Discovery visualization */
export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radar' | 'composed'

/** Series definition for a chart (one or more data series) */
export interface ChartSeries {
  dataKey: string
  name?: string
  color?: string
  /** For composed charts: bar | line | area */
  type?: 'bar' | 'line' | 'area'
  stackId?: string
}

/** Chart instruction - how to render query result as a chart */
export interface ChartInstruction {
  chartType: ChartType
  title?: string
  xAxis?: { dataKey: string; label?: string }
  yAxis?: { label?: string; unit?: string }
  series: ChartSeries[]
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  showDataLabels?: boolean
  stacked?: boolean
  displayMode: 'chart_only' | 'chart_and_table'
}
