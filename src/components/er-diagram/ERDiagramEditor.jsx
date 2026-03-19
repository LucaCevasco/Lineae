import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { TABLE_WIDTH, GRID_SIZE, TABLE_COLORS } from "./constants.js";
import { getTableHeight, getConnectionSides } from "./geometry.js";
import { createEmptyColumn } from "./factories.js";
import { ERRelationshipLine } from "./ERRelationshipLine.jsx";
import { TableCard } from "./TableCard.jsx";
import { ColumnEditor } from "./sidebar/ColumnEditor.jsx";
import { ERRelationshipEditor } from "./sidebar/ERRelationshipEditor.jsx";

function snap(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export const ERDiagramEditor = forwardRef(function ERDiagramEditor({ state, setState }, ref) {
  const [dragging, setDragging] = useState(null);
  const svgRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getSvgElement: () => svgRef.current,
  }));

  const { erSelected, er, erLayout } = state;
  const tableNames = Object.keys(er.tables);
  const selectedTable = er.tables[erSelected] ?? er.tables[tableNames[0]];

  const tableHeights = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(er.tables).map(([name, table]) => [name, getTableHeight(table)])
      ),
    [er.tables]
  );

  const preparedRelations = useMemo(() => {
    const portMap = {};
    const entries = [];

    for (const rel of er.relationships) {
      const srcPos = erLayout[rel.sourceTable];
      const tgtPos = erLayout[rel.targetTable];
      if (!srcPos || !tgtPos) continue;

      const { sourceSide, targetSide } = getConnectionSides(
        srcPos, tgtPos, tableHeights[rel.sourceTable] ?? 0, tableHeights[rel.targetTable] ?? 0
      );

      if (!portMap[rel.sourceTable]) portMap[rel.sourceTable] = { left: [], right: [], top: [], bottom: [] };
      if (!portMap[rel.targetTable]) portMap[rel.targetTable] = { left: [], right: [], top: [], bottom: [] };
      portMap[rel.sourceTable][sourceSide].push(rel.id);
      portMap[rel.targetTable][targetSide].push(rel.id);

      entries.push({ rel, sourceSide, targetSide });
    }

    return entries.map(({ rel, sourceSide, targetSide }) => {
      const srcPorts = portMap[rel.sourceTable][sourceSide];
      const tgtPorts = portMap[rel.targetTable][targetSide];
      return {
        key: rel.id,
        source: erLayout[rel.sourceTable],
        target: erLayout[rel.targetTable],
        sourceHeight: tableHeights[rel.sourceTable] ?? 0,
        targetHeight: tableHeights[rel.targetTable] ?? 0,
        relationship: rel,
        sourceSide,
        targetSide,
        sourcePortIndex: srcPorts.indexOf(rel.id),
        sourcePortTotal: srcPorts.length,
        targetPortIndex: tgtPorts.indexOf(rel.id),
        targetPortTotal: tgtPorts.length,
      };
    });
  }, [er.relationships, er.tables, erLayout, tableHeights]);

  const canvasHeight = useMemo(() => {
    const MIN_HEIGHT = 720;
    const PADDING = 80;
    let maxBottom = 0;
    for (const name of tableNames) {
      const pos = erLayout[name];
      if (pos) {
        const bottom = pos.y + (tableHeights[name] ?? 0);
        if (bottom > maxBottom) maxBottom = bottom;
      }
    }
    return Math.max(MIN_HEIGHT, maxBottom + PADDING);
  }, [tableNames, erLayout, tableHeights]);

  const setSelected = (nextSelected) => {
    setState((current) => ({ ...current, erSelected: nextSelected }));
  };

  const updateSelectedTable = (updates) => {
    setState((current) => ({
      ...current,
      er: {
        ...current.er,
        tables: {
          ...current.er.tables,
          [current.erSelected]: {
            ...current.er.tables[current.erSelected],
            ...updates
          }
        }
      }
    }));
  };

  const renameSelectedTable = (nextName) => {
    if (!nextName || nextName === erSelected || er.tables[nextName]) return;

    setState((current) => {
      const nextTables = {};
      Object.entries(current.er.tables).forEach(([name, table]) => {
        const resolvedName = name === current.erSelected ? nextName : name;
        nextTables[resolvedName] = { ...table, name: resolvedName };
      });

      // Update relationships that reference the old name
      const nextRelationships = current.er.relationships.map((rel) => ({
        ...rel,
        sourceTable: rel.sourceTable === current.erSelected ? nextName : rel.sourceTable,
        targetTable: rel.targetTable === current.erSelected ? nextName : rel.targetTable,
      }));

      const nextLayout = { ...current.erLayout, [nextName]: current.erLayout[current.erSelected] };
      delete nextLayout[current.erSelected];

      return {
        ...current,
        erSelected: nextName,
        er: { tables: nextTables, relationships: nextRelationships },
        erLayout: nextLayout,
      };
    });
  };

  const deleteTable = (name) => {
    if (tableNames.length <= 1) return;

    setState((current) => {
      const nextTables = { ...current.er.tables };
      delete nextTables[name];

      const nextLayout = { ...current.erLayout };
      delete nextLayout[name];

      // Remove relationships referencing this table
      const nextRelationships = current.er.relationships.filter(
        (rel) => rel.sourceTable !== name && rel.targetTable !== name
      );

      return {
        ...current,
        erSelected: current.erSelected === name ? Object.keys(nextTables)[0] : current.erSelected,
        er: { tables: nextTables, relationships: nextRelationships },
        erLayout: nextLayout,
      };
    });
  };

  const updateRelationships = (nextRelationships) => {
    setState((current) => ({
      ...current,
      er: { ...current.er, relationships: nextRelationships }
    }));
  };

  const getSvgPoint = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    return {
      x: ((clientX - rect.left) / rect.width) * viewBox.width,
      y: ((clientY - rect.top) / rect.height) * viewBox.height,
    };
  };

  const startDrag = (name, event) => {
    const pointer = getSvgPoint(event.clientX, event.clientY);
    setSelected(name);
    setDragging({
      name,
      offsetX: pointer.x - erLayout[name].x,
      offsetY: pointer.y - erLayout[name].y,
    });
  };

  const handlePointerMove = (event) => {
    if (!dragging) return;
    const pointer = getSvgPoint(event.clientX, event.clientY);
    setState((current) => ({
      ...current,
      erLayout: {
        ...current.erLayout,
        [dragging.name]: {
          x: Math.max(0, Math.min(snap(pointer.x - dragging.offsetX), 1080 - TABLE_WIDTH)),
          y: Math.max(0, snap(pointer.y - dragging.offsetY)),
        }
      }
    }));
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <svg
          ref={svgRef}
          viewBox={`0 0 1080 ${canvasHeight}`}
          preserveAspectRatio="xMinYMin meet"
          className="w-full touch-none rounded-2xl bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px]"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {preparedRelations.map((entry) => (
            <ERRelationshipLine key={entry.key} {...entry} />
          ))}

          {tableNames.map((name) => (
            <TableCard
              key={name}
              table={er.tables[name]}
              x={erLayout[name]?.x ?? 0}
              y={erLayout[name]?.y ?? 0}
              isSelected={erSelected === name}
              onSelect={() => setSelected(name)}
              onDelete={() => deleteTable(name)}
              onPointerDown={(event) => startDrag(name, event)}
            />
          ))}
        </svg>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        {selectedTable ? (
          <>
            <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              ER Table Editor
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Table name</label>
                <input
                  value={selectedTable.name}
                  onChange={(event) => renameSelectedTable(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Color</label>
                <div className="flex flex-wrap gap-2">
                  {TABLE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => updateSelectedTable({ color })}
                      className="h-7 w-7 rounded-full border-2 transition"
                      style={{
                        backgroundColor: color,
                        borderColor: selectedTable.color === color ? "#0f172a" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <ColumnEditor
              items={selectedTable.columns}
              onChange={(columns) => updateSelectedTable({ columns })}
            />
            <ERRelationshipEditor
              tables={er.tables}
              selectedTableName={erSelected}
              items={er.relationships}
              onChange={updateRelationships}
            />
          </>
        ) : null}
      </div>
    </div>
  );
});

ERDiagramEditor.displayName = "ERDiagramEditor";
