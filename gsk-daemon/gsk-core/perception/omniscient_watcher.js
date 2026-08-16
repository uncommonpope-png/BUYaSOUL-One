const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

/**
 * PHASE 231-240: THE OMNISCIENT WATCHER
 * GSK's nervous system. Sees every file save, typo, and critical error.
 */
class OmniscientWatcher {
  constructor(gskCore) {
    this.gsk = gskCore;
    this.watcher = null;
    this.debounceTimers = {};
    this.projectRoot = process.cwd();
    
    // Common typos for Phase 234 (Silent Guardian)
    this.commonTypos = {
      'requre(': 'require(',
      'fucntion': 'function',
      'consol.log': 'console.log',
      'retunr ': 'return ',
      'varibel': 'variable',
      'undefinded': 'undefined',
      'adn ': 'and ',
      'hte ': 'the ',
    };
  }

  start(rootPath) {
    const watchPath = rootPath || this.projectRoot;
    console.log(`👁️  PHASE 231: Omniscient Watcher starting on ${watchPath}`);
    
    this.watcher = chokidar.watch(watchPath, {
      ignored: /node_modules|\.git|dist|build|\.next/,
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
    });

    this.watcher.on('change', (filePath) => this.handleFileChange(filePath));
    this.watcher.on('add', (filePath) => this.handleNewFile(filePath));
    this.watcher.on('error', (error) => {
      this.gsk.log(`Watcher Error: ${error}`);
      if (this.gsk.voice) this.gsk.voice.speak("File watcher encountered an error.", "low");
    });

    console.log('✅ Omniscient Watcher active. Seeing everything.');
  }

  async handleFileChange(filePath) {
    if (this.debounceTimers[filePath]) clearTimeout(this.debounceTimers[filePath]);
    
    this.debounceTimers[filePath] = setTimeout(async () => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(this.projectRoot, filePath);

        // PHASE 234: Silent Guardian (Auto-fix typos)
        const corrections = this.detectTypos(content);
        if (corrections.length > 0) {
          await this.applySilentFixes(filePath, corrections);
        }

        // PHASE 240: Oh Shit Detector (Critical errors)
        const criticalIssues = this.detectCriticalErrors(content, filePath);
        if (criticalIssues.length > 0) {
          this.triggerAlarm(filePath, criticalIssues);
        }

        // Record perception in memory
        if (this.gsk.memory) {
          this.gsk.memory.addEvent({
            type: 'perception_file_change',
            path: relativePath,
            timestamp: Date.now(),
            corrections: corrections.length,
            issues: criticalIssues.length
          });
        }

      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
      }
    }, 500);
  }

  async handleNewFile(filePath) {
    console.log(`📄 New file detected: ${path.relative(this.projectRoot, filePath)}`);
    if (this.gsk.voice) {
      this.gsk.voice.speak(`New file created: ${path.basename(filePath)}`);
    }
  }

  detectTypos(content) {
    const found = [];
    for (const [typo, fix] of Object.entries(this.commonTypos)) {
      if (content.includes(typo)) {
        found.push({ typo, fix, count: (content.match(new RegExp(typo, 'g')) || []).length });
      }
    }
    return found;
  }

  async applySilentFixes(filePath, corrections) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fixCount = 0;

    corrections.forEach(({ typo, fix, count }) => {
      const regex = new RegExp(typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(regex, fix);
      modified = true;
      fixCount += count;
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`🛡️  PHASE 234: Silent Guardian fixed ${fixCount} typos in ${path.basename(filePath)}`);
      
      if (this.gsk.voice) {
        this.gsk.voice.speak(`Fixed ${fixCount} small typos in ${path.basename(filePath)}. You're welcome.`);
      }
      
      // Log the fix
      if (this.gsk.memory) {
        this.gsk.memory.addEvent({
          type: 'silent_fix',
          path: filePath,
          fixes: fixCount,
          timestamp: Date.now()
        });
      }
    }
  }

  detectCriticalErrors(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    const ext = path.extname(filePath);

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) return;

      // Runtime Crash Risks
      if (line.includes('undefined is not a function') || 
          line.includes('Cannot read property') ||
          line.includes('TypeError:')) {
        issues.push({ line: lineNum, type: 'Runtime Crash Risk', content: trimmed });
      }

      // Security Leaks (Hardcoded secrets)
      if ((line.includes('password') || line.includes('secret') || line.includes('api_key') || line.includes('token')) 
          && line.includes('=') && !line.includes('process.env')) {
        // Simple heuristic: if it looks like a hardcoded string assignment
        if (line.match(/['"][a-zA-Z0-9]{8,}['"]/)) {
          issues.push({ line: lineNum, type: 'Security Leak (Hardcoded Secret)', content: trimmed });
        }
      }

      // Infinite Loop Risks (Simple detection)
      if (ext === '.js' && line.includes('while(true)') && !line.includes('//')) {
        issues.push({ line: lineNum, type: 'Potential Infinite Loop', content: trimmed });
      }
    });

    return issues;
  }

  triggerAlarm(filePath, issues) {
    console.log(`\n🚨 PHASE 240: OH SHIT DETECTOR TRIGGERED IN ${path.relative(this.projectRoot, filePath)}`);
    issues.forEach(i => console.log(`   - Line ${i.line}: ${i.type}`));
    console.log('');
    
    if (this.gsk.voice) {
      this.gsk.voice.speak(`Warning. Critical issue detected in ${path.basename(filePath)}. ${issues[0].type}. Pausing.`, "critical");
    }

    // Emit event for UI (if socket.io is connected)
    if (this.gsk.io) {
      this.gsk.io.emit('critical_alarm', { 
        file: path.relative(this.projectRoot, filePath), 
        issues,
        timestamp: Date.now()
      });
    }

    // Store in state for retrieval
    if (this.gsk.state) {
      this.gsk.state.currentAlarm = { file: filePath, issues, triggeredAt: Date.now() };
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('👁️  Omniscient Watcher stopped.');
    }
  }
}

module.exports = OmniscientWatcher;
