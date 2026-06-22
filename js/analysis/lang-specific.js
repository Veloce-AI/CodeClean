/* lang-specific.js — Language-specific anti-patterns */

async function analyzeLangSpecific(files) {
  const issues = [];

  for (const f of files) {
    if (!f.content) continue;
    const lines = f.content.split('\n');
    const isTest = /test|spec|__tests__/.test(f.path.toLowerCase());

    /* ── Python ────────────────────────────────────────── */
    if (f.lang === 'py') {

      // Mutable default arguments — def foo(x=[], y={})
      lines.forEach((line, idx) => {
        const m = line.match(/def\s+\w+\s*\([^)]*(?:=\s*(\[\s*\]|\{\s*\}|list\s*\(\s*\)|dict\s*\(\s*\)|set\s*\(\s*\)))/);
        if (m) issues.push({
          severity: 'high',
          title: 'Mutable default argument',
          file: f.path, line: idx + 1,
          snippet: line.trim().slice(0, 80),
          suggestion: 'Use None as default and create the mutable object inside the function body: `def foo(x=None): if x is None: x = []`',
        });
      });

      // `is` comparison with literals — `x is "string"` or `x is 5`
      lines.forEach((line, idx) => {
        if (/\bis\s+(['"\d]|\b(?!None\b|True\b|False\b)\w)/.test(line) && !/is\s+None\b|is\s+True\b|is\s+False\b/.test(line)) {
          if (/\bis\s+['"\d]/.test(line)) issues.push({
            severity: 'medium',
            title: '`is` used for value comparison (use ==)',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: '`is` checks object identity, not value equality. Use `==` for value comparison.',
          });
        }
      });

      // print() in production code
      if (!isTest) {
        const printLines = lines.map((l, i) => ({ l, i })).filter(({ l }) => /^\s*print\s*\(/.test(l));
        if (printLines.length > 0) {
          issues.push({
            severity: 'low',
            title: `${printLines.length} print() statement${printLines.length > 1 ? 's' : ''} — use logging`,
            file: f.path, line: printLines[0].i + 1,
            snippet: printLines[0].l.trim().slice(0, 80),
            suggestion: 'Replace print() with: `import logging; logger = logging.getLogger(__name__); logger.info(msg)`. print() has no level control, file rotation, or structured output.',
          });
        }
      }

      // Global variables at module level (mutable globals = hidden state)
      let moduleDepth = 0;
      lines.forEach((line, idx) => {
        if (/^(class|def)\s/.test(line)) moduleDepth++;
        if (moduleDepth === 0 && /^[A-Z_][A-Z_0-9]*\s*=/.test(line) === false) { // skip constants
          const m = line.match(/^([a-z_]\w*)\s*=\s*(?!\s*lambda|\s*None)(.+)/);
          if (m && !['self','cls','__all__'].includes(m[1])) {
            issues.push({
              severity: 'low',
              title: `Module-level mutable variable: ${m[1]}`,
              file: f.path, line: idx + 1,
              snippet: line.trim().slice(0, 80),
              suggestion: 'Module-level mutable state creates hidden dependencies. Move into a class, function, or configuration object.',
            });
          }
        }
      });
    }

    /* ── JavaScript / TypeScript ──────────────────────── */
    if (['js','ts','jsx','tsx'].includes(f.lang)) {

      // var declarations
      lines.forEach((line, idx) => {
        if (/^\s*var\s+\w+/.test(line) && !/^\s*\/\//.test(line)) {
          issues.push({
            severity: 'low',
            title: '`var` declaration — use const or let',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: '`var` is function-scoped and hoisted, causing confusing bugs. Use `const` (default) or `let` (if reassigned).',
          });
        }
      });

      // document.write()
      lines.forEach((line, idx) => {
        if (/document\.write\s*\(/.test(line)) {
          issues.push({
            severity: 'high',
            title: 'document.write() — blocks parser and enables XSS',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Use DOM methods (createElement, appendChild, innerHTML with sanitization) instead. document.write() after page load replaces the entire document.',
          });
        }
      });

      // console.log in production
      if (!isTest) {
        const consoleLogs = lines.filter(l => /console\.(log|debug|info|warn)\s*\(/.test(l));
        if (consoleLogs.length > 3) {
          const idx = lines.findIndex(l => /console\.(log|debug|info|warn)\s*\(/.test(l));
          issues.push({
            severity: 'low',
            title: `${consoleLogs.length} console.log statements — remove before production`,
            file: f.path, line: idx + 1,
            snippet: consoleLogs[0]?.trim().slice(0, 80),
            suggestion: 'Use a logger library (winston, pino) with log levels. Or remove debug logs entirely.',
          });
        }
      }

      // == instead of === (only JS, not TS where strict mode is common)
      if (f.lang === 'js') {
        lines.forEach((line, idx) => {
          if (/[^=!<>]==[^=]/.test(line) && !/\/\//.test(line.slice(0, line.search(/==[^=]/)))) {
            issues.push({
              severity: 'low',
              title: 'Loose equality (==) — use ===',
              file: f.path, line: idx + 1,
              snippet: line.trim().slice(0, 80),
              suggestion: '`==` coerces types: `0 == ""` is true. Use `===` for strict comparison.',
            });
          }
        });
      }
    }

    /* ── Go ────────────────────────────────────────────── */
    if (f.lang === 'go') {

      // Ignoring errors with _
      lines.forEach((line, idx) => {
        if (/,\s*_\s*:?=\s*\w+\(/.test(line) || /=\s*\w+\([^)]*\)\s*;\s*_/.test(line)) {
          issues.push({
            severity: 'medium',
            title: 'Error return ignored with _',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Always check errors in Go: `result, err := foo(); if err != nil { return err }`',
          });
        }
      });

      // fmt.Println in production
      if (!isTest) {
        const fmtLines = lines.filter(l => /fmt\.(Print|Println|Printf)\s*\(/.test(l));
        if (fmtLines.length > 2) {
          const idx = lines.findIndex(l => /fmt\.(Print|Println|Printf)\s*\(/.test(l));
          issues.push({
            severity: 'low',
            title: `${fmtLines.length} fmt.Print statements — use log or slog`,
            file: f.path, line: idx + 1,
            snippet: fmtLines[0]?.trim().slice(0, 80),
            suggestion: 'Use `log.Printf()` or structured logging with `log/slog` for production output.',
          });
        }
      }

      // Naked returns in long functions
      lines.forEach((line, idx) => {
        if (/^\s*return\s*$/.test(line)) {
          // Check if this is inside a named-return function
          const fnStart = lines.slice(0, idx).reverse().findIndex(l => /^func\s/.test(l));
          if (fnStart >= 0 && fnStart < 30) {
            const fnLine = lines[idx - 1 - fnStart];
            if (/\)\s*\(/.test(fnLine)) { // named returns have (retType) style signature
              issues.push({
                severity: 'low',
                title: 'Naked return — reduces readability',
                file: f.path, line: idx + 1,
                snippet: line.trim(),
                suggestion: 'Explicit returns (`return result, err`) are clearer than naked returns, especially in long functions.',
              });
            }
          }
        }
      });
    }

    /* ── Rust ──────────────────────────────────────────── */
    if (f.lang === 'rs') {
      if (!isTest) {
        lines.forEach((line, idx) => {
          if (/\.unwrap\s*\(\s*\)/.test(line)) {
            issues.push({
              severity: 'medium',
              title: '.unwrap() panics on Err/None — handle the error',
              file: f.path, line: idx + 1,
              snippet: line.trim().slice(0, 80),
              suggestion: 'Use `match`, `if let`, `?` operator, or `.unwrap_or_else(|e| ...)` to handle the error gracefully.',
            });
          }
          if (/\.expect\s*\(/.test(line)) {
            issues.push({
              severity: 'low',
              title: '.expect() panics — consider returning Result<>',
              file: f.path, line: idx + 1,
              snippet: line.trim().slice(0, 80),
              suggestion: '`.expect()` is better than `.unwrap()` but still panics. Return `Result<T, E>` and propagate with `?`.',
            });
          }
          if (/unsafe\s*\{/.test(line)) {
            issues.push({
              severity: 'high',
              title: 'unsafe block — requires careful review',
              file: f.path, line: idx + 1,
              snippet: line.trim().slice(0, 80),
              suggestion: 'Document WHY this unsafe block is necessary and what invariants it relies on. Minimize unsafe scope.',
            });
          }
        });
      }
    }

    /* ── Java ──────────────────────────────────────────── */
    if (f.lang === 'java') {

      // Raw generic types
      lines.forEach((line, idx) => {
        const rawMatch = line.match(/\b(List|Map|Set|Collection|ArrayList|HashMap|HashSet)\s+\w+\s*[=;(,]/);
        if (rawMatch && !/</.test(line) && !/\/\//.test(line.slice(0, line.indexOf(rawMatch[0])))) {
          issues.push({
            severity: 'medium',
            title: `Raw type ${rawMatch[1]} — add type parameter`,
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: `Use generic type: \`${rawMatch[1]}<YourType>\` to get compile-time type safety.`,
          });
        }
      });

      // System.out.println
      if (!isTest) {
        const sysPrints = lines.filter(l => /System\.out\.(print|println|printf)\s*\(/.test(l));
        if (sysPrints.length > 0) {
          const idx = lines.findIndex(l => /System\.out\.(print|println|printf)\s*\(/.test(l));
          issues.push({
            severity: 'low',
            title: `${sysPrints.length} System.out.println — use SLF4J/Logback`,
            file: f.path, line: idx + 1,
            snippet: sysPrints[0]?.trim().slice(0, 80),
            suggestion: 'Use: `private static final Logger log = LoggerFactory.getLogger(MyClass.class);` then `log.info(msg);`',
          });
        }
      }

      // Catching Exception or Throwable (too broad)
      lines.forEach((line, idx) => {
        if (/catch\s*\(\s*(Exception|Throwable)\s+/.test(line)) {
          issues.push({
            severity: 'medium',
            title: 'Catching Exception/Throwable — too broad',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Catch specific exception types. Catching Exception masks programming errors; catching Throwable hides JVM errors.',
          });
        }
      });
    }

    /* ── C# ────────────────────────────────────────────── */
    if (f.lang === 'cs') {
      lines.forEach((line, idx) => {
        // Empty catch
        if (/catch\s*(\(\s*\))?\s*\{?\s*\}/.test(line)) {
          issues.push({
            severity: 'medium',
            title: 'Empty catch block',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Log the exception or re-throw it. Empty catches silently hide failures.',
          });
        }
        // Console.WriteLine in production
        if (!isTest && /Console\.(Write|WriteLine)\s*\(/.test(line)) {
          issues.push({
            severity: 'low',
            title: 'Console.WriteLine — use ILogger',
            file: f.path, line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: 'Inject ILogger<T> and use `_logger.LogInformation(msg)` for structured logging with levels.',
          });
        }
      });
    }
  }

  // Deduplicate same file+line+title
  const seen = new Set();
  return issues.filter(i => {
    const k = `${i.file}:${i.line}:${i.title.slice(0,40)}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}
