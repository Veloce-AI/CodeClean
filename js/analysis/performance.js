/* performance.js — Performance anti-patterns across languages */

async function analyzePerformance(files) {
  const issues = [];

  for (const f of files) {
    if (!f.content) continue;
    const lines = f.content.split('\n');
    const lang = f.lang;
    const isTest = /test|spec|__tests__/.test(f.path.toLowerCase());

    /* ── JavaScript / TypeScript ─────────────────────────── */
    if (['js','ts','jsx','tsx'].includes(lang)) {

      // Array mutation inside .map() / .filter() — side effects
      lines.forEach((line, idx) => {
        if (/\.(map|filter|forEach|reduce)\s*\(/.test(line)) {
          const block = lines.slice(idx, Math.min(lines.length, idx + 8)).join('\n');
          if (/\bpush\s*\(|\bsplice\s*\(|\bpop\s*\(|\bshift\s*\(|\bunshift\s*\(/.test(block)) {
            issues.push({
              severity: 'low',
              title: 'Array mutation inside .map()/.filter() — use reduce or a for loop',
              file: f.path, line: idx + 1,
              snippet: line.trim().slice(0, 80),
              suggestion: 'Mutating arrays inside functional iterators creates confusing side effects. Use .reduce() to build a new array, or use a plain for loop if mutation is intended.',
            });
          }
        }
      });

      // JSON.parse / JSON.stringify inside a loop
      let inLoop = false;
      lines.forEach((line, idx) => {
        if (/^\s*(?:for|while)\s*\(/.test(line)) inLoop = true;
        if (inLoop && /JSON\.(parse|stringify)\s*\(/.test(line)) {
          issues.push({
            severity: 'medium',
            title: 'JSON.parse/stringify inside a loop — performance bottleneck',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Move JSON serialization outside the loop. JSON operations are expensive and can become O(n²) when nested.',
          });
          inLoop = false;
        }
        if (/^\s*\}/.test(line)) inLoop = false;
      });

      // Synchronous XHR / blocking fetch
      lines.forEach((line, idx) => {
        if (/XMLHttpRequest/.test(line) && /open\s*\(.+false/.test(lines.slice(idx, idx + 5).join('\n'))) {
          issues.push({
            severity: 'high',
            title: 'Synchronous XMLHttpRequest blocks the UI thread',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Use `fetch()` with async/await or callbacks instead. Synchronous XHR freezes the browser UI.',
          });
        }
      });

      // document.querySelector inside a loop
      inLoop = false;
      lines.forEach((line, idx) => {
        if (/^\s*(?:for|while)\s*\(/.test(line)) inLoop = true;
        if (inLoop && /document\.(querySelector|getElementById|getElementsBy)\s*\(/.test(line)) {
          issues.push({
            severity: 'medium',
            title: 'DOM query inside a loop — cache the result outside',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'DOM queries force a layout reflow. Cache the result before the loop: `const el = document.getElementById("x"); for (...) { el.style... }`',
          });
          inLoop = false;
        }
        if (/^\s*\}/.test(line)) inLoop = false;
      });

      // Deeply chained .filter().map().reduce() — multiple passes
      lines.forEach((line, idx) => {
        const chainCount = (line.match(/\.(filter|map|reduce|forEach|find|some|every)\s*\(/g) || []).length;
        if (chainCount >= 3) {
          issues.push({
            severity: 'low',
            title: `${chainCount}-step array chain — consider single .reduce() pass`,
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: `Chaining ${chainCount} array methods makes ${chainCount} passes over the data. Combine into a single .reduce() for large arrays: it's O(n) instead of O(${chainCount}n).`,
          });
        }
      });

      // React: missing key prop in list rendering
      if (['jsx','tsx'].includes(lang)) {
        lines.forEach((line, idx) => {
          if (/\.map\s*\(/.test(line)) {
            const block = lines.slice(idx, Math.min(lines.length, idx + 6)).join('\n');
            if (/<\w/.test(block) && !/key\s*=/.test(block)) {
              issues.push({
                severity: 'medium',
                title: 'React: missing key prop in list render',
                file: f.path, line: idx + 1,
                snippet: line.trim().slice(0, 80),
                suggestion: 'Add a stable unique key to each rendered element: `items.map(item => <Row key={item.id} .../>)`. Using index as key causes re-render bugs when the list order changes.',
              });
            }
          }
        });

        // React: inline object/function creation in JSX props — triggers re-render every time
        lines.forEach((line, idx) => {
          if (/\bonChange\s*=\s*\{\s*\(|onSubmit\s*=\s*\{\s*\(|style\s*=\s*\{\s*\{/.test(line)) {
            issues.push({
              severity: 'low',
              title: 'Inline function/object in JSX prop — creates new reference every render',
              file: f.path, line: idx + 1,
              snippet: line.trim().slice(0, 80),
              suggestion: 'Extract to a named handler or wrap with useCallback/useMemo. Inline props break React.memo and cause unnecessary child re-renders.',
            });
          }
        });
      }
    }

    /* ── Python ─────────────────────────────────────────── */
    if (lang === 'py' && !isTest) {

      // String concatenation in a loop (should use join or list)
      let inLoop = false;
      lines.forEach((line, idx) => {
        if (/^\s*for\s/.test(line)) inLoop = true;
        if (inLoop && /\bstr\s*\+=|\bresult\s*\+=\s*['"]|\btext\s*\+=/.test(line)) {
          issues.push({
            severity: 'medium',
            title: 'String concatenation in loop — O(n²) memory copies',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Build a list and join at the end: `parts = []; parts.append(x); result = "".join(parts)`. Each `+=` creates a new string object.',
          });
          inLoop = false;
        }
        if (!/^\s/.test(line) && line.trim()) inLoop = false;
      });

      // List comprehension vs explicit loop (minor but common)
      lines.forEach((line, idx) => {
        if (/^\s*(\w+)\s*=\s*\[\s*\]/.test(line)) {
          const listName = (line.match(/^\s*(\w+)\s*=\s*\[\s*\]/) || [])[1];
          if (listName) {
            const nextFew = lines.slice(idx + 1, idx + 5).join('\n');
            if (new RegExp(`${listName}\\.append\\s*\\(`).test(nextFew) && /^\s*for\s/.test(lines[idx + 1] || '')) {
              issues.push({
                severity: 'low',
                title: `Use list comprehension instead of append loop for '${listName}'`,
                file: f.path, line: idx + 1,
                snippet: line.trim().slice(0, 80),
                suggestion: `Replace the append pattern with: \`${listName} = [expr for x in iterable]\`. List comprehensions are faster (no method call overhead) and more readable.`,
              });
            }
          }
        }
      });

      // re.compile() called inside a loop (recompiles regex every iteration)
      inLoop = false;
      lines.forEach((line, idx) => {
        if (/^\s*for\s/.test(line)) inLoop = true;
        if (inLoop && /re\.(compile|match|search|findall|sub)\s*\(/.test(line)) {
          issues.push({
            severity: 'medium',
            title: 'Regex operation inside loop — compile outside for ~2× speedup',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Call `pattern = re.compile(r"...")` once before the loop. Python caches a small number of recent patterns but explicit compilation is more reliable and faster for repeated use.',
          });
          inLoop = false;
        }
        if (!/^\s/.test(line) && line.trim()) inLoop = false;
      });

      // Unnecessary list() conversion
      lines.forEach((line, idx) => {
        if (/\bfor\s+\w+\s+in\s+list\s*\(/.test(line)) {
          issues.push({
            severity: 'low',
            title: 'Unnecessary list() wrapping in for loop',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'for loops can iterate directly over generators, dicts, sets, and other iterables without converting to list first. Removing list() saves memory.',
          });
        }
      });
    }

    /* ── Go ─────────────────────────────────────────────── */
    if (lang === 'go') {
      // String concatenation in loop
      let inLoop = false;
      lines.forEach((line, idx) => {
        if (/^\s*for\s/.test(line)) inLoop = true;
        if (inLoop && /\bstr\s*\+=|\bresult\s*\+=\s*"/.test(line)) {
          issues.push({
            severity: 'medium',
            title: 'String concatenation in loop — use strings.Builder',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Use `var sb strings.Builder; sb.WriteString(s); result := sb.String()` — avoids O(n²) allocations from repeated string concatenation.',
          });
          inLoop = false;
        }
        if (!/^\s/.test(line) && line.trim()) inLoop = false;
      });
    }
  }

  const seen = new Set();
  return issues.filter(i => {
    const k = `${i.file}:${i.line}:${i.title.slice(0,40)}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}
