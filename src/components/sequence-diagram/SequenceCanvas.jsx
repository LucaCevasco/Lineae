import { useMemo } from "react";
import { computeActivations, getCanvasHeight, getCanvasWidth, getMessageY } from "./geometry.js";
import { Lifeline } from "./Lifeline.jsx";
import { MessageArrow } from "./MessageArrow.jsx";
import { ActivationBox } from "./ActivationBox.jsx";

const GRID_SIZE = 20;

export function SequenceCanvas({
  participants, messages, selectedId, onSelectParticipant, svgRef,
  camera, viewWidth, viewHeight, panning, onPanStart, onPointerMove, onPointerUp
}) {
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

  const lifelineBottom = sortedMessages.length > 0
    ? getMessageY(sortedMessages.length - 1) + 60
    : getCanvasHeight(0) - 40;

  return (
    <svg
      ref={svgRef}
      viewBox={`${camera.x} ${camera.y} ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="xMinYMin meet"
      className="h-full w-full touch-none rounded-2xl"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <defs>
        <pattern id="seq-grid-pattern" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
        </pattern>
        <marker id="seq-arrow-filled" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="#475569" />
        </marker>
        <marker id="seq-arrow-open" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#475569" strokeWidth="1.5" />
        </marker>
      </defs>

      {/* White background + grid */}
      <rect
        x={camera.x - 2000}
        y={camera.y - 2000}
        width={viewWidth + 4000}
        height={viewHeight + 4000}
        fill="white"
      />
      <rect
        x={camera.x - 2000}
        y={camera.y - 2000}
        width={viewWidth + 4000}
        height={viewHeight + 4000}
        fill="url(#seq-grid-pattern)"
        onPointerDown={onPanStart}
        style={{ cursor: panning ? 'grabbing' : 'grab' }}
      />

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
