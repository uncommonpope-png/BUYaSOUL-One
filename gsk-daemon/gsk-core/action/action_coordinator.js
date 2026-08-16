const fs = require('fs');
const path = require('path');

class ActionCoordinator {
  constructor(gskCore) {
    this.gsk = gskCore;
    this.modules = {};
    this.actionQueue = [];
    this.isProcessing = false;
  }

  async initialize() {
    // Load all action modules
    const GhostCommitter = require('./ghost_committer');
    const AutonomousRefactor = require('./autonomous_refactor');
    const TheFixer = require('./the_fixer');

    this.modules = {
      ghostCommitter: new GhostCommitter(this.gsk),
      refactor: new AutonomousRefactor(this.gsk),
      fixer: new TheFixer(this.gsk)
    };

    console.log('🤖 ACTION LAYER INITIALIZED: Ghost Committer, Refactor, Fixer ready');
    
    // Wire into perception events
    this.wireToPerception();
  }

  wireToPerception() {
    // Listen for critical alarms from perception layer
    this.gsk.on('critical_alarm', async (data) => {
      await this.handleCriticalIssue(data);
    });

    // Listen for file changes that might need refactoring
    this.gsk.on('file_changed', async (data) => {
      await this.considerRefactoring(data.filePath);
    });

    // Listen for test failures
    this.gsk.on('test_failed', async (data) => {
      await this.attemptAutoFix(data);
    });
  }

  async handleCriticalIssue(data) {
    const { file, issues } = data;
    
    this.gsk.speak(`Critical issue detected in ${path.basename(file)}. Analyzing...`);
    
    for (const issue of issues) {
      if (issue.type === 'Security Leak') {
        this.gsk.speak('Security risk detected. Removing hardcoded secret.');
        await this.removeHardcodedSecret(file, issue.line);
      } else if (issue.type === 'Runtime Crash Risk') {
        this.gsk.speak('Crash risk detected. Attempting fix.');
        const diagnosis = await this.modules.fixer.diagnoseError(issue.content, file);
        if (diagnosis.fixes.length > 0) {
          await this.modules.fixer.applyFix(file, diagnosis.fixes[0]);
        }
      }
    }
  }

  async considerRefactoring(filePath) {
    // Only refactor if GSK is in "proactive" mood
    if (this.gsk.mood !== 'proactive' && this.gsk.mood !== 'helpful') {
      return;
    }

    const analysis = await this.modules.refactor.analyzeFile(filePath);
    
    if (analysis.score < 70) {
      this.gsk.speak(`${path.basename(filePath)} could use some cleanup. Score: ${analysis.score}/100`);
      
      const suggestion = await this.modules.refactor.suggestRefactoring(analysis);
      
      if (suggestion.autoFixAvailable) {
        this.gsk.speak('I can auto-fix some issues. Should I proceed?');
        // In autonomous mode, apply fixes automatically
        if (this.gsk.autonomyEnabled) {
          await this.modules.refactor.applyRefactoring(filePath, suggestion.suggestions);
        }
      }
    }
  }

  async attemptAutoFix(data) {
    const { filePath, errorOutput } = data;
    
    this.gsk.speak('Test failed. Diagnosing...');
    
    const diagnosis = await this.modules.fixer.diagnoseError(errorOutput, filePath);
    
    if (diagnosis.confidence > 0.8 && diagnosis.fixes.length > 0) {
      this.gsk.speak(`Issue identified: ${diagnosis.type}. Attempting fix...`);
      
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const result = await this.modules.fixer.applyFix(filePath, diagnosis.fixes[0]);
      
      if (result.success) {
        const testResult = await this.modules.fixer.testFix(filePath, originalContent);
        
        if (testResult.passed) {
          this.gsk.speak('Fix successful! Tests now pass.');
          
          // Create a ghost commit with the fix
          await this.modules.ghostCommitter.createGhostCommit(
            filePath,
            { content: fs.readFileSync(filePath, 'utf8') },
            `Auto-fix for: ${diagnosis.type}`
          );
        } else {
          this.gsk.speak('Fix did not resolve the issue. Reverting.');
          fs.writeFileSync(filePath, originalContent);
        }
      }
    } else {
      this.gsk.speak('Could not automatically diagnose this error. Human intervention needed.');
    }
  }

  async removeHardcodedSecret(filePath, lineNum) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    const line = lines[lineNum - 1];
    
    if (line.includes('password') || line.includes('secret') || line.includes('key') || line.includes('token')) {
      const sanitized = line.replace(/['"][^'"]{8,}['"]/g, "'REDACTED_BY_GSK'");
      lines[lineNum - 1] = sanitized;
      
      fs.writeFileSync(filePath, lines.join('\n'));
      this.gsk.speak('Removed hardcoded secret. Use environment variables instead.');
    }
  }

  queueAction(action) {
    this.actionQueue.push(action);
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing || this.actionQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.actionQueue.length > 0) {
      const action = this.actionQueue.shift();
      try {
        await this.executeAction(action);
      } catch (error) {
        this.gsk.log(`Action failed: ${error.message}`);
      }
    }
    
    this.isProcessing = false;
  }

  async executeAction(action) {
    switch (action.type) {
      case 'refactor':
        await this.considerRefactoring(action.filePath);
        break;
      case 'fix':
        await this.attemptAutoFix({ filePath: action.filePath, errorOutput: action.error });
        break;
      case 'commit':
        await this.modules.ghostCommitter.createGhostCommit(
          action.filePath,
          action.changes,
          action.reason
        );
        break;
    }
  }
}

module.exports = ActionCoordinator;
