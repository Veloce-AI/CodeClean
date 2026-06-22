/* comment-rot.js — Detect TODOs, commented-out code, empty comments */

async function analyzeCommentRot(files) {
  const issues = [];
  const todoRe = /(?:\/\/|#|<!--)\s*(TODO|FIXME|HACK|BUG|XXX|OPTIMIZE)\b\s*:?\s*(.{0,120})/i;
  const emptyCommentRe = /^\s*(?:\/\/\s*$|#\s*$|\/\*\s*\*\/)/;

  for (const f of files) {
    if (!f.content) continue;
    const lines = f.content.split('\n');
    const lang = f.lang || '';

    let deadCommentBlock = 0;

    lines.forEach((line, idx) => {
      // TODO/FIXME/HACK tracker
      const todo = line.match(todoRe);
      if (todo) {
        const tag = todo[1].toUpperCase();
        const msg = todo[2]?.trim() || '(no description)';
        issues.push({
          severity: tag === 'FIXME' || tag === 'BUG' ? 'medium' : 'low',
          title: `${tag}: ${msg.slice(0, 60)}${msg.length > 60 ? '…' : ''}`,
          file: f.path,
          line: idx + 1,
          snippet: line.trim().slice(0, 80),
          suggestion: 'Resolve or track in an issue tracker with a ticket reference',
        });
      }

      // Empty comments
      if (emptyCommentRe.test(line)) {
        issues.push({
          severity: 'low',
          title: 'Empty comment',
          file: f.path,
          line: idx + 1,
          snippet: line.trim(),
          suggestion: 'Remove empty comment lines',
        });
      }

      // Commented-out code detection
      // A comment line that contains code-like patterns (semicolons, assignments, function calls, braces)
      const stripped = line.replace(/^\s*(?:\/\/|#)\s*/, '');
      if (/^\s*(?:\/\/|#)/.test(line) && !todo) {
        const looksLikeCode =
          /(?:^\s*(?:const|let|var|def|return|if|for|while|import|from|function|class)\s)/.test(stripped) ||
          /(?:;\s*$|\(\s*\)|=>\s*\{|\)\s*\{)/.test(stripped) ||
          /(?:\w+\s*\(.*\)|=\s*\w+\s*[;,])/.test(stripped);

        if (looksLikeCode) {
          deadCommentBlock++;
          if (deadCommentBlock === 3) { // only flag when 3+ consecutive lines look like code
            issues.push({
              severity: 'low',
              title: 'Commented-out code block',
              file: f.path,
              line: idx - 1,
              snippet: lines.slice(Math.max(0, idx - 2), idx + 1).map(l => l.trim()).join(' '),
              suggestion: 'Remove commented-out code — use git history to recover it if needed',
            });
          }
        } else {
          deadCommentBlock = 0;
        }
      } else {
        deadCommentBlock = 0;
      }
    });

    // Restated docstring detection (Python/JS)
    if (lang === 'py') {
      for (let i = 0; i < lines.length - 1; i++) {
        const defMatch = lines[i].match(/^\s*def\s+(\w+)\s*\(/);
        if (!defMatch) continue;
        const fnName = defMatch[1].replace(/_/g, ' ').toLowerCase();
        const nextLine = lines[i + 1]?.trim();
        if (nextLine?.startsWith('"""') || nextLine?.startsWith("'''")) {
          const docText = nextLine.replace(/^['"`]{1,3}/, '').replace(/['"`]{1,3}$/, '').trim().toLowerCase();
          if (docText && fnName && (docText === fnName || docText.replace(/\s+/g, '') === fnName.replace(/\s+/g, ''))) {
            issues.push({
              severity: 'low',
              title: `Docstring just restates function name: ${defMatch[1]}`,
              file: f.path,
              line: i + 2,
              suggestion: 'Write a docstring that explains WHY or HOW, not just what the name already says',
            });
          }
        }
      }
    }
  }

  return issues;
}
