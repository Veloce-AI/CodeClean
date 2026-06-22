/* cyclomatic.js — Cyclomatic complexity per function (CC = 1 + decision points) */

async function analyzeCyclomatic(files) {
  const issues = [];
  const DECISION_RE = /\b(if|else\s+if|elif|for|while|do|case|catch|&&|\|\||(?<!\?)\?(?!\?))/g;

  for (const f of files) {
    if (!f.content) continue;
    if (!['js','ts','jsx','tsx','py','go','java','cs','kt','rs','php','rb','cpp','c'].includes(f.lang)) continue;

    const lines = f.content.split('\n');
    const fns = extractFnsCC(f, lines);

    for (const fn of fns) {
      const body = lines.slice(fn.start - 1, fn.end).join('\n');
      const matches = body.match(DECISION_RE) || [];
      const cc = 1 + matches.length;

      const ccLimit = window.state?.settings?.ccLimit ?? 8;
      if (cc < ccLimit) continue;

      const severity = cc >= 25 ? 'high' : cc >= 15 ? 'medium' : 'low';
      const rating = cc >= 25 ? 'untestable' : cc >= 15 ? 'complex' : 'moderate';

      issues.push({
        severity,
        title: `${fn.name} — CC ${cc} (${rating})`,
        file: f.path,
        line: fn.start,
        lineEnd: fn.end,
        snippet: fn.sig,
        suggestion: cc >= 25
          ? `CC ${cc} is untestable. Break into ≤5 CC sub-functions. Each branch should be its own function.`
          : cc >= 15
          ? `CC ${cc} means ~${cc} test cases needed. Extract the inner branches into named helper functions.`
          : `CC ${cc} — consider extracting 2-3 branches to reduce cognitive load.`,
        cc,
      });
    }
  }

  // Sort: worst first
  return issues.sort((a, b) => (b.cc || 0) - (a.cc || 0));
}

function extractFnsCC(f, lines) {
  const fns = [];
  const lang = f.lang;
  const pyRe   = /^\s*(?:async\s+)?def\s+(\w+)\s*\(/;
  const jsRe   = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(|^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?/;
  const genRe  = /^\s*(?:public|private|protected|static|override|func|fn|def|fun|sub|procedure)[\w\s<>[\]*&?]*\s+(\w+)\s*\(/;
  const re = lang === 'py' ? pyRe : ['js','ts','jsx','tsx'].includes(lang) ? jsRe : genRe;

  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(re);
    if (m) {
      const name = m[1] || m[2];
      if (name && name.length > 1) {
        const end = lang === 'py' ? findPyEndCC(lines, i) : findBraceEndCC(lines, i);
        if (end > i + 3) {
          fns.push({ name, sig: lines[i].trim().slice(0, 80), start: i + 1, end: end + 1 });
          i = end + 1;
          continue;
        }
      }
    }
    i++;
  }
  return fns;
}

function findBraceEndCC(lines, start) {
  let depth = 0, started = false;
  for (let j = start; j < Math.min(lines.length, start + 500); j++) {
    for (const ch of lines[j]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    if (started && depth === 0) return j;
  }
  return Math.min(lines.length - 1, start + 80);
}

function findPyEndCC(lines, start) {
  const indent = (lines[start].match(/^(\s*)/) || ['',''])[1].length;
  for (let j = start + 1; j < lines.length; j++) {
    if (!lines[j].trim()) continue;
    if ((lines[j].match(/^(\s*)/) || ['',''])[1].length <= indent) return j - 1;
  }
  return lines.length - 1;
}
