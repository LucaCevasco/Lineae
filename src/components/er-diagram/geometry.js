import { TABLE_WIDTH, TABLE_HEADER_HEIGHT, COLUMN_ROW_HEIGHT, ACCENT_STRIPE_HEIGHT } from "./constants.js";

export function getTableHeight(table) {
  return ACCENT_STRIPE_HEIGHT + TABLE_HEADER_HEIGHT + Math.max(1, table.columns.length) * COLUMN_ROW_HEIGHT + 8;
}

export function getConnectionSides(source, target, sourceHeight, targetHeight) {
  if (source === target) {
    return { sourceSide: "right", targetSide: "top" };
  }
  const sourceCX = source.x + TABLE_WIDTH / 2;
  const sourceCY = source.y + sourceHeight / 2;
  const targetCX = target.x + TABLE_WIDTH / 2;
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

export function getColumnY(index) {
  return ACCENT_STRIPE_HEIGHT + TABLE_HEADER_HEIGHT + index * COLUMN_ROW_HEIGHT;
}
