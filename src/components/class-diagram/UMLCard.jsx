import { useState } from "react";
import { CARD_WIDTH, HEADER_HEIGHT, LINE_HEIGHT, PADDING_TOP, SECTION_GAP } from "./constants.js";
import { getClassHeight } from "./geometry.js";

export function UMLCard({ item, isSelected, onSelect, onDelete, onPointerDown, x, y }) {
  const [isHovered, setIsHovered] = useState(false);
  const height = getClassHeight(item);
  const stereotype = item.stereotype && item.stereotype !== "none" ? `\u00AB${item.stereotype}\u00BB` : null;
  const titleClass = item.isAbstract || item.stereotype === "abstract" ? "italic" : "";
  const headerY = PADDING_TOP + 12;
  const attributeY = HEADER_HEIGHT;
  const methodY = HEADER_HEIGHT + Math.max(1, item.attributes.length) * LINE_HEIGHT + SECTION_GAP;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e); }}
      role="button"
      tabIndex={0}
      className="cursor-grab active:cursor-grabbing"
      aria-pressed={isSelected}
      aria-label={`Select ${item.name}`}
    >
      <rect
        width={CARD_WIDTH}
        height={height}
        rx={18}
        className={isSelected ? "fill-blue-50 stroke-blue-500" : "fill-white stroke-slate-400"}
        strokeWidth={2}
      />
      <line x1={0} y1={HEADER_HEIGHT} x2={CARD_WIDTH} y2={HEADER_HEIGHT} className="stroke-slate-300" />
      <line x1={0} y1={methodY - 10} x2={CARD_WIDTH} y2={methodY - 10} className="stroke-slate-300" />

      {stereotype ? (
        <text x={CARD_WIDTH / 2} y={headerY} textAnchor="middle" className="fill-slate-500 text-[12px]">
          {stereotype}
        </text>
      ) : null}
      <text
        x={CARD_WIDTH / 2}
        y={stereotype ? headerY + LINE_HEIGHT : headerY + 6}
        textAnchor="middle"
        className={`fill-slate-900 text-[14px] font-bold ${titleClass}`}
      >
        {item.name}
      </text>

      {isHovered ? (
        <g
          transform={`translate(${CARD_WIDTH - 30}, 10)`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <rect width={20} height={20} rx={10} className="fill-red-500" />
          <text x={10} y={14} textAnchor="middle" className="fill-white text-[12px] font-bold">
            {"\u00D7"}
          </text>
        </g>
      ) : null}

      {item.attributes.length === 0 ? (
        <text x={12} y={attributeY + 18} className="fill-slate-400 text-[11px] italic">
          No attributes
        </text>
      ) : (
        item.attributes.map((attribute, index) => (
          <text key={attribute.id} x={12} y={attributeY + 18 + index * LINE_HEIGHT} className="fill-slate-700 text-[11px]">
            {`${attribute.visibility}${attribute.name}: ${attribute.type}${attribute.defaultValue ? ` = ${attribute.defaultValue}` : ""}${attribute.isStatic ? " {static}" : ""}${attribute.isAbstract ? " {abstract}" : ""}`}
          </text>
        ))
      )}

      {item.methods.length === 0 ? (
        <text x={12} y={methodY + 8} className="fill-slate-400 text-[11px] italic">
          No methods
        </text>
      ) : (
        item.methods.map((method, index) => (
          <text key={method.id} x={12} y={methodY + 8 + index * LINE_HEIGHT} className="fill-slate-700 text-[11px]">
            {`${method.visibility}${method.name}(${method.parameters.map((parameter) => `${parameter.name}: ${parameter.type}`).join(", ")}): ${method.returnType}${method.isStatic ? " {static}" : ""}${method.isAbstract ? " {abstract}" : ""}`}
          </text>
        ))
      )}
    </g>
  );
}
