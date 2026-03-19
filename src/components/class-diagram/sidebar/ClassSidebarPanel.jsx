import { useState, useEffect, useRef } from "react";
import { PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, Plus, ArrowLeftRight } from "lucide-react";
import { STEREOTYPE_OPTIONS } from "../constants.js";
import { createEmptyAttribute, createEmptyMethod } from "../factories.js";
import { AttributeEditor } from "./AttributeEditor.jsx";
import { MethodEditor } from "./MethodEditor.jsx";
import { RelationshipEditor } from "./RelationshipEditor.jsx";
import { cn } from "../../../lib/utils.js";

function AccordionSection({ title, count, defaultOpen, onAdd, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-slate-100 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-slate-600"
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {title}
          <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            {count}
          </span>
        </button>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {isOpen && children}
    </div>
  );
}

export function ClassSidebarPanel({ selectedClass, classNames, selectedName, onRenameClass, onUpdateClass, sidebarSide, onToggleSide }) {
  const [isOpen, setIsOpen] = useState(false);
  const lastManualCloseName = useRef(null);

  // Auto-open when a new class is selected; auto-close when nothing is selected
  useEffect(() => {
    if (!selectedClass) {
      setIsOpen(false);
      return;
    }
    if (selectedName !== lastManualCloseName.current) {
      setIsOpen(true);
    }
  }, [selectedClass, selectedName]);

  const handleClose = () => {
    lastManualCloseName.current = selectedName;
    setIsOpen(false);
  };

  const CloseIcon = sidebarSide === 'right' ? PanelRightClose : PanelLeftClose;
  const OpenIcon = sidebarSide === 'right' ? PanelRightOpen : PanelLeftOpen;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          lastManualCloseName.current = null;
          setIsOpen(true);
        }}
        className={cn(
          "absolute top-4 z-30 rounded-2xl bg-white p-3 shadow-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:shadow-xl transition-shadow",
          sidebarSide === 'right' ? 'right-4' : 'left-4'
        )}
      >
        <OpenIcon size={20} />
      </button>
    );
  }

  if (!selectedClass) return null;

  return (
    <div className={cn(
      "absolute top-4 z-30 w-[380px] max-h-[calc(100%-32px)] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200",
      sidebarSide === 'right' ? 'right-4' : 'left-4'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          UML Class Editor
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSide}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Move sidebar to other side"
          >
            <ArrowLeftRight size={16} />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto overscroll-contain px-5 pb-5 min-h-0">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900">Class name</label>
            <input
              value={selectedClass.name}
              onChange={(event) => onRenameClass(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900">Stereotype</label>
            <select
              value={selectedClass.stereotype}
              onChange={(event) => onUpdateClass({ stereotype: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            >
              {STEREOTYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedClass.isAbstract}
                onChange={(event) => onUpdateClass({ isAbstract: event.target.checked })}
              />
              Abstract class
            </label>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900">Description</label>
            <textarea
              value={selectedClass.description}
              onChange={(event) => onUpdateClass({ description: event.target.value })}
              rows={2}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>
        </div>

        <AccordionSection
          title="Attributes"
          count={selectedClass.attributes.length}
          defaultOpen={true}
          onAdd={() => onUpdateClass({ attributes: [...selectedClass.attributes, createEmptyAttribute()] })}
        >
          <AttributeEditor items={selectedClass.attributes} onChange={(attributes) => onUpdateClass({ attributes })} />
        </AccordionSection>

        <AccordionSection
          title="Methods"
          count={selectedClass.methods.length}
          defaultOpen={true}
          onAdd={() => onUpdateClass({ methods: [...selectedClass.methods, createEmptyMethod()] })}
        >
          <MethodEditor items={selectedClass.methods} onChange={(methods) => onUpdateClass({ methods })} />
        </AccordionSection>

        <AccordionSection
          title="Relationships"
          count={selectedClass.relations.length}
          defaultOpen={true}
        >
          <RelationshipEditor
            classNames={classNames}
            selectedName={selectedName}
            items={selectedClass.relations}
            onChange={(relations) => onUpdateClass({ relations })}
          />
        </AccordionSection>
      </div>
    </div>
  );
}
