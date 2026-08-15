import { describe, it, expect } from "vitest";
import { getGSKMcpClient } from "../src/lib/gskMcpClient";
import { omniRouterService } from "../src/lib/omniRouterService";

describe("GSK MCP Client & OmniRouter Test Suite", () => {
  it("should initialize GSK MCP Client and report health check", async () => {
    const client = getGSKMcpClient();
    expect(client).toBeDefined();
    const isHealthy = await client.healthCheck();
    expect(typeof isHealthy).toBe("boolean");
  });

  it("should execute phase 151 through executePhase MCP wrapper", async () => {
    const client = getGSKMcpClient();
    const result = await client.executePhase(151, { lineageId: "lineage-001" });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  it("should execute phase 230 through executePhase MCP wrapper", async () => {
    const client = getGSKMcpClient();
    const result = await client.executePhase(230, { strategy: "algo-trading-prime" });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  it("should route query through OmniRouter fallback service", async () => {
    const response = await omniRouterService.routeChatQuery("Test PLT True Value calculation");
    expect(response).toBeDefined();
    expect(response.text).toBeDefined();
    expect(response.provider).toBeDefined();
  });
});
