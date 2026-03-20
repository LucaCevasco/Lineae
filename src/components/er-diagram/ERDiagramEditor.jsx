import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
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
  const [panning, setPanning] = useState(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 700 });
  const svgRef = useRef(null);
  const cameraRef = useRef(camera);

  useEffect(() => { cameraRef.current = camera; }, [camera]);

  // Track SVG container size
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Wheel zoom centered on cursor
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;

      const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
      const newZoom = Math.min(3.0, Math.max(0.25, cam.zoom * factor));

      const mouseRatioX = (e.clientX - rect.left) / rect.width;
      const mouseRatioY = (e.clientY - rect.top) / rect.height;
      const cursorX = vb.x + mouseRatioX * vb.width;
      const cursorY = vb.y + mouseRatioY * vb.height;

      const newVW = rect.width / newZoom;
      const newVH = rect.height / newZoom;

      setCamera({
        x: cursorX - mouseRatioX * newVW,
        y: cursorY - mouseRatioY * newVH,
        zoom: newZoom,
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const viewWidth = (containerSize.width || 1200) / camera.zoom;
  const viewHeight = (containerSize.height || 700) / camera.zoom;

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
    const vb = svg.viewBox.baseVal;
    return {
      x: vb.x + ((clientX - rect.left) / rect.width) * vb.width,
      y: vb.y + ((clientY - rect.top) / rect.height) * vb.height,
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

  const handlePanStart = (e) => {
    if (e.button !== 0) return;
    setPanning({
      clientX: e.clientX,
      clientY: e.clientY,
      startX: camera.x,
      startY: camera.y,
    });
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (event) => {
    if (panning) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = (event.clientX - panning.clientX) * (viewWidth / rect.width);
      const dy = (event.clientY - panning.clientY) * (viewHeight / rect.height);
      setCamera(prev => ({ ...prev, x: panning.startX - dx, y: panning.startY - dy }));
      return;
    }

    if (!dragging) return;
    const pointer = getSvgPoint(event.clientX, event.clientY);
    setState((current) => ({
      ...current,
      erLayout: {
        ...current.erLayout,
        [dragging.name]: {
          x: snap(pointer.x - dragging.offsetX),
          y: snap(pointer.y - dragging.offsetY),
        }
      }
    }));
  };

  const handlePointerUp = (event) => {
    if (panning) {
      svgRef.current?.releasePointerCapture(event.pointerId);
      setPanning(null);
    }
    setDragging(null);
  };

  const handleZoomButton = (direction) => {
    setCamera(prev => {
      const oldVW = (containerSize.width || 1200) / prev.zoom;
      const oldVH = (containerSize.height || 700) / prev.zoom;
      const centerX = prev.x + oldVW / 2;
      const centerY = prev.y + oldVH / 2;

      const newZoom = Math.min(3.0, Math.max(0.25, +(prev.zoom + direction * 0.1).toFixed(2)));
      const newVW = (containerSize.width || 1200) / newZoom;
      const newVH = (containerSize.height || 700) / newZoom;

      return { x: centerX - newVW / 2, y: centerY - newVH / 2, zoom: newZoom };
    });
  };

  const fitAll = () => {
    if (tableNames.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const name of tableNames) {
      const pos = erLayout[name];
      if (!pos) continue;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + TABLE_WIDTH);
      maxY = Math.max(maxY, pos.y + (tableHeights[name] ?? 200));
    }
    const pad = 60;
    const cw = containerSize.width || 1200;
    const ch = containerSize.height || 700;
    const contentW = maxX - minX + 2 * pad;
    const contentH = maxY - minY + 2 * pad;
    const newZoom = Math.min(3.0, Math.max(0.25, Math.min(cw / contentW, ch / contentH)));
    const newVW = cw / newZoom;
    const newVH = ch / newZoom;
    setCamera({
      x: (minX - pad) - (newVW - contentW) / 2,
      y: (minY - pad) - (newVH - contentH) / 2,
      zoom: newZoom,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
      <div className="relative">
        <div className="rounded-3xl bg-white p-4 shadow-sm overflow-hidden"
             style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
          <svg
            ref={svgRef}
            viewBox={`${camera.x} ${camera.y} ${viewWidth} ${viewHeight}`}
            preserveAspectRatio="xMinYMin meet"
            className="h-full w-full touch-none rounded-2xl"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <defs>
              <pattern id="er-grid-pattern" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* White background + grid */}
            <rect
              x={camera.x - 2000}
              y={camera.y - 2000}
              width={viewWidth + 4000}
              height={viewHeight + 4000}
              fill="white"
            />
            <rect
              x={camera.x - 2000}
              y={camera.y - 2000}
              width={viewWidth + 4000}
              height={viewHeight + 4000}
              fill="url(#er-grid-pattern)"
              onPointerDown={handlePanStart}
              style={{ cursor: panning ? 'grabbing' : 'grab' }}
            />

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

        {/* Zoom controls */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 rounded-2xl bg-white px-2 py-1.5 shadow-lg border border-slate-200">
          <button
            type="button"
            onClick={() => handleZoomButton(-1)}
            disabled={camera.zoom <= 0.25}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ZoomOut size={16} />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-medium text-slate-600">
            {Math.round(camera.zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => handleZoomButton(1)}
            disabled={camera.zoom >= 3.0}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={fitAll}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="Fit all"
          >
            <Maximize2 size={16} />
          </button>
        </div>
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
