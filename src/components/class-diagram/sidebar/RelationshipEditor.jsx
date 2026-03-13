import { Plus, Trash2 } from "lucide-react";
import { RELATIONSHIP_TYPES, MULTIPLICITY_OPTIONS } from "../constants.js";
import { createEmptyRelationship } from "../factories.js";

export function RelationshipEditor({ classNames, selectedName, items, onChange }) {
  const availableTargets = classNames.filter((className) => className !== selectedName);

  const updateItem = (id, updates) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Relationships</h3>
        <button
          type="button"
          onClick={() => onChange([...items, createEmptyRelationship(availableTargets[0] ?? selectedName)])}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={item.type} onChange={(event) => updateItem(item.id, { type: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select value={item.target} onChange={(event) => updateItem(item.id, { target: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {availableTargets.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            <select value={item.sourceMultiplicity} onChange={(event) => updateItem(item.id, { sourceMultiplicity: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {MULTIPLICITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option || "source multiplicity"}
                </option>
              ))}
            </select>
            <select value={item.targetMultiplicity} onChange={(event) => updateItem(item.id, { targetMultiplicity: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {MULTIPLICITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option || "target multiplicity"}
                </option>
              ))}
            </select>
            <input value={item.sourceRole} onChange={(event) => updateItem(item.id, { sourceRole: event.target.value })} placeholder="source role" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
            <input value={item.targetRole} onChange={(event) => updateItem(item.id, { targetRole: event.target.value })} placeholder="target role" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>
          <button type="button" onClick={() => removeItem(item.id)} className="mt-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
