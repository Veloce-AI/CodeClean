/**
 * CodeClean VS Code Extension
 * Opens the CodeClean analyzer in a VS Code WebviewPanel.
 */

const vscode = require('vscode');
const path   = require('path');
const fs     = require('fs');

let panel = null;

function activate(context) {

  // ── Command: Open CodeClean panel ──────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeclean.open', () => {
      openPanel(context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeclean.openCurrentFolder', () => {
      openPanel(context, vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath);
    })
  );

  // ── Activity Bar Webview ────────────────────────────────
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codeclean.mainView', {
      resolveWebviewView(webviewView) {
        webviewView.webview.options = {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(context.extensionPath)],
        };
        webviewView.webview.html = buildHtml(webviewView.webview, context.extensionPath);
        webviewView.webview.onDidReceiveMessage(
          msg => handleMessage(msg, webviewView.webview, context),
          null, context.subscriptions
        );
      }
    }, { webviewOptions: { retainContextWhenHidden: true } })
  );
}

// ── Open a full panel (Ctrl+Shift+Q or command palette) ──
function openPanel(context, workspacePath) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One);
    return;
  }

  panel = vscode.window.createWebviewPanel(
    'codeclean',
    'CodeClean',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(context.extensionPath)],
      retainContextWhenHidden: true,
    }
  );

  panel.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'logo.svg'));
  panel.webview.html = buildHtml(panel.webview, context.extensionPath);

  panel.webview.onDidReceiveMessage(
    msg => handleMessage(msg, panel.webview, context),
    null, context.subscriptions
  );

  panel.onDidDispose(() => { panel = null; }, null, context.subscriptions);
}

// ── Build the HTML for the webview ───────────────────────
function buildHtml(webview, extensionPath) {
  const indexPath = path.join(extensionPath, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Replace all relative asset paths with proper webview URIs
  html = html.replace(
    /(src|href)="(?!https?:\/\/|data:|#)([^"]+)"/g,
    (match, attr, assetPath) => {
      try {
        const absolutePath = path.join(extensionPath, assetPath);
        const uri = webview.asWebviewUri(vscode.Uri.file(absolutePath));
        return `${attr}="${uri}"`;
      } catch (_) {
        return match; // leave unchanged if conversion fails
      }
    }
  );

  // Inject Content-Security-Policy that allows our local resources
  const cspSource = webview.cspSource;
  const csp = [
    `default-src 'none'`,
    `script-src ${cspSource} 'unsafe-inline' 'unsafe-eval'`,
    `style-src ${cspSource} 'unsafe-inline'`,
    `font-src ${cspSource}`,
    `img-src ${cspSource} data: blob:`,
    `connect-src https://api.github.com https://api.osv.dev`,
    `worker-src blob:`,
  ].join('; ');

  html = html.replace(
    '<head>',
    `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`
  );

  return html;
}

// ── Handle messages from the webview ─────────────────────
function handleMessage(message, webview, context) {
  switch (message.command) {
    case 'openFile': {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
      if (!workspaceRoot || !message.path) return;
      const filePath = path.join(workspaceRoot, message.path);
      const uri = vscode.Uri.file(filePath);
      vscode.window.showTextDocument(uri, { preview: false }).catch(() => {
        vscode.window.showWarningMessage(`CodeClean: could not open ${message.path}`);
      });
      break;
    }
    case 'showMessage': {
      const fn = {
        info: vscode.window.showInformationMessage,
        warn: vscode.window.showWarningMessage,
        error: vscode.window.showErrorMessage,
      }[message.level] || vscode.window.showInformationMessage;
      fn(message.text);
      break;
    }
  }
}

function deactivate() {
  panel?.dispose();
}

module.exports = { activate, deactivate };
