/* code-patterns.js — Hardcoded URLs, function naming, TODO density, long regex, N+1 queries */

async function analyzeCodePatterns(files) {
  const issues = [];

  for (const f of files) {
    if (!f.content) continue;
    const lines = f.content.split('\n');
    const lang = f.lang;

    /* ── Hardcoded URLs ──────────────────────────────────── */
    const urlIssues = new Set();
    lines.forEach((line, idx) => {
      // localhost / 127.0.0.1 in non-test, non-config files
      if (/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/.test(line)) {
        if (!/test|spec|config|\.env|fixture/i.test(f.path)) {
          const key = `${f.path}:${idx}`;
          if (!urlIssues.has(key)) {
            urlIssues.add(key);
            issues.push({
              severity: 'medium',
              title: 'Hardcoded localhost URL',
              file: f.path, line: idx + 1,
              snippet: line.trim().slice(0, 80),
              suggestion: 'Move to environment config: `BASE_URL = os.getenv("API_URL", "http://localhost:8000")`',
            });
          }
        }
      }
      // Private IP ranges
      if (/https?:\/\/(?:192\.168\.|10\.\d+\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(line)) {
        issues.push({
          severity: 'medium',
          title: 'Hardcoded private IP address',
          file: f.path, line: idx + 1,
          snippet: line.trim().slice(0, 80),
          suggestion: 'Use environment variables or service discovery instead of hardcoded IP addresses.',
        });
      }
      // Hardcoded external domain (non-localhost, non-CDN)
      const domainMatch = line.match(/['"`]https?:\/\/((?!cdn\.|fonts\.|githubusercontent\.com|unpkg\.com|cdnjs\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?::\d+)?\/[^'"`]{0,60}['"`]/);
      if (domainMatch && !/test|spec|example\.com|localhost/.test(domainMatch[0])) {
        issues.push({
          severity: 'low',
          title: `Hardcoded URL: ${domainMatch[1]}`,
          file: f.path, line: idx + 1,
          snippet: line.trim().slice(0, 80),
          suggestion: 'Store API base URLs in config/environment variables so they can change per environment.',
        });
      }
    });

    /* ── Function naming quality ─────────────────────────── */
    const MEANINGLESS = new Set(['foo','bar','baz','test','temp','tmp','data','val','ret','res','obj','ptr','ref','buf','p','q','r','s','t','n','m','x2','y2','a1','b1','helper','util','stuff','thing','misc','other','handle','process2','update2','init2','setup2']);
    lines.forEach((line, idx) => {
      let fnName = null;
      if (['js','ts','jsx','tsx'].includes(lang)) {
        const m = line.match(/function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
        if (m) fnName = m[1] || m[2];
      } else if (lang === 'py') {
        const m = line.match(/def\s+(\w+)\s*\(/);
        if (m) fnName = m[1];
      }
      if (fnName && MEANINGLESS.has(fnName.toLowerCase())) {
        issues.push({
          severity: 'low',
          title: `Meaningless function name: ${fnName}()`,
          file: f.path, line: idx + 1,
          snippet: line.trim().slice(0, 80),
          suggestion: `Rename \`${fnName}\` to describe what it does: use a verb + noun pattern like \`processOrder()\` or \`validateUser()\`.`,
        });
      }
      // Single or two-letter function names (outside loops)
      if (fnName && fnName.length <= 2 && !['is','on','do','go','db','fs','io'].includes(fnName.toLowerCase())) {
        issues.push({
          severity: 'low',
          title: `Too short function name: ${fnName}()`,
          file: f.path, line: idx + 1,
          snippet: line.trim().slice(0, 80),
          suggestion: 'Function names should describe their purpose. Even `getX()` is better than `x()`.',
        });
      }
    });

    /* ── Long regex patterns ─────────────────────────────── */
    lines.forEach((line, idx) => {
      const reMatch = line.match(/\/([^\/\n]{80,})\/[gimsuy]*/);
      if (reMatch) {
        const prevLine = lines[idx - 1] || '';
        const hasComment = /\/\/|#/.test(prevLine);
        if (!hasComment) {
          issues.push({
            severity: 'low',
            title: `Complex regex (${reMatch[1].length} chars) — needs a comment`,
            file: f.path, line: idx + 1,
            snippet: ('/' + reMatch[1].slice(0, 50) + '...').slice(0, 80),
            suggestion: 'Add a comment above the regex explaining what it matches. Consider breaking it into named parts using a verbose mode.',
          });
        }
      }
      // Python raw string regex r"..."
      const pyReMatch = line.match(/r['"]([^'"]{80,})['"]/);
      if (pyReMatch) {
        issues.push({
          severity: 'low',
          title: `Complex regex (${pyReMatch[1].length} chars) — needs a comment`,
          file: f.path, line: idx + 1,
          snippet: line.trim().slice(0, 80),
          suggestion: 'Use `re.VERBOSE` flag with `re.compile(r"""pattern""", re.VERBOSE)` to add inline comments.',
        });
      }
    });

    /* ── TODO density ────────────────────────────────────── */
    const todoLines = lines.filter(l => /TODO|FIXME|HACK|XXX/i.test(l));
    const todoDensity = todoLines.length / Math.max(lines.length, 1);
    if (todoDensity > 0.05 && todoLines.length >= 5) { // > 5% of lines are TODOs
      issues.push({
        severity: 'medium',
        title: `High TODO density: ${todoLines.length} TODOs in ${lines.length} lines (${Math.round(todoDensity * 100)}%)`,
        file: f.path, line: 1,
        suggestion: 'High TODO density signals incomplete or unstable code. Resolve, delete, or track in an issue tracker with ticket references.',
      });
    }

    /* ── N+1 query detection ─────────────────────────────── */
    // Detect ORM query patterns inside loops
    const ORM_PATTERNS = [
      /\.filter\s*\(/, /\.get\s*\(/, /\.find\s*\(/, /\.findOne\s*\(/,
      /\.query\s*\(/, /\.execute\s*\(/, /\.fetch\s*\(/, /\.select\s*\(/,
      /\.objects\./, /Model\./, /db\.session\./,
    ];
    const LOOP_PATTERNS = [/^\s*for\s/, /^\s*while\s/, /\.forEach\s*\(/, /\.map\s*\(/, /\.filter\s*\(.*=>/];

    let inLoop = false, loopDepth = 0;
    lines.forEach((line, idx) => {
      const isLoopStart = LOOP_PATTERNS.some(re => re.test(line));
      if (isLoopStart) { inLoop = true; loopDepth = 0; }
      if (inLoop) {
        for (const ch of line) { if (ch === '{' || ch === '(') loopDepth++; else if (ch === '}' || ch === ')') loopDepth--; }
        if (loopDepth <= 0 && idx > 0) inLoop = false;
        const hasQuery = ORM_PATTERNS.some(re => re.test(line));
        if (hasQuery && inLoop && !isLoopStart) {
          issues.push({
            severity: 'high',
            title: 'Possible N+1 query — DB query inside a loop',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Fetch all needed data before the loop using batch queries, eager loading (`select_related`, `include`), or `IN` clauses. Each loop iteration hitting the DB causes N queries instead of 1.',
          });
        }
      }
    });
  }

  // Dedup
  const seen = new Set();
  return issues.filter(i => {
    const k = `${i.file}:${i.line}:${i.title.slice(0,40)}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}
