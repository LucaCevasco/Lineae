import { useState } from "react";

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function snap(value, gridSize = 20) {
  return Math.round(value / gridSize) * gridSize;
}

export function useHistoryState(initialValue) {
  const [history, setHistory] = useState([deepClone(initialValue)]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const setState = (updater) => {
    const current = history[index];
    const next = typeof updater === "function" ? updater(deepClone(current)) : updater;
    const nextHistory = history.slice(0, index + 1);
    nextHistory.push(deepClone(next));
    setHistory(nextHistory);
    setIndex(nextHistory.length - 1);
  };

  const undo = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const redo = () => {
    if (index < history.length - 1) {
      setIndex(index + 1);
    }
  };

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1
  };
}
