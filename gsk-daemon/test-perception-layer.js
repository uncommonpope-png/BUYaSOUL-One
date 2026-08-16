#!/usr/bin/env node
/**
 * PERCEPTION LAYER TEST SUITE
 * Tests Phases 231-240: Omniscient Watcher, Voice, Emotional Mirror, Alarm
 */

const fs = require('fs');
const path = require('path');

console.log('\n🧪 TESTING GSK PERCEPTION LAYER (Phases 231-240)\n');

// Test 1: Check if perception files exist
console.log('Test 1: Checking perception module files...');
const perceptionFiles = [
  'gsk-core/perception/omniscient_watcher.js',
  'gsk-core/perception/voice_engine.js',
  'gsk-core/perception/emotional_mirror.js'
];

let allFilesExist = true;
perceptionFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ MISSING: ${file}`);
    allFilesExist = false;
  }
});

// Test 2: Check if daemon imports perception modules
console.log('\nTest 2: Checking daemon imports...');
const daemonFile = path.join(__dirname, 'gsk_daemon.js');
const daemonContent = fs.readFileSync(daemonFile, 'utf8');

const requiredImports = [
  "require('./gsk-core/perception/omniscient_watcher')",
  "require('./gsk-core/perception/voice_engine')",
  "require('./gsk-core/perception/emotional_mirror')"
];

requiredImports.forEach(imp => {
  if (daemonContent.includes(imp)) {
    console.log(`  ✅ Import found: ${imp.substring(0, 50)}...`);
  } else {
    console.log(`  ❌ MISSING IMPORT: ${imp}`);
    allFilesExist = false;
  }
});

// Test 3: Check if perception initialization exists
console.log('\nTest 3: Checking perception initialization...');
const initChecks = [
  'new VoiceEngine(gsk)',
  'new EmotionalMirror(gsk)',
  'new OmniscientWatcher(gsk)',
  'PERCEPTION LAYER COMPLETE'
];

initChecks.forEach(check => {
  if (daemonContent.includes(check)) {
    console.log(`  ✅ Initialization found: ${check}`);
  } else {
    console.log(`  ❌ MISSING: ${check}`);
    allFilesExist = false;
  }
});

// Test 4: Create a test file with typos to verify Silent Guardian
console.log('\nTest 4: Testing Silent Guardian (Phase 234)...');
const testFilePath = path.join(__dirname, 'test-typo-file.js');
const typoContent = `
const requre = require('fs');
fucntion test() {
  consol.log('This has typos');
  retunr 'bad code';
}
`;

fs.writeFileSync(testFilePath, typoContent);
console.log(`  📝 Created test file with typos: ${testFilePath}`);
console.log(`  Content preview: "${typoContent.trim().substring(0, 60)}..."`);
console.log(`  ℹ️  When GSK daemon runs, it should auto-fix these typos`);

// Test 5: Create a test file with critical error to verify Oh Shit Detector
console.log('\nTest 5: Testing Oh Shit Detector (Phase 240)...');
const criticalFilePath = path.join(__dirname, 'test-critical-file.js');
const criticalContent = `
const password = "supersecretkey123";
const api_key = "sk-1234567890abcdef";
undefined is not a function
`;

fs.writeFileSync(criticalFilePath, criticalContent);
console.log(`  📝 Created test file with critical issues: ${criticalFilePath}`);
console.log(`  Contains: hardcoded secrets and runtime error patterns`);
console.log(`  ℹ️  When GSK daemon runs, it should trigger alarm overlay`);

// Test 6: Check frontend components
console.log('\nTest 6: Checking frontend perception components...');
const frontendPath = path.join(__dirname, '../src');
const frontendFiles = [
  'hooks/useGSKPerception.ts',
  'components/GSKAlarmOverlay.tsx'
];

frontendFiles.forEach(file => {
  const fullPath = path.join(frontendPath, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ Frontend component: ${file}`);
  } else {
    console.log(`  ❌ MISSING: ${file}`);
    allFilesExist = false;
  }
});

// Test 7: Check App.tsx integration
console.log('\nTest 7: Checking App.tsx integration...');
const appFile = path.join(frontendPath, 'App.tsx');
const appContent = fs.readFileSync(appFile, 'utf8');

const appChecks = [
  'import { GSKAlarmOverlay }',
  'import { useGSKPerception }',
  '<GSKAlarmOverlay />'
];

appChecks.forEach(check => {
  if (appContent.includes(check)) {
    console.log(`  ✅ Integration found: ${check}`);
  } else {
    console.log(`  ❌ MISSING: ${check}`);
    allFilesExist = false;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
if (allFilesExist) {
  console.log('✅ ALL TESTS PASSED - Perception Layer is properly wired!');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Install OmniRoute: npm install -g omniroute');
  console.log('2. Start OmniRoute: omniroute');
  console.log('3. Start GSK Daemon: cd gsk-daemon && node gsk_daemon.js');
  console.log('   (Set MCP_API_KEY=gsk-mcp-key-dev before starting)');
  console.log('4. Start Workbench: npm run dev');
  console.log('5. Test by editing the test files created above');
  console.log('\n🎯 EXPECTED BEHAVIOR:');
  console.log('- Typos in test-typo-file.js will be auto-fixed');
  console.log('- Critical issues in test-critical-file.js will trigger alarm');
  console.log('- GSK will speak findings aloud via voice engine');
  console.log('- Rapid backspacing will trigger emotional support mode');
} else {
  console.log('❌ SOME TESTS FAILED - Check missing files above');
}
console.log('='.repeat(60) + '\n');

// Cleanup test files after delay
setTimeout(() => {
  try {
    fs.unlinkSync(testFilePath);
    fs.unlinkSync(criticalFilePath);
    console.log('🧹 Cleaned up test files\n');
  } catch (e) {
    // Ignore cleanup errors
  }
}, 5000);

process.exit(allFilesExist ? 0 : 1);
