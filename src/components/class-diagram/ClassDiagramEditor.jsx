import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { CARD_WIDTH, GRID_SIZE } from "./constants.js";
import { getClassHeight, getConnectionSides } from "./geometry.js";
import { createEmptyAttribute, createEmptyMethod } from "./factories.js";
import { RelationshipLine } from "./RelationshipLine.jsx";
import { UMLCard } from "./UMLCard.jsx";
import { ClassSidebarPanel } from "./sidebar/ClassSidebarPanel.jsx";
import { cn } from "../../lib/utils.js";

function snap(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export const ClassDiagramEditor = forwardRef(function ClassDiagramEditor({ state, setState }, ref) {
  const [dragging, setDragging] = useState(null);
  const [panning, setPanning] = useState(null);
  const [sidebarSide, setSidebarSide] = useState('right');
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

  const { selected, classes, layout } = state;
  const classNames = Object.keys(classes);
  const selectedClass = classes[selected] ?? classes[classNames[0]];

  const classHeights = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(classes).map(([name, umlClass]) => [name, getClassHeight(umlClass)])
      ),
    [classes]
  );

  const preparedRelations = useMemo(() => {
    const MAX_PER_SIDE = 2;
    const SIDE_ORDER = ["right", "bottom", "left", "top"];
    const portMap = {};
    const entries = [];

    for (const name of Object.keys(classes)) {
      const source = layout[name];
      if (!source) continue;
      for (const rel of classes[name].relations) {
        const target = layout[rel.target];
        if (!target) continue;
        const computedSides = getConnectionSides(
          source, target, classHeights[name] ?? 0, classHeights[rel.target] ?? 0
        );
        const sourceSide = rel.sourceSideOverride || computedSides.sourceSide;
        const targetSide = rel.targetSideOverride || computedSides.targetSide;
        if (!portMap[name]) portMap[name] = { left: [], right: [], top: [], bottom: [] };
        if (!portMap[rel.target]) portMap[rel.target] = { left: [], right: [], top: [], bottom: [] };
        portMap[name][sourceSide].push(rel.id);
        portMap[rel.target][targetSide].push(rel.id);
        entries.push({ sourceName: name, rel, sourceSide, targetSide });
      }
    }

    // Redistribute overloaded sides (max 2 per side per class)
    for (const className of Object.keys(portMap)) {
      for (let s = 0; s < SIDE_ORDER.length; s++) {
        const side = SIDE_ORDER[s];
        const ports = portMap[className][side];
        if (ports.length <= MAX_PER_SIDE) continue;
        const excess = ports.splice(MAX_PER_SIDE);
        for (const relId of excess) {
          const entry = entries.find(e => e.rel.id === relId && (e.sourceName === className || e.rel.target === className));
          // Skip manually overridden endpoints
          if (entry) {
            const isOverridden = (entry.sourceName === className && entry.rel.sourceSideOverride) ||
                                 (entry.rel.target === className && entry.rel.targetSideOverride);
            if (isOverridden) { ports.push(relId); continue; }
          }
          let placed = false;
          for (let offset = 1; offset < 4; offset++) {
            const nextSide = SIDE_ORDER[(s + offset) % 4];
            if (portMap[className][nextSide].length < MAX_PER_SIDE) {
              portMap[className][nextSide].push(relId);
              if (entry) {
                if (entry.sourceName === className) entry.sourceSide = nextSide;
                else entry.targetSide = nextSide;
              }
              placed = true;
              break;
            }
          }
          if (!placed) {
            ports.push(relId);
          }
        }
      }
    }

    return entries.map(({ sourceName, rel, sourceSide, targetSide }) => {
      const srcPorts = portMap[sourceName][sourceSide];
      const tgtPorts = portMap[rel.target][targetSide];
      return {
        key: rel.id,
        source: layout[sourceName],
        target: layout[rel.target],
        sourceHeight: classHeights[sourceName] ?? 0,
        targetHeight: classHeights[rel.target] ?? 0,
        relationship: rel,
        sourceSide,
        targetSide,
        sourcePortIndex: srcPorts.indexOf(rel.id),
        sourcePortTotal: srcPorts.length,
        targetPortIndex: tgtPorts.indexOf(rel.id),
        targetPortTotal: tgtPorts.length,
      };
    });
  }, [classes, layout, classHeights]);


  const setSelected = (nextSelected) => {
    setState((current) => ({
      ...current,
      selected: nextSelected
    }));
  };

  const updateSelectedClass = (updates) => {
    setState((current) => ({
      ...current,
      classes: {
        ...current.classes,
        [current.selected]: {
          ...current.classes[current.selected],
          ...updates
        }
      }
    }));
  };

  const addClass = () => {
    setState((current) => {
      const existingNames = Object.keys(current.classes);
      let nextIndex = existingNames.length + 1;
      let nextName = `Class${nextIndex}`;

      while (current.classes[nextName]) {
        nextIndex += 1;
        nextName = `Class${nextIndex}`;
      }

      return {
        ...current,
        selected: nextName,
        classes: {
          ...current.classes,
          [nextName]: {
            name: nextName,
            stereotype: "none",
            isAbstract: false,
            description: "Describe this class.",
            attributes: [createEmptyAttribute()],
            methods: [createEmptyMethod()],
            relations: []
          }
        },
        layout: {
          ...current.layout,
          [nextName]: {
            x: snap(40 + (existingNames.length % 4) * 380),
            y: snap(60 + Math.floor(existingNames.length / 4) * 240)
          }
        }
      };
    });
  };

  const deleteClass = (name) => {
    if (classNames.length <= 1) {
      return;
    }

    setState((current) => {
      const nextClasses = JSON.parse(JSON.stringify(current.classes));
      const nextLayout = JSON.parse(JSON.stringify(current.layout));
      delete nextClasses[name];
      delete nextLayout[name];

      const sanitizedClasses = Object.fromEntries(
        Object.entries(nextClasses).map(([className, umlClass]) => [
          className,
          {
            ...umlClass,
            relations: umlClass.relations.filter((relation) => relation.target !== name)
          }
        ])
      );

      return {
        ...current,
        selected: current.selected === name ? Object.keys(sanitizedClasses)[0] : current.selected,
        classes: sanitizedClasses,
        layout: nextLayout
      };
    });
  };

  const renameSelectedClass = (nextName) => {
    if (!nextName || nextName === selected || classes[nextName]) {
      return;
    }

    setState((current) => {
      const nextClasses = {};
      Object.entries(current.classes).forEach(([className, umlClass]) => {
        const resolvedName = className === current.selected ? nextName : className;
        nextClasses[resolvedName] = {
          ...umlClass,
          name: resolvedName,
          relations: umlClass.relations.map((relation) =>
            relation.target === current.selected ? { ...relation, target: nextName } : relation
          )
        };
      });

      const nextLayout = { ...current.layout, [nextName]: current.layout[current.selected] };
      delete nextLayout[current.selected];

      return {
        ...current,
        selected: nextName,
        classes: nextClasses,
        layout: nextLayout
      };
    });
  };

  const autoLayout = () => {
    setState((current) => {
      const names = Object.keys(current.classes);
      const nextLayout = {};
      names.forEach((name, index) => {
        nextLayout[name] = {
          x: snap(40 + (index % 4) * 380),
          y: snap(60 + Math.floor(index / 4) * 240)
        };
      });

      return {
        ...current,
        layout: nextLayout
      };
    });
  };

  const cycleSide = (relationId, endpoint, currentSide) => {
    const SIDE_ORDER = ["right", "bottom", "left", "top"];
    const nextSide = SIDE_ORDER[(SIDE_ORDER.indexOf(currentSide) + 1) % 4];
    setState((current) => {
      const nextClasses = JSON.parse(JSON.stringify(current.classes));
      for (const cls of Object.values(nextClasses)) {
        for (const rel of cls.relations) {
          if (rel.id === relationId) {
            rel[endpoint === 'source' ? 'sourceSideOverride' : 'targetSideOverride'] = nextSide;
          }
        }
      }
      return { ...current, classes: nextClasses };
    });
  };

  const getSvgPoint = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }

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
      offsetX: pointer.x - layout[name].x,
      offsetY: pointer.y - layout[name].y
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

    if (!dragging) {
      return;
    }

    const pointer = getSvgPoint(event.clientX, event.clientY);
    setState((current) => ({
      ...current,
      layout: {
        ...current.layout,
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
    if (classNames.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const name of classNames) {
      const pos = layout[name];
      if (!pos) continue;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + CARD_WIDTH);
      maxY = Math.max(maxY, pos.y + (classHeights[name] ?? 200));
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
            <pattern id="grid-pattern" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>

            {/* Arrow open (markerEnd for association, dependency, aggregation, composition) */}
            <marker id="arrow-open" markerWidth="14" markerHeight="14" refX="13" refY="7" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M 1 1 L 13 7 L 1 13" fill="none" stroke="#64748b" strokeWidth="1.5" />
            </marker>

            {/* Triangle open (markerEnd for inheritance, implementation) */}
            <marker id="triangle-open" markerWidth="16" markerHeight="16" refX="15" refY="8" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M 1 1 L 15 8 L 1 15 Z" fill="white" stroke="#64748b" strokeWidth="1.5" />
            </marker>

            {/* Diamond open (markerStart for aggregation) */}
            <marker id="diamond-open-start" markerWidth="18" markerHeight="14" refX="1" refY="7" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M 1 7 L 9 1 L 17 7 L 9 13 Z" fill="white" stroke="#64748b" strokeWidth="1.5" />
            </marker>

            {/* Diamond filled (markerStart for composition) */}
            <marker id="diamond-filled-start" markerWidth="18" markerHeight="14" refX="1" refY="7" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M 1 7 L 9 1 L 17 7 L 9 13 Z" fill="#64748b" stroke="#64748b" strokeWidth="1.5" />
            </marker>
          </defs>

          {/* White background + grid — receives pan gestures */}
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
            fill="url(#grid-pattern)"
            onPointerDown={handlePanStart}
            style={{ cursor: panning ? 'grabbing' : 'grab' }}
          />

          {preparedRelations.map((entry) => (
            <RelationshipLine key={entry.key} {...entry} onCycleSide={cycleSide} />
          ))}

          {classNames.map((name) => (
            <UMLCard
              key={name}
              item={classes[name]}
              x={layout[name].x}
              y={layout[name].y}
              isSelected={selected === name}
              onSelect={() => setSelected(name)}
              onDelete={() => deleteClass(name)}
              onPointerDown={(event) => startDrag(name, event)}
            />
          ))}
        </svg>
      </div>

      {/* Zoom controls */}
      <div className={cn(
        "absolute bottom-4 z-20 flex items-center gap-1 rounded-2xl bg-white px-2 py-1.5 shadow-lg border border-slate-200",
        sidebarSide === 'right' ? 'left-4' : 'right-4'
      )}>
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

      <ClassSidebarPanel
        selectedClass={selectedClass}
        classNames={classNames}
        selectedName={selected}
        onRenameClass={renameSelectedClass}
        onUpdateClass={updateSelectedClass}
        sidebarSide={sidebarSide}
        onToggleSide={() => setSidebarSide(s => s === 'right' ? 'left' : 'right')}
      />
    </div>
  );
});

// Expose addClass and autoLayout for the toolbar
ClassDiagramEditor.displayName = "ClassDiagramEditor";
