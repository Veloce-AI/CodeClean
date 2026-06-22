/* custom-rules.js — User-defined regex rules applied across the project */

async function analyzeCustomRules(files) {
  const rules = loadCustomRules();
  if (!rules.length) return [];

  const issues = [];

  for (const f of files) {
    if (!f.content) continue;
    const lines = f.content.split('\n');

    for (const rule of rules) {
      if (rule.langs && rule.langs.length && !rule.langs.includes(f.lang)) continue;
      let re;
      try { re = new RegExp(rule.pattern, rule.flags || 'g'); } catch(_) { continue; }

      lines.forEach((line, idx) => {
        if (re.test(line)) {
          re.lastIndex = 0; // reset global flag
          issues.push({
            severity: rule.severity || 'low',
            title: rule.title || `Custom rule: ${rule.pattern}`,
            file: f.path,
            line: idx + 1,
            snippet: line.trim().slice(0, 80),
            suggestion: rule.suggestion || 'Review this pattern per your team standards',
            _ruleId: rule.id,
          });
        }
      });
    }
  }

  return issues;
}

function loadCustomRules() {
  try {
    return JSON.parse(localStorage.getItem('cc-custom-rules') || '[]');
  } catch (_) { return []; }
}

function saveCustomRules(rules) {
  localStorage.setItem('cc-custom-rules', JSON.stringify(rules));
}
