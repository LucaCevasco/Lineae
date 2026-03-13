import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { CARD_WIDTH, GRID_SIZE, STEREOTYPE_OPTIONS } from "./constants.js";
import { getClassHeight, getConnectionSides } from "./geometry.js";
import { createEmptyAttribute, createEmptyMethod } from "./factories.js";
import { RelationshipLine } from "./RelationshipLine.jsx";
import { UMLCard } from "./UMLCard.jsx";
import { AttributeEditor } from "./sidebar/AttributeEditor.jsx";
import { MethodEditor } from "./sidebar/MethodEditor.jsx";
import { RelationshipEditor } from "./sidebar/RelationshipEditor.jsx";

function snap(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export const ClassDiagramEditor = forwardRef(function ClassDiagramEditor({ state, setState }, ref) {
  const [dragging, setDragging] = useState(null);
  const svgRef = useRef(null);

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
    const portMap = {};
    const entries = [];

    for (const name of Object.keys(classes)) {
      const source = layout[name];
      if (!source) continue;
      for (const rel of classes[name].relations) {
        const target = layout[rel.target];
        if (!target) continue;
        const { sourceSide, targetSide } = getConnectionSides(
          source, target, classHeights[name] ?? 0, classHeights[rel.target] ?? 0
        );
        if (!portMap[name]) portMap[name] = { left: [], right: [], top: [], bottom: [] };
        if (!portMap[rel.target]) portMap[rel.target] = { left: [], right: [], top: [], bottom: [] };
        portMap[name][sourceSide].push(rel.id);
        portMap[rel.target][targetSide].push(rel.id);
        entries.push({ sourceName: name, rel, sourceSide, targetSide });
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

  const canvasHeight = useMemo(() => {
    const MIN_HEIGHT = 720;
    const PADDING = 80;
    let maxBottom = 0;
    for (const name of classNames) {
      const pos = layout[name];
      if (pos) {
        const bottom = pos.y + (classHeights[name] ?? 0);
        if (bottom > maxBottom) maxBottom = bottom;
      }
    }
    return Math.max(MIN_HEIGHT, maxBottom + PADDING);
  }, [classNames, layout, classHeights]);

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
            x: snap(40 + (existingNames.length % 3) * 340),
            y: snap(60 + Math.floor(existingNames.length / 3) * 220)
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
          x: snap(40 + (index % 3) * 340),
          y: snap(60 + Math.floor(index / 3) * 240)
        };
      });

      return {
        ...current,
        layout: nextLayout
      };
    });
  };

  const getSvgPoint = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }

    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    return {
      x: ((clientX - rect.left) / rect.width) * viewBox.width,
      y: ((clientY - rect.top) / rect.height) * viewBox.height
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

  const handlePointerMove = (event) => {
    if (!dragging) {
      return;
    }

    const pointer = getSvgPoint(event.clientX, event.clientY);
    setState((current) => ({
      ...current,
      layout: {
        ...current.layout,
        [dragging.name]: {
          x: Math.max(0, Math.min(snap(pointer.x - dragging.offsetX), 1080 - CARD_WIDTH)),
          y: Math.max(0, snap(pointer.y - dragging.offsetY))
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
          <defs>
            <marker id="arrow-open" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 10 6 L 0 12" fill="none" stroke="#64748b" strokeWidth="1.5" />
            </marker>
            <marker id="triangle-open" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 12 7 L 0 14 Z" fill="white" stroke="#64748b" strokeWidth="1.5" />
            </marker>
            <marker id="diamond-open" markerWidth="16" markerHeight="16" refX="14" refY="8" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 8 L 6 0 L 12 8 L 6 16 Z" fill="white" stroke="#64748b" strokeWidth="1.5" />
            </marker>
            <marker id="diamond-filled" markerWidth="16" markerHeight="16" refX="14" refY="8" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 8 L 6 0 L 12 8 L 6 16 Z" fill="#64748b" stroke="#64748b" strokeWidth="1.5" />
            </marker>
          </defs>

          {preparedRelations.map((entry) => (
            <RelationshipLine key={entry.key} {...entry} />
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

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        {selectedClass ? (
          <>
            <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              UML Class Editor
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Class name</label>
                <input value={selectedClass.name} onChange={(event) => renameSelectedClass(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Stereotype</label>
                <select value={selectedClass.stereotype} onChange={(event) => updateSelectedClass({ stereotype: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  {STEREOTYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedClass.isAbstract} onChange={(event) => updateSelectedClass({ isAbstract: event.target.checked })} />
                  Abstract class
                </label>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Description</label>
                <textarea value={selectedClass.description} onChange={(event) => updateSelectedClass({ description: event.target.value })} rows={3} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
              </div>
            </div>

            <AttributeEditor items={selectedClass.attributes} onChange={(attributes) => updateSelectedClass({ attributes })} />
            <MethodEditor items={selectedClass.methods} onChange={(methods) => updateSelectedClass({ methods })} />
            <RelationshipEditor
              classNames={classNames}
              selectedName={selected}
              items={selectedClass.relations}
              onChange={(relations) => updateSelectedClass({ relations })}
            />
          </>
        ) : null}
      </div>
    </div>
  );
});

// Expose addClass and autoLayout for the toolbar
ClassDiagramEditor.displayName = "ClassDiagramEditor";
