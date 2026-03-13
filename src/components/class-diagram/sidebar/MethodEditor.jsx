import { Plus, Trash2 } from "lucide-react";
import { VISIBILITY_OPTIONS } from "../constants.js";
import { createEmptyMethod, createEmptyParameter } from "../factories.js";

function ParameterEditor({ parameters, onChange }) {
  const updateParameter = (id, updates) => {
    onChange(parameters.map((parameter) => (parameter.id === id ? { ...parameter, ...updates } : parameter)));
  };

  const removeParameter = (id) => {
    onChange(parameters.filter((parameter) => parameter.id !== id));
  };

  return (
    <div className="space-y-2 rounded-xl bg-slate-100 p-2">
      {parameters.map((parameter) => (
        <div key={parameter.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input
            value={parameter.name}
            onChange={(event) => updateParameter(parameter.id, { name: event.target.value })}
            placeholder="param"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <input
            value={parameter.type}
            onChange={(event) => updateParameter(parameter.id, { type: event.target.value })}
            placeholder="type"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => removeParameter(parameter.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-600 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...parameters, createEmptyParameter()])} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
        <Plus className="h-3.5 w-3.5" />
        Add parameter
      </button>
    </div>
  );
}

export function MethodEditor({ items, onChange }) {
  const updateItem = (id, updates) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Methods</h3>
        <button
          type="button"
          onClick={() => onChange([...items, createEmptyMethod()])}
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
              placeholder="method name"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={item.returnType}
              onChange={(event) => updateItem(item.id, { returnType: event.target.value })}
              placeholder="return type"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={item.isStatic} onChange={(event) => updateItem(item.id, { isStatic: event.target.checked })} />
                Static
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={item.isAbstract} onChange={(event) => updateItem(item.id, { isAbstract: event.target.checked })} />
                Abstract
              </label>
            </div>
          </div>
          <div className="mt-3">
            <ParameterEditor parameters={item.parameters} onChange={(parameters) => updateItem(item.id, { parameters })} />
          </div>
          <button type="button" onClick={() => removeItem(item.id)} className="mt-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
