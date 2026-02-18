import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export interface ParseResult {
  headers: string[]
  rows: Record<string, unknown>[]
}

export class ParseError extends Error {
  constructor(
    message: string,
    public code: 'FORMAT' | 'SIZE' | 'PARSE' | 'EMPTY'
  ) {
    super(message)
    this.name = 'ParseError'
  }
}

export function parseFile(buffer: Buffer, filename: string): ParseResult {
  if (buffer.length > MAX_SIZE) {
    throw new ParseError(`File exceeds 10 MB limit. Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`, 'SIZE')
  }

  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'csv') {
    return parseCSV(buffer)
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(buffer)
  }
  throw new ParseError('Only CSV and Excel (.xlsx) are supported', 'FORMAT')
}

function parseCSV(buffer: Buffer): ParseResult {
  const str = buffer.toString('utf-8')
  const result = Papa.parse<Record<string, unknown>>(str, {
    header: true,
    skipEmptyLines: true,
  })
  if (result.errors.length > 0) {
    throw new ParseError(`CSV parse error: ${result.errors[0].message}`, 'PARSE')
  }
  const rows = result.data
  if (!rows.length) {
    throw new ParseError('File has no data rows (headers only)', 'EMPTY')
  }
  const headers = Object.keys(rows[0])
  return { headers, rows }
}

function parseExcel(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0] // First sheet only (C-5)
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new ParseError('Excel file has no sheets', 'PARSE')
  }
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
  if (!data.length) {
    throw new ParseError('File has no data rows (headers only)', 'EMPTY')
  }
  const headers = Object.keys(data[0])
  return { headers, rows: data }
}
