import { useCallback } from 'react'
import { saveAs } from 'file-saver'

/** Sanitize a string for use in a filename */
function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_ \.]/g, '_').replace(/\s+/g, '_').slice(0, 80) || 'chart'
}

/** Save image result from useGenerateImage (can be Blob or string URL) */
async function saveImage(result: Blob | string | undefined, filename: string): Promise<void> {
  if (!result) return
  if (typeof result === 'string') {
    const res = await fetch(result)
    const blob = await res.blob()
    saveAs(blob, filename)
  } else {
    saveAs(result, filename)
  }
}

interface ChartExportBarProps {
  /** Generate PNG image of the chart (element is the one ref is attached to) */
  onDownloadPng: () => Promise<Blob | string | undefined>
  /** Generate JPEG image of the chart */
  onDownloadJpeg: () => Promise<Blob | string | undefined>
  /** Chart title for download filename */
  chartTitle: string
}

export function ChartExportBar({ onDownloadPng, onDownloadJpeg, chartTitle }: ChartExportBarProps) {
  const handleDownloadPng = useCallback(async () => {
    const png = await onDownloadPng()
    await saveImage(png, `${sanitizeFilename(chartTitle)}.png`)
  }, [onDownloadPng, chartTitle])

  const handleDownloadJpg = useCallback(async () => {
    const jpeg = await onDownloadJpeg()
    await saveImage(jpeg, `${sanitizeFilename(chartTitle)}.jpg`)
  }, [onDownloadJpeg, chartTitle])

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-black/6 bg-black/[0.02]">
      <span className="text-xs font-medium text-[rgba(0,0,0,0.6)]">Export:</span>
      <button
        type="button"
        onClick={handleDownloadPng}
        className="px-2.5 py-1.5 rounded text-xs font-medium bg-white border border-black/12 text-[rgba(0,0,0,0.87)] hover:bg-black/4"
      >
        Download PNG
      </button>
      <button
        type="button"
        onClick={handleDownloadJpg}
        className="px-2.5 py-1.5 rounded text-xs font-medium bg-white border border-black/12 text-[rgba(0,0,0,0.87)] hover:bg-black/4"
      >
        Download JPG
      </button>
    </div>
  )
}
