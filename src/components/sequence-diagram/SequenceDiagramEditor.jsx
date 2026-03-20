import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { createEmptyParticipant, createEmptyMessage } from "./factories.js";
import { getCanvasWidth, getCanvasHeight } from "./geometry.js";
import { SequenceCanvas } from "./SequenceCanvas.jsx";
import { ParticipantEditor } from "./sidebar/ParticipantEditor.jsx";
import { MessageEditor } from "./sidebar/MessageEditor.jsx";

export const SequenceDiagramEditor = forwardRef(function SequenceDiagramEditor({ state, setState }, ref) {
  const svgRef = useRef(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [panning, setPanning] = useState(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 700 });
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

  const { sequence } = state;
  const { participants, messages } = sequence;

  const updateSequence = (updates) => {
    setState((current) => ({
      ...current,
      sequence: {
        ...current.sequence,
        ...updates
      }
    }));
  };

  const addParticipant = () => {
    const newP = createEmptyParticipant(participants.length);
    updateSequence({ participants: [...participants, newP] });
  };

  const addMessage = () => {
    if (participants.length < 2) return;
    const sorted = [...participants].sort((a, b) => a.order - b.order);
    const newMsg = createEmptyMessage(sorted[0].id, sorted[1].id, messages.length);
    updateSequence({ messages: [...messages, newMsg] });
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
    if (!panning) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = (event.clientX - panning.clientX) * (viewWidth / rect.width);
    const dy = (event.clientY - panning.clientY) * (viewHeight / rect.height);
    setCamera(prev => ({ ...prev, x: panning.startX - dx, y: panning.startY - dy }));
  };

  const handlePointerUp = (event) => {
    if (panning) {
      svgRef.current?.releasePointerCapture(event.pointerId);
      setPanning(null);
    }
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
    const sorted = [...participants].sort((a, b) => a.order - b.order);
    if (sorted.length === 0) return;
    const contentW = getCanvasWidth(sorted.length);
    const contentH = getCanvasHeight(messages.length);
    const pad = 40;
    const cw = containerSize.width || 1200;
    const ch = containerSize.height || 700;
    const newZoom = Math.min(3.0, Math.max(0.25, Math.min(cw / (contentW + 2 * pad), ch / (contentH + 2 * pad))));
    const newVW = cw / newZoom;
    const newVH = ch / newZoom;
    setCamera({
      x: -pad - (newVW - contentW) / 2,
      y: -pad - (newVH - contentH) / 2,
      zoom: newZoom,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
      <div className="relative">
        <div className="rounded-3xl bg-white p-4 shadow-sm overflow-hidden"
             style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
          <SequenceCanvas
            participants={participants}
            messages={messages}
            selectedId={selectedParticipant}
            onSelectParticipant={setSelectedParticipant}
            svgRef={svgRef}
            camera={camera}
            viewWidth={viewWidth}
            viewHeight={viewHeight}
            panning={panning}
            onPanStart={handlePanStart}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
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
        <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Sequence Diagram Editor
        </div>
        <ParticipantEditor
          participants={participants}
          onChange={(p) => updateSequence({ participants: p })}
          selectedId={selectedParticipant}
          onSelect={setSelectedParticipant}
        />
        <MessageEditor
          messages={messages}
          participants={participants}
          onChange={(m) => updateSequence({ messages: m })}
        />
      </div>
    </div>
  );
});

SequenceDiagramEditor.displayName = "SequenceDiagramEditor";
