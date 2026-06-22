/* split-suggest.js — Heuristic function and file split suggestions (no AI) */

async function analyzeSplitTips(files) {
  const tips = [];
  const MIN_FN_LINES = window.state?.settings?.fnLines ?? 60;

  for (const f of files) {
    if (!f.content || f.lines < 60) continue;
    const lang = f.lang;
    if (!['js','ts','jsx','tsx','py','go','java','cs','kt','rs','php','rb'].includes(lang)) continue;

    const lines = f.content.split('\n');

    // ── Extract functions ──────────────────────────────────
    const fns = extractFnsForSplit(f, lines);

    for (const fn of fns) {
      const fnLines = lines.slice(fn.start - 1, fn.end);
      if (fnLines.length < MIN_FN_LINES) continue;

      const splitPoints = findSplitPoints(fnLines, fn.start, lang);
      if (splitPoints.length >= 2) {
        tips.push({
          severity: 'low',
          title: `Split suggestion: ${fn.name} (${fnLines.length} lines, ${splitPoints.length} natural blocks)`,
          file: f.path,
          line: fn.start,
          lineEnd: fn.end,
          snippet: fn.sig,
          suggestion: buildSplitSuggestion(fn.name, splitPoints),
          splitPoints,
        });
      }

      // #37 Param subset — block that uses only subset of params
      const paramSplit = findParamSubsetSplit(fn, fnLines, lang);
      if (paramSplit) {
        tips.push({
          severity: 'low',
          title: `Extractable block in ${fn.name}: uses only ${paramSplit.usedParams.join(', ')} of ${fn.params} params`,
          file: f.path,
          line: paramSplit.blockStart,
          lineEnd: paramSplit.blockEnd,
          snippet: fn.sig,
          suggestion: `Lines ${paramSplit.blockStart}–${paramSplit.blockEnd} only need (${paramSplit.usedParams.join(', ')}) — extract to a dedicated function`,
        });
      }

      // #38 Loop body extraction — loop body > 10 lines
      const loopTips = findLongLoopBodies(fn, fnLines, lang);
      for (const lt of loopTips) {
        tips.push({
          severity: 'low',
          title: `Long loop body in ${fn.name} (${lt.bodyLen} lines)`,
          file: f.path,
          line: lt.loopLine,
          lineEnd: lt.loopEnd,
          snippet: fn.sig,
          suggestion: `Extract the ${lt.bodyLen}-line ${lt.type} body starting at line ${lt.loopLine} into a named function`,
        });
      }
    }

    // ── File split: noun grouping (#39) ───────────────────
    if (f.lines > 300 && fns.length > 10) {
      const fileSplit = suggestFileSplit(f, fns, lines);
      if (fileSplit) {
        tips.push({
          severity: 'low',
          title: `Split file: ${f.name} (${f.lines} lines, ${fns.length} fns)`,
          file: f.path,
          line: 1,
          suggestion: fileSplit,
        });
      }
    }

    // ── File split: call isolation (#40) ──────────────────
    if (fns.length >= 6) {
      const isolation = findCallIsolationSplit(f, fns, lines);
      if (isolation) {
        tips.push({
          severity: 'low',
          title: `Call-isolated groups in ${f.name} — functions that never call each other`,
          file: f.path,
          line: 1,
          suggestion: isolation,
        });
      }
    }
  }

  return tips;
}

/* ── Find natural split points in a function ─────────── */
function findSplitPoints(fnLines, startLine, lang) {
  const points = [];
  let currentBlock = { start: startLine, label: null, lines: [] };
  let blankRun = 0;

  for (let i = 0; i < fnLines.length; i++) {
    const line = fnLines[i];
    const trimmed = line.trim();
    const absLine = startLine + i;

    // Comment-based split (// Step 1:, # Validate, etc.)
    const commentLabel = extractSectionComment(trimmed, lang);
    if (commentLabel && i > 2) {
      if (currentBlock.lines.length > 3) {
        points.push({ ...currentBlock, end: absLine - 1 });
      }
      currentBlock = { start: absLine, label: commentLabel, lines: [] };
      blankRun = 0;
      continue;
    }

    // Blank-line-based split (3+ consecutive blank lines or clear paragraph)
    if (!trimmed) {
      blankRun++;
      if (blankRun >= 2 && currentBlock.lines.length > 4 && i < fnLines.length - 4) {
        points.push({ ...currentBlock, end: absLine - blankRun });
        currentBlock = { start: absLine + 1, label: null, lines: [] };
        blankRun = 0;
      }
    } else {
      blankRun = 0;
      currentBlock.lines.push(trimmed);
    }
  }

  if (currentBlock.lines.length > 3) {
    points.push({ ...currentBlock, end: startLine + fnLines.length - 1 });
  }

  return points;
}

function extractSectionComment(line, lang) {
  // JS/TS: // Step 1: validate  or  /* Phase 2 */
  if (['js','ts','jsx','tsx','go','java','cs','kt','rs'].includes(lang)) {
    let m = line.match(/^\/\/\s*(?:step\s*\d*[:.]\s*|phase\s*\d*[:.]\s*|[-─=*]{2,}\s*)?(.{4,50})/i);
    if (m) return m[1].trim().slice(0, 40);
    m = line.match(/^\/\*\*?\s*(.{4,50})\s*\*?\//);
    if (m) return m[1].trim().slice(0, 40);
  }
  // Python: # Step 1: validate
  if (lang === 'py') {
    const m = line.match(/^#\s*(?:step\s*\d*[:.]\s*|phase\s*\d*[:.]\s*|[-─=*]{2,}\s*)?(.{4,50})/i);
    if (m) return m[1].trim().slice(0, 40);
  }
  return null;
}

function buildSplitSuggestion(fnName, points) {
  const subFns = points.map((p, i) => {
    // Prefer comment-derived name, fall back to meaningful suffix based on position
    const suffix = ['validate', 'prepare', 'process', 'execute', 'finalize', 'cleanup'];
    const label = p.label
      ? labelToFnName(p.label)
      : `${fnName}_${suffix[i] || `step${i + 1}`}`;
    const lineInfo = p.end ? `lines ${p.start}–${p.end}` : `from line ${p.start}`;
    return `→ ${label}() — ${lineInfo}${p.label ? ` ("${p.label}")` : ''}`;
  });
  return `Split '${fnName}' into ${points.length} focused functions:\n${subFns.join('\n')}`;
}

function labelToFnName(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 30);
}

/* ── File split suggestions ──────────────────────────── */
function suggestFileSplit(f, fns, lines) {
  if (fns.length < 8) return null;

  // Group functions by the noun they operate on
  // e.g. createUser, deleteUser, getUser → "user" group
  const nounGroups = {};
  fns.forEach(fn => {
    const parts = splitCamelSnake(fn.name);
    if (parts.length < 2) return;
    // The noun is usually the last meaningful part
    const noun = parts[parts.length - 1].toLowerCase();
    if (noun.length < 3) return;
    if (!nounGroups[noun]) nounGroups[noun] = [];
    nounGroups[noun].push(fn.name);
  });

  // Find groups with 3+ functions on same noun
  const bigGroups = Object.entries(nounGroups)
    .filter(([, fns]) => fns.length >= 3)
    .sort((a, b) => b[1].length - a[1].length);

  if (bigGroups.length < 2) return null;

  const parts = bigGroups.slice(0, 3).map(([noun, fns]) =>
    `→ ${noun}.${f.name.split('.').pop()} (${fns.length} fns: ${fns.slice(0,3).join(', ')}${fns.length > 3 ? '…' : ''})`
  );

  return `Split ${f.name} by responsibility:\n${parts.join('\n')}`;
}

/* ── Helpers ─────────────────────────────────────────── */
function splitCamelSnake(name) {
  if (!name) return [];
  if (name.includes('_')) return name.split('_').filter(Boolean);
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ').filter(Boolean);
}

function extractFnsForSplit(f, lines) {
  const fns = [];
  const lang = f.lang;
  const pyRe  = /^\s*(?:async\s+)?def\s+(\w+)\s*\(/;
  const jsRe  = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(|^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?/;
  const genRe = /^\s*(?:public|private|protected|func|fn|def|fun)\s+(?:[\w<>[\]?]+\s+)?(\w+)\s*\(/;
  const re = lang === 'py' ? pyRe : ['js','ts','jsx','tsx'].includes(lang) ? jsRe : genRe;

  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(re);
    if (m) {
      const name = m[1] || m[2];
      if (name) {
        const end = lang === 'py' ? findPyEnd(lines, i) : findBraceEnd(lines, i);
        fns.push({ name, sig: lines[i].trim().slice(0,80), start: i+1, end: end+1 });
        i = end + 1;
      } else { i++; }
    } else { i++; }
  }
  return fns;
}

/* #37 — Param subset: find a contiguous block using only ≤2 params of N */
function findParamSubsetSplit(fn, fnLines, lang) {
  if (fn.params <= 3) return null;
  // Extract param names from signature
  const sigMatch = fn.sig.match(/\(([^)]*)\)/);
  if (!sigMatch) return null;
  const allParams = sigMatch[1].split(',')
    .map(p => p.trim().replace(/[*:=].*/, '').replace(/^\w+\s+/, '').trim())
    .filter(p => p && p.length > 1 && !['self','cls','this'].includes(p));
  if (allParams.length <= 3) return null;

  // Scan blocks (separated by blank lines) and check param usage
  let blockStart = fn.start;
  let blockLines = [];
  for (let i = 0; i < fnLines.length; i++) {
    const abs = fn.start + i;
    if (!fnLines[i].trim()) {
      if (blockLines.length > 4) {
        const blockText = blockLines.join('\n');
        const used = allParams.filter(p => new RegExp(`\\b${p}\\b`).test(blockText));
        if (used.length > 0 && used.length <= 2) {
          return { blockStart, blockEnd: abs - 1, usedParams: used };
        }
      }
      blockStart = abs + 1;
      blockLines = [];
    } else {
      blockLines.push(fnLines[i]);
    }
  }
  return null;
}

/* #38 — Long loop bodies */
function findLongLoopBodies(fn, fnLines, lang) {
  const tips = [];
  const loopRe = /^\s*(?:for|while|foreach)\s*[(\s]/i;
  for (let i = 0; i < fnLines.length - 10; i++) {
    if (!loopRe.test(fnLines[i])) continue;
    const loopLine = fn.start + i;
    // Find loop body end via brace counting
    let depth = 0, started = false, bodyEnd = loopLine;
    for (let j = i; j < Math.min(fnLines.length, i + 200); j++) {
      for (const ch of fnLines[j]) {
        if (ch === '{') { depth++; started = true; }
        else if (ch === '}') depth--;
      }
      if (started && depth === 0) { bodyEnd = fn.start + j; break; }
    }
    const bodyLen = bodyEnd - loopLine;
    if (bodyLen > 10) {
      tips.push({ loopLine, loopEnd: bodyEnd, bodyLen, type: /^while/i.test(fnLines[i].trim()) ? 'while' : 'for' });
    }
  }
  return tips.slice(0, 2); // max 2 per function
}

/* #40 — File split: call isolation (functions that never call each other) */
function findCallIsolationSplit(f, fns, lines) {
  if (fns.length < 6) return null;
  const content = f.content;
  // Build call adjacency: which functions call which other functions in this file
  const fnNames = new Set(fns.map(fn => fn.name));
  const calls = {}; // fn.name → Set of fn names it calls
  fns.forEach(fn => {
    calls[fn.name] = new Set();
    const body = lines.slice(fn.start - 1, fn.end).join('\n');
    fnNames.forEach(other => {
      if (other !== fn.name && new RegExp(`\\b${other}\\s*\\(`).test(body)) {
        calls[fn.name].add(other);
      }
    });
  });

  // Find clusters: fns with no calls to/from each other
  const visited = new Set();
  const groups = [];
  for (const fn of fns) {
    if (visited.has(fn.name)) continue;
    const group = new Set([fn.name]);
    const queue = [fn.name];
    while (queue.length) {
      const cur = queue.pop();
      for (const other of (calls[cur] || [])) {
        if (!group.has(other)) { group.add(other); queue.push(other); }
      }
      // Also check who calls cur
      fns.forEach(other => {
        if (!group.has(other.name) && (calls[other.name] || new Set()).has(cur)) {
          group.add(other.name); queue.push(other.name);
        }
      });
    }
    group.forEach(n => visited.add(n));
    groups.push([...group]);
  }

  if (groups.length < 2) return null;
  const bigGroups = groups.filter(g => g.length >= 2).slice(0, 3);
  if (bigGroups.length < 2) return null;

  return `Split ${f.name} — ${bigGroups.length} isolated function groups found:\n` +
    bigGroups.map((g, i) => `→ Module ${i+1}: ${g.slice(0,4).join(', ')}${g.length > 4 ? `… (${g.length} fns)` : ''}`).join('\n');
}

function findBraceEnd(lines, start) {
  let depth = 0, started = false;
  for (let j = start; j < Math.min(lines.length, start + 400); j++) {
    for (const ch of lines[j]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    if (started && depth === 0) return j;
  }
  return Math.min(lines.length - 1, start + 80);
}

function findPyEnd(lines, start) {
  const indent = (lines[start].match(/^(\s*)/) || ['',''])[1].length;
  for (let j = start + 1; j < lines.length; j++) {
    if (!lines[j].trim()) continue;
    if ((lines[j].match(/^(\s*)/) || ['',''])[1].length <= indent) return j - 1;
  }
  return lines.length - 1;
}
