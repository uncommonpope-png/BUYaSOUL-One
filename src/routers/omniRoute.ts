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
