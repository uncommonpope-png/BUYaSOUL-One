const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GhostCommitter {
  constructor(gskCore) {
    this.gsk = gskCore;
    this.branchPrefix = 'gsk-ghost-';
    this.activeBranches = new Set();
  }

  async createGhostCommit(filePath, changes, reason) {
    const branchName = `${this.branchPrefix}${Date.now()}`;
    const originalBranch = this.getCurrentBranch();
    
    try {
      // Create hidden branch
      this.exec(`git checkout -b ${branchName}`);
      this.activeBranches.add(branchName);
      
      // Apply changes
      fs.writeFileSync(filePath, changes.content);
      
      // Run tests if they exist
      const testResult = await this.runTests(filePath);
      
      if (testResult.passed) {
        // Commit the fix
        this.exec(`git add ${filePath}`);
        this.exec(`git commit -m "GSK Ghost Fix: ${reason}"`);
        
        this.gsk.speak(`I've created a hidden fix for ${path.basename(filePath)}. Tests pass. Want to see it?`);
        
        return {
          success: true,
          branch: branchName,
          originalBranch,
          testResult,
          message: `Ghost commit created on ${branchName}`
        };
      } else {
        // Revert if tests fail
        this.exec(`git checkout ${originalBranch} -- ${filePath}`);
        this.exec(`git branch -D ${branchName}`);
        this.activeBranches.delete(branchName);
        
        return {
          success: false,
          reason: 'Tests failed',
          testResult
        };
      }
    } catch (error) {
      this.gsk.log(`Ghost Commit Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runTests(filePath) {
    const testFile = filePath.replace('.js', '.test.js').replace('.ts', '.test.ts');
    
    if (fs.existsSync(testFile)) {
      try {
        const result = execSync(`npm test -- ${testFile}`, { encoding: 'utf8', stdio: 'pipe' });
        return { passed: true, output: result };
      } catch (error) {
        return { passed: false, output: error.stdout || error.message };
      }
    }
    
    // No specific test file, try general linting
    try {
      execSync(`npx eslint ${filePath}`, { encoding: 'utf8', stdio: 'pipe' });
      return { passed: true, output: 'Linting passed' };
    } catch (error) {
      return { passed: false, output: 'No tests found, linting failed' };
    }
  }

  getCurrentBranch() {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  }

  exec(command) {
    return execSync(command, { encoding: 'utf8', cwd: this.gsk.projectRoot });
  }

  async mergeGhostBranch(ghostBranch, targetBranch = null) {
    const original = this.getCurrentBranch();
    targetBranch = targetBranch || original;
    
    try {
      this.exec(`git checkout ${targetBranch}`);
      this.exec(`git merge ${ghostBranch} -m "Merge GSK ghost fix"`);
      this.exec(`git branch -D ${ghostBranch}`);
      this.activeBranches.delete(ghostBranch);
      
      this.gsk.speak(`Ghost fix merged into ${targetBranch}.`);
      return { success: true };
    } catch (error) {
      this.exec(`git checkout ${original}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GhostCommitter;
