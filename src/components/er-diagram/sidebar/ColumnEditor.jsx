import { Plus, Trash2 } from "lucide-react";
import { DATA_TYPES } from "../constants.js";
import { createEmptyColumn } from "../factories.js";

export function ColumnEditor({ items, onChange }) {
  const updateItem = (id, updates) => {
    onChange(items.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };
      // When PK toggled on, auto-set not nullable and unique
      if (updates.isPrimaryKey === true) {
        updated.isNullable = false;
        updated.isUnique = true;
      }
      return updated;
    }));
  };

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Columns</h3>
        <button
          type="button"
          onClick={() => onChange([...items, createEmptyColumn()])}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={item.name}
              onChange={(event) => updateItem(item.id, { name: event.target.value })}
              placeholder="column name"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select
              value={item.dataType}
              onChange={(event) => updateItem(item.id, { dataType: event.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {DATA_TYPES.map((dt) => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
            <input
              value={item.defaultValue}
              onChange={(event) => updateItem(item.id, { defaultValue: event.target.value })}
              placeholder="default value"
              className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.isPrimaryKey}
                onChange={(event) => updateItem(item.id, { isPrimaryKey: event.target.checked })}
              />
              PK
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.isForeignKey}
                onChange={(event) => updateItem(item.id, { isForeignKey: event.target.checked })}
              />
              FK
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!item.isNullable}
                onChange={(event) => updateItem(item.id, { isNullable: !event.target.checked })}
              />
              Not Null
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.isUnique}
                onChange={(event) => updateItem(item.id, { isUnique: event.target.checked })}
              />
              Unique
            </label>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
