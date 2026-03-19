import { TABLE_WIDTH } from "./constants.js";
import { getPortPosition } from "./geometry.js";

function getCrowsFootLines(x, y, angle, type) {
  const len = 12;
  const lines = [];

  if (type === "one") {
    // Two short perpendicular lines (||)
    const perpX = Math.cos(angle + Math.PI / 2);
    const perpY = Math.sin(angle + Math.PI / 2);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    // First perpendicular line (closer to endpoint)
    lines.push({
      x1: x + dx * 4 - perpX * (len / 2),
      y1: y + dy * 4 - perpY * (len / 2),
      x2: x + dx * 4 + perpX * (len / 2),
      y2: y + dy * 4 + perpY * (len / 2),
    });
    // Second perpendicular line
    lines.push({
      x1: x + dx * 10 - perpX * (len / 2),
      y1: y + dy * 10 - perpY * (len / 2),
      x2: x + dx * 10 + perpX * (len / 2),
      y2: y + dy * 10 + perpY * (len / 2),
    });
  } else {
    // Many: three radiating lines at 0, +30°, -30° (crow's foot fork)
    const spread = Math.PI / 6; // 30 degrees
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    // Center line
    lines.push({
      x1: x,
      y1: y,
      x2: x + dx * len,
      y2: y + dy * len,
    });
    // Upper fork
    lines.push({
      x1: x,
      y1: y,
      x2: x + Math.cos(angle + spread) * len,
      y2: y + Math.sin(angle + spread) * len,
    });
    // Lower fork
    lines.push({
      x1: x,
      y1: y,
      x2: x + Math.cos(angle - spread) * len,
      y2: y + Math.sin(angle - spread) * len,
    });
  }

  return lines;
}

function getDecorationTypes(relType) {
  switch (relType) {
    case "one-to-one":   return { source: "one", target: "one" };
    case "one-to-many":  return { source: "one", target: "many" };
    case "many-to-one":  return { source: "many", target: "one" };
    case "many-to-many": return { source: "many", target: "many" };
    default:             return { source: "one", target: "many" };
  }
}

export function ERRelationshipLine({
  source, target, sourceHeight, targetHeight, relationship,
  sourceSide, targetSide, sourcePortIndex, sourcePortTotal, targetPortIndex, targetPortTotal
}) {
  if (!source || !target) return null;

  const start = getPortPosition(source.x, source.y, TABLE_WIDTH, sourceHeight, sourceSide, sourcePortIndex, sourcePortTotal);
  const end = getPortPosition(target.x, target.y, TABLE_WIDTH, targetHeight, targetSide, targetPortIndex, targetPortTotal);

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

  // Compute tangent angles at endpoints for crow's foot decorations
  // Tangent at start: direction from start toward cp1
  const srcAngle = Math.atan2(cp1.y - start.y, cp1.x - start.x);
  // Tangent at end: direction from end toward cp2 (away from curve)
  const tgtAngle = Math.atan2(cp2.y - end.y, cp2.x - end.x);

  const { source: srcType, target: tgtType } = getDecorationTypes(relationship.type);

  const srcLines = getCrowsFootLines(start.x, start.y, srcAngle, srcType);
  const tgtLines = getCrowsFootLines(end.x, end.y, tgtAngle, tgtType);

  // Label positions near endpoints
  const srcLabelOffset = sourceSide === "left" || sourceSide === "right"
    ? { dx: sourceSide === "left" ? -8 : 8, dy: -10, anchor: sourceSide === "left" ? "end" : "start" }
    : { dx: 8, dy: sourceSide === "top" ? -10 : 18, anchor: "start" };

  const tgtLabelOffset = targetSide === "left" || targetSide === "right"
    ? { dx: targetSide === "left" ? -8 : 8, dy: -10, anchor: targetSide === "left" ? "end" : "start" }
    : { dx: -8, dy: targetSide === "top" ? -10 : 18, anchor: "end" };

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="#64748b"
        strokeWidth={1.5}
      />

      {/* Crow's foot decorations at source */}
      {srcLines.map((line, i) => (
        <line
          key={`src-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#64748b"
          strokeWidth={1.5}
        />
      ))}

      {/* Crow's foot decorations at target */}
      {tgtLines.map((line, i) => (
        <line
          key={`tgt-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#64748b"
          strokeWidth={1.5}
        />
      ))}

      {/* Source column label */}
      {relationship.sourceColumn ? (
        <text
          x={start.x + srcLabelOffset.dx}
          y={start.y + srcLabelOffset.dy}
          textAnchor={srcLabelOffset.anchor}
          className="text-[10px]"
          fill="#64748b"
        >
          {relationship.sourceColumn}
        </text>
      ) : null}

      {/* Target column label */}
      {relationship.targetColumn ? (
        <text
          x={end.x + tgtLabelOffset.dx}
          y={end.y + tgtLabelOffset.dy}
          textAnchor={tgtLabelOffset.anchor}
          className="text-[10px]"
          fill="#64748b"
        >
          {relationship.targetColumn}
        </text>
      ) : null}
    </g>
  );
}
