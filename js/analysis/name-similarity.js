/* name-similarity.js — Naming conflicts and verb synonym detection */

const VERB_SYNONYMS = {
  get:      ['fetch','load','retrieve','read','find','query','obtain','pull'],
  set:      ['update','save','put','write','store','persist','assign','patch'],
  delete:   ['remove','destroy','clear','drop','purge','erase','wipe'],
  create:   ['make','add','new','insert','build','construct','init','generate','produce'],
  check:    ['validate','verify','is','has','can','test','assert','ensure'],
  handle:   ['process','manage','deal','treat','respond','on'],
  send:     ['emit','dispatch','publish','broadcast','post','push','notify'],
  show:     ['display','render','draw','paint','present','open','reveal'],
  hide:     ['close','dismiss','remove','collapse','toggle','mask'],
  start:    ['begin','launch','run','execute','boot','activate','open'],
  stop:     ['end','halt','abort','cancel','kill','terminate','deactivate','close'],
  convert:  ['transform','parse','format','serialize','encode','decode','translate'],
  filter:   ['search','select','query','find','match','pick','sort'],
  calculate:['compute','evaluate','measure','count','sum','aggregate'],
};

// Reverse map: synonym → canonical verb
const SYNONYM_TO_CANONICAL = {};
for (const [canonical, synonyms] of Object.entries(VERB_SYNONYMS)) {
  SYNONYM_TO_CANONICAL[canonical] = canonical;
  synonyms.forEach(s => { SYNONYM_TO_CANONICAL[s] = canonical; });
}

async function analyzeNameSimilarity(files) {
  const issues = [];
  const codeFiles = files.filter(f => f.content &&
    ['js','ts','jsx','tsx','py','go','java','cs','kt','rs','php','rb'].includes(f.lang)
  );

  // ── Collect all function/class names across files ───────
  const nameMap = new Map(); // normalizedName → [{file, line, original}]

  for (const f of codeFiles) {
    const names = extractFunctionNames(f);
    for (const n of names) {
      const normalized = normalizeName(n.name);
      if (!normalized || normalized.length < 3) continue;
      if (!nameMap.has(normalized)) nameMap.set(normalized, []);
      nameMap.get(normalized).push({ file: f.path, line: n.line, original: n.name });
    }
  }

  // ── 1. Case/convention conflicts ───────────────────────
  // Same logical name, different convention (getUserData vs get_user_data vs GetUserData)
  for (const [normalized, occurrences] of nameMap) {
    const uniqueNames = [...new Set(occurrences.map(o => o.original))];
    if (uniqueNames.length < 2) continue;

    // Check they're actually different in spelling (not just file-to-file)
    const uniqueFiles = [...new Set(occurrences.map(o => o.file))];
    if (uniqueFiles.length < 1) continue;

    issues.push({
      severity: 'low',
      title: `Naming conflict: ${uniqueNames.join(' / ')}`,
      file: occurrences[0].file,
      line: occurrences[0].line,
      snippet: `Normalized form: "${normalized}"`,
      suggestion: `Pick one naming convention — found: ${uniqueNames.map(n => `'${n}'`).join(', ')}`,
    });
  }

  // ── 2. Verb synonym conflicts ──────────────────────────
  // fetchUser and getUser both exist → suggest merging
  const verbNounMap = new Map(); // canonical_verb+noun → [{file, line, original}]

  for (const f of codeFiles) {
    const names = extractFunctionNames(f);
    for (const n of names) {
      const parts = splitCamelCase(n.name);
      if (parts.length < 2) continue;
      const verb = parts[0].toLowerCase();
      const canonical = SYNONYM_TO_CANONICAL[verb];
      if (!canonical) continue;
      const noun = parts.slice(1).join('').toLowerCase();
      if (noun.length < 3) continue;
      const key = canonical + ':' + noun;
      if (!verbNounMap.has(key)) verbNounMap.set(key, []);
      verbNounMap.get(key).push({ file: f.path, line: n.line, original: n.name });
    }
  }

  for (const [key, occurrences] of verbNounMap) {
    if (occurrences.length < 2) continue;
    const uniqueNames = [...new Set(occurrences.map(o => o.original))];
    if (uniqueNames.length < 2) continue;
    const uniqueFiles = [...new Set(occurrences.map(o => o.file))];

    const [canonical, noun] = key.split(':');
    issues.push({
      severity: 'low',
      title: `Synonym functions for same concept: ${uniqueNames.join(' + ')}`,
      file: occurrences[0].file,
      line: occurrences[0].line,
      snippet: `All operate on '${noun}' with '${canonical}' variants`,
      suggestion: `Consolidate ${uniqueNames.map(n => `'${n}'`).join(', ')} into one function with a consistent name`,
    });
  }

  // ── 3. Single-letter or cryptic variable names ─────────
  for (const f of codeFiles) {
    if (!f.content) continue;
    const lines = f.content.split('\n');
    lines.forEach((line, idx) => {
      // Single-letter non-loop variables
      const m = line.match(/\b(?:const|let|var)\s+([a-df-hj-np-z])\s*=/);
      if (m && !['i','j','k','n','x','y','_'].includes(m[1])) {
        issues.push({
          severity: 'low',
          title: `Single-letter variable: '${m[1]}'`,
          file: f.path,
          line: idx + 1,
          snippet: line.trim().slice(0, 80),
          suggestion: 'Use a descriptive name that conveys intent',
        });
      }
    });
  }

  return issues;
}

/* ── Helpers ─────────────────────────────────────────── */

function normalizeName(name) {
  // camelCase + PascalCase + snake_case + SCREAMING_SNAKE → single normalized form
  return splitCamelCase(name)
    .join('')
    .toLowerCase()
    .replace(/_/g, '');
}

function splitCamelCase(name) {
  if (!name) return [];
  // Handle snake_case first
  if (name.includes('_')) return name.split('_').filter(Boolean);
  // Split camelCase / PascalCase
  return name.replace(/([a-z])([A-Z])/g, '$1 $2')
             .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
             .split(' ')
             .filter(Boolean);
}

function extractFunctionNames(f) {
  const names = [];
  if (!f.content) return names;
  const lines = f.content.split('\n');
  const lang = f.lang;

  const patterns = {
    js:  /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)|^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?[^)]*\)?\s*=>/,
    py:  /^\s*(?:async\s+)?def\s+(\w+)\s*\(/,
    go:  /^\s*func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/,
    java:/^\s*(?:public|private|protected|static)[\w\s<>[\]]*\s+(\w+)\s*\(/,
    cs:  /^\s*(?:public|private|protected|static|override|virtual|async)[\w\s<>[\]?]*\s+(\w+)\s*\(/,
    kt:  /^\s*(?:suspend\s+)?fun\s+(\w+)\s*\(/,
    rs:  /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*\(/,
    rb:  /^\s*def\s+(\w+)/,
    php: /^\s*(?:public|private|protected|static)?\s*function\s+(\w+)\s*\(/,
  };

  const re = patterns[lang] || patterns.js;

  lines.forEach((line, idx) => {
    const m = line.match(re);
    if (!m) return;
    const name = m[1] || m[2];
    if (!name || name.length < 2) return;
    // Skip constructor/common framework methods
    if (['constructor','render','toString','valueOf','main','init'].includes(name)) return;
    names.push({ name, line: idx + 1 });
  });

  return names;
}
