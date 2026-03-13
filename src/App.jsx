import { useEffect, useRef, useState } from "react";
import { Code, Download, FileCode, MessageSquare, Plus, RotateCcw, RotateCw, Save, Upload, Users, ArrowRightLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs.jsx";
import { useHistoryState } from "./hooks/useHistoryState.js";
import { ToolbarButton } from "./components/shared/ToolbarButton.jsx";
import { ChatPanel } from "./components/shared/ChatPanel.jsx";
import { JavaExportModal } from "./components/shared/JavaExportModal.jsx";
import { JavaImportModal } from "./components/shared/JavaImportModal.jsx";
import { ClassDiagramEditor } from "./components/class-diagram/ClassDiagramEditor.jsx";
import { SequenceDiagramEditor } from "./components/sequence-diagram/SequenceDiagramEditor.jsx";
import { createEmptyAttribute } from "./components/class-diagram/factories.js";
import { createEmptyMethod } from "./components/class-diagram/factories.js";
import { diagramToJavaCode, javaCodeToDiagram, chatAboutDiagram, isApiKeyConfigured } from "./ai/openai.js";

const INITIAL_STATE = {
  selected: "User",
  classes: {
    User: {
      name: "User",
      stereotype: "entity",
      isAbstract: false,
      description: "Represents the person using the platform.",
      attributes: [
        { id: crypto.randomUUID(), visibility: "+", name: "id", type: "string", defaultValue: "", isStatic: false, isAbstract: false },
        { id: crypto.randomUUID(), visibility: "+", name: "name", type: "string", defaultValue: "", isStatic: false, isAbstract: false },
        { id: crypto.randomUUID(), visibility: "+", name: "email", type: "string", defaultValue: "", isStatic: false, isAbstract: false }
      ],
      methods: [
        { id: crypto.randomUUID(), visibility: "+", name: "login", returnType: "boolean", parameters: [{ id: crypto.randomUUID(), name: "email", type: "string" }, { id: crypto.randomUUID(), name: "password", type: "string" }], isStatic: false, isAbstract: false },
        { id: crypto.randomUUID(), visibility: "+", name: "logout", returnType: "void", parameters: [], isStatic: false, isAbstract: false }
      ],
      relations: [
        { id: crypto.randomUUID(), type: "association", target: "Order", sourceMultiplicity: "1", targetMultiplicity: "0..*", sourceRole: "customer", targetRole: "orders" }
      ]
    },
    Order: {
      name: "Order",
      stereotype: "entity",
      isAbstract: false,
      description: "Represents a purchase order created by a user.",
      attributes: [
        { id: crypto.randomUUID(), visibility: "+", name: "orderId", type: "string", defaultValue: "", isStatic: false, isAbstract: false },
        { id: crypto.randomUUID(), visibility: "+", name: "date", type: "Date", defaultValue: "", isStatic: false, isAbstract: false },
        { id: crypto.randomUUID(), visibility: "+", name: "total", type: "number", defaultValue: "0", isStatic: false, isAbstract: false }
      ],
      methods: [
        { id: crypto.randomUUID(), visibility: "+", name: "calculateTotal", returnType: "number", parameters: [], isStatic: false, isAbstract: false },
        { id: crypto.randomUUID(), visibility: "+", name: "confirm", returnType: "void", parameters: [], isStatic: false, isAbstract: false }
      ],
      relations: [
        { id: crypto.randomUUID(), type: "composition", target: "Product", sourceMultiplicity: "1", targetMultiplicity: "1..*", sourceRole: "order", targetRole: "items" }
      ]
    },
    Product: {
      name: "Product",
      stereotype: "entity",
      isAbstract: false,
      description: "Represents an item that can be purchased.",
      attributes: [
        { id: crypto.randomUUID(), visibility: "+", name: "sku", type: "string", defaultValue: "", isStatic: false, isAbstract: false },
        { id: crypto.randomUUID(), visibility: "+", name: "title", type: "string", defaultValue: "", isStatic: false, isAbstract: false },
        { id: crypto.randomUUID(), visibility: "+", name: "price", type: "number", defaultValue: "0", isStatic: false, isAbstract: false }
      ],
      methods: [
        { id: crypto.randomUUID(), visibility: "+", name: "updatePrice", returnType: "void", parameters: [{ id: crypto.randomUUID(), name: "price", type: "number" }], isStatic: false, isAbstract: false }
      ],
      relations: []
    }
  },
  layout: {
    User: { x: 40, y: 60 },
    Order: { x: 400, y: 60 },
    Product: { x: 760, y: 60 }
  },
  sequenceSelected: null,
  sequence: {
    participants: [],
    messages: []
  }
};

function loadInitialState() {
  try {
    const raw = window.localStorage.getItem("interactive-uml-editor-state");
    if (raw) {
      const stored = JSON.parse(raw);
      if (!stored.sequence) {
        stored.sequence = { participants: [], messages: [] };
      }
      if (stored.sequenceSelected === undefined) {
        stored.sequenceSelected = null;
      }
      return stored;
    }
  } catch {
    // ignore
  }
  return INITIAL_STATE;
}

export default function App() {
  const { state, setState, undo, redo, canUndo, canRedo } = useHistoryState(loadInitialState());
  const [activeTab, setActiveTab] = useState("class");

  const classRef = useRef(null);
  const seqRef = useRef(null);
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

  // Persist to localStorage
  useEffect(() => {
    window.localStorage.setItem("interactive-uml-editor-state", JSON.stringify(state));
  }, [state]);

  // Keyboard shortcuts for undo/redo
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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- Actions ---

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
            x: Math.round((40 + (existingNames.length % 3) * 340) / 20) * 20,
            y: Math.round((60 + Math.floor(existingNames.length / 3) * 220) / 20) * 20
          }
        }
      };
    });
  };

  const addParticipant = () => {
    setState((current) => {
      const newP = {
        id: crypto.randomUUID(),
        name: `Participant${current.sequence.participants.length + 1}`,
        type: "participant",
        order: current.sequence.participants.length
      };
      return {
        ...current,
        sequence: {
          ...current.sequence,
          participants: [...current.sequence.participants, newP]
        }
      };
    });
  };

  const addMessage = () => {
    setState((current) => {
      const sorted = [...current.sequence.participants].sort((a, b) => a.order - b.order);
      if (sorted.length < 2) return current;
      const newMsg = {
        id: crypto.randomUUID(),
        from: sorted[0].id,
        to: sorted[1].id,
        label: "message",
        type: "sync",
        order: current.sequence.messages.length
      };
      return {
        ...current,
        sequence: {
          ...current.sequence,
          messages: [...current.sequence.messages, newMsg]
        }
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
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed.sequence) {
      parsed.sequence = { participants: [], messages: [] };
    }
    if (parsed.sequenceSelected === undefined) {
      parsed.sequenceSelected = null;
    }
    setState(parsed);
    event.target.value = "";
  };

  const getActiveSvg = () => {
    if (activeTab === "sequence") return seqRef.current?.getSvgElement();
    return classRef.current?.getSvgElement();
  };

  const exportSvg = () => {
    const svg = getActiveSvg();
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uml-${activeTab}-diagram.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = async () => {
    const svg = getActiveSvg();
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    await new Promise((resolve) => { image.onload = resolve; image.src = url; });
    const vb = svg.viewBox.baseVal;
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = Math.round(1280 * (vb.height / vb.width));
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `uml-${activeTab}-diagram.png`;
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
      const code = await diagramToJavaCode(state.classes);
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
      const generator = chatAboutDiagram(apiMessages, state, activeTab);
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
            if (chunk.diagramType === "sequence") {
              setState((current) => ({
                ...current,
                sequence: chunk.diagramUpdate,
              }));
            } else {
              setState((current) => ({
                ...current,
                selected: Object.keys(chunk.diagramUpdate.classes)[0] ?? current.selected,
                classes: chunk.diagramUpdate.classes,
                layout: chunk.diagramUpdate.layout,
              }));
            }
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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-wrap items-center gap-3">
              <TabsList>
                <TabsTrigger value="class">UML Class Diagram</TabsTrigger>
                <TabsTrigger value="sequence">Sequence Diagram</TabsTrigger>
              </TabsList>

              <div className="flex flex-wrap gap-2">
                {/* Common toolbar buttons */}
                <ToolbarButton icon={RotateCcw} onClick={undo} disabled={!canUndo}>Undo</ToolbarButton>
                <ToolbarButton icon={RotateCw} onClick={redo} disabled={!canRedo}>Redo</ToolbarButton>
                <ToolbarButton icon={Save} onClick={saveJson}>Save JSON</ToolbarButton>
                <ToolbarButton icon={Upload} onClick={() => fileInputRef.current?.click()}>Load JSON</ToolbarButton>
                <ToolbarButton icon={Download} onClick={exportSvg}>Export SVG</ToolbarButton>
                <ToolbarButton icon={Download} onClick={exportPng}>Export PNG</ToolbarButton>

                {/* Class diagram specific buttons */}
                {activeTab === "class" ? (
                  <>
                    <ToolbarButton icon={Plus} onClick={addClass}>Add class</ToolbarButton>
                    <ToolbarButton icon={Code} onClick={handleExportJava}>Export Java</ToolbarButton>
                    <ToolbarButton icon={FileCode} onClick={() => setShowJavaImport(true)}>Import Java</ToolbarButton>
                  </>
                ) : null}

                {/* Sequence diagram specific buttons */}
                {activeTab === "sequence" ? (
                  <>
                    <ToolbarButton icon={Users} onClick={addParticipant}>Add Participant</ToolbarButton>
                    <ToolbarButton icon={ArrowRightLeft} onClick={addMessage}>Add Message</ToolbarButton>
                  </>
                ) : null}

                <ToolbarButton icon={MessageSquare} onClick={() => setShowChat((s) => !s)}>
                  {showChat ? "Close Chat" : "AI Chat"}
                </ToolbarButton>
                <input ref={fileInputRef} type="file" accept="application/json" onChange={loadJson} className="hidden" />
              </div>
            </div>

            <TabsContent value="class">
              <ClassDiagramEditor ref={classRef} state={state} setState={setState} />
            </TabsContent>
            <TabsContent value="sequence">
              <SequenceDiagramEditor ref={seqRef} state={state} setState={setState} />
            </TabsContent>
          </Tabs>
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
