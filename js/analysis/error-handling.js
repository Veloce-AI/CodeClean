/* error-handling.js — Empty catches, swallowed errors, missing async error handling */

async function analyzeErrorHandling(files) {
  const issues = [];

  for (const f of files) {
    if (!f.content) continue;
    const lang = f.lang;
    const lines = f.content.split('\n');
    const content = f.content;

    // ── JS/TS ──────────────────────────────────────────────
    if (['js','ts','jsx','tsx'].includes(lang)) {

      // Empty catch block: catch(...) { } or catch(...) { // comment }
      lines.forEach((line, idx) => {
        if (/\}\s*catch\s*\([^)]*\)\s*\{/.test(line) && /\}\s*$/.test(lines[idx + 1] || '')) {
          issues.push({ severity:'medium', title:'Empty catch block', file:f.path, line:idx+1,
            snippet: line.trim().slice(0,80),
            suggestion:'Log the error or re-throw it — silently swallowing errors hides bugs' });
        }
      });

      // catch block with only a comment or console.log — still considered weak
      let inCatch = false, catchStart = 0, catchDepth = 0;
      lines.forEach((line, idx) => {
        if (/\}\s*catch\s*\(/.test(line)) { inCatch = true; catchStart = idx + 1; catchDepth = 0; }
        if (inCatch) {
          for (const ch of line) { if (ch === '{') catchDepth++; else if (ch === '}') catchDepth--; }
          if (catchDepth === 0 && idx > catchStart) {
            const catchBody = lines.slice(catchStart, idx + 1).join('\n');
            if (/console\.(log|warn)\s*\(/.test(catchBody) && !/throw|reject|return/.test(catchBody)) {
              issues.push({ severity:'low', title:'Catch only logs — error not propagated', file:f.path, line:catchStart,
                snippet: lines[catchStart - 1]?.trim().slice(0,80),
                suggestion:'After logging, either re-throw the error or return an error value so callers know something went wrong' });
            }
            inCatch = false;
          }
        }
      });

      // Promise without .catch() — .then( without .catch(
      lines.forEach((line, idx) => {
        if (/\.then\s*\(/.test(line) && !/\.catch\s*\(/.test(line)) {
          // Check if .catch appears within next 5 lines
          const next5 = lines.slice(idx + 1, idx + 6).join('\n');
          if (!/\.catch\s*\(/.test(next5)) {
            issues.push({ severity:'low', title:'Promise .then() without .catch()', file:f.path, line:idx+1,
              snippet: line.trim().slice(0,80),
              suggestion:'Add .catch(err => ...) or use async/await with try/catch to handle rejected promises' });
          }
        }
      });

      // new Promise without reject call
      lines.forEach((line, idx) => {
        if (/new\s+Promise\s*\(/.test(line)) {
          const block = lines.slice(idx, Math.min(lines.length, idx + 15)).join('\n');
          if (!/reject\s*\(/.test(block)) {
            issues.push({ severity:'low', title:'new Promise() never calls reject()', file:f.path, line:idx+1,
              snippet: line.trim().slice(0,80),
              suggestion:'Always call reject(err) in error paths — a Promise that never rejects silently hangs' });
          }
        }
      });

      // async function without try/catch
      let asyncFns = 0, asyncWithTry = 0;
      lines.forEach((line, idx) => {
        if (/\basync\s+function\s+\w+|const\s+\w+\s*=\s*async/.test(line)) {
          asyncFns++;
          const body = lines.slice(idx, Math.min(lines.length, idx + 40)).join('\n');
          if (/\btry\s*\{/.test(body)) asyncWithTry++;
          else {
            issues.push({ severity:'low', title:`Async function without try/catch`, file:f.path, line:idx+1,
              snippet: line.trim().slice(0,80),
              suggestion:'Wrap async function body in try/catch or add .catch() at the call site' });
          }
        }
      });
    }

    // ── Python ─────────────────────────────────────────────
    if (lang === 'py') {

      // bare except: (catches everything including KeyboardInterrupt)
      lines.forEach((line, idx) => {
        if (/^\s*except\s*:/.test(line)) {
          issues.push({ severity:'medium', title:'Bare except: clause', file:f.path, line:idx+1,
            snippet: line.trim().slice(0,80),
            suggestion:'Specify the exception type: `except ValueError:` or at minimum `except Exception as e:` and log it' });
        }
      });

      // except block with only pass
      lines.forEach((line, idx) => {
        if (/^\s*except\b/.test(line)) {
          const nextTrimmed = (lines[idx + 1] || '').trim();
          if (nextTrimmed === 'pass' || nextTrimmed === '') {
            issues.push({ severity:'medium', title:'Exception silently swallowed (pass)', file:f.path, line:idx+1,
              snippet: line.trim().slice(0,80),
              suggestion:'At minimum log the error: `logging.exception(e)` or `logger.error(f"Failed: {e}")` then re-raise or return an error value' });
          }
        }
      });

      // except with only print (not logging)
      lines.forEach((line, idx) => {
        if (/^\s*except\b/.test(line)) {
          const next3 = lines.slice(idx + 1, idx + 4).join('\n');
          if (/^\s*print\s*\(/.test(next3) && !/raise|return|logging|logger/.test(next3)) {
            issues.push({ severity:'low', title:'Exception printed but not logged or re-raised', file:f.path, line:idx+1,
              snippet: line.trim().slice(0,80),
              suggestion:'Use `logging.exception(e)` instead of print — it captures the full traceback' });
          }
        }
      });
    }
  }

  // Deduplicate by file+line
  const seen = new Set();
  return issues.filter(i => {
    const k = `${i.file}:${i.line}:${i.title}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}
