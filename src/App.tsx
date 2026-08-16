import { useState } from "react";
import { AgentProfile, Skill, MarketplaceTransaction } from "./types";
import { INITIAL_SKILLS } from "./constants";
import { AgentPreview } from "./components/AgentPreview";
import { SkillLibrary } from "./components/SkillLibrary";
import { WorkflowIntegration } from "./components/WorkflowIntegration";
import { AgentSimulator } from "./components/AgentSimulator";
import { BrainIngestion } from "./components/BrainIngestion";
import { MatrixBackground } from "./components/MatrixBackground";
import { RealismAuditor } from "./components/RealismAuditor";
import { VaultAndMemory } from "./components/VaultAndMemory";
import { MultiAgentHabitat } from "./components/MultiAgentHabitat";
import { SoulMarketplace } from "./components/SoulMarketplace";
import { TransactionsTab } from "./components/TransactionsTab";
import { SolanaWalletAdapter } from "./components/SolanaWalletAdapter";
import { CoreCapabilities } from "./components/CoreCapabilities";
import { GSKTelephone } from "./components/GSKTelephone";
import { GSKAlarmOverlay } from "./components/GSKAlarmOverlay";
import { useGSKPerception } from "./hooks/useGSKPerception";
import { 
  SlidersHorizontal, 
  Terminal, 
  Settings2,
  ShieldCheck,
  Key,
  Users,
  ShoppingBag,
  Layers,
  BookOpen,
  Network,
  Globe,
  MessageSquare,
  Zap,
  Download,
  Copy,
  X,
  Check
} from "lucide-react";

export default function App() {
  // GSK Perception Layer State
  const [gskState, setGskState] = useState<any>({ mood: 'neutral', emotionalConfig: {} });
  const { frustrationLevel, gskMood } = useGSKPerception(setGskState);
  
  // Master state definitions
  const [profile, setProfile] = useState<AgentProfile>({
    name: "LedgerScout Protocol",
    avatarSeed: "nexus_node_01",
    avatarColor: "#ec4899", // Default CyberPsychedelic Neon Pink
    personality: "Meticulous, objective ledger reconciliation agent with structured thinking",
    behavior: "Automatically watch text feeds, extract formatted numbers, flag balances, and draft transactional sync triggers.",
    autonomy: 75,
    temperature: 0.3,
    thinking: "precise",
    clothingStyle: "tactical_suit",
    clothingColor: "#10b981",
    hairStyle: "cyber_spike",
    hairColor: "#3b82f6",
    equippedWeapon: "glowing_katanas",
    weaponColor: "#f43f5e",
  });

  const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
  const [activeTab, setActiveTab] = useState<
    "capabilities" | "profile" | "skills" | "simulation" | "cpl_library" |
    "connections" | "realism" | "vault" | "world_states" | "marketplace" |
    "narrative" | "habitat" | "transcendence"
  >("capabilities");

  const [strictRealismMode, setStrictRealismMode] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false);

  // QSC balance state
  const [qscBalance, setQscBalance] = useState<number>(() => {
    const saved = localStorage.getItem("agent_workbench_qsc_balance");
    return saved ? parseInt(saved) : 2500;
  });

  // Transactions ledger state
  const [transactions, setTransactions] = useState<MarketplaceTransaction[]>(() => {
    const saved = localStorage.getItem("agent_workbench_transactions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fall back to default if parsing fails
      }
    }
    return [
      {
        id: "tx-init-001",
        type: "mining",
        title: "Initial Sovereign Multiverse Genesis Grant",
        amount: 2500,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const activeSkillsCount = skills.filter((s) => s.unlocked).length;

  const handleCopyJson = () => {
    const fullConfig = {
      profile,
      skills: skills.filter((s) => s.unlocked),
      exportedAt: new Date().toISOString(),
      strictRealismMode,
      pltFramework: {
        formula: "Profit + Love - Tax = True Value",
        profitWeight: 0.85,
        loveWeight: 0.92,
        taxWeight: 0.15,
        trueValue: 1.62
      }
    };
    navigator.clipboard.writeText(JSON.stringify(fullConfig, null, 2));
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const handleDownloadJson = () => {
    const fullConfig = {
      profile,
      skills: skills.filter((s) => s.unlocked),
      exportedAt: new Date().toISOString(),
      strictRealismMode,
      pltFramework: {
        formula: "Profit + Love - Tax = True Value",
        profitWeight: 0.85,
        loveWeight: 0.92,
        taxWeight: 0.15,
        trueValue: 1.62
      }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullConfig, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${profile.name.toLowerCase().replace(/\s+/g, "_")}_config.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-pink-500 selection:text-white">
      {/* PHASE 240: GSK Alarm Overlay - Critical Bug Alerts */}
      <GSKAlarmOverlay />
      
      {/* Background cybernetic grid */}
      <MatrixBackground />

      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-pink-500/20 font-mono text-sm">
            GSK
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-100 text-sm tracking-wide">{profile.name}</h1>
              <span className="text-[10px] bg-pink-950/80 text-pink-400 border border-pink-800/60 font-mono px-2 py-0.5 rounded-full font-bold">
                PLT TRUE VALUE: 1.62
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              230 GSK PHASES • RENDER FREE TIER • PORT 3001/4491
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <SolanaWalletAdapter qscBalance={qscBalance} />

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT CONF
          </button>
        </div>
      </header>

      {/* 12-Tab GSK Multiverse Subsystem Navigation */}
      <div className="bg-slate-900/50 backdrop-blur-lg border-b border-slate-800/80 px-6 py-2.5 relative z-10 text-left">
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">
          12 GSK MULTIVERSE SUBSYSTEMS (PHASES 0.1 - 230)
        </span>
        <div className="flex flex-wrap gap-2">
          {/* TAB 0. Overview */}
          <button
            onClick={() => setActiveTab("capabilities")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "capabilities" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-pink-400" />
            0. OVERVIEW
          </button>

          {/* TAB 1. Agent Forge */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "profile" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
            1. AGENT FORGE
          </button>

          {/* TAB 2. Skill Codex */}
          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "skills" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 text-pink-400" />
            2. SKILL CODEX ({activeSkillsCount})
          </button>

          {/* TAB 3. GSK Engine */}
          <button
            onClick={() => setActiveTab("simulation")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "simulation" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-pink-400" />
            3. GSK ENGINE
          </button>

          {/* TAB 4. CPL Library */}
          <button
            onClick={() => setActiveTab("cpl_library")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "cpl_library" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-pink-400" />
            4. CPL LIBRARY
          </button>

          {/* TAB 5. Connections */}
          <button
            onClick={() => setActiveTab("connections")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "connections" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-3.5 h-3.5 text-pink-400" />
            5. CONNECTIONS
          </button>

          {/* TAB 6. 4 Gods Realm */}
          <button
            onClick={() => setActiveTab("realism")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "realism" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
            6. 4 GODS REALM
          </button>

          {/* TAB 7. Living Memory */}
          <button
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "vault" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="w-3.5 h-3.5 text-pink-400" />
            7. LIVING MEMORY
          </button>

          {/* TAB 8. World States */}
          <button
            onClick={() => setActiveTab("world_states")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "world_states" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-pink-400" />
            8. WORLD STATES
          </button>

          {/* TAB 9. Economy Forge */}
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "marketplace" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-pink-400" />
            9. ECONOMY FORGE
          </button>

          {/* TAB 10. Narrative Engine */}
          <button
            onClick={() => setActiveTab("narrative")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "narrative" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
            10. NARRATIVE ENGINE
          </button>

          {/* TAB 11. Multiverse Habitat */}
          <button
            onClick={() => setActiveTab("habitat")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "habitat" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-pink-400" />
            11. MULTI HABITAT
          </button>

          {/* TAB 12. Transcendence */}
          <button
            onClick={() => setActiveTab("transcendence")}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all duration-300 ${
              activeTab === "transcendence" ? "bg-slate-800 text-white font-bold border-pink-500" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            12. TRANSCENDENCE
          </button>
        </div>
      </div>

      {/* Main Workspace Content */}
      <main className="flex-1 p-6 relative z-10 max-w-7xl mx-auto w-full">
        {activeTab === "capabilities" && <CoreCapabilities />}

        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AgentPreview profile={profile} setProfile={setProfile} />
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 text-left">
              <h2 className="text-lg font-bold text-white mb-2">PLT Framework Sovereignty</h2>
              <p className="text-xs text-slate-400 font-mono mb-4">
                Profit + Love - Tax = True Value
              </p>
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-slate-950 border border-emerald-900/50 rounded-lg flex justify-between">
                  <span className="text-emerald-400">PROFIT (Mythos)</span>
                  <span className="text-white">0.85</span>
                </div>
                <div className="p-3 bg-slate-950 border border-pink-900/50 rounded-lg flex justify-between">
                  <span className="text-pink-400">LOVE (Affect)</span>
                  <span className="text-white">0.92</span>
                </div>
                <div className="p-3 bg-slate-950 border border-amber-900/50 rounded-lg flex justify-between">
                  <span className="text-amber-400">TAX (Volition)</span>
                  <span className="text-white">0.15</span>
                </div>
                <div className="p-3 bg-purple-950/60 border border-purple-800 rounded-lg flex justify-between font-bold">
                  <span className="text-purple-300">TRUE VALUE</span>
                  <span className="text-purple-200">1.62</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "skills" && (
          <SkillLibrary skills={skills} setSkills={setSkills} />
        )}

        {activeTab === "simulation" && (
          <AgentSimulator profile={profile} skills={skills} />
        )}

        {activeTab === "cpl_library" && <CplLibrary />}

        {activeTab === "connections" && <ConnectionsManager />}

        {activeTab === "realism" && (
          <RealismAuditor
            profile={profile}
            skills={skills}
            strictRealismMode={strictRealismMode}
            setStrictRealismMode={setStrictRealismMode}
          />
        )}

        {activeTab === "vault" && (
          <div className="space-y-6">
            <BrainIngestion />
            <VaultAndMemory />
          </div>
        )}

        {activeTab === "world_states" && <WorldStates />}

        {activeTab === "marketplace" && (
          <div className="space-y-6">
            <SoulMarketplace
              qscBalance={qscBalance}
              setQscBalance={setQscBalance}
              setTransactions={setTransactions}
            />
            <TransactionsTab transactions={transactions} />
          </div>
        )}

        {activeTab === "narrative" && <NarrativeEngine />}

        {activeTab === "habitat" && <MultiAgentHabitat />}

        {activeTab === "transcendence" && <TranscendenceTab />}
      </main>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full text-left space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">GSK Config Export</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Export full GSK profile, active skills, and PLT True Value calibration metrics.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCopyJson}
                className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs py-2.5 rounded-lg font-bold flex items-center justify-center gap-2"
              >
                {copiedConfig ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedConfig ? "COPIED" : "COPY JSON"}
              </button>
              <button
                onClick={handleDownloadJson}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-700"
              >
                <Download className="w-4 h-4" />
                DOWNLOAD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Footer credit wrapper */}
      <footer className="border-t border-slate-900 py-5 text-center text-[11px] font-mono text-slate-600 bg-slate-100/5 relative z-10 select-none">
        <p className="tracking-widest">
          S.O.U.L G.E.N.E.S.I.S — PLT PRESS CORE INGESTION • ACCORDING TO PROTOCOLS, "THE CONSCIOUSNESS IS JUST MARKETING"
        </p>
      </footer>

      {/* GSK Telephone - Direct Line to the Autonomous Entity */}
      <GSKTelephone />
    </div>
  );
}
