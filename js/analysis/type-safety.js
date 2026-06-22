/* type-safety.js — TypeScript any, ts-ignore, Python untyped functions */

async function analyzeTypeSafety(files) {
  const issues = [];

  for (const f of files) {
    if (!f.content) continue;
    const lines = f.content.split('\n');
    const lang = f.lang;

    // ── TypeScript ──────────────────────────────────────────
    if (['ts','tsx'].includes(lang)) {
      lines.forEach((line, idx) => {
        const trimmed = line.trim();

        // : any or <any>
        if (/:\s*any\b/.test(line) && !/\/\//.test(line.slice(0, line.indexOf(':')))) {
          issues.push({ severity:'medium', title:'TypeScript `any` type used', file:f.path, line:idx+1,
            snippet: trimmed.slice(0,80),
            suggestion:'Replace `any` with a specific type or `unknown` (safer) — `any` disables type checking' });
        }

        // @ts-ignore
        if (/@ts-ignore/.test(trimmed)) {
          issues.push({ severity:'medium', title:'@ts-ignore suppresses type errors', file:f.path, line:idx+1,
            snippet: trimmed.slice(0,80),
            suggestion:'Fix the underlying type error instead of suppressing it — add a comment explaining WHY if truly necessary' });
        }

        // @ts-nocheck
        if (/@ts-nocheck/.test(trimmed)) {
          issues.push({ severity:'high', title:'@ts-nocheck disables type checking for entire file', file:f.path, line:idx+1,
            snippet: trimmed.slice(0,80),
            suggestion:'Remove @ts-nocheck and fix the type errors — this defeats the purpose of TypeScript' });
        }

        // Non-null assertion !.
        if (/\w+!\.\w+/.test(line) || /\w+!\[/.test(line)) {
          issues.push({ severity:'low', title:'Non-null assertion operator (!.) used', file:f.path, line:idx+1,
            snippet: trimmed.slice(0,80),
            suggestion:'Use optional chaining (?.) with a null check instead — non-null assertions can cause runtime crashes' });
        }

        // as unknown as X (double casting to bypass type system)
        if (/as\s+unknown\s+as\s+/.test(line)) {
          issues.push({ severity:'medium', title:'Double type cast (as unknown as T) bypasses type safety', file:f.path, line:idx+1,
            snippet: trimmed.slice(0,80),
            suggestion:'Fix the underlying type incompatibility rather than casting through unknown' });
        }

        // Implicit any in function params: function foo(x) without type
        const implicitParam = line.match(/function\s+\w+\s*\(([^)]+)\)/);
        if (implicitParam) {
          const params = implicitParam[1];
          if (params.trim() && !/:\s*\w/.test(params) && !/\.\.\./.test(params)) {
            issues.push({ severity:'low', title:`Function parameters have implicit any types`, file:f.path, line:idx+1,
              snippet: trimmed.slice(0,80),
              suggestion:'Add explicit parameter types: `function foo(x: string, y: number)`' });
          }
        }
      });
    }

    // ── Python ─────────────────────────────────────────────
    if (lang === 'py') {
      let untypedCount = 0, typedCount = 0;

      lines.forEach((line, idx) => {
        // def foo(x, y) — no type hints at all
        const defMatch = line.match(/^\s*def\s+(\w+)\s*\(([^)]*)\)/);
        if (defMatch) {
          const name = defMatch[1];
          const params = defMatch[2];
          const hasReturn = /->/.test(line) || /->/.test(lines[idx + 1] || '');
          const hasParamTypes = /:\s*\w/.test(params) || !params.trim() || params.trim() === 'self' || params.trim() === 'cls';

          if (!hasParamTypes || !hasReturn) {
            untypedCount++;
            if (untypedCount <= 8) { // cap noise
              issues.push({ severity:'low', title:`Untyped function: ${name}()`, file:f.path, line:idx+1,
                snippet: line.trim().slice(0,80),
                suggestion:`Add type hints: \`def ${name}(param: type) -> return_type:\` — enables static analysis with mypy/pyright` });
            }
          } else {
            typedCount++;
          }
        }

        // type: ignore comments
        if (/# type: ignore/.test(line)) {
          issues.push({ severity:'low', title:'type: ignore suppresses mypy error', file:f.path, line:idx+1,
            snippet: line.trim().slice(0,80),
            suggestion:'Fix the underlying type error — add a comment with the reason if the ignore is truly necessary' });
        }
      });

      // Summary issue if many untyped functions
      if (untypedCount > 10) {
        issues.push({ severity:'medium',
          title:`${untypedCount} untyped functions in ${f.name} — consider adding type hints`,
          file:f.path, line:1,
          suggestion:`Run \`mypy ${f.name}\` to check types. Add \`from __future__ import annotations\` at top for deferred evaluation.` });
        // Remove the individual low-severity ones to reduce noise
        const fileIssues = issues.filter(i => i.file === f.path && i.title.startsWith('Untyped function'));
        fileIssues.forEach(i => issues.splice(issues.indexOf(i), 1));
      }
    }

    // ── JavaScript ─────────────────────────────────────────
    if (lang === 'js') {
      // Loose equality == instead of ===
      lines.forEach((line, idx) => {
        if (/[^=!<>]==[^=]/.test(line) && !/\/\//.test(line.slice(0, line.search(/[^=!<>]==[^=]/)))) {
          issues.push({ severity:'low', title:'Loose equality (==) — use === instead', file:f.path, line:idx+1,
            snippet: line.trim().slice(0,80),
            suggestion:'Use strict equality (===) to avoid type coercion bugs: `0 == ""` is true, `0 === ""` is false' });
        }
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
