const vscode = require('vscode');
const path   = require('path');
const fs     = require('fs');
const http   = require('http');

let panel  = null;
let server = null;
let serverPort = 0;

// ── File extensions to skip ──────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules','.git','dist','build','.next','__pycache__','.venv','venv',
  'env','target','vendor','coverage','.nyc_output','out','bin','obj',
  '.cache','.parcel-cache','storybook-static','.turbo','.vercel',
]);
const SKIP_EXTS = new Set([
  'png','jpg','jpeg','gif','svg','ico','webp','mp4','mp3','woff','woff2',
  'ttf','eot','pdf','zip','gz','tar','map','lock','min',
]);

function activate(context) {

  // ── Start a local HTTP server so the tool works in Chrome ──
  startLocalServer(context);

  // ── Command: open as webview panel ──────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeclean.open', () => openPanel(context))
  );

  // ── Command: open in system browser ─────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeclean.openInBrowser', () => {
      const url = `http://localhost:${serverPort}`;
      vscode.env.openExternal(vscode.Uri.parse(url));
      vscode.window.showInformationMessage(`CodeClean opened at ${url}`);
    })
  );

  // ── Activity Bar webview ─────────────────────────────────
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codeclean.mainView', {
      resolveWebviewView(webviewView) {
        webviewView.webview.options = {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(context.extensionPath)],
        };
        webviewView.webview.html = buildSidebarHtml(webviewView.webview, context, serverPort);
        webviewView.webview.onDidReceiveMessage(
          msg => handleMessage(msg, webviewView.webview, context),
          null, context.subscriptions
        );
      }
    }, { webviewOptions: { retainContextWhenHidden: true } })
  );
}

// ── Open full panel ──────────────────────────────────────
function openPanel(context) {
  if (panel) { panel.reveal(vscode.ViewColumn.One); return; }

  panel = vscode.window.createWebviewPanel(
    'codeclean', 'CodeClean', vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(context.extensionPath)],
      retainContextWhenHidden: true,
    }
  );
  panel.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'logo.svg'));
  panel.webview.html = buildHtml(panel.webview, context.extensionPath, serverPort);
  panel.webview.onDidReceiveMessage(
    msg => handleMessage(msg, panel.webview, context),
    null, context.subscriptions
  );
  panel.onDidDispose(() => { panel = null; }, null, context.subscriptions);
}

// ── Handle messages from webview ─────────────────────────
async function handleMessage(message, webview, context) {
  switch (message.command) {

    case 'pickFolder': {
      const result = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select project folder',
      });
      if (!result || !result[0]) return;
      const folderPath = result[0].fsPath;
      const folderName = path.basename(folderPath);

      // Read files recursively via Node.js fs
      webview.postMessage({ command: 'scanStart', folderName });
      const files = [];
      await readDirRecursive(folderPath, folderPath, files, webview);
      webview.postMessage({ command: 'filesLoaded', files, folderName });
      break;
    }

    case 'openPanel': {
      openPanel(context);
      break;
    }

    case 'saveFile': {
      const extMap = {
        'application/json': [{ label:'JSON', extensions:['json'] }],
        'text/html':        [{ label:'HTML', extensions:['html'] }],
        'application/json_sarif': [{ label:'SARIF', extensions:['sarif','json'] }],
      };
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(
          path.join(require('os').homedir(), 'Desktop', message.filename)
        ),
        filters: extMap[message.type] || { 'All Files': ['*'] },
      });
      if (!saveUri) return;
      fs.writeFileSync(saveUri.fsPath, message.content, 'utf8');
      vscode.window.showInformationMessage(
        `✓ Saved: ${path.basename(saveUri.fsPath)}`,
        'Open Folder'
      ).then(choice => {
        if (choice === 'Open Folder') {
          vscode.commands.executeCommand('revealFileInOS', saveUri);
        }
      });
      break;
    }

    case 'openInBrowser': {
      const url = `http://localhost:${serverPort}`;
      vscode.env.openExternal(vscode.Uri.parse(url));
      break;
    }

    case 'openFile': {
      if (!message.path) return;
      // Try workspace root first, then absolute
      const ws = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
      const fullPath = ws ? path.join(ws, message.path) : message.path;
      if (fs.existsSync(fullPath)) {
        vscode.window.showTextDocument(vscode.Uri.file(fullPath), { preview: false });
      }
      break;
    }
  }
}

// ── Read directory recursively using Node.js fs ──────────
async function readDirRecursive(rootPath, currentPath, out, webview) {
  let entries;
  try { entries = fs.readdirSync(currentPath, { withFileTypes: true }); }
  catch (_) { return; }

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const relPath  = path.relative(rootPath, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await readDirRecursive(rootPath, fullPath, out, webview);
    } else {
      const ext = entry.name.split('.').pop()?.toLowerCase();
      if (SKIP_EXTS.has(ext)) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        out.push({
          path: relPath,
          name: entry.name,
          content,
          lang: ext,
          lines: content.split('\n').length,
        });
        // Send progress every 20 files
        if (out.length % 20 === 0) {
          webview.postMessage({ command: 'scanProgress', count: out.length, file: relPath });
        }
      } catch (_) {}
    }
  }
}

// ── Build HTML for full panel ────────────────────────────
function buildHtml(webview, extensionPath, port) {
  const indexPath = path.join(extensionPath, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Convert local asset paths to webview URIs
  html = html.replace(
    /(src|href)="(?!https?:\/\/|data:|#)([^"]+)"/g,
    (match, attr, assetPath) => {
      try {
        const abs = path.join(extensionPath, assetPath);
        return `${attr}="${webview.asWebviewUri(vscode.Uri.file(abs))}"`;
      } catch (_) { return match; }
    }
  );

  // Inject VS Code flag and CSP
  const csp = [
    `default-src 'none'`,
    `script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `img-src ${webview.cspSource} data: blob:`,
    `connect-src https://api.github.com https://api.osv.dev`,
  ].join('; ');

  html = html.replace('<head>', `<head>
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <script>window.IS_VSCODE = true; window.VSCODE_PORT = ${port};</script>`
  );
  return html;
}

// ── Sidebar shows two launch options ────────────────────
function buildSidebarHtml(webview, context, port) {
  const logoUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'logo.png')));
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',sans-serif; background:var(--vscode-sideBar-background); color:var(--vscode-foreground); padding:16px; }
  .logo { display:flex; align-items:center; gap:10px; margin-bottom:20px; }
  .logo img { width:32px; height:32px; border-radius:8px; }
  .logo-text { font-size:15px; font-weight:700; }
  .logo-text span { color:#6366f1; }
  .desc { font-size:11px; color:var(--vscode-descriptionForeground); margin-bottom:20px; line-height:1.6; }
  .btn { display:flex; align-items:center; gap:8px; width:100%; padding:9px 14px; border-radius:6px; border:none; cursor:pointer; font-size:12px; font-weight:600; font-family:inherit; margin-bottom:8px; transition:opacity 0.15s; }
  .btn:hover { opacity:0.85; }
  .btn-primary { background:#6366f1; color:white; }
  .btn-secondary { background:var(--vscode-button-secondaryBackground,#3c3c3c); color:var(--vscode-button-secondaryForeground,#fff); }
  .divider { height:1px; background:var(--vscode-panel-border); margin:14px 0; }
  .note { font-size:10px; color:var(--vscode-descriptionForeground); line-height:1.5; }
</style>
</head>
<body>
<div class="logo">
  <img src="${logoUri}" alt="CodeClean">
  <span class="logo-text">Code<span>Clean</span></span>
</div>

<p class="desc">Local code quality analyzer — 20 checks, zero install, nothing uploaded.</p>

<button class="btn btn-primary" onclick="openPanel()">
  ⬛ Open in VS Code Panel
</button>

<button class="btn btn-secondary" onclick="openBrowser()">
  🌐 Open in Browser (recommended for folder scan)
</button>

<div class="divider"></div>

<p class="note">
  💡 <strong>Browser mode</strong> supports drag-and-drop folder scanning.<br><br>
  💡 <strong>VS Code Panel</strong> uses the native VS Code file picker to select folders.
</p>

<script>
  const vscode = acquireVsCodeApi();
  function openPanel()   { vscode.postMessage({ command: 'openPanel' }); }
  function openBrowser() { vscode.postMessage({ command: 'openInBrowser' }); }
</script>
</body>
</html>`;
}

// ── Local HTTP server for browser mode ──────────────────
function startLocalServer(context) {
  const extPath = context.extensionPath;
  server = http.createServer((req, res) => {
    let filePath = path.join(extPath, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html':'text/html','.js':'application/javascript',
      '.css':'text/css','.svg':'image/svg+xml','.png':'image/png',
      '.woff2':'font/woff2','.woff':'font/woff','.json':'application/json',
    }[ext] || 'application/octet-stream';
    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
      res.end(data);
    } catch (_) {
      res.writeHead(404); res.end('Not found');
    }
  });

  server.listen(0, '127.0.0.1', () => {
    serverPort = server.address().port;
  });
}

function deactivate() {
  panel?.dispose();
  server?.close();
}

module.exports = { activate, deactivate };
