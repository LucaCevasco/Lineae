export function serializeSequenceForPrompt(sequence) {
  const lines = [];
  const sorted = [...sequence.participants].sort((a, b) => a.order - b.order);

  if (sorted.length > 0) {
    lines.push("Participants (in order):");
    for (const p of sorted) {
      lines.push(`  ${p.name} (type: ${p.type})`);
    }
    lines.push("");
  }

  const sortedMessages = [...sequence.messages].sort((a, b) => a.order - b.order);
  if (sortedMessages.length > 0) {
    lines.push("Messages (in order):");
    for (const msg of sortedMessages) {
      const from = sorted.find((p) => p.id === msg.from)?.name ?? msg.from;
      const to = sorted.find((p) => p.id === msg.to)?.name ?? msg.to;
      lines.push(`  ${from} -[${msg.type}]-> ${to}: ${msg.label}`);
    }
  }

  return lines.join("\n");
}

export const SEQUENCE_JSON_FORMAT = `Respond with ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "participants": [
    { "id": "placeholder-uuid", "name": "ParticipantName", "type": "participant"|"actor"|"boundary"|"entity", "order": 0 }
  ],
  "messages": [
    { "id": "placeholder-uuid", "from": "participant-id", "to": "participant-id", "label": "message label", "type": "sync"|"async"|"return"|"self", "order": 0 }
  ]
}

Rules:
- Every sequence diagram must have at least 2 participants and 1 message.
- The "from" and "to" fields in messages must reference participant "id" values.
- Order fields must be sequential integers starting from 0.
- Use "sync" for normal method calls, "async" for fire-and-forget, "return" for return values, "self" for self-calls.`;
