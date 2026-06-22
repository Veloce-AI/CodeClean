/* test-coverage.js — Detect test files and estimate coverage by naming convention */

async function analyzeTestCoverage(files) {
  const issues = [];

  // Partition into test vs source files
  const testFiles = files.filter(f => isTestFile(f));
  const srcFiles  = files.filter(f => !isTestFile(f) && isCodeFile(f.lang));

  if (testFiles.length === 0) {
    if (srcFiles.length > 5) {
      issues.push({
        severity: 'high',
        title: 'No test files found',
        file: srcFiles[0]?.path || '',
        line: 1,
        suggestion: `No test files detected across ${srcFiles.length} source files. Add tests using your framework's conventions (*.test.js, test_*.py, *_test.go, *Spec.kt, etc.)`,
      });
    }
    return issues;
  }

  // Extract all test function names from test files
  const testedNames = new Set();
  for (const tf of testFiles) {
    if (!tf.content) continue;
    extractTestNames(tf).forEach(n => testedNames.add(n));
  }

  // Extract source function names and check coverage
  let totalFns = 0, coveredFns = 0;
  const uncovered = [];

  for (const sf of srcFiles) {
    if (!sf.content) continue;
    const fns = extractSourceFns(sf);
    totalFns += fns.length;

    for (const fn of fns) {
      const isCovered = isFnTested(fn.name, testedNames);
      if (isCovered) {
        coveredFns++;
      } else {
        uncovered.push({ ...fn, file: sf.path });
      }
    }
  }

  if (totalFns === 0) return issues;

  const pct = Math.round((coveredFns / totalFns) * 100);
  const severity = pct < 30 ? 'high' : pct < 60 ? 'medium' : 'low';

  // Summary issue
  issues.push({
    severity,
    title: `Test coverage: ~${pct}% (${coveredFns}/${totalFns} functions have matching tests)`,
    file: testFiles[0]?.path || '',
    line: 1,
    suggestion: pct < 60
      ? `Focus on testing: security-critical functions, functions with high CC, and public APIs first`
      : `Good coverage. Ensure edge cases and error paths are tested, not just happy paths`,
    coveragePct: pct,
  });

  // Flag up to 10 most important uncovered functions
  const important = uncovered
    .filter(fn => fn.name.length > 3 && !fn.name.startsWith('_'))
    .slice(0, 10);

  for (const fn of important) {
    issues.push({
      severity: 'low',
      title: `No test found for: ${fn.name}()`,
      file: fn.file,
      line: fn.line,
      snippet: fn.sig,
      suggestion: `Add a test named \`test_${fn.name}\` or \`${fn.name}.test\` that covers the main logic and error cases`,
    });
  }

  return issues;
}

function isTestFile(f) {
  const p = (f.path || '').toLowerCase();
  const n = (f.name || '').toLowerCase();
  return /test|spec|__tests__|tests\/|test\//.test(p)
    || /^test_/.test(n)
    || /_test\.(py|go|kt|java|cs|rb)$/.test(n)
    || /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(n);
}

function isCodeFile(lang) {
  return ['js','ts','jsx','tsx','py','go','java','cs','kt','rs','rb','php'].includes(lang);
}

function extractTestNames(tf) {
  const names = new Set();
  if (!tf.content) return names;
  const patterns = [
    /\btest[_\s]+(\w+)/gi,             // test_foo, test foo
    /\bit\s*\(\s*['"`]([^'"`]+)/gi,    // it('should foo')
    /\btest\s*\(\s*['"`]([^'"`]+)/gi,  // test('foo')
    /\bdescribe\s*\(\s*['"`]([^'"`]+)/gi,
    /\bdef\s+test_(\w+)/gi,            // def test_foo
    /\bfunc\s+Test(\w+)/gi,            // func TestFoo (Go)
    /\bfun\s+test(\w+)/gi,             // fun testFoo (Kotlin)
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(tf.content)) !== null) {
      // Normalize: remove common prefixes and split on underscores
      const raw = m[1].toLowerCase().replace(/^(test|should|it|when|given|can)\s+/i, '');
      raw.split(/[\s_]+/).forEach(w => { if (w.length > 2) names.add(w); });
    }
  }
  return names;
}

function extractSourceFns(f) {
  const fns = [];
  if (!f.content) return fns;
  const lines = f.content.split('\n');
  const lang = f.lang;
  const patterns = {
    py:   /^\s*(?:async\s+)?def\s+(\w+)\s*\(/,
    js:   /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/,
    ts:   /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/,
    go:   /^\s*func\s+(?:\(\w+[^)]*\)\s+)?(\w+)\s*\(/,
    java: /^\s*(?:public|private|protected|static)[\w\s<>[\]]*\s+(\w+)\s*\(/,
    cs:   /^\s*(?:public|private|protected|static|override)[\w\s<>[\]?]*\s+(\w+)\s*\(/,
    kt:   /^\s*(?:suspend\s+)?fun\s+(\w+)\s*\(/,
    rb:   /^\s*def\s+(\w+)/,
  };
  const re = patterns[lang] || patterns.js;
  lines.forEach((line, idx) => {
    const m = line.match(re);
    if (!m || !m[1]) return;
    const name = m[1];
    if (name.length < 3) return;
    if (/^(main|init|setUp|tearDown|constructor|render|toString)$/.test(name)) return;
    fns.push({ name, sig: line.trim().slice(0, 80), line: idx + 1, file: f.path });
  });
  return fns;
}

function isFnTested(fnName, testedNames) {
  const norm = fnName.toLowerCase().replace(/_/g, '');
  if (testedNames.has(norm)) return true;
  // Check if any word in the function name appears in test names
  const words = fnName.replace(/([A-Z])/g, ' $1').toLowerCase().trim().split(/\s+/);
  return words.some(w => w.length > 3 && testedNames.has(w));
}
