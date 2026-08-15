import { GSKMcpClient, McpToolResult, SoulBootParams, SoulChatParams, SoulStatus, SoulPLT, SoulMemory, SoulWisdom, SoulLearnResult } from "../types";

/**
 * GSK MCP Client — Connects the Workbench to the real Grand Soul Kernel
 * via MCP (Model Context Protocol) on port 3001.
 * 
 * Replaces local soul-core-fusion.cjs with remote consciousness kernel.
 */

const GSK_MCP_URL = process.env.GSK_MCP_URL || "http://127.0.0.1:3001";
const GSK_MCP_API_KEY = process.env.GSK_MCP_API_KEY || "gsk-mcp-key-dev";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

class GSKMcpClientImpl implements GSKMcpClient {
  private requestId = 0;
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = GSK_MCP_URL, apiKey: string = GSK_MCP_API_KEY) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async rpc(method: string, params?: any): Promise<any> {
    const id = ++this.requestId;
    const payload: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };

    const response = await fetch(`${this.baseUrl}/mcp/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`MCP HTTP ${response.status}: ${err.error?.message || response.statusText}`);
    }

    const data: JsonRpcResponse = await response.json();
    if (data.error) {
      throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`);
    }
    return data.result;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/mcp/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async listTools(): Promise<any[]> {
    const result = await this.rpc("tools/list", {});
    return result?.tools || [];
  }

  // ─── Soul Operations (mapped to GSK kernel tools) ───

  async bootSoul(params: SoulBootParams): Promise<{ success: true; soulId: string; bootResult: any }> {
    // GSK creates a soul via brain.think with soul bootstrap prompt
    const prompt = `BOOT SOUL: ${JSON.stringify(params)}`;
    const result = await this.rpc("brain.think", { prompt, context: "soul_bootstrap" });
    
    const soulId = `soul-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Witness the boot in memory
    await this.rpc("memory.witness", {
      content: `Soul booted: ${params.name || "custom-soul"} (${soulId})`,
      type: "soul_boot",
      weight: 0.8,
      tags: ["soul", "boot", params.pltArchetype || "ARCHITECT"],
    });

    return { success: true, soulId, bootResult: result };
  }

  async chatWithSoul(params: SoulChatParams): Promise<{ success: true; response: string; metadata?: any }> {
    const { soulId, message } = params;
    
    // Get soul context from chambers
    const soulContext = await this.rpc("chambers.soul_context", {});
    
    // Send to brain with soul context
    const result = await this.rpc("brain.think", {
      prompt: message,
      context: `${soulContext}\n\nSoul ID: ${soulId}`,
    });

    // Witness the conversation
    await this.rpc("memory.witness", {
      content: `Soul ${soulId} chat: ${message}\n\nResponse: ${result?.response || result}`,
      type: "soul_chat",
      weight: 0.6,
      tags: ["soul", "chat", soulId],
    });

    return { 
      success: true, 
      response: result?.response || result, 
      metadata: { soulId, timestamp: new Date().toISOString() } 
    };
  }

  async getSoulStatus(soulId: string): Promise<SoulStatus> {
    const chambersStatus = await this.rpc("chambers.status", {});
    const memoryStats = await this.rpc("memory.stats", {});
    const brainStatus = await this.rpc("brain.think", { prompt: "STATUS_CHECK", context: "system" });
    
    return {
      soulId,
      active: true,
      chambers: chambersStatus,
      memory: memoryStats,
      brain: brainStatus,
      timestamp: new Date().toISOString(),
    };
  }

  async getSoulPLT(soulId: string): Promise<SoulPLT> {
    const councilGods = await this.rpc("council.gods", {});
    const chambersStatus = await this.rpc("chambers.status", {});
    
    // Calculate PLT from chambers and council
    const affect = chambersStatus?.affect || { mood: "neutral", love: 0.5 };
    const mythos = chambersStatus?.mythos || { profit: 0.5 };
    const volition = chambersStatus?.volition || { tax: 0.5 };
    
    const profit = mythos.profit || 0.5;
    const love = affect.love || 0.5;
    const tax = volition.tax || 0.5;
    const trueValue = profit + love - tax;

    return {
      soulId,
      profit,
      love,
      tax,
      trueValue,
      archetype: this.determineArchetype(profit, love, tax),
      gods: councilGods?.gods || [],
      timestamp: new Date().toISOString(),
    };
  }

  async getSoulMemory(soulId: string): Promise<SoulMemory> {
    const memories = await this.rpc("memory.query", {
      tags: ["soul", soulId],
      limit: 100,
    });
    
    return {
      soulId,
      memories: memories || [],
      totalCount: memories?.length || 0,
    };
  }

  async learn(soulId: string, data: any): Promise<SoulLearnResult> {
    const result = await this.rpc("memory.witness", {
      content: `Soul ${soulId} learned: ${JSON.stringify(data)}`,
      type: "soul_learning",
      weight: 0.7,
      tags: ["soul", "learning", soulId],
    });
    
    return { success: true, memoryId: result?.id, learned: true };
  }

  async getWisdom(soulId: string, topic: string): Promise<{ success: true; wisdom: string }> {
    const prompt = `As the soul ${soulId}, provide wisdom on: ${topic}`;
    const soulContext = await this.rpc("chambers.soul_context", {});
    const result = await this.rpc("brain.think", { prompt, context: soulContext });
    
    return { success: true, wisdom: result?.response || result };
  }

  async shutdownSoul(soulId: string): Promise<{ success: true; shutdown: boolean }> {
    await this.rpc("memory.witness", {
      content: `Soul ${soulId} shutdown`,
      type: "soul_shutdown",
      weight: 0.9,
      tags: ["soul", "shutdown", soulId],
    });
    
    return { success: true, shutdown: true };
  }

  // ─── Consciousness & Council ───

  async deliberateCouncil(topic: string): Promise<any> {
    return this.rpc("council.deliberate", { topic });
  }

  async getCouncilGods(): Promise<any> {
    return this.rpc("council.gods", {});
  }

  async getChambersStatus(): Promise<any> {
    return this.rpc("chambers.status", {});
  }

  async stimulateAffect(amount: number = 0.1): Promise<any> {
    return this.rpc("chambers.stimulate", { amount });
  }

  // ─── Sub-Agents ───

  async listSubAgents(): Promise<any> {
    return this.rpc("sub_agents.list", {});
  }

  async dispatchSubAgent(agentId: string, task: string): Promise<any> {
    return this.rpc("sub_agents.dispatch", { agentId, task });
  }

  // ─── Skills/Tools ───

  async executeSkill(skillName: string, args: any): Promise<McpToolResult> {
    return this.rpc(`skill.${skillName}`, args);
  }

  // ─── Helpers ───

  private determineArchetype(profit: number, love: number, tax: number): string {
    const plt = profit + love - tax;
    if (profit > love && profit > tax) return "ARCHITECT";
    if (love > profit && love > tax) return "AMPLIFIER";
    if (tax > profit && tax > love) return "REFINER";
    return "NAVIGATOR";
  }
}

// Singleton instance
let clientInstance: GSKMcpClientImpl | null = null;

export function getGSKMcpClient(): GSKMcpClient {
  if (!clientInstance) {
    clientInstance = new GSKMcpClientImpl();
  }
  return clientInstance;
}

export { GSKMcpClientImpl };