import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { createEmptyParticipant, createEmptyMessage } from "./factories.js";
import { SequenceCanvas } from "./SequenceCanvas.jsx";
import { ParticipantEditor } from "./sidebar/ParticipantEditor.jsx";
import { MessageEditor } from "./sidebar/MessageEditor.jsx";

export const SequenceDiagramEditor = forwardRef(function SequenceDiagramEditor({ state, setState }, ref) {
  const svgRef = useRef(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  useImperativeHandle(ref, () => ({
    getSvgElement: () => svgRef.current,
  }));

  const { sequence } = state;
  const { participants, messages } = sequence;

  const updateSequence = (updates) => {
    setState((current) => ({
      ...current,
      sequence: {
        ...current.sequence,
        ...updates
      }
    }));
  };

  const addParticipant = () => {
    const newP = createEmptyParticipant(participants.length);
    updateSequence({ participants: [...participants, newP] });
  };

  const addMessage = () => {
    if (participants.length < 2) return;
    const sorted = [...participants].sort((a, b) => a.order - b.order);
    const newMsg = createEmptyMessage(sorted[0].id, sorted[1].id, messages.length);
    updateSequence({ messages: [...messages, newMsg] });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <SequenceCanvas
          participants={participants}
          messages={messages}
          selectedId={selectedParticipant}
          onSelectParticipant={setSelectedParticipant}
          svgRef={svgRef}
        />
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Sequence Diagram Editor
        </div>
        <ParticipantEditor
          participants={participants}
          onChange={(p) => updateSequence({ participants: p })}
          selectedId={selectedParticipant}
          onSelect={setSelectedParticipant}
        />
        <MessageEditor
          messages={messages}
          participants={participants}
          onChange={(m) => updateSequence({ messages: m })}
        />
      </div>
    </div>
  );
});

SequenceDiagramEditor.displayName = "SequenceDiagramEditor";
