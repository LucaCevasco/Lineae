import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Code, Copy, Download, FileCode, Loader2, MessageSquare, Plus, RotateCcw, RotateCw, Save, Send, Trash2, Upload, X } from "lucide-react";
import { diagramToJavaCode, javaCodeToDiagram, chatAboutDiagram, isApiKeyConfigured } from "./openai.js";

const RELATIONSHIP_TYPES = [
  "association",
  "aggregation",
  "composition",
  "inheritance",
  "implementation",
  "dependency"
];

const VISIBILITY_OPTIONS = ["+", "-", "#", "~"];
const STEREOTYPE_OPTIONS = ["none", "entity", "interface", "abstract", "service", "controller", "repository"];
const MULTIPLICITY_OPTIONS = ["", "1", "0..1", "*", "1..*"];
const GRID_SIZE = 20;
const CARD_WIDTH = 280;
const HEADER_HEIGHT = 64;
const LINE_HEIGHT = 18;
const SECTION_GAP = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 16;

const INITIAL_STATE = {
  selected: "User",
  classes: {
    User: {
      name: "User",
      stereotype: "entity",
      isAbstract: false,
      description: "Represents the person using the platform.",
      attributes: [
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "id",
          type: "string",
          defaultValue: "",
          isStatic: false,
          isAbstract: false
        },
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "name",
          type: "string",
          defaultValue: "",
          isStatic: false,
          isAbstract: false
        },
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "email",
          type: "string",
          defaultValue: "",
          isStatic: false,
          isAbstract: false
        }
      ],
      methods: [
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "login",
          returnType: "boolean",
          parameters: [
            { id: crypto.randomUUID(), name: "email", type: "string" },
            { id: crypto.randomUUID(), name: "password", type: "string" }
          ],
          isStatic: false,
          isAbstract: false
        },
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "logout",
          returnType: "void",
          parameters: [],
          isStatic: false,
          isAbstract: false
        }
      ],
      relations: [
        {
          id: crypto.randomUUID(),
          type: "association",
          target: "Order",
          sourceMultiplicity: "1",
          targetMultiplicity: "0..*",
          sourceRole: "customer",
          targetRole: "orders"
        }
      ]
    },
    Order: {
      name: "Order",
      stereotype: "entity",
      isAbstract: false,
      description: "Represents a purchase order created by a user.",
      attributes: [
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "orderId",
          type: "string",
          defaultValue: "",
          isStatic: false,
          isAbstract: false
        },
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "date",
          type: "Date",
          defaultValue: "",
          isStatic: false,
          isAbstract: false
        },
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "total",
          type: "number",
          defaultValue: "0",
          isStatic: false,
          isAbstract: false
        }
      ],
      methods: [
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "calculateTotal",
          returnType: "number",
          parameters: [],
          isStatic: false,
          isAbstract: false
        },
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "confirm",
          returnType: "void",
          parameters: [],
          isStatic: false,
          isAbstract: false
        }
      ],
      relations: [
        {
          id: crypto.randomUUID(),
          type: "composition",
          target: "Product",
          sourceMultiplicity: "1",
          targetMultiplicity: "1..*",
          sourceRole: "order",
          targetRole: "items"
        }
      ]
    },
    Product: {
      name: "Product",
      stereotype: "entity",
      isAbstract: false,
      description: "Represents an item that can be purchased.",
      attributes: [
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "sku",
          type: "string",
          defaultValue: "",
          isStatic: false,
          isAbstract: false
        },
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "title",
          type: "string",
          defaultValue: "",
          isStatic: false,
          isAbstract: false
        },
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "price",
          type: "number",
          defaultValue: "0",
          isStatic: false,
          isAbstract: false
        }
      ],
      methods: [
        {
          id: crypto.randomUUID(),
          visibility: "+",
          name: "updatePrice",
          returnType: "void",
          parameters: [{ id: crypto.randomUUID(), name: "price", type: "number" }],
          isStatic: false,
          isAbstract: false
        }
      ],
      relations: []
    }
  },
  layout: {
    User: { x: 40, y: 60 },
    Order: { x: 400, y: 60 },
    Product: { x: 760, y: 60 }
  }
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function snap(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function formatAttribute(attribute) {
  const base = `${attribute.visibility}${attribute.name || "attribute"}: ${attribute.type || "any"}`;
  const withDefault = attribute.defaultValue ? `${base} = ${attribute.defaultValue}` : base;
  const wrappedStatic = attribute.isStatic ? `<u>${withDefault}</u>` : withDefault;
  return attribute.isAbstract ? `/${wrappedStatic}/` : wrappedStatic;
}

function formatMethod(method) {
  const params = method.parameters
    .map((parameter) => `${parameter.name || "param"}: ${parameter.type || "any"}`)
    .join(", ");
  const base = `${method.visibility}${method.name || "method"}(${params}): ${method.returnType || "void"}`;
  const wrappedStatic = method.isStatic ? `<u>${base}</u>` : base;
  return method.isAbstract ? `/${wrappedStatic}/` : wrappedStatic;
}

function getClassHeight(umlClass) {
  const stereotypeLines = umlClass.stereotype && umlClass.stereotype !== "none" ? 1 : 0;
  const titleLines = stereotypeLines + 1;
  const header = PADDING_TOP + titleLines * LINE_HEIGHT + 14;
  const attributeSection = Math.max(1, umlClass.attributes.length) * LINE_HEIGHT + SECTION_GAP;
  const methodSection = Math.max(1, umlClass.methods.length) * LINE_HEIGHT + PADDING_BOTTOM;
  return Math.max(160, header + attributeSection + methodSection);
}

function getMarkerEndId(type) {
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

function getRelationshipDash(type) {
  if (type === "implementation" || type === "dependency") {
    return "8 6";
  }
  return undefined;
}

function createEmptyAttribute() {
  return {
    id: crypto.randomUUID(),
    visibility: "+",
    name: "attribute",
    type: "string",
    defaultValue: "",
    isStatic: false,
    isAbstract: false
  };
}

function createEmptyMethod() {
  return {
    id: crypto.randomUUID(),
    visibility: "+",
    name: "method",
    returnType: "void",
    parameters: [],
    isStatic: false,
    isAbstract: false
  };
}

function createEmptyParameter() {
  return {
    id: crypto.randomUUID(),
    name: "param",
    type: "string"
  };
}

function createEmptyRelationship(target) {
  return {
    id: crypto.randomUUID(),
    type: "association",
    target,
    sourceMultiplicity: "1",
    targetMultiplicity: "1",
    sourceRole: "",
    targetRole: ""
  };
}

function useHistoryState(initialValue) {
  const [history, setHistory] = useState([deepClone(initialValue)]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const setState = (updater) => {
    const current = history[index];
    const next = typeof updater === "function" ? updater(deepClone(current)) : updater;
    const nextHistory = history.slice(0, index + 1);
    nextHistory.push(deepClone(next));
    setHistory(nextHistory);
    setIndex(nextHistory.length - 1);
  };

  const undo = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const redo = () => {
    if (index < history.length - 1) {
      setIndex(index + 1);
    }
  };

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1
  };
}

function ToolbarButton({ icon: Icon, children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function RelationshipLine({ source, target, sourceHeight, targetHeight, relationship }) {
  if (!target) {
    return null;
  }

  const startX = source.x + CARD_WIDTH;
  const startY = source.y + sourceHeight / 2;
  const endX = target.x;
  const endY = target.y + targetHeight / 2;
  const midX = (startX + endX) / 2;
  const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  const labelX = midX;
  const labelY = (startY + endY) / 2 - 10;

  return (
    <g>
      <path
        d={path}
        fill="none"
        className="stroke-slate-500"
        strokeWidth={2}
        strokeDasharray={getRelationshipDash(relationship.type)}
        markerEnd={getMarkerEndId(relationship.type)}
      />
      {relationship.sourceMultiplicity ? (
        <text x={startX + 8} y={startY - 8} className="fill-slate-500 text-[11px]">
          {relationship.sourceMultiplicity}
        </text>
      ) : null}
      {relationship.targetMultiplicity ? (
        <text x={endX - 30} y={endY - 8} className="fill-slate-500 text-[11px]">
          {relationship.targetMultiplicity}
        </text>
      ) : null}
      {relationship.sourceRole ? (
        <text x={startX + 8} y={startY + 14} className="fill-slate-500 text-[11px]">
          {relationship.sourceRole}
        </text>
      ) : null}
      {relationship.targetRole ? (
        <text x={endX - 50} y={endY + 14} className="fill-slate-500 text-[11px]">
          {relationship.targetRole}
        </text>
      ) : null}
      <text x={labelX} y={labelY} textAnchor="middle" className="fill-slate-500 text-[11px]">
        {relationship.type}
      </text>
    </g>
  );
}

function UMLCard({ item, isSelected, onSelect, onDelete, onPointerDown, x, y }) {
  const [isHovered, setIsHovered] = useState(false);
  const height = getClassHeight(item);
  const stereotype = item.stereotype && item.stereotype !== "none" ? `«${item.stereotype}»` : null;
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
      onPointerDown={onPointerDown}
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
            ×
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

function AttributeEditor({ items, onChange }) {
  const updateItem = (id, updates) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Attributes</h3>
        <button
          type="button"
          onClick={() => onChange([...items, createEmptyAttribute()])}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={item.visibility}
              onChange={(event) => updateItem(item.id, { visibility: event.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={item.name}
              onChange={(event) => updateItem(item.id, { name: event.target.value })}
              placeholder="name"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={item.type}
              onChange={(event) => updateItem(item.id, { type: event.target.value })}
              placeholder="type"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={item.defaultValue}
              onChange={(event) => updateItem(item.id, { defaultValue: event.target.value })}
              placeholder="default value"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={item.isStatic} onChange={(event) => updateItem(item.id, { isStatic: event.target.checked })} />
              Static
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={item.isAbstract} onChange={(event) => updateItem(item.id, { isAbstract: event.target.checked })} />
              Abstract
            </label>
            <button type="button" onClick={() => removeItem(item.id)} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ParameterEditor({ parameters, onChange }) {
  const updateParameter = (id, updates) => {
    onChange(parameters.map((parameter) => (parameter.id === id ? { ...parameter, ...updates } : parameter)));
  };

  const removeParameter = (id) => {
    onChange(parameters.filter((parameter) => parameter.id !== id));
  };

  return (
    <div className="space-y-2 rounded-xl bg-slate-100 p-2">
      {parameters.map((parameter) => (
        <div key={parameter.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input
            value={parameter.name}
            onChange={(event) => updateParameter(parameter.id, { name: event.target.value })}
            placeholder="param"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <input
            value={parameter.type}
            onChange={(event) => updateParameter(parameter.id, { type: event.target.value })}
            placeholder="type"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => removeParameter(parameter.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-600 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...parameters, createEmptyParameter()])} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
        <Plus className="h-3.5 w-3.5" />
        Add parameter
      </button>
    </div>
  );
}

function MethodEditor({ items, onChange }) {
  const updateItem = (id, updates) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Methods</h3>
        <button
          type="button"
          onClick={() => onChange([...items, createEmptyMethod()])}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={item.visibility}
              onChange={(event) => updateItem(item.id, { visibility: event.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={item.name}
              onChange={(event) => updateItem(item.id, { name: event.target.value })}
              placeholder="method name"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={item.returnType}
              onChange={(event) => updateItem(item.id, { returnType: event.target.value })}
              placeholder="return type"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={item.isStatic} onChange={(event) => updateItem(item.id, { isStatic: event.target.checked })} />
                Static
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={item.isAbstract} onChange={(event) => updateItem(item.id, { isAbstract: event.target.checked })} />
                Abstract
              </label>
            </div>
          </div>
          <div className="mt-3">
            <ParameterEditor parameters={item.parameters} onChange={(parameters) => updateItem(item.id, { parameters })} />
          </div>
          <button type="button" onClick={() => removeItem(item.id)} className="mt-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function RelationshipEditor({ classNames, selectedName, items, onChange }) {
  const availableTargets = classNames.filter((className) => className !== selectedName);

  const updateItem = (id, updates) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Relationships</h3>
        <button
          type="button"
          onClick={() => onChange([...items, createEmptyRelationship(availableTargets[0] ?? selectedName)])}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={item.type} onChange={(event) => updateItem(item.id, { type: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select value={item.target} onChange={(event) => updateItem(item.id, { target: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {availableTargets.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            <select value={item.sourceMultiplicity} onChange={(event) => updateItem(item.id, { sourceMultiplicity: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {MULTIPLICITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option || "source multiplicity"}
                </option>
              ))}
            </select>
            <select value={item.targetMultiplicity} onChange={(event) => updateItem(item.id, { targetMultiplicity: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {MULTIPLICITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option || "target multiplicity"}
                </option>
              ))}
            </select>
            <input value={item.sourceRole} onChange={(event) => updateItem(item.id, { sourceRole: event.target.value })} placeholder="source role" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
            <input value={item.targetRole} onChange={(event) => updateItem(item.id, { targetRole: event.target.value })} placeholder="target role" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>
          <button type="button" onClick={() => removeItem(item.id)} className="mt-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function JavaExportModal({ code, loading, error, onClose, onCopy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-3xl rounded-3xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Export to Java</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <span className="ml-3 text-slate-500">Generating Java code...</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : (
            <pre className="overflow-auto rounded-2xl bg-slate-900 p-4 text-sm text-slate-100 whitespace-pre-wrap">{code}</pre>
          )}
        </div>
        {code && !loading ? (
          <div className="flex justify-end border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={() => onCopy(code)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Copy className="h-4 w-4" />
              Copy code
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function JavaImportModal({ code, onCodeChange, loading, error, onClose, onImport }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-3xl rounded-3xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Import from Java</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          {error ? (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          <textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="Paste your Java code here..."
            rows={16}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm"
          />
        </div>
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onImport}
            disabled={loading || !code.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />}
            Import to Diagram
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatPanel({ messages, input, onInputChange, loading, error, onSend, onClose, chatEndRef }) {
  return (
    <div className="fixed right-8 bottom-8 z-40 flex h-[600px] w-[400px] flex-col rounded-3xl bg-white shadow-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-slate-600" />
          <span className="text-sm font-bold text-slate-900">AI Assistant</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
            Ask me to modify your diagram, suggest design patterns, or answer UML questions.
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {error ? (
          <div className="rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        ) : null}
        <div ref={chatEndRef} />
      </div>
      <div className="border-t border-slate-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask about your diagram..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            disabled={loading}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { state, setState, undo, redo, canUndo, canRedo } = useHistoryState(INITIAL_STATE);
  const [dragging, setDragging] = useState(null);
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Java export modal
  const [showJavaExport, setShowJavaExport] = useState(false);
  const [javaExportCode, setJavaExportCode] = useState("");
  const [javaExportLoading, setJavaExportLoading] = useState(false);
  const [javaExportError, setJavaExportError] = useState(null);

  // Java import modal
  const [showJavaImport, setShowJavaImport] = useState(false);
  const [javaImportCode, setJavaImportCode] = useState("");
  const [javaImportLoading, setJavaImportLoading] = useState(false);
  const [javaImportError, setJavaImportError] = useState(null);

  // Chat panel
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const chatEndRef = useRef(null);

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

  useEffect(() => {
    window.localStorage.setItem("interactive-uml-editor-state", JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      if ((modifier && event.key.toLowerCase() === "y") || (modifier && event.shiftKey && event.key.toLowerCase() === "z")) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

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
      const nextClasses = deepClone(current.classes);
      const nextLayout = deepClone(current.layout);
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
      const currentClass = current.classes[current.selected];
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

  const saveJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "uml-diagram.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const parsed = JSON.parse(text);
    setState(parsed);
    event.target.value = "";
  };

  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "uml-diagram.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = async () => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    await new Promise((resolve) => {
      image.onload = resolve;
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = Math.round(1280 * (canvasHeight / 1080));
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "uml-diagram.png";
    link.click();
  };

  const handleExportJava = async () => {
    if (!isApiKeyConfigured()) {
      setJavaExportError("OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file.");
      setShowJavaExport(true);
      return;
    }
    setShowJavaExport(true);
    setJavaExportCode("");
    setJavaExportError(null);
    setJavaExportLoading(true);
    try {
      const code = await diagramToJavaCode(classes);
      setJavaExportCode(code);
    } catch (err) {
      setJavaExportError(err.message || "Failed to generate Java code.");
    } finally {
      setJavaExportLoading(false);
    }
  };

  const handleImportJava = async () => {
    if (!isApiKeyConfigured()) {
      setJavaImportError("OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file.");
      return;
    }
    if (!javaImportCode.trim()) return;
    setJavaImportError(null);
    setJavaImportLoading(true);
    try {
      const result = await javaCodeToDiagram(javaImportCode);
      setState((current) => ({
        ...current,
        selected: Object.keys(result.classes)[0] ?? current.selected,
        classes: result.classes,
        layout: result.layout,
      }));
      setShowJavaImport(false);
      setJavaImportCode("");
    } catch (err) {
      setJavaImportError(err.message || "Failed to parse Java code.");
    } finally {
      setJavaImportLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    if (!isApiKeyConfigured()) {
      setChatError("OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file.");
      return;
    }
    const userMessage = { role: "user", content: chatInput.trim() };
    const assistantMessage = { role: "assistant", content: "" };
    const nextMessages = [...chatMessages, userMessage, assistantMessage];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatError(null);
    setChatLoading(true);

    try {
      const apiMessages = [...chatMessages, userMessage].map((m) => ({ role: m.role, content: m.content }));
      const generator = chatAboutDiagram(apiMessages, { classes, layout });
      for await (const chunk of generator) {
        if (chunk.type === "delta") {
          setChatMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + chunk.text };
            return updated;
          });
        } else if (chunk.type === "result") {
          setChatMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: chunk.text };
            return updated;
          });
          if (chunk.diagramUpdate) {
            setState((current) => ({
              ...current,
              selected: Object.keys(chunk.diagramUpdate.classes)[0] ?? current.selected,
              classes: chunk.diagramUpdate.classes,
              layout: chunk.diagramUpdate.layout,
            }));
          }
        }
      }
    } catch (err) {
      setChatError(err.message || "Chat request failed.");
    } finally {
      setChatLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <svg width="320" height="80" viewBox="0 0 960 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-1">
              <defs>
                <linearGradient id="bannerGradient" x1="40" y1="40" x2="220" y2="200" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0F172A"/>
                  <stop offset="1" stopColor="#334155"/>
                </linearGradient>
                <linearGradient id="bannerAccent" x1="100" y1="60" x2="180" y2="160" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38BDF8"/>
                  <stop offset="1" stopColor="#6366F1"/>
                </linearGradient>
              </defs>
              <g transform="translate(40 40)">
                <rect x="0" y="0" width="180" height="160" rx="28" fill="url(#bannerGradient)"/>
                <path d="M42 46H92M42 80H138M42 114H76" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round"/>
                <path d="M92 46H124V80H138M76 114H124V80" stroke="url(#bannerAccent)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="92" cy="46" r="10" fill="#38BDF8"/>
                <circle cx="138" cy="80" r="10" fill="#6366F1"/>
                <circle cx="76" cy="114" r="10" fill="#22C55E"/>
                <circle cx="124" cy="80" r="8" fill="#F8FAFC"/>
                <rect x="24" y="24" width="132" height="112" rx="18" stroke="rgba(255,255,255,0.12)" strokeWidth="2"/>
              </g>
              <g transform="translate(260 62)">
                <text x="0" y="58" fill="#0F172A" fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" fontSize="72" fontWeight="800" letterSpacing="6">LINEAE</text>
                <text x="2" y="104" fill="#475569" fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" fontSize="24" fontWeight="500" letterSpacing="1.5">UML diagram editor</text>
                <path d="M4 128H278" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round"/>
                <circle cx="4" cy="128" r="6" fill="#38BDF8"/>
                <circle cx="278" cy="128" r="6" fill="#6366F1"/>
              </g>
            </svg>
          </div>
          <div className="flex flex-wrap gap-2">
            <ToolbarButton icon={Plus} onClick={addClass}>Add class</ToolbarButton>
            <ToolbarButton icon={RotateCcw} onClick={undo} disabled={!canUndo}>Undo</ToolbarButton>
            <ToolbarButton icon={RotateCw} onClick={redo} disabled={!canRedo}>Redo</ToolbarButton>
            <ToolbarButton icon={Save} onClick={saveJson}>Save JSON</ToolbarButton>
            <ToolbarButton icon={Upload} onClick={() => fileInputRef.current?.click()}>Load JSON</ToolbarButton>
            <ToolbarButton icon={Download} onClick={exportSvg}>Export SVG</ToolbarButton>
            <ToolbarButton icon={Download} onClick={exportPng}>Export PNG</ToolbarButton>
            <ToolbarButton icon={RotateCw} onClick={autoLayout}>Auto layout</ToolbarButton>
            <ToolbarButton icon={Code} onClick={handleExportJava}>Export Java</ToolbarButton>
            <ToolbarButton icon={FileCode} onClick={() => setShowJavaImport(true)}>Import Java</ToolbarButton>
            <ToolbarButton icon={MessageSquare} onClick={() => setShowChat((s) => !s)}>
              {showChat ? "Close Chat" : "AI Chat"}
            </ToolbarButton>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={loadJson} className="hidden" />
          </div>
        </div>

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

              {classNames.flatMap((name) => {
                const source = layout[name];
                const sourceHeight = classHeights[name];
                return classes[name].relations.map((relationship) => {
                  const target = layout[relationship.target];
                  const targetHeight = classHeights[relationship.target];
                  return (
                    <RelationshipLine
                      key={relationship.id}
                      source={source}
                      target={target}
                      sourceHeight={sourceHeight}
                      targetHeight={targetHeight}
                      relationship={relationship}
                    />
                  );
                });
              })}

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
      </div>
      {showJavaExport ? (
        <JavaExportModal
          code={javaExportCode}
          loading={javaExportLoading}
          error={javaExportError}
          onClose={() => setShowJavaExport(false)}
          onCopy={copyToClipboard}
        />
      ) : null}
      {showJavaImport ? (
        <JavaImportModal
          code={javaImportCode}
          onCodeChange={setJavaImportCode}
          loading={javaImportLoading}
          error={javaImportError}
          onClose={() => { setShowJavaImport(false); setJavaImportError(null); }}
          onImport={handleImportJava}
        />
      ) : null}
      {showChat ? (
        <ChatPanel
          messages={chatMessages}
          input={chatInput}
          onInputChange={setChatInput}
          loading={chatLoading}
          error={chatError}
          onSend={handleChatSend}
          onClose={() => setShowChat(false)}
          chatEndRef={chatEndRef}
        />
      ) : null}
    </div>
  );
}
