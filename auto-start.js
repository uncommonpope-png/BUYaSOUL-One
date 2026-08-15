#!/usr/bin/env node

/**
 * BUYaSOUL Zero-Setup Auto-Starter
 * 
 * This script orchestrates the startup of:
 * 1. OmniRoute (local AI gateway - FREE)
 * 2. Health check to verify OmniRoute is ready
 * 3. BUYaSOUL Workbench
 * 
 * No configuration needed. Everything runs locally and free.
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

async function waitForService(url, name, timeout = 60000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return true;
      }
    } catch (e) {
      // Service not ready yet
    }
    
    await setTimeout(1000);
  }
  
  throw new Error(`${name} failed to start within ${timeout/1000} seconds`);
}

async function main() {
  log(COLORS.bright + COLORS.cyan, '╔════════════════════════════════════════════╗');
  log(COLORS.bright + COLORS.cyan, '║   BUYaSOUL Workbench - Zero Setup Mode    ║');
  log(COLORS.bright + COLORS.cyan, '╚════════════════════════════════════════════╝');
  console.log('');
  
  // Step 1: Start OmniRoute
  log(COLORS.yellow, '📦 Step 1/3: Starting OmniRoute (FREE AI Gateway)...');
  
  let omnirouteProcess;
  try {
    // Try to use globally installed omniroute
    omnirouteProcess = spawn('omniroute', [], {
      stdio: 'pipe',
      env: { ...process.env, PORT: '20128' }
    });
    
    omnirouteProcess.stdout.on('data', (data) => {
      const text = data.toString();
      if (text.includes('Dashboard') || text.includes('http://')) {
        log(COLORS.green, `   ${text.trim()}`);
      }
    });
    
    omnirouteProcess.stderr.on('data', (data) => {
      const text = data.toString();
      if (!text.includes('warn') && !text.includes('WARN')) {
        log(COLORS.yellow, `   ${text.trim()}`);
      }
    });
    
    // Wait for OmniRoute to be ready
    log(COLORS.blue, '⏳ Waiting for OmniRoute to initialize...');
    await waitForService('http://localhost:20128/v1/models', 'OmniRoute');
    log(COLORS.green, '✅ OmniRoute is ready!');
    log(COLORS.cyan, '   🌐 Dashboard: http://localhost:20128');
    log(COLORS.cyan, '   🔌 API: http://localhost:20128/v1');
    log(COLORS.cyan, '   💰 Free tier: ~1.5B tokens/month');
    
  } catch (error) {
    log(COLORS.red, `❌ Failed to start OmniRoute: ${error.message}`);
    log(COLORS.yellow, '\n💡 Install OmniRoute with: npm install -g omniroute');
    log(COLORS.yellow, '   Or manually start it before running this script\n');
    process.exit(1);
  }
  
  console.log('');
  
  // Step 2: Verify OmniRoute health
  log(COLORS.yellow, '🔍 Step 2/3: Verifying OmniRoute health...');
  try {
    const healthRes = await fetch('http://localhost:20128/v1/models');
    if (!healthRes.ok) throw new Error('Health check failed');
    const models = await healthRes.json();
    log(COLORS.green, '✅ OmniRoute healthy!');
    log(COLORS.cyan, `   Found ${models.data?.length || 'many'} AI models available`);
  } catch (error) {
    log(COLORS.red, `⚠️  Health check warning: ${error.message}`);
    log(COLORS.yellow, '   Continuing anyway - may have limited functionality\n');
  }
  
  console.log('');
  
  // Step 3: Start Workbench
  log(COLORS.yellow, '🚀 Step 3/3: Starting BUYaSOUL Workbench...');
  
  const workbenchProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  workbenchProcess.on('close', (code) => {
    log(COLORS.magenta, `\n👋 Workbench stopped (exit code: ${code})`);
    log(COLORS.yellow, '💡 OmniRoute is still running. Stop it with: pkill -f omniroute\n');
    process.exit(code);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log(COLORS.magenta, '\n🛑 Shutting down...');
    workbenchProcess.kill('SIGTERM');
    omnirouteProcess.kill('SIGTERM');
    setTimeout(2000).then(() => process.exit(0));
  });
  
  process.on('SIGTERM', () => {
    workbenchProcess.kill('SIGTERM');
    omnirouteProcess.kill('SIGTERM');
    process.exit(0);
  });
}

main().catch((error) => {
  log(COLORS.red, `\n❌ Fatal error: ${error.message}`);
  log(COLORS.yellow, '\n💡 For support: https://github.com/uncommonpope-png/BUYaSOUL-One/issues\n');
  process.exit(1);
});
