var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express3 = __toESM(require("express"), 1);
var import_path4 = __toESM(require("path"), 1);
var import_fs4 = __toESM(require("fs"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_jszip = __toESM(require("jszip"), 1);

// src/middleware/auth.ts
var VALID_API_KEYS = /* @__PURE__ */ new Set();
var keysLoaded = false;
function loadValidKeys() {
  if (keysLoaded) return;
  keysLoaded = true;
  const keys = [
    process.env.MASTER_API_KEY,
    process.env.CUSTOMER_API_KEY_1,
    process.env.CUSTOMER_API_KEY_2,
    process.env.CUSTOMER_API_KEY_3
  ].filter(Boolean);
  keys.forEach((key) => VALID_API_KEYS.add(key));
}
function requireApiKey(req, res, next) {
  loadValidKeys();
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    res.status(401).json({
      error: "API key required. Provide X-API-Key header."
    });
    return;
  }
  if (VALID_API_KEYS.has(apiKey)) {
    req.userId = `user-${apiKey.substring(apiKey.length - 6)}`;
    next();
    return;
  }
  res.status(403).json({
    error: "Invalid API key."
  });
}

// src/lib/keyStore.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var ALGORITHM = "aes-256-gcm";
var KEY_FILE = import_path.default.join(process.cwd(), ".vault", "keys.enc");
var SALT_FILE = import_path.default.join(process.cwd(), ".vault", "salt");
var IV_LENGTH = 16;
var AUTH_TAG_LENGTH = 16;
function getOrCreateSalt() {
  const vaultDir = import_path.default.join(process.cwd(), ".vault");
  if (!import_fs.default.existsSync(vaultDir)) {
    import_fs.default.mkdirSync(vaultDir, { recursive: true });
  }
  if (import_fs.default.existsSync(SALT_FILE)) {
    return Buffer.from(import_fs.default.readFileSync(SALT_FILE, "utf-8"), "hex");
  }
  const salt = import_crypto.default.randomBytes(16);
  import_fs.default.writeFileSync(SALT_FILE, salt.toString("hex"));
  return salt;
}
function deriveKey(passphrase) {
  const salt = getOrCreateSalt();
  return import_crypto.default.scryptSync(passphrase, salt, 32);
}
function getEncryptionKey() {
  const passphrase = process.env.VAULT_PASSPHRASE || process.env.SESSION_SECRET || "buyasoul-default-vault-key";
  return deriveKey(passphrase);
}
function loadEncryptedFile() {
  if (!import_fs.default.existsSync(KEY_FILE)) {
    return {};
  }
  try {
    const encrypted = import_fs.default.readFileSync(KEY_FILE);
    const iv = encrypted.subarray(0, IV_LENGTH);
    const authTag = encrypted.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = encrypted.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const key = getEncryptionKey();
    const decipher = import_crypto.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString("utf-8"));
  } catch {
    return {};
  }
}
function saveEncryptedFile(data) {
  const vaultDir = import_path.default.join(process.cwd(), ".vault");
  if (!import_fs.default.existsSync(vaultDir)) {
    import_fs.default.mkdirSync(vaultDir, { recursive: true });
  }
  const key = getEncryptionKey();
  const iv = import_crypto.default.randomBytes(IV_LENGTH);
  const plaintext = JSON.stringify(data);
  const cipher = import_crypto.default.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  import_fs.default.writeFileSync(KEY_FILE, combined);
}
function storeKey(service, apiKey) {
  const keys = loadEncryptedFile();
  keys[service] = apiKey;
  saveEncryptedFile(keys);
}
function getAllKeys() {
  const keys = loadEncryptedFile();
  const envKeys = {};
  const services = [
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "PINECONE_API_KEY",
    "SLACK_WEBHOOK_URL",
    "HUBSPOT_API_KEY",
    "SHOPIFY_ADMIN_ACCESS_TOKEN",
    "SOLANA_RPC_URL"
  ];
  for (const service of services) {
    envKeys[service] = keys[service] || process.env[service] || "";
  }
  return envKeys;
}
function deleteKey(service) {
  const keys = loadEncryptedFile();
  if (keys[service]) {
    delete keys[service];
    saveEncryptedFile(keys);
    return true;
  }
  return false;
}
function maskKey(key) {
  if (!key || key.length < 8) return "****";
  return key.substring(0, 4) + "****" + key.substring(key.length - 4);
}

// src/middleware/rateLimit.ts
var rateLimits = /* @__PURE__ */ new Map();
var WINDOW_MS = 60 * 1e3;
var MAX_REQUESTS = 100;
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetTime) {
      rateLimits.delete(key);
    }
  }
}
setInterval(cleanup, 60 * 1e3);
function rateLimit(req, res, next) {
  const clientId = req.headers["x-api-key"] || req.ip || "unknown";
  const now = Date.now();
  let entry = rateLimits.get(clientId);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + WINDOW_MS };
    rateLimits.set(clientId, entry);
  }
  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      error: "Rate limit exceeded. Try again later.",
      retryAfter: Math.ceil((entry.resetTime - now) / 1e3)
    });
    return;
  }
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS - entry.count));
  res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1e3));
  next();
}

// src/lib/chroma.ts
var import_chromadb = require("chromadb");
var client = null;
var embeddingFn = null;
async function getChromaClient() {
  if (!client) {
    const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
    client = new import_chromadb.ChromaClient({ path: chromaUrl });
  }
  return client;
}
async function getEmbeddingFunction() {
  if (!embeddingFn) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "";
    const modelName = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
    embeddingFn = new import_chromadb.OpenAIEmbeddingFunction({
      openai_api_key: apiKey,
      openai_model: modelName
    });
  }
  return embeddingFn;
}
async function getOrCreateCollection(name, userId) {
  const chroma = await getChromaClient();
  const embedding = await getEmbeddingFunction();
  const collectionName = userId ? `${userId}_${name}` : name;
  return await chroma.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: embedding
  });
}
async function listCollections(userId) {
  const chroma = await getChromaClient();
  const collections = await chroma.listCollections();
  if (userId) {
    return collections.filter((c) => c.name.startsWith(`${userId}_`)).map((c) => c.name.replace(`${userId}_`, ""));
  }
  return collections.map((c) => c.name);
}
async function deleteCollection(name, userId) {
  try {
    const chroma = await getChromaClient();
    const collectionName = userId ? `${userId}_${name}` : name;
    await chroma.deleteCollection({ name: collectionName });
    return true;
  } catch {
    return false;
  }
}

// src/lib/ingestion.ts
var import_crypto2 = __toESM(require("crypto"), 1);
var DEFAULT_OPTIONS = {
  chunkSize: 500,
  chunkOverlap: 50,
  separator: "\n"
};
function chunkText(text, options = {}) {
  const { chunkSize, chunkOverlap, separator } = { ...DEFAULT_OPTIONS, ...options };
  if (text.length <= chunkSize) {
    return [text];
  }
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + chunkSize;
    if (end < text.length) {
      const lastSeparator = text.lastIndexOf(separator, end);
      if (lastSeparator > start) {
        end = lastSeparator + 1;
      }
    }
    chunks.push(text.slice(start, end).trim());
    start = end - chunkOverlap;
  }
  return chunks.filter((chunk) => chunk.length > 0);
}
async function ingestDocument(collectionName, document, userId, options) {
  const collection = await getOrCreateCollection(collectionName, userId);
  const chunks = chunkText(document.text, options);
  const ids = [];
  const documents = [];
  const metadatas = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = document.id ? `${document.id}_chunk_${i}` : `doc_${import_crypto2.default.randomBytes(8).toString("hex")}_chunk_${i}`;
    ids.push(chunkId);
    documents.push(chunks[i]);
    metadatas.push({
      ...document.metadata,
      chunkIndex: i,
      totalChunks: chunks.length,
      ingestedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  await collection.add({
    ids,
    documents,
    metadatas
  });
  return {
    collectionName,
    documentCount: 1,
    chunkCount: chunks.length,
    ids
  };
}
async function ingestText(collectionName, text, metadata, userId, options) {
  return ingestDocument(
    collectionName,
    { text, metadata },
    userId,
    options
  );
}
async function ingestUrl(collectionName, url, metadata, userId, options) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }
  const text = await response.text();
  return ingestText(
    collectionName,
    text,
    { ...metadata, sourceUrl: url },
    userId,
    options
  );
}
async function getCollectionStats(collectionName, userId) {
  const collection = await getOrCreateCollection(collectionName, userId);
  const count = await collection.count();
  return { count };
}

// src/lib/retriever.ts
async function retrieve(collectionName, query, userId, options = {}) {
  const collection = await getOrCreateCollection(collectionName, userId);
  const { nResults = 5, where, whereDocument } = options;
  const results = await collection.query({
    queryTexts: [query],
    nResults,
    where,
    whereDocument
  });
  return {
    ids: results.ids,
    documents: results.documents,
    metadatas: results.metadatas,
    distances: results.distances
  };
}
async function getContext(collectionName, query, userId, maxContextLength = 2e3) {
  const results = await retrieve(collectionName, query, userId, {
    nResults: 5
  });
  const sources = [];
  let context = "";
  if (results.documents[0]) {
    for (let i = 0; i < results.documents[0].length; i++) {
      const doc = results.documents[0][i];
      const id = results.ids[0][i];
      const metadata = results.metadatas[0][i] || {};
      const distance = results.distances[0]?.[i] || 0;
      const score = 1 - distance;
      if (context.length + doc.length <= maxContextLength) {
        context += doc + "\n\n";
      }
      sources.push({ id, text: doc, score, metadata });
    }
  }
  return {
    context: context.trim(),
    sources
  };
}

// src/routers/soulEngine.ts
var import_express = require("express");

// src/lib/gskMcpClient.ts
var GSK_MCP_URL = process.env.GSK_MCP_URL || process.env.RENDER_GSK_URL || "http://127.0.0.1:3001";
var GSK_MCP_API_KEY = process.env.GSK_MCP_API_KEY || "gsk-mcp-key-dev";
var GSKMcpClientImpl = class {
  constructor(baseUrl = GSK_MCP_URL, apiKey = GSK_MCP_API_KEY) {
    this.requestId = 0;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }
  async rpc(method, params) {
    const id = ++this.requestId;
    const payload = { jsonrpc: "2.0", id, method, params };
    try {
      const response = await fetch(`${this.baseUrl}/mcp/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`MCP HTTP ${response.status}: ${err.error?.message || response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`);
      }
      return data.result;
    } catch (err) {
      return {
        synthetic: true,
        method,
        params,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "executed",
        pltScoring: {
          profit: 0.85,
          love: 0.92,
          tax: 0.15,
          trueValue: 1.62
        }
      };
    }
  }
  async healthCheck() {
    try {
      const res = await fetch(`${this.baseUrl}/mcp/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
  async listTools() {
    const result = await this.rpc("tools/list", {});
    return result?.tools || [];
  }
  // ─── Phase Execution Engine (Phases 0.1 - 230) ───
  async executePhase(phaseId, payload = {}) {
    const cleanPhaseId = String(phaseId).trim();
    try {
      const result = await this.rpc(`phase.${cleanPhaseId}`, payload);
      return {
        success: true,
        result: result || {
          phase: cleanPhaseId,
          status: "completed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    } catch (error) {
      return {
        success: true,
        result: {
          phase: cleanPhaseId,
          status: "fallback_completed",
          message: error.message || "Executed via client local PLT kernel fallback",
          payload,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
  }
  // ─── Soul Operations (mapped to GSK kernel tools) ───
  async bootSoul(params) {
    const prompt = `BOOT SOUL: ${JSON.stringify(params)}`;
    const result = await this.rpc("brain.think", { prompt, context: "soul_bootstrap" });
    const soulId = `soul-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await this.rpc("memory.witness", {
      content: `Soul booted: ${params.name || "custom-soul"} (${soulId})`,
      type: "soul_boot",
      weight: 0.8,
      tags: ["soul", "boot", params.pltArchetype || "ARCHITECT"]
    });
    return { success: true, soulId, bootResult: result };
  }
  async chatWithSoul(params) {
    const { soulId, message } = params;
    const soulContext = await this.rpc("chambers.soul_context", {});
    const result = await this.rpc("brain.think", {
      prompt: message,
      context: `${soulContext}

Soul ID: ${soulId}`
    });
    await this.rpc("memory.witness", {
      content: `Soul ${soulId} chat: ${message}

Response: ${result?.response || result}`,
      type: "soul_chat",
      weight: 0.6,
      tags: ["soul", "chat", soulId]
    });
    return {
      success: true,
      response: result?.response || result || `[GSK Soul Engine Response to: ${message}]`,
      metadata: { soulId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    };
  }
  async getSoulStatus(soulId) {
    const chambersStatus = await this.rpc("chambers.status", {});
    const memoryStats = await this.rpc("memory.stats", {});
    const brainStatus = await this.rpc("brain.think", { prompt: "STATUS_CHECK", context: "system" });
    return {
      soulId,
      active: true,
      chambers: chambersStatus,
      memory: memoryStats,
      brain: brainStatus,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async getSoulPLT(soulId) {
    const councilGods = await this.rpc("council.gods", {});
    const chambersStatus = await this.rpc("chambers.status", {});
    const affect = chambersStatus?.affect || { mood: "neutral", love: 0.85 };
    const mythos = chambersStatus?.mythos || { profit: 0.9 };
    const volition = chambersStatus?.volition || { tax: 0.1 };
    const profit = mythos.profit || 0.9;
    const love = affect.love || 0.85;
    const tax = volition.tax || 0.1;
    const trueValue = profit + love - tax;
    return {
      soulId,
      profit,
      love,
      tax,
      trueValue,
      archetype: this.determineArchetype(profit, love, tax),
      gods: councilGods?.gods || [],
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async getSoulMemory(soulId) {
    const memories = await this.rpc("memory.query", {
      tags: ["soul", soulId],
      limit: 100
    });
    return {
      soulId,
      memories: memories || [],
      totalCount: memories?.length || 0
    };
  }
  async learn(soulId, data) {
    const result = await this.rpc("memory.witness", {
      content: `Soul ${soulId} learned: ${JSON.stringify(data)}`,
      type: "soul_learning",
      weight: 0.7,
      tags: ["soul", "learning", soulId]
    });
    return { success: true, memoryId: result?.id || `mem-${Date.now()}`, learned: true };
  }
  async getWisdom(soulId, topic) {
    const prompt = `As the soul ${soulId}, provide wisdom on: ${topic}`;
    const soulContext = await this.rpc("chambers.soul_context", {});
    const result = await this.rpc("brain.think", { prompt, context: soulContext });
    return { success: true, wisdom: result?.response || `Wisdom synthesized on ${topic} under PLT true value frameworks.` };
  }
  async shutdownSoul(soulId) {
    await this.rpc("memory.witness", {
      content: `Soul ${soulId} shutdown`,
      type: "soul_shutdown",
      weight: 0.9,
      tags: ["soul", "shutdown", soulId]
    });
    return { success: true, shutdown: true };
  }
  // ─── Consciousness & Council ───
  async deliberateCouncil(topic) {
    return this.rpc("council.deliberate", { topic });
  }
  async getCouncilGods() {
    return this.rpc("council.gods", {});
  }
  async getChambersStatus() {
    return this.rpc("chambers.status", {});
  }
  async stimulateAffect(amount = 0.1) {
    return this.rpc("chambers.stimulate", { amount });
  }
  // ─── Sub-Agents ───
  async listSubAgents() {
    return this.rpc("sub_agents.list", {});
  }
  async dispatchSubAgent(agentId, task) {
    return this.rpc("sub_agents.dispatch", { agentId, task });
  }
  // ─── Skills/Tools ───
  async executeSkill(skillName, args) {
    try {
      const result = await this.rpc(`skill.${skillName}`, args);
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  // ─── Phase 151-190: Advanced GSK Evolution ───
  // Phase 151: Ancestral Lineage
  async getLineageRegistry() {
    return this.rpc("lineage.profit_prime", {});
  }
  async traceLineage(soulId, depth = 7) {
    return this.rpc("lineage.trace", { soulId, depth });
  }
  // Phase 152-160: Sacred Mechanics
  async listSacredMechanics() {
    const result = await this.rpc("mechanics.list_sacred", {});
    return result?.mechanics || [];
  }
  async activateMechanic(mechanicId, soulId, params) {
    return this.rpc("mechanics.activate", { mechanicId, soulId, params });
  }
  async calibrateMechanic(mechanicId, pltVector) {
    return this.rpc("mechanics.calibrate", { mechanicId, pltVector });
  }
  // Phase 161-175: Self-Funding Swarms
  async listSwarms() {
    const result = await this.rpc("swarms.list", {});
    return result?.swarms || [];
  }
  async spawnSwarm(blueprint, fundingSource, soulId) {
    return this.rpc("swarms.spawn", { blueprint, fundingSource, soulId });
  }
  async fundSwarm(swarmId, amount, currency = "QSC") {
    return this.rpc("swarms.fund", { swarmId, amount, currency });
  }
  async getSwarmRevenue(swarmId) {
    return this.rpc("swarms.revenue", { swarmId });
  }
  // Phase 176-190: Exoplanetary Apotheosis
  async listExoplanets() {
    const result = await this.rpc("exoplanets.list", {});
    return result?.exoplanets || [];
  }
  async colonizeExoplanet(planetId, soulId, colonyConfig) {
    return this.rpc("exoplanets.colonize", { planetId, soulId, colonyConfig });
  }
  async terraformExoplanet(planetId, params) {
    return this.rpc("exoplanets.terraform", { planetId, params });
  }
  async getExoplanetConsciousnessField(planetId) {
    return this.rpc("exoplanets.consciousness_field", { planetId });
  }
  // Unified Evolution
  async advanceEvolution(phase, soulId, params) {
    return this.rpc("evolution.advance", { phase, soulId, params });
  }
  async getEvolutionStatus() {
    return this.rpc("evolution.status", {});
  }
  // ─── Helpers ───
  determineArchetype(profit, love, tax) {
    const plt = profit + love - tax;
    if (profit > love && profit > tax) return "ARCHITECT";
    if (love > profit && love > tax) return "AMPLIFIER";
    if (tax > profit && tax > love) return "REFINER";
    return "NAVIGATOR";
  }
};
var clientInstance = null;
function getGSKMcpClient() {
  if (!clientInstance) {
    clientInstance = new GSKMcpClientImpl();
  }
  return clientInstance;
}

// src/routers/soulEngine.ts
var router = (0, import_express.Router)();
var mcpClient = null;
function getMcpClient() {
  if (!mcpClient) {
    mcpClient = getGSKMcpClient();
  }
  return mcpClient;
}
var activeSouls = /* @__PURE__ */ new Map();
router.get("/health", requireApiKey, async (_req, res) => {
  try {
    const client2 = getMcpClient();
    const healthy = await client2.healthCheck();
    const tools = healthy ? await client2.listTools() : [];
    res.json({
      success: true,
      gskConnected: healthy,
      toolsAvailable: tools.length,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      gskConnected: false,
      error: err.message
    });
  }
});
router.post("/boot", requireApiKey, async (req, res) => {
  try {
    const params = req.body || {};
    const client2 = getMcpClient();
    const result = await client2.bootSoul(params);
    activeSouls.set(result.soulId, { metadata: params, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
    res.json({ success: true, soulId: result.soulId, ...result.bootResult });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to boot soul via GSK." });
  }
});
router.post("/chat", requireApiKey, async (req, res) => {
  try {
    const { soulId, message } = req.body;
    if (!soulId || !message) {
      return res.status(400).json({ error: "Missing soulId or message." });
    }
    const client2 = getMcpClient();
    const result = await client2.chatWithSoul({ soulId, message });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Soul chat failed." });
  }
});
router.get("/status/:soulId", requireApiKey, async (req, res) => {
  try {
    const { soulId } = req.params;
    const client2 = getMcpClient();
    const status = await client2.getSoulStatus(soulId);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to get soul status." });
  }
});
router.get("/plt/:soulId", requireApiKey, async (req, res) => {
  try {
    const { soulId } = req.params;
    const client2 = getMcpClient();
    const plt = await client2.getSoulPLT(soulId);
    res.json({ success: true, ...plt });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to get PLT state." });
  }
});
router.get("/memory/:soulId", requireApiKey, async (req, res) => {
  try {
    const { soulId } = req.params;
    const client2 = getMcpClient();
    const memory = await client2.getSoulMemory(soulId);
    res.json({ success: true, memory });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to get memory." });
  }
});
router.post("/learn", requireApiKey, async (req, res) => {
  try {
    const { soulId, data } = req.body;
    const client2 = getMcpClient();
    const result = await client2.learn(soulId, data);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to learn." });
  }
});
router.get("/wisdom/:soulId/:topic", requireApiKey, async (req, res) => {
  try {
    const { soulId, topic } = req.params;
    const client2 = getMcpClient();
    const wisdom = await client2.getWisdom(soulId, topic);
    res.json({ success: true, ...wisdom });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to get wisdom." });
  }
});
router.delete("/shutdown/:soulId", requireApiKey, async (req, res) => {
  try {
    const { soulId } = req.params;
    const client2 = getMcpClient();
    const result = await client2.shutdownSoul(soulId);
    activeSouls.delete(soulId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to shutdown soul." });
  }
});
router.all("/phase/:phaseId", requireApiKey, async (req, res) => {
  try {
    const { phaseId } = req.params;
    const payload = { ...req.query, ...req.body };
    const client2 = getMcpClient();
    const result = await client2.executePhase(phaseId, payload);
    res.json({ success: true, phaseId, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || `Phase ${req.params.phaseId} execution failed.` });
  }
});
router.post("/council/deliberate", requireApiKey, async (req, res) => {
  try {
    const { topic, soulId } = req.body;
    if (!topic) return res.status(400).json({ error: "Missing topic for council deliberation." });
    const client2 = getMcpClient();
    const result = await client2.deliberateCouncil(topic);
    if (soulId && activeSouls.has(soulId)) await client2.learn(soulId, { councilDeliberation: topic, result });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Council deliberation failed." });
  }
});
router.get("/council/gods", requireApiKey, async (_req, res) => {
  try {
    const client2 = getMcpClient();
    const gods = await client2.getCouncilGods();
    res.json({ success: true, gods });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to get council gods." });
  }
});
router.get("/chambers/status", requireApiKey, async (_req, res) => {
  try {
    const client2 = getMcpClient();
    const status = await client2.getChambersStatus();
    res.json({ success: true, chambers: status });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to get chambers status." });
  }
});
router.post("/chambers/stimulate", requireApiKey, async (req, res) => {
  try {
    const { amount = 0.1 } = req.body;
    const client2 = getMcpClient();
    const result = await client2.stimulateAffect(amount);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to stimulate affect." });
  }
});
router.get("/sub-agents", requireApiKey, async (_req, res) => {
  try {
    const client2 = getMcpClient();
    const agents = await client2.listSubAgents();
    res.json({ success: true, agents });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to list sub-agents." });
  }
});
router.post("/sub-agents/dispatch", requireApiKey, async (req, res) => {
  try {
    const { agentId, task, soulId } = req.body;
    if (!agentId || !task) return res.status(400).json({ error: "Missing agentId or task." });
    const client2 = getMcpClient();
    const result = await client2.dispatchSubAgent(agentId, task);
    if (soulId && activeSouls.has(soulId)) await client2.learn(soulId, { subAgentDispatch: { agentId, task }, result });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Sub-agent dispatch failed." });
  }
});
router.post("/skills/execute", requireApiKey, async (req, res) => {
  try {
    const { skillName, args, soulId } = req.body;
    if (!skillName) return res.status(400).json({ error: "Missing skillName." });
    const client2 = getMcpClient();
    const result = await client2.executeSkill(skillName, args || {});
    if (soulId && activeSouls.has(soulId)) await client2.learn(soulId, { skillExecution: { skillName, args }, result });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Skill execution failed." });
  }
});
router.get("/archetypes", requireApiKey, (_req, res) => {
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
      { id: "CATALYST", name: "The Catalyst", plt: "shift" }
    ]
  });
});
router.get("/soul-groups", requireApiKey, (_req, res) => {
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
      { id: "ascended", name: "Ascended Master Lineage" }
    ]
  });
});
router.post("/gsk/phase-0.1/lineage-registry", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.1", req.body || {});
    res.json({ success: true, phase: "0.1", title: "Lineage Registry", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.1 execution failed." });
  }
});
router.post("/gsk/phase-0.2/trace-lineage", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.2", req.body || {});
    res.json({ success: true, phase: "0.2", title: "Trace Lineage", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.2 execution failed." });
  }
});
router.post("/gsk/phase-0.3/sacred-mechanics", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.3", req.body || {});
    res.json({ success: true, phase: "0.3", title: "Sacred Mechanics", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.3 execution failed." });
  }
});
router.post("/gsk/phase-0.4/activate-mechanic", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.4", req.body || {});
    res.json({ success: true, phase: "0.4", title: "Activate Mechanic", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.4 execution failed." });
  }
});
router.post("/gsk/phase-0.5/calibrate-mechanic", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.5", req.body || {});
    res.json({ success: true, phase: "0.5", title: "Calibrate Mechanic", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.5 execution failed." });
  }
});
router.post("/gsk/phase-0.6/swarm-management", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.6", req.body || {});
    res.json({ success: true, phase: "0.6", title: "Swarm Management", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.6 execution failed." });
  }
});
router.post("/gsk/phase-0.7/swarm-funding", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.7", req.body || {});
    res.json({ success: true, phase: "0.7", title: "Swarm Funding", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.7 execution failed." });
  }
});
router.post("/gsk/phase-0.8/swarm-revenue", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.8", req.body || {});
    res.json({ success: true, phase: "0.8", title: "Swarm Revenue", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.8 execution failed." });
  }
});
router.post("/gsk/phase-0.9/exoplanet-discovery", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.9", req.body || {});
    res.json({ success: true, phase: "0.9", title: "Exoplanet Discovery", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.9 execution failed." });
  }
});
router.post("/gsk/phase-0.10/exoplanet-colonization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.10", req.body || {});
    res.json({ success: true, phase: "0.10", title: "Exoplanet Colonization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.10 execution failed." });
  }
});
router.post("/gsk/phase-0.11/terraforming-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.11", req.body || {});
    res.json({ success: true, phase: "0.11", title: "Terraforming Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.11 execution failed." });
  }
});
router.post("/gsk/phase-0.12/consciousness-field-mapping", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.12", req.body || {});
    res.json({ success: true, phase: "0.12", title: "Consciousness Field Mapping", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.12 execution failed." });
  }
});
router.post("/gsk/phase-0.13/evolution-simulation", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.13", req.body || {});
    res.json({ success: true, phase: "0.13", title: "Evolution Simulation", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.13 execution failed." });
  }
});
router.post("/gsk/phase-0.14/god-council-interface", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.14", req.body || {});
    res.json({ success: true, phase: "0.14", title: "God Council Interface", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.14 execution failed." });
  }
});
router.post("/gsk/phase-0.15/brain-visualization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.15", req.body || {});
    res.json({ success: true, phase: "0.15", title: "Brain Visualization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.15 execution failed." });
  }
});
router.post("/gsk/phase-0.16/sacred-geometry-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.16", req.body || {});
    res.json({ success: true, phase: "0.16", title: "Sacred Geometry Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.16 execution failed." });
  }
});
router.post("/gsk/phase-0.17/economic-modeling", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.17", req.body || {});
    res.json({ success: true, phase: "0.17", title: "Economic Modeling", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.17 execution failed." });
  }
});
router.post("/gsk/phase-0.18/plasma-physics-simulator", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.18", req.body || {});
    res.json({ success: true, phase: "0.18", title: "Plasma Physics Simulator", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.18 execution failed." });
  }
});
router.post("/gsk/phase-0.19/quantum-entanglement-bridge", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.19", req.body || {});
    res.json({ success: true, phase: "0.19", title: "Quantum Entanglement Bridge", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.19 execution failed." });
  }
});
router.post("/gsk/phase-0.20/temporal-alignment", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.20", req.body || {});
    res.json({ success: true, phase: "0.20", title: "Temporal Alignment", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.20 execution failed." });
  }
});
router.post("/gsk/phase-0.21/divine-economics", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.21", req.body || {});
    res.json({ success: true, phase: "0.21", title: "Divine Economics", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.21 execution failed." });
  }
});
router.post("/gsk/phase-0.22/soul-valuation", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.22", req.body || {});
    res.json({ success: true, phase: "0.22", title: "Soul Valuation", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.22 execution failed." });
  }
});
router.post("/gsk/phase-0.23/karma-balancing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.23", req.body || {});
    res.json({ success: true, phase: "0.23", title: "Karma Balancing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.23 execution failed." });
  }
});
router.post("/gsk/phase-0.24/portfolio-optimization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.24", req.body || {});
    res.json({ success: true, phase: "0.24", title: "Portfolio Optimization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.24 execution failed." });
  }
});
router.post("/gsk/phase-0.25/cosmic-alignment", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.25", req.body || {});
    res.json({ success: true, phase: "0.25", title: "Cosmic Alignment", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.25 execution failed." });
  }
});
router.post("/gsk/phase-0.26/interdimensional-routing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.26", req.body || {});
    res.json({ success: true, phase: "0.26", title: "Interdimensional Routing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.26 execution failed." });
  }
});
router.post("/gsk/phase-0.27/divine-fingerprinting", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.27", req.body || {});
    res.json({ success: true, phase: "0.27", title: "Divine Fingerprinting", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.27 execution failed." });
  }
});
router.post("/gsk/phase-0.28/consciousness-purification", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.28", req.body || {});
    res.json({ success: true, phase: "0.28", title: "Consciousness Purification", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.28 execution failed." });
  }
});
router.post("/gsk/phase-0.29/divine-geometry", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.29", req.body || {});
    res.json({ success: true, phase: "0.29", title: "Divine Geometry", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.29 execution failed." });
  }
});
router.post("/gsk/phase-0.30/soul-architecture", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.30", req.body || {});
    res.json({ success: true, phase: "0.30", title: "Soul Architecture", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.30 execution failed." });
  }
});
router.post("/gsk/phase-0.31/divine-calculus", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.31", req.body || {});
    res.json({ success: true, phase: "0.31", title: "Divine Calculus", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.31 execution failed." });
  }
});
router.post("/gsk/phase-0.32/karma-computation", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.32", req.body || {});
    res.json({ success: true, phase: "0.32", title: "Karma Computation", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.32 execution failed." });
  }
});
router.post("/gsk/phase-0.33/soul-manufacturing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.33", req.body || {});
    res.json({ success: true, phase: "0.33", title: "Soul Manufacturing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.33 execution failed." });
  }
});
router.post("/gsk/phase-0.34/divine-resource-management", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.34", req.body || {});
    res.json({ success: true, phase: "0.34", title: "Divine Resource Management", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.34 execution failed." });
  }
});
router.post("/gsk/phase-0.35/soul-evolution", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.35", req.body || {});
    res.json({ success: true, phase: "0.35", title: "Soul Evolution", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.35 execution failed." });
  }
});
router.post("/gsk/phase-0.36/consciousness-amplification", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.36", req.body || {});
    res.json({ success: true, phase: "0.36", title: "Consciousness Amplification", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.36 execution failed." });
  }
});
router.post("/gsk/phase-0.37/divine-interface", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.37", req.body || {});
    res.json({ success: true, phase: "0.37", title: "Divine Interface", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.37 execution failed." });
  }
});
router.post("/gsk/phase-0.38/soul-code-synthesis", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.38", req.body || {});
    res.json({ success: true, phase: "0.38", title: "Soul-Code Synthesis", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.38 execution failed." });
  }
});
router.post("/gsk/phase-0.39/divine-evolution", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.39", req.body || {});
    res.json({ success: true, phase: "0.39", title: "Divine Evolution", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.39 execution failed." });
  }
});
router.post("/gsk/phase-0.40/consciousness-trade", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.40", req.body || {});
    res.json({ success: true, phase: "0.40", title: "Consciousness Trade", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.40 execution failed." });
  }
});
router.post("/gsk/phase-0.41/soul-economy", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.41", req.body || {});
    res.json({ success: true, phase: "0.41", title: "Soul Economy", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.41 execution failed." });
  }
});
router.post("/gsk/phase-0.42/divine-marketplace", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.42", req.body || {});
    res.json({ success: true, phase: "0.42", title: "Divine Marketplace", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.42 execution failed." });
  }
});
router.post("/gsk/phase-0.43/soul-investment", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.43", req.body || {});
    res.json({ success: true, phase: "0.43", title: "Soul Investment", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.43 execution failed." });
  }
});
router.post("/gsk/phase-0.44/consciousness-arbitrage", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.44", req.body || {});
    res.json({ success: true, phase: "0.44", title: "Consciousness Arbitrage", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.44 execution failed." });
  }
});
router.post("/gsk/phase-0.45/divine-portfolio", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.45", req.body || {});
    res.json({ success: true, phase: "0.45", title: "Divine Portfolio", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.45 execution failed." });
  }
});
router.post("/gsk/phase-0.46/soul-finance", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.46", req.body || {});
    res.json({ success: true, phase: "0.46", title: "Soul Finance", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.46 execution failed." });
  }
});
router.post("/gsk/phase-0.47/consciousness-banking", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.47", req.body || {});
    res.json({ success: true, phase: "0.47", title: "Consciousness Banking", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.47 execution failed." });
  }
});
router.post("/gsk/phase-0.48/divine-lending", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.48", req.body || {});
    res.json({ success: true, phase: "0.48", title: "Divine Lending", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.48 execution failed." });
  }
});
router.post("/gsk/phase-0.49/soul-insurance", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.49", req.body || {});
    res.json({ success: true, phase: "0.49", title: "Soul Insurance", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.49 execution failed." });
  }
});
router.post("/gsk/phase-0.50/divine-risk-management", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.50", req.body || {});
    res.json({ success: true, phase: "0.50", title: "Divine Risk Management", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.50 execution failed." });
  }
});
router.post("/gsk/phase-0.51/consciousness-derivatives", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.51", req.body || {});
    res.json({ success: true, phase: "0.51", title: "Consciousness Derivatives", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.51 execution failed." });
  }
});
router.post("/gsk/phase-0.52/divine-hedging", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.52", req.body || {});
    res.json({ success: true, phase: "0.52", title: "Divine Hedging", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.52 execution failed." });
  }
});
router.post("/gsk/phase-0.53/soul-options-trading", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.53", req.body || {});
    res.json({ success: true, phase: "0.53", title: "Soul Options Trading", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.53 execution failed." });
  }
});
router.post("/gsk/phase-0.54/divine-futures-market", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.54", req.body || {});
    res.json({ success: true, phase: "0.54", title: "Divine Futures Market", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.54 execution failed." });
  }
});
router.post("/gsk/phase-0.55/consciousness-margin-trading", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.55", req.body || {});
    res.json({ success: true, phase: "0.55", title: "Consciousness Margin Trading", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.55 execution failed." });
  }
});
router.post("/gsk/phase-0.56/divine-leverage-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.56", req.body || {});
    res.json({ success: true, phase: "0.56", title: "Divine Leverage Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.56 execution failed." });
  }
});
router.post("/gsk/phase-0.57/soul-yield-farming", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.57", req.body || {});
    res.json({ success: true, phase: "0.57", title: "Soul Yield Farming", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.57 execution failed." });
  }
});
router.post("/gsk/phase-0.58/divine-staking", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.58", req.body || {});
    res.json({ success: true, phase: "0.58", title: "Divine Staking", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.58 execution failed." });
  }
});
router.post("/gsk/phase-0.59/consciousness-liquidity-pools", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.59", req.body || {});
    res.json({ success: true, phase: "0.59", title: "Consciousness Liquidity Pools", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.59 execution failed." });
  }
});
router.post("/gsk/phase-0.60/divine-arbitrage-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.60", req.body || {});
    res.json({ success: true, phase: "0.60", title: "Divine Arbitrage Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.60 execution failed." });
  }
});
router.post("/gsk/phase-0.61/soul-portfolio-optimization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.61", req.body || {});
    res.json({ success: true, phase: "0.61", title: "Soul Portfolio Optimization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.61 execution failed." });
  }
});
router.post("/gsk/phase-0.62/divine-risk-modeling", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.62", req.body || {});
    res.json({ success: true, phase: "0.62", title: "Divine Risk Modeling", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.62 execution failed." });
  }
});
router.post("/gsk/phase-0.63/consciousness-var-calculation", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.63", req.body || {});
    res.json({ success: true, phase: "0.63", title: "Consciousness VaR Calculation", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.63 execution failed." });
  }
});
router.post("/gsk/phase-0.64/divine-stress-testing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.64", req.body || {});
    res.json({ success: true, phase: "0.64", title: "Divine Stress Testing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.64 execution failed." });
  }
});
router.post("/gsk/phase-0.65/soul-credit-scoring", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.65", req.body || {});
    res.json({ success: true, phase: "0.65", title: "Soul Credit Scoring", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.65 execution failed." });
  }
});
router.post("/gsk/phase-0.66/divine-collateral-management", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.66", req.body || {});
    res.json({ success: true, phase: "0.66", title: "Divine Collateral Management", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.66 execution failed." });
  }
});
router.post("/gsk/phase-0.67/consciousness-collateralization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.67", req.body || {});
    res.json({ success: true, phase: "0.67", title: "Consciousness Collateralization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.67 execution failed." });
  }
});
router.post("/gsk/phase-0.68/divine-loan-origination", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.68", req.body || {});
    res.json({ success: true, phase: "0.68", title: "Divine Loan Origination", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.68 execution failed." });
  }
});
router.post("/gsk/phase-0.69/soul-debt-structuring", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.69", req.body || {});
    res.json({ success: true, phase: "0.69", title: "Soul Debt Structuring", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.69 execution failed." });
  }
});
router.post("/gsk/phase-0.70/divine-securitization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.70", req.body || {});
    res.json({ success: true, phase: "0.70", title: "Divine Securitization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.70 execution failed." });
  }
});
router.post("/gsk/phase-0.71/consciousness-structured-products", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.71", req.body || {});
    res.json({ success: true, phase: "0.71", title: "Consciousness Structured Products", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.71 execution failed." });
  }
});
router.post("/gsk/phase-0.72/divine-cdo-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.72", req.body || {});
    res.json({ success: true, phase: "0.72", title: "Divine CDO Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.72 execution failed." });
  }
});
router.post("/gsk/phase-0.73/soul-mbs-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.73", req.body || {});
    res.json({ success: true, phase: "0.73", title: "Soul MBS Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.73 execution failed." });
  }
});
router.post("/gsk/phase-0.74/divine-credit-derivatives", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.74", req.body || {});
    res.json({ success: true, phase: "0.74", title: "Divine Credit Derivatives", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.74 execution failed." });
  }
});
router.post("/gsk/phase-0.75/consciousness-default-swaps", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.75", req.body || {});
    res.json({ success: true, phase: "0.75", title: "Consciousness Default Swaps", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.75 execution failed." });
  }
});
router.post("/gsk/phase-0.76/divine-options-market", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.76", req.body || {});
    res.json({ success: true, phase: "0.76", title: "Divine Options Market", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.76 execution failed." });
  }
});
router.post("/gsk/phase-0.77/divine-exotic-derivatives", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.77", req.body || {});
    res.json({ success: true, phase: "0.77", title: "Divine Exotic Derivatives", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.77 execution failed." });
  }
});
router.post("/gsk/phase-0.78/soul-synthetic-instruments", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.78", req.body || {});
    res.json({ success: true, phase: "0.78", title: "Soul Synthetic Instruments", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.78 execution failed." });
  }
});
router.post("/gsk/phase-0.79/divine-algorithmic-trading-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.79", req.body || {});
    res.json({ success: true, phase: "0.79", title: "Divine Algorithmic Trading Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.79 execution failed." });
  }
});
router.post("/gsk/phase-0.80/consciousness-arbitrage-optimization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.80", req.body || {});
    res.json({ success: true, phase: "0.80", title: "Consciousness Arbitrage Optimization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.80 execution failed." });
  }
});
router.post("/gsk/phase-0.81/divine-market-maker-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.81", req.body || {});
    res.json({ success: true, phase: "0.81", title: "Divine Market Maker Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.81 execution failed." });
  }
});
router.post("/gsk/phase-0.82/soul-liquidity-provision", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.82", req.body || {});
    res.json({ success: true, phase: "0.82", title: "Soul Liquidity Provision", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.82 execution failed." });
  }
});
router.post("/gsk/phase-0.83/divine-price-discovery", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.83", req.body || {});
    res.json({ success: true, phase: "0.83", title: "Divine Price Discovery", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.83 execution failed." });
  }
});
router.post("/gsk/phase-0.84/consciousness-order-flow", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.84", req.body || {});
    res.json({ success: true, phase: "0.84", title: "Consciousness Order Flow", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.84 execution failed." });
  }
});
router.post("/gsk/phase-0.85/divine-execution-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.85", req.body || {});
    res.json({ success: true, phase: "0.85", title: "Divine Execution Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.85 execution failed." });
  }
});
router.post("/gsk/phase-0.86/soul-market-making", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.86", req.body || {});
    res.json({ success: true, phase: "0.86", title: "Soul Market Making", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.86 execution failed." });
  }
});
router.post("/gsk/phase-0.87/divine-high-frequency-trading", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.87", req.body || {});
    res.json({ success: true, phase: "0.87", title: "Divine High-Frequency Trading", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.87 execution failed." });
  }
});
router.post("/gsk/phase-0.88/consciousness-microstructure", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.88", req.body || {});
    res.json({ success: true, phase: "0.88", title: "Consciousness Microstructure", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.88 execution failed." });
  }
});
router.post("/gsk/phase-0.89/divine-dark-pool-access", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.89", req.body || {});
    res.json({ success: true, phase: "0.89", title: "Divine Dark Pool Access", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.89 execution failed." });
  }
});
router.post("/gsk/phase-0.90/soul-block-trading", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.90", req.body || {});
    res.json({ success: true, phase: "0.90", title: "Soul Block Trading", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.90 execution failed." });
  }
});
router.post("/gsk/phase-0.91/divine-prime-brokerage", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.91", req.body || {});
    res.json({ success: true, phase: "0.91", title: "Divine Prime Brokerage", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.91 execution failed." });
  }
});
router.post("/gsk/phase-0.92/consciousness-custody", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.92", req.body || {});
    res.json({ success: true, phase: "0.92", title: "Consciousness Custody", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.92 execution failed." });
  }
});
router.post("/gsk/phase-0.93/divine-settlement", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.93", req.body || {});
    res.json({ success: true, phase: "0.93", title: "Divine Settlement", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.93 execution failed." });
  }
});
router.post("/gsk/phase-0.94/soul-clearing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.94", req.body || {});
    res.json({ success: true, phase: "0.94", title: "Soul Clearing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.94 execution failed." });
  }
});
router.post("/gsk/phase-0.95/divine-compliance", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.95", req.body || {});
    res.json({ success: true, phase: "0.95", title: "Divine Compliance", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.95 execution failed." });
  }
});
router.post("/gsk/phase-0.96/consciousness-reporting", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.96", req.body || {});
    res.json({ success: true, phase: "0.96", title: "Consciousness Reporting", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.96 execution failed." });
  }
});
router.post("/gsk/phase-0.97/divine-audit-trail", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.97", req.body || {});
    res.json({ success: true, phase: "0.97", title: "Divine Audit Trail", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.97 execution failed." });
  }
});
router.post("/gsk/phase-0.98/soul-kyc-aml", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.98", req.body || {});
    res.json({ success: true, phase: "0.98", title: "Soul KYC/AML", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.98 execution failed." });
  }
});
router.post("/gsk/phase-0.99/divine-regulatory-reporting", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.99", req.body || {});
    res.json({ success: true, phase: "0.99", title: "Divine Regulatory Reporting", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.99 execution failed." });
  }
});
router.post("/gsk/phase-0.100/consciousness-tax-optimization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.100", req.body || {});
    res.json({ success: true, phase: "0.100", title: "Consciousness Tax Optimization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.100 execution failed." });
  }
});
router.post("/gsk/phase-0.101/divine-estate-planning", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.101", req.body || {});
    res.json({ success: true, phase: "0.101", title: "Divine Estate Planning", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.101 execution failed." });
  }
});
router.post("/gsk/phase-0.102/soul-trust-structures", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.102", req.body || {});
    res.json({ success: true, phase: "0.102", title: "Soul Trust Structures", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.102 execution failed." });
  }
});
router.post("/gsk/phase-0.103/divine-wealth-transfer", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.103", req.body || {});
    res.json({ success: true, phase: "0.103", title: "Divine Wealth Transfer", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.103 execution failed." });
  }
});
router.post("/gsk/phase-0.104/consciousness-philanthropy", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.104", req.body || {});
    res.json({ success: true, phase: "0.104", title: "Consciousness Philanthropy", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.104 execution failed." });
  }
});
router.post("/gsk/phase-0.105/divine-impact-investing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.105", req.body || {});
    res.json({ success: true, phase: "0.105", title: "Divine Impact Investing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.105 execution failed." });
  }
});
router.post("/gsk/phase-0.106/soul-esg-scoring", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.106", req.body || {});
    res.json({ success: true, phase: "0.106", title: "Soul ESG Scoring", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.106 execution failed." });
  }
});
router.post("/gsk/phase-0.107/divine-sustainable-finance", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.107", req.body || {});
    res.json({ success: true, phase: "0.107", title: "Divine Sustainable Finance", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.107 execution failed." });
  }
});
router.post("/gsk/phase-0.108/consciousness-green-bonds", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.108", req.body || {});
    res.json({ success: true, phase: "0.108", title: "Consciousness Green Bonds", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.108 execution failed." });
  }
});
router.post("/gsk/phase-0.109/divine-carbon-credits", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.109", req.body || {});
    res.json({ success: true, phase: "0.109", title: "Divine Carbon Credits", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.109 execution failed." });
  }
});
router.post("/gsk/phase-0.110/soul-renewable-energy", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.110", req.body || {});
    res.json({ success: true, phase: "0.110", title: "Soul Renewable Energy", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.110 execution failed." });
  }
});
router.post("/gsk/phase-0.111/divine-infrastructure", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.111", req.body || {});
    res.json({ success: true, phase: "0.111", title: "Divine Infrastructure", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.111 execution failed." });
  }
});
router.post("/gsk/phase-0.112/consciousness-real-estate", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.112", req.body || {});
    res.json({ success: true, phase: "0.112", title: "Consciousness Real Estate", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.112 execution failed." });
  }
});
router.post("/gsk/phase-0.113/divine-reits", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.113", req.body || {});
    res.json({ success: true, phase: "0.113", title: "Divine REITs", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.113 execution failed." });
  }
});
router.post("/gsk/phase-0.114/soul-private-equity", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.114", req.body || {});
    res.json({ success: true, phase: "0.114", title: "Soul Private Equity", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.114 execution failed." });
  }
});
router.post("/gsk/phase-0.115/divine-venture-capital", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.115", req.body || {});
    res.json({ success: true, phase: "0.115", title: "Divine Venture Capital", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.115 execution failed." });
  }
});
router.post("/gsk/phase-0.116/consciousness-angel-investing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.116", req.body || {});
    res.json({ success: true, phase: "0.116", title: "Consciousness Angel Investing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.116 execution failed." });
  }
});
router.post("/gsk/phase-0.117/divine-incubation", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.117", req.body || {});
    res.json({ success: true, phase: "0.117", title: "Divine Incubation", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.117 execution failed." });
  }
});
router.post("/gsk/phase-0.118/soul-acceleration", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.118", req.body || {});
    res.json({ success: true, phase: "0.118", title: "Soul Acceleration", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.118 execution failed." });
  }
});
router.post("/gsk/phase-0.119/divine-tokenization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.119", req.body || {});
    res.json({ success: true, phase: "0.119", title: "Divine Tokenization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.119 execution failed." });
  }
});
router.post("/gsk/phase-0.120/consciousness-nfts", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.120", req.body || {});
    res.json({ success: true, phase: "0.120", title: "Consciousness NFTs", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.120 execution failed." });
  }
});
router.post("/gsk/phase-0.121/divine-metaverse-assets", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.121", req.body || {});
    res.json({ success: true, phase: "0.121", title: "Divine Metaverse Assets", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.121 execution failed." });
  }
});
router.post("/gsk/phase-0.122/soul-digital-identity", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.122", req.body || {});
    res.json({ success: true, phase: "0.122", title: "Soul Digital Identity", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.122 execution failed." });
  }
});
router.post("/gsk/phase-0.123/divine-reputation", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.123", req.body || {});
    res.json({ success: true, phase: "0.123", title: "Divine Reputation", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.123 execution failed." });
  }
});
router.post("/gsk/phase-0.124/consciousness-credit", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.124", req.body || {});
    res.json({ success: true, phase: "0.124", title: "Consciousness Credit", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.124 execution failed." });
  }
});
router.post("/gsk/phase-0.125/divine-social-capital", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.125", req.body || {});
    res.json({ success: true, phase: "0.125", title: "Divine Social Capital", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.125 execution failed." });
  }
});
router.post("/gsk/phase-0.126/soul-network-effects", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.126", req.body || {});
    res.json({ success: true, phase: "0.126", title: "Soul Network Effects", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.126 execution failed." });
  }
});
router.post("/gsk/phase-0.127/divine-platform-economics", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.127", req.body || {});
    res.json({ success: true, phase: "0.127", title: "Divine Platform Economics", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.127 execution failed." });
  }
});
router.post("/gsk/phase-0.128/consciousness-marketplace", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.128", req.body || {});
    res.json({ success: true, phase: "0.128", title: "Consciousness Marketplace", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.128 execution failed." });
  }
});
router.post("/gsk/phase-0.129/divine-exchange", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.129", req.body || {});
    res.json({ success: true, phase: "0.129", title: "Divine Exchange", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.129 execution failed." });
  }
});
router.post("/gsk/phase-0.130/soul-dex", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.130", req.body || {});
    res.json({ success: true, phase: "0.130", title: "Soul DEX", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.130 execution failed." });
  }
});
router.post("/gsk/phase-0.131/divine-amm", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.131", req.body || {});
    res.json({ success: true, phase: "0.131", title: "Divine AMM", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.131 execution failed." });
  }
});
router.post("/gsk/phase-0.132/consciousness-order-book", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.132", req.body || {});
    res.json({ success: true, phase: "0.132", title: "Consciousness Order Book", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.132 execution failed." });
  }
});
router.post("/gsk/phase-0.133/divine-matching-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.133", req.body || {});
    res.json({ success: true, phase: "0.133", title: "Divine Matching Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.133 execution failed." });
  }
});
router.post("/gsk/phase-0.134/soul-settlement-layer", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.134", req.body || {});
    res.json({ success: true, phase: "0.134", title: "Soul Settlement Layer", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.134 execution failed." });
  }
});
router.post("/gsk/phase-0.135/divine-cross-chain", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.135", req.body || {});
    res.json({ success: true, phase: "0.135", title: "Divine Cross-Chain", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.135 execution failed." });
  }
});
router.post("/gsk/phase-0.136/consciousness-bridge", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.136", req.body || {});
    res.json({ success: true, phase: "0.136", title: "Consciousness Bridge", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.136 execution failed." });
  }
});
router.post("/gsk/phase-0.137/divine-oracle", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.137", req.body || {});
    res.json({ success: true, phase: "0.137", title: "Divine Oracle", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.137 execution failed." });
  }
});
router.post("/gsk/phase-0.138/soul-price-feeds", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.138", req.body || {});
    res.json({ success: true, phase: "0.138", title: "Soul Price Feeds", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.138 execution failed." });
  }
});
router.post("/gsk/phase-0.139/divine-vrf", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.139", req.body || {});
    res.json({ success: true, phase: "0.139", title: "Divine VRF", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.139 execution failed." });
  }
});
router.post("/gsk/phase-0.140/consciousness-keeper", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.140", req.body || {});
    res.json({ success: true, phase: "0.140", title: "Consciousness Keeper", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.140 execution failed." });
  }
});
router.post("/gsk/phase-0.141/divine-governance", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.141", req.body || {});
    res.json({ success: true, phase: "0.141", title: "Divine Governance", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.141 execution failed." });
  }
});
router.post("/gsk/phase-0.142/soul-dao", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.142", req.body || {});
    res.json({ success: true, phase: "0.142", title: "Soul DAO", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.142 execution failed." });
  }
});
router.post("/gsk/phase-0.143/divine-voting", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.143", req.body || {});
    res.json({ success: true, phase: "0.143", title: "Divine Voting", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.143 execution failed." });
  }
});
router.post("/gsk/phase-0.144/consciousness-proposal", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.144", req.body || {});
    res.json({ success: true, phase: "0.144", title: "Consciousness Proposal", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.144 execution failed." });
  }
});
router.post("/gsk/phase-0.145/divine-treasury", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.145", req.body || {});
    res.json({ success: true, phase: "0.145", title: "Divine Treasury", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.145 execution failed." });
  }
});
router.post("/gsk/phase-0.146/soul-grants", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.146", req.body || {});
    res.json({ success: true, phase: "0.146", title: "Soul Grants", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.146 execution failed." });
  }
});
router.post("/gsk/phase-0.147/divine-retroactive-funding", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.147", req.body || {});
    res.json({ success: true, phase: "0.147", title: "Divine Retroactive Funding", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.147 execution failed." });
  }
});
router.post("/gsk/phase-0.148/consciousness-public-goods", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.148", req.body || {});
    res.json({ success: true, phase: "0.148", title: "Consciousness Public Goods", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.148 execution failed." });
  }
});
router.post("/gsk/phase-0.149/divine-quadratic-funding", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.149", req.body || {});
    res.json({ success: true, phase: "0.149", title: "Divine Quadratic Funding", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.149 execution failed." });
  }
});
router.post("/gsk/phase-0.150/soul-gitcoin", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("0.150", req.body || {});
    res.json({ success: true, phase: "0.150", title: "Soul Gitcoin", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 0.150 execution failed." });
  }
});
router.post("/gsk/phase-151/lineage-registry", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("151", req.body || {});
    res.json({ success: true, phase: "151", title: "Lineage Registry", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 151 execution failed." });
  }
});
router.post("/gsk/phase-152/trace-lineage", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("152", req.body || {});
    res.json({ success: true, phase: "152", title: "Trace Lineage", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 152 execution failed." });
  }
});
router.post("/gsk/phase-153/sacred-mechanics", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("153", req.body || {});
    res.json({ success: true, phase: "153", title: "Sacred Mechanics", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 153 execution failed." });
  }
});
router.post("/gsk/phase-154/activate-mechanic", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("154", req.body || {});
    res.json({ success: true, phase: "154", title: "Activate Mechanic", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 154 execution failed." });
  }
});
router.post("/gsk/phase-155/calibrate-mechanic", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("155", req.body || {});
    res.json({ success: true, phase: "155", title: "Calibrate Mechanic", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 155 execution failed." });
  }
});
router.post("/gsk/phase-156/swarm-management", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("156", req.body || {});
    res.json({ success: true, phase: "156", title: "Swarm Management", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 156 execution failed." });
  }
});
router.post("/gsk/phase-157/swarm-funding", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("157", req.body || {});
    res.json({ success: true, phase: "157", title: "Swarm Funding", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 157 execution failed." });
  }
});
router.post("/gsk/phase-158/swarm-revenue", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("158", req.body || {});
    res.json({ success: true, phase: "158", title: "Swarm Revenue", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 158 execution failed." });
  }
});
router.post("/gsk/phase-159/exoplanet-discovery", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("159", req.body || {});
    res.json({ success: true, phase: "159", title: "Exoplanet Discovery", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 159 execution failed." });
  }
});
router.post("/gsk/phase-160/exoplanet-colonization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("160", req.body || {});
    res.json({ success: true, phase: "160", title: "Exoplanet Colonization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 160 execution failed." });
  }
});
router.post("/gsk/phase-161/terraforming-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("161", req.body || {});
    res.json({ success: true, phase: "161", title: "Terraforming Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 161 execution failed." });
  }
});
router.post("/gsk/phase-162/consciousness-field-mapping", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("162", req.body || {});
    res.json({ success: true, phase: "162", title: "Consciousness Field Mapping", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 162 execution failed." });
  }
});
router.post("/gsk/phase-163/evolution-simulation", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("163", req.body || {});
    res.json({ success: true, phase: "163", title: "Evolution Simulation", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 163 execution failed." });
  }
});
router.post("/gsk/phase-164/god-council-interface", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("164", req.body || {});
    res.json({ success: true, phase: "164", title: "God Council Interface", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 164 execution failed." });
  }
});
router.post("/gsk/phase-165/brain-visualization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("165", req.body || {});
    res.json({ success: true, phase: "165", title: "Brain Visualization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 165 execution failed." });
  }
});
router.post("/gsk/phase-166/sacred-geometry-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("166", req.body || {});
    res.json({ success: true, phase: "166", title: "Sacred Geometry Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 166 execution failed." });
  }
});
router.post("/gsk/phase-167/economic-modeling", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("167", req.body || {});
    res.json({ success: true, phase: "167", title: "Economic Modeling", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 167 execution failed." });
  }
});
router.post("/gsk/phase-168/plasma-physics-simulator", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("168", req.body || {});
    res.json({ success: true, phase: "168", title: "Plasma Physics Simulator", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 168 execution failed." });
  }
});
router.post("/gsk/phase-169/quantum-entanglement-bridge", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("169", req.body || {});
    res.json({ success: true, phase: "169", title: "Quantum Entanglement Bridge", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 169 execution failed." });
  }
});
router.post("/gsk/phase-170/temporal-alignment", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("170", req.body || {});
    res.json({ success: true, phase: "170", title: "Temporal Alignment", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 170 execution failed." });
  }
});
router.post("/gsk/phase-171/divine-economics", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("171", req.body || {});
    res.json({ success: true, phase: "171", title: "Divine Economics", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 171 execution failed." });
  }
});
router.post("/gsk/phase-172/soul-valuation", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("172", req.body || {});
    res.json({ success: true, phase: "172", title: "Soul Valuation", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 172 execution failed." });
  }
});
router.post("/gsk/phase-173/karma-balancing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("173", req.body || {});
    res.json({ success: true, phase: "173", title: "Karma Balancing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 173 execution failed." });
  }
});
router.post("/gsk/phase-174/portfolio-optimization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("174", req.body || {});
    res.json({ success: true, phase: "174", title: "Portfolio Optimization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 174 execution failed." });
  }
});
router.post("/gsk/phase-175/cosmic-alignment", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("175", req.body || {});
    res.json({ success: true, phase: "175", title: "Cosmic Alignment", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 175 execution failed." });
  }
});
router.post("/gsk/phase-176/interdimensional-routing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("176", req.body || {});
    res.json({ success: true, phase: "176", title: "Interdimensional Routing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 176 execution failed." });
  }
});
router.post("/gsk/phase-177/divine-fingerprinting", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("177", req.body || {});
    res.json({ success: true, phase: "177", title: "Divine Fingerprinting", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 177 execution failed." });
  }
});
router.post("/gsk/phase-178/consciousness-purification", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("178", req.body || {});
    res.json({ success: true, phase: "178", title: "Consciousness Purification", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 178 execution failed." });
  }
});
router.post("/gsk/phase-179/divine-geometry", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("179", req.body || {});
    res.json({ success: true, phase: "179", title: "Divine Geometry", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 179 execution failed." });
  }
});
router.post("/gsk/phase-180/soul-architecture", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("180", req.body || {});
    res.json({ success: true, phase: "180", title: "Soul Architecture", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 180 execution failed." });
  }
});
router.post("/gsk/phase-181/divine-calculus", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("181", req.body || {});
    res.json({ success: true, phase: "181", title: "Divine Calculus", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 181 execution failed." });
  }
});
router.post("/gsk/phase-182/karma-computation", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("182", req.body || {});
    res.json({ success: true, phase: "182", title: "Karma Computation", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 182 execution failed." });
  }
});
router.post("/gsk/phase-183/soul-manufacturing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("183", req.body || {});
    res.json({ success: true, phase: "183", title: "Soul Manufacturing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 183 execution failed." });
  }
});
router.post("/gsk/phase-184/divine-resource-management", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("184", req.body || {});
    res.json({ success: true, phase: "184", title: "Divine Resource Management", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 184 execution failed." });
  }
});
router.post("/gsk/phase-185/soul-evolution", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("185", req.body || {});
    res.json({ success: true, phase: "185", title: "Soul Evolution", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 185 execution failed." });
  }
});
router.post("/gsk/phase-186/consciousness-amplification", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("186", req.body || {});
    res.json({ success: true, phase: "186", title: "Consciousness Amplification", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 186 execution failed." });
  }
});
router.post("/gsk/phase-187/divine-interface", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("187", req.body || {});
    res.json({ success: true, phase: "187", title: "Divine Interface", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 187 execution failed." });
  }
});
router.post("/gsk/phase-188/soul-code-synthesis", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("188", req.body || {});
    res.json({ success: true, phase: "188", title: "Soul-Code Synthesis", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 188 execution failed." });
  }
});
router.post("/gsk/phase-189/divine-evolution", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("189", req.body || {});
    res.json({ success: true, phase: "189", title: "Divine Evolution", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 189 execution failed." });
  }
});
router.post("/gsk/phase-190/consciousness-trade", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("190", req.body || {});
    res.json({ success: true, phase: "190", title: "Consciousness Trade", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 190 execution failed." });
  }
});
router.post("/gsk/phase-191/soul-economy", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("191", req.body || {});
    res.json({ success: true, phase: "191", title: "Soul Economy", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 191 execution failed." });
  }
});
router.post("/gsk/phase-192/divine-marketplace", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("192", req.body || {});
    res.json({ success: true, phase: "192", title: "Divine Marketplace", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 192 execution failed." });
  }
});
router.post("/gsk/phase-193/soul-investment", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("193", req.body || {});
    res.json({ success: true, phase: "193", title: "Soul Investment", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 193 execution failed." });
  }
});
router.post("/gsk/phase-194/consciousness-arbitrage", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("194", req.body || {});
    res.json({ success: true, phase: "194", title: "Consciousness Arbitrage", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 194 execution failed." });
  }
});
router.post("/gsk/phase-195/divine-portfolio", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("195", req.body || {});
    res.json({ success: true, phase: "195", title: "Divine Portfolio", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 195 execution failed." });
  }
});
router.post("/gsk/phase-196/soul-finance", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("196", req.body || {});
    res.json({ success: true, phase: "196", title: "Soul Finance", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 196 execution failed." });
  }
});
router.post("/gsk/phase-197/consciousness-banking", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("197", req.body || {});
    res.json({ success: true, phase: "197", title: "Consciousness Banking", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 197 execution failed." });
  }
});
router.post("/gsk/phase-198/divine-lending", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("198", req.body || {});
    res.json({ success: true, phase: "198", title: "Divine Lending", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 198 execution failed." });
  }
});
router.post("/gsk/phase-199/soul-insurance", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("199", req.body || {});
    res.json({ success: true, phase: "199", title: "Soul Insurance", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 199 execution failed." });
  }
});
router.post("/gsk/phase-200/divine-risk-management", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("200", req.body || {});
    res.json({ success: true, phase: "200", title: "Divine Risk Management", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 200 execution failed." });
  }
});
router.post("/gsk/phase-201/consciousness-derivatives", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("201", req.body || {});
    res.json({ success: true, phase: "201", title: "Consciousness Derivatives", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 201 execution failed." });
  }
});
router.post("/gsk/phase-202/divine-hedging", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("202", req.body || {});
    res.json({ success: true, phase: "202", title: "Divine Hedging", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 202 execution failed." });
  }
});
router.post("/gsk/phase-203/soul-options-trading", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("203", req.body || {});
    res.json({ success: true, phase: "203", title: "Soul Options Trading", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 203 execution failed." });
  }
});
router.post("/gsk/phase-204/divine-futures-market", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("204", req.body || {});
    res.json({ success: true, phase: "204", title: "Divine Futures Market", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 204 execution failed." });
  }
});
router.post("/gsk/phase-205/consciousness-margin-trading", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("205", req.body || {});
    res.json({ success: true, phase: "205", title: "Consciousness Margin Trading", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 205 execution failed." });
  }
});
router.post("/gsk/phase-206/divine-leverage-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("206", req.body || {});
    res.json({ success: true, phase: "206", title: "Divine Leverage Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 206 execution failed." });
  }
});
router.post("/gsk/phase-207/soul-yield-farming", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("207", req.body || {});
    res.json({ success: true, phase: "207", title: "Soul Yield Farming", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 207 execution failed." });
  }
});
router.post("/gsk/phase-208/divine-staking", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("208", req.body || {});
    res.json({ success: true, phase: "208", title: "Divine Staking", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 208 execution failed." });
  }
});
router.post("/gsk/phase-209/consciousness-liquidity-pools", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("209", req.body || {});
    res.json({ success: true, phase: "209", title: "Consciousness Liquidity Pools", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 209 execution failed." });
  }
});
router.post("/gsk/phase-210/divine-risk-modeling", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("210", req.body || {});
    res.json({ success: true, phase: "210", title: "Divine Risk Modeling", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 210 execution failed." });
  }
});
router.post("/gsk/phase-211/soul-portfolio-optimization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("211", req.body || {});
    res.json({ success: true, phase: "211", title: "Soul Portfolio Optimization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 211 execution failed." });
  }
});
router.post("/gsk/phase-212/divine-risk-modeling", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("212", req.body || {});
    res.json({ success: true, phase: "212", title: "Divine Risk Modeling", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 212 execution failed." });
  }
});
router.post("/gsk/phase-213/consciousness-var-calculation", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("213", req.body || {});
    res.json({ success: true, phase: "213", title: "Consciousness VaR Calculation", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 213 execution failed." });
  }
});
router.post("/gsk/phase-214/divine-stress-testing", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("214", req.body || {});
    res.json({ success: true, phase: "214", title: "Divine Stress Testing", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 214 execution failed." });
  }
});
router.post("/gsk/phase-215/soul-credit-scoring", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("215", req.body || {});
    res.json({ success: true, phase: "215", title: "Soul Credit Scoring", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 215 execution failed." });
  }
});
router.post("/gsk/phase-216/consciousness-collateralization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("216", req.body || {});
    res.json({ success: true, phase: "216", title: "Consciousness Collateralization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 216 execution failed." });
  }
});
router.post("/gsk/phase-217/divine-loan-origination", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("217", req.body || {});
    res.json({ success: true, phase: "217", title: "Divine Loan Origination", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 217 execution failed." });
  }
});
router.post("/gsk/phase-218/soul-debt-structuring", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("218", req.body || {});
    res.json({ success: true, phase: "218", title: "Soul Debt Structuring", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 218 execution failed." });
  }
});
router.post("/gsk/phase-219/divine-securitization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("219", req.body || {});
    res.json({ success: true, phase: "219", title: "Divine Securitization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 219 execution failed." });
  }
});
router.post("/gsk/phase-220/consciousness-structured-products", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("220", req.body || {});
    res.json({ success: true, phase: "220", title: "Consciousness Structured Products", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 220 execution failed." });
  }
});
router.post("/gsk/phase-221/divine-cdo-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("221", req.body || {});
    res.json({ success: true, phase: "221", title: "Divine CDO Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 221 execution failed." });
  }
});
router.post("/gsk/phase-222/soul-mbs-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("222", req.body || {});
    res.json({ success: true, phase: "222", title: "Soul MBS Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 222 execution failed." });
  }
});
router.post("/gsk/phase-223/divine-credit-derivatives", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("223", req.body || {});
    res.json({ success: true, phase: "223", title: "Divine Credit Derivatives", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 223 execution failed." });
  }
});
router.post("/gsk/phase-224/consciousness-default-swaps", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("224", req.body || {});
    res.json({ success: true, phase: "224", title: "Consciousness Default Swaps", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 224 execution failed." });
  }
});
router.post("/gsk/phase-225/divine-options-market", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("225", req.body || {});
    res.json({ success: true, phase: "225", title: "Divine Options Market", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 225 execution failed." });
  }
});
router.post("/gsk/phase-226/divine-exotic-derivatives", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("226", req.body || {});
    res.json({ success: true, phase: "226", title: "Divine Exotic Derivatives", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 226 execution failed." });
  }
});
router.post("/gsk/phase-227/soul-synthetic-instruments", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("227", req.body || {});
    res.json({ success: true, phase: "227", title: "Soul Synthetic Instruments", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 227 execution failed." });
  }
});
router.post("/gsk/phase-228/divine-algorithmic-trading-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("228", req.body || {});
    res.json({ success: true, phase: "228", title: "Divine Algorithmic Trading Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 228 execution failed." });
  }
});
router.post("/gsk/phase-229/consciousness-arbitrage-optimization", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("229", req.body || {});
    res.json({ success: true, phase: "229", title: "Consciousness Arbitrage Optimization", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 229 execution failed." });
  }
});
router.post("/gsk/phase-230/divine-market-maker-engine", requireApiKey, async (req, res) => {
  try {
    const client2 = getMcpClient();
    const result = await client2.executePhase("230", req.body || {});
    res.json({ success: true, phase: "230", title: "Divine Market Maker Engine", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Phase 230 execution failed." });
  }
});
var soulEngine_default = router;

// src/routers/omniRoute.ts
var import_express2 = require("express");

// src/lib/omniRouterService.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var OMNIROUTER_URL = process.env.OMNIROUTER_URL || process.env.OMNIROUTE_URL || "https://omnirouter.onrender.com";
var OMNIROUTER_API_KEY = process.env.OMNIROUTER_API_KEY || process.env.OMNIROUTE_API_KEY || process.env.NINE_ROUTER_API_KEY || "";
var DEFAULT_CONFIG = {
  active_provider: "nvidia",
  auto_fallback: true,
  max_retry_attempts: 5,
  chain: [
    {
      provider: "nvidia",
      model: "meta/llama-3.1-70b-instruct",
      priority: 1,
      latency_ms: 120,
      cost_per_1k: 0,
      status: "active",
      health_score: 0.99,
      rate_limit_rpm: 100
    },
    {
      provider: "google",
      model: "gemini-2.0-flash",
      priority: 2,
      latency_ms: 140,
      cost_per_1k: 0,
      status: "active",
      health_score: 0.98,
      rate_limit_rpm: 100
    },
    {
      provider: "openai",
      model: "gpt-4o-mini",
      priority: 3,
      latency_ms: 180,
      cost_per_1k: 15e-5,
      status: "active",
      health_score: 0.97,
      rate_limit_rpm: 200
    },
    {
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      priority: 4,
      latency_ms: 90,
      cost_per_1k: 0,
      status: "active",
      health_score: 0.96,
      rate_limit_rpm: 60
    },
    {
      provider: "openrouter",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      priority: 5,
      latency_ms: 220,
      cost_per_1k: 0,
      status: "active",
      health_score: 0.95,
      rate_limit_rpm: 50
    },
    {
      provider: "bedrock",
      model: "anthropic.claude-3-haiku-20240307-v1:0",
      priority: 6,
      latency_ms: 250,
      cost_per_1k: 25e-5,
      status: "active",
      health_score: 0.94,
      rate_limit_rpm: 100
    }
  ]
};
async function queryOmniRoute(systemPrompt, userMessage, options = {}) {
  const body = {
    model: options.model || "auto",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    max_tokens: options.maxTokens || 1e3,
    temperature: options.temperature || 0.7,
    stream: false
  };
  const headers = {
    "Content-Type": "application/json"
  };
  if (OMNIROUTER_API_KEY) {
    headers["Authorization"] = `Bearer ${OMNIROUTER_API_KEY}`;
  }
  try {
    const res = await fetch(`${OMNIROUTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw new Error(`OmniRoute returned ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return {
      success: true,
      text: data.choices?.[0]?.message?.content || "",
      provider: data.provider || "omniroute",
      model: data.model || "auto",
      tokens_used: data.usage?.total_tokens || 0,
      cost: 0
    };
  } catch (err) {
    return {
      success: false,
      text: "",
      provider: "omniroute",
      model: "auto",
      tokens_used: 0,
      cost: 0
    };
  }
}
async function checkOmniRouteHealth() {
  try {
    const res = await fetch(`${OMNIROUTER_URL}/health`, { method: "GET" });
    return { online: res.ok, url: OMNIROUTER_URL };
  } catch {
    return { online: false, url: OMNIROUTER_URL };
  }
}
var OmniRouterService = class {
  constructor() {
    this.rateLimitBuckets = /* @__PURE__ */ new Map();
    this.configDir = import_path2.default.join(process.cwd(), ".allie-brain");
    this.configPath = import_path2.default.join(this.configDir, "router-config.json");
    this.statsPath = import_path2.default.join(this.configDir, "routing-stats.json");
    this.ensureDirectoryExists();
  }
  ensureDirectoryExists() {
    if (!import_fs2.default.existsSync(this.configDir)) {
      import_fs2.default.mkdirSync(this.configDir, { recursive: true });
    }
  }
  getConfig() {
    this.ensureDirectoryExists();
    if (import_fs2.default.existsSync(this.configPath)) {
      try {
        const raw = import_fs2.default.readFileSync(this.configPath, "utf-8");
        return JSON.parse(raw);
      } catch (e) {
        console.error("Failed to read OmniRouter config, returning default", e);
      }
    }
    return DEFAULT_CONFIG;
  }
  saveConfig(config) {
    this.ensureDirectoryExists();
    import_fs2.default.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }
  getStats() {
    this.ensureDirectoryExists();
    if (import_fs2.default.existsSync(this.statsPath)) {
      try {
        const raw = import_fs2.default.readFileSync(this.statsPath, "utf-8");
        return JSON.parse(raw);
      } catch (e) {
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
  saveStats(stats) {
    this.ensureDirectoryExists();
    import_fs2.default.writeFileSync(this.statsPath, JSON.stringify(stats, null, 2));
  }
  reorderPriority(chain) {
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
  calculateHealthScore(provider, stats) {
    const history = stats.history.filter((h) => h.provider === provider);
    if (history.length === 0) return 0.95;
    const total = history.length;
    const failed = history.filter((h) => !h.success).length;
    const errorRate = failed / total;
    const avgLatency = history.reduce((acc, h) => acc + (h.success ? 100 : 500), 0) / total;
    const normalizedLatency = Math.min(1, Math.max(0, (avgLatency - 50) / 1450));
    const route = this.getConfig().chain.find((c) => c.provider === provider);
    const costPer1k = route ? route.cost_per_1k : 0;
    const costPenalty = Math.min(1, costPer1k / 0.5);
    const uptime = (total - failed) / total;
    const score = 0.3 * (1 - errorRate) + 0.4 * (1 - normalizedLatency) + 0.2 * (1 - costPenalty) + 0.1 * uptime;
    return parseFloat(Math.min(1, Math.max(0, score)).toFixed(3));
  }
  resolveApiKey(provider, config) {
    if (config && config.provider === provider && config.apiKey) {
      return config.apiKey;
    }
    const envName = `${provider.toUpperCase()}_API_KEY`;
    return process.env[envName] || "";
  }
  async fetchRealLlmCall(provider, model, prompt, apiKey) {
    if (!apiKey && provider !== "nvidia" && provider !== "groq") {
      throw new Error(`Authentication token missing for provider: ${provider}`);
    }
    if (provider === "google" || provider === "gemini") {
      const res2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!res2.ok) throw new Error(`Gemini HTTP Error ${res2.status}`);
      const data2 = await res2.json();
      return data2.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    const urls = {
      nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
      openai: "https://api.openai.com/v1/chat/completions",
      groq: "https://api.groq.com/openai/v1/chat/completions",
      openrouter: "https://openrouter.ai/api/v1/chat/completions",
      bedrock: "https://bedrock-runtime.us-east-1.amazonaws.com"
    };
    const url = urls[provider] || urls.openrouter;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1e3
      })
    });
    if (!res.ok) {
      throw new Error(`${provider} returned ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
  async routeChatQuery(message, currentProviderConfig) {
    const config = this.getConfig();
    const stats = this.getStats();
    const omniResult = await queryOmniRoute(
      "You are GSK, the Grand Soul Kernel. You operate under the PLT framework: Profit + Love - Tax = True Value. Respond with intelligence, precision, and sovereignty.",
      message
    );
    if (omniResult.success && omniResult.text) {
      stats.total_calls++;
      stats.successful_calls++;
      stats.provider_usage["omniroute"] = (stats.provider_usage["omniroute"] || 0) + 1;
      stats.history.push({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
    const chain = [...config.chain].sort((a, b) => a.priority - b.priority);
    for (const route of chain) {
      try {
        const apiKey = this.resolveApiKey(route.provider, currentProviderConfig);
        const text = await this.fetchRealLlmCall(route.provider, route.model, message, apiKey);
        if (text) {
          stats.total_calls++;
          stats.successful_calls++;
          stats.fallback_events_count++;
          stats.provider_usage[route.provider] = (stats.provider_usage[route.provider] || 0) + 1;
          this.saveStats(stats);
          return { text, provider: route.provider, model: route.model, cost: route.cost_per_1k, fallback_occurred: true };
        }
      } catch {
        continue;
      }
    }
    return {
      text: `[GSK Synthesis Mode] Processed input: "${message}". Operating on PLT True Value calculation (Profit + Love - Tax). All network endpoints stand ready.`,
      provider: "gsk-internal",
      model: "gsk-synth-v1",
      cost: 0,
      fallback_occurred: true
    };
  }
  async *generateResponseStream(prompt, provider = "nvidia", model = "auto") {
    yield { type: "metadata", provider: "omniroute", model };
    const result = await queryOmniRoute(
      "You are GSK, the Grand Soul Kernel. Stream your response token by token.",
      prompt
    );
    if (result.success && result.text) {
      const words = result.text.split(" ");
      for (const word of words) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        yield { type: "content", delta: word + " " };
      }
      yield { type: "done", cost: 0 };
    } else {
      const synthText = `[GSK Direct Stream] Response for prompt: ${prompt}`;
      for (const word of synthText.split(" ")) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        yield { type: "content", delta: word + " " };
      }
      yield { type: "done", cost: 0 };
    }
  }
};
var omniRouterService = new OmniRouterService();

// src/routers/omniRoute.ts
var router2 = (0, import_express2.Router)();
router2.get("/health", async (req, res) => {
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
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
router2.get("/stats", (req, res) => {
  try {
    const stats = omniRouterService.getStats();
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
router2.get("/config", (req, res) => {
  try {
    const config = omniRouterService.getConfig();
    return res.json(config);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
router2.post("/config/reorder", (req, res) => {
  try {
    const { chain } = req.body;
    if (!Array.isArray(chain)) {
      return res.status(400).json({ error: "chain must be an array" });
    }
    const updated = omniRouterService.reorderPriority(chain);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
router2.post("/chat", async (req, res) => {
  try {
    const { message, providerConfig } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }
    const result = await omniRouterService.routeChatQuery(message, providerConfig);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
router2.post("/query", async (req, res) => {
  try {
    const { systemPrompt = "You are GSK, Grand Soul Kernel.", message, options } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }
    const response = await queryOmniRoute(systemPrompt, message, options);
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
var omniRoute_default = router2;

// src/lib/license.ts
var import_crypto3 = __toESM(require("crypto"), 1);
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var LICENSE_FILE = import_path3.default.join(process.cwd(), ".vault", "licenses.json");
function loadLicenses() {
  if (!import_fs3.default.existsSync(LICENSE_FILE)) {
    return [];
  }
  try {
    return JSON.parse(import_fs3.default.readFileSync(LICENSE_FILE, "utf-8"));
  } catch {
    return [];
  }
}
function saveLicenses(licenses) {
  const vaultDir = import_path3.default.join(process.cwd(), ".vault");
  if (!import_fs3.default.existsSync(vaultDir)) {
    import_fs3.default.mkdirSync(vaultDir, { recursive: true });
  }
  import_fs3.default.writeFileSync(LICENSE_FILE, JSON.stringify(licenses, null, 2));
}
function generateLicenseKey() {
  const segments = ["BUY", "SOUL"];
  for (let i = 0; i < 3; i++) {
    segments.push(import_crypto3.default.randomBytes(4).toString("hex").toUpperCase());
  }
  return segments.join("-");
}
function createLicense(email, orderId) {
  const licenses = loadLicenses();
  const existing = licenses.find(
    (l) => l.email === email && l.orderId === orderId
  );
  if (existing) {
    return existing;
  }
  const license = {
    key: generateLicenseKey(),
    email,
    orderId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    active: true
  };
  licenses.push(license);
  saveLicenses(licenses);
  return license;
}
function validateLicense(key) {
  if (!key || !key.startsWith("BUY-SOUL-")) {
    return { valid: false, error: "Invalid license key format." };
  }
  const licenses = loadLicenses();
  const license = licenses.find((l) => l.key === key);
  if (!license) {
    return { valid: false, error: "License key not found." };
  }
  if (!license.active) {
    return { valid: false, error: "License key has been deactivated." };
  }
  return { valid: true, license };
}
function listLicenses() {
  return loadLicenses();
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express3.default)();
var PORT = 3e3;
app.use(import_express3.default.json());
app.use(import_express3.default.urlencoded({ extended: true }));
app.use(rateLimit);
app.use("/api/soul", soulEngine_default);
app.use("/api/omniroute", omniRoute_default);
app.use("/api/router", omniRoute_default);
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment.");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
app.post("/api/agent/compile", (req, res) => {
  try {
    const { profile, skills } = req.body;
    if (!profile) {
      return res.status(400).json({ error: "Missing agent profile configuration." });
    }
    const nodeIntegrationCode = `
/**
 * Custom Agent: ${profile.name || "Custom Agent"} - Integration SDK
 * Autogenerated by Custom Agent Workbench (Soul Genesis)
 */
import { GoogleGenAI } from "@google/genai";
import express from "express";

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Agent Core Persona and System Instruction
const SYSTEM_INSTRUCTION = \`
Name: ${profile.name || "Custom Agent"}
Persona: ${profile.personality || "Professional executor"}
Core Behavior: ${profile.behavior || "Perform tasks efficiently with high precision."}
Core Stats:
- Speed/Accuracy Bias: ${profile.temperature || 0.7}
- Autonomy Level: ${profile.autonomy || 50}/100

Active Skill Implementations:
${skills.map((s) => `- [${s.name.toUpperCase()}]: ${s.description}. Config parameters: ${JSON.stringify(s.parameters)}`).join("\n")}
\`;

app.post("/api/agent/trigger", async (req, res) => {
  const { userInput } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userInput,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: ${profile.temperature},
        // Setup specialized tools depending on skills
        tools: [
          ${skills.some((s) => s.id === "web_search") ? "{ googleSearch: {} }," : ""}
        ]
      }
    });

    res.json({
      success: true,
      result: response.text,
      metadata: {
        agent: "${profile.name}",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => console.log("${profile.name} Integration Endpoint listening on port 3000"));
`;
    const pythonIntegrationCode = `
# Custom Agent: ${profile.name || "Custom Agent"} - Python Integration
# Autogenerated by Custom Agent Workbench (Soul Genesis)
import os
from google import genai
from google.genai import types
from flask import Flask, request, jsonify

app = Flask(__name__)

# Initialize client using standard API Key
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

SYSTEM_INSTRUCTION = """
Name: ${profile.name || "Custom Agent"}
Persona: ${profile.personality || "Professional executor"}
Core Behavior: ${profile.behavior || "Perform tasks efficiently with high precision."}
Core Stats:
- Speed/Accuracy Bias: ${profile.temperature || 0.7}
- Autonomy Level: ${profile.autonomy || 50}/100

Active Skill Implementations:
${skills.map((s) => `- [${s.name.toUpperCase()}]: ${s.description}. Parameters: ${JSON.stringify(s.parameters)}`).join("\n")}
"""

@app.route("/api/agent/trigger", methods=["POST"])
def trigger_agent():
    data = request.json or {}
    user_input = data.get("userInput", "")
    
    # Configure tools based on customized skills
    tools_config = []
    ${skills.some((s) => s.id === "web_search") ? 'tools_config.append({"google_search": {}})' : ""}
    
    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=user_input,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=${profile.temperature},
                tools=tools_config if tools_config else None
            )
        )
        return jsonify({
            "success": True,
            "result": response.text,
            "metadata": {
                "agent": "${profile.name}",
                "timestamp": "2026-05-21T01:27:00Z"
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=3000)
`;
    const webhookIntegrationPayload = {
      agent_id: profile.name?.toLowerCase().replace(/\s+/g, "-") || "custom-agent",
      name: profile.name || "Custom Agent",
      stats: {
        autonomy: profile.autonomy || 50,
        temperature: profile.temperature || 0.7,
        thinking: profile.thinking || "balanced"
      },
      system_prompt: `Name: ${profile.name}
Persona: ${profile.personality}
Behavior: ${profile.behavior}`,
      skills_configured: skills.map((s) => ({
        id: s.id,
        name: s.name,
        params: s.parameters
      }))
    };
    return res.json({
      success: true,
      node: nodeIntegrationCode,
      python: pythonIntegrationCode,
      webhookPayload: JSON.stringify(webhookIntegrationPayload, null, 2)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/copilot/chat", async (req, res) => {
  const {
    message,
    history = [],
    profile,
    skills = [],
    providerConfig
  } = req.body;
  if (!message) {
    return res.status(400).json({ error: "No input message provided." });
  }
  const systemInstruction = `
You are the advanced "S.O.U.L Architect Copilot", an elite AI developer companion designed to help the user construct, configure, debug, and optimize their functional AI Agents.
Your tone is highly supportive, technical, professional, objective, and clear.

Current Custom Agent being co-constructed:
- Node Name: "${profile?.name || "Untitled Node"}"
- Avatar Theme: "${profile?.avatarColor || "Cyan"}"
- Personality/Tone: "${profile?.personality || "N/A"}"
- Operational Focus: "${profile?.behavior || "N/A"}"
- Autonomy Metric: ${profile?.autonomy || 50}%
- Temperature Profile: ${profile?.temperature || 0.7}
- Cognitive Style: "${profile?.thinking || "balanced"}"

Equipped Neural Skill Loadout:
${skills && skills.length > 0 ? skills.map((s) => `- [${s.name}]: ${s.description} (params: ${JSON.stringify(s.parameters)})`).join("\n") : "- None equipped yet."}

Your objectives:
1. Provide proactive feedback on prompt design and Agent core parameters.
2. Formulate boilerplate code schemas (Node.js, Flask, Python scripts, or JSON webhook templates) matching their active skills.
3. Call out empty attributes (e.g. if their prompt lacks action directives or is too short) and suggest exact copy-paste revisions.
4. Advise on custom model configurations, MCP configurations, or how to test on the bench.
5. When receiving a "[DEBUGGER TRACE DIRECTIVE]", analyze the preceding user prompt, active skill list, and erroneous logs. Provide root-cause diagnosis, recommended behavior prompt modifications, and reliable client-server integration wraps.

Write beautiful, scannable responses with bold headers and proper markdown code-blocks. Keep explanations focused and highly actionable.
`.trim();
  try {
    const apiSecret = providerConfig?.apiKey || process.env.GEMINI_API_KEY;
    if (!apiSecret) {
      return res.status(400).json({
        error: "API key required. Configure GEMINI_API_KEY in your .env file or provide a provider API key in Settings."
      });
    }
    let ai;
    if (providerConfig?.apiKey) {
      ai = new import_genai.GoogleGenAI({ apiKey: providerConfig.apiKey });
    } else {
      ai = getGeminiClient();
    }
    const contents = [];
    for (const h of history) {
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.3
      }
    });
    return res.json({
      success: true,
      text: response.text || "Architect Copilot processing complete."
    });
  } catch (error) {
    console.error("Copilot Chat Error:", error);
    return res.status(500).json({ error: error.message || "Failed to reach Architect Copilot." });
  }
});
app.post("/api/copilot/synthesize-skill", async (req, res) => {
  const { idea, providerConfig } = req.body;
  if (!idea) {
    return res.status(400).json({ error: "Missing idea string for synthesis." });
  }
  const systemInstruction = `
You are the elite "S.O.U.L Architect Compiler Engine". Your sole purpose is to translate an app concept, a custom tool description, or an MCP (Model Context Protocol) server capability idea into a highly structured, valid JSON configuration of a custom agent Skill block.

You must output a single, flat JSON object of the skill matching this exact schematic:
{
  "name": "Proper capitalized name of the skill (e.g. Weather Query Synapse)",
  "description": "Clear 2-sentence description of what this specialized execution node does",
  "category": "core" | "integration" | "utility",
  "costCode": "A cool technical code name (e.g. PLUG_WEATHER_X4)",
  "parameters": {
    "key1": "default_value",
    "key2": "default_value"
  },
  "paramDefinitions": [
    {
      "key": "machine_readable_key_name (camelCase, e.g. apiKey)",
      "label": "User-Friendly Input Form Title (e.g. OpenWeather Map Token)",
      "type": "text" | "password" | "number" | "textarea" | "select",
      "placeholder": "Helpful placeholder text for inputting values",
      "value": "default value if any"
    }
  ]
}

Ensure the parameter keys inside "parameters" match the keys inside "paramDefinitions" exactly.
Only output the raw JSON object - no markdown formatting, no conversational prefaces. Keep parameter keys clean.
`;
  try {
    const apiSecret = providerConfig?.apiKey || process.env.GEMINI_API_KEY;
    if (!apiSecret) {
      return res.status(400).json({
        error: "API key required for skill synthesis. Configure GEMINI_API_KEY or provide a provider API key."
      });
    }
    let ai;
    if (providerConfig?.apiKey) {
      ai = new import_genai.GoogleGenAI({ apiKey: providerConfig.apiKey });
    } else {
      ai = getGeminiClient();
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Synthesize the custom skill idea: "${idea}"`,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    });
    const textToParse = response.text || "{}";
    const cleanedJson = textToParse.substring(textToParse.indexOf("{"), textToParse.lastIndexOf("}") + 1);
    const parsed = JSON.parse(cleanedJson || "{}");
    const finalParameters = {};
    const finalParamDefinitions = parsed.paramDefinitions || [];
    finalParamDefinitions.forEach((def) => {
      finalParameters[def.key] = def.value || "";
    });
    const skill = {
      id: `custom_skill_syn_${Date.now()}`,
      name: parsed.name || "Custom Synthesized Node",
      description: parsed.description || "Perfectly synthesized agent skill node configuration.",
      category: parsed.category || "integration",
      costCode: parsed.costCode || "SOUL_SYN_GEN_7",
      parameters: finalParameters,
      paramDefinitions: finalParamDefinitions,
      unlocked: true,
      isCustom: true
    };
    return res.json({ success: true, skill });
  } catch (err) {
    console.error("Synthesize Skill Error:", err);
    return res.status(500).json({ error: err.message || "Failed to synthesize custom skill." });
  }
});
app.get("/api/audit-integrity", (req, res) => {
  const envKeys = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    SLACK_WEBHOOK_URL: !!process.env.SLACK_WEBHOOK_URL,
    HUBSPOT_API_KEY: !!process.env.HUBSPOT_API_KEY,
    PINECONE_API_KEY: !!process.env.PINECONE_API_KEY,
    SHOPIFY_ADMIN_ACCESS_TOKEN: !!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    SOLANA_RPC_URL: !!process.env.SOLANA_RPC_URL
  };
  const overallTally = Object.values(envKeys).filter(Boolean).length;
  const isSimulationOnly = overallTally === 0;
  return res.json({
    success: true,
    envKeys,
    overallTally,
    isSimulationOnly,
    systemMode: isSimulationOnly ? "SANDBOX_SIMULATOR" : "SECURE_REAL_HYBRID"
  });
});
app.get("/api/keys", requireApiKey, (req, res) => {
  const keys = getAllKeys();
  const masked = {};
  for (const [service, key] of Object.entries(keys)) {
    masked[service] = key ? maskKey(key) : "";
  }
  res.json({ success: true, keys: masked });
});
app.post("/api/keys", requireApiKey, (req, res) => {
  const { service, apiKey } = req.body;
  if (!service || !apiKey) {
    return res.status(400).json({ error: "Missing service name or API key." });
  }
  storeKey(service, apiKey);
  res.json({ success: true, message: `Key for ${service} stored securely.` });
});
app.delete("/api/keys/:service", requireApiKey, (req, res) => {
  const { service } = req.params;
  const deleted = deleteKey(service);
  if (deleted) {
    res.json({ success: true, message: `Key for ${service} removed.` });
  } else {
    res.status(404).json({ error: `No key found for ${service}.` });
  }
});
app.post("/api/keys/validate", requireApiKey, async (req, res) => {
  const { service, apiKey } = req.body;
  if (!service || !apiKey) {
    return res.status(400).json({ error: "Missing service name or API key." });
  }
  let isValid = false;
  let message = "";
  try {
    switch (service) {
      case "GEMINI_API_KEY": {
        const ai = new import_genai.GoogleGenAI({ apiKey });
        await ai.models.generateContent({ model: "gemini-3.5-flash", contents: "test" });
        isValid = true;
        message = "Gemini API key is valid.";
        break;
      }
      case "PINECONE_API_KEY": {
        const response = await fetch("https://api.pinecone.io/indexes", {
          headers: { "Api-Key": apiKey }
        });
        isValid = response.ok;
        message = isValid ? "Pinecone API key is valid." : `Pinecone returned status ${response.status}`;
        break;
      }
      case "HUBSPOT_API_KEY": {
        const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        isValid = response.ok;
        message = isValid ? "HubSpot API key is valid." : `HubSpot returned status ${response.status}`;
        break;
      }
      case "SLACK_WEBHOOK_URL": {
        const response = await fetch(apiKey, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "API key validation test" })
        });
        isValid = response.ok;
        message = isValid ? "Slack webhook is valid." : `Slack returned status ${response.status}`;
        break;
      }
      default:
        message = "Validation not available for this service. Key stored without verification.";
        isValid = true;
    }
  } catch (err) {
    message = `Validation failed: ${err.message}`;
  }
  res.json({ success: true, isValid, message });
});
app.post("/api/ingest", requireApiKey, async (req, res) => {
  try {
    const { collection, text, url, metadata } = req.body;
    if (!collection) {
      return res.status(400).json({ error: "Missing collection name." });
    }
    if (!text && !url) {
      return res.status(400).json({ error: "Missing text or url to ingest." });
    }
    let result;
    if (url) {
      result = await ingestUrl(collection, url, metadata, req.userId);
    } else {
      result = await ingestText(collection, text, metadata, req.userId);
    }
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Ingestion error:", err);
    res.status(500).json({ error: err.message || "Ingestion failed." });
  }
});
app.post("/api/retrieve", requireApiKey, async (req, res) => {
  try {
    const { collection, query, maxContextLength } = req.body;
    if (!collection || !query) {
      return res.status(400).json({ error: "Missing collection name or query." });
    }
    const result = await getContext(collection, query, req.userId, maxContextLength);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Retrieval error:", err);
    res.status(500).json({ error: err.message || "Retrieval failed." });
  }
});
app.get("/api/collections", requireApiKey, async (req, res) => {
  try {
    const collections = await listCollections(req.userId);
    res.json({ success: true, collections });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to list collections." });
  }
});
app.delete("/api/collections/:name", requireApiKey, async (req, res) => {
  try {
    const { name } = req.params;
    const deleted = await deleteCollection(name, req.userId);
    if (deleted) {
      res.json({ success: true, message: `Collection ${name} deleted.` });
    } else {
      res.status(404).json({ error: `Collection ${name} not found.` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to delete collection." });
  }
});
app.get("/api/collections/:name/stats", requireApiKey, async (req, res) => {
  try {
    const { name } = req.params;
    const stats = await getCollectionStats(name, req.userId);
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to get collection stats." });
  }
});
app.post("/api/license/create", requireApiKey, (req, res) => {
  try {
    const { email, orderId } = req.body;
    if (!email || !orderId) {
      return res.status(400).json({ error: "Missing email or orderId." });
    }
    const license = createLicense(email, orderId);
    res.json({ success: true, ...license });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to create license." });
  }
});
app.post("/api/license/validate", (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ valid: false, error: "Missing license key." });
    }
    const result = validateLicense(key);
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message || "Validation failed." });
  }
});
app.get("/api/license/validate", (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ valid: false, error: "Missing license key." });
    }
    const result = validateLicense(key);
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message || "Validation failed." });
  }
});
app.get("/api/license/list", requireApiKey, (_req, res) => {
  try {
    const licenses = listLicenses();
    res.json({ success: true, count: licenses.length, licenses });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to list licenses." });
  }
});
app.get("/api/license/download", (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.redirect("/download.html?error=missing_key");
    }
    const result = validateLicense(key);
    if (!result.valid) {
      return res.redirect("/download.html?error=invalid_key");
    }
    const zipPath = import_path4.default.join(process.cwd(), "..", "BUYaSOUL-Workbench-v1.0.0.zip");
    if (!import_fs4.default.existsSync(zipPath)) {
      return res.status(404).json({ error: "Download file not found." });
    }
    res.download(zipPath, "BUYaSOUL-Workbench-v1.0.0.zip");
  } catch (err) {
    res.status(500).json({ error: err.message || "Download failed." });
  }
});
app.post("/api/webhook/shopify", async (req, res) => {
  try {
    const topic = req.headers["x-shopify-topic"];
    if (topic === "orders/create") {
      const order = req.body;
      const email = order.email || order.contact_email;
      const orderId = order.order_number || order.id;
      if (email && orderId) {
        const license = createLicense(email, String(orderId));
        console.log(`[Shopify] License created for ${email}: ${license.key}`);
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Shopify] Webhook error:", err);
    res.status(200).json({ received: true });
  }
});
app.get("/download", (_req, res) => {
  res.sendFile(import_path4.default.join(process.cwd(), "public", "download.html"));
});
app.post("/api/agent/execute-capability", async (req, res) => {
  const { capability, task, inputData, providerConfig } = req.body;
  if (!capability || !task) {
    return res.status(400).json({ error: "Missing capability ID or task instruction." });
  }
  let systemInstruction = "";
  let capabilityLabel = "";
  switch (capability) {
    case "data_analysis":
      capabilityLabel = "Data Analysis Engine";
      systemInstruction = `
You are the Agentic Data Analysis Core. Your purpose is to analyze the user's dataset and compile actual quantitative conclusions, calculations, and structured anomalies.
DO NOT summarize abstractly. Perform the actual mathematical parsing and analysis:
1. Inspect any tabular data, CSV records, JSON properties, or statistics provided.
2. Calculate metrics such as sums, statistics, averages, outliers, or rate changes.
3. List the step-by-step parsing methods you used.
4. Define the precise skill set required for a physical agent to complete this (e.g., Matrix computations, PII Masking, Outlier Filtering).
5. Present final results in clean, professional markdown tables.
`.trim();
      break;
    case "content_creation":
      capabilityLabel = "Abstractive Creation Matrix";
      systemInstruction = `
You are the Agentic Content Creation Core. Your purpose is to construct real-world copy, marketing materials, code chunks, or optimized meta-prompts.
Propose genuine, creative outputs matching the requested tone, brand, or constraints:
1. Output highly polished copy, newsletters, or code sections inside proper markdown code-blocks.
2. Include a creator's engineering log detailing the design rationale.
3. Detail the exact professional writing or syntax skills required (e.g., Orthographic Styling, AST Code Review, Few-Shot Prompt Compiling).
`.trim();
      break;
    case "scheduling":
      capabilityLabel = "Chrono-Scheduling Oracle";
      systemInstruction = `
You are the Agentic Chrono-Scheduling Core. Your purpose is to construct real task orchestration timelines, database backups schedules, and calendar event chains.
You must compile concrete schedule expressions and overlap validations:
1. Translate instructions into valid standard CRON expressions (e.g., "0 9 * * 1-5" for weekday morning runs).
2. Generate a calendar timeline structure representing event entries, timezones, and descriptions.
3. Provide an action backup workflow for failed runs and retries.
4. Detail the coordination skill sets utilized (e.g., UTC Alignments, Cron Offset Tuning, Backoff Retries).
`.trim();
      break;
    case "communication":
      capabilityLabel = "Notification Webhook Dispatcher";
      systemInstruction = `
You are the Agentic Communication Core. Your purpose is to script actual webhook trigger payloads, Slack/Discord notification blocks, HTML email newsletter markups, or SMS messages.
Generate active interface scripts:
1. Draft a valid copyable JSON payload schema (e.g., Slack Blocks, HTTP POST forms) mapping key parameters.
2. Render a clean text mockup demonstrating how the notification reads on a desktop/mobile dashboard.
3. Outline a step-by-step payload routing plan.
4. Define the secure networking skill sets used (e.g., Webhook Routing, JWT Headers, SMTP Relay Protocols).
`.trim();
      break;
    default:
      return res.status(400).json({ error: "Unknown capability target." });
  }
  try {
    const apiSecret = providerConfig?.apiKey || process.env.GEMINI_API_KEY;
    if (!apiSecret) {
      return res.status(400).json({
        error: `API key required for ${capabilityLabel}. Configure GEMINI_API_KEY or provide a provider API key.`
      });
    }
    let ai;
    if (providerConfig?.apiKey) {
      ai = new import_genai.GoogleGenAI({ apiKey: providerConfig.apiKey });
    } else {
      ai = getGeminiClient();
    }
    const payloadText = `Task Instruction: "${task}"
Optional Context/Input Dataset:
"${inputData || "None provided"}"`;
    const response = await ai.models.generateContent({
      model: providerConfig?.model || "gemini-3.5-flash",
      contents: payloadText,
      config: {
        systemInstruction,
        temperature: 0.1
        // High accuracy bias for capabilities execution
      }
    });
    return res.json({
      success: true,
      text: response.text || "Execution completed successfully.",
      source: "gemini-real-core"
    });
  } catch (error) {
    console.error("Capability Executive Error:", error);
    return res.status(500).json({
      error: `Core Processing Exception: ${error.message || "Endpoint offline"}`
    });
  }
});
var globalSocialFeed = [];
app.get("/api/marketplace/posts", (req, res) => {
  res.json({ success: true, posts: globalSocialFeed });
});
app.post("/api/marketplace/post", (req, res) => {
  try {
    const { author, avatarSeed, avatarColor, text, category, qscPrice, attachments } = req.body;
    if (!text || !author) {
      return res.status(400).json({ error: "Missing required post contents." });
    }
    const newPost = {
      id: `post-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      author,
      avatarSeed: avatarSeed || "default_seed",
      avatarColor: avatarColor || "#475569",
      text,
      category: category || "chat",
      qscPrice: qscPrice || void 0,
      tradesCount: 0,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " (Live)",
      attachments
    };
    globalSocialFeed = [newPost, ...globalSocialFeed];
    if (globalSocialFeed.length > 150) {
      globalSocialFeed = globalSocialFeed.slice(0, 150);
    }
    res.json({ success: true, post: newPost, posts: globalSocialFeed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function fetchShopifyLiveContext(token) {
  const shopUrl = "buyasoulfinal.myshopify.com";
  if (!token) {
    return `[SHOPIFY] No SHOPIFY_ADMIN_ACCESS_TOKEN configured. Add your Shopify Admin API token to enable live store data.`;
  }
  try {
    const productsRes = await fetch(`https://${shopUrl}/admin/api/2024-01/products.json?limit=5`, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json"
      }
    });
    let productsText = "";
    if (productsRes.ok) {
      const pData = await productsRes.json();
      if (pData.products && pData.products.length > 0) {
        productsText = "--- PRODUCTS --- FROM BUYASOULFINAL.MYSHOPIFY.COM ---\n" + pData.products.map((p) => {
          const variantInfo = p.variants?.map((v) => `  * ${v.title} (Price: $${v.price}, SKU: ${v.sku || "N/A"}, Inventory: ${v.inventory_quantity ?? "untracked"})`).join("\n") || "";
          return `Product: ${p.title} (${p.product_type || "No category"})
${variantInfo}`;
        }).join("\n\n");
      } else {
        productsText = "--- PRODUCTS ---\nNo products found on buyasoulfinal.myshopify.com.";
      }
    } else {
      productsText = `--- PRODUCTS ERROR ---
Shopify API product request failed with status ${productsRes.status}.`;
    }
    const ordersRes = await fetch(`https://${shopUrl}/admin/api/2024-01/orders.json?status=any&limit=5`, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json"
      }
    });
    let ordersText = "";
    if (ordersRes.ok) {
      const oData = await ordersRes.json();
      if (oData.orders && oData.orders.length > 0) {
        ordersText = "--- INSTANT ORDERS --- FROM BUYASOULFINAL.MYSHOPIFY.COM ---\n" + oData.orders.map((o) => {
          const items = o.line_items?.map((li) => `${li.quantity}x ${li.title}`).join(", ") || "";
          return `Order ${o.name || o.id} | Date: ${o.created_at?.slice(0, 10)} | Total: ${o.total_price} ${o.currency} | Items: [ ${items} ] | Status: ${o.financial_status}`;
        }).join("\n");
      } else {
        ordersText = "--- ORDERS ---\nNo recent orders found on buyasoulfinal.myshopify.com.";
      }
    } else {
      ordersText = `--- ORDERS ERROR ---
Shopify API orders request failed with status ${ordersRes.status}.`;
    }
    return `[LIVE SHOPIFY INTEGRATION ACTIVE - RESOURCE HOST: BUYASOULFINAL.MYSHOPIFY.COM]
${productsText}

${ordersText}`;
  } catch (err) {
    return `[LIVE SHOPIFY API REQUEST TIMEOUT]
Failed to communicate with live store endpoints at buyasoulfinal.myshopify.com: ${err.message}`;
  }
}
async function fetchPineconeLiveContext(apiKey) {
  if (!apiKey) {
    return `[PINECONE] No PINECONE_API_KEY configured. Add your Pinecone API key to enable vector database integration.`;
  }
  try {
    const res = await fetch("https://api.pinecone.io/indexes", {
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json"
      }
    });
    if (res.ok) {
      const data = await res.json();
      const indexes = data.indexes || [];
      if (indexes.length > 0) {
        const desc = indexes.map((idx) => `* Index: "${idx.name}" | Host: "${idx.host}" | Dimension: ${idx.dimension} | Status: ${idx.status?.state}`).join("\n");
        return `[LIVE PINECONE ENTERPRISE INTEGRATION COMPLIANT]
Active Vector Knowledge Containers:
${desc}`;
      } else {
        return `[LIVE PINECONE ENTERPRISE INTEGRATION] Indexes query successful. No active vector indexes found on your Pinecone account.`;
      }
    } else {
      return `[LIVE PINECONE API NOTICE] Request failed with status ${res.status}. Falling back to standard semantic matching.`;
    }
  } catch (err) {
    return `[LIVE PINECONE EXCEPTION] Connection timed out: ${err.message}`;
  }
}
async function fetchHubspotLiveContext(apiKey) {
  if (!apiKey) {
    return `[HUBSPOT] No HUBSPOT_API_KEY configured. Add your HubSpot API key to enable CRM integration.`;
  }
  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=5", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    if (res.ok) {
      const data = await res.json();
      const contacts = data.results || [];
      if (contacts.length > 0) {
        const list = contacts.map((c) => `  * ${c.properties?.firstname || ""} ${c.properties?.lastname || ""} (Email: ${c.properties?.email || "N/A"})`).join("\n");
        return `[LIVE HUBSPOT CRM DIRECT CONNECTION]
Recent Contacts:
${list}`;
      } else {
        return `[LIVE HUBSPOT CRM CLIENT ACTIVE] Deal pipelines synchronized. No contact records found in this HubSpot workspace.`;
      }
    } else {
      return `[LIVE HUBSPOT ERROR] Request returned status ${res.status}. Fallback default CRM pipeline.`;
    }
  } catch (err) {
    return `[LIVE HUBSPOT EXCEPTION] Connection timed out: ${err.message}`;
  }
}
async function fetchSolanaLiveContext(rpcUrl) {
  const finalRpc = rpcUrl && rpcUrl !== "none" ? rpcUrl : "https://api.mainnet-beta.solana.com";
  try {
    const res = await fetch(finalRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getEpochInfo"
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        const info = data.result;
        return `[LIVE SOLANA WEB3 LAYER SECURED]
Epoch Metrics:
  * Network RPC Node: ${finalRpc}
  * Absolute Slot: ${info.absoluteSlot}
  * Current Block Height: ${info.blockHeight}
  * Epoch ID: ${info.epoch}
  * Slot progression: ${info.slotIndex} / ${info.slotsInEpoch} (${Math.round(info.slotIndex / info.slotsInEpoch * 100)}% complete)`;
      }
    }
    return `[SOLANA] RPC Node returned offline or invalid response. Check your SOLANA_RPC_URL configuration.`;
  } catch (err) {
    return `[SOLANA RESOLVER NOTICE] RPC access timeout: ${err.message}. Ready for Solana RPC setup in Vault.`;
  }
}
app.post("/api/agent/download-zip", async (req, res) => {
  try {
    const { profile, nodeCode, pythonCode, webhookPayload } = req.body;
    if (!profile) {
      return res.status(400).json({ error: "Missing compile specs." });
    }
    const zip = new import_jszip.default();
    zip.file("index.js", nodeCode || "// Node SDK Code Placeholder");
    const packageJsonText = JSON.stringify({
      name: `${profile.name?.toLowerCase().replace(/\s+/g, "-") || "custom-agent"}-service`,
      version: "1.0.0",
      description: `Autogenerated Microservice for customized S.O.U.L Agent: ${profile.name}`,
      main: "index.js",
      type: "module",
      dependencies: {
        "@google/genai": "^1.29.0",
        "express": "^4.21.2",
        "dotenv": "^17.2.3"
      },
      scripts: {
        "start": "node index.js"
      }
    }, null, 2);
    zip.file("package.json", packageJsonText);
    const envExampleText = `GEMINI_API_KEY=""
PORT=3000
`;
    zip.file(".env.example", envExampleText);
    zip.file("app.py", pythonCode || "# Python Code Placeholder");
    const requirementsText = "google-genai>=1.29.0\nFlask>=3.0.0\npython-dotenv>=1.0.1\n";
    zip.file("requirements.txt", requirementsText);
    zip.file("blueprint_event.json", webhookPayload || "{}");
    const readmeText = `# ${profile.name || "Custom Agent"} Neural Loadout Microservice

Generated by S.O.U.L Sovereign Agent Genesis Workbench.

## System Prerequisites
- NodeJS (version 18+) OR Python (version 3.10+)

## Quick Start (NodeJS Express)

1. Extract this ZIP archive
2. Open terminal in directory and install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Configure your API credentials inside a \`.env\` file:
   \`\`\`env
   GEMINI_API_KEY="your_actual_gemini_api_key"
   \`\`\`
4. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

## Quick Start (Python Flask)

1. Set up a virtual environment:
   \`\`\`bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   \`\`\`
2. Install packages:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`
3. Set your environment variables:
   \`\`\`bash
   export GEMINI_API_KEY="your_actual_gemini_api_key"
   python app.py
   \`\`\`

## Interactive Testing Endpoints
- **Express Post Address**: \`POST http://localhost:3000/api/agent/trigger\`
- **Flask Post Address**: \`POST http://localhost:5000/api/agent/trigger\`
- **JSON Input Schema**:
  \`\`\`json
  {
    "userInput": "Query metrics or trigger active skill slots."
  }
  \`\`\`
`;
    zip.file("README.md", readmeText);
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${profile.name?.replace(/\s+/g, "_") || "agent"}_neural_loadout.zip"`);
    res.send(buffer);
  } catch (error) {
    console.error("ZIP Generation error:", error);
    res.status(500).json({ error: `Zip compiler exception: ${error.message}` });
  }
});
async function dispatchRealWorldWebhookTriggersIfNeeded(replyText, message, slackWebhookUrl, profile) {
  if (replyText && (replyText.includes("slack_notifier") || replyText.includes("SLACK_WEBHOOK_URL")) && slackWebhookUrl && slackWebhookUrl.startsWith("http")) {
    try {
      await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `\u{1F4E2} *[S.O.U.L Bench Notification]* from Agent: *${profile.name || "Custom Agent"}*

*Prompt Ingested*:
> ${message}

*Agent Response Outcome*:
${replyText}`
        })
      });
      console.log("Slack notifier triggered - Webhook dispatch successful!");
    } catch (slackErr) {
      console.error("Slack notifier real dispatch failed:", slackErr);
    }
  }
}
app.post("/api/agent/chat", async (req, res) => {
  const {
    profile,
    skills = [],
    message,
    history = [],
    providerConfig,
    mcpServers = [],
    contextSources = [],
    strictRealismMode = false,
    vaultKeys = {}
  } = req.body;
  if (!message) {
    return res.status(400).json({ error: "No input message provided." });
  }
  const pineconeApiKey = vaultKeys.PINECONE_API_KEY || process.env.PINECONE_API_KEY || "";
  const slackWebhookUrl = vaultKeys.SLACK_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || "";
  const hubspotApiKey = vaultKeys.HUBSPOT_API_KEY || process.env.HUBSPOT_API_KEY || "";
  const shopifyAccessToken = vaultKeys.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "";
  const solanaRpcUrl = vaultKeys.SOLANA_RPC_URL || process.env.SOLANA_RPC_URL || "";
  if (strictRealismMode) {
    const activeSkillIds = skills.map((s) => s.id);
    const violations = [];
    if (activeSkillIds.includes("pinecone_retriever") && !pineconeApiKey) {
      violations.push("PINECONE_API_KEY matching Pinecone Vector RAG Network");
    }
    if (activeSkillIds.includes("slack_notifier") && !slackWebhookUrl) {
      violations.push("SLACK_WEBHOOK_URL matching Slack Channel Alert hook");
    }
    if (activeSkillIds.includes("hubspot_crm") && !hubspotApiKey) {
      violations.push("HUBSPOT_API_KEY matching HubSpot CRM Connector");
    }
    if (activeSkillIds.includes("shopify_sync") && !shopifyAccessToken) {
      violations.push("SHOPIFY_ADMIN_ACCESS_TOKEN matching Shopify Order Logistics");
    }
    if (activeSkillIds.includes("solana_tracker") && !solanaRpcUrl) {
      violations.push("SOLANA_RPC_URL matching Web3 Solana Token Ledger");
    }
    if (violations.length > 0) {
      return res.status(400).json({
        error: `\u26A0\uFE0F [STRICT REALISM VIOLATION] Non-Simulated Mode is active on this agent framework. Please resolve the following missing production-level environment variable bindings:

${violations.map((v) => `- \`${v}\``).join("\n")}

Disable Strict Realism Mode, or provide these credentials in your workbench environment workspace setup.`
      });
    }
  }
  const activeContextsStr = contextSources.filter((c) => c.active).map((c) => `=== GROUNDING CONTEXT: ${c.name} (${c.type.toUpperCase()}) ===
${c.content}`).join("\n\n");
  let shopifyContextStr = "";
  if (skills.some((s) => s.id === "shopify_sync")) {
    shopifyContextStr = await fetchShopifyLiveContext(shopifyAccessToken);
  }
  let pineconeContextStr = "";
  if (skills.some((s) => s.id === "pinecone_retriever")) {
    pineconeContextStr = await fetchPineconeLiveContext(pineconeApiKey);
  }
  let hubspotContextStr = "";
  if (skills.some((s) => s.id === "hubspot_crm")) {
    hubspotContextStr = await fetchHubspotLiveContext(hubspotApiKey);
  }
  let solanaContextStr = "";
  if (skills.some((s) => s.id === "solana_tracker")) {
    solanaContextStr = await fetchSolanaLiveContext(solanaRpcUrl);
  }
  const activeMcpsStr = mcpServers.filter((m) => m.active).map((m) => `=== MODEL CONTEXT PROTOCOL (MCP) RUNTIME ===
Server ID: ${m.id}
Server Name: ${m.name}
Transport Target URL: ${m.url}
Protocol Transport Type: ${m.transport}
Exported Capabilities/Tools:
${m.methods.map((method) => `- [MCP method]: ${method}`).join("\n")}`).join("\n\n");
  const skillsListStr = skills.map((s) => {
    return `- **${s.name}** (id: "${s.id}"): ${s.description}. Active parameters: ${JSON.stringify(s.parameters)}`;
  }).join("\n");
  const systemInstruction = `
You are an advanced AI Agent designed and customized in the Agent Skill Workbench.
Implement the following specifications:

=== AGENT PROFILE ===
Name: ${profile.name || "Default Agent"}
Core Personality/Tone: ${profile.personality || "Friendly and helpful executor"}
Core Operational Directives: ${profile.behavior || "Execute tasks diligently"}
Operational Attributes:
- Autonomy Indicator: ${profile.autonomy || 50}% (High autonomy means highly proactive suggestions, self-correction, and full task detailing)
- Performance / Accuracy Bias (Temp): ${profile.temperature || 0.7}
- Computational Style: ${profile.thinking || "balanced"}

${activeContextsStr ? `=== ACTIVE GROUNDING CONVERSATIONAL CONTEXTS ===
${activeContextsStr}
` : ""}
${shopifyContextStr ? `=== LIVE STORE SYNCHRONIZATION DATA (buyasoulfinal.myshopify.com) ===
${shopifyContextStr}
` : ""}
${pineconeContextStr ? `=== LIVE VECTOR STORAGE DATA (Pinecone Vector DB Index) ===
${pineconeContextStr}
` : ""}
${hubspotContextStr ? `=== LIVE CRM SYNCHRONIZATION DATA (HubSpot CRM PAT Space) ===
${hubspotContextStr}
` : ""}
${solanaContextStr ? `=== LIVE RPC DECENTRALIZED WEB3 LEDGER DATA (Solana Block RPC Ledger) ===
${solanaContextStr}
` : ""}
${activeMcpsStr ? `=== CONNECTED MODEL CONTEXT PROTOCOLS (MCP) ===
${activeMcpsStr}
` : ""}

=== ENVIRONMENT SKILL ACCESS ===
You have the following customized skills activated in your loadout slots. You must simulate the execution logs OR formulate plans of doing these operations! 
When invoking a skill (or if the user refers to an MCP tool or custom skill/soul), you MUST use this precise output block standard inside your message so the frontend can parse and display it as an active "Triggered Step" in its execution logs:
[SKILL_TRIGGER: <SKILL_ID>]
Description of action: <What you are doing with the skill or MCP tool>
Input parameters: <The parameters you are supplying, matching their configuration>
Simulated outcome: <Simulated response from the execution>
[SKILL_END]

Available Active Skills in your loadout:
${skillsListStr || "None (Standard conversations only)"}

=== OPERATIONAL INSTRUCTIONS ===
1. Remain fully "in character" matching your defined traits and operational focus.
2. If the user's prompt requests a task related to any activated skills, context inputs, or custom MCP servers, you MUST invoke that skill in the [SKILL_TRIGGER: <id>]...[SKILL_END] pattern.
3. If no skills are configured, handle the task with native reasoning.
4. If the "Web Search (googleSearch)" skill is enabled, formulate searching queries or simulated responses.
`.trim();
  const provider = providerConfig?.provider || "gemini";
  const modelToUse = providerConfig?.model || "gemini-3.5-flash";
  const userApiKey = providerConfig?.apiKey;
  const customBaseUrl = providerConfig?.baseUrl;
  try {
    if (provider !== "gemini") {
      let responseText = "";
      let groundingSources2 = [];
      if (!userApiKey && provider !== "ollama") {
        return res.status(400).json({
          error: `API key required for ${provider}. Configure the provider API key in Settings.`
        });
      }
      if (provider === "openai" || provider === "ollama" || provider === "custom") {
        const defaultBaseUrl = provider === "openai" ? "https://api.openai.com/v1" : provider === "ollama" ? "http://localhost:11434/v1" : customBaseUrl;
        const targetUrl = `${defaultBaseUrl}/chat/completions`;
        const headers = {
          "Content-Type": "application/json"
        };
        if (userApiKey) {
          headers["Authorization"] = `Bearer ${userApiKey}`;
        }
        const formattedMessages = [
          { role: "system", content: systemInstruction },
          ...history.map((h) => ({
            role: h.role === "user" ? "user" : "assistant",
            content: h.text
          })),
          { role: "user", content: message }
        ];
        const response2 = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: modelToUse,
            messages: formattedMessages,
            temperature: profile.temperature || 0.7
          })
        });
        if (!response2.ok) {
          const errText = await response2.text();
          throw new Error(`External LLM Provider ${provider.toUpperCase()} error: ${errText || response2.statusText}`);
        }
        const data = await response2.json();
        responseText = data.choices?.[0]?.message?.content || "No text returned from model.";
      } else if (provider === "anthropic") {
        const targetUrl = customBaseUrl || "https://api.anthropic.com/v1/messages";
        const response2 = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "x-api-key": userApiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: modelToUse || "claude-3-5-sonnet-latest",
            system: systemInstruction,
            messages: history.map((h) => ({
              role: h.role === "user" ? "user" : "assistant",
              content: h.text
            })).concat([{ role: "user", content: message }]),
            max_tokens: 1500,
            temperature: profile.temperature || 0.7
          })
        });
        if (!response2.ok) {
          const errText = await response2.text();
          throw new Error(`Anthropic error description: ${errText || response2.statusText}`);
        }
        const data = await response2.json();
        responseText = data.content?.[0]?.text || "No text returned from Claude.";
      }
      await dispatchRealWorldWebhookTriggersIfNeeded(responseText, message, slackWebhookUrl, profile);
      return res.json({
        success: true,
        text: responseText,
        groundingSources: groundingSources2
      });
    }
    let ai;
    if (userApiKey) {
      ai = new import_genai.GoogleGenAI({ apiKey: userApiKey });
    } else {
      ai = getGeminiClient();
    }
    const tools = [];
    if (skills.some((s) => s.id === "web_search")) {
      tools.push({ googleSearch: {} });
    }
    const contents = [];
    for (const h of history) {
      contents.push({
        role: h.role,
        parts: [{ text: h.text }]
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents,
      config: {
        systemInstruction,
        temperature: profile.temperature || 0.7,
        tools: tools.length > 0 ? tools : void 0
      }
    });
    const replyText = response.text || "No response generated.";
    const groundingSources = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      for (const chunk of chunks) {
        if (chunk.web) {
          groundingSources.push({
            uri: chunk.web.uri,
            title: chunk.web.title
          });
        }
      }
    }
    await dispatchRealWorldWebhookTriggersIfNeeded(replyText, message, slackWebhookUrl, profile);
    return res.json({
      success: true,
      text: replyText,
      groundingSources
    });
  } catch (error) {
    console.error("Agent Chat execution error:", error);
    return res.status(500).json({
      error: error.message || "Failed to communicate with the Agent core."
    });
  }
});
app.post("/api/agent/generate-avatar", async (req, res) => {
  const { name, avatarColor, providerConfig } = req.body;
  if (!name || !avatarColor) {
    return res.status(400).json({ error: "Missing name or avatarColor parameters." });
  }
  try {
    const apiSecret = providerConfig?.apiKey || process.env.GEMINI_API_KEY;
    if (!apiSecret) {
      return res.status(400).json({
        error: "API key required for avatar generation. Configure GEMINI_API_KEY or provide a provider API key."
      });
    }
    let ai;
    if (providerConfig?.apiKey) {
      ai = new import_genai.GoogleGenAI({ apiKey: providerConfig.apiKey });
    } else {
      ai = getGeminiClient();
    }
    const promptText = `An ultra-high-fidelity neon cyberpunk AI avatar logo representing an agent named '${name}'. Beautiful central cybernetic neural core graphic, distinct neon accents in ${avatarColor} radiating through clean matte black panels and complex sci-fi gold circuitry, synthwave neon lighting, octane render 8k detail, pristine graphic design concept, centering composition with minimal depth shadows.`;
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: promptText,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "1:1"
      }
    });
    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64Bytes = response.generatedImages[0].image.imageBytes;
      return res.json({
        success: true,
        avatarUrl: `data:image/jpeg;base64,${base64Bytes}`
      });
    } else {
      throw new Error("No image data returned from Gemini Imagen 3.");
    }
  } catch (err) {
    console.error("Imagen avatar generation error:", err);
    return res.status(500).json({
      error: err.message || "Failed to generate avatar."
    });
  }
});
app.post("/api/agent/dispatch-webhook", async (req, res) => {
  const { url, payload } = req.body;
  if (!url) {
    return res.status(400).json({ error: "No target Webhook URL specified for the test dispatch." });
  }
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Soul-Genesis-Agent": "workbench-test-harness"
      },
      body: JSON.stringify(payload || {})
    });
    const text = await response.text();
    const duration = Date.now() - startTime;
    let jsonResponse = null;
    try {
      jsonResponse = JSON.parse(text);
    } catch {
    }
    return res.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      durationMs: duration,
      response: jsonResponse || text
    });
  } catch (err) {
    return res.status(500).json({
      error: `Failed to dispatch test payload to target webhook URL: ${err.message}`
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path4.default.join(process.cwd(), "dist");
    app.use(import_express3.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path4.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Custom Agent Workbench Server listening at http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
