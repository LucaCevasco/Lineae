import { Plus, Trash2 } from "lucide-react";
import { VISIBILITY_OPTIONS } from "../constants.js";
import { createEmptyAttribute } from "../factories.js";

export function AttributeEditor({ items, onChange }) {
  const updateItem = (id, updates) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Attributes</h3>
        <button
          type="button"
          onClick={() => onChange([...items, createEmptyAttribute()])}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={item.visibility}
              onChange={(event) => updateItem(item.id, { visibility: event.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={item.name}
              onChange={(event) => updateItem(item.id, { name: event.target.value })}
              placeholder="name"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={item.type}
              onChange={(event) => updateItem(item.id, { type: event.target.value })}
              placeholder="type"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={item.defaultValue}
              onChange={(event) => updateItem(item.id, { defaultValue: event.target.value })}
              placeholder="default value"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={item.isStatic} onChange={(event) => updateItem(item.id, { isStatic: event.target.checked })} />
              Static
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={item.isAbstract} onChange={(event) => updateItem(item.id, { isAbstract: event.target.checked })} />
              Abstract
            </label>
            <button type="button" onClick={() => removeItem(item.id)} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
