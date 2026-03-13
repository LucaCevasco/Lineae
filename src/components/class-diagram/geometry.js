import { CARD_WIDTH, HEADER_HEIGHT, LINE_HEIGHT, SECTION_GAP, PADDING_TOP, PADDING_BOTTOM } from "./constants.js";

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

export function getClassHeight(umlClass) {
  const stereotypeLines = umlClass.stereotype && umlClass.stereotype !== "none" ? 1 : 0;
  const titleLines = stereotypeLines + 1;
  const header = PADDING_TOP + titleLines * LINE_HEIGHT + 14;
  const attributeSection = Math.max(1, umlClass.attributes.length) * LINE_HEIGHT + SECTION_GAP;
  const methodSection = Math.max(1, umlClass.methods.length) * LINE_HEIGHT + PADDING_BOTTOM;
  return Math.max(160, header + attributeSection + methodSection);
}

export function getMarkerEndId(type) {
  switch (type) {
    case "aggregation":
      return "url(#diamond-open)";
    case "composition":
      return "url(#diamond-filled)";
    case "inheritance":
      return "url(#triangle-open)";
    case "implementation":
      return "url(#triangle-open)";
    case "dependency":
      return "url(#arrow-open)";
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
