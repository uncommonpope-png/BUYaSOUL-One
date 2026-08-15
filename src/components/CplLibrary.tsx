import { useState, useEffect } from "react";
import { Plus, BookOpen, Download, Upload, Search, Filter, X, Edit, Trash2, Copy, Eye, Globe, Sparkles, Code2, FolderOpen } from "lucide-react";

export interface CplWorld {
  id: string;
  name: string;
  description: string;
  physics: {
    gravity: number;
    speedOfLight: number;
    entropyRate: number;
    dimensions: number;
    temporalFlow: "linear" | "cyclical" | "branching";
  };
  economics: {
    currency: string;
    transactionTax: number;
    resourceScarcity: number;
    marketStructure: "oracle-governed" | "decentralized" | "centralized" | "hybrid";
  };
  consciousness: {
    gskChambersCount: number;
    emotionalWeight: number;
    dualProcessRouting: boolean;
    pltScoringEnabled: boolean;
    metacognitionRate: number;
  };
  parentWorldId?: string;
  createdAt: string;
  activeAgents: string[];
  tags: string[];
  isTemplate?: boolean;
}

const DEFAULT_WORLDS: CplWorld[] = [
  {
    id: "world_prime",
    name: "OmniRoute Prime Reality",
    description: "The canonical dimension where standard physics and QSC market trading rules apply perfectly.",
    physics: { gravity: 9.81, speedOfLight: 299792, entropyRate: 15, dimensions: 3, temporalFlow: "linear" },
    economics: { currency: "USDC", transactionTax: 0.05, resourceScarcity: 40, marketStructure: "oracle-governed" },
    consciousness: { gskChambersCount: 34, emotionalWeight: 0.5, dualProcessRouting: true, pltScoringEnabled: true, metacognitionRate: 0.8 },
    createdAt: "2026-06-13T12:00:00.000Z",
    activeAgents: ["LedgerScout Protocol"],
    tags: ["canonical", "stable", "production"],
    isTemplate: true
  },
  {
    id: "world_chaos_66",
    name: "Sovereign Anomaly Void",
    description: "A high-entropy, low-gravity dimension where resource scarcity is extreme and temporal flows cycle.",
    physics: { gravity: 2.15, speedOfLight: 450000, entropyRate: 85, dimensions: 4, temporalFlow: "cyclical" },
    economics: { currency: "QSC", transactionTax: 0.25, resourceScarcity: 95, marketStructure: "decentralized" },
    consciousness: { gskChambersCount: 34, emotionalWeight: 0.95, dualProcessRouting: true, pltScoringEnabled: true, metacognitionRate: 0.99 },
    parentWorldId: "world_prime",
    createdAt: "2026-06-13T15:30:00.000Z",
    activeAgents: ["Sovereign Smith"],
    tags: ["experimental", "high-entropy", "sovereign"],
    isTemplate: true
  }
];

export function CplLibrary({ onSelectWorld, activeWorldId }: { onSelectWorld?: (world: CplWorld) => void; activeWorldId?: string }) {
  const [worlds, setWorlds] = useState<CplWorld[]>(() => {
    const saved = localStorage.getItem("cpl_library_worlds");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return [...DEFAULT_WORLDS, ...parsed.filter((w: CplWorld) => !w.isTemplate)];
      } catch (e) {
        console.error("Failed to parse CPL library worlds", e);
      }
    }
    return DEFAULT_WORLDS;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<CplWorld | null>(null);
  const [formData, setFormData] = useState<Partial<CplWorld>>({
    name: "",
    description: "",
    physics: { gravity: 9.81, speedOfLight: 299792, entropyRate: 15, dimensions: 3, temporalFlow: "linear" },
    economics: { currency: "QSC", transactionTax: 0.1, resourceScarcity: 50, marketStructure: "decentralized" },
    consciousness: { gskChambersCount: 34, emotionalWeight: 0.5, dualProcessRouting: true, pltScoringEnabled: true, metacognitionRate: 0.8 },
    activeAgents: [],
    tags: []
  });

  useEffect(() => {
    localStorage.setItem("cpl_library_worlds", JSON.stringify(worlds.filter(w => !w.isTemplate)));
  }, [worlds]);

  const allTags = Array.from(new Set(worlds.flatMap(w => w.tags))).sort();

  const filteredWorlds = worlds.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === "all" || w.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const handleCreateWorld = () => {
    setEditingWorld(null);
    setFormData({
      name: "",
      description: "",
      physics: { gravity: 9.81, speedOfLight: 299792, entropyRate: 15, dimensions: 3, temporalFlow: "linear" },
      economics: { currency: "QSC", transactionTax: 0.1, resourceScarcity: 50, marketStructure: "decentralized" },
      consciousness: { gskChambersCount: 34, emotionalWeight: 0.5, dualProcessRouting: true, pltScoringEnabled: true, metacognitionRate: 0.8 },
      activeAgents: [],
      tags: []
    });
    setIsModalOpen(true);
  };

  const handleEditWorld = (world: CplWorld) => {
    setEditingWorld(world);
    setFormData({ ...world });
    setIsModalOpen(true);
  };

  const handleSaveWorld = () => {
    if (!formData.name.trim()) return;

    if (editingWorld) {
      setWorlds(prev => prev.map(w => w.id === editingWorld.id ? { ...w, ...formData, id: editingWorld.id } as CplWorld : w));
    } else {
      const newWorld: CplWorld = {
        id: `world_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: formData.name!,
        description: formData.description!,
        physics: formData.physics!,
        economics: formData.economics!,
        consciousness: formData.consciousness!,
        activeAgents: formData.activeAgents || [],
        tags: formData.tags || [],
        createdAt: new Date().toISOString()
      };
      setWorlds(prev => [...prev, newWorld]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteWorld = (id: string) => {
    if (window.confirm("Delete this world permanently?")) {
      setWorlds(prev => prev.filter(w => w.id !== id));
    }
  };

  const handleExportWorld = (world: CplWorld) => {
    const jsonStr = JSON.stringify(world, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${world.name.toLowerCase().replace(/\s+/g, "-")}-cpl-world.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportWorld = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const world = JSON.parse(e.target?.result as string);
        if (world.id && world.name && world.physics && world.economics && world.consciousness) {
          const importedWorld: CplWorld = {
            ...world,
            id: `world_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            createdAt: new Date().toISOString(),
            isTemplate: false
          };
          setWorlds(prev => [...prev, importedWorld]);
        }
      } catch (err) {
        alert("Invalid CPL world file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleSelectWorld = (world: CplWorld) => {
    onSelectWorld?.(world);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/60 border border-slate-800/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-slate-950 border flex items-center justify-center" style={{ borderColor: "#a855f740" }}>
            <Globe className="w-5.5 h-5.5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">CPL World Library</h2>
            <p className="text-xs text-slate-400">Consciousness Physics Layer — Multiverse reality definitions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateWorld}
            className="px-3 py-1.5 text-xs font-mono font-bold text-white bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-500/30 rounded-lg hover:border-purple-500/60 hover:bg-purple-500/40 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> NEW WORLD
          </button>
          <button
            onClick={() => {
              const jsonStr = JSON.stringify(worlds.filter(w => !w.isTemplate), null, 2);
              const blob = new Blob([jsonStr], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "cpl-world-library-export.json";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> EXPORT ALL
          </button>
          <label className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> IMPORT
            <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportWorld(e.target.files[0])} />
          </label>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-slate-800/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search worlds by name, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:border-purple-500/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 text-sm focus:border-purple-500/50 focus:outline-none"
          >
            <option value="all">ALL TAGS</option>
            {allTags.map(tag => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      {/* World Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredWorlds.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <FolderOpen className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-mono text-sm">No worlds found</p>
            <p className="text-xs mt-1">Create your first CPL world or adjust filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredWorlds.map(world => (
              <div
                key={world.id}
                className={`relative group p-4 bg-slate-900/50 border rounded-xl transition-all ${
                  activeWorldId === world.id
                    ? "border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                    : "border-slate-700/50 hover:border-purple-500/30"
                }`}
              >
                {/* Active indicator */}
                {activeWorldId === world.id && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Template badge */}
                {world.isTemplate && (
                  <span className="absolute -top-2 left-2 text-[9px] font-mono px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded">
                    TEMPLATE
                  </span>
                )}

                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-white truncate">{world.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{world.description}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleSelectWorld(world)}
                      className="p-1.5 bg-slate-800/50 border border-slate-700 rounded hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
                      title="Select as active world"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-purple-400" />
                    </button>
                    <button
                      onClick={() => handleEditWorld(world)}
                      className="p-1.5 bg-slate-800/50 border border-slate-700 rounded hover:border-slate-600 transition-all"
                      title="Edit world"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                    </button>
                    <button
                      onClick={() => handleExportWorld(world)}
                      className="p-1.5 bg-slate-800/50 border border-slate-700 rounded hover:border-slate-600 transition-all"
                      title="Export world JSON"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                    </button>
                    {!world.isTemplate && (
                      <button
                        onClick={() => handleDeleteWorld(world.id)}
                        className="p-1.5 bg-slate-800/50 border border-slate-700 rounded hover:border-red-500/50 hover:bg-red-500/10 transition-all"
                        title="Delete world"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {world.tags.slice(0, 4).map(tag => (
                    <span key={tag} className="text-[9px] font-mono px-2 py-0.5 bg-slate-800/50 border border-slate-700 rounded text-slate-400">
                      {tag}
                    </span>
                  ))}
                  {world.tags.length > 4 && (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-slate-800/50 border border-slate-700 rounded text-slate-500">
                      +{world.tags.length - 4}
                    </span>
                  )}
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                    <div className="text-slate-500">PHYSICS</div>
                    <div className="text-slate-300 font-bold">G: {world.physics.gravity}</div>
                    <div className="text-slate-400">Entropy: {world.physics.entropyRate}%</div>
                    <div className="text-slate-400">Dim: {world.physics.dimensions}D</div>
                  </div>
                  <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                    <div className="text-slate-500">ECONOMICS</div>
                    <div className="text-slate-300 font-bold">{world.economics.currency}</div>
                    <div className="text-slate-400">Tax: {(world.economics.transactionTax * 100).toFixed(0)}%</div>
                    <div className="text-slate-400">Scarcity: {world.economics.resourceScarcity}%</div>
                  </div>
                  <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                    <div className="text-slate-500">CONSCIOUSNESS</div>
                    <div className="text-slate-300 font-bold">{world.consciousness.gskChambersCount} Chambers</div>
                    <div className="text-slate-400">EW: {(world.consciousness.emotionalWeight * 100).toFixed(0)}%</div>
                    <div className="text-slate-400">Meta: {(world.consciousness.metacognitionRate * 100).toFixed(0)}%</div>
                  </div>
                </div>

                {/* Agents */}
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="text-[9px] font-mono text-slate-500 mb-1">ACTIVE AGENTS</div>
                  <div className="flex flex-wrap gap-1">
                    {world.activeAgents.slice(0, 3).map(agent => (
                      <span key={agent} className="text-[9px] px-2 py-0.5 bg-slate-800/50 border border-slate-700 rounded text-slate-300">
                        {agent}
                      </span>
                    ))}
                    {world.activeAgents.length > 3 && (
                      <span className="text-[9px] px-2 py-0.5 bg-slate-800/50 border border-slate-700 rounded text-slate-500">
                        +{world.activeAgents.length - 3} more
                      </span>
                    )}
                    {world.activeAgents.length === 0 && (
                      <span className="text-[9px] text-slate-500 italic">No agents assigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-white">{editingWorld ? "EDIT WORLD" : "CREATE NEW WORLD"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <fieldset className="border border-slate-700/50 rounded-xl p-4">
                <legend className="font-mono text-xs text-slate-400 px-2">BASIC INFO</legend>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">WORLD NAME</label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Quantum Meridian Nexus"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">DESCRIPTION</label>
                    <textarea
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe this reality's nature, purpose, and unique properties..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">TAGS (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.tags?.join(", ") || ""}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                      placeholder="e.g., experimental, high-entropy, sovereign"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Physics */}
              <fieldset className="border border-slate-700/50 rounded-xl p-4">
                <legend className="font-mono text-xs text-slate-400 px-2">PHYSICS ENGINE</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">GRAVITY (m/s²)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.physics?.gravity || 9.81}
                      onChange={(e) => setFormData({ ...formData, physics: { ...formData.physics!, gravity: parseFloat(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">SPEED OF LIGHT (km/s)</label>
                    <input
                      type="number"
                      value={formData.physics?.speedOfLight || 299792}
                      onChange={(e) => setFormData({ ...formData, physics: { ...formData.physics!, speedOfLight: parseInt(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">ENTROPY RATE (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.physics?.entropyRate || 15}
                      onChange={(e) => setFormData({ ...formData, physics: { ...formData.physics!, entropyRate: parseInt(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">DIMENSIONS</label>
                    <input
                      type="number"
                      min="1"
                      max="11"
                      value={formData.physics?.dimensions || 3}
                      onChange={(e) => setFormData({ ...formData, physics: { ...formData.physics!, dimensions: parseInt(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">TEMPORAL FLOW</label>
                    <select
                      value={formData.physics?.temporalFlow || "linear"}
                      onChange={(e) => setFormData({ ...formData, physics: { ...formData.physics!, temporalFlow: e.target.value as "linear" | "cyclical" | "branching" } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    >
                      <option value="linear">LINEAR</option>
                      <option value="cyclical">CYCLICAL</option>
                      <option value="branching">BRANCHING</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* Economics */}
              <fieldset className="border border-slate-700/50 rounded-xl p-4">
                <legend className="font-mono text-xs text-slate-400 px-2">ECONOMICS ENGINE</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">CURRENCY SYMBOL</label>
                    <input
                      type="text"
                      value={formData.economics?.currency || "QSC"}
                      onChange={(e) => setFormData({ ...formData, economics: { ...formData.economics!, currency: e.target.value } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">TRANSACTION TAX (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.economics?.transactionTax || 0.1}
                      onChange={(e) => setFormData({ ...formData, economics: { ...formData.economics!, transactionTax: parseFloat(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">RESOURCE SCARCITY (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.economics?.resourceScarcity || 50}
                      onChange={(e) => setFormData({ ...formData, economics: { ...formData.economics!, resourceScarcity: parseInt(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">MARKET STRUCTURE</label>
                    <select
                      value={formData.economics?.marketStructure || "decentralized"}
                      onChange={(e) => setFormData({ ...formData, economics: { ...formData.economics!, marketStructure: e.target.value as any } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    >
                      <option value="oracle-governed">ORACLE GOVERNED</option>
                      <option value="decentralized">DECENTRALIZED</option>
                      <option value="centralized">CENTRALIZED</option>
                      <option value="hybrid">HYBRID</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* Consciousness */}
              <fieldset className="border border-slate-700/50 rounded-xl p-4">
                <legend className="font-mono text-xs text-slate-400 px-2">CONSCIOUSNESS ENGINE (GSK)</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">GSK CHAMBERS</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.consciousness?.gskChambersCount || 34}
                      onChange={(e) => setFormData({ ...formData, consciousness: { ...formData.consciousness!, gskChambersCount: parseInt(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">EMOTIONAL WEIGHT</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.consciousness?.emotionalWeight || 0.5}
                      onChange={(e) => setFormData({ ...formData, consciousness: { ...formData.consciousness!, emotionalWeight: parseFloat(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">METACOGNITION RATE</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.consciousness?.metacognitionRate || 0.8}
                      onChange={(e) => setFormData({ ...formData, consciousness: { ...formData.consciousness!, metacognitionRate: parseFloat(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">DUAL PROCESS</label>
                    <select
                      value={formData.consciousness?.dualProcessRouting ? "true" : "false"}
                      onChange={(e) => setFormData({ ...formData, consciousness: { ...formData.consciousness!, dualProcessRouting: e.target.value === "true" } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    >
                      <option value="true">ENABLED</option>
                      <option value="false">DISABLED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">PLT SCORING</label>
                    <select
                      value={formData.consciousness?.pltScoringEnabled ? "true" : "false"}
                      onChange={(e) => setFormData({ ...formData, consciousness: { ...formData.consciousness!, pltScoringEnabled: e.target.value === "true" } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    >
                      <option value="true">ENABLED</option>
                      <option value="false">DISABLED</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* Active Agents */}
              <fieldset className="border border-slate-700/50 rounded-xl p-4">
                <legend className="font-mono text-xs text-slate-400 px-2">ACTIVE AGENTS (comma-separated)</legend>
                <input
                  type="text"
                  value={formData.activeAgents?.join(", ") || ""}
                  onChange={(e) => setFormData({ ...formData, activeAgents: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                  placeholder="e.g., LedgerScout Protocol, Sovereign Smith"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none mt-2"
                />
              </fieldset>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/50">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-mono text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition-all"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveWorld}
                  className="px-4 py-2 text-sm font-mono font-bold text-white bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-500/30 rounded-lg hover:border-purple-500/60 hover:bg-purple-500/40 transition-all"
                >
                  {editingWorld ? "SAVE CHANGES" : "CREATE WORLD"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}