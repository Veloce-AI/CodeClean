/* accessibility.js — WCAG / ARIA accessibility issues in HTML, JSX, TSX, Vue */

async function analyzeAccessibility(files) {
  const issues = [];

  const webFiles = files.filter(f =>
    ['html','jsx','tsx','vue','svelte'].includes(f.lang) ||
    (f.name.endsWith('.html') || f.name.endsWith('.htm'))
  );

  for (const f of webFiles) {
    if (!f.content) continue;
    const lines = f.content.split('\n');

    lines.forEach((line, idx) => {
      const l = line;
      const trimmed = l.trim();

      // img without alt
      if (/<img\b[^>]*>/i.test(l) && !/\balt\s*=/i.test(l)) {
        issues.push({
          severity: 'high',
          title: '<img> missing alt attribute',
          file: f.path, line: idx + 1,
          snippet: trimmed.slice(0, 80),
          suggestion: 'Add alt="description" for informative images, or alt="" for decorative ones. Screen readers announce the filename if alt is missing.',
        });
      }

      // img with empty src
      if (/<img\b[^>]*src\s*=\s*["']['"]/.test(l)) {
        issues.push({
          severity: 'medium',
          title: '<img> has empty src attribute',
          file: f.path, line: idx + 1,
          snippet: trimmed.slice(0, 80),
          suggestion: 'An empty src causes an extra HTTP request (or renders broken). Conditionally render the img element instead.',
        });
      }

      // input without label (not hidden, not submit, not button)
      if (/<input\b[^>]*>/i.test(l) && !/type\s*=\s*["'](?:hidden|submit|button|image|reset)["']/i.test(l)) {
        if (!/\baria-label\s*=|\baria-labelledby\s*=|\bid\s*=/i.test(l)) {
          issues.push({
            severity: 'high',
            title: '<input> missing label association',
            file: f.path, line: idx + 1,
            snippet: trimmed.slice(0, 80),
            suggestion: 'Add aria-label="Field name" or associate with a <label for="id">. Unlabeled inputs are inaccessible to screen reader users.',
          });
        }
      }

      // button with no accessible text
      if (/<button\b[^>]*>\s*<\/button>/i.test(l) ||
          (/<button\b[^>]*>/i.test(l) && !/aria-label\s*=|aria-labelledby\s*=/i.test(l) && />\s*$/.test(l) && /<\/button>/.test(lines.slice(idx+1, idx+2).join('')))) {
        // Only flag if next line is just closing tag (empty button)
        const nextLine = (lines[idx + 1] || '').trim();
        if (nextLine === '</button>' || /<button[^>]*><\/button>/i.test(l)) {
          issues.push({
            severity: 'high',
            title: '<button> has no accessible text',
            file: f.path, line: idx + 1,
            snippet: trimmed.slice(0, 80),
            suggestion: 'Add visible text or aria-label="Action name". Icon-only buttons must have aria-label for screen readers.',
          });
        }
      }

      // a href with no text (icon links)
      if (/<a\b[^>]*href[^>]*>\s*<(?:svg|img|i|span)[^>]*\/?>/.test(l) && !/aria-label\s*=|aria-labelledby\s*=/i.test(l)) {
        issues.push({
          severity: 'medium',
          title: '<a> link contains only an icon — no accessible text',
          file: f.path, line: idx + 1,
          snippet: trimmed.slice(0, 80),
          suggestion: 'Add aria-label="Link purpose" or include visually-hidden text. Links read as "link" with no context are confusing.',
        });
      }

      // Missing lang on html
      if (/<html\b[^>]*>/i.test(l) && !/\blang\s*=/i.test(l)) {
        issues.push({
          severity: 'medium',
          title: '<html> missing lang attribute',
          file: f.path, line: idx + 1,
          snippet: trimmed.slice(0, 80),
          suggestion: 'Add lang="en" (or appropriate language code) to <html>. Screen readers use this to set pronunciation.',
        });
      }

      // tabindex > 0 (disrupts natural tab order)
      const tabMatch = l.match(/tabindex\s*=\s*["']?(\d+)["']?/i);
      if (tabMatch && parseInt(tabMatch[1]) > 0) {
        issues.push({
          severity: 'low',
          title: `tabindex="${tabMatch[1]}" disrupts natural tab order`,
          file: f.path, line: idx + 1,
          snippet: trimmed.slice(0, 80),
          suggestion: 'Use tabindex="0" to make an element focusable in natural DOM order, or tabindex="-1" to make it programmatically focusable only. Positive tabindex values create confusing navigation.',
        });
      }

      // aria-hidden="true" on interactive elements
      if (/aria-hidden\s*=\s*["']true["']/i.test(l) && /<(?:button|a|input|select|textarea)\b/i.test(l)) {
        issues.push({
          severity: 'high',
          title: 'aria-hidden="true" on interactive element — keyboard trap',
          file: f.path, line: idx + 1,
          snippet: trimmed.slice(0, 80),
          suggestion: 'Never use aria-hidden="true" on focusable elements. It hides them from screen readers but keyboard users can still tab to them, creating a confusing experience.',
        });
      }

      // onClick on non-interactive elements (div, span) without role
      if (/\bonClick\s*=|\bon-click\s*=/i.test(l) && /<(?:div|span|p|li)\b/i.test(l)) {
        if (!/role\s*=|tabindex\s*=/i.test(l)) {
          issues.push({
            severity: 'medium',
            title: 'onClick on non-interactive element — not keyboard accessible',
            file: f.path, line: idx + 1,
            snippet: trimmed.slice(0, 80),
            suggestion: 'Add role="button" and tabindex="0" and an onKeyDown handler for Enter/Space. Or replace with a <button> element.',
          });
        }
      }

      // form without aria-label or legend
      if (/<form\b[^>]*>/i.test(l) && !/aria-label\s*=|aria-labelledby\s*=/i.test(l)) {
        // Only flag if no fieldset/legend follows
        const nextBlock = lines.slice(idx, idx + 5).join('\n');
        if (!/<legend\b|<fieldset\b/i.test(nextBlock)) {
          issues.push({
            severity: 'low',
            title: '<form> without accessible name',
            file: f.path, line: idx + 1,
            snippet: trimmed.slice(0, 80),
            suggestion: 'Add aria-label="Form purpose" or aria-labelledby pointing to a heading. Multiple forms on a page need unique names.',
          });
        }
      }
    });
  }

  const seen = new Set();
  return issues.filter(i => {
    const k = `${i.file}:${i.line}:${i.title.slice(0,30)}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}
