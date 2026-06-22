/* parser-security.js — Security analysis (ported from Arcflow) */

function secScanContent(f) {
  if (!f.content) return null;
  // skip minified files (avg line > 300 chars)
  if (f.lines > 0 && f.content.length / f.lines > 300) return null;
  return f.content;
}

function secEndLine(lines, idx) {
  var depth = 0, max = Math.min(lines.length, idx + 20);
  for (var i = idx; i < max; i++) {
    var l = lines[i];
    for (var j = 0; j < l.length; j++) {
      if (l[j] === '{') depth++; else if (l[j] === '}') depth--;
    }
    if (depth < 0) return i + 1;
    if (l.trim() === '' && i > idx) return i;
    if (depth === 0 && (l.trimEnd().endsWith(';') || l.trimEnd().endsWith(','))) return i + 1;
  }
  return Math.min(lines.length, idx + 5);
}

async function analyzeSecurity(files) {
  const issues = [];

  for (const f of files) {
    const content = secScanContent(f);
    if (!content) continue;
    const lines = content.split('\n');
    const py = f.lang === 'py';

    lines.forEach(function(line, idx) {
      // Hardcoded secrets
      if (/(?:password|passwd|pwd|secret|api_key|apikey|token|auth)\s*[=:]\s*['"][^'"]{4,}['"]/i.test(line)
          && !line.includes('process.env') && !line.includes('config.') && !line.includes('example') && !line.includes('placeholder')) {
        issues.push({ severity:'high', title:'Hardcoded Secret', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Move to environment variables or a secrets manager' });
      }
      // AWS key
      if (/AKIA[0-9A-Z]{16}/.test(line))
        issues.push({ severity:'high', title:'AWS Key Exposed', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Rotate immediately and use IAM roles' });
      // JWT
      if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./.test(line))
        issues.push({ severity:'high', title:'JWT Token Exposed', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Store tokens in secure storage, not source code' });
      // PEM key
      if (/-----BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+)?PRIVATE KEY/.test(line))
        issues.push({ severity:'high', title:'Private Key in Source', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Rotate and store in secrets manager' });
      // Stripe live key
      if (/(?:sk_live_|rk_live_)[A-Za-z0-9]{20,}/.test(line))
        issues.push({ severity:'high', title:'Stripe Live Key', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Rotate immediately in Stripe dashboard' });
      // DB URL with creds
      if (/(?:postgres|mysql|mongodb|redis|mssql):\/\/[^:@\s]+:[^@\s]+@/.test(line))
        issues.push({ severity:'high', title:'DB URL with Credentials', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Use environment variables for connection strings' });
      // eval
      if (/\beval\s*\(/.test(line) && !py)
        issues.push({ severity:'medium', title:'eval() Usage', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Avoid eval() — refactor to use structured data' });
      // innerHTML
      if (/innerHTML\s*=/.test(line) && !/\.textContent/.test(line))
        issues.push({ severity:'high', title:'innerHTML Assignment (XSS)', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Use textContent or sanitize with DOMPurify' });
      // dangerouslySetInnerHTML
      if (/dangerouslySetInnerHTML/.test(line))
        issues.push({ severity:'medium', title:'dangerouslySetInnerHTML', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Sanitize all HTML before rendering' });
      // weak hash
      if (/(?:crypto\.createHash\s*\(\s*['"](?:md5|sha1)['"]|hashlib\.(md5|sha1)\s*\()/i.test(line))
        issues.push({ severity:'medium', title:'Weak Hash Algorithm', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Use SHA-256 or stronger for security-sensitive hashing' });
      // Math.random in security context
      if (/Math\.random\s*\(\s*\)/.test(line) && /(?:token|secret|password|key|nonce|salt|session|csrf)/i.test(content))
        issues.push({ severity:'medium', title:'Insecure Randomness', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Use crypto.getRandomValues() for cryptographic purposes' });
      // DEBUG = True
      if (/\bDEBUG\s*=\s*True\b/.test(line))
        issues.push({ severity:'medium', title:'Debug Mode Enabled', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Ensure DEBUG=False in production' });
      // SQL concat
      if (/['"`][^'"`]*(?:SELECT|INSERT|UPDATE|DELETE)[^'"`]*(?:\+|\$\{)/i.test(line))
        issues.push({ severity:'high', title:'SQL Injection Risk', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:'Use parameterized queries or an ORM' });
    });

    // Python-specific
    if (py) {
      if (/\beval\s*\(/.test(content)) {
        const i = lines.findIndex(l => /\beval\s*\(/.test(l));
        if (i >= 0) issues.push({ severity:'high', title:'Python eval()', file:f.path, line:i+1, snippet:lines[i].trim().slice(0,80), suggestion:'Use ast.literal_eval() for safe parsing' });
      }
      if (/\bexec\s*\(/.test(content)) {
        const i = lines.findIndex(l => /\bexec\s*\(/.test(l));
        if (i >= 0) issues.push({ severity:'high', title:'Python exec()', file:f.path, line:i+1, snippet:lines[i].trim().slice(0,80), suggestion:'exec() executes arbitrary code — avoid' });
      }
      if (/\bpickle\.load/.test(content)) {
        const i = lines.findIndex(l => /\bpickle\.load/.test(l));
        if (i >= 0) issues.push({ severity:'high', title:'Pickle Deserialization', file:f.path, line:i+1, snippet:lines[i].trim().slice(0,80), suggestion:'Use JSON or safe alternatives' });
      }
      if (/subprocess\.\w+\([^)]*shell\s*=\s*True/.test(content)) {
        const i = lines.findIndex(l => /subprocess\.\w+\([^)]*shell\s*=\s*True/.test(l));
        if (i >= 0) issues.push({ severity:'high', title:'Shell Injection Risk', file:f.path, line:i+1, snippet:lines[i].trim().slice(0,80), suggestion:'Use shell=False with a list of args' });
      }
      if (/\bos\.(system|popen)\s*\(/.test(content)) {
        const i = lines.findIndex(l => /\bos\.(system|popen)\s*\(/.test(l));
        if (i >= 0) issues.push({ severity:'high', title:'OS Command Execution', file:f.path, line:i+1, snippet:lines[i].trim().slice(0,80), suggestion:'Use subprocess with shell=False' });
      }
      if (/\byaml\.load\s*\(/.test(content) && !/yaml\.safe_load/.test(content)) {
        const i = lines.findIndex(l => /\byaml\.load\s*\(/.test(l));
        if (i >= 0) issues.push({ severity:'high', title:'Unsafe YAML Load', file:f.path, line:i+1, snippet:lines[i].trim().slice(0,80), suggestion:'Use yaml.safe_load() instead' });
      }
      if (/verify\s*=\s*False/.test(content) && /\brequests\./.test(content)) {
        const i = lines.findIndex(l => /verify\s*=\s*False/.test(l));
        if (i >= 0) issues.push({ severity:'high', title:'TLS Verification Disabled', file:f.path, line:i+1, snippet:lines[i].trim().slice(0,80), suggestion:'Never disable SSL verification in production' });
      }
    }

    // Entropy scanner — flag high-entropy string literals
    const ext = (f.path || '').split('.').pop().toLowerCase();
    if (!['json','lock','sum','mod','svg','woff','ttf','min'].includes(ext)) {
      lines.forEach(function(line, idx) {
        const strRe = /['"`]([A-Za-z0-9+/=_\-]{20,})[`'"]/g;
        let m;
        while ((m = strRe.exec(line)) !== null) {
          const s = m[1];
          if (/^[a-z][a-z0-9-]*$/.test(s)) continue;
          if (s.includes('.') && s.includes('/')) continue;
          if (/^[0-9a-f-]{32,}$/.test(s) && s.includes('-')) continue;
          if (/^[\w\s]+$/.test(s)) continue;
          const freq = {};
          for (let i = 0; i < s.length; i++) freq[s[i]] = (freq[s[i]] || 0) + 1;
          let ent = 0;
          Object.values(freq).forEach(c => { const p = c / s.length; ent -= p * Math.log2(p); });
          if (ent >= 4.5) {
            const already = issues.some(x => x.file === f.path && x.line === idx + 1 && x.title === 'Hardcoded Secret');
            if (!already)
              issues.push({ severity:'medium', title:'High-Entropy String', file:f.path, line:idx+1, snippet:line.trim().slice(0,80), suggestion:`Entropy ${ent.toFixed(1)} — may be a secret. Move to env vars if sensitive` });
          }
        }
      });
    }
  }

  // dedup by file+line+title
  const seen = new Set();
  return issues.filter(x => {
    const k = `${x.file}:${x.line}:${x.title}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  }).sort((a, b) => (['high','medium','low'].indexOf(a.severity)) - (['high','medium','low'].indexOf(b.severity)));
}
