/* memory-leaks.js — Detect common memory leak patterns in JS/TS/Python */

async function analyzeMemoryLeaks(files) {
  const issues = [];

  for (const f of files) {
    if (!f.content) continue;
    const lang = f.lang;
    const lines = f.content.split('\n');
    const isTest = /test|spec|__tests__/.test(f.path.toLowerCase());

    /* ── JavaScript / TypeScript ─────────────────────────── */
    if (['js','ts','jsx','tsx'].includes(lang)) {

      // Event listener added without removal
      const addListenerLines = [];
      const removeListenerLines = [];
      lines.forEach((line, idx) => {
        if (/\.addEventListener\s*\(/.test(line)) addListenerLines.push({ line: idx + 1, text: line.trim().slice(0, 80) });
        if (/\.removeEventListener\s*\(/.test(line)) removeListenerLines.push(idx + 1);
      });
      if (addListenerLines.length > 0 && removeListenerLines.length === 0) {
        addListenerLines.slice(0, 3).forEach(al => {
          issues.push({
            severity: 'medium',
            title: 'addEventListener without removeEventListener',
            file: f.path,
            line: al.line,
            snippet: al.text,
            suggestion: 'Always pair addEventListener with removeEventListener in a cleanup function (componentWillUnmount, useEffect cleanup, or AbortController). Leaking listeners prevent GC of closures and DOM nodes.',
          });
        });
      }

      // setInterval without clearInterval
      const setIntervalLines = [];
      const clearIntervalLines = [];
      lines.forEach((line, idx) => {
        if (/\bsetInterval\s*\(/.test(line)) setIntervalLines.push({ line: idx + 1, text: line.trim().slice(0, 80) });
        if (/\bclearInterval\s*\(/.test(line)) clearIntervalLines.push(idx + 1);
      });
      if (setIntervalLines.length > 0 && clearIntervalLines.length === 0) {
        setIntervalLines.slice(0, 2).forEach(si => {
          issues.push({
            severity: 'medium',
            title: 'setInterval without clearInterval',
            file: f.path,
            line: si.line,
            snippet: si.text,
            suggestion: 'Store the interval ID and call clearInterval(id) in cleanup: `const id = setInterval(...); return () => clearInterval(id);`',
          });
        });
      }

      // setTimeout in a loop — creates N timers
      let inLoop = false, loopStart = 0;
      lines.forEach((line, idx) => {
        if (/^\s*(?:for|while)\s*\(/.test(line)) { inLoop = true; loopStart = idx + 1; }
        if (inLoop && /\bsetTimeout\s*\(/.test(line)) {
          issues.push({
            severity: 'low',
            title: 'setTimeout inside a loop — creates N timers',
            file: f.path,
            line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Create a single timer outside the loop, or batch the work. Each iteration creates a new pending timer that prevents GC.',
          });
          inLoop = false;
        }
        if (inLoop && /^\s*\}/.test(line)) inLoop = false;
      });

      // Large data held in module-level closure / global
      lines.forEach((line, idx) => {
        if (/^(?:const|let|var)\s+\w+\s*=\s*\[\s*\]|^(?:const|let|var)\s+\w+\s*=\s*new\s+Map\s*\(|^(?:const|let|var)\s+\w+\s*=\s*new\s+Set\s*\(/.test(line.trim())) {
          // Module-level collection that grows — check if it ever gets cleared
          const name = (line.match(/(?:const|let|var)\s+(\w+)/) || [])[1];
          if (name) {
            const hasClean = lines.some(l => new RegExp(`\\b${name}\\.(clear|delete|splice|pop|shift)\\s*\\(`).test(l) || new RegExp(`\\b${name}\\s*=\\s*\\[`).test(l));
            if (!hasClean) {
              issues.push({
                severity: 'low',
                title: `Module-level collection '${name}' may grow unboundedly`,
                file: f.path,
                line: idx + 1,
                snippet: line.trim().slice(0, 80),
                suggestion: `'${name}' is a module-level collection with no clear/reset. If it accumulates entries over time it will leak memory. Add size limits or cleanup logic.`,
              });
            }
          }
        }
      });

      // React useEffect with async function but no cleanup
      if (['jsx','tsx'].includes(lang) || f.content.includes('useEffect')) {
        lines.forEach((line, idx) => {
          if (/useEffect\s*\(\s*(?:async\s*)?\(\s*\)\s*=>/.test(line)) {
            // Check if there's a return cleanup in the next 20 lines
            const block = lines.slice(idx, Math.min(lines.length, idx + 25)).join('\n');
            if (!/return\s*\(\s*\)\s*=>/.test(block) && !/return\s*\(\)\s*=>/.test(block) && !/return\s*function/.test(block)) {
              // Only flag if there are subscriptions/listeners in the block
              if (/addEventListener|setInterval|setTimeout|subscribe|on\(/.test(block)) {
                issues.push({
                  severity: 'medium',
                  title: 'useEffect with subscription but no cleanup return',
                  file: f.path,
                  line: idx + 1,
                  snippet: line.trim().slice(0, 80),
                  suggestion: 'Return a cleanup function from useEffect to unsubscribe/clear when the component unmounts: `useEffect(() => { const id = ...; return () => clearInterval(id); }, []);`',
                });
              }
            }
          }
        });
      }
    }

    /* ── Python ─────────────────────────────────────────── */
    if (f.lang === 'py' && !isTest) {

      // File handles opened without context manager
      lines.forEach((line, idx) => {
        if (/\bopen\s*\(/.test(line) && !/with\s+open\s*\(/.test(line) && !/^\s*#/.test(line)) {
          issues.push({
            severity: 'medium',
            title: 'File opened without context manager (with)',
            file: f.path,
            line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Use `with open(...) as f:` to ensure the file handle is always closed, even if an exception occurs.',
          });
        }
      });

      // Database connections not closed
      lines.forEach((line, idx) => {
        if (/\b(?:connect|create_engine|psycopg2|pymysql|sqlite3\.connect)\s*\(/.test(line)) {
          const block = lines.slice(idx, Math.min(lines.length, idx + 30)).join('\n');
          if (!/\.close\s*\(\s*\)|with\s+/.test(block)) {
            issues.push({
              severity: 'medium',
              title: 'Database connection may not be closed',
              file: f.path,
              line: idx + 1,
              snippet: line.trim().slice(0, 80),
              suggestion: 'Use a context manager (`with` statement) or ensure `.close()` is called in a `finally` block. Unclosed connections exhaust the connection pool.',
            });
          }
        }
      });

      // Growing list/dict in class that never shrinks
      lines.forEach((line, idx) => {
        const m = line.match(/^\s+self\.(\w+)\s*=\s*\[\s*\]|\bself\.(\w+)\s*=\s*\{\s*\}/);
        if (m) {
          const attrName = m[1] || m[2];
          const classContent = lines.slice(Math.max(0, idx - 30), Math.min(lines.length, idx + 80)).join('\n');
          const hasAppend = new RegExp(`self\\.${attrName}\\.(?:append|extend|update)\\s*\\(`).test(classContent);
          const hasClear  = new RegExp(`self\\.${attrName}\\.(?:clear|pop|remove)\\s*\\(|self\\.${attrName}\\s*=\\s*\\[`).test(classContent);
          if (hasAppend && !hasClear) {
            issues.push({
              severity: 'low',
              title: `self.${attrName} grows but is never cleared`,
              file: f.path,
              line: idx + 1,
              snippet: line.trim().slice(0, 80),
              suggestion: `Add a limit check or periodic cleanup: if len(self.${attrName}) > MAX: self.${attrName} = self.${attrName}[-MAX:]`,
            });
          }
        }
      });
    }
  }

  const seen = new Set();
  return issues.filter(i => {
    const k = `${i.file}:${i.line}:${i.title.slice(0,30)}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}
