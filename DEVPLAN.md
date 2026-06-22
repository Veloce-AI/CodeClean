# CodeClean — Development Plan

Tick each item after manual test in browser passes before moving to next.

**Stack:** Vanilla JS · No framework · No build step · Fully local · Opens in browser

---

## BATCH 1 — Foundation ✅ COMPLETE

- [x] **1. Folder structure** — `index.html`, `css/base.css`, `css/components.css`, `js/App.js`, `vendor/`, `fonts/`
- [x] **2. File drop zone** — drag-and-drop + File System Access API (`showDirectoryPicker`) shows scanning UI IMMEDIATELY before reading; `webkitdirectory` fallback for older browsers
- [x] **3. Language detection** — detect JS/TS/Python/Go/Java/C#/PHP/Ruby/Rust/Kotlin/C++ by extension; skip `node_modules/`, `.git/`, `dist/`, `build/`, binaries, minified files
- [x] **4. File tree builder** — parse into `{ path, content, lang, lines }` array; scrolling file log during scan showing directories + files as they load (like Arcflow)
- [x] **5. Basic layout** — topbar (logo + project name + Clear + Export + theme); compact sidebar (score ring + stats + language chips + AI prompt + categories); main content area; dark + light theme with localStorage persistence

---

## BATCH 2 — Dead Code Detection ✅ COMPLETE

- [x] **6. Unused files** — cross-file import graph; flag files with 0 inbound imports excluding entry points (`index.*`, `main.*`, `app.*`, `__init__`, `server.*`)
- [x] **7. Unused functions** — extract all function definitions + all call sites across project; diff: defined but never called anywhere = dead
- [x] **8. Unused imports** — extract imported names per file; check if name appears in body after import line; flag zero-use imports (JS named + default, Python from/import)
- [x] **9. Unused variables** — `const/let x =` or Python `x =` where `x` has zero subsequent uses; skip `_` prefix convention
- [x] **10. Dead exports** — exported symbols (`export function`, `module.exports`) that no other file imports by name

---

## BATCH 3 — Security ✅ COMPLETE

- [x] **11. Security patterns** — 20+ patterns: hardcoded secrets/passwords, AWS key (`AKIA…`), JWT token, PEM private key, Stripe live key, DB URL with credentials, SQL string concat, innerHTML XSS, eval/exec, subprocess shell=True, pickle.load, yaml.load without SafeLoader, requests verify=False, Math.random for crypto, weak hash (md5/sha1), DEBUG=True, path traversal
- [x] **12. Entropy scanner** — Shannon entropy on string literals ≥20 chars, entropy ≥4.5 → probable secret even without keyword match; deduped against keyword hits
- [x] **13. Security report card** — grouped by severity (CRITICAL/HIGH/MEDIUM/LOW); shows OWASP tag; code snippet inline; View → button opens full file at flagged line

---

## BATCH 4 — Duplicate Detection ✅ COMPLETE

- [x] **14. Exact block duplicates** — 6-line sliding window hash; identical windows across files = copy-paste; side-by-side code comparison view with file + line on each side
- [x] **15. Structural duplicates** — normalize variable names to `$N` tokens; re-hash function bodies; catches copy-paste with renamed variables
- [x] **16. Name similarity — case/convention** — normalize all function names (lowercase + strip `_`); flag `getUserData` vs `get_user_data` vs `GetUserData` as same-name conflict
- [x] **17. Name similarity — verb synonyms** — hardcoded map: `{get: [fetch,load,retrieve,read,find,query], set: [update,save,put,write,store,persist], delete: [remove,destroy,clear,drop,purge], create: [make,add,new,insert,build,generate], check: [validate,verify,is,has,can,test], handle: [process,manage,on], send: [emit,dispatch,push,notify]}` — flag `fetchUser` + `getUser` as probable duplicates
- [x] **18. Repeated magic values** — same string/number literal in 5+ places across 2+ files; suggest named constant

---

## BATCH 5 — Circular Dependencies ✅ COMPLETE

- [x] **19. Import graph** — directed graph: file → files it imports; resolves relative paths for JS/TS/Python/Go/Java/C#
- [x] **20. Tarjan's SCC** — full Tarjan's Strongly Connected Components algorithm; finds all multi-file cycles
- [x] **21. Cycle display** — plain text chain: `auth.js → user.js → db.js → auth.js`; badge shows cycle length; suggests which edge to break (lowest in-degree node in cycle)

---

## BATCH 6 — Code Smells ✅ COMPLETE

- [x] **22. Long functions** — flag > 60 lines; show function name, line range, full body in code viewer; works for JS/TS/Python/Go/Java/C#/Kotlin/Rust/Ruby/PHP
- [x] **23. Long files** — flag > 300 lines; View → opens full file
- [x] **24. Too many parameters** — flag > 5 params; show signature; suggest options object pattern
- [x] **25. Deep nesting** — finds actual deepest line (not just depth count); brace-counting for C-like, indentation-based for Python; flag > 4 levels
- [x] **26. God file** — > 20 functions OR > 500 lines; flag with function count breakdown

---

## BATCH 7 — Comment Rot ✅ COMPLETE

- [x] **27. Commented-out code** — lines in `//`/`#`/`/* */` matching code patterns (semicolons, `=`, `()`, `if`, `return`); groups 3+ consecutive lines into one finding
- [x] **28. TODO/FIXME tracker** — collects `TODO`, `FIXME`, `HACK`, `BUG`, `XXX`, `OPTIMIZE`; shows file + line + full text; FIXME/BUG = medium severity
- [x] **29. Empty comments** — `//` or `#` with nothing after; pure noise
- [x] **30. Restated docstrings** — Python docstring that just echoes the function name (`def get_user` → `"""Get user"""`)

---

## BATCH 8 — Import Health ✅ COMPLETE

- [x] **31. Unused imports** — per-file; JS named + default + namespace; Python from/import + aliases
- [x] **32. Wildcard imports** — `from x import *`, `import *`, Java `import pkg.*`; HIGH severity for Python (pollutes namespace)
- [x] **33. Buried imports** — import inside function/class body (not at top); flag line; Python indented import = lazy/conditional
- [x] **34. Duplicate imports** — same module imported twice in same file; JS + Python + Java/C#

---

## BATCH 9 — Split Suggestions ✅ COMPLETE

- [x] **35. Function split — comment boundaries** — inline comments (`// Step 1:`, `# validate`) inside long functions; uses comment text as suggested extracted function name
- [x] **36. Function split — blank line boundaries** — blank-line paragraph breaks; ≥ 2 blocks suggest extraction; semantic suffix names (`_validate`, `_process`, `_finalize`) instead of `_part1`
- [x] **37. Function split — param subset** — contiguous block using ≤ 2 of N params (where N > 3) = extraction candidate; shows which params the block needs
- [x] **38. Function split — loop body extraction** — loop body > 10 lines → suggest extracting to named function; works for for/while/foreach
- [x] **39. File split — noun clustering** — group functions by the noun they operate on (`userCreate`, `userDelete` → user module); suggest new filenames
- [x] **40. File split — call isolation** — functions that never call each other AND share no imports → separate module candidates; shows proposed groupings

---

## BATCH 10 — Scoring + Dashboard ✅ COMPLETE

- [x] **41. Per-file score** — 0–100; penalty: CRITICAL −20, HIGH −12, MEDIUM −6, LOW −2; circular dep −15; floor at 0
- [x] **42. Summary dashboard** — dashboard cards (Security, Dead Code, Error Handling, Complexity, Type Safety, Test Coverage, Duplicates, Circular); total issues; clean files count; language count
- [x] **43. Category filter** — click sidebar category or dashboard card → shows only that section; active state highlighted
- [x] **44. Sortable file table** — sort by score / issues / lines / name; color-coded score badge (red < 40, yellow 40–70, green > 70)
- [x] **45. Per-file drill-down** — click any file row → expands inline showing all issues for that file grouped by category with View buttons

---

## BATCH 11 — Export ✅ COMPLETE

- [x] **46. JSON export** — `{ scannedAt, project, totalFiles, totalIssues, categories, issues, fileScores }` — timestamped filename
- [x] **47. HTML export** — self-contained dark-themed HTML; inline CSS; issue table + file scores table; browser Print → Save as PDF
- [x] **48. Copy issue** — copy button on every issue row: copies `title\nfile:line` to clipboard; confirmation toast

---

## BATCH 12 — Code Quality Depth ✅ COMPLETE

- [x] **49. Cyclomatic Complexity (CC)** — count decision points per function (if/elif/else if/for/while/case/catch/&&/||/?); CC = 1 + decision count; flag CC ≥ 8 (low), ≥ 15 (medium, "complex"), ≥ 25 (high, "untestable"); sort worst-first; explains test case count implied by CC
- [x] **50. Error Handling gaps** — JS: empty catch `{}`, catch-only-logs without re-throw, `.then()` without `.catch()`, `new Promise` never calling `reject()`, async without try/catch; Python: bare `except:`, `except: pass`, `print(e)` without logging/re-raise
- [x] **51. Type Safety** — TypeScript: `: any`, `@ts-ignore`, `@ts-nocheck`, non-null assertion `!.`, double-cast `as unknown as T`, implicit any params; Python: untyped function signatures (no type hints), `# type: ignore`; JS: loose equality `==`
- [x] **52. Test Coverage estimator** — detect test files by naming convention (`test_*.py`, `*.test.ts`, `*_test.go`, `*Spec.kt`); extract test function names; map to source functions; show estimated % coverage; list up to 10 uncovered functions; flag projects with zero test files as HIGH severity

---

## BATCH 13 — UX & Intelligence ✅ COMPLETE

- [x] **53. GitHub repo scanning** — enter `owner/repo` or full GitHub URL; optional PAT token for private repos + 5,000 req/hr; uses Git Trees API (single request for file list) with recursive Contents API fallback; live download log per file
- [x] **54. Light/dark theme** — toggle with moon/sun button; CSS custom properties cascade; persisted to localStorage
- [x] **55. Code viewer modal** — View → button on every issue; shows full file content in a table with line numbers; issue line(s) highlighted in orange and scrolled into view; basic syntax highlighting (keywords, strings, comments, numbers, function names); close with ✕ / ESC / backdrop click
- [x] **56. Inline code previews** — category-aware: duplicates = side-by-side comparison panels; smells = function body; split tips = body with `── split point ──` markers; security/dead = 3-line context around flagged line
- [x] **57. Language breakdown sidebar** — stacked color bar showing proportions; compact chip list `● Python 48%  ● JS 24%`; top 6 languages + "N more"
- [x] **58. AI Refactor Prompt generator** — detects project type (FastAPI/Django/Flask/Next.js/React/Express/Go/Java/.NET/Rust); generates CRITICAL → HIGH → MEDIUM → CLEANUP priority bullet points; includes actual code snippets and specific fixes per issue type (SQL injection → parameterized query syntax; eval → ast.literal_eval; XSS → textContent); editable inline, deletable per point, add custom points; architecture suggestions based on actual findings; Copy Prompt → clipboard

---

## BATCH 14 — Remaining / Next Up

### High Priority
- [x] **59. Copy confirmation popup** — inline `✓ Copied!` badge near the copy/prompt button that fades after 2s; positioned above the clicked button via fixed positioning
- [x] **60. About modal** — topbar ℹ button; explains every category, CC, SCC, severity levels, score formula, structural vs exact duplicate, all abbreviations in a searchable table
- [x] **61. Severity filter chips** — `All · High · Medium · Low` chips above issue list; filters all visible issues; shows match count when active
- [x] **62. Auto-fix commands** — per issue, shows shell command where applicable: `autoflake`, `eslint --fix`, `isort`, `goimports`; copy command button inline
- [x] **63. Quick Wins section** — top 8 easiest fixes at the top of the report; shows estimated total fix time; auto-fix command where available; View button
- [x] **64. Configurable thresholds** — ⚙️ settings modal in topbar; sliders for CC limit, fn lines, file lines, nesting depth, fn params, duplicate window; saved to localStorage; Reset Defaults button

### Medium Priority ✅ ALL DONE
- [x] **65. Ignore patterns** — 🚫 topbar button; add/remove glob patterns; persisted to localStorage; applied during FSA collection + drag-drop; re-scan to take effect
- [x] **66. Search across issues** — search bar filters titles + file paths + suggestions in real time; clear button
- [x] **67. Estimated fix time** — per category section header + Quick Wins total; CRITICAL×45m HIGH×20m MEDIUM×10m LOW×3m
- [x] **68. Code metrics dashboard** — horizontal row: Total LOC, Avg CC (with max), Test Files %, Est. Fix Time, Fn Coverage %
- [x] **69. Language-specific rules** — Python: mutable defaults, `is` literals, print(), module globals; JS: `var`, `document.write()`, `==`; Go: `_` error ignore, fmt.Print; Rust: `.unwrap()`, `.expect()`, `unsafe`; Java: raw generics, System.out.println, broad catch; C#: empty catch, Console.Write
- [x] **70. gitignore parsing** — reads `.gitignore` during FSA API folder collection; gitignore → regex conversion; combined with user ignore patterns
- [x] **71. Snapshot diff** — scan saves score+count; re-scan shows: "✨ Fixed N issues! Score 70→85" or "⚠️ N new issues. Score 80→72"

### Nice to Have ✅ ALL DONE
- [x] **72. Keyboard shortcuts** — `/` search, `n/p` category nav, `t` theme, `e` export, `Esc` close, `?` shortcuts modal; ⌨️ topbar button
- [x] **73. File search in sidebar** — filter input in Worst Files header; expands on focus; filters paths in real time
- [x] **74. PDF export** — 🖨️ Print/Save PDF in Export dropdown (browser print-to-PDF)
- [x] **75. SARIF export** — SARIF 2.1.0 JSON with rules + results; available in Export dropdown; imports into GitHub Code Scanning

### New additions (beyond original plan) ✅ COMPLETE
- [x] **76. Cognitive Complexity** — SonarQube CogC algorithm: nesting multiplier per level; sorts worst-first; separate category from CC
- [x] **77. Language-specific patterns** — see #69 + Python: module globals, `is` literal; dedicated `lang-specific.js` analyzer
- [x] **78. Code Patterns** — hardcoded URLs (localhost/IP/domains), meaningless function names (foo/temp/bar), long regex without comment, high TODO density, N+1 DB queries in loops
- [x] **79. Dependency vulnerability scan** — OSV.dev API; parses package.json + requirements.txt + go.mod; batch queries CVEs; shows upgrade commands; works offline gracefully
- [x] **80. AI Refactor Prompt** — project-type detection (FastAPI/React/Express/Django/Go/Java/.NET/Rust); CRITICAL→HIGH→MEDIUM→CLEANUP priority; actual code snippets; specific fix per issue type; architecture suggestions; editable bullet points; Copy to clipboard

---

## File Map

```
C:\VsCode\CodeClean\
├── index.html                          — app shell, script load order
├── DEVPLAN.md                          — this file
├── start.bat                           — double-click to open in browser
├── css/
│   ├── base.css                        — design tokens, dark+light theme, reset, utilities
│   └── components.css                  — all UI components
├── js/
│   ├── App.js                          — state, rendering, event handlers, modal, prompt
│   ├── github.js                       — GitHub API adapter (scan, getFile)
│   ├── analysis/
│   │   ├── dead-code.js               — unused files/functions/imports/vars/exports
│   │   ├── parser-security.js         — 20+ security patterns + entropy scanner
│   │   ├── duplicates.js              — exact blocks, structural, magic values
│   │   ├── name-similarity.js         — convention conflicts + verb synonyms
│   │   ├── circular-deps.js           — Tarjan's SCC for import cycles
│   │   ├── smells.js                  — long fns/files, nesting, params, god file
│   │   ├── cyclomatic.js              — CC per function (decision point counting)
│   │   ├── error-handling.js          — empty catch, swallowed errors, async gaps
│   │   ├── type-safety.js             — TS any/@ts-ignore, Python untyped fns
│   │   ├── test-coverage.js           — test file detection, fn coverage estimate
│   │   ├── comment-rot.js             — TODOs, dead comments, restated docstrings
│   │   ├── import-health.js           — wildcards, buried imports, duplicates
│   │   ├── split-suggest.js           — fn/file split heuristics (no AI)
│   │   └── scorer.js                  — per-file health score 0–100
│   └── components/
│       └── export.js                  — JSON export, HTML report
├── vendor/
│   ├── acorn.min.js                   — JS AST parser (from Arcflow)
│   └── jsrsasign-all-min.js           — JWT signing (for GitHub App auth)
└── fonts/                             — Inter + JetBrains Mono (from Arcflow)
```

---

## Abbreviations Reference

| Term | Meaning |
|------|---------|
| **CC** | Cyclomatic Complexity — number of independent paths through a function (CC = 1 + decision points). CC < 8 = simple, 8–14 = moderate, 15–24 = complex, ≥ 25 = untestable |
| **SCC** | Strongly Connected Component — a group of nodes in a graph where every node can reach every other node; used for finding circular dependency cycles (Tarjan's algorithm) |
| **CRITICAL** | Must fix before shipping — active security vulnerability or data loss risk |
| **HIGH** | Fix in current sprint — significant bug risk, security weakness, or untestable code |
| **MEDIUM** | Fix soon — code smell, complexity, or maintainability issue |
| **LOW** | Fix when convenient — style, clarity, or minor quality issue |
| **INFO** | Informational — no action required, just awareness |
| **Dead Code** | Code that exists but is never executed — wastes space and confuses readers |
| **Structural Duplicate** | Two functions with the same logic but different variable names — caught by normalizing variable names before hashing |
| **Exact Duplicate** | Identical code blocks copy-pasted across files |
| **Magic Value** | A literal string or number used in 5+ places without being named — e.g., `3600` instead of `SECONDS_PER_HOUR` |
| **Entropy Scanner** | Shannon entropy calculation on string literals — high entropy (≥ 4.5 bits/char) indicates a probable secret/key even without keyword matching |
| **Import Graph** | Directed graph where each node is a file and each edge A→B means "A imports B" |
| **God File** | A file doing too much — > 20 functions or > 500 lines — violates Single Responsibility Principle |
| **Tarjan's SCC** | Robert Tarjan's 1972 algorithm for finding all strongly connected components (cycles) in a directed graph in O(V+E) time |
| **PAT** | Personal Access Token — GitHub authentication token for private repos and higher API rate limits (60 → 5,000 req/hr) |
| **XSS** | Cross-Site Scripting — injecting malicious HTML/JS into a page via unsanitized user input (`innerHTML =`) |
| **TLS** | Transport Layer Security — the encryption protocol behind HTTPS; `verify=False` disables certificate checking |
| **FSA API** | File System Access API — modern browser API (`showDirectoryPicker()`) that lets you traverse a local folder with live progress, vs `webkitdirectory` which blocks until fully enumerated |
| **Score 0–100** | Per-file cleanliness score. Starts at 100, deducts: CRITICAL −20, HIGH −12, MEDIUM −6, LOW −2, circular dep −15. Floor at 0. Average across all files = Overall Cleanliness |
