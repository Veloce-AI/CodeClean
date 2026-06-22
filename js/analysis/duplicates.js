/* duplicates.js — Exact block duplicates, structural duplicates, magic values */

async function analyzeDuplicates(files) {
  const issues = [];
  const codeFiles = files.filter(f => f.content && f.lines > 10 &&
    ['js','ts','jsx','tsx','py','go','java','cs','kt','rs','php','rb'].includes(f.lang)
  );

  // ── 1. Exact block duplicates (6-line sliding window) ──
  const WINDOW = window.state?.settings?.dupWindow ?? 6;
  const blockMap = new Map(); // hash → [{file, line, text}]

  for (const f of codeFiles) {
    const lines = f.content.split('\n');
    for (let i = 0; i <= lines.length - WINDOW; i++) {
      const block = lines.slice(i, i + WINDOW);
      // Skip windows that are mostly blank/comments
      const nonEmpty = block.filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('#'));
      if (nonEmpty.length < 4) continue;

      const hash = simpleHash(block.join('\n'));
      if (!blockMap.has(hash)) blockMap.set(hash, []);
      blockMap.get(hash).push({ file: f.path, line: i + 1, text: nonEmpty.slice(0, 2).join('\n').trim().slice(0, 80) });
    }
  }

  // Report pairs (only report once per hash)
  const reported = new Set();
  for (const [hash, occurrences] of blockMap) {
    if (occurrences.length < 2) continue;
    if (reported.has(hash)) continue;
    // Only report cross-file duplicates
    const files = [...new Set(occurrences.map(o => o.file))];
    if (files.length < 2) continue;

    reported.add(hash);
    const a = occurrences[0];
    const b = occurrences.find(o => o.file !== a.file) || occurrences[1];

    issues.push({
      severity: 'medium',
      title: `Duplicate code block (${WINDOW} lines)`,
      file: a.file,
      line: a.line,
      snippet: a.text,
      suggestion: `Same block found in ${b.file}:${b.line} — extract to a shared function`,
      meta: { fileB: b.file, lineB: b.line },
    });
  }

  // ── 2. Structural duplicates (function-level) ──────────
  const funcBodies = []; // {file, name, line, normalizedHash, paramCount}

  for (const f of codeFiles) {
    const fns = extractFnBodies(f);
    fns.forEach(fn => funcBodies.push({ ...fn, file: f.path }));
  }

  const structMap = new Map(); // normalizedHash → [{file, name, line}]
  funcBodies.forEach(fn => {
    if (!structMap.has(fn.hash)) structMap.set(fn.hash, []);
    structMap.get(fn.hash).push(fn);
  });

  const structReported = new Set();
  for (const [hash, matches] of structMap) {
    if (matches.length < 2) continue;
    const crossFile = [...new Set(matches.map(m => m.file))];
    if (crossFile.length < 2) continue;
    if (structReported.has(hash)) continue;
    structReported.add(hash);

    const a = matches[0];
    const b = matches.find(m => m.file !== a.file) || matches[1];
    const similarity = Math.round(100 - (levenshteinSim(a.body, b.body) * 100));

    issues.push({
      severity: 'medium',
      title: `Structurally similar functions: ${a.name} ↔ ${b.name}`,
      file: a.file,
      line: a.line,
      snippet: a.sig,
      suggestion: `${similarity}% similar to ${b.name} in ${b.file}:${b.line} — merge or extract shared logic`,
    });
  }

  // ── 3. Magic value repetition ──────────────────────────
  const literalMap = new Map(); // value → [{file, line}]

  for (const f of codeFiles) {
    if (!f.content) continue;
    const lines = f.content.split('\n');
    lines.forEach((line, idx) => {
      // String literals (non-trivial)
      const strRe = /(['"`])([a-zA-Z0-9_\-./]{6,})\1/g;
      let m;
      while ((m = strRe.exec(line)) !== null) {
        const val = m[2];
        if (isBoringLiteral(val)) continue;
        const key = `"${val}"`;
        if (!literalMap.has(key)) literalMap.set(key, []);
        literalMap.get(key).push({ file: f.path, line: idx + 1 });
      }
      // Number literals (non-trivial: not 0/1/2/100)
      const numRe = /\b(\d{3,})\b/g;
      while ((m = numRe.exec(line)) !== null) {
        const val = m[1];
        if (['100','200','404','500','1000'].includes(val)) continue;
        const key = `#${val}`;
        if (!literalMap.has(key)) literalMap.set(key, []);
        literalMap.get(key).push({ file: f.path, line: idx + 1 });
      }
    });
  }

  for (const [val, occurrences] of literalMap) {
    if (occurrences.length < 5) continue;
    const uniqueFiles = [...new Set(occurrences.map(o => o.file))];
    if (uniqueFiles.length < 2) continue;
    const first = occurrences[0];
    issues.push({
      severity: 'low',
      title: `Magic value repeated ${occurrences.length}× across ${uniqueFiles.length} files: ${val}`,
      file: first.file,
      line: first.line,
      suggestion: `Extract ${val} to a named constant in a shared config/constants file`,
    });
  }

  return issues;
}

/* ── Helpers ─────────────────────────────────────────── */

function simpleHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
}

function extractFnBodies(f) {
  const fns = [];
  if (!f.content) return fns;
  const lines = f.content.split('\n');

  const fRe = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/;
  const pyRe = /^\s*(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/;
  const re = ['py'].includes(f.lang) ? pyRe : fRe;

  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(re);
    if (m) {
      const name = m[1];
      const end = f.lang === 'py' ? findPyFnEnd(lines, i) : findBraceEnd2(lines, i);
      if (end > i + 4) { // only meaningful functions
        const body = lines.slice(i, end + 1).join('\n');
        const normalized = normalizeBody(body);
        if (normalized.length > 50) { // skip tiny functions
          fns.push({
            name,
            sig: lines[i].trim().slice(0, 80),
            line: i + 1,
            body: normalized,
            hash: simpleHash(normalized),
          });
        }
        i = end + 1;
      } else { i++; }
    } else { i++; }
  }
  return fns;
}

function normalizeBody(body) {
  // Replace variable names with $N placeholders to find structural similarity
  const varRe = /\b([a-z_][a-zA-Z0-9_]{2,})\b/g;
  const varMap = {};
  let counter = 0;
  return body.replace(varRe, (match) => {
    if (/^(const|let|var|def|return|if|else|for|while|function|import|from|async|await|true|false|null|undefined|self|this)$/.test(match)) {
      return match;
    }
    if (!(match in varMap)) varMap[match] = `$${counter++}`;
    return varMap[match];
  }).replace(/\s+/g, ' ').trim();
}

function findBraceEnd2(lines, startIdx) {
  let depth = 0, started = false;
  for (let j = startIdx; j < Math.min(lines.length, startIdx + 300); j++) {
    for (const ch of lines[j]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    if (started && depth === 0) return j;
  }
  return Math.min(lines.length - 1, startIdx + 50);
}

function findPyFnEnd(lines, startIdx) {
  const indent = (lines[startIdx].match(/^(\s*)/) || ['',''])[1].length;
  let end = startIdx;
  for (let j = startIdx + 1; j < lines.length; j++) {
    if (!lines[j].trim()) continue;
    const ni = (lines[j].match(/^(\s*)/) || ['',''])[1].length;
    if (ni <= indent) return j - 1;
    end = j;
  }
  return end;
}

function levenshteinSim(a, b) {
  if (a === b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  // Approximate: ratio of differing chars
  const minLen = Math.min(a.length, b.length);
  let diff = Math.abs(a.length - b.length);
  for (let i = 0; i < minLen; i++) if (a[i] !== b[i]) diff++;
  return Math.min(1, diff / maxLen);
}

function isBoringLiteral(val) {
  // Skip common strings
  return /^(true|false|null|undefined|get|set|post|put|delete|id|name|type|value|error|message|data|result|status|ok|yes|no|none|none|text|html|json|utf-8|utf8|ltr|rtl)$/.test(val.toLowerCase())
    || val.length > 60;
}
