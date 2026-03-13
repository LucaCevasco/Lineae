export function createEmptyParticipant(order) {
  return {
    id: crypto.randomUUID(),
    name: `Participant${order + 1}`,
    type: "participant",
    order
  };
}

export function createEmptyMessage(fromId, toId, order) {
  return {
    id: crypto.randomUUID(),
    from: fromId,
    to: toId,
    label: "message",
    type: "sync",
    order
  };
}
