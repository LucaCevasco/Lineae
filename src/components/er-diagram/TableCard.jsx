import { useState } from "react";
import { TABLE_WIDTH, TABLE_HEADER_HEIGHT, COLUMN_ROW_HEIGHT, ACCENT_STRIPE_HEIGHT, TABLE_BORDER_RADIUS } from "./constants.js";
import { getTableHeight } from "./geometry.js";

export function TableCard({ table, x, y, isSelected, onSelect, onDelete, onPointerDown }) {
  const [isHovered, setIsHovered] = useState(false);
  const height = getTableHeight(table);
  const clipId = `clip-${table.name.replace(/\s+/g, "-")}`;

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
      aria-label={`Select ${table.name}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect width={TABLE_WIDTH} height={height} rx={TABLE_BORDER_RADIUS} />
        </clipPath>
      </defs>

      {/* Card background */}
      <rect
        width={TABLE_WIDTH}
        height={height}
        rx={TABLE_BORDER_RADIUS}
        fill="white"
        stroke={isSelected ? "#3b82f6" : "#cbd5e1"}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Accent stripe */}
      <rect
        width={TABLE_WIDTH}
        height={ACCENT_STRIPE_HEIGHT}
        fill={table.color}
        clipPath={`url(#${clipId})`}
      />

      {/* Header background */}
      <rect
        x={0}
        y={ACCENT_STRIPE_HEIGHT}
        width={TABLE_WIDTH}
        height={TABLE_HEADER_HEIGHT}
        fill={isSelected ? "#eff6ff" : "#f8fafc"}
        clipPath={`url(#${clipId})`}
      />

      {/* Table name */}
      <text
        x={TABLE_WIDTH / 2}
        y={ACCENT_STRIPE_HEIGHT + TABLE_HEADER_HEIGHT / 2 + 5}
        textAnchor="middle"
        className="text-[13px] font-bold"
        fill="#0f172a"
      >
        {table.name}
      </text>

      {/* Header separator */}
      <line
        x1={0}
        y1={ACCENT_STRIPE_HEIGHT + TABLE_HEADER_HEIGHT}
        x2={TABLE_WIDTH}
        y2={ACCENT_STRIPE_HEIGHT + TABLE_HEADER_HEIGHT}
        stroke="#e2e8f0"
      />

      {/* Column rows */}
      {table.columns.length === 0 ? (
        <text
          x={TABLE_WIDTH / 2}
          y={ACCENT_STRIPE_HEIGHT + TABLE_HEADER_HEIGHT + 20}
          textAnchor="middle"
          className="text-[11px] italic"
          fill="#94a3b8"
        >
          No columns
        </text>
      ) : (
        table.columns.map((col, index) => {
          const rowY = ACCENT_STRIPE_HEIGHT + TABLE_HEADER_HEIGHT + index * COLUMN_ROW_HEIGHT;
          return (
            <g key={col.id} transform={`translate(0, ${rowY})`}>
              {/* Row separator (except first) */}
              {index > 0 ? (
                <line x1={8} y1={0} x2={TABLE_WIDTH - 8} y2={0} stroke="#f1f5f9" />
              ) : null}

              {/* PK/FK badge */}
              {col.isPrimaryKey ? (
                <g transform="translate(8, 6)">
                  <rect width={24} height={16} rx={4} fill="#fef9c3" />
                  <text x={12} y={12} textAnchor="middle" className="text-[9px] font-bold" fill="#a16207">PK</text>
                </g>
              ) : col.isForeignKey ? (
                <g transform="translate(8, 6)">
                  <rect width={24} height={16} rx={4} fill="#dbeafe" />
                  <text x={12} y={12} textAnchor="middle" className="text-[9px] font-bold" fill="#2563eb">FK</text>
                </g>
              ) : (
                <g transform="translate(8, 6)">
                  <rect width={24} height={16} rx={4} fill="transparent" />
                </g>
              )}

              {/* Column name */}
              <text
                x={40}
                y={19}
                className="text-[11px] font-medium"
                fill="#1e293b"
              >
                {col.name}
              </text>

              {/* Data type (right aligned) */}
              <text
                x={TABLE_WIDTH - 10}
                y={19}
                textAnchor="end"
                className="text-[11px]"
                fill="#94a3b8"
              >
                {col.dataType}
              </text>
            </g>
          );
        })
      )}

      {/* Delete button on hover */}
      {isHovered ? (
        <g
          transform={`translate(${TABLE_WIDTH - 26}, ${ACCENT_STRIPE_HEIGHT + 12})`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <rect width={20} height={20} rx={10} fill="#ef4444" />
          <text x={10} y={14} textAnchor="middle" className="text-[12px] font-bold" fill="white">
            {"\u00D7"}
          </text>
        </g>
      ) : null}
    </g>
  );
}
