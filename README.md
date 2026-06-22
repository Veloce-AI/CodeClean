<div align="center">

<img src="logo.png" width="130" alt="CodeClean Logo">

<br><br>

<h1>CodeClean</h1>



<h3>Local Code Quality Analyzer — Zero Install, Zero Cloud</h3>

<p><strong>Find dead code · Detect security issues · Spot memory leaks · Measure complexity · Check test coverage — all in your browser, nothing ever uploaded.</strong></p>

<br>

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](LICENSE) [![GitHub Stars](https://img.shields.io/github/stars/Veloce-AI/CodeClean?style=flat-square&color=6366f1)](https://github.com/Veloce-AI/CodeClean/stargazers) [![Open Issues](https://img.shields.io/github/issues/Veloce-AI/CodeClean?style=flat-square&color=a78bfa)](https://github.com/Veloce-AI/CodeClean/issues) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-a78bfa?style=flat-square)](https://github.com/Veloce-AI/CodeClean/pulls) [![Works Offline](https://img.shields.io/badge/works-offline-6366f1?style=flat-square)](#whats-bundled-offline) [![Zero Install](https://img.shields.io/badge/zero-install-a78bfa?style=flat-square)](#quick-start--zero-setup)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/Veloce-AI.codeclean?style=flat-square&logo=visualstudiocode&label=VS%20Code%20Marketplace&color=6366f1)](https://marketplace.visualstudio.com/items?itemName=Veloce-AI.codeclean) [![Installs](https://img.shields.io/visual-studio-marketplace/i/Veloce-AI.codeclean?style=flat-square&color=a78bfa&label=installs)](https://marketplace.visualstudio.com/items?itemName=Veloce-AI.codeclean) [![Rating](https://img.shields.io/visual-studio-marketplace/r/Veloce-AI.codeclean?style=flat-square&color=6366f1)](https://marketplace.visualstudio.com/items?itemName=Veloce-AI.codeclean)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla_ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-offline-E34F26?style=flat-square&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-custom_theme-264DE4?style=flat-square&logo=css3&logoColor=white) ![20 Analyzers](https://img.shields.io/badge/analyzers-20-a78bfa?style=flat-square) ![Languages](https://img.shields.io/badge/languages-15+-ff9f43?style=flat-square) ![OWASP](https://img.shields.io/badge/OWASP-Top_10-000000?style=flat-square) ![SARIF](https://img.shields.io/badge/SARIF-2.1.0-0078D4?style=flat-square&logo=github&logoColor=white) ![OSV](https://img.shields.io/badge/OSV.dev-CVE_scan-22c55e?style=flat-square)

<br>

<p>Drop a folder, paste a GitHub URL, or open a ZIP — and in seconds see every quality issue in your codebase,<br>
from hardcoded secrets to memory leaks to untestable functions. Runs 100% locally. No account. No server. No data leaving your machine.</p>

<br>

<p><em>Developed with ♥ by <strong><a href="https://veloceai.in">VeloceAI.in</a></strong> — open source for the community</em></p>

</div>

---

## What is CodeClean?

**CodeClean is a local code quality scanner** — drop a folder or GitHub repo, get an instant health score, and see exactly what to fix. No install. No account. Nothing uploaded.

**What it finds:**
- 💀 **Dead code** — unused files, functions, imports and variables clogging your codebase
- 🔑 **Security issues** — hardcoded secrets, SQL injection, XSS, weak crypto, CVE vulnerabilities
- 🔄 **Circular dependencies** — import cycles that make refactoring impossible
- 🧠 **High complexity** — functions too hard to test or understand (Cyclomatic + Cognitive CC)
- 💾 **Memory leaks** — unclosed handles, missing cleanup, growing collections
- ⚡ **Performance issues** — N+1 queries, DOM queries in loops, string concat in loops
- ♿ **Accessibility** — missing alt text, unlabeled inputs, ARIA violations
- 🧪 **Test gaps** — uncovered functions, missing test files
- 🏗️ **Split suggestions** — where to break up long functions and large files

**What makes it different:**
- 🖥️ Runs **100% in your browser** — no server, no cloud, no data ever leaves your machine
- ⚡ Results in **seconds** — drop a folder and it's done
- 🔍 Shows the **actual code** for every issue, not just a file name
- 💡 Gives a **specific fix** in your language, not generic advice
- ✨ Generates a **ready-to-paste AI prompt** to automate the fixes in Claude / ChatGPT

---

## How to Open

### Option 1 — VS Code Extension (recommended)

Install from the VS Code Marketplace or search **"CodeClean"** in the Extensions panel (`Ctrl+Shift+X`).

Click the **CodeClean shield icon** in the Activity Bar to launch. Your current workspace folder is automatically available for scanning.

### Option 2 — start.bat (Windows)

Double-click `start.bat`. Starts a local server on port `3847` and opens your browser automatically.  
Tries Python 3 → Python 2 → Node.js in order. Falls back to direct file open (Firefox only).

### Option 3 — VS Code Live Server

Install the "Live Server" extension → right-click `index.html` → **Open with Live Server**.

### Option 4 — Firefox direct

Firefox allows opening multi-file HTML projects directly from disk. Chrome and Edge require a local server (use Options 1–3 above).

---

## Quick Start — Zero Setup

```bash
# Clone
git clone https://github.com/Veloce-AI/CodeClean.git

# Open (pick any one)
# 1. Double-click start.bat
# 2. VS Code → right-click index.html → Open with Live Server
# 3. Firefox → File → Open File → index.html
```

No `npm install`. No build step. No terminal required. All libraries ship in `vendor/`.

---

## Loading Your Code

| Method | How | Best for |
|---|---|---|
| **Local Folder** | Click folder or drag-drop | Your code on disk — uses File System Access API for instant progress |
| **ZIP Archive** | Click "📦 Open ZIP" | Snapshots, exported repos, offline analysis |
| **GitHub Repo** | Paste `owner/repo` or full URL | Public repos; add a PAT for private repos and 5,000 req/hr |

> **GitHub Token (PAT)**: From GitHub → Settings → Developer settings → Personal access tokens → Generate. Gives access to private repos and raises the rate limit from 60 to 5,000 requests/hour.

---

## The Interface

```
┌──────────────────────────── Topbar ──────────────────────────────────────┐
│ ✓CodeClean │ project │ 96 files │ ✕ Clear    Export▼  ⚡Rules 🚫Ignore ⚙ │
├──── Sidebar ──────────┬──────────────────── Content Area ───────────────┤
│  Score Ring (0–100)  │  ⚡ Quick Wins (collapsible)                     │
│  Trend Sparkline     │  📊 Metrics Row (LOC · CC · Tests · Fix Time)    │
│  4 summary stats     │  🔍 Search bar                                   │
│  Language chips      │  Severity filter chips (All · High · Med · Low)  │
│  ✨ AI Prompt button │                                                   │
│                      │  Issue Sections (collapsible, each with View →)  │
│  CATEGORIES          │  ┌─ Dead Code ──────────── ✓ Clean / 12 issues  │
│  ● All Issues        │  ├─ Security ────────────── HIGH × 3             │
│  ● Dead Code         │  ├─ Dependencies (CVE) ──── 2 vulnerabilities    │
│  ● Security          │  ├─ Cyclomatic CC ────────── CC 24 (untestable)  │
│  ● Dependencies      │  ├─ Cognitive Complexity ── CogC 31              │
│  ● Cyclomatic CC     │  ├─ Error Handling ─────────                     │
│  ● ...               │  ├─ Type Safety ────────────                     │
│                      │  ├─ Test Coverage ──────────                     │
│  Worst Files         │  ├─ Memory Leaks ────────────                   │
│  [search] filter…    │  ├─ Performance ────────────                    │
│  ● auth.py      23   │  ├─ Accessibility ──────────                    │
│  ● api.js       41   │  ├─ Code Smells ────────────                    │
│  ...                 │  ├─ Duplicates ─────────────                    │
└──────────────────────┴──────────────────── File Health Table ───────────┘
```

---

## All 20 Analyzers

### 1. Dead Code
Finds code that exists but is never executed.
- **Unused files** — files with no inbound imports (excluding entry points)
- **Unused functions** — defined but never called anywhere in the project
- **Unused imports** — imported names that never appear in the file body
- **Unused variables** — `const x =` with zero subsequent uses
- **Dead exports** — exported symbols no other file imports by name

### 2. Security
20+ patterns ported from OWASP and real-world CVEs.
- Hardcoded secrets, passwords, API keys, tokens
- AWS keys (`AKIA…`), JWT tokens, PEM private keys, Stripe live keys
- Database URLs with embedded credentials
- SQL injection via string concatenation
- XSS via `innerHTML =` and `dangerouslySetInnerHTML`
- `eval()`, `exec()`, `subprocess shell=True`, `pickle.load()`
- Weak hash algorithms (MD5, SHA-1)
- `verify=False` TLS bypass
- `DEBUG = True` in production
- **Entropy scanner** — Shannon entropy ≥ 4.5 bits/char flags probable secrets even without keyword match

### 3. Dependency Vulnerabilities (CVE)
Real-time scan via [OSV.dev](https://osv.dev) API.
- Parses `package.json`, `requirements.txt`, `go.mod`
- Batch queries all dependencies in one API call
- Shows CVE IDs, severity, and upgrade commands
- Works offline gracefully (skips if no network)

### 4. Duplicates
Three levels of duplicate detection.
- **Exact blocks** — 6-line (configurable) sliding window hash; cross-file matches shown in side-by-side comparison
- **Structural duplicates** — normalizes variable names to `$N` tokens; catches copy-paste with renamed vars
- **Magic values** — same string/number literal in 5+ places across files → suggest named constant

### 5. Name Similarity
- **Convention conflicts** — `getUserData` vs `get_user_data` vs `GetUserData` normalized and grouped
- **Verb synonyms** — hardcoded map: get/fetch/load/retrieve, set/update/save/put, delete/remove/destroy, create/make/add/insert, check/validate/verify
- **Meaningless names** — `foo`, `bar`, `temp`, `data`, `stuff` flagged

### 6. Circular Dependencies
Uses **Tarjan's Strongly Connected Components** algorithm on the full import graph.
- Detects all multi-file import cycles
- Shows as human-readable chain: `auth.js → user.js → db.js → auth.js`
- Suggests which edge to break (lowest in-degree file in the cycle)

### 7. Code Smells
- Long functions (> 60 lines, configurable)
- Long files (> 300 lines, configurable)
- Deep nesting (> 4 levels, configurable) — finds the actual deepest line
- Too many parameters (> 5, configurable)
- God files (> 20 functions or > 500 lines)

### 8. Cyclomatic Complexity (CC)
Industry standard metric: `CC = 1 + decision points` where decision points = `if / elif / else if / for / while / case / catch / && / ||`.
- CC < 8 = simple (not flagged)
- CC 8–14 = moderate
- CC 15–24 = complex (hard to test)
- CC ≥ 25 = untestable (implies ≥ 25 test cases needed)

### 9. Cognitive Complexity
[SonarQube's cognitive complexity](https://www.sonarsource.com/docs/CognitiveComplexity.pdf) — measures how **hard code is to understand**, not just path count.
- Nesting adds a multiplier: an `if` at depth 2 costs +3 instead of +1
- More human-readable than CC for spotting deeply nested spaghetti
- CogC ≥ 20 = hard to understand; ≥ 30 = very hard

### 10. Error Handling
- **JS/TS**: empty catch blocks, catch that only logs without re-throwing, `.then()` without `.catch()`, `new Promise` never calling `reject()`, `async` functions without try/catch, `useEffect` with subscriptions but no cleanup return
- **Python**: bare `except:`, `except: pass`, `print(e)` without logging or re-raise

### 11. Type Safety
- **TypeScript**: `: any`, `@ts-ignore`, `@ts-nocheck`, non-null assertion `!.`, double-cast `as unknown as T`, implicit any params
- **Python**: functions without type hints, `# type: ignore`
- **JavaScript**: loose equality `==` (use `===`)

### 12. Test Coverage (Estimated)
- Detects test files by naming convention (`test_*.py`, `*.test.ts`, `*_test.go`, `*Spec.kt`)
- Maps test function names to source function names
- Shows estimated coverage percentage
- Lists up to 10 uncovered functions
- Flags projects with zero test files as HIGH severity

### 13. Language-Specific Patterns
- **Python**: mutable default arguments `def foo(x=[])`, `is` on literals, `print()` in production, module-level mutable globals
- **JavaScript**: `var` declarations, `document.write()`, loose equality `==`
- **Go**: ignored errors with `_, err = ...`, `fmt.Println` in production, naked returns
- **Rust**: `.unwrap()`, `.expect()`, `unsafe {}` blocks in non-test code
- **Java**: raw generic types `List list`, `System.out.println`, catching `Exception` or `Throwable`
- **C#**: empty catch, `Console.WriteLine` in production

### 14. Code Patterns
- **Hardcoded URLs** — localhost, private IPs, external domains hardcoded in source
- **Meaningless function names** — functions named `foo`, `bar`, `temp`, `test2`, `data`, `stuff`
- **Long regex** — patterns > 80 chars without an explanatory comment
- **High TODO density** — files where > 5% of lines are TODOs/FIXMEs
- **N+1 queries** — ORM query calls detected inside loops

### 15. Memory Leaks
- **JS/TS**: `addEventListener` without `removeEventListener`, `setInterval` without `clearInterval`, `setTimeout` in loops, `useEffect` with subscriptions but no cleanup return, module-level collections that only grow
- **Python**: files opened without `with` context manager, DB connections not closed, `self.list` that grows but never clears

### 16. Performance
- **JS/TS**: array mutation inside `.map()/.filter()`, `JSON.parse/stringify` in loops, synchronous XHR, DOM queries in loops, 3+ chained array methods, React missing `key` prop, inline functions/objects in JSX props
- **Python**: string concatenation in loops (`str +=`), missing list comprehensions, regex in loops without pre-compiling, unnecessary `list()` wrapping
- **Go**: string concatenation in loops (use `strings.Builder`)

### 17. Accessibility
WCAG 2.1 checks for HTML, JSX, TSX, Vue, Svelte.
- `<img>` missing `alt` attribute
- `<input>` without label association (`aria-label` or `<label for>`)
- Empty `<button>` with no accessible text
- `<a>` links containing only icons with no `aria-label`
- Missing `lang` attribute on `<html>`
- `tabindex > 0` disrupting natural tab order
- `aria-hidden="true"` on interactive elements (keyboard trap)
- `onClick` on non-interactive elements without `role`

### 18. Comment Rot
- **Commented-out code** — blocks of `//` or `#` lines that look like real code
- **TODOs/FIXMEs** — tracked with file/line; FIXME and BUG flagged as medium severity
- **Empty comments** — `//` or `#` with nothing after
- **Restated docstrings** — Python docstring that just echoes the function name

### 19. Import Health
- **Wildcard imports** — `from x import *`, `import *` — pollutes namespace
- **Buried imports** — imports inside functions/classes rather than at top level
- **Duplicate imports** — same module imported twice in same file

### 20. Split Suggestions (No AI)
Pure heuristic function and file splitting recommendations.
- **Comment boundaries** — `// Step 1:` / `# validate` inside long functions → extracted function name from comment text
- **Blank-line boundaries** — paragraph breaks inside long functions → semantic suffix names (`_validate`, `_process`, `_finalize`)
- **Parameter subsets** — a block that uses only 2 of N params → extraction candidate
- **Loop body extraction** — loop body > 10 lines → suggest extracting to named function
- **File noun clustering** — group functions by the noun they operate on → suggest module split
- **Call isolation** — functions that never call each other and share no imports → separate module candidates

---

## Issue Display

Every issue has:
- **Severity badge** — CRITICAL / HIGH / MEDIUM / LOW / INFO
- **File path + line number** — click to open
- **Inline code preview** — actual code around the flagged line with syntax highlighting
- **💡 Suggestion** — specific fix with example syntax
- **View →** button — opens the full code viewer modal with the issue line highlighted in orange
- **Copy** button — copies `title\nfile:line` to clipboard

**Duplicate issues** show a **side-by-side comparison panel** with both files and line numbers.

**Split suggestions** show the function body with `── split point ──` markers at natural boundaries.

---

## Code Viewer Modal

Click **View →** on any issue to open the full file in a modal:
- Line numbers in a table
- Issue line(s) highlighted in **orange** with a left border marker
- Scrolls automatically to the highlighted line
- Syntax highlighting: keywords (purple), strings (green), comments (grey), numbers (orange), function names (blue)
- Close with ✕, ESC, or click outside

---

## AI Refactor Prompt

Click **✨ Generate AI Refactor Prompt** in the sidebar (appears after scanning).

Generates a structured prompt you can paste into Claude, ChatGPT, or Gemini:
- **Detects project type** (FastAPI, Django, Flask, Next.js, React, Express, Go, Java, .NET, Rust)
- **Priority tiers**: 🚨 Critical → 🔴 High → 🟡 Medium → 🔵 Cleanup → 🧪 Tests → 🏗 Architecture
- **Includes actual code snippets** and specific fix syntax per issue type
- **Architecture suggestions** based on actual findings (circular deps → DI, god files → module split)
- Every bullet is **inline editable**, deletable, and you can add custom points
- **Copy Prompt** sends the full structured prompt to clipboard

---

## Settings ⚙

Click the gear icon in the topbar. Thresholds are saved to `localStorage`.

| Setting | Default | What it controls |
|---|---|---|
| CC threshold | 8 | Minimum CC to flag a function |
| Max function lines | 60 | Flag functions longer than this |
| Max file lines | 300 | Flag files longer than this |
| Max nesting depth | 4 | Flag nesting deeper than this |
| Max function params | 5 | Flag functions with more params |
| Duplicate window | 6 | Lines in each sliding window for duplicate detection |

---

## Ignore Patterns 🚫

Click the 🚫 icon in the topbar. Patterns are saved to `localStorage` and applied on next scan.

| Example | What it skips |
|---|---|
| `**/migrations/**` | Django/Alembic migration files |
| `**/__pycache__/**` | Python bytecode |
| `*.generated.*` | Auto-generated files |
| `**/vendor/**` | Vendored dependencies |
| `**/*.min.js` | Minified JavaScript |

Gitignore patterns are also read automatically from `.gitignore` in your project root.

---

## Custom Rules ⚡

Click the ⚡ icon in the topbar. Define your own regex patterns applied across all files.

| Field | Example |
|---|---|
| Title | "TODO without ticket reference" |
| Pattern | `TODO(?!\s*#\d+)` |
| Flags | `gi` |
| Severity | medium |
| Suggestion | "Always include a JIRA ticket: TODO #123" |

Rules are stored in `localStorage` and shown in the "Custom Rules" category after scanning.

---

## Score (0–100)

Each file starts at 100. Penalties per issue:

| Severity | Penalty |
|---|---|
| CRITICAL | −20 |
| HIGH | −12 |
| MEDIUM | −6 |
| LOW | −2 |
| Circular dep | −15 extra |

Score **≥ 75** = Clean (green) · **50–74** = Moderate (yellow) · **30–49** = Poor (orange) · **< 30** = Critical (red)

The **Overall Cleanliness** ring = average across all files. The sparkline below it shows your score trend over the last 15 scans.

---

## Snapshot Diff

Re-scan the same project and a banner appears showing what changed:
- `📈 Fixed 23 issues! Score 68→85` 
- `📉 5 new issues. Score 80→72`

Stored in `sessionStorage` — survives page refresh, cleared when you close the tab.

---

## Export

Click **Export** in the topbar.

| Format | Contents |
|---|---|
| **JSON** | Full results object with all issues, file scores, metadata |
| **HTML Report** | Self-contained dark-themed HTML; open in browser; browser Print → Save as PDF |
| **SARIF 2.1.0** | GitHub Code Scanning compatible; import into GitHub Security tab |
| **Print / PDF** | Browser print dialog; clean layout for sharing |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `/` | Focus search bar |
| `n` / `p` | Next / Previous category |
| `t` | Toggle light/dark theme |
| `e` | Export JSON |
| `Esc` | Close any modal |
| `?` | Show keyboard shortcuts |

---

## Supported Languages

JavaScript · TypeScript · Python · Go · Java · C# · Kotlin · Rust · PHP · Ruby · C / C++ · Vue · Svelte · HTML · CSS · Solidity · Terraform

---

## What's Bundled (Offline)

All libraries ship in `vendor/` — no internet required after download.

| Library | Purpose |
|---|---|
| `acorn.min.js` | JavaScript AST parsing |
| `jszip.min.js` | ZIP file reading |
| `jsrsasign-all-min.js` | GitHub App JWT authentication |
| `fonts/` | Inter + JetBrains Mono |

---

## Project Structure

```
CodeClean/
├── index.html              ← App shell (open this in browser)
├── start.bat               ← Windows launcher (starts local server)
├── package.json            ← VS Code extension manifest
├── extension.js            ← VS Code extension entry point
├── DEVPLAN.md              ← Full development history and architecture
├── css/
│   ├── base.css            ← Design tokens, dark + light theme, utilities
│   └── components.css      ← All UI component styles
├── js/
│   ├── App.js              ← State, rendering, all UI logic
│   ├── github.js           ← GitHub API adapter
│   ├── analysis/           ← 20 analyzer modules
│   │   ├── dead-code.js
│   │   ├── parser-security.js
│   │   ├── duplicates.js
│   │   ├── name-similarity.js
│   │   ├── circular-deps.js
│   │   ├── smells.js
│   │   ├── cyclomatic.js
│   │   ├── cog-complexity.js
│   │   ├── error-handling.js
│   │   ├── type-safety.js
│   │   ├── test-coverage.js
│   │   ├── lang-specific.js
│   │   ├── code-patterns.js
│   │   ├── dep-scan.js
│   │   ├── memory-leaks.js
│   │   ├── performance.js
│   │   ├── accessibility.js
│   │   ├── custom-rules.js
│   │   ├── comment-rot.js
│   │   ├── import-health.js
│   │   ├── split-suggest.js
│   │   └── scorer.js
│   └── components/
│       └── export.js       ← JSON, HTML, SARIF export
├── vendor/
│   ├── acorn.min.js
│   ├── jszip.min.js
│   └── jsrsasign-all-min.js
└── fonts/                  ← Inter + JetBrains Mono (offline)
```

---

## VS Code Extension

### Publishing to VS Code Marketplace

```bash
# Install vsce
npm install -g @vscode/vsce

# Package the extension
vsce package

# Publish (requires publisher account at marketplace.visualstudio.com)
vsce publish
```

### Running Locally in VS Code

Press `F5` in VS Code with the CodeClean folder open → Extension Development Host opens → `Ctrl+Shift+P` → **"Open CodeClean"**.

Or install from VSIX: `Extensions → ··· → Install from VSIX → codeclean-1.0.0.vsix`

---

## Frequently Asked Questions

**Does any code leave my machine?**  
No. For local folders and ZIP files, everything runs in your browser tab with zero network calls. The only exceptions are: (1) GitHub repo scanning fetches files from `api.github.com`, and (2) dependency scanning POSTs package names (not code) to `api.osv.dev`. Both are opt-in and clearly labeled.

**Why does Chrome say "not allowed" when I open index.html directly?**  
Chrome blocks local multi-file HTML for security reasons (CORS). Use start.bat, VS Code Live Server, or the VS Code extension instead. Firefox doesn't have this restriction.

**How accurate is the test coverage estimate?**  
It uses naming convention matching (`test_foo` → `foo`, `FooSpec` → `Foo`), not actual code execution. It's an estimate — treat it as a quick signal, not a precise measurement. Real coverage requires running your test suite with a coverage tool.

**Can I add my own rules?**  
Yes. Click the ⚡ icon in the topbar and add regex patterns with severity, title, and a suggestion. Rules are stored locally and applied on the next scan.

**What's the difference between CC and Cognitive Complexity?**  
- **CC (Cyclomatic)** counts the number of independent paths through a function. Pure maths, language-agnostic.
- **Cognitive Complexity** (SonarQube's method) measures how hard it is to *understand* — nesting adds a multiplier, so a deeply nested `if` costs more than a flat one. Better at finding spaghetti code.

---

## Contributing

PRs welcome. The codebase is intentionally vanilla JS with no build step — open `index.html` and start editing.

1. Fork the repo
2. Make changes directly to the JS/CSS files
3. Test by opening `index.html` in Firefox or via Live Server
4. Submit a PR

---

## License

MIT — free to use, modify, and distribute. See [LICENSE](LICENSE).

---

<div align="center">

**CodeClean** — because clean code ships faster and breaks less.

</div>
