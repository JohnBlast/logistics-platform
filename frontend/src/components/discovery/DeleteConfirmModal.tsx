interface DeleteConfirmModalProps {
  open: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({ open, title, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-[rgba(0,0,0,0.87)] mb-2">{title}</h3>
        <p className="text-sm text-[rgba(0,0,0,0.6)] mb-4">
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded font-medium text-[rgba(0,0,0,0.87)] hover:bg-black/4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded font-medium bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
