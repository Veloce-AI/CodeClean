/* smells.js — Code smell detection: long functions, files, nesting, params */

async function analyzeSmells(files) {
  const issues = [];

  for (const f of files) {
    if (!f.content || f.lines < 5) continue;
    const lines = f.content.split('\n');
    const S = window.state?.settings || {};
    const FN_LIMIT   = S.fnLines   ?? 60;
    const FILE_LIMIT = S.fileLines ?? 300;
    const NEST_LIMIT = S.nestDepth ?? 4;
    const PARAM_LIMIT= S.fnParams  ?? 5;

    // Long file
    if (f.lines > FILE_LIMIT) {
      issues.push({
        severity: f.lines > FILE_LIMIT * 2 ? 'high' : 'medium',
        title: `Long file — ${f.lines} lines`,
        file: f.path,
        line: 1,
        suggestion: `Split into smaller focused modules (configured limit: ${FILE_LIMIT} lines)`,
      });
    }

    // Extract functions and check length + params
    const fns = extractFunctions(f, lines);
    for (const fn of fns) {
      const len = fn.end - fn.start + 1;
      if (len > FN_LIMIT) {
        issues.push({
          severity: len > FN_LIMIT * 2 ? 'high' : 'medium',
          title: `Long function: ${fn.name} (${len} lines)`,
          file: f.path,
          line: fn.start,
          lineEnd: fn.end,
          snippet: fn.sig,
          suggestion: `Break into smaller focused functions (configured limit: ${FN_LIMIT} lines)`,
        });
      }
      if (fn.params > PARAM_LIMIT) {
        issues.push({
          severity: 'medium',
          title: `Too many parameters: ${fn.name} (${fn.params})`,
          file: f.path,
          line: fn.start,
          lineEnd: fn.end,
          snippet: fn.sig,
          suggestion: `Use an options/config object instead (configured limit: ${PARAM_LIMIT} params)`,
        });
      }
    }

    // God file — too many functions
    if (fns.length > 20) {
      issues.push({
        severity: 'medium',
        title: `God file — ${fns.length} functions in one file`,
        file: f.path,
        line: 1,
        lineEnd: f.lines,
        suggestion: 'Cluster functions by responsibility and split into modules',
      });
    }

    // Deep nesting — find the actual deepest line
    const nestResult = detectMaxNesting(lines, f.lang);
    if (nestResult.depth > NEST_LIMIT) {
      issues.push({
        severity: nestResult.depth > 6 ? 'high' : 'medium',
        title: `Deep nesting — ${nestResult.depth} levels`,
        file: f.path,
        line: nestResult.line,
        lineEnd: nestResult.line,
        suggestion: 'Use early returns, extract functions, or invert conditions to reduce nesting',
      });
    }
  }

  return issues;
}

function extractFunctions(f, lines) {
  const lang = f.lang;
  if (['js','ts','jsx','tsx'].includes(lang)) return extractJSFunctions(lines);
  if (lang === 'py') return extractPyFunctions(lines);
  if (['java','cs','kt','go','rs','cpp','c','php','rb'].includes(lang)) return extractCLikeFunctions(lines);
  return [];
}

function extractJSFunctions(lines) {
  const fns = [];
  // Match: function foo(, async function foo(, export function foo(, const foo = (...) =>  {, foo(...) {  (method)
  const re = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s+(\w+)\s*\(([^)]*)\)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?([^)=]*)\)?\s*=>|(\w+)\s*\(([^)]*)\)\s*\{)/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(re);
    if (m) {
      const name = m[1] || m[3] || m[5] || 'anonymous';
      const rawParams = m[2] || m[4] || m[6] || '';
      const params = rawParams.split(',').filter(p => p.trim().length > 0).length;
      const end = findBraceEnd(lines, i);
      fns.push({ name, params, start: i + 1, end: end + 1, sig: line.trim().slice(0, 80) });
      i = end + 1;
    } else {
      i++;
    }
  }
  return fns;
}

function extractPyFunctions(lines) {
  const fns = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/);
    if (!m) continue;
    const indent = m[1].length;
    const name = m[2];
    const rawParams = m[3];
    const params = rawParams.split(',').filter(p => {
      const t = p.trim();
      return t && t !== 'self' && t !== 'cls' && !t.startsWith('*');
    }).length;

    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      const nl = lines[j];
      if (nl.trim() === '') continue;
      const ni = nl.match(/^(\s*)/)[1].length;
      if (ni <= indent) { end = j - 1; break; }
      end = j;
    }
    fns.push({ name, params, start: i + 1, end: end + 1, sig: lines[i].trim().slice(0, 80) });
  }
  return fns;
}

function extractCLikeFunctions(lines) {
  const fns = [];
  // Match: returnType name(params) { — heuristic
  const re = /^\s*(?:public|private|protected|static|override|virtual|async|func|fn|def)?\s*\w[\w<>\[\]]*\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+\w+\s*)?\{?\s*$/;
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(re);
    if (m && !/\b(if|for|while|switch|catch|foreach)\b/.test(m[0])) {
      const name = m[1];
      const rawParams = m[2] || '';
      const params = rawParams.split(',').filter(p => p.trim()).length;
      const end = findBraceEnd(lines, i);
      if (end > i) {
        fns.push({ name, params, start: i + 1, end: end + 1, sig: lines[i].trim().slice(0, 80) });
        i = end + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  return fns;
}

function findBraceEnd(lines, startIdx) {
  let depth = 0, started = false;
  for (let j = startIdx; j < Math.min(lines.length, startIdx + 500); j++) {
    for (const ch of lines[j]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    if (started && depth === 0) return j;
  }
  return Math.min(lines.length - 1, startIdx + 100);
}

function detectMaxNesting(lines, lang) {
  let maxDepth = 0, depth = 0, maxLine = 1;
  const isPy = lang === 'py';

  if (isPy) {
    lines.forEach((line, i) => {
      if (!line.trim() || line.trim().startsWith('#')) return;
      const indent = line.match(/^(\s*)/)[1].length;
      const level = Math.floor(indent / 4);
      if (level > maxDepth) { maxDepth = level; maxLine = i + 1; }
    });
    return { depth: maxDepth, line: maxLine };
  }

  // Brace-counting for C-like
  lines.forEach((line, i) => {
    if (/^\s*\/\/|^\s*\*/.test(line)) return;
    for (const ch of line) {
      if (ch === '{') { depth++; if (depth > maxDepth) { maxDepth = depth; maxLine = i + 1; } }
      else if (ch === '}') depth = Math.max(0, depth - 1);
    }
  });
  return { depth: maxDepth, line: maxLine };
}
