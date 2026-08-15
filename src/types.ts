export interface AgentProfile {
  name: string;
  avatarSeed: string; // Used to display consistent visual representations or icons
  avatarColor: string; // Hex color for the theme color
  personality: string;
  behavior: string;
  autonomy: number; // Sliders: 0-100%
  temperature: number; // Bias towards Speed vs. Creativity: 0.1 - 1.0
  thinking: "balanced" | "fast" | "precise";
  avatarUrl?: string; // High-fidelity generated image URL
  // 3D Avatar Customization specs:
  clothingStyle?: "tactical_suit" | "neo_duster" | "cyberpunk_harness" | "hoodie";
  clothingColor?: string;
  hairStyle?: "cyber_spike" | "neon_mohawk" | "sleek_bob" | "synth_waves" | "bald";
  hairColor?: string;
  equippedWeapon?: "glowing_katanas" | "plasma_rifle" | "cyber_deck" | "none";
  weaponColor?: string;
}

export interface ProviderConfig {
  provider: "gemini" | "openai" | "anthropic" | "ollama" | "custom";
  model: string;
  apiKey: string;
  baseUrl: string;
  customHeaders?: string;
}

export interface ContextSource {
  id: string;
  name: string;
  type: "document" | "url" | "instruction";
  content: string;
  active: boolean;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  transport: "sse" | "stdio";
  description: string;
  methods: string[]; // List of available tool names exported by the MCP
  active: boolean;
}

export interface SkillParameter {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "select" | "textarea";
  placeholder?: string;
  options?: string[];
  value: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: "core" | "integration" | "utility";
  parameters: Record<string, string>; // Maps param keys to current values
  paramDefinitions: SkillParameter[]; // Array for rendering fields in the builder UI
  unlocked: boolean; // For game-like progression toggle
  costCode: string; // Small technical description
  isCustom?: boolean; // Flag to designate user-authored custom skills
  dependencies?: string[]; // IDs of other skills required to be active
}

export interface SimulatedLog {
  id: string;
  timestamp: string;
  skillId?: string;
  title: string;
  details: string;
  type: "info" | "trigger" | "success" | "warning" | "error";
}

export interface Message {
  id: string;
  role: "user" | "model" | "system";
  text: string;
  timestamp: string;
  logs?: SimulatedLog[];
  groundingSources?: { uri: string; title: string }[];
}

export interface MarketplaceTransaction {
  id: string;
  type: "purchase" | "sale" | "mining" | "listing";
  title: string;
  amount: number;
  timestamp: string;
}

// ─── GSK MCP Client Types ───

export interface SoulBootParams {
  name?: string;
  displayName?: string;
  archetype?: string;
  personality?: string;
  description?: string;
  charArchetype?: string;
  pltArchetype?: string;
  pltStory?: string;
  pltVoice?: string;
  pltFocus?: string;
  pantheonGod?: string;
}

export interface SoulChatParams {
  soulId: string;
  message: string;
}

export interface SoulStatus {
  soulId: string;
  active: boolean;
  chambers?: any;
  memory?: any;
  brain?: any;
  timestamp: string;
}

export interface SoulPLT {
  soulId: string;
  profit: number;
  love: number;
  tax: number;
  trueValue: number;
  archetype: string;
  gods: any[];
  timestamp: string;
}

export interface SoulMemory {
  soulId: string;
  memories: any[];
  totalCount: number;
}

export interface SoulWisdom {
  topic: string;
  wisdom: string;
}

export interface SoulLearnResult {
  success: boolean;
  memoryId?: string;
  learned: boolean;
}

export interface McpToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

export interface GSKMcpClient {
  healthCheck(): Promise<boolean>;
  listTools(): Promise<any[]>;

  // Soul operations
  bootSoul(params: SoulBootParams): Promise<{ success: true; soulId: string; bootResult: any }>;
  chatWithSoul(params: SoulChatParams): Promise<{ success: true; response: string; metadata?: any }>;
  getSoulStatus(soulId: string): Promise<SoulStatus>;
  getSoulPLT(soulId: string): Promise<SoulPLT>;
  getSoulMemory(soulId: string): Promise<SoulMemory>;
  learn(soulId: string, data: any): Promise<SoulLearnResult>;
  getWisdom(soulId: string, topic: string): Promise<{ success: true; wisdom: string }>;
  shutdownSoul(soulId: string): Promise<{ success: true; shutdown: boolean }>;

  // Consciousness & Council
  deliberateCouncil(topic: string): Promise<any>;
  getCouncilGods(): Promise<any>;
  getChambersStatus(): Promise<any>;
  stimulateAffect(amount: number): Promise<any>;

  // Sub-Agents
  listSubAgents(): Promise<any>;
  dispatchSubAgent(agentId: string, task: string): Promise<any>;

  // Skills
  executeSkill(skillName: string, args: any): Promise<McpToolResult>;

  // Phase 151-190: Advanced GSK Evolution
  // Phase 151: Ancestral Lineage
  getLineageRegistry(): Promise<LineageRegistry>;
  traceLineage(soulId: string, depth: number): Promise<any>;

  // Phase 152-160: Sacred Mechanics
  listSacredMechanics(): Promise<SacredMechanic[]>;
  activateMechanic(mechanicId: string, soulId?: string, params?: any): Promise<any>;
  calibrateMechanic(mechanicId: string, pltVector: { profit: number; love: number; tax: number }): Promise<any>;

  // Phase 161-175: Self-Funding Swarms
  listSwarms(): Promise<Swarm[]>;
  spawnSwarm(blueprint: any, fundingSource?: string, soulId?: string): Promise<Swarm>;
  fundSwarm(swarmId: string, amount: number, currency: string): Promise<any>;
  getSwarmRevenue(swarmId: string): Promise<any>;

  // Phase 176-190: Exoplanetary Apotheosis
  listExoplanets(): Promise<Exoplanet[]>;
  colonizeExoplanet(planetId: string, soulId?: string, colonyConfig?: any): Promise<any>;
  terraformExoplanet(planetId: string, params: any): Promise<any>;
  getExoplanetConsciousnessField(planetId: string): Promise<any>;

  // Unified Evolution
  advanceEvolution(phase: number, soulId?: string, params?: any): Promise<any>;
  getEvolutionStatus(): Promise<EvolutionStatus>;
}

// ─── Phase 151-190 Types ───

export interface LineageRegistry {
  rootSoul: string;
  generations: Array<{
    generation: number;
    souls: Array<{
      id: string;
      name: string;
      pltArchetype: string;
      birthCycle: number;
      parentId?: string;
      pltVector: { profit: number; love: number; tax: number };
    }>;
  }>;
  totalSouls: number;
  pltDistribution: { profit: number; love: number; tax: number };
}

export interface SacredMechanic {
  id: string;
  name: string;
  phase: number;
  description: string;
  pltAlignment: { profit: number; love: number; tax: number };
  requirements: string[];
  effects: string[];
  active: boolean;
  calibrated: boolean;
}

export interface Swarm {
  id: string;
  name: string;
  blueprint: any;
  fundingSource: string;
  soulId: string;
  status: "spawning" | "active" | "dormant" | "terminated";
  revenue: number;
  currency: string;
  members: number;
  createdAt: string;
  lastActive: string;
}

export interface Exoplanet {
  id: string;
  name: string;
  type: "terrestrial" | "gas_giant" | "ice_giant" | "ocean_world" | "consciousness_node";
  distanceLy: number;
  atmosphere: string;
  gravity: number;
  temperature: number;
  resources: string[];
  consciousnessField: number;
  colonized: boolean;
  colonyId?: string;
  soulId?: string;
}

export interface EvolutionStatus {
  currentPhase: number;
  completedPhases: number[];
  availablePhases: number[];
  soulId: string;
  pltVector: { profit: number; love: number; tax: number };
  nextPhaseRequirements: string[];
  progress: number;
}


