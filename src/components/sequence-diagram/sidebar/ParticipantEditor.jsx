import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { PARTICIPANT_TYPES } from "../constants.js";
import { createEmptyParticipant } from "../factories.js";

export function ParticipantEditor({ participants, onChange, selectedId, onSelect }) {
  const sorted = [...participants].sort((a, b) => a.order - b.order);

  const updateParticipant = (id, updates) => {
    onChange(participants.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const removeParticipant = (id) => {
    onChange(participants.filter((p) => p.id !== id));
  };

  const addParticipant = () => {
    const newP = createEmptyParticipant(participants.length);
    onChange([...participants, newP]);
  };

  const moveParticipant = (id, direction) => {
    const idx = sorted.findIndex((p) => p.id === id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const updated = participants.map((p) => {
      if (p.id === sorted[idx].id) return { ...p, order: sorted[swapIdx].order };
      if (p.id === sorted[swapIdx].id) return { ...p, order: sorted[idx].order };
      return p;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Participants</h3>
        <button
          type="button"
          onClick={addParticipant}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {sorted.map((p) => (
        <div
          key={p.id}
          className={`rounded-2xl border p-3 ${selectedId === p.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
          onClick={() => onSelect(p.id)}
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              value={p.name}
              onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
              placeholder="name"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select
              value={p.type}
              onChange={(e) => updateParticipant(p.id, { type: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {PARTICIPANT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); moveParticipant(p.id, -1); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 hover:bg-slate-100">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); moveParticipant(p.id, 1); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 hover:bg-slate-100">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); removeParticipant(p.id); }} className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
