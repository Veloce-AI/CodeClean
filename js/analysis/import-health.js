/* import-health.js — Wildcard imports, buried imports, duplicate imports */

async function analyzeImportHealth(files) {
  const issues = [];

  for (const f of files) {
    if (!f.content) continue;
    const lines = f.content.split('\n');
    const lang = f.lang || '';

    if (['js','ts','jsx','tsx','mjs'].includes(lang)) {
      analyzeJSImports(f, lines, issues);
    } else if (lang === 'py') {
      analyzePyImports(f, lines, issues);
    } else if (['java','cs','kt'].includes(lang)) {
      analyzeJavaLikeImports(f, lines, issues);
    }
  }

  return issues;
}

function analyzeJSImports(f, lines, issues) {
  const seen = new Set();

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Wildcard: import * from
    if (/^import\s*\*\s*as/.test(trimmed)) {
      issues.push({
        severity: 'medium',
        title: 'Wildcard namespace import',
        file: f.path,
        line: idx + 1,
        snippet: trimmed.slice(0, 80),
        suggestion: 'Import only what you need: import { foo, bar } from ...',
      });
    }

    // Buried import (import inside a function/block — not at top level)
    if (/^\s{2,}(?:import|require)\s*\(/.test(line) || /\b(?:require|import)\s*\(/.test(line)) {
      const isTopLevel = idx === 0 || lines.slice(0, idx).every(l => !/^\s*(?:function|class|if|for|while|{)/.test(l));
      if (!isTopLevel && /^\s+/.test(line)) {
        issues.push({
          severity: 'low',
          title: 'Import buried inside function/block',
          file: f.path,
          line: idx + 1,
          snippet: trimmed.slice(0, 80),
          suggestion: 'Move static imports to the top of the file',
        });
      }
    }

    // Duplicate imports (same module imported twice)
    const fromMatch = trimmed.match(/^import\s+.+\s+from\s+['"]([^'"]+)['"]/);
    if (fromMatch) {
      const mod = fromMatch[1];
      if (seen.has(mod)) {
        issues.push({
          severity: 'low',
          title: `Duplicate import: ${mod}`,
          file: f.path,
          line: idx + 1,
          snippet: trimmed.slice(0, 80),
          suggestion: 'Combine into a single import statement',
        });
      }
      seen.add(mod);
    }
  });
}

function analyzePyImports(f, lines, issues) {
  const seen = new Set();

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Wildcard: from x import *
    if (/^from\s+\S+\s+import\s+\*/.test(trimmed)) {
      issues.push({
        severity: 'high',
        title: 'Wildcard import (from x import *)',
        file: f.path,
        line: idx + 1,
        snippet: trimmed.slice(0, 80),
        suggestion: 'Explicitly import only what you need — wildcards pollute namespace and hide dependencies',
      });
    }

    // Buried import (indented import = inside function/class/if)
    if (/^\s+(?:import|from)\s+/.test(line)) {
      issues.push({
        severity: 'low',
        title: 'Import inside function/block',
        file: f.path,
        line: idx + 1,
        snippet: trimmed.slice(0, 80),
        suggestion: 'Move to top of file unless it is a conditional/lazy import by design',
      });
    }

    // Duplicate import
    const impMatch = trimmed.match(/^(?:import|from)\s+([\w.]+)/);
    if (impMatch) {
      const mod = impMatch[1];
      if (seen.has(mod)) {
        issues.push({
          severity: 'low',
          title: `Duplicate import: ${mod}`,
          file: f.path,
          line: idx + 1,
          snippet: trimmed.slice(0, 80),
          suggestion: 'Combine into a single import statement',
        });
      }
      seen.add(mod);
    }
  });
}

function analyzeJavaLikeImports(f, lines, issues) {
  const seen = new Set();
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/^import\s+.*\*\s*;/.test(trimmed)) {
      issues.push({
        severity: 'medium',
        title: 'Wildcard import',
        file: f.path,
        line: idx + 1,
        snippet: trimmed.slice(0, 80),
        suggestion: 'Import specific types instead of using wildcards',
      });
    }
    const m = trimmed.match(/^import\s+([\w.]+)/);
    if (m) {
      if (seen.has(m[1])) {
        issues.push({ severity:'low', title:`Duplicate import: ${m[1]}`, file:f.path, line:idx+1, snippet:trimmed.slice(0,80), suggestion:'Remove duplicate import' });
      }
      seen.add(m[1]);
    }
  });
}
