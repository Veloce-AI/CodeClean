/* CodeClean — App.js
   Batch 1: Foundation — drop zone, file reader, layout shell
*/

const LANG_COLORS = {
  js:   '#f7df1e', ts:   '#3178c6', py:   '#3776ab', go:   '#00add8',
  java: '#ed8b00', cs:   '#239120', rs:   '#ce422b', php:  '#777bb4',
  rb:   '#cc342d', kt:   '#7f52ff', cpp:  '#00599c', c:    '#555555',
  vue:  '#42b883', svelte:'#ff3e00', html: '#e34f26', css:  '#264de4',
  tsx:  '#3178c6', jsx:  '#61dafb', sol:  '#363636', tf:   '#7b42bc',
};

const LANG_NAMES = {
  js:'JavaScript', ts:'TypeScript', py:'Python', go:'Go', java:'Java',
  cs:'C#', rs:'Rust', php:'PHP', rb:'Ruby', kt:'Kotlin', cpp:'C++',
  c:'C', vue:'Vue', svelte:'Svelte', html:'HTML', css:'CSS',
  tsx:'TypeScript/JSX', jsx:'JavaScript/JSX', sol:'Solidity', tf:'Terraform',
};

const SKIP_DIRS = new Set([
  'node_modules','.git','dist','build','.next','__pycache__','.venv','venv',
  'env','.env','target','vendor','coverage','.nyc_output','out','bin','obj',
  '.cache','.parcel-cache','storybook-static','.turbo','.vercel','.svelte-kit',
]);

const SKIP_EXTS = new Set([
  'png','jpg','jpeg','gif','svg','ico','webp','mp4','mp3','mov','woff','woff2',
  'ttf','eot','pdf','zip','gz','tar','map','lock','min.js',
]);

const CATEGORIES = [
  { id: 'all',        label: 'All Issues',        icon: svgAll(),        color: '#6366f1', dot: '#6366f1' },
  { id: 'dead',       label: 'Dead Code',         icon: svgDead(),       color: '#ff5f5f', dot: '#ff5f5f' },
  { id: 'security',   label: 'Security',          icon: svgSecurity(),   color: '#ff5f5f', dot: '#ff5f5f' },
  { id: 'deps',       label: 'Dependencies',      icon: svgDeps(),       color: '#ff5f5f', dot: '#ff5f5f' },
  { id: 'dupes',      label: 'Duplicates',        icon: svgDupes(),      color: '#ff9f43', dot: '#ff9f43' },
  { id: 'names',      label: 'Name Issues',       icon: svgNames(),      color: '#eab308', dot: '#eab308' },
  { id: 'circular',   label: 'Circular Deps',     icon: svgCircular(),   color: '#a78bfa', dot: '#a78bfa' },
  { id: 'smells',     label: 'Code Smells',       icon: svgSmells(),     color: '#ff9f43', dot: '#ff9f43' },
  { id: 'complexity', label: 'Complexity',        icon: svgComplexity(), color: '#ec4899', dot: '#ec4899' },
  { id: 'cogcx',      label: 'Cognitive',         icon: svgCogCx(),      color: '#ec4899', dot: '#db2777' },
  { id: 'lang',       label: 'Lang Patterns',     icon: svgLang(),       color: '#ff9f43', dot: '#f59e0b' },
  { id: 'patterns',   label: 'Code Patterns',     icon: svgPatterns(),   color: '#ff9f43', dot: '#f59e0b' },
  { id: 'errors',     label: 'Error Handling',    icon: svgErrors(),     color: '#ff5f5f', dot: '#ff5f5f' },
  { id: 'types',      label: 'Type Safety',       icon: svgTypes(),      color: '#22d3ee', dot: '#22d3ee' },
  { id: 'tests',      label: 'Test Coverage',     icon: svgTests(),      color: '#22c55e', dot: '#22c55e' },
  { id: 'comments',   label: 'Comment Rot',       icon: svgComments(),   color: '#8b8b95', dot: '#8b8b95' },
  { id: 'imports',    label: 'Import Health',     icon: svgImports(),    color: '#22d3ee', dot: '#22d3ee' },
  { id: 'split',      label: 'Split Tips',        icon: svgSplit(),      color: '#22c55e', dot: '#22c55e' },
  { id: 'memory',     label: 'Memory Leaks',      icon: svgMemory(),     color: '#ff5f5f', dot: '#ff5f5f' },
  { id: 'perf',       label: 'Performance',       icon: svgPerf(),       color: '#ff9f43', dot: '#ff9f43' },
  { id: 'a11y',       label: 'Accessibility',     icon: svgA11y(),       color: '#22d3ee', dot: '#22d3ee' },
  { id: 'custom',     label: 'Custom Rules',      icon: svgCustom(),     color: '#a78bfa', dot: '#a78bfa' },
  { id: 'files',      label: 'File Scores',       icon: svgFiles(),      color: '#4d9fff', dot: '#4d9fff' },
];

/* ── Settings defaults (must be before state) ────────── */
const DEFAULT_SETTINGS = {
  ccLimit: 8, fnLines: 60, fileLines: 300, nestDepth: 4, fnParams: 5, dupWindow: 6,
};

function loadSettings() {
  try {
    const saved = localStorage.getItem('cc-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

/* ── State ──────────────────────────────────────────── */
const state = {
  phase: 'landing',
  files: [],
  results: null,
  activeCategory: 'all',
  selectedFile: null,
  scanProgress: { current: 0, total: 0, file: '', phase: 'Reading files' },
  scanLog: [],
  expandedSections: new Set(['dead','security','dupes','smells']),
  projectName: '',
  sortBy: 'score',
  sortDir: 'asc',
  landingTab: 'local',
  githubUrl: '',
  githubToken: '',
  severityFilter: 'all',
  issueSearch: '',
  ignorePatterns: [],      // user-defined glob patterns
  snapshot: null,          // previous scan results for diff
  sidebarFileSearch: '',   // filter worst-files list
  settings: loadSettings(),
};

/* ── Settings (#64) ──────────────────────────────────── */
function saveSettings(key, val) {
  state.settings[key] = val;
  localStorage.setItem('cc-settings', JSON.stringify(state.settings));
}

/* ── VS Code detection ───────────────────────────────── */
const IS_VSCODE = !!window.IS_VSCODE;
// Expose globally so export.js can access it
window.vscodeApi = IS_VSCODE && typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

function postToExtension(msg) {
  window.vscodeApi?.postMessage(msg);
}

// Listen for messages FROM the extension (files loaded, progress, etc.)
if (IS_VSCODE) {
  window.addEventListener('message', e => {
    const msg = e.data;
    if (!msg?.command) return;
    switch (msg.command) {
      case 'scanStart':
        state.projectName = msg.folderName || 'Project';
        state.phase = 'scanning';
        state.files = [];
        state.results = null;
        state.scanLog = [];
        state.scanProgress = { current: 0, total: 0, file: '', phase: 'Reading' };
        renderApp();
        break;
      case 'scanProgress':
        state.scanProgress.current = msg.count;
        state.scanLog.push(msg.file);
        updateScanningUI();
        break;
      case 'filesLoaded':
        state.projectName = msg.folderName || 'Project';
        handleVSCodeFiles(msg.files);
        break;
    }
  });
}

async function handleVSCodeFiles(files) {
  state.files = files;
  state.scanProgress = { current: files.length, total: files.length, file: 'Running analysis…', phase: 'Analyzing' };
  updateScanningUI();
  await new Promise(r => setTimeout(r, 0));
  const prevSnap = state.snapshot;
  const results  = await runAnalysis(files);
  state.results  = results;
  const newScore = results.fileScores?.length
    ? Math.round(results.fileScores.reduce((s, f) => s + f.score, 0) / results.fileScores.length) : 100;
  if (prevSnap) window._prevSnapshot = prevSnap;
  state.snapshot = { scannedAt: new Date().toISOString(), totalIssues: results.totalIssues, totalFiles: files.length, score: newScore };
  saveTrend(newScore);
  state.phase = 'results';
  renderApp();
  showToast(`Found ${results.totalIssues} issues across ${files.length} files · Score: ${newScore}/100`, 'info');
}

/* ── Entry Point ─────────────────────────────────────── */
function initApp() {
  initTheme();
  try { state.ignorePatterns = JSON.parse(localStorage.getItem('cc-ignore') || '[]'); } catch(_) {}
  try {
    const snap = sessionStorage.getItem('cc-snap');
    const prev = sessionStorage.getItem('cc-prev-snap');
    if (snap) state.snapshot = JSON.parse(snap);
    if (prev) window._prevSnapshot = JSON.parse(prev);
  } catch(_) {}
  renderApp();
  setupToastContainer();
  initKeyboardShortcuts();
}

function initTheme() {
  const saved = localStorage.getItem('cc-theme');
  if (saved === 'light') document.documentElement.classList.add('light');
}

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light');
  localStorage.setItem('cc-theme', isLight ? 'light' : 'dark');
  const btn = document.getElementById('btn-theme');
  if (btn) btn.innerHTML = svgTheme();
}

function newScan() {
  state.phase = 'landing';
  state.files = [];
  state.results = null;
  state.projectName = '';
  state.scanLog = [];
  renderApp();
}

/* ── Main Render ─────────────────────────────────────── */
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderTopbar()}
    <div class="main-layout">
      ${state.phase !== 'landing' ? renderSidebar() : ''}
      <div class="content" id="content">
        ${renderContent()}
      </div>
    </div>
    <input type="file" id="folder-input" webkitdirectory multiple>
  `;
  attachHandlers();
}

/* ── Topbar ─────────────────────────────────────────── */
function renderTopbar() {
  const hasProject = state.phase !== 'landing';
  return `
    <div class="topbar" style="position:relative">
      <div class="topbar-logo">
        <div class="topbar-logo-icon">
          ${svgLogoMark()}
        </div>
        <span class="topbar-logo-text">Code<span>Clean</span></span>
      </div>
      ${hasProject ? `
        <div class="topbar-divider"></div>
        <div class="topbar-project">
          ${svgFolder()}
          <span class="topbar-project-name">${escHtml(state.projectName || 'Project')}</span>
          <span class="topbar-project-meta">${state.files.length} files</span>
        </div>
      ` : ''}
      <div style="flex:1"></div>
      <div class="topbar-actions">
        ${hasProject ? `
          <button class="btn btn-sm" onclick="newScan()" style="background:rgba(255,95,95,0.12);color:var(--red);border:1px solid rgba(255,95,95,0.25);gap:5px" title="Clear this scan and start fresh">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            Clear
          </button>
        ` : ''}
        <button class="btn-icon" onclick="showCustomRulesModal()" title="Custom rules — define your own regex patterns${loadCustomRules().length ? ' (' + loadCustomRules().length + ' active)' : ''}" style="${loadCustomRules().length ? 'color:var(--purple)' : ''}">
          ${svgCustom()}
        </button>
        <button class="btn-icon" onclick="showIgnoreModal()" title="Ignore patterns — skip files from scan${state.ignorePatterns.length ? ' (' + state.ignorePatterns.length + ' active)' : ''}" style="${state.ignorePatterns.length ? 'color:var(--orange)' : ''}">
          ${svgIgnore()}
        </button>
        <button class="btn-icon" onclick="showSettingsModal()" title="Settings — configure thresholds">
          ${svgSettings()}
        </button>
        <button class="btn-icon" onclick="showKeyboardHelp()" title="Keyboard shortcuts (?)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M4 7h2M10 7h2M7 7v2M4 10h2M7 10h2M10 10h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
        <button class="btn-icon" onclick="showAboutModal()" title="About CodeClean">
          ${svgAbout()}
        </button>
        <button class="btn-icon" onclick="toggleTheme()" title="Toggle theme" id="btn-theme">
          ${svgTheme()}
        </button>
      </div>
      ${state.phase === 'scanning' ? `<div class="topbar-progress"><div class="topbar-progress-fill"></div></div>` : ''}
    </div>
  `;
}

/* ── Sidebar ─────────────────────────────────────────── */
function renderSidebar() {
  const results = state.results;
  const overallScore = results ? computeOverallScore(results) : null;

  return `
    <div class="sidebar">

      ${/* ── Compact score + stats row ── */ ''}
      ${results ? `
        <div class="sidebar-section sidebar-top">
          <div class="sidebar-score-row">
            <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
              ${renderScoreRing(overallScore)}
              ${renderSparkline()}
            </div>
            <div class="sidebar-stats-col">
              <div class="sidebar-stat-row">
                <span class="sidebar-stat-val" style="color:${results.totalIssues > 20 ? 'var(--red)' : results.totalIssues > 0 ? 'var(--orange)' : 'var(--green)'}">${results.totalIssues || 0}</span>
                <span class="sidebar-stat-lbl">Issues</span>
              </div>
              <div class="sidebar-stat-row">
                <span class="sidebar-stat-val" style="color:var(--acc)">${state.files.length}</span>
                <span class="sidebar-stat-lbl">Files</span>
              </div>
              <div class="sidebar-stat-row">
                <span class="sidebar-stat-val" style="color:var(--green)">${results.cleanFiles || 0}</span>
                <span class="sidebar-stat-lbl">Clean</span>
              </div>
              <div class="sidebar-stat-row">
                <span class="sidebar-stat-val">${results.langCount || 0}</span>
                <span class="sidebar-stat-lbl">Languages</span>
              </div>
            </div>
          </div>
          ${state.files.length > 0 ? renderLangBreakdown() : ''}
          ${results.totalIssues > 0 ? `
            <button class="ai-prompt-btn" onclick="showPromptModal()" title="Generate an AI refactor prompt from scan results">
              ✨ Generate AI Refactor Prompt
            </button>
          ` : ''}
        </div>
      ` : ''}

      ${/* ── Categories (flex-1, scrollable) ── */ ''}
      <div class="sidebar-section sidebar-cats">
        <div class="sidebar-label">Categories</div>
        <div class="cat-list">
          ${CATEGORIES.map(cat => {
            const count = results ? getCategoryCount(results, cat.id) : null;
            const countClass = count > 0
              ? (cat.id === 'security' || cat.id === 'dead' ? 'has-issues' : cat.id === 'dupes' || cat.id === 'smells' ? 'has-medium' : 'has-low')
              : '';
            return `
              <div class="cat-item ${state.activeCategory === cat.id ? 'active' : ''}"
                   data-cat="${cat.id}" onclick="setCategory('${cat.id}')">
                <div class="cat-dot" style="background:${cat.dot}"></div>
                <span class="cat-name">${cat.label}</span>
                ${count !== null ? `<span class="cat-count ${countClass}">${count}</span>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>

      ${results && results.fileScores && results.fileScores.length > 0 ? `
        <div class="sidebar-section">
          <div class="sidebar-label" style="display:flex;align-items:center;justify-content:space-between">
            Worst Files
            <input class="sidebar-file-search" id="sidebar-file-search"
              placeholder="filter…" value="${escHtml(state.sidebarFileSearch)}"
              oninput="state.sidebarFileSearch=this.value;document.getElementById('sidebar-file-list').innerHTML=renderSidebarFiles()"/>
          </div>
          <div id="sidebar-file-list">${renderSidebarFiles()}</div>
        </div>
      ` : ''}
    </div>
  `;
}

/* ── Content ─────────────────────────────────────────── */
function renderContent() {
  if (state.phase === 'landing')  return renderLanding();
  if (state.phase === 'scanning') return renderScanning();
  return renderReport();
}

/* ── Landing ─────────────────────────────────────────── */
function renderLanding() {
  const tab = state.landingTab;
  return `
    <div class="landing">
      <div class="landing-hero">
        <div class="landing-title">Clean Code Starts Here</div>
        <div class="landing-sub">
          Find dead code, security issues, duplicates &amp; more.<br>
          Works with local folders or any GitHub repo.
        </div>
      </div>

      <div class="landing-tabs">
        <button class="landing-tab ${tab==='local'?'active':''}" onclick="setLandingTab('local')">
          ${svgFolder()} Local Folder
        </button>
        <button class="landing-tab ${tab==='github'?'active':''}" onclick="setLandingTab('github')">
          ${svgGithub()} GitHub Repo
        </button>
      </div>

      ${tab === 'local' ? `
        <div class="dropzone" id="dropzone" onclick="openFolderPicker()">
          <div class="dropzone-icon">${svgDropIcon()}</div>
          <div class="dropzone-title">Drop your project folder</div>
          <div class="dropzone-sub">
            Drag &amp; drop here, or click to browse.<br>
            Fully local — no data leaves your machine.
          </div>
          <div class="dropzone-or">or</div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="event.stopPropagation(); openFolderPicker()">
              ${svgFolder()} Browse Folder
            </button>
            <button class="btn btn-ghost" onclick="event.stopPropagation(); document.getElementById('zip-input').click()">
              📦 Open ZIP
            </button>
          </div>
          <input type="file" id="zip-input" accept=".zip" style="display:none" onchange="handleZipFile(this.files[0]);this.value=''"/>
          <div class="lang-pills">
            ${['JS','TS','Python','Go','Java','C#','Rust','PHP','Ruby','Kotlin','C++','Vue'].map(l =>
              `<span class="lang-pill">${l}</span>`
            ).join('')}
            <span class="lang-pill">+ more</span>
          </div>
        </div>
      ` : `
        <div class="github-input-card">
          <div class="dropzone-icon">${svgGithubBig()}</div>
          <div class="dropzone-title">Analyze a GitHub repository</div>
          <div class="dropzone-sub">
            Enter any public repo or <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">owner/repo</code> shorthand.<br>
            Add a token for private repos and higher rate limits (5,000 req/hr).
          </div>
          <div class="github-input-row">
            <input class="github-url-input" id="github-url" type="text"
              placeholder="facebook/react or https://github.com/owner/repo"
              value="${escHtml(state.githubUrl)}"
              onkeydown="if(event.key==='Enter') startGithubScan()"
            />
            <button class="btn btn-primary" onclick="startGithubScan()">Analyze →</button>
          </div>
          <div class="github-token-row">
            <input class="github-token-input" id="github-token" type="password"
              placeholder="GitHub PAT token (optional)"
              value="${escHtml(state.githubToken)}"
            />
          </div>
          <div style="font-size:10px;color:var(--t3);margin-top:8px;text-align:center">
            Token is sent only to api.github.com — never stored or transmitted elsewhere
          </div>
        </div>
      `}

      ${IS_VSCODE ? `
        <div class="vscode-tip">
          <span style="font-size:13px">💡</span>
          <span>For drag-and-drop folder scanning, <button class="vscode-tip-link" onclick="postToExtension({command:'openInBrowser'})">open in browser</button> instead.</span>
        </div>
      ` : ''}
      <div class="landing-features">
        <div class="landing-feature">${svgCheck()} Zero install</div>
        <div class="landing-feature">${svgCheck()} No data leaves your machine (local mode)</div>
        <div class="landing-feature">${svgCheck()} 20 quality checks</div>
        <div class="landing-feature">${svgCheck()} Security · Smells · Dead Code · More</div>
      </div>
    </div>
  `;
}

function setLandingTab(tab) {
  state.landingTab = tab;
  const content = document.getElementById('content');
  if (content) content.innerHTML = renderContent();
  const dz = document.getElementById('dropzone');
  if (dz) {
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', handleDrop);
  }
}

/* ── Scanning ─────────────────────────────────────────── */
function renderScanning() {
  const { current, total, phase } = state.scanProgress;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const log = state.scanLog.slice(-6).reverse();
  return `
    <div class="scanning-view">
      <div class="spinner" style="margin-bottom:20px"></div>
      <div class="scanning-title">${
        phase === 'Analyzing' ? 'Running checks…' :
        phase === 'Downloading' ? 'Downloading files from GitHub…' :
        phase === 'Fetching tree' ? 'Fetching repository tree…' :
        'Reading your project…'
      }</div>
      <div class="scanning-sub">${
        phase === 'Analyzing' ? 'Security · Smells · Dead Code · Imports · Comments' :
        phase === 'Downloading' ? `File ${current} of ${total}` :
        `${current} files collected`
      }</div>
      <div class="scanning-bar-wrap">
        <div class="scanning-bar" style="margin-bottom:16px">
          <div class="scanning-bar-fill" style="width:${phase === 'Analyzing' ? '100' : pct}%"></div>
        </div>
        <div class="scanning-log">
          ${log.map((f, i) => `
            <div class="scanning-log-row ${i === 0 ? 'active' : ''}">
              <span class="scanning-log-icon">${i === 0 ? '→' : '✓'}</span>
              <span class="scanning-log-file">${escHtml(f)}</span>
            </div>
          `).join('')}
          ${log.length === 0 ? `<div class="scanning-log-row"><span class="scanning-log-icon">→</span><span class="scanning-log-file">Collecting files…</span></div>` : ''}
        </div>
        <div class="scanning-count" style="margin-top:12px">${total > 0 ? `${current} / ${total} files` : `${current} files collected`}</div>
      </div>
    </div>
  `;
}

/* ── Report ──────────────────────────────────────────── */
function renderReport() {
  const r = state.results;
  if (!r) return '';
  const cat = state.activeCategory;

  return `
    <div class="report-view">
      ${renderSnapshotBanner()}
      ${renderDashboard(r)}
      ${renderQuickWins(r)}
      ${renderMetricsRow(r)}
      ${renderSearchBar()}
      ${renderSeverityChips()}
      ${(cat==='all'||cat==='dead')       ? renderSection('dead',       'Dead Code',           svgDead(),       '#ff5f5f', r.deadCode)      : ''}
      ${(cat==='all'||cat==='security')   ? renderSection('security',   'Security',            svgSecurity(),   '#ff5f5f', r.security)      : ''}
      ${(cat==='all'||cat==='deps')       ? renderSection('deps',       'Dependencies (CVE)',  svgDeps(),       '#ff5f5f', r.depIssues)     : ''}
      ${(cat==='all'||cat==='circular')   ? renderSection('circular',   'Circular Deps',       svgCircular(),   '#a78bfa', r.circular)      : ''}
      ${(cat==='all'||cat==='errors')     ? renderSection('errors',     'Error Handling',      svgErrors(),     '#ff5f5f', r.errorIssues)   : ''}
      ${(cat==='all'||cat==='complexity') ? renderSection('complexity', 'Cyclomatic (CC)',     svgComplexity(), '#ec4899', r.complexity)    : ''}
      ${(cat==='all'||cat==='cogcx')      ? renderSection('cogcx',      'Cognitive Complexity',svgCogCx(),      '#db2777', r.cogCx)         : ''}
      ${(cat==='all'||cat==='lang')       ? renderSection('lang',       'Lang Patterns',       svgLang(),       '#f59e0b', r.langIssues)    : ''}
      ${(cat==='all'||cat==='patterns')   ? renderSection('patterns',   'Code Patterns',       svgPatterns(),   '#f59e0b', r.patternIssues) : ''}
      ${(cat==='all'||cat==='types')      ? renderSection('types',      'Type Safety',         svgTypes(),      '#22d3ee', r.typeIssues)    : ''}
      ${(cat==='all'||cat==='tests')      ? renderSection('tests',      'Test Coverage',       svgTests(),      '#22c55e', r.testIssues)    : ''}
      ${(cat==='all'||cat==='smells')     ? renderSection('smells',     'Code Smells',         svgSmells(),     '#ff9f43', r.smells)        : ''}
      ${(cat==='all'||cat==='dupes')      ? renderSection('dupes',      'Duplicates',          svgDupes(),      '#ff9f43', r.duplicates)    : ''}
      ${(cat==='all'||cat==='names')      ? renderSection('names',      'Name Similarity',     svgNames(),      '#eab308', r.nameIssues)    : ''}
      ${(cat==='all'||cat==='comments')   ? renderSection('comments',   'Comment Rot',         svgComments(),   '#8b8b95', r.commentRot)    : ''}
      ${(cat==='all'||cat==='imports')    ? renderSection('imports',    'Import Health',       svgImports(),    '#22d3ee', r.importIssues)  : ''}
      ${(cat==='all'||cat==='split')      ? renderSection('split',      'Split Suggestions',   svgSplit(),      '#22c55e', r.splitTips)     : ''}
      ${(cat==='all'||cat==='memory')     ? renderSection('memory',     'Memory Leaks',        svgMemory(),     '#ff5f5f', r.memoryIssues)  : ''}
      ${(cat==='all'||cat==='perf')       ? renderSection('perf',       'Performance',         svgPerf(),       '#ff9f43', r.perfIssues)    : ''}
      ${(cat==='all'||cat==='a11y')       ? renderSection('a11y',       'Accessibility',       svgA11y(),       '#22d3ee', r.a11yIssues)    : ''}
      ${(cat==='all'||cat==='custom')     ? renderSection('custom',     'Custom Rules',        svgCustom(),     '#a78bfa', r.customIssues)  : ''}
      ${(cat==='all'||cat==='files')      ? renderFileTable(r)                                                                             : ''}
    </div>
  `;
}

/* ── Dashboard cards ─────────────────────────────────── */
function renderDashboard(r) {
  const cards = [
    { id:'security',   label:'Security',      count: r.security?.length      || 0, color:'#ff5f5f', icon: svgSecurity()   },
    { id:'deps',       label:'CVEs',          count: r.depIssues?.length     || 0, color:'#ff5f5f', icon: svgDeps()       },
    { id:'dead',       label:'Dead Code',     count: r.deadCode?.length      || 0, color:'#ff5f5f', icon: svgDead()       },
    { id:'errors',     label:'Err Handling',  count: r.errorIssues?.length   || 0, color:'#ff9f43', icon: svgErrors()     },
    { id:'complexity', label:'CC',            count: r.complexity?.length    || 0, color:'#ec4899', icon: svgComplexity() },
    { id:'cogcx',      label:'Cognitive',     count: r.cogCx?.length         || 0, color:'#db2777', icon: svgCogCx()      },
    { id:'lang',       label:'Lang',          count: r.langIssues?.length    || 0, color:'#f59e0b', icon: svgLang()       },
    { id:'patterns',   label:'Patterns',      count: r.patternIssues?.length || 0, color:'#f59e0b', icon: svgPatterns()   },
  ];
  return `
    <div class="dashboard-row">
      ${cards.map(c => `
        <div class="dash-card ${state.activeCategory === c.id ? 'active' : ''}" onclick="setCategory('${c.id}')">
          <div class="dash-card-icon" style="background:${c.color}18; color:${c.color}">${c.icon}</div>
          <div class="dash-card-count" style="${c.count > 0 ? `color:${c.color}` : ''}">${c.count}</div>
          <div class="dash-card-label">${c.label}</div>
          <div class="dash-card-sub">${c.count === 0 ? '✓ Clean' : `${c.count} found`}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ── Issue Section ───────────────────────────────────── */
function renderSection(id, title, icon, color, issues) {
  const isOpen = state.expandedSections.has(id);
  const count = issues?.length || 0;
  const desc = getSectionDesc(id, count);
  return `
    <div class="issue-section" id="section-${id}">
      <div class="issue-section-header" onclick="toggleSection('${id}')">
        <div class="issue-section-left">
          <div class="issue-section-icon" style="background:${color}18; color:${color}">${icon}</div>
          <div>
            <div class="issue-section-title">${title}</div>
            <div class="issue-section-desc">${desc}</div>
          </div>
        </div>
        <div class="issue-section-right">
          ${count > 0
            ? `<span class="badge ${count > 10 ? 'badge-critical' : count > 3 ? 'badge-medium' : 'badge-low'}">${count} issue${count !== 1 ? 's' : ''}</span>`
            : `<span class="badge badge-success">✓ Clean</span>`
          }
          ${count > 0 ? `<button class="btn-icon" style="font-size:10px;padding:3px 7px" title="Copy all issues in this section" onclick="event.stopPropagation();copyCategory('${id}')">${svgCopy()} All</button>` : ''}
          <span class="issue-section-chevron ${isOpen ? 'open' : ''}">▼</span>
        </div>
      </div>
      ${isOpen ? `
        <div class="issue-section-body">
          ${count === 0 ? renderSectionEmpty(id) : renderIssues(id, issues)}
        </div>
      ` : ''}
    </div>
  `;
}

function renderSectionEmpty(id) {
  const messages = {
    dead:     ['🟢', 'No dead code found'],
    security: ['🔒', 'No security issues found'],
    dupes:    ['✨', 'No duplicate code found'],
    names:    ['📝', 'No naming conflicts found'],
    circular: ['🔄', 'No circular dependencies found'],
    smells:   ['👌', 'No code smells found'],
    comments: ['💬', 'No comment rot found'],
    imports:  ['📦', 'All imports look healthy'],
    split:    ['✂️', 'No split suggestions — functions look lean'],
  };
  const [icon, text] = messages[id] || ['✓', 'All clear'];
  return `<div class="section-empty"><div class="section-empty-icon">${icon}</div><div class="section-empty-text">${text}</div></div>`;
}

function renderIssues(id, issues) {
  const filtered = filterIssues(issues);
  if (!filtered.length) {
    if (issues?.length && filtered.length === 0) {
      return `<div class="section-empty"><div class="section-empty-icon">🔍</div><div class="section-empty-text">No issues match current filter</div></div>`;
    }
    return renderSectionEmpty(id);
  }
  const shown = filtered.slice(0, 40);
  const timeEst = fmtTime(filtered.reduce((s, i) => s + ({critical:45,high:20,medium:10,low:3}[i.severity]||5), 0));
  return `
    <div class="issue-list">
      <div style="padding:4px 10px 6px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:9px;color:var(--t3)">${filtered.length} issue${filtered.length!==1?'s':''}</span>
        <span style="font-size:9px;color:var(--t3)">Est. ${timeEst} to fix</span>
      </div>
      ${shown.map(issue => renderIssueRow(id, issue)).join('')}
      ${filtered.length > 40 ? `<div style="padding:10px;text-align:center;font-size:10px;color:var(--t3)">+ ${filtered.length - 40} more — use search to filter</div>` : ''}
    </div>
  `;
}

/* ── getFileCode — fetch lines from state.files ──── */
function getFileCode(filePath, lineStart, lineCount) {
  if (!filePath || !state.files) return null;
  const f = state.files.find(f =>
    f.path === filePath || f.path.endsWith('/' + filePath) || filePath.endsWith('/' + f.path)
  );
  if (!f || !f.content) return null;
  const lines = f.content.split('\n');
  const start = Math.max(0, (lineStart || 1) - 1);
  const end = Math.min(lines.length, start + (lineCount || 15));
  return { lines: lines.slice(start, end), startLine: start + 1 };
}

function renderCodeBlock(filePath, lineStart, lineEnd, label) {
  const linesData = getFileCode(filePath, lineStart, lineEnd ? lineEnd - lineStart + 1 : 20);
  if (!linesData) return '';
  const { lines, startLine } = linesData;
  const name = (filePath || '').split('/').pop();
  return `
    <div class="issue-code-block">
      <div class="issue-code-header">
        <span class="issue-code-header-label">${escHtml(label || name)}</span>
        <span class="issue-code-header-range">L${startLine}–${startLine + lines.length - 1}</span>
      </div>
      <div class="issue-code-body">${lines.map((l, i) =>
        `<span class="issue-code-line-num">${startLine + i}</span>${escHtml(l)}`
      ).join('\n')}</div>
    </div>
  `;
}

function renderDupCompare(issue) {
  const linesA = getFileCode(issue.file, issue.line, 10);
  const linesB = issue.meta ? getFileCode(issue.meta.fileB, issue.meta.lineB, 10) : null;
  if (!linesA) return issue.snippet ? `<div class="code-snippet" style="margin-top:6px">${escHtml(issue.snippet)}</div>` : '';
  const nameA = (issue.file || '').split('/').pop();
  const nameB = issue.meta ? (issue.meta.fileB || '').split('/').pop() : '';
  return `
    <div class="dup-compare">
      <div class="dup-code-block">
        <div class="dup-code-header">
          <span class="dup-code-label" title="${escHtml(issue.file)}">${escHtml(nameA)}</span>
          <span class="dup-code-line">:${issue.line}</span>
        </div>
        <div class="dup-code-body">${linesA.lines.map((l,i) =>
          `<span class="issue-code-line-num">${linesA.startLine+i}</span>${escHtml(l)}`
        ).join('\n')}</div>
      </div>
      ${linesB ? `
      <div class="dup-code-block">
        <div class="dup-code-header">
          <span class="dup-code-label" title="${escHtml(issue.meta.fileB)}">${escHtml(nameB)}</span>
          <span class="dup-code-line">:${issue.meta.lineB}</span>
        </div>
        <div class="dup-code-body">${linesB.lines.map((l,i) =>
          `<span class="issue-code-line-num">${linesB.startLine+i}</span>${escHtml(l)}`
        ).join('\n')}</div>
      </div>` : ''}
    </div>
  `;
}

function renderSplitCode(issue) {
  if (!issue.line) return '';
  const lineCount = issue.lineEnd ? issue.lineEnd - issue.line + 1 : 30;
  const linesData = getFileCode(issue.file, issue.line, Math.min(lineCount, 40));
  if (!linesData) return '';
  const { lines, startLine } = linesData;
  const splitLines = new Set((issue.splitPoints || []).map(p => p.start));

  return `
    <div class="issue-code-block">
      <div class="issue-code-header">
        <span class="issue-code-header-label">${escHtml((issue.file||'').split('/').pop())}</span>
        <span class="issue-code-header-range">L${startLine}–${startLine + lines.length - 1}</span>
      </div>
      <div class="issue-code-body">${lines.map((l, i) => {
        const abs = startLine + i;
        if (splitLines.has(abs)) {
          return `<span class="split-marker">── split point ──────────────────</span><span class="issue-code-line-num">${abs}</span>${escHtml(l)}`;
        }
        return `<span class="issue-code-line-num">${abs}</span>${escHtml(l)}`;
      }).join('\n')}</div>
    </div>
  `;
}

function renderIssueRow(catId, issue) {
  const sevClass = { critical:'badge-critical', high:'badge-high', medium:'badge-medium', low:'badge-low', info:'badge-info' }[issue.severity] || 'badge-neutral';
  const canView  = !!(issue.file);   // any issue with a file path gets a View button
  const viewLine = issue.line || 1;
  const safeTitle = (issue.title || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');

  // Inline code section varies by category
  let codeSection = '';
  const filLabel = (issue.file || '').split('/').pop();
  const ln = issue.line || 1;
  if (catId === 'dupes') {
    codeSection = renderDupCompare(issue);
  } else if (catId === 'split') {
    codeSection = renderSplitCode(issue);
  } else if (catId === 'smells' && issue.file) {
    // Long function → show body; deep nesting / god file → show ≤15 lines of context
    const end = issue.lineEnd ? issue.lineEnd : ln + 14;
    codeSection = renderCodeBlock(issue.file, ln, end, filLabel);
  } else if (catId === 'security' && issue.file) {
    // 3-line inline preview around the flagged line
    codeSection = renderCodeBlock(issue.file, Math.max(1, ln - 1), ln + 2, filLabel);
  } else if (catId === 'dead' && issue.file) {
    // Show the unused import / variable in 3 lines of context
    codeSection = renderCodeBlock(issue.file, Math.max(1, ln - 1), ln + 2, filLabel);
  } else if ((catId === 'comments' || catId === 'imports') && issue.file && issue.line) {
    codeSection = renderCodeBlock(issue.file, Math.max(1, ln - 1), ln + 2, filLabel);
  } else if (issue.snippet) {
    codeSection = `<div class="code-snippet" style="margin-top:6px;font-size:10px">${escHtml(issue.snippet)}</div>`;
  }

  return `
    <div class="issue-row" style="align-items:flex-start">
      <div class="issue-row-sev" style="padding-top:2px">
        <span class="badge ${sevClass}">${issue.severity || 'info'}</span>
      </div>
      <div class="issue-row-body" style="min-width:0;flex:1">
        <div class="issue-row-title">${escHtml(issue.title || issue.message || '')}</div>
        ${issue.file ? `<div class="issue-row-file" style="margin-top:2px">${escHtml(issue.file)}${issue.line ? `:<span>${issue.line}</span>` : ''}</div>` : ''}
        ${codeSection}
        ${issue.suggestion ? `<div style="font-size:10px;color:var(--green);margin-top:6px;display:flex;align-items:flex-start;gap:4px"><span style="flex-shrink:0">💡</span><span>${escHtml(issue.suggestion)}</span></div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-self:flex-start;padding-top:2px">
        ${canView ? `
          <button class="issue-view-btn"
            onclick="showCodeModal('${escHtml(issue.file)}', ${viewLine}, ${issue.lineEnd || (viewLine + 10)}, '${safeTitle}')">
            View →
          </button>
        ` : ''}
        <button class="issue-view-btn" style="font-size:9px;padding:3px 8px;opacity:0.7"
          onclick="copyIssue('${escHtml(issue.file)}', ${viewLine}, '${safeTitle}')">
          ${svgCopy()} Copy
        </button>
      </div>
    </div>
  `;
}

/* ── File Score Table (#45 drill-down) ───────────────── */
function renderFileTable(r) {
  if (!r.fileScores || r.fileScores.length === 0) return '';
  const sorted = [...r.fileScores].sort((a, b) =>
    state.sortDir === 'asc' ? a[state.sortBy] - b[state.sortBy] : b[state.sortBy] - a[state.sortBy]
  );
  return `
    <div class="issue-section" id="section-files">
      <div class="issue-section-header" onclick="toggleSection('files')">
        <div class="issue-section-left">
          <div class="issue-section-icon" style="background:#4d9fff18;color:#4d9fff">${svgFiles()}</div>
          <div>
            <div class="issue-section-title">File Health Scores</div>
            <div class="issue-section-desc">Click any row to see all issues in that file</div>
          </div>
        </div>
        <div class="issue-section-right">
          <span class="issue-section-chevron ${state.expandedSections.has('files') ? 'open' : ''}">▼</span>
        </div>
      </div>
      ${state.expandedSections.has('files') ? `
        <div class="issue-section-body">
          <table class="file-table">
            <thead>
              <tr>
                <th onclick="sortFiles('name')">File</th>
                <th onclick="sortFiles('score')" style="text-align:right">Score</th>
                <th onclick="sortFiles('issues')" style="text-align:right">Issues</th>
                <th style="text-align:right">Lines</th>
                <th style="text-align:right">Lang</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map(f => `
                <tr onclick="selectFile('${escHtml(f.path)}')"
                    style="${state.selectedFile === f.path ? 'background:var(--accbg2)' : ''}">
                  <td>
                    <div class="file-td-name">
                      <div style="width:7px;height:7px;border-radius:50%;background:${LANG_COLORS[f.lang] || '#555'};flex-shrink:0"></div>
                      <span class="file-td-path">
                        <span class="file-td-path-dir">${escHtml(f.dir ? f.dir + '/' : '')}</span>${escHtml(f.name)}
                      </span>
                      ${state.selectedFile === f.path ? `<span style="font-size:9px;color:var(--acc);margin-left:auto;padding-left:8px">▲ expanded</span>` : ''}
                    </div>
                  </td>
                  <td style="text-align:right"><div class="score-badge ${scoreBadgeClass(f.score)}">${f.score}</div></td>
                  <td class="file-td-num ${f.issues > 5 ? 'bad' : ''}" style="text-align:right">${f.issues}</td>
                  <td class="file-td-num" style="text-align:right">${f.lines || '—'}</td>
                  <td style="text-align:right"><span class="badge badge-lang">${f.lang || '?'}</span></td>
                </tr>
                ${state.selectedFile === f.path ? `
                  <tr>
                    <td colspan="5" style="padding:0;border-bottom:2px solid var(--acc)">
                      <div class="file-drill-down">
                        ${renderFileIssues(f.path)}
                      </div>
                    </td>
                  </tr>
                ` : ''}
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;
}

/* ── Per-file drill-down (#45) ───────────────────────── */
function renderFileIssues(filePath) {
  const r = state.results;
  if (!r) return '';

  const CATS = [
    { id:'security',   label:'Security',            data: r.security },
    { id:'deps',       label:'Dependencies (CVE)',   data: r.depIssues },
    { id:'dead',       label:'Dead Code',            data: r.deadCode },
    { id:'errors',     label:'Error Handling',       data: r.errorIssues },
    { id:'complexity', label:'Cyclomatic (CC)',      data: r.complexity },
    { id:'cogcx',      label:'Cognitive Complexity', data: r.cogCx },
    { id:'lang',       label:'Lang Patterns',        data: r.langIssues },
    { id:'patterns',   label:'Code Patterns',        data: r.patternIssues },
    { id:'types',      label:'Type Safety',          data: r.typeIssues },
    { id:'tests',      label:'Test Coverage',        data: r.testIssues },
    { id:'smells',     label:'Code Smells',          data: r.smells },
    { id:'dupes',      label:'Duplicates',           data: r.duplicates },
    { id:'comments',   label:'Comment Rot',          data: r.commentRot },
    { id:'imports',    label:'Import Health',        data: r.importIssues },
    { id:'circular',   label:'Circular Deps',        data: r.circular },
    { id:'names',      label:'Naming',               data: r.nameIssues },
    { id:'split',      label:'Split Tips',           data: r.splitTips },
    { id:'memory',     label:'Memory Leaks',         data: r.memoryIssues },
    { id:'perf',       label:'Performance',          data: r.perfIssues },
    { id:'a11y',       label:'Accessibility',        data: r.a11yIssues },
    { id:'custom',     label:'Custom Rules',         data: r.customIssues },
  ];

  let hasAny = false;
  const sections = CATS.map(cat => {
    const items = (cat.data || []).filter(i => i.file === filePath);
    if (!items.length) return '';
    hasAny = true;
    return `
      <div style="margin-bottom:14px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--t3);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--border2)">
          ${cat.label} — ${items.length} issue${items.length !== 1 ? 's' : ''}
        </div>
        <div class="issue-list" style="gap:3px">
          ${items.map(issue => renderIssueRow(cat.id, issue)).join('')}
        </div>
      </div>`;
  }).join('');

  if (!hasAny) {
    return `<div style="text-align:center;padding:20px;font-size:12px;color:var(--green);display:flex;align-items:center;justify-content:center;gap:8px">
      <span style="font-size:18px">✓</span> No issues found in this file
    </div>`;
  }

  return `<div style="padding:2px 0 6px">${sections}</div>`;
}

/* ── Sidebar file search (#73) ───────────────────────── */
function renderSidebarFiles() {
  const scores = state.results?.fileScores || [];
  const q = state.sidebarFileSearch.toLowerCase();
  const filtered = q
    ? scores.filter(f => f.path.toLowerCase().includes(q))
    : scores;
  const shown = filtered.slice(0, 12);
  return `<div class="file-list">
    ${shown.map(f => `
      <div class="file-item ${state.selectedFile === f.path ? 'active' : ''}"
           onclick="selectFile('${escHtml(f.path)}')" title="${escHtml(f.path)}">
        <div class="file-lang-dot" style="background:${LANG_COLORS[f.lang] || '#555'}"></div>
        <span class="file-name">${escHtml(f.name)}</span>
        <span class="file-score" style="color:${scoreColor(f.score)}">${f.score}</span>
      </div>`).join('')}
    ${filtered.length > 12 ? `<div style="font-size:9px;color:var(--t3);padding:4px 8px">+${filtered.length-12} more</div>` : ''}
    ${filtered.length === 0 ? `<div style="font-size:10px;color:var(--t3);padding:8px">No files match "${escHtml(q)}"</div>` : ''}
  </div>`;
}

/* ── Language Breakdown ──────────────────────────────── */
function renderLangBreakdown() {
  const counts = {};
  for (const f of state.files) {
    const lang = f.lang || 'other';
    counts[lang] = (counts[lang] || 0) + 1;
  }
  const total = state.files.length;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 6);
  const restCount = sorted.slice(6).reduce((s, [, n]) => s + n, 0);

  // Stacked color bar
  const stackedBars = top.map(([lang, count]) => {
    const pct = (count / total) * 100;
    const color = LANG_COLORS[lang] || '#8b8b95';
    return `<div style="flex:${pct};background:${color};height:100%;min-width:2px;border-radius:1px" title="${LANG_NAMES[lang]||lang}: ${Math.round(pct)}%"></div>`;
  }).join('');

  // Compact chip list: ● Python 48% ● JS 24%
  const chips = top.map(([lang, count]) => {
    const pct = Math.round((count / total) * 100);
    const color = LANG_COLORS[lang] || '#8b8b95';
    const name = LANG_NAMES[lang] || lang.toUpperCase();
    return `<div class="lang-chip" title="${name}: ${count} files">
      <div class="lang-dot-sm" style="background:${color}"></div>
      <span class="lang-chip-name">${escHtml(name.split('/')[0])}</span>
      <span class="lang-chip-pct">${pct}%</span>
    </div>`;
  }).join('');

  const restChip = restCount > 0
    ? `<div class="lang-chip"><div class="lang-dot-sm" style="background:var(--t3)"></div><span class="lang-chip-name">+${sorted.length - 6} more</span></div>` : '';

  return `
    <div class="lang-stack-bar" style="margin:6px 0 7px">${stackedBars}</div>
    <div class="lang-chips">${chips}${restChip}</div>
  `;
}

/* ── Score Ring ──────────────────────────────────────── */
function renderScoreRing(score) {
  const r = 30, c = 2 * Math.PI * r;
  const filled = c - (c * score / 100);
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : score >= 30 ? '#ff9f43' : '#ff5f5f';
  return `
    <div class="score-ring">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle class="score-ring-bg" cx="36" cy="36" r="${r}"/>
        <circle class="score-ring-fill" cx="36" cy="36" r="${r}"
          stroke="${color}"
          stroke-dasharray="${c}"
          stroke-dashoffset="${filled}"
        />
      </svg>
      <div class="score-ring-value">
        <span class="score-ring-number" style="color:${color}">${score}</span>
        <span class="score-ring-label">/100</span>
      </div>
    </div>
  `;
}

/* ── GitHub Scan ─────────────────────────────────────── */
async function startGithubScan() {
  const urlInput = document.getElementById('github-url');
  const tokenInput = document.getElementById('github-token');
  const url = urlInput?.value?.trim() || state.githubUrl;
  const token = tokenInput?.value?.trim() || state.githubToken;

  if (!url) { showToast('Enter a GitHub repo URL or owner/repo', 'error'); return; }
  const parsed = parseGitHubUrl(url);
  if (!parsed) { showToast('Invalid URL — use owner/repo or full GitHub URL', 'error'); return; }

  state.githubUrl = url;
  state.githubToken = token;
  GitHub.token = token || '';

  state.phase = 'scanning';
  state.files = [];
  state.results = null;
  state.scanLog = [];
  state.projectName = parsed.owner + '/' + parsed.repo;
  state.scanProgress = { current: 0, total: 0, file: '', phase: 'Fetching tree' };
  renderApp();

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    // Step 1: get file list
    const fileList = await GitHub.scan(parsed.owner, parsed.repo, msg => {
      state.scanProgress.file = msg;
      state.scanLog.push(msg);
      updateScanningUI();
    });

    if (!fileList.length) throw new Error('No code files found in this repository');

    state.scanProgress.total = fileList.length;
    state.scanProgress.phase = 'Downloading';
    updateScanningUI();

    // Step 2: fetch file contents
    const rawFiles = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      state.scanProgress.current = i + 1;
      state.scanProgress.file = f.path;
      state.scanLog.push(`↓ ${f.path}`);
      if (i % 5 === 0) { updateScanningUI(); await new Promise(r => setTimeout(r, 0)); }

      const content = await GitHub.getFile(parsed.owner, parsed.repo, f.path).catch(() => null);
      if (!content) continue;
      rawFiles.push({
        path: f.path,
        name: f.name,
        content,
        lang: f.name.split('.').pop()?.toLowerCase(),
        lines: content.split('\n').length,
      });
    }

    state.files = rawFiles;
    state.scanProgress.phase = 'Analyzing';
    updateScanningUI();
    await new Promise(r => setTimeout(r, 0));

    const results = await runAnalysis(rawFiles);
    state.results = results;
    state.phase = 'results';
    renderApp();
    showToast(`Found ${results.totalIssues} issues across ${rawFiles.length} files`, 'info');
  } catch (err) {
    console.error('GitHub scan error:', err);
    state.phase = 'landing';
    renderApp();
    showToast(err.message || 'GitHub scan failed', 'error');
  }
}

/* ── File Reading ────────────────────────────────────── */
async function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropzone')?.classList.remove('drag-over');
  const items = [...(e.dataTransfer?.items || [])];
  const entries = items.map(i => i.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) { showToast('No folder found in drop', 'error'); return; }
  const dirEntry = entries.find(en => en.isDirectory) || entries[0];
  state.projectName = dirEntry.name;

  // Show scanning UI IMMEDIATELY before collecting
  state.phase = 'scanning';
  state.files = [];
  state.results = null;
  state.scanLog = [];
  state.scanProgress = { current: 0, total: 0, file: '', phase: 'Reading' };
  renderApp();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const collected = [];
  await collectEntries(entries, collected);
  if (!collected.length) { state.phase = 'landing'; renderApp(); showToast('No readable files found', 'error'); return; }
  await runScan(collected);
}

async function collectEntries(entries, out, gitignorePatterns) {
  for (const entry of entries) {
    const fullPath = entry.fullPath.replace(/^\//, '');
    if (SKIP_DIRS.has(entry.name)) continue;
    if (shouldIgnorePath(fullPath, entry.name, gitignorePatterns || [], state.ignorePatterns)) continue;

    if (entry.isDirectory) {
      state.scanLog.push('📁 ' + fullPath);
      updateScanningUI();
      const children = await readDirEntry(entry);
      // Try to read .gitignore from top-level dir
      let gip = gitignorePatterns;
      if (!gip) {
        const giEntry = children.find(c => c.name === '.gitignore');
        if (giEntry) {
          const giFile = await new Promise(res => giEntry.file(res)).catch(() => null);
          if (giFile) { const txt = await giFile.text().catch(() => ''); gip = parseGitignore(txt); }
        }
        if (!gip) gip = [];
      }
      await collectEntries(children, out, gip);
    } else if (entry.isFile) {
      const ext = entry.name.split('.').pop()?.toLowerCase();
      if (!SKIP_EXTS.has(ext)) {
        const file = await new Promise(res => entry.file(res));
        out.push({ file, path: fullPath });
        state.scanLog.push(fullPath);
        state.scanProgress.current = out.length;
        if (out.length % 15 === 0) {
          updateScanningUI();
          await new Promise(r => setTimeout(r, 0));
        }
      }
    }
  }
}

function readDirEntry(dirEntry) {
  return new Promise((res, rej) => {
    const reader = dirEntry.createReader();
    let all = [];
    function read() {
      reader.readEntries(batch => {
        if (!batch.length) { res(all); return; }
        all = all.concat([...batch]);
        read();
      }, rej);
    }
    read();
  });
}

/* openFolderPicker — uses File System Access API so scanning UI shows IMMEDIATELY
   (with webkitdirectory the browser delays the change event while enumerating,
    so the user sees nothing for several seconds on large repos) */
async function openFolderPicker() {
  // Inside VS Code webview — use native VS Code file picker via message
  if (IS_VSCODE) {
    postToExtension({ command: 'pickFolder' });
    return;
  }
  if (!window.showDirectoryPicker) {
    document.getElementById('folder-input')?.click();
    return;
  }
  let dirHandle;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'read' });
  } catch (e) {
    if (e.name !== 'AbortError') showToast('Could not open folder: ' + e.message, 'error');
    return;
  }

  // Show scanning UI BEFORE we start reading (key difference vs webkitdirectory)
  state.projectName = dirHandle.name;
  state.phase = 'scanning';
  state.files = [];
  state.results = null;
  state.scanLog = [];
  state.scanProgress = { current: 0, total: 0, file: '', phase: 'Reading' };
  renderApp();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const collected = [];
    await collectFromDirHandle(dirHandle, '', collected);
    if (!collected.length) throw new Error('No readable files found in this folder');
    await runScan(collected);
  } catch (err) {
    state.phase = 'landing';
    renderApp();
    showToast(err.message || 'Scan failed', 'error');
  }
}

async function collectFromDirHandle(handle, path, out, gitignorePatterns) {
  // Read .gitignore from root
  if (!path && !gitignorePatterns) {
    gitignorePatterns = [];
    try {
      const gi = await handle.getFileHandle('.gitignore').catch(() => null);
      if (gi) {
        const giFile = await gi.getFile();
        const giText = await giFile.text();
        gitignorePatterns = parseGitignore(giText);
      }
    } catch (_) {}
  }

  for await (const [name, entry] of handle.entries()) {
    const fullPath = path ? path + '/' + name : name;

    if (shouldIgnorePath(fullPath, name, gitignorePatterns || [], state.ignorePatterns)) continue;

    if (entry.kind === 'directory') {
      if (SKIP_DIRS.has(name)) continue;
      state.scanLog.push('📁 ' + fullPath);
      updateScanningUI();
      await new Promise(r => setTimeout(r, 0));
      await collectFromDirHandle(entry, fullPath, out, gitignorePatterns);
    } else {
      const ext = name.split('.').pop()?.toLowerCase();
      if (SKIP_EXTS.has(ext)) continue;
      const file = await entry.getFile();
      out.push({ file, path: fullPath });
      state.scanProgress.current = out.length;
      state.scanLog.push(fullPath);
      if (out.length % 15 === 0) {
        updateScanningUI();
        await new Promise(r => setTimeout(r, 0));
      }
    }
  }
}

function parseGitignore(content) {
  return (content || '').split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(pattern => {
      const isDir = pattern.endsWith('/');
      const p = pattern.replace(/\/$/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '§G§').replace(/\*/g, '[^/]*').replace(/§G§/g, '.*').replace(/\?/g, '[^/]');
      return { re: new RegExp('(^|/)' + p + '(/|$)'), isDir };
    });
}

function shouldIgnorePath(fullPath, name, gitignorePatterns, userPatterns) {
  const lp = fullPath.toLowerCase();
  for (const { re } of gitignorePatterns) {
    if (re.test(fullPath)) return true;
  }
  for (const pat of (userPatterns || [])) {
    const re = new RegExp(pat.replace(/\*\*/g,'§').replace(/\*/g,'[^/]*').replace(/§/g,'.*').replace(/\?/g,'[^/]'));
    if (re.test(fullPath)) return true;
  }
  return false;
}

async function handleFolderInput(e) {
  // Fallback for older browsers / drag-and-drop via file input
  const fileList = [...(e.target?.files || [])];
  if (!fileList.length) return;
  e.target.value = '';

  // Show scanning immediately then collect
  const firstPath = fileList[0].webkitRelativePath || fileList[0].name;
  state.projectName = firstPath.split('/')[0] || 'Project';
  state.phase = 'scanning';
  state.files = [];
  state.results = null;
  state.scanLog = [];
  state.scanProgress = { current: 0, total: fileList.length, file: '', phase: 'Reading' };
  renderApp();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  // Try to find .gitignore in the file list
  let gitignorePatterns = [];
  const gitignoreFile = fileList.find(f => f.name === '.gitignore');
  if (gitignoreFile) {
    const txt = await gitignoreFile.text().catch(() => '');
    gitignorePatterns = parseGitignore(txt);
  }

  const collected = [];
  for (const file of fileList) {
    const rel = file.webkitRelativePath || file.name;
    const parts = rel.split('/');
    if (parts.some(p => SKIP_DIRS.has(p))) continue;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (SKIP_EXTS.has(ext)) continue;
    if (shouldIgnorePath(rel, file.name, gitignorePatterns, state.ignorePatterns)) continue;
    collected.push({ file, path: rel });
    state.scanLog.push(rel);
    state.scanProgress.current = collected.length;
    if (collected.length % 20 === 0) {
      updateScanningUI();
      await new Promise(r => setTimeout(r, 0));
    }
  }

  if (!collected.length) { state.phase = 'landing'; renderApp(); showToast('No readable files found', 'error'); return; }
  await runScan(collected);
}

/* ── Scan Core — called after scanning UI is already showing ─── */
async function runScan(fileEntries) {
  try {
    state.scanProgress.total = fileEntries.length;
    state.scanProgress.phase = 'Reading';
    updateScanningUI();

    const rawFiles = [];
    for (let i = 0; i < fileEntries.length; i++) {
      const { file, path } = fileEntries[i];
      try {
        const content = await file.text();
        rawFiles.push({
          path,
          name: file.name,
          content,
          lang: file.name.split('.').pop()?.toLowerCase(),
          lines: content.split('\n').length,
        });
      } catch (_) { /* skip unreadable */ }

      state.scanProgress.current = i + 1;
      state.scanLog.push(path);
      if (i % 20 === 0) {
        updateScanningUI();
        await new Promise(r => setTimeout(r, 0));
      }
    }

    state.files = rawFiles;
    state.scanProgress.phase = 'Analyzing';
    updateScanningUI();
    await new Promise(r => setTimeout(r, 0));

    const prevSnap = state.snapshot;
    const results = await runAnalysis(rawFiles);
    state.results = results;

    const newScore = results.fileScores?.length
      ? Math.round(results.fileScores.reduce((s,f)=>s+f.score,0)/results.fileScores.length) : 100;

    // Persist previous for diff banner (survives page refresh via sessionStorage)
    if (prevSnap) {
      window._prevSnapshot = prevSnap;
      try { sessionStorage.setItem('cc-prev-snap', JSON.stringify(prevSnap)); } catch(_) {}
    }
    state.snapshot = { scannedAt:new Date().toISOString(), totalIssues:results.totalIssues, totalFiles:rawFiles.length, score:newScore };
    try { sessionStorage.setItem('cc-snap', JSON.stringify(state.snapshot)); } catch(_) {}
    saveTrend(newScore);

    state.phase = 'results';
    renderApp();
    showToast(`Found ${results.totalIssues} issues across ${rawFiles.length} files · Score: ${newScore}/100`, 'info');
  } catch (err) {
    console.error('CodeClean scan error:', err);
    state.phase = 'landing';
    renderApp();
    showToast('Scan failed: ' + (err.message || 'unknown error'), 'error');
  }
}

/* kept for GitHub scan flow which calls startScan directly */
async function startScan(fileEntries) {
  state.phase = 'scanning';
  state.files = [];
  state.results = null;
  state.scanLog = [];
  state.scanProgress = { current: 0, total: fileEntries.length, file: '', phase: 'Reading' };
  renderApp();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await runScan(fileEntries);
}

function updateScanningUI() {
  const el = document.getElementById('content');
  if (el) el.innerHTML = renderScanning();
}

/* ── Analysis Runner ─────────────────────────────────── */
async function runAnalysis(files) {
  const results = {
    deadCode:     [],
    security:     [],
    duplicates:   [],
    nameIssues:   [],
    circular:     [],
    smells:       [],
    commentRot:   [],
    importIssues: [],
    splitTips:    [],
    fileScores:   [],
    totalIssues:  0,
    cleanFiles:   0,
    langCount:    0,
  };

  const langs = new Set(files.map(f => f.lang).filter(Boolean));
  results.langCount = langs.size;

  // Helper: show which analyzer is running in the scanning UI
  const step = async (label, fn) => {
    state.scanProgress.file = label;
    updateScanningUI();
    await new Promise(r => setTimeout(r, 0));
    return await fn();
  };

  results.deadCode      = await step('Dead code…',              () => typeof analyzeDeadCode       === 'function' ? analyzeDeadCode(files)       : []);
  results.security      = await step('Security patterns…',      () => typeof analyzeSecurity       === 'function' ? analyzeSecurity(files)       : []);
  results.depIssues     = await step('Dependency CVEs (OSV)…',  () => typeof analyzeDepScan        === 'function' ? analyzeDepScan(files)        : []);
  results.duplicates    = await step('Duplicate detection…',    () => typeof analyzeDuplicates     === 'function' ? analyzeDuplicates(files)     : []);
  results.nameIssues    = await step('Name similarity…',        () => typeof analyzeNameSimilarity === 'function' ? analyzeNameSimilarity(files) : []);
  results.circular      = await step('Circular dependencies…',  () => typeof analyzeCircularDeps   === 'function' ? analyzeCircularDeps(files)   : []);
  results.smells        = await step('Code smells…',            () => typeof analyzeSmells         === 'function' ? analyzeSmells(files)         : []);
  results.complexity    = await step('Cyclomatic complexity…',  () => typeof analyzeCyclomatic     === 'function' ? analyzeCyclomatic(files)     : []);
  results.cogCx         = await step('Cognitive complexity…',   () => typeof analyzeCogComplexity  === 'function' ? analyzeCogComplexity(files)  : []);
  results.langIssues    = await step('Language patterns…',      () => typeof analyzeLangSpecific   === 'function' ? analyzeLangSpecific(files)   : []);
  results.patternIssues = await step('Code patterns…',          () => typeof analyzeCodePatterns   === 'function' ? analyzeCodePatterns(files)   : []);
  results.errorIssues   = await step('Error handling…',         () => typeof analyzeErrorHandling  === 'function' ? analyzeErrorHandling(files)  : []);
  results.typeIssues    = await step('Type safety…',            () => typeof analyzeTypeSafety     === 'function' ? analyzeTypeSafety(files)     : []);
  results.testIssues    = await step('Test coverage…',          () => typeof analyzeTestCoverage   === 'function' ? analyzeTestCoverage(files)   : []);
  results.commentRot    = await step('Comment rot…',           () => typeof analyzeCommentRot   === 'function' ? analyzeCommentRot(files)   : []);
  results.importIssues  = await step('Import health…',         () => typeof analyzeImportHealth === 'function' ? analyzeImportHealth(files) : []);
  results.splitTips     = await step('Split suggestions…',     () => typeof analyzeSplitTips    === 'function' ? analyzeSplitTips(files)    : []);
  results.memoryIssues  = await step('Memory leaks…',          () => typeof analyzeMemoryLeaks  === 'function' ? analyzeMemoryLeaks(files)  : []);
  results.perfIssues    = await step('Performance patterns…',  () => typeof analyzePerformance  === 'function' ? analyzePerformance(files)  : []);
  results.customIssues  = await step('Custom rules…',          () => typeof analyzeCustomRules  === 'function' ? analyzeCustomRules(files)  : []);
  results.a11yIssues    = await step('Accessibility…',         () => typeof analyzeAccessibility=== 'function' ? analyzeAccessibility(files): []);
  results.fileScores    = await step('Scoring files…',         () => typeof scoreFiles          === 'function' ? scoreFiles(files, results) : []);

  results.totalIssues = [
    results.deadCode, results.security, results.depIssues, results.duplicates,
    results.nameIssues, results.circular, results.smells,
    results.complexity, results.cogCx, results.langIssues, results.patternIssues,
    results.errorIssues, results.typeIssues, results.testIssues,
    results.commentRot, results.importIssues,
    results.memoryIssues, results.perfIssues,
    results.a11yIssues, results.customIssues,
  ].reduce((s, a) => s + (a?.length || 0), 0);

  results.cleanFiles = files.length - (results.fileScores?.filter(f => f.issues > 0).length || 0);

  return results;
}

/* ── Helpers ─────────────────────────────────────────── */
function setCategory(id) {
  state.activeCategory = id;
  const content = document.getElementById('content');
  if (content) content.innerHTML = renderContent();
  document.querySelectorAll('.cat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.cat === id);
  });
}

function toggleSection(id) {
  if (state.expandedSections.has(id)) {
    state.expandedSections.delete(id);
  } else {
    state.expandedSections.add(id);
  }
  const content = document.getElementById('content');
  if (content) content.innerHTML = renderContent();
}

function selectFile(path) {
  state.selectedFile = state.selectedFile === path ? null : path;
  const content = document.getElementById('content');
  if (content) content.innerHTML = renderContent();
}

function sortFiles(by) {
  if (state.sortBy === by) {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortBy = by;
    state.sortDir = 'asc';
  }
  const content = document.getElementById('content');
  if (content) content.innerHTML = renderContent();
}

function computeOverallScore(results) {
  if (!results.fileScores || results.fileScores.length === 0) return 100;
  const avg = results.fileScores.reduce((s, f) => s + f.score, 0) / results.fileScores.length;
  return Math.round(avg);
}

function getCategoryCount(results, id) {
  const map = {
    all:        results.totalIssues,
    dead:       results.deadCode?.length,
    security:   results.security?.length,
    deps:       results.depIssues?.length,
    dupes:      results.duplicates?.length,
    names:      results.nameIssues?.length,
    circular:   results.circular?.length,
    smells:     results.smells?.length,
    complexity: results.complexity?.length,
    cogcx:      results.cogCx?.length,
    lang:       results.langIssues?.length,
    patterns:   results.patternIssues?.length,
    errors:     results.errorIssues?.length,
    types:      results.typeIssues?.length,
    tests:      results.testIssues?.length,
    comments:   results.commentRot?.length,
    imports:    results.importIssues?.length,
    split:      results.splitTips?.length,
    memory:     results.memoryIssues?.length,
    perf:       results.perfIssues?.length,
    a11y:       results.a11yIssues?.length,
    custom:     results.customIssues?.length,
    files:      results.fileScores?.length,
  };
  return map[id] ?? 0;
}

function getSectionDesc(id, count) {
  const descs = {
    dead:       count === 0 ? 'No unused code detected'         : 'Unused files, functions, imports and variables',
    security:   count === 0 ? 'No security issues found'        : 'Hardcoded secrets, dangerous patterns, weak crypto',
    deps:       count === 0 ? 'No vulnerable dependencies'      : 'CVEs found in package.json / requirements.txt via OSV.dev',
    dupes:      count === 0 ? 'No duplicated code blocks'       : 'Copy-paste blocks and structurally similar functions',
    names:      count === 0 ? 'Naming looks consistent'         : 'Same logic under different naming conventions',
    circular:   count === 0 ? 'No import cycles found'          : 'Import cycles — A imports B imports A',
    smells:     count === 0 ? 'Functions and files look lean'   : 'Long functions, deep nesting, too many parameters',
    complexity: count === 0 ? 'All functions manageable'        : 'High cyclomatic complexity — CC = 1 + decision points',
    cogcx:      count === 0 ? 'Cognitive complexity is low'     : 'Hard to understand code — nesting multiplies the score',
    lang:       count === 0 ? 'No language anti-patterns'       : 'Python mutable defaults, JS var, Go ignored errors, Rust unwrap, Java raw types',
    patterns:   count === 0 ? 'No code pattern issues'         : 'Hardcoded URLs, meaningless names, N+1 queries, long regex, high TODO density',
    errors:     count === 0 ? 'Error handling looks solid'      : 'Empty catches, swallowed errors, missing async handling',
    types:      count === 0 ? 'Type safety looks good'          : 'TypeScript any, ts-ignore, untyped Python functions',
    tests:      count === 0 ? 'Test coverage looks good'        : 'Missing tests, uncovered functions, no test files',
    comments:   count === 0 ? 'Comments look clean'             : 'Commented-out code, stale TODOs, empty comments',
    imports:    count === 0 ? 'Import health looks good'        : 'Unused imports, wildcards, buried imports',
    split:      count === 0 ? 'No split candidates found'       : 'Large functions and files with natural split points',
    memory:     count === 0 ? 'No memory leak patterns found'  : 'Event listener leaks, unclosed handles, growing collections, useEffect missing cleanup',
    perf:       count === 0 ? 'No performance issues found'    : 'N+1 queries, DOM queries in loops, missing React keys, string concat in loops',
    a11y:       count === 0 ? 'No accessibility issues found'  : 'Missing alt, unlabeled inputs, empty buttons, aria-hidden on interactive elements, no lang',
    custom:     count === 0 ? loadCustomRules().length ? 'No matches for your custom rules' : 'No custom rules defined — add rules in Settings' : 'Your custom regex rules found matches',
  };
  return descs[id] || '';
}

function scoreColor(score) {
  if (score >= 75) return 'var(--green)';
  if (score >= 50) return 'var(--yellow)';
  if (score >= 30) return 'var(--orange)';
  return 'var(--red)';
}

function scoreBadgeClass(score) {
  if (score >= 75) return 'score-green';
  if (score >= 50) return 'score-yellow';
  if (score >= 30) return 'score-orange';
  return 'score-red';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Event Handlers ──────────────────────────────────── */
function attachHandlers() {
  const dz = document.getElementById('dropzone');
  if (dz) {
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', e => { dz.classList.remove('drag-over'); });
    dz.addEventListener('drop',      handleDrop);
  }
  const fi = document.getElementById('folder-input');
  if (fi) fi.addEventListener('change', handleFolderInput);

}

/* ── Toast ───────────────────────────────────────────── */
function setupToastContainer() {
  if (!document.getElementById('toast-container')) {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ── Code Viewer Modal ───────────────────────────────── */
function showCodeModal(filePath, issueLine, lineEnd, title) {
  document.getElementById('code-modal-overlay')?.remove();

  const f = state.files.find(f =>
    f.path === filePath || f.path.endsWith('/' + filePath) || filePath.endsWith('/' + f.path)
  );
  if (!f || !f.content) { showToast('File content not available', 'error'); return; }

  const allLines = f.content.split('\n');
  const issStart = Math.max(1, issueLine || 1);
  const issEnd   = Math.max(issStart, lineEnd || issStart);

  // Show ~8 lines before, all issue lines, ~8 lines after
  const viewStart = Math.max(0, issStart - 9);
  const viewEnd   = Math.min(allLines.length, issEnd + 8);
  const viewLines = allLines.slice(viewStart, viewEnd);

  const overlay = document.createElement('div');
  overlay.id = 'code-modal-overlay';
  overlay.className = 'code-modal-overlay';

  const rows = viewLines.map((line, i) => {
    const abs = viewStart + i + 1;
    const isHL = abs >= issStart && abs <= issEnd;
    return `<tr class="${isHL ? 'issue-line' : ''}">
      <td class="code-line-num ${isHL ? 'active' : ''}">${abs}</td>
      <td class="code-line-text">${hlLine(line, f.lang)}</td>
    </tr>`;
  }).join('');

  overlay.innerHTML = `
    <div class="code-modal" role="dialog">
      <div class="code-modal-header">
        <div style="flex:1;min-width:0">
          <div class="code-modal-title">${escHtml(title || 'Code View')}</div>
          <div class="code-modal-file">${escHtml(filePath)}${issueLine ? ' · Line ' + issueLine : ''}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          <span style="font-size:10px;color:var(--t3)">${allLines.length} lines total</span>
          <button class="code-modal-close" onclick="document.getElementById('code-modal-overlay').remove()">✕ Close</button>
        </div>
      </div>
      <div class="code-modal-body">
        <table class="code-table"><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Close on ESC
  const onEsc = e => {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);

  // Scroll the highlighted line into view
  requestAnimationFrame(() => {
    const hl = overlay.querySelector('tr.issue-line');
    if (hl) hl.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

/* ── Syntax Highlighter ──────────────────────────────── */
const HL_KEYWORDS = new Set([
  'const','let','var','function','class','return','if','else','for','while','do',
  'switch','case','break','continue','import','export','default','from','async',
  'await','try','catch','finally','throw','new','typeof','instanceof','null',
  'undefined','true','false','void','delete','in','of','yield','super','this',
  'def','self','pass','lambda','with','as','and','or','not','is','elif','except',
  'raise','global','nonlocal','print','func','fn','pub','use','mod','impl','trait',
  'mut','match','where','public','private','protected','static','override',
  'virtual','readonly','abstract','interface','enum','struct','type','extends',
  'implements','package','namespace','using','include','require','module','end',
]);

function hlLine(rawLine, lang) {
  const tokens = [];
  let i = 0;
  const len = rawLine.length;

  while (i < len) {
    // Line comments: // or #
    if (rawLine[i] === '/' && rawLine[i+1] === '/') {
      tokens.push({ t:'com', v: rawLine.slice(i) }); break;
    }
    if (rawLine[i] === '#') {
      tokens.push({ t:'com', v: rawLine.slice(i) }); break;
    }
    // Block comment opening /*
    if (rawLine[i] === '/' && rawLine[i+1] === '*') {
      const end = rawLine.indexOf('*/', i + 2);
      const slice = end >= 0 ? rawLine.slice(i, end + 2) : rawLine.slice(i);
      tokens.push({ t:'com', v: slice });
      i = end >= 0 ? end + 2 : len;
      continue;
    }
    // Strings: " ' `
    if (rawLine[i] === '"' || rawLine[i] === "'" || rawLine[i] === '`') {
      const q = rawLine[i];
      let j = i + 1;
      while (j < len) {
        if (rawLine[j] === '\\') { j += 2; continue; }
        if (rawLine[j] === q) { j++; break; }
        j++;
      }
      tokens.push({ t:'str', v: rawLine.slice(i, j) });
      i = j;
      continue;
    }
    // Collect code chunk until next special char
    let j = i;
    while (j < len && rawLine[j] !== '"' && rawLine[j] !== "'" && rawLine[j] !== '`'
           && !(rawLine[j] === '/' && (rawLine[j+1] === '/' || rawLine[j+1] === '*'))
           && rawLine[j] !== '#') { j++; }
    if (j > i) { tokens.push({ t:'code', v: rawLine.slice(i, j) }); i = j; }
    else i++;
  }

  return tokens.map(tok => {
    if (tok.t === 'com') return `<span class="syn-com">${escHtml(tok.v)}</span>`;
    if (tok.t === 'str') return `<span class="syn-str">${escHtml(tok.v)}</span>`;
    // Code: split on word boundaries, highlight, then escape non-word chars separately
    const parts = tok.v.split(/(\b[a-zA-Z_$]\w*\b|\b\d+\.?\d*\b)/);
    return parts.map((part, pi) => {
      if (!part) return '';
      // Word token
      if (/^[a-zA-Z_$]\w*$/.test(part)) {
        const escaped = escHtml(part);
        if (HL_KEYWORDS.has(part)) return `<span class="syn-kw">${escaped}</span>`;
        // Is it followed by '(' (function call)?
        const next = parts[pi + 1] || '';
        if (next.trimStart().startsWith('(')) return `<span class="syn-fn">${escaped}</span>`;
        return escaped;
      }
      // Number token
      if (/^\d+\.?\d*$/.test(part)) return `<span class="syn-num">${escHtml(part)}</span>`;
      // Punctuation / operators — just escape
      return escHtml(part);
    }).join('');
  }).join('');
}

/* ── PDF Export — clean light-themed print page ─────── */
function exportPDF() {
  if (!state.results) return;
  const r = state.results;

  const SEV_COLOR  = { critical:'#dc2626', high:'#dc2626', medium:'#d97706', low:'#2563eb', info:'#6b7280' };
  const SEV_BG     = { critical:'#fef2f2', high:'#fef2f2', medium:'#fffbeb', low:'#eff6ff',  info:'#f9fafb' };

  const allIssues = [
    ...(r.security     ||[]).map(i=>({...i,_cat:'Security'})),
    ...(r.deadCode     ||[]).map(i=>({...i,_cat:'Dead Code'})),
    ...(r.errorIssues  ||[]).map(i=>({...i,_cat:'Error Handling'})),
    ...(r.complexity   ||[]).map(i=>({...i,_cat:'Complexity'})),
    ...(r.cogCx        ||[]).map(i=>({...i,_cat:'Cognitive'})),
    ...(r.langIssues   ||[]).map(i=>({...i,_cat:'Lang Pattern'})),
    ...(r.patternIssues||[]).map(i=>({...i,_cat:'Code Pattern'})),
    ...(r.smells       ||[]).map(i=>({...i,_cat:'Code Smell'})),
    ...(r.duplicates   ||[]).map(i=>({...i,_cat:'Duplicate'})),
    ...(r.memoryIssues ||[]).map(i=>({...i,_cat:'Memory'})),
    ...(r.perfIssues   ||[]).map(i=>({...i,_cat:'Performance'})),
    ...(r.a11yIssues   ||[]).map(i=>({...i,_cat:'Accessibility'})),
    ...(r.commentRot   ||[]).map(i=>({...i,_cat:'Comment Rot'})),
    ...(r.importIssues ||[]).map(i=>({...i,_cat:'Import'})),
    ...(r.circular     ||[]).map(i=>({...i,_cat:'Circular'})),
    ...(r.typeIssues   ||[]).map(i=>({...i,_cat:'Type Safety'})),
  ].sort((a,b) => ['critical','high','medium','low','info'].indexOf(a.severity) - ['critical','high','medium','low','info'].indexOf(b.severity));

  const score = r.fileScores?.length
    ? Math.round(r.fileScores.reduce((s,f)=>s+f.score,0)/r.fileScores.length) : 100;
  const scoreColor = score>=75?'#16a34a':score>=50?'#ca8a04':score>=30?'#d97706':'#dc2626';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CodeClean Report — ${escHtml(state.projectName)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#fff; color:#111; font-size:13px; line-height:1.5; }
  .header { background:#1e1e2e; color:#fff; padding:28px 32px; display:flex; align-items:center; justify-content:space-between; }
  .header-left h1 { font-size:22px; font-weight:800; letter-spacing:-0.02em; }
  .header-left p  { font-size:12px; color:#8b8b9a; margin-top:4px; }
  .score-chip { background:#fff; border-radius:10px; padding:10px 18px; text-align:center; min-width:80px; }
  .score-chip .num { font-size:28px; font-weight:800; color:${scoreColor}; line-height:1; }
  .score-chip .lbl { font-size:9px; color:#666; text-transform:uppercase; letter-spacing:0.06em; }
  .stats { display:flex; gap:0; background:#f8f9fa; border-bottom:1px solid #e5e7eb; }
  .stat { flex:1; padding:14px 20px; text-align:center; border-right:1px solid #e5e7eb; }
  .stat:last-child { border-right:none; }
  .stat .val { font-size:20px; font-weight:700; }
  .stat .lbl { font-size:10px; color:#6b7280; text-transform:uppercase; margin-top:2px; }
  .section-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; padding:16px 24px 8px; border-top:1px solid #e5e7eb; margin-top:8px; }
  .issue { display:flex; gap:12px; align-items:flex-start; padding:10px 24px; border-bottom:1px solid #f3f4f6; page-break-inside:avoid; }
  .issue:hover { background:#f9fafb; }
  .sev-badge { font-size:9px; font-weight:700; padding:2px 7px; border-radius:4px; text-transform:uppercase; white-space:nowrap; flex-shrink:0; margin-top:2px; }
  .cat-badge { font-size:9px; color:#6b7280; background:#f3f4f6; padding:2px 6px; border-radius:4px; flex-shrink:0; margin-top:2px; white-space:nowrap; }
  .issue-body { flex:1; min-width:0; }
  .issue-title { font-size:12px; font-weight:500; color:#111; }
  .issue-file  { font-size:10px; color:#6b7280; font-family:monospace; margin-top:2px; }
  .issue-tip   { font-size:10px; color:#16a34a; margin-top:3px; }
  .issue-code  { font-size:10px; font-family:monospace; background:#f8f9fa; border:1px solid #e5e7eb; border-radius:4px; padding:4px 8px; margin-top:5px; color:#b45309; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; }
  .files-table { width:100%; border-collapse:collapse; margin:0 24px; width:calc(100% - 48px); }
  .files-table th { font-size:9px; font-weight:700; text-transform:uppercase; color:#6b7280; padding:8px 10px; border-bottom:2px solid #e5e7eb; text-align:left; }
  .files-table td { padding:8px 10px; border-bottom:1px solid #f3f4f6; font-size:11px; }
  .files-table tr:nth-child(even) td { background:#f9fafb; }
  .score-cell { font-weight:700; }
  .footer { text-align:center; padding:20px; font-size:10px; color:#9ca3af; border-top:1px solid #e5e7eb; margin-top:16px; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .header { -webkit-print-color-adjust:exact; }
    .issue { page-break-inside:avoid; }
    .section-title { page-break-after:avoid; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>✓ CodeClean Report</h1>
    <p>${escHtml(state.projectName)} · ${state.files.length} files · ${new Date().toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}</p>
  </div>
  <div class="score-chip">
    <div class="num">${score}</div>
    <div class="lbl">Score /100</div>
  </div>
</div>

<div class="stats">
  <div class="stat"><div class="val" style="color:${allIssues.length>0?'#dc2626':'#16a34a'}">${allIssues.length}</div><div class="lbl">Total Issues</div></div>
  <div class="stat"><div class="val" style="color:#dc2626">${allIssues.filter(i=>i.severity==='high'||i.severity==='critical').length}</div><div class="lbl">High / Critical</div></div>
  <div class="stat"><div class="val" style="color:#16a34a">${r.cleanFiles||0}</div><div class="lbl">Clean Files</div></div>
  <div class="stat"><div class="val">${state.files.length}</div><div class="lbl">Total Files</div></div>
  <div class="stat"><div class="val">${r.langCount||0}</div><div class="lbl">Languages</div></div>
</div>

<div class="section-title">All Issues — sorted by severity</div>
${allIssues.slice(0,200).map(i=>`
<div class="issue">
  <span class="sev-badge" style="background:${SEV_BG[i.severity]||'#f9fafb'};color:${SEV_COLOR[i.severity]||'#666'}">${i.severity||'info'}</span>
  <span class="cat-badge">${escHtml(i._cat)}</span>
  <div class="issue-body">
    <div class="issue-title">${escHtml(i.title||i.message||'')}</div>
    ${i.file?`<div class="issue-file">${escHtml(i.file)}${i.line?':'+i.line:''}</div>`:''}
    ${i.snippet?`<div class="issue-code">${escHtml(i.snippet)}</div>`:''}
    ${i.suggestion?`<div class="issue-tip">💡 ${escHtml(i.suggestion)}</div>`:''}
  </div>
</div>`).join('')}

${r.fileScores?.length ? `
<div class="section-title" style="margin-top:16px">File Health Scores</div>
<div style="padding:0 24px 16px">
<table class="files-table">
  <thead><tr><th>File</th><th>Score</th><th>Issues</th><th>Lines</th></tr></thead>
  <tbody>
  ${r.fileScores.slice(0,40).map(f=>`
  <tr>
    <td style="font-family:monospace;font-size:10px">${escHtml(f.path)}</td>
    <td class="score-cell" style="color:${f.score>=75?'#16a34a':f.score>=50?'#ca8a04':f.score>=30?'#d97706':'#dc2626'}">${f.score}</td>
    <td>${f.issues}</td>
    <td>${f.lines||'—'}</td>
  </tr>`).join('')}
  </tbody>
</table>
</div>` : ''}

<div class="footer">Generated by CodeClean · ${new Date().toISOString()} · veloceai.in</div>

<script>window.onload = () => setTimeout(() => window.print(), 400);</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    // Fallback if popup blocked — download as HTML
    downloadBlob(html, 'text/html', `codeclean-${state.projectName||'report'}-${dateStamp()}-print.html`);
    showToast('Popup blocked — HTML file downloaded instead. Open it and print.', 'info');
  }
}

/* ── SVG Icons ───────────────────────────────────────── */
function svgLogoMark() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="white" stroke-width="1.5"/>
    <path d="M5 8l2.5 2.5L11 5.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function svgAll() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
  </svg>`;
}
function svgDead() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 2C5.24 2 3 4.24 3 7c0 1.8.96 3.37 2.4 4.23L6 14h4l.6-2.77C12.04 10.37 13 8.8 13 7c0-2.76-2.24-5-5-5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M6 14h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M6.5 7.5L8 6l1.5 1.5M8 6v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function svgSecurity() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L2 4v4c0 3.31 2.58 6.41 6 7 3.42-.59 6-3.69 6-7V4L8 1.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M8 6v2.5M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}
function svgDupes() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="4" width="8" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
    <path d="M5 4V3a1 1 0 011-1h6a1 1 0 011 1v8a1 1 0 01-1 1h-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M3 8h4M3 11h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;
}
function svgNames() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M4 4v8M12 4v8M4 12h2M10 12h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M6 8h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="1.5 1"/>
  </svg>`;
}
function svgCircular() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 2.5A5.5 5.5 0 1113.5 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M13.5 8l-2-2M13.5 8l-2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function svgSmells() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M4 13V6a4 4 0 018 0v7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M2 13h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M8 6v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;
}
function svgComments() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;
}
function svgImports() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M13 8H3M8 3l5 5-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function svgSplit() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v12M2 8h4M10 8h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M2 5l2 3-2 3M14 5l-2 3 2 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function svgFiles() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M9 1v4h4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M5 9h6M5 12h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;
}
function svgFolder() {
  return `<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M1 4a1 1 0 011-1h4l2 2h6a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`;
}
function svgExport() {
  return `<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2 12h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;
}
function svgGithub() {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>`;
}
function svgDropIcon() {
  return `<svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <path d="M16 4v16M9 13l7 7 7-7" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 24h22" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}
function svgCheck() {
  return `<svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/>
    <path d="M5.5 8l2 2L10.5 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* ── AI Prompt Modal ─────────────────────────────────── */
const promptState = { points: [] };

function generatePromptPoints() {
  const r = state.results;
  if (!r) return [];
  const pts = [];
  const uid = () => Math.random().toString(36).slice(2);
  const isHigh = i => i.severity === 'high' || i.severity === 'critical';

  const proj = detectProjectType(state.files);
  const FIXES = getSpecificFixes(proj);

  // ── CRITICAL: Security HIGH ─────────────────────────────
  (r.security || []).filter(isHigh).slice(0, 6).forEach(i => {
    const snippet = i.snippet ? `\n  Flagged code: \`${i.snippet.slice(0,60)}\`` : '';
    const fix = FIXES[matchFixKey(i.title)] || i.suggestion || 'apply secure coding best practice';
    pts.push({ id:uid(), cat:'🚨 Critical — Security', text:`[${shortPath(i.file)}:${i.line||'?'}] ${i.title}${snippet}\n  Fix: ${fix}` });
  });

  // ── HIGH: Circular deps, error handling gaps ────────────
  (r.circular || []).slice(0, 3).forEach(i => {
    const chain = i.snippet || i.title;
    pts.push({ id:uid(), cat:'🔴 High — Architecture', text:`Break circular import: ${chain}\n  Fix: Extract shared types/interfaces to a separate module that both sides can import` });
  });
  (r.errorIssues || []).filter(isHigh).slice(0, 4).forEach(i =>
    pts.push({ id:uid(), cat:'🔴 High — Error Handling', text:`[${shortPath(i.file)}:${i.line||'?'}] ${i.title}\n  Fix: ${i.suggestion}` })
  );

  // ── MEDIUM: Smells, complexity, type safety ─────────────
  (r.smells || []).filter(isHigh).concat((r.smells||[]).filter(i=>i.severity==='medium')).slice(0, 5).forEach(i =>
    pts.push({ id:uid(), cat:'🟡 Medium — Refactor', text:`[${shortPath(i.file)}:${i.line||'?'}] ${i.title}\n  ${i.suggestion}` })
  );
  (r.complexity || []).filter(i => (i.cc||0) >= 15).slice(0, 4).forEach(i =>
    pts.push({ id:uid(), cat:'🟡 Medium — Complexity', text:`[${shortPath(i.file)}:${i.line||'?'}] ${i.title} — extract branches into named functions with single responsibility` })
  );
  (r.typeIssues || []).filter(isHigh).slice(0, 4).forEach(i =>
    pts.push({ id:uid(), cat:'🟡 Medium — Type Safety', text:`[${shortPath(i.file)}:${i.line||'?'}] ${i.title}\n  ${i.suggestion}` })
  );

  // ── LOW: Dead code, duplicates ──────────────────────────
  const deadImports = (r.deadCode||[]).filter(i=>i.title.includes('import')||i.title.includes('Import'));
  if (deadImports.length > 3) {
    pts.push({ id:uid(), cat:'🔵 Cleanup — Dead Code', text:`Remove ${deadImports.length} unused imports across ${[...new Set(deadImports.map(i=>shortPath(i.file)))].slice(0,4).join(', ')}${deadImports.length>4?' and more':''}` });
  } else {
    deadImports.slice(0,4).forEach(i =>
      pts.push({ id:uid(), cat:'🔵 Cleanup — Dead Code', text:`Remove ${i.title} in ${shortPath(i.file)}:${i.line||'?'}` })
    );
  }
  (r.duplicates||[]).filter(i=>i.severity==='medium').slice(0,3).forEach(i =>
    pts.push({ id:uid(), cat:'🔵 Cleanup — Duplicates', text:`${i.title}\n  Extract shared logic into ${proj.utilsName || 'utils/shared.js'}` })
  );

  // ── CVE vulnerabilities ─────────────────────────────────
  (r.depIssues||[]).filter(isHigh).slice(0,4).forEach(i =>
    pts.push({ id:uid(), cat:'🚨 Critical — CVE', text:`[${shortPath(i.file)}] ${i.title}\n  Fix: ${i.suggestion}` })
  );

  // ── Cognitive complexity ────────────────────────────────
  (r.cogCx||[]).filter(i=>(i.cogScore||0)>=20).slice(0,3).forEach(i =>
    pts.push({ id:uid(), cat:'🟡 Medium — Cognitive', text:`[${shortPath(i.file)}:${i.line||'?'}] ${i.title}\n  Flatten the nesting: use early returns and extract each nested branch into a named function` })
  );

  // ── Lang-specific patterns ──────────────────────────────
  (r.langIssues||[]).filter(isHigh).slice(0,4).forEach(i =>
    pts.push({ id:uid(), cat:'🟡 Medium — Lang Pattern', text:`[${shortPath(i.file)}:${i.line||'?'}] ${i.title}\n  ${i.suggestion}` })
  );

  // ── Code patterns (N+1, hardcoded URLs, etc.) ──────────
  (r.patternIssues||[]).filter(i=>i.severity==='high').slice(0,3).forEach(i =>
    pts.push({ id:uid(), cat:'🟡 Medium — Pattern', text:`[${shortPath(i.file)}:${i.line||'?'}] ${i.title}\n  ${i.suggestion}` })
  );

  // ── Test coverage ───────────────────────────────────────
  const covIssue = (r.testIssues||[]).find(i=>i.coveragePct !== undefined);
  if (covIssue) {
    pts.push({ id:uid(), cat:'🧪 Tests', text:`Test coverage is ~${covIssue.coveragePct}%. Add tests for: security-critical functions, functions with CC≥${state.settings?.ccLimit||8}, and all public API methods first` });
  } else if ((r.testIssues||[]).some(i=>i.title.includes('No test files'))) {
    pts.push({ id:uid(), cat:'🧪 Tests', text:`No test files found. Set up ${proj.testFramework || 'a testing framework'} and write tests for the core business logic first` });
  }

  // ── Architecture ────────────────────────────────────────
  buildArchSuggestions().forEach(s =>
    pts.push({ id:uid(), cat:'🏗 Architecture', text: s })
  );

  return pts;
}

/* ── Project type detection ──────────────────────────── */
function detectProjectType(files) {
  const paths = files.map(f => f.path.toLowerCase());
  const names = files.map(f => f.name.toLowerCase());
  const content = files.slice(0, 20).map(f => f.content || '').join('\n').slice(0, 5000);
  const langs = {};
  files.forEach(f => { langs[f.lang] = (langs[f.lang]||0)+1; });
  const dominant = Object.entries(langs).sort((a,b)=>b[1]-a[1])[0]?.[0];

  const is = pat => paths.some(p => pat.test(p)) || content.includes(pat.source?.slice(0,10)||'');

  if (/fastapi|uvicorn/.test(content) || paths.some(p=>/main\.py/.test(p))) return { name:'FastAPI (Python)', lang:'py', testFramework:'pytest', utilsName:'utils/helpers.py' };
  if (/django/.test(content) || names.some(n=>n==='manage.py')) return { name:'Django (Python)', lang:'py', testFramework:'pytest-django', utilsName:'utils/helpers.py' };
  if (/flask/.test(content)) return { name:'Flask (Python)', lang:'py', testFramework:'pytest', utilsName:'utils/helpers.py' };
  if (/next\.config|_app\.tsx|_app\.jsx/.test(paths.join())) return { name:'Next.js', lang:'ts', testFramework:'Jest + React Testing Library', utilsName:'lib/utils.ts' };
  if (paths.some(p=>/react/.test(p)) || content.includes('import React')) return { name:'React', lang:'ts', testFramework:'Jest + RTL', utilsName:'src/utils/index.ts' };
  if (content.includes('express()') || content.includes("require('express')")) return { name:'Express.js', lang:'js', testFramework:'Jest/Mocha', utilsName:'utils/helpers.js' };
  if (dominant === 'go') return { name:'Go', lang:'go', testFramework:'Go testing package', utilsName:'pkg/utils/helpers.go' };
  if (dominant === 'java') return { name:'Java/Spring', lang:'java', testFramework:'JUnit 5', utilsName:'utils/Helpers.java' };
  if (dominant === 'cs') return { name:'.NET/C#', lang:'cs', testFramework:'xUnit', utilsName:'Utils/Helpers.cs' };
  if (dominant === 'rs') return { name:'Rust', lang:'rs', testFramework:'cargo test', utilsName:'src/utils.rs' };
  return { name: dominant ? `${dominant.toUpperCase()} project` : 'Project', lang: dominant, testFramework:'your test framework', utilsName:'utils/helpers' };
}

function getSpecificFixes(proj) {
  const isPy = proj.lang === 'py';
  const isJS = ['js','ts','jsx','tsx'].includes(proj.lang);
  return {
    'hardcoded_secret': isPy ? 'Use `os.getenv("KEY")` or python-dotenv: `from dotenv import load_dotenv`' : 'Use `process.env.KEY` and a `.env` file with dotenv',
    'sql_injection': isPy ? 'Use parameterized queries: `cursor.execute("SELECT * WHERE id=?", (user_id,))`' : 'Use prepared statements or an ORM — never concatenate user input into SQL',
    'eval': isPy ? 'Replace with `ast.literal_eval()` for data, or `json.loads()` for JSON' : 'Replace eval() with JSON.parse(), a lookup table, or proper data structures',
    'xss': isJS ? 'Use `element.textContent = text` instead of innerHTML, or sanitize with DOMPurify' : 'Escape HTML output and use a template engine with auto-escaping',
    'tls': 'Never disable SSL verification in production — fix the certificate chain instead',
    'pickle': 'Replace pickle with JSON, msgpack, or a safe serialization format',
    'subprocess_shell': 'Use `subprocess.run([cmd, arg1, arg2], shell=False)` — pass args as a list',
  };
}

function matchFixKey(title) {
  title = title.toLowerCase();
  if (/secret|credential|key|token|password/.test(title)) return 'hardcoded_secret';
  if (/sql|injection/.test(title)) return 'sql_injection';
  if (/eval/.test(title)) return 'eval';
  if (/xss|innerhtml|dangerously/.test(title)) return 'xss';
  if (/tls|ssl|verify/.test(title)) return 'tls';
  if (/pickle/.test(title)) return 'pickle';
  if (/shell=true|subprocess/.test(title)) return 'subprocess_shell';
  return null;
}

function buildArchSuggestions() {
  const suggestions = [];
  const files = state.files;
  const r = state.results;
  if (!files.length) return suggestions;

  // Detect language mix
  const langs = {};
  files.forEach(f => { langs[f.lang] = (langs[f.lang] || 0) + 1; });
  const hasPy  = langs['py'] > 0;
  const hasJS  = langs['js'] > 0 || langs['ts'] > 0 || langs['jsx'] > 0 || langs['tsx'] > 0;
  const hasGo  = langs['go'] > 0;
  const hasJava= langs['java'] > 0 || langs['cs'] > 0;

  // Large codebase → layered arch
  if (files.length > 50) suggestions.push('Apply layered architecture: separate concerns into api/, services/, repositories/, and models/ directories');

  // Many circular deps → dependency injection
  if ((r?.circular?.length || 0) > 2) suggestions.push('Introduce dependency injection to break circular imports — pass dependencies as constructor/function arguments instead of importing directly');

  // Too many god files → module split
  const godFiles = (r?.smells || []).filter(i => i.title.includes('God file'));
  if (godFiles.length > 0) suggestions.push(`Split god files (${godFiles.map(f => shortPath(f.file)).slice(0,3).join(', ')}) into smaller single-responsibility modules`);

  // Security issues → centralize auth
  const authIssues = (r?.security || []).filter(i => /token|auth|key|secret/i.test(i.title));
  if (authIssues.length > 3) suggestions.push('Centralise credentials and auth config into a single secrets manager or config module — never inline them');

  // Python specific
  if (hasPy) suggestions.push('Use __init__.py to define clean public APIs for each package — avoid importing implementation details across packages');

  // JS/TS specific
  if (hasJS) suggestions.push('Create a barrel file (index.ts) per feature folder to control public exports and enforce module boundaries');

  // Many duplicate blocks → shared utils
  if ((r?.duplicates?.length || 0) > 5) suggestions.push('Extract repeated logic into a shared utils/ or helpers/ module — consolidate before further development');

  return suggestions.slice(0, 5);
}

function shortPath(p) { return (p || '').split('/').slice(-2).join('/'); }

function showPromptModal() {
  document.getElementById('prompt-modal')?.remove();
  promptState.points = generatePromptPoints();
  renderPromptModal();
}

function renderPromptModal() {
  document.getElementById('prompt-modal')?.remove();
  const pts = promptState.points;

  // Group by category
  const groups = {};
  pts.forEach(p => { if (!groups[p.cat]) groups[p.cat] = []; groups[p.cat].push(p); });

  const groupHTML = Object.entries(groups).map(([cat, items]) => `
    <div class="prompt-group">
      <div class="prompt-group-label">${escHtml(cat)}</div>
      ${items.map(p => `
        <div class="prompt-point" id="pp-${p.id}">
          <span class="prompt-bullet">•</span>
          <span class="prompt-text" contenteditable="true" onblur="updatePromptPoint('${p.id}', this.textContent)">${escHtml(p.text)}</span>
          <button class="prompt-del" onclick="deletePromptPoint('${p.id}')" title="Remove this point">✕</button>
        </div>
      `).join('')}
    </div>
  `).join('');

  const modal = document.createElement('div');
  modal.id = 'prompt-modal';
  modal.className = 'code-modal-overlay';
  modal.innerHTML = `
    <div class="code-modal" style="max-width:780px">
      <div class="code-modal-header">
        <div style="flex:1;min-width:0">
          <div class="code-modal-title">✨ AI Refactor Prompt</div>
          <div class="code-modal-file">Edit, delete, or add bullet points — then copy to your AI assistant</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-primary btn-sm" onclick="copyPrompt()">Copy Prompt</button>
          <button class="code-modal-close" onclick="document.getElementById('prompt-modal').remove()">✕</button>
        </div>
      </div>
      <div class="code-modal-body" style="padding:16px">
        <div class="prompt-intro">
          <div class="prompt-intro-text">You are a senior software engineer. Please refactor the following codebase to fix these specific issues. Make minimal changes, preserve existing functionality, and add a brief comment for each change.</div>
        </div>
        <div id="prompt-groups">${groupHTML}</div>
        <div class="prompt-add-row">
          <input id="prompt-new-text" class="github-url-input" placeholder="Add a custom point…" onkeydown="if(event.key==='Enter')addPromptPoint()"/>
          <button class="btn btn-ghost btn-sm" onclick="addPromptPoint()">+ Add</button>
        </div>
        <div class="prompt-guidelines">
          <div class="prompt-group-label">📋 Guidelines</div>
          <div class="prompt-point"><span class="prompt-bullet">1.</span><span class="prompt-text" contenteditable="true">Make minimal changes to fix each issue — do not refactor unrelated code</span></div>
          <div class="prompt-point"><span class="prompt-bullet">2.</span><span class="prompt-text" contenteditable="true">Preserve all existing functionality and APIs</span></div>
          <div class="prompt-point"><span class="prompt-bullet">3.</span><span class="prompt-text" contenteditable="true">Add a brief comment explaining WHY each change was made</span></div>
          <div class="prompt-point"><span class="prompt-bullet">4.</span><span class="prompt-text" contenteditable="true">Maintain the existing code style, naming conventions, and patterns</span></div>
          <div class="prompt-point"><span class="prompt-bullet">5.</span><span class="prompt-text" contenteditable="true">Show the full modified files, not just diffs</span></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  const onEsc = e => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', onEsc); } };
  document.addEventListener('keydown', onEsc);
}

function updatePromptPoint(id, text) {
  const pt = promptState.points.find(p => p.id === id);
  if (pt) pt.text = text.trim();
}

function deletePromptPoint(id) {
  promptState.points = promptState.points.filter(p => p.id !== id);
  const el = document.getElementById('pp-' + id);
  if (el) { el.style.opacity = '0'; el.style.transform = 'translateX(-10px)'; setTimeout(() => el.remove(), 150); }
}

function addPromptPoint() {
  const input = document.getElementById('prompt-new-text');
  const text = input?.value?.trim();
  if (!text) return;
  const id = Math.random().toString(36).slice(2);
  promptState.points.push({ id, cat: '📝 Custom', text });
  input.value = '';
  renderPromptModal(); // re-render to show new point
}

function copyPrompt() {
  const modal = document.getElementById('prompt-modal');
  if (!modal) return;
  const intro = 'You are a senior software engineer. Please refactor the following codebase to fix these specific issues. Make minimal changes, preserve existing functionality, and add a brief comment for each change.\n\n';
  const groups = modal.querySelectorAll('.prompt-group');
  let body = '';
  groups.forEach(g => {
    const label = g.querySelector('.prompt-group-label')?.textContent || '';
    const points = [...g.querySelectorAll('.prompt-text')].map(el => '• ' + el.textContent.trim());
    if (points.length) body += `${label}\n${points.join('\n')}\n\n`;
  });
  const guidelines = [...modal.querySelectorAll('.prompt-guidelines .prompt-text')];
  if (guidelines.length) {
    body += 'Guidelines:\n' + guidelines.map((el, i) => `${i+1}. ${el.textContent.trim()}`).join('\n');
  }
  const fullPrompt = intro + body;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(fullPrompt).then(() => showToast('Prompt copied — paste into Claude, ChatGPT, or Gemini', 'success'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = fullPrompt; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    showToast('Prompt copied!', 'success');
  }
}

/* ── Copy Issue (#48) ────────────────────────────────── */
function copyIssue(filePath, line, title) {
  const text = `${title}\n${filePath}:${line}`;
  const btn = event?.target?.closest('button');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => { if (btn) showCopyBadge(btn); });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    if (btn) showCopyBadge(btn);
  }
}

function svgCopy() {
  return `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="display:inline;vertical-align:middle"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

/* ── Snapshot diff banner ────────────────────────────── */
function renderSnapshotBanner() {
  const prev = window._prevSnapshot;
  const curr = state.snapshot;
  if (!prev || !curr) return '';

  const issueDiff  = curr.totalIssues - prev.totalIssues;
  const scoreDiff  = curr.score - prev.score;
  const improved   = issueDiff < 0 || scoreDiff > 0;
  const color      = improved ? 'var(--green)' : issueDiff > 0 ? 'var(--red)' : 'var(--t3)';
  const icon       = improved ? '📈' : issueDiff > 0 ? '📉' : '↔';
  const issueTxt   = issueDiff < 0 ? `${Math.abs(issueDiff)} issues fixed` : issueDiff > 0 ? `${issueDiff} new issues` : 'same issue count';
  const scoreTxt   = scoreDiff !== 0 ? ` · Score ${prev.score}→${curr.score}` : '';

  return `
    <div class="snapshot-banner" style="border-color:${color}20;background:${color}08">
      <span style="font-size:16px">${icon}</span>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600;color:${color}">${issueTxt}${scoreTxt} since last scan</div>
        <div style="font-size:10px;color:var(--t3);margin-top:2px">
          Previous: ${prev.totalIssues} issues · ${prev.totalFiles} files · score ${prev.score} · ${new Date(prev.scannedAt).toLocaleString()}
        </div>
      </div>
      <button onclick="window._prevSnapshot=null;const c=document.getElementById('content');if(c)c.innerHTML=renderContent()"
              class="btn-icon" style="font-size:10px;color:var(--t3)">✕</button>
    </div>`;
}

/* ── #61 Severity Filter Chips ───────────────────────── */
function renderSeverityChips() {
  const chips = ['all','high','medium','low'];
  const labels = { all:'All', high:'🔴 High', medium:'🟡 Medium', low:'🔵 Low' };
  return `
    <div class="severity-chips">
      ${chips.map(s => `
        <button class="filter-chip ${state.severityFilter === s ? 'active' : ''}"
          onclick="setSeverityFilter('${s}')">${labels[s]}</button>
      `).join('')}
      ${state.issueSearch ? `<span style="font-size:10px;color:var(--t3);margin-left:4px">filtered by "${escHtml(state.issueSearch)}"</span>` : ''}
    </div>`;
}

function setSeverityFilter(sev) {
  state.severityFilter = sev;
  const c = document.getElementById('content');
  if (c) c.innerHTML = renderContent();
}

/* ── #66 Search Bar ──────────────────────────────────── */
function renderSearchBar() {
  return `
    <div class="issue-search-wrap">
      <div class="issue-search-icon">${svgSearchSmall()}</div>
      <input class="issue-search-input" id="issue-search"
        placeholder="Search issues, files, functions…"
        value="${escHtml(state.issueSearch)}"
        oninput="setIssueSearch(this.value)"
      />
      ${state.issueSearch ? `<button class="issue-search-clear" onclick="setIssueSearch('')">✕</button>` : ''}
    </div>`;
}

function setIssueSearch(val) {
  state.issueSearch = val;
  const c = document.getElementById('content');
  if (c) c.innerHTML = renderContent();
}

function filterIssues(issues) {
  if (!issues) return [];
  let out = issues;
  if (state.severityFilter !== 'all') {
    out = out.filter(i => i.severity === state.severityFilter);
  }
  if (state.issueSearch.trim()) {
    const q = state.issueSearch.toLowerCase();
    out = out.filter(i =>
      (i.title||'').toLowerCase().includes(q) ||
      (i.file||'').toLowerCase().includes(q) ||
      (i.suggestion||'').toLowerCase().includes(q)
    );
  }
  return out;
}

/* ── #63 Quick Wins (collapsible) ───────────────────── */
function renderQuickWins(r) {
  const isOpen = state.expandedSections.has('quickwins');
  const all = [
    ...(r.deadCode     || []).map(i => ({ ...i, _cat:'dead' })),
    ...(r.importIssues || []).map(i => ({ ...i, _cat:'imports' })),
    ...(r.commentRot   || []).map(i => ({ ...i, _cat:'comments' })),
    ...(r.errorIssues  || []).map(i => ({ ...i, _cat:'errors' })),
    ...(r.nameIssues   || []).map(i => ({ ...i, _cat:'names' })),
  ];

  // Sort by fix effort: LOW severity + short title = quick win
  const wins = all
    .filter(i => i.severity === 'low' || i.file)
    .sort((a, b) => {
      const sevOrder = { low:0, medium:1, high:2, critical:3 };
      return (sevOrder[a.severity]||1) - (sevOrder[b.severity]||1);
    })
    .slice(0, 8);

  if (!wins.length) return '';

  const totalTime = wins.reduce((s, i) => s + (i.severity === 'low' ? 3 : 8), 0);

  return `
    <div class="quick-wins-card">
      <div class="quick-wins-header" onclick="toggleSection('quickwins')" style="cursor:pointer">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">⚡</span>
          <div>
            <div class="quick-wins-title">Quick Wins — fix these first</div>
            <div class="quick-wins-sub">${wins.length} easy fixes · ~${totalTime} min estimated</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge badge-success">${wins.length} items</span>
          <span class="issue-section-chevron ${isOpen ? 'open' : ''}">▼</span>
        </div>
      </div>
      ${isOpen ? `
      <div class="quick-wins-list">
        ${wins.map(i => {
          const autoFix = getAutoFix(i);
          const safeTitle = (i.title||'').replace(/'/g,"'");
          return `
            <div class="quick-win-row">
              <span class="badge ${i.severity === 'low' ? 'badge-low' : 'badge-medium'}" style="flex-shrink:0">${i.severity||'low'}</span>
              <div class="quick-win-body">
                <div class="quick-win-title">${escHtml(i.title||'')}</div>
                <div class="quick-win-file">${escHtml(i.file||'')}${i.line ? ':' + i.line : ''}</div>
                ${autoFix ? `<div class="auto-fix-cmd"><code>${escHtml(autoFix)}</code><button onclick="copyText('${escHtml(autoFix)}')" class="copy-cmd-btn">Copy</button></div>` : ''}
              </div>
              ${i.file ? `<button class="issue-view-btn" onclick="showCodeModal('${escHtml(i.file)}',${i.line||1},${i.lineEnd||i.line||1},'${escHtml(safeTitle)}')">View →</button>` : ''}
            </div>`;
        }).join('')}
      </div>` : ''}
    </div>`;
}

/* ── #62 Auto-fix commands ───────────────────────────── */
function getAutoFix(issue) {
  const t = (issue.title || '').toLowerCase();
  const f = issue.file || '';
  const ext = f.split('.').pop();
  const isPy = ext === 'py';
  const isJS = ['js','ts','jsx','tsx'].includes(ext);

  if (/unused import/.test(t) && isPy) return `autoflake --remove-all-unused-imports --in-place ${f}`;
  if (/unused import/.test(t) && isJS) return `npx eslint --fix ${f} --rule 'no-unused-vars: error'`;
  if (/wildcard import/.test(t) && isPy) return `isort ${f}`;
  if (/duplicate import/.test(t) && isPy) return `isort --force-single-line-imports ${f}`;
  if (/todo|fixme/.test(t)) return null; // no auto-fix for TODOs
  if (/console\.log|debug statement/.test(t) && isJS) return `npx eslint --fix ${f} --rule 'no-console: error'`;
  if (/loose equality/.test(t) && isJS) return `npx eslint --fix ${f} --rule 'eqeqeq: error'`;
  if (/import inside function/.test(t) && isPy) return `isort ${f}`;
  return null;
}

/* ── #68 Code Metrics Row ────────────────────────────── */
function renderMetricsRow(r) {
  if (!state.files.length) return '';

  const totalLines = state.files.reduce((s, f) => s + (f.lines || 0), 0);
  const avgLines = Math.round(totalLines / state.files.length);
  const allCCs = (r.complexity || []).map(i => i.cc || 0);
  const avgCC = allCCs.length ? Math.round(allCCs.reduce((s, c) => s + c, 0) / allCCs.length) : null;
  const maxCC = allCCs.length ? Math.max(...allCCs) : null;
  const testFiles = state.files.filter(f => /test|spec/.test(f.path.toLowerCase())).length;
  const testPct = Math.round((testFiles / state.files.length) * 100);
  const covIssue = (r.testIssues || []).find(i => i.coveragePct !== undefined);
  const totalFixMins = estimateFixTime(r);

  const metrics = [
    { label:'Total LOC', value: totalLines.toLocaleString(), sub: `${avgLines} avg/file` },
    { label:'Avg CC', value: avgCC !== null ? avgCC : '—', sub: maxCC ? `max ${maxCC}` : 'no fns scanned', color: avgCC > 15 ? 'var(--red)' : avgCC > 8 ? 'var(--orange)' : 'var(--green)' },
    { label:'Test Files', value: testFiles, sub: `${testPct}% of project` },
    { label:'Est. Fix Time', value: totalFixMins >= 60 ? `${(totalFixMins/60).toFixed(1)}h` : `${totalFixMins}m`, sub: `${r.totalIssues} issues`, color: 'var(--acc)' },
    { label:'Fn Coverage', value: covIssue ? `~${covIssue.coveragePct}%` : '?', sub: 'by naming convention', color: covIssue && covIssue.coveragePct < 40 ? 'var(--red)' : 'var(--green)' },
  ];

  return `
    <div class="metrics-row">
      ${metrics.map(m => `
        <div class="metric-cell">
          <div class="metric-value" style="${m.color ? `color:${m.color}` : ''}">${m.value}</div>
          <div class="metric-label">${m.label}</div>
          <div class="metric-sub">${m.sub}</div>
        </div>`).join('')}
    </div>`;
}

/* ── #67 Estimated Fix Time ──────────────────────────── */
function estimateFixTime(r) {
  const TIME = { critical: 45, high: 20, medium: 10, low: 3, info: 1 };
  const allIssues = [
    r.deadCode, r.security, r.duplicates, r.nameIssues, r.circular,
    r.smells, r.complexity, r.errorIssues, r.typeIssues, r.commentRot, r.importIssues,
  ].flatMap(arr => arr || []);
  return allIssues.reduce((s, i) => s + (TIME[i.severity] || 5), 0);
}

function fmtTime(mins) {
  if (mins >= 60) return `~${(mins / 60).toFixed(1)}h`;
  return `~${mins}m`;
}

/* ── #59 Copy Confirmation ───────────────────────────── */
function showCopyBadge(el) {
  // backdrop-filter on modal creates a new stacking context for fixed elements,
  // so we position at top-center of viewport which is always visible
  document.querySelectorAll('.copy-badge-popup').forEach(b => b.remove());
  const badge = document.createElement('div');
  badge.className = 'copy-badge-popup';
  badge.textContent = '✓ Copied!';
  badge.style.cssText = [
    'position:fixed',
    'top:64px',
    'left:50%',
    'transform:translateX(-50%) translateY(0)',
    'background:#22c55e',
    'color:white',
    'font-size:11px',
    'font-weight:700',
    'padding:6px 18px',
    'border-radius:8px',
    'pointer-events:none',
    'z-index:999999',
    'white-space:nowrap',
    'box-shadow:0 4px 16px rgba(34,197,94,0.45)',
    'transition:opacity 0.3s ease,transform 0.3s ease',
  ].join(';');
  document.body.appendChild(badge);
  setTimeout(() => {
    badge.style.opacity = '0';
    badge.style.transform = 'translateX(-50%) translateY(-6px)';
  }, 1300);
  setTimeout(() => badge.remove(), 1700);
}

function copyText(text) {
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast('Copied', 'success'));
  else { const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();showToast('Copied','success'); }
}

/* ── #60 About Modal ─────────────────────────────────── */
function showAboutModal() {
  document.getElementById('about-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'about-modal';
  modal.className = 'code-modal-overlay';
  modal.innerHTML = `
    <div class="code-modal" style="max-width:700px">
      <div class="code-modal-header">
        <div style="flex:1">
          <div class="code-modal-title">About CodeClean</div>
          <div class="code-modal-file">Local static code quality analyzer — no cloud, no install, no AI required</div>
        </div>
        <button class="code-modal-close" onclick="document.getElementById('about-modal').remove()">✕ Close</button>
      </div>
      <div class="code-modal-body" style="padding:20px">

        <div class="about-section">
          <div class="about-section-title">What is CodeClean?</div>
          <p class="about-text">CodeClean scans any project folder or GitHub repo and finds clean code violations — dead code, security issues, high complexity, missing tests, circular dependencies, and more — entirely in your browser, with no data leaving your machine.</p>
        </div>

        <div class="about-section">
          <div class="about-section-title">Score (0 – 100)</div>
          <p class="about-text">Each file starts at 100. Penalties: CRITICAL −20, HIGH −12, MEDIUM −6, LOW −2, circular dep −15. The sidebar ring shows the average across all files.</p>
          <div class="about-table">
            <div class="about-row"><span class="about-score" style="color:var(--green)">75–100</span><span>Clean — good to ship</span></div>
            <div class="about-row"><span class="about-score" style="color:var(--yellow)">50–74</span><span>Moderate — address before next release</span></div>
            <div class="about-row"><span class="about-score" style="color:var(--orange)">30–49</span><span>Poor — significant refactoring needed</span></div>
            <div class="about-row"><span class="about-score" style="color:var(--red)">0–29</span><span>Critical — high risk, fix immediately</span></div>
          </div>
        </div>

        <div class="about-section">
          <div class="about-section-title">Severity Levels</div>
          <div class="about-table">
            <div class="about-row"><span class="badge badge-critical">CRITICAL</span><span>Active security vulnerability — fix before shipping</span></div>
            <div class="about-row"><span class="badge badge-high">HIGH</span><span>Significant risk — security weakness, untestable code, circular deps</span></div>
            <div class="about-row"><span class="badge badge-medium">MEDIUM</span><span>Code smell, complexity issue — fix in current sprint</span></div>
            <div class="about-row"><span class="badge badge-low">LOW</span><span>Cleanup item — unused imports, minor style issues</span></div>
          </div>
        </div>

        <div class="about-section">
          <div class="about-section-title">Key Abbreviations</div>
          <div class="about-table">
            <div class="about-row"><span class="about-term">CC</span><span><strong>Cyclomatic Complexity</strong> — number of independent paths through a function. CC = 1 + (if + elif + for + while + case + catch + && + || + ?). CC &lt; 8 = simple, 8–14 = moderate, 15–24 = complex (needs splitting), ≥ 25 = untestable (implies ≥25 test cases needed)</span></div>
            <div class="about-row"><span class="about-term">SCC</span><span><strong>Strongly Connected Components</strong> — used in circular dependency detection. Tarjan's 1972 algorithm finds groups of files where every file can reach every other; groups of size > 1 are import cycles.</span></div>
            <div class="about-row"><span class="about-term">XSS</span><span><strong>Cross-Site Scripting</strong> — injecting malicious HTML/JS via unsanitized user input (innerHTML =). Fix: use textContent or DOMPurify.</span></div>
            <div class="about-row"><span class="about-term">SQL Injection</span><span>User input concatenated into SQL strings. Fix: use parameterized queries or an ORM.</span></div>
            <div class="about-row"><span class="about-term">TLS</span><span><strong>Transport Layer Security</strong> — the protocol behind HTTPS. <code>verify=False</code> disables cert checking, enabling man-in-the-middle attacks.</span></div>
            <div class="about-row"><span class="about-term">Entropy</span><span><strong>Shannon Entropy</strong> — measures randomness per character. String literals with entropy ≥ 4.5 bits/char likely contain a secret/key even if no keyword is present.</span></div>
            <div class="about-row"><span class="about-term">Dead Code</span><span>Code that exists but is never executed — wastes space, confuses readers, and creates maintenance burden.</span></div>
            <div class="about-row"><span class="about-term">God File</span><span>A file violating Single Responsibility Principle — > 20 functions or > 500 lines.</span></div>
            <div class="about-row"><span class="about-term">Magic Value</span><span>A literal string or number used in 5+ places without being given a name — e.g., <code>3600</code> instead of <code>SECONDS_PER_HOUR</code>.</span></div>
            <div class="about-row"><span class="about-term">PAT</span><span><strong>Personal Access Token</strong> — GitHub auth token. Without one: 60 API req/hr. With one: 5,000 req/hr, plus access to private repos.</span></div>
            <div class="about-row"><span class="about-term">FSA API</span><span><strong>File System Access API</strong> — <code>showDirectoryPicker()</code>. Shows scan progress immediately as files are discovered, unlike <code>webkitdirectory</code> which blocks until the browser finishes enumerating.</span></div>
            <div class="about-row"><span class="about-term">Structural Dupe</span><span>Two functions with identical logic but different variable names — caught by replacing all variable names with <code>$N</code> tokens before hashing.</span></div>
          </div>
        </div>

        <div class="about-section">
          <div class="about-section-title">All 14 Analyzers</div>
          <div class="about-table">
            ${[
              ['Dead Code',         'Unused files, functions, imports, variables, and exports'],
              ['Security',          '20+ patterns: secrets, XSS, SQL injection, eval, pickle, subprocess, entropy scanner'],
              ['Duplicates',        'Exact blocks (6-line hash), structural (normalized), magic values'],
              ['Name Similarity',   'Convention conflicts (camelCase vs snake_case) + verb synonym map'],
              ['Circular Deps',     "Tarjan's SCC on the import graph — shows cycle chain and break suggestion"],
              ['Code Smells',       'Long functions, long files, deep nesting, too many params, god files'],
              ['Cyclomatic (CC)',   'Decision point counting per function — flags CC ≥ 8, sorts worst-first'],
              ['Error Handling',    'Empty catch, swallowed errors, .then() without .catch(), Python bare except'],
              ['Type Safety',       'TS: any, @ts-ignore, !., implicit any; Python: untyped functions; JS: loose =='],
              ['Test Coverage',     'Detects test files, maps names to source functions, shows estimated % coverage'],
              ['Comment Rot',       'Commented-out code, TODOs/FIXMEs, empty comments, restated docstrings'],
              ['Import Health',     'Wildcard imports, buried imports, duplicate imports'],
              ['Split Tips',        'Comment/blank boundaries in long fns, param subsets, loop bodies, file clustering'],
              ['File Scoring',      'Per-file 0–100 score based on all issues found'],
            ].map(([name, desc]) => `
              <div class="about-row">
                <span class="about-term">${name}</span>
                <span>${desc}</span>
              </div>`).join('')}
          </div>
        </div>

      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); } });
}

/* ── #64 Settings Modal ──────────────────────────────── */
function showSettingsModal() {
  document.getElementById('settings-modal')?.remove();
  const s = state.settings;
  const modal = document.createElement('div');
  modal.id = 'settings-modal';
  modal.className = 'code-modal-overlay';
  modal.innerHTML = `
    <div class="code-modal" style="max-width:480px">
      <div class="code-modal-header">
        <div style="flex:1">
          <div class="code-modal-title">⚙️ Settings</div>
          <div class="code-modal-file">Configure analysis thresholds — saved to localStorage</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="resetSettings()">Reset Defaults</button>
          <button class="code-modal-close" onclick="document.getElementById('settings-modal').remove()">✕</button>
        </div>
      </div>
      <div class="code-modal-body" style="padding:20px">
        ${[
          ['ccLimit',   'CC threshold',            'Flag functions with Cyclomatic Complexity ≥',  'decision points', s.ccLimit,   4, 30],
          ['fnLines',   'Max function lines',       'Flag functions longer than',                    'lines',           s.fnLines,   20, 200],
          ['fileLines', 'Max file lines',           'Flag files longer than',                        'lines',           s.fileLines, 100, 1000],
          ['nestDepth', 'Max nesting depth',        'Flag nesting deeper than',                      'levels',          s.nestDepth, 2, 10],
          ['fnParams',  'Max function parameters',  'Flag functions with more than',                 'parameters',      s.fnParams,  2, 15],
          ['dupWindow', 'Duplicate block size',     'Detect duplicate blocks of',                    'or more lines',   s.dupWindow, 4, 20],
        ].map(([key, label, prefix, suffix, val, min, max]) => `
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">${label}</div>
              <div class="setting-desc">${prefix} <strong id="sv-${key}">${val}</strong> ${suffix}</div>
            </div>
            <input type="range" class="setting-range" min="${min}" max="${max}" value="${val}"
              oninput="saveSettings('${key}', +this.value); document.getElementById('sv-${key}').textContent = this.value"/>
          </div>`).join('')}
        <div style="margin-top:16px;padding:10px 12px;background:var(--accbg2);border-radius:8px;font-size:10px;color:var(--t3)">
          ⚠️ Changes apply on next scan. Re-scan your project to see updated results.
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function resetSettings() {
  Object.assign(state.settings, DEFAULT_SETTINGS);
  localStorage.removeItem('cc-settings');
  document.getElementById('settings-modal')?.remove();
  showSettingsModal();
  showToast('Settings reset to defaults', 'info');
}

/* ── ZIP Support ─────────────────────────────────────── */
async function handleZipFile(file) {
  if (!window.JSZip) { showToast('JSZip not loaded', 'error'); return; }
  state.projectName = file.name.replace(/\.zip$/i, '');
  state.phase = 'scanning';
  state.files = [];
  state.results = null;
  state.scanLog = [];
  state.scanProgress = { current: 0, total: 0, file: '', phase: 'Reading ZIP…' };
  renderApp();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const zip = await JSZip.loadAsync(file);
    const entries = Object.entries(zip.files).filter(([, f]) => !f.dir);
    state.scanProgress.total = entries.length;

    const collected = [];
    for (const [path, zipEntry] of entries) {
      const parts = path.split('/');
      if (parts.some(p => SKIP_DIRS.has(p))) continue;
      const ext = parts[parts.length - 1].split('.').pop()?.toLowerCase();
      if (SKIP_EXTS.has(ext)) continue;
      if (shouldIgnorePath(path, parts[parts.length-1], [], state.ignorePatterns)) continue;

      try {
        const content = await zipEntry.async('string');
        collected.push({
          file: { text: async () => content, name: parts[parts.length-1] },
          path: parts.slice(1).join('/') || path, // strip top-level zip folder
        });
        state.scanProgress.current = collected.length;
        state.scanLog.push(path);
        if (collected.length % 20 === 0) { updateScanningUI(); await new Promise(r => setTimeout(r, 0)); }
      } catch(_) {}
    }

    if (!collected.length) throw new Error('No readable files found in ZIP');
    await runScan(collected);
  } catch (err) {
    state.phase = 'landing';
    renderApp();
    showToast('ZIP error: ' + (err.message || 'Could not read ZIP'), 'error');
  }
}

/* ── Score Trend Sparkline ───────────────────────────── */
function saveTrend(score) {
  const key = 'cc-trend';
  try {
    const trend = JSON.parse(localStorage.getItem(key) || '[]');
    trend.push({ date: new Date().toISOString(), score });
    if (trend.length > 15) trend.shift();
    localStorage.setItem(key, JSON.stringify(trend));
    return trend;
  } catch (_) { return [{ score }]; }
}

function renderSparkline() {
  try {
    const trend = JSON.parse(localStorage.getItem('cc-trend') || '[]');
    if (trend.length < 2) return '';
    const scores = trend.map(t => t.score);
    const min = Math.min(...scores) - 2;
    const max = Math.max(...scores) + 2;
    const range = max - min || 1;
    const W = 80, H = 22;
    const pts = scores.map((s, i) => {
      const x = (i / (scores.length - 1)) * W;
      const y = H - ((s - min) / range) * (H - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const last = scores[scores.length - 1], prev = scores[scores.length - 2];
    const color = last > prev ? 'var(--green)' : last < prev ? 'var(--red)' : 'var(--t3)';
    const arrow = last > prev ? '↗' : last < prev ? '↘' : '→';
    return `
      <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:visible">
          <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
          <circle cx="${W}" cy="${H - ((last-min)/range*(H-2))}" r="2.5" fill="${color}"/>
        </svg>
        <span style="font-size:9px;color:${color};font-weight:700">${arrow} ${last > prev ? '+' : ''}${last-prev} pts</span>
      </div>`;
  } catch (_) { return ''; }
}

/* ── Custom Rules Modal ──────────────────────────────── */
function showCustomRulesModal() {
  document.getElementById('custom-rules-modal')?.remove();
  const rules = loadCustomRules();
  const modal = document.createElement('div');
  modal.id = 'custom-rules-modal';
  modal.className = 'code-modal-overlay';
  modal.innerHTML = `
    <div class="code-modal" style="max-width:640px">
      <div class="code-modal-header">
        <div style="flex:1">
          <div class="code-modal-title">⚡ Custom Rules</div>
          <div class="code-modal-file">Add your own regex patterns — applied to all scanned files</div>
        </div>
        <button class="code-modal-close" onclick="document.getElementById('custom-rules-modal').remove()">✕</button>
      </div>
      <div class="code-modal-body" style="padding:16px">
        <div id="custom-rules-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          ${rules.length === 0
            ? `<div style="font-size:11px;color:var(--t3);padding:8px">No custom rules yet. Add one below.</div>`
            : rules.map((r, i) => `
              <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:10px 12px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                  <span class="badge badge-${r.severity||'low'}">${r.severity||'low'}</span>
                  <span style="font-size:11px;font-weight:600;color:var(--t0);flex:1">${escHtml(r.title)}</span>
                  <button onclick="deleteCustomRule(${i})" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:11px">✕ Delete</button>
                </div>
                <code style="font-size:10px;color:var(--cyan);display:block;margin-bottom:2px">/${escHtml(r.pattern)}/${r.flags||''}</code>
                <div style="font-size:9px;color:var(--t3)">${escHtml(r.suggestion||'')}</div>
              </div>`).join('')}
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-size:11px;font-weight:600;color:var(--t0);margin-bottom:10px">Add New Rule</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
            <div>
              <div style="font-size:9px;color:var(--t3);margin-bottom:3px">Rule title *</div>
              <input id="cr-title" class="github-url-input" placeholder="No TODO without ticket"/>
            </div>
            <div>
              <div style="font-size:9px;color:var(--t3);margin-bottom:3px">Severity</div>
              <select id="cr-sev" style="width:100%;background:var(--bg0);border:1px solid var(--border);border-radius:7px;padding:8px;color:var(--t1);font-family:inherit;font-size:11px;outline:none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom:8px">
            <div style="font-size:9px;color:var(--t3);margin-bottom:3px">Regex pattern * (without slashes)</div>
            <input id="cr-pattern" class="github-url-input" placeholder="TODO(?!\\s*#\\d+)" style="font-family:'JetBrains Mono',monospace"/>
          </div>
          <div style="display:grid;grid-template-columns:80px 1fr;gap:8px;margin-bottom:8px">
            <div>
              <div style="font-size:9px;color:var(--t3);margin-bottom:3px">Flags</div>
              <input id="cr-flags" class="github-url-input" placeholder="gi" value="gi"/>
            </div>
            <div>
              <div style="font-size:9px;color:var(--t3);margin-bottom:3px">Suggestion</div>
              <input id="cr-suggestion" class="github-url-input" placeholder="Always include a ticket: TODO #123"/>
            </div>
          </div>
          <button class="btn btn-primary" onclick="addCustomRule()" style="width:100%">+ Add Rule</button>
        </div>
        <div style="margin-top:10px;font-size:10px;color:var(--t3)">
          ⚠️ Re-scan your project for custom rules to take effect.
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function addCustomRule() {
  const title      = document.getElementById('cr-title')?.value?.trim();
  const pattern    = document.getElementById('cr-pattern')?.value?.trim();
  const severity   = document.getElementById('cr-sev')?.value || 'low';
  const flags      = document.getElementById('cr-flags')?.value?.trim() || 'gi';
  const suggestion = document.getElementById('cr-suggestion')?.value?.trim();
  if (!title || !pattern) { showToast('Title and pattern are required', 'error'); return; }
  try { new RegExp(pattern, flags); } catch(e) { showToast('Invalid regex: ' + e.message, 'error'); return; }
  const rules = loadCustomRules();
  rules.push({ id: Date.now().toString(36), title, pattern, flags, severity, suggestion });
  saveCustomRules(rules);
  document.getElementById('custom-rules-modal')?.remove();
  showCustomRulesModal();
  showToast('Rule added — re-scan to apply', 'success');
}

function deleteCustomRule(idx) {
  const rules = loadCustomRules();
  rules.splice(idx, 1);
  saveCustomRules(rules);
  document.getElementById('custom-rules-modal')?.remove();
  showCustomRulesModal();
}

/* ── Bulk Copy ───────────────────────────────────────── */
function copyCategory(catId) {
  const r = state.results;
  if (!r) return;
  const dataMap = {
    security: r.security, dead: r.deadCode, smells: r.smells,
    complexity: r.complexity, cogcx: r.cogCx, errors: r.errorIssues,
    types: r.typeIssues, tests: r.testIssues, comments: r.commentRot,
    imports: r.importIssues, circular: r.circular, names: r.nameIssues,
    split: r.splitTips, memory: r.memoryIssues, perf: r.perfIssues,
    a11y: r.a11yIssues, custom: r.customIssues, deps: r.depIssues,
    lang: r.langIssues, patterns: r.patternIssues, dupes: r.duplicates,
  };
  const issues = dataMap[catId] || [];
  if (!issues.length) { showToast('No issues to copy', 'error'); return; }
  const text = issues.map(i =>
    `[${(i.severity||'').toUpperCase()}] ${i.title}${i.file ? `\n  ${i.file}${i.line ? ':' + i.line : ''}` : ''}${i.suggestion ? `\n  💡 ${i.suggestion}` : ''}`
  ).join('\n\n');
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast(`Copied ${issues.length} issues`, 'success'));
}

/* ── Keyboard Shortcuts (#72) ────────────────────────── */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.contentEditable === 'true') return;
    switch (e.key) {
      case '/':
        e.preventDefault();
        document.getElementById('issue-search')?.focus();
        break;
      case 'Escape':
        document.querySelector('.code-modal-overlay')?.remove();
        break;
      case '?':
        showKeyboardHelp();
        break;
      case 'n': {
        // Next category
        const cats = CATEGORIES.map(c => c.id);
        const cur = cats.indexOf(state.activeCategory);
        setCategory(cats[(cur + 1) % cats.length]);
        break;
      }
      case 'p': {
        // Prev category
        const cats = CATEGORIES.map(c => c.id);
        const cur = cats.indexOf(state.activeCategory);
        setCategory(cats[(cur - 1 + cats.length) % cats.length]);
        break;
      }
      case 't':
        toggleTheme();
        break;
      case 'e':
        if (state.results) exportJSON();
        break;
    }
  });
}

function showKeyboardHelp() {
  document.getElementById('kb-modal')?.remove();
  const shortcuts = [
    ['/', 'Focus search bar'],
    ['n / p', 'Next / Previous category'],
    ['t', 'Toggle light/dark theme'],
    ['e', 'Export JSON report'],
    ['Esc', 'Close any modal'],
    ['?', 'Show this help'],
  ];
  const modal = document.createElement('div');
  modal.id = 'kb-modal';
  modal.className = 'code-modal-overlay';
  modal.innerHTML = `
    <div class="code-modal" style="max-width:380px">
      <div class="code-modal-header">
        <div class="code-modal-title">⌨️ Keyboard Shortcuts</div>
        <button class="code-modal-close" onclick="document.getElementById('kb-modal').remove()">✕</button>
      </div>
      <div class="code-modal-body" style="padding:16px">
        ${shortcuts.map(([key, desc]) => `
          <div style="display:flex;align-items:center;gap:12px;padding:8px 6px;border-bottom:1px solid var(--border2)">
            <kbd style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;padding:3px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:5px;color:var(--t0);white-space:nowrap">${key}</kbd>
            <span style="font-size:11px;color:var(--t2)">${desc}</span>
          </div>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/* ── Ignore Patterns (#65) ───────────────────────────── */
function showIgnoreModal() {
  document.getElementById('ignore-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'ignore-modal';
  modal.className = 'code-modal-overlay';
  modal.innerHTML = `
    <div class="code-modal" style="max-width:500px">
      <div class="code-modal-header">
        <div style="flex:1">
          <div class="code-modal-title">🚫 Ignore Patterns</div>
          <div class="code-modal-file">Files matching these patterns will be skipped during scan</div>
        </div>
        <button class="code-modal-close" onclick="document.getElementById('ignore-modal').remove()">✕</button>
      </div>
      <div class="code-modal-body" style="padding:16px">
        <div id="ignore-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
          ${state.ignorePatterns.length === 0
            ? `<div style="font-size:11px;color:var(--t3);padding:8px">No ignore patterns — all files will be scanned</div>`
            : state.ignorePatterns.map((p, i) => `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg2);border-radius:7px">
                <code style="flex:1;font-size:11px;color:var(--cyan)">${escHtml(p)}</code>
                <button onclick="removeIgnorePattern(${i})" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:12px">✕</button>
              </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <input id="ignore-input" class="github-url-input" placeholder="e.g. **/migrations/** or *.generated.ts"
            onkeydown="if(event.key==='Enter')addIgnorePattern()"/>
          <button class="btn btn-ghost btn-sm" onclick="addIgnorePattern()">+ Add</button>
        </div>
        <div style="margin-top:10px;font-size:10px;color:var(--t3)">
          Common patterns: <code style="color:var(--acc)">**/migrations/**</code> · <code style="color:var(--acc)">**/__pycache__/**</code> · <code style="color:var(--acc)">*.generated.*</code> · <code style="color:var(--acc)">**/vendor/**</code>
        </div>
        <div style="margin-top:8px;font-size:10px;color:var(--t3)">
          ⚠️ Re-scan your project for changes to take effect.
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function addIgnorePattern() {
  const input = document.getElementById('ignore-input');
  const val = input?.value?.trim();
  if (!val) return;
  if (!state.ignorePatterns.includes(val)) {
    state.ignorePatterns.push(val);
    localStorage.setItem('cc-ignore', JSON.stringify(state.ignorePatterns));
  }
  input.value = '';
  document.getElementById('ignore-modal')?.remove();
  showIgnoreModal();
}

function removeIgnorePattern(idx) {
  state.ignorePatterns.splice(idx, 1);
  localStorage.setItem('cc-ignore', JSON.stringify(state.ignorePatterns));
  document.getElementById('ignore-modal')?.remove();
  showIgnoreModal();
}

function svgDeps() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="10" y="1" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="5.5" y="10" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 6v1.5a1 1 0 001 1h6a1 1 0 001-1V6M8 8.5V10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}
function svgCogCx() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M8 5v3l2 1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function svgLang() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 4l4 8M5 4l4 8M9 4l4 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2.5 9h9M1.5 6h3M9.5 6h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}
function svgPatterns() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M9 12h6M12 9v6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
}
function svgIgnore() {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M3 3l10 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
}
function svgSettings() {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}
function svgAbout() {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 7v4M8 5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}
function svgSearchSmall() {
  return `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}
function svgA11y() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3" r="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M4 6h8M8 6v8M5 14h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
}
function svgCustom() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="13" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M13 10.5v3M11.5 12h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}
function svgMemory() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="5" rx="6" ry="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 5v6c0 1.66 2.69 3 6 3s6-1.34 6-3V5" stroke="currentColor" stroke-width="1.4"/><path d="M2 8c0 1.66 2.69 3 6 3s6-1.34 6-3" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 1.5"/></svg>`;
}
function svgPerf() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 13L5 8l3 3 4-6 3 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13" cy="4" r="1.5" fill="currentColor" opacity="0.6"/></svg>`;
}
function svgComplexity() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8h3l2-5 2 10 2-5h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function svgErrors() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}
function svgTypes() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M6 4v8M10 4v8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M4 12h4M8 12h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}
function svgTests() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M5 2h6l3 5-3 7H5L2 7l3-5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.5 8l2 2L10 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function svgGithubBig() {
  return `<svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor" style="color:var(--acc)">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 7.07 4.58 13.07 10.94 15.19.8.15 1.09-.35 1.09-.77 0-.38-.01-1.39-.02-2.72-4.45.97-5.39-2.14-5.39-2.14-.73-1.85-1.78-2.34-1.78-2.34-1.45-.99.11-.97.11-.97 1.61.11 2.45 1.65 2.45 1.65 1.43 2.44 3.74 1.74 4.65 1.33.15-1.03.56-1.74 1.02-2.14-3.56-.4-7.3-1.78-7.3-7.93 0-1.75.63-3.19 1.65-4.31-.17-.4-.71-2.03.16-4.24 0 0 1.35-.43 4.41 1.64A15.36 15.36 0 0116 7.76c1.36.01 2.73.18 4.01.54 3.06-2.07 4.4-1.64 4.4-1.64.87 2.21.33 3.84.16 4.24 1.03 1.12 1.65 2.56 1.65 4.31 0 6.17-3.75 7.52-7.32 7.92.57.5 1.09 1.47 1.09 2.96 0 2.14-.02 3.86-.02 4.39 0 .43.29.93 1.1.77C27.43 29.06 32 23.07 32 16 32 7.16 24.84 0 16 0z"/>
  </svg>`;
}

function svgTheme() {
  const isLight = document.documentElement.classList.contains('light');
  return isLight
    ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 10A5.5 5.5 0 016 2.5a5.5 5.5 0 000 11 5.5 5.5 0 007.5-3.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
}

/* ── Boot ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initApp);
