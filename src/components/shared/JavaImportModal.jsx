import { FileCode, Loader2, X } from "lucide-react";

export function JavaImportModal({ code, onCodeChange, loading, error, onClose, onImport }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-3xl rounded-3xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Import from Java</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          {error ? (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          <textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="Paste your Java code here..."
            rows={16}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm"
          />
        </div>
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onImport}
            disabled={loading || !code.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />}
            Import to Diagram
          </button>
        </div>
      </div>
    </div>
  );
}
