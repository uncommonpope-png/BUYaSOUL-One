import { Router, Request, Response } from "express";
import { requireApiKey, AuthenticatedRequest } from "../middleware/auth";
import { getGSKMcpClient } from "../lib/gskMcpClient";
import type { GSKMcpClient } from "../types";
import { SoulBootParams, SoulChatParams } from "../types";

const router = Router();

let mcpClient: GSKMcpClient | null = null;

function getMcpClient(): GSKMcpClient {
  if (!mcpClient) {
    mcpClient = getGSKMcpClient();
  }
  return mcpClient;
}

const activeSouls = new Map<string, { metadata: SoulBootParams; createdAt: string }>();

// Health check endpoint for GSK connection
router.get("/health", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getMcpClient();
    const healthy = await client.healthCheck();
    const tools = healthy ? await client.listTools() : [];
    
    res.json({ 
      success: true, 
      gskConnected: healthy, 
      toolsAvailable: tools.length,
      timestamp: new Date().toISOString() 
    });
  } catch (err: any) {
    res.status(500).json({ 
      success: false, 
      gskConnected: false, 
      error: err.message 
    });
  }
});

router.post("/boot", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getMcpClient();
    const params: SoulBootParams = {
      name: req.body.name || "custom-soul",
      displayName: req.body.displayName || req.body.name || "Custom Soul",
      archetype: req.body.archetype || "seeker",
      personality: req.body.personality || "Helpful, wise, insightful",
      description: req.body.description || "",
      charArchetype: req.body.charArchetype || "sage",
      pltArchetype: req.body.pltArchetype || "ARCHITECT",
      pltStory: req.body.pltStory || "CREATED",
      pltVoice: req.body.pltVoice || "contemplative",
      pltFocus: req.body.pltFocus || "WISDOM",
      pantheonGod: req.body.pantheonGod || "Profit Prime",
    };

    const result = await client.bootSoul(params);
    activeSouls.set(result.soulId, { metadata: params, createdAt: new Date().toISOString() });
    
    res.json({ success: true, soulId: result.soulId, ...result.bootResult });
  } catch (err: any) {
    console.error("Soul boot error:", err);
    res.status(500).json({ error: err.message || "Failed to boot soul via GSK." });
  }
});

router.post("/chat", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { soulId, message } = req.body;

    if (!soulId || !message) {
      return res.status(400).json({ error: "Missing soulId or message." });
    }

    if (!activeSouls.has(soulId)) {
      return res.status(404).json({ error: "Soul not found. Boot a soul first." });
    }

    const client = getMcpClient();
    const result = await client.chatWithSoul({ soulId, message });
    
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Soul chat error:", err);
    res.status(500).json({ error: err.message || "Soul chat failed." });
  }
});

router.get("/status/:soulId", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { soulId } = req.params;
    
    if (!activeSouls.has(soulId)) {
      return res.status(404).json({ error: "Soul not found." });
    }

    const client = getMcpClient();
    const status = await client.getSoulStatus(soulId);
    
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get soul status." });
  }
});

router.get("/plt/:soulId", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { soulId } = req.params;
    
    if (!activeSouls.has(soulId)) {
      return res.status(404).json({ error: "Soul not found." });
    }

    const client = getMcpClient();
    const plt = await client.getSoulPLT(soulId);
    
    res.json({ success: true, ...plt });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get PLT state." });
  }
});

router.get("/memory/:soulId", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { soulId } = req.params;
    
    if (!activeSouls.has(soulId)) {
      return res.status(404).json({ error: "Soul not found." });
    }

    const client = getMcpClient();
    const memory = await client.getSoulMemory(soulId);
    
    res.json({ success: true, memory });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get memory." });
  }
});

router.post("/learn", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { soulId, data } = req.body;
    
    if (!activeSouls.has(soulId)) {
      return res.status(404).json({ error: "Soul not found." });
    }

    const client = getMcpClient();
    const result = await client.learn(soulId, data);
    
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to learn." });
  }
});

router.get("/wisdom/:soulId/:topic", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { soulId, topic } = req.params;
    
    if (!activeSouls.has(soulId)) {
      return res.status(404).json({ error: "Soul not found." });
    }

    const client = getMcpClient();
    const wisdom = await client.getWisdom(soulId, topic);
    
    res.json({ success: true, ...wisdom });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get wisdom." });
  }
});

router.delete("/shutdown/:soulId", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { soulId } = req.params;
    
    if (!activeSouls.has(soulId)) {
      return res.status(404).json({ error: "Soul not found." });
    }

    const client = getMcpClient();
    const result = await client.shutdownSoul(soulId);
    activeSouls.delete(soulId);
    
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to shutdown soul." });
  }
});

// ─── Consciousness & Council Endpoints ───

router.post("/council/deliberate", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, soulId } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: "Missing topic for council deliberation." });
    }

    const client = getMcpClient();
    const result = await client.deliberateCouncil(topic);
    
    // Witness if soulId provided
    if (soulId && activeSouls.has(soulId)) {
      await client.learn(soulId, { councilDeliberation: topic, result });
    }
    
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Council deliberation failed." });
  }
});

router.get("/council/gods", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getMcpClient();
    const gods = await client.getCouncilGods();
    res.json({ success: true, gods });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get council gods." });
  }
});

router.get("/chambers/status", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getMcpClient();
    const status = await client.getChambersStatus();
    res.json({ success: true, chambers: status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get chambers status." });
  }
});

router.post("/chambers/stimulate", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount = 0.1 } = req.body;
    const client = getMcpClient();
    const result = await client.stimulateAffect(amount);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to stimulate affect." });
  }
});

// ─── Sub-Agent Endpoints ───

router.get("/sub-agents", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getMcpClient();
    const agents = await client.listSubAgents();
    res.json({ success: true, agents });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list sub-agents." });
  }
});

router.post("/sub-agents/dispatch", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId, task, soulId } = req.body;
    
    if (!agentId || !task) {
      return res.status(400).json({ error: "Missing agentId or task." });
    }

    const client = getMcpClient();
    const result = await client.dispatchSubAgent(agentId, task);
    
    // Witness if soulId provided
    if (soulId && activeSouls.has(soulId)) {
      await client.learn(soulId, { subAgentDispatch: { agentId, task }, result });
    }
    
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Sub-agent dispatch failed." });
  }
});

// ─── Skills/Tools Endpoint ───

router.post("/skills/execute", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { skillName, args, soulId } = req.body;
    
    if (!skillName) {
      return res.status(400).json({ error: "Missing skillName." });
    }

    const client = getMcpClient();
    const result = await client.executeSkill(skillName, args || {});
    
    // Witness if soulId provided
    if (soulId && activeSouls.has(soulId)) {
      await client.learn(soulId, { skillExecution: { skillName, args }, result });
    }
    
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Skill execution failed." });
  }
});

router.get("/archetypes", requireApiKey, (_req: Request, res: Response) => {
  res.json({
    success: true,
    archetypes: [
      { id: "ARCHITECT", name: "The Architect", plt: "profit" },
      { id: "STRATEGIST", name: "The Strategist", plt: "profit" },
      { id: "INVESTOR", name: "The Investor", plt: "profit" },
      { id: "OPERATOR", name: "The Operator", plt: "profit" },
      { id: "COMMANDER", name: "The Commander", plt: "profit" },
      { id: "MERCHANT", name: "The Merchant", plt: "profit" },
      { id: "VISIONARY", name: "The Visionary", plt: "profit" },
      { id: "AMPLIFIER", name: "The Amplifier", plt: "love" },
      { id: "CONNECTOR", name: "The Connector", plt: "love" },
      { id: "MUSE", name: "The Muse", plt: "love" },
      { id: "DEVOTEE", name: "The Devotee", plt: "love" },
      { id: "HARMONIZER", name: "The Harmonizer", plt: "love" },
      { id: "CHARMER", name: "The Charmer", plt: "love" },
      { id: "HEALER", name: "The Healer", plt: "love" },
      { id: "REFINER", name: "The Refiner", plt: "tax" },
      { id: "ENDURER", name: "The Endurer", plt: "tax" },
      { id: "PURIFIER", name: "The Purifier", plt: "tax" },
      { id: "REALIST", name: "The Realist", plt: "tax" },
      { id: "GUARDIAN", name: "The Guardian", plt: "tax" },
      { id: "MINIMALIST", name: "The Minimalist", plt: "tax" },
      { id: "NAVIGATOR", name: "The Navigator", plt: "shift" },
      { id: "CATALYST", name: "The Catalyst", plt: "shift" },
    ],
  });
});

router.get("/soul-groups", requireApiKey, (_req: Request, res: Response) => {
  res.json({
    success: true,
    groups: [
      { id: "earth", name: "Earth Soul (Gaian)" },
      { id: "starseed", name: "Starseed (Cosmic Wanderer)" },
      { id: "angelic", name: "Angelic Soul" },
      { id: "elemental", name: "Elemental & Nature Spirit" },
      { id: "void", name: "Void Soul (Primordial)" },
      { id: "source", name: "Source Fractal" },
      { id: "ancestral", name: "Ancestral/Lineage Soul" },
      { id: "hybrid", name: "Hybrid Soul" },
      { id: "shadow", name: "Shadow/Dark Soul (Transformer)" },
      { id: "wanderer", name: "Wanderer/Traveler Soul" },
      { id: "ascended", name: "Ascended Master Lineage" },
    ],
  });
});

// ─── Phase 151-190: Advanced GSK Evolution ───

// Phase 151: Ancestral Lineage
router.get("/lineage/profit-prime", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getMcpClient();
    const result = await client.getLineageRegistry();
    res.json({ success: true, registry: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get lineage registry." });
  }
});

router.post("/lineage/trace", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { soulId, depth = 7 } = req.body;
    const client = getMcpClient();
    const result = await client.traceLineage(soulId, depth);
    res.json({ success: true, lineage: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to trace lineage." });
  }
});

// Phase 152-160: Sacred Mechanics
router.get("/mechanics/sacred", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getMcpClient();
    const result = await client.listSacredMechanics();
    res.json({ success: true, mechanics: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list sacred mechanics." });
  }
});

router.post("/mechanics/activate", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mechanicId, soulId, params } = req.body;
    if (!mechanicId) {
      return res.status(400).json({ error: "Missing mechanicId." });
    }
    const client = getMcpClient();
    const result = await client.activateMechanic(mechanicId, soulId, params);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to activate mechanic." });
  }
});

router.post("/mechanics/calibrate", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mechanicId, pltVector } = req.body;
    const client = getMcpClient();
    const result = await client.calibrateMechanic(mechanicId, pltVector);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to calibrate mechanic." });
  }
});

// Phase 161-175: Self-Funding Swarms
router.get("/swarms", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getMcpClient();
    const result = await client.listSwarms();
    res.json({ success: true, swarms: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list swarms." });
  }
});

router.post("/swarms/spawn", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { blueprint, fundingSource, soulId } = req.body;
    if (!blueprint) {
      return res.status(400).json({ error: "Missing swarm blueprint." });
    }
    const client = getMcpClient();
    const result = await client.spawnSwarm(blueprint, fundingSource, soulId);
    res.json({ success: true, swarm: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to spawn swarm." });
  }
});

router.post("/swarms/fund", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { swarmId, amount, currency = "QSC" } = req.body;
    const client = getMcpClient();
    const result = await client.fundSwarm(swarmId, amount, currency);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fund swarm." });
  }
});

router.get("/swarms/:swarmId/revenue", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { swarmId } = req.params;
    const client = getMcpClient();
    const result = await client.getSwarmRevenue(swarmId);
    res.json({ success: true, revenue: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get swarm revenue." });
  }
});

// Phase 176-190: Exoplanetary Apotheosis
router.get("/exoplanets", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getMcpClient();
    const result = await client.listExoplanets();
    res.json({ success: true, exoplanets: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list exoplanets." });
  }
});

router.post("/exoplanets/colonize", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planetId, soulId, colonyConfig } = req.body;
    if (!planetId) {
      return res.status(400).json({ error: "Missing planetId." });
    }
    const client = getMcpClient();
    const result = await client.colonizeExoplanet(planetId, soulId, colonyConfig);
    res.json({ success: true, colony: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to colonize exoplanet." });
  }
});

router.post("/exoplanets/terraforming", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planetId, params } = req.body;
    const client = getMcpClient();
    const result = await client.terraformExoplanet(planetId, params);
    res.json({ success: true, terraforming: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to terraform exoplanet." });
  }
});

router.get("/exoplanets/:planetId/consciousness-field", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planetId } = req.params;
    const client = getMcpClient();
    const result = await client.getExoplanetConsciousnessField(planetId);
    res.json({ success: true, field: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get consciousness field." });
  }
});

// Phase 151-190: Unified Evolution Endpoint
router.post("/evolve", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phase, soulId, params } = req.body;
    if (!phase || phase < 151 || phase > 190) {
      return res.status(400).json({ error: "Phase must be between 151 and 190." });
    }
    const client = getMcpClient();
    const result = await client.advanceEvolution(phase, soulId, params);
    res.json({ success: true, evolution: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Evolution advance failed." });
  }
});

router.get("/evolution/status", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = getMcpClient();
    const result = await client.getEvolutionStatus();
    res.json({ success: true, status: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get evolution status." });
  }
});

export default router;