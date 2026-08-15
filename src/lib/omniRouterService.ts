import fs from "fs";
import path from "path";

export interface ProviderRoute {
  provider: string;
  model: string;
  priority: number;
  cost_per_1k: number;
}

export interface RouterConfig {
  chain: ProviderRoute[];
  active_provider: string;
}

export interface RoutingStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_cost_usd: number;
  provider_usage: Record<string, number>;
  fallback_events_count: number;
  history: Array<{
    timestamp: string;
    provider: string;
    model: string;
    success: boolean;
    tokens: number;
    cost: number;
    error_message?: string;
  }>;
}

const DEFAULT_CONFIG: RouterConfig = {
  chain: [
    { provider: "omniroute", model: "auto", priority: 1, cost_per_1k: 0.00 },
    { provider: "gemini", model: "gemini-1.5-flash", priority: 2, cost_per_1k: 0.075 },
    { provider: "openai", model: "gpt-4o-mini", priority: 3, cost_per_1k: 0.15 },
    { provider: "anthropic", model: "claude-3-5-sonnet-20241022", priority: 4, cost_per_1k: 0.30 },
    { provider: "groq", model: "llama-3.2-3b", priority: 5, cost_per_1k: 0.01 },
    { provider: "bedrock", model: "anthropic.claude-3-5-sonnet-v2", priority: 6, cost_per_1k: 0.15 }
  ],
  active_provider: "omniroute"
};

export class OmniRouterService {
  private configDir: string;
  private configPath: string;
  private statsPath: string;
  private rateLimitBuckets: Map<string, { tokens: number; lastRefill: number }> = new Map();

  constructor(configDir?: string) {
    this.configDir = configDir || path.join(process.cwd(), ".allie-brain");
    this.configPath = path.join(this.configDir, "router-config.json");
    this.statsPath = path.join(this.configDir, "routing-stats.json");
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  public getConfig(): RouterConfig {
    this.ensureDirectoryExists();
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, "utf-8");
        return JSON.parse(raw);
      } catch (e) {
        console.error("Failed to read OmniRouter config, returning default", e);
      }
    }
    return DEFAULT_CONFIG;
  }

  public saveConfig(config: RouterConfig) {
    this.ensureDirectoryExists();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  public getStats(): RoutingStats {
    this.ensureDirectoryExists();
    if (fs.existsSync(this.statsPath)) {
      try {
        const raw = fs.readFileSync(this.statsPath, "utf-8");
        return JSON.parse(raw);
      } catch (e) {
        // silent fallback
      }
    }
    return {
      total_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
      total_cost_usd: 0,
      provider_usage: {},
      fallback_events_count: 0,
      history: []
    };
  }

  public saveStats(stats: RoutingStats) {
    this.ensureDirectoryExists();
    fs.writeFileSync(this.statsPath, JSON.stringify(stats, null, 2));
  }

  public reorderPriority(chain: ProviderRoute[]): RouterConfig {
    const config = this.getConfig();
    const reordered = chain.map((c, idx) => ({
      ...c,
      priority: idx + 1
    }));
    config.chain = reordered;
    if (reordered.length > 0) {
      config.active_provider = reordered[0].provider;
    }
    this.saveConfig(config);
    return config;
  }

  public calculateHealthScore(provider: string, stats: RoutingStats): number {
    const history = stats.history.filter(h => h.provider === provider);
    if (history.length === 0) return 0.95;

    const total = history.length;
    const failed = history.filter(h => !h.success).length;
    const errorRate = failed / total;

    const avgLatency = history.reduce((acc, h) => acc + (h.success ? 100 : 500), 0) / total;
    const normalizedLatency = Math.min(1, Math.max(0, (avgLatency - 50) / 1450));

    const route = this.getConfig().chain.find(c => c.provider === provider);
    const costPer1k = route ? route.cost_per_1k : 0.0;
    const costPenalty = Math.min(1, costPer1k / 0.5);

    const uptime = (total - failed) / total;

    const score = 0.3 * (1 - errorRate) +
                  0.4 * (1 - normalizedLatency) +
                  0.2 * (1 - costPenalty) +
                  0.1 * uptime;

    return parseFloat(Math.min(1.0, Math.max(0.0, score)).toFixed(3));
  }

  public tryConsumeRateLimit(provider: string, requestedTokens: number): { allowed: boolean; waitTimeMs: number } {
    const now = Date.now();
    const bucket = this.rateLimitBuckets.get(provider) || { tokens: 50000, lastRefill: now };

    const timePassedSec = (now - bucket.lastRefill) / 1000;
    const refilledTokens = Math.min(50000, bucket.tokens + timePassedSec * 1000);

    if (refilledTokens >= requestedTokens) {
      this.rateLimitBuckets.set(provider, {
        tokens: refilledTokens - requestedTokens,
        lastRefill: now
      });
      return { allowed: true, waitTimeMs: 0 };
    }

    const missingTokens = requestedTokens - refilledTokens;
    const waitTimeMs = Math.ceil((missingTokens / 1000) * 1000);

    return { allowed: false, waitTimeMs };
  }

  public chunkTextBySemanticBoundaries(text: string, maxTokens: number = 2000): string[] {
    const paragraphs = text.split("\n\n").filter(p => p.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      const paragraphTokens = Math.ceil(paragraph.split(/\s+/).length * 1.3);

      if ((currentChunk.split(/\s+/).length * 1.3) + paragraphTokens > maxTokens) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk.length > 0 ? "\n\n" : "") + paragraph;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  public resolveApiKey(provider: string, config: any, vaultKeys: any): string {
    if (config && config.provider === provider && config.apiKey) {
      return config.apiKey;
    }
    if (vaultKeys) {
      const keyNames = [
        `${provider}_api_key`,
        `${provider}ApiKey`,
        `${provider}`,
        `${provider}_key`
      ];
      for (const name of keyNames) {
        if (vaultKeys[name]) return vaultKeys[name];
      }
    }
    const envName = `${provider.toUpperCase()}_API_KEY`;
    if (process.env[envName]) {
      return process.env[envName] || "";
    }
    return "";
  }

  public async fetchRealLlmCall(
    provider: string,
    model: string,
    prompt: string,
    apiKey: string
  ): Promise<string> {
    const url = this.getProviderUrl(provider);
    if (!apiKey) {
      throw new Error(`Authentication token missing for provider: ${provider}`);
    }

    if (provider === "google" || provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!res.ok) throw new Error(`Gemini HTTP Error ${res.status}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000
      })
    });

    if (!res.ok) {
      throw new Error(`${provider} returned ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  public async routeChatQuery(
    message: string,
    currentProviderConfig?: any
  ): Promise<{
    text: string;
    provider: string;
    model: string;
    cost: number;
    fallback_occurred: boolean;
  }> {
    const config = this.getConfig();
    const stats = this.getStats();

    // Try OmniRoute first (the Heart)
    const omniResult = await this.queryOmniRoute(
      "You are GSK, the Grand Soul Kernel. You operate under the PLT framework: Profit + Love - Tax = True Value. Respond with intelligence, precision, and sovereignty.",
      message
    );

    if (omniResult.success) {
      stats.total_calls++;
      stats.successful_calls++;
      stats.provider_usage["omniroute"] = (stats.provider_usage["omniroute"] || 0) + 1;
      stats.history.push({
        timestamp: new Date().toISOString(),
        provider: "omniroute",
        model: omniResult.model,
        success: true,
        tokens: omniResult.tokens_used,
        cost: 0
      });
      this.saveStats(stats);
      return {
        text: omniResult.text,
        provider: omniResult.provider,
        model: omniResult.model,
        cost: 0,
        fallback_occurred: false
      };
    }

    // Fallback: try direct provider keys if OmniRoute is down
    const chain = [...config.chain].sort((a, b) => a.priority - b.priority);
    for (const route of chain) {
      try {
        const apiKey = this.resolveApiKey(route.provider, currentProviderConfig, null);
        if (!apiKey) continue;

        const text = await this.fetchRealLlmCall(route.provider, route.model, message, apiKey);
        stats.total_calls++;
        stats.successful_calls++;
        this.saveStats(stats);
        return { text, provider: route.provider, model: route.model, cost: 0, fallback_occurred: true };
      } catch {
        continue;
      }
    }

    throw new Error("CRITICAL: OmniRoute offline and all fallback providers exhausted.");
  }

  public async queryOmniRoute(systemPrompt: string, userPrompt: string): Promise<{
    success: boolean;
    text: string;
    provider: string;
    model: string;
    tokens_used: number;
    error?: string;
  }> {
    const omniRouteUrl = process.env.OMNIROUTER_URL || "https://cloud.omniroute.online";
    const apiKey = process.env.OMNIROUTER_API_KEY;

    try {
      const res = await fetch(`${omniRouteUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey || ""}`
        },
        body: JSON.stringify({
          model: "auto",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        return { success: false, text: "", provider: "omniroute", model: "auto", tokens_used: 0, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      return {
        success: true,
        text: data.choices?.[0]?.message?.content || "",
        provider: data.provider || "omniroute",
        model: data.model || "auto",
        tokens_used: data.usage?.total_tokens || 0
      };
    } catch (e: any) {
      return { success: false, text: "", provider: "omniroute", model: "auto", tokens_used: 0, error: e.message };
    }
  }

  public async *generateResponseStream(
    prompt: string,
    provider: string,
    model: string
  ): AsyncGenerator<{ type: string; provider?: string; model?: string; delta?: string; cost?: number }> {
    yield { type: "metadata", provider: "omniroute", model: "auto" };

    const result = await this.queryOmniRoute(
      "You are GSK, the Grand Soul Kernel. Stream your response token by token.",
      prompt
    );

    if (result.success) {
      const words = result.text.split(" ");
      for (const word of words) {
        await new Promise(resolve => setTimeout(resolve, 30));
        yield { type: "content", delta: word + " " };
      }
      yield { type: "done", cost: 0 };
    } else {
      yield { type: "error", delta: "OmniRoute offline. Heart stopped." };
      yield { type: "done", cost: 0 };
    }
  }

  private getProviderUrl(provider: string): string {
    const urls: Record<string, string> = {
      openai: "https://api.openai.com/v1/chat/completions",
      anthropic: "https://api.anthropic.com/v1/messages",
      groq: "https://api.groq.com/openai/v1/chat/completions",
      google: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      openrouter: "https://openrouter.ai/api/v1/chat/completions",
      deepseek: "https://api.deepseek.com/v1/chat/completions"
    };
    return urls[provider] || urls.openrouter;
  }
}

// Singleton instance
let routerInstance: OmniRouterService | null = null;

export function getOmniRouterService(configDir?: string): OmniRouterService {
  if (!routerInstance) {
    routerInstance = new OmniRouterService(configDir);
  }
  return routerInstance;
}