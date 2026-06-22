/* export.js — JSON and self-contained HTML report export */

function exportJSON() {
  if (!window.state?.results) return;
  const data = {
    scannedAt: new Date().toISOString(),
    project: state.projectName,
    totalFiles: state.files.length,
    totalIssues: state.results.totalIssues,
    cleanFiles: state.results.cleanFiles,
    langCount: state.results.langCount,
    categories: {
      deadCode:     state.results.deadCode?.length || 0,
      security:     state.results.security?.length || 0,
      duplicates:   state.results.duplicates?.length || 0,
      nameIssues:   state.results.nameIssues?.length || 0,
      circular:     state.results.circular?.length || 0,
      smells:       state.results.smells?.length || 0,
      commentRot:   state.results.commentRot?.length || 0,
      importIssues: state.results.importIssues?.length || 0,
      splitTips:    state.results.splitTips?.length || 0,
    },
    issues: {
      deadCode:     state.results.deadCode     || [],
      security:     state.results.security     || [],
      duplicates:   state.results.duplicates   || [],
      nameIssues:   state.results.nameIssues   || [],
      circular:     state.results.circular     || [],
      smells:       state.results.smells       || [],
      commentRot:   state.results.commentRot   || [],
      importIssues: state.results.importIssues || [],
      splitTips:    state.results.splitTips    || [],
    },
    fileScores: state.results.fileScores || [],
  };
  downloadBlob(
    JSON.stringify(data, null, 2),
    'application/json',
    `codeclean-${state.projectName || 'report'}-${dateStamp()}.json`
  );
  showToast('JSON report downloaded', 'success');
}

function exportHTML() {
  if (!window.state?.results) return;
  const r = state.results;

  const allIssues = [
    ...(r.security     || []).map(i => ({ ...i, category: 'Security' })),
    ...(r.deadCode     || []).map(i => ({ ...i, category: 'Dead Code' })),
    ...(r.smells       || []).map(i => ({ ...i, category: 'Code Smell' })),
    ...(r.duplicates   || []).map(i => ({ ...i, category: 'Duplicate' })),
    ...(r.circular     || []).map(i => ({ ...i, category: 'Circular Dep' })),
    ...(r.commentRot   || []).map(i => ({ ...i, category: 'Comment Rot' })),
    ...(r.importIssues || []).map(i => ({ ...i, category: 'Import' })),
    ...(r.nameIssues   || []).map(i => ({ ...i, category: 'Naming' })),
  ].sort((a, b) => ['high','medium','low','info'].indexOf(a.severity) - ['high','medium','low','info'].indexOf(b.severity));

  const sevColors = { high:'#ff5f5f', medium:'#ff9f43', low:'#4d9fff', info:'#8b8b95', critical:'#ff2020' };
  const score = r.fileScores?.length
    ? Math.round(r.fileScores.reduce((s, f) => s + f.score, 0) / r.fileScores.length)
    : 100;
  const scoreColor = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : score >= 30 ? '#ff9f43' : '#ff5f5f';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CodeClean Report — ${escHtml(state.projectName)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Inter,system-ui,sans-serif;background:#0a0a0c;color:#f0f0f2;padding:32px;line-height:1.5}
  h1{font-size:24px;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px}
  .meta{font-size:12px;color:#8b8b95;margin-bottom:32px}
  .summary{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:32px}
  .stat{background:#161619;border:1px solid #222228;border-radius:10px;padding:16px 20px;min-width:100px;text-align:center}
  .stat-v{font-size:28px;font-weight:700}
  .stat-l{font-size:10px;color:#8b8b95;text-transform:uppercase;margin-top:2px}
  .issues{display:flex;flex-direction:column;gap:8px}
  .issue{background:#161619;border:1px solid #222228;border-radius:8px;padding:12px 14px;display:flex;gap:12px;align-items:flex-start}
  .issue:hover{border-color:#2d2d35}
  .badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:999px;text-transform:uppercase;white-space:nowrap;flex-shrink:0}
  .cat{font-size:9px;color:#8b8b95;background:#1c1c21;padding:2px 6px;border-radius:4px;flex-shrink:0}
  .issue-title{font-size:12px;font-weight:500;margin-bottom:3px}
  .issue-file{font-size:10px;color:#5c5c66;font-family:monospace}
  .issue-snippet{font-size:10px;font-family:monospace;background:#0f0f12;padding:6px 8px;border-radius:5px;margin-top:6px;color:#ff9f43;overflow-x:auto;white-space:pre}
  .issue-tip{font-size:10px;color:#22c55e;margin-top:4px}
  .section-title{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#5c5c66;margin:24px 0 10px}
  .score{font-size:48px;font-weight:800;color:${scoreColor}}
  @media print{body{background:#fff;color:#111}
    .issue{border-color:#ddd;background:#fafafa}
    .issue-snippet{background:#f5f5f5;color:#c06}
    .stat{background:#f8f8f8;border-color:#e0e0e0}
  }
</style>
</head>
<body>
<h1>CodeClean Report</h1>
<div class="meta">
  Project: <strong>${escHtml(state.projectName)}</strong> &nbsp;·&nbsp;
  ${state.files.length} files &nbsp;·&nbsp;
  Scanned: ${new Date().toLocaleString()}
</div>

<div class="summary">
  <div class="stat"><div class="stat-v" style="color:${scoreColor}">${score}</div><div class="stat-l">Score /100</div></div>
  <div class="stat"><div class="stat-v" style="color:${allIssues.length > 0 ? '#ff9f43' : '#22c55e'}">${allIssues.length}</div><div class="stat-l">Total Issues</div></div>
  <div class="stat"><div class="stat-v">${state.files.length}</div><div class="stat-l">Files</div></div>
  <div class="stat"><div class="stat-v" style="color:#22c55e">${r.cleanFiles || 0}</div><div class="stat-l">Clean Files</div></div>
  <div class="stat"><div class="stat-v">${r.langCount || 0}</div><div class="stat-l">Languages</div></div>
</div>

<div class="section-title">All Issues (sorted by severity)</div>
<div class="issues">
${allIssues.slice(0, 200).map(issue => `
  <div class="issue">
    <span class="badge" style="background:${sevColors[issue.severity] || '#555'}22;color:${sevColors[issue.severity] || '#999'};border:1px solid ${sevColors[issue.severity] || '#555'}44">${issue.severity || 'info'}</span>
    <span class="cat">${issue.category}</span>
    <div style="flex:1;min-width:0">
      <div class="issue-title">${escHtml(issue.title || issue.message || '')}</div>
      ${issue.file ? `<div class="issue-file">${escHtml(issue.file)}${issue.line ? ':' + issue.line : ''}</div>` : ''}
      ${issue.snippet ? `<div class="issue-snippet">${escHtml(issue.snippet)}</div>` : ''}
      ${issue.suggestion ? `<div class="issue-tip">💡 ${escHtml(issue.suggestion)}</div>` : ''}
    </div>
  </div>`).join('')}
</div>

${r.fileScores?.length ? `
<div class="section-title">File Scores</div>
<table style="width:100%;border-collapse:collapse;font-size:11px">
  <tr style="border-bottom:1px solid #222228">
    <th style="text-align:left;padding:6px 8px;color:#5c5c66;font-weight:600">File</th>
    <th style="text-align:right;padding:6px 8px;color:#5c5c66;font-weight:600">Score</th>
    <th style="text-align:right;padding:6px 8px;color:#5c5c66;font-weight:600">Issues</th>
    <th style="text-align:right;padding:6px 8px;color:#5c5c66;font-weight:600">Lines</th>
  </tr>
  ${r.fileScores.slice(0,50).map(f => `
  <tr style="border-bottom:1px solid #1a1a1f">
    <td style="padding:6px 8px;font-family:monospace;color:#c8c8cd">${escHtml(f.path)}</td>
    <td style="text-align:right;padding:6px 8px;font-weight:700;color:${f.score>=75?'#22c55e':f.score>=50?'#eab308':f.score>=30?'#ff9f43':'#ff5f5f'}">${f.score}</td>
    <td style="text-align:right;padding:6px 8px;color:#8b8b95">${f.issues}</td>
    <td style="text-align:right;padding:6px 8px;color:#8b8b95">${f.lines||'—'}</td>
  </tr>`).join('')}
</table>` : ''}

<div style="margin-top:40px;font-size:10px;color:#5c5c66;text-align:center">
  Generated by CodeClean &nbsp;·&nbsp; ${new Date().toISOString()}
</div>
</body>
</html>`;

  downloadBlob(html, 'text/html', `codeclean-${state.projectName || 'report'}-${dateStamp()}.html`);
  showToast('HTML report downloaded', 'success');
}

/* ── SARIF Export (#75) ──────────────────────────────── */
function exportSARIF() {
  if (!window.state?.results) return;
  const r = state.results;
  const allIssues = [
    ...(r.security     || []).map(i => ({ ...i, _cat:'security' })),
    ...(r.deadCode     || []).map(i => ({ ...i, _cat:'dead-code' })),
    ...(r.smells       || []).map(i => ({ ...i, _cat:'code-smell' })),
    ...(r.complexity   || []).map(i => ({ ...i, _cat:'complexity' })),
    ...(r.errorIssues  || []).map(i => ({ ...i, _cat:'error-handling' })),
    ...(r.typeIssues   || []).map(i => ({ ...i, _cat:'type-safety' })),
    ...(r.langIssues   || []).map(i => ({ ...i, _cat:'lang-pattern' })),
    ...(r.patternIssues|| []).map(i => ({ ...i, _cat:'code-pattern' })),
    ...(r.commentRot   || []).map(i => ({ ...i, _cat:'comment-rot' })),
    ...(r.importIssues || []).map(i => ({ ...i, _cat:'import-health' })),
    ...(r.circular     || []).map(i => ({ ...i, _cat:'circular-dep' })),
  ];

  const severityMap = { critical:'error', high:'error', medium:'warning', low:'note', info:'none' };
  const ruleMap = {};
  allIssues.forEach(i => { ruleMap[i._cat + ':' + (i.title||'').slice(0,40)] = true; });

  const rules = Object.keys(ruleMap).map(id => ({
    id,
    name: id.replace(/[-:]/g, '_'),
    shortDescription: { text: id.split(':').pop() },
    helpUri: 'https://github.com/CodeClean',
  }));

  const results = allIssues.map(i => ({
    ruleId: i._cat + ':' + (i.title||'').slice(0,40),
    level: severityMap[i.severity] || 'note',
    message: { text: (i.title || '') + (i.suggestion ? ' — ' + i.suggestion : '') },
    locations: i.file ? [{
      physicalLocation: {
        artifactLocation: { uri: i.file.replace(/\\/g, '/'), uriBaseId: '%SRCROOT%' },
        region: { startLine: i.line || 1, endLine: i.lineEnd || i.line || 1 },
      },
    }] : [],
  }));

  const sarif = {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'CodeClean',
          version: '1.0.0',
          informationUri: 'https://github.com/CodeClean',
          rules,
        },
      },
      results,
      properties: {
        project: state.projectName,
        scannedAt: new Date().toISOString(),
        totalFiles: state.files.length,
        totalIssues: r.totalIssues,
      },
    }],
  };

  downloadBlob(JSON.stringify(sarif, null, 2), 'application/json', `codeclean-${state.projectName||'report'}-${dateStamp()}.sarif`);
  showToast('SARIF report downloaded — import into GitHub Code Scanning', 'success');
}

/* ── Utils ───────────────────────────────────────────── */
function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
