/* dep-scan.js — Dependency vulnerability scan via OSV.dev API (ported from Arcflow) */

async function analyzeDepScan(files) {
  const issues = [];

  // Find package.json and requirements.txt files
  const pkgJson = files.find(f => f.name === 'package.json' && !f.path.includes('node_modules'));
  const reqTxt  = files.filter(f => f.name === 'requirements.txt' || f.name === 'Pipfile' || f.name === 'pyproject.toml');
  const goMod   = files.find(f => f.name === 'go.mod');

  const queries = [];

  // Parse package.json
  if (pkgJson && pkgJson.content) {
    try {
      const pkg = JSON.parse(pkgJson.content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      Object.entries(allDeps).forEach(([name, ver]) => {
        const clean = ver.replace(/[\^~>=<]/g, '').split(' ')[0];
        if (/^\d/.test(clean)) {
          queries.push({ ecosystem:'npm', name, version: clean, file: pkgJson.path });
        }
      });
    } catch (_) {}
  }

  // Parse requirements.txt
  for (const req of reqTxt) {
    if (!req.content) continue;
    req.content.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      // package==1.2.3 or package>=1.0
      const m = line.match(/^([a-zA-Z0-9_\-]+)\s*(?:[><=!]+\s*([\d.]+))?/);
      if (m && m[1]) {
        queries.push({ ecosystem:'PyPI', name: m[1], version: m[2] || '', file: req.path });
      }
    });
  }

  // Parse go.mod
  if (goMod && goMod.content) {
    goMod.content.split('\n').forEach(line => {
      const m = line.trim().match(/^require\s+(\S+)\s+v([\d.]+)/);
      if (m) queries.push({ ecosystem:'Go', name: m[1], version: m[2], file: goMod.path });
    });
  }

  if (!queries.length) return issues;

  // Batch query OSV.dev (max 100 per request)
  const batchSize = 50;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const body = {
      queries: batch.map(q => ({
        version: q.version,
        package: { name: q.name, ecosystem: q.ecosystem },
      })),
    };

    try {
      const resp = await fetch('https://api.osv.dev/v1/querybatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });

      if (!resp.ok) continue;
      const data = await resp.json();

      (data.results || []).forEach((result, idx) => {
        const vulns = result.vulns || [];
        if (!vulns.length) return;
        const q = batch[idx];

        vulns.slice(0, 3).forEach(vuln => {
          const severity = getSeverity(vuln);
          const aliases  = (vuln.aliases || [vuln.id]).slice(0, 3).join(', ');
          const summary  = (vuln.summary || '').slice(0, 120);
          issues.push({
            severity,
            title: `Vulnerable dependency: ${q.name}@${q.version} — ${aliases}`,
            file: q.file,
            snippet: summary,
            suggestion: getUpgradeSuggestion(vuln, q),
            cveId: vuln.id,
          });
        });
      });
    } catch (_) {
      // OSV.dev unreachable — skip silently (user is offline or rate limited)
      break;
    }
  }

  return issues.sort((a,b) => (['critical','high','medium','low'].indexOf(a.severity)) - (['critical','high','medium','low'].indexOf(b.severity)));
}

function getSeverity(vuln) {
  const sev = (vuln.database_specific?.severity || '').toLowerCase();
  if (/critical/.test(sev)) return 'critical';
  if (/high/.test(sev))     return 'high';
  if (/medium|moderate/.test(sev)) return 'medium';
  // Check CVSS score
  const cvss = vuln.severity?.find(s => s.score);
  if (cvss) {
    const score = parseFloat(cvss.score);
    if (score >= 9)   return 'critical';
    if (score >= 7)   return 'high';
    if (score >= 4)   return 'medium';
  }
  return 'low';
}

function getUpgradeSuggestion(vuln, pkg) {
  // Try to find a fixed version from affected ranges
  const fixedVersions = [];
  (vuln.affected || []).forEach(a => {
    (a.ranges || []).forEach(r => {
      (r.events || []).forEach(e => {
        if (e.fixed) fixedVersions.push(e.fixed);
      });
    });
  });

  const eco = pkg.ecosystem.toLowerCase();
  const fixVersion = fixedVersions[0];

  if (eco === 'npm') {
    return fixVersion
      ? `Upgrade to ${pkg.name}@${fixVersion} — run: npm install ${pkg.name}@${fixVersion}`
      : `Upgrade ${pkg.name} to the latest version — run: npm update ${pkg.name}`;
  }
  if (eco === 'pypi') {
    return fixVersion
      ? `Upgrade to ${pkg.name}==${fixVersion} — run: pip install ${pkg.name}==${fixVersion}`
      : `Upgrade ${pkg.name} — run: pip install --upgrade ${pkg.name}`;
  }
  if (eco === 'go') {
    return fixVersion
      ? `Upgrade to v${fixVersion} — run: go get ${pkg.name}@v${fixVersion}`
      : `Upgrade ${pkg.name} — run: go get -u ${pkg.name}`;
  }
  return `Upgrade ${pkg.name} to the latest patched version`;
}
