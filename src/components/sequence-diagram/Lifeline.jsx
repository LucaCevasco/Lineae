import { HEAD_WIDTH, HEAD_HEIGHT, CANVAS_PADDING_TOP } from "./constants.js";
import { getLifelineX } from "./geometry.js";

export function Lifeline({ participant, index, lifelineBottom, isSelected, onSelect }) {
  const x = getLifelineX(index);
  const headX = x - HEAD_WIDTH / 2;
  const headY = CANVAS_PADDING_TOP;
  const isActor = participant.type === "actor";

  return (
    <g onClick={() => onSelect(participant.id)}>
      {/* Dashed lifeline */}
      <line
        x1={x}
        y1={headY + HEAD_HEIGHT}
        x2={x}
        y2={lifelineBottom}
        stroke="#94a3b8"
        strokeWidth={1.5}
        strokeDasharray="6 4"
      />

      {/* Participant head */}
      {isActor ? (
        <g transform={`translate(${x}, ${headY})`}>
          {/* Stick figure */}
          <circle cx={0} cy={8} r={8} fill="none" className={isSelected ? "stroke-blue-500" : "stroke-slate-500"} strokeWidth={2} />
          <line x1={0} y1={16} x2={0} y2={30} className={isSelected ? "stroke-blue-500" : "stroke-slate-500"} strokeWidth={2} />
          <line x1={-12} y1={22} x2={12} y2={22} className={isSelected ? "stroke-blue-500" : "stroke-slate-500"} strokeWidth={2} />
          <line x1={0} y1={30} x2={-10} y2={40} className={isSelected ? "stroke-blue-500" : "stroke-slate-500"} strokeWidth={2} />
          <line x1={0} y1={30} x2={10} y2={40} className={isSelected ? "stroke-blue-500" : "stroke-slate-500"} strokeWidth={2} />
          <text x={0} y={54} textAnchor="middle" className="fill-slate-700 text-[12px] font-medium">
            {participant.name}
          </text>
        </g>
      ) : (
        <g>
          <rect
            x={headX}
            y={headY}
            width={HEAD_WIDTH}
            height={HEAD_HEIGHT}
            rx={8}
            className={isSelected ? "fill-blue-50 stroke-blue-500" : "fill-white stroke-slate-400"}
            strokeWidth={2}
          />
          {participant.type !== "participant" ? (
            <text x={x} y={headY + 12} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {`\u00AB${participant.type}\u00BB`}
            </text>
          ) : null}
          <text
            x={x}
            y={participant.type !== "participant" ? headY + 28 : headY + HEAD_HEIGHT / 2 + 5}
            textAnchor="middle"
            className="fill-slate-700 text-[12px] font-medium"
          >
            {participant.name}
          </text>
        </g>
      )}
    </g>
  );
}
