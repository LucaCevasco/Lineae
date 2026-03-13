import { useMemo } from "react";
import { computeActivations, getCanvasHeight, getCanvasWidth, getMessageY } from "./geometry.js";
import { Lifeline } from "./Lifeline.jsx";
import { MessageArrow } from "./MessageArrow.jsx";
import { ActivationBox } from "./ActivationBox.jsx";

export function SequenceCanvas({ participants, messages, selectedId, onSelectParticipant, svgRef }) {
  const sortedParticipants = useMemo(
    () => [...participants].sort((a, b) => a.order - b.order),
    [participants]
  );

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.order - b.order),
    [messages]
  );

  const activations = useMemo(
    () => computeActivations(sortedMessages, sortedParticipants),
    [sortedMessages, sortedParticipants]
  );

  const canvasWidth = getCanvasWidth(sortedParticipants.length);
  const canvasHeight = getCanvasHeight(sortedMessages.length);
  const lifelineBottom = sortedMessages.length > 0
    ? getMessageY(sortedMessages.length - 1) + 60
    : canvasHeight - 40;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMinYMin meet"
      className="w-full touch-none rounded-2xl bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px]"
    >
      <defs>
        <marker id="seq-arrow-filled" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="#475569" />
        </marker>
        <marker id="seq-arrow-open" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#475569" strokeWidth="1.5" />
        </marker>
      </defs>

      {/* Activation boxes (behind arrows) */}
      {activations.map((activation, i) => (
        <ActivationBox key={i} activation={activation} />
      ))}

      {/* Lifelines */}
      {sortedParticipants.map((participant, index) => (
        <Lifeline
          key={participant.id}
          participant={participant}
          index={index}
          lifelineBottom={lifelineBottom}
          isSelected={selectedId === participant.id}
          onSelect={onSelectParticipant}
        />
      ))}

      {/* Messages */}
      {sortedMessages.map((message, index) => (
        <MessageArrow
          key={message.id}
          message={message}
          messageIndex={index}
          participants={sortedParticipants}
        />
      ))}
    </svg>
  );
}
