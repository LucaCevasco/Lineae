import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { MESSAGE_TYPES } from "../constants.js";
import { createEmptyMessage } from "../factories.js";

export function MessageEditor({ messages, participants, onChange }) {
  const sorted = [...messages].sort((a, b) => a.order - b.order);

  const updateMessage = (id, updates) => {
    onChange(messages.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const removeMessage = (id) => {
    onChange(messages.filter((m) => m.id !== id));
  };

  const addMessage = () => {
    if (participants.length < 2) return;
    const sortedP = [...participants].sort((a, b) => a.order - b.order);
    const newMsg = createEmptyMessage(sortedP[0].id, sortedP[1].id, messages.length);
    onChange([...messages, newMsg]);
  };

  const moveMessage = (id, direction) => {
    const idx = sorted.findIndex((m) => m.id === id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const updated = messages.map((m) => {
      if (m.id === sorted[idx].id) return { ...m, order: sorted[swapIdx].order };
      if (m.id === sorted[swapIdx].id) return { ...m, order: sorted[idx].order };
      return m;
    });
    onChange(updated);
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Messages</h3>
        <button
          type="button"
          onClick={addMessage}
          disabled={participants.length < 2}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {sorted.map((msg) => (
        <div key={msg.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={msg.from}
              onChange={(e) => updateMessage(msg.id, { from: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={msg.to}
              onChange={(e) => updateMessage(msg.id, { to: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              value={msg.label}
              onChange={(e) => updateMessage(msg.id, { label: e.target.value })}
              placeholder="label"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select
              value={msg.type}
              onChange={(e) => updateMessage(msg.id, { type: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {MESSAGE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <button type="button" onClick={() => moveMessage(msg.id, -1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 hover:bg-slate-100">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => moveMessage(msg.id, 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 hover:bg-slate-100">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => removeMessage(msg.id)} className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
