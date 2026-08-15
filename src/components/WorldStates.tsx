import React, { useState } from "react";
import { WorldState } from "../types";
import { Globe, Plus, Cpu, Activity, Zap } from "lucide-react";

export const WorldStates: React.FC = () => {
  const [worlds, setWorlds] = useState<WorldState[]>([
    {
      id: "world-alpha",
      name: "Alpha Prime Multiverse",
      description: "Primary sovereign state for GSK kernel operations and PLT equilibrium.",
      physics: {
        gravity: 9.81,
        speedOfLight: 299792458,
        entropyRate: 12,
        dimensions: 3,
        temporalFlow: "linear"
      },
      economics: {
        currency: "SOUL",
        transactionTax: 0.05,
        resourceScarcity: 40,
        marketStructure: "oracle-governed"
      },
      consciousness: {
        gskChambersCount: 34,
        emotionalWeight: 0.85,
        dualProcessRouting: true,
        pltScoringEnabled: true,
        metacognitionRate: 0.92
      },
      createdAt: new Date().toISOString(),
      activeAgents: ["LedgerScout", "OmniScribe", "AuraGuardian"]
    }
  ]);

  return (
    <div className="space-y-6 text-left">
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Multiverse World States Engine</h2>
              <p className="text-xs text-slate-400 font-mono">Phase 8 Multiverse World Management & Rule Calibration</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 text-xs font-mono rounded-lg">
            Active Worlds: {worlds.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {worlds.map((w) => (
            <div key={w.id} className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{w.name}</span>
                <span className="text-[10px] font-mono text-cyan-400 border border-cyan-800/50 px-2 py-0.5 rounded">
                  {w.economics.currency} Sovereign
                </span>
              </div>
              <p className="text-xs text-slate-400">{w.description}</p>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-slate-900/60 p-2 rounded border border-slate-800/40">
                <div>
                  <span className="text-slate-500 block">PLT Scoring</span>
                  <span className="text-emerald-400">{w.consciousness.pltScoringEnabled ? "ENFORCED" : "OFF"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Chambers</span>
                  <span className="text-cyan-400">{w.consciousness.gskChambersCount} Active</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Metacognition</span>
                  <span className="text-purple-400">{(w.consciousness.metacognitionRate * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
