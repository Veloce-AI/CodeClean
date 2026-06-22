/* cog-complexity.js — Cognitive Complexity (SonarQube method)
   Unlike Cyclomatic Complexity (counts paths), Cognitive Complexity measures
   how hard code is to UNDERSTAND — nesting adds a multiplier per level.

   Rules:
   +1 for each: if, else if, else, for, while, do, switch, catch, break/continue with label,
                recursive call, logical operators in sequence (&&/||)
   +N nesting bonus for each level of nesting (N = current nesting depth)
   = CC: 1+1=2 for nested if; CogC: 1+(1+1)=3 for same nested if
*/

async function analyzeCogComplexity(files) {
  const issues = [];

  for (const f of files) {
    if (!f.content) continue;
    if (!['js','ts','jsx','tsx','py','go','java','cs','kt','rs','rb','php'].includes(f.lang)) continue;

    const lines = f.content.split('\n');
    const fns = extractFnsCog(f, lines);

    for (const fn of fns) {
      const body = lines.slice(fn.start - 1, fn.end);
      const cog = computeCogComplexity(body, f.lang);

      if (cog < 10) continue;

      const severity = cog >= 30 ? 'high' : cog >= 20 ? 'medium' : 'low';
      const label    = cog >= 30 ? 'very hard to understand' : cog >= 20 ? 'hard to understand' : 'moderately complex';

      issues.push({
        severity,
        title: `${fn.name} — Cognitive Complexity ${cog} (${label})`,
        file: f.path,
        line: fn.start,
        lineEnd: fn.end,
        snippet: fn.sig,
        suggestion: cog >= 20
          ? `Cognitive complexity ${cog} is too high. Extract the deepest nested blocks into named helper functions. Each helper should do exactly one thing.`
          : `Cognitive complexity ${cog} can be reduced by using early returns to flatten nesting and extracting conditional branches.`,
        cogScore: cog,
      });
    }
  }

  return issues.sort((a, b) => (b.cogScore || 0) - (a.cogScore || 0));
}

function computeCogComplexity(bodyLines, lang) {
  let score = 0;
  let nestingDepth = 0;

  // Track what increases nesting
  const NESTING_INC = lang === 'py'
    ? /^\s*(?:if|elif|for|while|with|try|except|class|def)\b/
    : /\b(?:if|else\s*if|for|while|do|switch|try|catch)\b.*\{?\s*$/;

  const FLAT_INC = lang === 'py'
    ? /^\s*(?:else|elif)\b/
    : /\belse\b/;

  const BOOL_SEQ = /&&|\|\|/g;

  // For Python, use indentation changes to track nesting
  let prevIndent = 0;

  bodyLines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) return;

    if (lang === 'py') {
      const indent = (line.match(/^(\s*)/) || ['',''])[1].replace(/\t/g, '    ').length;
      const level = Math.floor(indent / 4);
      nestingDepth = Math.max(0, level - 1); // -1 because fn body itself is nesting 0
      if (/^\s*(?:if|for|while|with|try|except|elif|else)\b/.test(line)) {
        score += 1 + nestingDepth;
        prevIndent = indent;
      }
    } else {
      // Brace-based languages
      let lineScore = 0;

      if (NESTING_INC.test(line)) {
        lineScore += 1 + nestingDepth;
        nestingDepth++;
      } else if (FLAT_INC.test(line)) {
        lineScore += 1; // else adds +1 but no nesting bonus
      }

      // Count closing braces to reduce nesting
      const opens  = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      if (closes > opens) nestingDepth = Math.max(0, nestingDepth - (closes - opens));

      // Boolean operator sequences: a && b && c = +1 (not +3)
      const boolMatches = line.match(BOOL_SEQ);
      if (boolMatches) lineScore += 1; // one penalty per line regardless of count

      score += lineScore;
    }
  });

  return score;
}

function extractFnsCog(f, lines) {
  const fns = [];
  const lang = f.lang;
  const pyRe  = /^\s*(?:async\s+)?def\s+(\w+)\s*\(/;
  const jsRe  = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(|^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?/;
  const genRe = /^\s*(?:public|private|protected|static|override|func|fn|def|fun)[\w\s<>[\]*&?]*\s+(\w+)\s*\(/;
  const re = lang === 'py' ? pyRe : ['js','ts','jsx','tsx'].includes(lang) ? jsRe : genRe;

  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(re);
    if (m) {
      const name = m[1] || m[2];
      if (name && name.length > 1) {
        const end = lang === 'py' ? findPyCogEnd(lines, i) : findBraceCogEnd(lines, i);
        if (end > i + 3) { fns.push({ name, sig: lines[i].trim().slice(0,80), start: i+1, end: end+1 }); i = end + 1; continue; }
      }
    }
    i++;
  }
  return fns;
}

function findBraceCogEnd(lines, start) {
  let d = 0, started = false;
  for (let j = start; j < Math.min(lines.length, start + 500); j++) {
    for (const ch of lines[j]) { if (ch==='{'){d++;started=true;}else if(ch==='}')d--; }
    if (started && d === 0) return j;
  }
  return Math.min(lines.length-1, start+80);
}

function findPyCogEnd(lines, start) {
  const indent = (lines[start].match(/^(\s*)/) || ['',''])[1].length;
  for (let j = start + 1; j < lines.length; j++) {
    if (!lines[j].trim()) continue;
    if ((lines[j].match(/^(\s*)/) || ['',''])[1].length <= indent) return j - 1;
  }
  return lines.length - 1;
}
