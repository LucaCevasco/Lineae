import { Copy, Loader2, X } from "lucide-react";

export function JavaExportModal({ code, loading, error, onClose, onCopy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-3xl rounded-3xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Export to Java</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <span className="ml-3 text-slate-500">Generating Java code...</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : (
            <pre className="overflow-auto rounded-2xl bg-slate-900 p-4 text-sm text-slate-100 whitespace-pre-wrap">{code}</pre>
          )}
        </div>
        {code && !loading ? (
          <div className="flex justify-end border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={() => onCopy(code)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Copy className="h-4 w-4" />
              Copy code
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
