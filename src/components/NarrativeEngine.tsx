import React, { useState } from "react";
import { MessageSquare, Sparkles, Send, Bot } from "lucide-react";

export const NarrativeEngine: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [logs, setLogs] = useState<Array<{ role: string; text: string }>>([
    { role: "system", text: "Narrative Engine initialized. GSK Directive PLT Alignment active." }
  ]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    const userMsg = prompt;
    setLogs((prev) => [...prev, { role: "user", text: userMsg }]);
    setPrompt("");

    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        {
          role: "gsk",
          text: `[GSK Narrative Synthesis] Story arc generated for '${userMsg}' adhering to Profit + Love - Tax True Value principles.`
        }
      ]);
    }, 400);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-6 h-6 text-pink-400" />
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Narrative & Mythos Engine</h2>
            <p className="text-xs text-slate-400 font-mono">Phase 10 Deep Lore & Narrative Worldbuilding Matrix</p>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs space-y-2 mb-4">
          {logs.map((l, idx) => (
            <div key={idx} className={`p-2 rounded ${l.role === "user" ? "bg-slate-800/60 text-cyan-300 ml-8" : l.role === "gsk" ? "bg-purple-950/40 text-purple-200 mr-8 border border-purple-800/40" : "text-slate-500 italic"}`}>
              <span className="font-bold uppercase mr-2">[{l.role}]</span>
              {l.text}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="Enter narrative topic or story arc prompt..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
          />
          <button
            onClick={handleGenerate}
            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition"
          >
            <Send className="w-3.5 h-3.5" /> Synthesize
          </button>
        </div>
      </div>
    </div>
  );
};
