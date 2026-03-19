import { Plus, Trash2 } from "lucide-react";
import { RELATIONSHIP_TYPES } from "../constants.js";
import { createEmptyERRelationship } from "../factories.js";

export function ERRelationshipEditor({ tables, selectedTableName, items, onChange }) {
  const tableNames = Object.keys(tables);

  // Only show relationships connected to the selected table
  const filtered = items.filter(
    (rel) => rel.sourceTable === selectedTableName || rel.targetTable === selectedTableName
  );

  const updateItem = (id, updates) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const getColumnsForTable = (tableName) => {
    return tables[tableName]?.columns ?? [];
  };

  const addRelationship = () => {
    const targetName = tableNames.find((n) => n !== selectedTableName) ?? selectedTableName;
    onChange([...items, createEmptyERRelationship(selectedTableName, targetName)]);
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Relationships</h3>
        <button
          type="button"
          onClick={addRelationship}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {filtered.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={item.sourceTable}
              onChange={(event) => updateItem(item.id, { sourceTable: event.target.value, sourceColumn: "" })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {tableNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select
              value={item.sourceColumn}
              onChange={(event) => updateItem(item.id, { sourceColumn: event.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">source column</option>
              {getColumnsForTable(item.sourceTable).map((col) => (
                <option key={col.id} value={col.name}>{col.name}</option>
              ))}
            </select>
            <select
              value={item.targetTable}
              onChange={(event) => updateItem(item.id, { targetTable: event.target.value, targetColumn: "" })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {tableNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select
              value={item.targetColumn}
              onChange={(event) => updateItem(item.id, { targetColumn: event.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">target column</option>
              {getColumnsForTable(item.targetTable).map((col) => (
                <option key={col.id} value={col.name}>{col.name}</option>
              ))}
            </select>
            <select
              value={item.type}
              onChange={(event) => updateItem(item.id, { type: event.target.value })}
              className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {RELATIONSHIP_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="mt-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
