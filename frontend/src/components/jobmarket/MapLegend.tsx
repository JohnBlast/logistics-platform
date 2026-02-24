/** Map Legend — overlay showing pin and line types */
export function MapLegend({ showLoads }: { showLoads?: boolean }) {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded border border-black/12 px-3 py-2 text-xs space-y-1.5 shadow-sm">
      <div className="font-medium text-[var(--md-text-primary)]">Legend</div>
      {showLoads && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-4 h-5 text-[8px] font-bold" style={{ color: '#ef6c00' }}>
            <svg width="14" height="18" viewBox="0 0 14 18"><path d="M7 0C3.1 0 0 3.1 0 7c0 5.25 7 11 7 11s7-5.75 7-11c0-3.9-3.1-7-7-7z" fill="#ef6c00"/><text x="7" y="10" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">L</text></svg>
          </span>
          <span>Available load</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#1976d2] border-2 border-white text-white text-[8px] font-bold shadow-sm">V</span>
        <span>Fleet vehicle</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1976d2] border-[3px] border-[#ffeb3b] text-white text-[9px] font-bold shadow-sm">V</span>
        <span>Nearest vehicle</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#2e7d32] border-2 border-white text-white text-[8px] font-bold shadow-sm">C</span>
        <span>Collection</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#c62828] border-2 border-white text-white text-[8px] font-bold shadow-sm">D</span>
        <span>Delivery</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-5 border-t-2 border-dashed border-[#1976d2]"></span>
        <span>To collection</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-5 border-t-2 border-[#2e7d32]"></span>
        <span>To delivery</span>
      </div>
    </div>
  )
}
