/* dead-code.js — Unused imports, variables, files, and exports */

async function analyzeDeadCode(files) {
  const issues = [];
  const codeFiles = files.filter(f => isCodeFile(f.lang));

  // ── 1. Build cross-file import graph ───────────────────
  // Maps resolved base-name → count of files that import it
  const importedNames = new Map(); // baseName (lowercase, no ext) → count
  const fileImportSources = {}; // filePath → [sourceBaseName, ...]

  for (const f of codeFiles) {
    const sources = extractImportSources(f);
    fileImportSources[f.path] = sources;
    sources.forEach(s => importedNames.set(s, (importedNames.get(s) || 0) + 1));
  }

  // ── 2. Unused files ────────────────────────────────────
  const ENTRY_NAMES = new Set([
    'index','main','app','server','client','entry','start','init',
    '__init__','__main__','program','manage','wsgi','asgi',
  ]);

  for (const f of codeFiles) {
    const base = f.name.replace(/\.[^.]+$/, '').toLowerCase();
    if (ENTRY_NAMES.has(base)) continue;
    if (['json','md','txt','yaml','yml','toml','env','lock','config'].includes(f.lang)) continue;

    const count = importedNames.get(base) || 0;
    // Also check path-based matching (e.g. 'utils/helpers' imported as 'helpers')
    const pathBase = f.path.replace(/\.[^.]+$/, '').toLowerCase();
    const anyMatch = [...importedNames.keys()].some(k =>
      pathBase.endsWith('/' + k) || pathBase === k || base === k
    );

    if (!anyMatch && count === 0) {
      issues.push({
        severity: 'low',
        title: `Possibly unused file`,
        file: f.path,
        line: 1,
        suggestion: 'Not imported by any other file. Verify it\'s an entry point or remove it.',
      });
    }
  }

  // ── 3. Unused imports (per file) ──────────────────────
  for (const f of codeFiles) {
    if (!f.content) continue;
    const unused = findUnusedImportNames(f);
    for (const u of unused) {
      issues.push({
        severity: 'low',
        title: `Unused import: ${u.name}`,
        file: f.path,
        line: u.line,
        snippet: u.statement.trim().slice(0, 80),
        suggestion: `Remove '${u.name}' — it's imported but never used in this file`,
      });
    }
  }

  // ── 4. Unused variables (simple cases) ─────────────────
  for (const f of codeFiles) {
    if (!['js','ts','jsx','tsx','py'].includes(f.lang)) continue;
    if (!f.content) continue;
    const unused = findUnusedVars(f);
    for (const v of unused) {
      issues.push({
        severity: 'low',
        title: `Unused variable: ${v.name}`,
        file: f.path,
        line: v.line,
        snippet: v.statement.trim().slice(0, 80),
        suggestion: `'${v.name}' is declared but never used. Prefix with _ if intentional.`,
      });
    }
  }

  // ── 5. Dead exports ────────────────────────────────────
  for (const f of codeFiles) {
    if (!f.content) continue;
    const deadExports = findDeadExports(f, importedNames, files);
    for (const e of deadExports) {
      issues.push({
        severity: 'low',
        title: `Exported symbol never imported: ${e.name}`,
        file: f.path,
        line: e.line,
        snippet: e.statement.trim().slice(0, 80),
        suggestion: `'${e.name}' is exported but nothing imports it — consider removing it`,
      });
    }
  }

  // ── 6. Unused functions (cross-file) ──────────────────
  const unusedFns = findUnusedFunctions(codeFiles);
  for (const fn of unusedFns) {
    issues.push({
      severity: 'low',
      title: `Unused function: ${fn.name}`,
      file: fn.file,
      line: fn.line,
      snippet: fn.sig,
      suggestion: `'${fn.name}' is defined but never called anywhere in the project`,
    });
  }

  return issues;
}

/* ── Cross-file unused function detection ─────────────── */
function findUnusedFunctions(files) {
  const defined = [];
  const calledNames = new Set();

  // Pass 1: collect all function definitions and all call sites
  for (const f of files) {
    if (!f.content) continue;
    const lines = f.content.split('\n');

    // Extract definitions
    lines.forEach((line, idx) => {
      let m;
      // JS/TS
      if (['js','ts','jsx','tsx'].includes(f.lang)) {
        m = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/);
        if (!m) m = line.match(/^\s*(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(?[^)]*\)?\s*=>/);
      } else if (f.lang === 'py') {
        m = line.match(/^\s*(?:async\s+)?def\s+(\w+)\s*\(/);
      } else if (f.lang === 'go') {
        m = line.match(/^\s*func\s+(?:\(\w+[^)]*\)\s+)?(\w+)\s*\(/);
      } else if (['java','cs','kt'].includes(f.lang)) {
        m = line.match(/^\s*(?:public|private|protected|static|override)[\w\s<>[\]]*\s+(\w+)\s*\(/);
      }
      if (m && m[1] && m[1].length > 2 && !m[1].startsWith('_')) {
        defined.push({ name: m[1], file: f.path, line: idx + 1, sig: line.trim().slice(0, 80) });
      }
    });

    // Extract call sites: every word immediately before (
    const callRe = /\b([a-zA-Z_$][a-zA-Z0-9_$]{2,})\s*\(/g;
    let cm;
    while ((cm = callRe.exec(f.content)) !== null) calledNames.add(cm[1]);
  }

  // Pass 2: filter — skip common framework entry points and lifecycle methods
  const SKIP = new Set([
    'constructor','render','toString','main','init','setup','teardown',
    'setUp','tearDown','beforeEach','afterEach','beforeAll','afterAll',
    'componentDidMount','componentWillUnmount','componentDidUpdate',
    'getServerSideProps','getStaticProps','getStaticPaths',
    'handler','middleware','resolver','loader','action',
    'on','off','emit','next','done','callback','cb',
    'open','close','connect','disconnect','start','stop',
    'get','post','put','patch','delete','head','options',
  ]);
  const COMMON_PATTERNS = /^(on[A-Z]|handle[A-Z]|render[A-Z]|use[A-Z]|get[A-Z]|set[A-Z]|is[A-Z]|has[A-Z])/;

  return defined.filter(fn => {
    if (calledNames.has(fn.name)) return false;
    if (SKIP.has(fn.name)) return false;
    if (COMMON_PATTERNS.test(fn.name)) return false; // React/lifecycle patterns
    // Skip if function is exported (handled by dead exports check)
    const f = files.find(f => f.path === fn.file);
    if (f && /export/.test(f.content?.split('\n')[fn.line - 1] || '')) return false;
    return true;
  }).slice(0, 20);
}

/* ── Helpers ─────────────────────────────────────────── */

function isCodeFile(lang) {
  return ['js','ts','jsx','tsx','py','go','java','cs','kt','rs','php','rb','vue','svelte','cpp','c'].includes(lang);
}

function extractImportSources(f) {
  if (!f.content) return [];
  const sources = new Set();
  const lines = f.content.split('\n');
  const lang = f.lang;

  lines.forEach(line => {
    let m;
    // JS/TS: import ... from './path'  or  require('./path')
    if (['js','ts','jsx','tsx','vue','svelte'].includes(lang)) {
      m = line.match(/from\s+['"]([^'"]+)['"]/);
      if (m) sources.add(baseName(m[1]));
      m = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (m) sources.add(baseName(m[1]));
    }
    // Python: from x import y  or  import x
    if (lang === 'py') {
      m = line.match(/^from\s+([\w.]+)\s+import/);
      if (m) sources.add(baseName(m[1]));
      m = line.match(/^import\s+([\w.]+)/);
      if (m) sources.add(baseName(m[1]));
    }
    // Go, Java, C#, Rust
    if (lang === 'go') {
      m = line.match(/"([^"]+)"/);
      if (m) sources.add(baseName(m[1]));
    }
    if (['java','cs'].includes(lang)) {
      m = line.match(/^(?:import|using)\s+([\w.]+)/);
      if (m) sources.add(baseName(m[1]));
    }
  });

  return [...sources].filter(s => !isNodeModule(s));
}

function baseName(p) {
  return (p || '').split('/').pop().split('.')[0].toLowerCase();
}

function isNodeModule(name) {
  // stdlib/npm packages don't have ./ prefix originally and are short
  return !name.includes('/') || name.startsWith('@');
}

function findUnusedImportNames(f) {
  const unused = [];
  const lines = f.content.split('\n');
  const lang = f.lang;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // JS/TS: import { foo, bar } from '...'  or  import Foo from '...'
    if (['js','ts','jsx','tsx','vue','svelte'].includes(lang)) {
      // Named imports: { A, B as C }
      const namedMatch = line.match(/^import\s+\{([^}]+)\}\s+from/);
      if (namedMatch) {
        const names = namedMatch[1].split(',').map(n => {
          const parts = n.trim().split(/\s+as\s+/);
          return parts[parts.length - 1].trim(); // use alias if present
        }).filter(Boolean);

        for (const name of names) {
          if (!name || name === '*') continue;
          // Check if name appears in file body (after imports)
          const bodyAfter = lines.slice(idx + 1).join('\n');
          const bodyBefore = lines.slice(0, idx).join('\n');
          const fullBody = bodyBefore + '\n' + bodyAfter;
          const usages = (fullBody.match(new RegExp(`\\b${escapeRe(name)}\\b`, 'g')) || []).length;
          // The import line itself uses it once (in the statement)
          if (usages === 0) {
            unused.push({ name, line: idx + 1, statement: trimmed });
          }
        }
      }

      // Default import: import Foo from '...'
      const defaultMatch = line.match(/^import\s+(\w+)\s+from/);
      if (defaultMatch && !line.includes('{')) {
        const name = defaultMatch[1];
        if (name && name !== '_') {
          const bodyAfter = lines.slice(idx + 1).join('\n');
          const usages = (bodyAfter.match(new RegExp(`\\b${escapeRe(name)}\\b`, 'g')) || []).length;
          if (usages === 0) {
            unused.push({ name, line: idx + 1, statement: trimmed });
          }
        }
      }
    }

    // Python: from module import foo, bar
    if (lang === 'py') {
      const pyMatch = line.match(/^from\s+\S+\s+import\s+(.+)/);
      if (pyMatch) {
        const names = pyMatch[1].split(',').map(n => {
          const parts = n.trim().split(/\s+as\s+/);
          return parts[parts.length - 1].trim();
        }).filter(n => n && n !== '*');

        for (const name of names) {
          const bodyAfter = lines.slice(idx + 1).join('\n');
          const usages = (bodyAfter.match(new RegExp(`\\b${escapeRe(name)}\\b`, 'g')) || []).length;
          if (usages === 0) {
            unused.push({ name, line: idx + 1, statement: trimmed });
          }
        }
      }

      // import module as alias
      const aliasMatch = line.match(/^import\s+\S+\s+as\s+(\w+)/);
      if (aliasMatch) {
        const name = aliasMatch[1];
        const bodyAfter = lines.slice(idx + 1).join('\n');
        const usages = (bodyAfter.match(new RegExp(`\\b${escapeRe(name)}\\b`, 'g')) || []).length;
        if (usages === 0) {
          unused.push({ name, line: idx + 1, statement: trimmed });
        }
      }
    }
  });

  return unused;
}

function findUnusedVars(f) {
  const unused = [];
  const lines = f.content.split('\n');
  const lang = f.lang;
  const isTest = /test|spec|__tests__/.test(f.path.toLowerCase());
  if (isTest) return []; // skip test files entirely

  // Only detect simple single-line declarations — NOT destructuring, NOT class fields
  const jsRe = /^\s*(?:const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=(?!=)/; // not ==
  const pyRe = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/;

  const SKIP_JS = new Set(['React','exports','module','require','process','global','window','document','console','Promise','Error','Object','Array','String','Number','Boolean','Map','Set','Date','Math','JSON','Symbol','undefined','null','Infinity','NaN']);
  const SKIP_PY = new Set(['self','cls','i','j','k','n','e','x','y','_','result','response','error','err','data','args','kwargs','config','settings','logger','app','db','conn','cursor','session','client','api']);

  lines.forEach((line, idx) => {
    let name;
    if (['js','ts','jsx','tsx'].includes(lang)) {
      // Skip destructuring: const { a, b } = ... or const [a, b] = ...
      if (/^\s*(?:const|let)\s*[{[]/.test(line)) return;
      // Skip type alias: type Foo = ...
      if (/^\s*type\s+\w/.test(line)) return;
      const m = line.match(jsRe);
      if (!m) return;
      name = m[1];
      if (SKIP_JS.has(name)) return;
    } else if (lang === 'py') {
      if (line.trim().startsWith('#') || /^\s*(?:def|class|if|for|while|return|import|from|with|try|except)\s/.test(line)) return;
      // Skip tuple/list unpacking: a, b = ...
      if (/,/.test(line.split('=')[0])) return;
      const m = line.match(pyRe);
      if (!m) return;
      name = m[1];
      if (SKIP_PY.has(name)) return;
    } else return;

    if (!name || name.startsWith('_') || name.length <= 1) return;

    // Check if the name appears ANYWHERE else in the file
    const fullContent = lines.join('\n');
    const occurrences = (fullContent.match(new RegExp(`\\b${escapeRe(name)}\\b`, 'g')) || []).length;
    // If it only appears once (the declaration itself), it's unused
    if (occurrences <= 1) {
      unused.push({ name, line: idx + 1, statement: line.trim().slice(0, 80) });
    }
  });

  return unused.slice(0, 4); // conservative limit
}

function findDeadExports(f, importedNames, allFiles) {
  if (!['js','ts','jsx','tsx'].includes(f.lang)) return [];
  const dead = [];
  const lines = f.content.split('\n');

  // Build set of all names that any file imports BY NAME (not just by path)
  const allNamedImports = new Set();
  for (const other of allFiles) {
    if (!other.content || other.path === f.path) continue;
    const namedRe = /import\s+\{([^}]+)\}\s+from/g;
    let m;
    while ((m = namedRe.exec(other.content)) !== null) {
      m[1].split(',').forEach(n => {
        const parts = n.trim().split(/\s+as\s+/);
        allNamedImports.add(parts[0].trim());
      });
    }
  }

  lines.forEach((line, idx) => {
    // export function foo(, export const foo =, export class Foo
    const m = line.match(/^export\s+(?:default\s+)?(?:function|const|let|var|class)\s+(\w+)/);
    if (!m) return;
    const name = m[1];
    if (name === 'default') return;
    if (!allNamedImports.has(name)) {
      dead.push({ name, line: idx + 1, statement: line.trim().slice(0, 80) });
    }
  });

  return dead.slice(0, 8); // limit per file
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
