import { Bot, Loader2, Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function ChatPanel({ messages, input, onInputChange, loading, error, onSend, onClose, chatEndRef }) {
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
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-slate-800 text-white whitespace-pre-wrap"
                    : "bg-slate-100 text-slate-800 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_ul]:ml-4 [&_ol]:ml-4 [&_ul]:list-disc [&_ol]:list-decimal [&_code]:rounded [&_code]:bg-slate-200 [&_code]:px-1 [&_code]:text-xs [&_pre]:my-1 [&_pre]:rounded-lg [&_pre]:bg-slate-200 [&_pre]:p-2 [&_pre]:text-xs [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_strong]:font-semibold"
                }`}
              >
                {msg.role === "user" ? msg.content : <ReactMarkdown>{msg.content}</ReactMarkdown>}
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
