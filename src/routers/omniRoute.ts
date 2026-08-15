import { Router, Request, Response } from "express";
import { requireApiKey, AuthenticatedRequest } from "../middleware/auth";
import { getOmniRouterService } from "../lib/omniRouterService";

const router = Router();

function getRouterService() {
  return getOmniRouterService();
}

// Health check endpoint for OmniRoute connection
router.get("/health", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getRouterService();
    const config = service.getConfig();
    const stats = service.getStats();

    // Try to query OmniRoute
    const result = await service.queryOmniRoute("Health check", "ping");

    res.json({
      success: true,
      omnirouteOnline: result.success,
      provider: result.provider,
      model: result.model,
      latencyMs: result.tokens_used > 0 ? 100 : 0,
      config: {
        activeProvider: config.active_provider,
        chainLength: config.chain.length
      },
      stats: {
        totalCalls: stats.total_calls,
        successfulCalls: stats.successful_calls,
        failedCalls: stats.failed_calls,
        totalCostUsd: stats.total_cost_usd
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      omnirouteOnline: false,
      error: err.message
    });
  }
});

// Get provider health scores
router.get("/health-scores", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getRouterService();
    const config = service.getConfig();
    const stats = service.getStats();

    const scores = config.chain.map(route => ({
      provider: route.provider,
      model: route.model,
      priority: route.priority,
      costPer1k: route.cost_per_1k,
      healthScore: service.calculateHealthScore(route.provider, stats),
      usageCount: stats.provider_usage[route.provider] || 0
    }));

    res.json({ success: true, scores });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get health scores." });
  }
});

// Get cost analytics
router.get("/analytics", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getRouterService();
    const stats = service.getStats();
    const config = service.getConfig();

    const providerBreakdown = config.chain.map(route => {
      const providerHistory = stats.history.filter(h => h.provider === route.provider);
      const totalTokens = providerHistory.reduce((sum, h) => sum + h.tokens, 0);
      const totalCost = providerHistory.reduce((sum, h) => sum + h.cost, 0);
      const successCount = providerHistory.filter(h => h.success).length;
      const errorRate = providerHistory.length > 0 ? 1 - successCount / providerHistory.length : 0;

      return {
        provider: route.provider,
        model: route.model,
        totalCalls: providerHistory.length,
        totalTokens,
        totalCostUsd: totalCost,
        errorRate: parseFloat(errorRate.toFixed(3)),
        avgTokensPerCall: providerHistory.length > 0 ? Math.round(totalTokens / providerHistory.length) : 0
      };
    });

    res.json({
      success: true,
      analytics: {
        overview: {
          totalCalls: stats.total_calls,
          successfulCalls: stats.successful_calls,
          failedCalls: stats.failed_calls,
          totalCostUsd: stats.total_cost_usd,
          fallbackEvents: stats.fallback_events_count
        },
        providerBreakdown,
        recentHistory: stats.history.slice(-50).reverse()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get analytics." });
  }
});

// Run router verification test
router.post("/test", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getRouterService();
    const config = service.getConfig();
    const testPrompt = req.body.prompt || "Test message from GSK router verification";
    const results: any[] = [];

    // Test OmniRoute
    const omniStart = Date.now();
    const omniResult = await service.queryOmniRoute("Router test", testPrompt);
    const omniLatency = Date.now() - omniStart;

    results.push({
      provider: "omniroute",
      model: "auto",
      success: omniResult.success,
      latencyMs: omniLatency,
      tokensUsed: omniResult.tokens_used,
      error: omniResult.error
    });

    // Test each configured provider (if API keys available)
    for (const route of config.chain) {
      if (route.provider === "omniroute") continue;

      const apiKey = service.resolveApiKey(route.provider, req.body.providerConfig, null);
      if (!apiKey) {
        results.push({
          provider: route.provider,
          model: route.model,
          success: false,
          skipped: true,
          reason: "No API key configured"
        });
        continue;
      }

      const start = Date.now();
      try {
        const text = await service.fetchRealLlmCall(route.provider, route.model, testPrompt, apiKey);
        const latency = Date.now() - start;

        results.push({
          provider: route.provider,
          model: route.model,
          success: true,
          latencyMs: latency,
          tokensUsed: Math.ceil(text.split(/\s+/).length * 1.3),
          responsePreview: text.substring(0, 100)
        });
      } catch (e: any) {
        results.push({
          provider: route.provider,
          model: route.model,
          success: false,
          latencyMs: Date.now() - start,
          error: e.message
        });
      }
    }

    const passed = results.filter(r => r.success && !r.skipped).length;
    const total = results.filter(r => !r.skipped).length;

    res.json({
      success: true,
      summary: {
        passed,
        total,
        passRate: total > 0 ? parseFloat((passed / total).toFixed(2)) : 0,
        omnirouteOnline: results.find(r => r.provider === "omniroute")?.success || false
      },
      results
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Router test failed." });
  }
});

// Get router configuration
router.get("/config", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getRouterService();
    const config = service.getConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get config." });
  }
});

// Update router configuration
router.put("/config", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getRouterService();
    const { chain, active_provider } = req.body;

    if (chain) {
      const config = service.getConfig();
      config.chain = chain;
      if (active_provider) {
        config.active_provider = active_provider;
      } else if (chain.length > 0) {
        config.active_provider = chain[0].provider;
      }
      service.saveConfig(config);
    }

    res.json({ success: true, config: service.getConfig() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update config." });
  }
});

// Reorder provider priority
router.post("/reorder", requireApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getRouterService();
    const { chain } = req.body;

    if (!chain || !Array.isArray(chain)) {
      return res.status(400).json({ error: "Missing or invalid chain array." });
    }

    const config = service.reorderPriority(chain);
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reorder priority." });
  }
});

// Get routing stats
router.get("/stats", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getRouterService();
    const stats = service.getStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get stats." });
  }
});

// Reset stats
router.post("/stats/reset", requireApiKey, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getRouterService();
    const emptyStats = {
      total_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
      total_cost_usd: 0,
      provider_usage: {},
      fallback_events_count: 0,
      history: []
    };
    service.saveStats(emptyStats);
    res.json({ success: true, message: "Stats reset successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reset stats." });
  }
});

export default router;
import { Router } from "express";
import { omniRouterService, checkOmniRouteHealth, queryOmniRoute } from "../lib/omniRouterService";

const router = Router();

// GET /api/omniroute/health - Check health of OmniRouter service and backend
router.get("/health", async (req, res) => {
  try {
    const health = await checkOmniRouteHealth();
    const config = omniRouterService.getConfig();
    const stats = omniRouterService.getStats();

    return res.json({
      status: health.online ? "healthy" : "degraded",
      omniRouteUrl: health.url,
      activeProvider: config.active_provider,
      totalCalls: stats.total_calls,
      successfulCalls: stats.successful_calls,
      chain: config.chain,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/omniroute/stats - Retrieve routing stats
router.get("/stats", (req, res) => {
  try {
    const stats = omniRouterService.getStats();
    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/omniroute/config - Retrieve router configuration
router.get("/config", (req, res) => {
  try {
    const config = omniRouterService.getConfig();
    return res.json(config);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/omniroute/config/reorder - Reorder priority chain
router.post("/config/reorder", (req, res) => {
  try {
    const { chain } = req.body;
    if (!Array.isArray(chain)) {
      return res.status(400).json({ error: "chain must be an array" });
    }
    const updated = omniRouterService.reorderPriority(chain);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/omniroute/chat - Route chat query through fallback chain
router.post("/chat", async (req, res) => {
  try {
    const { message, providerConfig } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }
    const result = await omniRouterService.routeChatQuery(message, providerConfig);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/omniroute/query - Direct OmniRoute call
router.post("/query", async (req, res) => {
  try {
    const { systemPrompt = "You are GSK, Grand Soul Kernel.", message, options } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }
    const response = await queryOmniRoute(systemPrompt, message, options);
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
