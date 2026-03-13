import { SELF_MESSAGE_WIDTH } from "./constants.js";
import { getLifelineX, getMessageY } from "./geometry.js";

export function MessageArrow({ message, messageIndex, participants }) {
  const fromParticipant = participants.find((p) => p.id === message.from);
  const toParticipant = participants.find((p) => p.id === message.to);
  if (!fromParticipant || !toParticipant) return null;

  const fromIndex = participants.indexOf(fromParticipant);
  const toIndex = participants.indexOf(toParticipant);
  const y = getMessageY(messageIndex);
  const fromX = getLifelineX(fromIndex);
  const toX = getLifelineX(toIndex);

  const isSelf = message.type === "self" || fromParticipant.id === toParticipant.id;

  if (isSelf) {
    const loopWidth = SELF_MESSAGE_WIDTH;
    const loopHeight = 30;
    return (
      <g>
        <path
          d={`M ${fromX} ${y} H ${fromX + loopWidth} V ${y + loopHeight} H ${fromX}`}
          fill="none"
          className="stroke-slate-600"
          strokeWidth={1.5}
          markerEnd="url(#seq-arrow-filled)"
        />
        <text x={fromX + loopWidth + 6} y={y + loopHeight / 2 + 4} className="fill-slate-700 text-[11px]">
          {message.label}
        </text>
      </g>
    );
  }

  const isReturn = message.type === "return";
  const isAsync = message.type === "async";

  return (
    <g>
      <line
        x1={fromX}
        y1={y}
        x2={toX}
        y2={y}
        className="stroke-slate-600"
        strokeWidth={1.5}
        strokeDasharray={isReturn ? "6 4" : undefined}
        markerEnd={isAsync ? "url(#seq-arrow-open)" : "url(#seq-arrow-filled)"}
      />
      <text
        x={(fromX + toX) / 2}
        y={y - 8}
        textAnchor="middle"
        className="fill-slate-700 text-[11px]"
      >
        {message.label}
      </text>
    </g>
  );
}
