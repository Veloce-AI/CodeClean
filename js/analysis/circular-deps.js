/* circular-deps.js — Tarjan's SCC for import cycles */

async function analyzeCircularDeps(files) {
  const issues = [];
  const codeExts = new Set(['js','ts','jsx','tsx','py','go','java','cs','kt','rs','vue','svelte']);
  const codeFiles = files.filter(f => codeExts.has(f.lang));

  // ── Build directed import graph ────────────────────────
  // node = file path, edge A→B means A imports B
  const pathIndex = {};
  codeFiles.forEach((f, i) => { pathIndex[f.path] = i; });

  // For each file, find which other files it imports
  const adj = codeFiles.map(() => []);

  for (let i = 0; i < codeFiles.length; i++) {
    const f = codeFiles[i];
    if (!f.content) continue;
    const refs = extractImportRefs(f, codeFiles);
    refs.forEach(j => { if (j !== i && !adj[i].includes(j)) adj[i].push(j); });
  }

  // ── Tarjan's SCC ──────────────────────────────────────
  const n = codeFiles.length;
  const idx = new Array(n).fill(-1);
  const low = new Array(n).fill(0);
  const onStack = new Array(n).fill(false);
  const stack = [];
  let timer = 0;
  const sccs = [];

  function strongconnect(v) {
    idx[v] = low[v] = timer++;
    stack.push(v);
    onStack[v] = true;

    for (const w of adj[v]) {
      if (idx[w] === -1) {
        strongconnect(w);
        low[v] = Math.min(low[v], low[w]);
      } else if (onStack[w]) {
        low[v] = Math.min(low[v], idx[w]);
      }
    }

    if (low[v] === idx[v]) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack[w] = false;
        scc.push(w);
      } while (w !== v);
      if (scc.length > 1) sccs.push(scc);
    }
  }

  for (let v = 0; v < n; v++) {
    if (idx[v] === -1) strongconnect(v);
  }

  // ── Format cycles as chains ────────────────────────────
  for (const scc of sccs) {
    // Build the cycle path: walk the SCC in import order
    const cycleNodes = new Set(scc);
    const cycleFiles = scc.map(i => codeFiles[i]);

    // Find a good starting point (highest in-degree within cycle)
    const inDegree = new Array(scc.length).fill(0);
    scc.forEach((nodeIdx, i) => {
      adj[nodeIdx].forEach(neighbor => {
        const pos = scc.indexOf(neighbor);
        if (pos >= 0) inDegree[pos]++;
      });
    });
    const startPos = inDegree.indexOf(Math.max(...inDegree));
    const startNode = scc[startPos];

    // Build chain by walking imports within the cycle
    const chain = buildCycleChain(startNode, cycleNodes, adj, codeFiles);
    const chainNames = chain.map(i => shortName(codeFiles[i].path));

    // Suggest breaking point: the edge to remove (lowest in-degree node)
    const minInPos = inDegree.indexOf(Math.min(...inDegree));
    const breakAt = codeFiles[scc[minInPos]];

    issues.push({
      severity: scc.length > 3 ? 'high' : 'medium',
      title: `Circular dependency — ${scc.length} files`,
      file: cycleFiles[0].path,
      snippet: chainNames.join(' → ') + ' → ' + chainNames[0],
      suggestion: `Break the cycle by removing the import of '${shortName(breakAt.path)}' from its importer`,
    });
  }

  return issues;
}

function buildCycleChain(start, cycleNodes, adj, files) {
  const chain = [start];
  const visited = new Set([start]);
  let current = start;

  for (let i = 0; i < cycleNodes.size; i++) {
    const next = adj[current].find(n => cycleNodes.has(n) && !visited.has(n));
    if (next == null) break;
    chain.push(next);
    visited.add(next);
    current = next;
  }
  return chain;
}

function extractImportRefs(f, allFiles) {
  const refs = [];
  if (!f.content) return refs;
  const lang = f.lang;
  const lines = f.content.split('\n');

  lines.forEach(line => {
    let source = null;

    if (['js','ts','jsx','tsx','vue','svelte'].includes(lang)) {
      let m = line.match(/from\s+['"]([^'"]+)['"]/);
      if (m) source = m[1];
      else {
        m = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (m) source = m[1];
      }
    } else if (lang === 'py') {
      let m = line.match(/^from\s+([\w.]+)\s+import/);
      if (m) source = m[1].replace(/\./g, '/');
      else {
        m = line.match(/^import\s+([\w.]+)/);
        if (m) source = m[1].replace(/\./g, '/');
      }
    } else if (lang === 'go') {
      const m = line.match(/"([^"]+)"/);
      if (m) source = m[1];
    } else if (['java','cs'].includes(lang)) {
      const m = line.match(/^(?:import|using)\s+([\w.]+)/);
      if (m) source = m[1].replace(/\./g, '/');
    }

    if (!source) return;

    // Only resolve local imports (starts with . or is a path fragment)
    const isLocal = source.startsWith('.') || (!source.startsWith('@') && source.includes('/'));
    if (!isLocal && !['py','go','java','cs'].includes(lang)) return;

    // Resolve the import to a file in our list
    const sourceName = source.split('/').pop().toLowerCase().replace(/\.[^.]+$/, '');
    const fDir = f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : '';

    const match = allFiles.findIndex(other => {
      if (other.path === f.path) return false;
      const otherBase = other.name.replace(/\.[^.]+$/, '').toLowerCase();
      const otherPath = other.path.toLowerCase().replace(/\.[^.]+$/, '');
      return otherBase === sourceName || otherPath.endsWith('/' + sourceName) || otherPath === sourceName;
    });

    if (match >= 0) refs.push(match);
  });

  return refs;
}

function shortName(path) {
  return path.split('/').pop();
}
