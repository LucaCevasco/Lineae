import { CARD_WIDTH, HEADER_HEIGHT, LINE_HEIGHT, SECTION_GAP, PADDING_TOP, PADDING_BOTTOM } from "./constants.js";

const TEXT_PADDING = 24; // 12px each side
const MAX_CHARS_PER_LINE = Math.floor((CARD_WIDTH - TEXT_PADDING) / 6.2);

export function wrapText(text) {
  if (text.length <= MAX_CHARS_PER_LINE) return [text];
  const lines = [];
  let remaining = text;
  while (remaining.length > MAX_CHARS_PER_LINE) {
    let breakAt = -1;
    for (let i = MAX_CHARS_PER_LINE; i > 0; i--) {
      if (remaining[i] === ' ' || remaining[i] === ',') {
        breakAt = remaining[i] === ',' ? i + 1 : i;
        break;
      }
    }
    if (breakAt <= 0) breakAt = MAX_CHARS_PER_LINE;
    lines.push(remaining.substring(0, breakAt).trimEnd());
    remaining = remaining.substring(breakAt).trimStart();
  }
  if (remaining) lines.push(remaining);
  return lines;
}

export function getAttributeDisplayText(attr) {
  return `${attr.visibility}${attr.name}: ${attr.type}${attr.defaultValue ? ` = ${attr.defaultValue}` : ""}${attr.isStatic ? " {static}" : ""}${attr.isAbstract ? " {abstract}" : ""}`;
}

export function getMethodDisplayText(method) {
  const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(", ");
  return `${method.visibility}${method.name}(${params}): ${method.returnType}${method.isStatic ? " {static}" : ""}${method.isAbstract ? " {abstract}" : ""}`;
}

export function formatAttribute(attribute) {
  const base = `${attribute.visibility}${attribute.name || "attribute"}: ${attribute.type || "any"}`;
  const withDefault = attribute.defaultValue ? `${base} = ${attribute.defaultValue}` : base;
  const wrappedStatic = attribute.isStatic ? `<u>${withDefault}</u>` : withDefault;
  return attribute.isAbstract ? `/${wrappedStatic}/` : wrappedStatic;
}

export function formatMethod(method) {
  const params = method.parameters
    .map((parameter) => `${parameter.name || "param"}: ${parameter.type || "any"}`)
    .join(", ");
  const base = `${method.visibility}${method.name || "method"}(${params}): ${method.returnType || "void"}`;
  const wrappedStatic = method.isStatic ? `<u>${base}</u>` : base;
  return method.isAbstract ? `/${wrappedStatic}/` : wrappedStatic;
}

export function getAttrLineCount(umlClass) {
  if (umlClass.attributes.length === 0) return 1;
  return umlClass.attributes.reduce((sum, attr) => sum + wrapText(getAttributeDisplayText(attr)).length, 0);
}

export function getMethodLineCount(umlClass) {
  if (umlClass.methods.length === 0) return 1;
  return umlClass.methods.reduce((sum, m) => sum + wrapText(getMethodDisplayText(m)).length, 0);
}

export function getClassHeight(umlClass) {
  const stereotypeLines = umlClass.stereotype && umlClass.stereotype !== "none" ? 1 : 0;
  const titleLines = stereotypeLines + 1;
  const header = PADDING_TOP + titleLines * LINE_HEIGHT + 14;
  const attributeSection = getAttrLineCount(umlClass) * LINE_HEIGHT + SECTION_GAP;
  const methodSection = getMethodLineCount(umlClass) * LINE_HEIGHT + PADDING_BOTTOM;
  return Math.max(160, header + attributeSection + methodSection);
}

export function getMarkerStartId(type) {
  switch (type) {
    case "aggregation":
      return "url(#diamond-open-start)";
    case "composition":
      return "url(#diamond-filled-start)";
    default:
      return undefined;
  }
}

export function getMarkerEndId(type) {
  switch (type) {
    case "aggregation":
    case "composition":
      return "url(#arrow-open)";
    case "inheritance":
    case "implementation":
      return "url(#triangle-open)";
    case "dependency":
    default:
      return "url(#arrow-open)";
  }
}

export function getRelationshipDash(type) {
  if (type === "implementation" || type === "dependency") {
    return "8 6";
  }
  return undefined;
}

export function getConnectionSides(source, target, sourceHeight, targetHeight) {
  if (source === target) {
    return { sourceSide: "right", targetSide: "top" };
  }
  const sourceCX = source.x + CARD_WIDTH / 2;
  const sourceCY = source.y + sourceHeight / 2;
  const targetCX = target.x + CARD_WIDTH / 2;
  const targetCY = target.y + targetHeight / 2;
  const dx = targetCX - sourceCX;
  const dy = targetCY - sourceCY;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceSide: "right", targetSide: "left" }
      : { sourceSide: "left", targetSide: "right" };
  }
  return dy >= 0
    ? { sourceSide: "bottom", targetSide: "top" }
    : { sourceSide: "top", targetSide: "bottom" };
}

export function getPortPosition(cardX, cardY, cardWidth, cardHeight, side, index, total) {
  if (total === 1) {
    switch (side) {
      case "left":   return { x: cardX, y: cardY + cardHeight / 2 };
      case "right":  return { x: cardX + cardWidth, y: cardY + cardHeight / 2 };
      case "top":    return { x: cardX + cardWidth / 2, y: cardY };
      case "bottom": return { x: cardX + cardWidth / 2, y: cardY + cardHeight };
    }
  }
  const span = 0.6;
  const t = (index + 1) / (total + 1);
  switch (side) {
    case "left":
    case "right": {
      const usable = cardHeight * span;
      const startY = cardY + (cardHeight - usable) / 2;
      const y = startY + usable * t;
      return { x: side === "left" ? cardX : cardX + cardWidth, y };
    }
    case "top":
    case "bottom": {
      const usable = cardWidth * span;
      const startX = cardX + (cardWidth - usable) / 2;
      const x = startX + usable * t;
      return { x, y: side === "top" ? cardY : cardY + cardHeight };
    }
  }
}
