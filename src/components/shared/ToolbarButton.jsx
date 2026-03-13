export function ToolbarButton({ icon: Icon, children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
