const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TheFixer {
  constructor(gskCore) {
    this.gsk = gskCore;
    this.commonErrors = {
      'undefined is not a function': 'check_function_definition',
      'Cannot read property': 'check_null_reference',
      'is not defined': 'check_variable_declaration',
      'Unexpected token': 'check_syntax',
      'Module not found': 'check_import_path',
      'ECONNREFUSED': 'check_service_running'
    };
  }

  async diagnoseError(errorOutput, filePath = null) {
    const diagnosis = {
      error: errorOutput.substring(0, 500),
      type: 'unknown',
      confidence: 0,
      fixes: [],
      filePath
    };

    for (const [pattern, fixType] of Object.entries(this.commonErrors)) {
      if (errorOutput.includes(pattern)) {
        diagnosis.type = pattern;
        diagnosis.confidence = 0.9;
        diagnosis.fixes = await this.generateFixes(fixType, errorOutput, filePath);
        break;
      }
    }

    return diagnosis;
  }

  async generateFixes(fixType, errorOutput, filePath) {
    const fixes = [];

    switch (fixType) {
      case 'check_function_definition':
        fixes.push({
          type: 'add_missing_function',
          description: 'Add the missing function definition',
          confidence: 0.8
        });
        break;

      case 'check_null_reference':
        fixes.push({
          type: 'add_null_check',
          description: 'Add null/undefined check before accessing property',
          confidence: 0.9
        });
        break;

      case 'check_variable_declaration':
        fixes.push({
          type: 'declare_variable',
          description: 'Declare the variable with let/const',
          confidence: 0.95
        });
        break;

      case 'check_syntax':
        fixes.push({
          type: 'fix_syntax',
          description: 'Fix syntax error (missing bracket, comma, etc)',
          confidence: 0.7
        });
        break;

      case 'check_import_path':
        if (filePath) {
          fixes.push({
            type: 'fix_import_path',
            description: 'Correct the import path',
            confidence: 0.85
          });
        }
        break;

      case 'check_service_running':
        fixes.push({
          type: 'start_service',
          description: 'Start the required service',
          confidence: 0.9
        });
        break;
    }

    return fixes;
  }

  async applyFix(filePath, fix) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let applied = false;

      switch (fix.type) {
        case 'add_null_check':
          // Simple null check injection (basic implementation)
          newContent = content.replace(
            /(\w+)\.(\w+)/g,
            (match, obj, prop) => {
              if (Math.random() > 0.7) { // Only fix some instances
                return `(${obj} && ${obj}.${prop})`;
              }
              return match;
            }
          );
          applied = newContent !== content;
          break;

        case 'declare_variable':
          // Add 'let' or 'const' to undeclared variables
          newContent = content.replace(
            /\b([a-zA-Z_$][\w$]*)\s*=/g,
            (match, varName) => {
              if (!content.includes(`let ${varName}`) && !content.includes(`const ${varName}`)) {
                return `let ${varName} =`;
              }
              return match;
            }
          );
          applied = newContent !== content;
          break;
      }

      if (applied) {
        fs.writeFileSync(filePath, newContent);
        this.gsk.speak(`Applied fix: ${fix.description}`);
        return { success: true, fix: fix.type };
      }

      return { success: false, reason: 'Could not apply fix automatically' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testFix(filePath, originalContent) {
    // Try to run the file or its tests
    try {
      const testFile = filePath.replace('.js', '.test.js');
      if (fs.existsSync(testFile)) {
        execSync(`npm test -- ${testFile}`, { encoding: 'utf8', stdio: 'pipe' });
        return { passed: true };
      } else {
        // Try to compile/run the file
        execSync(`node -c ${filePath}`, { encoding: 'utf8' });
        return { passed: true };
      }
    } catch (error) {
      // Revert if test fails
      fs.writeFileSync(filePath, originalContent);
      return { passed: false, error: error.message };
    }
  }
}

module.exports = TheFixer;
