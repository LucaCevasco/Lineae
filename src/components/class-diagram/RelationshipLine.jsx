import { CARD_WIDTH } from "./constants.js";
import { getPortPosition, getRelationshipDash, getMarkerStartId, getMarkerEndId } from "./geometry.js";

export function RelationshipLine({
  source, target, sourceHeight, targetHeight, relationship,
  sourceSide, targetSide, sourcePortIndex, sourcePortTotal, targetPortIndex, targetPortTotal,
  onCycleSide
}) {
  if (!target) {
    return null;
  }

  const start = getPortPosition(source.x, source.y, CARD_WIDTH, sourceHeight, sourceSide, sourcePortIndex, sourcePortTotal);
  const end = getPortPosition(target.x, target.y, CARD_WIDTH, targetHeight, targetSide, targetPortIndex, targetPortTotal);

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  let cp1 = { x: start.x, y: start.y };
  let cp2 = { x: end.x, y: end.y };

  const hOff = Math.max(40, Math.abs(dx) * 0.4);
  const vOff = Math.max(40, Math.abs(dy) * 0.4);

  switch (sourceSide) {
    case "right":  cp1 = { x: start.x + hOff, y: start.y }; break;
    case "left":   cp1 = { x: start.x - hOff, y: start.y }; break;
    case "bottom": cp1 = { x: start.x, y: start.y + vOff }; break;
    case "top":    cp1 = { x: start.x, y: start.y - vOff }; break;
  }
  switch (targetSide) {
    case "right":  cp2 = { x: end.x + hOff, y: end.y }; break;
    case "left":   cp2 = { x: end.x - hOff, y: end.y }; break;
    case "bottom": cp2 = { x: end.x, y: end.y + vOff }; break;
    case "top":    cp2 = { x: end.x, y: end.y - vOff }; break;
  }

  const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2 - 10;

  const srcStagger = sourcePortTotal > 1 ? sourcePortIndex * 14 : 0;
  const tgtStagger = targetPortTotal > 1 ? targetPortIndex * 14 : 0;

  // Extra offset to clear markers: diamonds on source for aggregation/composition, triangles on target for inheritance
  const sourceMarkerClearance = (() => {
    switch (relationship.type) {
      case "aggregation":
      case "composition":
        return 20;
      default:
        return 10;
    }
  })();

  const targetMarkerClearance = (() => {
    switch (relationship.type) {
      case "inheritance":
      case "implementation":
        return 18;
      default:
        return 10;
    }
  })();

  const srcLabelDir = sourceSide === "left" || sourceSide === "right"
    ? { dx: (sourceSide === "left" ? -sourceMarkerClearance : sourceMarkerClearance) + (sourceSide === "left" ? -srcStagger : srcStagger), dyMult: -8, anchor: sourceSide === "left" ? "end" : "start" }
    : { dx: 8, dyMult: (sourceSide === "top" ? -sourceMarkerClearance : sourceMarkerClearance + 6) + (sourceSide === "top" ? -srcStagger : srcStagger), anchor: "start" };

  const tgtLabelDir = targetSide === "left" || targetSide === "right"
    ? { dx: (targetSide === "left" ? -targetMarkerClearance : targetMarkerClearance) + (targetSide === "left" ? -tgtStagger : tgtStagger), dyMult: -8, anchor: targetSide === "left" ? "end" : "start" }
    : { dx: -8, dyMult: (targetSide === "top" ? -targetMarkerClearance : targetMarkerClearance + 6) + (targetSide === "top" ? -tgtStagger : tgtStagger), anchor: "end" };

  return (
    <g>
      <path
        d={path}
        fill="none"
        className="stroke-slate-500"
        strokeWidth={2}
        strokeDasharray={getRelationshipDash(relationship.type)}
        markerStart={getMarkerStartId(relationship.type)}
        markerEnd={getMarkerEndId(relationship.type)}
      />
      {relationship.sourceMultiplicity ? (
        <text x={start.x + srcLabelDir.dx} y={start.y + srcLabelDir.dyMult} textAnchor={srcLabelDir.anchor} className="fill-slate-500 text-[11px]">
          {relationship.sourceMultiplicity}
        </text>
      ) : null}
      {relationship.targetMultiplicity ? (
        <text x={end.x + tgtLabelDir.dx} y={end.y + tgtLabelDir.dyMult} textAnchor={tgtLabelDir.anchor} className="fill-slate-500 text-[11px]">
          {relationship.targetMultiplicity}
        </text>
      ) : null}
      {relationship.sourceRole && relationship.targetRole ? (
        <>
          <text x={midX} y={midY - 6} textAnchor="middle" className="fill-slate-600 text-[11px] font-medium">
            {relationship.sourceRole}
          </text>
          <text x={midX} y={midY + 8} textAnchor="middle" className="fill-slate-600 text-[11px] font-medium">
            {relationship.targetRole}
          </text>
        </>
      ) : (relationship.sourceRole || relationship.targetRole) ? (
        <text x={midX} y={midY} textAnchor="middle" className="fill-slate-600 text-[11px] font-medium">
          {relationship.sourceRole || relationship.targetRole}
        </text>
      ) : null}

      {/* Visible dot hints */}
      <circle cx={start.x} cy={start.y} r={3} className="fill-slate-300 pointer-events-none" />
      <circle cx={end.x} cy={end.y} r={3} className="fill-slate-300 pointer-events-none" />

      {/* Clickable hit areas */}
      <circle cx={start.x} cy={start.y} r={10}
        className="cursor-pointer fill-transparent hover:fill-blue-200/60"
        onClick={(e) => { e.stopPropagation(); onCycleSide?.(relationship.id, 'source', sourceSide); }}
      />
      <circle cx={end.x} cy={end.y} r={10}
        className="cursor-pointer fill-transparent hover:fill-blue-200/60"
        onClick={(e) => { e.stopPropagation(); onCycleSide?.(relationship.id, 'target', targetSide); }}
      />
    </g>
  );
}
