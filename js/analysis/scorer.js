/* scorer.js — Per-file health score (0–100) based on detected issues */

async function scoreFiles(files, results) {
  // Build a per-file issues map
  const fileIssues = {};
  files.forEach(f => { fileIssues[f.path] = []; });

  const allIssues = [
    ...(results.deadCode      || []),
    ...(results.security      || []),
    ...(results.depIssues     || []),
    ...(results.duplicates    || []),
    ...(results.nameIssues    || []),
    ...(results.circular      || []),
    ...(results.smells        || []),
    ...(results.complexity    || []),
    ...(results.cogCx         || []),
    ...(results.langIssues    || []),
    ...(results.patternIssues || []),
    ...(results.errorIssues   || []),
    ...(results.typeIssues    || []),
    ...(results.commentRot    || []),
    ...(results.importIssues  || []),
    ...(results.memoryIssues  || []),
    ...(results.perfIssues    || []),
    ...(results.a11yIssues    || []),
    ...(results.customIssues  || []),
  ];

  allIssues.forEach(issue => {
    const key = issue.file;
    if (!fileIssues[key]) fileIssues[key] = [];
    fileIssues[key].push(issue);
  });

  // Penalty per severity
  const PENALTY = { critical: 20, high: 12, medium: 6, low: 2, info: 1 };

  return files.map(f => {
    const parts = f.path.split('/');
    const name = parts.pop();
    const dir = parts.join('/');

    const fileIssList = fileIssues[f.path] || [];
    let penalty = 0;
    fileIssList.forEach(issue => { penalty += PENALTY[issue.severity] || 2; });

    // Circular dep penalty if this file appears in a cycle
    if (results.circular) {
      const inCycle = results.circular.some(c => c.file === f.path || (c.title && c.title.includes(name)));
      if (inCycle) penalty += 15;
    }

    const score = Math.max(0, Math.min(100, 100 - penalty));

    return {
      path: f.path,
      name,
      dir,
      lang: f.lang,
      lines: f.lines,
      score,
      issues: fileIssList.length,
    };
  }).sort((a, b) => a.score - b.score);
}
