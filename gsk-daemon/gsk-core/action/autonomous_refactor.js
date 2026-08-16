const fs = require('fs');
const path = require('path');

class AutonomousRefactor {
  constructor(gskCore) {
    this.gsk = gskCore;
    this.codeSmells = {
      longFunction: { threshold: 50, message: 'Function too long' },
      deepNesting: { threshold: 4, message: 'Deep nesting detected' },
      magicNumbers: { pattern: /\b\d{2,}\b/g, message: 'Magic number' },
      duplicateCode: { threshold: 0.8, message: 'Similar code blocks' }
    };
  }

  async analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues = [];

    // Check for long functions
    let functionStart = -1;
    let braceCount = 0;
    
    lines.forEach((line, idx) => {
      if (line.includes('function') || line.includes('=>') || line.includes('{')) {
        if (functionStart === -1) functionStart = idx;
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        if (braceCount === 0 && functionStart !== -1) {
          const funcLength = idx - functionStart;
          if (funcLength > this.codeSmells.longFunction.threshold) {
            issues.push({
              type: 'longFunction',
              line: functionStart + 1,
              message: `Function is ${funcLength} lines (threshold: ${this.codeSmells.longFunction.threshold})`,
              suggestion: 'Consider breaking into smaller functions'
            });
          }
          functionStart = -1;
        }
      }

      // Check for deep nesting
      const nestingLevel = (line.match(/^\s+/) || [''])[0].length / 2;
      if (nestingLevel > this.codeSmells.deepNesting.threshold) {
        issues.push({
          type: 'deepNesting',
          line: idx + 1,
          message: `Nesting level ${nestingLevel}`,
          suggestion: 'Use early returns or extract methods'
        });
      }

      // Check for magic numbers
      const matches = line.match(this.codeSmells.magicNumbers.pattern);
      if (matches && !line.includes('//') && !line.includes('const') && !line.includes('let')) {
        matches.forEach(num => {
          issues.push({
            type: 'magicNumber',
            line: idx + 1,
            message: `Magic number: ${num}`,
            suggestion: 'Extract to named constant'
          });
        });
      }
    });

    return {
      filePath,
      issues,
      score: Math.max(0, 100 - (issues.length * 5))
    };
  }

  async suggestRefactoring(analysis) {
    if (analysis.issues.length === 0) {
      return { action: 'none', message: 'Code looks clean!' };
    }

    const suggestions = analysis.issues.map(issue => ({
      type: issue.type,
      line: issue.line,
      action: this.getRefactoringAction(issue.type),
      message: issue.suggestion
    }));

    this.gsk.speak(`I found ${analysis.issues.length} areas for improvement in ${path.basename(analysis.filePath)}. Shall I refactor?`);

    return {
      action: 'suggest',
      score: analysis.score,
      suggestions,
      autoFixAvailable: suggestions.some(s => s.action !== 'manual_review')
    };
  }

  getRefactoringAction(type) {
    const actions = {
      longFunction: 'extract_method',
      deepNesting: 'flatten_logic',
      magicNumber: 'extract_constant',
      duplicateCode: 'create_utility'
    };
    return actions[type] || 'manual_review';
  }

  async applyRefactoring(filePath, suggestions) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changesApplied = 0;

    for (const suggestion of suggestions) {
      if (suggestion.action === 'extract_constant') {
        // Simple magic number replacement
        const lineNum = suggestion.line - 1;
        const lines = content.split('\n');
        const line = lines[lineNum];
        
        const numberMatch = line.match(/\b(\d{2,})\b/);
        if (numberMatch) {
          const number = numberMatch[1];
          const constName = `CONST_${number}`;
          const newLine = line.replace(number, `/* ${constName} */ ${number}`);
          
          lines[lineNum] = newLine;
          content = lines.join('\n');
          changesApplied++;
        }
      }
    }

    if (changesApplied > 0) {
      fs.writeFileSync(filePath, content);
      this.gsk.speak(`Applied ${changesApplied} refactoring suggestions.`);
      return { success: true, changesApplied };
    }

    return { success: false, reason: 'No automatic refactors applied' };
  }
}

module.exports = AutonomousRefactor;
