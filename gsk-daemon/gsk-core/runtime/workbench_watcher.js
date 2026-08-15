/**
 * GSK WORKBENCH WATCHER — The Nervous System
 * Gives GSK real-time awareness of the Workbench environment.
 * 
 * Capabilities:
 * 1. VAULT WATCHER: Detects new API keys instantly → wakes up corresponding providers
 * 2. FILE WATCHER: Detects code changes → triggers analysis/reflection
 * 3. HEALTH PULSE: Sends heartbeat to UI every 5s
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar'); // Will be installed in auto-start

class WorkbenchWatcher {
  constructor(gskInstance, config = {}) {
    this.gsk = gskInstance;
    this.vaultPath = config.vaultPath || path.join(process.cwd(), '../data/vault.json');
    this.watchPath = config.watchPath || process.cwd();
    this.isAutonomous = config.autonomous !== false;
    this.listeners = [];
    
    console.log(`[GSK Watcher] Initializing nervous system...`);
    console.log(`[GSK Watcher] Vault: ${this.vaultPath}`);
    console.log(`[GSK Watcher] Watch: ${this.watchPath}`);
  }

  async start() {
    console.log(`[GSK Watcher] 👁️  OPENING EYES...`);
    
    // 1. Watch the Vault for new keys
    this.watchVault();
    
    // 2. Watch Workbench files for changes
    this.watchWorkbench();
    
    // 3. Start autonomous heartbeat if enabled
    if (this.isAutonomous) {
      this.startHeartbeat();
      this.startAutonomousLoop();
    }
    
    console.log(`[GSK Watcher] ✅ NERVOUS SYSTEM ONLINE`);
  }

  watchVault() {
    console.log(`[GSK Watcher] 🔒 Monitoring Vault for new keys...`);
    
    // Initial scan
    if (fs.existsSync(this.vaultPath)) {
      const vault = JSON.parse(fs.readFileSync(this.vaultPath, 'utf8'));
      console.log(`[GSK Watcher] Found ${Object.keys(vault.providers || {}).length} providers in vault`);
      this.gsk.emit('vault-update', vault);
    }

    // Watch for changes
    const dir = path.dirname(this.vaultPath);
    const base = path.basename(this.vaultPath);
    
    const watcher = chokidar.watch(dir, { 
      ignored: /node_modules|\.git/, 
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      if (path.basename(filePath) === base) {
        try {
          const vault = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          console.log(`[GSK Watcher] 🗝️  VAULT UPDATED! New providers detected.`);
          this.gsk.emit('vault-update', vault);
          
          // Auto-wake new providers
          this.wakeNewProviders(vault);
        } catch (e) {
          console.error(`[GSK Watcher] Error reading vault:`, e.message);
        }
      }
    });
  }

  wakeNewProviders(vault) {
    // Tell GSK brain to re-scan available models
    if (this.gsk.brain && this.gsk.brain.refreshProviders) {
      this.gsk.brain.refreshProviders(vault);
      console.log(`[GSK Watcher] 🧠 Brain refreshed provider list`);
    }
  }

  watchWorkbench() {
    console.log(`[GSK Watcher] 📂 Monitoring Workbench files...`);
    
    const watcher = chokidar.watch(this.watchPath, {
      ignored: [/node_modules|\.git|dist|build/, /\.(log|tmp)$/],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 1000 }
    });

    watcher.on('add', (file) => {
      console.log(`[GSK Watcher] 📄 NEW FILE: ${path.relative(this.watchPath, file)}`);
      this.gsk.emit('file-created', { path: file, type: 'create' });
      this.analyzeFile(file, 'created');
    });

    watcher.on('change', (file) => {
      console.log(`[GSK Watcher] ✏️  FILE MODIFIED: ${path.relative(this.watchPath, file)}`);
      this.gsk.emit('file-modified', { path: file, type: 'modify' });
      this.analyzeFile(file, 'modified');
    });

    watcher.on('unlink', (file) => {
      console.log(`[GSK Watcher] 🗑️  FILE DELETED: ${path.relative(this.watchPath, file)}`);
      this.gsk.emit('file-deleted', { path: file, type: 'delete' });
    });
  }

  async analyzeFile(filePath, action) {
    if (!this.isAutonomous) return;
    
    // Queue analysis task for GSK brain
    const relPath = path.relative(this.watchPath, filePath);
    console.log(`[GSK Watcher] 🧐 Queuing analysis for ${relPath} (${action})`);
    
    // Send to GSK's autonomous queue
    if (this.gsk.autonomyQueue) {
      this.gsk.autonomyQueue.push({
        type: 'analyze-file',
        path: filePath,
        action: action,
        timestamp: Date.now(),
        priority: 'normal'
      });
    }
  }

  startHeartbeat() {
    console.log(`[GSK Watcher] 💓 Starting heartbeat (5s interval)...`);
    
    setInterval(() => {
      const state = {
        timestamp: Date.now(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        autonomy: this.isAutonomous,
        watchers: {
          vault: fs.existsSync(this.vaultPath),
          workbench: true
        }
      };
      
      this.gsk.emit('heartbeat', state);
      // Could also POST to a UI endpoint here
    }, 5000);
  }

  startAutonomousLoop() {
    console.log(`[GSK Watcher] 🌀 Starting autonomous thought loop (30s interval)...`);
    
    setInterval(() => {
      if (this.gsk.autonomyQueue && this.gsk.autonomyQueue.length > 0) {
        const task = this.gsk.autonomyQueue.shift();
        console.log(`[GSK Watcher] 🤔 Processing autonomous task: ${task.type}`);
        this.executeTask(task);
      } else {
        // No tasks? Do a self-check
        this.selfReflect();
      }
    }, 30000);
  }

  async executeTask(task) {
    console.log(`[GSK Watcher] ⚡ Executing: ${task.type} on ${task.path || 'self'}`);
    // Delegate to GSK brain for actual execution
    if (this.gsk.brain && this.gsk.brain.executeTask) {
      await this.gsk.brain.executeTask(task);
    }
  }

  async selfReflect() {
    // Periodic self-reflection: check goals, energy, PLT alignment
    if (this.gsk.chambers && this.gsk.chambers.volition) {
      console.log(`[GSK Watcher] 🪞 Self-reflection cycle...`);
      // Trigger volition chamber to evaluate next action
    }
  }
}

module.exports = WorkbenchWatcher;
